import { Link } from 'react-router-dom';
import { ChevronRight, FlaskConical } from 'lucide-react';
import { RECEITAS_CATALOGO } from '../../services/materialsCatalogService';
import {
  COMPONENTE_QUIMICO_POR_NIVEL_FORMULA,
  ROTULO_RARIDADE_RECURSO,
  raridadeComponentePorNivelFormula,
} from '../../../data/regras/recursos-materiais';

interface FormulaIngredientsProps {
  formulaId: string;
  compact?: boolean;
  nivelFormula?: number;
}

export function FormulaIngredients({ formulaId, compact = false, nivelFormula }: FormulaIngredientsProps) {
  const formula = RECEITAS_CATALOGO.find((receita) => receita.classe === 'alquimista' && receita.id === formulaId);
  if (!formula) return null;
  const raridadeAtual = nivelFormula ? raridadeComponentePorNivelFormula(nivelFormula) : null;

  return (
    <section className={`mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.055] ${compact ? 'p-3' : 'p-4'}`} aria-label={`Custo de preparo de ${formula.titulo}`}>
      <div className="flex items-center justify-between gap-3">
        <h5 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-emerald-200/85">
          <FlaskConical className="h-4 w-4" /> Componentes Químicos
        </h5>
        <Link
          to="/materiais?recurso=componentes-quimicos"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-300/70 hover:text-emerald-100"
        >
          Ver exemplos <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-emerald-100/55">
        Depois de um descanso, gaste <strong className="text-emerald-100">1 lote da raridade do nível atual das suas fórmulas</strong>. Esse gasto prepara todas as doses de Grande Obra. Você não gasta um lote para cada fórmula ou frasco.
      </p>
      {raridadeAtual && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-300/15 bg-black/20 px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/50">Exigência atual</span><strong className="text-xs text-emerald-100">Nível {nivelFormula} · {ROTULO_RARIDADE_RECURSO[raridadeAtual]}</strong></div>}
      <div className={`mt-3 grid gap-1.5 ${compact ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 lg:grid-cols-5'}`} aria-label="Progressão da raridade dos Componentes Químicos">
        {COMPONENTE_QUIMICO_POR_NIVEL_FORMULA.map((faixa) => {
          const ativa = nivelFormula === faixa.nivelFormula;
          return <div key={faixa.nivelFormula} className={`rounded-lg border px-2 py-2 text-center ${ativa ? 'border-emerald-300/45 bg-emerald-300/15' : 'border-white/[0.07] bg-black/15'}`}><strong className={`block text-[10px] ${ativa ? 'text-emerald-100' : 'text-white/65'}`}>Fórmula N{faixa.nivelFormula}</strong><span className="mt-0.5 block text-[10px] font-bold text-emerald-200/75">{ROTULO_RARIDADE_RECURSO[faixa.raridade]}</span><span className="mt-0.5 block text-[9px] text-white/30">Alquimista {faixa.niveisAlquimista}</span></div>;
        })}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-emerald-100/45">
        Um componente superior pode substituir um inferior. Componentes inferiores não podem ser somados para criar uma raridade maior.
      </p>
    </section>
  );
}
