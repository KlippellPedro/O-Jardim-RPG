const limpezasAtivas = new Set();

export function registrarCena(limpar) {
  if (typeof limpar !== 'function') return () => {};

  let ativa = true;
  const limparRegistrada = () => {
    if (!ativa) return;
    ativa = false;
    limpezasAtivas.delete(limparRegistrada);
    limpar();
  };

  limpezasAtivas.add(limparRegistrada);
  return limparRegistrada;
}

export function limparCenas() {
  [...limpezasAtivas].forEach(limpar => limpar());
}
