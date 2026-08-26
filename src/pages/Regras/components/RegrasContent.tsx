import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Dices, List, X } from 'lucide-react';
import { sanitizeRuleHtml } from '../../../services/sanitizeRuleHtml';

interface RegrasContentProps {
  htmlContent: string;
  ocultarCatalogoAflicoes?: boolean;
  ocultarCatalogoPericias?: boolean;
}

interface TocItem {
  id: string;
  text: string;
}

const slugTitulo = (titulo: string, indice: number) => {
  const slug = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `secao-${slug || indice}`;
};

const normalizarTitulo = (titulo: string) => titulo
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

export const RegrasContent = ({
  htmlContent,
  ocultarCatalogoAflicoes = false,
  ocultarCatalogoPericias = false,
}: RegrasContentProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [secaoAtiva, setSecaoAtiva] = useState<string>('');
  const [sumarioMovelAberto, setSumarioMovelAberto] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return undefined;

    container.innerHTML = sanitizeRuleHtml(htmlContent);
    const secoesOcultas = new Set([
      ...(ocultarCatalogoAflicoes ? ['catalogo de aflicoes'] : []),
      ...(ocultarCatalogoPericias ? ['catalogo de pericias'] : []),
    ]);
    Array.from(container.querySelectorAll('h3'))
      .filter((header) => secoesOcultas.has(normalizarTitulo(header.textContent || '')))
      .forEach((cabecalhoCatalogo) => {
        let proximo = cabecalhoCatalogo.nextSibling;
        while (proximo) {
          const atual = proximo;
          proximo = proximo.nextSibling;
          if (atual instanceof HTMLHeadingElement && atual.tagName === 'H3') break;
          atual.remove();
        }
        cabecalhoCatalogo.remove();
      });
    const headers = Array.from(container.querySelectorAll('h3'));
    const novoToc = headers.map((header, index) => {
      const id = slugTitulo(header.textContent || 'Tópico', index);
      header.id = id;
      return { id, text: header.textContent || 'Tópico' };
    });
    setToc(novoToc);
    setSecaoAtiva(novoToc[0]?.id || '');

    const diceRegex = /\b(\d+)d(\d+)(?:\+(\d+))?\b/g;
    const walkDOM = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const rawText = node.nodeValue || '';
        if (!node.parentNode || (node.parentNode as HTMLElement).tagName === 'BUTTON') return;
        diceRegex.lastIndex = 0;
        const matches = Array.from(rawText.matchAll(diceRegex));
        if (!matches.length) return;
        const fragment = document.createDocumentFragment();
        let cursor = 0;
        matches.forEach((match) => {
          const index = match.index ?? cursor;
          fragment.appendChild(document.createTextNode(rawText.slice(cursor, index)));
          const expression = match[0];
          const button = document.createElement('button');
          button.type = 'button';
          button.setAttribute('aria-label', `Rolar ${expression}`);
          button.className = 'dice-roll-btn mx-1 inline-flex items-center gap-1 rounded border border-fuchsia-500/40 bg-fuchsia-600/20 px-2 py-0.5 font-bold text-fuchsia-300 transition-colors hover:bg-fuchsia-500 hover:text-white';
          button.dataset.dice = expression;
          const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          icon.setAttribute('aria-hidden', 'true');
          icon.setAttribute('width', '12');
          icon.setAttribute('height', '12');
          icon.setAttribute('viewBox', '0 0 24 24');
          icon.setAttribute('fill', 'none');
          icon.setAttribute('stroke', 'currentColor');
          icon.setAttribute('stroke-width', '2');
          icon.innerHTML = '<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>';
          button.append(icon, document.createTextNode(expression));
          fragment.appendChild(button);
          cursor = index + expression.length;
        });
        fragment.appendChild(document.createTextNode(rawText.slice(cursor)));
        node.parentNode.replaceChild(fragment, node);
        return;
      }
      Array.from(node.childNodes).forEach(walkDOM);
    };
    Array.from(container.childNodes).forEach(walkDOM);

    const handleDiceClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('.dice-roll-btn');
      const expression = button?.dataset.dice;
      if (!expression) return;
      const match = expression.match(/(\d+)d(\d+)(?:\+(\d+))?/);
      if (!match) return;

      const quantity = Number.parseInt(match[1], 10);
      const faces = Number.parseInt(match[2], 10);
      const bonus = match[3] ? Number.parseInt(match[3], 10) : 0;
      const rolls = Array.from({ length: quantity }, () => Math.floor(Math.random() * faces) + 1);
      const total = rolls.reduce((sum, roll) => sum + roll, bonus);
      setToastMessage(`Rolou ${expression}: [${rolls.join(', ')}]${bonus ? ` + ${bonus}` : ''} = ${total}`);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4000);
    };
    container.addEventListener('click', handleDiceClick);

    const reader = document.getElementById('regra-leitor');
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(
      (entries) => {
        const visivel = entries.find((entry) => entry.isIntersecting);
        if (visivel?.target.id) setSecaoAtiva(visivel.target.id);
      },
      { root: reader, rootMargin: '-12% 0px -72% 0px', threshold: 0 },
    ) : null;
    headers.forEach((header) => observer?.observe(header));

    return () => {
      container.removeEventListener('click', handleDiceClick);
      observer?.disconnect();
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [htmlContent, ocultarCatalogoAflicoes, ocultarCatalogoPericias]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setSecaoAtiva(id);
    setSumarioMovelAberto(false);
  };

  const sumario = toc.length ? (
    <ul className="space-y-1">
      {toc.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => scrollTo(item.id)}
            aria-current={secaoAtiva === item.id ? 'location' : undefined}
            className={`w-full rounded-lg border-l-2 px-3 py-2 text-left text-xs leading-relaxed transition-colors ${secaoAtiva === item.id
              ? 'border-[#c7a44c] bg-[#c7a44c]/10 text-[#dcc37f]'
              : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'}`}
          >
            {item.text}
          </button>
        </li>
      ))}
    </ul>
  ) : null;

  return (
    <div className="relative flex items-start gap-10">
      {toastMessage ? createPortal(
        <div role="status" className="fixed bottom-6 right-6 z-[9999] flex min-w-[280px] max-w-[calc(100vw-3rem)] items-center gap-3 rounded-xl border border-[#c7a44c]/40 bg-[#111017]/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <span className="rounded-full bg-[#c7a44c]/20 p-2 text-[#d8bd75]"><Dices size={21} /></span>
          <span className="min-w-0 flex-1 font-mono text-xs font-bold sm:text-sm">{toastMessage}</span>
          <button type="button" onClick={() => setToastMessage(null)} aria-label="Fechar resultado" className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>,
        document.body,
      ) : null}

      <div className="min-w-0 flex-1">
        {toc.length ? (
          <div className="sticky top-0 z-20 mb-7 rounded-xl border border-white/10 bg-[#121018]/95 p-2 shadow-xl backdrop-blur-xl xl:hidden">
            <button
              type="button"
              onClick={() => setSumarioMovelAberto((aberto) => !aberto)}
              aria-expanded={sumarioMovelAberto}
              className="flex w-full items-center justify-between px-2 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[#d8bd75]"
            >
              <span className="flex items-center gap-2"><List size={15} /> Neste capítulo</span>
              <ChevronDown size={15} className={`transition-transform ${sumarioMovelAberto ? 'rotate-180' : ''}`} />
            </button>
            {sumarioMovelAberto ? <div className="max-h-64 overflow-y-auto px-1 pb-2 pt-1">{sumario}</div> : null}
          </div>
        ) : null}

        <div ref={contentRef} className="regras-content max-w-[78ch] text-[15px] leading-7 text-gray-300 sm:text-base sm:leading-8" />
      </div>

      {toc.length ? (
        <aside className="sticky top-6 hidden w-56 shrink-0 xl:block" aria-label="Sumário deste capítulo">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
              <List size={14} /> Neste capítulo
            </h2>
            {sumario}
          </div>
        </aside>
      ) : null}
    </div>
  );
};
