/** Partes de um tópico do Livro de Regras.
 *
 * O texto de um tópico é dividido nos seus h3: cada seção vira uma parte que se lê sozinha, e o que vem
 * antes do primeiro h3 (a abertura e o "Em resumo") vira a visão geral, com o índice das partes. Os
 * catálogos (Condições, Legados, Magias...) e o bloco do Mestre entram como partes extras no fim.
 *
 * Nada aqui muda o texto: é só a forma de mostrar. O id da parte é o id da seção (`secao-iniciativa`)
 * sem o prefixo, para o endereço ficar curto (`/regras?topico=combate&parte=iniciativa`) e os links
 * antigos de seção (`&secao=secao-iniciativa`) continuarem caindo na parte certa. */

import { idDaSecao } from './secaoDoLivro';

export const ID_DA_ABERTURA = 'abertura';

/** Abaixo disto o tópico é curto demais para ser dividido: ele aparece inteiro. */
export const MINIMO_DE_PARTES_PARA_DIVIDIR = 2;

export interface ParteDoTopico {
  id: string;
  titulo: string;
  /** Primeira frase da parte, para o índice e para o botão de "próxima". */
  resumo: string;
  /** Parte que não vem do texto: um catálogo ou o bloco de quem conduz a mesa. */
  extra?: boolean;
}

const PREFIXO_DA_SECAO = 'secao-';

/** "secao-fome-e-sede" vira "fome-e-sede". */
export const idDaParte = (idDeSecao: string) => (
  idDeSecao.startsWith(PREFIXO_DA_SECAO) ? idDeSecao.slice(PREFIXO_DA_SECAO.length) : idDeSecao
);

/** A parte de um título de seção, pela mesma conta do id da seção. */
export const parteDoTitulo = (titulo: string, indice = 0) => idDaParte(idDaSecao(titulo, indice));

const limitar = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

/** Primeira frase do texto, cortada numa palavra se passar do limite. */
export function resumoDaParte(texto: string, limite = 150): string {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (!limpo) return '';
  const fimDaFrase = limpo.search(/[.!?:](\s|$)/);
  const frase = fimDaFrase >= 0 ? limpo.slice(0, fimDaFrase + 1) : limpo;
  if (frase.length <= limite) return frase.replace(/:$/, '.');
  const corte = frase.slice(0, limite);
  const ultimoEspaco = corte.lastIndexOf(' ');
  return `${(ultimoEspaco > limite * 0.6 ? corte.slice(0, ultimoEspaco) : corte).replace(/[,;:\s]+$/, '')}…`;
}

/** As partes que aparecem no índice e no menu: tudo menos a visão geral. */
export const partesDoIndice = (partes: readonly ParteDoTopico[]) => partes.filter((parte) => parte.id !== ID_DA_ABERTURA);

/** O tópico só se divide quando tem pelo menos duas partes além da visão geral. */
export const topicoSeDivide = (partes: readonly ParteDoTopico[]) => partesDoIndice(partes).length >= MINIMO_DE_PARTES_PARA_DIVIDIR;

/** Posição da parte pedida na lista; uma parte que não existe (ou nenhuma) é a visão geral. */
export function indiceDaParte(partes: readonly ParteDoTopico[], id: string | null | undefined): number {
  if (!id) return 0;
  const indice = partes.findIndex((parte) => parte.id === id);
  return indice >= 0 ? indice : 0;
}

/** Quanto do tópico já passou: cada parte vale o mesmo pedaço, e dentro dela conta a rolagem. */
export function progressoNasPartes(indice: number, total: number, fracaoDaParte: number): number {
  const fracao = limitar(Number.isFinite(fracaoDaParte) ? fracaoDaParte : 0, 0, 1);
  if (!(total > 1)) return fracao;
  return limitar((limitar(indice, 0, total - 1) + fracao) / total, 0, 1);
}

/** O caminho de volta: de um progresso do tópico inteiro para a parte e a rolagem dentro dela. */
export function posicaoNasPartes(progresso: number, total: number): { indice: number; fracao: number } {
  const valor = limitar(Number.isFinite(progresso) ? progresso : 0, 0, 1);
  if (!(total > 1)) return { indice: 0, fracao: valor };
  const bruto = valor * total;
  const indice = Math.min(total - 1, Math.floor(bruto));
  return { indice, fracao: limitar(bruto - indice, 0, 1) };
}
