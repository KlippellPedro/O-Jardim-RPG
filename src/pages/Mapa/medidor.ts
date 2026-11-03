// Medidor do tempo real do mapa: ida e volta até o servidor, diferença de relógio,
// quanto o arrasto dos outros demora para chegar e quanto a suavização segura, e
// quantas vezes o mapa inteiro foi recarregado. Só mede; quem mostra é o painel
// do Ctrl+Shift+D (componentes/Medidor.tsx). Todos os tempos estão em ms, no
// relógio deste aparelho (`performance.now() + performance.timeOrigin`).

export interface ResumoMedidor {
  conexao: string;
  idaEVolta: number | null;
  idaEVoltaPior: number | null;
  /** Hora do servidor menos a hora deste aparelho. */
  relogio: number | null;
  /** Do servidor até esta tela (mediana do último minuto). */
  redeAteVoce: number | null;
  /** Da mão de quem arrasta até o servidor. */
  quemMexeAteServidor: number | null;
  /** Quanto a interpolação segura o desenho, além da rede, para o movimento sair liso. */
  suavizacao: number | null;
  /** Da mão de quem arrasta até o token andar nesta tela. */
  atrasoTotal: number | null;
  movimentosPorSegundo: number;
  ultimaRecarga: number | null;
  recargasPorMinuto: number;
  /** Mudanças que o servidor mandou prontas (sem recarregar o mapa) no último minuto. */
  mudancasPorMinuto: number;
  /** Do servidor até esta tela, para essas mudanças (mediana). */
  mudancaChegaEm: number | null;
  quadrosPorSegundo: number | null;
  abaVisivel: boolean;
  abaEscondidaNoMinuto: number;
}

const JANELA_MS = 60_000;

function mediana(valores: number[]): number | null {
  if (!valores.length) return null;
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

const redondo = (valor: number | null) => (valor === null ? null : Math.round(valor));

export class Medidor {
  conexao = 'conectando';
  private idas: Array<{ quando: number; ms: number; relogio: number }> = [];
  private movimentos: Array<{ quando: number; rede: number | null; mao: number | null }> = [];
  private recargas: Array<{ quando: number; ms: number }> = [];
  private mudancas: Array<{ quando: number; atraso: number | null }> = [];
  private escondidas: number[] = [];

  private limpar(agora: number) {
    const corte = agora - JANELA_MS;
    this.idas = this.idas.filter((i) => i.quando >= corte);
    this.movimentos = this.movimentos.filter((m) => m.quando >= corte);
    this.recargas = this.recargas.filter((r) => r.quando >= corte);
    this.mudancas = this.mudancas.filter((m) => m.quando >= corte);
    this.escondidas = this.escondidas.filter((e) => e >= corte);
  }

  /** Resposta do batimento: `enviadoEm` é a hora que foi junto (`c`), `horaServidor` o `ts` do servidor. */
  registrarOi(enviadoEm: number, recebidoEm: number, horaServidor: number) {
    const ms = recebidoEm - enviadoEm;
    if (!(ms >= 0) || !Number.isFinite(horaServidor)) return;
    this.idas.push({ quando: recebidoEm, ms, relogio: horaServidor - (enviadoEm + ms / 2) });
    this.limpar(recebidoEm);
  }

  /** A diferença de relógio vem da ida e volta mais rápida do último minuto: é a que menos erra. */
  get relogio(): number | null {
    if (!this.idas.length) return null;
    return this.idas.reduce((melhor, i) => (i.ms < melhor.ms ? i : melhor)).relogio;
  }

  /** Hora do servidor agora, estimada; null antes do primeiro batimento. */
  horaDoServidor(agora: number): number | null {
    const relogio = this.relogio;
    return relogio === null ? null : agora + relogio;
  }

  /** Um movimento de token chegou: `ts` é a hora em que o servidor repassou, `tm` a hora do gesto. */
  registrarMovimento(agora: number, ts: number, tm?: number | null) {
    const relogio = this.relogio;
    this.movimentos.push({
      quando: agora,
      rede: relogio === null || !Number.isFinite(ts) ? null : agora + relogio - ts,
      mao: typeof tm === 'number' && Number.isFinite(tm) && Number.isFinite(ts) ? ts - tm : null,
    });
    this.limpar(agora);
  }

  /** Uma mudança pronta chegou; `ts` é a hora em que o servidor mandou. */
  registrarMudanca(agora: number, ts: number) {
    const relogio = this.relogio;
    this.mudancas.push({ quando: agora, atraso: relogio === null || !Number.isFinite(ts) ? null : agora + relogio - ts });
    this.limpar(agora);
  }

  registrarRecarga(agora: number, ms: number) {
    this.recargas.push({ quando: agora, ms });
    this.limpar(agora);
  }

  registrarAbaEscondida(agora: number) {
    this.escondidas.push(agora);
    this.limpar(agora);
  }

  /** `atrasoInterpolador` é o `Interpolador.atraso`, no relógio deste aparelho (inclui a diferença de relógio). */
  resumo(agora: number, atrasoInterpolador: number | null, quadrosPorSegundo: number | null, abaVisivel: boolean): ResumoMedidor {
    this.limpar(agora);
    const relogio = this.relogio;
    const idas = this.idas.map((i) => i.ms);
    const redes = this.movimentos.map((m) => m.rede).filter((v): v is number => v !== null);
    const maos = this.movimentos.map((m) => m.mao).filter((v): v is number => v !== null);
    const redeAteVoce = mediana(redes);
    const quemMexe = mediana(maos);
    // O interpolador desenha `atraso` atrás do relógio deste aparelho; somando a diferença de
    // relógio, fica quanto ele desenha atrás da hora do servidor.
    const atrasDoServidor = movimentosRecentes(this.movimentos, agora) && atrasoInterpolador !== null && relogio !== null
      ? atrasoInterpolador + relogio
      : null;
    return {
      conexao: this.conexao,
      idaEVolta: redondo(mediana(idas)),
      idaEVoltaPior: idas.length ? Math.round(Math.max(...idas)) : null,
      relogio: redondo(relogio),
      redeAteVoce: redondo(redeAteVoce),
      quemMexeAteServidor: redondo(quemMexe),
      suavizacao: atrasDoServidor !== null && redeAteVoce !== null ? Math.round(Math.max(0, atrasDoServidor - redeAteVoce)) : null,
      atrasoTotal: atrasDoServidor !== null && quemMexe !== null ? Math.round(atrasDoServidor + quemMexe) : null,
      movimentosPorSegundo: this.movimentos.filter((m) => m.quando >= agora - 1000).length,
      ultimaRecarga: this.recargas.length ? Math.round(this.recargas[this.recargas.length - 1].ms) : null,
      recargasPorMinuto: this.recargas.length,
      mudancasPorMinuto: this.mudancas.length,
      mudancaChegaEm: redondo(mediana(this.mudancas.map((m) => m.atraso).filter((v): v is number => v !== null))),
      quadrosPorSegundo,
      abaVisivel,
      abaEscondidaNoMinuto: this.escondidas.length,
    };
  }
}

/** A suavização só diz algo enquanto há arrasto chegando (os últimos 10 s). */
function movimentosRecentes(movimentos: Array<{ quando: number }>, agora: number): boolean {
  return movimentos.some((m) => m.quando >= agora - 10_000);
}
