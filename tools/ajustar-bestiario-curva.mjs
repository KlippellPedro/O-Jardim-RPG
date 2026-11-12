// Leva para as fichas do Bestiário os ajustes da curva de criaturas que vieram
// depois que elas foram escritas (ou geradas e refinadas à mão). Cada ajuste
// guarda na ficha quanto já aplicou; rodar de novo só aplica a diferença, e se a
// curva mudar (npm run audit:balance) o script acompanha.
//
// 1. Golpe pela armadura (2026-11-11, coluna `ajusteDeArmadura`, VD 15+): soma no
//    bônus do começo de cada `ataques[].detalhe` e nas perícias de golpe (Luta e
//    Pontaria). Marca: `ajusteDeAtaqueArmadura`.
// 2. Defesa pelo acerto do jogador (2026-11-11, coluna `defesaDeCriatura`): a
//    Defesa era a natural menos 3 e o jogador investido acertava 95% desde o
//    nível 5; passou a ser o ataque de referência + 6 (75%). A ficha anda a
//    diferença entre as duas contas no VD dela, mantendo o que tinha de próprio.
//    Marca: `ajusteDeDefesaAcerto`.
// 3. Vida pelo mesmo acerto: a Vida de inimigo padrão conta com 75% de acerto, em
//    vez da chance contra a Defesa natural; a Vida da ficha multiplica pela razão
//    entre as duas. Marca: `fatorDeVidaAcerto`.
// Testes de resistência, Percepção, dano e DTs não mudam.
//
// Uso: node --import ./tests/frontend/registerTsLoader.mjs tools/ajustar-bestiario-curva.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogoPath = process.env.BESTIARIO_CATALOGO ?? path.join(root, 'data', 'loja', 'catalogo.json');
const curvaPath = path.join(root, 'data', 'regras', 'curva-criatura-v1.json');
const check = process.argv.includes('--check');
const { ajusteDeArmaduraDoVd, PERICIAS_DE_GOLPE, vdValido } = await import('../src/services/curvaCriatura.ts');
const { ACERTO_CONTRA_CRIATURA } = await import('../src/services/referenciaBalanceamento.ts');

const curva = JSON.parse(fs.readFileSync(curvaPath, 'utf8'));
const linhas = new Map(curva.linhas.map((linha) => [linha[0], Object.fromEntries(curva.colunas.map((coluna, i) => [coluna, linha[i]]))]));
const linhaDoVd = (vd) => linhas.get(vdValido(vd));

// A conta antiga: Defesa natural menos 3, e a Vida contava a chance contra a natural.
const DEFESA_ABAIXO_DA_NATURAL_ANTIGA = 3;
const ajusteDeDefesa = (vd) => {
  const linha = linhaDoVd(vd);
  return linha.defesaDeCriatura - (linha.defesaNatural - DEFESA_ABAIXO_DA_NATURAL_ANTIGA);
};
const fatorDeVida = (vd) => {
  const linha = linhaDoVd(vd);
  const chanceAntiga = Math.min(0.95, Math.max(0.05, (21 - (linha.defesaNatural - linha.ataque)) / 20));
  return Math.round((ACERTO_CONTRA_CRIATURA / chanceAntiga) * 1000) / 1000;
};
const arredondarVida = (valor) => (valor < 30 ? Math.max(1, Math.round(valor)) : Math.round(valor / 5) * 5);

const sinal = (valor) => (valor >= 0 ? `+${valor}` : String(valor));
const BONUS_NO_INICIO = /^([+-]\d+)(,.*)$/s;
const BONUS_NO_FIM = /^(.*?)([+-]\d+)\s*$/;

const original = fs.readFileSync(catalogoPath, 'utf8');
const catalogo = JSON.parse(original);
const contagem = { ataque: 0, defesa: 0, vida: 0 };

const marcar = (conteudo, campo, valor, neutro) => {
  if (valor === neutro) delete conteudo[campo];
  else conteudo[campo] = valor;
};

for (const entrada of catalogo.entradas || []) {
  if (entrada.tipo !== 'monstro') continue;
  const conteudo = entrada.conteudo || {};
  const vd = Number(conteudo.vd ?? conteudo.nivel);
  if (!Number.isFinite(vd) || vd < 1) continue;

  // 1. Golpe pela armadura.
  const alvoAtaque = ajusteDeArmaduraDoVd(vd);
  const deltaAtaque = alvoAtaque - (Number(conteudo.ajusteDeAtaqueArmadura ?? 0) || 0);
  if (deltaAtaque !== 0) {
    contagem.ataque += 1;
    conteudo.ataques = (conteudo.ataques || []).map((ataque) => {
      const partes = String(ataque?.detalhe ?? '').match(BONUS_NO_INICIO);
      return partes ? { ...ataque, detalhe: `${sinal(Number(partes[1]) + deltaAtaque)}${partes[2]}` } : ataque;
    });
    conteudo.pericias = (conteudo.pericias || []).map((pericia) => {
      const partes = String(pericia).match(BONUS_NO_FIM);
      if (!partes || !PERICIAS_DE_GOLPE.test(partes[1].trim())) return pericia;
      return `${partes[1]}${sinal(Number(partes[2]) + deltaAtaque)}`;
    });
    marcar(conteudo, 'ajusteDeAtaqueArmadura', alvoAtaque, 0);
  }

  // 2. Defesa pelo acerto do jogador.
  const alvoDefesa = ajusteDeDefesa(vd);
  const deltaDefesa = alvoDefesa - (Number(conteudo.ajusteDeDefesaAcerto ?? 0) || 0);
  if (deltaDefesa !== 0 && Number.isFinite(Number(conteudo.defesa))) {
    contagem.defesa += 1;
    conteudo.defesa = Math.max(1, Number(conteudo.defesa) + deltaDefesa);
    marcar(conteudo, 'ajusteDeDefesaAcerto', alvoDefesa, 0);
  }

  // 3. Vida pelo mesmo acerto.
  const alvoVida = fatorDeVida(vd);
  const fatorAplicado = Number(conteudo.fatorDeVidaAcerto ?? 1) || 1;
  if (alvoVida !== fatorAplicado && Number(conteudo.pv) > 0) {
    contagem.vida += 1;
    conteudo.pv = arredondarVida((Number(conteudo.pv) / fatorAplicado) * alvoVida);
    marcar(conteudo, 'fatorDeVidaAcerto', alvoVida, 1);
  }
}

const novo = `${JSON.stringify(catalogo, null, 2)}\n`;
if (check) {
  if (novo !== original) {
    console.error(`Bestiário fora da curva (golpe ${contagem.ataque}, Defesa ${contagem.defesa}, Vida ${contagem.vida}). Rode: npm run bestiario:ajuste-curva`);
    process.exit(1);
  }
  console.log('Bestiário em dia com os ajustes da curva.');
} else {
  fs.writeFileSync(catalogoPath, novo, 'utf8');
  console.log(`Ajustes da curva aplicados: golpe em ${contagem.ataque}, Defesa em ${contagem.defesa} e Vida em ${contagem.vida} criaturas.`);
}
