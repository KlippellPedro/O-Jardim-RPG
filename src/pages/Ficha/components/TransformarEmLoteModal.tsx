import { useState } from 'react';
import { ArrowRight, Package, X } from 'lucide-react';
import {
  RECURSO_MATERIAL_POR_ID,
  ROTULO_RARIDADE_RECURSO,
  type RaridadeRecursoMaterial,
  type RecursoMaterialId,
} from '../../../../data/regras/recursos-materiais';

interface ITransformarEmLoteModalProps {
  nome: string;
  quantidade: number;
  raridade: RaridadeRecursoMaterial;
  destinos: RecursoMaterialId[];
  /** Quantos lotes esse estoque já tem, por destino, para mostrar o "antes e depois". */
  estoqueAtual: (destino: RecursoMaterialId) => number;
  onConfirmar: (destino: RecursoMaterialId, quantidade: number) => void;
  onFechar: () => void;
}

/** Escolhe para qual estoque e quantas unidades do material viram lote. */
export const TransformarEmLoteModal = ({ nome, quantidade, raridade, destinos, estoqueAtual, onConfirmar, onFechar }: ITransformarEmLoteModalProps) => {
  const [destino, setDestino] = useState<RecursoMaterialId>(destinos[0]);
  const [converter, setConverter] = useState(1);
  const recurso = RECURSO_MATERIAL_POR_ID.get(destino);
  const antes = estoqueAtual(destino);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={`Transformar ${nome} em lote`} onClick={onFechar}>
      <div className="w-full max-w-md rounded-3xl border border-emerald-300/20 bg-[#0d1210] p-6 shadow-2xl" onClick={(evento) => evento.stopPropagation()}>
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300"><Package size={14} aria-hidden="true" /> Transformar em lote</p>
            <h2 className="mt-1 text-xl font-bold text-white">{nome}</h2>
            <p className="text-xs text-gray-400">{ROTULO_RARIDADE_RECURSO[raridade]} · você tem {quantidade}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </header>

        {destinos.length > 1 ? (
          <fieldset className="mb-4">
            <legend className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Vira qual estoque?</legend>
            <div className="grid gap-2">
              {destinos.map((opcao) => (
                <label key={opcao} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm ${destino === opcao ? 'border-emerald-300/50 bg-emerald-300/10 text-white' : 'border-white/10 text-gray-300'}`}>
                  <input type="radio" name="destino-do-lote" checked={destino === opcao} onChange={() => setDestino(opcao)} />
                  {RECURSO_MATERIAL_POR_ID.get(opcao)?.titulo}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className="mb-4 text-sm text-gray-300">Vira <strong className="text-white">{recurso?.titulo}</strong>.</p>
        )}

        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="qtd-lote" className="text-xs font-bold uppercase tracking-widest text-gray-500">Quantas unidades</label>
          <input id="qtd-lote" type="number" min={1} max={quantidade} value={converter} onChange={(evento) => setConverter(Math.max(1, Math.min(quantidade, Math.trunc(Number(evento.target.value) || 1))))} className="h-11 w-20 rounded-xl border border-white/10 bg-black/40 text-center text-sm font-bold text-white outline-none focus:border-emerald-300/50" />
          {quantidade > 1 ? <button type="button" onClick={() => setConverter(quantidade)} className="text-xs font-bold text-emerald-300/80 hover:text-emerald-200">todas</button> : null}
        </div>

        <p className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-gray-300" aria-live="polite">
          {recurso?.singular} {ROTULO_RARIDADE_RECURSO[raridade]}: <strong className="text-white">{antes}</strong> <ArrowRight size={14} aria-hidden="true" /> <strong className="text-emerald-200">{antes + converter}</strong>
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="min-h-11 rounded-xl px-4 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => onConfirmar(destino, converter)} className="min-h-11 rounded-xl border border-emerald-300/40 bg-emerald-300/15 px-5 text-sm font-bold text-emerald-100 hover:bg-emerald-300/25">Transformar</button>
        </div>
      </div>
    </div>
  );
};
