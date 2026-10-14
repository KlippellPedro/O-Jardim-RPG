import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookOpen, CalendarClock, Check, CheckCheck, Coins, Loader2, RefreshCw, Swords, Trash2, User,
  type LucideIcon,
} from 'lucide-react';
import { avisosApi, type IAviso, type PainelDeAviso } from '../../services/avisosApi';
import { useAuthStore } from '../../store/useAuthStore';
import { confirmar } from '../avisos/confirmacao';
import {
  agruparPorDia, destinoDoAviso, ehPendencia, horaDoAviso, partirNegrito, rotuloDaCategoria,
} from './regrasDaCaixa';

interface ICaixaDeAvisosProps {
  painel: PainelDeAviso;
  /** Só o painel 'mestre' usa: a caixa mostra os avisos da mesa que está aberta. */
  campanhaId?: string | null;
  /** Mostra o nome da mesa em cada aviso. Na caixa geral ajuda, porque os avisos vêm de todas as mesas. */
  mostrarMesa?: boolean;
  textoVazio?: string;
  /** Chamado quando um aviso leva para outra tela (o painel lateral da engrenagem usa para se fechar). */
  aoNavegar?: () => void;
}

type FiltroDaCaixa = 'todos' | 'nao-lidos';

interface IVisualDaCategoria {
  icone: LucideIcon;
  classe: string;
}

