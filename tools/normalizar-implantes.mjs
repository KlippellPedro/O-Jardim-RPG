// Implantes cobram Sanidade máxima (pedido do Pedro, 2026-11-12).
//
// Para cada implante do catálogo da Loja, grava:
//   - `sistema`: a parte do corpo que a peça ocupa (neural, sentidos, membros,
//     órgãos, pele e esqueleto). O que é neural cobra +3 de Sanidade.
//   - `custoSanidade`: quanto a peça tira da Sanidade máxima enquanto está
//     instalada, pela raridade (src/services/implantesService.ts).
//   - as etiquetas "Sanidade máxima −N" e "Sistema: X" nos atributos, que a
//     Loja, a ficha e o bot mostram.
//
// Implante novo precisa entrar em SISTEMA abaixo, senão o script para.
//
// Uso: npm run normalize:implantes  (ou normalize:implantes:check)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROTULO_SISTEMA_IMPLANTE, custoSanidadeDoImplante } from '../src/services/implantesService.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caminho = path.join(root, 'data', 'loja', 'catalogo.json');
const check = process.argv.includes('--check');

const SISTEMA = {
  // Sentidos
  'implante-olho-bionico': 'sentidos',
  'implante-ouvido-ressonante': 'sentidos',
  'implante-nariz-sabujo': 'sentidos',
  'implante-olhos-vidro-sincero': 'sentidos',
  'implante-ponte-optica-termica': 'sentidos',
  'implante-retina-analitica': 'sentidos',
  'implante-lanterna-ocular': 'sentidos',
  'reliquia-olho-odin': 'sentidos',
  'reliquia-olhos-argos': 'sentidos',
  // Membros
  'implante-braco-hidraulico': 'membros',
  'implante-pernas-pneumaticas': 'membros',
  'implante-dedos-relojoeiro': 'membros',
  'implante-articulacoes-aranha': 'membros',
  'implante-mao-multiferramenta': 'membros',
  'implante-tendoes-trancados': 'membros',
  'implante-palmas-magneticas': 'membros',
  'implante-laminas-de-antebraco': 'membros',
  'implante-bateria-muscular': 'membros',
  'reliquia-braco-nuada': 'membros',
  'reliquia-pernas-talos': 'membros',
  // Órgãos
  'implante-coracao-sobrecarga': 'orgaos',
  'implante-pulmoes-filtrantes': 'orgaos',
  'implante-figado-depurador': 'orgaos',
  'implante-glandulas-adrenais': 'orgaos',
  'implante-laringe-camaleao': 'orgaos',
  'implante-capsula-antidoto': 'orgaos',
  'implante-diafragma-submerso': 'orgaos',
  'implante-cordas-vocais-sonicas': 'orgaos',
  'implante-rins-reator-filtrante': 'orgaos',
  'implante-nucleo-fusao-miniatura': 'orgaos',
  'implante-glandula-coagulante': 'orgaos',
  'implante-coracao-reserva': 'orgaos',
  'reliquia-coracao-ouroboros': 'orgaos',
  'reliquia-pulmoes-enkidu': 'orgaos',
  'reliquia-cordas-sereia': 'orgaos',
  // Pele e esqueleto
  'implante-pele-subdermica': 'pele-e-esqueleto',
  'implante-coluna-giroscopica': 'pele-e-esqueleto',
  'implante-bolsa-subdermica': 'pele-e-esqueleto',
  'implante-escudo-dermico-ablativo': 'pele-e-esqueleto',
  'implante-membrana-camuflagem': 'pele-e-esqueleto',
  'implante-esqueleto-reforco': 'pele-e-esqueleto',
  'implante-relogio-subcutaneo': 'pele-e-esqueleto',
  'implante-tatuagem-viva': 'pele-e-esqueleto',
  'implante-pele-refratora': 'pele-e-esqueleto',
  'implante-projetor-de-silhueta': 'pele-e-esqueleto',
  'implante-exoesqueleto-de-guerra': 'pele-e-esqueleto',
  'reliquia-espinha-adamastor': 'pele-e-esqueleto',
  // Neural: mexe no cérebro ou nos nervos e cobra +3
  'implante-interface-neural-keryx': 'neural',
  'implante-memoria-espelhada': 'neural',
  'implante-regulador-circadiano': 'neural',
  'implante-tradutor-neural': 'neural',
  'implante-sandevistan': 'neural',
  'implante-sinapses-reflexo-duplo': 'neural',
  'implante-rede-neural-estrategista': 'neural',
  'implante-sistema-espelhado-fantasma': 'neural',
  'implante-chip-de-idioma': 'neural',
  'implante-filtro-de-dor': 'neural',
  'implante-mira-sinaptica': 'neural',
  'implante-ancora-de-identidade': 'neural',
  'implante-cortex-paralelo': 'neural',
};

// Peças com custo próprio, fora da tabela. A Âncora cobra pouco porque o
// trabalho dela é aliviar as outras.
const CUSTO_FIXO = {
  'implante-ancora-de-identidade': 6,
};

const ETIQUETA = /^Sanidade máxima\s*[−-]\s*\d+$/;
const etiqueta = (custo) => `Sanidade máxima −${custo}`;
const ETIQUETA_SISTEMA = /^Sistema: /;
const etiquetaSistema = (sistema) => `Sistema: ${ROTULO_SISTEMA_IMPLANTE[sistema]}`;

const original = fs.readFileSync(caminho, 'utf8');
const documento = JSON.parse(original);
const problemas = [];
let mexidos = 0;

for (const entrada of documento.entradas) {
  if (entrada.tipo !== 'implante') continue;
  const conteudo = entrada.conteudo || (entrada.conteudo = {});
  const sistema = SISTEMA[entrada.id];
  if (!sistema) {
    problemas.push(`${entrada.id}: sem sistema em tools/normalizar-implantes.mjs`);
    continue;
  }
  const custo = CUSTO_FIXO[entrada.id] ?? custoSanidadeDoImplante({ raridade: conteudo.raridade, sistema });
  const antes = JSON.stringify(conteudo);
  conteudo.sistema = sistema;
  conteudo.custoSanidade = custo;
  const atributos = Array.isArray(conteudo.atributos)
    ? conteudo.atributos.filter((item) => !ETIQUETA.test(String(item)) && !ETIQUETA_SISTEMA.test(String(item)))
    : [];
  // As etiquetas vêm logo depois da primeira ("Implante Cibernético"), para serem vistas primeiro.
  atributos.splice(Math.min(1, atributos.length), 0, etiqueta(custo), etiquetaSistema(sistema));
  conteudo.atributos = atributos;
  if (JSON.stringify(conteudo) !== antes) mexidos += 1;
}

const novo = `${JSON.stringify(documento, null, 2)}\n`;
if (problemas.length) {
  console.error(problemas.join('\n'));
  process.exit(1);
}
if (check) {
  if (novo !== original) {
    console.error(`${mexidos} implante(s) fora da regra de Sanidade. Rode: npm run normalize:implantes`);
    process.exit(1);
  }
  console.log('Implantes com sistema e custo de Sanidade em dia.');
} else if (novo !== original) {
  fs.writeFileSync(caminho, novo, 'utf8');
  console.log(`Implantes ajustados: ${mexidos}.`);
} else {
  console.log('Nada a ajustar.');
}
