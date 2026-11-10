import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Ellipsis, type LucideIcon } from 'lucide-react';

export interface ItemDoMenu {
  icone: LucideIcon;
  rotulo: string;
  /** Tecla de atalho, mostrada à direita. */
  atalho?: string;
  /** O painel desse item está aberto. */
  ativo?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface GrupoDoMenu {
  titulo: string;
  itens: ItemDoMenu[];
}

/** O menu da barra não passa daqui para cima: logo abaixo do cabeçalho da página. */
const TOPO_MINIMO = 54;

interface Props {
  grupos: GrupoDoMenu[];
  /** `barra` é o botão da barra da esquerda (a lista abre à direita dele); `topo` é um ícone do topo (a lista abre embaixo, à direita). */
  variante?: 'barra' | 'topo';
  icone?: LucideIcon;
  rotulo?: string;
}

/**
 * O botão "Mais" da barra de ferramentas: abre uma lista com texto (ícone e nome) dos painéis e ferramentas
 * que não precisam ficar sempre à mão. A lista é `fixed` para não ser cortada quando a barra rola (celular e
 * janela baixa) e fecha ao clicar fora, no Esc ou depois de escolher um item.
 */
export const MenuMais = ({ grupos, variante = 'barra', icone: Icone = Ellipsis, rotulo = 'Mais painéis e ferramentas' }: Props) => {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ left?: number; right?: number; top?: number; bottom?: number }>({ left: 60, bottom: 12 });
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLDivElement>(null);

  // A lista abre para cima a partir do botão; se for alta demais para o espaço que sobra em cima (janela baixa,
  // muitos itens), ela desce o que for preciso para o topo não ficar atrás do cabeçalho.
  useLayoutEffect(() => {
    if (!aberto || variante !== 'barra') return;
    const caixa = lista.current?.getBoundingClientRect();
    if (!caixa || caixa.top >= TOPO_MINIMO) return;
    setPosicao((atual) => ({ ...atual, bottom: Math.max(12, (atual.bottom ?? 12) - (TOPO_MINIMO - caixa.top)) }));
  }, [aberto, variante]);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      setAberto(false);
    };
    document.addEventListener('pointerdown', fora, true);
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('pointerdown', fora, true);
      document.removeEventListener('keydown', tecla, true);
    };
  }, [aberto]);

  const alternar = () => {
    if (!aberto && botao.current) {
      const caixa = botao.current.getBoundingClientRect();
      setPosicao(variante === 'topo'
        ? { top: caixa.bottom + 8, right: Math.max(8, window.innerWidth - caixa.right) }
        : { left: caixa.right + 10, bottom: Math.max(12, window.innerHeight - caixa.bottom) });
    }
    setAberto((v) => !v);
  };

  const algumAtivo = grupos.some((grupo) => grupo.itens.some((item) => item.ativo));

  return (
    <div className="mapa-menu-mais-ancora" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className={variante === 'topo' ? `mapa-icone${aberto || algumAtivo ? ' ativo' : ''}` : `mapa-ferramenta${aberto || algumAtivo ? ' ativo' : ''}`}
        aria-label={rotulo}
        title={variante === 'topo' ? rotulo : undefined}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={alternar}
      >
        <Icone size={variante === 'topo' ? 17 : 18} />
        {!aberto && variante === 'barra' && <span className="mapa-dica-flutuante" role="tooltip">{rotulo}</span>}
      </button>
      {aberto && (
        <div ref={lista} className={`mapa-menu-mais${variante === 'topo' ? ' topo' : ''}`} role="menu" aria-label={rotulo} style={posicao}>
          {grupos.filter((grupo) => grupo.itens.length > 0).map((grupo) => (
            <div key={grupo.titulo} role="group" aria-label={grupo.titulo} className="mapa-menu-mais-secao">
              <span className="mapa-menu-mais-grupo">{grupo.titulo}</span>
              {grupo.itens.map((item) => (
                <button
                  key={item.rotulo}
                  type="button"
                  role="menuitem"
                  className={item.ativo ? 'ativo' : ''}
                  disabled={item.disabled}
                  onClick={() => {
                    setAberto(false);
                    item.onClick();
                  }}
                >
                  <item.icone size={17} />
                  <span>{item.rotulo}</span>
                  {item.atalho && <kbd>{item.atalho}</kbd>}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
