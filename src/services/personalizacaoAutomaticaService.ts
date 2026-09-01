// Permite que cada jogador reescreva, só na própria ficha, o nome/descrição de
// itens gerados automaticamente por raça, classe ou Fruto do Éden (habilidades,
// poderes, magias, rituais, selos e encantamentos), sem alterar o catálogo oficial.

export interface IPersonalizacaoAutomatica {
  titulo?: string;
  texto?: string;
  /** Esconde o item automático desta ficha (ex.: jogador juntou duas
   * habilidades numa só e não quer ver a outra duplicada). Não apaga nada do
   * catálogo nem da raça/classe - é reversível a qualquer momento. */
  oculta?: boolean;
}

export function obterPersonalizacoesAutomaticas(ficha: any): Record<string, IPersonalizacaoAutomatica> {
  return ficha?.personalizacoesAutomaticas || {};
}

export function personalizacaoDoItem(ficha: any, id: string): IPersonalizacaoAutomatica | undefined {
  return obterPersonalizacoesAutomaticas(ficha)[id];
}

export function marcarItemAutomaticoOculto(
  personalizacao?: IPersonalizacaoAutomatica,
): IPersonalizacaoAutomatica {
  return { ...(personalizacao || {}), oculta: true };
}

export function restaurarVisibilidadeItemAutomatico(
  personalizacao?: IPersonalizacaoAutomatica,
): IPersonalizacaoAutomatica {
  if (!personalizacao) return {};
  const { oculta: _oculta, ...resto } = personalizacao;
  return resto;
}

export function salvarPersonalizacaoAutomatica(
  onUpdate: (caminho: string[], valor: any) => void,
  ficha: any,
  id: string,
  valores: IPersonalizacaoAutomatica,
) {
  const atuais = obterPersonalizacoesAutomaticas(ficha);
  const limpo: IPersonalizacaoAutomatica = {};
  if (valores.titulo?.trim()) limpo.titulo = valores.titulo.trim();
  if (valores.texto?.trim()) limpo.texto = valores.texto.trim();
  if (valores.oculta) limpo.oculta = true;

  if (!limpo.titulo && !limpo.texto && !limpo.oculta) {
    const { [id]: _removido, ...resto } = atuais;
    onUpdate(['ficha', 'personalizacoesAutomaticas'], resto);
    return;
  }

  onUpdate(['ficha', 'personalizacoesAutomaticas'], { ...atuais, [id]: limpo });
}
