const GAMBLER_ACCESS_KEY = 'jardim:gambler-cassino:entrada';
let acessoEmMemoria = false;

export function sortearEntradaGambler(valorAleatorio?: number): boolean {
  let valor = valorAleatorio;
  if (valor === undefined) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    valor = buffer[0];
  }
  if (!Number.isSafeInteger(valor) || valor! < 0) {
    throw new TypeError('o sorteio da ficha exige um inteiro não negativo');
  }
  return valor! % 2 === 0;
}

export function concederEntradaGambler(storage: Storage = sessionStorage): void {
  acessoEmMemoria = true;
  try {
    storage.setItem(GAMBLER_ACCESS_KEY, 'sim');
  } catch {
    // Navegadores que bloqueiam sessionStorage continuam permitindo a entrada
    // durante a montagem atual, sem transformar a ficha em uma falha de UI.
  }
}

export function possuiEntradaGambler(storage: Storage = sessionStorage): boolean {
  if (acessoEmMemoria) return true;
  try {
    return storage.getItem(GAMBLER_ACCESS_KEY) === 'sim';
  } catch {
    return false;
  }
}
