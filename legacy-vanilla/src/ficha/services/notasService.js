function texto(valor, maximo = 200) {
  return String(valor ?? '').trim().slice(0, maximo);
}

function gerarId(prefixo = 'nota') {
  const token = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  return `${prefixo}-${token}`;
}

function dataSegura(valor) {
  const textoData = texto(valor, 40);
  if (!textoData || Number.isNaN(new Date(textoData).getTime())) return '';
  return new Date(textoData).toISOString();
}

function normalizarTopicos(valor) {
  if (!Array.isArray(valor)) return [];
  return valor.slice(0, 30).flatMap((topico, indice) => {
    if (!topico || typeof topico !== 'object') return [];
    const titulo = texto(topico.titulo ?? topico.label, 100);
    const conteudo = texto(topico.conteudo ?? topico.valor, 3000);
    if (!titulo && !conteudo) return [];
    return [{ id: texto(topico.id, 100) || `topico-${indice}`, titulo, conteudo }];
  });
}

export function normalizarNota(nota, indice = 0) {
  if (!nota || typeof nota !== 'object' || Array.isArray(nota)) return null;
  const titulo = texto(nota.titulo || nota.nome, 120);
  const conteudo = texto(nota.conteudo ?? nota.descricao, 10000);
  if (!titulo && !conteudo) return null;
  return {
    id: texto(nota.id, 120) || `nota-importada-${indice}`,
    titulo: titulo || 'Nota sem título',
    categoria: texto(nota.categoria ?? nota.tipo, 60) || 'Geral',
    conteudo,
    topicos: normalizarTopicos(nota.topicos ?? nota.campos),
    favorito: Boolean(nota.favorito),
    criadoEm: dataSegura(nota.criadoEm ?? nota.data),
    atualizadoEm: dataSegura(nota.atualizadoEm ?? nota.criadoEm ?? nota.data),
  };
}

export function normalizarNotas(valor) {
  if (typeof valor === 'string') {
    const conteudo = texto(valor, 10000);
    return conteudo ? [{
      id: 'nota-legado',
      titulo: 'Anotações antigas',
      categoria: 'Geral',
      conteudo,
      topicos: [],
      favorito: false,
      criadoEm: '',
      atualizadoEm: '',
    }] : [];
  }
  if (!Array.isArray(valor)) return [];
  const unicas = new Map();
  valor.slice(0, 300).forEach((nota, indice) => {
    const normalizada = normalizarNota(nota, indice);
    if (normalizada) unicas.set(normalizada.id, normalizada);
  });
  return [...unicas.values()];
}

export function criarNota(dados) {
  const agora = new Date().toISOString();
  return normalizarNota({ ...dados, id: gerarId(), criadoEm: agora, atualizadoEm: agora });
}

export function tocarNota(nota, alteracoes) {
  return normalizarNota({ ...nota, ...alteracoes, atualizadoEm: new Date().toISOString() });
}

export function criarTopico(dados = {}) {
  return {
    id: gerarId('topico'),
    titulo: texto(dados.titulo, 100),
    conteudo: texto(dados.conteudo, 3000),
  };
}
