import { ChevronDown, ChevronRight, CircleDot, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  RARIDADES_RECURSO_MATERIAL,
  ROTULO_RARIDADE_RECURSO,
  normalizarRaridadeRecurso,
} from '../../../data/regras/recursos-materiais';
import { MATERIAIS_CATALOGO } from '../../services/materialsCatalogService';

const COMPONENTES_RITUALISTICOS = MATERIAIS_CATALOGO
  .filter((material) => material.usos.includes('ritual'))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

const formatarPreco = (preco?: Record<string, number>) => {
  if (!preco) return 'Sem preço';
  return Object.entries(preco).map(([moeda, valor]) => `${valor} ${moeda}`).join(' · ');
};

export function RitualMaterialsCatalog() {
  return (
    <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] via-black/25 to-fuchsia-950/20 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-violet-300/80"><CircleDot className="h-4 w-4" /> Consulta rápida</div>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white">Materiais que viram Componentes Ritualísticos</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">Aqui entram oferendas, símbolos, essências e objetos com ligação mágica. Cada material vira um Componente Ritualístico da mesma raridade. Materiais Comuns ajudam na cena e no comércio, mas o primeiro rito já exige um lote Incomum.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/materiais?recurso=componentes-ritualisticos" className="inline-flex items-center gap-2 rounded-xl border border-violet-300/20 bg-violet-300/10 px-3 py-2 text-xs font-bold text-violet-100 hover:bg-violet-300/20">Catálogo completo <ChevronRight className="h-4 w-4" /></Link>
          <Link to="/loja?categoria=Componentes" className="inline-flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-amber-300/20"><ShoppingBag className="h-4 w-4" /> Comprar</Link>
        </div>
      </div>

      <details className="group mt-6 rounded-xl border border-violet-300/15 bg-black/20 p-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 [&::-webkit-details-marker]:hidden">
          <span><span className="group-open:hidden">Mostrar {COMPONENTES_RITUALISTICOS.length} materiais</span><span className="hidden group-open:inline">Esconder materiais</span><span className="ml-2 text-xs font-normal text-violet-200/45">separados por raridade</span></span>
          <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="space-y-6 border-t border-violet-300/10 px-3 pb-3 pt-5">
          {RARIDADES_RECURSO_MATERIAL.map((raridade) => {
            const materiais = COMPONENTES_RITUALISTICOS.filter((material) => normalizarRaridadeRecurso(material.raridade) === raridade);
            if (!materiais.length) return null;
            return (
              <div key={raridade}>
                <div className="mb-3 flex items-center gap-3"><h3 className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">{ROTULO_RARIDADE_RECURSO[raridade]}</h3><span className="h-px flex-1 bg-white/[0.07]" /><span className="text-[10px] text-gray-600">{materiais.length} {materiais.length === 1 ? 'material' : 'materiais'}</span></div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {materiais.map((material) => (
                    <article key={material.id} className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3">
                      <div className="flex items-start justify-between gap-3"><strong className="text-sm text-gray-100">{material.titulo}</strong><span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-violet-300/55">{material.categoria}</span></div>
                      <p className="mt-1 text-[11px] text-gray-500">{formatarPreco(material.preco)}</p>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </details>
    </section>
  );
}
