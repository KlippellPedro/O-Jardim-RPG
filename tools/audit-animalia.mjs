// Auditoria da Animália: compara o pacote de Vida, Mana e Estamina de cada combinação de Forma e
// Morfologia com o das outras raças comuns, e confere o catálogo de animais e o tom dos textos.
//
//   node tools/audit-animalia.mjs          tabela legível
//   node tools/audit-animalia.mjs --json   relatório em JSON (os testes usam este)
//   node tools/audit-animalia.mjs --check  sai com erro se houver violação
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const racas = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'ficha', 'racas.json'), 'utf8'));
const animalia = racas.find((raca) => raca.id === 'animalia');

const NIVEIS = [1, 13, 36, 60];
/** Nível 1 não pode passar do maior pacote inicial entre as raças comuns com escada (Golem, Gigante, Vampiro). */
const TETO_NIVEL_1 = 6;
/** No topo a Animália fica abaixo das raças de corpo grande e na faixa das leves (Anão, Sereia, Mímico). */
const TETO_NIVEL_60 = 16;
const PISO_NIVEL_60 = 9;
const MINIMO_DE_ANIMAIS_POR_MORFOLOGIA = 6;
const TAMANHOS = ['Pequeno', 'Normal', 'Grande', 'Enorme'];
const ESCADA = [1, 13, 36];

const soma = (opcao) => (Number(opcao?.vida) || 0) + (Number(opcao?.mana) || 0) + (Number(opcao?.estamina) || 0);
const degraus = (nivel) => animalia.estagios.filter((estagio) => (estagio.nivel_minimo || 1) <= nivel);

/** Todo texto que o jogador lê na raça, com a origem de cada um, para a checagem de tom. */
function textos() {
  const lista = [{ origem: 'raça', texto: animalia.descricao }, { origem: 'raça', texto: animalia.descricao_naturezas },
    { origem: 'raça', texto: animalia.descricao_variantes }, { origem: 'raça', texto: animalia.descricao_animais }];
  for (const linha of animalia.fisiologia || []) lista.push({ origem: 'fisiologia', texto: linha });
  const opcoes = [...animalia.naturezas, ...animalia.variantes, ...animalia.animais, ...animalia.estagios];
  for (const opcao of opcoes) {
    lista.push({ origem: opcao.titulo, texto: opcao.descricao });
    for (const linha of opcao.fisiologia || []) lista.push({ origem: opcao.titulo, texto: linha });
    for (const traco of opcao.caracteristicas || []) lista.push({ origem: `${opcao.titulo} / ${traco.titulo}`, texto: traco.descricao });
  }
  for (const traco of animalia.caracteristicas || []) lista.push({ origem: traco.titulo, texto: traco.descricao });
  return lista.filter((item) => typeof item.texto === 'string' && item.texto);
}

