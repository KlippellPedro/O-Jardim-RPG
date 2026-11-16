import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight, Eye, Folder, FolderInput, FolderUp, ImagePlus, Inbox, Loader2, Map as MapaIcone, Pencil, Scissors, Search, Sparkles, Trash2, User, Wand2, X,
} from 'lucide-react';
import { acervoApi, type IAcervo, type IItemAcervo, type TipoItemAcervo } from '../../../services/acervoApi';
import { urlPedaco } from '../../../services/mapaApi';
import { confirmar, pedirTexto } from '../../../components/avisos/confirmacao';
import { imagensDaSelecao, pastaDoArquivo, subirParaOAcervo, type ProgressoEnvio } from './subirImagem';
import { FatiadorFolha } from '../fatiador/FatiadorFolha';
import { casasDaEtiqueta } from '../fatiador/escala';
import { ETIQUETA_FORMATO_LIVRE, formatoDasEtiquetas } from '../motor/formatoToken';
import { arrastaArquivos, perguntarFormatoDoToken } from '../componentes/envioParaOAcervo';
import { MIME_ACERVO, empacotarItem } from '../componentes/dockAcervoConta';
import { ArvoreDePastas, type PropsDeAlvo } from './ArvoreDePastas';
import { DetalhesDaImagem } from './DetalhesDaImagem';
import { EscolherPasta } from './EscolherPasta';
import { MelhorarImagens } from './MelhorarImagens';
import { tokenGrandeDemais } from './imagemConta';
import {
  CRITERIOS_DE_ORDEM, MIME_MOVER_ITENS, MIME_MOVER_PASTA, arrastaItens, arrastaOrganizacao, arrastaPasta, contarPorPasta, descendentesDaPasta,
  empacotarIds, intervaloDeIds, itensQueMudam, lerIds, ordenarItens, podarSelecao, podeMoverPasta, quantasImagens, trilhaDaPasta,
  type CriterioDeOrdem,
} from './organizacao';
import './acervo.css';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  /** Há uma cena aberta para receber o mapa ou o token. */
  temCena: boolean;
  onUsarComoMapa: (item: IItemAcervo) => void;
  /** Põe o mapa na cena como um objeto (vários mapas na mesma cena). */
  onColocarMapa: (item: IItemAcervo) => void;
  onNovaCena: (item: IItemAcervo) => void;
  onPorNaCena: (item: IItemAcervo) => void;
  /** Mostra a imagem na tela de todos (carta, retrato de NPC, ilustração do lugar). */
  onMostrar?: (item: IItemAcervo) => void;
  /** Abre a imagem na Oficina (recorte de fundo, formato, moldura, melhorar). */
  onAbrirNaOficina?: (item: IItemAcervo) => void;
  /** O Mestre está escolhendo o fundo da cena narrativa: toda imagem (mapa também) ganha um botão só, "Usar de fundo". */
  modoFundo?: boolean;
}

/** O painel que está aberto por cima do Acervo (um de cada vez). */
type PainelAberto =
  | { qual: 'detalhes'; item: IItemAcervo }
  | { qual: 'mover'; itens: IItemAcervo[] }
  | { qual: 'moverPasta'; pastaId: string }
  | { qual: 'melhorar'; itens: IItemAcervo[] };

const TIPOS: Array<{ id: TipoItemAcervo; rotulo: string }> = [
  { id: 'mapa', rotulo: 'Mapas' },
  { id: 'token', rotulo: 'Tokens' },
  { id: 'objeto', rotulo: 'Objetos' },
];

const ROTULO_DO_TIPO: Record<TipoItemAcervo, string> = { mapa: 'Mapa', token: 'Token', objeto: 'Objeto' };

const CHAVE_TAMANHO = 'jardim.mapa.acervo.tamanho';
const TAMANHO_PADRAO = 170;

