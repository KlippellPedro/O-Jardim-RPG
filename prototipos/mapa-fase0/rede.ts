// Rede de mentira entre o palco do Mestre e o do Jogador: atraso, variação e
// envios por segundo ajustáveis. A ordem se mantém, como numa conexão
// WebSocket de verdade (TCP não troca a ordem das mensagens).

export interface Amostra {
  id: string;
  t: number;
  x: number;
  y: number;
  final?: boolean;
}

export interface ConfigRede {
  latencia: number;
  variacao: number;
  porSegundo: number;
}

export class RedeSimulada {
  enviados = 0;
  private ultimaEntrega = 0;
  private ultimoEnvio = new Map<string, number>();

  constructor(public config: ConfigRede, private entregar: (amostra: Amostra) => void) {}

  /** Durante o arrasto: respeita o limite de envios por segundo. */
  arrastando(id: string, x: number, y: number) {
    const agora = performance.now();
    if (agora - (this.ultimoEnvio.get(id) ?? 0) < 1000 / this.config.porSegundo) return;
    this.ultimoEnvio.set(id, agora);
    this.enviar({ id, t: agora, x, y });
  }

  /** Ao soltar: a posição final sempre vai, fora do limite. */
  soltou(id: string, x: number, y: number) {
    this.ultimoEnvio.delete(id);
    this.enviar({ id, t: performance.now(), x, y, final: true });
  }

  private enviar(amostra: Amostra) {
    this.enviados++;
    const atraso = this.config.latencia + (Math.random() * 2 - 1) * this.config.variacao;
    const quando = Math.max(this.ultimaEntrega, performance.now() + Math.max(0, atraso));
    this.ultimaEntrega = quando;
    setTimeout(() => this.entregar(amostra), quando - performance.now());
  }
}

/**
 * Do lado de quem assiste: desenha o token um pouco no passado e liga as
 * amostras. O quanto no passado se ajusta à rede (atraso mínimo + variação +
 * intervalo entre envios), como um buffer de áudio: assim nunca falta a
 * próxima amostra e o token não para e pula.
 */
export class Interpolador {
  private amostras = new Map<string, Amostra[]>();
  /** Chegada menos envio dos últimos 3 s (inclui diferença de relógio). */
  private chegadas: Array<{ quando: number; valor: number }> = [];
  private intervalos: number[] = [];

  constructor(public ligado = true, private folga = 15) {}

  receber(amostra: Amostra) {
    const lista = this.amostras.get(amostra.id) ?? [];
    const anterior = lista[lista.length - 1];
    lista.push(amostra);
    if (lista.length > 60) lista.splice(0, lista.length - 60);
    this.amostras.set(amostra.id, lista);
    const agora = performance.now();
    this.chegadas.push({ quando: agora, valor: agora - amostra.t });
    while (this.chegadas.length > 1 && agora - this.chegadas[0].quando > 3000) this.chegadas.shift();
    if (anterior && !anterior.final) {
      this.intervalos.push(amostra.t - anterior.t);
      if (this.intervalos.length > 30) this.intervalos.shift();
    }
  }

  ids() {
    return this.amostras.keys();
  }

  /** Quanto atrás do relógio de quem envia o jogador está desenhando agora. */
  get atrasoDeExibicao(): number {
    if (!this.chegadas.length) return 150;
    const maiorChegada = Math.max(...this.chegadas.map((c) => c.valor));
    const maiorIntervalo = this.intervalos.length ? Math.max(...this.intervalos) : 50;
    return maiorChegada + maiorIntervalo + this.folga;
  }

  posicao(id: string, agora: number): { x: number; y: number } | null {
    const lista = this.amostras.get(id);
    if (!lista?.length) return null;
    if (!this.ligado) return lista[lista.length - 1];
    const alvo = agora - this.atrasoDeExibicao;
    if (alvo <= lista[0].t) return lista[0];
    for (let i = lista.length - 1; i >= 0; i--) {
      const a = lista[i];
      if (a.t > alvo) continue;
      const b = lista[i + 1];
      if (!b) return a;
      const k = (alvo - a.t) / (b.t - a.t);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    return lista[0];
  }
}
