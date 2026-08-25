import { Link } from 'react-router-dom';
import { ChevronRight, CookingPot } from 'lucide-react';
import { RECEITAS_CATALOGO } from '../../services/materialsCatalogService';
import {
  MANTIMENTO_POR_NIVEL_RECEITA,
  ROTULO_RARIDADE_RECURSO,
  raridadeMantimentoPorNivelReceita,
} from '../../../data/regras/recursos-materiais';

interface CookingIngredientsProps {
  recipeId: string;
  compact?: boolean;
  recipeLevel?: number;
}

export function CookingIngredients({ recipeId, compact = false, recipeLevel }: CookingIngredientsProps) {
  const recipe = RECEITAS_CATALOGO.find((item) => item.classe === 'cozinheiro' && item.id === recipeId);
  if (!recipe) return null;
  const currentRarity = recipeLevel ? raridadeMantimentoPorNivelReceita(recipeLevel) : null;

  return (
    <section className={`mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.055] ${compact ? 'p-3' : 'p-4'}`} aria-label={`Custo de preparo de ${recipe.titulo}`}>
      <div className="flex items-center justify-between gap-3">
        <h5 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200/85">
          <CookingPot className="h-4 w-4" /> Mantimentos
        </h5>
        <Link to="/materiais?recurso=mantimentos" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-amber-300/70 hover:text-amber-100">
          Ver exemplos <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-amber-100/55">
        Durante um descanso, gaste <strong className="text-amber-100">1 lote da raridade do nível atual das suas receitas</strong>. Esse gasto prepara todas as porções de Mise en Place. Você não gasta um lote para cada receita ou prato.
      </p>
      {currentRarity && <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-300/15 bg-black/20 px-3 py-2"><span className="text-[10px] font-bold uppercase tracking-wider text-amber-100/50">Exigência atual</span><strong className="text-xs text-amber-100">Nível {recipeLevel} · {ROTULO_RARIDADE_RECURSO[currentRarity]}</strong></div>}
      <div className={`mt-3 grid gap-1.5 ${compact ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 lg:grid-cols-5'}`} aria-label="Progressão da raridade dos Mantimentos">
        {MANTIMENTO_POR_NIVEL_RECEITA.map((range) => {
          const active = recipeLevel === range.nivelReceita;
          return <div key={range.nivelReceita} className={`rounded-lg border px-2 py-2 text-center ${active ? 'border-amber-300/45 bg-amber-300/15' : 'border-white/[0.07] bg-black/15'}`}><strong className={`block text-[10px] ${active ? 'text-amber-100' : 'text-white/65'}`}>Receita N{range.nivelReceita}</strong><span className="mt-0.5 block text-[10px] font-bold text-amber-200/75">{ROTULO_RARIDADE_RECURSO[range.raridade]}</span><span className="mt-0.5 block text-[9px] text-white/30">Chef {range.niveisCozinheiro}</span></div>;
        })}
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-amber-100/45">
        Um mantimento superior pode substituir um inferior. Mantimentos inferiores não podem ser somados para criar uma raridade maior.
      </p>
    </section>
  );
}
