import { useEffect, useState } from 'react';
import { CircleDot, ClipboardList, LoaderCircle, RefreshCw, X } from 'lucide-react';
import {
  casinoApi,
  type JogoCassinoGambler,
  type LogApostaCassinoGambler,
  type LogsCassinoGambler,
} from '../../services/casinoApi';

const TAMANHO_PAGINA = 50;

const NOMES_JOGOS: Record<JogoCassinoGambler, string> = {
  dados: 'Dados da Inconstância',
  vinte_um: 'Vinte-e-Um de Amadheus',
  roda_fluxos: 'Roda das Dez Forças',
  sucessao: 'Sucessão de Chronus',
  vaos: 'Queda Livre',
  rolos: 'Pergaminhos do Acaso',
  duelo: 'Duelo do Vazio',
};

function formatarData(valor: string): string {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Data indisponível';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data);
}

function resultadoDaAposta(log: LogApostaCassinoGambler): string {
  if (log.status === 'ativa') return 'Em andamento';
  if (log.status === 'reembolsada') return 'Reembolsada';
  if (log.saldo > 0) return 'Vitória do jogador';
  if (log.saldo === 0) return 'Empate';
  return 'Vitória da casa';
}

interface GamblerBetLogsModalProps {
  aberto: boolean;
  campanhaId: string;
  onClose: () => void;
}

export function GamblerBetLogsModal({ aberto, campanhaId, onClose }: GamblerBetLogsModalProps) {
  const [dados, setDados] = useState<LogsCassinoGambler | null>(null);
  const [logs, setLogs] = useState<LogApostaCassinoGambler[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async (deslocamento: number, substituir: boolean) => {
    if (substituir) setCarregando(true);
    else setCarregandoMais(true);
    setErro(null);
    try {
      const resposta = await casinoApi.logs(campanhaId, deslocamento, TAMANHO_PAGINA);
      setDados(resposta);
      setLogs(atuais => substituir ? resposta.logs : [...atuais, ...resposta.logs]);
    } catch (error: unknown) {
      setErro(error instanceof Error ? error.message : 'Não foi possível consultar o histórico da mesa.');
    } finally {
      setCarregando(false);
      setCarregandoMais(false);
    }
  };

  useEffect(() => {
    if (!aberto) return;
    setDados(null);
    setLogs([]);
    void carregar(0, true);
  // A abertura do painel inicia uma consulta nova; `carregar` não é uma
  // dependência estável e não deve reiniciar a busca a cada renderização.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, campanhaId]);

  useEffect(() => {
    if (!aberto) return;
    const overflowAnterior = document.body.style.overflow;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fecharComEscape);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', fecharComEscape);
    };
  }, [aberto, onClose]);

  if (!aberto) return null;

  const total = dados?.total ?? 0;
  const temMais = logs.length < total;

  return (
    <div
      className="gambler-logs__overlay"
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="gambler-logs" role="dialog" aria-modal="true" aria-labelledby="gambler-logs-title">
        <header className="gambler-logs__header">
          <div>
            <span>Livro-caixa do Mestre</span>
            <h2 id="gambler-logs-title">Logs de apostas</h2>
            <p>Rodadas de todos os jogadores desta campanha, da mais recente para a mais antiga.</p>
          </div>
          <div className="gambler-logs__header-actions">
            <button type="button" onClick={() => void carregar(0, true)} disabled={carregando} aria-label="Atualizar logs">
              <RefreshCw className={carregando ? 'gambler-casino__spinner' : undefined} size={18} />
            </button>
            <button type="button" onClick={onClose} aria-label="Fechar logs"><X size={20} /></button>
          </div>
        </header>

        {dados ? (
          <div className="gambler-logs__summary" aria-label="Resumo das apostas">
            <div><small>Rodadas</small><strong>{dados.resumo.rodadas}</strong></div>
            <div><small>Em andamento</small><strong>{dados.resumo.ativas}</strong></div>
            <div><small>Apostado</small><strong>{dados.resumo.apostado}</strong></div>
            <div><small>Pago</small><strong>{dados.resumo.pago}</strong></div>
            <div><small>Saldo da casa</small><strong className={dados.resumo.saldo_casa < 0 ? 'is-negative' : ''}>{dados.resumo.saldo_casa > 0 ? '+' : ''}{dados.resumo.saldo_casa}</strong></div>
          </div>
        ) : null}

        <div className="gambler-logs__body">
          {carregando && logs.length === 0 ? (
            <div className="gambler-logs__state"><LoaderCircle className="gambler-casino__spinner" size={28} /><p>Conferindo o livro-caixa…</p></div>
          ) : null}
          {erro ? (
            <div className="gambler-logs__state gambler-logs__state--error" role="alert">
              <p>{erro}</p>
              <button type="button" onClick={() => void carregar(0, true)}>Tentar novamente</button>
            </div>
          ) : null}
          {!carregando && !erro && logs.length === 0 ? (
            <div className="gambler-logs__state"><ClipboardList size={30} /><p>Ainda não existem apostas nesta campanha.</p></div>
          ) : null}
          {logs.length ? (
            <ol className="gambler-logs__list">
              {logs.map(log => (
                <li key={log.id}>
                  <div className="gambler-logs__identity">
                    <CircleDot size={17} />
                    <span>
                      <strong>{log.personagem_nome}</strong>
                      <small>{log.usuario_nome} · {formatarData(log.criado_em)}</small>
                    </span>
                  </div>
                  <div className="gambler-logs__game">
                    <strong>{NOMES_JOGOS[log.jogo] ?? log.jogo}</strong>
                    <small>{resultadoDaAposta(log)}</small>
                  </div>
                  <div className="gambler-logs__values">
                    <span><small>Aposta</small><strong>{log.aposta}</strong></span>
                    <span><small>Pagamento</small><strong>{log.pagamento}</strong></span>
                    <span><small>Saldo</small><strong className={log.saldo < 0 ? 'is-negative' : log.saldo > 0 ? 'is-positive' : ''}>{log.saldo > 0 ? '+' : ''}{log.saldo}</strong></span>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </div>

        {temMais ? (
          <footer className="gambler-logs__footer">
            <span>Exibindo {logs.length} de {total} rodadas</span>
            <button type="button" onClick={() => void carregar(logs.length, false)} disabled={carregandoMais}>
              {carregandoMais ? <LoaderCircle className="gambler-casino__spinner" size={16} /> : null}
              Carregar mais
            </button>
          </footer>
        ) : null}
      </section>
    </div>
  );
}
