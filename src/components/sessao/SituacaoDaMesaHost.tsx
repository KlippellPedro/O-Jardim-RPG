import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { avisar } from '../avisos/avisos';
import { assinarEventosDaCampanha } from '../../services/campanhaEventos';
import { sessaoApi } from '../../services/sessaoApi';
import { EVENTOS_DA_MESA, lerSituacaoDaMesa, mesaAcabouDeAbrir, type EstadoDaMesa } from '../../services/situacaoDaMesa';
import { useAuthStore } from '../../store/useAuthStore';
import { useSituacaoDaMesaStore } from '../../store/useSituacaoDaMesaStore';

/** Mantém o menu e a Home sabendo se há mesa ao vivo, pelo canal ao vivo compartilhado (nenhuma conexão nova).
 *
 * Quando a mesa abre com a pessoa em outra tela, chega um aviso com o botão "Entrar". Quem já está na Sessão
 * não precisa do aviso, e quem abre o site com a mesa já aberta só vê o indicador. */
export function SituacaoDaMesaHost() {
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id ?? null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // O efeito não pode depender de `navigate` nem do caminho (mudam a cada troca de tela e refariam a assinatura).
  const caminhoRef = useRef(pathname);
  caminhoRef.current = pathname;
  const navegarRef = useRef(navigate);
  navegarRef.current = navigate;

  useEffect(() => {
    const { aplicar, limpar } = useSituacaoDaMesaStore.getState();
    if (!campanhaId) {
      limpar();
      return undefined;
    }

    let cancelado = false;
    let anterior: EstadoDaMesa | null = null;
    // Respostas fora de ordem (evento e volta para a aba juntos) não podem desfazer a mais nova.
    let pedido = 0;

    const carregar = async () => {
      const meu = ++pedido;
      try {
        const estado = lerSituacaoDaMesa(await sessaoApi.situacaoDaMesa(campanhaId));
        if (cancelado || meu !== pedido) return;
        const abriu = mesaAcabouDeAbrir(anterior, estado);
        anterior = estado;
        aplicar(campanhaId, estado);
        if (abriu && !caminhoRef.current.startsWith('/sessao')) {
          avisar.info(estado.titulo ? `${estado.titulo} está ao vivo.` : 'O Mestre abriu a mesa ao vivo.', {
            titulo: 'A sessão começou',
            chave: 'mesa-aberta',
            duracaoMs: 20000,
            acao: { rotulo: 'Entrar na sessão', aoClicar: () => navegarRef.current('/sessao') },
          });
        }
      } catch {
        // Sem resposta, o indicador fica como estava; o próximo evento ou a volta para a aba tenta de novo.
      }
    };

    void carregar();
    const parar = assinarEventosDaCampanha(campanhaId, {
      aoEvento: (tipo) => { if (EVENTOS_DA_MESA.includes(tipo)) void carregar(); },
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
      limpar();
    };
  }, [campanhaId]);

  return null;
}
