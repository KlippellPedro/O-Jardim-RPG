import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const catalogPath = path.join(root, 'data', 'loja', 'catalogo.json');
const scalePath = path.join(root, 'data', 'economia', 'escala-precos-v1.json');

const scale = JSON.parse(fs.readFileSync(scalePath, 'utf8'));
const CAMBIO = scale.cambio;
const BANDA = scale.escada_raridade.banda;
const PISO_COMUM = scale.escada_raridade.piso_comum_por_categoria ?? {};

/** Banda efetiva do grupo. So a faixa Comum afrouxa o piso, e so nas categorias
 *  que misturam bugiganga e bem de verdade. */
const bandaDe = (tipo, raridade) => ({
  minimo: raridade === 'comum' ? (PISO_COMUM[tipo] ?? BANDA.minimo) : BANDA.minimo,
  maximo: BANDA.maximo,
});

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

const RARIDADE_ALIAS = {
  reliquia: 'reliquia da criacao',
  mitica: 'mitico',
};

const faixaPorRaridade = new Map(
  scale.escada_raridade.faixas.map((faixa) => [normalize(faixa.raridade), faixa]),
);

const raridadeDe = (entry) => {
  const bruta = normalize(entry.conteudo.raridade);
  return RARIDADE_ALIAS[bruta] ?? bruta;
};

/** Preco nativo -> [moeda, valor]. Numero solto significa Solares, como no _padrao. */
const lerPreco = (preco) => {
  if (preco && typeof preco === 'object' && !Array.isArray(preco)) {
    const moeda = Object.keys(preco)[0];
    return [moeda, Number(preco[moeda])];
  }
  return ['Solares', Number(preco)];
};

const emSolares = (moeda, valor) => valor * (CAMBIO[moeda] ?? 1);

/**
 * Moeda de destino. A categoria manda primeiro (implante so existe em Credito,
 * Fruto so em Fragmento), depois a faixa de raridade. Por ultimo vem o bolso:
 * a regra da secao economia diz que o Solar aparece quando o valor passa do que
 * caberia num bolso de Lunaris, entao categoria cara em faixa baixa (veiculo,
 * propriedade, criatura) sobe de moeda sozinha em vez de virar 19.200 Lunaris.
 */
const TETO_DO_BOLSO_SOLARES = 20;
const PISO_DO_SOLAR = 1;

const moedaAlvo = (entry, faixa, alvoSol) => {
  const fixa = scale.moeda_por_categoria[entry.tipo];
  if (fixa) return fixa;
  if (faixa.moeda === 'Lunaris' && alvoSol > TETO_DO_BOLSO_SOLARES) return 'Solares';
  if (faixa.moeda === 'Solares' && alvoSol < PISO_DO_SOLAR) return 'Lunaris';
  return faixa.moeda;
};

/** Numeros redondos: ninguem anota 37 Lunaris numa ficha. */
const passoDe = (moeda, valor) => {
  {
    if (moeda === 'Lunaris') {
      // O fundo precisa de passo 1: uma pedra e uma racao valem poucos Lunaris,
      // e passo 5 achatava toda a bugiganga no mesmo preco.
      if (valor < 20) return 1;
      if (valor < 100) return 5;
      if (valor < 1000) return 10;
      if (valor < 10000) return 50;
      return 100;
    }
    if (moeda === 'Solares') {
      if (valor < 50) return 1;
      if (valor < 200) return 5;
      if (valor < 1000) return 10;
      return 50;
    }
    if (moeda === 'Fragmentos de Estrela') return valor < 100 ? 5 : 10;
    return valor < 100 ? 5 : 25;
  }
};

const arredondar = (moeda, valor) => {
  const passo = passoDe(moeda, valor);
  return Math.max(1, Math.round(valor / passo) * passo);
};

/**
 * Arredonda para dentro da banda. Sem isso o passo de arredondamento empurra o
 * item logo para fora do intervalo que a propria escala promete, e o teste de
 * integridade reprova por 1% de diferenca.
 */
const arredondarNaBanda = (moeda, valor, pisoSol, tetoSol) => {
  const taxa = CAMBIO[moeda] ?? 1;
  const piso = pisoSol / taxa;
  const teto = tetoSol / taxa;
  let resultado = arredondar(moeda, valor);
  const passo = passoDe(moeda, valor);
  if (resultado < piso) resultado = Math.ceil(piso / passo) * passo;
  if (resultado > teto) resultado = Math.floor(teto / passo) * passo;
  return Math.max(1, resultado);
};

/**
 * Mapeia o preco atual para a banda da faixa preservando a ordem que o autor
 * ja tinha escrito. Interpolacao logaritmica: o mais barato do grupo cai no
 * piso da banda, o mais caro no teto, e o resto distribui no meio. Grupo com
 * preco unico inteiro vai todo para a referencia.
 */
