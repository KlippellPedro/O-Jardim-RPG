// O construtor de mapas do Mestre, aberto por cima do mapa da mesa: a lista dos mapas
// montados e o editor (salas, chão, paredes, portas e janelas). O editor salva sozinho; o
// botão Publicar desenha o mapa no acervo e põe na cena.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppWindow, ArrowLeft, BrickWall, CloudUpload, CopyPlus, DoorClosed, Eraser, Expand, Flame, Ghost, Hand, ImagePlus, Loader2, Paintbrush, Plus, Redo2, Search, Square, Trash2, Undo2,
} from 'lucide-react';
import { acervoApi, type IItemAcervo } from '../../../services/acervoApi';
import { construtorApi, type IProjeto, type IResumoProjeto } from '../../../services/construtorApi';
import { urlPedaco, type IEstadoMapa } from '../../../services/mapaApi';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar, pedirTexto } from '../../../components/avisos/confirmacao';
import { BotaoFerramenta } from '../componentes/BotaoFerramenta';
import { EditorConstrutor, type FerramentaConstrutor, type OpcoesConstrutor } from './editor';
import {
  CAMADAS_PECA, camadaDe, chaveDaImagem, contagem, ESCALA_PECA_MAX, LUZES_PRONTAS, MATERIAIS_CHAO, MATERIAIS_PAREDE, pecasEmOrdem, type IConteudoProjeto, type IPecaPronta,
} from './projeto';
import { texturaDaParede, texturaDoChao } from './materiais';
import { publicarProjeto, type ProgressoPublicacao } from './publicar';
import { carregarImagemPeca, casasDoMapa, MOBILIA, pecaDaMobilia, pecaDoAcervo, pecaDoMapa, urlDaMobilia, type ModeloPeca } from './pecas';
import './construtor.css';

interface Props {
  campanhaId: string;
  /** A cena aberta no mapa, para oferecer "publicar nela". */
  cenaAtual: { id: string; nome: string } | null;
  onPublicado: (estado: IEstadoMapa) => void;
  onFechar: () => void;
}

const FERRAMENTAS: Array<{ id: FerramentaConstrutor; rotulo: string; atalho: string; icone: typeof Hand; dica: string }> = [
  { id: 'mao', rotulo: 'Andar pelo mapa', atalho: 'H', icone: Hand, dica: 'Arraste para andar pelo mapa. A roda do mouse aproxima; o botão direito anda com qualquer ferramenta.' },
  { id: 'sala', rotulo: 'Sala', atalho: 'S', icone: Square, dica: 'Arraste de uma casa a outra: faz o chão e a parede em volta. Salas encostadas viram uma só.' },
  { id: 'chao', rotulo: 'Pincel de chão', atalho: 'B', icone: Paintbrush, dica: 'Pinte o chão com o material escolhido.' },
  { id: 'parede', rotulo: 'Parede', atalho: 'W', icone: BrickWall, dica: 'Arraste de um canto da grade a outro para levantar uma parede reta.' },
  { id: 'porta', rotulo: 'Porta', atalho: 'D', icone: DoorClosed, dica: 'Clique numa parede: a porta entra fechada. Clique de novo para aberta, trancada e para tirar.' },
  { id: 'janela', rotulo: 'Janela', atalho: 'J', icone: AppWindow, dica: 'Clique numa parede para pôr ou tirar uma janela.' },
  { id: 'secreta', rotulo: 'Porta secreta', atalho: 'X', icone: Ghost, dica: 'Clique numa parede: no mapa ela continua parede, e só você vê a porta.' },
  { id: 'peca', rotulo: 'Peças e mobília', atalho: 'I', icone: ImagePlus, dica: 'Escolha uma peça da mobília do Jardim ou um objeto do Acervo. Clique para colocar; arraste uma peça para mover. Shift + clique junta várias peças, que andam juntas e podem virar uma peça pronta.' },
  { id: 'luz', rotulo: 'Luz fixa', atalho: 'L', icone: Flame, dica: 'Clique para pôr uma luz (tocha, vela, braseiro). Na mesa, ela brilha e abre caminho no escuro. Arraste uma luz para mover.' },
  { id: 'borracha', rotulo: 'Borracha', atalho: 'E', icone: Eraser, dica: 'Apague o chão, ou, no modo Paredes, a parede mais perto do cursor.' },
];

const ATALHOS = new Map(FERRAMENTAS.map((f) => [f.atalho.toLowerCase(), f.id]));

type EstadoSalvo = 'salvo' | 'salvando' | 'pendente' | 'erro';

/** Um quadrado com a textura do material, para escolher. */
const Amostra = ({ fonte }: { fonte: CanvasImageSource }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) ctx.drawImage(fonte, 0, 0, 128, 128, 0, 0, 44, 44);
  }, [fonte]);
  return <canvas ref={ref} width={44} height={44} aria-hidden="true" />;
};

function tamanhoDoConteudo(conteudo: IConteudoProjeto): { largura: number; altura: number } {
  return { largura: conteudo.chao[0]?.length ?? 0, altura: conteudo.chao.length };
}

