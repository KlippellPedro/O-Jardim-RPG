import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Clock3, Folder, FolderOpen, ImagePlus, Inbox, Loader2, Map as MapaIcone, Package, Scissors, Search, Star, UserRound, X } from 'lucide-react';
import { acervoApi, type IAcervo, type IItemAcervo, type TipoItemAcervo } from '../../../services/acervoApi';
import { urlPedaco } from '../../../services/mapaApi';
import { ComDica } from './BotaoFerramenta';
import {
  alternarFavorito, buscaVazia, caminhoDaPasta, empacotarItem, itensDaVista, lerListaDeIds, MIME_ACERVO, raizDaPasta, registrarRecente, subpastas,
  type ItemParaCena, type ListasDoDock, type VistaDoDock,
} from './dockAcervoConta';
import {
  arrastaArquivos, enviarImagens, etiquetasDoFormato, imagensParaEnviar, perguntarFormatoDoToken, perguntarTipoDaImagem, textoDoAndamento, textoDoResultado, type AndamentoDoEnvio,
} from './envioParaOAcervo';
import {
  MIME_MOVER_ITENS, MIME_MOVER_PASTA, arrastaItens, arrastaOrganizacao, arrastaPasta, descendentesDaPasta, empacotarIds, itensQueMudam, lerIds, podeMoverPasta, quantasImagens,
} from '../acervo/organizacao';
import './dockAcervo.css';

interface Props {
  /** A gaveta do Acervo (subir, apagar, anotar) abre e fecha: ao mudar, a lista é pedida de novo. */
  gavetaAberta: boolean;
  /** Muda quando a página subiu imagens por conta própria (arquivo solto no mapa): a lista é pedida de novo. */
  versao?: number;
  /** Clique (ou arrasto) num mapa: põe na cena como um objeto. */
  onColocarMapa: (item: ItemParaCena) => void;
  /** Clique num token ou objeto: põe no meio da tela. O arrasto até o mapa é tratado pela página. */
  onPorNaCena: (item: ItemParaCena) => void;
  onAbrirAcervo: () => void;
  /** Abre o fatiador de folhas de assets (corta uma imagem com vários objetos em peças soltas e melhora a qualidade). */
  onFatiar: () => void;
}

const CHAVE_RECENTES = 'jardim.mapa.acervo.recentes';
const CHAVE_FAVORITOS = 'jardim.mapa.acervo.favoritos';

const TIPOS: Array<{ id: TipoItemAcervo; rotulo: string; Icone: typeof MapaIcone }> = [
  { id: 'mapa', rotulo: 'Mapas', Icone: MapaIcone },
  { id: 'token', rotulo: 'Tokens', Icone: UserRound },
  { id: 'objeto', rotulo: 'Objetos', Icone: Package },
];

const ROTULO_DO_TIPO: Record<TipoItemAcervo, string> = { mapa: 'Mapa', token: 'Token', objeto: 'Objeto' };

function lerLista(chave: string): string[] {
  try {
    return lerListaDeIds(window.localStorage.getItem(chave));
  } catch {
    return [];
  }
}

function guardarLista(chave: string, lista: readonly string[]) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(lista));
  } catch {
    // Sem armazenamento do navegador, as listas valem só até fechar a aba.
  }
}

/**
 * A barra de baixo do mapa, como a do Owlbear: um botão para buscar, um para cada tipo de imagem do Acervo, os
 * Recentes, os Favoritos e um para cada pasta. Clicar abre uma janela com o que está salvo ali; clicar numa imagem
 * põe na cena, e arrastar leva até o lugar do mapa onde ela deve cair. A janela também sobe imagens do computador
 * (pelo botão Subir ou soltando arquivos nela).
 */
