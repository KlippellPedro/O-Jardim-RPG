import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  CONDICOES_OFICIAIS,
  CRISES_SANIDADE,
  type ICondicaoRegra,
} from '../../../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO, GRUPOS_LONGO_PRAZO } from '../../../../data/regras/condicoes-longo-prazo';
import { TODAS_AS_CONDICOES_DA_FICHA } from '../utils/catalogoCondicoes';

interface SeletorCondicaoOficialProps {
  onEscolher: (regra: ICondicaoRegra) => void;
}

const semAcento = (texto: string) => texto
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

const SECOES: ReadonlyArray<{ titulo: string; itens: ICondicaoRegra[] }> = [
  { titulo: 'Em cena', itens: CONDICOES_OFICIAIS },
  ...GRUPOS_LONGO_PRAZO.map((grupo) => ({
    titulo: grupo,
    itens: CONDICOES_LONGO_PRAZO.filter((item) => item.grupo === grupo),
  })),
  { titulo: 'Crises de Sanidade', itens: CRISES_SANIDADE },
];

/** Lista as condições do catálogo oficial, agrupadas, com busca por nome. */
export const SeletorCondicaoOficial = ({ onEscolher }: SeletorCondicaoOficialProps) => {
  const [busca, setBusca] = useState('');
  const termo = semAcento(busca);
  const secoes = useMemo(() => SECOES
    .map((secao) => ({
      ...secao,
      itens: termo ? secao.itens.filter((item) => semAcento(item.titulo).includes(termo)) : secao.itens,
    }))
    .filter((secao) => secao.itens.length > 0), [termo]);

  return (
    <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Aplicar condição oficial</p>
        <span className="text-[10px] text-gray-600">{TODAS_AS_CONDICOES_DA_FICHA.length} no catálogo</span>
      </div>
      <label className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 focus-within:border-red-500/40">
        <Search size={14} className="shrink-0 text-gray-500" aria-hidden="true" />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar: braço, ansiedade, perna..."
          aria-label="Buscar condição oficial"
          className="w-full bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none"
        />
      </label>
      <div className="custom-scrollbar max-h-60 space-y-3 overflow-y-auto pr-1">
        {secoes.map((secao) => (
          <div key={secao.titulo}>
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em] text-gray-500">{secao.titulo}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {secao.itens.map((regra) => (
                <button
                  key={regra.id}
                  type="button"
                  onClick={() => onEscolher(regra)}
                  className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-left text-xs font-bold text-gray-300 hover:border-red-500/30 hover:text-red-300"
                >
                  {regra.titulo}
                  {regra.permanente && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-amber-300/70">permanente</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
        {secoes.length === 0 && <p className="py-3 text-center text-xs text-gray-500">Nenhuma condição com esse nome. Use o formulário abaixo para criar uma.</p>}
      </div>
    </div>
  );
};
