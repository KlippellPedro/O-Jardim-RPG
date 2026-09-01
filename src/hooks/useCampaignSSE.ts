import { useEffect, useRef, useState } from 'react';

export type CampaignSSEConnectionState = 'disabled' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Assina o mesmo fluxo SSE da Sessão ao Vivo (`/api/v1/sessao/{campanha_id}/eventos`)
 * fora do contexto de uma sessão aberta. O endpoint só exige ser membro da
 * campanha - não depende de haver uma sessão ativa - então serve para
 * qualquer tela que precise saber "algo mudou" (veículos, propriedades) sem
 * duplicar o estado pesado de iniciativa/turno do useSessaoStore.
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
    const eventSource = new EventSource(`/api/v1/sessao/${encodeURIComponent(campanhaId)}/eventos`);
    eventSource.onopen = () => {
      setConnectionState('connected');
      onConnectedRef.current?.();
    };
    eventSource.onerror = () => setConnectionState('reconnecting');
    eventSource.onmessage = (event) => {
      if (event.data === 'ping' || event.data === 'conectado') return;
      try {
        const payload = JSON.parse(event.data) as Record<string, unknown>;
        if (typeof payload?.tipo === 'string') {
          onEventRef.current(payload.tipo, payload);
        }
      } catch {
        // Evento malformado: ignora, o próximo ping mantém a conexão viva.
      }
    };

    return () => eventSource.close();
  }, [campanhaId]);

  return connectionState;
}
