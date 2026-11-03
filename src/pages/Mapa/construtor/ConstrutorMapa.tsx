// O construtor de mapas do Mestre, aberto por cima do mapa da mesa: a lista dos mapas
// montados e o editor (salas, chão, paredes, portas e janelas). O editor salva sozinho; o
// botão Publicar desenha o mapa no acervo e põe na cena.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppWindow, ArrowLeft, BrickWall, CloudUpload, DoorClosed, Eraser, Expand, Ghost, Hand, ImagePlus, Loader2, Paintbrush, Plus, Redo2, Square, Trash2, Undo2,
} from 'lucide-react';
import { acervoApi, type IItemAcervo } from '../../../services/acervoApi';
import { construtorApi, type IProjeto, type IResumoProjeto } from '../../../services/construtorApi';
import { urlPedaco, type IEstadoMapa } from '../../../services/mapaApi';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar } from '../../../components/avisos/confirmacao';
import { BotaoFerramenta } from '../componentes/BotaoFerramenta';
import { EditorConstrutor, type FerramentaConstrutor, type OpcoesConstrutor } from './editor';
import { contagem, MATERIAIS_CHAO, MATERIAIS_PAREDE, type IConteudoProjeto } from './projeto';
import { texturaDaParede, texturaDoChao } from './materiais';
import { publicarProjeto, type ProgressoPublicacao } from './publicar';
import { carregarImagemPeca, pecaDoAcervo, type ModeloPeca } from './pecas';
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
  { id: 'peca', rotulo: 'Peças do Acervo', atalho: 'I', icone: ImagePlus, dica: 'Escolha um objeto do Acervo. Clique para colocar; arraste uma peça existente para movê-la.' },
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
          {projetos === null && <p className="mapa-dica"><Loader2 size={14} className="girando" /> Abrindo...</p>}
          {projetos?.length === 0 && <p className="mapa-dica">Nenhum mapa ainda. Crie um ao lado e monte salas, paredes e portas.</p>}
          <div className="construtor-cartoes">
            {projetos?.map((resumo) => (
              <article key={resumo.id} className="construtor-cartao">
                <button type="button" className="construtor-cartao-corpo" onClick={() => void abrirProjeto(resumo.id)}>
                  <strong>{resumo.nome}</strong>
                  <small>{resumo.largura} x {resumo.altura} casas</small>
                  {resumo.cena_nome && <span className="selo ativo">Na cena {resumo.cena_nome}</span>}
                </button>
                <button type="button" className="mapa-icone" aria-label={`Apagar ${resumo.nome}`} onClick={() => void apagarProjeto(resumo)}><Trash2 size={15} /></button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const EditorDoProjeto = ({
  campanhaId, projeto: inicial, cenaAtual, onPublicado, onVoltar,
}: { campanhaId: string; projeto: IProjeto; cenaAtual: { id: string; nome: string } | null; onPublicado: (estado: IEstadoMapa) => void; onVoltar: () => void }) => {
  const alvo = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorConstrutor | null>(null);
  const [projeto, setProjeto] = useState(inicial);
  const [conteudo, setConteudo] = useState(inicial.conteudo);
  const [ferramenta, setFerramenta] = useState<FerramentaConstrutor>('sala');
  const [opcoes, setOpcoes] = useState<OpcoesConstrutor>({ chao: 'L', parede: 'pedra', pincel: 1, borracha: 'chao', peca: null, escalaPeca: 1, rotacaoPeca: 0, espelhadaPeca: false });
  const [historico, setHistorico] = useState({ desfazer: false, refazer: false });
  const [objetos, setObjetos] = useState<IItemAcervo[]>([]);
  const [pecaSelecionadaId, setPecaSelecionadaId] = useState<string | null>(null);
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
      if (ativo) setObjetos(itens.filter((item) => item.tipo === 'objeto' && item.estado === 'pronto'));
    }).catch(() => {
      if (ativo) setObjetos([]);
    });
    return () => { ativo = false; };
  }, [campanhaId]);

  const pecasParaCarregar = new Map<string, ModeloPeca>();
  conteudo.pecas.forEach((peca) => pecasParaCarregar.set(peca.imagem_id, peca));
  if (opcoes.peca) pecasParaCarregar.set(opcoes.peca.imagem_id, opcoes.peca);
  const chavePecas = [...pecasParaCarregar.values()]
    .sort((a, b) => a.imagem_id.localeCompare(b.imagem_id))
    .map((peca) => `${peca.imagem_id}:${peca.imagem_largura}x${peca.imagem_altura}`)
    .join('|');
  useEffect(() => {
    let ativo = true;
    setFalhaPeca('');
    void (async () => {
      for (const peca of pecasParaCarregar.values()) {
        const id = peca.imagem_id;
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
              <h3>Objetos do Acervo</h3>
              <p className="mapa-dica">Para usar uma imagem da internet, salve um arquivo com licença de uso e envie ao Acervo como Objeto. O VTT não busca imagens diretamente por URL.</p>
              {falhaPeca && <p className="mapa-erro">{falhaPeca}</p>}
              {objetos.length ? (
                <div className="construtor-pecas" role="radiogroup" aria-label="Objeto para colocar no mapa">
                  {objetos.map((item) => {
                    const ativo = opcoes.peca?.imagem_id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={ativo}
                        aria-label={`${item.nome} (${item.largura} x ${item.altura} px)`}
                        className={`construtor-peca${ativo ? ' ativo' : ''}`}
                        onClick={() => {
                          setOpcoes({ ...opcoes, peca: pecaDoAcervo(item) });
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
                  <div className="mapa-segmentos" role="group" aria-label="Tamanho da nova peça">
                    <button type="button" aria-label="Diminuir peça" onClick={() => setOpcoes({ ...opcoes, escalaPeca: Math.max(0.1, Number((opcoes.escalaPeca - 0.25).toFixed(2))) })}>−</button>
                    <span>{opcoes.escalaPeca.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} casas</span>
                    <button type="button" aria-label="Aumentar peça" onClick={() => setOpcoes({ ...opcoes, escalaPeca: Math.min(10, Number((opcoes.escalaPeca + 0.25).toFixed(2))) })}>+</button>
                  </div>
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
          {pecaSelecionada && (
            <section className="construtor-ajuste-peca" aria-label="Ajustar peça selecionada">
              <h3>Peça selecionada</h3>
              <strong>{pecaSelecionada.rotulo}</strong>
              <div className="mapa-segmentos" role="group" aria-label="Tamanho da peça selecionada">
                <button type="button" aria-label="Diminuir peça" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { escala: Math.max(0.1, Number((pecaSelecionada.escala - 0.25).toFixed(2))) })}>−</button>
                <span>{pecaSelecionada.escala.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} casas</span>
                <button type="button" aria-label="Aumentar peça" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { escala: Math.min(10, Number((pecaSelecionada.escala + 0.25).toFixed(2))) })}>+</button>
              </div>
              <div className="mapa-segmentos" role="group" aria-label="Rotação da peça selecionada">
                <button type="button" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { rotacao: (pecaSelecionada.rotacao + 315) % 360 })}>−45°</button>
                <span>{pecaSelecionada.rotacao}°</span>
                <button type="button" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { rotacao: (pecaSelecionada.rotacao + 45) % 360 })}>+45°</button>
              </div>
              <button type="button" className="mapa-botao-leve" onClick={() => editor.current?.editarPeca(pecaSelecionada.id, { espelhada: !pecaSelecionada.espelhada })}>
                {pecaSelecionada.espelhada ? 'Remover espelhamento' : 'Espelhar'}
              </button>
              <button type="button" className="mapa-botao perigo" onClick={() => editor.current?.removerPeca(pecaSelecionada.id)}>Remover peça</button>
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
