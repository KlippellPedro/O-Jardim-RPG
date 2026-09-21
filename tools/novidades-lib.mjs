// Transforma commits em "novidades" para o mural da Home.
//
// Só entram commits de novidade (`feat`), melhoria de desempenho (`perf`) e
// correção (`fix`). Testes, refatoração, documentação e manutenção ficam de
// fora: o mural é para quem joga, não para quem programa.
//
// Para o texto sair do jeito que a pessoa vai ler (com acento e sem jargão),
// o corpo do commit pode ter uma linha `Novidade: texto` e linhas `- item` com
// os detalhes. Sem isso, vale o assunto do commit.

export const AREAS = {
  ficha: 'Ficha',
  inventario: 'Ficha',
  bens: 'Ficha',
  progressao: 'Ficha',
  dados: 'Dados',
  audio: 'Áudio',
  sessao: 'Sessão',
  mesa: 'Sessão',
  loja: 'Loja',
  loot: 'Loja',
  economia: 'Loja',
  mundo: 'Mundo',
  livro: 'Livro',
  regras: 'Livro',
  criador: 'Criador',
  plataforma: 'Plataforma',
  home: 'Início',
  quadro: 'Quadro',
  bots: 'Discord',
  banqueiro: 'Discord',
  jornalista: 'Discord',
  site: 'Site',
  front: 'Site',
  frontend: 'Site',
  classes: 'Livro',
  racas: 'Livro',
  magia: 'Livro',
  conteudo: 'Livro',
  data: 'Livro',
  lore: 'Mundo',
  seguranca: 'Plataforma',
  assets: 'Site',
  game: 'Jogo 2D',
};

// Escopos de bastidor: o mural é para quem joga, não para quem programa.
const ESCOPOS_OCULTOS = new Set(['docs', 'tools', 'deploy']);

const TIPOS = { feat: 'novo', perf: 'melhoria', fix: 'correcao' };
const PADRAO_ASSUNTO = /^(feat|fix|perf)(?:\(([^)]+)\))?!?:\s*(.+)$/i;

const capitalizar = (texto) => (texto ? texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1) : texto);

/** Lê um commit e devolve a novidade, ou null se ele não for do tipo que aparece. */
export function interpretarCommit({ hash, data, assunto, corpo = '' }) {
  const encontrado = PADRAO_ASSUNTO.exec(String(assunto || '').trim());
  if (!encontrado) return null;
  const [, tipoBruto, escopo, resto] = encontrado;
  const linhas = String(corpo).split(/\r?\n/).map((linha) => linha.trim());
  const explicita = linhas.find((linha) => /^novidade:/i.test(linha));
  const titulo = capitalizar((explicita ? explicita.replace(/^novidade:\s*/i, '') : resto).replace(/\.$/, '').trim());
  if (!titulo) return null;
  const detalhes = linhas
    .filter((linha) => /^[-*]\s+\S/.test(linha))
    .map((linha) => linha.replace(/^[-*]\s+/, '').trim())
    .slice(0, 6);
  const escopoLimpo = (escopo || '').toLowerCase().trim();
  if (ESCOPOS_OCULTOS.has(escopoLimpo)) return null;
  return {
    id: String(hash || '').slice(0, 7),
    data: String(data || '').slice(0, 10),
    tipo: TIPOS[tipoBruto.toLowerCase()],
    area: AREAS[escopoLimpo] || 'Geral',
    titulo,
    detalhes,
  };
}

/** Lê a saída de `git log` no formato campo\x1f...\x1e e devolve as novidades. */
export function lerLogDoGit(saida) {
  return String(saida || '')
    .split('\x1e')
    .map((bloco) => bloco.trim())
    .filter(Boolean)
    .map((bloco) => {
      const [hash, data, assunto, corpo] = bloco.split('\x1f');
      return interpretarCommit({ hash, data, assunto, corpo });
    })
    .filter(Boolean);
}

/** Junta as novidades dos commits com as escritas à mão, sem repetir id, da mais nova para a mais antiga. */
export function montarNovidades(dosCommits, manuais = [], limite = 80) {
  const vistos = new Set();
  const todas = [...manuais, ...dosCommits].filter((item) => {
    if (!item || !item.id || !item.titulo || !/^\d{4}-\d{2}-\d{2}$/.test(item.data)) return false;
    if (vistos.has(item.id)) return false;
    vistos.add(item.id);
    return true;
  });
  return todas
    .map((item, ordem) => ({ item, ordem }))
    .sort((a, b) => (a.item.data === b.item.data ? a.ordem - b.ordem : a.item.data < b.item.data ? 1 : -1))
    .map(({ item }) => item)
    .slice(0, limite);
}
