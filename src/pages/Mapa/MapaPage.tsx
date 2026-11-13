// Mapa ao vivo: tela cheia pensada para PC. O mapa ocupa tudo; ferramentas à
// esquerda, painel recolhível à direita (iniciativa, ficha, rolagens) e, para o
// Mestre, a faixa de cenas embaixo e o Acervo. Ver docs/propostas/mapa-ao-vivo.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, BookOpenCheck, Clock3, Cloud, CloudOff, CloudRain, Crosshair, DraftingCompass, Expand, Eye, Focus, Grid3x3, Hand, Layers, Loader2, MapPin, Maximize2, Minimize2, Monitor, Moon, Music2, Orbit, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Ruler, Search, SlidersHorizontal, Sparkles, Sun, Sunrise, Sunset, Swords, Type, UserPlus, UserRound, Users, Wand2, Wifi, WifiOff,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useSessaoStore } from '../../store/useSessaoStore';
import { assinarEventosDaCampanha } from '../../services/campanhaEventos';
import { mapaApi, type AcaoOrdemMapa, type CamadaMapaId, type CamadaTokenId, type IAnotacaoMapa, type IAreaClima, type ICeu, type IClima, type IEstadoMapa, type IFormaNevoa, type IMagiaMapa, type IMapaColocadoEdicao, type INevoaPayload, type IPortal, type ITokenEdicao, type ITokenMapa } from '../../services/mapaApi';
import { calendarioMundoApi } from '../../services/calendarioMundoApi';
import type { IItemAcervo } from '../../services/acervoApi';
import { confirmar, pedirTexto } from '../../components/avisos/confirmacao';
import { avisar, dispensarAviso } from '../../components/avisos/avisos';
import { PalcoMapa, type Ferramenta, type OpcoesMagia, type OpcoesNevoa } from './motor/palco';
import { casasDoTrecho, encaixar, rotuloUnidade, type IPonto } from './motor/geometria';
import { ConexaoMapa, Interpolador, type EstadoConexao, type MensagemMapa } from './tempoReal';
import { PainelLateral, tokenDaEntidade, type AbaLateral } from './componentes/PainelLateral';
import { BotaoFerramenta, ComDica } from './componentes/BotaoFerramenta';
import { MenuToken, type Aba as AbaDoMenuToken } from './componentes/MenuToken';
import { JanelaRecipiente } from './componentes/JanelaRecipiente';
import type { AcoesDeEstado } from './componentes/EstadosDoToken';
import { sessaoApi } from '../../services/sessaoApi';
import { BarraToken } from './componentes/BarraToken';
import { BarraAncorada } from './componentes/BarraAncorada';
import { ConfigCena, SeletorDeCenas } from './componentes/CenasDoMestre';
import { MenuMais, type GrupoDoMenu, type ItemDoMenu } from './componentes/MenuMais';
import { FolhaDeAtalhos } from './componentes/FolhaDeAtalhos';
import { PaletaDeComandos, type ComandoDoMapa } from './componentes/PaletaDeComandos';
import { AvisoDaVez, HudDoJogador, meuTokenDaVez } from './componentes/HudDoJogador';
import { BandejaDeDados } from './componentes/BandejaDeDados';
import { MovimentoDoTurno } from './componentes/MovimentoDoTurno';
import { alcanceDoToken, chaveDoMovimento, comMovimento, contornoDoAlcance, lerMovimentos, metrosRestantes, movimentoDaFicha, movimentoPadrao, salvarMovimentos } from './motor/alcanceConta';
import { MenuDeContexto } from './componentes/MenuDeContexto';
import { useInterfaceOciosa } from './componentes/interfaceOciosa';
import { ChevronsRight, EyeOff, MessageSquare, MoonStar, Trash2 } from 'lucide-react';
import { GuidedTour } from '../../components/ui/GuidedTour';
import { guiasAutomaticosLigados } from '../../utils/guias';
import { mapaTourJaVisto, obterPassosTourMapa, serializarMapaTourVisto } from './mapaTourConfig';
import { Compass, Footprints, Video } from 'lucide-react';
import { Dices } from 'lucide-react';
import { ChevronLeft, ChevronRight, Clapperboard, Command, FolderOpen, Hammer, ScrollText, Settings2, Tags, UsersRound } from 'lucide-react';
import { FatiadorFolha } from './fatiador/FatiadorFolha';
import { AcervoGaveta } from './acervo/AcervoGaveta';
import { OficinaGaveta } from './oficina/OficinaGaveta';
import { BarraNevoa } from './componentes/BarraNevoa';
import { BarraMagia } from './componentes/BarraMagia';
import { PainelClima } from './componentes/PainelClima';
import { PainelTempo } from './componentes/PainelTempo';
import { PainelPortal } from './componentes/PainelPortal';
import { MenuPorta } from './componentes/MenuPorta';
import { FalaNaMesa, PainelMesa, PausaDaMesa, RelogiosDaMesa, type FalaRecebida } from './componentes/MesaExtras';
import { Hourglass, Keyboard, LocateFixed, Scissors } from 'lucide-react';
import { urlImagemDoToken, type IMesaExtras, type TipoBarra } from '../../services/mapaApi';
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
import { PainelVista } from './componentes/PainelVista';
import { PainelGrade } from './componentes/PainelGrade';
import { BarraMapaColocado } from './componentes/BarraMapaColocado';
import { DockAcervo } from './componentes/DockAcervo';
import { arrastaArquivos, enviarImagens, imagensParaEnviar, perguntarTipoDaImagem, textoDoAndamento, textoDoResultado } from './componentes/envioParaOAcervo';
import { MIME_ACERVO, lerItemArrastado, type ItemParaCena } from './componentes/dockAcervoConta';
import { EditorAnotacao } from './componentes/EditorAnotacao';
import { PainelJogadores } from './componentes/PainelJogadores';
import type { Enquadramento } from './motor/molduras';
import { lerPreferenciasBarras, normalizarPreferenciasBarras, salvarPreferenciasBarras, type IPreferenciasBarrasMapa } from './motor/barrasToken';
import { mapaRecursosApi, type ITrilhaMesa } from '../../services/mapaRecursosApi';
import { PainelDocumentosMesa } from './componentes/PainelDocumentosMesa';
import { DocumentoDaMesa, type IDocumentoCompartilhado } from './componentes/DocumentoDaMesa';
import { PainelTrilha } from './componentes/PainelTrilha';
import './mapa.css';
import './painelDobravel.css';
import './navegacao.css';

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
/** Começa desligada: o token anda livre, sem a linha de medida atrás dele. */
const CHAVE_MEDIR_AO_MOVER_LOCAL = 'jardim.mapa.medirAoMover';
/** Painéis que o aparelho esconde: a barra de ferramentas da esquerda e o painel de iniciativa e fichas. */
const CHAVE_FERRAMENTAS_LOCAL = 'jardim.mapa.ferramentas';
const CHAVE_LATERAL_LOCAL = 'jardim.mapa.lateral';
/** Nome escrito embaixo de cada botão da barra da esquerda (começa ligado: orienta quem chega). */
const CHAVE_NOMES_BARRA_LOCAL = 'jardim.mapa.nomesNaBarra';
/** A câmera vai até o token de quem age quando a vez muda (começa desligada: a tela só anda se a pessoa pedir). */
const CHAVE_SEGUIR_VEZ_LOCAL = 'jardim.mapa.seguirVez';
/** O contorno de até onde o token da vez ainda anda (começa ligado). */
const CHAVE_ALCANCE_LOCAL = 'jardim.mapa.alcance';
/** Modo imersivo: a interface some depois de uns segundos sem mexer (começa desligado). */
const CHAVE_IMERSIVO_LOCAL = 'jardim.mapa.imersivo';

