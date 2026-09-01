export function paginaGeralDoMundoVisivel(oculta: unknown, isMestre: boolean): boolean {
  return isMestre || oculta !== true;
}
