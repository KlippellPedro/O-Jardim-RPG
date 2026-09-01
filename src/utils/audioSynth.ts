import { useAudioStore } from '../store/useAudioStore';

// Efeitos sonoros de interface disponíveis. Nomes semânticos - quem chama
// não precisa saber como o som é sintetizado nem em qual arquivo ele mora.
export type SfxName =
  | 'click'
  | 'hover'
  | 'select'
  | 'open'
  | 'close'
  | 'navigate'
  | 'confirm'
  | 'cancel'
  | 'error'
  | 'notification';

// Intervalo mínimo entre dois disparos do MESMO som, pra hover rápido,
// duplo-clique ou navegação em sequência nunca virarem uma matraca.
const MIN_INTERVAL_MS: Partial<Record<SfxName, number>> = {
  hover: 220,
  click: 45,
  select: 70,
  navigate: 150,
};
const DEFAULT_MIN_INTERVAL_MS = 30;

interface ToneStep {
  type: OscillatorType;
  freqStart: number;
  freqEnd?: number;
  /** Segundos após o início do efeito - para compor duas notas em sequência. */
  startOffset?: number;
  duration: number;
  gainPeak: number;
  attack?: number;
}

class AudioSynth {
  private ctx: AudioContext | null = null;
  private lastPlayedAt: Partial<Record<SfxName, number>> = {};

  private getContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private isThrottled(name: SfxName) {
    const min = MIN_INTERVAL_MS[name] ?? DEFAULT_MIN_INTERVAL_MS;
    const last = this.lastPlayedAt[name] ?? 0;
    const now = performance.now();
    if (now - last < min) return true;
    this.lastPlayedAt[name] = now;
    return false;
  }

  /** Lê a preferência global (ativado + volume). Retorna null quando o som
   * não deve tocar - único ponto que a config de áudio é consultada. */
  private currentVolume(): number | null {
    if (typeof window === 'undefined') return null;
    const { enabled, volume } = useAudioStore.getState();
    if (!enabled || volume <= 0) return null;
    return volume;
  }

  /** Toca uma sequência curta de tons sintetizados com envelope suave. */
  private playSteps(steps: ToneStep[], masterVolume: number) {
    const ctx = this.getContext();
    const start = ctx.currentTime;
    steps.forEach((step) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = start + (step.startOffset ?? 0);
      const attack = step.attack ?? 0.008;

      osc.type = step.type;
      osc.frequency.setValueAtTime(step.freqStart, t0);
      if (step.freqEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, step.freqEnd), t0 + step.duration);
      }