const posicaoNaBanda = (valorSol, minSol, maxSol, banda) => {
  if (!(maxSol > minSol)) return 1;
  const t = (Math.log(valorSol) - Math.log(minSol)) / (Math.log(maxSol) - Math.log(minSol));
  return banda.minimo * (banda.maximo / banda.minimo) ** t;
};

/**
 * Promocao guarda o desconto que o autor escolheu; o preco riscado e derivado
 * dele. Manter os dois numeros a mao fazia o preco_original sobreviver a uma
 * revisao de escala e anunciar desconto de 100x.
 */
const aplicarPrecoOriginal = (entry, moeda, valor) => {
  const promocao = entry.conteudo.promocao;
  if (!promocao?.ativa) {
    delete entry.conteudo.preco_original;
    return;
  }
  const desconto = Number(promocao.desconto_percentual);
  if (!Number.isFinite(desconto) || desconto <= 0 || desconto >= 100) {
    throw new Error(`${entry.id}: promocao ativa sem desconto_percentual valido`);
  }
  entry.conteudo.preco_original = { [moeda]: arredondar(moeda, valor / (1 - desconto / 100)) };
};

const run = ({ checkOnly, forcar = false }) => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

  const grupos = new Map();
  for (const entry of catalog.entradas) {
    const preco = entry.conteudo?.preco;
    if (preco === undefined || preco === null) continue;
    const faixa = faixaPorRaridade.get(raridadeDe(entry));
    if (!faixa) throw new Error(`${entry.id}: raridade desconhecida "${entry.conteudo.raridade}"`);
    if (faixa.congelada) continue;

    const chave = `${entry.tipo}|${faixa.raridade}`;
    if (!grupos.has(chave)) grupos.set(chave, { faixa, itens: [] });
    const [moeda, valor] = lerPreco(preco);
    grupos.get(chave).itens.push({ entry, atualSol: emSolares(moeda, valor) });
  }

  const mudancas = [];
  for (const { faixa, itens } of grupos.values()) {
    const tipo = itens[0].entry.tipo;
    const multCategoria = scale.multiplicador_por_categoria[tipo] ?? 1;
    const refSol = (faixa.referencia_lunaris / 100) * multCategoria;
    const banda = bandaDe(tipo, normalize(faixa.raridade));
    const precosSol = itens.map((item) => item.atualSol);
    const minSol = Math.min(...precosSol);
    const maxSol = Math.max(...precosSol);

    for (const item of itens) {
      const alvoSol = refSol * posicaoNaBanda(item.atualSol, minSol, maxSol, banda);
      const moeda = moedaAlvo(item.entry, faixa, alvoSol);
      const [moedaAntes, valorAntes] = lerPreco(item.entry.conteudo.preco);

      // Preco que ja esta na moeda certa e dentro da banda da propria faixa fica
      // como esta. Sem isso o arredondamento encolhe o extremo do grupo a cada
      // passada, o grupo inteiro reposiciona junto e o script nunca assenta.
      if (moedaAntes === moeda
        && !forcar
        && item.atualSol >= refSol * banda.minimo * 0.999
        && item.atualSol <= refSol * banda.maximo * 1.001) {
        aplicarPrecoOriginal(item.entry, moedaAntes, valorAntes);
        continue;
      }

      const valor = arredondarNaBanda(
        moeda,
        alvoSol / (CAMBIO[moeda] ?? 1),
        refSol * banda.minimo,
        refSol * banda.maximo,
      );
      const novo = { [moeda]: valor };
      aplicarPrecoOriginal(item.entry, moeda, valor);

      if (moedaAntes !== moeda || valorAntes !== valor) {
        mudancas.push({
          id: item.entry.id,
          titulo: item.entry.titulo,
          tipo,
          raridade: faixa.raridade,
          antes: `${valorAntes} ${moedaAntes}`,
          depois: `${valor} ${moeda}`,
          fator: emSolares(moeda, valor) / item.atualSol,
        });
      }
      item.entry.conteudo.preco = novo;
    }
  }

  if (checkOnly && mudancas.length > 0) {
    throw new Error(`${mudancas.length} item(ns) fora da escala de precos. Rode sem --check para corrigir.`);
  }
  if (!checkOnly) fs.writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');

  console.log(`${checkOnly ? 'Precos validados' : 'Precos revisados'}: ${mudancas.length} de ${catalog.entradas.length} itens.`);
  const maiores = [...mudancas].sort((a, b) => Math.abs(Math.log(b.fator)) - Math.abs(Math.log(a.fator))).slice(0, 15);
  if (maiores.length) {
    console.log('\nMaiores movimentos:');
    for (const m of maiores) {
      const seta = m.fator >= 1 ? `${m.fator.toFixed(1)}x` : `/${(1 / m.fator).toFixed(1)}`;
      console.log(`  ${m.titulo} (${m.tipo} ${m.raridade}): ${m.antes} -> ${m.depois}  [${seta}]`);
    }
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run({ checkOnly: process.argv.includes('--check'), forcar: process.argv.includes('--force') });
}

export { run };
