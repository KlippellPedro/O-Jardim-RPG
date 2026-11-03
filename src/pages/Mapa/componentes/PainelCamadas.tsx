import { Eye, EyeOff, Layers, X } from 'lucide-react';
import type { CamadaMapaId, ICena } from '../../../services/mapaApi';

const CAMADAS: Array<{ id: CamadaMapaId; nome: string; detalhe: string; colocavel: boolean }> = [
  { id: 'mapa', nome: 'Mapa', detalhe: 'Fundo e cenário montado', colocavel: false },
  { id: 'props', nome: 'Itens e props', detalhe: 'Imagens colocadas do Acervo', colocavel: true },
  { id: 'montarias', nome: 'Montarias', detalhe: 'Tokens de montaria', colocavel: true },
  { id: 'personagens', nome: 'Personagens e tokens', detalhe: 'Personagens, criaturas e outros tokens', colocavel: true },
  { id: 'anotacoes', nome: 'Anotações', detalhe: 'Textos e plaquinhas', colocavel: false },
];

interface Props {
  aberto: boolean;
  gestor: boolean;
  cena: ICena | null;
  locais: Record<CamadaMapaId, boolean>;
  ativa: CamadaMapaId;
  onAlternarLocal: (id: CamadaMapaId) => void;
  onAlternarJogadores: (id: CamadaMapaId, visivel: boolean) => void;
  onAtivar: (id: CamadaMapaId) => void;
  onFechar: () => void;
}

export const PainelCamadas = ({ aberto, gestor, cena, locais, ativa, onAlternarLocal, onAlternarJogadores, onAtivar, onFechar }: Props) => {
  if (!aberto || !cena) return null;
  const acessiveis = new Set(cena.camadas_visiveis ?? CAMADAS.map((camada) => camada.id));

  return (
    <section className="mapa-config mapa-camadas" aria-label="Camadas do mapa">
      <header>
        <div><Layers size={17} /><strong>Camadas</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar camadas" onClick={onFechar}><X size={16} /></button>
      </header>
      <p className="mapa-dica">Escolha a camada para colocar novos itens e controle o que aparece nesta tela.</p>
      <div className="mapa-camadas-lista">
        {CAMADAS.map((camada) => {
          const jogadorVe = cena.camadas_jogadores?.[camada.id] ?? true;
          const visivelParaMim = gestor || acessiveis.has(camada.id);
          return (
            <article key={camada.id} className={`mapa-camada${ativa === camada.id ? ' ativa' : ''}${!visivelParaMim ? ' indisponivel' : ''}`}>
              <button
                type="button"
                className="mapa-camada-ativar"
                disabled={!gestor || !camada.colocavel || !visivelParaMim}
                aria-pressed={ativa === camada.id}
                onClick={() => onAtivar(camada.id)}
              >
                <span className="mapa-camada-nome">{camada.nome}</span>
                <small>{camada.detalhe}</small>
              </button>
              <label title="Mostrar ou ocultar nesta tela">
                <input type="checkbox" checked={visivelParaMim && locais[camada.id]} disabled={!visivelParaMim} onChange={() => onAlternarLocal(camada.id)} />
                {visivelParaMim && locais[camada.id] ? <Eye size={15} /> : <EyeOff size={15} />}
              </label>
              {gestor && (
                <label className="mapa-camada-jogadores" title="Liberar esta camada para jogadores">
                  <input type="checkbox" checked={jogadorVe} onChange={(evento) => onAlternarJogadores(camada.id, evento.target.checked)} />
                  <span>Jogadores</span>
                </label>
              )}
            </article>
          );
        })}
      </div>
      {!gestor && <p className="mapa-dica">Camadas que o Mestre reteve não aparecem nesta lista.</p>}
    </section>
  );
};
