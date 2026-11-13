import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search, type LucideIcon } from 'lucide-react';
import { filtrarComandos, proximoIndice, type ComandoBase } from './paletaConta';

export interface ComandoDoMapa extends ComandoBase {
  icone: LucideIcon;
  /** Tecla de atalho, mostrada à direita. */
  atalho?: string;
  /** O painel ou a ferramenta desse comando está em uso agora. */
  ativo?: boolean;
  executar: () => void;
}

interface Props {
  comandos: ComandoDoMapa[];
  onFechar: () => void;
}

/**
 * A central de comandos do mapa (Ctrl+K, a barra / ou a lupa do topo): uma caixa de busca com tudo o que a
 * pessoa pode fazer ali. Digitar filtra, as setas andam, Enter faz e Esc fecha.
 */
export const PaletaDeComandos = ({ comandos, onFechar }: Props) => {
  const [busca, setBusca] = useState('');
  const [marcado, setMarcado] = useState(0);
  const lista = useRef<HTMLDivElement>(null);

  const grupos = useMemo(() => filtrarComandos(comandos, busca), [comandos, busca]);
  const itens = useMemo(() => grupos.flatMap((grupo) => grupo.itens), [grupos]);

  // A cada busca nova a marca volta para o primeiro que dá para usar.
  useEffect(() => {
    const primeiro = itens.findIndex((item) => !item.disabled);
    setMarcado(primeiro < 0 ? 0 : primeiro);
  }, [busca]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    lista.current?.querySelector('[data-marcado="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [marcado]);

  const fazer = (comando: ComandoDoMapa | undefined) => {
    if (!comando || comando.disabled) return;
    onFechar();
    comando.executar();
  };

  const aoTeclar = (evento: React.KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopPropagation();
      onFechar();
    } else if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      setMarcado((atual) => proximoIndice(itens, atual, evento.key === 'ArrowDown' ? 1 : -1));
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      fazer(itens[marcado]);
    }
  };

  let indice = -1;
  return (
    <div className="mapa-paleta-fundo" onPointerDown={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}>
      <section className="mapa-paleta" role="dialog" aria-modal="true" aria-label="Central de comandos do mapa" onKeyDown={aoTeclar}>
        <label className="mapa-paleta-busca">
          <Search size={17} />
          <input
            autoFocus
            value={busca}
            maxLength={60}
            placeholder="O que você quer fazer? Ex.: chuva, régua, nome de um token"
            aria-label="Buscar comando, painel, cena ou token"
            role="combobox"
            aria-expanded="true"
            aria-controls="mapa-paleta-lista"
            aria-activedescendant={itens[marcado] ? `mapa-paleta-${itens[marcado].id}` : undefined}
            onChange={(evento) => setBusca(evento.target.value)}
          />
          <kbd>Esc</kbd>
        </label>
        <div className="mapa-paleta-lista" id="mapa-paleta-lista" role="listbox" ref={lista}>
          {grupos.map((grupo) => (
            <div key={grupo.titulo} role="group" aria-label={grupo.titulo}>
              <span className="mapa-paleta-grupo">{grupo.titulo}</span>
              {grupo.itens.map((item) => {
                indice += 1;
                const meu = indice;
                return (
                  <button
                    key={item.id}
                    id={`mapa-paleta-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={meu === marcado}
                    data-marcado={meu === marcado}
                    className={`${meu === marcado ? 'marcado' : ''}${item.ativo ? ' ativo' : ''}`}
                    disabled={item.disabled}
                    onPointerMove={() => { if (!item.disabled && marcado !== meu) setMarcado(meu); }}
                    onClick={() => fazer(item)}
                  >
                    <item.icone size={17} />
                    <span className="mapa-paleta-texto">
                      <strong>{item.rotulo}</strong>
                      {item.descricao && <small>{item.descricao}</small>}
                    </span>
                    {item.ativo && <em>Em uso</em>}
                    {item.atalho && <kbd>{item.atalho}</kbd>}
                  </button>
                );
              })}
            </div>
          ))}
          {!itens.length && <p className="mapa-paleta-vazio">Nada com esse nome aqui. Tente outra palavra, como o nome de um painel ou de um token.</p>}
        </div>
        <footer className="mapa-paleta-rodape">
          <span><kbd>↑</kbd><kbd>↓</kbd> escolher</span>
          <span><kbd><CornerDownLeft size={11} /></kbd> fazer</span>
          <span><kbd>Ctrl</kbd><kbd>K</kbd> abre de qualquer lugar do mapa</span>
        </footer>
      </section>
    </div>
  );
};
