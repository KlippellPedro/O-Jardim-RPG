import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Dice5, Heart, Shield, Sparkles, User, Zap } from 'lucide-react';
import { useSessaoStore, type SessionRollRequest } from '../../../store/useSessaoStore';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PlayerGallery } from './PlayerGallery';
import { validateDiceFormula } from '../sessionUtils';

interface ActiveTurnCardProps {
  onRequestRoll: (request: SessionRollRequest) => Promise<void>;
  isRollDisabled?: boolean;
}

interface QuickRollProps extends ActiveTurnCardProps {
  characterId?: string | null;
  entityName?: string;
  compact?: boolean;
  canRoll: boolean;
}

const QuickRoll: React.FC<QuickRollProps> = ({
  onRequestRoll,
  isRollDisabled,
  characterId,
  entityName,
  compact = false,
  canRoll,
}) => {
  const [bonus, setBonus] = useState(0);
  const [formula, setFormula] = useState('2d6');
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const disabled = !!isRollDisabled || !canRoll;

  const rollTest = async () => {
    await onRequestRoll({
      titulo: entityName ? `Teste de ${entityName}` : 'Teste d20',
      personagemId: characterId,
      bonus,
      origem: { tela: 'sessao', acao: 'teste_manual' },
    });
  };

  const rollFormula = async () => {
    const validationError = validateDiceFormula(formula);
    setFormulaError(validationError);
    if (validationError) return;
    await onRequestRoll({
      titulo: entityName ? `Rolagem de ${entityName}` : 'Rolagem manual',
      personagemId: characterId,
      formula: formula.trim(),
      origem: { tela: 'sessao', acao: 'formula_manual' },
    });
  };

  return (
    <section className={`rounded-xl border border-white/[0.08] bg-black/25 ${compact ? 'p-4' : 'p-5'}`} aria-labelledby="quick-roll-title">
      <div className="flex items-center gap-2">
        <Dice5 size={17} className="text-[#c7a44c]" />
        <h2 id="quick-roll-title" className="text-sm font-semibold text-white">Rolagem rápida</h2>
      </div>
      <p className="mt-1 text-xs text-white/40">
        {canRoll ? 'O servidor sorteia e registra todos os resultados.' : 'Observadores não podem realizar rolagens.'}
      </p>

      <div className={`mt-4 grid gap-3 ${compact ? 'grid-cols-1 2xl:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3">
          <label htmlFor="session-roll-bonus" className="text-[11px] font-medium uppercase tracking-wider text-white/45">Teste d20 · bônus</label>
          <div className="mt-2 flex gap-2">
            <input
              id="session-roll-bonus"
              type="number"
              min={-99}
              max={99}
              value={bonus}
              onChange={(event) => setBonus(Math.max(-99, Math.min(99, Number(event.target.value) || 0)))}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#c7a44c]/60"
            />
            <button
              type="button"
              onClick={() => void rollTest()}
              disabled={disabled}
              className="rounded-md bg-[#c7a44c] px-3 py-2 text-xs font-bold text-black hover:bg-[#dec269] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Rolar
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3">
          <label htmlFor="session-roll-formula" className="text-[11px] font-medium uppercase tracking-wider text-white/45">Fórmula</label>
          <div className="mt-2 flex gap-2">
            <input
              id="session-roll-formula"
              value={formula}
              maxLength={20}
              onChange={(event) => {
                setFormula(event.target.value);
                if (formulaError) setFormulaError(null);
              }}
              onBlur={() => setFormulaError(validateDiceFormula(formula))}
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#c7a44c]/60"
              placeholder="2d6+3"
              aria-invalid={!!formulaError}
              aria-describedby={formulaError ? 'session-roll-formula-error' : undefined}
            />
            <button
              type="button"
              onClick={() => void rollFormula()}
              disabled={disabled}
              className="rounded-md border border-[#c7a44c]/35 px-3 py-2 text-xs font-bold text-[#e3c363] hover:bg-[#c7a44c]/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Rolar
            </button>
          </div>
          {formulaError ? <p id="session-roll-formula-error" className="mt-2 text-[11px] text-red-300">{formulaError}</p> : null}
        </div>
      </div>
    </section>
  );
};

export const ActiveTurnCard: React.FC<ActiveTurnCardProps> = ({ onRequestRoll, isRollDisabled }) => {
  const { iniciativa, turnoAtualIndex, turnoAtualId, emCombate, comando, meuPapel } = useSessaoStore();
  const { characters, fetchCharacters } = useCharacterStore();
  const reduceMotion = useReducedMotion();
  const activeEntity = emCombate
    ? iniciativa.find((entity) => entity.id === turnoAtualId) ?? iniciativa[turnoAtualIndex]
    : undefined;
  const canRoll = meuPapel !== 'observador';

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  if (!activeEntity) {
    const ownEntity = iniciativa.find((entity) => entity.eMeu);
    return (
      <div className="custom-scrollbar h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <PlayerGallery />
          <QuickRoll
            onRequestRoll={onRequestRoll}
            isRollDisabled={isRollDisabled}
            characterId={ownEntity?.personagemId}
            entityName={ownEntity?.nome}
            canRoll={canRoll}
          />
        </div>
      </div>
    );
  }

  const character = activeEntity.personagemId ? charactersById.get(activeEntity.personagemId) : undefined;
  const hpMax = activeEntity.hpTotal ?? character?.derivados?.vida;
  const hpCurrent = activeEntity.hpAtual ?? hpMax;
  const mana = character?.derivados?.mana;
  const defense = character?.derivados?.defesaNatural;
  const rollCharacterId = comando || activeEntity.eMeu ? activeEntity.personagemId : null;

  return (
    <div className="custom-scrollbar h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
      <motion.div
        key={activeEntity.id}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-4xl space-y-5"
      >
        <section className="overflow-hidden rounded-2xl border border-[#c7a44c]/25 bg-[#0d0c12]/88 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/[0.08] bg-[#c7a44c]/[0.06] px-5 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#d7b85c]">
              <Sparkles size={14} /> Turno atual
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#c7a44c]/25 bg-black/35">
                {character?.foto ? (
                  <img src={character.foto} alt="" className="h-full w-full object-cover" />
                ) : (
                  <User size={34} className="text-[#c7a44c]/45" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-semibold text-white sm:text-3xl">{activeEntity.nome}</h1>
                <p className="mt-1 text-sm capitalize text-white/45">
                  {activeEntity.tipo} · Iniciativa {activeEntity.iniciativa}
                </p>
                {activeEntity.condicoes.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {activeEntity.condicoes.map((condition) => (
                      <span key={`${condition.nome}-${condition.turnos ?? 'p'}`} className="rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-2 py-1 text-[11px] text-amber-100/80">
                        {condition.nome}{condition.turnos ? ` · ${condition.turnos} turnos` : ''}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] p-3 text-red-100/80 sm:p-4">
                <Heart size={17} className="mb-2 text-red-300" />
                <span className="block text-[10px] uppercase tracking-wider text-white/35">Vida</span>
                <strong className="mt-1 block text-sm text-white sm:text-lg">{hpCurrent !== undefined ? `${hpCurrent}/${hpMax ?? '?'}` : activeEntity.estado_vida ?? 'N/D'}</strong>
              </div>
              <div className="rounded-xl border border-sky-400/15 bg-sky-400/[0.06] p-3 text-sky-100/80 sm:p-4">
                <Zap size={17} className="mb-2 text-sky-300" />
                <span className="block text-[10px] uppercase tracking-wider text-white/35">Mana</span>
                <strong className="mt-1 block text-sm text-white sm:text-lg">{mana ?? 'N/D'}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-white/70 sm:p-4">
                <Shield size={17} className="mb-2" />
                <span className="block text-[10px] uppercase tracking-wider text-white/35">Defesa</span>
                <strong className="mt-1 block text-sm text-white sm:text-lg">{defense ?? 'N/D'}</strong>
              </div>
            </div>
          </div>
        </section>

        <QuickRoll
          onRequestRoll={onRequestRoll}
          isRollDisabled={isRollDisabled}
          characterId={rollCharacterId}
          entityName={activeEntity.eMeu || comando ? activeEntity.nome : undefined}
          compact
          canRoll={canRoll}
        />
      </motion.div>
    </div>
  );
};
