import { useMemo, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import type { IPericiaCatalogo } from '../../../types/catalogo';

interface CatalogoPericiasProps {
  pericias: IPericiaCatalogo[];
}

const capitalizar = (valor: string) => valor.charAt(0).toLocaleUpperCase('pt-BR') + valor.slice(1);

export function CatalogoPericias({ pericias }: CatalogoPericiasProps) {
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return [...pericias]
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
      .filter((item) => !termo || `${item.titulo} ${item.atributo} ${item.descricao || ''}`.toLocaleLowerCase('pt-BR').includes(termo));
  }, [busca, pericias]);

  return (
    <section className="mt-16 border-t border-[#c7a44c]/20 pt-10" aria-labelledby="catalogo-pericias-titulo">
      <header className="mb-7">
        <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c7a44c]"><ShieldCheck size={15} /> Referência rápida</span>
        <h2 id="catalogo-pericias-titulo" className="text-3xl font-bold text-[#f2ead7] sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Catálogo de Perícias</h2>
      </header>
      <label className="relative mb-5 block max-w-md">
        <span className="sr-only">Buscar perícia</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
        <input type="search" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar perícia, atributo ou descrição..." className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#c7a44c]/50" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visiveis.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text-[#e1c77e]">{item.titulo}</h3>
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">{capitalizar(item.atributo)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-400">{item.descricao || 'Sem descrição.'}</p>
          </article>
        ))}
      </div>
      {!visiveis.length ? <p className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-600">Nenhuma perícia encontrada.</p> : null}
    </section>
  );
}
