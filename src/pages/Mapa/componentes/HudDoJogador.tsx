import { useEffect, useState } from 'react';
import { ChevronsRight, Crosshair, ScrollText, Swords } from 'lucide-react';
import { urlImagemDoToken, type IBarraToken, type ITokenMapa } from '../../../services/mapaApi';
import { CORES_LADO } from '../motor/molduras';
import { iniciais } from '../motor/geometria';
import { fracaoDaBarra } from './hudConta';

export { fracaoDaBarra, meuTokenDaVez } from './hudConta';

const NOMES_BARRA: Record<IBarraToken['tipo'], string> = { vida: 'Vida', mana: 'Mana', estamina: 'Estamina', sanidade: 'Sanidade' };

interface PropsHud {
  token: ITokenMapa;
  campanhaId: string;
  minhaVez: boolean;
  onMostrar: () => void;
  onFicha: () => void;
  /** Encerrar o próprio turno; o botão só aparece na vez do jogador. */
  onEncerrarTurno?: () => Promise<void>;
}

/**
 * O personagem do jogador, sempre à vista no pé do mapa: retrato, barras e condições, sem precisar achar o
 * token nem abrir o painel. O retrato leva a tela até ele; "Ficha" abre a ficha no painel da direita.
 */
export const HudDoJogador = ({ token, campanhaId, minhaVez, onMostrar, onFicha, onEncerrarTurno }: PropsHud) => {
  const [encerrando, setEncerrando] = useState(false);
  const encerrar = async () => {
    if (!onEncerrarTurno || encerrando) return;
    setEncerrando(true);
    try {
      await onEncerrarTurno();
    } finally {
      setEncerrando(false);
    }
  };
  return (
  <section className={`mapa-hud${minhaVez ? ' na-vez' : ''}`} aria-label={`Seu personagem: ${token.nome}`}>
    <button type="button" className="mapa-hud-retrato" style={{ borderColor: CORES_LADO[token.lado] }} aria-label={`Ir até ${token.nome} no mapa`} title="Ir até o seu personagem" onClick={onMostrar}>
      {token.imagem ? <img src={urlImagemDoToken(campanhaId, token.id, token.imagem)} alt="" /> : <span>{iniciais(token.nome)}</span>}
    </button>
    <div className="mapa-hud-corpo">
      <div className="mapa-hud-titulo">
        <strong>{token.nome}</strong>
        {minhaVez
          ? <span className="mapa-hud-vez"><Swords size={11} /> Sua vez</span>
          : token.nivel ? <small>Nível {token.nivel}</small> : null}
      </div>
      {token.barras.length > 0 && (
        <div className="mapa-hud-barras">
          {token.barras.map((barra) => (
            <span key={barra.tipo} className={`mapa-hud-barra barra-${barra.tipo}`} title={`${NOMES_BARRA[barra.tipo]}: ${barra.rotulo ?? `${barra.atual}/${barra.maximo}`}`}>
              <span className="mapa-hud-trilho"><span style={{ width: `${fracaoDaBarra(barra) * 100}%` }} /></span>
              <span className="mapa-hud-valor">{barra.rotulo ?? `${barra.atual}/${barra.maximo}`}</span>
            </span>
          ))}
        </div>
      )}
      {token.condicoes.length > 0 && (
        <ul className="mapa-hud-condicoes" aria-label="Condições">
          {token.condicoes.slice(0, 4).map((condicao) => <li key={condicao}>{condicao}</li>)}
          {token.condicoes.length > 4 && <li>+{token.condicoes.length - 4}</li>}
        </ul>
      )}
    </div>
    {minhaVez && onEncerrarTurno && (
      <button type="button" className="mapa-hud-encerrar" disabled={encerrando} aria-label="Encerrar o meu turno" title="Passa a vez para o próximo da iniciativa" onClick={() => void encerrar()}>
        <ChevronsRight size={15} /> <span>{encerrando ? 'Passando...' : 'Encerrar turno'}</span>
      </button>
    )}
    <div className="mapa-hud-acoes">
      <button type="button" aria-label="Ir até o seu personagem" title="Ir até o seu personagem" onClick={onMostrar}><Crosshair size={15} /></button>
      {token.personagem_id && <button type="button" aria-label="Abrir a ficha" title="Abrir a ficha" onClick={onFicha}><ScrollText size={15} /></button>}
    </div>
  </section>
  );
};

interface PropsAviso {
  /** Muda a cada vez nova do jogador (sessão, rodada e turno): é o que dispara o aviso. */
  chave: string;
  nome: string;
  rodada: number;
  onMostrar: () => void;
}

/** "Sua vez" no meio do mapa quando o turno chega no personagem do jogador; some sozinho em poucos segundos. */
export const AvisoDaVez = ({ chave, nome, rodada, onMostrar }: PropsAviso) => {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (!chave) {
      setVisivel(false);
      return undefined;
    }
    setVisivel(true);
    const relogio = window.setTimeout(() => setVisivel(false), 4200);
    return () => window.clearTimeout(relogio);
  }, [chave]);
  if (!visivel) return null;
  return (
    <button type="button" className="mapa-aviso-vez" aria-live="assertive" onClick={() => { setVisivel(false); onMostrar(); }}>
      <Swords size={20} />
      <span>
        <strong>Sua vez, {nome}</strong>
        <small>Rodada {rodada}. Clique para ir até o seu personagem.</small>
      </span>
    </button>
  );
};
