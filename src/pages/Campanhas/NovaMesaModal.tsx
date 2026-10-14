import { useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { campanhasApi } from '../../services/campanhasApi';
import { useAuthStore } from '../../store/useAuthStore';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';

interface INovaMesaModalProps {
  aberto: boolean;
  onFechar: () => void;
}

/** Abre uma mesa nova (só Mestre e Criador chamam) e já entra nela, na página da Campanha. */
export const NovaMesaModal = ({ aberto, onFechar }: INovaMesaModalProps) => {
  const navigate = useNavigate();
  const initContexto = useAuthStore((estado) => estado.initContexto);
  const setCampanhaAtiva = useAuthStore((estado) => estado.setCampanhaAtiva);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const fundoRef = useRef<HTMLDivElement>(null);

  const fechar = () => {
    setNome('');
    setDescricao('');
    setErro(null);
    onFechar();
  };

  useDialogAccessibility({ open: aberto, dialogRef: modalRef, backdropRef: fundoRef, onClose: fechar });

  const criar = async (evento: FormEvent) => {
    evento.preventDefault();
    if (!nome.trim() || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const resposta = await campanhasApi.criar({ nome: nome.trim(), descricao: descricao.trim() }) as { id?: string };
      await initContexto();
      if (resposta?.id) await setCampanhaAtiva(resposta.id);
      fechar();
      navigate('/campanha');
    } catch (falha) {
      setErro(falha instanceof Error && falha.message ? falha.message : 'Não foi possível criar a mesa.');
    } finally {
      setEnviando(false);
    }
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
            aria-labelledby="nova-mesa-titulo"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="modal-surface relative w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0a12] p-5 shadow-2xl custom-scrollbar sm:p-8"
          >
            <h2 id="nova-mesa-titulo" className="mb-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Forjar Nova Mesa</h2>
            <p className="mb-6 text-sm text-gray-400">Dê um nome para a sua nova campanha.</p>

            {erro && <div role="alert" className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{erro}</div>}

            <form onSubmit={criar} className="space-y-4">
              <div>
                <label htmlFor="nova-mesa-nome" className="mb-1 block pl-1 text-xs font-medium text-gray-400">Nome da Campanha</label>
                <input
                  id="nova-mesa-nome"
                  type="text"
                  value={nome}
                  autoFocus
                  maxLength={100}
                  onChange={(evento) => setNome(evento.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition-all focus:border-primary/50"
                  required
                />
              </div>
              <div>
                <label htmlFor="nova-mesa-descricao" className="mb-1 block pl-1 text-xs font-medium text-gray-400">Descrição (Opcional)</label>
                <textarea
                  id="nova-mesa-descricao"
                  value={descricao}
                  maxLength={2000}
                  onChange={(evento) => setDescricao(evento.target.value)}
                  className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition-all focus:border-primary/50"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={fechar} className="px-4 py-2 text-gray-400 transition-colors hover:text-white">Cancelar</button>
                <button type="submit" disabled={enviando || !nome.trim()} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50">
                  {enviando ? <Loader2 className="animate-spin" size={18} /> : 'Criar Mesa'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
