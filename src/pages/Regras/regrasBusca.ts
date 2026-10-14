/** Busca do Livro de Regras: sem acento, sem caixa, e todas as palavras digitadas precisam aparecer. */
export function normalizar(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
}

/** `termo` já normalizado. Vazio casa com tudo. */
export function casaComBusca(alvo: string, termo: string): boolean {
  if (!termo) return true;
  const texto = normalizar(alvo);
  return termo.split(/\s+/).filter(Boolean).every((palavra) => texto.includes(palavra));
}

/** O texto de uma página sem as marcas HTML, para a busca ler só o que a pessoa lê. */
export function textoSemMarcas(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}
