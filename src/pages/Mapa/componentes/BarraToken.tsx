import { Eye, EyeOff, MessageSquareQuote, SlidersHorizontal, StickyNote, Trash2 } from 'lucide-react';
import type { ITokenMapa } from '../../../services/mapaApi';
import { resumoDaNota, temNota } from '../motor/notasDoMestre';
import { ComDica } from './BotaoFerramenta';
import './mapasColocados.css';

interface Props {
  token: ITokenMapa;
  gestor: boolean;
  /** O painel de opções (abas Geral, Barras, Visual, Luz e aura) está aberto. */
  opcoesAbertas: boolean;
  onOpcoes: () => void;
  /** Só o Mestre: abre as opções na aba Geral, onde mora a nota. */
  onNota?: () => void;
  onOculto: () => void;
  onRemover: () => void;
  /** Só o Mestre: falar como este token (a mesa vê a fala com o retrato). */
  onFalar?: () => void;
}

/**
 * A barra colada no token escolhido (ver BarraAncorada): o que se faz toda hora fica a um clique, e o painel
 * de opções só abre quando se pede, em vez de cobrir a direita do mapa a cada token escolhido.
 */
export const BarraToken = ({ token, gestor, opcoesAbertas, onOpcoes, onNota, onOculto, onRemover, onFalar }: Props) => {
  const principal = token.barras[0];
  return (
    <section className="mapa-barra-mapa mapa-barra-token" aria-label={`Token ${token.nome}`}>
      <div className="mapa-barra-mapa-linha">
        <strong className="mapa-barra-mapa-nome" title={token.nome}>{token.nome}</strong>
        {principal?.maximo ? <span className="mapa-barra-token-numero">{principal.atual}/{principal.maximo}</span> : null}
        {gestor && (
          <ComDica lado="cima" dica={token.oculto ? 'Escondido dos jogadores. Clique para mostrar.' : 'Visível para os jogadores. Clique para esconder.'}>
            <button type="button" className={token.oculto ? 'ativo' : ''} aria-pressed={Boolean(token.oculto)} aria-label={token.oculto ? 'Mostrar aos jogadores' : 'Esconder dos jogadores'} onClick={onOculto}>
              {token.oculto ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </ComDica>
        )}
        {gestor && onFalar && (
          <ComDica lado="cima" dica={`Falar como ${token.nome || 'este token'}`}>
            <button type="button" aria-label={`Falar como ${token.nome || 'este token'}`} onClick={onFalar}><MessageSquareQuote size={18} /></button>
          </ComDica>
        )}
        {gestor && onNota && temNota(token.nota_mestre) && (
          <ComDica lado="cima" dica={`Nota do Mestre: ${resumoDaNota(token.nota_mestre)}`}>
            <button type="button" className="ativo" aria-label="Ler a nota do Mestre deste token" onClick={onNota}><StickyNote size={18} /></button>
          </ComDica>
        )}
        <ComDica lado="cima" dica="Opções do token: barras, visual, luz, aura e a nota do Mestre">
          <button type="button" className={opcoesAbertas ? 'ativo' : ''} aria-pressed={opcoesAbertas} aria-label="Opções do token" onClick={onOpcoes}>
            <SlidersHorizontal size={18} />
          </button>
        </ComDica>
        {gestor && (
          <ComDica lado="cima" dica="Tirar do mapa">
            <button type="button" className="perigo" aria-label="Tirar o token do mapa" onClick={onRemover}><Trash2 size={18} /></button>
          </ComDica>
        )}
      </div>
    </section>
  );
};
