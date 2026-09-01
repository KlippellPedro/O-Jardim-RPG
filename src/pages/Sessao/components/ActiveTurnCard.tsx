import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, Shield, Sparkles, Swords, Target, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import { useCharacterStore } from '../../../store/useCharacterStore';

interface EntityMetrics {
  hpCurrent?: number;
  hpMax?: number;
  manaCurrent?: number;
  manaMax?: number;
  defense?: number | null;
  photo?: string;
}

function percentage(current: number | undefined, maximum: number | undefined): number | null {
  if (current === undefined || maximum === undefined || maximum <= 0) return null;
  return Math.max(0, Math.min(100, (current / maximum) * 100));
}

function entityTypeLabel(type: EntidadeIniciativa['tipo']): string {
  if (type === 'jogador') return 'Personagem';
  if (type === 'aliado') return 'Aliado';
  return 'Inimigo';
}

interface ResourceBarProps {
  label: string;
  current?: number;
  maximum?: number;
  fallback?: string;
  tone: 'health' | 'mana';
}

const ResourceBar: React.FC<ResourceBarProps> = ({ label, current, maximum, fallback = 'N/D', tone }) => {
  const ratio = percentage(current, maximum);
  return (
    <div className="session-resource">
      <div className="session-resource__meta">
        <span>{label}</span>
        <strong>{current !== undefined ? `${current}/${maximum ?? '?'}` : fallback}</strong>
      </div>
      <div className="session-resource__track" aria-hidden="true">
        <span className={`session-resource__fill session-resource__fill--${tone}`} style={{ width: `${ratio ?? 0}%` }} />
      </div>
    </div>
  );
};

interface RosterCardProps {
  entity: EntidadeIniciativa;
  metrics: EntityMetrics;
  active: boolean;
  selected: boolean;
  onSelect: () => void;
}

