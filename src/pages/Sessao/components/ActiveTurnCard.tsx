import React, { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Eye, Shield, Sparkles, Swords, Target, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { sessaoApi, type BestiarioMonstro } from '../../../services/sessaoApi';
import { CriaturaDetalhe } from './CriaturaDetalhe';
import { corDoVd } from './BestiarioPicker';

interface EntityMetrics {
  hpCurrent?: number;
  hpMax?: number;
  hpExtra?: number;
  manaCurrent?: number;
  manaMax?: number;
  manaExtra?: number;
  estaminaCurrent?: number;
  estaminaMax?: number;
  estaminaExtra?: number;
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
  tone: 'health' | 'mana' | 'stamina';
  /** Extra temporário acima do máximo. */
  extra?: number;
}

const ResourceBar: React.FC<ResourceBarProps> = ({ label, current, maximum, fallback = 'N/D', tone, extra = 0 }) => {
  const ratio = percentage(current, maximum);
  const extraRatio = extra > 0 ? percentage(extra, maximum) ?? 100 : 0;
  return (
    <div className="session-resource">
      <div className="session-resource__meta">
        <span>{label}</span>
        <strong>
          {current !== undefined ? `${current}/${maximum ?? '?'}` : fallback}
          {extra > 0 ? <em className={`session-resource__extra-valor session-resource__extra-valor--${tone}`} title="Extra temporário"> +{extra}</em> : null}
        </strong>
      </div>
      <div className="session-resource__track" aria-hidden="true">
        <span className={`session-resource__fill session-resource__fill--${tone}`} style={{ width: `${ratio ?? 0}%` }} />
      </div>
      {extra > 0 ? (
        <div className="session-resource__extra" aria-hidden="true">
          <span className={`session-resource__extra-fill session-resource__extra-fill--${tone}`} style={{ width: `${Math.min(100, extraRatio)}%` }} />
        </div>
      ) : null}
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
          {entity.fase ? <em className="session-roster-card__fase" title={entity.faseNome ?? 'Fase de chefe'}>Fase {entity.fase}</em> : null}
          {active ? <em>Turno</em> : null}
        </span>
        <span className="session-roster-card__subline">
          <span>{entityTypeLabel(entity.tipo)}</span>
          <span aria-hidden="true">·</span>
          <span>{metrics.defense != null ? `DEF ${metrics.defense}` : 'DEF N/D'}</span>
          {metrics.manaCurrent != null || metrics.manaMax != null ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{`MP ${metrics.manaCurrent ?? metrics.manaMax}/${metrics.manaMax ?? '?'}`}</span>
            </>
          ) : null}
          {metrics.estaminaCurrent != null || metrics.estaminaMax != null ? (
            <>
              <span aria-hidden="true">·</span>
              <span>{`EP ${metrics.estaminaCurrent ?? metrics.estaminaMax}/${metrics.estaminaMax ?? '?'}`}</span>
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
  const { iniciativa, turnoAtualIndex, turnoAtualId, emCombate, rodada, comando, campanhaId } = useSessaoStore();
  const { characters, fetchCharacters } = useCharacterStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Ficha completa da criatura (habilidades, atributos, saque): só o Mestre recebe `monstroId`.
  const [bestiario, setBestiario] = useState<BestiarioMonstro[] | null>(null);
  const [fichaAberta, setFichaAberta] = useState<BestiarioMonstro | null>(null);
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
  const monstroDoFoco = selectedEntity?.monstroId ? bestiario?.find((item) => item.id === selectedEntity.monstroId) ?? null : null;

  useEffect(() => {
    if (!comando || !campanhaId || !selectedEntity?.monstroId || bestiario) return;
    let cancelado = false;
    sessaoApi.listarBestiario(campanhaId)
      .then((resposta) => { if (!cancelado) setBestiario(resposta?.monstros ?? []); })
      .catch(() => { if (!cancelado) setBestiario([]); });
    return () => { cancelado = true; };
  }, [comando, campanhaId, selectedEntity?.monstroId, bestiario]);
  const party = iniciativa.filter((entity) => entity.tipo !== 'inimigo');
  const enemies = iniciativa.filter((entity) => entity.tipo === 'inimigo');

  const metricsFor = (entity: EntidadeIniciativa): EntityMetrics => {
    const character = entity.personagemId ? charactersById.get(entity.personagemId) : undefined;
    const hpMax = entity.hpTotal ?? character?.derivados?.vida;
    const manaMax = entity.manaTotal ?? character?.derivados?.mana;
    const estaminaMax = entity.estaminaTotal ?? character?.derivados?.estamina;
    return {
      hpCurrent: entity.hpAtual ?? hpMax,
      hpMax,
      hpExtra: entity.hpTemp,
      manaCurrent: entity.manaAtual ?? manaMax,
      manaMax,
      manaExtra: entity.manaTemp,
      estaminaCurrent: entity.estaminaAtual ?? estaminaMax,
      estaminaMax,
      estaminaExtra: entity.estaminaTemp,
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
                {selectedEntity.fase ? (
                  <span className="session-focus-card__fase">Fase {selectedEntity.fase}{selectedEntity.fasesTotal ? ` de ${selectedEntity.fasesTotal}` : ''}{selectedEntity.faseNome ? ` · ${selectedEntity.faseNome}` : ''}</span>
                ) : null}
              </div>
              {monstroDoFoco || selectedEntity.personagemId ? (
                <div className="session-focus-card__actions">
                  {monstroDoFoco ? (
                    <button
                      type="button"
                      onClick={() => setFichaAberta(monstroDoFoco)}
                      className="session-focus-card__sheet-link"
                    >
                      <BookOpen size={15} /> Ficha completa
                    </button>
                  ) : null}
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
              ) : null}
            </div>

            <div className="session-focus-card__resources">
              <ResourceBar
                label="Vida"
                current={selectedMetrics.hpCurrent}
                maximum={selectedMetrics.hpMax}
                fallback={selectedEntity.estado_vida ?? 'N/D'}
                tone="health"
                extra={selectedMetrics.hpExtra}
              />
              <ResourceBar label="Mana" current={selectedMetrics.manaCurrent} maximum={selectedMetrics.manaMax} tone="mana" extra={selectedMetrics.manaExtra} />
              {selectedMetrics.estaminaCurrent != null || selectedMetrics.estaminaMax != null ? (
                <ResourceBar label="Estamina" current={selectedMetrics.estaminaCurrent} maximum={selectedMetrics.estaminaMax} tone="stamina" extra={selectedMetrics.estaminaExtra} />
              ) : null}
              <div className="session-focus-card__defense">
                <Shield size={16} />
                <span>Defesa</span>
                <strong>{selectedMetrics.defense ?? 'N/D'}</strong>
              </div>
            </div>

            {selectedEntity.fase && (selectedEntity.faseMudancas?.length || selectedEntity.faseAnuncio) ? (
              <div className="session-focus-card__phase">
                <span>O que mudou na fase {selectedEntity.fase}</span>
                {selectedEntity.faseAnuncio ? <p className="session-focus-card__phase-anuncio">{selectedEntity.faseAnuncio}</p> : null}
                {selectedEntity.faseMudancas?.length ? (
                  <ul>
                    {selectedEntity.faseMudancas.map((mudanca) => <li key={mudanca}>{mudanca}</li>)}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {selectedEntity.condicoes.length || selectedEntity.ataques?.length || selectedEntity.pericias?.length ? (
              <div className="session-focus-card__details">
                {selectedEntity.ataques?.length ? (
                  <div className="session-focus-card__detail-group session-focus-card__detail-group--wide">
                    <span>Ataques e poderes</span>
                    <ul className="session-focus-card__attacks">
                      {selectedEntity.ataques.map((attack, index) => (
                        <li key={`${attack.nome}-${index}`}>
                          <strong>{attack.nome}</strong>
                          {attack.detalhe ? <p>{attack.detalhe}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {selectedEntity.pericias?.length || selectedEntity.condicoes.length ? (
                  <div className="session-focus-card__detail-group">
                    {selectedEntity.pericias?.length ? (
                      <>
                        <span>Perícias</span>
                        <div>{selectedEntity.pericias.map((skill) => <em key={skill}>{skill}</em>)}</div>
                      </>
                    ) : null}
                    {selectedEntity.condicoes.length ? (
                      <>
                        <span className="session-focus-card__detail-gap">Condições</span>
                        <div>
                          {selectedEntity.condicoes.map((condition) => (
                            <em key={`${condition.nome}-${condition.turnos ?? 'p'}`}>
                              {condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''}
                            </em>
                          ))}
                        </div>
                      </>
                    ) : null}
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

        {fichaAberta ? (
          <CriaturaDetalhe
            campanhaId={campanhaId ?? undefined}
            monstro={fichaAberta}
            familia={null}
            cor={corDoVd(fichaAberta.vd)}
            onFechar={() => setFichaAberta(null)}
          />
        ) : null}

        <p className="session-stage__hint">Selecione uma ficha na mesa para consultar seus recursos sem perder a visão do combate.</p>
      </motion.div>
    </div>
  );
};
