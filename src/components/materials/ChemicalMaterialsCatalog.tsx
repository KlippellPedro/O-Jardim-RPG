import { ChevronRight, FlaskConical, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  RARIDADES_RECURSO_MATERIAL,
  ROTULO_RARIDADE_RECURSO,
  normalizarRaridadeRecurso,
} from '../../../data/regras/recursos-materiais';
import { MATERIAIS_CATALOGO } from '../../services/materialsCatalogService';

const COMPONENTES_QUIMICOS = MATERIAIS_CATALOGO
  .filter((material) => material.usos.includes('alquimia'))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

const formatarPreco = (preco?: Record<string, number>) => {
  if (!preco) return 'Sem preço';
  return Object.entries(preco).map(([moeda, valor]) => `${valor} ${moeda}`).join(' · ');
};

export function ChemicalMaterialsCatalog() {
  return (
    <section className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.08] via-black/25 to-black/35 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/80"><FlaskConical className="h-4 w-4" /> Consulta rápida</div>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white">Materiais que viram Componentes Químicos</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">Aqui entram ervas, ácidos, extratos, venenos e partes de criaturas que servem para fórmulas. Cada material vira um Componente Químico da mesma raridade.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/materiais?recurso=componentes-quimicos" className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-xs font-bold text-emerald-100 hover:bg-emerald-300/20">Catálogo completo <ChevronRight className="h-4 w-4" /></Link>
          <Link to="/loja?categoria=Componentes" className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/20"><ShoppingBag className="h-4 w-4" /> Comprar</Link>
        </div>
      </div>

      <div className="mt-7 space-y-6">
        {RARIDADES_RECURSO_MATERIAL.map((raridade) => {
          const materiais = COMPONENTES_QUIMICOS.filter((material) => normalizarRaridadeRecurso(material.raridade) === raridade);
          if (!materiais.length) return null;
          return (
            <div key={raridade}>
              <div className="mb-3 flex items-center gap-3"><h3 className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">{ROTULO_RARIDADE_RECURSO[raridade]}</h3><span className="h-px flex-1 bg-white/[0.07]" /><span className="text-[10px] text-gray-600">{materiais.length} {materiais.length === 1 ? 'material' : 'materiais'}</span></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {materiais.map((material) => (
                  <article key={material.id} className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3">
                    <div className="flex items-start justify-between gap-3"><strong className="text-sm text-gray-100">{material.titulo}</strong><span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-emerald-300/55">{material.categoria}</span></div>
                    <p className="mt-1 text-[11px] text-gray-500">{formatarPreco(material.preco)}</p>
                  </article>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