function lerOpcaoLocal(chave: string, padrao = true): boolean {
  try {
    const guardada = window.localStorage.getItem(chave);
    if (guardada === null) return padrao;
    return guardada !== 'desligado';
  } catch {
    return padrao;
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
  // O painel da direita lembra o que cada aparelho escolheu; sem escolha, abre só em tela larga.
  const [lateralAberta, setLateralAberta] = useState(() => {
    try {
      const salvo = window.localStorage.getItem(CHAVE_LATERAL_LOCAL);
      if (salvo) return salvo === 'ligado';
    } catch {
      // Sem armazenamento do navegador: vale a largura da tela.
    }
    return typeof window === 'undefined' || window.innerWidth > 760;
  });
  const [ferramentasAbertas, setFerramentasAbertas] = useState(() => lerOpcaoLocal(CHAVE_FERRAMENTAS_LOCAL));
  /** Só o mapa: some a interface toda (topo, ferramentas, painel e cenas); um botão e a tecla H trazem de volta. */
  const [soMapa, setSoMapa] = useState(false);
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
  const [vistaAberta, setVistaAberta] = useState(false);
  /** Sobe quando a página põe imagens no Acervo (arquivo solto no mapa): a barra de baixo pede a lista de novo. */
  const [versaoAcervo, setVersaoAcervo] = useState(0);
  /** A folha de atalhos (tecla ? ou menu Exibição). */
  const [atalhosAbertos, setAtalhosAbertos] = useState(false);
  /** A central de comandos (Ctrl+K, a barra / ou a busca do topo): tudo o que dá para fazer no mapa, numa busca só. */
  const [paletaAberta, setPaletaAberta] = useState(false);
  /** A bandeja de dados (tecla D): rolar sem sair do mapa. */
  const [dadosAbertos, setDadosAbertos] = useState(false);
  const [seguirVez, setSeguirVez] = useState(() => lerOpcaoLocal(CHAVE_SEGUIR_VEZ_LOCAL, false));
  const [alcanceLigado, setAlcanceLigado] = useState(() => lerOpcaoLocal(CHAVE_ALCANCE_LOCAL));
  const [imersivo, setImersivo] = useState(() => lerOpcaoLocal(CHAVE_IMERSIVO_LOCAL, false));
  const interfaceOciosa = useInterfaceOciosa(imersivo);
  /** O menu do botão direito: onde abriu na janela, o ponto no mapa e o token que estava ali. */
  const [contexto, setContexto] = useState<{ x: number; y: number; ponto: IPonto; tokenId: string | null } | null>(null);
  /** Quanto cada personagem anda por turno, ajustado neste aparelho (a ficha não manda esse número ao mapa). */
  const [movimentos, setMovimentos] = useState(lerMovimentos);
  /** O guia do mapa: abre sozinho na primeira visita e pelo menu Exibição. */
  const [tourAberto, setTourAberto] = useState(false);
  const tourTentado = useRef(false);
  /** O último token da vez que a câmera seguiu (indefinido até a primeira vez vista, que não move a tela). */
  const vezSeguida = useRef<string | null | undefined>(undefined);
  const [nomesNaBarra, setNomesNaBarra] = useState(() => lerOpcaoLocal(CHAVE_NOMES_BARRA_LOCAL));
  const comandaSessao = useSessaoStore((s) => s.comando);
  /** O fatiador de folhas de assets (abre pela barra de baixo e pelo menu Mais; o Construtor tem o seu). */
  const [fatiando, setFatiando] = useState(false);
  /** O mapa colocado que o Mestre escolheu com a ferramenta de mapas. */
  const [mapaSelecionadoId, setMapaSelecionadoId] = useState<string | null>(null);
  /** O painel de opções do token (abas) só abre quando se pede, pela barra colada no token. */
  const [menuTokenAberto, setMenuTokenAberto] = useState(false);
  /** Aba com que o menu do token abre (o botão de baú abre direto no Loot). */
  const [abaDoMenuToken, setAbaDoMenuToken] = useState<AbaDoMenuToken | undefined>(undefined);
  /** Token cujo baú (caixote, bolsa) está aberto na janela de loot. */
  const [recipienteAberto, setRecipienteAberto] = useState<string | null>(null);
  const [recipienteOcupado, setRecipienteOcupado] = useState(false);
  const [encaixe, setEncaixe] = useState(() => lerOpcaoLocal(CHAVE_ENCAIXE_LOCAL));
  const [medirAoMover, setMedirAoMover] = useState(() => lerOpcaoLocal(CHAVE_MEDIR_AO_MOVER_LOCAL, false));
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
  const gestos = useRef({ arrastar, soltar, regua, desenharNevoa, marcarArea, enviarArrastos, lancarMagia, criarPortal, moverBoca, criarAnotacao, selecionarAnotacao, moverAnotacao, clicarPorta, moverMapaColocado });
  gestos.current = { arrastar, soltar, regua, desenharNevoa, marcarArea, enviarArrastos, lancarMagia, criarPortal, moverBoca, criarAnotacao, selecionarAnotacao, moverAnotacao, clicarPorta, moverMapaColocado };

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
      aoSelecionarMapa: setMapaSelecionadoId,
      aoContexto: (ponto, tela, tokenId) => setContexto({ x: tela.x, y: tela.y, ponto, tokenId }),
      aoMoverMapa: (id, mudancas) => gestos.current.moverMapaColocado(id, mudancas),
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

  // A seleção do React (mapa recém-posto, Esc, Delete) vale também no palco, depois de ele receber a cena nova.
  useEffect(() => {
    palcoRef.current?.selecionarMapaColocado(mapaSelecionadoId);
  }, [mapaSelecionadoId, estado, palcoPronto]);

  // Um de cada vez: escolher um token tira a seleção do mapa colocado, e escolher um mapa tira a do token.
  useEffect(() => {
    if (selecionado) setMapaSelecionadoId(null);
    setMenuTokenAberto(false);
  }, [selecionado]);

  useEffect(() => {
    if (mapaSelecionadoId) setSelecionado(null);
  }, [mapaSelecionadoId]);

  // Busca, trilha, documentos, menu da porta e editor de anotação ocupam o mesmo canto do menu do token:
  // quando um deles abre, o menu do token fecha (antes ficavam um em cima do outro).
  useEffect(() => {
    if (painelRecurso || portaEscolhida || editorAnotacao) setMenuTokenAberto(false);
  }, [painelRecurso, portaEscolhida, editorAnotacao]);

  useEffect(() => {
    palcoRef.current?.definirEncaixe(encaixe);
    guardarOpcaoLocal(CHAVE_ENCAIXE_LOCAL, encaixe);
  }, [encaixe, palcoPronto]);

  useEffect(() => {
    palcoRef.current?.definirMedirAoMover(medirAoMover);
    guardarOpcaoLocal(CHAVE_MEDIR_AO_MOVER_LOCAL, medirAoMover);
  }, [medirAoMover, palcoPronto]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_SEGUIR_VISTA_LOCAL, seguirVista);
  }, [seguirVista]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_FERRAMENTAS_LOCAL, ferramentasAbertas);
  }, [ferramentasAbertas]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_LATERAL_LOCAL, lateralAberta);
  }, [lateralAberta]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_NOMES_BARRA_LOCAL, nomesNaBarra);
  }, [nomesNaBarra]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_SEGUIR_VEZ_LOCAL, seguirVez);
  }, [seguirVez]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_ALCANCE_LOCAL, alcanceLigado);
  }, [alcanceLigado]);

  useEffect(() => {
    guardarOpcaoLocal(CHAVE_IMERSIVO_LOCAL, imersivo);
  }, [imersivo]);

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

  // A vez mudou: quem pediu, vê a tela ir até o token de quem age. A vez que já estava quando a página abriu não
  // move nada, e a tela não sai do lugar enquanto a própria pessoa arrasta um token.
  useEffect(() => {
    if (!palcoPronto) return;
    const anterior = vezSeguida.current;
    vezSeguida.current = tokenDaVez;
    if (!seguirVez || !tokenDaVez || anterior === undefined || anterior === tokenDaVez) return;
    const palco = palcoRef.current;
    if (!palco || palco.tokenArrastadoLocal) return;
    const posicao = palco.posicaoDe(tokenDaVez);
    if (posicao) palco.centralizar(posicao.x, posicao.y);
  }, [tokenDaVez, seguirVez, palcoPronto]);

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
      if (construtorAberto || tourAberto) return;
      const palco = palcoRef.current;
      if ((evento.ctrlKey || evento.metaKey) && evento.shiftKey && (evento.key === 'd' || evento.key === 'D')) {
        evento.preventDefault();
        setMedidorAberto((aberto) => !aberto);
        return;
      }
      if ((evento.ctrlKey || evento.metaKey) && !evento.shiftKey && (evento.key === 'k' || evento.key === 'K')) {
        evento.preventDefault();
        setPaletaAberta((aberta) => !aberta);
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
      if (evento.key === 'd' || evento.key === 'D') {
        // Sem isto a letra cairia dentro do campo da fórmula, que ganha o foco assim que a bandeja abre.
        evento.preventDefault();
        setDadosAbertos((v) => !v);
      }
      if (evento.key === 'h' || evento.key === 'H') setSoMapa((v) => !v);
      if (evento.key === '?') setAtalhosAbertos((v) => !v);
      if (evento.key === '/') {
        evento.preventDefault();
        setPaletaAberta(true);
      }
      if (evento.key === 'Delete' && ferramenta === 'mover' && mapaSelecionadoId && gestorAgora) apagarMapaColocadoRef.current();
      if (evento.key === 'Enter' && ferramenta === 'nevoa') palco?.fecharPoligono();
      if (evento.key === 'Escape') {
        if (palco?.desenhando) palco.cancelarDesenho();
        else if (ferramenta === 'portal' && portalEscolhido) setPortalEscolhido(null);
        else if (ferramenta === 'mover' && mapaSelecionadoId) setMapaSelecionadoId(null);
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
  }, [ferramenta, gestorAgora, podeRegua, podePing, podeMagia, enviarNevoa, medidor, portalEscolhido, construtorAberto, mapaSelecionadoId, tourAberto]);

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

  /** Vida, Mana, Estamina ou Sanidade pela barra do token: o servidor grava na Sessão e na ficha, e a mesa vê na hora. */
  const mexerNoRecursoDoToken = async (tipo: TipoBarra, dados: { delta?: number; atual?: number }) => {
    if (!campanhaId || !selecionado) return;
    const resposta = await comErro(() => mapaApi.mexerNoRecurso(campanhaId, selecionado, { tipo, ...dados }));
    if (resposta) setEstado(resposta);
  };

  /**
   * O Mestre põe e tira condições e aflições pelo token, pelas mesmas rotas da Sessão (o que muda aqui muda lá e na ficha).
   * Só quando o token está ligado a um participante da sessão em andamento.
   */
  const acoesDeEstadoDoToken = (token: ITokenMapa): AcoesDeEstado | null => {
    if (!gestor || !sessaoId || !token.participante_id) return null;
    const participanteId = token.participante_id;
    const condicoes = (token.estados ?? []).flatMap((e) => (e.tipo === 'condicao' ? [{ nome: e.nome, turnos: e.turnos }] : []));
    const aplicar = async (acao: () => Promise<unknown>) => {
      const ok = await comErro(async () => { await acao(); return true; });
      if (ok) void recarregar();
    };
    return {
      adicionar: (opcao) => void aplicar(() => (opcao.tipo === 'condicao'
        ? sessaoApi.atualizarParticipante(sessaoId, participanteId, { condicoes: [...condicoes, { nome: opcao.valor, turnos: null }] })
        : sessaoApi.mexerNaAflicao(sessaoId, participanteId, { acao: 'aplicar', aflicao_id: opcao.valor, estagio: 1 }))),
      remover: (estado) => void aplicar(() => (estado.tipo === 'condicao'
        ? sessaoApi.atualizarParticipante(sessaoId, participanteId, { condicoes: condicoes.filter((c) => c.nome !== estado.nome) })
        : sessaoApi.mexerNaAflicao(sessaoId, participanteId, { acao: 'remover', aflicao_id: estado.id }))),
      mudarRodadas: (nome, turnos) => void aplicar(() => sessaoApi.atualizarParticipante(sessaoId, participanteId, {
        condicoes: condicoes.map((c) => (c.nome === nome ? { nome, turnos } : c)),
      })),
      mudarEstagio: (id, estagio) => void aplicar(() => sessaoApi.mexerNaAflicao(sessaoId, participanteId, { acao: 'estagio', aflicao_id: id, estagio })),
    };
  };

  /** Abre o baú (a primeira abertura rola a tabela no servidor) e mostra o que saiu. */
  const abrirRecipiente = async (token: ITokenMapa) => {
    if (!campanhaId || !token.recipiente) return;
    if (token.recipiente.aberto) {
      setRecipienteAberto(token.id);
      return;
    }
    if (token.recipiente.trancado && !gestor) {
      avisar.info(`${token.recipiente.rotulo} está trancado. Fale com o Mestre.`);
      return;
    }
    setRecipienteOcupado(true);
    const resposta = await comErro(() => mapaApi.abrirRecipiente(campanhaId, token.id));
    setRecipienteOcupado(false);
    if (resposta) {
      setEstado(resposta);
      setRecipienteAberto(token.id);
    }
  };

  const pegarDoRecipiente = async (tokenId: string, linhas: string[], personagemId: string | undefined) => {
    if (!campanhaId) return;
    setRecipienteOcupado(true);
    const resposta = await comErro(() => mapaApi.pegarDoRecipiente(campanhaId, tokenId, { linhas, ...(personagemId ? { personagem_id: personagemId } : {}) }));
    setRecipienteOcupado(false);
    if (resposta) {
      setEstado(resposta);
      avisar.sucesso(linhas.length > 1 ? 'Tudo foi para o seu inventário.' : 'Foi para o seu inventário.');
    }
  };

  /**
   * A nota do Mestre de um token. Leva o id do token (e não o `selecionado` do momento): a nota também é guardada
   * quando o menu fecha por a pessoa ter escolhido outro token, e tem de ir para o token em que foi escrita.
   */
  const salvarNotaDoToken = async (tokenId: string, texto: string) => {
    if (!campanhaId) return;
    const resposta = await comErro(() => mapaApi.editarToken(campanhaId, tokenId, { nota_mestre: texto }));
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
  /** O palco de agora, para as barras coladas no mapa e no token seguirem o objeto na tela. */
  const obterPalco = useCallback(() => palcoRef.current, []);
  /** Esconde ou mostra aos jogadores o token escolhido (o botão do olho da barra colada nele). */
  const ocultarToken = () => void editarToken({ oculto: !tokenSelecionado?.oculto });

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

  /** Token ou objeto do Acervo na cena: no ponto onde foi solto (encaixado na grade) ou, sem ponto, no meio da tela. */
  const porNaCena = async (item: ItemParaCena, ponto?: IPonto | null) => {
    const alvo = ponto && cena ? encaixar(ponto, cena.grade, 1) : centroNaGrade();
    if (!campanhaId || !cena || !alvo) return;
    const { x, y } = alvo;
    const camada = (['props', 'montarias', 'personagens'] as CamadaTokenId[]).includes(camadaAtiva as CamadaTokenId)
      ? camadaAtiva as CamadaTokenId
      : 'props';
    const resposta = await comErro(() => mapaApi.criarToken(campanhaId, cena.id, { imagem_id: item.id, nome: item.nome, x, y, camada }));
    if (resposta) setEstado(resposta);
  };

  /** Põe um mapa do Acervo na cena como um objeto: no ponto onde foi solto ou, sem ponto, no meio da tela. */
  const colocarMapa = async (item: ItemParaCena, ponto?: IPonto | null) => {
    if (!campanhaId || !cena) return;
    const centro = ponto ?? palcoRef.current?.centro() ?? { x: 0, y: 0 };
    const x = Math.max(0, Math.round(centro.x - item.largura / 2));
    const y = Math.max(0, Math.round(centro.y - item.altura / 2));
    const resposta = await comErro(() => mapaApi.colocarMapa(campanhaId, cena.id, {
      imagem_id: item.id, nome: item.nome, ...(cena.mapas_colocados?.length || cena.mapa ? { x, y } : {}),
    }));
    if (!resposta) return;
    setEstado(resposta);
    setFerramenta('mover');
    setMapaSelecionadoId(resposta.mapa_colocado_id);
    setAcervoAberto(false);
  };

  /** Arrastar uma imagem da barra de baixo até o mapa: o palco só aceita o que o dock do Acervo empacotou. */
  const aoArrastarSobreOMapa = (evento: React.DragEvent) => {
    const tipos = Array.from(evento.dataTransfer.types);
    if (!gestor || (!tipos.includes(MIME_ACERVO) && !arrastaArquivos(tipos))) return;
    evento.preventDefault();
    evento.dataTransfer.dropEffect = 'copy';
  };

  /**
   * Arquivos do computador soltos no mapa: o Mestre diz se são mapa ou token, eles sobem para o Acervo e entram
   * na cena no ponto do soltar (os vários vão um pouco deslocados, para dar para ver cada um).
   */
  const soltarArquivosNoMapa = async (arquivos: File[], ponto: IPonto | null) => {
    if (!cena) {
      avisar.erro('Abra ou crie uma cena antes de soltar imagens no mapa.');
      return;
    }
    const { imagens, deixadas } = imagensParaEnviar(arquivos);
    if (!imagens.length) {
      avisar.erro('Só imagens (png, jpg, webp ou gif) entram no mapa.');
      return;
    }
    const tipo = await perguntarTipoDaImagem(imagens.length, imagens[0].name);
    if (!tipo) return;
    // O aviso de andamento fica na tela até o fim e troca de texto a cada imagem (não a cada pedaço, para não piscar).
    let imagemDoAviso = 1;
    let idAviso = avisar.info(textoDoAndamento({ indice: 1, total: imagens.length, nome: imagens[0].name, feitos: 0, pedacos: 0 }), { chave: 'envio-no-mapa-1', duracaoMs: 0 });
    const resultado = await enviarImagens(imagens, {
      tipo,
      pastaId: null,
      aoAndamento: (andamento) => {
        if (andamento.indice === imagemDoAviso) return;
        imagemDoAviso = andamento.indice;
        dispensarAviso(idAviso);
        idAviso = avisar.info(textoDoAndamento({ ...andamento, feitos: 0, pedacos: 0 }), { chave: `envio-no-mapa-${andamento.indice}`, duracaoMs: 0 });
      },
    });
    dispensarAviso(idAviso);
    setVersaoAcervo((v) => v + 1);
    const base = ponto ?? palcoRef.current?.centro() ?? { x: 0, y: 0 };
    for (let i = 0; i < resultado.itens.length; i++) {
      const item = resultado.itens[i];
      if (tipo === 'mapa') await colocarMapa(item, { x: base.x + i * 80, y: base.y + i * 80 });
      else await porNaCena(item, { x: base.x + i * cena.grade.tamanho, y: base.y });
    }
    const texto = textoDoResultado({ ...resultado, deixadas });
    if (resultado.falhas.length) avisar.aviso(texto);
    else avisar.sucesso(texto);
  };

  const aoSoltarNoMapa = (evento: React.DragEvent) => {
    const bruto = evento.dataTransfer.getData(MIME_ACERVO);
    const item = bruto ? lerItemArrastado(bruto) : null;
    const ponto = palcoRef.current?.pontoDaTela(evento.clientX, evento.clientY) ?? null;
    if (gestor && item) {
      evento.preventDefault();
      if (item.tipo === 'mapa') void colocarMapa(item, ponto);
      else void porNaCena(item, ponto);
      return;
    }
    if (gestor && !item && arrastaArquivos(Array.from(evento.dataTransfer.types))) {
      evento.preventDefault();
      void soltarArquivosNoMapa(Array.from(evento.dataTransfer.files), ponto);
    }
  };

  /** Lugar ou tamanho novo depois de arrastar um mapa: vale na hora na tela e vai para o servidor. */
  async function moverMapaColocado(id: string, mudancas: Pick<IMapaColocadoEdicao, 'x' | 'y' | 'escala' | 'rotacao'>) {
    await editarMapaColocado(id, mudancas);
  }

  async function editarMapaColocado(id: string, edicao: IMapaColocadoEdicao) {
    const atual = estadoRef.current?.cena;
    if (!campanhaId || !atual) return;
    const resposta = await comErro(() => mapaApi.editarMapaColocado(campanhaId, atual.id, id, edicao));
    if (resposta) setEstado(resposta);
    // Falhou (trancado, longe demais): a tela volta ao que o servidor tem.
    else void recarregar();
  }

  const ordenarMapaColocado = async (id: string, acao: AcaoOrdemMapa) => {
    if (!campanhaId || !cena) return;
    const resposta = await comErro(() => mapaApi.ordenarMapaColocado(campanhaId, cena.id, id, acao));
    if (resposta) setEstado(resposta);
  };

  const duplicarMapaColocado = async (id: string) => {
    if (!campanhaId || !cena) return;
    const resposta = await comErro(() => mapaApi.duplicarMapaColocado(campanhaId, cena.id, id));
    if (!resposta) return;
    setEstado(resposta);
    setMapaSelecionadoId(resposta.mapa_colocado_id);
  };

  const renomearMapaColocado = async (id: string, nomeAtual: string) => {
    const nome = await pedirTexto({ titulo: 'Nome do mapa', campo: { rotulo: 'Nome', valor: nomeAtual, maximo: 80 }, rotuloConfirmar: 'Salvar' });
    if (nome?.trim() && nome.trim() !== nomeAtual) await editarMapaColocado(id, { nome: nome.trim() });
  };

  const apagarMapaColocado = async (id: string) => {
    if (!campanhaId || !cena) return;
    const mapa = cena.mapas_colocados?.find((m) => m.id === id);
    if (!(await confirmar({ titulo: `Tirar "${mapa?.nome ?? 'o mapa'}" da cena?`, mensagem: 'A imagem continua no Acervo.', rotuloConfirmar: 'Tirar', tom: 'perigo' }))) return;
    const resposta = await comErro(() => mapaApi.tirarMapaColocado(campanhaId, cena.id, id));
    if (!resposta) return;
    setEstado(resposta);
    setMapaSelecionadoId(null);
    palcoRef.current?.selecionarMapaColocado(null);
  };

  const mapaEscolhido = cena?.mapas_colocados?.find((m) => m.id === mapaSelecionadoId) ?? null;
  const apagarMapaColocadoRef = useRef<() => void>(() => undefined);
  apagarMapaColocadoRef.current = () => { if (mapaSelecionadoId) void apagarMapaColocado(mapaSelecionadoId); };

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
  // O alcance de movimento vale para quem pode mover o token da vez: o Mestre sempre, o jogador na vez dele.
  const tokenDoAlcance = emCombate && tokenDaVez ? tokens.find((t) => t.id === tokenDaVez && t.pode_mover) ?? null : null;
  const movimentoDaFichaDoToken = tokenDoAlcance && cena ? movimentoDaFicha(tokenDoAlcance.movimento, cena.grade) : null;
  const alcanceCalculado = tokenDoAlcance && cena
    ? alcanceDoToken(movimentos[chaveDoMovimento(tokenDoAlcance)], movimentoDaFichaDoToken, movimentoPadrao(cena.grade))
    : null;
  const alcanceDoTurno = alcanceCalculado?.alcance ?? null;
  const andadosDoToken = tokenDoAlcance && movimentoAtual.chave === chaveMovimentoTurno ? movimentoAtual.porToken[tokenDoAlcance.id] ?? 0 : 0;
  const gradeDaCena = cena?.grade ?? null;
  const contornoAlcance = useMemo(() => {
    if (!alcanceLigado || !tokenDoAlcance || !gradeDaCena || alcanceDoTurno === null) return null;
    const resta = metrosRestantes(alcanceDoTurno, andadosDoToken);
    return resta > 0 ? contornoDoAlcance({ x: tokenDoAlcance.x, y: tokenDoAlcance.y }, resta, gradeDaCena) : null;
  }, [alcanceLigado, tokenDoAlcance?.id, tokenDoAlcance?.x, tokenDoAlcance?.y, gradeDaCena, alcanceDoTurno, andadosDoToken]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    palcoRef.current?.definirAlcance(contornoAlcance);
  }, [contornoAlcance, palcoPronto]);
  const ajustarAlcance = (metros: number | null) => {
    if (!tokenDoAlcance || !alcanceCalculado) return;
    const novos = comMovimento(movimentos, chaveDoMovimento(tokenDoAlcance), metros === null ? null : { m: metros, de: alcanceCalculado.base });
    setMovimentos(novos);
    salvarMovimentos(novos);
  };

  const chaveDoTour = `jardim:mapa-tour:${usuarioId ?? 'local'}`;
  const iniciarTour = useCallback(() => {
    tourTentado.current = true;
    setTourAberto(true);
  }, []);
  const encerrarTour = useCallback(() => {
    try {
      window.localStorage.setItem(chaveDoTour, serializarMapaTourVisto());
    } catch {
      // Sem armazenamento do navegador, o guia continua no menu Exibição.
    }
    setTourAberto(false);
  }, [chaveDoTour]);
  // Primeira visita ao mapa com uma cena na tela: o guia abre sozinho, uma vez por conta e por aparelho.
  const temCena = Boolean(cena);
  useEffect(() => {
    if (!temCena || !palcoPronto || tourAberto || tourTentado.current || construtorAberto || paletaAberta || !guiasAutomaticosLigados()) return undefined;
    try {
      if (mapaTourJaVisto(window.localStorage.getItem(chaveDoTour))) {
        tourTentado.current = true;
        return undefined;
      }
    } catch {
      // Sem armazenamento, o guia ainda abre uma vez nesta visita.
    }
    const relogio = window.setTimeout(iniciarTour, 1200);
    return () => window.clearTimeout(relogio);
  }, [temCena, palcoPronto, tourAberto, construtorAberto, paletaAberta, chaveDoTour, iniciarTour]);

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
        ? gestor ? 'Nenhuma cena ainda. Crie uma no nome da cena, no topo, ou a partir de um mapa do Acervo.' : 'O Mestre ainda não abriu um mapa.'
        : null;

  /**
   * Os painéis do lado esquerdo do mapa abrem um por vez: o que abre fecha os outros (antes alguns ficavam um
   * em cima do outro no mesmo canto). Chamar de novo com o painel aberto fecha ele.
   */
  const alternarPainel = (qual: 'grade' | 'vista' | 'camadas' | 'jogadores' | 'clima' | 'tempo' | 'config' | 'barras' | 'mesa') => {
    const abertos = { grade: gradeAberta, vista: vistaAberta, camadas: camadasAberto, jogadores: jogadoresAberto, clima: climaAberto, tempo: tempoAberto, config: configAberta, barras: barrasAberto, mesa: mesaAberta };
    const eraAberto = abertos[qual];
    setGradeAberta(false);
    setVistaAberta(false);
    setCamadasAberto(false);
    setJogadoresAberto(false);
    setClimaAberto(false);
    setTempoAberto(false);
    setConfigAberta(false);
    setBarrasAberto(false);
    setMesaAberta(false);
    if (qual === 'jogadores') setEditorAnotacao(null);
    if (eraAberto) return;
    ({ grade: setGradeAberta, vista: setVistaAberta, camadas: setCamadasAberto, jogadores: setJogadoresAberto, clima: setClimaAberto, tempo: setTempoAberto, config: setConfigAberta, barras: setBarrasAberto, mesa: setMesaAberta })[qual](true);
  };

  const abrirRecurso = (qual: 'documentos' | 'trilha') => setPainelRecurso((atual) => (atual === qual ? null : qual));
  const mostrarNoPainel = (qual: AbaLateral) => {
    setAba(qual);
    setLateralAberta(true);
  };
  const tokenDaMinhaVez = !gestor && emCombate ? meuTokenDaVez(tokens, turnoAtualId, personagemDaVez) : null;
  const tokenDoHud = tokens.find((t) => t.id === tokenDaMinhaVez) ?? meuToken;
  const encerrarMeuTurno = async () => {
    try {
      await useSessaoStore.getState().passarMinhaVez();
    } catch (falha) {
      avisar.erro(falha instanceof Error && !(falha instanceof ApiError) ? falha.message : 'Não deu para encerrar o turno agora. A vez pode já ter passado.');
    }
  };

  // O menu do botão direito: o que cabe no token clicado ou naquele ponto do mapa.
  const tokenDoContexto = contexto?.tokenId ? tokens.find((t) => t.id === contexto.tokenId) ?? null : null;
  const itensDoContexto: ItemDoMenu[] = contexto ? (() => {
    const { ponto } = contexto;
    const pingar: ItemDoMenu = { icone: MapPin, rotulo: 'Pingar aqui', disabled: !podePing, onClick: () => conexaoRef.current?.enviar({ t: 'ping', x: ponto.x, y: ponto.y }) };
    const dados: ItemDoMenu = { icone: Dices, rotulo: 'Rolar dados', atalho: 'D', onClick: () => setDadosAbertos(true) };
    if (tokenDoContexto) {
      const alvo = tokenDoContexto;
      const meu = gestor || alvo.e_meu;
      return [
        ...(meu ? [{ icone: SlidersHorizontal, rotulo: 'Opções do token', onClick: () => { setFerramenta('mover'); setSelecionado(alvo.id); setAbaDoMenuToken(undefined); setMenuTokenAberto(true); } }] : []),
        ...(alvo.personagem_id ? [{ icone: ScrollText, rotulo: 'Abrir a ficha', onClick: () => mostrarNoPainel('fichas') }] : []),
        { icone: Crosshair, rotulo: 'Centralizar aqui', onClick: () => centralizar(alvo) },
        ...(gestor ? [
          { icone: MessageSquare, rotulo: 'Falar como este token', onClick: () => void falarComo(alvo) },
          { icone: alvo.oculto ? Eye : EyeOff, rotulo: alvo.oculto ? 'Mostrar aos jogadores' : 'Esconder dos jogadores', onClick: () => void comErro(() => mapaApi.editarToken(campanhaId!, alvo.id, { oculto: !alvo.oculto })).then((r) => r && setEstado(r)) },
        ] : []),
        ...(alvo.id === tokenDaMinhaVez ? [{ icone: ChevronsRight, rotulo: 'Encerrar o meu turno', onClick: () => void encerrarMeuTurno() }] : []),
        pingar,
        ...(gestor ? [{ icone: Trash2, rotulo: 'Tirar do mapa', onClick: () => void (async () => {
          if (!(await confirmar({ mensagem: `Tirar ${alvo.nome} do mapa?`, rotuloConfirmar: 'Tirar', tom: 'perigo' }))) return;
          await comErro(() => mapaApi.apagarToken(campanhaId!, alvo.id));
          if (selecionado === alvo.id) setSelecionado(null);
          void recarregar();
        })() }] : []),
      ];
    }
    return [
      pingar,
      dados,
      ...(gestor ? [
        { icone: Type, rotulo: 'Escrever aqui', onClick: () => criarAnotacao(ponto) },
        { icone: UserPlus, rotulo: 'Trazer os participantes para cá', onClick: () => void (async () => {
          if (!cena) return;
          const resposta = await comErro(() => mapaApi.trazerParticipantes(campanhaId!, cena.id, encaixar(ponto, cena.grade, 1)));
          if (resposta) setEstado(resposta);
        })() },
        { icone: LocateFixed, rotulo: 'Trazer todos para a minha vista', disabled: !(conexao === 'ws' || conexao === 'sse'), onClick: sincronizarVista },
      ] : []),
      ...(tokenDoHud && !gestor ? [{ icone: UserRound, rotulo: 'Ir até o meu personagem', onClick: () => centralizar(tokenDoHud) }] : []),
      { icone: Expand, rotulo: 'Ver o mapa inteiro', onClick: () => palcoRef.current?.enquadrar() },
    ];
  })() : [];

  // Os menus da barra da esquerda, por intenção: o que mexe nesta cena, o que mexe na mesa e o que serve para
  // montar. Cada item diz em uma linha o que faz; a central de comandos (Ctrl+K) usa a mesma lista.
  const itemCamadas: ItemDoMenu = { icone: Layers, rotulo: 'Camadas do mapa', descricao: gestor ? 'O que aparece e o que os jogadores veem' : 'Esconde ou mostra partes do mapa só para você', palavras: 'esconder mostrar props montarias anotacoes visivel', ativo: camadasAberto, disabled: !cena, onClick: () => alternarPainel('camadas') };
  const itemGrade: ItemDoMenu = { icone: Grid3x3, rotulo: gestor ? 'Grade e medidas' : 'Encaixe e medidas', descricao: gestor ? 'Tamanho da casa, encaixe e medida ao mover' : 'Encaixar na grade e medir ao mover', palavras: 'grid quadrado hexagono casa metros snap', ativo: gradeAberta, disabled: !cena, onClick: () => alternarPainel('grade') };
  const itemVista: ItemDoMenu = { icone: LocateFixed, rotulo: 'Vista e sincronização', descricao: gestor ? 'Guardar vistas e trazer todos para a sua' : 'Guardar vistas e seguir a tela de quem chama', palavras: 'camera zoom seguir posicao salva', ativo: vistaAberta, disabled: !cena, onClick: () => alternarPainel('vista') };
  const itemJogadores: ItemDoMenu = { icone: Users, rotulo: gestor ? 'Jogadores e permissões' : 'Meu nome e cor na mesa', descricao: gestor ? 'Quem está na mesa e o que cada um pode usar' : 'Como você aparece para os outros', palavras: 'permissao convite convidar papel assistente cor apelido', ativo: jogadoresAberto, disabled: !campanhaId, onClick: () => alternarPainel('jogadores') };
  const itemTrilha: ItemDoMenu = { icone: Music2, rotulo: 'Trilha sonora', descricao: gestor ? 'Música tocando igual para a mesa inteira' : 'O que está tocando e o volume', palavras: 'musica som audio ambiente volume', ativo: painelRecurso === 'trilha', onClick: () => abrirRecurso('trilha') };
  const itemBarras: ItemDoMenu = { icone: SlidersHorizontal, rotulo: 'Aparência das barras', descricao: 'Como Vida e Mana aparecem neste aparelho', palavras: 'vida mana estamina sanidade numeros tamanho', ativo: barrasAberto, onClick: () => alternarPainel('barras') };

  const itensDaCena: ItemDoMenu[] = gestor ? [
    itemCamadas,
    itemGrade,
    { icone: CloudRain, rotulo: 'Clima da cena', descricao: 'Chuva, neblina, escuridão e outros efeitos', palavras: 'chuva tempestade neve neblina areia calor cinzas folhas vento veu particulas', ativo: climaAberto, disabled: !cena, onClick: () => alternarPainel('clima') },
    { icone: Clock3, rotulo: 'Tempo do mundo e luz', descricao: 'Avança o relógio e muda a luz da cena', palavras: 'hora dia noite amanhecer entardecer lua calendario ceu', ativo: tempoAberto, disabled: !tempo, onClick: () => alternarPainel('tempo') },
    { icone: Settings2, rotulo: 'Configurar esta cena', descricao: 'Nome, tamanho, moldura da mesa e apagar', palavras: 'renomear excluir nota do mestre', ativo: configAberta, disabled: !cena, onClick: () => alternarPainel('config') },
  ] : [];
  const itensDaMesa: ItemDoMenu[] = gestor ? [
    itemJogadores,
    { icone: Hourglass, rotulo: 'Pausa, relógios e vista inicial', descricao: 'Pausa a mesa, conta progresso e tempo', palavras: 'pausar cronometro contagem relogio intervalo', ativo: mesaAberta, disabled: !estado?.mesa, onClick: () => alternarPainel('mesa') },
    { icone: BookOpenCheck, rotulo: 'Mostrar documento na mesa', descricao: 'Carta, cartaz ou bilhete na tela de todos', palavras: 'carta cartaz bilhete jornal contrato handout', ativo: painelRecurso === 'documentos', onClick: () => abrirRecurso('documentos') },
    itemTrilha,
    itemVista,
  ] : [itemJogadores, itemCamadas, itemGrade, itemVista, itemTrilha];
  const itensDeMontar: ItemDoMenu[] = gestor ? [
    { icone: UserPlus, rotulo: 'Trazer os participantes da Sessão', descricao: 'Põe no mapa quem está na iniciativa', palavras: 'tokens jogadores monstros iniciativa colocar', disabled: !cena, onClick: () => void trazerParticipantes() },
    { icone: FolderOpen, rotulo: 'Abrir o Acervo', descricao: 'Mapas, tokens e objetos guardados', palavras: 'imagem upload subir pasta biblioteca', ativo: acervoAberto, onClick: () => setAcervoAberto((v) => !v) },
    { icone: DraftingCompass, rotulo: 'Construtor de mapas', descricao: 'Desenhe salas, paredes, portas e luzes', palavras: 'desenhar masmorra sala parede porta piso editor', ativo: construtorAberto, onClick: () => setConstrutorAberto(true) },
    { icone: Wand2, rotulo: 'Oficina de tokens e fundos', descricao: 'Recorta o fundo, melhora e emoldura imagens', palavras: 'remover fundo moldura recortar melhorar qualidade retrato', ativo: oficinaAberta, onClick: () => setOficinaAberta((v) => !v) },
    { icone: Scissors, rotulo: 'Fatiar folha de assets', descricao: 'Corta uma folha em peças para o Acervo', palavras: 'spritesheet recortar pecas objetos', ativo: fatiando, onClick: () => setFatiando(true) },
  ] : [];
  const exibicaoDaTela: ItemDoMenu[] = [
    // O celular não usa tela cheia (e o iPhone nem tem): o item só aparece onde o navegador oferece.
    ...(document.fullscreenEnabled && !window.matchMedia('(max-width: 760px)').matches
      ? [{ icone: telaCheia ? Minimize2 : Maximize2, rotulo: telaCheia ? 'Sair da tela cheia' : 'Tela cheia', ativo: telaCheia, onClick: alternarTelaCheia }]
      : []),
    { icone: Focus, rotulo: 'Só o mapa', atalho: 'H', onClick: () => setSoMapa(true) },
    { icone: ferramentasAbertas ? PanelLeftClose : PanelLeftOpen, rotulo: ferramentasAbertas ? 'Esconder as ferramentas' : 'Mostrar as ferramentas', onClick: () => setFerramentasAbertas((v) => !v) },
    { icone: Tags, rotulo: nomesNaBarra ? 'Barra só com ícones' : 'Nomes na barra de ferramentas', onClick: () => setNomesNaBarra((v) => !v) },
    { icone: MoonStar, rotulo: 'Modo imersivo', descricao: 'A interface some depois de uns segundos sem mexer', palavras: 'esconder sumir cinema limpo narracao', ativo: imersivo, onClick: () => setImersivo((v) => !v) },
  ];
  const exibicaoDoAparelho: ItemDoMenu[] = [
    { icone: Video, rotulo: 'Seguir a vez com a câmera', descricao: 'A tela vai até quem está agindo', palavras: 'turno camera acompanhar centralizar', ativo: seguirVez, onClick: () => setSeguirVez((v) => !v) },
    { icone: Footprints, rotulo: 'Alcance de movimento na vez', descricao: 'Um contorno mostra até onde ainda dá para andar', palavras: 'deslocamento andar distancia turno', ativo: alcanceLigado, onClick: () => setAlcanceLigado((v) => !v) },
    itemBarras,
    ...(cena?.clima.efeitos.length
      ? [{ icone: climaLocal ? CloudOff : Cloud, rotulo: climaLocal ? 'Desligar o clima neste aparelho' : 'Ligar o clima neste aparelho', descricao: 'Chuva, neblina e outros efeitos só nesta tela', onClick: () => setClimaLocal((v) => !v) }]
      : []),
  ];
  const exibicaoDeAjuda: ItemDoMenu[] = [
    { icone: Command, rotulo: 'Central de comandos', atalho: 'Ctrl K', onClick: () => setPaletaAberta(true) },
    { icone: Keyboard, rotulo: 'Atalhos do teclado', atalho: '?', onClick: () => setAtalhosAbertos(true) },
    { icone: Compass, rotulo: 'Guia do mapa', palavras: 'tour ajuda tutorial como usar', onClick: iniciarTour },
  ];
  const gruposDeExibicao: GrupoDoMenu[] = [
    { titulo: 'Tela', itens: exibicaoDaTela },
    { titulo: 'Neste aparelho', itens: exibicaoDoAparelho },
    { titulo: 'Ajuda', itens: exibicaoDeAjuda },
  ];
  const itensDeExibicao: ItemDoMenu[] = [...exibicaoDaTela, ...exibicaoDoAparelho, ...exibicaoDeAjuda];

  const menuDaCena: GrupoDoMenu[] = [{ titulo: '', itens: itensDaCena }];
  const menuDaMesa: GrupoDoMenu[] = [{ titulo: '', itens: itensDaMesa }];
  const menuDeMontar: GrupoDoMenu[] = [{ titulo: '', itens: itensDeMontar }];

  // A central de comandos: a mesma lista dos menus, mais ferramentas, cenas e os tokens que a pessoa pode ver.
  const comandosDaPaleta: ComandoDoMapa[] = paletaAberta ? (() => {
    const deItem = (grupo: string, item: ItemDoMenu): ComandoDoMapa => ({
      id: `${grupo}:${item.rotulo}`, grupo, rotulo: item.rotulo, descricao: item.descricao, palavras: item.palavras,
      icone: item.icone, atalho: item.atalho, ativo: item.ativo, disabled: item.disabled, executar: item.onClick,
    });
    const ferramentaDaPaleta = (qual: Ferramenta, icone: ComandoDoMapa['icone'], rotulo: string, atalho: string, pode: boolean, palavras = ''): ComandoDoMapa => ({
      id: `ferramenta:${qual}`, grupo: 'Ferramentas', rotulo, atalho, icone, palavras, ativo: ferramenta === qual, disabled: !pode, executar: () => setFerramenta(qual),
    });
    const unidade = rotuloUnidade(cena?.grade.unidade);
    const lista: ComandoDoMapa[] = [
      ...(emCombate && comandaSessao ? [
        { id: 'turno:proximo', grupo: 'Combate', rotulo: 'Próximo turno', descricao: nomeDaVez ? `Agora é a vez de ${nomeDaVez}` : undefined, palavras: 'passar a vez iniciativa', icone: ChevronRight, executar: () => void useSessaoStore.getState().proximoTurno() },
        { id: 'turno:anterior', grupo: 'Combate', rotulo: 'Turno anterior', palavras: 'voltar a vez iniciativa', icone: ChevronLeft, executar: () => void useSessaoStore.getState().turnoAnterior() },
      ] : []),
      ...(tokenDaMinhaVez ? [{ id: 'turno:meu', grupo: 'Combate', rotulo: 'Encerrar o meu turno', descricao: 'Passa a vez para o próximo da iniciativa', palavras: 'passar a vez terminar fim', icone: ChevronsRight, executar: () => void encerrarMeuTurno() }] : []),
      ferramentaDaPaleta('mover', Hand, 'Mover tokens e o mapa', 'V', true, 'mao selecionar arrastar'),
      ferramentaDaPaleta('regua', Ruler, 'Régua', 'R', podeRegua, 'medir distancia metros'),
      ferramentaDaPaleta('ping', MapPin, 'Ping', 'P', podePing, 'apontar chamar atencao olhem aqui'),
      ferramentaDaPaleta('magia', Sparkles, 'Efeito de magia', 'M', Boolean(cena) && podeMagia, 'area cone circulo linha feitico'),
      { id: 'ferramenta:dados', grupo: 'Ferramentas', rotulo: 'Rolar dados', descricao: 'Monte a fórmula e role sem sair do mapa', atalho: 'D', palavras: 'd20 d6 d4 d8 d10 d12 d100 dado rolagem teste', icone: Dices, ativo: dadosAbertos, disabled: !campanhaId, executar: () => setDadosAbertos(true) },
      ...(gestor ? [
        ferramentaDaPaleta('texto', Type, 'Escrever no mapa', 'T', Boolean(cena), 'anotacao placa nota'),
        ferramentaDaPaleta('nevoa', Eye, 'Névoa de guerra', 'N', Boolean(cena), 'revelar esconder cobrir fog visao'),
        ferramentaDaPaleta('portal', Orbit, 'Portais', 'O', Boolean(cena), 'teleporte passagem'),
      ] : []),
      { id: 'vista:inteiro', grupo: 'Vista', rotulo: 'Ver o mapa inteiro', palavras: 'enquadrar zoom tudo', icone: Expand, disabled: !cena, executar: () => palcoRef.current?.enquadrar() },
      ...(tokenDoHud && !gestor ? [{ id: 'vista:meu', grupo: 'Vista', rotulo: 'Ir até o meu personagem', palavras: 'onde estou centralizar', icone: UserRound, executar: () => centralizar(tokenDoHud) }] : []),
      ...(gestor ? [{ id: 'vista:todos', grupo: 'Vista', rotulo: 'Trazer todos para a minha vista', descricao: 'A tela de cada jogador vai para onde você está olhando', palavras: 'sincronizar olhem seguir', icone: LocateFixed, disabled: !(conexao === 'ws' || conexao === 'sse') || !cena, executar: sincronizarVista }] : []),
      ...itensDaCena.map((item) => deItem('Cena', item)),
      ...itensDaMesa.map((item) => deItem(gestor ? 'Mesa' : 'Ajustes', item)),
      ...itensDeMontar.map((item) => deItem('Montar', item)),
      { id: 'painel:iniciativa', grupo: 'Painel da direita', rotulo: 'Iniciativa', descricao: 'A ordem do combate e de quem é a vez', icone: Swords, executar: () => mostrarNoPainel('iniciativa') },
      { id: 'painel:fichas', grupo: 'Painel da direita', rotulo: 'Fichas', descricao: 'Os personagens desta cena, com barras e condições', icone: UsersRound, executar: () => mostrarNoPainel('fichas') },
      { id: 'painel:rolagens', grupo: 'Painel da direita', rotulo: 'Rolagens', descricao: 'Os dados e os poderes usados na mesa', palavras: 'dados registro historico', icone: ScrollText, executar: () => mostrarNoPainel('rolagens') },
      ...itensDeExibicao.filter((item) => item.rotulo !== 'Central de comandos').map((item) => deItem('Exibição', item)),
      ...(gestor ? (estado?.cenas ?? []).filter((outra) => outra.id !== cena?.id).map((outra): ComandoDoMapa => ({
        id: `cena:${outra.id}`, grupo: 'Cenas', rotulo: `Ver a cena ${outra.nome}`, descricao: outra.ativa ? 'É a cena que está na mesa' : 'Só você vê, até pôr na mesa', palavras: 'trocar mapa', icone: Clapperboard, executar: () => setCenaVista(outra.id),
      })) : []),
      ...tokens.slice(0, 80).map((token): ComandoDoMapa => {
        const distancia = tokenOrigemDistancia && token.id !== tokenOrigemDistancia.id ? distanciaEmMetros(tokenOrigemDistancia, token) : null;
        const tipo = token.camada === 'props' ? 'Item ou objeto' : token.camada === 'montarias' ? 'Montaria' : token.e_meu ? 'Seu personagem' : 'Personagem ou token';
        return {
          id: `token:${token.id}`, grupo: 'Ir até', rotulo: token.nome, palavras: 'token achar onde esta',
          descricao: distancia === null ? tipo : `${tipo} · ${distancia.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidade} de ${tokenOrigemDistancia!.nome}`,
          icone: Crosshair, executar: () => centralizar(token),
        };
      }),
    ];
    return lista;
  })() : [];

  return (
    <div className={`mapa-pagina${lateralAberta ? ' com-lateral' : ''}${ferramentasAbertas ? '' : ' sem-ferramentas'}${soMapa ? ' so-mapa' : ''}${gestor ? ' do-mestre' : ''}${nomesNaBarra ? ' com-nomes' : ''}${interfaceOciosa ? ' ociosa' : ''}`}>
      <header className="mapa-topo">
        <button type="button" className="mapa-icone" aria-label="Voltar para a Sessão" onClick={() => navigate('/sessao')}><ArrowLeft size={18} /></button>
        <ComDica dica={ferramentasAbertas ? 'Esconder as ferramentas' : 'Mostrar as ferramentas'}>
          <button type="button" className="mapa-icone" aria-label={ferramentasAbertas ? 'Esconder as ferramentas' : 'Mostrar as ferramentas'} aria-pressed={!ferramentasAbertas} onClick={() => setFerramentasAbertas((v) => !v)}>
            {ferramentasAbertas ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
        </ComDica>
        <div className="mapa-topo-titulo">
          {gestor ? (
            <SeletorDeCenas
              cenas={estado?.cenas ?? []}
              vendo={cena?.id ?? null}
              titulo={cena?.nome ?? 'Cenas'}
              onVer={(id) => setCenaVista(id)}
              onAtivar={(id) => void comErro(() => mapaApi.ativarCena(campanhaId!, id)).then((r) => r && setEstado(r))}
              onNova={() => void novaCena()}
              onConfigurar={() => alternarPainel('config')}
            />
          ) : <strong>{cena?.nome ?? 'Mapa'}</strong>}
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
                onClick={() => alternarPainel('tempo')}
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
            {nomeDaVez && tokenVisivelDaVez && (
              <MovimentoDoTurno
                andados={tokenDoAlcance ? andadosDoToken : metrosAndados}
                alcance={alcanceDoTurno}
                ajustado={Boolean(alcanceCalculado?.ajustado)}
                daFicha={movimentoDaFichaDoToken !== null}
                unidade={rotuloUnidade(cena?.grade.unidade)}
                onAlcance={ajustarAlcance}
                onRestaurar={() => ajustarAlcance(null)}
              />
            )}
          </div>
        )}
        {pessoas.length > 0 && (
          <ComDica dica={`Na mesa: ${pessoas.map((p) => `${p.nome}${p.gestor ? ' (Mestre)' : ''}`).join(', ')}. Clique para ${gestor ? 'ver jogadores e permissões' : 'mudar seu nome e cor'}.`}>
            <button type="button" className={`mapa-pessoas${jogadoresAberto ? ' ativo' : ''}`} aria-label="Quem está no mapa" onClick={() => alternarPainel('jogadores')}>
              {pessoas.map((p) => (
                <span key={p.usuario_id} className="mapa-pessoa" style={{ borderColor: p.cor, color: p.cor }}>{p.nome.slice(0, 1).toUpperCase()}</span>
              ))}
            </button>
          </ComDica>
        )}
        <ComDica dica="Buscar um token, um painel, uma cena ou uma ação">
          <button type="button" className="mapa-topo-busca" aria-label="Buscar no mapa (central de comandos)" aria-haspopup="dialog" onClick={() => setPaletaAberta(true)}><Search size={15} /><span>Buscar ou fazer</span><kbd>Ctrl K</kbd></button>
        </ComDica>
        <ComDica dica="Trilha de áudio sincronizada">
          <button type="button" className={`mapa-icone${painelRecurso === 'trilha' ? ' ativo' : ''}`} aria-label="Trilha da cena" onClick={() => setPainelRecurso((atual) => atual === 'trilha' ? null : 'trilha')}><Music2 size={17} /></button>
        </ComDica>
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
        <MenuMais
          variante="topo"
          icone={Monitor}
          rotulo="Exibição"
          grupos={gruposDeExibicao}
        />
        <ComDica dica={lateralAberta ? 'Recolher o painel' : 'Abrir o painel'}>
          <button type="button" className="mapa-icone" aria-label={lateralAberta ? 'Recolher o painel' : 'Abrir o painel'} onClick={() => setLateralAberta((v) => !v)}>
            {lateralAberta ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        </ComDica>
      </header>

      <nav className="mapa-ferramentas" aria-label="Ferramentas">
        <span className="mapa-grupo-rotulo">Mesa</span>
        <BotaoFerramenta icone={Hand} nome="Mover" rotulo="Mover tokens e o mapa" atalho="V" ativo={ferramenta === 'mover'} onClick={() => setFerramenta('mover')} />
        <BotaoFerramenta icone={Ruler} nome="Régua" rotulo="Régua" atalho="R" disabled={!podeRegua} ativo={ferramenta === 'regua'} onClick={() => setFerramenta('regua')} />
        <BotaoFerramenta icone={MapPin} nome="Ping" rotulo="Ping (ou Alt + clique)" atalho="P" disabled={!podePing} ativo={ferramenta === 'ping'} onClick={() => setFerramenta('ping')} />
        <BotaoFerramenta icone={Sparkles} nome="Magia" rotulo="Efeito de magia" atalho="M" disabled={!cena || !podeMagia} ativo={ferramenta === 'magia'} onClick={() => setFerramenta((f) => (f === 'magia' ? 'mover' : 'magia'))} />
        <BotaoFerramenta icone={Dices} nome="Dados" rotulo="Rolar dados" atalho="D" disabled={!campanhaId} ativo={dadosAbertos} onClick={() => setDadosAbertos((v) => !v)} />
        <span className="mapa-separador" />
        <span className="mapa-grupo-rotulo">Vista</span>
        <BotaoFerramenta icone={Expand} nome="Inteiro" rotulo="Ver o mapa inteiro" disabled={!cena} onClick={() => palcoRef.current?.enquadrar()} />
        {tokenDoHud && !gestor && (
          <BotaoFerramenta icone={UserRound} nome="Eu" rotulo="Ir até o meu personagem" onClick={() => centralizar(tokenDoHud)} />
        )}
        {selecionado && tokenSelecionado && (
          <BotaoFerramenta icone={Crosshair} nome="Centrar" rotulo="Centralizar no token escolhido" onClick={() => centralizar(tokenSelecionado)} />
        )}
        {gestor && (
          <>
            <span className="mapa-separador" />
            <span className="mapa-grupo-rotulo">Mestre</span>
            <BotaoFerramenta icone={Type} nome="Texto" rotulo="Escrever no mapa" atalho="T" disabled={!cena} ativo={ferramenta === 'texto'} onClick={() => setFerramenta((f) => (f === 'texto' ? 'mover' : 'texto'))} />
            <BotaoFerramenta icone={Eye} nome="Névoa" rotulo="Névoa de guerra" atalho="N" disabled={!cena} ativo={ferramenta === 'nevoa'} onClick={() => setFerramenta((f) => (f === 'nevoa' ? 'mover' : 'nevoa'))} />
            <BotaoFerramenta icone={Orbit} nome="Portais" rotulo="Portais" atalho="O" disabled={!cena} ativo={ferramenta === 'portal'} onClick={() => setFerramenta((f) => (f === 'portal' ? 'mover' : 'portal'))} />
          </>
        )}
        <span className="mapa-separador" />
        <span className="mapa-grupo-rotulo">{gestor ? 'Painéis' : 'Mais'}</span>
        {gestor ? (
          <>
            <MenuMais grupos={menuDaCena} icone={Clapperboard} nome="Cena" rotulo="Cena: camadas, grade, clima, hora e luz" />
            <MenuMais grupos={menuDaMesa} icone={UsersRound} nome="Mesa" rotulo="Mesa: jogadores, pausa, documentos e trilha" />
            <MenuMais grupos={menuDeMontar} icone={Hammer} nome="Montar" rotulo="Montar: participantes, Acervo, Construtor e Oficina" />
          </>
        ) : (
          <MenuMais grupos={menuDaMesa} icone={SlidersHorizontal} nome="Ajustes" rotulo="Ajustes: seu nome, camadas, encaixe, vista e trilha" />
        )}
      </nav>

      <main className="mapa-area">
        <div ref={alvoRef} className="mapa-palco" onDragOver={aoArrastarSobreOMapa} onDrop={aoSoltarNoMapa} />
        {!gestor && tokenDoHud && cena && campanhaId && !soMapa && (
          <HudDoJogador
            token={tokenDoHud}
            campanhaId={campanhaId}
            minhaVez={Boolean(tokenDaMinhaVez)}
            onMostrar={() => centralizar(tokenDoHud)}
            onFicha={() => mostrarNoPainel('fichas')}
            onEncerrarTurno={encerrarMeuTurno}
          />
        )}
        <AvisoDaVez
          chave={tokenDaMinhaVez ? chaveMovimentoTurno : ''}
          nome={tokenDoHud?.nome ?? ''}
          rodada={rodada}
          onMostrar={() => tokenDoHud && centralizar(tokenDoHud)}
        />
        {(soMapa || !ferramentasAbertas) && (
          <button
            type="button"
            className="mapa-alca mapa-alca-esquerda"
            aria-label={soMapa ? 'Mostrar a interface (tecla H)' : 'Mostrar as ferramentas'}
            title={soMapa ? 'Mostrar a interface (tecla H)' : 'Mostrar as ferramentas'}
            onClick={() => (soMapa ? setSoMapa(false) : setFerramentasAbertas(true))}
          >
            {soMapa ? <Focus size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        )}
        {!soMapa && !lateralAberta && (
          <button type="button" className="mapa-alca mapa-alca-direita" aria-label="Abrir o painel de iniciativa e fichas" title="Abrir o painel de iniciativa e fichas" onClick={() => setLateralAberta(true)}>
            <PanelRightOpen size={18} />
          </button>
        )}
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
        {dadosAbertos && campanhaId && !soMapa && (
          <BandejaDeDados
            campanhaId={campanhaId}
            personagemId={!gestor ? tokenDoHud?.personagem_id ?? null : null}
            nomeDeQuem={!gestor && tokenDoHud?.personagem_id ? tokenDoHud.nome : gestor ? 'Mestre' : 'você'}
            onFechar={() => setDadosAbertos(false)}
          />
        )}
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
        {gestor && cena && ferramenta === 'mover' && mapaEscolhido && (
          <BarraAncorada palco={obterPalco} alvo={{ tipo: 'mapa', id: mapaEscolhido.id }}>
            <BarraMapaColocado
              mapa={mapaEscolhido}
              tamanhoCasa={cena.grade.tamanho}
              onMudar={(edicao) => void editarMapaColocado(mapaEscolhido.id, edicao)}
              onOrdem={(acao) => void ordenarMapaColocado(mapaEscolhido.id, acao)}
              onDuplicar={() => void duplicarMapaColocado(mapaEscolhido.id)}
              onRenomear={() => void renomearMapaColocado(mapaEscolhido.id, mapaEscolhido.nome ?? 'Mapa')}
              onApagar={() => void apagarMapaColocado(mapaEscolhido.id)}
            />
          </BarraAncorada>
        )}
        {gestor && cena && !soMapa && (
          <DockAcervo
            gavetaAberta={acervoAberto}
            versao={versaoAcervo}
            onColocarMapa={(item) => void colocarMapa(item)}
            onPorNaCena={(item) => void porNaCena(item)}
            onAbrirAcervo={() => setAcervoAberto((v) => !v)}
            onFatiar={() => setFatiando(true)}
          />
        )}
        <PainelGrade
          aberto={gradeAberta}
          gestor={gestor}
          cena={cena}
          encaixe={encaixe}
          onEncaixe={setEncaixe}
          medirAoMover={medirAoMover}
          onMedirAoMover={setMedirAoMover}
          onPrever={(grade) => palcoRef.current?.previaGrade(grade)}
          onSalvarGrade={(grade) => cena && campanhaId && void comErro(() => mapaApi.editarCena(campanhaId, cena.id, { grade })).then((r) => r && setEstado(r))}
          onFechar={() => setGradeAberta(false)}
        />
        <PainelVista
          aberto={vistaAberta}
          seguirVista={seguirVista}
          onSeguirVista={setSeguirVista}
          lerVista={lerVistaDaTela}
          onIrParaVista={(vista) => palcoRef.current?.irParaVista(vista, false)}
          onReiniciarVista={() => palcoRef.current?.abrirNaVista()}
          podeSincronizar={conexao === 'ws' || conexao === 'sse'}
          onSincronizar={sincronizarVista}
          onFechar={() => setVistaAberta(false)}
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
        {tokenSelecionado && ferramenta === 'mover' && (
          <BarraAncorada palco={obterPalco} alvo={{ tipo: 'token', id: tokenSelecionado.id }}>
            <BarraToken
              token={tokenSelecionado}
              gestor={gestor}
              opcoesAbertas={menuTokenAberto}
              onOpcoes={() => {
                if (!menuTokenAberto) {
                  setPainelRecurso(null);
                  setPortaEscolhida(null);
                }
                setAbaDoMenuToken(undefined);
                setMenuTokenAberto((v) => !v);
              }}
              onNota={gestor ? () => {
                setPainelRecurso(null);
                setPortaEscolhida(null);
                setMenuTokenAberto(true);
              } : undefined}
              onOculto={ocultarToken}
              onRemover={() => void removerToken()}
              onFalar={gestor ? () => void falarComo(tokenSelecionado) : undefined}
              onRecurso={(tipo, dados) => void mexerNoRecursoDoToken(tipo, dados)}
              onRecipiente={() => void abrirRecipiente(tokenSelecionado)}
              acoesDeEstado={acoesDeEstadoDoToken(tokenSelecionado)}
              onEspelhar={() => void editarToken({ flip_x: !tokenSelecionado.flip_x })}
              onLoot={gestor ? () => {
                setPainelRecurso(null);
                setPortaEscolhida(null);
                setAbaDoMenuToken('loot');
                setMenuTokenAberto(true);
              } : undefined}
            />
          </BarraAncorada>
        )}
        {tokenSelecionado && menuTokenAberto && (
          <MenuToken
            token={tokenSelecionado}
            gestor={gestor}
            molduraMesa={estado?.moldura_mesa ?? null}
            onEditar={(dados) => void editarToken(dados)}
            onNota={(texto) => void salvarNotaDoToken(tokenSelecionado.id, texto)}
            onMoldura={(id) => void escolherMoldura(id)}
            onEnquadramento={(e) => void mudarEnquadramento(e)}
            onFechar={() => setMenuTokenAberto(false)}
            campanhaId={campanhaId}
            onArteMudou={() => void recarregar()}
            onEstado={setEstado}
            abaInicial={abaDoMenuToken}
          />
        )}
        {recipienteAberto && (() => {
          const dono = tokens.find((t) => t.id === recipienteAberto);
          if (!dono?.recipiente?.aberto) return null;
          // O Mestre escolhe entre todos os personagens da cena; o jogador, entre os próprios.
          const personagens = [...new Map(tokens
            .filter((t) => t.personagem_id && (gestor || t.e_meu))
            .map((t) => [t.personagem_id as string, { id: t.personagem_id as string, nome: t.nome }])).values()];
          return (
            <JanelaRecipiente
              token={dono}
              personagens={personagens}
              ocupado={recipienteOcupado}
              onPegar={(linhas, personagemId) => void pegarDoRecipiente(dono.id, linhas, personagemId)}
              onFechar={() => setRecipienteAberto(null)}
            />
          );
        })()}
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
          onColocarMapa={(item) => void colocarMapa(item)}
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

      {lateralAberta && !soMapa && (
        <button type="button" className="mapa-lateral-fundo" aria-label="Fechar o painel de iniciativa e fichas" onClick={() => setLateralAberta(false)} />
      )}

      {lateralAberta && !soMapa && (
        <aside className="mapa-lateral">
          <PainelLateral aba={aba} onAba={setAba} campanhaId={campanhaId ?? ''} tokens={tokens} onCentralizar={centralizar} />
        </aside>
      )}
      {atalhosAbertos && <FolhaDeAtalhos gestor={gestor} onFechar={() => setAtalhosAbertos(false)} />}
      {paletaAberta && <PaletaDeComandos comandos={comandosDaPaleta} onFechar={() => setPaletaAberta(false)} />}
      {contexto && itensDoContexto.length > 0 && (
        <MenuDeContexto
          x={contexto.x}
          y={contexto.y}
          titulo={tokenDoContexto ? tokenDoContexto.nome : 'Aqui no mapa'}
          itens={itensDoContexto}
          onFechar={() => setContexto(null)}
        />
      )}
      {tourAberto && (
        <GuidedTour
          key={gestor ? 'guia-mapa-mestre' : 'guia-mapa-jogador'}
          passos={obterPassosTourMapa(gestor)}
          accent="#c7a44c"
          nomeGuia="Guia do Mapa"
          rootSelector=".mapa-pagina"
          onClose={encerrarTour}
          onFinish={encerrarTour}
        />
      )}
      {fatiando && gestor && <FatiadorFolha onFechar={() => setFatiando(false)} onSalvo={() => setVersaoAcervo((v) => v + 1)} />}
    </div>
  );
};

export default MapaPage;
