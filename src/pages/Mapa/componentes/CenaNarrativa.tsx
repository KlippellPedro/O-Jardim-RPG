import { useMemo } from 'react';
import { Map as MapaIcone } from 'lucide-react';
import { urlImagemDoToken, type INarrativa, type ITokenMapa } from '../../../services/mapaApi';
import { iniciais } from '../motor/geometria';
import { falantesVisiveis } from '../motor/visorConta';
import { ImagemMontada } from './ImagemMontada';
import './visorDaMesa.css';

interface Props {
  narrativa: INarrativa;
  campanhaId: string;
  /** Os tokens que esta pessoa enxerga: só deles saem os retratos. */
  tokens: ITokenMapa[];
  /** A fala de agora (o Mestre falando por um NPC): vira a legenda grande embaixo. */
  fala: { nome: string; texto: string; token: string | null } | null;
  gestor: boolean;
  /** Só o Mestre: volta ao mapa. */
  onVoltar?: () => void;
  /** Só o Mestre: clicar num retrato fala como aquele personagem. */
  onFalar?: (token: ITokenMapa) => void;
}

/**
 * A cena narrativa: o mapa some, a arte vira o fundo (com um movimento lento) e os personagens aparecem embaixo, como num
 * livro ilustrado. A fala de um NPC vira a legenda. Serve para diálogo longo, investigação e boa parte das cenas em que a
 * grade só atrapalha. O mapa e os tokens ficam onde estavam e voltam quando o Mestre encerra.
 */
export const CenaNarrativa = ({ narrativa, campanhaId, tokens, fala, gestor, onVoltar, onFalar }: Props) => {
  const falantes = useMemo(() => falantesVisiveis(narrativa.falantes, tokens), [narrativa.falantes, tokens]);
  if (!narrativa.imagem_id) return null;
  return (
    <div className="narrativa" role="region" aria-label={narrativa.titulo ? `Cena: ${narrativa.titulo}` : 'Cena narrativa'}>
      <div className="narrativa-fundo">
        <div className="narrativa-movimento">
          <ImagemMontada itemId={narrativa.imagem_id} largura={narrativa.largura} altura={narrativa.altura} ajuste="cover" descricao={narrativa.titulo || 'Cena'} />
        </div>
      </div>
      <div className="narrativa-vinheta" aria-hidden="true" />
      {narrativa.titulo && <h2 className="narrativa-titulo">{narrativa.titulo}</h2>}
      {gestor && onVoltar && (
        <button type="button" className="narrativa-voltar" onClick={onVoltar}><MapaIcone size={15} /> Voltar ao mapa</button>
      )}
      <div className="narrativa-rodape">
        {fala && (
          <blockquote key={`${fala.nome}:${fala.texto}`} className="narrativa-fala">
            <strong>{fala.nome}</strong>
            <p>{fala.texto}</p>
          </blockquote>
        )}
        {falantes.length > 0 && (
          <ul className="narrativa-falantes" aria-label="Quem está na cena">
            {falantes.map((token) => {
              const falando = fala?.token === token.id;
              const conteudo = (
                <>
                  <span className="narrativa-retrato">
                    {token.imagem ? <img src={urlImagemDoToken(campanhaId, token.id, token.imagem)} alt="" draggable={false} /> : <span>{iniciais(token.nome)}</span>}
                  </span>
                  <small>{token.nome}</small>
                </>
              );
              return (
                <li key={token.id} className={falando ? 'falando' : ''}>
                  {gestor && onFalar
                    ? <button type="button" title={`Falar como ${token.nome}`} onClick={() => onFalar(token)}>{conteudo}</button>
                    : conteudo}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
