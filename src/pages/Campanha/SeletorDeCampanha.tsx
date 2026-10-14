import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Check, ChevronDown, KeyRound, Library, Plus } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { corDaCampanha, podeCriarCampanha, ROTULO_PAPEL } from './campanha';
import { EntrarComConviteModal } from '../Campanhas/EntrarComConviteModal';
import { NovaMesaModal } from '../Campanhas/NovaMesaModal';

interface ISeletorDeCampanhaProps {
  /** `compacto` mostra a mesa atual (cabeçalhos); `botao` vira o botão "Trocar Campanha" de uma tela de fichas. */
  variante?: 'compacto' | 'botao';
}

/**
 * O único lugar para trocar de mesa, entrar numa por convite e abrir uma nova, sem sair da tela em que a pessoa está.
 * Só aparece com uma mesa ativa; quem ainda não tem nenhuma usa a lista de mesas (/campanhas).
 */
export const SeletorDeCampanha = ({ variante = 'compacto' }: ISeletorDeCampanhaProps) => {
  const navigate = useNavigate();
  const usuario = useAuthStore((estado) => estado.usuario);
  const campanhas = useAuthStore((estado) => estado.campanhas);
  const ativa = useAuthStore((estado) => estado.campanhaAtiva);
  const avisos = useAuthStore((estado) => estado.avisos);
  const setCampanhaAtiva = useAuthStore((estado) => estado.setCampanhaAtiva);
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState(false);
  const [modal, setModal] = useState<'convite' | 'nova' | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora ou apertar Esc, como qualquer menu.
  useEffect(() => {
    if (!aberto) return undefined;
    const fecharAoClicarFora = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    };
    const fecharComEsc = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAberto(false);
    };
    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [aberto]);

  if (!ativa) return null;

  const trocar = async (id: string) => {
    if (id === ativa.id) { setAberto(false); return; }
    setTrocando(true);
    try {
      await setCampanhaAtiva(id);
      setAberto(false);
    } finally {
      setTrocando(false);
    }
  };

  const abrirModal = (qual: 'convite' | 'nova') => {
    setAberto(false);
    setModal(qual);
  };

  const gatilho = variante === 'botao'
    ? 'inline-flex min-h-12 min-w-max items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-gray-300 transition-colors hover:bg-white/10 hover:text-white'
    : 'inline-flex min-h-10 max-w-[16rem] items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 text-xs font-bold text-gray-200 hover:bg-white/5';

  const itemDeAcao = 'flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white';

  return (
    <div className="relative" ref={raiz}>
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        className={gatilho}
      >
        {variante === 'botao' ? (
          <>
            <ArrowLeftRight size={18} aria-hidden="true" />
            <span className="whitespace-nowrap font-medium tracking-wide">Trocar Campanha</span>
          </>
        ) : (
          <>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corDaCampanha(ativa.identidade) }} aria-hidden="true" />
            <span className="truncate">{ativa.nome}</span>
            <ChevronDown size={14} className={`shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
          </>
        )}
      </button>

      {aberto ? (
        <div className={`absolute z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12] shadow-2xl ${variante === 'botao' ? 'left-0' : 'right-0'}`}>
          <ul role="listbox" aria-label="Suas campanhas" className="max-h-72 overflow-y-auto py-1 custom-scrollbar">
            {campanhas.map((campanha) => {
              const recados = avisos.mestre_por_campanha[campanha.id] ?? 0;
              return (
                <li key={campanha.id} role="option" aria-selected={campanha.id === ativa.id}>
                  <button type="button" disabled={trocando} onClick={() => void trocar(campanha.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 disabled:opacity-50">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: corDaCampanha(campanha.identidade) }} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{campanha.nome}</span>
                      <span className="text-[11px] text-gray-500">{ROTULO_PAPEL[campanha.papel] ?? campanha.papel}</span>
                    </span>
                    {recados > 0 ? (
                      <span
                        className="min-w-5 shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold leading-none text-white"
                        role="img"
                        aria-label={`${recados} ${recados === 1 ? 'aviso novo' : 'avisos novos'} nesta mesa`}
                      >
                        {recados}
                      </span>
                    ) : null}
                    {campanha.id === ativa.id ? <Check size={14} className="shrink-0 text-emerald-300" aria-label="Campanha atual" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-white/10 py-1">
            <button type="button" onClick={() => abrirModal('convite')} className={itemDeAcao}><KeyRound size={14} /> Entrar com código de convite</button>
            {podeCriarCampanha(usuario) ? (
              <button type="button" onClick={() => abrirModal('nova')} className={itemDeAcao}><Plus size={14} /> Criar nova mesa</button>
            ) : null}
            <button type="button" onClick={() => { setAberto(false); navigate('/campanhas'); }} className={itemDeAcao}><Library size={14} /> Ver todas as mesas</button>
          </div>
        </div>
      ) : null}

      <EntrarComConviteModal aberto={modal === 'convite'} onFechar={() => setModal(null)} />
      <NovaMesaModal aberto={modal === 'nova'} onFechar={() => setModal(null)} />
    </div>
  );
};
