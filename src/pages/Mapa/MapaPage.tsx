// Mapa ao vivo: tela cheia pensada para PC. O mapa ocupa tudo; ferramentas à
// esquerda, painel recolhível à direita (iniciativa, ficha, rolagens) e, para o
// Mestre, a faixa de cenas embaixo e o Acervo. Ver docs/propostas/mapa-ao-vivo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Cloud, CloudOff, CloudRain, Crosshair, Expand, Eye, FolderOpen, Hand, Loader2, MapPin, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, Ruler, Sparkles, Swords, UserRound, Users, Wand2, Wifi, WifiOff,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSessaoStore } from '../../store/useSessaoStore';
import { assinarEventosDaCampanha } from '../../services/campanhaEventos';
import { mapaApi, type IAreaClima, type IClima, type IEstadoMapa, type IFormaNevoa, type IMagiaMapa, type INevoaPayload, type ITokenEdicao, type ITokenMapa } from '../../services/mapaApi';
import type { IItemAcervo } from '../../services/acervoApi';
import { confirmar, pedirTexto } from '../../components/avisos/confirmacao';
import { avisar } from '../../components/avisos/avisos';
import { PalcoMapa, type Ferramenta, type OpcoesMagia, type OpcoesNevoa } from './motor/palco';
import { encaixar, type IPonto } from './motor/geometria';
import { ConexaoMapa, Interpolador, type EstadoConexao, type MensagemMapa } from './tempoReal';
import { PainelLateral, tokenDaEntidade, type AbaLateral } from './componentes/PainelLateral';
import { BotaoFerramenta, ComDica } from './componentes/BotaoFerramenta';
import { MenuToken } from './componentes/MenuToken';
import { ConfigCena, FaixaCenas } from './componentes/CenasDoMestre';
import { AcervoGaveta } from './acervo/AcervoGaveta';
import { OficinaGaveta } from './oficina/OficinaGaveta';
import { BarraNevoa } from './componentes/BarraNevoa';
import { BarraMagia } from './componentes/BarraMagia';
import { PainelClima } from './componentes/PainelClima';
import { MedidorPainel } from './componentes/Medidor';
import { Medidor } from './medidor';
import { aplicarDelta, type DeltaMapa } from './delta';
import type { Enquadramento } from './motor/molduras';
import './mapa.css';

interface Pessoa {
  usuario_id: string;
  nome: string;
  cor: string;
  gestor: boolean;
}

/** Arrasto e régua saem 30 vezes por segundo, junto com o quadro da tela (a cada dois quadros a 60 Hz). */
const ENVIO_ARRASTO_MS = 1000 / 30;
/** Folga para o envio casar com o quadro: um quadro chega a 33,3 ms, nunca exatos 33,33. */
const TOLERANCIA_QUADRO_MS = 4;
/** Escolha de cada aparelho: desligar os efeitos de clima (desempenho ou conforto). */
const CHAVE_CLIMA_LOCAL = 'jardim.mapa.clima';

function lerClimaLocal(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_CLIMA_LOCAL) !== 'desligado';
  } catch {
    return true;
  }
}
/** A última forma e o Fluxo de magia escolhidos neste aparelho. */
const CHAVE_MAGIA_LOCAL = 'jardim.mapa.magia';

