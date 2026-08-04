import React, { useState } from 'react';
import { Plus, RefreshCw, Save } from 'lucide-react';
import type {
  EntidadeIniciativa,
  SessionCondition,
} from '../../../store/useSessaoStore';
import type { ParticipantePayload } from '../../../services/sessaoApi';

interface EntityEditorProps {
  entity: EntidadeIniciativa;
  busy: boolean;
  onCancel: () => void;
  onSave: (payload: ParticipantePayload) => Promise<void>;
}

export const EntityEditor: React.FC<EntityEditorProps> = ({ entity, busy, onCancel, onSave }) => {
  const [initiative, setInitiative] = useState(entity.iniciativa);
  const [hpCurrent, setHpCurrent] = useState(entity.hpAtual ?? 0);
  const [hpMax, setHpMax] = useState(entity.hpTotal ?? 0);
  const [visible, setVisible] = useState(entity.visivel ?? true);
  const [hpVisible, setHpVisible] = useState(entity.vidaVisivel ?? true);
  const [conditions, setConditions] = useState<SessionCondition[]>(entity.condicoes);
  const [conditionName, setConditionName] = useState('');
  const [conditionTurns, setConditionTurns] = useState('');

  const addCondition = () => {
    const name = conditionName.trim();
    if (!name || conditions.some((condition) => condition.nome.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) return;
    const parsedTurns = conditionTurns ? Math.max(1, Math.trunc(Number(conditionTurns))) : null;
    setConditions((current) => [...current, {
      nome: name,
      turnos: Number.isFinite(parsedTurns) ? parsedTurns : null,
    }]);
    setConditionName('');
    setConditionTurns('');
  };

  return (
    <div className="border-t border-white/[0.08] bg-black/20 p-3">
      <div className="grid grid-cols-3 gap-2">
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
      </div>

      <div className="mt-3">
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
        <div className="mt-2 flex gap-1.5">
          <input
            value={conditionName}
            maxLength={80}
            onChange={(event) => setConditionName(event.target.value)}
            placeholder="Nova condição"
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

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/55">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
          Visível
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={hpVisible} onChange={(event) => setHpVisible(event.target.checked)} />
          PV visível
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-xs text-white/50 hover:bg-white/5 hover:text-white">Cancelar</button>
        <button
          type="button"
          onClick={() => void onSave({
            iniciativa: initiative,
            vida_atual: Math.min(hpCurrent, hpMax || hpCurrent),
            vida_maxima: hpMax,
            condicoes: conditions,
            visivel: visible,
            vida_visivel: hpVisible,
          })}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md bg-[#c7a44c] px-3 py-1.5 text-xs font-bold text-black disabled:opacity-50"
        >
          {busy ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />} Salvar
        </button>
      </div>
    </div>
  );
};
