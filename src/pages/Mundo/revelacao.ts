import { useEffect, useState } from 'react';

/** O que este navegador já viu de cada registro: 'l' (retido) ou 'o' (aberto). */
const CHAVE_ESTADO = 'jardim:lore-visto';
/** Registros que abriram desde a última vez que a pessoa olhou e ainda não foram lidos. */
const CHAVE_NOVOS = 'jardim:lore-novos';

export interface IArmazem {
  getItem: (chave: string) => string | null;
  setItem: (chave: string, valor: string) => void;
}

const ler = (armazem: IArmazem, chave: string): Record<string, unknown> => {
  try {
    const bruto = JSON.parse(armazem.getItem(chave) || '{}');
    return bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  } catch {
    return {};
  }
};

const gravar = (armazem: IArmazem, chave: string, valor: Record<string, unknown>) => {
  try {
    armazem.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento, o efeito só some ao recarregar.
  }
};

/** Registra o que a pessoa está vendo agora e diz se este registro ACABOU de ser revelado para ela
 * (estava retido na última vez e agora está aberto). O "novo" fica até ela abrir o registro. */
export function observarRegistro(armazem: IArmazem, campanhaId: string, id: string, retido: boolean): boolean {
  const chave = `${campanhaId}:${id}`;
  const estados = ler(armazem, CHAVE_ESTADO);
  const novos = ler(armazem, CHAVE_NOVOS);
  const antes = estados[chave];
  if (antes === 'l' && !retido) novos[chave] = true;
  if (retido) delete novos[chave];
  const agora = retido ? 'l' : 'o';
  if (antes !== agora) gravar(armazem, CHAVE_ESTADO, { ...estados, [chave]: agora });
  gravar(armazem, CHAVE_NOVOS, novos);
  return novos[chave] === true;
}

export function marcarComoLido(armazem: IArmazem, campanhaId: string, id: string): void {
  const novos = ler(armazem, CHAVE_NOVOS);
  if (novos[`${campanhaId}:${id}`]) {
    delete novos[`${campanhaId}:${id}`];
    gravar(armazem, CHAVE_NOVOS, novos);
  }
}

const armazemLocal = (): IArmazem | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

/** `recemRevelado` liga o brilho no cartão até a pessoa abrir; `lido()` apaga o aviso. */
export function useRecemRevelado(campanhaId: string | undefined, id: string, retido: boolean) {
  const [recemRevelado, setRecemRevelado] = useState(false);
  useEffect(() => {
    const armazem = armazemLocal();
    if (!armazem || !campanhaId) return;
    setRecemRevelado(observarRegistro(armazem, campanhaId, id, retido));
  }, [campanhaId, id, retido]);
  const lido = () => {
    const armazem = armazemLocal();
    if (armazem && campanhaId) marcarComoLido(armazem, campanhaId, id);
    setRecemRevelado(false);
  };
  return { recemRevelado, lido };
}
