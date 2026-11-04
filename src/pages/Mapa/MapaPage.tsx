// Mapa ao vivo: tela cheia pensada para PC. O mapa ocupa tudo; ferramentas à
// esquerda, painel recolhível à direita (iniciativa, ficha, rolagens) e, para o
// Mestre, a faixa de cenas embaixo e o Acervo. Ver docs/propostas/mapa-ao-vivo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpenCheck, Clock3, Cloud, CloudOff, CloudRain, Crosshair, DraftingCompass, Expand, Eye, FolderOpen, Grid3x3, Hand, Layers, Loader2, MapPin, Maximize2, Minimize2, Moon, Music2, Orbit, PanelRightClose, PanelRightOpen, Ruler, Search, SlidersHorizontal, Sparkles, Sun, Sunrise, Sunset, Swords, Type, UserRound, Users, Wand2, Wifi, WifiOff, X,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSessaoStore } from '../../store/useSessaoStore';
import { assinarEventosDaCampanha } from '../../services/campanhaEventos';
import { mapaApi, type CamadaMapaId, type CamadaTokenId, type IAnotacaoMapa, type IAreaClima, type ICeu, type IClima, type IEstadoMapa, type IFormaNevoa, type IMagiaMapa, type INevoaPayload, type IPortal, type ITokenEdicao, type ITokenMapa } from '../../services/mapaApi';
import { calendarioMundoApi } from '../../services/calendarioMundoApi';
import type { IItemAcervo } from '../../services/acervoApi';
import { confirmar, pedirTexto } from '../../components/avisos/confirmacao';
import { avisar } from '../../components/avisos/avisos';
import { PalcoMapa, type Ferramenta, type OpcoesMagia, type OpcoesNevoa } from './motor/palco';
import { casasDoTrecho, encaixar, rotuloUnidade, type IPonto } from './motor/geometria';
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
import { PainelTempo } from './componentes/PainelTempo';
import { PainelPortal } from './componentes/PainelPortal';
import { MenuPorta } from './componentes/MenuPorta';
import { FalaNaMesa, PainelMesa, PausaDaMesa, RelogiosDaMesa, type FalaRecebida } from './componentes/MesaExtras';
import { Hourglass } from 'lucide-react';
import { urlImagemDoToken, type IMesaExtras } from '../../services/mapaApi';
import { cliqueDoJogador } from './motor/portasConta';
import { ApiError } from '../../services/apiClient';
import type { IAberturaCena } from '../../services/mapaApi';
import { PreferenciasBarras } from './componentes/PreferenciasBarras';
import { ConstrutorMapa } from './construtor/ConstrutorMapa';
import { luzDaCena, nomeDaLua, periodoDaHora, type ChavePeriodo } from './motor/ceuConta';
import { portalNovo, portalQuePergunta, type LadoPortal } from './motor/portaisConta';
import { MedidorPainel } from './componentes/Medidor';
import { Medidor } from './medidor';
import { aplicarDelta, type DeltaMapa } from './delta';
import { PainelCamadas } from './componentes/PainelCamadas';
import { PainelGrade } from './componentes/PainelGrade';
import { EditorAnotacao } from './componentes/EditorAnotacao';
import { PainelJogadores } from './componentes/PainelJogadores';
import type { Enquadramento } from './motor/molduras';
import { lerPreferenciasBarras, normalizarPreferenciasBarras, salvarPreferenciasBarras, type IPreferenciasBarrasMapa } from './motor/barrasToken';
import { mapaRecursosApi, type ITrilhaMesa } from '../../services/mapaRecursosApi';
import { PainelDocumentosMesa } from './componentes/PainelDocumentosMesa';
import { DocumentoDaMesa, type IDocumentoCompartilhado } from './componentes/DocumentoDaMesa';
import { PainelTrilha } from './componentes/PainelTrilha';
import './mapa.css';

interface Pessoa {
  usuario_id: string;
  nome: string;
  cor: string;
  gestor: boolean;
  papel?: 'mestre' | 'assistente' | 'jogador' | 'observador';
}

/** Arrasto e régua saem 30 vezes por segundo, junto com o quadro da tela (a cada dois quadros a 60 Hz). */
const ENVIO_ARRASTO_MS = 1000 / 30;
/** Folga para o envio casar com o quadro: um quadro chega a 33,3 ms, nunca exatos 33,33. */
const TOLERANCIA_QUADRO_MS = 4;
/** Escolha de cada aparelho: desligar os efeitos de clima (desempenho ou conforto). */
const CHAVE_CLIMA_LOCAL = 'jardim.mapa.clima';
const IDS_CAMADAS: CamadaMapaId[] = ['mapa', 'props', 'montarias', 'personagens', 'anotacoes'];
const TODAS_CAMADAS_VISIVEIS: Record<CamadaMapaId, boolean> = {
  mapa: true,
  props: true,
  montarias: true,
  personagens: true,
  anotacoes: true,
};

function anotacaoVazia(ponto: IPonto): IAnotacaoMapa {
  return {
    id: crypto.randomUUID(), texto: '', x: ponto.x, y: ponto.y,
    fonte: 'sans', tamanho: 32, cor: '#ffffff', fundo: '#241d2b', placa: true,
  };
}

function lerClimaLocal(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_CLIMA_LOCAL) !== 'desligado';
  } catch {
    return true;
  }
}
/** Escolhas de cada aparelho: encaixar na grade e aceitar quando alguém traz a mesa para a vista dele. */
const CHAVE_ENCAIXE_LOCAL = 'jardim.mapa.encaixe';
const CHAVE_SEGUIR_VISTA_LOCAL = 'jardim.mapa.seguirVista';

function lerOpcaoLocal(chave: string): boolean {
  try {
    return window.localStorage.getItem(chave) !== 'desligado';
  } catch {
    return true;
  }
}

