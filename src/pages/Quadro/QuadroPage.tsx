import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, Image as ImagemIcone, Search, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { engajamentoApi } from '../../services/engajamentoApi';
import { AbaAgenda } from './AbaAgenda';
import { AbaDescobertas } from './AbaDescobertas';
import { AbaMural } from './AbaMural';
import { AbaRank } from './AbaRank';

import { SimboloOculto } from '../../components/descobertas/SimboloOculto';
type AbaQuadro = 'descobertas' | 'mural' | 'rank' | 'agenda';

const ABAS: Array<{ id: AbaQuadro; rotulo: string; icone: LucideIcon; soGestor?: boolean }> = [
  { id: 'descobertas', rotulo: 'Descobertas', icone: Search },
  { id: 'mural', rotulo: 'Mural', icone: ImagemIcone },
  { id: 'rank', rotulo: 'Rank da mesa', icone: Trophy },
  { id: 'agenda', rotulo: 'Agenda', icone: CalendarClock, soGestor: true },
];

/** O quadro da campanha: o que se combinou, o que se viveu e quem fez o quê. */
export function QuadroPage() {
  const campanha = useAuthStore((estado) => estado.campanhaAtiva);
  const [parametros, setParametros] = useSearchParams();
  const [gestor, setGestor] = useState(false);

  useEffect(() => {
    if (!campanha?.id) return;
    let ativo = true;
    // Só para saber se mostra a aba Agenda; o servidor valida de novo em cada ação.
    engajamentoApi.calendario(campanha.id).then((resposta) => { if (ativo) setGestor(resposta.gestor); }).catch(() => undefined);
    return () => { ativo = false; };
  }, [campanha?.id]);

  const abasVisiveis = ABAS.filter((aba) => !aba.soGestor || gestor);
  const pedida = parametros.get('aba') as AbaQuadro | null;
  const aba: AbaQuadro = abasVisiveis.some((item) => item.id === pedida) ? (pedida as AbaQuadro) : 'descobertas';

  if (!campanha?.id) {
    return (
      <main className="app-page mx-auto max-w-3xl text-center text-gray-400">
        <p>Selecione uma campanha para abrir o quadro.</p>
      </main>
    );
  }

  return (
    <main className="app-page mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c7a44c]">{campanha.nome}</p>
        <h1 className="mt-1 text-[clamp(1.9rem,6vw,2.8rem)] font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Quadro da campanha</h1>
      </header>

      <nav className="flex gap-1.5 overflow-x-auto border-b border-white/10 pb-2" role="tablist" aria-label="Seções do quadro">
        {abasVisiveis.map(({ id, rotulo, icone: Icone }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            onClick={() => setParametros(id === 'descobertas' ? {} : { aba: id }, { replace: true })}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${aba === id ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#f3dc8f]' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            <Icone size={15} aria-hidden="true" /> {rotulo}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        {aba === 'descobertas' ? <AbaDescobertas campanhaId={campanha.id} /> : null}
        {aba === 'mural' ? <AbaMural campanhaId={campanha.id} gestor={gestor} /> : null}
        {aba === 'rank' ? <AbaRank campanhaId={campanha.id} /> : null}
        {aba === 'agenda' && gestor ? <AbaAgenda campanhaId={campanha.id} /> : null}
      </div>
      <div className="mt-12 flex justify-start"><SimboloOculto chave="pegada" glifo="⌖" cliques={4} /></div>
    </main>
  );
}

export default QuadroPage;
