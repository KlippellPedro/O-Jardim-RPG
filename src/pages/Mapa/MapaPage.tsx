// Mapa ao vivo: tela cheia pensada para PC. O mapa ocupa tudo; ferramentas à
// esquerda, painel recolhível à direita (iniciativa, ficha, rolagens) e, para o
// Mestre, a faixa de cenas embaixo e o Acervo. Ver docs/propostas/mapa-ao-vivo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Cloud, CloudOff, CloudRain, Crosshair, Expand, Eye, FolderOpen, Hand, Loader2, MapPin, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Ruler, Users, Wand2, Wifi, WifiOff,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSessaoStore } from '../../store/useSessaoStore';
import { assinarEventosDaCampanha } from '../../services/campanhaEventos';
import { mapaApi, type IAreaClima, type IClima, type IEstadoMapa, type IFormaNevoa, type INevoaPayload, type ITokenEdicao, type ITokenMapa } from '../../services/mapaApi';
import type { IItemAcervo } from '../../services/acervoApi';
import { confirmar } from '../../components/avisos/confirmacao';
import { PalcoMapa, type Ferramenta, type OpcoesNevoa } from './motor/palco';
import { encaixar, type IPonto } from './motor/geometria';
import { ConexaoMapa, Interpolador, type EstadoConexao, type MensagemMapa } from './tempoReal';
import { PainelLateral, tokenDaEntidade, type AbaLateral } from './componentes/PainelLateral';
import { MenuToken } from './componentes/MenuToken';
import { ConfigCena, FaixaCenas } from './componentes/CenasDoMestre';
import { AcervoGaveta } from './acervo/AcervoGaveta';
import { OficinaGaveta } from './oficina/OficinaGaveta';
import { BarraNevoa } from './componentes/BarraNevoa';
import { PainelClima } from './componentes/PainelClima';
import type { Enquadramento } from './motor/molduras';
import './mapa.css';

interface Pessoa {
  usuario_id: string;
  nome: string;
  cor: string;
  gestor: boolean;
}

const ENVIO_ARRASTO_MS = 50;
/** Escolha de cada aparelho: desligar os efeitos de clima (desempenho ou conforto). */
const CHAVE_CLIMA_LOCAL = 'jardim.mapa.clima';

function lerClimaLocal(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_CLIMA_LOCAL) !== 'desligado';
  } catch {
    return true;
  }
}
// Eventos da campanha que não mexem no mapa (rolagem, destaque, calendário, mesa).
const EVENTOS_SEM_EFEITO = new Set(['registro', 'destaque_mesa', 'calendario', 'mesa']);

function agoraServidor() {
  return performance.now() + performance.timeOrigin;
}

