import { useEffect, useState } from 'react';
import { Crosshair, Trash2, X } from 'lucide-react';
import { mapaApi, type IPortal, type IResumoCena } from '../../../services/mapaApi';
import { chegadaAtual, chegadasDaCena, type ChegadaPortal } from '../motor/portasConta';
import { CORES_FLUXO, type FluxoId } from '../motor/molduras';
import { ComDica } from './BotaoFerramenta';

interface Props {
  campanhaId: string;
  /** As outras cenas da campanha: um portal pode levar a uma delas. */
  outrasCenas: IResumoCena[];
  portal: IPortal;
  onMudar: (portal: IPortal) => void;
  onApagar: () => void;
  onIrPara: (lado: 'a' | 'b') => void;
  onFechar: () => void;
}

const NOMES_FLUXO: Record<FluxoId, string> = {
  origem: 'Origem', essencia: 'Essência', comunicacao: 'Comunicação', vitalidade: 'Vitalidade', inconstancia: 'Inconstância',
  fisico: 'Físico', espaco: 'Espaço', tempo: 'Tempo', vazio: 'Vazio', fim: 'Fim', tecnologia: 'Tecnologia',
};

/** O portal escolhido com a ferramenta de portal: nome, cor, de que jeito leva e quem usa. */
export const PainelPortal = ({ campanhaId, outrasCenas, portal, onMudar, onApagar, onIrPara, onFechar }: Props) => {
  const [nome, setNome] = useState(portal.nome);
  useEffect(() => setNome(portal.nome), [portal.id, portal.nome]);
  const [chegadas, setChegadas] = useState<ChegadaPortal[] | null>(null);
  const destino = portal.cena ?? null;

  // Portal para outra cena: os lugares de chegada saem da própria cena de lá.
  useEffect(() => {
    setChegadas(null);
    if (!destino) return undefined;
    let ativo = true;
    void mapaApi.obter(campanhaId, destino).then((estado) => {
      if (ativo && estado?.cena) setChegadas(chegadasDaCena(estado.cena));
    }).catch(() => {
      if (ativo) setChegadas([]);
    });
    return () => { ativo = false; };
  }, [campanhaId, destino]);

  const levarPara = async (cenaId: string) => {
    if (!cenaId) {
      const a = portal.a ?? { x: 0, y: 0 };
      onMudar({ ...portal, cena: null, cena_nome: null, b: { x: a.x + 200, y: a.y } });
      return;
    }
    try {
      const estado = await mapaApi.obter(campanhaId, cenaId);
      const lugares = estado?.cena ? chegadasDaCena(estado.cena) : [];
      onMudar({ ...portal, cena: cenaId, mao: 'unica', b: lugares[0]?.ponto ?? { x: 0, y: 0 } });
    } catch {
      onMudar({ ...portal, cena: cenaId, mao: 'unica', b: { x: 0, y: 0 } });
    }
  };

  const mudar = (parcial: Partial<IPortal>) => onMudar({ ...portal, ...parcial });
  const salvarNome = () => {
    const limpo = nome.trim();
    if (limpo && limpo !== portal.nome) mudar({ nome: limpo });
    else setNome(portal.nome);
  };

  return (
    <section className="mapa-config mapa-portal-painel" aria-label="Portal">
      <header>
        <strong>Portal</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      <label className="mapa-menu-linha">
        Nome
        <input
          value={nome}
          maxLength={40}
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNome}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </label>
      <div className="mapa-fluxos" role="group" aria-label="Cor do portal">
        {(Object.keys(NOMES_FLUXO) as FluxoId[]).map((fluxo) => (
          <ComDica key={fluxo} dica={NOMES_FLUXO[fluxo]}>
            <button
              type="button"
              className={`mapa-fluxo-botao${portal.fluxo === fluxo ? ' ativo' : ''}`}
              style={{ background: CORES_FLUXO[fluxo] }}
              aria-label={NOMES_FLUXO[fluxo]}
              aria-pressed={portal.fluxo === fluxo}
              onClick={() => mudar({ fluxo })}
            />
          </ComDica>
        ))}
      </div>
      <label className="mapa-menu-linha">
        Leva para
        <select value={destino ?? ''} onChange={(e) => void levarPara(e.target.value)}>
          <option value="">Esta mesma cena</option>
          {outrasCenas.map((outra) => <option key={outra.id} value={outra.id}>Cena {outra.nome}</option>)}
        </select>
      </label>
      {destino ? (
        <>
          <label className="mapa-menu-linha">
            Chegada
            <select
              value={chegadas ? chegadaAtual(chegadas, portal.b) ?? '' : ''}
              disabled={!chegadas?.length}
              onChange={(e) => {
                const escolhida = chegadas?.find((c) => c.id === e.target.value);
                if (escolhida) mudar({ b: escolhida.ponto });
              }}
            >
              {!chegadas && <option value="">Carregando a cena...</option>}
              {chegadas && !chegadaAtual(chegadas, portal.b) && <option value="">Outro lugar</option>}
              {chegadas?.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
            </select>
          </label>
          <p className="mapa-dica">Só de ida: para voltar, ponha um portal na outra cena. A chegada pode ser a boca dele.</p>
        </>
      ) : (
        <div className="mapa-segmentos" role="group" aria-label="Sentido">
          <button type="button" className={portal.mao === 'dupla' ? 'ativo' : ''} onClick={() => mudar({ mao: 'dupla' })}>Ida e volta</button>
          <button type="button" className={portal.mao === 'unica' ? 'ativo' : ''} onClick={() => mudar({ mao: 'unica' })}>Só de ida</button>
        </div>
      )}
      <label className="mapa-menu-linha">
        Quem atravessa
        <select value={portal.usa} onChange={(e) => mudar({ usa: e.target.value as IPortal['usa'] })}>
          <option value="todos">Qualquer um</option>
          <option value="jogadores">Só quando um jogador solta o token</option>
          <option value="mestre">Só quando o Mestre solta o token</option>
        </select>
      </label>
      <label className="mapa-menu-linha">
        Tamanho da boca <span>{portal.raio.toLocaleString('pt-BR')} casa</span>
        <input type="range" min={0.3} max={3} step={0.1} value={portal.raio} onChange={(e) => mudar({ raio: Number(e.target.value) })} />
      </label>
      <div className="mapa-menu-opcoes">
        <label><input type="checkbox" checked={portal.ligado} onChange={(e) => mudar({ ligado: e.target.checked })} /> Ligado</label>
        <label><input type="checkbox" checked={portal.visivel} onChange={(e) => mudar({ visivel: e.target.checked })} /> Os jogadores veem</label>
        <label><input type="checkbox" checked={portal.confirmar} onChange={(e) => mudar({ confirmar: e.target.checked })} /> Perguntar antes de atravessar</label>
      </div>
      <p className="mapa-dica">
        {portal.visivel
          ? destino ? `Soltar um token na entrada leva à cena ${portal.cena_nome ?? 'escolhida'}, e você recebe um aviso.` : 'Soltar um token numa boca leva à outra.'
          : 'Escondido: os jogadores não veem e não são avisados antes de cair nele, como uma armadilha.'}
      </p>
      <div className="mapa-menu-botoes">
        <button type="button" className="mapa-botao-leve" onClick={() => onIrPara('a')}><Crosshair size={13} /> Entrada</button>
        {!destino && <button type="button" className="mapa-botao-leve" onClick={() => onIrPara('b')}><Crosshair size={13} /> Saída</button>}
        <button type="button" className="mapa-botao perigo" onClick={onApagar}><Trash2 size={13} /> Apagar</button>
      </div>
    </section>
  );
};
