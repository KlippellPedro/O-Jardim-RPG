import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { FileText, Loader2, Search, Send, X } from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { documentosApi, type IDocumentoUniversal, type IResumoDocumento } from '../../../services/documentosApi';
import { mapaRecursosApi } from '../../../services/mapaRecursosApi';
import { useDocumentoNoCanvas } from './documentoNoCanvas';
import {
  agruparDocumentos,
  contagemPorOrigem,
  escolhaValida,
  montarItens,
  partirChave,
  vizinho,
  type FiltroDeOrigem,
  type ItemDeDocumento,
} from './listaDeDocumentos';
import '../documentosMesa.css';

interface JogadorAlvo {
  personagemId: string;
  nome: string;
}

const FILTROS: Array<{ id: FiltroDeOrigem; rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'salvo', rotulo: 'Salvos' },
  { id: 'universal', rotulo: 'Universais' },
];

/** O documento desenhado como a mesa vai ver, antes de mandar. */
const Previa = ({ item, campos }: { item: ItemDeDocumento; campos: Record<string, string> | null }) => {
  const { canvas, modelo, falha, pronto } = useDocumentoNoCanvas(item.modelo, campos);
  return (
    <div className="mapa-documentos-quadro">
      {modelo
        ? <canvas ref={canvas} role="img" aria-label={`Prévia: ${item.titulo}`} className={pronto ? 'pronta' : ''} />
        : <p className="mapa-dica">Este aparelho não conhece o modelo deste documento.</p>}
      {modelo && !pronto && !falha && <p className="mapa-documentos-carregando"><Loader2 size={15} className="girando" /> Desenhando...</p>}
      {falha && <p className="mapa-dica">{falha}</p>}
    </div>
  );
};

