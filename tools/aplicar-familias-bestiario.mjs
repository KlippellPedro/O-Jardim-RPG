// Famílias do Bestiário (data/bestiario/familias-v1.json) e o catálogo de loja.
//
//   sem opção   relatório: confere o arquivo e mostra o que cada modo faria
//   --check     falha se o catálogo não traz a família, o estágio, o papel e a
//               marca de único que o arquivo de famílias declara
//   --metadados grava `familia`, `estagio`, `papel` e `unico` nas fichas escritas
//               à mão (só metadado: nenhum número de criatura muda)
//   --novos     grava no catálogo os estágios de familias-propostas-v1.json, montados pela
//               curva de criatura. NUNCA sobrescreve uma ficha que já existe: se o
//               id está no catálogo e não foi gerado por aqui, aborta.
//
// Rode com o carregador de TypeScript: `npm run bestiario:familias -- --check`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// As variáveis existem para o teste rodar contra cópias, sem tocar nos arquivos de verdade.
const catalogoPath = process.env.BESTIARIO_CATALOGO ?? path.join(root, 'data', 'loja', 'catalogo.json');
const familiasPath = process.env.BESTIARIO_FAMILIAS ?? path.join(root, 'data', 'bestiario', 'familias-v1.json');
const propostasPath = process.env.BESTIARIO_PROPOSTAS ?? path.join(root, 'data', 'bestiario', 'familias-propostas-v1.json');
const args = new Set(process.argv.slice(2));

const { modeloDeCriatura, expressaoDeDano } = await import('../src/services/curvaCriatura.ts');

const catalogoBruto = fs.readFileSync(catalogoPath, 'utf8');
const catalogo = JSON.parse(catalogoBruto);
const dados = JSON.parse(fs.readFileSync(familiasPath, 'utf8'));
const propostas = JSON.parse(fs.readFileSync(propostasPath, 'utf8')).porFamilia ?? {};
const porId = new Map(catalogo.entradas.map((entrada) => [entrada.id, entrada]));

const erros = [];
const erro = (texto) => erros.push(texto);

// ---------- validação do arquivo ----------
const familiaDoMembro = new Map();
for (const familia of dados.familias) {
  for (const membro of familia.membros) {
    if (!porId.has(membro.id)) erro(`${familia.id}: membro ${membro.id} não existe no catálogo`);
    else if (porId.get(membro.id).tipo !== 'monstro') erro(`${familia.id}: ${membro.id} não é monstro`);
    if (familiaDoMembro.has(membro.id)) erro(`${membro.id} está em duas famílias (${familiaDoMembro.get(membro.id)} e ${familia.id})`);
    familiaDoMembro.set(membro.id, familia.id);
  }
}
for (const id of dados.unicos) {
  if (!porId.has(id)) erro(`único ${id} não existe no catálogo`);
}
// Estágios de família e criaturas avulsas (sem família, chave "avulsas").
const novos = [
  ...dados.familias.flatMap((familia) => (propostas[familia.id] ?? []).map((novo) => ({ familia, novo }))),
  ...(propostas.avulsas ?? []).map((novo) => ({ familia: null, novo })),
];
for (const chave of Object.keys(propostas)) {
  if (chave !== 'avulsas' && !dados.familias.some((familia) => familia.id === chave)) erro(`proposta para família inexistente: ${chave}`);
}
const idsNovos = new Set();
for (const { familia, novo } of novos) {
  if (idsNovos.has(novo.id)) erro(`id novo repetido: ${novo.id}`);
  idsNovos.add(novo.id);
  if (familiaDoMembro.has(novo.id)) erro(`${novo.id} é membro e também estágio novo`);
}

// ---------- montagem de um estágio novo ----------
const raridadeDoVd = (vd) => (vd < 12 ? 'comum' : vd < 20 ? 'incomum' : vd < 30 ? 'raro' : vd < 45 ? 'epico' : 'lendario');
const lojaMinimaDoVd = (vd) => (vd < 8 ? 1 : vd < 15 ? 2 : vd < 33 ? 3 : 4);
const arredondar10 = (valor) => Math.max(10, Math.round(valor / 10) * 10);

