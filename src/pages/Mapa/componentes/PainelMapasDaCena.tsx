import { Eye, EyeOff, FolderOpen, Images, Lock, LockOpen, X } from 'lucide-react';
import type { IMapaColocado } from '../../../services/mapaApi';
import './mapasColocados.css';

interface Props {
  mapas: IMapaColocado[];
  selecionadoId: string | null;
  onSelecionar: (id: string) => void;
  onAlternarVisivel: (mapa: IMapaColocado) => void;
  onAlternarTrava: (mapa: IMapaColocado) => void;
  /** Abre o Acervo para escolher o mapa que entra na cena. */
  onAdicionar: () => void;
  onFechar: () => void;
}

/** Os mapas da cena, o de cima primeiro: escolher, esconder dos jogadores e trancar sem clicar no mapa. */
export const PainelMapasDaCena = ({ mapas, selecionadoId, onSelecionar, onAlternarVisivel, onAlternarTrava, onAdicionar, onFechar }: Props) => {
  const deCima = [...mapas].reverse();
  return (
    <section className="mapa-config mapa-painel-mapas" aria-label="Mapas da cena">
      <header>
        <div className="mapa-painel-mapas-titulo"><Images size={17} /><strong>Mapas da cena</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      <button type="button" className="mapa-botao destaque" onClick={onAdicionar}><FolderOpen size={14} /> Adicionar do Acervo</button>
      {deCima.length ? (
        <ul className="mapa-painel-mapas-lista">
          {deCima.map((mapa) => {
            const escondido = mapa.visivel === false;
            const trancado = mapa.trancado === true;
            return (
              <li key={mapa.id} className={mapa.id === selecionadoId ? 'escolhido' : ''}>
                <button type="button" className="mapa-painel-mapas-nome" onClick={() => onSelecionar(mapa.id)} title={mapa.nome}>
                  {mapa.nome}
                  {escondido && <small>escondido dos jogadores</small>}
                </button>
                <button type="button" className={escondido ? 'ativo' : ''} aria-label={escondido ? `Mostrar ${mapa.nome} aos jogadores` : `Esconder ${mapa.nome} dos jogadores`} onClick={() => onAlternarVisivel(mapa)}>
                  {escondido ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button type="button" className={trancado ? 'ativo' : ''} aria-label={trancado ? `Destrancar ${mapa.nome}` : `Trancar ${mapa.nome}`} onClick={() => onAlternarTrava(mapa)}>
                  {trancado ? <Lock size={15} /> : <LockOpen size={15} />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mapa-dica">Nenhum mapa colocado ainda. Escolha mapas no Acervo: cada um entra como um objeto que você arrasta, muda de tamanho, tranca ou esconde dos jogadores.</p>
      )}
      <p className="mapa-dica">Clique num mapa para escolher e arraste para mover. Puxe um canto para mudar o tamanho. O que está mais acima na lista fica por cima. Botão direito ou do meio anda pelo mapa.</p>
    </section>
  );
};