export const MapaPage = () => {
  const navigate = useNavigate();
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const campanhaId = campanhaAtiva?.id ?? null;
  const { conectarSSE, desconectarSSE, iniciativa, turnoAtualId, emCombate, sessaoId } = useSessaoStore();

  const [estado, setEstado] = useState<IEstadoMapa | null>(null);
  const [erro, setErro] = useState('');
  const [cenaVista, setCenaVista] = useState<string | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>('mover');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [conexao, setConexao] = useState<EstadoConexao>('conectando');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [lateralAberta, setLateralAberta] = useState(true);
  const [aba, setAba] = useState<AbaLateral>('iniciativa');
  const [acervoAberto, setAcervoAberto] = useState(false);
  const [oficinaAberta, setOficinaAberta] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [palcoPronto, setPalcoPronto] = useState(false);
  const [climaAberto, setClimaAberto] = useState(false);
  const [climaLocal, setClimaLocal] = useState(lerClimaLocal);
  const [opcoesNevoa, setOpcoesNevoa] = useState<OpcoesNevoa>({ op: 'revelar', forma: 'pincel', raio: 100 });
  const [marcandoArea, setMarcandoArea] = useState(false);
  const aplicarArea = useRef<((area: IAreaClima) => void) | null>(null);
  const pedidoNevoa = useRef(0);

  const alvoRef = useRef<HTMLDivElement>(null);
  const palcoRef = useRef<PalcoMapa | null>(null);
  const conexaoRef = useRef<ConexaoMapa | null>(null);
  const interpolador = useRef(new Interpolador()).current;
  const ultimaAmostra = useRef(new Map<string, number>()).current;
  const ultimoEnvio = useRef(new Map<string, number>()).current;
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const cenaVistaRef = useRef(cenaVista);
  cenaVistaRef.current = cenaVista;
  const recargaAgendada = useRef<number | null>(null);

  const tentativas = useRef(0);
  const novaTentativa = useRef<number | null>(null);

  const recarregar = useCallback(async () => {
    if (!campanhaId) return;
    try {
      const novo = await mapaApi.obter(campanhaId, cenaVistaRef.current);
      tentativas.current = 0;
      setEstado(novo);
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir o mapa.');
      // Nada na tela ainda (o servidor trocando de versão, a rede caindo): tenta de novo sozinho, cada vez mais espaçado.
      if (!estadoRef.current && novaTentativa.current === null) {
        const espera = Math.min(15_000, 2_000 * 2 ** tentativas.current);
        tentativas.current += 1;
        novaTentativa.current = window.setTimeout(() => {
          novaTentativa.current = null;
          void recarregar();
        }, espera);
      }
    }
  }, [campanhaId]);

  useEffect(() => () => {
    if (novaTentativa.current !== null) window.clearTimeout(novaTentativa.current);
  }, []);

  const agendarRecarga = useCallback(() => {
    if (recargaAgendada.current !== null) return;
    recargaAgendada.current = window.setTimeout(() => {
      recargaAgendada.current = null;
      void recarregar();
    }, 250);
  }, [recarregar]);

  const atualizarPosicao = useCallback((id: string, x: number, y: number) => {
    setEstado((atual) => atual && { ...atual, tokens: atual.tokens.map((t) => (t.id === id ? { ...t, x, y } : t)) });
  }, []);

  // ---------------------------------------------------------- tempo real

  const aoMensagem = useCallback((mensagem: MensagemMapa) => {
    const palco = palcoRef.current;
    switch (mensagem.t) {
      case 'arrastando':
      case 'token': {
        const id = String(mensagem.token);
        interpolador.receber(id, { t: Number(mensagem.ts), x: Number(mensagem.x), y: Number(mensagem.y) });
        ultimaAmostra.set(id, agoraServidor());
        if (mensagem.t === 'token') atualizarPosicao(id, Number(mensagem.x), Number(mensagem.y));
        break;
      }
      case 'mudou':
        agendarRecarga();
        break;
      case 'ping':
        palco?.ping(Number(mensagem.x), Number(mensagem.y), String(mensagem.cor), String(mensagem.nome));
        break;
      case 'regua':
        palco?.reguaRemota(String(mensagem.por), (mensagem.pontos as number[][] | null)?.map(([x, y]) => ({ x, y })) ?? null, String(mensagem.cor), String(mensagem.nome));
        break;
      case 'presenca':
        setPessoas((mensagem.pessoas as Pessoa[]) ?? []);
        break;
      case 'sumiu': {
        // Um monstro entrou na névoa: some da tela de quem não é o Mestre.
        const id = String(mensagem.token);
        interpolador.esquecer(id);
        ultimaAmostra.delete(id);
        setEstado((atual) => atual && { ...atual, tokens: atual.tokens.filter((t) => t.id !== id) });
        break;
      }
      case 'erro':
        // Movimento recusado (o token mudou de dono ou sumiu): volta para o que o servidor tem.
        if (mensagem.token) agendarRecarga();
        break;
      default:
        break;
    }
  }, [agendarRecarga, atualizarPosicao, interpolador, ultimaAmostra]);

  /** A cada quadro: tokens que outra pessoa arrasta deslizam pelas posições interpoladas. */
  const aplicarRemotos = useCallback(() => {
    const palco = palcoRef.current;
    if (!palco) return;
    const agora = agoraServidor();
    for (const id of interpolador.ativos()) {
      const posicao = interpolador.posicao(id, agora);
      if (!posicao) continue;
      palco.moverToken(id, posicao.x, posicao.y);
      if (posicao.terminou && agora - (ultimaAmostra.get(id) ?? 0) > interpolador.atraso + 500) {
        interpolador.esquecer(id);
        ultimaAmostra.delete(id);
      }
    }
  }, [interpolador, ultimaAmostra]);

  const soltar = useCallback((id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!atual?.cena || !campanhaId) return;
    ultimoEnvio.delete(id);
    atualizarPosicao(id, x, y);
    if (atual.cena.ativa && conexaoRef.current?.aberta) {
      conexaoRef.current.enviar({ t: 'soltar', token: id, x, y });
      return;
    }
    // Cena em preparo (só o Mestre vê) ou sem tempo real: grava pela rota.
    mapaApi.moverToken(campanhaId, id, { x, y }).catch((falha) => {
      setErro(falha instanceof Error ? falha.message : 'O token não foi salvo.');
      agendarRecarga();
    });
  }, [agendarRecarga, atualizarPosicao, campanhaId, ultimoEnvio]);

  const arrastar = useCallback((id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!atual?.cena?.ativa) return;
    const agora = performance.now();
    if (agora - (ultimoEnvio.get(id) ?? 0) < ENVIO_ARRASTO_MS) return;
    ultimoEnvio.set(id, agora);
    conexaoRef.current?.enviar({ t: 'arrastar', token: id, x, y });
  }, [ultimoEnvio]);

  const ultimaRegua = useRef(0);
  const regua = useCallback((pontos: IPonto[] | null) => {
    const agora = performance.now();
    if (pontos && agora - ultimaRegua.current < ENVIO_ARRASTO_MS) return;
    ultimaRegua.current = agora;
    conexaoRef.current?.enviar({ t: 'regua', pontos: pontos?.map((p) => [p.x, p.y]) ?? null });
  }, []);

  // ------------------------------------------------------------- efeitos

  /** Pedidos da névoa saem um atrás do outro; vale a resposta do último (ela já traz todas as formas). */
  const enviarNevoa = useCallback(async (dados: INevoaPayload) => {
    const cenaAtual = estadoRef.current?.cena;
    if (!campanhaId || !cenaAtual) return;
    const meu = ++pedidoNevoa.current;
    try {
      const resposta = await mapaApi.mudarNevoa(campanhaId, cenaAtual.id, dados);
      if (meu === pedidoNevoa.current) setEstado(resposta);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'A névoa não foi salva.');
      if (meu === pedidoNevoa.current) void recarregar();
    }
  }, [campanhaId, recarregar]);

  const desenharNevoa = useCallback((forma: IFormaNevoa) => void enviarNevoa({ forma }), [enviarNevoa]);

  const marcarArea = useCallback((area: IAreaClima) => {
    aplicarArea.current?.(area);
    aplicarArea.current = null;
    setMarcandoArea(false);
    setFerramenta('mover');
  }, []);

  // O palco nasce uma vez; os gestos chegam sempre na versão mais nova das funções.
  const gestos = useRef({ arrastar, soltar, regua, desenharNevoa, marcarArea });
  gestos.current = { arrastar, soltar, regua, desenharNevoa, marcarArea };

  useEffect(() => {
    if (!alvoRef.current) return undefined;
    let vivo = true;
    let palco: PalcoMapa | null = null;
    void PalcoMapa.criar(alvoRef.current, {
      aoArrastar: (id, x, y) => gestos.current.arrastar(id, x, y),
      aoSoltar: (id, x, y) => gestos.current.soltar(id, x, y),
      aoSelecionar: setSelecionado,
      aoPing: (x, y) => conexaoRef.current?.enviar({ t: 'ping', x, y }),
      aoRegua: (pontos) => gestos.current.regua(pontos),
      aoNevoa: (forma) => gestos.current.desenharNevoa(forma),
      aoArea: (area) => gestos.current.marcarArea(area),
    }).then((criado) => {
      if (!vivo) {
        criado.destruir();
        return;
      }
      palco = criado;
      palcoRef.current = criado;
      criado.aoQuadro(aplicarRemotos);
      // Só em desenvolvimento: os testes de navegador acham os tokens na tela por aqui.
      if (import.meta.env.DEV) (window as unknown as { __palcoMapa?: PalcoMapa }).__palcoMapa = criado;
      setPalcoPronto(true);
    }).catch(() => setErro('Este navegador não conseguiu abrir o motor do mapa (WebGL/WebGPU).'));
    return () => {
      vivo = false;
      palco?.destruir();
      palcoRef.current = null;
      setPalcoPronto(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void recarregar();
  }, [recarregar, cenaVista]);

  // A Sessão (iniciativa, rolagens) e os eventos que mudam o que o mapa mostra (vida, visibilidade, ao vivo).
  useEffect(() => {
    if (!campanhaId) return undefined;
    conectarSSE(campanhaId);
    const sair = assinarEventosDaCampanha(campanhaId, {
      aoEvento: (tipo) => {
        if (!EVENTOS_SEM_EFEITO.has(tipo)) agendarRecarga();
      },
      aoConectar: agendarRecarga,
    });
    return () => {
      sair();
      desconectarSSE();
    };
  }, [campanhaId, conectarSSE, desconectarSSE, agendarRecarga]);

  const bloqueado = estado?.bloqueado ?? true;
  useEffect(() => {
    if (!campanhaId || bloqueado) return undefined;
    const nova = new ConexaoMapa(campanhaId, { aoMensagem, aoEstado: setConexao, aoReconectar: agendarRecarga });
    conexaoRef.current = nova;
    nova.conectar();
    return () => {
      nova.fechar();
      if (conexaoRef.current === nova) conexaoRef.current = null;
    };
  }, [campanhaId, bloqueado, aoMensagem, agendarRecarga]);

  useEffect(() => {
    const palco = palcoRef.current;
    if (!palco || !palcoPronto || !campanhaId) return;
    if (estado?.cena) palco.definirCena(estado.cena, campanhaId, estado.gestor);
    palco.definirTokens(estado?.cena ? estado.tokens : []);
  }, [estado, palcoPronto, campanhaId]);

  useEffect(() => {
    palcoRef.current?.definirFerramenta(ferramenta);
    if (ferramenta !== 'area') setMarcandoArea(false);
  }, [ferramenta, palcoPronto]);

  useEffect(() => {
    palcoRef.current?.definirOpcoesNevoa(opcoesNevoa);
  }, [opcoesNevoa, palcoPronto]);

  useEffect(() => {
    palcoRef.current?.definirClimaLigado(climaLocal);
    try {
      window.localStorage.setItem(CHAVE_CLIMA_LOCAL, climaLocal ? 'ligado' : 'desligado');
    } catch {
      // Sem armazenamento do navegador, a escolha vale só até fechar a aba.
    }
  }, [climaLocal, palcoPronto]);

  // Pincel começa com duas casas de largura na grade da cena.
  const tamanhoCasa = estado?.cena?.grade.tamanho ?? 100;
  useEffect(() => {
    setOpcoesNevoa((atual) => ({ ...atual, raio: tamanhoCasa }));
  }, [estado?.cena?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    palcoRef.current?.definirSelecionado(selecionado);
  }, [selecionado, palcoPronto]);

  const tokens = useMemo(() => estado?.tokens ?? [], [estado]);
  const tokenDaVez = useMemo(() => {
    if (!emCombate || !turnoAtualId) return null;
    const entidade = iniciativa.find((e) => e.id === turnoAtualId);
    return entidade ? tokenDaEntidade(entidade, tokens)?.id ?? null : null;
  }, [emCombate, turnoAtualId, iniciativa, tokens]);

  useEffect(() => {
    palcoRef.current?.definirVez(tokenDaVez);
  }, [tokenDaVez, palcoPronto, estado]);

  const gestorAgora = estado?.gestor ?? false;
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo && ['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo.tagName)) return;
      const palco = palcoRef.current;
      if ((evento.ctrlKey || evento.metaKey) && (evento.key === 'z' || evento.key === 'Z')) {
        if (ferramenta === 'nevoa') {
          evento.preventDefault();
          void enviarNevoa({ desfazer: true });
        }
        return;
      }
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if (evento.key === 'v' || evento.key === 'V') setFerramenta('mover');
      if (evento.key === 'r' || evento.key === 'R') setFerramenta('regua');
      if (evento.key === 'p' || evento.key === 'P') setFerramenta('ping');
      if ((evento.key === 'n' || evento.key === 'N') && gestorAgora) setFerramenta('nevoa');
      if (evento.key === 'Enter' && ferramenta === 'nevoa') palco?.fecharPoligono();
      if (evento.key === 'Escape') {
        if (palco?.desenhando) palco.cancelarDesenho();
        else if (ferramenta === 'area' || ferramenta === 'nevoa') setFerramenta('mover');
        else setSelecionado(null);
      }
    };
    const aoTelaCheia = () => setTelaCheia(Boolean(document.fullscreenElement));
    window.addEventListener('keydown', aoTeclar);
    document.addEventListener('fullscreenchange', aoTelaCheia);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('fullscreenchange', aoTelaCheia);
    };
  }, [ferramenta, gestorAgora, enviarNevoa]);

  // ------------------------------------------------------- ações do Mestre

  const comErro = useCallback(async <T,>(acao: () => Promise<T>): Promise<T | null> => {
    try {
      return await acao();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Algo não deu certo.');
      return null;
    }
  }, []);

  const cena = estado?.cena ?? null;
  const gestor = estado?.gestor ?? false;

  const novaCena = async (item?: IItemAcervo) => {
    if (!campanhaId) return;
    const nome = item?.nome ?? window.prompt('Nome da cena', `Cena ${(estado?.cenas.length ?? 0) + 1}`);
    if (!nome?.trim()) return;
    const resposta = await comErro(() => mapaApi.criarCena(campanhaId, { nome: nome.trim(), mapa_id: item?.id }));
    if (resposta?.cena) {
      setCenaVista(resposta.cena.id);
      setEstado(resposta);
    }
  };

  const editarToken = async (dados: ITokenEdicao) => {
    if (!campanhaId || !selecionado) return;
    const resposta = await comErro(() => mapaApi.editarToken(campanhaId, selecionado, dados));
    if (resposta) setEstado(resposta);
  };

  /** Moldura do token: a do personagem vale em todas as cenas; a de token solto, só nele. */
  const escolherMoldura = async (id: string | null) => {
    const token = tokens.find((t) => t.id === selecionado);
    if (!campanhaId || !token) return;
    if (token.personagem_id) {
      await comErro(() => mapaApi.editarTokenDoPersonagem(campanhaId, token.personagem_id!, id ? { moldura: id } : { sem_moldura: true }));
      void recarregar();
      return;
    }
    const resposta = await comErro(() => mapaApi.editarToken(campanhaId, token.id, id ? { moldura: id } : { sem_moldura: true }));
    if (resposta) setEstado(resposta);
  };

  const mudarEnquadramento = async (enquadramento: Enquadramento) => {
    const token = tokens.find((t) => t.id === selecionado);
    if (!campanhaId || !token?.personagem_id) return;
    await comErro(() => mapaApi.editarTokenDoPersonagem(campanhaId, token.personagem_id!, { enquadramento }));
    void recarregar();
  };

  const removerToken = async () => {
    if (!campanhaId || !selecionado) return;
    if (!(await confirmar({ mensagem: 'Tirar este token do mapa?', rotuloConfirmar: 'Tirar', tom: 'perigo' }))) return;
    await comErro(() => mapaApi.apagarToken(campanhaId, selecionado));
    setSelecionado(null);
    void recarregar();
  };

  /** Meio da tela, encaixado no meio de uma casa: token novo já nasce no lugar certo. */
  const centroNaGrade = () => (cena && palcoRef.current ? encaixar(palcoRef.current.centro(), cena.grade, 1) : null);

  const trazerParticipantes = async () => {
    const centro = centroNaGrade();
    if (!campanhaId || !cena || !centro) return;
    const resposta = await comErro(() => mapaApi.trazerParticipantes(campanhaId, cena.id, centro));
    if (resposta) setEstado(resposta);
  };

  const porNaCena = async (item: IItemAcervo) => {
    const centro = centroNaGrade();
    if (!campanhaId || !cena || !centro) return;
    const { x, y } = centro;
    const resposta = await comErro(() => mapaApi.criarToken(campanhaId, cena.id, { imagem_id: item.id, nome: item.nome, x, y }));
    if (resposta) setEstado(resposta);
  };

  const usarComoMapa = async (item: IItemAcervo) => {
    if (!campanhaId || !cena) return;
    const resposta = await comErro(() => mapaApi.editarCena(campanhaId, cena.id, { mapa_id: item.id }));
    if (resposta) setEstado(resposta);
  };

  const apagarCena = async () => {
    if (!campanhaId || !cena) return;
    if (!(await confirmar({ titulo: `Apagar a cena "${cena.nome}"?`, mensagem: 'Os tokens dela somem junto. As imagens continuam no acervo.', rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    await comErro(() => mapaApi.apagarCena(campanhaId, cena.id));
    setConfigAberta(false);
    setCenaVista(null);
    void recarregar();
  };

  const salvarClima = (clima: IClima) => {
    if (!campanhaId || !cena) return;
    void comErro(() => mapaApi.mudarClima(campanhaId, cena.id, clima)).then((r) => r && setEstado(r));
  };

  const pedirArea = (aplicar: (area: IAreaClima) => void) => {
    aplicarArea.current = aplicar;
    setMarcandoArea(true);
    setFerramenta('area');
  };

  const alternarTelaCheia = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const tokenSelecionado = tokens.find((t) => t.id === selecionado) ?? null;
  const fichas = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const token of tokens) {
      if (token.personagem_id && (gestor || token.e_meu)) vistas.set(token.personagem_id, token.nome);
    }
    return [...vistas].map(([id, nome]) => ({ id, nome }));
  }, [tokens, gestor]);

  const centralizar = (token: ITokenMapa) => {
    const posicao = palcoRef.current?.posicaoDe(token.id) ?? token;
    palcoRef.current?.centralizar(posicao.x, posicao.y);
    setSelecionado(token.id);
  };

  // ------------------------------------------------------------------ tela

  const aviso = !campanhaId
    ? 'Escolha uma campanha para abrir o mapa.'
    : estado?.bloqueado
      ? 'O mapa abre quando a sessão estiver ao vivo.'
      : estado && !cena
        ? gestor ? 'Nenhuma cena ainda. Crie uma na faixa de baixo ou a partir de um mapa do Acervo.' : 'O Mestre ainda não abriu um mapa.'
        : null;

  return (
    <div className={`mapa-pagina${lateralAberta ? ' com-lateral' : ''}${gestor ? ' do-mestre' : ''}`}>
      <header className="mapa-topo">
        <button type="button" className="mapa-icone" aria-label="Voltar para a Sessão" onClick={() => navigate('/sessao')}><ArrowLeft size={18} /></button>
        <div className="mapa-topo-titulo">
          <strong>{cena?.nome ?? 'Mapa'}</strong>
          {cena && gestor && <span className={cena.ativa ? 'selo ativo' : 'selo'}>{cena.ativa ? 'Na mesa' : 'Só você vê'}</span>}
          {estado && !estado.ao_vivo && gestor && <span className="selo">Sessão em preparo</span>}
        </div>
        <div className="mapa-pessoas" aria-label="Quem está no mapa">
          {pessoas.map((p) => (
            <span key={p.usuario_id} title={`${p.nome}${p.gestor ? ' (Mestre)' : ''}`} style={{ borderColor: p.cor, color: p.cor }}>
              {p.nome.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <span className={`mapa-conexao ${conexao}`} title={conexao === 'ws' ? 'Tempo real ligado' : conexao === 'sse' ? 'Tempo real pelo plano B' : 'Reconectando'}>
          {conexao === 'ws' || conexao === 'sse' ? <Wifi size={16} /> : <WifiOff size={16} />}
        </span>
        <button type="button" className="mapa-icone" aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'} onClick={alternarTelaCheia}>
          {telaCheia ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
        <button type="button" className="mapa-icone" aria-label={lateralAberta ? 'Recolher o painel' : 'Abrir o painel'} onClick={() => setLateralAberta((v) => !v)}>
          {lateralAberta ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
        </button>
      </header>

      <nav className="mapa-ferramentas" aria-label="Ferramentas">
        <button type="button" className={ferramenta === 'mover' ? 'ativo' : ''} onClick={() => setFerramenta('mover')} title="Mover tokens e o mapa (V)"><Hand size={18} /></button>
        <button type="button" className={ferramenta === 'regua' ? 'ativo' : ''} onClick={() => setFerramenta('regua')} title="Régua (R)"><Ruler size={18} /></button>
        <button type="button" className={ferramenta === 'ping' ? 'ativo' : ''} onClick={() => setFerramenta('ping')} title="Ping, ou Alt + clique (P)"><MapPin size={18} /></button>
        <span className="mapa-separador" />
        <button type="button" onClick={() => palcoRef.current?.enquadrar()} title="Ver o mapa inteiro"><Expand size={18} /></button>
        {!gestor && Boolean(cena?.clima.efeitos.length) && (
          <button type="button" onClick={() => setClimaLocal((v) => !v)} title={climaLocal ? 'Desligar os efeitos de clima neste aparelho' : 'Ligar os efeitos de clima neste aparelho'}>
            {climaLocal ? <Cloud size={18} /> : <CloudOff size={18} />}
          </button>
        )}
        {gestor && (
          <>
            <span className="mapa-separador" />
            <button type="button" disabled={!cena} className={ferramenta === 'nevoa' ? 'ativo' : ''} onClick={() => setFerramenta((f) => (f === 'nevoa' ? 'mover' : 'nevoa'))} title="Névoa de guerra: revelar e esconder (N)"><Eye size={18} /></button>
            <button
              type="button"
              disabled={!cena}
              className={climaAberto ? 'ativo' : ''}
              onClick={() => {
                setClimaAberto((v) => !v);
                setConfigAberta(false);
              }}
              title="Clima da cena"
            >
              <CloudRain size={18} />
            </button>
            <button type="button" className={acervoAberto ? 'ativo' : ''} onClick={() => setAcervoAberto((v) => !v)} title="Acervo"><FolderOpen size={18} /></button>
            <button type="button" className={oficinaAberta ? 'ativo' : ''} onClick={() => setOficinaAberta((v) => !v)} title="Oficina: token novo, remover fundo, melhorar imagem"><Wand2 size={18} /></button>
            <button type="button" disabled={!cena} onClick={() => void trazerParticipantes()} title="Trazer os participantes da Sessão"><Users size={18} /></button>
          </>
        )}
        {selecionado && tokenSelecionado && (
          <button type="button" onClick={() => centralizar(tokenSelecionado)} title="Centralizar no token"><Crosshair size={18} /></button>
        )}
      </nav>

      <main className="mapa-area">
        <div ref={alvoRef} className="mapa-palco" />
        {!estado && !erro && <div className="mapa-aviso"><Loader2 className="girando" size={20} /> Abrindo o mapa...</div>}
        {!estado && erro && (
          <div className="mapa-aviso mapa-aviso-erro">
            <span>Não deu para abrir o mapa agora: {erro} Tentando de novo sozinho.</span>
            <button type="button" className="mapa-botao" onClick={() => void recarregar()}>Tentar agora</button>
          </div>
        )}
        {aviso && <div className="mapa-aviso">{aviso}</div>}
        {erro && estado && <button type="button" className="mapa-erro-flutuante" onClick={() => setErro('')}>{erro}</button>}
        {gestor && cena && ferramenta === 'nevoa' && (
          <BarraNevoa
            ligada={cena.nevoa.ligada}
            naMesa={cena.ativa && Boolean(estado?.ao_vivo)}
            opcoes={opcoesNevoa}
            tamanhoCasa={tamanhoCasa}
            temFormas={cena.nevoa.formas.length > 0}
            onLigar={(ligada) => void enviarNevoa({ ligada })}
            onOpcoes={setOpcoesNevoa}
            onDesfazer={() => void enviarNevoa({ desfazer: true })}
            onRevelarTudo={() => void enviarNevoa({ revelar_tudo: true })}
            onCobrirTudo={async () => {
              if (await confirmar({ mensagem: 'Cobrir o mapa inteiro de novo? As áreas reveladas voltam a ficar escondidas.', rotuloConfirmar: 'Cobrir' })) void enviarNevoa({ cobrir_tudo: true });
            }}
          />
        )}
        {gestor && cena && ferramenta === 'area' && (
          <div className="mapa-aviso-topo">Arraste no mapa a área do efeito. Esc cancela.</div>
        )}
        {tokenSelecionado && (
          <MenuToken
            token={tokenSelecionado}
            gestor={gestor}
            molduraMesa={estado?.moldura_mesa ?? null}
            onEditar={(dados) => void editarToken(dados)}
            onMoldura={(id) => void escolherMoldura(id)}
            onEnquadramento={(e) => void mudarEnquadramento(e)}
            onRemover={() => void removerToken()}
            onFechar={() => setSelecionado(null)}
          />
        )}
        {climaAberto && cena && gestor && (
          <PainelClima
            clima={cena.clima}
            ligadoLocal={climaLocal}
            marcandoArea={marcandoArea}
            onLigadoLocal={setClimaLocal}
            onPrevia={(clima) => palcoRef.current?.previaClima(clima)}
            onSalvar={salvarClima}
            onMarcarArea={pedirArea}
            onFechar={() => setClimaAberto(false)}
          />
        )}
        {configAberta && cena && gestor && (
          <ConfigCena
            cena={cena}
            molduraMesa={estado?.moldura_mesa ?? null}
            onMolduraMesa={(id) => void comErro(() => mapaApi.configurar(campanhaId!, { moldura_mesa: id })).then(() => recarregar())}
            onSalvar={(dados) => void comErro(() => mapaApi.editarCena(campanhaId!, cena.id, dados)).then((r) => r && setEstado(r))}
            onApagar={() => void apagarCena()}
            onFechar={() => setConfigAberta(false)}
          />
        )}
        <AcervoGaveta
          aberto={acervoAberto && gestor}
          onFechar={() => setAcervoAberto(false)}
          temCena={Boolean(cena)}
          onUsarComoMapa={(item) => void usarComoMapa(item)}
          onNovaCena={(item) => void novaCena(item)}
          onPorNaCena={(item) => void porNaCena(item)}
        />
        {gestor && campanhaId && (
          <OficinaGaveta
            aberto={oficinaAberta}
            onFechar={() => setOficinaAberta(false)}
            campanhaId={campanhaId}
            cenaId={cena?.id ?? null}
            sessaoId={sessaoId}
            centro={centroNaGrade}
            onCena={setEstado}
          />
        )}
      </main>

      {lateralAberta && (
        <aside className="mapa-lateral">
          <PainelLateral aba={aba} onAba={setAba} tokens={tokens} fichas={fichas} onCentralizar={centralizar} />
        </aside>
      )}

      {gestor && (
        <footer className="mapa-rodape">
          <FaixaCenas
            cenas={estado?.cenas ?? []}
            vendo={cena?.id ?? null}
            onVer={(id) => setCenaVista(id)}
            onAtivar={(id) => void comErro(() => mapaApi.ativarCena(campanhaId!, id)).then((r) => r && setEstado(r))}
            onNova={() => void novaCena()}
            onConfigurar={() => {
              setConfigAberta((v) => !v);
              setClimaAberto(false);
            }}
          />
        </footer>
      )}
    </div>
  );
};

export default MapaPage;
