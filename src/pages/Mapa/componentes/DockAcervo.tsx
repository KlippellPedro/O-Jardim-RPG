import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Clock3, Folder, FolderOpen, ImagePlus, Loader2, Map as MapaIcone, Package, Scissors, Search, Star, UserRound, X } from 'lucide-react';
import { acervoApi, type IAcervo, type IItemAcervo, type TipoItemAcervo } from '../../../services/acervoApi';
import { urlPedaco } from '../../../services/mapaApi';
import { ComDica } from './BotaoFerramenta';
import {
  alternarFavorito, buscaVazia, caminhoDaPasta, empacotarItem, itensDaVista, lerListaDeIds, MIME_ACERVO, raizDaPasta, registrarRecente, subpastas,
  type ItemParaCena, type ListasDoDock, type VistaDoDock,
} from './dockAcervoConta';
import {
  arrastaArquivos, enviarImagens, imagensParaEnviar, perguntarTipoDaImagem, textoDoAndamento, textoDoResultado, type AndamentoDoEnvio,
} from './envioParaOAcervo';
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
  const subir = async (arquivos: FileList | File[], tipo: TipoItemAcervo) => {
    const { imagens, deixadas } = imagensParaEnviar(arquivos);
    if (!imagens.length) {
      setResultado(textoDoResultado({ itens: [], falhas: [], deixadas: 0 }));
      return;
    }
    setResultado('');
    setAndamento({ indice: 1, total: imagens.length, nome: imagens[0].name, feitos: 0, pedacos: 0 });
    const feito = await enviarImagens(imagens, { tipo, pastaId: vista?.modo === 'pasta' ? vista.pastaId : null, aoAndamento: setAndamento });
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
                {caminho.map((p, indice) => (
                  <span key={p.id}>
                    {indice > 0 && <ChevronRight size={13} />}
                    <button type="button" className={p.id === pastaAtual ? 'atual' : ''} onClick={() => setVista({ modo: 'pasta', pastaId: p.id })}>{p.nome}</button>
                  </span>
                ))}
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
                {filhas.map((pasta) => (
                  <button key={pasta.id} type="button" className="mapa-dock-pasta" onClick={() => { setVista({ modo: 'pasta', pastaId: pasta.id }); setBusca(''); }}>
                    <Folder size={26} />
                    <span>{pasta.nome}</span>
                  </button>
                ))}
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
                          evento.dataTransfer.effectAllowed = 'copy';
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

      <nav className="mapa-dock" aria-label="Acervo: mapas, tokens e pastas">
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
              return (
                <button key={pasta.id} type="button" className={ativo ? 'ativo' : ''} aria-pressed={ativo} title={pasta.nome} onClick={() => abrir({ modo: 'pasta', pastaId: pasta.id })}>
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
