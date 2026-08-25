import { useMemo, useState } from 'react';
import { ScrollText, Search, X } from 'lucide-react';
import { LEGADOS_CATALOGO } from '../../../services/catalogoService';
import type { LegadoCatalogo } from '../../../hooks/useResolvedRules';

interface RequisitoLegado {
  atributo?: string;
  valor_minimo?: number;
  nivel_personagem?: number;
  pericia?: string;
  nivel?: string;
  ou?: RequisitoLegado[];
}

const capitalizar = (valor: string) => valor.charAt(0).toLocaleUpperCase('pt-BR') + valor.slice(1);

const formatarRequisito = (requisito: RequisitoLegado): string => {
  if (Array.isArray(requisito.ou)) return requisito.ou.map(formatarRequisito).join(' ou ');
  if (requisito.nivel_personagem) return `Nível ${requisito.nivel_personagem}+`;
  if (requisito.atributo) return `${capitalizar(requisito.atributo)} ${requisito.valor_minimo}+`;
  if (requisito.pericia) return `${capitalizar(requisito.pericia)} (${requisito.nivel})`;
  return '';
};

const formatarPreRequisitos = (preRequisitos: unknown[] | undefined) => {
  const lista = (preRequisitos || []) as RequisitoLegado[];
  const formatados = lista.map(formatarRequisito).filter(Boolean);
  return formatados.length ? formatados.join(' · ') : 'Nenhum';
};

interface CatalogoLegadosProps {
  catalogo?: LegadoCatalogo[];
}

export const CatalogoLegados = ({ catalogo = LEGADOS_CATALOGO as LegadoCatalogo[] }: CatalogoLegadosProps) => {
  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLocaleLowerCase('pt-BR');

  const legados = useMemo(() => catalogo
    .map((legado: any) => ({
      id: legado.id as string,
      titulo: legado.titulo as string,
      descricao: legado.descricao as string,
      preRequisitos: formatarPreRequisitos(legado.pre_requisitos),
    }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')), [catalogo]);

  const legadosVisiveis = useMemo(() => {
    if (!termo) return legados;
    return legados.filter((legado) => (
      `${legado.titulo} ${legado.descricao} ${legado.preRequisitos}`.toLocaleLowerCase('pt-BR').includes(termo)
    ));
  }, [legados, termo]);

  return (
    <section className="mt-16 border-t border-[#c7a44c]/20 pt-10" aria-labelledby="catalogo-legados-titulo">
      <header className="mb-7">
        <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c7a44c]">
          <ScrollText size={15} /> Compêndio
        </span>
        <h2 id="catalogo-legados-titulo" className="text-3xl font-bold text-[#f2ead7] sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Catálogo de Legados</h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-7 text-gray-500">
          Todos os Legados disponíveis pra consulta, sem precisar abrir uma ficha pra ver o que cada um faz.
        </p>
      </header>

      <label className="relative mb-5 block max-w-md">
        <span className="sr-only">Buscar Legado</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar Legado por nome, efeito ou pré-requisito..."
          className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-9 pr-9 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#c7a44c]/50"
        />
        {busca ? (
          <button
            type="button"
            onClick={() => setBusca('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-500 hover:text-white"
          >
            <X size={14} />
          </button>
        ) : null}
      </label>

      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-700">{legadosVisiveis.length} de {legados.length} Legado(s)</p>

      {legadosVisiveis.length ? (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/30">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="bg-black/50 text-xs uppercase tracking-widest text-gray-400">
              <tr>
                <th className="px-5 py-4">Legado</th>
                <th className="px-5 py-4">Pré-requisitos</th>
                <th className="px-5 py-4">Efeito</th>
              </tr>
            </thead>
            <tbody>
              {legadosVisiveis.map((legado) => (
                <tr key={legado.id} className="border-t border-white/5 text-sm text-gray-300">
                  <td className="px-5 py-4 font-bold text-[#e1c77e]">{legado.titulo}</td>
                  <td className="px-5 py-4 text-xs text-gray-400">{legado.preRequisitos}</td>
                  <td className="px-5 py-4 leading-relaxed">{legado.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <ScrollText className="mx-auto mb-3 text-gray-700" size={32} />
          <p className="text-sm text-gray-500">Nenhum Legado encontrado para "{busca.trim()}".</p>
        </div>
      )}
    </section>
  );
};
