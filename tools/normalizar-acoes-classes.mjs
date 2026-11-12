// Vocabulário de ação das classes (revisão geral de 2026-11-12).
//
// O campo `acao` de habilidades, estágios, opções e poderes tinha 78 textos
// diferentes, 56 deles usados uma vez só. Agora ele guarda um de sete tipos e o
// detalhe vai para `momento`:
//   Passivo, Ação Livre, Ação de Movimento, Ação Padrão, Ação Completa, Reação,
//   Fora de combate.
// A ficha, a página da classe e o Livro mostram os dois juntos
// ("Ação Livre · antes do ataque"), então o jogador lê o mesmo de antes.
//
// Uso: node tools/normalizar-acoes-classes.mjs [--check] [--listar]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caminho = path.join(root, 'data', 'ficha', 'classes.json');
const check = process.argv.includes('--check');
const listar = process.argv.includes('--listar');

export const TIPOS_DE_ACAO = ['Passivo', 'Ação Livre', 'Ação de Movimento', 'Ação Padrão', 'Ação Completa', 'Reação', 'Fora de combate'];

// Casos que a regra geral não resolve sozinha.
const EXCECOES = {
  'Ação Completa durante um descanso completo': ['Fora de combate', 'Ação Completa durante um descanso completo'],
  'Ação Completa no fim do descanso': ['Fora de combate', 'Ação Completa no fim do descanso'],
  'Escolhida ao interceptar com sucesso': ['Ação Livre', 'ao interceptar com sucesso'],
  // Sinônimos que diziam o mesmo de jeitos diferentes.
  'Ação Livre depois do acerto': ['Ação Livre', 'depois de acertar'],
  'Ação Livre após acertar': ['Ação Livre', 'depois de acertar'],
  'Ação Livre depois de acertar': ['Ação Livre', 'depois de acertar'],
  'Ação Livre antes de atacar': ['Ação Livre', 'antes do ataque'],
  'Ação Livre antes de rolar o ataque': ['Ação Livre', 'antes do ataque'],
  'Ação Livre no ataque': ['Ação Livre', 'no momento do ataque'],
  'Parte da ação de servir': ['Ação Livre', 'como parte da ação de servir'],
  'Conforme a invenção': ['Fora de combate', 'projetada com o Mestre; o uso segue a invenção'],
  'Declarado antes do rito': ['Fora de combate', 'declarado ao iniciar o rito'],
  'Declarado antes de o rito começar': ['Fora de combate', 'declarado ao iniciar o rito'],
  'Declarado ao iniciar o rito': ['Fora de combate', 'declarado ao iniciar o rito'],
  'Um minuto, fora de combate': ['Fora de combate', 'um minuto'],
  '10 minutos, fora de combate': ['Fora de combate', 'dez minutos'],
  'Um dia, fora de combate': ['Fora de combate', 'um dia'],
};

const PREFIXO = /^(Passivo|Reação|Ação Livre|Ação Padrão|Ação de Movimento|Ação Completa|Fora de combate)\b[,]?\s*(.*)$/;

const minuscula = (texto) => (texto ? texto.charAt(0).toLowerCase() + texto.slice(1) : texto);

export function separarAcao(texto) {
  const bruto = String(texto || '').trim();
  if (!bruto) return null;
  if (EXCECOES[bruto]) return EXCECOES[bruto];
  const achado = bruto.match(PREFIXO);
  if (achado) return [achado[1], achado[2].trim()];
  // Sem tipo no começo: é coisa de fora de combate (descanso, oficina, recado, balcão).
  return ['Fora de combate', minuscula(bruto)];
}

const original = fs.readFileSync(caminho, 'utf8');
const fimDeLinha = original.includes('\r\n') ? '\r\n' : '\n';
const vistos = new Map();

// Edita só as linhas `"acao": "..."`, com o mesmo recuo, e põe o `momento` logo
// abaixo: o resto do arquivo fica byte a byte igual.
const linhas = original.split(fimDeLinha);
const saida = [];
for (const linha of linhas) {
  const achado = linha.match(/^(\s*)"acao": ("(?:[^"\\]|\\.)*")(,?)$/);
  if (!achado) { saida.push(linha); continue; }
  const [, recuo, literal, virgula] = achado;
  const texto = JSON.parse(literal);
  if (TIPOS_DE_ACAO.includes(texto)) { saida.push(linha); continue; }
  const [tipo, momento] = separarAcao(texto);
  vistos.set(texto, `${tipo}${momento ? ` · ${momento}` : ''}`);
  if (momento) {
    saida.push(`${recuo}"acao": ${JSON.stringify(tipo)},`);
    saida.push(`${recuo}"momento": ${JSON.stringify(momento)}${virgula}`);
  } else {
    saida.push(`${recuo}"acao": ${JSON.stringify(tipo)}${virgula}`);
  }
}
const novo = saida.join(fimDeLinha);
JSON.parse(novo);

if (listar) for (const [antes, depois] of vistos) console.log(`${antes}  =>  ${depois}`);
if (check) {
  if (vistos.size) {
    console.error(`${vistos.size} textos de ação fora dos sete tipos. Rode: node tools/normalizar-acoes-classes.mjs`);
    process.exit(1);
  }
  console.log('Ações das classes nos sete tipos.');
} else if (vistos.size) {
  fs.writeFileSync(caminho, novo, 'utf8');
  console.log(`Ações normalizadas: ${vistos.size} textos diferentes viraram tipo + momento.`);
} else {
  console.log('Nada a normalizar.');
}
