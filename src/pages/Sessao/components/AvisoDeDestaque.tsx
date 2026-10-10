import React, { useEffect } from 'react';
import { Skull, Sparkles } from 'lucide-react';
import { useSessaoStore } from '../../../store/useSessaoStore';
import { sfx } from '../../../utils/audioSynth';
import { semMovimento } from '../../../utils/movimento';
import { vibrar } from '../../../utils/vibracaoDoApp';
import { TEXTO_DO_DESTAQUE, type DestaqueDaMesa } from '../destaqueDaMesa';
import '../combateVivo.css';

const MILISSEGUNDOS_NA_TELA = 3600;

const Faixa = ({ destaque, onFechar }: { destaque: DestaqueDaMesa; onFechar: () => void }) => {
  useEffect(() => {
    // Quem rolou já viu (e ouviu) o dado; a mesa ganha o som e a vibração.
    if (!destaque.proprio) {
      if (destaque.tipo === 'critico') sfx.playCritSound();
      else sfx.play('error');
      vibrar(destaque.tipo === 'critico' ? 'critico' : 'falha');
    }
    const timer = window.setTimeout(onFechar, MILISSEGUNDOS_NA_TELA);
    return () => window.clearTimeout(timer);
  }, [destaque, onFechar]);

  const Icone = destaque.tipo === 'critico' ? Sparkles : Skull;
  const texto = TEXTO_DO_DESTAQUE[destaque.tipo];
  return (
    <div
      className={`sessao-destaque sessao-destaque--${destaque.tipo}${semMovimento() ? ' sessao-destaque--parado' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="sessao-destaque__pilula">
        <span className="sessao-destaque__icone" aria-hidden="true"><Icone size={22} /></span>
        <span className="sessao-destaque__texto">
          <span className="sessao-destaque__titulo">{texto.titulo}</span>
          <span className="sessao-destaque__legenda">{destaque.autor}{destaque.titulo ? ` · ${destaque.titulo}` : ''}</span>
        </span>
      </div>
    </div>
  );
};

/** A faixa do 20 e do 1 natural de quem rola na mesa ao vivo. Aparece para todos; o resultado em si fica no registro. */
export const AvisoDeDestaque: React.FC = () => {
  const destaque = useSessaoStore((estado) => estado.destaquesDaMesa[estado.destaquesDaMesa.length - 1]);
  const dispensar = useSessaoStore((estado) => estado.dispensarDestaque);
  if (!destaque) return null;
  return <Faixa key={destaque.chave} destaque={destaque} onFechar={() => dispensar(destaque.chave)} />;
};
