import React from 'react';
import { Crosshair, MapPin, Users } from 'lucide-react';
import {
  dadosAmeaca,
  rotuloCondicao,
  STATUS_PROCURADO,
  urlImagemProcurado,
  type IProcurado,
} from '../../../services/procuradosApi';

interface CartazProcuradoProps {
  procurado: Pick<IProcurado, 'nome' | 'especie' | 'local' | 'condicao' | 'ameaca' | 'vd' | 'recompensa_valor' | 'recompensa_moeda' | 'imagem' | 'imagem_foco' | 'status' | 'publicado' | 'cacadores'>;
  /** Posição no quadro: decide a inclinação, para os cartazes não ficarem todos retos. */
  indice?: number;
  /** Cartaz grande do detalhe e do editor (sem inclinação nem botão). */
  destaque?: boolean;
  onAbrir?: () => void;
}

const INCLINACOES = [-2.2, 1.4, -0.8, 2, -1.6, 0.9];

export function textoRecompensa(valor: number, moeda: string): string {
  return `${valor.toLocaleString('pt-BR')} ${moeda}`;
}

// O cartaz pregado no quadro da Guilda: papel velho, retrato, nome, recompensa
// e o carimbo quando a caçada termina.
export const CartazProcurado: React.FC<CartazProcuradoProps> = ({ procurado, indice = 0, destaque = false, onAbrir }) => {
  const ameaca = dadosAmeaca(procurado.ameaca);
  const carimbo = STATUS_PROCURADO[procurado.status]?.carimbo;
  const estilo = {
    '--inclinacao': destaque ? '0deg' : `${INCLINACOES[indice % INCLINACOES.length]}deg`,
    '--foco': `${procurado.imagem_foco}%`,
    '--ameaca': ameaca.cor,
  } as React.CSSProperties;
  const conteudo = (
    <>
      <div className="cartaz__papel wanted-poster">
      <div aria-hidden="true" className="wanted-poster-scratches cartaz__arranhoes" />
      <header className="cartaz__cabeca">
        <span className="cartaz__titulo">Procurado</span>
        <span className="cartaz__condicao">{rotuloCondicao(procurado.condicao)}</span>
      </header>
      <div className="cartaz__retrato">
        {procurado.imagem ? (
          <img src={urlImagemProcurado(procurado.imagem)} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="cartaz__sem-retrato" aria-hidden="true">?</span>
        )}
      </div>
      <h3 className="cartaz__nome">{procurado.nome}</h3>
      {procurado.especie ? <p className="cartaz__especie">{procurado.especie}</p> : null}
      <div className="cartaz__recompensa">
        <small>Recompensa</small>
        <strong>{procurado.recompensa_valor > 0 ? textoRecompensa(procurado.recompensa_valor, procurado.recompensa_moeda) : 'A combinar'}</strong>
      </div>
      <footer className="cartaz__pe">
        <span className="cartaz__ameaca"><i aria-hidden="true" /> Ameaça {ameaca.rotulo.toLowerCase()}{procurado.vd !== null ? ` · VD ${procurado.vd}` : ''}</span>
        {procurado.local ? <span><MapPin size={11} aria-hidden="true" /> {procurado.local}</span> : null}
        {procurado.cacadores.length ? (
          <span><Users size={11} aria-hidden="true" /> {procurado.cacadores.length} {procurado.cacadores.length === 1 ? 'caçador' : 'caçadores'} no rastro</span>
        ) : procurado.status === 'aberto' ? (
          <span><Crosshair size={11} aria-hidden="true" /> ninguém no rastro ainda</span>
        ) : null}
      </footer>
      {carimbo ? <span className={`cartaz__carimbo cartaz__carimbo--${procurado.status}`} aria-hidden="true">{carimbo}</span> : null}
      </div>
      <span className="cartaz__prego" aria-hidden="true" />
      {!procurado.publicado ? <span className="cartaz__rascunho">Rascunho</span> : null}
    </>
  );

  const classes = `cartaz ${destaque ? 'cartaz--destaque' : ''} ${procurado.status !== 'aberto' ? 'is-encerrado' : ''} ${!procurado.publicado ? 'is-rascunho' : ''}`;
  if (!onAbrir) {
    return <div className={classes} style={estilo}>{conteudo}</div>;
  }
  // Um div clicável (e não <button>) porque o cartaz tem título, cabeçalho e
  // rodapé, que não podem morar dentro de um botão.
  return (
    <div
      role="button"
      tabIndex={0}
      className={`${classes} cartaz--clicavel`}
      style={estilo}
      onClick={onAbrir}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onAbrir();
        }
      }}
      aria-label={`Abrir o cartaz de ${procurado.nome}${carimbo ? `, ${carimbo.toLowerCase()}` : ''}`}
    >
      {conteudo}
    </div>
  );
};