// As classes ficam escritas por inteiro para o Tailwind enxergá-las.
const VISUAL_DA_CATEGORIA: Record<string, IVisualDaCategoria> = {
  conta: { icone: User, classe: 'border-sky-400/25 bg-sky-400/10 text-sky-200' },
  campanha: { icone: Swords, classe: 'border-amber-400/25 bg-amber-400/10 text-amber-200' },
  conteudo: { icone: BookOpen, classe: 'border-violet-400/25 bg-violet-400/10 text-violet-200' },
  economia: { icone: Coins, classe: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200' },
  sessao: { icone: CalendarClock, classe: 'border-rose-400/25 bg-rose-400/10 text-rose-200' },
};
const VISUAL_PADRAO: IVisualDaCategoria = { icone: Swords, classe: 'border-white/15 bg-white/5 text-gray-300' };

const botaoDeAcao = 'inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50';

function TextoDoAviso({ texto }: { texto: string }) {
  return (
    <>
      {partirNegrito(texto).map((parte, indice) => (
        parte.negrito
          ? <strong key={indice} className="font-semibold text-gray-200">{parte.texto}</strong>
          : <span key={indice}>{parte.texto}</span>
      ))}
    </>
  );
}

/**
 * A caixa de avisos de um painel. A mesma peça serve a engrenagem ('geral'), o Painel do Mestre ('mestre', da
 * mesa aberta) e a Administração ('admin'): cada painel só lista, marca e limpa os avisos que moram nele.
 */
export function CaixaDeAvisos({ painel, campanhaId = null, mostrarMesa = true, textoVazio = 'Você não tem avisos.', aoNavegar }: ICaixaDeAvisosProps) {
  const navigate = useNavigate();
  const definirAvisos = useAuthStore((estado) => estado.definirAvisos);
  const [avisos, setAvisos] = useState<IAviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroDaCaixa>('todos');
  const [ocupado, setOcupado] = useState<'marcar' | 'limpar' | null>(null);
  // Resposta de uma busca antiga (troca rápida de mesa) não pode sobrescrever a mais nova.
  const buscaAtual = useRef(0);

  const carregar = useCallback(async (silencioso = false) => {
    const numero = ++buscaAtual.current;
    if (!silencioso) setCarregando(true);
    setErro(null);
    try {
      const resposta = await avisosApi.listar({ painel, campanhaId, limite: 100 });
      if (numero !== buscaAtual.current) return;
      setAvisos(resposta.avisos);
      definirAvisos(resposta.contagens);
    } catch (falha) {
      if (numero !== buscaAtual.current) return;
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os avisos.');
    } finally {
      if (numero === buscaAtual.current) setCarregando(false);
    }
  }, [painel, campanhaId, definirAvisos]);

  useEffect(() => {
    void carregar();
    return () => { buscaAtual.current += 1; };
  }, [carregar]);

  const marcaveis = useMemo(() => avisos.filter((aviso) => !aviso.lida_em && !ehPendencia(aviso)), [avisos]);
  const naoLidos = useMemo(() => avisos.filter((aviso) => !aviso.lida_em).length, [avisos]);
  const lidos = avisos.length - naoLidos;
  const visiveis = useMemo(
    () => (filtro === 'nao-lidos' ? avisos.filter((aviso) => !aviso.lida_em) : avisos),
    [avisos, filtro],
  );
  const grupos = useMemo(() => agruparPorDia(visiveis), [visiveis]);

  const marcarUm = async (aviso: IAviso) => {
    if (aviso.lida_em || ehPendencia(aviso)) return;
    const agora = new Date().toISOString();
    setAvisos((atuais) => atuais.map((item) => (item.id === aviso.id ? { ...item, lida_em: agora } : item)));
    try {
      definirAvisos(await avisosApi.marcarLidos({ ids: [aviso.id], painel, campanhaId }));
    } catch (falha) {
      setAvisos((atuais) => atuais.map((item) => (item.id === aviso.id ? { ...item, lida_em: null } : item)));
      setErro(falha instanceof Error ? falha.message : 'Não foi possível marcar como lido.');
    }
  };

  const marcarTodos = async () => {
    setOcupado('marcar');
    setErro(null);
    try {
      definirAvisos(await avisosApi.marcarLidos({ painel, campanhaId }));
      await carregar(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível marcar como lidos.');
    } finally {
      setOcupado(null);
    }
  };

  const limparLidos = async () => {
    if (!(await confirmar({ titulo: 'Apagar avisos lidos', mensagem: 'Apagar os avisos já lidos?', rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    setOcupado('limpar');
    setErro(null);
    try {
      await avisosApi.limparLidos({ painel, campanhaId });
      await carregar(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível limpar os avisos.');
    } finally {
      setOcupado(null);
    }
  };

  const abrir = async (aviso: IAviso, caminho: string) => {
    await marcarUm(aviso);
    aoNavegar?.();
    navigate(caminho);
  };

  const botaoDoFiltro = (valor: FiltroDaCaixa, rotulo: string) => (
    <button
      type="button"
      aria-pressed={filtro === valor}
      onClick={() => setFiltro(valor)}
      className={`min-h-8 rounded-full px-3 text-xs font-medium transition-colors ${filtro === valor ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'}`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Quais avisos mostrar" className="inline-flex rounded-full border border-white/10 bg-black/30 p-0.5">
          {botaoDoFiltro('todos', 'Todos')}
          {botaoDoFiltro('nao-lidos', naoLidos > 0 ? `Não lidos (${naoLidos})` : 'Não lidos')}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => void carregar(true)} aria-label="Atualizar os avisos" title="Atualizar" className={`${botaoDeAcao} !px-2.5`}>
            <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />
          </button>
          {marcaveis.length > 0 && (
            <button type="button" onClick={() => void marcarTodos()} disabled={ocupado !== null} className={botaoDeAcao}>
              {ocupado === 'marcar' ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
              Marcar tudo como lido
            </button>
          )}
          {lidos > 0 && (
            <button
              type="button"
              onClick={() => void limparLidos()}
              disabled={ocupado !== null}
              title="Apaga apenas os avisos já lidos"
              className={`${botaoDeAcao} hover:!bg-red-500/10 hover:!text-red-300`}
            >
              {ocupado === 'limpar' ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Limpar lidos
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{erro}</div>
      )}

      {carregando && avisos.length === 0 && !erro ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500" aria-busy="true">
          <Loader2 size={16} className="animate-spin" /> Carregando os avisos...
        </div>
      ) : null}

      {!carregando && !erro && visiveis.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/5 py-12 text-center">
          <CheckCheck className="mx-auto mb-3 text-green-400" size={32} />
          <p className="font-medium text-gray-300">{filtro === 'nao-lidos' && avisos.length > 0 ? 'Nada novo por aqui.' : 'Tudo em dia!'}</p>
          <p className="mt-1 text-sm text-gray-500">{filtro === 'nao-lidos' && avisos.length > 0 ? 'Todos os avisos já foram lidos.' : textoVazio}</p>
        </div>
      )}

      {grupos.map((grupo) => (
        <section key={grupo.chave} aria-label={grupo.rotulo} className="space-y-2.5">
          <h3 className="px-1 text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">{grupo.rotulo}</h3>
          <ul className="space-y-2.5">
            {grupo.avisos.map((aviso) => {
              const visual = VISUAL_DA_CATEGORIA[aviso.categoria] ?? VISUAL_PADRAO;
              const Icone = visual.icone;
              const lido = Boolean(aviso.lida_em);
              const pendencia = ehPendencia(aviso);
              const destino = destinoDoAviso(aviso);
              return (
                <li
                  key={aviso.id}
                  className={`content-auto-list-item rounded-2xl border p-4 transition-colors ${lido ? 'border-white/5 bg-white/[0.02]' : 'border-primary/25 bg-primary/[0.06]'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${lido ? 'border-white/10 bg-white/5 text-gray-500' : visual.classe}`} aria-hidden="true">
                      <Icone size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className={`text-sm font-semibold leading-snug ${lido ? 'text-gray-400' : 'text-white'}`}>
                          {!lido && <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary align-middle" aria-label="Não lido" role="img" />}
                          {aviso.titulo}
                        </h4>
                        <time dateTime={aviso.criado_em} className="shrink-0 pt-0.5 text-[11px] text-gray-500">{horaDoAviso(aviso.criado_em)}</time>
                      </div>
                      {aviso.mensagem ? (
                        <p className={`mt-1 whitespace-pre-line break-words text-sm leading-relaxed ${lido ? 'text-gray-500' : 'text-gray-400'}`}>
                          <TextoDoAviso texto={aviso.mensagem} />
                        </p>
                      ) : null}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {mostrarMesa && aviso.campanha_nome ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-400">{aviso.campanha_nome}</span>
                        ) : null}
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-400">{rotuloDaCategoria(aviso.categoria)}</span>
                        {pendencia ? (
                          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">Aguardando resposta</span>
                        ) : null}
                        <span className="flex-1" />
                        {destino ? (
                          <button type="button" onClick={() => void abrir(aviso, destino.caminho)} className={`${botaoDeAcao} !text-primary hover:!bg-primary/10`}>
                            {destino.rotulo} <ArrowRight size={12} />
                          </button>
                        ) : null}
                        {!lido && !pendencia ? (
                          <button type="button" onClick={() => void marcarUm(aviso)} aria-label={`Marcar como lido: ${aviso.titulo}`} title="Marcar como lido" className={`${botaoDeAcao} !px-2.5`}>
                            <Check size={13} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {avisos.length >= 100 && (
        <p className="px-1 text-center text-[11px] text-gray-600">Mostrando os 100 avisos mais recentes.</p>
      )}
    </div>
  );
}
