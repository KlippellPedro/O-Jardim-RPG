/** Números repetíveis a partir de um texto: a mesma rasura sempre sai igual para o mesmo registro. */
function semear(texto: string): () => number {
  let estado = 2166136261;
  for (let i = 0; i < texto.length; i += 1) {
    estado ^= texto.charCodeAt(i);
    estado = Math.imul(estado, 16777619);
  }
  return () => {
    estado ^= estado << 13;
    estado ^= estado >>> 17;
    estado ^= estado << 5;
    return ((estado >>> 0) % 10000) / 10000;
  };
}

/** Larguras (em %) de faixas que imitam palavras riscadas. Nunca usa o texto real: só o tamanho aproximado. */
export function larguraDasFaixas(semente: string, quantidade: number, minimo = 18, maximo = 96): number[] {
  const sorteio = semear(semente);
  return Array.from({ length: quantidade }, (_, indice) => {
    const ultima = indice === quantidade - 1 && quantidade > 1;
    const largura = minimo + sorteio() * (maximo - minimo);
    return Math.round(ultima ? Math.min(largura, 58) : largura);
  });
}
