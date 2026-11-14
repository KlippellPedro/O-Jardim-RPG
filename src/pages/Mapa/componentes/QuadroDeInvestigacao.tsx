import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as EventoDePonteiro } from 'react';
import { Eye, EyeOff, Link2, Minus, Pencil, Plus, StickyNote, Trash2, X } from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import { mapaApi, type CorDaCarta, type IAcaoDoQuadro, type ICartaDoQuadro, type IMesaExtras, type IQuadro } from '../../../services/mapaApi';
import {
  ALTURA_DA_CARTA, ALTURA_DO_QUADRO, CORES_DA_CARTA, LARGURA_DA_CARTA, LARGURA_DO_QUADRO, MAXIMO_DE_CARTAS_DO_JOGADOR, TEXTO_MAXIMO, TITULO_MAXIMO,
  barbantesDoQuadro, cartasDe, corDaCarta, jaLigadas, limitarAoQuadro, podeEditarCarta, resumoDoQuadro,
} from '../motor/quadroConta';
import './quadroDeInvestigacao.css';

interface Props {
  aberto: boolean;
  campanhaId: string;
  quadro: IQuadro | undefined;
  usuarioId: string | null;
  gestor: boolean;
  /** A mesa nova que o servidor devolve depois de cada ação (já no recorte de quem pediu). */
  onMesa: (mesa: IMesaExtras) => void;
  onFechar: () => void;
}

interface Rascunho {
  /** Vazio numa carta nova. */
  id: string | null;
  titulo: string;
  texto: string;
  cor: CorDaCarta;
  visivel: boolean;
  x: number;
  y: number;
}

const ZOOMS = [0.35, 0.5, 0.7, 1] as const;

/**
 * O mural de pistas da mesa: cartas num quadro de cortiça, ligadas por barbantes vermelhos. Todos pregam as suas cartas e
 * mexem nas dos outros (arrastar e ligar); só o autor e o Mestre editam e apagam. O Mestre guarda cartas escondidas e as
 * revela na hora certa: o servidor nem manda ao jogador a carta que ainda não é dele.
 */