export const DockAcervo = ({ gavetaAberta, versao = 0, onColocarMapa, onPorNaCena, onAbrirAcervo, onFatiar }: Props) => {
  const [acervo, setAcervo] = useState<IAcervo | null>(null);
  const [erro, setErro] = useState('');
  const [vista, setVista] = useState<VistaDoDock | null>(null);
  const [busca, setBusca] = useState('');
  const [listas, setListas] = useState<ListasDoDock>(() => ({ recentes: lerLista(CHAVE_RECENTES), favoritos: lerLista(CHAVE_FAVORITOS) }));
  const [menuSubir, setMenuSubir] = useState(false);
  const [andamento, setAndamento] = useState<AndamentoDoEnvio | null>(null);
  const [resultado, setResultado] = useState('');
  const [soltando, setSoltando] = useState(false);
  /** O lugar (pasta, caminho ou botão da barra) por cima do qual há algo sendo arrastado. */
  const [alvo, setAlvo] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const tipoPendente = useRef<TipoItemAcervo>('mapa');
  const enviando = andamento !== null;

  const carregar = useCallback(async () => {
    try {
      setAcervo(await acervoApi.listar());
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir o acervo.');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar, gavetaAberta, versao]);

  const pastas = acervo?.pastas ?? [];
  const raizes = useMemo(() => subpastas(pastas, null), [pastas]);
  const pastaAtual = vista?.modo === 'pasta' ? vista.pastaId : null;
  const raizAtiva = pastaAtual ? raizDaPasta(pastas, pastaAtual) : null;
  const caminho = useMemo(() => (pastaAtual ? caminhoDaPasta(pastas, pastaAtual) : []), [pastas, pastaAtual]);
  const filhas = useMemo(() => (pastaAtual ? subpastas(pastas, pastaAtual) : []), [pastas, pastaAtual]);
  const { itens, total } = useMemo(() => itensDaVista(acervo, vista ?? { modo: 'busca' }, busca, undefined, listas), [acervo, vista, busca, listas]);

  const abrir = (nova: VistaDoDock) => {
    const mesma = vista && JSON.stringify(vista) === JSON.stringify(nova);
    if (mesma) {
      setVista(null);
      return;
    }
    setVista(nova);
    setBusca('');
    setMenuSubir(false);
    setResultado('');
    void carregar();
  };

  /** Usou uma imagem (clicou ou começou a arrastar): ela vai para os Recentes deste aparelho. */
  const lembrar = (id: string) => {
    setListas((atual) => {
      const recentes = registrarRecente(atual.recentes, id);
      guardarLista(CHAVE_RECENTES, recentes);
      return { ...atual, recentes };
    });
  };

  const marcarFavorito = (id: string) => {
    setListas((atual) => {
      const favoritos = alternarFavorito(atual.favoritos, id);
      guardarLista(CHAVE_FAVORITOS, favoritos);
      return { ...atual, favoritos };
    });
  };

  const escolher = (item: IItemAcervo) => {
    lembrar(item.id);
    if (item.tipo === 'mapa') {
      onColocarMapa(item);
      setVista(null);
    } else {
      onPorNaCena(item);
    }
  };

  /** Sobe as imagens para o Acervo, na pasta que a janela está mostrando (se for uma pasta). */
  const subir = async (arquivos: FileList | File[], tipo: TipoItemAcervo, pastaDestino?: string | null) => {
    const { imagens, deixadas } = imagensParaEnviar(arquivos);
    if (!imagens.length) {
      setResultado(textoDoResultado({ itens: [], falhas: [], deixadas: 0 }));
      return;
    }
    setResultado('');
    // Token tem dois jeitos de aparecer no mapa: pergunta uma vez, antes de começar a subir.
    let etiquetas: string[] | undefined;
    if (tipo === 'token') {
      const formato = await perguntarFormatoDoToken(imagens.length, imagens[0].name);
      if (!formato) return;
      etiquetas = etiquetasDoFormato(formato);
    }
    setAndamento({ indice: 1, total: imagens.length, nome: imagens[0].name, feitos: 0, pedacos: 0 });
    const pastaId = pastaDestino !== undefined ? pastaDestino : vista?.modo === 'pasta' ? vista.pastaId : null;
    const feito = await enviarImagens(imagens, { tipo, pastaId, etiquetas, aoAndamento: setAndamento });
    await carregar();
    setAndamento(null);
    setResultado(textoDoResultado({ ...feito, deixadas }));
  };

  const pedirArquivos = (tipo: TipoItemAcervo) => {
    tipoPendente.current = tipo;
    setMenuSubir(false);
    entrada.current?.click();
  };

  /** Botão Subir: com a janela num tipo (Mapas, Tokens, Objetos) já se sabe o que é; nas outras, pergunta. */
  const aoClicarSubir = () => {
    if (vista?.modo === 'tipo') pedirArquivos(vista.tipo);
    else setMenuSubir((v) => !v);
  };

  const aoSoltarArquivos = async (evento: React.DragEvent) => {
    if (!arrastaArquivos(evento.dataTransfer.types)) return;
    evento.preventDefault();
    setSoltando(false);
    if (enviando) return;
    const arquivos = Array.from(evento.dataTransfer.files);
    const { imagens } = imagensParaEnviar(arquivos);
    if (!imagens.length) {
      setResultado(textoDoResultado({ itens: [], falhas: [], deixadas: 0 }));
      return;
    }
    const tipo = vista?.modo === 'tipo' ? vista.tipo : await perguntarTipoDaImagem(imagens.length, imagens[0].name);
    if (tipo) await subir(arquivos, tipo);
  };

  const nomeDaPasta = (id: string | null) => (id === null ? 'fora de pasta' : `"${pastas.find((p) => p.id === id)?.nome ?? 'pasta'}"`);

  /** Imagens soltas numa pasta mudam para ela; a tela muda na hora e, se o servidor recusar alguma, a lista é pedida de novo. */
  const moverImagens = async (ids: string[], destino: string | null) => {
    if (!acervo) return;
    const mudam = itensQueMudam(acervo.itens, ids, destino);
    if (!mudam.length) {
      setResultado(`Já está em ${nomeDaPasta(destino)}.`);
      return;
    }
    const idsQueMudam = new Set(mudam.map((i) => i.id));
    setAcervo((atual) => atual && { ...atual, itens: atual.itens.map((i) => (idsQueMudam.has(i.id) ? { ...i, pasta_id: destino } : i)) });
    const falhas = await acervoApi.moverItens(mudam.map((i) => i.id), destino);
    if (falhas.length) await carregar();
    const feitas = mudam.length - falhas.length;
    setResultado(falhas.length ? `${quantasImagens(falhas.length)} não ${falhas.length === 1 ? 'pôde' : 'puderam'} mudar de pasta.` : `${quantasImagens(feitas)} ${feitas === 1 ? 'foi' : 'foram'} para ${nomeDaPasta(destino)}.`);
  };

  const moverPasta = async (id: string, destino: string | null) => {
    if (!podeMoverPasta(pastas, id, destino)) {
      if (destino === id || (destino !== null && descendentesDaPasta(pastas, id).has(destino))) setResultado('Uma pasta não cabe dentro dela mesma nem de uma das suas subpastas.');
      return;
    }
    try {
      await acervoApi.moverPasta(id, destino);
      await carregar();
      setResultado(`A pasta ${nomeDaPasta(id)} foi para ${nomeDaPasta(destino)}.`);
    } catch (falha) {
      setResultado(falha instanceof Error ? falha.message : 'Não deu para mover a pasta.');
    }
  };

  /** Eventos de um lugar que recebe imagens, pastas ou arquivos do computador soltos em cima dele. */
  const alvoDeSoltar = (chave: string, destino: string | null) => {
    const aceita = (evento: React.DragEvent) => {
      const tipos = evento.dataTransfer.types;
      if (!arrastaOrganizacao(tipos) && !arrastaArquivos(tipos)) return false;
      evento.preventDefault();
      evento.dataTransfer.dropEffect = arrastaArquivos(tipos) ? 'copy' : 'move';
      return true;
    };
    return {
      onDragOver: (evento: React.DragEvent) => {
        if (aceita(evento) && alvo !== chave) setAlvo(chave);
      },
      onDragEnter: (evento: React.DragEvent) => {
        if (aceita(evento) && alvo !== chave) setAlvo(chave);
      },
      onDragLeave: (evento: React.DragEvent) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setAlvo((atual) => (atual === chave ? null : atual));
      },
      onDrop: (evento: React.DragEvent) => {
        const tipos = Array.from(evento.dataTransfer.types);
        if (!arrastaOrganizacao(tipos) && !arrastaArquivos(tipos)) return;
        evento.preventDefault();
        evento.stopPropagation();
        setAlvo(null);
        setSoltando(false);
        // O conteúdo do arrasto só se lê enquanto o evento ainda é síncrono.
        const ids = arrastaItens(tipos) ? lerIds(evento.dataTransfer.getData(MIME_MOVER_ITENS)) : [];
        const pastaArrastada = arrastaPasta(tipos) ? evento.dataTransfer.getData(MIME_MOVER_PASTA) : '';
        const arquivos = arrastaArquivos(tipos) ? Array.from(evento.dataTransfer.files) : [];
        if (ids.length) void moverImagens(ids, destino);
        else if (pastaArrastada) void moverPasta(pastaArrastada, destino);
        else if (arquivos.length && !enviando) {
          void (async () => {
            const tipo = vista?.modo === 'tipo' ? vista.tipo : await perguntarTipoDaImagem(arquivos.length, arquivos[0].name);
            if (tipo) await subir(arquivos, tipo, destino);
          })();
        }
      },
      className: alvo === chave ? ' alvo' : '',
    };
  };

  const titulo = !vista
    ? ''
    : vista.modo === 'busca'
      ? 'Buscar no Acervo'
      : vista.modo === 'tipo'
        ? TIPOS.find((t) => t.id === vista.tipo)?.rotulo ?? ''
        : vista.modo === 'recentes'
          ? 'Usadas por último'
          : vista.modo === 'favoritos'
            ? 'Favoritas'
            : caminho.map((p) => p.nome).join(' › ') || 'Pasta';

  const textoVazio = (() => {
    if (busca.trim()) return 'Nenhuma imagem com esse nome.';
    if (vista?.modo === 'recentes') return 'Ainda não há imagens usadas neste aparelho. As que você pôr na cena aparecem aqui.';
    if (vista?.modo === 'favoritos') return 'Nenhuma favorita ainda. Passe o mouse numa imagem e clique na estrela.';
    return 'Nada salvo aqui ainda. Use o botão Subir ou solte arquivos nesta janela.';
  })();

  return (
    <>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(evento) => {
          const escolhidos = evento.target.files;
          if (escolhidos?.length) void subir(escolhidos, tipoPendente.current);
          evento.target.value = '';
        }}
      />

      {vista && (
        <section
          className={`mapa-dock-janela${soltando ? ' soltando' : ''}`}
          aria-label={titulo}
          onDragEnd={() => setAlvo(null)}
          onKeyDown={(evento) => {
            if (evento.key === 'Escape') {
              evento.stopPropagation();
              setVista(null);
            }
          }}
          onDragOver={(evento) => {
            if (arrastaArquivos(evento.dataTransfer.types)) {
              evento.preventDefault();
              setSoltando(true);
            }
          }}
          onDragLeave={(evento) => {
            if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setSoltando(false);
          }}
          onDrop={(evento) => void aoSoltarArquivos(evento)}
        >
          <header>
            {vista.modo === 'pasta' ? (
              <nav className="mapa-dock-caminho" aria-label="Caminho da pasta">
                {(() => {
                  const raiz = alvoDeSoltar('caminho:raiz', null);
                  return (
                    <button type="button" className={`mapa-dock-raiz${raiz.className}`} title="Fora de pasta (solte aqui para tirar da pasta)" aria-label="Voltar aos mapas, tokens e objetos" onClick={() => abrir({ modo: 'tipo', tipo: 'mapa' })} onDragOver={raiz.onDragOver} onDragEnter={raiz.onDragEnter} onDragLeave={raiz.onDragLeave} onDrop={raiz.onDrop}>
                      <Inbox size={13} />
                    </button>
                  );
                })()}
                {caminho.map((p) => {
                  const soltar = alvoDeSoltar(`caminho:${p.id}`, p.id);
                  return (
                    <span key={p.id}>
                      <ChevronRight size={13} />
                      <button type="button" className={`${p.id === pastaAtual ? 'atual' : ''}${soltar.className}`} onClick={() => setVista({ modo: 'pasta', pastaId: p.id })} onDragOver={soltar.onDragOver} onDragEnter={soltar.onDragEnter} onDragLeave={soltar.onDragLeave} onDrop={soltar.onDrop}>{p.nome}</button>
                    </span>
                  );
                })}
              </nav>
            ) : (
              <strong>{titulo}</strong>
            )}
            <label className="mapa-dock-busca">
              <Search size={14} />
              <input
                autoFocus={vista.modo === 'busca'}
                value={busca}
                placeholder={vista.modo === 'busca' ? 'Nome ou etiqueta' : 'Filtrar'}
                maxLength={80}
                onChange={(evento) => setBusca(evento.target.value)}
              />
            </label>
            <div className="mapa-dock-subir">
              <ComDica dica={vista.modo === 'pasta' ? 'Subir imagens do computador para esta pasta' : 'Subir imagens do computador'}>
                <button type="button" className="mapa-dock-subir-botao" disabled={enviando} aria-haspopup={vista.modo === 'tipo' ? undefined : 'menu'} aria-expanded={menuSubir} onClick={aoClicarSubir}>
                  {enviando ? <Loader2 size={15} className="girando" /> : <ImagePlus size={15} />} Subir
                </button>
              </ComDica>
              {menuSubir && (
                <div className="mapa-dock-subir-menu" role="menu" aria-label="Subir como">
                  <span>Subir como</span>
                  {TIPOS.map(({ id, rotulo, Icone }) => (
                    <button key={id} type="button" role="menuitem" onClick={() => pedirArquivos(id)}><Icone size={15} /> {rotulo.replace(/s$/, '')}</button>
                  ))}
                </div>
              )}
            </div>
            <ComDica dica="Corta uma folha com vários objetos em peças soltas, com fundo transparente e qualidade melhorada">
              <button type="button" className="mapa-dock-subir-botao" disabled={enviando} onClick={onFatiar}>
                <Scissors size={15} /> Fatiar
              </button>
            </ComDica>
            <button type="button" className="mapa-icone" aria-label="Fechar a janela" onClick={() => setVista(null)}><X size={17} /></button>
          </header>

          <div className="mapa-dock-corpo">
            {erro && !acervo && (
              <p className="mapa-erro">
                {erro} <button type="button" className="mapa-botao-leve" onClick={() => void carregar()}>Tentar de novo</button>
              </p>
            )}
            {!acervo && !erro && <p className="mapa-dock-vazio"><Loader2 size={15} className="girando" /> Abrindo o Acervo...</p>}
            {acervo && buscaVazia(vista, busca) && <p className="mapa-dock-vazio">Digite o nome (ou uma etiqueta) da imagem que você quer pôr na cena.</p>}
            {acervo && !buscaVazia(vista, busca) && (
              <div className="mapa-dock-grade">
                {filhas.map((pasta) => {
                  const soltar = alvoDeSoltar(`tile:${pasta.id}`, pasta.id);
                  return (
                    <button
                      key={pasta.id}
                      type="button"
                      className={`mapa-dock-pasta${soltar.className}`}
                      draggable
                      title={`${pasta.nome} (solte imagens aqui; arraste a pasta para outra)`}
                      onClick={() => { setVista({ modo: 'pasta', pastaId: pasta.id }); setBusca(''); }}
                      onDragStart={(evento) => {
                        evento.dataTransfer.setData(MIME_MOVER_PASTA, pasta.id);
                        evento.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={soltar.onDragOver}
                      onDragEnter={soltar.onDragEnter}
                      onDragLeave={soltar.onDragLeave}
                      onDrop={soltar.onDrop}
                    >
                      <Folder size={26} />
                      <span>{pasta.nome}</span>
                    </button>
                  );
                })}
                {itens.map((item) => {
                  const favorito = listas.favoritos.includes(item.id);
                  return (
                    <div key={item.id} className="mapa-dock-caixa">
                      <div
                        role="button"
                        tabIndex={0}
                        draggable
                        className="mapa-dock-item"
                        title={`${item.nome} (${item.largura} x ${item.altura})`}
                        onDragStart={(evento) => {
                          lembrar(item.id);
                          evento.dataTransfer.setData(MIME_ACERVO, empacotarItem(item));
                          // Solta no mapa: entra na cena. Solta numa pasta: muda de pasta.
                          evento.dataTransfer.setData(MIME_MOVER_ITENS, empacotarIds([item.id]));
                          evento.dataTransfer.effectAllowed = 'copyMove';
                        }}
                        onClick={() => escolher(item)}
                        onKeyDown={(evento) => {
                          if (evento.key === 'Enter' || evento.key === ' ') {
                            evento.preventDefault();
                            escolher(item);
                          }
                        }}
                      >
                        <img src={urlPedaco(item.id, 'mini')} alt="" loading="lazy" draggable={false} />
                        <span>{item.nome}</span>
                        {vista.modo !== 'tipo' && <small>{ROTULO_DO_TIPO[item.tipo]}</small>}
                      </div>
                      <button
                        type="button"
                        className={`mapa-dock-estrela${favorito ? ' marcada' : ''}`}
                        aria-pressed={favorito}
                        aria-label={favorito ? `Tirar ${item.nome} das favoritas` : `Marcar ${item.nome} como favorita`}
                        title={favorito ? 'Tirar das favoritas' : 'Marcar como favorita'}
                        onClick={() => marcarFavorito(item.id)}
                      >
                        <Star size={14} />
                      </button>
                    </div>
                  );
                })}
                {!itens.length && !filhas.length && <p className="mapa-dock-vazio">{textoVazio}</p>}
              </div>
            )}
          </div>

          <footer aria-live="polite">
            {andamento
              ? textoDoAndamento(andamento)
              : resultado
                ? resultado
                : total > itens.length
                  ? `Mostrando ${itens.length} de ${total}: digite para afinar a busca.`
                  : 'Clique para pôr no meio da tela ou arraste até o lugar no mapa. Solte arquivos aqui para subir.'}
          </footer>
        </section>
      )}

      <nav className="mapa-dock" aria-label="Acervo: mapas, tokens e pastas" onDragEnd={() => setAlvo(null)}>
        <button type="button" className={vista?.modo === 'busca' ? 'ativo' : ''} aria-pressed={vista?.modo === 'busca'} onClick={() => abrir({ modo: 'busca' })}>
          <Search size={16} /><span>Buscar</span>
        </button>
        <span className="mapa-dock-separador" />
        {TIPOS.map(({ id, rotulo, Icone }) => {
          const ativo = vista?.modo === 'tipo' && vista.tipo === id;
          return (
            <button key={id} type="button" className={ativo ? 'ativo' : ''} aria-pressed={ativo} onClick={() => abrir({ modo: 'tipo', tipo: id })}>
              <Icone size={16} /><span>{rotulo}</span>
            </button>
          );
        })}
        <span className="mapa-dock-separador" />
        <ComDica dica="Usadas por último" lado="cima">
          <button type="button" className={`mapa-dock-icone${vista?.modo === 'recentes' ? ' ativo' : ''}`} aria-label="Imagens usadas por último" aria-pressed={vista?.modo === 'recentes'} onClick={() => abrir({ modo: 'recentes' })}>
            <Clock3 size={16} />
          </button>
        </ComDica>
        <ComDica dica="Favoritas" lado="cima">
          <button type="button" className={`mapa-dock-icone${vista?.modo === 'favoritos' ? ' ativo' : ''}`} aria-label="Imagens favoritas" aria-pressed={vista?.modo === 'favoritos'} onClick={() => abrir({ modo: 'favoritos' })}>
            <Star size={16} />
          </button>
        </ComDica>
        {raizes.length > 0 && <span className="mapa-dock-separador" />}
        {raizes.length > 0 && (
          <div className="mapa-dock-pastas">
            {raizes.map((pasta) => {
              const ativo = raizAtiva === pasta.id;
              const soltar = alvoDeSoltar(`dock:${pasta.id}`, pasta.id);
              return (
                <button key={pasta.id} type="button" className={`${ativo ? 'ativo' : ''}${soltar.className}`} aria-pressed={ativo} title={`${pasta.nome} (solte imagens aqui para guardar nesta pasta)`} onClick={() => abrir({ modo: 'pasta', pastaId: pasta.id })} onDragOver={soltar.onDragOver} onDragEnter={soltar.onDragEnter} onDragLeave={soltar.onDragLeave} onDrop={soltar.onDrop}>
                  <Folder size={16} /><span>{pasta.nome}</span>
                </button>
              );
            })}
          </div>
        )}
        <span className="mapa-dock-separador" />
        <ComDica dica="Abrir o Acervo para subir e arrumar imagens" lado="cima">
          <button type="button" className={`mapa-dock-icone${gavetaAberta ? ' ativo' : ''}`} aria-label="Abrir o Acervo para subir e arrumar imagens" aria-pressed={gavetaAberta} onClick={onAbrirAcervo}>
            <FolderOpen size={16} />
          </button>
        </ComDica>
      </nav>
    </>
  );
};
