import { useEffect, useRef, useState } from 'react';
import { assinarEventosDaCampanha } from '../services/campanhaEventos';

export type CampaignSSEConnectionState = 'disabled' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Escuta o mesmo fluxo SSE da Sessão ao Vivo (`/api/v1/sessao/{campanha_id}/eventos`)
 * fora do contexto de uma sessão aberta. O endpoint só exige ser membro da
 * campanha - não depende de haver uma sessão ativa - então serve para
 * qualquer tela que precise saber "algo mudou" (veículos, propriedades) sem
 * duplicar o estado pesado de iniciativa/turno do useSessaoStore.
 *
 * A conexão em si é uma só por aba (services/campanhaEventos): vários componentes
 * podem usar este hook ao mesmo tempo sem abrir um EventSource cada um.
 */
export function useCampaignSSE(
  campanhaId: string | null | undefined,
  onEvent: (tipo: string, payload: Record<string, unknown>) => void,
  onConnected?: () => void,
) {
  const [connectionState, setConnectionState] = useState<CampaignSSEConnectionState>(
    campanhaId ? 'connecting' : 'disabled',
  );
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

  useEffect(() => {
    if (!campanhaId) {
      setConnectionState('disabled');
      return undefined;
    }

    setConnectionState('connecting');
    return assinarEventosDaCampanha(campanhaId, {
      aoEvento: (tipo, payload) => onEventRef.current(tipo, payload),
      aoConectar: () => onConnectedRef.current?.(),
      aoEstado: setConnectionState,
    });
  }, [campanhaId]);

  return connectionState;
}
