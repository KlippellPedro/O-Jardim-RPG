import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Heart, RefreshCw, Shield, UserRound, Users, X } from 'lucide-react';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useSessaoStore } from '../../../store/useSessaoStore';

interface SessionParticipantsDialogProps {
  startLive?: boolean;
  onCancel: () => void;
  onConfirm: (characterIds: string[]) => Promise<void>;
}

export const SessionParticipantsDialog: React.FC<SessionParticipantsDialogProps> = ({
  startLive = false,
  onCancel,
  onConfirm,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { characters, fetchCharacters, isLoading } = useCharacterStore();
  const iniciativa = useSessaoStore((state) => state.iniciativa);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(
    iniciativa.flatMap((entity) => entity.tipo === 'jogador' && entity.personagemId ? [entity.personagemId] : []),
  ));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useDialogAccessibility({ open: true, dialogRef, onClose: onCancel });

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const orderedCharacters = useMemo(
    () => [...characters].sort((left, right) => left.nome.localeCompare(right.nome, 'pt-BR')),
    [characters],
  );
  const extraEntities = iniciativa.filter((entity) => entity.tipo !== 'jogador').length;

  const toggle = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(orderedCharacters.filter((character) => selectedIds.has(character.id)).map((character) => character.id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Não foi possível salvar os participantes.');
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modal-viewport fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-3 sm:p-6"
      role="presentation"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-participants-title"
        onClick={(event) => event.stopPropagation()}
        className="modal-surface flex max-h-[min(760px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#c7a44c]/20 bg-[#0d0c12] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
          <div>
            <div className="flex items-center gap-2 text-[#d9b95f]">
              <Users size={18} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Elenco da sessão</p>
            </div>
            <h2 id="session-participants-title" className="mt-2 text-xl font-semibold text-white">
              Quem participa desta sessão?
            </h2>
            <p className="mt-1 text-sm leading-6 text-white/45">
              Marque apenas os personagens presentes. Inimigos e aliados já adicionados não serão removidos.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
          <p className="text-xs text-white/50">
            <strong className="text-white">{selectedIds.size}</strong> de {orderedCharacters.length} selecionados
            {extraEntities ? ` · ${extraEntities} aliado${extraEntities === 1 ? '' : 's'}/inimigo${extraEntities === 1 ? '' : 's'} preservado${extraEntities === 1 ? '' : 's'}` : ''}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/50 hover:text-white"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(orderedCharacters.map((character) => character.id)))}
              className="rounded-md border border-[#c7a44c]/25 px-2.5 py-1 text-[11px] text-[#d9b95f] hover:bg-[#c7a44c]/10"
            >
              Selecionar todos
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {isLoading && !orderedCharacters.length ? (
            <div className="flex items-center justify-center py-12 text-sm text-white/45">
              <RefreshCw className="mr-2 animate-spin text-[#c7a44c]" size={16} /> Carregando personagens…
            </div>
          ) : orderedCharacters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-white/45">
              Esta campanha não possui personagens ativos.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {orderedCharacters.map((character) => {
                const selected = selectedIds.has(character.id);
                const hpMax = character.derivados?.vida;
                const hpCurrent = character.ficha?.status?.vidaAtual ?? character.ficha?.recursos?.vidaAtual ?? hpMax;
                const defense = character.derivados?.defesaNatural;
                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => toggle(character.id)}
                    aria-pressed={selected}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      selected
                        ? 'border-[#c7a44c]/45 bg-[#c7a44c]/[0.09]'
                        : 'border-white/[0.08] bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/35">
                      {character.foto ? (
                        <img src={character.foto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UserRound size={20} className="text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white/90">{character.nome}</p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/40">
                        <span className="flex items-center gap-1"><Heart size={11} className="text-red-300/70" /> {hpCurrent ?? '?'}/{hpMax ?? '?'}</span>
                        <span className="flex items-center gap-1"><Shield size={11} /> Defesa {defense ?? '?'}</span>
                      </div>
                    </div>
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-[#c7a44c] bg-[#c7a44c] text-black' : 'border-white/20 text-transparent'}`}>
                      <Check size={13} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error ? <p className="mx-5 mb-3 rounded-lg border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-xs text-red-200">{error}</p> : null}

        <footer className="flex items-center justify-between gap-3 border-t border-white/[0.08] p-4 sm:px-5">
          <p className="hidden text-[11px] text-white/35 sm:block">Você poderá administrar todos pelo Escudo do Mestre.</p>
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={onCancel} disabled={busy} className="rounded-lg px-3 py-2 text-xs text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-40">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy || isLoading}
              className="flex items-center gap-2 rounded-lg bg-[#c7a44c] px-4 py-2 text-xs font-bold text-black hover:bg-[#d4b45a] disabled:cursor-wait disabled:opacity-50"
            >
              {busy ? <RefreshCw className="animate-spin" size={14} /> : <RadioIcon />}
              {startLive ? 'Salvar e iniciar ao vivo' : 'Salvar participantes'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

const RadioIcon = () => <span className="h-2.5 w-2.5 rounded-full border-2 border-black" aria-hidden="true" />;
