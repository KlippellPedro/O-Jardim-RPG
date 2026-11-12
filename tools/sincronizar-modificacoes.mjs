// Modificações: a lista das regras (data/regras/raridadesEquipamentos.ts) é a
// fonte, e a Loja (data/loja/catalogo.json, tipo "modificacao") vende cada uma.
//
// Até 2026-11-12 as duas listas eram copiadas à mão. Este script acrescenta à
// Loja a modificação que só existe nas regras, com preço pela faixa de valor,
// raridade, loja mínima, etiquetas e pré-requisito estruturado, e confere que
// as que já existem não divergem no essencial (aplicação, nível, valor, preço).
// O texto e o pré-requisito das antigas ficam como estão: foram ajustados à mão.
//
// Uso: npm run sync:modificacoes  (ou sync:modificacoes:check)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CATEGORIAS_MODIFICACAO,
  MODIFICACOES_EQUIPAMENTO,
  PRECO_MODIFICACAO_POR_VALOR,
} from '../data/regras/raridadesEquipamentos.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caminho = path.join(root, 'data', 'loja', 'catalogo.json');
const check = process.argv.includes('--check');

const APLICACAO = Object.fromEntries(CATEGORIAS_MODIFICACAO.map(({ id, titulo }) => [id, titulo]));
const RARIDADE_POR_VALOR = { 0: 'comum', 1: 'incomum', 2: 'raro', 3: 'epico' };
const LOJA_POR_VALOR = { 0: 1, 1: 1, 2: 2, 3: 3 };
const ATRIBUTOS = {
  força: 'forca', forca: 'forca', destreza: 'destreza', constituição: 'constituicao', constituicao: 'constituicao',
  inteligência: 'inteligencia', inteligencia: 'inteligencia', sabedoria: 'sabedoria', carisma: 'carisma', fluxo: 'fluxo',
};

/** "Constituição 14 e nível total 10" → [{atributo, valor_minimo}, {nivel_personagem}]. */
export function requisitosEstruturados(texto) {
  if (!texto) return undefined;
  const partes = texto.split(/\s+e\s+/i).map((parte) => parte.trim());
  const lista = partes.map((parte) => {
    const nivel = parte.match(/^n[ií]vel total (\d+)$/i);
    if (nivel) return { nivel_personagem: Number(nivel[1]) };
    const atributo = parte.match(/^(\S+) (\d+)$/);
    const chave = atributo ? ATRIBUTOS[atributo[1].toLowerCase()] : null;
    if (chave) return { atributo: chave, valor_minimo: Number(atributo[2]) };
    return null;
  });
  if (lista.some((item) => item === null)) throw new Error(`Pré-requisito que o script não sabe ler: "${texto}"`);
  return lista;
}

const efeitosDoCatalogo = (modificacao) => (modificacao.efeitos || []).map((efeito, indice) => ({
  id: `mod-${modificacao.id}-${efeito.alvo}${indice ? `-${indice}` : ''}`,
  categoria: efeito.categoria,
  alvo: efeito.alvo,
  modo: 'bonus',
  valor: efeito.valor,
}));

function entradaDaLoja(modificacao) {
  const aplicacao = APLICACAO[modificacao.categoria];
  const conteudo = {
    preco: { Lunaris: PRECO_MODIFICACAO_POR_VALOR[modificacao.valor] },
    raridade: RARIDADE_POR_VALOR[modificacao.valor],
    categoria_loja: 'Modificações',
    modificacao_id: modificacao.id,
    aplicacao,
    nivel_modificacao: modificacao.nivel,
    valor_efeito: modificacao.valor,
    descricao: modificacao.efeito,
    ...(modificacao.efeitos?.length ? { efeitos: efeitosDoCatalogo(modificacao) } : {}),
    atributos: [
      `Aplica em: ${aplicacao}`,
      `Nível ${modificacao.nivel === 'marcial' ? 'Marcial' : 'Comum'}`,
      `Valor ${modificacao.valor}`,
      ...(modificacao.preRequisito ? [`Pré-requisito: ${modificacao.preRequisito}`] : []),
    ],
    nivelMinimoLoja: LOJA_POR_VALOR[modificacao.valor],
    ...(modificacao.preRequisito ? {
      pre_requisito: modificacao.preRequisito,
      pre_requisitos: requisitosEstruturados(modificacao.preRequisito),
    } : {}),
  };
  return { tipo: 'modificacao', id: `mod-${modificacao.id}`, titulo: modificacao.titulo, conteudo };
}

// Importado (pelo teste, por exemplo), o script só expõe as funções e não mexe em nada.
const rodandoDireto = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (rodandoDireto) sincronizar();

function sincronizar() {
const original = fs.readFileSync(caminho, 'utf8');
const documento = JSON.parse(original);
const naLoja = new Map(documento.entradas
  .filter((entrada) => entrada.tipo === 'modificacao')
  .map((entrada) => [entrada.conteudo?.modificacao_id, entrada]));

const divergencias = [];
const novas = [];
for (const modificacao of MODIFICACOES_EQUIPAMENTO) {
  const existente = naLoja.get(modificacao.id);
  if (!existente) {
    novas.push(entradaDaLoja(modificacao));
    continue;
  }
  const conteudo = existente.conteudo || {};
  const esperado = {
    aplicacao: APLICACAO[modificacao.categoria],
    nivel_modificacao: modificacao.nivel,
    valor_efeito: modificacao.valor,
    preco: JSON.stringify({ Lunaris: PRECO_MODIFICACAO_POR_VALOR[modificacao.valor] }),
  };
  const atual = { ...conteudo, preco: JSON.stringify(conteudo.preco) };
  Object.entries(esperado).forEach(([campo, valor]) => {
    if (atual[campo] !== valor) divergencias.push(`${existente.id}: ${campo} é ${atual[campo]}, as regras dizem ${valor}`);
  });
}
const idsDasRegras = new Set(MODIFICACOES_EQUIPAMENTO.map((item) => item.id));
for (const [id, entrada] of naLoja) {
  if (!idsDasRegras.has(id)) divergencias.push(`${entrada.id}: está na Loja e não nas regras`);
}

if (divergencias.length) {
  console.error(divergencias.join('\n'));
  process.exit(1);
}
if (check) {
  if (novas.length) {
    console.error(`${novas.length} modificação(ões) das regras fora da Loja. Rode: npm run sync:modificacoes`);
    process.exit(1);
  }
  console.log(`Loja e regras com as mesmas ${MODIFICACOES_EQUIPAMENTO.length} modificações.`);
} else if (novas.length) {
  // As novas entram logo depois da última modificação da Loja, para o catálogo seguir agrupado.
  const ultima = documento.entradas.map((entrada) => entrada.tipo).lastIndexOf('modificacao');
  documento.entradas.splice(ultima + 1, 0, ...novas);
  fs.writeFileSync(caminho, `${JSON.stringify(documento, null, 2)}\n`, 'utf8');
  console.log(`Modificações acrescentadas à Loja: ${novas.length}.`);
} else {
  console.log('Nada a acrescentar.');
}
}
