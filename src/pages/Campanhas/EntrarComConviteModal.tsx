import { useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { campanhasApi } from '../../services/campanhasApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { ROTULO_PAPEL } from '../Campanha/campanha';

// O servidor responde sem acento e sem pontuação; a pessoa lê isto na tela.
const MENSAGENS_DO_SERVIDOR: Record<string, string> = {
  'convite invalido ou expirado': 'Convite inválido ou expirado. Confira o código com o Mestre da mesa.',
};

interface IEntrarComConviteModalProps {
  aberto: boolean;
  onFechar: () => void;
}

/**
 * Entrar numa mesa com o código que o Mestre mandou. É a única porta de entrada por convite do site:
 * a página da Campanha (pelo seletor de mesa) e a lista de mesas abrem este mesmo modal.
 */
export const EntrarComConviteModal = ({ aberto, onFechar }: IEntrarComConviteModalProps) => {
  const navigate = useNavigate();
  const initContexto = useAuthStore((estado) => estado.initContexto);
  const setCampanhaAtiva = useAuthStore((estado) => estado.setCampanhaAtiva);
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [entrou, setEntrou] = useState<{ id: string; nome: string; papel: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const fundoRef = useRef<HTMLDivElement>(null);

  const fechar = () => {
    setCodigo('');
    setErro(null);
    setEntrou(null);
    onFechar();
  };

  useDialogAccessibility({ open: aberto, dialogRef: modalRef, backdropRef: fundoRef, onClose: fechar });

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault();
    const limpo = codigo.trim();
    if (!limpo || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await campanhasApi.entrar(limpo) as { campanha_id?: string; papel?: string };
      await initContexto();
      const campanha = useAuthStore.getState().campanhas.find((item) => item.id === resposta?.campanha_id);
      setEntrou({
        id: resposta?.campanha_id ?? '',
        nome: campanha?.nome ?? 'a mesa',
        // O papel que a pessoa tem de fato na mesa; o do convite só vale para quem acabou de entrar.
        papel: campanha?.papel ?? resposta?.papel ?? 'jogador',
      });
    } catch (falha) {
      const mensagem = falha instanceof Error ? falha.message : '';
      setErro(MENSAGENS_DO_SERVIDOR[mensagem] ?? (mensagem || 'Código inválido ou expirado.'));
    } finally {
      setEnviando(false);
    }
  };

  const abrirAMesa = async () => {
    if (!entrou?.id) return;
    await setCampanhaAtiva(entrou.id);
    fechar();
    navigate('/campanha');
  };

  // Portal no body: o seletor de mesa mora dentro de cabeçalhos com transformação, e `fixed` ali não cobre a tela.
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {aberto && (
        <div className="modal-viewport fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            ref={fundoRef}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={fechar}
          />
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="entrar-com-convite-titulo"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-surface relative w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0a12] p-5 shadow-2xl custom-scrollbar sm:p-8"
          >
            {entrou ? (
              <div className="text-center">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                  <Check size={22} />
                </span>
                <h2 id="entrar-com-convite-titulo" className="mb-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Você entrou</h2>
                <p className="mb-6 text-sm text-gray-400">
                  Agora você está em <strong className="text-white">{entrou.nome}</strong> como {(ROTULO_PAPEL[entrou.papel] ?? entrou.papel).toLowerCase()}.
                </p>
                <div className="flex justify-center gap-3">
                  <button type="button" onClick={fechar} className="px-4 py-2 text-gray-400 transition-colors hover:text-white">Depois</button>
                  <button type="button" onClick={() => void abrirAMesa()} className="rounded-xl bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/80">Abrir a mesa</button>
                </div>
              </div>
            ) : (
              <>
                <h2 id="entrar-com-convite-titulo" className="mb-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Entrar com Convite</h2>
                <p className="mb-6 text-sm text-gray-400">Cole o código fornecido pelo Mestre da mesa.</p>

                {erro && <div role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{erro}</div>}

                <form onSubmit={enviar} className="space-y-4">
                  <label htmlFor="codigo-de-convite" className="sr-only">Código de convite</label>
                  <input
                    id="codigo-de-convite"
                    type="text"
                    value={codigo}
                    autoFocus
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    onChange={(evento) => setCodigo(evento.target.value)}
                    placeholder="Cole o código do convite..."
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 font-mono text-white outline-none transition-all focus:border-primary/50 focus:bg-black/60"
                    required
                  />
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={fechar} className="px-4 py-2 text-gray-400 transition-colors hover:text-white">Cancelar</button>
                    <button type="submit" disabled={enviando || !codigo.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50">
                      {enviando ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
