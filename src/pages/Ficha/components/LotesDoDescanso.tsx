import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Hammer, Package, ScrollText } from 'lucide-react';
import {
  RECURSO_MATERIAL_POR_ID,
  ROTULO_RARIDADE_RECURSO,
  type ComplexidadeRitual,
  type RaridadeRecursoMaterial,
  type RecursoMaterialId,
} from '../../../../data/regras/recursos-materiais';
import {
  COMPLEXIDADES_RITUAL,
  PREPAROS_POR_CLASSE,
  custoDoRitual,
  estoqueDoRecurso,
  gastarLotes,
  preparosDaFicha,
  quantidadeAteRaridade,
  type EstoquesMateriais,
} from '../../../services/preparoDescansoService';

interface ILotesDoDescansoProps {
  ficha: Record<string, any>;
  classes: Array<{ classeId: string; nivel: number }>;
  onUpdate: (path: string[], value: unknown) => void;
}

const texto = (usados: Array<{ raridade: RaridadeRecursoMaterial; quantidade: number }>) =>
  usados.map((item) => `${item.quantidade} ${ROTULO_RARIDADE_RECURSO[item.raridade]}`).join(' + ');

/** Gasta os lotes que as regras pedem: 1 por descanso para Alquimia, Engenharia e Cozinha,
 * e os componentes de um ritual. Só mexe nos seis estoques do Inventário. */
export const LotesDoDescanso = ({ ficha, classes, onUpdate }: ILotesDoDescansoProps) => {
  const estoques = (ficha.recursosMateriais ?? {}) as EstoquesMateriais;
  const preparos = preparosDaFicha(classes, ficha);
  const contador = Math.max(0, Math.trunc(Number(ficha.contadorDescansos) || 0));
  const [complexidade, setComplexidade] = useState<ComplexidadeRitual>('simples');
  const [mensagem, setMensagem] = useState('');

  const gastar = (alvo: { recursoId: RecursoMaterialId; raridade: RaridadeRecursoMaterial; quantidade: number }, aoPagar?: () => void) => {
    const estoque = estoqueDoRecurso(estoques, alvo.recursoId);
    const gasto = gastarLotes(estoque, alvo.raridade, alvo.quantidade);
    const titulo = RECURSO_MATERIAL_POR_ID.get(alvo.recursoId)?.titulo ?? alvo.recursoId;
    if (!gasto) {
      setMensagem(`Faltam lotes: ${alvo.quantidade} de ${titulo} ${ROTULO_RARIDADE_RECURSO[alvo.raridade]} ou superior. Lotes menores não se somam.`);
      return;
    }
    onUpdate(['ficha', 'recursosMateriais'], { ...estoques, [alvo.recursoId]: gasto.estoque });
    aoPagar?.();
    setMensagem(`Gasto: ${texto(gasto.usados)} de ${titulo}.`);
  };

  const ritual = custoDoRitual(complexidade);
  const estoqueRitual = estoqueDoRecurso(estoques, 'componentes-ritualisticos');

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-300/10 bg-[#0f0e15]" aria-label="Lotes do descanso" data-tour="descanso-lotes">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Pagos a cada descanso</p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-white"><Package size={18} className="text-emerald-300" aria-hidden="true" /> Lotes do descanso</h3>
        </div>
        <Link to="/materiais" className="text-xs font-bold text-emerald-300/70 hover:text-emerald-200">Entender os lotes →</Link>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {preparos.length ? (
          <ul className="space-y-3">
            {preparos.map((preparo) => {
              const meta = PREPAROS_POR_CLASSE[preparo.classe];
              const recurso = RECURSO_MATERIAL_POR_ID.get(preparo.recurso);
              const tem = quantidadeAteRaridade(estoqueDoRecurso(estoques, preparo.recurso), preparo.raridade);
              return (
                <li key={preparo.classe} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-black/25 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white">{meta.rotulo}</p>
                    <p className="mt-0.5 text-xs text-gray-400">1 {recurso?.singular} {ROTULO_RARIDADE_RECURSO[preparo.raridade]} (nível {preparo.nivel} da classe) · você tem {tem} desta raridade ou superior</p>
                  </div>
                  {preparo.feito ? (
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-xs font-bold text-emerald-200"><Check size={14} /> Pago neste descanso</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => gastar({ recursoId: preparo.recurso, raridade: preparo.raridade, quantidade: 1 }, () => onUpdate(['ficha', 'preparoDescanso'], { ...(ficha.preparoDescanso ?? {}), [preparo.classe]: contador }))}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 text-xs font-bold text-emerald-100 hover:bg-emerald-300/20"
                    >
                      <Hammer size={14} /> Gastar o lote
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Sua classe não gasta lote a cada descanso. Alquimia, Engenharia (a partir do nível 3) e Cozinha gastam 1.</p>
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-black/25 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-white"><ScrollText size={15} className="text-violet-300" aria-hidden="true" /> Preparar um ritual</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {COMPLEXIDADES_RITUAL.map((opcao) => (
              <button key={opcao} type="button" aria-pressed={complexidade === opcao} onClick={() => setComplexidade(opcao)} className={`min-h-9 rounded-lg border px-3 text-xs font-bold capitalize ${complexidade === opcao ? 'border-violet-300/50 bg-violet-300/15 text-violet-100' : 'border-white/10 text-gray-400'}`}>{opcao}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">{ritual.quantidade} Componente{ritual.quantidade > 1 ? 's' : ''} Ritualístico{ritual.quantidade > 1 ? 's' : ''} {ROTULO_RARIDADE_RECURSO[ritual.raridade]}{ritual.quantidade > 1 ? 's' : ''} · você tem {quantidadeAteRaridade(estoqueRitual, ritual.raridade)}</p>
          <button type="button" onClick={() => gastar({ recursoId: 'componentes-ritualisticos', raridade: ritual.raridade, quantidade: ritual.quantidade })} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-300/30 bg-violet-300/10 px-4 text-xs font-bold text-violet-100 hover:bg-violet-300/20">Gastar os componentes</button>
        </div>

        {mensagem ? <p role="status" className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-200">{mensagem}</p> : null}
        <p className="text-[11px] leading-5 text-gray-600">Um lote superior pode pagar por um inferior; lotes inferiores nunca se somam. Os estoques são os do Inventário.</p>
      </div>
    </section>
  );
};
