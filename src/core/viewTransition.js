export function executarComTransicao(atualizar) {
  if (!document.startViewTransition) return atualizar();

  const transicao = document.startViewTransition(atualizar);
  transicao.ready.catch(() => {});
  transicao.updateCallbackDone.catch(() => {});
  transicao.finished.catch(() => {});
  return transicao;
}

export function reiniciarAnimacao(elemento) {
  if (!elemento) return;
  elemento.style.animation = 'none';
  void elemento.offsetHeight;
  elemento.style.animation = '';
}
