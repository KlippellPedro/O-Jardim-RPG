import { memo, useEffect, useState, type CSSProperties } from 'react';
import { inscreverPancada, useEstadoVital, type Pancada } from '../estadoVital';
import './estadoVital.css';

const LIMIAR_BAIXO = 25;
const LIMIAR_CRITICO = 10;
const DURACAO_PANCADA_MS = 650;

/** Vinheta de tela cheia da ficha: a borda pulsa em vermelho quando a Vida
 * está baixa, escurece em 0, ganha um tom roxo instável com pouca Sanidade e
 * dá um clarão a cada golpe. Só apresentação: não mexe em nenhum dado. */
export const EstadoVitalOverlay = memo(function EstadoVitalOverlay() {
  const { vida, sanidade } = useEstadoVital();
  const [pancada, setPancada] = useState<Pancada | null>(null);

  useEffect(() => inscreverPancada(setPancada), []);
  useEffect(() => {
    if (!pancada) return undefined;
    const timer = window.setTimeout(() => setPancada(null), DURACAO_PANCADA_MS);
    return () => window.clearTimeout(timer);
  }, [pancada]);

  const vidaBaixa = vida <= LIMIAR_BAIXO;
  const sanidadeBaixa = sanidade <= LIMIAR_BAIXO;
  const intensidade = (valor: number) => Math.min(1, Math.max(0, 1 - valor / LIMIAR_BAIXO));

  return (
    <div className="vital-overlay performance-decorative" aria-hidden="true">
      {vidaBaixa && (
        <div
          className={`vital-vinheta vital-vinheta--vida${vida <= LIMIAR_CRITICO ? ' vital-vinheta--critico' : ''}${vida <= 0 ? ' vital-vinheta--caido' : ''}`}
          style={{ '--vital-i': intensidade(vida) } as CSSProperties}
        />
      )}
      {sanidadeBaixa && (
        <>
          <div
            className="vital-vinheta vital-vinheta--sanidade"
            style={{ '--vital-i': intensidade(sanidade) } as CSSProperties}
          />
          <div className="vital-interferencia" />
        </>
      )}
      {pancada && (
        <div
          key={pancada.chave}
          className={`vital-pancada vital-pancada--${pancada.tipo}`}
          style={{ '--vital-forca': pancada.forca } as CSSProperties}
        />
      )}
    </div>
  );
});