export const QuadroDeInvestigacao = ({ aberto, campanhaId, quadro, usuarioId, gestor, onMesa, onFechar }: Props) => {
  const cartas = quadro?.cartas ?? [];
  const ligacoes = quadro?.ligacoes ?? [];
  const [zoomIndice, setZoomIndice] = useState(2);
  const zoom = ZOOMS[zoomIndice];
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [ligando, setLigando] = useState<{ ligado: boolean; primeira: string | null }>({ ligado: false, primeira: null });
  /** Onde a mão está levando a carta (vale até o servidor confirmar). */
  const [locais, setLocais] = useState<Record<string, { x: number; y: number }>>({});
  const [ocupado, setOcupado] = useState(false);
  const muralRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ id: string; dx: number; dy: number; saiuDoLugar: boolean; inicioX: number; inicioY: number } | null>(null);

  useEffect(() => {
    if (!aberto) {
      setRascunho(null);
      setLigando({ ligado: false, primeira: null });
    }
  }, [aberto]);

  const barbantes = useMemo(() => barbantesDoQuadro(cartas, ligacoes, locais), [cartas, ligacoes, locais]);
  const minhas = cartasDe(cartas, usuarioId);

  if (!aberto) return null;

  const fazer = async (acao: IAcaoDoQuadro, aviso?: string): Promise<boolean> => {
    setOcupado(true);
    try {
      onMesa(await mapaApi.mexerNoQuadro(campanhaId, acao));
      if (aviso) avisar.sucesso(aviso);
      return true;
    } catch (falha) {
      avisarErro(falha, 'O quadro não aceitou essa mudança.');
      return false;
    } finally {
      setOcupado(false);
    }
  };

  /** O centro do que a pessoa está vendo no mural, para a carta nova nascer à vista. */
  const centroVisivel = () => {
    const mural = muralRef.current;
    if (!mural) return limitarAoQuadro(LARGURA_DO_QUADRO / 2 - LARGURA_DA_CARTA / 2, ALTURA_DO_QUADRO / 2 - ALTURA_DA_CARTA / 2);
    return limitarAoQuadro((mural.scrollLeft + mural.clientWidth / 2) / zoom - LARGURA_DA_CARTA / 2, (mural.scrollTop + mural.clientHeight / 2) / zoom - ALTURA_DA_CARTA / 2);
  };

  const novaCarta = () => {
    if (!gestor && minhas >= MAXIMO_DE_CARTAS_DO_JOGADOR) {
      avisar.aviso(`Você já tem ${MAXIMO_DE_CARTAS_DO_JOGADOR} cartas no quadro. Apague alguma para pregar outra.`);
      return;
    }
    // Cada carta nova nasce um pouco para baixo e para a direita da anterior, para não empilhar no mesmo ponto.
    const folga = (cartas.length % 8) * 26;
    const centro = centroVisivel();
    setRascunho({ id: null, titulo: '', texto: '', cor: 'papel', visivel: true, ...limitarAoQuadro(centro.x + folga, centro.y + folga) });
  };

  const editar = (carta: ICartaDoQuadro) => setRascunho({ id: carta.id, titulo: carta.titulo, texto: carta.texto, cor: carta.cor, visivel: carta.visivel, x: carta.x, y: carta.y });

  const salvar = async () => {
    if (!rascunho) return;
    if (!rascunho.titulo.trim() && !rascunho.texto.trim()) {
      avisar.aviso('A carta precisa de um título ou de um texto.');
      return;
    }
    const acao: IAcaoDoQuadro = {
      acao: 'carta', titulo: rascunho.titulo, texto: rascunho.texto, cor: rascunho.cor,
      ...(rascunho.id ? { id: rascunho.id } : { x: rascunho.x, y: rascunho.y }),
      ...(gestor ? { visivel: rascunho.visivel } : {}),
    };
    if (await fazer(acao)) setRascunho(null);
  };

  const apagar = async (carta: ICartaDoQuadro) => {
    const ok = await confirmar({ titulo: 'Tirar a carta do quadro?', mensagem: `"${carta.titulo || carta.texto.slice(0, 30)}" e os barbantes dela saem do quadro.`, rotuloConfirmar: 'Tirar' });
    if (ok) await fazer({ acao: 'apagar', id: carta.id });
  };

  const aoClicarNaCarta = async (carta: ICartaDoQuadro) => {
    if (!ligando.ligado) return;
    if (!ligando.primeira) {
      setLigando({ ligado: true, primeira: carta.id });
      return;
    }
    if (ligando.primeira === carta.id) {
      setLigando({ ligado: true, primeira: null });
      return;
    }
    // Clicar em duas cartas já ligadas desfaz o barbante.
    const acao = jaLigadas(ligacoes, ligando.primeira, carta.id) ? 'desligar' : 'ligar';
    setLigando({ ligado: true, primeira: null });
    await fazer({ acao, de: ligando.primeira, para: carta.id });
  };

  const comecarArrasto = (evento: EventoDePonteiro<HTMLElement>, carta: ICartaDoQuadro) => {
    if (evento.button !== 0 || (evento.target as HTMLElement).closest('button')) return;
    const mural = muralRef.current;
    if (!mural) return;
    const caixa = mural.getBoundingClientRect();
    const px = (evento.clientX - caixa.left + mural.scrollLeft) / zoom;
    const py = (evento.clientY - caixa.top + mural.scrollTop) / zoom;
    arrasto.current = { id: carta.id, dx: px - carta.x, dy: py - carta.y, saiuDoLugar: false, inicioX: evento.clientX, inicioY: evento.clientY };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  };

  const levarCarta = (evento: EventoDePonteiro<HTMLElement>) => {
    const atual = arrasto.current;
    const mural = muralRef.current;
    if (!atual || !mural) return;
    if (!atual.saiuDoLugar && Math.hypot(evento.clientX - atual.inicioX, evento.clientY - atual.inicioY) < 4) return;
    atual.saiuDoLugar = true;
    const caixa = mural.getBoundingClientRect();
    const px = (evento.clientX - caixa.left + mural.scrollLeft) / zoom;
    const py = (evento.clientY - caixa.top + mural.scrollTop) / zoom;
    setLocais((antes) => ({ ...antes, [atual.id]: limitarAoQuadro(px - atual.dx, py - atual.dy) }));
  };

  const soltarCarta = async (carta: ICartaDoQuadro) => {
    const atual = arrasto.current;
    arrasto.current = null;
    if (!atual || atual.id !== carta.id) return;
    const destino = locais[carta.id];
    if (!atual.saiuDoLugar || !destino) {
      await aoClicarNaCarta(carta);
      return;
    }
    await fazer({ acao: 'mover', id: carta.id, x: destino.x, y: destino.y });
    setLocais((antes) => {
      const { [carta.id]: _ignorada, ...resto } = antes;
      return resto;
    });
  };

  const limpar = async () => {
    const ok = await confirmar({ titulo: 'Limpar o quadro inteiro?', mensagem: 'Todas as cartas e os barbantes saem do quadro, as dos jogadores também. Isso não dá para desfazer.', rotuloConfirmar: 'Limpar tudo', tom: 'perigo' });
    if (ok) await fazer({ acao: 'limpar' }, 'Quadro limpo.');
  };

  return (
    <section className="mapa-quadro" aria-label="Quadro de investigação">
      <header>
        <div className="mapa-quadro-titulo"><StickyNote size={17} aria-hidden="true" /><strong>Quadro de investigação</strong><small>{resumoDoQuadro(quadro)}</small></div>
        <div className="mapa-quadro-ferramentas">
          <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={novaCarta}><Plus size={14} aria-hidden="true" /> Carta</button>
          <button
            type="button"
            className={`mapa-botao-leve${ligando.ligado ? ' ativo' : ''}`}
            aria-pressed={ligando.ligado}
            title="Clique em duas cartas para ligar com um barbante (de novo, para desligar)"
            onClick={() => setLigando((atual) => ({ ligado: !atual.ligado, primeira: null }))}
          >
            <Link2 size={14} aria-hidden="true" /> Ligar
          </button>
          <span className="mapa-quadro-zoom" role="group" aria-label="Zoom do quadro">
            <button type="button" className="mapa-icone" aria-label="Afastar" disabled={zoomIndice === 0} onClick={() => setZoomIndice((v) => Math.max(0, v - 1))}><Minus size={14} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" className="mapa-icone" aria-label="Aproximar" disabled={zoomIndice === ZOOMS.length - 1} onClick={() => setZoomIndice((v) => Math.min(ZOOMS.length - 1, v + 1))}><Plus size={14} /></button>
          </span>
          {gestor && cartas.length > 0 && <button type="button" className="mapa-botao-leve perigo" disabled={ocupado} onClick={() => void limpar()}><Trash2 size={14} aria-hidden="true" /> Limpar</button>}
          <button type="button" className="mapa-icone" aria-label="Fechar o quadro" onClick={onFechar}><X size={16} /></button>
        </div>
      </header>

      {ligando.ligado && (
        <p className="mapa-quadro-dica" role="status">
          {ligando.primeira ? 'Agora clique na carta que vai na outra ponta do barbante.' : 'Clique na primeira carta, depois na segunda. Cartas já ligadas se desligam.'}
        </p>
      )}

      {rascunho && (
        <form className="mapa-quadro-form" onSubmit={(evento) => { evento.preventDefault(); void salvar(); }}>
          <label>
            Título
            <input value={rascunho.titulo} maxLength={TITULO_MAXIMO} placeholder="O mordomo, a faca, a carta sem selo" autoFocus onChange={(e) => setRascunho({ ...rascunho, titulo: e.target.value })} />
          </label>
          <label>
            O que se sabe
            <textarea value={rascunho.texto} rows={3} maxLength={TEXTO_MAXIMO} placeholder="Uma frase curta já vale." onChange={(e) => setRascunho({ ...rascunho, texto: e.target.value })} />
            <small>{rascunho.texto.length} de {TEXTO_MAXIMO}</small>
          </label>
          <div className="mapa-quadro-cores" role="group" aria-label="Cor da carta">
            {CORES_DA_CARTA.map((cor) => (
              <button key={cor.id} type="button" aria-label={cor.rotulo} aria-pressed={rascunho.cor === cor.id} className={rascunho.cor === cor.id ? 'ativa' : ''} style={{ background: cor.fundo, borderColor: cor.borda }} onClick={() => setRascunho({ ...rascunho, cor: cor.id })} />
            ))}
          </div>
          {gestor && (
            <label className="mapa-quadro-check">
              <input type="checkbox" checked={!rascunho.visivel} onChange={(e) => setRascunho({ ...rascunho, visivel: !e.target.checked })} />
              <span>Escondida: os jogadores só veem quando você revelar</span>
            </label>
          )}
          <div className="mapa-quadro-acoes">
            <button type="submit" className="mapa-botao" disabled={ocupado}>{rascunho.id ? 'Guardar a carta' : 'Pregar no quadro'}</button>
            <button type="button" className="mapa-botao-leve" onClick={() => setRascunho(null)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="mapa-quadro-mural" ref={muralRef}>
        <div className="mapa-quadro-moldura" style={{ width: LARGURA_DO_QUADRO * zoom, height: ALTURA_DO_QUADRO * zoom }}>
          <div className="mapa-quadro-tela" style={{ width: LARGURA_DO_QUADRO, height: ALTURA_DO_QUADRO, transform: `scale(${zoom})` }}>
            <svg className="mapa-quadro-barbantes" width={LARGURA_DO_QUADRO} height={ALTURA_DO_QUADRO} aria-hidden="true">
              {barbantes.map((fio) => (
                <g key={fio.chave}>
                  <line x1={fio.x1} y1={fio.y1} x2={fio.x2} y2={fio.y2} stroke="#7a1f19" strokeWidth={5} strokeLinecap="round" opacity={0.35} transform="translate(2 3)" />
                  <line x1={fio.x1} y1={fio.y1} x2={fio.x2} y2={fio.y2} stroke="#c0392b" strokeWidth={3.5} strokeLinecap="round" />
                </g>
              ))}
            </svg>
            {cartas.map((carta) => {
              const posicao = locais[carta.id] ?? { x: carta.x, y: carta.y };
              const cor = corDaCarta(carta.cor);
              const minha = podeEditarCarta(carta, usuarioId, gestor);
              const escolhida = ligando.primeira === carta.id;
              return (
                <article
                  key={carta.id}
                  className={`mapa-quadro-carta${carta.visivel ? '' : ' escondida'}${escolhida ? ' escolhida' : ''}${ligando.ligado ? ' ligavel' : ''}`}
                  style={{ left: posicao.x, top: posicao.y, width: LARGURA_DA_CARTA, minHeight: ALTURA_DA_CARTA, background: cor.fundo, borderColor: cor.borda }}
                  onPointerDown={(evento) => comecarArrasto(evento, carta)}
                  onPointerMove={levarCarta}
                  onPointerUp={() => void soltarCarta(carta)}
                  onPointerCancel={() => { arrasto.current = null; setLocais((antes) => { const { [carta.id]: _x, ...resto } = antes; return resto; }); }}
                >
                  <i className="mapa-quadro-alfinete" aria-hidden="true" />
                  {!carta.visivel && <span className="mapa-quadro-selo">Escondida dos jogadores</span>}
                  {carta.titulo && <h4>{carta.titulo}</h4>}
                  {carta.texto && <p>{carta.texto}</p>}
                  <footer>
                    <small>{carta.autor_nome || 'Mestre'}</small>
                    <span>
                      {gestor && (
                        <button type="button" className="mapa-icone" aria-label={carta.visivel ? 'Esconder dos jogadores' : 'Revelar aos jogadores'} title={carta.visivel ? 'Esconder dos jogadores' : 'Revelar aos jogadores'} onClick={() => void fazer({ acao: 'revelar', id: carta.id, visivel: !carta.visivel })}>
                          {carta.visivel ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      )}
                      {minha && <button type="button" className="mapa-icone" aria-label="Editar a carta" onClick={() => editar(carta)}><Pencil size={13} /></button>}
                      {minha && <button type="button" className="mapa-icone" aria-label="Tirar a carta" onClick={() => void apagar(carta)}><Trash2 size={13} /></button>}
                    </span>
                  </footer>
                </article>
              );
            })}
            {cartas.length === 0 && <p className="mapa-quadro-vazio">O quadro está vazio. Use “Carta” para pregar a primeira pista.</p>}
          </div>
        </div>
      </div>
    </section>
  );
};
