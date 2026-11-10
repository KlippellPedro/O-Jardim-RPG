import { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';
import { atalhosVisiveis } from './atalhosDoMapa';

interface Props {
  gestor: boolean;
  onFechar: () => void;
}

/** A folha de atalhos do mapa (tecla ? ou o menu Exibição): janela por cima de tudo, fecha com Esc, ? ou clicando fora. */
export const FolhaDeAtalhos = ({ gestor, onFechar }: Props) => {
  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      onFechar();
    };
    document.addEventListener('keydown', tecla, true);
    return () => document.removeEventListener('keydown', tecla, true);
  }, [onFechar]);

  return (
    <div className="mapa-atalhos-fundo" onPointerDown={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}>
      <section className="mapa-atalhos" role="dialog" aria-modal="true" aria-label="Atalhos do mapa">
        <header>
          <div><Keyboard size={17} /><strong>Atalhos do mapa</strong></div>
          <button type="button" className="mapa-icone" aria-label="Fechar os atalhos" autoFocus onClick={onFechar}><X size={17} /></button>
        </header>
        <div className="mapa-atalhos-grade">
          {atalhosVisiveis(gestor).map((grupo) => (
            <div key={grupo.titulo} className="mapa-atalhos-grupo">
              <h3>{grupo.titulo}</h3>
              <dl>
                {grupo.itens.map((item) => (
                  <div key={`${item.teclas.join('+')}-${item.descricao}`}>
                    <dt>{item.teclas.map((tecla, indice) => (
                      <span key={tecla}>{indice > 0 && <i>+</i>}<kbd>{tecla}</kbd></span>
                    ))}</dt>
                    <dd>{item.descricao}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
