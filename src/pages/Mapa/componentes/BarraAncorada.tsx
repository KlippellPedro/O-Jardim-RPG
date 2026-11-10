import { useEffect, useRef, type ReactNode } from 'react';
import type { PalcoMapa } from '../motor/palco';
import { posicaoDaBarra } from './barraAncoradaConta';
import './mapasColocados.css';

interface Props {
  /** Devolve o palco de agora (ele nasce depois da página). */
  palco: () => PalcoMapa | null;
  alvo: { tipo: 'mapa' | 'token'; id: string };
  /** Espaço a deixar livre embaixo, para não cobrir a barra do Acervo. */
  reservaEmbaixo?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Cola uma barra no objeto escolhido (mapa ou token), como no Owlbear: ela fica logo abaixo dele e o segue enquanto
 * ele anda, ou o mapa dá zoom. Quando o objeto é maior que a tela, ou está perto do fundo, a barra desce só até o
 * limite acima da barra do Acervo. O lugar muda direto no estilo (sem renderizar o React a cada quadro).
 */
export const BarraAncorada = ({ palco, alvo, reservaEmbaixo = 70, className = '', children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let quadro = 0;
    let ultima = '';
    const atualizar = () => {
      const elemento = ref.current;
      const pai = elemento?.parentElement;
      const retangulo = palco()?.retanguloNaTela(alvo) ?? null;
      if (elemento && pai) {
        const { x, y } = posicaoDaBarra(retangulo, { largura: pai.clientWidth, altura: pai.clientHeight }, { largura: elemento.offsetWidth, altura: elemento.offsetHeight }, reservaEmbaixo);
        const transformacao = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        if (transformacao !== ultima) {
          ultima = transformacao;
          elemento.style.transform = transformacao;
        }
        elemento.style.visibility = retangulo ? 'visible' : 'hidden';
      }
      quadro = requestAnimationFrame(atualizar);
    };
    quadro = requestAnimationFrame(atualizar);
    return () => cancelAnimationFrame(quadro);
  }, [palco, alvo.tipo, alvo.id, reservaEmbaixo]);

  return (
    <div ref={ref} className={`mapa-ancorada ${className}`.trim()} style={{ visibility: 'hidden' }}>
      {children}
    </div>
  );
};
