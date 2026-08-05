import React, { useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GraduationCap, Heart, Shield, Sparkles, Swords, User, Zap } from 'lucide-react';
import { useSessaoStore } from '../../../store/useSessaoStore';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { PlayerGallery } from './PlayerGallery';

export const ActiveTurnCard: React.FC = () => {
  const { iniciativa, turnoAtualIndex, turnoAtualId, emCombate } = useSessaoStore();
  const { characters, fetchCharacters } = useCharacterStore();
  const reduceMotion = useReducedMotion();
  const activeEntity = emCombate
    ? iniciativa.find((entity) => entity.id === turnoAtualId) ?? iniciativa[turnoAtualIndex]
    : undefined;

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  if (!activeEntity) {
    return (
      <div className="custom-scrollbar h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <PlayerGallery />
        </div>
      </div>
    );
  }

  const character = activeEntity.personagemId ? charactersById.get(activeEntity.personagemId) : undefined;
  const hpMax = activeEntity.hpTotal ?? character?.derivados?.vida;
  const hpCurrent = activeEntity.hpAtual ?? hpMax;
  const manaMax = activeEntity.manaTotal ?? character?.derivados?.mana;
  const manaCurrent = activeEntity.manaAtual ?? manaMax;
  const defense = activeEntity.defesa ?? character?.derivados?.defesaNatural;

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
                <strong className="mt-1 block text-sm text-white sm:text-lg">{manaCurrent !== undefined ? `${manaCurrent}/${manaMax ?? '?'}` : 'N/D'}</strong>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-white/70 sm:p-4">
                <Shield size={17} className="mb-2" />
                <span className="block text-[10px] uppercase tracking-wider text-white/35">Defesa</span>
                <strong className="mt-1 block text-sm text-white sm:text-lg">{defense ?? 'N/D'}</strong>
              </div>
            </div>

            {activeEntity.pericias?.length ? (
              <div className="mt-5 border-t border-white/[0.06] pt-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  <GraduationCap size={14} /> Perícias
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {activeEntity.pericias.map((pericia) => (
                    <span key={pericia} className="rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-2.5 py-1 text-xs text-sky-100/80">
                      {pericia}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {activeEntity.ataques?.length ? (
              <div className="mt-5 border-t border-white/[0.06] pt-5">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  <Swords size={14} /> Ataques
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {activeEntity.ataques.map((ataque, index) => (
                    <div key={`${ataque.nome}-${index}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm">
                      <span className="font-medium text-white/85">{ataque.nome}</span>
                      {ataque.detalhe ? <span className="text-white/45"> · {ataque.detalhe}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </motion.div>
    </div>
  );
};
