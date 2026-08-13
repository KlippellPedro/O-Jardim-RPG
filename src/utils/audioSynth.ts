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
          { type: 'triangle', freqStart: 720, freqEnd: 520, duration: 0.045, gainPeak: 0.10 },
        ], volume);
        break;
      case 'hover':
        this.playSteps([
          { type: 'sine', freqStart: 980, duration: 0.03, gainPeak: 0.035, attack: 0.004 },
        ], volume);
        break;
      case 'select':
        this.playSteps([
          { type: 'triangle', freqStart: 860, freqEnd: 1040, duration: 0.06, gainPeak: 0.11 },
        ], volume);
        break;
      case 'navigate':
        this.playSteps([
          { type: 'sine', freqStart: 440, freqEnd: 660, duration: 0.12, gainPeak: 0.09 },
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
