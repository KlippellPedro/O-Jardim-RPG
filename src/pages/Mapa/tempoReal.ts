// Conexão em tempo real do mapa. Tenta WebSocket; se ele não abrir, cai no
// plano B (SSE para descer, POST para subir) com as mesmas mensagens. Também
// guarda o Interpolador, que desenha o token arrastado por outra pessoa um
// pouco no passado e liga as posições, para ele deslizar em vez de pular.

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

const BATIMENTO_MS = 20_000;
const ESPERA_MAXIMA_MS = 15_000;
const LOTE_POST_MS = 60;

export class ConexaoMapa {
  private ws: WebSocket | null = null;
  private fonte: EventSource | null = null;
  private conexaoSse: string | null = null;
  private lote: MensagemMapa[] = [];
  private loteTimer: number | null = null;
  private batimento: number | null = null;
  private religar: number | null = null;
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

  private abrirWs() {
    const protocolo = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocolo}://${location.host}/api/v1/mapa/${this.campanhaId}/ws`);
    this.ws = ws;
    let abriu = false;
    ws.onopen = () => {
      abriu = true;
      this.falhasSemAbrir = 0;
      this.tentativas = 0;
      this.opcoes.aoEstado('ws');
      if (this.abriuAlgumaVez) this.opcoes.aoReconectar();
      this.abriuAlgumaVez = true;
      this.batimento = window.setInterval(() => this.enviar({ t: 'oi' }), BATIMENTO_MS);
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
    this.batimento = null;
    this.religar = null;
    this.loteTimer = null;
  }
}

export interface Amostra {
  t: number;
  x: number;
  y: number;
}

/**
 * Desenha o token de outra pessoa um pouco no passado e liga as amostras.
 * O quanto no passado se ajusta à rede: maior atraso de chegada dos últimos
 * 3 s, mais o maior intervalo entre envios, mais uma folga. Medido na fase 0:
 * liso como na tela de quem arrasta, uns 200 ms atrás numa rede comum.
 */
export class Interpolador {
  private amostras = new Map<string, Amostra[]>();
  private chegadas: Array<{ quando: number; valor: number }> = [];
  private intervalos: number[] = [];
  private folga: number;

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

  get atraso(): number {
    if (!this.chegadas.length) return 150;
    const chegada = Math.max(...this.chegadas.map((c) => c.valor));
    const intervalo = this.intervalos.length ? Math.min(250, Math.max(...this.intervalos)) : 50;
    return chegada + intervalo + this.folga;
  }

  ativos(): string[] {
    return [...this.amostras.keys()];
  }

  esquecer(id: string) {
    this.amostras.delete(id);
  }

  /** Posição para desenhar agora; `terminou` quando a última amostra já foi alcançada. */
  posicao(id: string, agora = performance.now() + performance.timeOrigin): { x: number; y: number; terminou: boolean } | null {
    const lista = this.amostras.get(id);
    if (!lista?.length) return null;
    const alvo = agora - this.atraso;
    if (alvo <= lista[0].t) return { x: lista[0].x, y: lista[0].y, terminou: false };
    for (let i = lista.length - 1; i >= 0; i--) {
      const a = lista[i];
      if (a.t > alvo) continue;
      const b = lista[i + 1];
      if (!b) return { x: a.x, y: a.y, terminou: true };
      const k = (alvo - a.t) / (b.t - a.t);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, terminou: false };
    }
    return { x: lista[0].x, y: lista[0].y, terminou: false };
  }
}
