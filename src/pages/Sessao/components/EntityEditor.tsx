import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, GraduationCap, Plus, RefreshCw, Save, Swords, X } from 'lucide-react';
import type {
  EntidadeIniciativa,
  SessionAttack,
  SessionCondition,
} from '../../../store/useSessaoStore';
import type { NivelVisibilidade, ParticipantePayload } from '../../../services/sessaoApi';
import { OPCOES_VISIBILIDADE } from '../sessionUtils';
import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../../../data/regras/condicoes';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';

const CONDICOES_RAPIDAS = [...CONDICOES_OFICIAIS, ...CRISES_SANIDADE];

interface EntityEditorProps {
  entity: EntidadeIniciativa;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: ParticipantePayload) => Promise<void>;
}

export const EntityEditor: React.FC<EntityEditorProps> = ({ entity, busy, onCancel, onSave }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const [initiative, setInitiative] = useState(entity.iniciativa);
  const [hpCurrent, setHpCurrent] = useState(entity.hpAtual ?? 0);
  const [hpMax, setHpMax] = useState(entity.hpTotal ?? 0);
  const [manaCurrent, setManaCurrent] = useState(entity.manaAtual != null ? String(entity.manaAtual) : '');
  const [manaMax, setManaMax] = useState(entity.manaTotal != null ? String(entity.manaTotal) : '');
  const [defense, setDefense] = useState(entity.defesa != null ? String(entity.defesa) : '');
  const [vd, setVd] = useState(entity.vd != null ? String(entity.vd) : '');
  const [visibilidade, setVisibilidade] = useState<NivelVisibilidade>(entity.visibilidade ?? 'total');
  const [conditions, setConditions] = useState<SessionCondition[]>(entity.condicoes);
  const [conditionName, setConditionName] = useState('');
  const [conditionTurns, setConditionTurns] = useState('');
  const [attacks, setAttacks] = useState<SessionAttack[]>(entity.ataques ?? []);
  const [attackName, setAttackName] = useState('');
  const [attackDetail, setAttackDetail] = useState('');
  const [pericias, setPericias] = useState<string[]>(entity.pericias ?? []);
  const [periciaTexto, setPericiaTexto] = useState('');
  useDialogAccessibility({ open: true, dialogRef, initialFocusRef: closeButtonRef, onClose: onCancel });

  const addConditionNamed = (name: string) => {
    const nome = name.trim();
    if (!nome || conditions.some((condition) => condition.nome.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR'))) return;
    const parsedTurns = conditionTurns ? Math.max(1, Math.trunc(Number(conditionTurns))) : null;
    setConditions((current) => [...current, {
      nome,
      turnos: Number.isFinite(parsedTurns) ? parsedTurns : null,
    }]);
    setConditionName('');
    setConditionTurns('');
  };

  const addCondition = () => addConditionNamed(conditionName);

  const addAttack = () => {
    const name = attackName.trim();
    if (!name || attacks.some((attack) => attack.nome.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return;
    setAttacks((current) => [...current, { nome: name, detalhe: attackDetail.trim() }]);
    setAttackName('');
    setAttackDetail('');
  };

  const addPericia = () => {
    const texto = periciaTexto.trim();
    if (!texto || pericias.some((item) => item.toLocaleLowerCase('pt-BR') === texto.toLocaleLowerCase('pt-BR'))) return;
    setPericias((current) => [...current, texto]);
    setPericiaTexto('');
  };

  const parseOptionalInt = (value: string, min: number, max: number) =>
    value.trim() === '' ? undefined : Math.max(min, Math.min(max, Number(value) || 0));

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      ref={dialogRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-viewport fixed inset-0 z-[110] flex items-center justify-center bg-black/75"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="entity-editor-title"
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        onClick={(event) => event.stopPropagation()}
        className="modal-surface custom-scrollbar w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0c12] p-4 shadow-2xl sm:p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id="entity-editor-title" className="text-base font-semibold text-white">Editar {entity.nome}</h3>
          <button ref={closeButtonRef} type="button" onClick={onCancel} className="flex min-h-11 min-w-11 items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        {entity.personagemId ? (
          <button
            type="button"
            onClick={() => navigate(`/ficha/${entity.personagemId}`)}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#e3c363] hover:underline"
          >
            <ExternalLink size={12} /> Abrir a ficha completa de {entity.nome}
          </button>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            Iniciativa
            <input
              type="number"
              min={-99}
              max={999}
              value={initiative}
              onChange={(event) => setInitiative(Math.max(-99, Math.min(999, Number(event.target.value) || 0)))}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            PV atual
            <input
              type="number"
              min={-999}
              max={99999}
              value={hpCurrent}
              onChange={(event) => setHpCurrent(Math.max(-999, Math.min(99999, Number(event.target.value) || 0)))}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            PV máximo
            <input
              type="number"
              min={0}
              max={99999}
              value={hpMax}
              onChange={(event) => setHpMax(Math.max(0, Math.min(99999, Number(event.target.value) || 0)))}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            Mana atual · opcional
            <input
              type="number"
              min={0}
              max={99999}
              value={manaCurrent}
              placeholder="-"
              onChange={(event) => setManaCurrent(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            Mana máxima · opcional
            <input
              type="number"
              min={0}
              max={99999}
              value={manaMax}
              placeholder="-"
              onChange={(event) => setManaMax(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            Defesa · opcional
            <input
              type="number"
              min={0}
              max={999}
              value={defense}
              placeholder="-"
              onChange={(event) => setDefense(event.target.value)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
          <label className="text-[10px] uppercase tracking-wider text-white/40">
            VD · opcional
            <input
              type="number"
              min={1}
              max={10}
              value={vd}
              placeholder="-"
              onChange={(event) => setVd(event.target.value)}
              title="Valor de Desafio (1-10) - de onde vem o XP ao distribuir"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </label>
        </div>

        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Condições</span>
          {conditions.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {conditions.map((condition, index) => (
                <button
                  key={`${condition.nome}-${index}`}
                  type="button"
                  onClick={() => setConditions((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  className="rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-2 py-1 text-[10px] text-amber-100/75 hover:border-red-300/30 hover:text-red-200"
                  title="Remover condição"
                >
                  {condition.nome}{condition.turnos ? ` · ${condition.turnos}` : ''} ×
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1">
            {CONDICOES_RAPIDAS.map((regra) => (
              <button
                key={regra.id}
                type="button"
                onClick={() => addConditionNamed(regra.titulo)}
                title={regra.efeitos.join(' ')}
                className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] text-white/50 hover:border-[#c7a44c]/40 hover:text-[#c7a44c]"
              >
                {regra.titulo}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1.5">
            <input
              value={conditionName}
              maxLength={80}
              onChange={(event) => setConditionName(event.target.value)}
              placeholder="Nova condição (ou personalizada)"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#c7a44c]/50"
            />
            <input
              type="number"
              min={1}
              value={conditionTurns}
              onChange={(event) => setConditionTurns(event.target.value)}
              placeholder="Turnos"
              className="w-16 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#c7a44c]/50"
              aria-label="Duração da condição em turnos"
            />
            <button type="button" onClick={addCondition} className="rounded-md border border-white/10 px-2 text-white/60 hover:text-white" aria-label="Adicionar condição">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
            <GraduationCap size={12} /> Perícias principais
          </span>
          {pericias.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pericias.map((item, index) => (
                <button
                  key={`${item}-${index}`}
                  type="button"
                  onClick={() => setPericias((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                  className="rounded-full border border-sky-300/15 bg-sky-300/[0.06] px-2 py-1 text-[10px] text-sky-100/75 hover:border-red-300/30 hover:text-red-200"
                  title="Remover perícia"
                >
                  {item} ×
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex gap-1.5">
            <input
              value={periciaTexto}
              maxLength={40}
              onChange={(event) => setPericiaTexto(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addPericia();
                }
              }}
              placeholder="Ex.: Luta +12"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#c7a44c]/50"
            />
            <button type="button" onClick={addPericia} className="rounded-md border border-white/10 px-2 text-white/60 hover:text-white" aria-label="Adicionar perícia">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40">
            <Swords size={12} /> Ataques · referência para narrar (a rolagem é no Discord)
          </span>
          {attacks.length ? (
            <div className="mt-1.5 space-y-1.5">
              {attacks.map((attack, index) => (
                <div key={`${attack.nome}-${index}`} className="flex items-center gap-2 rounded-md border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5 text-xs">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-white/85">{attack.nome}</span>
                    {attack.detalhe ? <span className="text-white/45"> · {attack.detalhe}</span> : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttacks((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                    className="shrink-0 text-white/30 hover:text-red-300"
                    aria-label={`Remover ${attack.nome}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex gap-1.5">
            <input
              value={attackName}
              maxLength={60}
              onChange={(event) => setAttackName(event.target.value)}
              placeholder="Nome (ex.: Garra)"
              className="w-32 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#c7a44c]/50"
            />
            <input
              value={attackDetail}
              maxLength={160}
              onChange={(event) => setAttackDetail(event.target.value)}
              placeholder="Detalhe (ex.: +7, 2d8+4 cortante)"
              className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#c7a44c]/50"
            />
            <button type="button" onClick={addAttack} className="rounded-md border border-white/10 px-2 text-white/60 hover:text-white" aria-label="Adicionar ataque">
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Visibilidade para os jogadores</span>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
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

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white">Cancelar</button>
          <button
            type="button"
            onClick={() => void onSave({
              iniciativa: initiative,
              vida_atual: Math.min(hpCurrent, hpMax || hpCurrent),
              vida_maxima: hpMax,
              mana_atual: parseOptionalInt(manaCurrent, 0, 99999),
              mana_maxima: parseOptionalInt(manaMax, 0, 99999),
              condicoes: conditions,
              ataques: attacks,
              pericias,
              visibilidade,
              defesa: parseOptionalInt(defense, 0, 999),
              vd: parseOptionalInt(vd, 1, 10),
            })}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md bg-[#c7a44c] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
          >
            {busy ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />} Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