function tamanhoLegivel(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2)).toLocaleString('pt-BR')} MB`;
}

function lerTamanho(): number {
  try {
    const valor = Number(window.localStorage.getItem(CHAVE_TAMANHO));
    return valor >= 110 && valor <= 320 ? valor : TAMANHO_PADRAO;
  } catch {
    return TAMANHO_PADRAO;
  }
}

/** O toque ou clique veio de um controle de dentro do cartão (botão, campo) e não deve escolher o cartão. */
function veioDeControle(alvo: EventTarget | null): boolean {
  return alvo instanceof HTMLElement && Boolean(alvo.closest('button, input, select, textarea, a, label, figcaption'));
}

export const AcervoGaveta = ({ aberto, onFechar, temCena, onUsarComoMapa, onColocarMapa, onNovaCena, onPorNaCena, onMostrar, onAbrirNaOficina, modoFundo }: Props) => {
  const [acervo, setAcervo] = useState<IAcervo | null>(null);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [pasta, setPasta] = useState<string | null | 'todas'>('todas');
  const [expandidas, setExpandidas] = useState<ReadonlySet<string>>(new Set());
  const [tipo, setTipo] = useState<TipoItemAcervo>('mapa');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<CriterioDeOrdem>('nome');
  const [tamanho, setTamanho] = useState(lerTamanho);
  const [envios, setEnvios] = useState<ProgressoEnvio[]>([]);
  const [selecao, setSelecao] = useState<ReadonlySet<string>>(new Set());
  const [ancora, setAncora] = useState<string | null>(null);
  const [painel, setPainel] = useState<PainelAberto | null>(null);
  const [renomeandoItem, setRenomeandoItem] = useState<string | null>(null);
  const [nomeDoItem, setNomeDoItem] = useState('');
  /** O campo de nome já foi resolvido (Enter ou Escape): o desfoque que vem com o fechamento dele não faz nada. */
  const nomeResolvido = useRef(false);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [fatiando, setFatiando] = useState(false);
  const arquivosRef = useRef<HTMLInputElement>(null);
  const pastaRef = useRef<HTMLInputElement>(null);
  const avisoTimer = useRef<number | null>(null);

  const carregar = useCallback(async () => {
    try {
      setAcervo(await acervoApi.listar());
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir o acervo.');
    }
  }, []);

  useEffect(() => {
    if (aberto) void carregar();
  }, [aberto, carregar]);

  useEffect(() => {
    // O seletor de pasta do navegador só existe com o atributo fora do padrão do React.
    pastaRef.current?.setAttribute('webkitdirectory', '');
  }, [aberto]);

  useEffect(() => () => {
    if (avisoTimer.current !== null) window.clearTimeout(avisoTimer.current);
  }, []);

  const avisar = (texto: string) => {
    setMensagem(texto);
    if (avisoTimer.current !== null) window.clearTimeout(avisoTimer.current);
    avisoTimer.current = window.setTimeout(() => setMensagem(''), 6000);
  };

  const pastas = useMemo(() => acervo?.pastas ?? [], [acervo]);
  const prontos = useMemo(() => (acervo?.itens ?? []).filter((item) => item.estado === 'pronto'), [acervo]);
  const contagem = useMemo(() => contarPorPasta(pastas, prontos), [pastas, prontos]);

  /** Imagens da pasta aberta (sem filtro de tipo nem de busca): daqui saem as contagens das abas. */
  const doEscopo = useMemo(() => prontos.filter((item) => pasta === 'todas' || item.pasta_id === pasta), [prontos, pasta]);
  const porTipo = useMemo(() => {
    const contas: Record<TipoItemAcervo, number> = { mapa: 0, token: 0, objeto: 0 };
    for (const item of doEscopo) contas[item.tipo]++;
    return contas;
  }, [doEscopo]);

  const buscando = busca.trim().length > 0;
  const itens = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const casam = doEscopo.filter((item) =>
      (termo ? item.nome.toLowerCase().includes(termo) || item.etiquetas.some((e) => e.includes(termo)) : item.tipo === tipo));
    return ordenarItens(casam, ordem);
  }, [doEscopo, busca, tipo, ordem]);

  const idsVisiveis = useMemo(() => itens.map((item) => item.id), [itens]);
  const chaveVisiveis = idsVisiveis.join('|');
  useEffect(() => {
    setSelecao((atual) => podarSelecao(atual, idsVisiveis));
    // chaveVisiveis resume idsVisiveis: só roda quando a lista muda de fato.
  }, [chaveVisiveis]); // eslint-disable-line react-hooks/exhaustive-deps

  const abrirPasta = (destino: string | null | 'todas') => {
    setPasta(destino);
    setSelecao(new Set());
    setAncora(null);
    if (typeof destino === 'string' && destino !== 'todas') {
      // Mostrar a pasta aberta: os ancestrais dela se abrem na árvore.
      setExpandidas((atual) => new Set([...atual, ...trilhaDaPasta(pastas, destino).map((p) => p.id)]));
    }
  };

  const nomeDaPasta = (id: string | null) => (id === null ? 'fora de pasta' : `"${pastas.find((p) => p.id === id)?.nome ?? 'pasta'}"`);

  // ------------------------------------------------------------ envio

  const subir = async (lista: FileList | File[] | null, comPastas: boolean, destinoPasta?: string | null) => {
    const arquivos = lista ? imagensDaSelecao(lista) : [];
    if (!arquivos.length) {
      if (lista && lista.length) setErro('Só imagens (png, jpg, webp ou gif) sobem para o Acervo.');
      return;
    }
    // Token tem dois jeitos de aparecer no mapa: pergunta uma vez, antes de começar a subir.
    let etiquetas: string[] | undefined;
    if (tipo === 'token') {
      const formato = await perguntarFormatoDoToken(arquivos.length, arquivos[0].name);
      if (!formato) {
        if (arquivosRef.current) arquivosRef.current.value = '';
        if (pastaRef.current) pastaRef.current.value = '';
        return;
      }
      if (formato === 'livre') etiquetas = [ETIQUETA_FORMATO_LIVRE];
    }
    setEnviando(true);
    setEnvios([]);
    setErro('');
    const pastasCriadas = new Map<string, string>();
    const base: string | null = destinoPasta !== undefined ? destinoPasta : pasta === 'todas' ? null : pasta;
    try {
      for (const arquivo of arquivos) {
        let destino: string | null = base;
        const caminho = comPastas ? pastaDoArquivo(arquivo) : null;
        if (caminho) {
          if (!pastasCriadas.has(caminho)) pastasCriadas.set(caminho, (await acervoApi.garantirCaminho(caminho)).id);
          destino = pastasCriadas.get(caminho)!;
        }
        await subirParaOAcervo(arquivo, {
          tipo,
          pastaId: destino,
          ...(etiquetas ? { etiquetas } : {}),
          aoProgresso: (progresso) => setEnvios((atual) => [progresso, ...atual.filter((p) => p.arquivo !== progresso.arquivo)].slice(0, 6)),
        });
      }
      await carregar();
      avisar(`${quantasImagens(arquivos.length)} ${arquivos.length === 1 ? 'subiu' : 'subiram'} para o Acervo.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Uma imagem não subiu.');
    } finally {
      setEnviando(false);
      // A lista de pedaços enviados some sozinha depois de um instante.
      window.setTimeout(() => setEnvios([]), 3500);
      if (arquivosRef.current) arquivosRef.current.value = '';
      if (pastaRef.current) pastaRef.current.value = '';
    }
  };

  // ----------------------------------------------------------- pastas

  const novaPasta = async (paiId: string | null) => {
    const nome = await pedirTexto({
      titulo: paiId ? `Nova pasta dentro de ${nomeDaPasta(paiId)}` : 'Nova pasta',
      campo: { rotulo: 'Nome da pasta', maximo: 80 },
      rotuloConfirmar: 'Criar pasta',
    });
    if (!nome) return;
    try {
      const { id } = await acervoApi.criarPasta(nome, paiId);
      await carregar();
      if (paiId) setExpandidas((atual) => new Set([...atual, paiId]));
      setPasta(id);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para criar a pasta.');
    }
  };

  const renomearPasta = async (id: string, nome: string) => {
    try {
      await acervoApi.renomearPasta(id, nome);
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para renomear a pasta.');
    }
  };

  const apagarPasta = async (id: string, nome: string) => {
    const dentro = contagem.porPasta.get(id) ?? 0;
    const confirmado = await confirmar({
      titulo: `Apagar a pasta "${nome}"?`,
      mensagem: dentro
        ? `As ${quantasImagens(dentro)} de dentro (e das subpastas) vão para fora de pasta. Nenhuma imagem é apagada.`
        : 'A pasta está vazia.',
      rotuloConfirmar: 'Apagar pasta',
      tom: 'perigo',
    });
    if (!confirmado) return;
    try {
      await acervoApi.apagarPasta(id);
      if (pasta === id || (typeof pasta === 'string' && pasta !== 'todas' && descendentesDaPasta(pastas, id).has(pasta))) setPasta('todas');
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para apagar a pasta.');
    }
  };

  const moverPastaPara = async (id: string, destino: string | null) => {
    const origem = pastas.find((p) => p.id === id);
    if (!origem) return;
    if (!podeMoverPasta(pastas, id, destino)) {
      if (destino === id || (destino !== null && descendentesDaPasta(pastas, id).has(destino))) setErro('Uma pasta não cabe dentro dela mesma nem de uma das suas subpastas.');
      return;
    }
    try {
      await acervoApi.moverPasta(id, destino);
      if (destino) setExpandidas((atual) => new Set([...atual, destino]));
      await carregar();
      avisar(`A pasta "${origem.nome}" foi para ${nomeDaPasta(destino)}.`);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para mover a pasta.');
    }
  };

  // ----------------------------------------------------------- imagens

  const moverItensPara = async (ids: readonly string[], destino: string | null) => {
    if (!acervo) return;
    const mudam = itensQueMudam(acervo.itens, ids, destino);
    if (!mudam.length) {
      avisar(`Já ${ids.length === 1 ? 'está' : 'estão'} em ${nomeDaPasta(destino)}.`);
      return;
    }
    // A tela muda na hora; se o servidor recusar alguma, a lista é pedida de novo.
    const idsQueMudam = new Set(mudam.map((i) => i.id));
    setAcervo((atual) => atual && { ...atual, itens: atual.itens.map((i) => (idsQueMudam.has(i.id) ? { ...i, pasta_id: destino } : i)) });
    setSelecao(new Set());
    const falhas = await acervoApi.moverItens(mudam.map((i) => i.id), destino);
    if (falhas.length) {
      setErro(`${quantasImagens(falhas.length)} não ${falhas.length === 1 ? 'pôde' : 'puderam'} mudar de pasta.`);
      await carregar();
    }
    const feitas = mudam.length - falhas.length;
    if (feitas) avisar(`${quantasImagens(feitas)} ${feitas === 1 ? 'foi' : 'foram'} para ${nomeDaPasta(destino)}.`);
  };

  const apagarItens = async (lista: readonly IItemAcervo[]) => {
    if (!lista.length) return;
    const confirmado = await confirmar({
      titulo: lista.length === 1 ? `Apagar "${lista[0].nome}"?` : `Apagar ${quantasImagens(lista.length)}?`,
      mensagem: 'Cena que usa um mapa apagado fica sem imagem, e token fica com o retrato padrão. Não dá para desfazer.',
      rotuloConfirmar: 'Apagar',
      tom: 'perigo',
    });
    if (!confirmado) return;
    const falhas = await acervoApi.apagarItens(lista.map((i) => i.id));
    if (falhas.length) setErro(`${quantasImagens(falhas.length)} não ${falhas.length === 1 ? 'pôde' : 'puderam'} ser ${falhas.length === 1 ? 'apagada' : 'apagadas'} (uma peça de mapa em edição, por exemplo).`);
    setSelecao(new Set());
    await carregar();
  };

  const mudarTipoDaSelecao = async (lista: readonly IItemAcervo[], novo: TipoItemAcervo) => {
    const mudam = lista.filter((i) => i.tipo !== novo);
    if (!mudam.length) return;
    const falhas = await acervoApi.mudarTipoDosItens(mudam.map((i) => i.id), novo);
    if (falhas.length) setErro(`${quantasImagens(falhas.length)} não ${falhas.length === 1 ? 'pôde' : 'puderam'} mudar de tipo (peça de mapa em edição, por exemplo).`);
    else avisar(`${quantasImagens(mudam.length)} agora ${mudam.length === 1 ? 'é' : 'são'} ${ROTULO_DO_TIPO[novo].toLowerCase()}${mudam.length === 1 ? '' : 's'}.`);
    if (mudam.length > falhas.length) setTipo(novo);
    await carregar();
  };

  const renomearItem = async (item: IItemAcervo, nome: string) => {
    setRenomeandoItem(null);
    const limpo = nome.trim();
    if (!limpo || limpo === item.nome) return;
    try {
      const salvo = await acervoApi.editarItem(item.id, { nome: limpo });
      setAcervo((atual) => atual && { ...atual, itens: atual.itens.map((i) => (i.id === salvo.id ? salvo : i)) });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para renomear a imagem.');
    }
  };

  // --------------------------------------------------------- seleção

  // Cada mudança parte da seleção de agora (função), não da que o desenho anterior viu: dois cliques rápidos não se atropelam.
  const escolherCartao = (item: IItemAcervo, evento: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }) => {
    if (evento.shiftKey) {
      setSelecao((atual) => new Set([...atual, ...intervaloDeIds(idsVisiveis, ancora, item.id)]));
      return;
    }
    if (evento.ctrlKey || evento.metaKey) {
      alternarNaSelecao(item);
      return;
    }
    setSelecao((atual) => (atual.size === 1 && atual.has(item.id) ? new Set() : new Set([item.id])));
    setAncora(item.id);
  };

  const alternarNaSelecao = (item: IItemAcervo) => {
    setSelecao((atual) => {
      const nova = new Set(atual);
      if (nova.has(item.id)) nova.delete(item.id);
      else nova.add(item.id);
      return nova;
    });
    setAncora(item.id);
  };

  const escolhidos = useMemo(() => itens.filter((item) => selecao.has(item.id)), [itens, selecao]);

  const aoTeclar = (evento: React.KeyboardEvent) => {
    const alvoDoEvento = evento.target as HTMLElement;
    if (alvoDoEvento.closest('input, select, textarea')) return;
    if (evento.key === 'Escape' && selecao.size) {
      evento.stopPropagation();
      setSelecao(new Set());
    } else if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 'a') {
      evento.preventDefault();
      setSelecao(new Set(idsVisiveis));
    } else if (evento.key === 'Delete' && escolhidos.length) {
      evento.preventDefault();
      void apagarItens(escolhidos);
    }
  };

  // ----------------------------------------------------------- arrasto

  const comecarArrasto = (item: IItemAcervo, evento: React.DragEvent) => {
    // Arrastar uma imagem da seleção leva a seleção toda; arrastar uma de fora leva só ela, sem mexer na seleção
    // (a barra de lote aparecendo no meio do arrasto faria a tela pular).
    const ids = selecao.has(item.id) ? idsVisiveis.filter((id) => selecao.has(id)) : [item.id];
    evento.dataTransfer.setData(MIME_MOVER_ITENS, empacotarIds(ids));
    // O mesmo arrasto vale para o mapa: solto lá, a imagem entra na cena.
    evento.dataTransfer.setData(MIME_ACERVO, empacotarItem(item));
    evento.dataTransfer.effectAllowed = 'copyMove';
  };

  const soltar = async (destino: string | null, dados: DataTransfer) => {
    // O conteúdo do arrasto só se lê enquanto o evento ainda é síncrono.
    const tipos = Array.from(dados.types);
    const ids = arrastaItens(tipos) ? lerIds(dados.getData(MIME_MOVER_ITENS)) : [];
    const pastaArrastada = arrastaPasta(tipos) ? dados.getData(MIME_MOVER_PASTA) : '';
    const arquivos = arrastaArquivos(tipos) ? Array.from(dados.files) : [];
    if (ids.length) await moverItensPara(ids, destino);
    else if (pastaArrastada) await moverPastaPara(pastaArrastada, destino);
    else if (arquivos.length) await subir(arquivos, false, destino);
  };

  const propsDeAlvo: PropsDeAlvo = (chave, destino) => {
    const aceita = (evento: React.DragEvent) => {
      const tipos = evento.dataTransfer.types;
      if (!arrastaOrganizacao(tipos) && !arrastaArquivos(tipos)) return false;
      evento.preventDefault();
      evento.dataTransfer.dropEffect = arrastaArquivos(tipos) ? 'copy' : 'move';
      return true;
    };
    return {
      className: alvo === chave ? 'alvo' : '',
      onDragOver: (evento) => {
        if (aceita(evento) && alvo !== chave) setAlvo(chave);
      },
      onDragEnter: (evento) => {
        if (aceita(evento) && alvo !== chave) setAlvo(chave);
      },
      onDragLeave: (evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setAlvo((atual) => (atual === chave ? null : atual));
      },
      onDrop: (evento) => {
        const tipos = evento.dataTransfer.types;
        if (!arrastaOrganizacao(tipos) && !arrastaArquivos(tipos)) return;
        evento.preventDefault();
        evento.stopPropagation();
        setAlvo(null);
        void soltar(destino, evento.dataTransfer);
      },
    };
  };

  if (!aberto) return null;

  const uso = acervo?.uso_bytes ?? 0;
  const abertaNaTrilha = typeof pasta === 'string' && pasta !== 'todas' ? trilhaDaPasta(pastas, pasta) : [];
  const subpastasDaAberta = typeof pasta === 'string' && pasta !== 'todas'
    ? pastas.filter((p) => p.pai_id === pasta).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }))
    : [];
  const soltandoArquivos = alvo === 'painel';
  const pastaDoEnvio: string | null = typeof pasta === 'string' && pasta !== 'todas' ? pasta : null;
  const destinoDoEnvio = `${ROTULO_DO_TIPO[tipo]} ${pastaDoEnvio ? `na pasta ${nomeDaPasta(pastaDoEnvio)}` : 'fora de pasta'}`;

  return (
    <aside className="mapa-acervo" aria-label="Acervo" onKeyDown={aoTeclar} onDragEnd={() => setAlvo(null)}>
      <header>
        <strong>Acervo</strong>
        <span className={uso > (acervo?.aviso_bytes ?? Infinity) ? 'mapa-acervo-uso alerta' : 'mapa-acervo-uso'}>
          {acervo ? `ocupa ${tamanhoLegivel(uso)}` : ''}
        </span>
        <button type="button" className="mapa-icone" aria-label="Fechar o acervo" onClick={onFechar}><X size={18} /></button>
      </header>

      <div className="mapa-acervo-corpo">
        <div className="acervo-lateral">
          <ArvoreDePastas
            pastas={pastas}
            contagem={contagem}
            selecionada={pasta}
            expandidas={expandidas}
            onSelecionar={abrirPasta}
            onAlternar={(id) => setExpandidas((atual) => {
              const nova = new Set(atual);
              if (nova.has(id)) nova.delete(id);
              else nova.add(id);
              return nova;
            })}
            onExpandir={(id) => setExpandidas((atual) => new Set([...atual, id]))}
            onNovaSubpasta={(pai) => void novaPasta(pai)}
            onRenomear={(id, nome) => void renomearPasta(id, nome)}
            onMover={(id) => setPainel({ qual: 'moverPasta', pastaId: id })}
            onApagar={(id, nome) => void apagarPasta(id, nome)}
            propsDeAlvo={propsDeAlvo}
          />
        </div>

        <section
          className={`mapa-acervo-itens${soltandoArquivos ? ' soltando' : ''}`}
          data-destino={`Solte para subir como ${destinoDoEnvio}`}
          // Só arquivos do computador acendem o painel todo (sobem para a pasta aberta). Imagens e pastas do Acervo só se
          // soltam em pastas; arrastar uma por cima da grade não pode mostrar a tela de envio.
          onDragOver={(evento) => {
            if (!arrastaArquivos(evento.dataTransfer.types)) return;
            evento.preventDefault();
            evento.dataTransfer.dropEffect = 'copy';
            if (alvo !== 'painel') setAlvo('painel');
          }}
          onDragLeave={(evento) => {
            if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) setAlvo((atual) => (atual === 'painel' ? null : atual));
          }}
          onDrop={(evento) => {
            if (!arrastaArquivos(evento.dataTransfer.types)) return;
            evento.preventDefault();
            setAlvo(null);
            void soltar(pastaDoEnvio, evento.dataTransfer);
          }}
        >
          <div className="mapa-acervo-barra">
            <label className="acervo-pasta-select">
              <Folder size={14} />
              <select
                aria-label="Pasta"
                value={pasta === 'todas' ? 'todas' : pasta ?? 'fora'}
                onChange={(evento) => abrirPasta(evento.target.value === 'todas' ? 'todas' : evento.target.value === 'fora' ? null : evento.target.value)}
              >
                <option value="todas">Tudo</option>
                <option value="fora">Fora de pasta</option>
                {pastas.map((p) => <option key={p.id} value={p.id}>{trilhaDaPasta(pastas, p.id).map((t) => t.nome).join(' › ')}</option>)}
              </select>
            </label>
            <div className="mapa-abas" role="tablist">
              {TIPOS.map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={!buscando && tipo === t.id} className={!buscando && tipo === t.id ? 'ativo' : ''} onClick={() => { setTipo(t.id); setBusca(''); }}>
                  {t.rotulo} <small>{porTipo[t.id]}</small>
                </button>
              ))}
            </div>
            <label className="mapa-busca">
              <Search size={14} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou etiqueta (em todos os tipos)" />
            </label>
            <label className="acervo-ordem">
              Ordem
              <select value={ordem} onChange={(e) => setOrdem(e.target.value as CriterioDeOrdem)}>
                {CRITERIOS_DE_ORDEM.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
              </select>
            </label>
            <label className="acervo-tamanho" title="Tamanho dos cartões">
              <ImagePlus size={12} />
              <input
                type="range"
                min={110}
                max={320}
                step={10}
                value={tamanho}
                aria-label="Tamanho dos cartões"
                onChange={(e) => {
                  const valor = Number(e.target.value);
                  setTamanho(valor);
                  try {
                    window.localStorage.setItem(CHAVE_TAMANHO, String(valor));
                  } catch {
                    // Sem armazenamento do navegador, o tamanho vale até fechar a aba.
                  }
                }}
              />
              <ImagePlus size={18} />
            </label>
          </div>

          <div className="mapa-acervo-barra">
            <button type="button" className="mapa-botao" disabled={enviando} onClick={() => arquivosRef.current?.click()}>
              <ImagePlus size={15} /> Subir imagens
            </button>
            <button type="button" className="mapa-botao" disabled={enviando} onClick={() => pastaRef.current?.click()}>
              <FolderUp size={15} /> Subir pasta
            </button>
            <button type="button" className="mapa-botao" disabled={enviando} title="Corta uma folha com vários objetos em peças soltas, com fundo transparente" onClick={() => setFatiando(true)}>
              <Scissors size={15} /> Fatiar folha
            </button>
            <span className="acervo-dica-envio">Solte arquivos do computador aqui para subir como {destinoDoEnvio}.</span>
            <input ref={arquivosRef} type="file" accept="image/*" multiple hidden onChange={(e) => void subir(e.target.files, false)} />
            <input ref={pastaRef} type="file" multiple hidden onChange={(e) => void subir(e.target.files, true)} />
          </div>

          {abertaNaTrilha.length > 0 && (
            <nav className="acervo-caminho" aria-label="Caminho da pasta">
              {(() => {
                const raiz = propsDeAlvo('caminho:raiz', null);
                return (
                  <button type="button" className={raiz.className} onClick={() => abrirPasta('todas')} onDragOver={raiz.onDragOver} onDragEnter={raiz.onDragEnter} onDragLeave={raiz.onDragLeave} onDrop={raiz.onDrop} title="Solte aqui para tirar da pasta">
                    <Inbox size={13} /> Acervo
                  </button>
                );
              })()}
              {abertaNaTrilha.map((p) => {
                const migalha = propsDeAlvo(`caminho:${p.id}`, p.id);
                return (
                  <span key={p.id}>
                    <ChevronRight size={12} />
                    <button type="button" className={`${p.id === pasta ? 'atual ' : ''}${migalha.className}`} onClick={() => abrirPasta(p.id)} onDragOver={migalha.onDragOver} onDragEnter={migalha.onDragEnter} onDragLeave={migalha.onDragLeave} onDrop={migalha.onDrop}>
                      {p.nome}
                    </button>
                  </span>
                );
              })}
            </nav>
          )}

          {tipo === 'mapa' && !buscando && <p className="mapa-dica">"Colocar" põe o mapa na cena como um objeto: vários mapas ficam lado a lado, e cada um anda, muda de tamanho, tranca e se esconde dos jogadores. "Trocar fundo" troca o mapa de fundo da cena.</p>}
          {erro && <p className="mapa-erro" role="alert">{erro} <button type="button" className="mapa-botao-leve" onClick={() => setErro('')}>Ok</button></p>}
          {mensagem && <p className="acervo-mensagem" role="status">{mensagem}</p>}
          {envios.length > 0 && (
            <ul className="mapa-envios">
              {envios.map((p) => (
                <li key={p.arquivo}>
                  {enviando && p.feitos < p.total ? <Loader2 size={12} className="girando" /> : '✓'} {p.arquivo}: {p.feitos}/{p.total} pedaços
                </li>
              ))}
            </ul>
          )}

          {escolhidos.length > 0 && (
            <div className="acervo-selecao" role="toolbar" aria-label="Imagens escolhidas">
              <strong>{quantasImagens(escolhidos.length)} {escolhidos.length === 1 ? 'escolhida' : 'escolhidas'}</strong>
              <button type="button" className="mapa-botao-leve" onClick={() => setPainel({ qual: 'mover', itens: escolhidos })}><FolderInput size={14} /> Mover para...</button>
              <label className="acervo-tipo-lote">
                Tipo
                <select value="" aria-label="Mudar o tipo das imagens escolhidas" onChange={(e) => e.target.value && void mudarTipoDaSelecao(escolhidos, e.target.value as TipoItemAcervo)}>
                  <option value="">Mudar para...</option>
                  {TIPOS.map((t) => <option key={t.id} value={t.id}>{ROTULO_DO_TIPO[t.id]}</option>)}
                </select>
              </label>
              <button type="button" className="mapa-botao-leve" onClick={() => setPainel({ qual: 'melhorar', itens: escolhidos })}><Sparkles size={14} /> Melhorar</button>
              <button type="button" className="mapa-botao-leve perigo" onClick={() => void apagarItens(escolhidos)}><Trash2 size={14} /> Apagar</button>
              <button type="button" className="mapa-botao-leve" onClick={() => setSelecao(new Set(idsVisiveis))}>Escolher todas</button>
              <button type="button" className="mapa-botao-leve" onClick={() => setSelecao(new Set())}>Limpar</button>
            </div>
          )}

          <div className="mapa-acervo-grade" role="listbox" aria-multiselectable="true" aria-label="Imagens do Acervo" style={{ ['--acervo-cartao' as string]: `${tamanho}px` }}>
            {subpastasDaAberta.map((sub) => {
              const alvoDaPasta = propsDeAlvo(`tile:${sub.id}`, sub.id);
              return (
                <div
                  key={sub.id}
                  role="button"
                  tabIndex={0}
                  className={`acervo-pasta-tile ${alvoDaPasta.className}`}
                  draggable
                  title={`${sub.nome} (arraste para outra pasta)`}
                  onClick={() => abrirPasta(sub.id)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      abrirPasta(sub.id);
                    }
                  }}
                  onDragStart={(evento) => {
                    evento.dataTransfer.setData(MIME_MOVER_PASTA, sub.id);
                    evento.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={alvoDaPasta.onDragOver}
                  onDragEnter={alvoDaPasta.onDragEnter}
                  onDragLeave={alvoDaPasta.onDragLeave}
                  onDrop={alvoDaPasta.onDrop}
                >
                  <Folder size={34} />
                  <span>{sub.nome}</span>
                  <small>{quantasImagens(contagem.diretas.get(sub.id) ?? 0)}{pastas.some((p) => p.pai_id === sub.id) ? ` · ${pastas.filter((p) => p.pai_id === sub.id).length === 1 ? '1 subpasta' : `${pastas.filter((p) => p.pai_id === sub.id).length} subpastas`}` : ''}</small>
                </div>
              );
            })}
            {itens.map((item) => {
              const escolhido = selecao.has(item.id);
              const livre = (item.tipo === 'token' || item.tipo === 'objeto') && formatoDasEtiquetas(item.etiquetas) === 'livre';
              const grande = item.tipo === 'token' && tokenGrandeDemais(item.largura, item.altura);
              return (
                <figure
                  key={item.id}
                  role="option"
                  aria-selected={escolhido}
                  tabIndex={0}
                  draggable={renomeandoItem !== item.id}
                  className={`mapa-acervo-item${escolhido ? ' escolhido' : ''}`}
                  onClick={(evento) => {
                    if (veioDeControle(evento.target)) return;
                    escolherCartao(item, evento);
                  }}
                  onKeyDown={(evento) => {
                    if (evento.target !== evento.currentTarget) return;
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      alternarNaSelecao(item);
                    }
                  }}
                  onDragStart={(evento) => comecarArrasto(item, evento)}
                >
                  <label className="acervo-marca" title="Escolher esta imagem">
                    <input type="checkbox" checked={escolhido} aria-label={`Escolher ${item.nome}`} onChange={() => alternarNaSelecao(item)} />
                  </label>
                  <img src={urlPedaco(item.id, 'mini')} alt="" loading="lazy" draggable={false} data-tipo={item.tipo} />
                  {renomeandoItem === item.id ? (
                    <input
                      className="acervo-nome-campo"
                      autoFocus
                      value={nomeDoItem}
                      maxLength={120}
                      aria-label={`Novo nome de ${item.nome}`}
                      onChange={(e) => setNomeDoItem(e.target.value)}
                      onBlur={() => {
                        if (nomeResolvido.current) return;
                        nomeResolvido.current = true;
                        void renomearItem(item, nomeDoItem);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !nomeResolvido.current) {
                          nomeResolvido.current = true;
                          void renomearItem(item, nomeDoItem);
                        }
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          nomeResolvido.current = true;
                          setRenomeandoItem(null);
                        }
                      }}
                    />
                  ) : (
                    <figcaption title={`${item.nome} (duplo clique renomeia)`} onDoubleClick={() => { nomeResolvido.current = false; setRenomeandoItem(item.id); setNomeDoItem(item.nome); }}>{item.nome}</figcaption>
                  )}
                  <small>
                    {item.largura} x {item.altura}
                    {casasDaEtiqueta(item.etiquetas) !== null && ` · ${casasDaEtiqueta(item.etiquetas)} casas`}
                  </small>
                  <div className="acervo-selos">
                    {buscando && <span className="acervo-selo">{ROTULO_DO_TIPO[item.tipo]}</span>}
                    {livre && <span className="acervo-selo" title="Entra na cena como a imagem inteira, sem círculo">corpo inteiro</span>}
                    {grande && <span className="acervo-selo aviso" title="Passa de 1024 px: no mapa aparece como miniatura. Use Melhorar > Ajustar para o mapa.">grande demais</span>}
                    {(!item.licenca || item.licenca === 'desconhecida') && <span className="mapa-acervo-sem-licenca">sem licença</span>}
                  </div>
                  <div className="mapa-acervo-acoes">
                    {modoFundo ? (
                      <button type="button" className="mapa-acervo-usar-fundo" onClick={() => onPorNaCena(item)}><Eye size={13} /> Usar de fundo</button>
                    ) : item.tipo === 'mapa' ? (
                      <>
                        {temCena && <button type="button" title="Põe o mapa na cena como um objeto: dá para arrastar, mudar o tamanho, trancar e esconder dos jogadores" onClick={() => onColocarMapa(item)}><MapaIcone size={13} /> Colocar</button>}
                        {temCena && <button type="button" title="Troca o mapa de fundo da cena por este" onClick={() => onUsarComoMapa(item)}>Trocar fundo</button>}
                        <button type="button" onClick={() => onNovaCena(item)}>Nova cena</button>
                      </>
                    ) : (
                      temCena && <button type="button" onClick={() => onPorNaCena(item)}><User size={13} /> Pôr na cena</button>
                    )}
                    {onMostrar && !modoFundo && <button type="button" aria-label={`Mostrar ${item.nome} à mesa`} title="Mostra esta imagem na tela de todos" onClick={() => onMostrar(item)}><Eye size={13} /> Mostrar</button>}
                  </div>
                  <div className="mapa-acervo-acoes acervo-acoes-icones">
                    <button type="button" aria-label={`Editar ${item.nome}`} title="Nome, tipo, pasta, etiquetas, formato do token e licença" onClick={() => setPainel({ qual: 'detalhes', item })}><Pencil size={13} /></button>
                    <button type="button" aria-label={`Mover ${item.nome} para uma pasta`} title="Mover para uma pasta" onClick={() => setPainel({ qual: 'mover', itens: [item] })}><FolderInput size={13} /></button>
                    <button type="button" aria-label={`Melhorar a qualidade de ${item.nome}`} title="Ampliar com IA ou ajustar para o mapa" onClick={() => setPainel({ qual: 'melhorar', itens: [item] })}><Sparkles size={13} /></button>
                    {onAbrirNaOficina && <button type="button" aria-label={`Abrir ${item.nome} na Oficina`} title="Oficina: recortar o fundo, emoldurar, ajustar" onClick={() => onAbrirNaOficina(item)}><Wand2 size={13} /></button>}
                    <button type="button" aria-label={`Apagar ${item.nome}`} title="Apagar" onClick={() => void apagarItens([item])}><Trash2 size={13} /></button>
                  </div>
                </figure>
              );
            })}
            {acervo && !itens.length && !subpastasDaAberta.length && (
              <p className="mapa-vazio">
                {buscando
                  ? 'Nenhuma imagem com esse nome ou etiqueta nesta pasta.'
                  : 'Nada aqui ainda. Suba imagens ou uma pasta inteira do seu PC (as subpastas viram pastas do acervo), ou arraste imagens de outro lugar para cá.'}
              </p>
            )}
          </div>
        </section>
      </div>

      {fatiando && (
        <FatiadorFolha
          onFechar={() => setFatiando(false)}
          onSalvo={() => {
            setTipo('objeto');
            setPasta('todas');
            void carregar();
          }}
        />
      )}
      {painel?.qual === 'detalhes' && (
        <DetalhesDaImagem
          key={painel.item.id}
          item={painel.item}
          pastas={pastas}
          onSalvo={(salvo) => {
            const antes = painel.item;
            setAcervo((atual) => atual && { ...atual, itens: atual.itens.map((i) => (i.id === salvo.id ? salvo : i)) });
            setPainel(null);
            // Mudou de tipo ou de pasta: a imagem sai da lista de agora, então a tela diz para onde ela foi.
            if (salvo.tipo !== antes.tipo && !buscando) setTipo(salvo.tipo);
            if (salvo.pasta_id !== antes.pasta_id && pasta !== 'todas') avisar(`"${salvo.nome}" foi para ${nomeDaPasta(salvo.pasta_id)}.`);
          }}
          onFechar={() => setPainel(null)}
        />
      )}
      {painel?.qual === 'mover' && (
        <EscolherPasta
          titulo={painel.itens.length === 1 ? `Mover "${painel.itens[0].nome}" para...` : `Mover ${quantasImagens(painel.itens.length)} para...`}
          pastas={pastas}
          atual={painel.itens.every((i) => i.pasta_id === painel.itens[0].pasta_id) ? painel.itens[0].pasta_id : undefined}
          onEscolher={(destino) => {
            const ids = painel.itens.map((i) => i.id);
            setPainel(null);
            void moverItensPara(ids, destino);
          }}
          onFechar={() => setPainel(null)}
        />
      )}
      {painel?.qual === 'moverPasta' && (
        <EscolherPasta
          titulo={`Mover a pasta ${nomeDaPasta(painel.pastaId)} para...`}
          pastas={pastas}
          excluir={new Set([painel.pastaId, ...descendentesDaPasta(pastas, painel.pastaId)])}
          atual={pastas.find((p) => p.id === painel.pastaId)?.pai_id ?? null}
          onEscolher={(destino) => {
            const id = painel.pastaId;
            setPainel(null);
            void moverPastaPara(id, destino);
          }}
          onFechar={() => setPainel(null)}
        />
      )}
      {painel?.qual === 'melhorar' && (
        <MelhorarImagens
          key={painel.itens.map((i) => i.id).join('|')}
          itens={painel.itens}
          onConcluir={(novos, falhas) => {
            setPainel(null);
            if (falhas.length) setErro(`Não deu certo: ${falhas.join('; ')}.`);
            if (novos.length) {
              avisar(novos.length === 1 ? `"${novos[0].nome}" está no Acervo, ao lado da original.` : `${quantasImagens(novos.length)} novas estão no Acervo, ao lado das originais.`);
              setBusca('');
            }
            void carregar();
          }}
          onFechar={() => setPainel(null)}
        />
      )}
    </aside>
  );
};
