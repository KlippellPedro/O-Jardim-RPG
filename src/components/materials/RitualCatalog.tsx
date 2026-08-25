import { BookMarked, ChevronDown, CircleDot } from 'lucide-react';
import {
  COMPONENTE_RITUALISTICO_POR_COMPLEXIDADE,
  ROTULO_RARIDADE_RECURSO,
  requisitoComponentesRitual,
} from '../../../data/regras/recursos-materiais';
import {
  FLUXOS_POR_ID,
  RITUAIS_CATALOGO,
  temaDoFluxo,
} from '../../services/magiaService';
import type { IClasse } from '../../types/catalogo';
import { RitualComponents } from './RitualComponents';

interface ProgressaoManifestacao {
  marcos?: Array<{ nivel: number; vagas: number }>;
}

const vagasNoNivel = (progressao: ProgressaoManifestacao | undefined, nivel: number) => (
  (progressao?.marcos || []).reduce((vagas, marco) => marco.nivel <= nivel ? marco.vagas : vagas, 0)
);

export function RitualCatalog({ classe }: { classe: IClasse }) {
  const niveisVagas = [...new Set([
    ...(classe.progressao_rituais?.marcos || []).map((marco: { nivel: number }) => marco.nivel),
    ...(classe.progressao_selos?.marcos || []).map((marco: { nivel: number }) => marco.nivel),
    ...(classe.progressao_encantamentos?.marcos || []).map((marco: { nivel: number }) => marco.nivel),
  ])].sort((a, b) => a - b);

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-black/30 p-5 sm:p-7">
      <div className="flex items-start gap-3">
        <BookMarked className="mt-1 h-6 w-6 shrink-0 text-violet-300" />
        <div>
          <h2 className="font-serif text-3xl font-bold text-white">Catálogo de Rituais</h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-400">Rituais não usam círculos e não melhoram por uma escada de nível. Você aprende os ritos permitidos pelo seu Fluxo nativo e pelas vagas do Livro de Rituais; a complexidade de cada um já define a dificuldade e os componentes.</p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/20">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-gray-500"><tr><th className="px-4 py-3">Nível de Ritualista</th><th className="px-4 py-3">Rituais conhecidos</th><th className="px-4 py-3">Selos</th><th className="px-4 py-3">Encantamentos</th></tr></thead>
          <tbody>
            {niveisVagas.map((nivel) => (
              <tr key={nivel} className="border-b border-white/5 last:border-0"><td className="px-4 py-3 font-bold text-violet-200">{nivel}</td><td className="px-4 py-3 text-gray-300">{vagasNoNivel(classe.progressao_rituais, nivel)} vagas</td><td className="px-4 py-3 text-gray-300">{vagasNoNivel(classe.progressao_selos, nivel)} vagas</td><td className="px-4 py-3 text-gray-300">{vagasNoNivel(classe.progressao_encantamentos, nivel)} vagas</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-gray-500">Selos e Encantamentos têm graus próprios e permanecem no catálogo da aba Magias. Eles não usam a tabela de Componentes Ritualísticos abaixo.</p>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" aria-label="Componentes por complexidade de ritual">
        {COMPONENTE_RITUALISTICO_POR_COMPLEXIDADE.map((faixa) => (
          <div key={faixa.complexidade} className="rounded-xl border border-violet-300/15 bg-violet-400/[0.055] px-3 py-3 text-center">
            <strong className="block text-xs text-violet-100">{faixa.titulo}</strong>
            <span className="mt-1 block text-[11px] font-bold text-violet-200/75">{faixa.quantidade} {faixa.quantidade === 1 ? 'lote' : 'lotes'} · {ROTULO_RARIDADE_RECURSO[faixa.raridade]}</span>
          </div>
        ))}
      </div>

      <details className="group mt-5 rounded-xl border border-violet-300/15 bg-violet-400/[0.035] p-2">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-4 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/50 [&::-webkit-details-marker]:hidden">
          <span><span className="group-open:hidden">Mostrar {RITUAIS_CATALOGO.length} rituais</span><span className="hidden group-open:inline">Esconder rituais</span><span className="ml-2 text-xs font-normal text-violet-200/45">clique para consultar</span></span>
          <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t border-violet-300/10 px-2 pb-2 pt-5 lg:grid-cols-2">
          {RITUAIS_CATALOGO.map((ritual) => {
            const tema = temaDoFluxo(ritual.fluxo);
            const fluxo = FLUXOS_POR_ID.get(ritual.fluxo)?.titulo || 'Universal';
            const componente = requisitoComponentesRitual(ritual.complexidade);
            return (
              <article key={ritual.id} className="rounded-xl border bg-black/30 p-4" style={{ borderColor: tema.borda }}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <strong className="text-base text-white">{ritual.titulo}</strong>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: tema.texto }}>{fluxo} · {ritual.complexidade}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-300">DT {ritual.dt}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500"><span>{ritual.custo_mana} Mana</span><span>·</span><span>{ritual.tempo}</span><span>·</span><span>{componente.quantidade} {componente.quantidade === 1 ? 'lote' : 'lotes'} {ROTULO_RARIDADE_RECURSO[componente.raridade]}</span></div>
                <p className="mt-3 text-sm italic leading-relaxed text-gray-500">{ritual.descricao}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-300">{ritual.efeito}</p>
                <p className="mt-3 text-xs leading-relaxed text-gray-500"><strong className="text-gray-300">Requisito:</strong> {ritual.requisito}</p>
                <p className="mt-1 text-xs leading-relaxed text-red-300/75"><strong>Em falha:</strong> {ritual.falha}</p>
                <RitualComponents complexidade={ritual.complexidade} compact />
              </article>
            );
          })}
        </div>
      </details>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-violet-100/45"><CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0" />O catálogo desta página é para consulta. Aprender, conceder e realizar um rito continua acontecendo na aba Magias da ficha.</p>
    </section>
  );
}
