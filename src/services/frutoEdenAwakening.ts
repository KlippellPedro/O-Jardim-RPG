/**
 * Seleciona os efeitos persistentes do Fruto sem depender do restante do
 * cálculo de equipamentos. A versão despertada substitui a versão-base para
 * impedir que o mesmo bônus seja contado duas vezes.
 */

export function efeitosBrutosDoFrutoEden(ficha: any): unknown {
  const fruto = ficha?.frutoEdenConsumido;
  const conteudo = fruto?.conteudo;
  if (!conteudo || typeof conteudo !== 'object' || Array.isArray(conteudo)) return [];

  if (fruto?.despertado === true) {
    if (Array.isArray(conteudo.efeitosFichaDespertado)) return conteudo.efeitosFichaDespertado;
  }

  return Array.isArray(conteudo.efeitosFicha) ? conteudo.efeitosFicha : [];
}
