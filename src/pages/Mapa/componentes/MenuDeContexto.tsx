import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ItemDoMenu } from './MenuMais';

interface Props {
  /** Onde o clique aconteceu, em px da janela. */
  x: number;
  y: number;
  /** O que foi clicado ("Lobo Cinzento", "Aqui no mapa"). */
  titulo: string;
  itens: ItemDoMenu[];
  onFechar: () => void;
}

/** Folga entre o menu e a borda da janela. */
const MARGEM = 8;

/**
 * O menu do botão direito no mapa (toque longo no celular): as ações que cabem naquele token ou naquele ponto.
 * Abre onde o clique foi, sem sair da janela, e fecha ao escolher, clicar fora, rolar a roda ou apertar Esc.
 */
export const MenuDeContexto = ({ x, y, titulo, itens, onFechar }: Props) => {
  const raiz = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const caixa = raiz.current?.getBoundingClientRect();
    if (!caixa) return;
    setPosicao({
      left: Math.max(MARGEM, Math.min(x, window.innerWidth - caixa.width - MARGEM)),
      top: Math.max(MARGEM, Math.min(y, window.innerHeight - caixa.height - MARGEM)),
    });
  }, [x, y, itens.length]);

  useEffect(() => {
    const fora = (evento: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) onFechar();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      onFechar();
    };
    document.addEventListener('pointerdown', fora, true);
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('wheel', onFechar, { passive: true });
    window.addEventListener('resize', onFechar);
    window.addEventListener('blur', onFechar);
    return () => {
      document.removeEventListener('pointerdown', fora, true);
      document.removeEventListener('keydown', tecla, true);
      window.removeEventListener('wheel', onFechar);
      window.removeEventListener('resize', onFechar);
      window.removeEventListener('blur', onFechar);
    };
  }, [onFechar]);

  return (
    <div ref={raiz} className="mapa-menu-mais mapa-menu-contexto" role="menu" aria-label={titulo} style={posicao} onContextMenu={(evento) => evento.preventDefault()}>
      <span className="mapa-menu-mais-grupo">{titulo}</span>
      {itens.map((item) => (
        <button
          key={item.rotulo}
          type="button"
          role="menuitem"
          className={item.ativo ? 'ativo' : ''}
          disabled={item.disabled}
          onClick={() => {
            onFechar();
            item.onClick();
          }}
        >
          <item.icone size={16} />
          <span>{item.rotulo}</span>
          {item.atalho && <kbd>{item.atalho}</kbd>}
        </button>
      ))}
    </div>
  );
};