function lerMagiaLocal(): OpcoesMagia {
  try {
    const salvo = JSON.parse(window.localStorage.getItem(CHAVE_MAGIA_LOCAL) ?? 'null');
    if (salvo && typeof salvo.forma === 'string' && typeof salvo.fluxo === 'string') return salvo;
  } catch {
    // Sem armazenamento ou valor estragado: volta ao padrão.
  }
  return { forma: 'circulo', fluxo: 'essencia' };
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
  const { conectarSSE, desconectarSSE, iniciativa, turnoAtualId, emCombate, rodada, sessaoId } = useSessaoStore();

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
  const [opcoesMagia, setOpcoesMagia] = useState<OpcoesMagia>(lerMagiaLocal);
  const aplicarArea = useRef<((area: IAreaClima) => void) | null>(null);
  const pedidoNevoa = useRef(0);
  const [medidorAberto, setMedidorAberto] = useState(false);
  const medidor = useRef(new Medidor()).current;
  /** Número da última mudança empurrada pelo servidor nesta conexão. */
  const ultimoSeq = useRef<number | null>(null);

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
      const inicio = agoraServidor();
      const novo = await mapaApi.obter(campanhaId, cenaVistaRef.current);
      medidor.registrarRecarga(agoraServidor(), agoraServidor() - inicio);
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
  }, [campanhaId, medidor]);

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
      case 'oi':
        // Conexão nova: a numeração das mudanças recomeça.
        if (mensagem.eu) ultimoSeq.current = null;
        // Resposta do batimento: ida e volta e relógio do servidor, para o medidor.
        if (typeof mensagem.c === 'number' && typeof mensagem.ts === 'number') medidor.registrarOi(mensagem.c, agoraServidor(), mensagem.ts);
        break;
      case 'estado':
      case 'delta': {
        // Mudança pronta do servidor, já no recorte desta pessoa: nada de esperar e baixar o mapa inteiro.
        const seq = Number(mensagem.seq);
        const anterior = ultimoSeq.current;
        ultimoSeq.current = seq;
        medidor.registrarMudanca(agoraServidor(), Number(mensagem.ts));
        if (anterior !== null && seq !== anterior + 1) {
          // Pulou um número: alguma mudança se perdeu no caminho, e o mapa inteiro vem pelo GET.
          agendarRecarga();
          break;
        }
        if (mensagem.t === 'estado') {
          const novo = mensagem.estado as IEstadoMapa;
          // O Mestre pode ter trocado de cena enquanto o servidor calculava a outra.
          const vista = cenaVistaRef.current;
          if (vista && novo.cena?.id !== vista) {
            agendarRecarga();
            break;
          }
          setEstado(novo);
          setErro('');
          break;
        }
        const delta = mensagem as unknown as DeltaMapa;
        if ((estadoRef.current?.cena?.id ?? null) !== delta.cena_id) {
          agendarRecarga();
          break;
        }
        setEstado((atual) => (atual ? aplicarDelta(atual, delta) : atual));
        break;
      }
      case 'arrastando':
      case 'token': {
        const id = String(mensagem.token);
        // A hora do gesto (`tm`) tem o espaçamento de quem arrasta; a de chegada ao servidor (`ts`)
        // traz a variação da subida, e o token andaria aos solavancos.
        const hora = typeof mensagem.tm === 'number' ? mensagem.tm : Number(mensagem.ts);
        interpolador.receber(id, { t: hora, x: Number(mensagem.x), y: Number(mensagem.y), final: mensagem.t === 'token' });
        ultimaAmostra.set(id, agoraServidor());
        medidor.registrarMovimento(agoraServidor(), Number(mensagem.ts), typeof mensagem.tm === 'number' ? mensagem.tm : null);
        if (mensagem.t === 'token') atualizarPosicao(id, Number(mensagem.x), Number(mensagem.y));
        break;
      }
      case 'mudou':
        agendarRecarga();
        break;
      case 'ping':
        palco?.ping(Number(mensagem.x), Number(mensagem.y), String(mensagem.cor), String(mensagem.nome));
        break;
      case 'magia':
        // Efeito de magia de outra pessoa: a mesa inteira vê o mesmo desenho, com o nome de quem lançou.
        palco?.magia({
          forma: mensagem.forma as IMagiaMapa['forma'], fluxo: String(mensagem.fluxo),
          x: Number(mensagem.x), y: Number(mensagem.y), ax: Number(mensagem.ax), ay: Number(mensagem.ay),
        }, String(mensagem.nome));
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
  }, [agendarRecarga, atualizarPosicao, interpolador, ultimaAmostra, medidor]);

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

  /** A hora do gesto no relógio do servidor vai junto: o medidor de quem recebe calcula o atraso inteiro. */
  const horaDoGesto = useCallback((): { tm?: number } => {
    const tm = medidor.horaDoServidor(agoraServidor());
    return tm === null ? {} : { tm };
  }, [medidor]);

  /** A última posição de cada token arrastado que ainda não saiu. */
  const pendentesArrasto = useRef(new Map<string, IPonto>()).current;
  /** A última que saiu, para repetir uma vez quando a mão para (quem recebe não segue em frente). */
  const ultimaEnviada = useRef(new Map<string, IPonto & { repetida: boolean }>()).current;

  const enviarArrastos = useCallback((agora: number) => {
    for (const [id, ponto] of pendentesArrasto) {
      if (agora - (ultimoEnvio.get(id) ?? -Infinity) < ENVIO_ARRASTO_MS - TOLERANCIA_QUADRO_MS) continue;
      ultimoEnvio.set(id, agora);
      pendentesArrasto.delete(id);
      ultimaEnviada.set(id, { ...ponto, repetida: false });
      conexaoRef.current?.enviar({ t: 'arrastar', token: id, x: ponto.x, y: ponto.y, ...horaDoGesto() });
    }
    for (const [id, ponto] of ultimaEnviada) {
      if (ponto.repetida || pendentesArrasto.has(id)) continue;
      if (palcoRef.current?.tokenArrastadoLocal !== id) {
        ultimaEnviada.delete(id);
        continue;
      }
      // A mão parou: no próximo envio sai a mesma posição de novo, e quem recebe vê o token parar ali.
      if (agora - (ultimoEnvio.get(id) ?? agora) < ENVIO_ARRASTO_MS - TOLERANCIA_QUADRO_MS) continue;
      ultimoEnvio.set(id, agora);
      ponto.repetida = true;
      conexaoRef.current?.enviar({ t: 'arrastar', token: id, x: ponto.x, y: ponto.y, ...horaDoGesto() });
    }
  }, [pendentesArrasto, ultimaEnviada, ultimoEnvio, horaDoGesto]);

  const soltar = useCallback((id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!atual?.cena || !campanhaId) return;
    pendentesArrasto.delete(id);
    ultimaEnviada.delete(id);
    ultimoEnvio.delete(id);
    atualizarPosicao(id, x, y);
    if (atual.cena.ativa && conexaoRef.current?.aberta) {
      conexaoRef.current.enviar({ t: 'soltar', token: id, x, y, ...horaDoGesto() });
      return;
    }
    // Cena em preparo (só o Mestre vê) ou sem tempo real: grava pela rota.
    mapaApi.moverToken(campanhaId, id, { x, y }).catch((falha) => {
      setErro(falha instanceof Error ? falha.message : 'O token não foi salvo.');
      agendarRecarga();
    });
  }, [agendarRecarga, atualizarPosicao, campanhaId, ultimoEnvio, horaDoGesto, pendentesArrasto, ultimaEnviada]);

  /** A posição fica guardada e sai no ritmo do quadro: mesmo com a mão parada, a última chega aos outros. */
  const arrastar = useCallback((id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!atual?.cena?.ativa) return;
    pendentesArrasto.set(id, { x, y });
    enviarArrastos(performance.now());
  }, [pendentesArrasto, enviarArrastos]);

  const ultimaRegua = useRef(0);
  const regua = useCallback((pontos: IPonto[] | null) => {
    const agora = performance.now();
    if (pontos && agora - ultimaRegua.current < ENVIO_ARRASTO_MS - TOLERANCIA_QUADRO_MS) return;
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

  /** A minha magia: o palco já desenhou; com a cena na mesa, a mesa inteira recebe. */
  const lancarMagia = useCallback((magia: IMagiaMapa) => {
    if (!estadoRef.current?.cena?.ativa) return;
    conexaoRef.current?.enviar({ t: 'magia', ...magia });
  }, []);

  // O palco nasce uma vez; os gestos chegam sempre na versão mais nova das funções.
  const gestos = useRef({ arrastar, soltar, regua, desenharNevoa, marcarArea, enviarArrastos, lancarMagia });
  gestos.current = { arrastar, soltar, regua, desenharNevoa, marcarArea, enviarArrastos, lancarMagia };

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
      aoMagia: (magia) => gestos.current.lancarMagia(magia),
    }).then((criado) => {
      if (!vivo) {
        criado.destruir();
        return;
      }
      palco = criado;
      palcoRef.current = criado;
      criado.aoQuadro(aplicarRemotos);
      criado.aoQuadro(() => gestos.current.enviarArrastos(performance.now()));
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
        // Com o tempo real ligado, o servidor já manda a mudança pronta; o evento só vale sem ele.
        if (conexaoRef.current?.aberta) return;
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
    const aoEstado = (novoEstado: EstadoConexao) => {
      medidor.conexao = novoEstado;
      setConexao(novoEstado);
    };
    const nova = new ConexaoMapa(campanhaId, { aoMensagem, aoEstado, aoReconectar: agendarRecarga });
    conexaoRef.current = nova;
    nova.conectar();
    return () => {
      nova.fechar();
      if (conexaoRef.current === nova) conexaoRef.current = null;
    };
  }, [campanhaId, bloqueado, aoMensagem, agendarRecarga, medidor]);

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
    palcoRef.current?.definirOpcoesMagia(opcoesMagia);
    try {
      window.localStorage.setItem(CHAVE_MAGIA_LOCAL, JSON.stringify(opcoesMagia));
    } catch {
      // Sem armazenamento do navegador, a escolha vale só até fechar a aba.
    }
  }, [opcoesMagia, palcoPronto]);

  // O servidor manda ao Mestre as mudanças da cena que ele está olhando (pode ser uma em preparo).
  useEffect(() => {
    if (conexao === 'ws' || conexao === 'sse') conexaoRef.current?.enviar({ t: 'vendo', cena: cenaVista });
  }, [cenaVista, conexao]);

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
      if ((evento.ctrlKey || evento.metaKey) && evento.shiftKey && (evento.key === 'd' || evento.key === 'D')) {
        evento.preventDefault();
        setMedidorAberto((aberto) => !aberto);
        return;
      }
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
      if (evento.key === 'm' || evento.key === 'M') setFerramenta('magia');
      if ((evento.key === 'n' || evento.key === 'N') && gestorAgora) setFerramenta('nevoa');
      if (evento.key === 'Enter' && ferramenta === 'nevoa') palco?.fecharPoligono();
      if (evento.key === 'Escape') {
        if (palco?.desenhando) palco.cancelarDesenho();
        else if (ferramenta === 'area' || ferramenta === 'nevoa') setFerramenta('mover');
        else setSelecionado(null);
      }
    };
    const aoTelaCheia = () => setTelaCheia(Boolean(document.fullscreenElement));
    const aoMudarAba = () => {
      if (document.visibilityState === 'hidden') medidor.registrarAbaEscondida(agoraServidor());
    };
    window.addEventListener('keydown', aoTeclar);
    document.addEventListener('fullscreenchange', aoTelaCheia);
    document.addEventListener('visibilitychange', aoMudarAba);
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('fullscreenchange', aoTelaCheia);
      document.removeEventListener('visibilitychange', aoMudarAba);
    };
  }, [ferramenta, gestorAgora, enviarNevoa, medidor]);

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
    const nome = item?.nome ?? await pedirTexto({
      titulo: 'Nova cena',
      campo: { rotulo: 'Nome da cena', valor: `Cena ${(estado?.cenas.length ?? 0) + 1}`, maximo: 80 },
      rotuloConfirmar: 'Criar cena',
    });
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

  const centralizar = (token: ITokenMapa) => {
    const posicao = palcoRef.current?.posicaoDe(token.id) ?? token;
    palcoRef.current?.centralizar(posicao.x, posicao.y);
    setSelecionado(token.id);
  };

  // Com o mapa na tela, um erro vira aviso do site (o painel de "não deu para abrir" fica para antes disso).
  useEffect(() => {
    if (!erro || !estado) return;
    avisar.erro(erro);
    setErro('');
  }, [erro, estado]);

  const nomeDaVez = emCombate ? iniciativa.find((e) => e.id === turnoAtualId)?.nome ?? null : null;
  const meuToken = tokens.find((t) => t.e_meu) ?? null;

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
        {emCombate && (
          <div className="mapa-combate" aria-live="polite">
            <Swords size={14} />
            <span>Rodada <strong>{rodada}</strong></span>
            {nomeDaVez && <span className="mapa-combate-vez">Vez de <strong>{nomeDaVez}</strong></span>}
          </div>
        )}
        <div className="mapa-pessoas" aria-label="Quem está no mapa">
          {pessoas.map((p) => (
            <ComDica key={p.usuario_id} dica={`${p.nome}${p.gestor ? ' (Mestre)' : ''}`}>
              <span className="mapa-pessoa" style={{ borderColor: p.cor, color: p.cor }}>{p.nome.slice(0, 1).toUpperCase()}</span>
            </ComDica>
          ))}
        </div>
        <ComDica dica={`${conexao === 'ws' ? 'Tempo real ligado' : conexao === 'sse' ? 'Tempo real pelo plano B' : 'Reconectando'}. Clique para o medidor.`}>
          <button
            type="button"
            className={`mapa-conexao ${conexao}`}
            aria-label="Medidor do tempo real"
            onClick={() => setMedidorAberto((aberto) => !aberto)}
          >
            {conexao === 'ws' || conexao === 'sse' ? <Wifi size={16} /> : <WifiOff size={16} />}
          </button>
        </ComDica>
        <ComDica dica={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'}>
          <button type="button" className="mapa-icone" aria-label={telaCheia ? 'Sair da tela cheia' : 'Tela cheia'} onClick={alternarTelaCheia}>
            {telaCheia ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </ComDica>
        <ComDica dica={lateralAberta ? 'Recolher o painel' : 'Abrir o painel'}>
          <button type="button" className="mapa-icone" aria-label={lateralAberta ? 'Recolher o painel' : 'Abrir o painel'} onClick={() => setLateralAberta((v) => !v)}>
            {lateralAberta ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        </ComDica>
      </header>

      <nav className="mapa-ferramentas" aria-label="Ferramentas">
        <span className="mapa-grupo-rotulo">Mesa</span>
        <BotaoFerramenta icone={Hand} rotulo="Mover tokens e o mapa" atalho="V" ativo={ferramenta === 'mover'} onClick={() => setFerramenta('mover')} />
        <BotaoFerramenta icone={Ruler} rotulo="Régua" atalho="R" ativo={ferramenta === 'regua'} onClick={() => setFerramenta('regua')} />
        <BotaoFerramenta icone={MapPin} rotulo="Ping (ou Alt + clique)" atalho="P" ativo={ferramenta === 'ping'} onClick={() => setFerramenta('ping')} />
        <BotaoFerramenta icone={Sparkles} rotulo="Efeito de magia" atalho="M" disabled={!cena} ativo={ferramenta === 'magia'} onClick={() => setFerramenta((f) => (f === 'magia' ? 'mover' : 'magia'))} />
        <span className="mapa-separador" />
        <span className="mapa-grupo-rotulo">Vista</span>
        <BotaoFerramenta icone={Expand} rotulo="Ver o mapa inteiro" disabled={!cena} onClick={() => palcoRef.current?.enquadrar()} />
        {meuToken && !gestor && (
          <BotaoFerramenta icone={UserRound} rotulo="Ir até o meu personagem" onClick={() => centralizar(meuToken)} />
        )}
        {selecionado && tokenSelecionado && (
          <BotaoFerramenta icone={Crosshair} rotulo="Centralizar no token escolhido" onClick={() => centralizar(tokenSelecionado)} />
        )}
        {!gestor && Boolean(cena?.clima.efeitos.length) && (
          <BotaoFerramenta
            icone={climaLocal ? Cloud : CloudOff}
            rotulo={climaLocal ? 'Desligar o clima neste aparelho' : 'Ligar o clima neste aparelho'}
            onClick={() => setClimaLocal((v) => !v)}
          />
        )}
        {gestor && (
          <>
            <span className="mapa-separador" />
            <span className="mapa-grupo-rotulo">Mestre</span>
            <BotaoFerramenta icone={Eye} rotulo="Névoa de guerra" atalho="N" disabled={!cena} ativo={ferramenta === 'nevoa'} onClick={() => setFerramenta((f) => (f === 'nevoa' ? 'mover' : 'nevoa'))} />
            <BotaoFerramenta
              icone={CloudRain}
              rotulo="Clima da cena"
              disabled={!cena}
              ativo={climaAberto}
              onClick={() => {
                setClimaAberto((v) => !v);
                setConfigAberta(false);
              }}
            />
            <BotaoFerramenta icone={Users} rotulo="Trazer os participantes da Sessão" disabled={!cena} onClick={() => void trazerParticipantes()} />
            <BotaoFerramenta icone={FolderOpen} rotulo="Acervo de mapas e tokens" ativo={acervoAberto} onClick={() => setAcervoAberto((v) => !v)} />
            <BotaoFerramenta icone={Wand2} rotulo="Oficina: token novo, fundo e qualidade" ativo={oficinaAberta} onClick={() => setOficinaAberta((v) => !v)} />
          </>
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
        {medidorAberto && <MedidorPainel medidor={medidor} interpolador={interpolador} onFechar={() => setMedidorAberto(false)} />}
        {cena && ferramenta === 'magia' && (
          <BarraMagia opcoes={opcoesMagia} naMesa={cena.ativa && Boolean(estado?.ao_vivo)} onOpcoes={setOpcoesMagia} />
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
          <PainelLateral aba={aba} onAba={setAba} campanhaId={campanhaId ?? ''} tokens={tokens} onCentralizar={centralizar} />
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
