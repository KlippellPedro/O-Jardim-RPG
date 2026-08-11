import React, { useState } from 'react';
import { AnimatePresence, motion, Reorder, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  ArrowLeft,
  ArrowRight,
  CheckSquare,
  Eye,
  Gauge,
  GripVertical,
  HeartPulse,
  Pencil,
  Plus,
  RefreshCw,
  Shield,
  Skull,
  Sword,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useSessaoStore, type EntidadeIniciativa } from '../../store/useSessaoStore';
import { EntityEditor } from './components/EntityEditor';
import { BestiarioPicker } from './components/BestiarioPicker';
import type { BestiarioMonstro, NivelVisibilidade } from '../../services/sessaoApi';
import { OPCOES_VISIBILIDADE, rotuloVisibilidade } from './sessionUtils';

interface InitiativeTrackerProps {
  onClose?: () => void;
}

export const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({ onClose }) => {
  const {
    campanhaId,
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
    reordenarIniciativa,
    aplicarEmMassa,
    distribuirXp,
  } = useSessaoStore();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [initiativeValue, setInitiativeValue] = useState(10);
  const [hpMax, setHpMax] = useState('');
  const [defenseValue, setDefenseValue] = useState('');
  const [manaValue, setManaValue] = useState('');
  const [type, setType] = useState<'aliado' | 'inimigo'>('inimigo');
  // O padrão protege o mestre: o número do monstro só aparece se ele escolher.
  const [visibilidade, setVisibilidade] = useState<NivelVisibilidade>('parcial');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchAmount, setBatchAmount] = useState(1);
  const [showBestiario, setShowBestiario] = useState(false);
  const [xpMessage, setXpMessage] = useState<string | null>(null);

  // Arrastar só faz sentido antes do combate começar - durante a luta a
  // ordem é a da iniciativa, não uma decisão manual do mestre.
  const canReorder = comando && !emCombate && !batchMode;

  const runAction = async (action: () => Promise<void>, errorMessage: string) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (error) {
      // O servidor manda o motivo exato (ex.: "nenhum personagem de jogador
      // nesta sessao"); mostrar isso em vez de um texto genérico poupa o
      // mestre de adivinhar o que deu errado.
      setMessage(error instanceof Error && error.message ? error.message : errorMessage);
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
        visibilidade,
        defesa: defenseValue.trim() === '' ? undefined : Math.max(0, Math.min(999, Number(defenseValue) || 0)),
        mana_maxima: manaValue.trim() === '' ? undefined : Math.max(0, Math.min(99999, Number(manaValue) || 0)),
      });
      setName('');
      setInitiativeValue(10);
      setHpMax('');
      setDefenseValue('');
      setManaValue('');
      setType('inimigo');
      setVisibilidade('parcial');
      setIsAdding(false);
    }, 'Não foi possível adicionar a entidade.');
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBatch = (field: 'dano' | 'cura') => {
    if (!selectedIds.size || !batchAmount) return;
    void runAction(async () => {
      await aplicarEmMassa(Array.from(selectedIds), { [field]: batchAmount });
      setSelectedIds(new Set());
    }, field === 'dano' ? 'Não foi possível aplicar o dano.' : 'Não foi possível aplicar a cura.');
  };

  const pickFromBestiario = async (monstro: BestiarioMonstro) => {
    const iniciativaBase = monstro.iniciativa ?? 10;
    const base = {
      tipo: 'inimigo' as const,
      vida_maxima: monstro.pv ?? 0,
      visibilidade: 'parcial' as const,
      vd: monstro.vd ?? undefined,
      defesa: monstro.defesa ?? undefined,
      mana_maxima: monstro.mana ?? undefined,
      ataques: monstro.ataques,
      pericias: monstro.pericias,
    };
    await adicionarEntidade({ ...base, nome: monstro.titulo, iniciativa: iniciativaBase });

    // Multiataque age duas vezes por rodada: a segunda entrada some 10 da
    // iniciativa pra não ficar colada na primeira na fila.
    const temMultiataque = monstro.habilidades.some((habilidade) => habilidade.startsWith('Multiataque'));
    if (temMultiataque) {
      await adicionarEntidade({
        ...base,
        nome: `${monstro.titulo} (2º turno)`,
        iniciativa: Math.max(-99, iniciativaBase - 10),
      });
    }
    setShowBestiario(false);
  };

  const distributeXp = () => {
    if (!selectedIds.size) return;
    setXpMessage(null);
    void runAction(async () => {
      const resultado = await distribuirXp(Array.from(selectedIds));
      const quantos = resultado.personagens.length;
      setXpMessage(
        `${resultado.total_xp} XP distribuído entre ${quantos} personagem${quantos === 1 ? '' : 's'} (${resultado.xp_por_personagem} cada).`,
      );
      setSelectedIds(new Set());
    }, 'Não foi possível distribuir o XP. Confirme que os selecionados têm VD e que há jogadores na cena.');
  };

  const renderCard = (entity: EntidadeIniciativa, index: number) => {
    const active = emCombate && entity.id === turnoAtualId;
    const hpRatio = entity.hpTotal && entity.hpAtual !== undefined
      ? Math.max(0, Math.min(100, (entity.hpAtual / entity.hpTotal) * 100))
      : null;
    return (
      <motion.article
        layout={!reduceMotion}
        className={`overflow-hidden rounded-xl border ${
          active
            ? 'border-[#c7a44c]/55 bg-[#c7a44c]/[0.09]'
            : 'border-white/[0.07] bg-black/25'
        }`}
      >
        <div className="flex items-center gap-3 p-3">
          {canReorder ? <GripVertical size={14} className="shrink-0 cursor-grab text-white/20 active:cursor-grabbing" /> : null}
          {batchMode && comando ? (
            <input
              type="checkbox"
              checked={selectedIds.has(entity.id)}
              onChange={() => toggleSelected(entity.id)}
              className="h-4 w-4 shrink-0 rounded border-white/20 bg-black/30 accent-[#c7a44c]"
              aria-label={`Selecionar ${entity.nome}`}
            />
          ) : null}
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-black/30 font-mono text-sm font-bold" style={{ borderColor: `${entity.cor}80`, color: entity.cor }}>
            {entity.iniciativa}
            <span className="absolute -left-1 -top-1 rounded-full bg-[#17151c] px-1 text-[8px] font-normal text-white/35">{index + 1}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white/90">{entity.nome}</h3>
              {active ? <span className="rounded-full bg-[#c7a44c]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#e2c465]">Turno</span> : null}
              {comando && entity.visibilidade && entity.visibilidade !== 'total' ? (
                <span
                  className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/40"
                  title="Só quem comanda a mesa vê este selo - é o que os jogadores enxergam desta entidade."
                >
                  {rotuloVisibilidade(entity.visibilidade)}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] capitalize text-white/40">
              <span>{entity.tipo}</span>
              <span>•</span>
              <span>{entity.hpAtual !== undefined ? `${entity.hpAtual}/${entity.hpTotal ?? '?' } PV` : entity.estado_vida ?? 'PV ocultos'}</span>
            </div>
            {entity.manaAtual != null || entity.manaTotal != null || entity.defesa != null || (comando && entity.vd != null) ? (
              <div className="mt-1 flex items-center gap-2.5 text-[10px] text-white/40">
                {entity.manaAtual != null || entity.manaTotal != null ? (
                  <span className="flex items-center gap-0.5" title="Mana">
                    <Zap size={10} className="text-sky-300/70" /> {entity.manaAtual ?? entity.manaTotal}/{entity.manaTotal ?? '?'}
                  </span>
                ) : null}
                {entity.defesa != null ? (
                  <span className="flex items-center gap-0.5" title="Defesa">
                    <Shield size={10} /> {entity.defesa}
                  </span>
                ) : null}
                {comando && entity.vd != null ? (
                  <span className="flex items-center gap-0.5" title="Valor de Desafio">
                    <Gauge size={10} /> {entity.vd}
                  </span>
                ) : null}
              </div>
            ) : null}
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
            {comando && iniciativa.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setBatchMode((current) => !current);
                  setSelectedIds(new Set());
                }}
                className={`rounded-md border p-2 ${
                  batchMode
                    ? 'border-[#c7a44c]/50 bg-[#c7a44c]/10 text-[#d7b85c]'
                    : 'border-white/10 text-white/50 hover:text-white'
                }`}
                aria-pressed={batchMode}
                aria-label={batchMode ? 'Sair da seleção em massa' : 'Selecionar vários para aplicar dano ou cura'}
                title="Aplicar dano ou cura em vários participantes de uma vez"
              >
                <CheckSquare size={17} />
              </button>
            ) : null}
            {comando && campanhaId ? (
              <button
                type="button"
                onClick={() => setShowBestiario(true)}
                className="rounded-md border border-white/10 p-2 text-white/50 hover:border-[#c7a44c]/40 hover:text-white"
                aria-label="Abrir o Bestiário"
                title="Adicionar criatura do Bestiário"
              >
                <Skull size={17} />
              </button>
            ) : null}
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                PV máximo
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
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                Defesa
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={defenseValue}
                  onChange={(event) => setDefenseValue(event.target.value)}
                  placeholder="-"
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-sm text-white outline-none"
                />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                Mana
                <input
                  type="number"
                  min={0}
                  max={99999}
                  value={manaValue}
                  onChange={(event) => setManaValue(event.target.value)}
                  placeholder="-"
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
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Visibilidade para os jogadores</span>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {OPCOES_VISIBILIDADE.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => setVisibilidade(opcao.valor)}
                    title={opcao.descricao}
                    aria-pressed={visibilidade === opcao.valor}
                    className={`rounded-md border px-2 py-1.5 text-[11px] font-medium ${
                      visibilidade === opcao.valor
                        ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e7c76f]'
                        : 'border-white/10 text-white/45 hover:border-white/20 hover:text-white/70'
                    }`}
                  >
                    {opcao.rotulo}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-white/30">Ataques e outros detalhes dão pra completar depois, no editor (ícone de lápis).</p>
            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-md bg-[#c7a44c] py-2 text-xs font-bold text-black disabled:opacity-50">
              {busy ? <RefreshCw className="animate-spin" size={14} /> : <Plus size={14} />} Adicionar à cena
            </button>
          </motion.form>
        ) : null}

        {batchMode && comando ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 p-2.5">
            <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/40">
              {selectedIds.size} selecionado{selectedIds.size === 1 ? '' : 's'}
            </span>
            <input
              type="number"
              min={0}
              max={99999}
              value={batchAmount}
              onChange={(event) => setBatchAmount(Math.max(0, Math.min(99999, Number(event.target.value) || 0)))}
              className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
              aria-label="Quantidade de dano ou cura"
            />
            <button
              type="button"
              disabled={busy || selectedIds.size === 0 || !batchAmount}
              onClick={() => applyBatch('dano')}
              className="flex items-center gap-1 rounded-md border border-red-400/30 px-2 py-1.5 text-xs font-medium text-red-200 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sword size={13} /> Dano
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0 || !batchAmount}
              onClick={() => applyBatch('cura')}
              className="flex items-center gap-1 rounded-md border border-emerald-400/30 px-2 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <HeartPulse size={13} /> Cura
            </button>
            <button
              type="button"
              disabled={busy || selectedIds.size === 0}
              onClick={distributeXp}
              title="Soma o XP (pelo VD) dos selecionados e reparte entre os jogadores da cena"
              className="flex items-center gap-1 rounded-md border border-[#c7a44c]/30 px-2 py-1.5 text-xs font-medium text-[#e3c363] hover:bg-[#c7a44c]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Award size={13} /> Distribuir XP
            </button>
            {selectedIds.size > 0 ? (
              <button type="button" onClick={() => setSelectedIds(new Set())} className="text-[10px] text-white/35 hover:text-white/60">
                Limpar seleção
              </button>
            ) : null}
          </div>
        ) : null}

        {xpMessage ? <p className="mt-3 rounded-md bg-[#c7a44c]/10 px-3 py-2 text-xs text-[#e3c363]" role="status">{xpMessage}</p> : null}
        {message ? <p className="mt-3 rounded-md bg-red-400/10 px-3 py-2 text-xs text-red-200" role="alert">{message}</p> : null}
      </div>

      {showBestiario && campanhaId ? (
        <BestiarioPicker
          campanhaId={campanhaId}
          onCancel={() => setShowBestiario(false)}
          onPick={pickFromBestiario}
        />
      ) : null}

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {emCombate && !turnoAtualId ? (
          <p className="mb-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2 text-xs text-white/45">O turno atual pertence a uma entidade oculta.</p>
        ) : null}
        {iniciativa.length === 0 ? (
          <div className="flex h-full min-h-44 flex-col items-center justify-center px-6 text-center text-white/35">
            <UserRound size={32} strokeWidth={1.5} />
            <p className="mt-3 text-sm">{comando ? 'Adicione participantes para preparar o combate.' : 'O mestre ainda está preparando esta cena.'}</p>
          </div>
        ) : canReorder ? (
          <Reorder.Group
            as="div"
            axis="y"
            values={iniciativa}
            onReorder={(newOrder) => void reordenarIniciativa(newOrder.map((entity) => entity.id))}
            className="space-y-2"
          >
            {iniciativa.map((entity, index) => (
              <Reorder.Item key={entity.id} value={entity} as="div">
                {renderCard(entity, index)}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {iniciativa.map((entity, index) => (
                <React.Fragment key={entity.id}>{renderCard(entity, index)}</React.Fragment>
              ))}
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