function montarEntrada(familia, novo) {
  const modelo = modeloDeCriatura(novo.vd, novo.papel ?? 'solo');
  const bonus = modelo.pericias[0].replace('Luta ', '');
  const dt = 15 + Math.floor(novo.vd / 2);
  const dano = expressaoDeDano(modelo.danoMedio);
  const raridade = raridadeDoVd(novo.vd);
  // Preço provisório: o da ficha escrita à mão de VD mais próximo. A escala oficial
  // (`npm run precos:normalizar`) reajusta pela raridade depois de gravar.
  const parecida = catalogo.entradas
    .filter((entrada) => entrada.tipo === 'monstro' && entrada.conteudo.preco && !entrada.conteudo.geradoPorFamilia)
    .sort((a, b) => Math.abs(a.conteudo.vd - novo.vd) - Math.abs(b.conteudo.vd - novo.vd))[0];
  const valorDoLoot = arredondar10(novo.vd * 4);
  const conteudo = {
    descricao: novo.descricao,
    preco: novo.precoSolares ? { Solares: novo.precoSolares } : (novo.preco ?? parecida.conteudo.preco),
    preco_contratacao: novo.preco_contratacao ?? parecida.conteudo.preco_contratacao,
    contrato_mensal: novo.contrato_mensal ?? parecida.conteudo.contrato_mensal,
    raridade,
    categoria: novo.categoria,
    pv: modelo.pv,
    nivel: novo.vd,
    vd: novo.vd,
    defesa: modelo.defesa,
    iniciativa: modelo.iniciativa,
    deslocamento: novo.deslocamento,
    mana: modelo.mana,
    estamina: modelo.estamina,
    atributos: modelo.atributos,
    pericias: modelo.pericias,
    ataques: novo.ataques.map((ataque) => ({ nome: ataque.nome, detalhe: `${bonus}, ${dano} ${ataque.tipo}` })),
    habilidades: [...modelo.habilidades, ...novo.habilidades.map((texto) => texto.replaceAll('{dt}', String(dt)))],
    loot: novo.loot.map((item) => `${item} (${valorDoLoot} Solares)`),
    classe: novo.classe,
    // O classificador do catálogo (`npm run catalogo:classificar`) é quem manda; o valor dele fica gravado na proposta.
    nivelMinimoLoja: novo.nivelMinimoLoja ?? lojaMinimaDoVd(novo.vd),
    papel: novo.papel ?? 'solo',
    geradoPorFamilia: true,
  };
  if (familia) conteudo.familia = familia.id;
  if (novo.estagio) conteudo.estagio = novo.estagio;
  if (novo.unico) conteudo.unico = true;
  // Criaturas de VD muito alto ou únicas ficam só no Bestiário, fora do balcão da Loja.
  if (novo.disponivelNaLoja === false) conteudo.disponivelNaLoja = false;
  if (raridade === 'lendario') conteudo.requer_autorizacao_mestre = true;
  return { tipo: 'monstro', id: novo.id, titulo: novo.titulo, conteudo };
}

// ---------- o que o catálogo deve trazer nas fichas existentes ----------
const unicos = new Set(dados.unicos);
function metadadosEsperados(id) {
  const familiaId = familiaDoMembro.get(id) ?? null;
  const familia = dados.familias.find((item) => item.id === familiaId);
  const estagio = familia?.membros.find((membro) => membro.id === id)?.estagio ?? null;
  return { familia: familiaId, estagio, papel: dados.papelPadrao, unico: unicos.has(id) ? true : null };
}
const monstrosEscritos = catalogo.entradas.filter((entrada) => entrada.tipo === 'monstro' && !entrada.conteudo.geradoPorFamilia);
const divergentes = [];
for (const entrada of monstrosEscritos) {
  const esperado = metadadosEsperados(entrada.id);
  for (const [campo, valor] of Object.entries(esperado)) {
    const atual = entrada.conteudo[campo] ?? null;
    if (atual !== valor) { divergentes.push(`${entrada.id}.${campo}: catálogo ${JSON.stringify(atual)}, arquivo ${JSON.stringify(valor)}`); }
  }
}

