/** Endereço de uma seção do Livro de Regras.
 *
 * O leitor dá a cada h3 de um tópico um id feito do título ("Fome e sede" vira
 * "secao-fome-e-sede"), e a ficha usa o mesmo id para abrir o livro direto na
 * seção certa (`/regras?topico=perigos&secao=secao-fome-e-sede`). A conta mora
 * aqui para os dois lados nunca discordarem.
 */

export const idDaSecao = (titulo: string, indice = 0) => {
  const slug = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `secao-${slug || indice}`;
};

/** Rota do leitor para um tópico e, se vier, para uma seção dele (pelo título do h3). */
export const rotaDaRegra = (topico: string, secao?: string) => {
  const parametros = new URLSearchParams({ topico });
  if (secao) parametros.set('secao', idDaSecao(secao));
  return `/regras?${parametros.toString()}`;
};
