import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Dices, List, X } from 'lucide-react';

interface RegrasContentProps {
  htmlContent: string;
}

interface TocItem {
  id: string;
  text: string;
}

export const RegrasContent: React.FC<RegrasContentProps> = ({ htmlContent }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const container = contentRef.current;

    // 1. Geração de ToC dinâmico a partir dos H3
    const headers = container.querySelectorAll('h3');
    const newToc: TocItem[] = [];
    headers.forEach((h, index) => {
      const id = `regras-heading-${index}`;
      h.id = id;
      newToc.push({ id, text: h.textContent || 'Tópico' });
    });
    setToc(newToc);

    // 2. Interceptação de Fórmulas de Dado (ex: 1d20+4, 1d6)
    const diceRegex = /\b(\d+)d(\d+)(?:\+(\d+))?\b/g;
    
    // Process text nodes to replace regex with buttons.
    const walkDOM = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue || '';
        if (diceRegex.test(text) && node.parentNode && (node.parentNode as HTMLElement).tagName !== 'BUTTON') {
          const wrapper = document.createElement('span');
          wrapper.innerHTML = text.replace(diceRegex, `<button class="dice-roll-btn px-2 py-0.5 mx-1 bg-fuchsia-600/20 border border-fuchsia-500/50 text-fuchsia-400 font-bold rounded flex inline-flex items-center gap-1 hover:bg-fuchsia-500 hover:text-white transition-colors cursor-pointer" data-dice="$&"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/></svg> $&</button>`);
          node.parentNode.replaceChild(wrapper, node);
        }
      } else {
        Array.from(node.childNodes).forEach(walkDOM);
      }
    };
    
    // We clone the innerHTML to avoid React issues, but since it's dangerouslySetInnerHTML, we can just manipulate it once.
    // Reset innerHTML before replacing to avoid infinite loops on re-renders
    container.innerHTML = htmlContent;
    
    // Re-apply headers ID
    container.querySelectorAll('h3').forEach((h, index) => {
      h.id = `regras-heading-${index}`;
    });

    Array.from(container.childNodes).forEach(walkDOM);

    // 3. Event Listener para os botões de dado
    const handleDiceClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.dice-roll-btn') as HTMLElement;
      if (!btn) return;
      
      const diceExpr = btn.getAttribute('data-dice');
      if (diceExpr) {
        // Roll dice logic
        const match = diceExpr.match(/(\d+)d(\d+)(?:\+(\d+))?/);
        if (match) {
          const qtd = parseInt(match[1]);
          const faces = parseInt(match[2]);
          const bonus = match[3] ? parseInt(match[3]) : 0;
          
          let total = 0;
          const rolls = [];
          for (let i = 0; i < qtd; i++) {
            const roll = Math.floor(Math.random() * faces) + 1;
            rolls.push(roll);
            total += roll;
          }
          total += bonus;
          
          setToastMessage(`Rolou ${diceExpr}: [${rolls.join(', ')}] ${bonus ? `+ ${bonus}` : ''} = ${total}`);
          
          // Auto-hide após 4 segundos
          setTimeout(() => {
            setToastMessage(null);
          }, 4000);
        }
      }
    };

    container.addEventListener('click', handleDiceClick);
    return () => {
      container.removeEventListener('click', handleDiceClick);
    };
  }, [htmlContent]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-8 relative">
      {/* LOCAL TOAST FOR DICE ROLLS VIA PORTAL TO ESCAPE MOTION.DIV CLIPPING */}
      {toastMessage && createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] bg-[#0f0e15]/90 backdrop-blur-xl border border-yellow-600/50 p-4 rounded-xl shadow-2xl flex items-center gap-4 text-white min-w-[300px]">
          <div className="p-2 bg-yellow-600/20 rounded-full text-yellow-500">
            <Dices size={24} />
          </div>
          <div className="flex-1 font-bold font-mono text-sm">
            {toastMessage}
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>,
        document.body
      )}

      <div 
        ref={contentRef}
        className="regras-content text-gray-300 leading-relaxed space-y-6 flex-1 min-w-0"
      />
      
      {toc.length > 0 && (
        <div className="w-full xl:w-64 flex-shrink-0">
          <div className="sticky top-6 bg-black/40 border border-white/10 p-4 rounded-2xl">
            <h4 className="text-xs uppercase tracking-widest font-bold text-gray-500 mb-4 flex items-center gap-2">
              <List size={14} /> Neste Tópico
            </h4>
            <ul className="flex flex-col gap-2">
              {toc.map(item => (
                <li key={item.id}>
                  <button 
                    onClick={() => scrollTo(item.id)}
                    className="text-sm text-gray-400 hover:text-yellow-500 text-left w-full transition-colors truncate"
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
