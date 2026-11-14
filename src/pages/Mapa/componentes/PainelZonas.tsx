import { useEffect, useRef, useState } from 'react';
import { BoxSelect, RotateCcw, Trash2, X } from 'lucide-react';
import type { IGatilhoDaZona, IZona } from '../../../services/mapaApi';
import { ARMADILHAS_PRONTAS } from '../../../../data/regras/perigosAmbiente';
import { armadilhaDoLivro, corDaZona, GATILHO_NOVO, resumoDaZona, TERRENOS, terrenoPorId } from '../motor/zonasConta';
import './painelZonas.css';

interface Props {
  aberto: boolean;
  zonas: IZona[];
  escolhida: string | null;
  onEscolher: (id: string | null) => void;
  /** O Mestre quer desenhar uma zona nova: a página liga a ferramenta. */
  onDesenhar: () => void;
  /** A lista inteira depois da mudança: o servidor guarda a cena com ela. */
  onSalvar: (zonas: IZona[]) => Promise<void> | void;
  /** Rearma os gatilhos de uma zona (ou de todas, sem id). */
  onRearmar: (id?: string) => void;
  onFechar: () => void;
}

/** O painel do Mestre para as zonas da cena: cobertura, gatilho escondido e terreno à vista, no mesmo retângulo. */
export const PainelZonas = ({ aberto, zonas: doServidor, escolhida, onEscolher, onDesenhar, onSalvar, onRearmar, onFechar }: Props) => {
  // A lista de trabalho: cada mudança parte dela (e não da que o servidor mandou por último), senão duas mudanças seguidas
  // (a cobertura e logo o terreno) mandariam a lista velha por cima da primeira.
  const [zonas, setZonas] = useState(doServidor);
  const pendentes = useRef(0);
  const doServidorRef = useRef(doServidor);
  doServidorRef.current = doServidor;
  useEffect(() => {
    if (pendentes.current === 0) setZonas(doServidor);
  }, [doServidor]);
  const zona = zonas.find((item) => item.id === escolhida) ?? null;
  const [nome, setNome] = useState(zona?.nome ?? '');
  const [textoPisador, setTextoPisador] = useState(zona?.gatilho?.texto_pisador ?? '');
  const [textoMesa, setTextoMesa] = useState(zona?.gatilho?.texto_mesa ?? '');

  useEffect(() => {
    setNome(zona?.nome ?? '');
    setTextoPisador(zona?.gatilho?.texto_pisador ?? '');
    setTextoMesa(zona?.gatilho?.texto_mesa ?? '');
  }, [zona?.id, zona?.nome, zona?.gatilho?.texto_pisador, zona?.gatilho?.texto_mesa]);

  if (!aberto) return null;

  const guardar = async (lista: IZona[]) => {
    setZonas(lista);
    pendentes.current += 1;
    try {
      await onSalvar(lista);
    } finally {
      pendentes.current -= 1;
      // Sem nada mais a caminho, vale o que o servidor devolveu (ele pode ter corrigido algo).
      if (pendentes.current === 0) setZonas(doServidorRef.current);
    }
  };
  const mudar = (mudancas: Partial<IZona>) => {
    if (!zona) return;
    void guardar(zonas.map((item) => (item.id === zona.id ? { ...item, ...mudancas } : item)));
  };
  const mudarGatilho = (mudancas: Partial<IGatilhoDaZona>) => {
    if (!zona?.gatilho) return;
    mudar({ gatilho: { ...zona.gatilho, ...mudancas } });
  };
  const apagar = () => {
    if (!zona) return;
    onEscolher(null);
    void guardar(zonas.filter((item) => item.id !== zona.id));
  };
  const carta = armadilhaDoLivro(zona?.gatilho?.armadilha);
  const terreno = terrenoPorId(zona?.terreno?.rotulo);
  const temGatilho = zonas.some((item) => item.gatilho);

  return (
    <section className="mapa-config mapa-zonas-painel" aria-label="Zonas de terreno">
      <header>
        <div><BoxSelect size={17} /><strong>Zonas de terreno</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar o painel das zonas" onClick={onFechar}><X size={16} /></button>
      </header>
      <p className="mapa-dica">Um retângulo no mapa pode dar cobertura, esconder um gatilho e marcar o terreno. Jogadores só veem o terreno que você deixar à vista.</p>

      <button type="button" className="mapa-botao-leve mapa-zonas-nova" onClick={onDesenhar}>
        <BoxSelect size={14} /> Desenhar uma zona nova (Z)
      </button>

      {zonas.length === 0 ? (
        <p className="mapa-dica">Nenhuma zona nesta cena ainda.</p>
      ) : (
        <ul className="mapa-zonas-lista">
          {zonas.map((item) => (
            <li key={item.id}>
              <button type="button" className={item.id === escolhida ? 'marcado' : ''} aria-pressed={item.id === escolhida} onClick={() => onEscolher(item.id === escolhida ? null : item.id)}>
                <i style={{ background: corDaZona(item) }} aria-hidden="true" />
                <span><strong>{item.nome}</strong><small>{resumoDaZona(item) || 'Sem função ainda'}</small></span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {zona && (
        <div className="mapa-zonas-edicao">
          <label className="mapa-menu-linha">
            <span>Nome</span>
            <input
              value={nome}
              maxLength={40}
              onChange={(evento) => setNome(evento.target.value)}
              onBlur={() => { if (nome.trim() && nome !== zona.nome) mudar({ nome: nome.trim() }); else setNome(zona.nome); }}
              onKeyDown={(evento) => { if (evento.key === 'Enter') (evento.target as HTMLInputElement).blur(); }}
            />
          </label>

          <label className="mapa-menu-linha">
            <span>Cobertura</span>
            <select value={zona.cobertura ?? ''} onChange={(evento) => mudar({ cobertura: (evento.target.value || null) as IZona['cobertura'] })}>
              <option value="">Nenhuma</option>
              <option value="parcial">Parcial (+2 de Defesa)</option>
              <option value="superior">Superior (+5 de Defesa)</option>
            </select>
          </label>
          {zona.cobertura && <p className="mapa-dica">A régua entre dois tokens avisa quando a linha atravessa esta zona. Quem está dentro dela não conta como coberto por ela.</p>}

          <label className="mapa-menu-linha">
            <span>Terreno</span>
            <select value={zona.terreno?.rotulo ?? ''} onChange={(evento) => mudar({ terreno: evento.target.value ? { rotulo: evento.target.value, visivel: zona.terreno?.visivel ?? true } : null })}>
              <option value="">Nenhum</option>
              {TERRENOS.map((item) => <option key={item.id} value={item.id}>{item.rotulo}</option>)}
            </select>
          </label>
          {zona.terreno && (
            <>
              <label className="mapa-zonas-check">
                <input type="checkbox" checked={zona.terreno.visivel} onChange={(evento) => mudar({ terreno: { rotulo: zona.terreno!.rotulo, visivel: evento.target.checked } })} />
                <span>Os jogadores veem a marca no mapa</span>
              </label>
              {terreno && <p className="mapa-dica">{terreno.ideia}</p>}
            </>
          )}

          <label className="mapa-zonas-check">
            <input type="checkbox" checked={Boolean(zona.telhado)} onChange={(evento) => mudar({ telhado: evento.target.checked })} />
            <span>É um telhado (cobre o que tem dentro até o grupo entrar)</span>
          </label>
          {zona.telhado && <p className="mapa-dica">Os jogadores veem as telhas por cima de tudo, até um jogador ou aliado entrar. Você enxerga através. O nome da zona não chega a eles.</p>}

          <label className="mapa-zonas-check">
            <input type="checkbox" checked={Boolean(zona.gatilho)} onChange={(evento) => mudar({ gatilho: evento.target.checked ? { ...GATILHO_NOVO } : null })} />
            <span>Tem gatilho (acontece algo quando um token entra)</span>
          </label>
          {zona.gatilho && (
            <div className="mapa-zonas-gatilho">
              <label className="mapa-menu-linha">
                <span>Quem entra lê</span>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={textoPisador}
                  placeholder="O chão cede sob os seus pés."
                  onChange={(evento) => setTextoPisador(evento.target.value)}
                  onBlur={() => { if (textoPisador !== zona.gatilho!.texto_pisador) mudarGatilho({ texto_pisador: textoPisador }); }}
                />
              </label>
              <label className="mapa-menu-linha">
                <span>A mesa lê</span>
                <textarea
                  rows={2}
                  maxLength={240}
                  value={textoMesa}
                  placeholder="Um estalo seco vem do corredor."
                  onChange={(evento) => setTextoMesa(evento.target.value)}
                  onBlur={() => { if (textoMesa !== zona.gatilho!.texto_mesa) mudarGatilho({ texto_mesa: textoMesa }); }}
                />
              </label>
              <label className="mapa-menu-linha">
                <span>Dispara com</span>
                <select value={zona.gatilho.quem} onChange={(evento) => mudarGatilho({ quem: evento.target.value as IGatilhoDaZona['quem'] })}>
                  <option value="jogadores">Tokens dos jogadores</option>
                  <option value="todos">Qualquer token</option>
                </select>
              </label>
              <label className="mapa-zonas-check">
                <input type="checkbox" checked={zona.gatilho.uma_vez} onChange={(evento) => mudarGatilho({ uma_vez: evento.target.checked })} />
                <span>Só na primeira vez (depois você rearma)</span>
              </label>
              <label className="mapa-menu-linha">
                <span>Armadilha pronta</span>
                <select value={zona.gatilho.armadilha ?? ''} onChange={(evento) => mudarGatilho({ armadilha: evento.target.value ? Number(evento.target.value) : null })}>
                  <option value="">Nenhuma</option>
                  {ARMADILHAS_PRONTAS.map((item) => <option key={item.d6} value={item.d6}>{item.d6}. {item.titulo}</option>)}
                </select>
              </label>
              {carta && <p className="mapa-dica"><strong>{carta.titulo}.</strong> {carta.regra} O dano e a condição nunca saem sozinhos: você decide.</p>}
              <button type="button" className="mapa-botao-leve" onClick={() => onRearmar(zona.id)}><RotateCcw size={14} /> Rearmar este gatilho</button>
            </div>
          )}

          <button type="button" className="mapa-botao-leve perigo" onClick={apagar}><Trash2 size={14} /> Apagar a zona</button>
        </div>
      )}

      {temGatilho && (
        <button type="button" className="mapa-botao-leve" onClick={() => onRearmar()}><RotateCcw size={14} /> Rearmar todos os gatilhos</button>
      )}
    </section>
  );
};
