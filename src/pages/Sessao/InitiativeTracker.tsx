import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Sword,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useSessaoStore } from '../../store/useSessaoStore';
import { EntityEditor } from './components/EntityEditor';

interface InitiativeTrackerProps {
  onClose?: () => void;
}

export const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({ onClose }) => {
  const {
    iniciativa,
    turnoAtualId,
    emCombate,
    comando,
    adicionarEntidade,
    removerEntidade,
    atualizarEntidade,
    iniciarCombate,
    encerrarCombate,
    proximoTurno,
    turnoAnterior,
    ordenarIniciativa,
    sincronizarIniciativa,
  } = useSessaoStore();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [initiativeValue, setInitiativeValue] = useState(10);
  const [hpMax, setHpMax] = useState('');
  const [type, setType] = useState<'aliado' | 'inimigo'>('inimigo');
  const [hpVisible, setHpVisible] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runAction = async (action: () => Promise<void>, errorMessage: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch {
      setMessage(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const addEntity = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage('Informe o nome da entidade.');
      return;
    }
    const parsedHp = hpMax === '' ? 0 : Number(hpMax);
    if (!Number.isInteger(parsedHp) || parsedHp < 0 || parsedHp > 99999) {
      setMessage('PV máximo precisa ser um número inteiro entre 0 e 99.999.');
      return;
    }
    await runAction(async () => {
      await adicionarEntidade({
        nome: trimmedName,
        iniciativa: initiativeValue,
        vida_maxima: parsedHp,
        tipo: type,
        visivel: true,
        vida_visivel: hpVisible,
      });
      setName('');
      setInitiativeValue(10);
      setHpMax('');
      setType('inimigo');
      setIsAdding(false);
    }, 'Não foi possível adicionar a entidade.');
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0d0c12]/92">
      <div className="shrink-0 border-b border-white/10 px-4 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">Iniciativa</h2>
            <p className="mt-0.5 text-[11px] text-white/40">
              {emCombate ? 'Ordem de combate' : 'Preparação da cena'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {comando ? (
              <button
                type="button"
                onClick={() => setIsAdding((current) => !current)}
                className="rounded-md border border-[#c7a44c]/25 p-2 text-[#d7b85c] hover:bg-[#c7a44c]/10"
                aria-label={isAdding ? 'Cancelar adição' : 'Adicionar entidade'}
              >
                {isAdding ? <X size={17} /> : <Plus size={17} />}
              </button>
            ) : null}
            {onClose ? (
              <button type="button" onClick={onClose} className="rounded-md p-2 text-white/50 hover:bg-white/5 hover:text-white" aria-label="Fechar iniciativa">
                <X size={18} />
              </button>
            ) : null}
          </div>
        </div>

        {isAdding && comando ? (
          <motion.form
            initial={reduceMotion ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={addEntity}
            className="mt-4 space-y-2 rounded-xl border border-white/[0.08] bg-black/25 p-3"
          >
            <input
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do NPC ou monstro"
              autoFocus
              className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                Iniciativa
                <input
                  type="number"
                  min={-99}
                  max={999}
                  value={initiativeValue}
                  onChange={(event) => setInitiativeValue(Math.max(-99, Math.min(999, Number(event.target.value) || 0)))}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                PV máximo · opcional
                <input
                  type="number"
                  min={0}
                  max={99999}
                  value={hpMax}
                  onChange={(event) => setHpMax(event.target.value)}
                  placeholder="Sem PV"
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none"
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['inimigo', 'aliado'] as const).map((entityType) => (
                <button
                  key={entityType}
                  type="button"
                  onClick={() => setType(entityType)}
                  className={`rounded-md border py-2 text-xs font-medium capitalize ${
                    type === entityType
                      ? entityType === 'inimigo'
                        ? 'border-red-400/35 bg-red-400/10 text-red-200'
                        : 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200'
                      : 'border-white/10 text-white/40'
                  }`}
                >
                  {entityType}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 py-1 text-xs text-white/50">
              <input type="checkbox" checked={hpVisible} onChange={(event) => setHpVisible(event.target.checked)} />
              Mostrar PV aos jogadores
            </label>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#c7a44c] py-2 text-xs font-bold text-black disabled:opacity-50">
              {busy ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />} Adicionar à cena
            </button>
          </motion.form>
        ) : null}

        {message ? <p className="mt-3 rounded-md bg-red-400/10 px-3 py-2 text-xs text-red-200" role="alert">{message}</p> : null}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {emCombate && !turnoAtualId ? (
          <p className="mb-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-white/45">O turno atual pertence a uma entidade oculta.</p>
        ) : null}
        {iniciativa.length === 0 ? (
          <div className="flex h-full min-h-44 flex-col items-center justify-center px-6 text-center text-white/35">
            <UserRound size={32} strokeWidth={1.5} />
            <p className="mt-3 text-sm">{comando ? 'Adicione participantes para preparar o combate.' : 'O mestre ainda está preparando esta cena.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {iniciativa.map((entity, index) => {
                const active = emCombate && entity.id === turnoAtualId;
                const hpRatio = entity.hpTotal && entity.hpAtual !== undefined
                  ? Math.max(0, Math.min(100, (entity.hpAtual / entity.hpTotal) * 100))
                  : null;
                return (
                  <motion.article
                    key={entity.id}
                    layout={!reduceMotion}
                    className={`overflow-hidden rounded-xl border ${
                      active
                        ? 'border-[#c7a44c]/55 bg-[#c7a44c]/[0.09]'
                        : 'border-white/[0.07] bg-black/25'
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-black/30 font-mono text-sm font-bold" style={{ borderColor: `${entity.cor}80`, color: entity.cor }}>
                        {entity.iniciativa}
                        <span className="absolute -left-1 -top-1 rounded-full bg-[#17151c] px-1 text-[8px] font-normal text-white/35">{index + 1}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-white/90">{entity.nome}</h3>
                          {active ? <span className="rounded-full bg-[#c7a44c]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#e2c465]">Turno</span> : null}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] capitalize text-white/40">
                          <span>{entity.tipo}</span>
                          <span>•</span>
                          <span>{entity.hpAtual !== undefined ? `${entity.hpAtual}/${entity.hpTotal ?? '?' } PV` : entity.estado_vida ?? 'PV ocultos'}</span>
                        </div>
                        {hpRatio !== null ? (
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-red-400/65" style={{ width: `${hpRatio}%` }} />
                          </div>
                        ) : null}
                      </div>
                      {entity.personagemId ? (
                        <button type="button" onClick={() => navigate(`/ficha/${entity.personagemId}`)} className="p-1.5 text-white/35 hover:text-white" aria-label={`Abrir ficha de ${entity.nome}`}>
                          <Eye size={14} />
                        </button>
                      ) : null}
                      {comando ? (
                        <button type="button" onClick={() => setEditingId(editingId === entity.id ? null : entity.id)} className="p-1.5 text-white/35 hover:text-[#d9bb63]" aria-label={`Editar ${entity.nome}`}>
                          <Pencil size={14} />
                        </button>
                      ) : null}
                    </div>

                    {entity.condicoes.length && editingId !== entity.id ? (
                      <div className="flex flex-wrap gap-1 border-t border-white/[0.06] px-3 py-2">
                        {entity.condicoes.map((condition) => (
                          <span key={`${condition.nome}-${condition.turnos ?? 'p'}`} className="rounded-full bg-amber-300/[0.07] px-2 py-0.5 text-[9px] text-amber-100/65">
                            {condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {editingId === entity.id && comando ? (
                      <EntityEditor
                        entity={entity}
                        busy={busy}
                        onCancel={() => setEditingId(null)}
                        onSave={async (payload) => {
                          await runAction(async () => {
                            await atualizarEntidade(entity.id, payload);
                            setEditingId(null);
                          }, `Não foi possível atualizar ${entity.nome}.`);
                        }}
                      />
                    ) : null}

                    {comando ? (
                      <div className="border-t border-white/[0.06] px-3 py-1.5 text-right">
                        {removingId === entity.id ? (
                          <div className="flex items-center justify-end gap-2 text-[10px] text-white/50">
                            <span>Remover?</span>
                            <button type="button" onClick={() => setRemovingId(null)} className="px-1 py-1 hover:text-white">Cancelar</button>
                            <button
                              type="button"
                              onClick={() => void runAction(async () => {
                                await removerEntidade(entity.id);
                                setRemovingId(null);
                              }, `Não foi possível remover ${entity.nome}.`)}
                              className="flex items-center gap-1 px-1 py-1 text-red-300 hover:text-red-200"
                            >
                              <Trash2 size={11} /> Confirmar
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setRemovingId(entity.id)} className="text-[10px] text-white/25 hover:text-red-300">Remover da cena</button>
                        )}
                      </div>
                    ) : null}
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {comando ? (
        <div className="shrink-0 space-y-2 border-t border-white/10 p-4">
          {!emCombate ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void runAction(sincronizarIniciativa, 'Não foi possível sincronizar as iniciativas.')}
                  disabled={busy || iniciativa.length === 0}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 text-[10px] text-white/55 hover:border-white/20 hover:text-white disabled:opacity-35"
                >
                  <RefreshCw size={12} /> Sincronizar fichas
                </button>
                <button
                  type="button"
                  onClick={() => void runAction(ordenarIniciativa, 'Não foi possível ordenar a iniciativa.')}
                  disabled={busy || iniciativa.length < 2}
                  className="rounded-lg border border-white/10 px-2 py-2 text-[10px] text-white/55 hover:border-white/20 hover:text-white disabled:opacity-35"
                >
                  Ordenar fila
                </button>
              </div>
              <button
                type="button"
                onClick={() => void runAction(iniciarCombate, 'Não foi possível iniciar o combate.')}
                disabled={busy || iniciativa.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-35"
                title={iniciativa.length === 0 ? 'Adicione ao menos um participante' : undefined}
              >
                <Sword size={15} /> Iniciar combate
              </button>
              {iniciativa.length === 0 ? <p className="text-center text-[10px] text-white/30">Adicione ao menos um participante para começar.</p> : null}
            </>
          ) : (
            <>
              <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-2">
                <button
                  type="button"
                  onClick={() => void runAction(turnoAnterior, 'Não foi possível voltar o turno.')}
                  disabled={busy || iniciativa.length === 0}
                  className="flex items-center justify-center rounded-lg border border-white/10 text-white/55 hover:text-white disabled:opacity-35"
                  aria-label="Turno anterior"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => void runAction(proximoTurno, 'Não foi possível avançar o turno.')}
                  disabled={busy || iniciativa.length === 0}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#c7a44c] py-3 text-xs font-bold uppercase tracking-wider text-black hover:bg-[#dec269] disabled:opacity-35"
                >
                  Próximo turno <ArrowRight size={15} />
                </button>
              </div>
              {confirmEnd ? (
                <div className="rounded-lg border border-red-400/15 bg-red-400/[0.06] p-3 text-center">
                  <p className="text-xs text-red-100/75">Encerrar o combate e voltar à preparação?</p>
                  <div className="mt-2 flex justify-center gap-3 text-xs">
                    <button type="button" onClick={() => setConfirmEnd(false)} className="text-white/45 hover:text-white">Cancelar</button>
                    <button
                      type="button"
                      onClick={() => void runAction(async () => {
                        await encerrarCombate();
                        setConfirmEnd(false);
                      }, 'Não foi possível encerrar o combate.')}
                      className="font-medium text-red-300 hover:text-red-200"
                    >
                      Encerrar
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmEnd(true)} className="w-full py-1 text-[10px] uppercase tracking-widest text-red-300/50 hover:text-red-300">Encerrar combate</button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="shrink-0 border-t border-white/10 p-4 text-center text-xs text-white/35">
          Controles da iniciativa disponíveis para o mestre.
        </div>
      )}
    </div>
  );
};
