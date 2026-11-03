// Conexão em tempo real do mapa. Tenta WebSocket; se ele não abrir, cai no
// plano B (SSE para descer, POST para subir) com as mesmas mensagens, e de
// tempos em tempos tenta voltar ao WebSocket (numa troca de versão do servidor,
// o WebSocket falha por uns minutos e depois volta a passar). Também guarda o
// Interpolador, que desenha o token arrastado por outra pessoa um pouco no
// passado e liga as posições, para ele deslizar em vez de pular.

import { lerCookie } from '../../services/apiClient';

export type EstadoConexao = 'conectando' | 'ws' | 'sse' | 'offline';

export interface MensagemMapa {
  t: string;
  [campo: string]: unknown;
}

interface Opcoes {
  aoMensagem: (mensagem: MensagemMapa) => void;
  aoEstado: (estado: EstadoConexao) => void;
  /** Reconectou depois de cair: a página refaz o GET, porque pode ter perdido mudanças. */
  aoReconectar: () => void;
}

/** O batimento mantém a conexão viva no proxy e mede a ida e volta (o servidor devolve `c`). */
const BATIMENTO_MS = 5_000;
const ESPERA_MAXIMA_MS = 15_000;
const LOTE_POST_MS = 60;
/** No plano B, a cada tanto tenta o WebSocket de novo. */
const SONDA_WS_MS = 30_000;

export const agoraLocal = () => performance.now() + performance.timeOrigin;

export class ConexaoMapa {
  private ws: WebSocket | null = null;
  private fonte: EventSource | null = null;
  private conexaoSse: string | null = null;
  private lote: MensagemMapa[] = [];
  private loteTimer: number | null = null;
  private batimento: number | null = null;
  private religar: number | null = null;
  private sonda: number | null = null;
  private tentativas = 0;
  private falhasSemAbrir = 0;
  private abriuAlgumaVez = false;
  private fechada = false;
  private campanhaId: string;
  private opcoes: Opcoes;

  constructor(campanhaId: string, opcoes: Opcoes) {
    this.campanhaId = campanhaId;
    this.opcoes = opcoes;
  }

  conectar() {
    this.fechada = false;
    this.opcoes.aoEstado('conectando');
    // Dois WebSockets que nunca abriram seguidos: o caminho não deixa passar, vai de SSE.
    if (this.falhasSemAbrir >= 2) this.abrirSse();
    else this.abrirWs();
  }

  fechar() {
    this.fechada = true;
    this.limparTimers();
    this.ws?.close();
    this.fonte?.close();
    this.ws = null;
    this.fonte = null;
  }

