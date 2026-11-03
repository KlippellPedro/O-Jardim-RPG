import { DoorClosed, DoorOpen, Eye, EyeOff, Lock, LockOpen, X } from 'lucide-react';
import type { IAberturaCena } from '../../../services/mapaApi';
import { nomeDaPorta } from '../motor/portasConta';

interface Props {
  porta: IAberturaCena;
  ocupado: boolean;
  onMudar: (dados: { estado?: IAberturaCena['estado']; revelar?: boolean }) => void;
  onFechar: () => void;
}

/** A porta clicada pelo Mestre: abrir, fechar, trancar e revelar a secreta. O jogador abre e
 * fecha a porta destrancada ao lado do próprio token, direto no clique. */
export const MenuPorta = ({ porta, ocupado, onMudar, onFechar }: Props) => {
  const secreta = porta.tipo === 'secreta';
  return (
    <section className="mapa-config mapa-porta-painel" aria-label="Porta">
      <header>
        <strong>{nomeDaPorta(porta)}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      {secreta ? (
        <p className="mapa-dica">Para os jogadores, isto é parede: eles não veem a porta nem passam por ela. Revelada, ela vira uma porta comum.</p>
      ) : (
        <p className="mapa-dica">
          {porta.estado === 'trancada'
            ? 'Trancada: segura todo mundo, e só você abre.'
            : 'O jogador abre e fecha esta porta clicando nela, com o personagem ao lado.'}
        </p>
      )}
      <div className="mapa-menu-botoes">
        {porta.estado === 'aberta' ? (
          <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => onMudar({ estado: 'fechada' })}><DoorClosed size={13} /> Fechar</button>
        ) : (
          <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => onMudar({ estado: 'aberta' })}><DoorOpen size={13} /> Abrir</button>
        )}
        {porta.estado === 'trancada' ? (
          <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => onMudar({ estado: 'fechada' })}><LockOpen size={13} /> Destrancar</button>
        ) : (
          <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => onMudar({ estado: 'trancada' })}><Lock size={13} /> Trancar</button>
        )}
        {secreta && (
          <button type="button" className="mapa-botao" disabled={ocupado} onClick={() => onMudar({ revelar: true })}><Eye size={13} /> Revelar</button>
        )}
        {porta.era_secreta && (
          <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => onMudar({ revelar: false, estado: 'fechada' })}><EyeOff size={13} /> Esconder de novo</button>
        )}
      </div>
    </section>
  );
};
