import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import './busca.css';

const BuscaDoJardim = lazy(() => import('./BuscaDoJardim').then((modulo) => ({ default: modulo.BuscaDoJardim })));

const campoDeTexto = (alvo: EventTarget | null): boolean => (
  alvo instanceof HTMLElement
  && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))
);

/** O botão de lupa e os atalhos (Ctrl+K ou Cmd+K em qualquer lugar; "/" fora de campos de texto). A paleta em
 * si é um pedaço separado do código: só baixa na primeira vez que alguém abre a busca. */
export function BuscaDoJardimHost() {
  const [aberta, setAberta] = useState(false);
  const [carregada, setCarregada] = useState(false);
  // O cabeçalho da Sessão ao vivo já usa o canto direito para os controles da mesa: lá a lupa some (Ctrl+K segue valendo).
  const naSessao = useLocation().pathname.startsWith('/sessao');

  const abrir = useCallback(() => {
    setCarregada(true);
    setAberta(true);
  }, []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.defaultPrevented) return;
      const combinacao = (evento.ctrlKey || evento.metaKey) && !evento.altKey && !evento.shiftKey && evento.key.toLowerCase() === 'k';
      const barra = evento.key === '/' && !evento.ctrlKey && !evento.metaKey && !evento.altKey && !campoDeTexto(evento.target);
      if (!combinacao && !barra) return;
      evento.preventDefault();
      setCarregada(true);
      setAberta((atual) => (combinacao ? !atual : true));
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, []);

  return (
    <>
      <button
        type="button"
        className={`busca-botao${naSessao ? ' busca-botao--oculto' : ''}`}
        onClick={abrir}
        data-sfx="off"
        aria-label="Buscar no Jardim"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        title="Buscar (Ctrl+K)"
      >
        <Search size={21} />
      </button>
      {carregada ? (
        <Suspense fallback={null}>
          <BuscaDoJardim aberta={aberta} onFechar={() => setAberta(false)} />
        </Suspense>
      ) : null}
    </>
  );
}