export const ConstrutorMapa = ({ campanhaId, cenaAtual, onPublicado, onFechar }: Props) => {
  const [projetos, setProjetos] = useState<IResumoProjeto[] | null>(null);
  const [projeto, setProjeto] = useState<IProjeto | null>(null);
  const [novo, setNovo] = useState({ nome: '', largura: 30, altura: 20 });
  const [buscaProjeto, setBuscaProjeto] = useState('');

  const carregarLista = useCallback(async () => {
    try {
      setProjetos((await construtorApi.listar(campanhaId)).projetos);
    } catch (falha) {
      avisarErro(falha, 'Não deu para abrir a lista de mapas.');
      setProjetos([]);
    }
  }, [campanhaId]);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  const criar = async () => {
    const nome = novo.nome.trim() || `Mapa ${(projetos?.length ?? 0) + 1}`;
    try {
      setProjeto(await construtorApi.criar(campanhaId, { nome, largura: novo.largura, altura: novo.altura }));
      setNovo({ nome: '', largura: 30, altura: 20 });
    } catch (falha) {
      avisarErro(falha, 'Não deu para criar o mapa.');
    }
  };

  const abrirProjeto = async (id: string) => {
    try {
      setProjeto(await construtorApi.obter(campanhaId, id));
    } catch (falha) {
      avisarErro(falha, 'Não deu para abrir o mapa.');
    }
  };

  const duplicarProjeto = async (resumo: IResumoProjeto) => {
    try {
      setProjeto(await construtorApi.duplicar(campanhaId, resumo.id));
    } catch (falha) {
      avisarErro(falha, 'Não foi possível criar uma cópia deste mapa.');
    }
  };

  const apagarProjeto = async (resumo: IResumoProjeto) => {
    if (!(await confirmar({
      titulo: `Apagar "${resumo.nome}"?`,
      mensagem: resumo.cena_id ? 'O desenho some do construtor. A cena e a imagem já publicadas continuam.' : 'O desenho some do construtor.',
      rotuloConfirmar: 'Apagar', tom: 'perigo',
    }))) return;
    try {
      await construtorApi.apagar(campanhaId, resumo.id);
      await carregarLista();
    } catch (falha) {
      avisarErro(falha, 'Não deu para apagar o mapa.');
    }
  };

  if (projeto) {
    return (
      <EditorDoProjeto
        campanhaId={campanhaId}
        projeto={projeto}
        cenaAtual={cenaAtual}
        onPublicado={onPublicado}
        onVoltar={() => {
          setProjeto(null);
          void carregarLista();
        }}
      />
    );
  }

  const projetosFiltrados = projetos?.filter((resumo) => resumo.nome.toLocaleLowerCase('pt-BR').includes(buscaProjeto.trim().toLocaleLowerCase('pt-BR'))) ?? [];

  return (
    <div className="construtor" role="dialog" aria-label="Construtor de mapas">
      <header className="construtor-topo">
        <button type="button" className="mapa-botao-leve" onClick={onFechar}><ArrowLeft size={15} /> Voltar ao mapa</button>
        <strong>Construtor de mapas</strong>
      </header>
      <div className="construtor-lista">
        <section className="construtor-novo" aria-label="Mapa novo">
          <h2>Mapa novo</h2>
          <label>Nome <input value={novo.nome} maxLength={80} placeholder="Cripta do Abismo" onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></label>
          <div className="construtor-novo-tamanho">
            <label>Largura <input type="number" min={4} max={120} value={novo.largura} onChange={(e) => setNovo({ ...novo, largura: Number(e.target.value) })} /></label>
            <label>Altura <input type="number" min={4} max={120} value={novo.altura} onChange={(e) => setNovo({ ...novo, altura: Number(e.target.value) })} /></label>
            <span>casas</span>
          </div>
          <button type="button" className="mapa-botao" onClick={() => void criar()}><Plus size={14} /> Criar mapa</button>
        </section>
        <section aria-label="Mapas montados">
          <h2>Mapas montados</h2>
          <label className="construtor-busca"><Search size={14} aria-hidden="true" /><input value={buscaProjeto} maxLength={80} placeholder="Buscar mapa pelo nome" aria-label="Buscar mapa pelo nome" onChange={(evento) => setBuscaProjeto(evento.target.value)} /></label>
          {projetos === null && <p className="mapa-dica"><Loader2 size={14} className="girando" /> Abrindo...</p>}
          {projetos?.length === 0 && <p className="mapa-dica">Nenhum mapa ainda. Crie um ao lado e monte salas, paredes e portas.</p>}
          {Boolean(projetos?.length) && !projetosFiltrados.length && <p className="mapa-dica">Nenhum mapa tem esse nome.</p>}
          <div className="construtor-cartoes">
            {projetosFiltrados.map((resumo) => (
              <article key={resumo.id} className="construtor-cartao">
                <button type="button" className="construtor-cartao-corpo" onClick={() => void abrirProjeto(resumo.id)}>
                  <strong>{resumo.nome}</strong>
                  <small>{resumo.largura} x {resumo.altura} casas</small>
                  {resumo.cena_nome && <span className="selo ativo">Na cena {resumo.cena_nome}</span>}
                </button>
                <button type="button" className="mapa-icone" aria-label={`Criar cópia de ${resumo.nome}`} title="Usar como modelo e criar uma cópia" onClick={() => void duplicarProjeto(resumo)}><CopyPlus size={15} /></button>
                <button type="button" className="mapa-icone" aria-label={`Apagar ${resumo.nome}`} onClick={() => void apagarProjeto(resumo)}><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

/** Passo do botão de tamanho: de grão fino nas peças pequenas, de uma casa inteira nos mapas grandes. */
const passoDaEscala = (valor: number) => (valor > 10 ? 1 : 0.25);
const limparEscala = (valor: number) => Math.min(ESCALA_PECA_MAX, Math.max(0.1, Number(valor.toFixed(2))));

/** Largura da peça em casas: botões para ajustar de pouco em pouco e campo para digitar o número. */
const AjusteDeLargura = ({ valor, rotulo, onMudar }: { valor: number; rotulo: string; onMudar: (valor: number) => void }) => (
  <div className="mapa-segmentos construtor-largura" role="group" aria-label={rotulo}>
    <button type="button" aria-label="Diminuir peça" onClick={() => onMudar(limparEscala(valor - passoDaEscala(valor)))}>−</button>
    <label>
      <input
        key={valor}
        type="number"
        min={0.1}
        max={ESCALA_PECA_MAX}
        step={0.5}
        defaultValue={valor}
        aria-label="Largura em casas"
        onBlur={(e) => {
          const digitado = Number(e.target.value.replace(',', '.'));
          if (Number.isFinite(digitado) && digitado > 0) onMudar(limparEscala(digitado));
          else e.target.value = String(valor);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      casas
    </label>
    <button type="button" aria-label="Aumentar peça" onClick={() => onMudar(limparEscala(valor + passoDaEscala(valor)))}>+</button>
  </div>
);

const EditorDoProjeto = ({
  campanhaId, projeto: inicial, cenaAtual, onPublicado, onVoltar,
}: { campanhaId: string; projeto: IProjeto; cenaAtual: { id: string; nome: string } | null; onPublicado: (estado: IEstadoMapa) => void; onVoltar: () => void }) => {
  const alvo = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorConstrutor | null>(null);
  const [projeto, setProjeto] = useState(inicial);
  const [conteudo, setConteudo] = useState(inicial.conteudo);
  const [ferramenta, setFerramenta] = useState<FerramentaConstrutor>('sala');
  const [opcoes, setOpcoes] = useState<OpcoesConstrutor>({ chao: 'L', parede: 'pedra', pincel: 1, borracha: 'chao', peca: null, escalaPeca: 1, rotacaoPeca: 0, espelhadaPeca: false, luz: 'tocha', pronta: null });
  const [historico, setHistorico] = useState({ desfazer: false, refazer: false });
  const [objetos, setObjetos] = useState<IItemAcervo[]>([]);
  /** Mapas do Acervo, para juntar vários num só (peças grandes no chão). */
  const [mapasAcervo, setMapasAcervo] = useState<IItemAcervo[]>([]);
  const [pecaSelecionadaId, setPecaSelecionadaId] = useState<string | null>(null);
  const [luzSelecionadaId, setLuzSelecionadaId] = useState<string | null>(null);
  const [selecaoIds, setSelecaoIds] = useState<string[]>([]);
  const [prontas, setProntas] = useState<IPecaPronta[]>([]);
  const imagensPecasRef = useRef(new Map<string, ImageBitmap>());
  const [falhaPeca, setFalhaPeca] = useState('');
  const [salvo, setSalvo] = useState<EstadoSalvo>('salvo');
  const [nome, setNome] = useState(inicial.nome);
  const [tamanhoAberto, setTamanhoAberto] = useState(false);
  const [tamanho, setTamanho] = useState({ largura: inicial.largura, altura: inicial.altura });
  const [publicando, setPublicando] = useState<ProgressoPublicacao | null>(null);
  const [publicarAberto, setPublicarAberto] = useState(false);
  const espera = useRef<number | null>(null);
  const ultimo = useRef(inicial.conteudo);
  const salvando = useRef<Promise<void> | null>(null);

  const salvarAgora = useCallback(async () => {
    if (espera.current !== null) {
      window.clearTimeout(espera.current);
      espera.current = null;
    }
    const enviar = ultimo.current;
    const { largura, altura } = tamanhoDoConteudo(enviar);
    setSalvo('salvando');
    const tarefa = (async () => {
      try {
        const resposta = await construtorApi.salvar(campanhaId, projeto.id, { conteudo: enviar, largura, altura });
        setProjeto((atual) => ({ ...atual, ...resposta, conteudo: ultimo.current }));
        setSalvo(ultimo.current === enviar ? 'salvo' : 'pendente');
      } catch (falha) {
        setSalvo('erro');
        avisarErro(falha, 'O mapa não foi salvo. Tente de novo pelo botão Salvar.');
      }
    })();
    salvando.current = tarefa;
    await tarefa;
  }, [campanhaId, projeto.id]);

  const agendarSalvar = useCallback(() => {
    setSalvo('pendente');
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => void salvarAgora(), 1200);
  }, [salvarAgora]);

  const aoMudar = useRef((novo: IConteudoProjeto) => {
    ultimo.current = novo;
    setConteudo(novo);
  });
  const agendarRef = useRef(agendarSalvar);
  agendarRef.current = agendarSalvar;

  useEffect(() => {
    if (!alvo.current) return undefined;
    let vivo = true;
    let criado: EditorConstrutor | null = null;
    void EditorConstrutor.criar(alvo.current, { largura: inicial.largura, altura: inicial.altura, casa: inicial.casa, conteudo: inicial.conteudo }, {
      aoMudar: (novo) => {
        aoMudar.current(novo);
        agendarRef.current();
      },
      aoHistorico: (desfazer, refazer) => setHistorico({ desfazer, refazer }),
      aoSelecionarPeca: setPecaSelecionadaId,
      aoSelecionarLuz: setLuzSelecionadaId,
      aoSelecaoPecas: setSelecaoIds,
    }).then((pronto) => {
      if (!vivo) {
        pronto.destruir();
        return;
      }
      criado = pronto;
      editor.current = pronto;
      pronto.definirImagensPecas(new Map(imagensPecasRef.current));
      if (import.meta.env.DEV) (window as unknown as { __construtor?: EditorConstrutor }).__construtor = pronto;
    }).catch(() => avisar.erro('Este navegador não conseguiu abrir o editor de mapas (WebGL).'));
    return () => {
      vivo = false;
      criado?.destruir();
      editor.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let ativo = true;
    void acervoApi.listar().then(({ itens }) => {
      if (!ativo) return;
      setObjetos(itens.filter((item) => item.tipo === 'objeto' && item.estado === 'pronto'));
      setMapasAcervo(itens.filter((item) => item.tipo === 'mapa' && item.estado === 'pronto'));
    }).catch(() => {
      if (!ativo) return;
      setObjetos([]);
      setMapasAcervo([]);
    });
    return () => { ativo = false; };
  }, [campanhaId]);

  useEffect(() => {
    let ativo = true;
    void construtorApi.listarProntas(campanhaId).then(({ prontas: lista }) => {
      if (ativo) setProntas(lista);
    }).catch(() => undefined);
    return () => { ativo = false; };
  }, [campanhaId]);

  const gravarProntas = async (lista: IPecaPronta[], aviso: string) => {
    try {
      setProntas((await construtorApi.salvarProntas(campanhaId, lista)).prontas);
      avisar.sucesso(aviso);
    } catch (falha) {
      avisarErro(falha, 'As peças prontas não foram salvas. Tente de novo.');
    }
  };

  const salvarComoPronta = async () => {
    const pecas = editor.current?.grupoEscolhido() ?? [];
    if (!pecas.length) return;
    if (pecas.length > 32) {
      avisar.erro('Uma peça pronta junta até 32 peças. Escolha menos peças.');
      return;
    }
    if (prontas.length >= 40) {
      avisar.erro('A campanha já guarda 40 peças prontas. Apague uma antes de salvar outra.');
      return;
    }
    const nomePronta = await pedirTexto({
      titulo: 'Salvar como peça pronta',
      mensagem: `${pecas.length === 1 ? 'A peça escolhida fica guardada' : `As ${pecas.length} peças escolhidas viram um grupo`} para você pôr em qualquer mapa desta campanha com um clique.`,
      campo: { rotulo: 'Nome da peça pronta', maximo: 60, placeholder: 'Mesa de taverna com cadeiras' },
      rotuloConfirmar: 'Salvar',
    });
    if (!nomePronta) return;
    await gravarProntas([...prontas, { id: crypto.randomUUID(), nome: nomePronta, pecas }], `"${nomePronta}" está nas peças prontas.`);
  };

  const apagarPronta = async (pronta: IPecaPronta) => {
    if (!(await confirmar({ mensagem: `Apagar a peça pronta "${pronta.nome}"? Os mapas que já usam essas peças continuam como estão.`, rotuloConfirmar: 'Apagar' }))) return;
    if (opcoes.pronta?.id === pronta.id) setOpcoes({ ...opcoes, pronta: null });
    await gravarProntas(prontas.filter((outra) => outra.id !== pronta.id), `"${pronta.nome}" saiu das peças prontas.`);
  };

  const pecasParaCarregar = new Map<string, ModeloPeca>();
  conteudo.pecas.forEach((peca) => pecasParaCarregar.set(chaveDaImagem(peca), peca));
  if (opcoes.peca) pecasParaCarregar.set(chaveDaImagem(opcoes.peca), opcoes.peca);
  const chavePecas = [...pecasParaCarregar.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, peca]) => `${chave}:${peca.imagem_largura}x${peca.imagem_altura}`)
    .join('|');
  useEffect(() => {
    let ativo = true;
    setFalhaPeca('');
    void (async () => {
      for (const [id, peca] of pecasParaCarregar) {
        if (imagensPecasRef.current.has(id)) continue;
        try {
          const imagem = await carregarImagemPeca(peca, pecasParaCarregar.size);
          if (!ativo) {
            imagem.close();
            return;
          }
          imagensPecasRef.current.set(id, imagem);
        } catch {
          if (ativo) setFalhaPeca('Uma peça não carregou. Confira se a imagem continua no Acervo.');
        }
      }
      if (ativo) editor.current?.definirImagensPecas(new Map(imagensPecasRef.current));
    })();
    return () => { ativo = false; };
  }, [chavePecas]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    for (const imagem of imagensPecasRef.current.values()) imagem.close();
    imagensPecasRef.current.clear();
  }, []);

  useEffect(() => editor.current?.definirFerramenta(ferramenta), [ferramenta]);
  useEffect(() => editor.current?.definirOpcoes(opcoes), [opcoes]);

  // O que ficou sem salvar vai antes de sair.
  useEffect(() => () => {
    if (espera.current !== null) {
      window.clearTimeout(espera.current);
      void construtorApi.salvar(campanhaId, projeto.id, { conteudo: ultimo.current, ...tamanhoDoConteudo(ultimo.current) }).catch(() => undefined);
    }
  }, [campanhaId, projeto.id]);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvoTecla = evento.target as HTMLElement | null;
      if (alvoTecla && ['INPUT', 'SELECT', 'TEXTAREA'].includes(alvoTecla.tagName)) return;
      if ((evento.ctrlKey || evento.metaKey) && (evento.key === 'z' || evento.key === 'Z')) {
        evento.preventDefault();
        if (evento.shiftKey) editor.current?.refazer();
        else editor.current?.desfazer();
        return;
      }
      if ((evento.ctrlKey || evento.metaKey) && (evento.key === 'y' || evento.key === 'Y')) {
        evento.preventDefault();
        editor.current?.refazer();
        return;
      }
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      const escolhida = ATALHOS.get(evento.key.toLowerCase());
      if (escolhida) setFerramenta(escolhida);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  const salvarNome = () => {
    const limpo = nome.trim();
    if (!limpo || limpo === projeto.nome) {
      setNome(projeto.nome);
      return;
    }
    void construtorApi.salvar(campanhaId, projeto.id, { nome: limpo })
      .then((resposta) => setProjeto((atual) => ({ ...atual, nome: resposta.nome })))
      .catch((falha) => avisarErro(falha, 'O nome não foi salvo.'));
  };

  const aplicarTamanho = async () => {
    const largura = Math.max(4, Math.min(120, Math.round(tamanho.largura)));
    const altura = Math.max(4, Math.min(120, Math.round(tamanho.altura)));
    const atual = tamanhoDoConteudo(conteudo);
    if (largura < atual.largura || altura < atual.altura) {
      if (!(await confirmar({ mensagem: 'Diminuir o mapa corta o que estiver fora do tamanho novo. O Desfazer traz de volta.', rotuloConfirmar: 'Diminuir' }))) return;
    }
    editor.current?.redimensionar(largura, altura);
    setTamanhoAberto(false);
  };

  const publicar = async (cenaId: string | null) => {
    setPublicarAberto(false);
    await salvarAgora();
    if (salvando.current) await salvando.current;
    setPublicando({ feitos: 0, total: 1 });
    try {
      const { largura, altura } = tamanhoDoConteudo(ultimo.current);
      const estado = await publicarProjeto(campanhaId, { ...projeto, largura, altura, conteudo: ultimo.current }, { cenaId, nome: projeto.nome }, setPublicando);
      avisar.sucesso(cenaId ? `Mapa publicado na cena ${estado.cena?.nome ?? ''}.` : `Cena nova: ${estado.cena?.nome ?? projeto.nome}.`);
      onPublicado(estado);
    } catch (falha) {
      avisarErro(falha, 'Não deu para publicar o mapa.');
    } finally {
      setPublicando(null);
    }
  };

  const ferramentaAtual = FERRAMENTAS.find((f) => f.id === ferramenta)!;
  const numeros = contagem(conteudo);
  const pecaSelecionada = conteudo.pecas.find((peca) => peca.id === pecaSelecionadaId) ?? null;
  const categoriasMobilia = [...new Set(MOBILIA.map((item) => item.categoria))];
  const luzSelecionada = conteudo.luzes.find((luz) => luz.id === luzSelecionadaId) ?? null;
  const { largura, altura } = tamanhoDoConteudo(conteudo);
  const cenaDoProjeto = projeto.cena_id ? { id: projeto.cena_id, nome: projeto.cena_nome ?? 'a cena publicada' } : null;
  const destinos = [cenaDoProjeto, cenaAtual && cenaAtual.id !== cenaDoProjeto?.id ? cenaAtual : null].filter(Boolean) as Array<{ id: string; nome: string }>;
  const rotuloSalvo: Record<EstadoSalvo, string> = { salvo: 'Salvo', salvando: 'Salvando...', pendente: 'Mudanças para salvar', erro: 'Não salvou' };

  return (
    <div className="construtor" role="dialog" aria-label={`Construtor: ${projeto.nome}`}>
      <header className="construtor-topo">
        <button type="button" className="mapa-botao-leve" onClick={() => void salvarAgora().then(onVoltar)}><ArrowLeft size={15} /> Mapas</button>
        <input
          className="construtor-nome"
          value={nome}
          maxLength={80}
          aria-label="Nome do mapa"
          onChange={(e) => setNome(e.target.value)}
          onBlur={salvarNome}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <div className="construtor-tamanho">
          <button type="button" className="mapa-botao-leve" onClick={() => {
            setTamanho({ largura, altura });
            setTamanhoAberto((v) => !v);
          }}>
            {largura} x {altura} casas
          </button>
          {tamanhoAberto && (
            <div className="construtor-popover">
              <label>Largura <input type="number" min={4} max={120} value={tamanho.largura} onChange={(e) => setTamanho({ ...tamanho, largura: Number(e.target.value) })} /></label>
              <label>Altura <input type="number" min={4} max={120} value={tamanho.altura} onChange={(e) => setTamanho({ ...tamanho, altura: Number(e.target.value) })} /></label>
              <button type="button" className="mapa-botao" onClick={() => void aplicarTamanho()}>Aplicar</button>
            </div>
          )}
        </div>
        <span className={`construtor-salvo construtor-salvo--${salvo}`}>{rotuloSalvo[salvo]}</span>
        {salvo === 'erro' && <button type="button" className="mapa-botao-leve" onClick={() => void salvarAgora()}>Salvar</button>}
        <span className="construtor-espaco" />
        <BotaoFerramenta icone={Undo2} rotulo="Desfazer" atalho="Ctrl+Z" disabled={!historico.desfazer} onClick={() => editor.current?.desfazer()} />
        <BotaoFerramenta icone={Redo2} rotulo="Refazer" atalho="Ctrl+Y" disabled={!historico.refazer} onClick={() => editor.current?.refazer()} />
        <BotaoFerramenta icone={Expand} rotulo="Ver o mapa inteiro" onClick={() => editor.current?.enquadrar()} />
        <div className="construtor-publicar">
          <button type="button" className="mapa-botao destaque" disabled={Boolean(publicando)} onClick={() => setPublicarAberto((v) => !v)}>
            {publicando ? <Loader2 size={14} className="girando" /> : <CloudUpload size={14} />}
            {publicando ? `Publicando ${publicando.feitos}/${publicando.total}` : 'Publicar'}
          </button>
          {publicarAberto && !publicando && (
            <div className="construtor-popover construtor-popover--direita">
              <p className="mapa-dica">O mapa vira uma imagem no acervo (pasta Construtor) e o fundo da cena, com a grade e as portas.</p>
              <button type="button" className="mapa-botao" onClick={() => void publicar(null)}><Plus size={14} /> Numa cena nova</button>
              {destinos.map((destino) => (
                <button key={destino.id} type="button" className="mapa-botao-leve" onClick={() => void publicar(destino.id)}>
                  Atualizar a cena {destino.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>
      <div className="construtor-corpo">
        <nav className="construtor-ferramentas mapa-ferramentas" aria-label="Ferramentas do construtor">
          {FERRAMENTAS.map((f) => (
            <BotaoFerramenta key={f.id} icone={f.icone} rotulo={f.rotulo} atalho={f.atalho} ativo={ferramenta === f.id} onClick={() => setFerramenta(f.id)} />
          ))}
        </nav>
        <div ref={alvo} className="construtor-palco" />
        <aside className="construtor-lateral" aria-label="Materiais">
          <p className="mapa-dica construtor-dica">{ferramentaAtual.dica}</p>
          {ferramenta === 'peca' && (
            <>
              <h3>Peças prontas</h3>
              {prontas.length ? (
                <ul className="construtor-prontas" aria-label="Peças prontas da campanha">
                  {prontas.map((pronta) => {
                    const ativo = opcoes.pronta?.id === pronta.id;
                    const primeira = pronta.pecas[0];
                    return (
                      <li key={pronta.id} className={ativo ? 'ativo' : ''}>
                        <button
                          type="button"
                          aria-pressed={ativo}
                          onClick={() => {
                            setOpcoes({ ...opcoes, pronta: ativo ? null : pronta, peca: null });
                            editor.current?.selecionarPeca(null);
                          }}
                        >
                          {primeira && <img src={primeira.pacote ? urlDaMobilia(primeira.pacote) : urlPedaco(primeira.imagem_id, 'mini')} alt="" loading="lazy" />}
                          <span>{pronta.nome}</span>
                          <small>{pronta.pecas.length} {pronta.pecas.length === 1 ? 'peça' : 'peças'}</small>
                        </button>
                        <button type="button" className="mapa-icone" aria-label={`Apagar a peça pronta ${pronta.nome}`} onClick={() => void apagarPronta(pronta)}><Trash2 size={13} /></button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mapa-dica">Junte peças com Shift + clique e salve o grupo como peça pronta para usar em outros mapas desta campanha.</p>
              )}
              {opcoes.pronta && <p className="mapa-dica">Clique no mapa para pôr "{opcoes.pronta.nome}". Clique de novo na peça pronta para parar.</p>}
              <h3>Mobília do Jardim</h3>
              {categoriasMobilia.map((categoria) => (
                <div key={categoria} className="construtor-mobilia-grupo">
                  <small>{categoria}</small>
                  <div className="construtor-pecas" role="radiogroup" aria-label={`Mobília: ${categoria}`}>
                    {MOBILIA.filter((item) => item.categoria === categoria).map((item) => {
                      const ativo = opcoes.peca?.pacote === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="radio"
                          aria-checked={ativo}
                          aria-label={item.nome}
                          className={`construtor-peca${ativo ? ' ativo' : ''}`}
                          onClick={() => {
                            setOpcoes({ ...opcoes, peca: pecaDaMobilia(item), escalaPeca: item.escala, pronta: null });
                            setPecaSelecionadaId(null);
                          }}
                        >
                          <img src={urlDaMobilia(item.id)} alt="" loading="lazy" />
                          <small>{item.nome}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <h3>Mapas do Acervo</h3>
              <p className="mapa-dica">Para juntar vários mapas numa cena, escolha um mapa, clique onde ele deve ficar e repita com os outros. Arraste para encostar um no outro; ajuste a largura em casas até as grades casarem. Ao publicar, tudo vira um mapa só, com névoa, paredes e luzes como nos outros.</p>
              {mapasAcervo.length ? (
                <div className="construtor-pecas" role="radiogroup" aria-label="Mapa para colocar no mapa montado">
                  {mapasAcervo.map((item) => {
                    const ativo = !opcoes.peca?.pacote && opcoes.peca?.imagem_id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        aria-label={`${item.nome} (${item.largura} x ${item.altura} px)`}
                        className={`construtor-peca${ativo ? ' ativo' : ''}`}
                        onClick={() => {
                          setOpcoes({ ...opcoes, peca: pecaDoMapa(item), escalaPeca: casasDoMapa(item.largura, projeto.casa), pronta: null });
                          setPecaSelecionadaId(null);
                        }}
                      >
                        <img src={urlPedaco(item.id, 'mini')} alt="" loading="lazy" />
                        <small>{item.nome}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mapa-dica">Não há mapas prontos no Acervo. Envie imagens como Mapa pela gaveta Acervo e volte para cá.</p>
              )}
              <h3>Objetos do Acervo</h3>
              <p className="mapa-dica">Para usar uma imagem da internet, salve um arquivo com licença de uso e envie ao Acervo como Objeto. O VTT não busca imagens diretamente por URL.</p>
              {falhaPeca && <p className="mapa-erro">{falhaPeca}</p>}
              {objetos.length ? (
                <div className="construtor-pecas" role="radiogroup" aria-label="Objeto para colocar no mapa">
                  {objetos.map((item) => {
                    const ativo = !opcoes.peca?.pacote && opcoes.peca?.imagem_id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        aria-label={`${item.nome} (${item.largura} x ${item.altura} px)`}
                        className={`construtor-peca${ativo ? ' ativo' : ''}`}
                        onClick={() => {
                          setOpcoes({ ...opcoes, peca: pecaDoAcervo(item), pronta: null });
                          setPecaSelecionadaId(null);
                        }}
                      >
                        <img src={urlPedaco(item.id, 'mini')} alt="" loading="lazy" />
                        <small>{item.nome}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="mapa-dica">Não há imagens do tipo Objeto no Acervo. Envie uma pela gaveta Acervo e volte para cá.</p>
              )}
              {opcoes.peca && (
                <div className="construtor-ajuste-peca">
                  <strong>Nova peça: {opcoes.peca.rotulo}</strong>
                  <AjusteDeLargura valor={opcoes.escalaPeca} rotulo="Tamanho da nova peça" onMudar={(escalaPeca) => setOpcoes({ ...opcoes, escalaPeca })} />
                  <div className="mapa-segmentos" role="group" aria-label="Rotação da nova peça">
                    <button type="button" aria-label="Girar peça para a esquerda" onClick={() => setOpcoes({ ...opcoes, rotacaoPeca: (opcoes.rotacaoPeca + 315) % 360 })}>−45°</button>
                    <span>{opcoes.rotacaoPeca}°</span>
                    <button type="button" aria-label="Girar peça para a direita" onClick={() => setOpcoes({ ...opcoes, rotacaoPeca: (opcoes.rotacaoPeca + 45) % 360 })}>+45°</button>
                  </div>
                  <button type="button" className={opcoes.espelhadaPeca ? 'ativo' : 'mapa-botao-leve'} onClick={() => setOpcoes({ ...opcoes, espelhadaPeca: !opcoes.espelhadaPeca })}>Espelhar nova peça</button>
                </div>
              )}
            </>
          )}
          {selecaoIds.length > 1 && (
            <section className="construtor-ajuste-peca" aria-label="Peças escolhidas">
              <h3>{selecaoIds.length} peças escolhidas</h3>
              <p className="mapa-dica">Arraste uma delas para mover o grupo. Shift + clique tira ou junta mais uma.</p>
              <div className="mapa-segmentos" role="group" aria-label="Alinhar grupo">
                <button type="button" onClick={() => editor.current?.alinharPecas(selecaoIds, 'x')}>Alinhar na vertical</button>
                <button type="button" onClick={() => editor.current?.alinharPecas(selecaoIds, 'y')}>Alinhar na horizontal</button>
              </div>
              <button type="button" className="mapa-botao-leve" onClick={() => {
                const copias = editor.current?.duplicarPecas(selecaoIds) ?? 0;
                if (copias < selecaoIds.length) avisar.info(`O mapa recebeu ${copias} cópias. O limite é de 256 peças.`);
              }}><CopyPlus size={14} /> Duplicar grupo</button>
              <button type="button" className="mapa-botao" onClick={() => void salvarComoPronta()}>Salvar como peça pronta</button>
              <button type="button" className="mapa-botao perigo" onClick={() => editor.current?.removerPecas(selecaoIds)}>Remover as {selecaoIds.length} peças</button>
            </section>
          )}
          {pecaSelecionada && (
            <section className="construtor-ajuste-peca" aria-label="Ajustar peça selecionada">
              <h3>Peça selecionada</h3>
              <strong>{pecaSelecionada.rotulo}</strong>
              <AjusteDeLargura valor={pecaSelecionada.escala} rotulo="Tamanho da peça selecionada" onMudar={(escala) => editor.current?.editarPeca(pecaSelecionada.id, { escala })} />
              <div className="mapa-segmentos" role="group" aria-label="Rotação da peça selecionada">
                <button type="button" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { rotacao: (pecaSelecionada.rotacao + 315) % 360 })}>−45°</button>
                <span>{pecaSelecionada.rotacao}°</span>
                <button type="button" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { rotacao: (pecaSelecionada.rotacao + 45) % 360 })}>+45°</button>
              </div>
              <button type="button" className="mapa-botao-leve" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { espelhada: !pecaSelecionada.espelhada })}>
                {pecaSelecionada.espelhada ? 'Remover espelhamento' : 'Espelhar'}
              </button>
              <div className="mapa-segmentos" role="group" aria-label="Camada da peça">
                {CAMADAS_PECA.map((camada) => (
                  <button
                    key={camada.id}
                    type="button"
                    className={camadaDe(pecaSelecionada) === camada.id ? 'ativo' : ''}
                    onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { camada: camada.id })}
                  >
                    {camada.nome}
                  </button>
                ))}
              </div>
              <div className="mapa-segmentos" role="group" aria-label="Ordem da peça na camada">
                <button type="button" onClick={() => editor.current?.moverPeca(pecaSelecionada.id, 'tras')}>Para trás</button>
                <button type="button" onClick={() => editor.current?.moverPeca(pecaSelecionada.id, 'frente')}>Para a frente</button>
                <button type="button" onClick={() => editor.current?.duplicarPeca(pecaSelecionada.id)}>Duplicar</button>
              </div>
              <button type="button" className="mapa-botao-leve" onClick={() => void salvarComoPronta()}>Salvar como peça pronta</button>
              <button type="button" className="mapa-botao perigo" onClick={() => editor.current?.removerPeca(pecaSelecionada.id)}>Remover peça</button>
            </section>
          )}
          {ferramenta === 'luz' && (
            <>
              <h3>Luz nova</h3>
              <div className="mapa-segmentos construtor-luzes" role="radiogroup" aria-label="Tipo da luz nova">
                {LUZES_PRONTAS.map((luz) => (
                  <button key={luz.id} type="button" role="radio" aria-checked={opcoes.luz === luz.id} className={opcoes.luz === luz.id ? 'ativo' : ''} onClick={() => setOpcoes({ ...opcoes, luz: luz.id })}>
                    <span className="construtor-luz-cor" style={{ background: luz.cor }} /> {luz.nome}
                  </button>
                ))}
              </div>
              <p className="construtor-numeros">{conteudo.luzes.length} de 64 luzes no mapa</p>
            </>
          )}
          {luzSelecionada && (
            <section className="construtor-ajuste-peca" aria-label="Ajustar a luz escolhida">
              <h3>Luz escolhida</h3>
              <label className="mapa-menu-linha">
                Alcance <span>{luzSelecionada.raio.toLocaleString('pt-BR')} casas</span>
                <input type="range" min={0.5} max={15} step={0.5} value={luzSelecionada.raio} onChange={(e) => editor.current?.editarLuz(luzSelecionada.id, { raio: Number(e.target.value) })} />
              </label>
              <div className="mapa-segmentos construtor-luzes" role="group" aria-label="Cor da luz">
                {LUZES_PRONTAS.map((luz) => (
                  <button key={luz.id} type="button" className={luzSelecionada.cor === luz.cor ? 'ativo' : ''} onClick={() => editor.current?.editarLuz(luzSelecionada.id, { cor: luz.cor, tremula: luz.tremula })}>
                    <span className="construtor-luz-cor" style={{ background: luz.cor }} /> {luz.nome}
                  </button>
                ))}
              </div>
              <label className="mapa-menu-opcoes">
                <input type="checkbox" checked={luzSelecionada.tremula} onChange={(e) => editor.current?.editarLuz(luzSelecionada.id, { tremula: e.target.checked })} /> A chama tremula
              </label>
              <button type="button" className="mapa-botao perigo" onClick={() => editor.current?.removerLuz(luzSelecionada.id)}>Tirar a luz</button>
            </section>
          )}
          {ferramenta === 'peca' && conteudo.pecas.length > 0 && (
            <section className="construtor-camadas" aria-label="Peças no mapa">
              <h3>Peças no mapa</h3>
              {[...CAMADAS_PECA].reverse().map((camada) => {
                const daCamada = pecasEmOrdem(conteudo).filter((peca) => camadaDe(peca) === camada.id).reverse();
                if (!daCamada.length) return null;
                return (
                  <div key={camada.id} className="construtor-camada">
                    <small>{camada.nome}</small>
                    <ul>
                      {daCamada.map((peca) => (
                        <li key={peca.id}>
                          <button
                            type="button"
                            className={peca.id === pecaSelecionadaId ? 'ativo' : ''}
                            onClick={() => editor.current?.selecionarPeca(peca.id)}
                          >
                            {peca.rotulo}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </section>
          )}
          <h3>Chão</h3>
          <div className="construtor-amostras" role="radiogroup" aria-label="Material do chão">
            {MATERIAIS_CHAO.map((material) => (
              <button
                key={material.codigo}
                type="button"
                role="radio"
                aria-checked={opcoes.chao === material.codigo}
                className={`construtor-amostra${opcoes.chao === material.codigo ? ' ativo' : ''}`}
                onClick={() => setOpcoes({ ...opcoes, chao: material.codigo })}
              >
                <Amostra fonte={texturaDoChao(material.codigo)} />
                <small>{material.nome}</small>
              </button>
            ))}
          </div>
          <h3>Parede</h3>
          <div className="construtor-amostras" role="radiogroup" aria-label="Material da parede">
            {MATERIAIS_PAREDE.map((material) => (
              <button
                key={material.id}
                type="button"
                role="radio"
                aria-checked={opcoes.parede === material.id}
                className={`construtor-amostra${opcoes.parede === material.id ? ' ativo' : ''}`}
                onClick={() => setOpcoes({ ...opcoes, parede: material.id })}
              >
                <Amostra fonte={texturaDaParede(material.id)} />
                <small>{material.nome}</small>
              </button>
            ))}
          </div>
          {(ferramenta === 'chao' || ferramenta === 'borracha') && (
            <>
              <h3>Pincel</h3>
              <div className="mapa-segmentos" role="group" aria-label="Tamanho do pincel">
                {[1, 2, 3, 5].map((lado) => (
                  <button key={lado} type="button" className={opcoes.pincel === lado ? 'ativo' : ''} onClick={() => setOpcoes({ ...opcoes, pincel: lado })}>
                    {lado} x {lado}
                  </button>
                ))}
              </div>
            </>
          )}
          {ferramenta === 'borracha' && (
            <>
              <h3>Apagar</h3>
              <div className="mapa-segmentos" role="group" aria-label="O que a borracha apaga">
                <button type="button" className={opcoes.borracha === 'chao' ? 'ativo' : ''} onClick={() => setOpcoes({ ...opcoes, borracha: 'chao' })}>Chão</button>
                <button type="button" className={opcoes.borracha === 'paredes' ? 'ativo' : ''} onClick={() => setOpcoes({ ...opcoes, borracha: 'paredes' })}>Paredes</button>
              </div>
            </>
          )}
          <p className="construtor-numeros">
            {numeros.chao} casas de chão · {numeros.paredes} trechos de parede · {numeros.portas} portas · {numeros.janelas} janelas · {numeros.pecas} peças
          </p>
        </aside>
      </div>
    </div>
  );
};
