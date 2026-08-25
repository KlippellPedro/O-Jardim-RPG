import { ChevronRight, Cog, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  RARIDADES_RECURSO_MATERIAL,
  ROTULO_RARIDADE_RECURSO,
  normalizarRaridadeRecurso,
} from '../../../data/regras/recursos-materiais';
import { MATERIAIS_CATALOGO } from '../../services/materialsCatalogService';

const SUCATAS = MATERIAIS_CATALOGO
  .filter((material) => material.usos.includes('engenharia'))
  .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

const formatPrice = (price?: Record<string, number>) => {
  if (!price) return 'Sem preço';
  return Object.entries(price).map(([currency, value]) => `${value} ${currency}`).join(' · ');
};

export function EngineeringMaterialsCatalog() {
  return (
    <section className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/[0.08] via-black/25 to-slate-950/25 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-sky-300/80"><Cog className="h-4 w-4" /> Consulta rápida</div>
          <h2 className="mt-3 font-serif text-3xl font-bold text-white">Peças que viram Sucata</h2>
          <p className="mt-3 text-sm leading-7 text-gray-400">Aqui entram fios, engrenagens, motores, placas e peças que fazem sentido numa oficina. Cada peça vira Sucata da mesma raridade.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/materiais?recurso=sucata" className="inline-flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-300/20">Catálogo completo <ChevronRight className="h-4 w-4" /></Link>
          <Link to="/loja?categoria=Componentes" className="inline-flex items-center gap-2 rounded-xl border border-slate-300/20 bg-slate-300/10 px-3 py-2 text-xs font-bold text-slate-100 hover:bg-slate-300/20"><ShoppingBag className="h-4 w-4" /> Comprar</Link>
        </div>
      </div>

      <div className="mt-7 space-y-6">
        {RARIDADES_RECURSO_MATERIAL.map((raridade) => {
          const materials = SUCATAS.filter((material) => normalizarRaridadeRecurso(material.raridade) === raridade);
          if (!materials.length) return null;
          return (
            <div key={raridade}>
              <div className="mb-3 flex items-center gap-3"><h3 className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">{ROTULO_RARIDADE_RECURSO[raridade]}</h3><span className="h-px flex-1 bg-white/[0.07]" /><span className="text-[10px] text-gray-600">{materials.length} {materials.length === 1 ? 'material' : 'materiais'}</span></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {materials.map((material) => (
                  <article key={material.id} className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-3">
                    <div className="flex items-start justify-between gap-3"><strong className="text-sm text-gray-100">{material.titulo}</strong><span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-sky-300/55">{material.categoria}</span></div>
                    <p className="mt-1 text-[11px] text-gray-500">{formatPrice(material.preco)}</p>
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
