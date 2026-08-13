import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart, Shield, Sparkles, User, Users, Zap } from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useSessaoStore } from '../../../store/useSessaoStore';

export const PlayerGallery: React.FC = () => {
  const characters = useCharacterStore((state) => state.characters);
  const iniciativa = useSessaoStore((state) => state.iniciativa);
  const comando = useSessaoStore((state) => state.comando);
  const reduceMotion = useReducedMotion();

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  if (!iniciativa.length) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-14 text-center">
        <Users className="mb-4 text-[#c7a44c]/60" size={38} strokeWidth={1.5} />
        <h2 className="text-lg font-semibold text-white">A mesa ainda não tem participantes</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/45">
          {comando
            ? 'Use o painel de iniciativa para adicionar aliados ou inimigos. Personagens ativos entram automaticamente quando a sessão é aberta.'
            : 'O mestre ainda está preparando os participantes desta sessão.'}
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="session-party-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#c7a44c]">
            <Sparkles size={17} />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Preparação</p>
          </div>
          <h2 id="session-party-title" className="mt-2 text-2xl font-semibold text-white">Participantes da cena</h2>
          <p className="mt-1 text-sm text-white/45">Revise o grupo e a iniciativa antes do primeiro turno.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/50">
          {iniciativa.length} {iniciativa.length === 1 ? 'participante' : 'participantes'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
        {iniciativa.map((entity, index) => {
          const character = entity.personagemId ? charactersById.get(entity.personagemId) : undefined;
          const hpMax = entity.hpTotal ?? character?.derivados?.vida;
          const hpCurrent = entity.hpAtual ?? hpMax;
          const manaMax = entity.manaTotal ?? character?.derivados?.mana;
          const manaCurrent = entity.manaAtual ?? manaMax;
          const defense = entity.defesa ?? character?.derivados?.defesaNatural;

          return (
            <motion.article
              key={entity.id}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.2) }}
              className="content-auto-list-item rounded-xl border border-white/[0.08] bg-black/25 p-4 transition-colors hover:border-[#c7a44c]/25"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/40">
                  {character?.foto ? (
                    <img src={character.foto} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  ) : (
                    <User size={22} className="text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-white">{entity.nome}</h3>
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: entity.cor }}
                      title={entity.tipo}
                    />
                  </div>
                  <p className="mt-0.5 text-xs capitalize text-white/40">
                    {entity.tipo} · Iniciativa {entity.iniciativa}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-red-400/[0.07] p-2 text-red-200/80">
                  <Heart size={13} className="mb-1" />
                  <span className="block truncate">{hpCurrent !== undefined ? `${hpCurrent}/${hpMax ?? '?'}` : entity.estado_vida ?? 'N/D'}</span>
                </div>
                <div className="rounded-lg bg-sky-400/[0.07] p-2 text-sky-200/80">
                  <Zap size={13} className="mb-1" />
                  <span>{manaCurrent !== undefined ? `${manaCurrent}/${manaMax ?? '?'}` : 'N/D'}</span>
                </div>
                <div className="rounded-lg bg-white/[0.04] p-2 text-white/60">
                  <Shield size={13} className="mb-1" />
                  <span>{defense ?? 'N/D'}</span>
                </div>
              </div>

              {entity.condicoes.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {entity.condicoes.map((condition) => (
                    <span key={`${condition.nome}-${condition.turnos ?? 'p'}`} className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2 py-0.5 text-[10px] text-amber-100/70">
                      {condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''}
                    </span>
                  ))}
                </div>
              ) : null}
            </motion.article>
          );
        })}
      </div>
    </section>
  );
};