  enviar(mensagem: MensagemMapa) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(mensagem));
      return;
    }
    if (this.fonte && this.conexaoSse) {
      // Posições intermediárias do mesmo token: só a última do lote importa.
      if (mensagem.t === 'arrastar') this.lote = this.lote.filter((m) => !(m.t === 'arrastar' && m.token === mensagem.token));
      this.lote.push(mensagem);
      if (this.loteTimer === null) this.loteTimer = window.setTimeout(() => void this.despacharLote(), LOTE_POST_MS);
    }
  }

  get aberta(): boolean {
    return (this.ws?.readyState === WebSocket.OPEN) || (this.fonte !== null && this.conexaoSse !== null);
  }

  private enderecoWs(): string {
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocolo}://${location.host}/api/v1/mapa/${this.campanhaId}/ws`;
  }

  private comecarBatimento() {
    if (this.batimento !== null) window.clearInterval(this.batimento);
    const bater = () => this.enviar({ t: 'oi', c: agoraLocal() });
    bater();
    this.batimento = window.setInterval(bater, BATIMENTO_MS);
  }

  /** No plano B: abre um WebSocket de teste; se ele passar, sai do plano B e volta ao WebSocket. */
  private sondarWs() {
    if (this.sonda !== null || this.fechada) return;
    this.sonda = window.setTimeout(() => {
      this.sonda = null;
      if (this.fechada || !this.fonte) return;
      const teste = new WebSocket(this.enderecoWs());
      let abriu = false;
      teste.onopen = () => {
        abriu = true;
        teste.close();
        if (this.fechada || !this.fonte) return;
        this.fonte.close();
        this.fonte = null;
        this.conexaoSse = null;
        this.lote = [];
        this.limparTimers();
        this.falhasSemAbrir = 0;
        this.abrirWs();
      };
      teste.onclose = () => {
        if (!abriu) this.sondarWs();
      };
    }, SONDA_WS_MS);
  }

  private abrirWs() {
    const ws = new WebSocket(this.enderecoWs());
    this.ws = ws;
    let abriu = false;
    ws.onopen = () => {
      abriu = true;
      this.falhasSemAbrir = 0;
      this.tentativas = 0;
      this.opcoes.aoEstado('ws');
      if (this.abriuAlgumaVez) this.opcoes.aoReconectar();
      this.abriuAlgumaVez = true;
      this.comecarBatimento();
    };
    ws.onmessage = (evento) => this.receber(evento.data);
    ws.onclose = (evento) => {
      this.limparTimers();
      if (this.ws === ws) this.ws = null;
      if (this.fechada) return;
      // 4401/4403/4404: o servidor recusou (sessão não está ao vivo, sem acesso). Não insiste rápido.
      const recusado = evento.code >= 4000 && evento.code < 5000;
      if (!abriu && !recusado) this.falhasSemAbrir++;
      this.agendarReconexao(recusado);
    };
  }

  private abrirSse() {
    const fonte = new EventSource(`/api/v1/mapa/${this.campanhaId}/ao-vivo`, { withCredentials: true });
    this.fonte = fonte;
    fonte.onmessage = (evento) => this.receber(evento.data);
    fonte.onerror = () => {
      if (this.fechada) return;
      fonte.close();
      if (this.fonte === fonte) this.fonte = null;
      this.conexaoSse = null;
      this.agendarReconexao(false);
    };
  }

  private receber(texto: string) {
    let mensagem: MensagemMapa;
    try {
      mensagem = JSON.parse(texto);
    } catch {
      return;
    }
    if (mensagem.t === 'oi' && typeof mensagem.conexao === 'string') {
      this.conexaoSse = mensagem.conexao;
      this.tentativas = 0;
      this.opcoes.aoEstado('sse');
      if (this.abriuAlgumaVez) this.opcoes.aoReconectar();
      this.abriuAlgumaVez = true;
      this.comecarBatimento();
      this.sondarWs();
    }
    this.opcoes.aoMensagem(mensagem);
  }

  private async despacharLote() {
    this.loteTimer = null;
    const mensagens = this.lote;
    this.lote = [];
    if (!mensagens.length || !this.conexaoSse) return;
    const csrf = lerCookie('oj_csrf');
    try {
      const resposta = await fetch(`/api/v1/mapa/${this.campanhaId}/ao-vivo/${this.conexaoSse}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
        body: JSON.stringify({ mensagens }),
      });
      if (!resposta.ok) return;
      const corpo = await resposta.json();
      for (const item of corpo.respostas ?? []) this.opcoes.aoMensagem(item);
    } catch {
      // Sem rede: a reconexão do SSE cuida, e a posição final vai de novo ao soltar.
    }
  }

  private agendarReconexao(devagar: boolean) {
    this.opcoes.aoEstado('offline');
    this.tentativas++;
    const espera = Math.min(ESPERA_MAXIMA_MS, (devagar ? 4000 : 800) * 2 ** Math.min(this.tentativas - 1, 4));
    this.religar = window.setTimeout(() => this.conectar(), espera);
  }

  private limparTimers() {
    if (this.batimento !== null) window.clearInterval(this.batimento);
    if (this.religar !== null) window.clearTimeout(this.religar);
    if (this.loteTimer !== null) window.clearTimeout(this.loteTimer);
    if (this.sonda !== null) window.clearTimeout(this.sonda);
    this.batimento = null;
    this.religar = null;
    this.loteTimer = null;
    this.sonda = null;
  }
}

export interface Amostra {
  t: number;
  x: number;
  y: number;
  /** A posição de quando o token foi solto: depois dela o token não segue em frente. */
  final?: boolean;
}

/** Valor no percentil `p` (0 a 1) de uma lista; null se vazia. */
export function percentil(valores: number[], p: number): number | null {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.min(ordenados.length - 1, Math.floor(p * ordenados.length))];
}

/** Abaixo disto, poucas chegadas para confiar num percentil: vale a pior. */
const MINIMO_PARA_PERCENTIL = 8;
/** Diferença de colchão que o relógio do desenho ignora: o percentil oscila uns milissegundos à toa. */
const ZONA_MORTA_MS = 8;
/** Fora da zona morta, o relógio corrige a diferença em cerca deste tempo... */
const CORRECAO_MS = 500;
/** ...andando no máximo 10% mais rápido, ou até 30% mais devagar quando a rede piora. */
const ACELERACAO_MAXIMA = 0.1;
const FREIO_MAXIMO = 0.3;
/** Sem desenhar por mais que isto (nenhum arrasto chegando), o relógio recomeça do colchão certo. */
const RECOMECO_MS = 500;
/** Faltou a próxima posição (um pico na rede): o token segue na direção em que ia por até
 * um intervalo e meio entre envios, e nunca mais que isto. */
const EXTRAPOLACAO_MS = 100;

/**
 * Desenha o token de outra pessoa um pouco no passado e liga as amostras.
 * O quanto no passado se ajusta à rede: o atraso de chegada no percentil 95 dos
 * últimos 3 s, mais o intervalo entre envios no percentil 90, mais uma folga.
 * Um pico isolado não segura mais o desenho pelos 3 s seguintes.
 *
 * O relógio do desenho só anda para a frente: quando o colchão muda, ele acelera
 * ou freia de leve, na proporção da diferença, até alcançar. O token nunca recua
 * nem muda de velocidade de repente. Se a próxima posição atrasa (um pico na
 * rede), ele segue na direção em que ia por até 100 ms; quem arrasta reenvia a
 * posição quando a mão para, então parar não vira deslize.
 */
export class Interpolador {
  private amostras = new Map<string, Amostra[]>();
  private chegadas: Array<{ quando: number; valor: number }> = [];
  private intervalos: number[] = [];
  private folga: number;
  private desenho: { agora: number; alvo: number } | null = null;

  constructor(folga = 15) {
    this.folga = folga;
  }

  /** `t` é o relógio do servidor; a diferença para o relógio local entra no atraso medido. */
  receber(id: string, amostra: Amostra, agora = performance.now() + performance.timeOrigin) {
    const lista = this.amostras.get(id) ?? [];
    const anterior = lista[lista.length - 1];
    if (anterior && amostra.t <= anterior.t) return;
    lista.push(amostra);
    if (lista.length > 60) lista.splice(0, lista.length - 60);
    this.amostras.set(id, lista);
    this.chegadas.push({ quando: agora, valor: agora - amostra.t });
    while (this.chegadas.length > 1 && agora - this.chegadas[0].quando > 3000) this.chegadas.shift();
    if (anterior) {
      this.intervalos.push(amostra.t - anterior.t);
      if (this.intervalos.length > 30) this.intervalos.shift();
    }
  }

  /** O colchão que a rede pede agora (o relógio do desenho caminha até ele). */
  get atraso(): number {
    if (!this.chegadas.length) return 150;
    const valores = this.chegadas.map((c) => c.valor);
    const chegada = valores.length < MINIMO_PARA_PERCENTIL ? Math.max(...valores) : percentil(valores, 0.95)!;
    const intervalo = this.intervalos.length < MINIMO_PARA_PERCENTIL
      ? (this.intervalos.length ? Math.max(...this.intervalos) : 50)
      : percentil(this.intervalos, 0.9)!;
    return chegada + Math.min(250, intervalo) + this.folga;
  }

  ativos(): string[] {
    return [...this.amostras.keys()];
  }

  esquecer(id: string) {
    this.amostras.delete(id);
  }

  /** A hora (no relógio das amostras) desenhada neste quadro; a mesma para todos os tokens. */
  private alvo(agora: number): number {
    const desejado = agora - this.atraso;
    const anterior = this.desenho;
    if (!anterior || agora - anterior.agora > RECOMECO_MS || agora < anterior.agora) {
      this.desenho = { agora, alvo: desejado };
      return desejado;
    }
    if (agora === anterior.agora) return anterior.alvo;
    const passo = agora - anterior.agora;
    const diferenca = desejado - (anterior.alvo + passo);
    const ajuste = Math.abs(diferenca) < ZONA_MORTA_MS
      ? 0
      : Math.max(-FREIO_MAXIMO, Math.min(ACELERACAO_MAXIMA, diferenca / CORRECAO_MS));
    const alvo = anterior.alvo + passo * (1 + ajuste);
    this.desenho = { agora, alvo };
    return alvo;
  }

  /** Posição para desenhar agora; `terminou` quando a última amostra já foi alcançada. */
  posicao(id: string, agora = performance.now() + performance.timeOrigin): { x: number; y: number; terminou: boolean } | null {
    const lista = this.amostras.get(id);
    if (!lista?.length) return null;
    const alvo = this.alvo(agora);
    if (alvo <= lista[0].t) return { x: lista[0].x, y: lista[0].y, terminou: false };
    for (let i = lista.length - 1; i >= 0; i--) {
      const a = lista[i];
      if (a.t > alvo) continue;
      const b = lista[i + 1];
      if (!b) return this.adiante(lista, alvo);
      const k = (alvo - a.t) / (b.t - a.t);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, terminou: false };
    }
    return { x: lista[0].x, y: lista[0].y, terminou: false };
  }

  /** Passou da última posição recebida: segue um pouco na mesma direção, ou para nela. */
  private adiante(lista: Amostra[], alvo: number): { x: number; y: number; terminou: boolean } {
    const ultima = lista[lista.length - 1];
    const anterior = lista[lista.length - 2];
    const intervalo = this.intervalos.length ? percentil(this.intervalos, 0.5)! : 50;
    if (ultima.final || !anterior || ultima.t - anterior.t > intervalo * 3 || ultima.t <= anterior.t) {
      return { x: ultima.x, y: ultima.y, terminou: true };
    }
    // Segue um pouco e espera ali: voltar para a última posição seria um recuo na tela.
    const limite = Math.min(EXTRAPOLACAO_MS, intervalo * 1.5);
    const passou = alvo - ultima.t;
    const k = Math.min(passou, limite) / (ultima.t - anterior.t);
    return { x: ultima.x + (ultima.x - anterior.x) * k, y: ultima.y + (ultima.y - anterior.y) * k, terminou: passou > limite };
  }
}
