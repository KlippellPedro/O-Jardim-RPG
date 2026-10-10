import { useEffect } from 'react';
import { ApiError } from '../../services/apiClient';
import { calendarioMundoApi } from '../../services/calendarioMundoApi';
import { assinarEventosDaCampanha } from '../../services/campanhaEventos';
import { useAuthStore } from '../../store/useAuthStore';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { aplicarClima, climaDoCalendario, limparClima } from './climaDoMundo';

/** Mantém `data-clima-estacao` e `data-clima-lua` na raiz do documento de acordo com o calendário
 * da campanha ativa. O fundo (AtmosphericBackground e o CSS) só lê esses atributos.
 *
 * O Mestre avança o dia, declara uma estação especial ou uma lenda cai: o servidor avisa o canal
 * ao vivo ("calendario") e todo mundo com o site aberto busca o calendário de novo. Ao voltar para
 * a aba também se atualiza, para quem estava com o canal parado em segundo plano. */
export function ClimaDoMundoHost() {
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id ?? null);
  const ligado = usePerformanceStore((estado) => estado.climaDoMundo);

  useEffect(() => {
    const raiz = document.documentElement;
    if (!campanhaId || !ligado) {
      limparClima(raiz);
      return undefined;
    }

    let cancelado = false;
    const carregar = async () => {
      try {
        const calendario = await calendarioMundoApi.obter(campanhaId);
        if (!cancelado) aplicarClima(raiz, climaDoCalendario(calendario));
      } catch (erro) {
        if (cancelado) return;
        // Calendário ainda fechado para a mesa (403) ou campanha sem calendário (404): sem clima, para
        // não entregar a estação antes da hora. Falha de rede mantém o que já estava na tela.
        if (erro instanceof ApiError && (erro.status === 403 || erro.status === 404)) limparClima(raiz);
      }
    };

    void carregar();
    const parar = assinarEventosDaCampanha(campanhaId, {
      aoEvento: (tipo) => { if (tipo === 'calendario') void carregar(); },
      aoConectar: () => { void carregar(); },
    });
    const aoVoltarParaAAba = () => {
      if (document.visibilityState === 'visible') void carregar();
    };
    document.addEventListener('visibilitychange', aoVoltarParaAAba);

    return () => {
      cancelado = true;
      parar();
      document.removeEventListener('visibilitychange', aoVoltarParaAAba);
      limparClima(raiz);
    };
  }, [campanhaId, ligado]);

  return null;
}
