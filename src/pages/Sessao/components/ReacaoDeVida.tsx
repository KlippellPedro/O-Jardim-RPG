import React, { useEffect, useRef } from 'react';
import { forcaDoTremor, textoDoDelta, tipoDoFlutuante, type TomDaBarra } from '../combateVivo';
import { useReacaoDeBarra } from '../useReacaoDeBarra';
import '../combateVivo.css';

interface ReacaoDeVidaProps {
  /** De quem é a barra (id do participante + recurso): trocar de pessoa não gera reação. */
  escopo: string;
  valor: number | undefined;
  maximo?: number;
  tom?: TomDaBarra;
  /** Número menor, para os cartões da fila e da mesa. */
  compacto?: boolean;
  /** Treme o elemento de fora (o cartão) quando o valor cai. */
  tremer?: boolean;
}

/** Camada transparente que reage à mudança de um valor: número flutuante, clarão e, se pedido,
 * tremor do elemento pai. Só aparece quando o cliente tem o número; criatura de visibilidade
 * parcial (sem número) não passa valor e nada acontece. */
export const ReacaoDeVida: React.FC<ReacaoDeVidaProps> = ({ escopo, valor, maximo, tom = 'health', compacto = false, tremer = false }) => {
  const reacao = useReacaoDeBarra(escopo, valor);
  const camada = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!reacao || !tremer || reacao.delta >= 0) return;
    const alvo = camada.current?.parentElement;
    if (!alvo || typeof alvo.animate !== 'function') return;
    const forca = forcaDoTremor(reacao.delta, maximo);
    const animacao = alvo.animate(
      [
        { translate: '0 0' },
        { translate: `${-forca}px 0` },
        { translate: `${forca}px 0` },
        { translate: `${-forca * 0.6}px 0` },
        { translate: `${forca * 0.3}px 0` },
        { translate: '0 0' },
      ],
      { duration: 380, easing: 'ease-out' },
    );
    return () => animacao.cancel();
  }, [reacao, tremer, maximo]);

  const tipo = reacao ? tipoDoFlutuante(tom, reacao.delta) : null;
  const perda = reacao ? reacao.delta < 0 : false;

  return (
    <span ref={camada} className="sessao-reacao" aria-hidden="true">
      {reacao && tipo ? (
        <>
          <span key={`clarao-${reacao.chave}`} className={`sessao-clarao sessao-clarao--${perda ? 'perda' : 'ganho'}`} />
          <span key={`numero-${reacao.chave}`} className={`sessao-flutuante sessao-flutuante--${tipo}${compacto ? ' sessao-flutuante--compacto' : ''}`}>
            {textoDoDelta(reacao.delta)}
          </span>
        </>
      ) : null}
    </span>
  );
};