      const peak = Math.max(0.0001, step.gainPeak * masterVolume);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + step.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + step.duration + 0.02);
    });
  }

  /** Ponto único de entrada para efeitos de interface. */
  play(name: SfxName) {
    if (this.isThrottled(name)) return;
    const volume = this.currentVolume();
    if (volume === null) return;

    switch (name) {
      case 'click':
        this.playSteps([
          { type: 'triangle', freqStart: 360, freqEnd: 300, duration: 0.045, gainPeak: 0.055 },
          { type: 'sine', freqStart: 520, freqEnd: 440, duration: 0.05, startOffset: 0.008, gainPeak: 0.022 },
        ], volume);
        break;
      case 'hover':
        this.playSteps([
          { type: 'sine', freqStart: 980, duration: 0.03, gainPeak: 0.035, attack: 0.004 },
        ], volume);
        break;
      case 'select':
        this.playSteps([
          { type: 'sine', freqStart: 390, freqEnd: 330, duration: 0.055, gainPeak: 0.05 },
          { type: 'sine', freqStart: 520, freqEnd: 460, duration: 0.06, startOffset: 0.01, gainPeak: 0.022 },
        ], volume);
        break;
      case 'navigate':
        this.playSteps([
          { type: 'triangle', freqStart: 300, freqEnd: 260, duration: 0.065, gainPeak: 0.045 },
          { type: 'sine', freqStart: 450, freqEnd: 390, duration: 0.075, startOffset: 0.012, gainPeak: 0.025 },
        ], volume);
        break;
      case 'open':
        this.playSteps([
          { type: 'sine', freqStart: 500, freqEnd: 720, duration: 0.09, gainPeak: 0.10 },
          { type: 'sine', freqStart: 720, freqEnd: 980, duration: 0.11, startOffset: 0.05, gainPeak: 0.08 },
        ], volume);
        break;
      case 'close':
        this.playSteps([
          { type: 'sine', freqStart: 720, freqEnd: 480, duration: 0.09, gainPeak: 0.09 },
          { type: 'sine', freqStart: 480, freqEnd: 320, duration: 0.11, startOffset: 0.04, gainPeak: 0.07 },
        ], volume);
        break;
      case 'confirm':
        this.playSteps([
          { type: 'sine', freqStart: 523.25, duration: 0.14, gainPeak: 0.12 }, // C5
          { type: 'sine', freqStart: 659.25, duration: 0.18, startOffset: 0.03, gainPeak: 0.12 }, // E5
        ], volume);
        break;
      case 'cancel':
        this.playSteps([
          { type: 'triangle', freqStart: 440, freqEnd: 300, duration: 0.11, gainPeak: 0.09 },
        ], volume);
        break;
      case 'error':
        this.playSteps([
          { type: 'sawtooth', freqStart: 180, freqEnd: 110, duration: 0.09, gainPeak: 0.10 },
          { type: 'sawtooth', freqStart: 150, freqEnd: 90, duration: 0.12, startOffset: 0.09, gainPeak: 0.09 },
        ], volume);
        break;
      case 'notification':
        this.playSteps([
          { type: 'sine', freqStart: 783.99, duration: 0.16, gainPeak: 0.10 }, // G5
          { type: 'sine', freqStart: 1046.5, duration: 0.22, startOffset: 0.06, gainPeak: 0.08 }, // C6
        ], volume);
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────────
  // Sons de gameplay (rolagem de dados) - já existiam antes deste
  // sistema; passam a respeitar a mesma preferência de ativado/volume.
  // ──────────────────────────────────────────────────────────────────

  playDiceClack() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + Math.random() * 200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5 * volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  // Chime celestial para o Crítico (20)
  playCritSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Acorde majestoso (Tônica e Quinta)
    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3 * volume, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 2.5);
    osc2.stop(ctx.currentTime + 2.5);
  }

  // ──────────────────────────────────────────────────────────────────
  // Sons do Cassino do Gambler - fichas, câmbio e resultado das apostas.
  // ──────────────────────────────────────────────────────────────────

  /** Ficha caindo na mesa: usado ao confirmar aposta, dobrar ou trocar personagem de mesa. */
  playChipSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [0, 0.045].forEach((offset, indice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + offset;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(indice === 0 ? 720 : 540, t0);
      osc.frequency.exponentialRampToValueAtTime(indice === 0 ? 380 : 260, t0 + 0.06);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.16 * volume, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.1);
    });
  }

  /** Moedas caindo no caixa: câmbio e resgate de fichas. */
  playCoinsSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [1300, 1550, 1780, 2050].forEach((freq, indice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + indice * 0.045;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.09 * volume, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.15);
    });
  }

  /** Arpejo curto e alegre para uma vitória comum na mesa. */
  playWinSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [523.25, 659.25, 783.99].forEach((freq, indice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + indice * 0.07;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.14 * volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.34);
    });
  }

  /** Fanfarra maior para vitórias grandes (lucro alto numa única rodada). */
  playBigWinSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, indice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + indice * 0.09;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.12 * volume, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });
    // Segunda voz uma oitava acima, mais baixa, pra dar corpo de fanfarra.
    [1046.5, 1318.5, 1567.98, 2093].forEach((freq, indice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + indice * 0.09;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.05 * volume, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.55);
    });
  }

  /** Queda curta e discreta para uma derrota comum - sem drama, é só a mesa seguindo. */
  playLoseSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(310, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(170, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08 * volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.26);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);
  }

  // ──────────────────────────────────────────────────────────────────
  // Som de cada jogo do Cassino do Gambler, tocado enquanto a mesa decide
  // (durante o suspense) - cada mesa tem o seu próprio barulho.
  // ──────────────────────────────────────────────────────────────────

  /** Dados chacoalhando antes de parar - Dados da Inconstância. */
  playDiceRollSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const batidas = 5;
    for (let i = 0; i < batidas; i++) {
      const t0 = ctx.currentTime + i * 0.07 + Math.random() * 0.02;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freq = 380 + Math.random() * 260;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t0 + 0.045);
      const pico = Math.max(0.02, (0.16 - i * 0.02) * volume);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(pico, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.09);
    }
  }

  /** Roda girando e freando aos poucos - Roda das Dez Forças. */
  playWheelSpinSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const cliques = 7;
    let tempo = 0;
    for (let i = 0; i < cliques; i++) {
      tempo += 0.04 + i * 0.011;
      const t0 = ctx.currentTime + tempo;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.05 * volume, t0 + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.035);
    }
  }

  /** Duas batidas de relógio - Sucessão de Chronus. */
  playClockTickSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [0, 0.32].forEach((offset, indice) => {
      const t0 = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(indice === 0 ? 1200 : 900, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.09 * volume, t0 + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.06);
    });
  }

  /** Quatro plinks descendo, um por desvio - Queda Livre. */
  playPlinkoSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [1500, 1250, 1050, 850].forEach((freq, indice) => {
      const t0 = ctx.currentTime + indice * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.1 * volume, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.18);
    });
  }

  /** Três notas subindo, um brilho por pergaminho revelado - Pergaminhos do Acaso. */
  playScrollRevealSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [660, 880, 1100].forEach((freq, indice) => {
      const t0 = ctx.currentTime + indice * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.09 * volume, t0 + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  /** Duas cartas batendo na mesa e um tim metálico de decisão - Duelo do Vazio. */
  playCardDuelSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    [0, 0.09].forEach((offset) => {
      const t0 = ctx.currentTime + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, t0);
      osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.05);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.13 * volume, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.07);
    });
    const t1 = ctx.currentTime + 0.16;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t1);
    gain.gain.setValueAtTime(0, t1);
    gain.gain.linearRampToValueAtTime(0.08 * volume, t1 + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t1 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t1);
    osc.stop(t1 + 0.32);
  }

  /** Estalo seco de carta virando - Vinte-e-Um, uma vez por carta comprada. */
  playCardFlipSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.14 * volume, ctx.currentTime + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }

  // Baixo abafado para o Desastre (1)
  playDisasterSound() {
    const volume = this.currentVolume();
    if (volume === null) return;
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.0);

    // Efeito tremolo sombrio (LFO)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start();
    lfo.stop(ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4 * volume, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  }
}

export const sfx = new AudioSynth();
