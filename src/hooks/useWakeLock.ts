import { useEffect, useState } from 'react';

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

/** Mantém a tela do celular ligada enquanto `ativo` for verdadeiro. Some do
 * mapa quando o navegador não oferece a API (`suportado` fica falso) ou
 * quando a aba fica oculta; ao voltar, a trava é pedida de novo. */
export function useWakeLock(ativo: boolean): { suportado: boolean; travado: boolean } {
  const suportado = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [travado, setTravado] = useState(false);

  useEffect(() => {
    if (!ativo || !suportado) {
      setTravado(false);
      return undefined;
    }
    let cancelado = false;
    let sentinela: WakeLockSentinelLike | null = null;

    const pedir = async () => {
      try {
        const wakeLock = (navigator as unknown as { wakeLock: { request: (tipo: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
        const nova = await wakeLock.request('screen');
        if (cancelado) {
          void nova.release().catch(() => undefined);
          return;
        }
        sentinela = nova;
        setTravado(true);
      } catch {
        // Bateria fraca ou permissão negada: o Modo mesa continua funcionando, só a tela apaga.
        setTravado(false);
      }
    };

    const aoVoltar = () => {
      if (document.visibilityState === 'visible' && !cancelado) void pedir();
    };

    void pedir();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      if (sentinela) void sentinela.release().catch(() => undefined);
      setTravado(false);
    };
  }, [ativo, suportado]);

  return { suportado, travado };
}
