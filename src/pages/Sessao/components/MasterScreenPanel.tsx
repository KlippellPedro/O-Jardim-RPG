import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  NotebookPen,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Swords,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useSessaoStore, type EntidadeIniciativa } from '../../../store/useSessaoStore';
import type { ICharacter } from '../../../types/character';

interface MasterScreenPanelProps {
  onClose: () => void;
}

type EntityFilter = 'todos' | EntidadeIniciativa['tipo'];

interface MasterEntityCardProps {
  entity: EntidadeIniciativa;
  character?: ICharacter;
  active: boolean;
  upNext: boolean;
  onOpenSheet: () => void;
}

const MasterEntityCard: React.FC<MasterEntityCardProps> = ({ entity, character, active, upNext, onOpenSheet }) => {
  const atualizarEntidade = useSessaoStore((state) => state.atualizarEntidade);
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('1');
  const [note, setNote] = useState(entity.anotacao);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setNote(entity.anotacao), [entity.anotacao]);

  const hpMax = entity.hpTotal ?? character?.derivados?.vida;
  const hpCurrent = entity.hpAtual ?? hpMax;
  const manaMax = entity.manaTotal ?? character?.derivados?.mana;
  const manaCurrent = entity.manaAtual ?? manaMax;
  const defense = entity.defesa ?? character?.derivados?.defesaNatural;
  const hpRatio = hpMax && hpCurrent !== undefined
    ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100))
    : 0;

  const perform = async (payload: { dano: number } | { cura: number } | { anotacao: string }) => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await atualizarEntidade(entity.id, payload);
      if ('anotacao' in payload) setMessage('Plano salvo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar esta criatura.');
    } finally {
      setBusy(false);
    }
  };

  const applyHealth = (kind: 'dano' | 'cura') => {
    const parsed = Number(amount);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99999) {
      setMessage('Informe um valor inteiro entre 1 e 99.999.');
      return;
    }
    void perform(kind === 'dano' ? { dano: parsed } : { cura: parsed });
  };

  const chooseAttack = (name: string, detail: string) => {
    setNote(`Usar ${name}${detail ? `: ${detail}` : ''}`);
    setExpanded(true);
  };

  return (
    <article className={`overflow-hidden rounded-xl border ${active ? 'border-[#c7a44c]/55 bg-[#c7a44c]/[0.07]' : 'border-white/[0.08] bg-black/25'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/35">
            {character?.foto ? <img src={character.foto} alt="" className="h-full w-full object-cover" /> : <UserRound size={20} className="text-white/30" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-white">{entity.nome}</h3>
              {active ? <span className="rounded-full bg-[#c7a44c]/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#e2c465]">Turno atual</span> : null}
              {upNext ? <span className="rounded-full bg-violet-300/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-violet-200">A seguir</span> : null}
            </div>
            <p className="mt-0.5 text-[10px] capitalize text-white/40">{entity.tipo} · Iniciativa {entity.iniciativa}</p>
          </div>
          <button type="button" onClick={() => setExpanded((current) => !current)} className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label={expanded ? `Recolher ${entity.nome}` : `Ver detalhes de ${entity.nome}`}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-red-400/10 bg-red-400/[0.06] p-2 text-red-100/80">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/35"><Heart size={11} /> Vida</div>
            <strong className="mt-1 block text-white">{hpCurrent !== undefined ? `${hpCurrent}/${hpMax ?? '?'}` : 'N/D'}</strong>
          </div>
          <div className="rounded-lg border border-sky-400/10 bg-sky-400/[0.06] p-2 text-sky-100/80">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/35"><Zap size={11} /> Mana</div>
            <strong className="mt-1 block text-white">{manaCurrent !== undefined ? `${manaCurrent}/${manaMax ?? '?'}` : 'N/D'}</strong>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-2 text-white/70">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-white/35"><Shield size={11} /> Defesa</div>
            <strong className="mt-1 block text-white">{defense ?? 'N/D'}</strong>
          </div>
        </div>

        {hpMax ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-label={`${hpRatio}% da Vida`}>
            <div className={`h-full rounded-full transition-[width] ${hpRatio <= 25 ? 'bg-red-500' : hpRatio <= 50 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${hpRatio}%` }} />
          </div>
        ) : null}

        {entity.anotacao ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-violet-300/15 bg-violet-300/[0.06] px-3 py-2 text-xs text-violet-100/80">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-violet-300" />
            <span className="line-clamp-2"><strong>Próxima ação:</strong> {entity.anotacao}</span>
          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-4 border-t border-white/[0.07] bg-black/15 p-4">
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Ajuste rápido de Vida</p>
            <div className="mt-2 flex gap-2">
              <input
                type="number"
                min={1}
                max={99999}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-20 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
                aria-label={`Quantidade de dano ou cura para ${entity.nome}`}
              />
              <button type="button" onClick={() => applyHealth('dano')} disabled={busy} className="rounded-md border border-red-400/20 px-3 py-1.5 text-xs text-red-200 hover:bg-red-400/10 disabled:opacity-40">Dano</button>
              <button type="button" onClick={() => applyHealth('cura')} disabled={busy} className="rounded-md border border-emerald-400/20 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-40">Cura</button>
            </div>
          </section>

          {entity.ataques?.length ? (
            <section>
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40"><Swords size={12} /> Ataques disponíveis</p>
              <div className="mt-2 space-y-1.5">
                {entity.ataques.map((attack, index) => (
                  <button
                    key={`${attack.nome}-${index}`}
                    type="button"
                    onClick={() => chooseAttack(attack.nome, attack.detalhe)}
                    className="block w-full rounded-md border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-left text-xs hover:border-violet-300/25 hover:bg-violet-300/[0.05]"
                    title="Definir como próxima ação"
                  >
                    <strong className="text-white/85">{attack.nome}</strong>
                    {attack.detalhe ? <span className="text-white/45"> · {attack.detalhe}</span> : null}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {entity.pericias?.length || entity.condicoes.length ? (
            <section className="flex flex-wrap gap-1.5">
              {entity.pericias?.map((skill) => <span key={skill} className="rounded-full border border-sky-300/15 bg-sky-300/[0.05] px-2 py-1 text-[10px] text-sky-100/70">{skill}</span>)}
              {entity.condicoes.map((condition) => <span key={`${condition.nome}-${condition.turnos ?? 'p'}`} className="rounded-full border border-amber-300/15 bg-amber-300/[0.05] px-2 py-1 text-[10px] text-amber-100/70">{condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''}</span>)}
            </section>
          ) : null}

          <section>
            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40" htmlFor={`master-note-${entity.id}`}>
              <NotebookPen size={12} /> {entity.tipo === 'inimigo' ? 'Plano para o próximo turno' : 'Nota privada do Mestre'}
            </label>
            <textarea
              id={`master-note-${entity.id}`}
              value={note}
              maxLength={500}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder={entity.tipo === 'inimigo' ? 'Ex.: Avançar no mago e usar Mordida.' : 'Anotação rápida sobre este participante.'}
              className="mt-2 w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-xs leading-5 text-white outline-none placeholder:text-white/20 focus:border-violet-300/35"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                {character ? (
                  <button type="button" onClick={onOpenSheet} className="flex items-center gap-1.5 text-xs text-[#e3c363] hover:underline">
                    <ExternalLink size={12} /> Abrir ficha completa
                  </button>
                ) : null}
                {message ? <p className={`mt-1 text-[10px] ${message === 'Plano salvo.' ? 'text-emerald-300' : 'text-red-200'}`}>{message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => void perform({ anotacao: note.trim() })}
                disabled={busy || note.trim() === entity.anotacao}
                className="flex items-center gap-1.5 rounded-md border border-violet-300/20 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-300/[0.08] disabled:opacity-35"
              >
                {busy ? <RefreshCw className="animate-spin" size={12} /> : <NotebookPen size={12} />} Salvar plano
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </article>
  );
};

export const MasterScreenPanel: React.FC<MasterScreenPanelProps> = ({ onClose }) => {
  const { iniciativa, turnoAtualId, turnoAtualIndex, emCombate } = useSessaoStore();
  const { characters, fetchCharacters } = useCharacterStore();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<EntityFilter>('todos');

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const charactersById = useMemo(() => new Map(characters.map((character) => [character.id, character])), [characters]);
  const activeEntity = emCombate
    ? iniciativa.find((entity) => entity.id === turnoAtualId) ?? iniciativa[turnoAtualIndex]
    : undefined;
  const activeIndex = activeEntity ? iniciativa.findIndex((entity) => entity.id === activeEntity.id) : -1;
  const nextEntityId = emCombate && iniciativa.length > 1 && activeIndex >= 0
    ? iniciativa[(activeIndex + 1) % iniciativa.length]?.id
    : null;
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return iniciativa.filter((entity) => (
      (filter === 'todos' || entity.tipo === filter)
      && (!term || entity.nome.toLocaleLowerCase('pt-BR').includes(term))
    ));
  }, [filter, iniciativa, search]);

  const counts = useMemo(() => ({
    todos: iniciativa.length,
    jogador: iniciativa.filter((entity) => entity.tipo === 'jogador').length,
    aliado: iniciativa.filter((entity) => entity.tipo === 'aliado').length,
    inimigo: iniciativa.filter((entity) => entity.tipo === 'inimigo').length,
  }), [iniciativa]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0a10]">
      <header className="border-b border-white/[0.08] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#d9b95f]"><Shield size={18} /><p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Escudo do Mestre</p></div>
            <h2 className="mt-2 text-xl font-semibold text-white">Controle da cena</h2>
            <p className="mt-1 text-xs leading-5 text-white/40">Vida, fichas e planos dos próximos turnos em um só lugar.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Fechar Escudo do Mestre"><X size={18} /></button>
        </div>

        <div className="relative mt-4">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar participante..." className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-[#c7a44c]/45" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(['todos', 'jogador', 'aliado', 'inimigo'] as const).map((value) => (
            <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-full border px-2.5 py-1 text-[10px] capitalize ${filter === value ? 'border-[#c7a44c]/45 bg-[#c7a44c]/10 text-[#e3c363]' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
              {value} · {counts[value]}
            </button>
          ))}
        </div>
      </header>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
        {filtered.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {filtered.map((entity) => (
              <MasterEntityCard
                key={entity.id}
                entity={entity}
                character={entity.personagemId ? charactersById.get(entity.personagemId) : undefined}
                active={activeEntity?.id === entity.id}
                upNext={nextEntityId === entity.id}
                onOpenSheet={() => {
                  if (!entity.personagemId) return;
                  onClose();
                  navigate(`/ficha/${entity.personagemId}`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center">
            <Shield size={34} className="text-[#c7a44c]/40" />
            <p className="mt-3 text-sm font-semibold text-white/70">Nenhum ser encontrado</p>
            <p className="mt-1 text-xs leading-5 text-white/35">Adicione participantes pela preparação ou pelo painel de iniciativa.</p>
          </div>
        )}
      </div>
    </div>
  );
};
