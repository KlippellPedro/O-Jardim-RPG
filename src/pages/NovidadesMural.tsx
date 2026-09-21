import { useMemo, useState } from 'react';
import { Bug, ChevronDown, Gauge, Sparkles } from 'lucide-react';
import dados from '../data/novidades.json';
import { agruparPorDia, rotuloDoDia } from './novidades';

interface INovidade {
  id: string;
  data: string;
  tipo: 'novo' | 'melhoria' | 'correcao';
  area: string;
  titulo: string;
  detalhes?: string[];
}

const TIPOS = {
  novo: { rotulo: 'Novo', cor: '#4ade80', icone: Sparkles },
  melhoria: { rotulo: 'Melhoria', cor: '#38bdf8', icone: Gauge },
  correcao: { rotulo: 'Correção', cor: '#fbbf24', icone: Bug },
} as const;

const PAGINA = 8;

/** O que mudou no sistema, direto do histórico de commits (ver tools/gerar-novidades.mjs). */
export const NovidadesMural = () => {
  const todas = (dados as { itens: INovidade[] }).itens;
  const [area, setArea] = useState('');
  const [limite, setLimite] = useState(PAGINA);
  const [abertas, setAbertas] = useState<Set<string>>(new Set());

  const areas = useMemo(() => Array.from(new Set(todas.map((item) => item.area))).sort((a, b) => a.localeCompare(b, 'pt-BR')), [todas]);
  const filtradas = useMemo(() => todas.filter((item) => !area || item.area === area), [todas, area]);
  const grupos = useMemo(() => agruparPorDia(filtradas.slice(0, limite)), [filtradas, limite]);

  const alternar = (id: string) => setAbertas((atual) => {
    const proximo = new Set(atual);
    if (proximo.has(id)) proximo.delete(id); else proximo.add(id);
    return proximo;
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f0e15]/90 p-5" aria-label="Novidades do Jardim">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#c7a44c]"><Sparkles size={14} aria-hidden="true" /> Novidades do Jardim</h2>
        <select value={area} onChange={(evento) => { setArea(evento.target.value); setLimite(PAGINA); }} aria-label="Filtrar novidades por área" className="min-h-9 rounded-lg border border-white/10 bg-[#0b0a10] px-3 text-xs text-gray-200 outline-none">
          <option value="">Todas as áreas</option>
          {areas.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
        </select>
      </header>

      {filtradas.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Nada por aqui ainda.</p>
      ) : (
        <div className="space-y-5">
          {grupos.map((grupo) => (
            <div key={grupo.data}>
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">{rotuloDoDia(grupo.data)}</h3>
              <ul className="space-y-2">
                {grupo.itens.map((item) => {
                  const tipo = TIPOS[item.tipo] ?? TIPOS.novo;
                  const Icone = tipo.icone;
                  const temDetalhes = Boolean(item.detalhes?.length);
                  const aberta = abertas.has(item.id);
                  return (
                    <li key={item.id} className="rounded-xl border border-white/5 bg-black/20">
                      <button
                        type="button"
                        onClick={() => temDetalhes && alternar(item.id)}
                        aria-expanded={temDetalhes ? aberta : undefined}
                        className={`flex w-full items-start gap-3 px-3 py-2.5 text-left ${temDetalhes ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        <Icone size={15} className="mt-0.5 shrink-0" style={{ color: tipo.cor }} aria-label={tipo.rotulo} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm leading-5 text-gray-100">{item.titulo}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e3c46f]">{item.area}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tipo.cor }}>{tipo.rotulo}</span>
                          </span>
                        </span>
                        {temDetalhes ? <ChevronDown size={15} className={`mt-1 shrink-0 text-gray-600 transition-transform ${aberta ? 'rotate-180' : ''}`} /> : null}
                      </button>
                      {aberta && item.detalhes ? (
                        <ul className="space-y-1 border-t border-white/5 px-4 py-2.5">
                          {item.detalhes.map((detalhe) => <li key={detalhe} className="flex gap-2 text-xs leading-5 text-gray-400"><span aria-hidden="true">•</span>{detalhe}</li>)}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {filtradas.length > limite ? (
            <button type="button" onClick={() => setLimite((valor) => valor + PAGINA)} className="min-h-10 w-full rounded-xl border border-white/10 text-xs font-bold text-gray-300 hover:text-white">Ver mais ({filtradas.length - limite})</button>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default NovidadesMural;