function serializar(objeto) {
  return `${JSON.stringify(objeto, null, 2)}\n`;
}

if (erros.length) {
  console.error(`Famílias do Bestiário com problema:\n- ${erros.join('\n- ')}`);
  process.exit(1);
}

if (args.has('--check')) {
  if (divergentes.length) {
    console.error(`O catálogo está fora do arquivo de famílias (${divergentes.length}). Rode \`npm run bestiario:familias -- --metadados\`.\n- ${divergentes.slice(0, 12).join('\n- ')}`);
    process.exit(1);
  }
  const geradosNoCatalogo = catalogo.entradas.filter((entrada) => entrada.conteudo?.geradoPorFamilia).map((entrada) => entrada.id);
  const desconhecidos = geradosNoCatalogo.filter((id) => !idsNovos.has(id));
  if (desconhecidos.length) {
    console.error(`Fichas geradas que o arquivo de famílias não declara mais: ${desconhecidos.join(', ')}`);
    process.exit(1);
  }
  console.log('Famílias do Bestiário em dia com o catálogo.');
} else if (args.has('--metadados')) {
  let alteradas = 0;
  for (const entrada of monstrosEscritos) {
    const esperado = metadadosEsperados(entrada.id);
    let mudou = false;
    for (const [campo, valor] of Object.entries(esperado)) {
      if (valor === null) {
        if (campo in entrada.conteudo) { delete entrada.conteudo[campo]; mudou = true; }
      } else if (entrada.conteudo[campo] !== valor) { entrada.conteudo[campo] = valor; mudou = true; }
    }
    if (mudou) alteradas += 1;
  }
  fs.writeFileSync(catalogoPath, serializar(catalogo), 'utf8');
  console.log(`Metadados de família gravados em ${alteradas} fichas (nenhum número de criatura mudou).`);
} else if (args.has('--novos')) {
  const colisoes = novos.filter(({ novo }) => porId.has(novo.id) && !porId.get(novo.id).conteudo.geradoPorFamilia);
  if (colisoes.length) {
    console.error(`Recusado: já existe ficha escrita à mão com o id ${colisoes.map(({ novo }) => novo.id).join(', ')}. O gerador nunca sobrescreve.`);
    process.exit(1);
  }
  const entradas = catalogo.entradas.filter((entrada) => !entrada.conteudo?.geradoPorFamilia);
  for (const { familia, novo } of novos) entradas.push(montarEntrada(familia, novo));
  catalogo.entradas = entradas;
  fs.writeFileSync(catalogoPath, serializar(catalogo), 'utf8');
  console.log(`${novos.length} estágios novos gravados no catálogo. Revise os textos e rode \`npm run precos:normalizar\` se quiser reajustar os preços.`);
} else {
  console.log(`Famílias: ${dados.familias.length}, membros: ${familiaDoMembro.size}, únicos: ${dados.unicos.length}, estágios propostos: ${novos.length}.`);
  console.log(`Fichas escritas fora do arquivo de famílias: ${monstrosEscritos.length - familiaDoMembro.size}. Divergências de metadado: ${divergentes.length}.`);
  for (const { familia, novo } of novos) {
    const entrada = montarEntrada(familia, novo);
    const c = entrada.conteudo;
    console.log(`  + ${novo.titulo} (VD ${novo.vd}, ${familia?.titulo ?? 'avulsa'}): Vida ${c.pv}, Defesa ${c.defesa}, ${c.ataques[0].detalhe}${porId.has(novo.id) ? '  [já no catálogo]' : ''}`);
  }
}