const RosterCard: React.FC<RosterCardProps> = ({ entity, metrics, active, selected, onSelect }) => {
  const hpRatio = percentage(metrics.hpCurrent, metrics.hpMax);
  const tone = entity.tipo === 'inimigo' ? 'enemy' : entity.tipo === 'aliado' ? 'ally' : 'player';
  const visibleConditions = entity.condicoes.slice(0, 2);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`session-roster-card session-roster-card--${tone}${active ? ' is-active' : ''}${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      aria-label={`Ver ficha de ${entity.nome}`}
    >
      <span className="session-roster-card__initiative" title={`Iniciativa ${entity.iniciativa}`}>
        {entity.iniciativa}
      </span>
      <span className="session-roster-card__portrait">
        {metrics.photo ? (
          <img src={metrics.photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <User size={20} aria-hidden="true" />
        )}
      </span>
      <span className="session-roster-card__body">
        <span className="session-roster-card__heading">
          <strong>{entity.nome}</strong>
          {active ? <em>Turno</em> : null}
        </span>
        <span className="session-roster-card__subline">
          <span>{entityTypeLabel(entity.tipo)}</span>
          <span aria-hidden="true">·</span>
          <span>{metrics.defense != null ? `DEF ${metrics.defense}` : 'DEF —'}</span>
          {metrics.manaCurrent != null || metrics.manaMax != null ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{`MP ${metrics.manaCurrent ?? metrics.manaMax}/${metrics.manaMax ?? '?'}`}</span>
            </>
          ) : null}
        </span>
        <span className="session-roster-card__health">
          <span className="session-roster-card__health-track">
            <span style={{ width: `${hpRatio ?? 0}%` }} />
          </span>
          <span>{metrics.hpCurrent !== undefined ? `${metrics.hpCurrent}/${metrics.hpMax ?? '?'} PV` : entity.estado_vida ?? 'PV ocultos'}</span>
        </span>
        {visibleConditions.length ? (
          <span className="session-roster-card__conditions">
            {visibleConditions.map((condition) => (
              <span key={`${condition.nome}-${condition.turnos ?? 'p'}`}>
                {condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''}
              </span>
            ))}
            {entity.condicoes.length > visibleConditions.length ? <span>+{entity.condicoes.length - visibleConditions.length}</span> : null}
          </span>
        ) : null}
      </span>
    </button>
  );
};

interface TeamLaneProps {
  id: string;
  title: string;
  subtitle: string;
  tone: 'party' | 'enemy';
  entities: EntidadeIniciativa[];
  selectedId: string | null;
  activeId: string | null;
  metricsFor: (entity: EntidadeIniciativa) => EntityMetrics;
  onSelect: (id: string) => void;
}

const TeamLane: React.FC<TeamLaneProps> = ({
  id,
  title,
  subtitle,
  tone,
  entities,
  selectedId,
  activeId,
  metricsFor,
  onSelect,
}) => (
  <section className={`session-team-lane session-team-lane--${tone}`} aria-labelledby={id}>
    <header className="session-team-lane__header">
      <div>
        <p>{subtitle}</p>
        <h3 id={id}>{title}</h3>
      </div>
      <span>{entities.length}</span>
    </header>
    {entities.length ? (
      <div className="session-team-lane__grid">
        {entities.map((entity) => (
          <RosterCard
            key={entity.id}
            entity={entity}
            metrics={metricsFor(entity)}
            active={entity.id === activeId}
            selected={entity.id === selectedId}
            onSelect={() => onSelect(entity.id)}
          />
        ))}
      </div>
    ) : (
      <div className="session-team-lane__empty">
        {tone === 'enemy' ? <Target size={22} /> : <Users size={22} />}
        <span>{tone === 'enemy' ? 'Nenhuma ameaça revelada.' : 'Nenhum personagem ou aliado na cena.'}</span>
      </div>
    )}
  </section>
);

export const ActiveTurnCard: React.FC = () => {
  const { iniciativa, turnoAtualIndex, turnoAtualId, emCombate, rodada, comando } = useSessaoStore();
  const { characters, fetchCharacters } = useCharacterStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const charactersById = useMemo(
    () => new Map(characters.map((character) => [character.id, character])),
    [characters],
  );

  const activeEntity = emCombate
    ? iniciativa.find((entity) => entity.id === turnoAtualId) ?? iniciativa[turnoAtualIndex]
    : undefined;

  useEffect(() => {
    if (activeEntity?.id) {
      setSelectedId(activeEntity.id);
    }
  }, [activeEntity?.id]);

  useEffect(() => {
    if (!selectedId || !iniciativa.some((entity) => entity.id === selectedId)) {
      setSelectedId(iniciativa[0]?.id ?? null);
    }
  }, [iniciativa, selectedId]);

  const selectedEntity = iniciativa.find((entity) => entity.id === selectedId) ?? activeEntity ?? iniciativa[0];
  const party = iniciativa.filter((entity) => entity.tipo !== 'inimigo');
  const enemies = iniciativa.filter((entity) => entity.tipo === 'inimigo');

  const metricsFor = (entity: EntidadeIniciativa): EntityMetrics => {
    const character = entity.personagemId ? charactersById.get(entity.personagemId) : undefined;
    const hpMax = entity.hpTotal ?? character?.derivados?.vida;
    const manaMax = entity.manaTotal ?? character?.derivados?.mana;
    return {
      hpCurrent: entity.hpAtual ?? hpMax,
      hpMax,
      manaCurrent: entity.manaAtual ?? manaMax,
      manaMax,
      defense: entity.defesa ?? character?.derivados?.defesaNatural,
      photo: character?.foto ?? undefined,
    };
  };

  const selectedMetrics = selectedEntity ? metricsFor(selectedEntity) : null;
  const isSelectedTurn = !!selectedEntity && selectedEntity.id === activeEntity?.id;

  if (!iniciativa.length) {
    return (
      <div className="session-stage custom-scrollbar h-full overflow-y-auto" data-tour="session-table">
        <div className="session-empty-table">
          <div className="session-empty-table__icon"><Users size={34} /></div>
          <p>Preparação da mesa</p>
          <h2>A cena ainda não tem participantes</h2>
          <span>
            {comando
              ? 'Escolha os personagens no cabeçalho ou adicione aliados e inimigos no controle da cena.'
              : 'O Mestre ainda está organizando os participantes desta sessão.'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="session-stage custom-scrollbar h-full overflow-y-auto" data-tour="session-table">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="session-stage__content"
      >
        <header className="session-stage__toolbar">
          <div>
            <p><Sparkles size={13} /> Mesa tática</p>
            <h2>{emCombate ? `Combate · Rodada ${Math.max(1, rodada)}` : 'Formação da cena'}</h2>
          </div>
          <div className="session-stage__summary" aria-label="Resumo da cena">
            <span><Users size={13} /> {party.length} no grupo</span>
            <span><Target size={13} /> {enemies.length} ameaças</span>
          </div>
        </header>

        {selectedEntity && selectedMetrics ? (
          <motion.section
            key={selectedEntity.id}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`session-focus-card session-focus-card--${selectedEntity.tipo}`}
            aria-label={`Ficha em foco: ${selectedEntity.nome}`}
            data-tour="session-focus"
          >
            <div className="session-focus-card__identity">
              <div className="session-focus-card__portrait">
                {selectedMetrics.photo ? <img src={selectedMetrics.photo} alt="" /> : <User size={30} />}
                <span>{selectedEntity.iniciativa}</span>
              </div>
              <div className="session-focus-card__name">
                <p>{isSelectedTurn ? <><Swords size={13} /> Turno atual</> : 'Ficha em foco'}</p>
                <h1>{selectedEntity.nome}</h1>
                <span>{entityTypeLabel(selectedEntity.tipo)} · iniciativa {selectedEntity.iniciativa}</span>
              </div>
              {selectedEntity.personagemId ? (
                <button
                  type="button"
                  onClick={() => navigate(`/ficha/${selectedEntity.personagemId}`)}
                  className="session-focus-card__sheet-link"
                  data-tour="session-sheet-link"
                >
                  <Eye size={15} /> Abrir ficha
                </button>
              ) : null}
            </div>

            <div className="session-focus-card__resources">
              <ResourceBar
                label="Vida"
                current={selectedMetrics.hpCurrent}
                maximum={selectedMetrics.hpMax}
                fallback={selectedEntity.estado_vida ?? 'N/D'}
                tone="health"
              />
              <ResourceBar label="Mana" current={selectedMetrics.manaCurrent} maximum={selectedMetrics.manaMax} tone="mana" />
              <div className="session-focus-card__defense">
                <Shield size={16} />
                <span>Defesa</span>
                <strong>{selectedMetrics.defense ?? '—'}</strong>
              </div>
            </div>

            {selectedEntity.condicoes.length || selectedEntity.ataques?.length || selectedEntity.pericias?.length ? (
              <div className="session-focus-card__details">
                {selectedEntity.condicoes.length ? (
                  <div className="session-focus-card__detail-group">
                    <span>Condições</span>
                    <div>
                      {selectedEntity.condicoes.slice(0, 4).map((condition) => (
                        <em key={`${condition.nome}-${condition.turnos ?? 'p'}`}>
                          {condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''}
                        </em>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedEntity.ataques?.length ? (
                  <div className="session-focus-card__detail-group">
                    <span>Ataques</span>
                    <div>
                      {selectedEntity.ataques.slice(0, 3).map((attack, index) => (
                        <em key={`${attack.nome}-${index}`}>{attack.nome}{attack.detalhe ? ` · ${attack.detalhe}` : ''}</em>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedEntity.pericias?.length ? (
                  <div className="session-focus-card__detail-group">
                    <span>Perícias</span>
                    <div>{selectedEntity.pericias.slice(0, 4).map((skill) => <em key={skill}>{skill}</em>)}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </motion.section>
        ) : null}

        <div className="session-battlefield" aria-label="Participantes organizados por lado da cena" data-tour="session-teams">
          <TeamLane
            id="session-party-lane"
            title="Heróis & aliados"
            subtitle="Lado do grupo"
            tone="party"
            entities={party}
            selectedId={selectedEntity?.id ?? null}
            activeId={activeEntity?.id ?? null}
            metricsFor={metricsFor}
            onSelect={setSelectedId}
          />
          <TeamLane
            id="session-enemy-lane"
            title="Ameaças"
            subtitle="Oposição"
            tone="enemy"
            entities={enemies}
            selectedId={selectedEntity?.id ?? null}
            activeId={activeEntity?.id ?? null}
            metricsFor={metricsFor}
            onSelect={setSelectedId}
          />
        </div>

        <p className="session-stage__hint">Selecione uma ficha na mesa para consultar seus recursos sem perder a visão do combate.</p>
      </motion.div>
    </div>
  );
};
