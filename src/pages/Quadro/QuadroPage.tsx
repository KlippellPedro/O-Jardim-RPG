import { useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, CalendarX, Image as ImagemIcone, ScrollText, Search, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { engajamentoApi, type IProximaSessao } from '../../services/engajamentoApi';
import { corDaCampanha, urlDaCapa } from '../Campanha/campanha';
import { corLegivel } from '../Ficha/Wizard/corLegivel';
import { AbaAgenda } from './AbaAgenda';
import { AbaDescobertas } from './AbaDescobertas';
import { AbaMural } from './AbaMural';
import { AbaRank } from './AbaRank';
import { partesDaSessao } from './quadro';
import { SimboloOculto } from '../../components/descobertas/SimboloOculto';
import './quadro.css';

type AbaQuadro = 'descobertas' | 'mural' | 'rank' | 'agenda';

const ABAS: Array<{ id: AbaQuadro; rotulo: string; dica: string; icone: LucideIcon; cor: string; soGestor?: boolean }> = [
  { id: 'descobertas', rotulo: 'Descobertas', dica: 'Segredos do site', icone: Search, cor: '#a78bfa' },
  { id: 'mural', rotulo: 'Mural', dica: 'Frases e fotos', icone: ImagemIcone, cor: '#f2a65a' },
  { id: 'rank', rotulo: 'Rank da mesa', dica: 'Títulos e números', icone: Trophy, cor: '#e9c46a' },
  { id: 'agenda', rotulo: 'Agenda', dica: 'Só o Mestre vê', icone: CalendarClock, cor: '#5fc9b3', soGestor: true },
];

/** Cartão da próxima sessão no letreiro. O Mestre toca nele para abrir a Agenda. */
const ProximaSessao = ({ proxima, onAbrirAgenda }: { proxima: IProximaSessao | null | undefined; onAbrirAgenda?: () => void }) => {
  if (proxima === undefined) return null;
  const partes = proxima && !proxima.passou ? partesDaSessao(proxima.em) : null;
  const conteudo = partes ? (
    <>
      <span className="qd-proxima__icone"><CalendarClock size={20} aria-hidden="true" /></span>
      <span className="qd-proxima__texto">
        <small>Próxima sessão</small>
        <strong>{partes.dia}</strong>
        <span>às {partes.hora} · <em>{proxima?.texto}</em>{proxima?.titulo ? ` · ${proxima.titulo}` : ''}</span>
      </span>
    </>
  ) : (
    <>
      <span className="qd-proxima__icone"><CalendarX size={20} aria-hidden="true" /></span>
      <span className="qd-proxima__texto">
        <small>Próxima sessão</small>
        <strong>Ainda sem data</strong>
        <span>{onAbrirAgenda ? 'Toque para marcar na Agenda.' : 'O Mestre avisa quando marcar.'}</span>
      </span>
    </>
  );
  const classe = `qd-proxima ${partes ? '' : 'qd-proxima--vazia'}`;
  return onAbrirAgenda ? (
    <button type="button" className={classe} onClick={onAbrirAgenda} aria-label={partes ? `Próxima sessão: ${partes.dia} às ${partes.hora}. Abrir a Agenda` : 'Nenhuma sessão marcada. Abrir a Agenda'}>{conteudo}</button>
  ) : (
    <div className={classe} role="status">{conteudo}</div>
  );
};

/** O quadro da campanha: o que se combinou, o que se viveu e quem fez o quê. */
export function QuadroPage() {
  const campanha = useAuthStore((estado) => estado.campanhaAtiva);
  const [parametros, setParametros] = useSearchParams();
  const [gestor, setGestor] = useState(false);
  // undefined enquanto carrega; null quando não há sessão marcada.
  const [proxima, setProxima] = useState<IProximaSessao | null | undefined>(undefined);
  const [versaoAgenda, setVersaoAgenda] = useState(0);

  useEffect(() => {
    if (!campanha?.id) return;
    let ativo = true;
    // A aba Agenda só aparece para quem comanda; o servidor valida de novo em cada ação.
    engajamentoApi.calendario(campanha.id)
      .then((resposta) => { if (ativo) { setGestor(resposta.gestor); setProxima(resposta.proxima ?? null); } })
      .catch(() => { if (ativo) setProxima(null); });
    return () => { ativo = false; };
  }, [campanha?.id, versaoAgenda]);

  const abasVisiveis = ABAS.filter((aba) => !aba.soGestor || gestor);
  const pedida = parametros.get('aba') as AbaQuadro | null;
  const aba: AbaQuadro = abasVisiveis.some((item) => item.id === pedida) ? (pedida as AbaQuadro) : 'descobertas';
  const irPara = (id: AbaQuadro) => setParametros(id === 'descobertas' ? {} : { aba: id }, { replace: true });

  if (!campanha?.id) {
    return (
      <main className="app-page mx-auto max-w-3xl text-center text-gray-400">
        <p>Selecione uma campanha para abrir o quadro.</p>
      </main>
    );
  }

  const cor = corLegivel(corDaCampanha(campanha.identidade), 0.2).cor;
  const capa = urlDaCapa(campanha.id, campanha.identidade);
  const frase = campanha.identidade?.frase?.trim();

  return (
    <main className="qd-shell app-page mx-auto flex max-w-6xl flex-col" style={{ '--qd-cor': cor } as CSSProperties}>
      <header className="qd-letreiro">
        {capa ? <div className="qd-letreiro__capa" style={{ backgroundImage: `url(${capa})` }} aria-hidden="true" /> : null}
        <div className="qd-letreiro__linha">
          <div className="qd-letreiro__texto">
            <span className="qd-eyebrow"><ScrollText size={12} aria-hidden="true" /> Quadro da campanha</span>
            <h1>{campanha.nome}</h1>
            {frase
              ? <p className="qd-letreiro__frase">“{frase}”</p>
              : <p className="qd-letreiro__sub">O que a mesa combinou, viveu e aprontou, pregado num lugar só.</p>}
          </div>
          <ProximaSessao proxima={proxima} onAbrirAgenda={gestor ? () => irPara('agenda') : undefined} />
        </div>

        <nav className="qd-abas" role="tablist" aria-label="Seções do quadro">
          {abasVisiveis.map(({ id, rotulo, dica, icone: Icone, cor: corDaAba }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`qd-aba-${id}`}
              aria-selected={aba === id}
              aria-controls="qd-painel-aba"
              onClick={() => irPara(id)}
              className={`qd-aba ${aba === id ? 'is-ativa' : ''}`}
              style={{ '--aba-cor': corDaAba } as CSSProperties}
            >
              <span className="qd-aba__icone"><Icone size={15} aria-hidden="true" /></span>
              <span className="qd-aba__texto"><strong>{rotulo}</strong><small>{dica}</small></span>
            </button>
          ))}
        </nav>
      </header>

      <div role="tabpanel" id="qd-painel-aba" aria-labelledby={`qd-aba-${aba}`}>
        {aba === 'descobertas' ? <AbaDescobertas campanhaId={campanha.id} /> : null}
        {aba === 'mural' ? <AbaMural campanhaId={campanha.id} gestor={gestor} /> : null}
        {aba === 'rank' ? <AbaRank campanhaId={campanha.id} /> : null}
        {aba === 'agenda' && gestor ? <AbaAgenda campanhaId={campanha.id} onMudou={() => setVersaoAgenda((atual) => atual + 1)} /> : null}
      </div>
      <div className="mt-12 flex justify-start"><SimboloOculto chave="pegada" glifo="⌖" cliques={4} /></div>
    </main>
  );
}

export default QuadroPage;