export function analisarAnimalia() {
  const combinacoes = [];
  const violacoes = [];
  const problema = (regra, origem, detalhe) => violacoes.push({ regra, origem, detalhe });

  for (const forma of animalia.naturezas) {
    for (const morfologia of animalia.variantes) {
      const pacote = Object.fromEntries(NIVEIS.map((nivel) => [
        nivel,
        soma(animalia) + soma(forma) + soma(morfologia) + degraus(nivel).reduce((total, estagio) => total + soma(estagio), 0),
      ]));
      combinacoes.push({ forma: forma.id, morfologia: morfologia.id, pacote });
      const origem = `${forma.titulo} / ${morfologia.titulo}`;
      if (pacote[1] > TETO_NIVEL_1) problema('pacote-inicial-alto', origem, `${pacote[1]} no nível 1 (teto ${TETO_NIVEL_1})`);
      if (pacote[60] > TETO_NIVEL_60) problema('pacote-final-alto', origem, `${pacote[60]} no nível 60 (teto ${TETO_NIVEL_60})`);
      if (pacote[60] < PISO_NIVEL_60) problema('pacote-final-baixo', origem, `${pacote[60]} no nível 60 (piso ${PISO_NIVEL_60})`);
    }
  }

  // Escada: três degraus nos níveis combinados, cada um mais forte que o anterior.
  const niveisDaEscada = animalia.estagios.map((estagio) => estagio.nivel_minimo || 1);
  if (JSON.stringify(niveisDaEscada) !== JSON.stringify(ESCADA)) {
    problema('escada-diferente', 'estágios', `níveis ${niveisDaEscada.join(', ')} em vez de ${ESCADA.join(', ')}`);
  }
  for (let i = 1; i < animalia.estagios.length; i += 1) {
    if (soma(animalia.estagios[i]) < soma(animalia.estagios[i - 1])) {
      problema('degrau-mais-fraco', animalia.estagios[i].titulo, 'soma menos que o degrau anterior');
    }
  }

  // Cada Forma e cada Morfologia entregam pelo menos um traço, e Fera paga no equipamento.
  for (const opcao of [...animalia.naturezas, ...animalia.variantes]) {
    if (!(opcao.caracteristicas || []).length) problema('sem-traco', opcao.titulo, 'não entrega nenhum traço');
    if (!opcao.descricao) problema('sem-descricao', opcao.titulo, 'não tem descrição');
  }
  const fera = animalia.naturezas.find((forma) => forma.id === 'fera');
  const textoDaFera = (fera?.caracteristicas || []).map((traco) => traco.descricao).join(' ');
  if (!/o dobro/.test(textoDaFera)) problema('fera-sem-custo-de-equipamento', 'Fera', 'armadura e arreio precisam custar o dobro');
  const tracos = animalia.naturezas.find((forma) => forma.id === 'tracos');
  if (tracos && !tracos.sem_arma_natural) problema('tracos-com-arma', 'Traços', 'Traços não tem arma natural');
  if (tracos && tracos.tamanho !== 'Normal') problema('tracos-sem-tamanho-normal', 'Traços', 'Traços tem corpo de pessoa');

  // Catálogo de animais.
  const ids = animalia.animais.map((animal) => animal.id);
  for (const id of ids.filter((id, i) => ids.indexOf(id) !== i)) problema('animal-repetido', id, 'id aparece duas vezes');
  const morfologias = new Set(animalia.variantes.map((m) => m.id));
  for (const animal of animalia.animais) {
    if (!TAMANHOS.includes(animal.tamanho)) problema('tamanho-invalido', animal.titulo, `tamanho "${animal.tamanho}"`);
    if (!animal.arma_natural) problema('animal-sem-arma', animal.titulo, 'sem arma natural');
    for (const id of animal.morfologias || []) {
      if (!morfologias.has(id)) problema('morfologia-inexistente', animal.titulo, `Morfologia "${id}"`);
    }
    if (!(animal.morfologias || []).length) problema('animal-sem-morfologia', animal.titulo, 'não serve a nenhuma Morfologia');
  }
  const animaisPorMorfologia = {};
  for (const morfologia of animalia.variantes) {
    const quantos = animalia.animais.filter((animal) => (animal.morfologias || []).includes(morfologia.id)).length;
    animaisPorMorfologia[morfologia.id] = quantos;
    if (quantos < MINIMO_DE_ANIMAIS_POR_MORFOLOGIA) {
      problema('poucos-animais', morfologia.titulo, `${quantos} animais (mínimo ${MINIMO_DE_ANIMAIS_POR_MORFOLOGIA})`);
    }
  }

  // Tom do texto para o jogador (AGENTS.md): sem travessão, sem "eco", sem a antítese "não é X, é Y".
  for (const { origem, texto } of textos()) {
    if (/[—–]/.test(texto)) problema('travessao', origem, 'o texto tem travessão');
    if (/\beco(s)?\b/i.test(texto)) problema('palavra-eco', origem, 'o texto usa "eco"');
    if (/\bnão (é|são|foi|era) [^.;]{1,60}, (é|são|foi|era)\b/i.test(texto)) problema('antitese', origem, 'o texto usa "não é X, é Y"');
  }

  return { combinacoes, animaisPorMorfologia, violacoes };
}

const executadoDiretamente = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executadoDiretamente) {
  const { combinacoes, animaisPorMorfologia, violacoes } = analisarAnimalia();
  if (process.argv.includes('--json')) {
    process.stdout.write(`${JSON.stringify({ combinacoes, animaisPorMorfologia, violacoes }, null, 2)}\n`);
  } else {
    console.log('Pacote de Vida + Mana + Estamina por Forma e Morfologia (níveis 1 / 13 / 36 / 60):');
    for (const c of combinacoes) {
      console.log(`  ${c.forma.padEnd(8)} ${c.morfologia.padEnd(11)} ${NIVEIS.map((n) => String(c.pacote[n]).padStart(3)).join(' ')}`);
    }
    console.log('\nAnimais por Morfologia:', Object.entries(animaisPorMorfologia).map(([id, n]) => `${id} ${n}`).join(' · '));
    console.log(`\n${combinacoes.length} combinações analisadas, ${violacoes.length} violações.`);
    for (const v of violacoes) console.log(`  [${v.regra}] ${v.origem}: ${v.detalhe}`);
  }
  if (process.argv.includes('--check') && violacoes.length > 0) process.exit(1);
}
