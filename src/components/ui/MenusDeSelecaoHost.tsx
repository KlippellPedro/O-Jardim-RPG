import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as TeclaReact } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search } from 'lucide-react';
import {
  OPCOES_PARA_BUSCA,
  acharPorPrefixo,
  aplicarValor,
  andar,
  ehSelectEstilizavel,
  filtrar,
  lerItens,
  opcaoInicial,
  posicionar,
  primeira,
  ultima,
  type ItemOpcao,
} from './menuDeSelecao';
import './menusDeSelecao.css';

const ATRIBUTO = 'data-menu-de-selecao';

/** O que o rótulo do campo diz, para quem usa leitor de tela. */
function nomeDoSelect(select: HTMLSelectElement): string {
  return select.getAttribute('aria-label')
    || select.labels?.[0]?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
    || 'Opções';
}

interface MenuProps {
  select: HTMLSelectElement;
  onFechar: (devolverFoco: boolean) => void;
}

const Menu = ({ select, onFechar }: MenuProps) => {
  const itensTodos = useMemo(() => lerItens(select), [select]);
  const comBusca = itensTodos.filter((item) => item.tipo === 'opcao').length > OPCOES_PARA_BUSCA;
  const [termo, setTermo] = useState('');
  const itens = useMemo(() => filtrar(itensTodos, termo), [itensTodos, termo]);
  const [ativo, setAtivo] = useState(() => opcaoInicial(itensTodos));
  const [lugar, setLugar] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null);
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const digitado = useRef({ texto: '', limpar: 0 });

  const reposicionar = useCallback(() => {
    const caixa = select.getBoundingClientRect();
    const altura = raiz.current?.scrollHeight ?? 240;
    setLugar(posicionar(caixa, { largura: document.documentElement.clientWidth, altura: document.documentElement.clientHeight }, altura));
  }, [select]);

  // Mede depois de pintar, para saber se cabe embaixo; refaz quando o filtro muda a altura da lista.
  useLayoutEffect(() => {
    reposicionar();
  }, [reposicionar, itens.length]);

  // A busca recebe o foco; sem busca, o próprio menu recebe, para as setas funcionarem. Só depois de posicionado:
  // enquanto o menu está escondido (visibility: hidden) o navegador não aceita foco, e a tecla iria para o <select>.
  const posicionado = lugar !== null;
  useEffect(() => {
    if (posicionado) (campo.current ?? raiz.current)?.focus({ preventScroll: true });
  }, [posicionado]);

  // Enquanto o termo muda, a opção ativa tem de continuar uma que está na lista.
  useEffect(() => {
    if (ativo < 0 || itens[ativo]?.tipo !== 'opcao') setAtivo(opcaoInicial(itens));
  }, [itens, ativo]);

  useEffect(() => {
    lista.current?.querySelector<HTMLElement>('[data-ativo="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [ativo, lugar]);

  // Como no menu nativo: rolar a página, mexer na janela ou o campo sumir fecha o menu.
  useEffect(() => {
    const aoRolar = (evento: Event) => {
      if (raiz.current?.contains(evento.target as Node)) return;
      onFechar(false);
    };
    const aoRedimensionar = () => onFechar(false);
    const vigia = window.setInterval(() => {
      if (!select.isConnected || select.disabled) onFechar(false);
    }, 300);
    window.addEventListener('scroll', aoRolar, true);
    window.addEventListener('resize', aoRedimensionar);
    window.addEventListener('blur', aoRedimensionar);
    return () => {
      window.removeEventListener('scroll', aoRolar, true);
      window.removeEventListener('resize', aoRedimensionar);
      window.removeEventListener('blur', aoRedimensionar);
      window.clearInterval(vigia);
      window.clearTimeout(digitado.current.limpar);
    };
  }, [select, onFechar]);

  const escolher = (indice: number) => {
    const item = itens[indice];
    if (!item || item.tipo !== 'opcao' || item.desativada) return;
    aplicarValor(select, item.valor);
    onFechar(true);
  };

  const aoTeclar = (evento: TeclaReact<HTMLDivElement>) => {
    const parar = () => { evento.preventDefault(); evento.stopPropagation(); };
    switch (evento.key) {
      case 'ArrowDown': parar(); setAtivo((atual) => andar(itens, atual, 1)); return;
      case 'ArrowUp': parar(); setAtivo((atual) => andar(itens, atual, -1)); return;
      case 'PageDown': parar(); setAtivo((atual) => andar(itens, atual, 8)); return;
      case 'PageUp': parar(); setAtivo((atual) => andar(itens, atual, -8)); return;
      case 'Home': if (!comBusca) { parar(); setAtivo(primeira(itens)); } return;
      case 'End': if (!comBusca) { parar(); setAtivo(ultima(itens)); } return;
      case 'Enter': parar(); escolher(ativo); return;
      case 'Escape':
        parar();
        evento.nativeEvent.stopImmediatePropagation();
        onFechar(true);
        return;
      case 'Tab': parar(); onFechar(true); return;
      default:
    }
    // Sem campo de busca, digitar uma letra pula para a opção que começa com ela.
    if (!comBusca && evento.key.length === 1 && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
      if (evento.key === ' ' && !digitado.current.texto) {
        parar();
        escolher(ativo);
        return;
      }
      parar();
      window.clearTimeout(digitado.current.limpar);
      digitado.current.texto += evento.key;
      digitado.current.limpar = window.setTimeout(() => { digitado.current.texto = ''; }, 700);
      const achada = acharPorPrefixo(itens, ativo, digitado.current.texto);
      if (achada >= 0) setAtivo(achada);
    }
  };

  const semOpcoes = !itens.some((item) => item.tipo === 'opcao');

  return createPortal(
    <div
      ref={raiz}
      {...{ [ATRIBUTO]: '' }}
      className="menu-selecao"
      role="presentation"
      tabIndex={-1}
      style={{ top: lugar?.top ?? 0, left: lugar?.left ?? 0, width: lugar?.width, maxHeight: lugar?.maxHeight, visibility: lugar ? 'visible' : 'hidden' }}
      onKeyDown={aoTeclar}
      onPointerDown={(evento) => evento.stopPropagation()}
      onMouseDown={(evento) => evento.stopPropagation()}
    >
      {comBusca && (
        <label className="menu-selecao-busca">
          <Search size={14} aria-hidden="true" />
          <input
            ref={campo}
            type="text"
            value={termo}
            onChange={(evento) => setTermo(evento.target.value)}
            placeholder="Buscar..."
            aria-label="Filtrar as opções"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      )}
      <div ref={lista} className="menu-selecao-lista custom-scrollbar" role="listbox" aria-label={nomeDoSelect(select)}>
        {itens.map((item, indice) => {
          if (item.tipo === 'grupo') {
            return <div key={`g${indice}`} className="menu-selecao-grupo" role="presentation">{item.rotulo}</div>;
          }
          const opcao: ItemOpcao = item;
          return (
            <button
              key={`o${indice}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={opcao.selecionada}
              disabled={opcao.desativada}
              data-ativo={ativo === indice}
              className={`menu-selecao-opcao${opcao.selecionada ? ' marcada' : ''}${ativo === indice ? ' ativa' : ''}`}
              onMouseMove={() => { if (ativo !== indice && !opcao.desativada) setAtivo(indice); }}
              onClick={() => escolher(indice)}
            >
              <span>{opcao.rotulo || ' '}</span>
              {opcao.selecionada && <Check size={14} aria-hidden="true" />}
            </button>
          );
        })}
        {semOpcoes && <div className="menu-selecao-vazio">Nada encontrado.</div>}
      </div>
    </div>,
    document.body,
  );
};

/**
 * Troca a lista nativa de TODO <select> do site por uma do próprio site: o menu
 * do sistema abre branco no Windows e some o texto. Mouse e caneta abrem o menu
 * nosso; o toque continua com a lista do aparelho, que lá já é escura e grande.
 * Para um select ficar como veio, ponha `data-menu-nativo` nele.
 */
export const MenusDeSelecaoHost = () => {
  const [aberto, setAberto] = useState<HTMLSelectElement | null>(null);
  const abertoRef = useRef<HTMLSelectElement | null>(null);
  const tipoDoPonteiro = useRef('mouse');
  abertoRef.current = aberto;

  const fechar = useCallback((devolverFoco: boolean) => {
    const select = abertoRef.current;
    setAberto(null);
    if (devolverFoco) select?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const noPonteiro = (evento: PointerEvent) => { tipoDoPonteiro.current = evento.pointerType || 'mouse'; };
    const noMouse = (evento: MouseEvent) => {
      const alvo = evento.target instanceof Element ? evento.target : null;
      if (alvo?.closest(`[${ATRIBUTO}]`)) return;
      const select = alvo?.closest('select') ?? null;
      if (evento.button === 0 && tipoDoPonteiro.current !== 'touch' && ehSelectEstilizavel(select)) {
        // Sem isto o sistema abre a lista dele por cima da nossa.
        evento.preventDefault();
        evento.stopPropagation();
        select.focus({ preventScroll: true });
        setAberto((atual) => (atual === select ? null : select));
        return;
      }
      if (abertoRef.current) setAberto(null);
    };
    const naTecla = (evento: KeyboardEvent) => {
      const alvo = evento.target;
      if (!ehSelectEstilizavel(alvo) || abertoRef.current) return;
      const abre = evento.key === ' ' || evento.key === 'F4' || (evento.altKey && (evento.key === 'ArrowDown' || evento.key === 'ArrowUp'));
      if (!abre) return;
      evento.preventDefault();
      setAberto(alvo);
    };
    document.addEventListener('pointerdown', noPonteiro, true);
    document.addEventListener('mousedown', noMouse, true);
    document.addEventListener('keydown', naTecla, true);
    return () => {
      document.removeEventListener('pointerdown', noPonteiro, true);
      document.removeEventListener('mousedown', noMouse, true);
      document.removeEventListener('keydown', naTecla, true);
    };
  }, []);

  return aberto ? <Menu key={aberto.id || undefined} select={aberto} onFechar={fechar} /> : null;
};