function guardarOpcaoLocal(chave: string, ligada: boolean) {
  try {
    window.localStorage.setItem(chave, ligada ? 'ligado' : 'desligado');
  } catch {
    // Sem armazenamento do navegador, a escolha vale só até fechar a aba.
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

// Eventos da campanha que não mexem no mapa (rolagem, destaque, mesa). O calendário mexe: a hora muda a luz.
const EVENTOS_SEM_EFEITO = new Set(['registro', 'destaque_mesa', 'mesa']);

const ICONE_DO_PERIODO: Record<ChavePeriodo, typeof Sun> = {
  madrugada: Moon, amanhecer: Sunrise, manha: Sun, tarde: Sun, entardecer: Sunset, noite: Moon,
};

function agoraServidor() {
  return performance.now() + performance.timeOrigin;
}

export const MapaPage = () => {
  const navigate = useNavigate();
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const usuario = useAuthStore((s) => s.usuario);
  const usuarioId = usuario?.id ?? null;
  const campanhaId = campanhaAtiva?.id ?? null;
  const { conectarSSE, desconectarSSE, iniciativa, turnoAtualId, emCombate, rodada, sessaoId } = useSessaoStore();

  const [estado, setEstado] = useState<IEstadoMapa | null>(null);
  const [erro, setErro] = useState('');
  // O que o navegador recebeu quando a resposta do mapa veio vazia (status, tipo): ajuda a achar a causa.
  const [erroDetalhe, setErroDetalhe] = useState('');
  const [cenaVista, setCenaVista] = useState<string | null>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta>('mover');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [conexao, setConexao] = useState<EstadoConexao>('conectando');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  // No celular a gaveta de baixo cobriria metade do mapa e as ferramentas: começa fechada.
  const [lateralAberta, setLateralAberta] = useState(() => typeof window === 'undefined' || window.innerWidth > 760);
  const [aba, setAba] = useState<AbaLateral>('iniciativa');
  const [acervoAberto, setAcervoAberto] = useState(false);
  const [oficinaAberta, setOficinaAberta] = useState(false);
  const [configAberta, setConfigAberta] = useState(false);
  const [telaCheia, setTelaCheia] = useState(false);
  const [palcoPronto, setPalcoPronto] = useState(false);
  const [climaAberto, setClimaAberto] = useState(false);
  const [tempoAberto, setTempoAberto] = useState(false);
  const [tempoOcupado, setTempoOcupado] = useState(false);
  const [portalEscolhido, setPortalEscolhido] = useState<string | null>(null);
  /** A porta que o Mestre clicou (menu da porta). */
  const [portaEscolhida, setPortaEscolhida] = useState<string | null>(null);
  const [portaOcupada, setPortaOcupada] = useState(false);
  /** Leva 6: o painel da mesa do Mestre e a fala de NPC na tela. */
  const [mesaAberta, setMesaAberta] = useState(false);
  const [fala, setFala] = useState<FalaRecebida | null>(null);
  const contadorFala = useRef(0);
  const ultimoAvisoParede = useRef(0);
  /** O servidor segurou o token numa parede: um aviso só, mesmo arrastando várias vezes. */
  const avisarParede = useCallback(() => {
    const agora = Date.now();
    if (agora - ultimoAvisoParede.current < 4000) return;
    ultimoAvisoParede.current = agora;
    avisar.info('Uma parede segura o caminho. Procure uma porta aberta.');
  }, []);
  const [construtorAberto, setConstrutorAberto] = useState(false);
  const [barrasAberto, setBarrasAberto] = useState(false);
  const [camadasAberto, setCamadasAberto] = useState(false);
  const [jogadoresAberto, setJogadoresAberto] = useState(false);
  const [painelRecurso, setPainelRecurso] = useState<'documentos' | 'trilha' | 'busca' | null>(null);
  const [buscaMapa, setBuscaMapa] = useState('');
  const [documentoMesa, setDocumentoMesa] = useState<IDocumentoCompartilhado | null>(null);
  const [trilhaMesa, setTrilhaMesa] = useState<ITrilhaMesa | null>(null);
  const [audioPrecisaAtivar, setAudioPrecisaAtivar] = useState(false);
  const audioMesaRef = useRef<HTMLAudioElement>(null);
  const [camadasLocais, setCamadasLocais] = useState<Record<CamadaMapaId, boolean>>({ ...TODAS_CAMADAS_VISIVEIS });
  const [camadaAtiva, setCamadaAtiva] = useState<CamadaMapaId>('personagens');
  const [editorAnotacao, setEditorAnotacao] = useState<{ anotacao: IAnotacaoMapa; existente: boolean; cenaId: string } | null>(null);
  const [preferenciasBarras, setPreferenciasBarras] = useState<IPreferenciasBarrasMapa>(() => lerPreferenciasBarras(usuarioId));
  const [climaLocal, setClimaLocal] = useState(lerClimaLocal);
  const [gradeAberta, setGradeAberta] = useState(false);
  const [encaixe, setEncaixe] = useState(() => lerOpcaoLocal(CHAVE_ENCAIXE_LOCAL));
  const [seguirVista, setSeguirVista] = useState(() => lerOpcaoLocal(CHAVE_SEGUIR_VISTA_LOCAL));
  const seguirVistaRef = useRef(seguirVista);
  seguirVistaRef.current = seguirVista;
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
  const personagemDaVez = iniciativa.find((entidade) => entidade.id === turnoAtualId)?.personagemId ?? null;
  const turnoAtualRef = useRef({ sessaoId, turnoAtualId, rodada, emCombate, personagemId: personagemDaVez });
  turnoAtualRef.current = { sessaoId, turnoAtualId, rodada, emCombate, personagemId: personagemDaVez };
  const movimentoAtualRef = useRef<{
    chave: string;
    porToken: Record<string, number>;
    posicoes: Record<string, IPonto>;
    trechos: Record<string, { origem: IPonto; destino: IPonto }>;
  }>({ chave: '', porToken: {}, posicoes: {}, trechos: {} });
  const [movimentoAtual, setMovimentoAtual] = useState<{ chave: string; porToken: Record<string, number> }>({ chave: '', porToken: {} });
  const usuarioBarrasRef = useRef(usuarioId);
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
      setErroDetalhe('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não deu para abrir o mapa.');
      const detalhe = (falha as { details?: { http?: number; tipo?: string; motivo?: string } | null })?.details;
      setErroDetalhe(detalhe && typeof detalhe === 'object' && detalhe.http ? `Recebido: HTTP ${detalhe.http}, ${detalhe.tipo ?? 'sem tipo'}, ${detalhe.motivo ?? 'sem motivo'}.` : '');
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

  useEffect(() => {
    if (!campanhaId) {
      setTrilhaMesa(null);
      return undefined;
    }
    let vivo = true;
    void mapaRecursosApi.listarTrilhas(campanhaId)
      .then((resposta) => { if (vivo) setTrilhaMesa(resposta.estado); })
      .catch(() => { /* O mapa continua utilizável quando a trilha não está disponível. */ });
    return () => { vivo = false; };
  }, [campanhaId]);

  useEffect(() => {
    const audio = audioMesaRef.current;
    const estadoTrilha = trilhaMesa;
    if (!audio || !estadoTrilha?.faixa_id) {
      audio?.pause();
      setAudioPrecisaAtivar(false);
      return undefined;
    }
    const sincronizar = () => {
      const relogioServidor = medidor.horaDoServidor(agoraServidor()) ?? Date.now();
      const posicaoMs = estadoTrilha.posicao_ms + (estadoTrilha.reproduzindo ? Math.max(0, relogioServidor - estadoTrilha.servidor_ms) : 0);
      const alvo = Math.max(0, posicaoMs / 1000);
      // A faixa já acabou (o Mestre saiu antes de ela terminar, ou quem chegou agora
      // entrou depois do fim): fica parada, sem pedir para ativar o áudio.
      if (Number.isFinite(audio.duration) && audio.duration > 0 && alvo >= audio.duration - 0.05) {
        audio.pause();
        setAudioPrecisaAtivar(false);
        return;
      }
      if (Number.isFinite(alvo) && Math.abs(audio.currentTime - alvo) > 1.2) audio.currentTime = alvo;
      if (estadoTrilha.reproduzindo) {
        void audio.play().then(() => setAudioPrecisaAtivar(false)).catch(() => setAudioPrecisaAtivar(true));
      } else {
        audio.pause();
      }
    };
    if (audio.readyState >= 1) sincronizar();
    else audio.addEventListener('loadedmetadata', sincronizar, { once: true });
    return () => audio.removeEventListener('loadedmetadata', sincronizar);
  }, [trilhaMesa?.faixa_id, trilhaMesa?.reproduzindo, trilhaMesa?.posicao_ms, trilhaMesa?.servidor_ms, medidor]);

  const registrarMovimentoDoTurno = useCallback((tokenId: string, x: number, y: number) => {
    const turno = turnoAtualRef.current;
    const mapa = estadoRef.current;
    if (!turno.emCombate || !turno.sessaoId || !turno.turnoAtualId || !mapa?.cena) return;
    const chave = `${turno.sessaoId}:${turno.rodada}:${turno.turnoAtualId}`;
    const token = mapa.tokens.find((item) => item.id === tokenId);
    if (!token || (token.participante_id !== turno.turnoAtualId
      && !(token.participante_id == null && turno.personagemId && token.personagem_id === turno.personagemId))) return;
    const metrosPorCasa = Math.max(0, mapa.cena.grade.metros);
    const mesmaChave = movimentoAtualRef.current.chave === chave;
    const origem = mesmaChave ? movimentoAtualRef.current.posicoes[tokenId] ?? token : token;
    const metros = casasDoTrecho(origem, { x, y }, mapa.cena.grade) * metrosPorCasa;
    const posicoes = { ...(mesmaChave ? movimentoAtualRef.current.posicoes : {}), [tokenId]: { x, y } };
    const trechos = {
      ...(mesmaChave ? movimentoAtualRef.current.trechos : {}),
      [tokenId]: { origem: { x: origem.x, y: origem.y }, destino: { x, y } },
    };
    if (!Number.isFinite(metros)) return;
    const anterior = movimentoAtualRef.current.chave === chave ? movimentoAtualRef.current.porToken : {};
    const porToken = { ...anterior, [tokenId]: (anterior[tokenId] ?? 0) + metros };
    movimentoAtualRef.current = { chave, porToken, posicoes, trechos };
    setMovimentoAtual({ chave, porToken });
  }, []);

  const corrigirMovimentoBarrado = useCallback((tokenId: string, x: number, y: number) => {
    const turno = turnoAtualRef.current;
    const mapa = estadoRef.current;
    if (!turno.emCombate || !turno.sessaoId || !turno.turnoAtualId || !mapa?.cena) return;
    const chave = `${turno.sessaoId}:${turno.rodada}:${turno.turnoAtualId}`;
    const atual = movimentoAtualRef.current;
    const trecho = atual.chave === chave ? atual.trechos[tokenId] : null;
    if (!trecho) return;
    const token = mapa.tokens.find((item) => item.id === tokenId);
    if (!token || (token.participante_id !== turno.turnoAtualId
      && !(token.participante_id == null && turno.personagemId && token.personagem_id === turno.personagemId))) return;
    const metrosPorCasa = Math.max(0, mapa.cena.grade.metros);
    const trechoContado = casasDoTrecho(trecho.origem, trecho.destino, mapa.cena.grade) * metrosPorCasa;
    const trechoCorrigido = casasDoTrecho(trecho.origem, { x, y }, mapa.cena.grade) * metrosPorCasa;
    if (!Number.isFinite(trechoContado) || !Number.isFinite(trechoCorrigido)) return;
    const porToken = {
      ...atual.porToken,
      [tokenId]: Math.max(0, (atual.porToken[tokenId] ?? 0) - trechoContado + trechoCorrigido),
    };
    const destino = { x, y };
    movimentoAtualRef.current = {
      ...atual,
      porToken,
      posicoes: { ...atual.posicoes, [tokenId]: destino },
      trechos: { ...atual.trechos, [tokenId]: { origem: trecho.origem, destino } },
    };
    setMovimentoAtual({ chave, porToken });
  }, []);

  const controlarTrilha = useCallback(async (reproduzir: boolean, estadoAtual: ITrilhaMesa, posicaoForcada?: number) => {
    if (!campanhaId || !estadoAtual.faixa_id) return;
    const audio = audioMesaRef.current;
    let posicao = estadoAtual.posicao_ms;
    if (reproduzir) {
      const tentativa = audio?.play();
      if (tentativa) void tentativa.then(() => setAudioPrecisaAtivar(false)).catch(() => setAudioPrecisaAtivar(true));
    } else {
      if (audio && Number.isFinite(audio.currentTime)) posicao = Math.floor(audio.currentTime * 1000);
      audio?.pause();
    }
    if (posicaoForcada !== undefined) posicao = posicaoForcada;
    try {
      setTrilhaMesa(await mapaRecursosApi.definirTrilha(campanhaId, {
        faixa_id: estadoAtual.faixa_id, reproduzindo: reproduzir, posicao_ms: Math.max(0, posicao),
      }));
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não foi possível atualizar a trilha.');
    }
  }, [campanhaId]);

  const ativarAudioDaMesa = () => {
    const audio = audioMesaRef.current;
    if (!audio) return;
    void audio.play().then(() => setAudioPrecisaAtivar(false)).catch(() => setAudioPrecisaAtivar(true));
  };

  useEffect(() => {
    if (usuarioBarrasRef.current === usuarioId) return;
    usuarioBarrasRef.current = usuarioId;
    setPreferenciasBarras(lerPreferenciasBarras(usuarioId));
  }, [usuarioId]);

  const mudarPreferenciasBarras = useCallback((novas: IPreferenciasBarrasMapa) => {
    const limpas = normalizarPreferenciasBarras(novas);
    setPreferenciasBarras(limpas);
    salvarPreferenciasBarras(usuarioId, limpas);
  }, [usuarioId]);

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

  /** O token atravessou um portal: some de um lado e surge do outro. Quem soltou vê a tela ir junto. */
  const atravessou = useCallback((id: string, x: number, y: number, de: number[] | null, fluxo: string, meu: boolean) => {
    interpolador.esquecer(id);
    ultimaAmostra.delete(id);
    atualizarPosicao(id, x, y);
    palcoRef.current?.teletransportar(id, de ? { x: de[0], y: de[1] } : null, { x, y }, fluxo);
    if (meu) palcoRef.current?.centralizar(x, y);
  }, [atualizarPosicao, interpolador, ultimaAmostra]);

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
        // Soltar por uma parede pode voltar ao remetente com a posição corrigida. A
        // soltura local já contou esse movimento; contar a resposta de novo duplica a distância.
        if (mensagem.t === 'token') {
          const x = Number(mensagem.x);
          const y = Number(mensagem.y);
          if (String(mensagem.por ?? '') === String(usuarioId ?? '')) {
            if (mensagem.barrado) corrigirMovimentoBarrado(id, x, y);
          } else {
            registrarMovimentoDoTurno(id, x, y);
          }
        }
        // A hora do gesto (`tm`) tem o espaçamento de quem arrasta; a de chegada ao servidor (`ts`)
        // traz a variação da subida, e o token andaria aos solavancos.
        const hora = typeof mensagem.tm === 'number' ? mensagem.tm : Number(mensagem.ts);
        interpolador.receber(id, { t: hora, x: Number(mensagem.x), y: Number(mensagem.y), final: mensagem.t === 'token' });
        ultimaAmostra.set(id, agoraServidor());
        medidor.registrarMovimento(agoraServidor(), Number(mensagem.ts), typeof mensagem.tm === 'number' ? mensagem.tm : null);
        if (mensagem.t === 'token') {
          atualizarPosicao(id, Number(mensagem.x), Number(mensagem.y));
        }
        if (mensagem.barrado) avisarParede();
        break;
      }
      case 'portal_cena':
        // O meu token atravessou um portal para outra cena: some daqui.
        agendarRecarga();
        avisar.info(estadoRef.current?.gestor
          ? `O token atravessou o portal e foi para a cena ${String(mensagem.cena_nome ?? 'escolhida')}.`
          : 'Seu personagem atravessou o portal e foi para outro lugar.');
        break;
      case 'aviso':
        // Recado do servidor para quem comanda (alguém atravessou para outra cena).
        if (typeof mensagem.texto === 'string') avisar.info(mensagem.texto);
        break;
      case 'fala':
        // O Mestre falou por um NPC: a mesa inteira vê.
        if (typeof mensagem.texto === 'string') {
          contadorFala.current += 1;
          setFala({
            id: contadorFala.current,
            nome: String(mensagem.nome ?? 'Mestre'),
            texto: mensagem.texto,
            token: typeof mensagem.token === 'string' ? mensagem.token : null,
          });
        }
        break;
      case 'portal': {
        // Alguém atravessou um portal (ou eu: a resposta ao meu soltar vem igual).
        const de = Array.isArray(mensagem.de) ? (mensagem.de as number[]) : null;
        atravessou(String(mensagem.token), Number(mensagem.x), Number(mensagem.y), de, String(mensagem.fluxo), mensagem.por === estadoRef.current?.usuario_id);
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
      case 'vista': {
        // Alguém trouxe a mesa para a vista dele. Só vale na mesma cena, e só para quem aceita (preferência do aparelho).
        if (!seguirVistaRef.current) break;
        if (typeof mensagem.cena === 'string' && estadoRef.current?.cena?.id !== mensagem.cena) break;
        const x = Number(mensagem.x);
        const y = Number(mensagem.y);
        const zoom = Number(mensagem.zoom);
        if (![x, y, zoom].every(Number.isFinite)) break;
        const vw = Number(mensagem.vw);
        const vh = Number(mensagem.vh);
        palco?.irParaVista({ x, y, zoom, ...(vw > 0 && vh > 0 ? { vw, vh } : {}) });
        avisar.info(`${String(mensagem.nome ?? 'Alguém')} trouxe todos para a vista dele.`);
        break;
      }
      case 'documento': {
        const bruto = mensagem.documento as Partial<IDocumentoCompartilhado> | null;
        if (bruto && typeof bruto.id === 'string' && typeof bruto.modelo === 'string'
          && typeof bruto.titulo === 'string' && bruto.campos && typeof bruto.campos === 'object') {
          setDocumentoMesa({ id: bruto.id, modelo: bruto.modelo, titulo: bruto.titulo, campos: bruto.campos });
        }
        break;
      }
      case 'trilha': {
        const bruto = mensagem.estado as Partial<ITrilhaMesa> | null;
        if (bruto && (bruto.faixa_id === null || typeof bruto.faixa_id === 'string')
          && typeof bruto.reproduzindo === 'boolean' && typeof bruto.posicao_ms === 'number'
          && typeof bruto.servidor_ms === 'number') {
          setTrilhaMesa(bruto as ITrilhaMesa);
        }
        break;
      }
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
  }, [agendarRecarga, atualizarPosicao, interpolador, ultimaAmostra, medidor, atravessou, avisarParede, registrarMovimentoDoTurno, corrigirMovimentoBarrado, usuarioId]);

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

  /** Soltar de verdade: pelo tempo real ou, na cena em preparo, pela rota. `atravessar`: aceitou o portal que pergunta. */
  const enviarSoltar = useCallback((id: string, x: number, y: number, atravessar?: string) => {
    const atual = estadoRef.current;
    if (!atual?.cena || !campanhaId) return;
    if (atual.cena.ativa && conexaoRef.current?.aberta) {
      conexaoRef.current.enviar({ t: 'soltar', token: id, x, y, ...(atravessar ? { atravessar } : {}), ...horaDoGesto() });
      return;
    }
    // Cena em preparo (só o Mestre vê) ou sem tempo real: grava pela rota.
    mapaApi.moverToken(campanhaId, id, { x, y, ...(atravessar ? { atravessar } : {}) }).then((resposta) => {
      if (resposta?.travessia?.cena) {
        agendarRecarga();
        avisar.info(estadoRef.current?.gestor
          ? `O token atravessou o portal e foi para a cena ${resposta.travessia.cena_nome ?? 'escolhida'}.`
          : 'Seu personagem atravessou o portal e foi para outro lugar.');
      } else if (resposta?.travessia) {
        atravessou(id, resposta.x, resposta.y, resposta.travessia.de, resposta.travessia.fluxo, true);
      } else if (resposta?.barrado) {
        atualizarPosicao(id, resposta.x, resposta.y);
        palcoRef.current?.moverToken(id, resposta.x, resposta.y);
        avisarParede();
      }
    }).catch((falha) => {
      setErro(falha instanceof Error ? falha.message : 'O token não foi salvo.');
      agendarRecarga();
    });
  }, [agendarRecarga, atravessou, atualizarPosicao, avisarParede, campanhaId, horaDoGesto]);

  const soltar = useCallback((id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!atual?.cena || !campanhaId) return;
    if (!atual.gestor && atual.permissoes_mesa?.mover_tokens === false) {
      const token = atual.tokens.find((item) => item.id === id);
      if (token) atualizarPosicao(id, token.x, token.y);
      return;
    }
    pendentesArrasto.delete(id);
    ultimaEnviada.delete(id);
    ultimoEnvio.delete(id);
    registrarMovimentoDoTurno(id, x, y);
    atualizarPosicao(id, x, y);
    enviarSoltar(id, x, y);
    // Portal que pede licença: o token fica na boca até a pessoa dizer que atravessa.
    const portal = portalQuePergunta(atual.cena.portais ?? [], x, y, atual.cena.grade.tamanho, atual.gestor);
    if (portal) {
      void confirmar({ titulo: `Atravessar ${portal.nome}?`, mensagem: 'O token vai para o outro lado do portal.', rotuloConfirmar: 'Atravessar' })
        .then((sim) => sim && enviarSoltar(id, x, y, portal.id));
    }
  }, [atualizarPosicao, campanhaId, enviarSoltar, ultimoEnvio, pendentesArrasto, ultimaEnviada, registrarMovimentoDoTurno]);

  /** A posição fica guardada e sai no ritmo do quadro: mesmo com a mão parada, a última chega aos outros. */
  const arrastar = useCallback((id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!atual?.cena?.ativa) return;
    if (!atual.gestor && atual.permissoes_mesa?.mover_tokens === false) return;
    pendentesArrasto.set(id, { x, y });
    enviarArrastos(performance.now());
  }, [pendentesArrasto, enviarArrastos]);

  const ultimaRegua = useRef(0);
  const regua = useCallback((pontos: IPonto[] | null) => {
    const atual = estadoRef.current;
    if (pontos && atual && !atual.gestor && atual.permissoes_mesa?.usar_regua === false) return;
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
    const atual = estadoRef.current;
    if (!atual?.cena?.ativa || (!atual.gestor && atual.permissoes_mesa?.usar_magia === false)) return;
    conexaoRef.current?.enviar({ t: 'magia', ...magia });
  }, []);

  /** A lista inteira de portais da cena vai para o servidor; `escolherNovo` marca o último (o que acabou de nascer). */
  const salvarPortais = useCallback(async (lista: IPortal[], escolherNovo = false) => {
    const cenaAtual = estadoRef.current?.cena;
    if (!campanhaId || !cenaAtual) return;
    try {
      const resposta = await mapaApi.mudarPortais(campanhaId, cenaAtual.id, lista);
      setEstado(resposta);
      const gravados = resposta.cena?.portais ?? [];
      if (escolherNovo) setPortalEscolhido(gravados[gravados.length - 1]?.id ?? null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'O portal não foi salvo.');
    } finally {
      palcoRef.current?.esquecerBocaArrastada();
    }
  }, [campanhaId]);

  const criarPortal = useCallback((a: IPonto, b: IPonto) => {
    const portais = estadoRef.current?.cena?.portais ?? [];
    void salvarPortais([...portais, portalNovo(a, b, portais.length + 1)], true);
  }, [salvarPortais]);

  const moverBoca = useCallback((id: string, lado: LadoPortal, ponto: IPonto) => {
    const portais = estadoRef.current?.cena?.portais ?? [];
    void salvarPortais(portais.map((portal) => (portal.id === id ? { ...portal, [lado]: ponto } : portal)));
  }, [salvarPortais]);

  const criarAnotacao = useCallback((ponto: IPonto) => {
    const cenaAtual = estadoRef.current?.cena;
    if (!cenaAtual) return;
    setSelecionado(null);
    setEditorAnotacao({ anotacao: anotacaoVazia(ponto), existente: false, cenaId: cenaAtual.id });
  }, []);

  const selecionarAnotacao = useCallback((id: string) => {
    const atual = estadoRef.current;
    if (!atual?.gestor || !atual.cena) return;
    const anotacao = atual.cena.anotacoes?.find((item) => item.id === id);
    if (anotacao) {
      setSelecionado(null);
      setEditorAnotacao({ anotacao, existente: true, cenaId: atual.cena.id });
    }
  }, []);

  const moverAnotacao = useCallback(async (id: string, x: number, y: number) => {
    const atual = estadoRef.current;
    if (!campanhaId || !atual?.gestor || !atual.cena) return;
    const anotacoes = (atual.cena.anotacoes ?? []).map((item) => item.id === id ? { ...item, x, y } : item);
    try {
      const resposta = await mapaApi.mudarAnotacoes(campanhaId, atual.cena.id, anotacoes);
      setEstado(resposta);
      setEditorAnotacao((aberto) => aberto?.anotacao.id === id ? { ...aberto, anotacao: { ...aberto.anotacao, x, y } } : aberto);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'A anotação não foi salva.');
      agendarRecarga();
    }
  }, [agendarRecarga, campanhaId]);

  /** Abrir, fechar, trancar ou revelar uma porta. O servidor confere quem pode. */
  const mudarPorta = useCallback(async (porta: IAberturaCena, dados: { estado?: IAberturaCena['estado']; revelar?: boolean }) => {
    const atual = estadoRef.current;
    if (!atual?.cena || !campanhaId) return;
    setPortaOcupada(true);
    try {
      const novo = await mapaApi.mudarPorta(campanhaId, atual.cena.id, { id: porta.id, ...dados });
      if (novo) setEstado(novo);
    } catch (falha) {
      const status = falha instanceof ApiError ? falha.status : 0;
      if (status === 403 && falha instanceof Error && falha.message.includes('sessao')) avisar.info('As portas abrem com a sessão ao vivo.');
      else if (status === 403) avisar.info('Chegue com seu personagem ao lado da porta para mexer nela.');
      else if (status === 409) avisar.info('A porta está trancada.');
      else if (status === 404) agendarRecarga();
      else avisar.erro('A porta não mudou. Tente de novo.');
    } finally {
      setPortaOcupada(false);
    }
  }, [agendarRecarga, campanhaId]);

  /** O relógio do servidor (para o cronômetro andar igual em todas as telas). */
  const relogioDaMesa = useCallback(() => medidor.horaDoServidor(agoraServidor()) ?? Date.now(), [medidor]);

  /** Pausa, relógios e cronômetro: só o que vier muda. */
  const mudarMesa = useCallback(async (dados: Partial<IMesaExtras>) => {
    if (!campanhaId) return;
    try {
      const mesa = await mapaApi.mudarMesa(campanhaId, dados);
      if (mesa) setEstado((atual) => (atual ? { ...atual, mesa } : atual));
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'A mesa não mudou. Tente de novo.');
    }
  }, [campanhaId]);

  /** A vista da tela do Mestre vira a vista inicial da cena (null: o mapa inteiro). */
  const guardarVista = useCallback(async (tirar = false) => {
    const atual = estadoRef.current;
    const vista = palcoRef.current?.vistaAtual();
    if (!campanhaId || !atual?.cena || (!tirar && !vista)) return;
    try {
      const novo = await mapaApi.guardarVista(campanhaId, atual.cena.id, tirar ? null : vista ?? null);
      if (novo) setEstado(novo);
      avisar.sucesso(tirar ? 'A cena volta a abrir com o mapa inteiro.' : 'Vista inicial guardada: quem abrir a cena começa por aqui.');
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'A vista não foi guardada.');
    }
  }, [campanhaId]);

  /** O Mestre fala como um token: a mesa conectada vê a fala com o retrato dele. */
  const falarComo = useCallback(async (token: { id: string; nome: string | null }) => {
    if (!campanhaId) return;
    const nome = token.nome || 'NPC';
    const texto = await pedirTexto({
      titulo: `Falar como ${nome}`,
      campo: { rotulo: 'O que ele diz', maximo: 400, placeholder: 'Quem ousa entrar na cripta?' },
      rotuloConfirmar: 'Falar',
    });
    if (!texto) return;
    try {
      await mapaApi.falar(campanhaId, { nome, texto, token: token.id });
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'A fala não chegou à mesa.');
    }
  }, [campanhaId]);

  /** Clique numa porta: o Mestre abre o menu dela; o jogador abre a fechada e fecha a aberta. */
  const clicarPorta = (porta: IAberturaCena) => {
    if (estadoRef.current?.gestor) {
      setPortaEscolhida(porta.id);
      return;
    }
    const pedido = cliqueDoJogador(porta);
    if (!pedido) {
      avisar.info('A porta está trancada.');
      return;
    }
    void mudarPorta(porta, { estado: pedido });
  };

  // O palco nasce uma vez; os gestos chegam sempre na versão mais nova das funções.
  const gestos = useRef({ arrastar, soltar, regua, desenharNevoa, marcarArea, enviarArrastos, lancarMagia, criarPortal, moverBoca, criarAnotacao, selecionarAnotacao, moverAnotacao, clicarPorta });
  gestos.current = { arrastar, soltar, regua, desenharNevoa, marcarArea, enviarArrastos, lancarMagia, criarPortal, moverBoca, criarAnotacao, selecionarAnotacao, moverAnotacao, clicarPorta };

  useEffect(() => {
    if (!alvoRef.current) return undefined;
    let vivo = true;
    let palco: PalcoMapa | null = null;
    void PalcoMapa.criar(alvoRef.current, {
      aoArrastar: (id, x, y) => gestos.current.arrastar(id, x, y),
      aoSoltar: (id, x, y) => gestos.current.soltar(id, x, y),
      aoSelecionar: setSelecionado,
      aoPing: (x, y) => {
        const atual = estadoRef.current;
        if (!atual || (!atual.gestor && atual.permissoes_mesa?.usar_ping === false)) return;
        conexaoRef.current?.enviar({ t: 'ping', x, y });
      },
      aoRegua: (pontos) => gestos.current.regua(pontos),
      aoNevoa: (forma) => gestos.current.desenharNevoa(forma),
      aoArea: (area) => gestos.current.marcarArea(area),
      aoMagia: (magia) => gestos.current.lancarMagia(magia),
      aoPortalNovo: (a, b) => gestos.current.criarPortal(a, b),
      aoSelecionarPortal: setPortalEscolhido,
      aoMoverPortal: (id, lado, ponto) => gestos.current.moverBoca(id, lado, ponto),
      aoCriarAnotacao: (ponto) => gestos.current.criarAnotacao(ponto),
      aoSelecionarAnotacao: (id) => gestos.current.selecionarAnotacao(id),
      aoMoverAnotacao: (id, x, y) => gestos.current.moverAnotacao(id, x, y),
      aoPorta: (porta) => gestos.current.clicarPorta(porta),
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
    if (!campanhaId) return;
    setCamadasLocais({ ...TODAS_CAMADAS_VISIVEIS });
    setCamadaAtiva('personagens');
    setCamadasAberto(false);
    setJogadoresAberto(false);
    setEditorAnotacao(null);
  }, [campanhaId]);

  useEffect(() => {
    setEditorAnotacao(null);
  }, [estado?.cena?.id]);

  useEffect(() => {
    const disponiveis = new Set(estado?.cena?.camadas_visiveis ?? IDS_CAMADAS);
    palcoRef.current?.definirCamadasVisiveis(IDS_CAMADAS.filter((id) => disponiveis.has(id) && camadasLocais[id]));
  }, [estado?.cena?.camadas_visiveis, camadasLocais, palcoPronto]);

  // Luz do dia: a hora do mundo (ou a fixa da cena). Ao trocar de cena ela vale na hora; depois muda devagar.
  const cenaDaLuz = useRef<string | null>(null);
  useEffect(() => {
    const palco = palcoRef.current;
    if (!palco || !palcoPronto) return;
    const cenaAtual = estado?.cena ?? null;
    const trocou = (cenaAtual?.id ?? null) !== cenaDaLuz.current;
    cenaDaLuz.current = cenaAtual?.id ?? null;
    palco.definirCeu(cenaAtual ? luzDaCena(cenaAtual.clima.ceu, estado?.tempo ?? null) : null, trocou);
  }, [estado, palcoPronto]);

  useEffect(() => {
    palcoRef.current?.selecionarPortal(portalEscolhido);
  }, [portalEscolhido, palcoPronto]);

  useEffect(() => {
    palcoRef.current?.definirFerramenta(ferramenta);
    if (ferramenta !== 'area') setMarcandoArea(false);
    // Com a ferramenta de portal, o menu do token sai da frente; fora dela, o painel do portal fecha.
    if (ferramenta === 'portal') setSelecionado(null);
    else setPortalEscolhido(null);
  }, [ferramenta, palcoPronto]);

  useEffect(() => {
    palcoRef.current?.definirPreferenciasBarras(preferenciasBarras);
  }, [preferenciasBarras, palcoPronto]);

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
    palcoRef.current?.definirEncaixe(encaixe);
    guardarOpcaoLocal(CHAVE_ENCAIXE_LOCAL, encaixe);
  }, [encaixe, palcoPronto]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_SEGUIR_VISTA_LOCAL, seguirVista);
  }, [seguirVista]);

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
  const permissoes = estado?.permissoes_mesa;
  const podeRegua = gestorAgora || permissoes?.usar_regua !== false;
  const podePing = gestorAgora || permissoes?.usar_ping !== false;
  const podeMagia = gestorAgora || permissoes?.usar_magia !== false;

  useEffect(() => {
    if ((ferramenta === 'regua' && !podeRegua) || (ferramenta === 'ping' && !podePing) || (ferramenta === 'magia' && !podeMagia)) {
      setFerramenta('mover');
    }
  }, [ferramenta, podeRegua, podePing, podeMagia]);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const alvo = evento.target as HTMLElement | null;
      if (alvo && ['INPUT', 'SELECT', 'TEXTAREA'].includes(alvo.tagName)) return;
      // O construtor de mapas tem os atalhos dele.
      if (construtorAberto) return;
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
      if ((evento.key === 'r' || evento.key === 'R') && podeRegua) setFerramenta('regua');
      if ((evento.key === 'p' || evento.key === 'P') && podePing) setFerramenta('ping');
      if ((evento.key === 'm' || evento.key === 'M') && podeMagia) setFerramenta('magia');
      if ((evento.key === 'n' || evento.key === 'N') && gestorAgora) setFerramenta('nevoa');
      if ((evento.key === 'o' || evento.key === 'O') && gestorAgora) setFerramenta('portal');
      if ((evento.key === 't' || evento.key === 'T') && gestorAgora) setFerramenta('texto');
      if (evento.key === 'Enter' && ferramenta === 'nevoa') palco?.fecharPoligono();
      if (evento.key === 'Escape') {
        if (palco?.desenhando) palco.cancelarDesenho();
        else if (ferramenta === 'portal' && portalEscolhido) setPortalEscolhido(null);
        else if (ferramenta === 'area' || ferramenta === 'nevoa' || ferramenta === 'portal' || ferramenta === 'texto') setFerramenta('mover');
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
  }, [ferramenta, gestorAgora, podeRegua, podePing, podeMagia, enviarNevoa, medidor, portalEscolhido, construtorAberto]);

  useEffect(() => {
    palcoRef.current?.pausar(construtorAberto);
  }, [construtorAberto, palcoPronto]);

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

  const alternarVisibilidadeJogadores = async (id: CamadaMapaId, visivel: boolean) => {
    if (!campanhaId || !cena || !gestor) return;
    const atual = { ...TODAS_CAMADAS_VISIVEIS, ...(cena.camadas_jogadores ?? {}) };
    atual[id] = visivel;
    const resposta = await comErro(() => mapaApi.mudarCamadas(campanhaId, cena.id, atual));
    if (resposta) setEstado(resposta);
  };

  const salvarAnotacao = async () => {
    if (!campanhaId || !cena || !editorAnotacao || editorAnotacao.cenaId !== cena.id) return;
    const anotacoes = cena.anotacoes ?? [];
    const proxima = editorAnotacao.existente
      ? anotacoes.map((item) => item.id === editorAnotacao.anotacao.id ? editorAnotacao.anotacao : item)
      : [...anotacoes, editorAnotacao.anotacao];
    const resposta = await comErro(() => mapaApi.mudarAnotacoes(campanhaId, cena.id, proxima));
    if (resposta) {
      setEstado(resposta);
      setEditorAnotacao(null);
    }
  };

  const apagarAnotacao = async () => {
    if (!campanhaId || !cena || !editorAnotacao?.existente || editorAnotacao.cenaId !== cena.id) return;
    const proxima = (cena.anotacoes ?? []).filter((item) => item.id !== editorAnotacao.anotacao.id);
    const resposta = await comErro(() => mapaApi.mudarAnotacoes(campanhaId, cena.id, proxima));
    if (resposta) {
      setEstado(resposta);
      setEditorAnotacao(null);
    }
  };

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
  /** O painel da grade lê a vista da tela por aqui; mantida estável para não reiniciar o relógio dele. */
  const lerVistaDaTela = useCallback(() => palcoRef.current?.vistaAtual() ?? null, []);

  /** "Trazer todos para a minha vista": a mesa conectada anima até onde esta tela está olhando. */
  const sincronizarVista = () => {
    const vista = palcoRef.current?.areaVisivel();
    if (!vista) return;
    conexaoRef.current?.enviar({ t: 'vista', ...vista });
    avisar.info('Todos foram levados para a sua vista.');
  };

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
    const camada = (['props', 'montarias', 'personagens'] as CamadaTokenId[]).includes(camadaAtiva as CamadaTokenId)
      ? camadaAtiva as CamadaTokenId
      : 'props';
    const resposta = await comErro(() => mapaApi.criarToken(campanhaId, cena.id, { imagem_id: item.id, nome: item.nome, x, y, camada }));
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

  /** O calendário da campanha mudou pelo painel Tempo; o mapa recebe a hora nova pelo tempo real. */
  const mexerNoTempo = async (acao: (id: string) => Promise<unknown>) => {
    if (!campanhaId) return;
    setTempoOcupado(true);
    try {
      await acao(campanhaId);
      if (!conexaoRef.current?.aberta) void recarregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'A hora não mudou.');
    } finally {
      setTempoOcupado(false);
    }
  };

  const salvarCeu = (ceu: ICeu) => {
    if (!campanhaId || !cena) return;
    void comErro(() => mapaApi.mudarClima(campanhaId, cena.id, { ...cena.clima, ceu })).then((r) => r && setEstado(r));
  };

  const pedirArea = (aplicar: (area: IAreaClima) => void) => {
    aplicarArea.current = aplicar;
    setMarcandoArea(true);
    setFerramenta('area');
  };

  const alternarTelaCheia = () => {
    // O navegador pode recusar (iframe sem permissão, Safari do celular): sem erro solto na página.
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void document.documentElement.requestFullscreen?.()?.catch(() => undefined);
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
  const chaveMovimentoTurno = emCombate && sessaoId && turnoAtualId ? `${sessaoId}:${rodada}:${turnoAtualId}` : '';
  const metrosAndados = movimentoAtual.chave === chaveMovimentoTurno
    ? Object.values(movimentoAtual.porToken).reduce((total, metros) => total + metros, 0)
    : 0;
  const tokenOrigemDistancia = tokenSelecionado
    ?? tokens.find((token) => token.participante_id === turnoAtualId)
    ?? meuToken;
  const distanciaEmMetros = (primeiro: ITokenMapa, segundo: ITokenMapa) => {
    const grade = estado?.cena?.grade;
    if (!grade) return null;
    return casasDoTrecho(primeiro, segundo, grade) * grade.metros;
  };
  const tokenVisivelDaVez = Boolean(gestor || tokens.some((token) => token.participante_id === turnoAtualId
    || (personagemDaVez && token.personagem_id === personagemDaVez)));
  const tempo = estado?.tempo ?? null;
  // O relógio aparece para o Mestre e, para o jogador, quando a campanha usa o calendário ou a cena segue a hora.
  const mostrarTempo = Boolean(tempo && (gestor || tempo.em_uso || (cena?.clima.ceu?.modo ?? 'nenhum') !== 'nenhum'));
  const periodoAgora = tempo ? periodoDaHora(tempo.minuto) : null;
  const IconeTempo = periodoAgora ? ICONE_DO_PERIODO[periodoAgora.chave] : Clock3;
  const portalDoPainel = gestor && ferramenta === 'portal' ? cena?.portais.find((p) => p.id === portalEscolhido) ?? null : null;
  const portaDoMenu = gestor && portaEscolhida ? cena?.aberturas?.find((a) => a.id === portaEscolhida) ?? null : null;

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
        {mostrarTempo && tempo && periodoAgora && (
          <ComDica dica={`${tempo.data?.extenso ?? 'Hora do mundo'} · ${nomeDaLua(tempo.lua, tempo.lua_carmesim)}${gestor ? '. Clique para mudar a hora.' : ''}`}>
            {gestor ? (
              <button
                type="button"
                className={`mapa-tempo periodo-${periodoAgora.chave}${tempoAberto ? ' ativo' : ''}`}
                aria-label="Tempo do mundo"
                onClick={() => {
                  setTempoAberto((v) => !v);
                  setClimaAberto(false);
                  setConfigAberta(false);
                }}
              >
                <IconeTempo size={14} /> <strong>{tempo.hora_extenso}</strong> <span>{periodoAgora.rotulo}</span>
              </button>
            ) : (
              <span className={`mapa-tempo periodo-${periodoAgora.chave}`}>
                <IconeTempo size={14} /> <strong>{tempo.hora_extenso}</strong> <span>{periodoAgora.rotulo}</span>
              </span>
            )}
          </ComDica>
        )}
        {emCombate && (
          <div className="mapa-combate" aria-live="polite">
            <Swords size={14} />
            <span>Rodada <strong>{rodada}</strong></span>
            {nomeDaVez && <span className="mapa-combate-vez">Vez de <strong>{nomeDaVez}</strong></span>}
            {nomeDaVez && tokenVisivelDaVez && <span className="mapa-movimento-turno">Movimento <strong>{metrosAndados.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} {rotuloUnidade(cena?.grade.unidade)}</strong></span>}
          </div>
        )}
        <div className="mapa-pessoas" aria-label="Quem está no mapa">
          {pessoas.map((p) => (
            <ComDica key={p.usuario_id} dica={`${p.nome}${p.gestor ? ' (Mestre)' : ''}`}>
              <span className="mapa-pessoa" style={{ borderColor: p.cor, color: p.cor }}>{p.nome.slice(0, 1).toUpperCase()}</span>
            </ComDica>
          ))}
        </div>
        <ComDica dica="Buscar tokens, personagens e objetos visíveis neste mapa">
          <button type="button" className={`mapa-icone${painelRecurso === 'busca' ? ' ativo' : ''}`} aria-label="Buscar no mapa" onClick={() => setPainelRecurso((atual) => atual === 'busca' ? null : 'busca')}><Search size={17} /></button>
        </ComDica>
        <ComDica dica="Trilha de áudio sincronizada">
          <button type="button" className={`mapa-icone${painelRecurso === 'trilha' ? ' ativo' : ''}`} aria-label="Trilha da cena" onClick={() => setPainelRecurso((atual) => atual === 'trilha' ? null : 'trilha')}><Music2 size={17} /></button>
        </ComDica>
        {gestor && <ComDica dica="Mostrar documentos do Mestre na mesa">
          <button type="button" className={`mapa-icone${painelRecurso === 'documentos' ? ' ativo' : ''}`} aria-label="Mostrar documento na mesa" onClick={() => setPainelRecurso((atual) => atual === 'documentos' ? null : 'documentos')}><BookOpenCheck size={17} /></button>
        </ComDica>}
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
        <BotaoFerramenta icone={Ruler} rotulo="Régua" atalho="R" disabled={!podeRegua} ativo={ferramenta === 'regua'} onClick={() => setFerramenta('regua')} />
        <BotaoFerramenta icone={MapPin} rotulo="Ping (ou Alt + clique)" atalho="P" disabled={!podePing} ativo={ferramenta === 'ping'} onClick={() => setFerramenta('ping')} />
        <BotaoFerramenta icone={Sparkles} rotulo="Efeito de magia" atalho="M" disabled={!cena || !podeMagia} ativo={ferramenta === 'magia'} onClick={() => setFerramenta((f) => (f === 'magia' ? 'mover' : 'magia'))} />
        <span className="mapa-separador" />
        <span className="mapa-grupo-rotulo">Vista</span>
        <BotaoFerramenta icone={Expand} rotulo="Ver o mapa inteiro" disabled={!cena} onClick={() => palcoRef.current?.enquadrar()} />
        <BotaoFerramenta
          icone={SlidersHorizontal}
          rotulo="Aparência das barras neste aparelho"
          ativo={barrasAberto}
          onClick={() => setBarrasAberto((aberto) => !aberto)}
        />
        <BotaoFerramenta
          icone={Layers}
          rotulo="Camadas do mapa"
          ativo={camadasAberto}
          disabled={!cena}
          onClick={() => {
            setJogadoresAberto(false);
            setGradeAberta(false);
            setCamadasAberto((aberto) => !aberto);
          }}
        />
        <BotaoFerramenta
          icone={Grid3x3}
          rotulo="Grade, medidas e vista"
          ativo={gradeAberta}
          disabled={!cena}
          onClick={() => {
            setCamadasAberto(false);
            setJogadoresAberto(false);
            setConfigAberta(false);
            setClimaAberto(false);
            setTempoAberto(false);
            setGradeAberta((aberta) => !aberta);
          }}
        />
        <BotaoFerramenta
          icone={Users}
          rotulo="Jogadores e permissões"
          ativo={jogadoresAberto}
          disabled={!campanhaId}
          onClick={() => {
            setGradeAberta(false);
            setCamadasAberto(false);
            setEditorAnotacao(null);
            setJogadoresAberto((aberto) => !aberto);
          }}
        />
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
            <BotaoFerramenta icone={Type} rotulo="Escrever no mapa" atalho="T" disabled={!cena} ativo={ferramenta === 'texto'} onClick={() => setFerramenta((f) => (f === 'texto' ? 'mover' : 'texto'))} />
            <BotaoFerramenta icone={Eye} rotulo="Névoa de guerra" atalho="N" disabled={!cena} ativo={ferramenta === 'nevoa'} onClick={() => setFerramenta((f) => (f === 'nevoa' ? 'mover' : 'nevoa'))} />
            <BotaoFerramenta
              icone={CloudRain}
              rotulo="Clima da cena"
              disabled={!cena}
              ativo={climaAberto}
              onClick={() => {
                setClimaAberto((v) => !v);
                setConfigAberta(false);
                setTempoAberto(false);
              }}
            />
            <BotaoFerramenta icone={Orbit} rotulo="Portais" atalho="O" disabled={!cena} ativo={ferramenta === 'portal'} onClick={() => setFerramenta((f) => (f === 'portal' ? 'mover' : 'portal'))} />
            <BotaoFerramenta icone={Hourglass} rotulo="Mesa: pausa, relógios, cronômetro e vista inicial" ativo={mesaAberta} disabled={!estado?.mesa} onClick={() => setMesaAberta((v) => !v)} />
            <BotaoFerramenta
              icone={Clock3}
              rotulo="Tempo do mundo e luz da cena"
              ativo={tempoAberto}
              disabled={!tempo}
              onClick={() => {
                setTempoAberto((v) => !v);
                setClimaAberto(false);
                setConfigAberta(false);
              }}
            />
            <BotaoFerramenta icone={Users} rotulo="Trazer os participantes da Sessão" disabled={!cena} onClick={() => void trazerParticipantes()} />
            <BotaoFerramenta icone={FolderOpen} rotulo="Acervo de mapas e tokens" ativo={acervoAberto} onClick={() => setAcervoAberto((v) => !v)} />
            <BotaoFerramenta icone={DraftingCompass} rotulo="Construtor de mapas" ativo={construtorAberto} onClick={() => setConstrutorAberto(true)} />
            <BotaoFerramenta icone={Wand2} rotulo="Oficina: token novo, fundo e qualidade" ativo={oficinaAberta} onClick={() => setOficinaAberta((v) => !v)} />
          </>
        )}
      </nav>

      <main className="mapa-area">
        <div ref={alvoRef} className="mapa-palco" />
        {estado?.mesa && (
          <RelogiosDaMesa
            mesa={estado.mesa}
            gestor={gestor}
            relogio={relogioDaMesa}
            onRelogio={(id, cheias) => void mudarMesa({ relogios: estado.mesa!.relogios.map((r) => (r.id === id ? { ...r, cheias } : r)) })}
          />
        )}
        {estado?.mesa && <PausaDaMesa mesa={estado.mesa} gestor={gestor} onRetomar={() => void mudarMesa({ pausa: { ...estado.mesa!.pausa, ligada: false } })} />}
        {fala && (() => {
          const quem = tokens.find((t) => t.id === fala.token);
          const retrato = quem?.imagem && campanhaId ? urlImagemDoToken(campanhaId, quem.id, quem.imagem) : null;
          return <FalaNaMesa fala={fala} retrato={retrato} onFechar={() => setFala(null)} />;
        })()}
        {gestor && mesaAberta && estado?.mesa && (
          <PainelMesa
            mesa={estado.mesa}
            relogio={relogioDaMesa}
            temVista={Boolean(cena?.vista)}
            onMudar={(dados) => void mudarMesa(dados)}
            onGuardarVista={() => void guardarVista()}
            onTirarVista={() => void guardarVista(true)}
            onFechar={() => setMesaAberta(false)}
          />
        )}
        <audio
          ref={audioMesaRef}
          src={campanhaId && trilhaMesa?.faixa_id ? mapaRecursosApi.audioUrl(campanhaId, trilhaMesa.faixa_id) : undefined}
          preload="auto"
          aria-label="Trilha sincronizada da mesa"
          onError={() => setAudioPrecisaAtivar(true)}
          onEnded={() => {
            // Acabou: a faixa volta ao começo e para. O Mestre grava isso para a mesa; o
            // jogador para na própria tela (o recado do Mestre chega logo depois).
            if (!trilhaMesa) return;
            if (gestor) void controlarTrilha(false, trilhaMesa, 0);
            else setTrilhaMesa({ ...trilhaMesa, reproduzindo: false, posicao_ms: 0 });
          }}
        />
        {audioPrecisaAtivar && trilhaMesa?.reproduzindo && (
          <button type="button" className="mapa-audio-ativar" onClick={ativarAudioDaMesa}><Music2 size={15} /> Ativar áudio da mesa</button>
        )}
        {painelRecurso === 'busca' && (
          <section className="mapa-recurso-painel mapa-busca-painel" aria-label="Buscar no mapa">
            <header><strong>Buscar no mapa</strong><button type="button" className="mapa-icone" aria-label="Fechar busca" onClick={() => setPainelRecurso(null)}><X size={16} /></button></header>
            <input autoFocus value={buscaMapa} maxLength={80} placeholder="Nome de personagem ou objeto" onChange={(evento) => setBuscaMapa(evento.target.value)} />
            <ul className="mapa-busca-resultados">
              {tokens.filter((token) => token.nome.toLocaleLowerCase('pt-BR').includes(buscaMapa.trim().toLocaleLowerCase('pt-BR')))
                .slice(0, 40)
                .map((token) => <li key={token.id}><button type="button" onClick={() => { centralizar(token); setPainelRecurso(null); }}>
                  <span>{token.nome}</span><small>{token.camada === 'props' ? 'Item ou prop' : token.camada === 'montarias' ? 'Montaria' : 'Personagem ou token'}{tokenOrigemDistancia && token.id !== tokenOrigemDistancia.id ? ` · ${distanciaEmMetros(tokenOrigemDistancia, token)?.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) ?? '—'} ${rotuloUnidade(cena?.grade.unidade)}` : ''}</small>
                </button></li>)}
            </ul>
            {!tokens.some((token) => token.nome.toLocaleLowerCase('pt-BR').includes(buscaMapa.trim().toLocaleLowerCase('pt-BR'))) && <p className="mapa-dica">Nenhum resultado entre os itens que você pode ver.</p>}
          </section>
        )}
        {gestor && campanhaId && <PainelDocumentosMesa
          aberto={painelRecurso === 'documentos'}
          campanhaId={campanhaId}
          jogadores={iniciativa.filter((entidade) => entidade.tipo === 'jogador' && entidade.personagemId).map((entidade) => ({ personagemId: entidade.personagemId!, nome: entidade.nome }))}
          onFechar={() => setPainelRecurso(null)}
        />}
        {campanhaId && <PainelTrilha
          aberto={painelRecurso === 'trilha'}
          campanhaId={campanhaId}
          gestor={gestor}
          estado={trilhaMesa}
          onEstado={setTrilhaMesa}
          onTocar={controlarTrilha}
          onFechar={() => setPainelRecurso(null)}
        />}
        {documentoMesa && <DocumentoDaMesa documento={documentoMesa} onFechar={() => setDocumentoMesa(null)} />}
        {!estado && !erro && <div className="mapa-aviso"><Loader2 className="girando" size={20} /> Abrindo o mapa...</div>}
        {!estado && erro && (
          <div className="mapa-aviso mapa-aviso-erro">
            <span>Não deu para abrir o mapa agora: {erro} Tentando de novo sozinho.</span>
            {erroDetalhe && <small>{erroDetalhe}</small>}
            <button type="button" className="mapa-botao" onClick={() => void recarregar()}>Tentar agora</button>
          </div>
        )}
        {aviso && <div className="mapa-aviso">{aviso}</div>}
        {gestor && cena && ferramenta === 'nevoa' && (
          <BarraNevoa
            ligada={cena.nevoa.ligada}
            visaoPelasParedes={Boolean(cena.nevoa.visao_pelas_paredes)}
            naMesa={cena.ativa && Boolean(estado?.ao_vivo)}
            opcoes={opcoesNevoa}
            tamanhoCasa={tamanhoCasa}
            temFormas={cena.nevoa.formas.length > 0}
            onLigar={(ligada) => void enviarNevoa({ ligada })}
            onVisaoPelasParedes={(visao_pelas_paredes) => void enviarNevoa({ visao_pelas_paredes })}
            onOpcoes={setOpcoesNevoa}
            onDesfazer={() => void enviarNevoa({ desfazer: true })}
            onRevelarTudo={() => void enviarNevoa({ revelar_tudo: true })}
            onCobrirTudo={async () => {
              if (await confirmar({ mensagem: 'Cobrir o mapa inteiro de novo? As áreas reveladas voltam a ficar escondidas.', rotuloConfirmar: 'Cobrir' })) void enviarNevoa({ cobrir_tudo: true });
            }}
          />
        )}
        {medidorAberto && <MedidorPainel medidor={medidor} interpolador={interpolador} onFechar={() => setMedidorAberto(false)} />}
        {cena && podeMagia && ferramenta === 'magia' && (
          <BarraMagia opcoes={opcoesMagia} naMesa={cena.ativa && Boolean(estado?.ao_vivo)} onOpcoes={setOpcoesMagia} />
        )}
        {gestor && cena && ferramenta === 'area' && (
          <div className="mapa-aviso-topo">Arraste no mapa a área do efeito. Esc cancela.</div>
        )}
        {gestor && cena && ferramenta === 'portal' && !portalDoPainel && (
          <div className="mapa-aviso-topo">Clique onde fica a entrada e depois a saída. Arraste uma boca para mudar de lugar. Esc sai.</div>
        )}
        {gestor && cena && ferramenta === 'texto' && (
          <div className="mapa-aviso-topo">Clique no mapa para colocar uma anotação. Arraste uma anotação para movê-la.</div>
        )}
        <PainelCamadas
          aberto={camadasAberto}
          gestor={gestor}
          cena={cena}
          locais={camadasLocais}
          ativa={camadaAtiva}
          onAlternarLocal={(id) => setCamadasLocais((atual) => ({ ...atual, [id]: !atual[id] }))}
          onAlternarJogadores={(id, visivel) => void alternarVisibilidadeJogadores(id, visivel)}
          onAtivar={(id) => setCamadaAtiva(id)}
          onFechar={() => setCamadasAberto(false)}
        />
        <PainelGrade
          aberto={gradeAberta}
          gestor={gestor}
          cena={cena}
          encaixe={encaixe}
          onEncaixe={setEncaixe}
          seguirVista={seguirVista}
          onSeguirVista={setSeguirVista}
          lerVista={lerVistaDaTela}
          onIrParaVista={(vista) => palcoRef.current?.irParaVista(vista, false)}
          onReiniciarVista={() => palcoRef.current?.abrirNaVista()}
          podeSincronizar={conexao === 'ws' || conexao === 'sse'}
          onSincronizar={sincronizarVista}
          onPrever={(grade) => palcoRef.current?.previaGrade(grade)}
          onSalvarGrade={(grade) => cena && campanhaId && void comErro(() => mapaApi.editarCena(campanhaId, cena.id, { grade })).then((r) => r && setEstado(r))}
          onFechar={() => setGradeAberta(false)}
        />
        <PainelJogadores
          aberto={jogadoresAberto}
          campanhaId={campanhaId ?? ''}
          usuarioId={usuarioId}
          gestor={gestor}
          online={pessoas}
          onFechar={() => setJogadoresAberto(false)}
        />
        {editorAnotacao && (
          <EditorAnotacao
            anotacao={editorAnotacao.anotacao}
            existente={editorAnotacao.existente}
            onMudar={(anotacao) => setEditorAnotacao((atual) => atual ? { ...atual, anotacao } : atual)}
            onSalvar={() => void salvarAnotacao()}
            onApagar={() => void apagarAnotacao()}
            onFechar={() => setEditorAnotacao(null)}
          />
        )}
        {portalDoPainel && (
          <PainelPortal
            campanhaId={campanhaId ?? ''}
            outrasCenas={(estado?.cenas ?? []).filter((outra) => outra.id !== cena?.id)}
            portal={portalDoPainel}
            onMudar={(novo) => void salvarPortais((cena?.portais ?? []).map((p) => (p.id === novo.id ? novo : p)))}
            onApagar={async () => {
              if (!(await confirmar({ mensagem: `Apagar o portal "${portalDoPainel.nome}"?`, rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
              setPortalEscolhido(null);
              void salvarPortais((cena?.portais ?? []).filter((p) => p.id !== portalDoPainel.id));
            }}
            onIrPara={(lado) => {
              const boca = portalDoPainel[lado];
              if (boca) palcoRef.current?.centralizar(boca.x, boca.y);
            }}
            onFechar={() => setPortalEscolhido(null)}
          />
        )}
        {portaDoMenu && (
          <MenuPorta
            porta={portaDoMenu}
            ocupado={portaOcupada}
            onMudar={(dados) => void mudarPorta(portaDoMenu, dados)}
            onFechar={() => setPortaEscolhida(null)}
          />
        )}
        {tempoAberto && gestor && tempo && (
          <PainelTempo
            tempo={tempo}
            ceu={cena?.clima.ceu ?? null}
            ocupado={tempoOcupado}
            onAvancar={(minutos) => void mexerNoTempo((id) => calendarioMundoApi.avancarTempo(id, minutos))}
            onDesfazer={() => void mexerNoTempo((id) => calendarioMundoApi.desfazer(id))}
            onCeu={salvarCeu}
            onPreviaCeu={(ceu) => palcoRef.current?.definirCeu(luzDaCena(ceu, tempo))}
            onFechar={() => setTempoAberto(false)}
          />
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
            onFalar={() => void falarComo(tokenSelecionado)}
          />
        )}
        <PreferenciasBarras
          aberto={barrasAberto}
          preferencias={preferenciasBarras}
          onMudar={mudarPreferenciasBarras}
          onFechar={() => setBarrasAberto(false)}
        />
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
        {gestor && campanhaId && construtorAberto && (
          <ConstrutorMapa
            campanhaId={campanhaId}
            cenaAtual={cena ? { id: cena.id, nome: cena.nome } : null}
            onPublicado={(novo) => {
              setConstrutorAberto(false);
              setEstado(novo);
              if (novo.cena) setCenaVista(novo.cena.id);
            }}
            onFechar={() => setConstrutorAberto(false)}
          />
        )}
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
              setGradeAberta(false);
            }}
          />
        </footer>
      )}
    </div>
  );
};

export default MapaPage;
