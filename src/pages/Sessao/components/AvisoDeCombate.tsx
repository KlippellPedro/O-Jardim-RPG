import React, { useEffect } from 'react';
import { Flag, Hourglass, Swords } from 'lucide-react';
import { useSessaoStore } from '../../../store/useSessaoStore';
import { TEXTO_DO_AVISO, type AvisoDeCombate as AvisoDeCombateTipo, type TipoAvisoDeCombate } from '../combateVivo';
import '../combateVivo.css';

const MILISSEGUNDOS_NA_TELA = 3400;

const ICONE: Record<TipoAvisoDeCombate, typeof Swords> = {
  inicio: Swords,
  rodada: Hourglass,
  fim: Flag,
};

const Faixa = ({ aviso, onFechar }: { aviso: AvisoDeCombateTipo; onFechar: () => void }) => {
  useEffect(() => {
    const timer = window.setTimeout(onFechar, MILISSEGUNDOS_NA_TELA);
    return () => window.clearTimeout(timer);
  }, [onFechar]);
  const Icone = ICONE[aviso.tipo];
  const texto = TEXTO_DO_AVISO[aviso.tipo];
  return (
    <div className={`sessao-aviso-combate sessao-aviso-combate--${aviso.tipo}`} role="status" aria-live="polite">
      <div className="sessao-aviso-combate__faixa">
        <span className="sessao-aviso-combate__icone" aria-hidden="true"><Icone size={22} /></span>
        <p className="sessao-aviso-combate__titulo">{texto.titulo(aviso.rodada)}</p>
        <p className="sessao-aviso-combate__legenda">{texto.legenda(aviso)}</p>
      </div>
    </div>
  );
};

/** Faixa que cruza a mesa quando o combate começa, quando uma rodada nova abre e quando ele termina. */
export const AvisoDeCombate: React.FC = () => {
  const aviso = useSessaoStore((estado) => estado.avisosDeCombate[estado.avisosDeCombate.length - 1]);
  const dispensar = useSessaoStore((estado) => estado.dispensarAvisoDeCombate);
  if (!aviso) return null;
  return <Faixa key={aviso.chave} aviso={aviso} onFechar={() => dispensar(aviso.chave)} />;
};
