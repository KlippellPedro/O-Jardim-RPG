import { useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { ConteudoLorePanel } from '../Settings/ConteudoLorePanel';
import { CronologiaPanel } from '../Settings/CronologiaPanel';
import { useConteudoEditadoStore } from '../../store/useConteudoEditadoStore';
import { useDialogAccessibility } from '../../hooks/useDialogAccessibility';
import { useModalSfx } from '../../hooks/useSfx';
import { perguntarDescarte } from '../../hooks/useUnsavedChanges';

interface IEditorEmModalProps {
  titulo: string;
  /** Uma linha abaixo do título: o que está sendo editado e o alcance da publicação. */
  subtitulo?: string;
  onFechar: () => void;
  children: (ajuda: { aoMudarSujo: (sujo: boolean) => void }) => ReactNode;
}

/**
 * A janela dos editores de conteúdo do Mundo. Abre em cima da página de quem lê (a Árvore, os Registros Universais), então
 * a pessoa edita, publica e continua no mesmo lugar. Fechar com alterações não salvas pergunta antes de descartar.
 */
export function EditorEmModal({ titulo, subtitulo, onFechar, children }: IEditorEmModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const fundoRef = useRef<HTMLDivElement>(null);
  const sujoRef = useRef(false);
  const aoMudarSujo = useCallback((sujo: boolean) => { sujoRef.current = sujo; }, []);

  const fechar = useCallback(async () => {
    if (sujoRef.current && !(await perguntarDescarte('Existem alterações não salvas neste registro. Deseja descartá-las?'))) return;
    onFechar();
  }, [onFechar]);

  // Só existe montada enquanto aberta.
  useModalSfx(true);
  useDialogAccessibility({ open: true, dialogRef, backdropRef: fundoRef, onClose: () => void fechar() });

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="modal-viewport fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div ref={fundoRef} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => void fechar()} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="modal-surface relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a090e] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-white sm:text-xl">{titulo}</h2>
            {subtitulo ? <p className="mt-0.5 text-xs leading-5 text-gray-500">{subtitulo}</p> : null}
          </div>
          <button type="button" onClick={() => void fechar()} data-sfx="off" aria-label="Fechar" className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <X size={18} />
          </button>
        </header>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children({ aoMudarSujo })}</div>
      </div>
    </div>,
    document.body,
  );
}

const ALCANCE = 'Publicar vale para todas as campanhas. Salvar rascunho só guarda: os jogadores não veem.';

/** Edita um registro do Mundo (Deidade, Fluxo, Local, Personagem...) sem sair da página. */
export function EditorDeLoreModal({ tipo, id, titulo, onFechar }: { tipo: string; id: string; titulo?: string; onFechar: () => void }) {
  const registrarPublicacao = useConteudoEditadoStore((estado) => estado.registrarPublicacao);
  return (
    <EditorEmModal titulo={titulo ? `Editar ${titulo}` : 'Editar registro'} subtitulo={ALCANCE} onFechar={onFechar}>
      {({ aoMudarSujo }) => (
        <ConteudoLorePanel modo="entrada" initialItem={`${tipo}:${id}`} onDirtyChange={aoMudarSujo} onPublicado={registrarPublicacao} />
      )}
    </EditorEmModal>
  );
}

/** Edita a ficha de uma Árvore (resumo, atmosfera, História) e a linha do tempo dela sem sair da página. */
export function EditorDeArvoreModal({ arvoreId, nome, onFechar }: { arvoreId: string; nome: string; onFechar: () => void }) {
  const registrarPublicacao = useConteudoEditadoStore((estado) => estado.registrarPublicacao);
  return (
    <EditorEmModal titulo={`Editar ${nome}`} subtitulo={ALCANCE} onFechar={onFechar}>
      {({ aoMudarSujo }) => (
        <CronologiaPanel modo="entrada" initialItem={arvoreId} onDirtyChange={aoMudarSujo} onPublicado={registrarPublicacao} />
      )}
    </EditorEmModal>
  );
}