export const PainelDocumentosMesa = ({
  aberto, campanhaId, jogadores, onFechar,
}: { aberto: boolean; campanhaId: string; jogadores: JogadorAlvo[]; onFechar: () => void }) => {
  const [salvos, setSalvos] = useState<IResumoDocumento[]>([]);
  const [universais, setUniversais] = useState<IDocumentoUniversal[]>([]);
  const [escolhido, setEscolhido] = useState('');
  const [filtro, setFiltro] = useState<FiltroDeOrigem>('todos');
  const [busca, setBusca] = useState('');
  const [destino, setDestino] = useState('todos');
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  /** Os campos de um documento salvo só chegam quando ele é escolhido (a lista vem sem eles, que podem trazer imagem). */
  const [camposSalvos, setCamposSalvos] = useState<Record<string, Record<string, string>>>({});
  const buscaRef = useRef<HTMLInputElement>(null);
  const alvos = useMemo(() => {
    const vistos = new Set<string>();
    return jogadores.filter((jogador) => {
      if (!jogador.personagemId || vistos.has(jogador.personagemId)) return false;
      vistos.add(jogador.personagemId);
      return true;
    });
  }, [jogadores]);

  const itens = useMemo(() => montarItens(salvos, universais), [salvos, universais]);
  const grupos = useMemo(() => agruparDocumentos(itens, filtro, busca), [itens, filtro, busca]);
  const contagem = useMemo(() => contagemPorOrigem(itens), [itens]);
  const atual = itens.find((item) => item.chave === escolhido) ?? null;

  useEffect(() => {
    if (!aberto || !campanhaId) return;
    let vivo = true;
    setCarregando(true);
    // Os salvos da mesa e os universais vêm de rotas separadas: se uma falha, a outra lista continua valendo.
    void Promise.allSettled([documentosApi.listar(campanhaId), documentosApi.universais(campanhaId)]).then(([resposta, prontos]) => {
      if (!vivo) return;
      const listaSalvos = resposta.status === 'fulfilled' ? resposta.value.documentos : [];
      const listaProntos = prontos.status === 'fulfilled' ? prontos.value.documentos : [];
      setSalvos(listaSalvos);
      setUniversais(listaProntos);
      if (resposta.status === 'rejected') avisarErro(resposta.reason, 'Não foi possível carregar os documentos salvos da mesa.');
      if (prontos.status === 'rejected') avisarErro(prontos.reason, 'Não foi possível carregar os documentos universais.');
    }).finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [aberto, campanhaId]);

  // A escolha acompanha o filtro e a busca: some da lista, passa para o primeiro que sobrou.
  useEffect(() => {
    setEscolhido((anterior) => escolhaValida(grupos, anterior));
  }, [grupos]);

  // O documento salvo escolhido busca os campos uma vez só.
  useEffect(() => {
    if (!aberto || !atual || atual.origem !== 'salvo' || camposSalvos[atual.id]) return;
    let vivo = true;
    documentosApi.obter(campanhaId, atual.id)
      .then((documento) => { if (vivo) setCamposSalvos((guardados) => ({ ...guardados, [atual.id]: documento.campos })); })
      .catch((falha) => { if (vivo) avisarErro(falha, 'Não foi possível abrir este documento.'); });
    return () => { vivo = false; };
  }, [aberto, atual, campanhaId, camposSalvos]);

  useEffect(() => {
    if (!aberto) return undefined;
    buscaRef.current?.focus({ preventScroll: true });
    const aoTeclar = (evento: globalThis.KeyboardEvent) => {
      if (evento.key !== 'Escape' || evento.defaultPrevented) return;
      evento.stopPropagation();
      onFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const mostrar = async () => {
    const partida = partirChave(escolhido);
    if (!partida) return;
    setEnviando(true);
    try {
      const para = destino === 'todos' ? null : [destino];
      if (partida.origem === 'universal') await mapaRecursosApi.mostrarDocumentoUniversal(campanhaId, partida.id, para);
      else await mapaRecursosApi.mostrarDocumento(campanhaId, partida.id, para);
      avisar.sucesso(destino === 'todos' ? 'Documento enviado para a mesa.' : 'Documento enviado ao jogador escolhido.');
    } catch (falha) {
      avisarErro(falha, 'Não foi possível mostrar o documento.');
    } finally {
      setEnviando(false);
    }
  };

  const aoTeclarNaLista = (evento: KeyboardEvent<HTMLElement>) => {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    evento.preventDefault();
    const proximo = vizinho(grupos, escolhido, evento.key === 'ArrowDown' ? 1 : -1);
    setEscolhido(proximo);
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>('.mapa-documentos-item[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }));
  };

  const vazio = !carregando && itens.length === 0;
  const campos = atual ? (atual.origem === 'salvo' ? camposSalvos[atual.id] ?? null : atual.campos) : null;

  return (
    <div className="mapa-documento-fundo" role="presentation" onMouseDown={(evento) => evento.target === evento.currentTarget && onFechar()}>
      <section className="mapa-documento mapa-documentos-janela" role="dialog" aria-modal="true" aria-label="Mostrar um documento na mesa">
        <header>
          <strong><FileText size={16} /> Mostrar um documento</strong>
          <button type="button" className="mapa-icone" aria-label="Fechar documentos" onClick={onFechar}><X size={17} /></button>
        </header>

        {carregando && !itens.length
          ? <p className="mapa-dica mapa-documentos-aviso"><Loader2 size={14} className="girando" /> Abrindo documentos...</p>
          : vazio
            ? <p className="mapa-dica mapa-documentos-aviso">Não há documentos salvos nesta mesa nem universais para mostrar.</p>
            : (
              <div className="mapa-documentos-corpo">
                <aside className="mapa-documentos-lista" aria-label="Documentos">
                  <label className="mapa-documentos-busca">
                    <Search size={15} aria-hidden="true" />
                    <input
                      ref={buscaRef}
                      type="search"
                      value={busca}
                      onChange={(evento) => setBusca(evento.target.value)}
                      onKeyDown={aoTeclarNaLista}
                      placeholder="Buscar por título ou assunto"
                      aria-label="Buscar documento"
                      autoComplete="off"
                    />
                  </label>
                  <div className="mapa-documentos-filtros" role="group" aria-label="Origem dos documentos">
                    {FILTROS.map((opcao) => (
                      <button
                        key={opcao.id}
                        type="button"
                        className={filtro === opcao.id ? 'ativo' : ''}
                        aria-pressed={filtro === opcao.id}
                        disabled={opcao.id !== 'todos' && contagem[opcao.id] === 0}
                        onClick={() => setFiltro(opcao.id)}
                      >
                        {opcao.rotulo} <small>{contagem[opcao.id]}</small>
                      </button>
                    ))}
                  </div>
                  <div className="mapa-documentos-itens custom-scrollbar" role="listbox" aria-label="Lista de documentos" onKeyDown={aoTeclarNaLista}>
                    {grupos.map((grupo) => (
                      <div key={grupo.titulo} role="group" aria-label={grupo.titulo}>
                        <div className="mapa-documentos-grupo" role="presentation">{grupo.titulo} <small>{grupo.itens.length}</small></div>
                        {grupo.itens.map((item) => (
                          <button
                            key={item.chave}
                            type="button"
                            role="option"
                            aria-selected={item.chave === escolhido}
                            className={`mapa-documentos-item${item.chave === escolhido ? ' ativo' : ''}`}
                            onClick={() => setEscolhido(item.chave)}
                          >
                            {item.titulo}
                          </button>
                        ))}
                      </div>
                    ))}
                    {grupos.length === 0 && <p className="mapa-dica">Nenhum documento com esse nome.</p>}
                  </div>
                </aside>

                <div className="mapa-documentos-previa">
                  {atual ? (
                    <>
                      <div className="mapa-documentos-titulo">
                        <strong>{atual.titulo}</strong>
                        <span>{atual.origem === 'salvo' ? 'Salvo nesta mesa' : `Universal · ${atual.grupo}`}</span>
                      </div>
                      <Previa key={atual.chave} item={atual} campos={campos} />
                      {(atual.ensina || atual.entregar) && (
                        <dl className="mapa-documentos-notas" aria-label="Anotações para o Mestre">
                          {atual.ensina && <><dt>O que ensina</dt><dd>{atual.ensina}</dd></>}
                          {atual.entregar && <><dt>Quando entregar</dt><dd>{atual.entregar}</dd></>}
                        </dl>
                      )}
                    </>
                  ) : <p className="mapa-dica">Escolha um documento na lista.</p>}
                </div>
              </div>
            )}

        {!vazio && (
          <footer className="mapa-documentos-rodape">
            <label className="mapa-documentos-destino">
              Mostrar para
              <select value={destino} onChange={(evento) => setDestino(evento.target.value)}>
                <option value="todos">Todos os jogadores</option>
                {alvos.map((jogador) => <option key={jogador.personagemId} value={jogador.personagemId}>{jogador.nome}</option>)}
              </select>
            </label>
            <button type="button" className="mapa-botao destaque" disabled={enviando || !atual || (atual.origem === 'salvo' && !campos)} onClick={() => void mostrar()}>
              {enviando ? <Loader2 size={14} className="girando" /> : <Send size={14} />} Mostrar na mesa
            </button>
            <p className="mapa-dica">O documento aparece para quem recebeu e pode ser fechado em cada aparelho.</p>
          </footer>
        )}
      </section>
    </div>
  );
};
