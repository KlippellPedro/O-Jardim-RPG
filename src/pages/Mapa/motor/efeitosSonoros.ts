// Efeitos sonoros pontuais da mesa: trovão, sino, porta batendo, susto... O Mestre aperta um botão e a mesa inteira ouve ao
// mesmo tempo. Nenhum arquivo de áudio: cada som é sintetizado na hora pelo navegador (WebAudio), então não há o que baixar,
// o que licenciar nem o que guardar. A lista de ids é a mesma do servidor (core/mapa.py, EFEITOS_SONOROS); um teste trava os dois.

export interface IEfeitoSonoro {
  id: string;
  rotulo: string;
  dica: string;
}

export const EFEITOS_SONOROS: readonly IEfeitoSonoro[] = [
  { id: 'trovao', rotulo: 'Trovão', dica: 'Um estrondo grave que rola pelo céu' },
  { id: 'sino', rotulo: 'Sino', dica: 'Uma badalada longa de bronze' },
  { id: 'porta', rotulo: 'Porta batendo', dica: 'Madeira pesada fechando de uma vez' },
  { id: 'pancada', rotulo: 'Pancada', dica: 'Um golpe seco, de soco ou de martelo' },
  { id: 'explosao', rotulo: 'Explosão', dica: 'Estouro com um rugido que se afasta' },
  { id: 'aco', rotulo: 'Aço contra aço', dica: 'Duas lâminas que se encontram' },
  { id: 'moedas', rotulo: 'Moedas', dica: 'Prata tilintando na mão' },
  { id: 'alarme', rotulo: 'Alarme', dica: 'Um aviso agudo que se repete' },
  { id: 'magia', rotulo: 'Magia', dica: 'Um brilho que sobe e se espalha' },
  { id: 'gota', rotulo: 'Gota d’água', dica: 'Pingos numa caverna silenciosa' },
  { id: 'susto', rotulo: 'Susto', dica: 'Um acorde torto, de repente' },
  { id: 'coracao', rotulo: 'Batimentos', dica: 'O coração acelerando, para a tensão' },
];

export const efeitoSonoroPorId = (id: string): IEfeitoSonoro | undefined => EFEITOS_SONOROS.find((efeito) => efeito.id === id);

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  try {
    const Construtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Construtor) return null;
    contexto ??= new Construtor();
    if (contexto.state === 'suspended') void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

type Saida = { ctx: AudioContext; destino: AudioNode; t0: number };

/** Ruído branco de `duracao` segundos. */
function ruido({ ctx }: Saida, duracao: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duracao)), ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
  const fonte = ctx.createBufferSource();
  fonte.buffer = buffer;
  return fonte;
}

/** Um ganho que sobe rápido até `pico` e cai até silêncio em `duracao`. */
function envelope({ ctx, t0 }: Saida, inicio: number, duracao: number, pico: number, subida = 0.005): GainNode {
  const ganho = ctx.createGain();
  ganho.gain.setValueAtTime(0.0001, t0 + inicio);
  ganho.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t0 + inicio + subida);
  ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + inicio + duracao);
  return ganho;
}

function tom(s: Saida, tipo: OscillatorType, freqInicio: number, freqFim: number, inicio: number, duracao: number, pico: number) {
  const { ctx, destino, t0 } = s;
  const oscilador = ctx.createOscillator();
  oscilador.type = tipo;
  oscilador.frequency.setValueAtTime(freqInicio, t0 + inicio);
  if (freqFim !== freqInicio) oscilador.frequency.exponentialRampToValueAtTime(freqFim, t0 + inicio + duracao);
  const ganho = envelope(s, inicio, duracao, pico);
  oscilador.connect(ganho).connect(destino);
  oscilador.start(t0 + inicio);
  oscilador.stop(t0 + inicio + duracao + 0.05);
}

function sopro(s: Saida, filtro: BiquadFilterType, freqInicio: number, freqFim: number, inicio: number, duracao: number, pico: number) {
  const { ctx, destino, t0 } = s;
  const fonte = ruido(s, duracao + 0.1);
  const f = ctx.createBiquadFilter();
  f.type = filtro;
  f.frequency.setValueAtTime(freqInicio, t0 + inicio);
  if (freqFim !== freqInicio) f.frequency.exponentialRampToValueAtTime(freqFim, t0 + inicio + duracao);
  fonte.connect(f).connect(envelope(s, inicio, duracao, pico, 0.01)).connect(destino);
  fonte.start(t0 + inicio);
  fonte.stop(t0 + inicio + duracao + 0.1);
}

const SINTESE: Record<string, (s: Saida) => void> = {
  trovao: (s) => {
    sopro(s, 'lowpass', 900, 60, 0, 3.2, 0.9);
    sopro(s, 'lowpass', 300, 40, 0.35, 2.6, 0.7);
    tom(s, 'sine', 55, 30, 0.1, 2.4, 0.6);
  },
  sino: (s) => {
    for (const [razao, pico] of [[1, 0.5], [2.76, 0.3], [5.4, 0.18], [8.93, 0.1]] as const) tom(s, 'sine', 330 * razao, 330 * razao * 0.995, 0, 3.4 / Math.sqrt(razao), pico);
  },
  porta: (s) => {
    tom(s, 'sine', 120, 38, 0, 0.35, 0.9);
    sopro(s, 'lowpass', 1800, 200, 0, 0.18, 0.7);
    sopro(s, 'bandpass', 500, 300, 0.12, 0.3, 0.2);
  },
  pancada: (s) => {
    tom(s, 'sine', 180, 45, 0, 0.22, 0.95);
    sopro(s, 'lowpass', 3000, 400, 0, 0.12, 0.8);
  },
  explosao: (s) => {
    sopro(s, 'lowpass', 2400, 90, 0, 2.2, 1);
    tom(s, 'sine', 70, 28, 0, 1.4, 0.9);
    sopro(s, 'highpass', 2500, 800, 0, 0.25, 0.4);
  },
  aco: (s) => {
    sopro(s, 'highpass', 4000, 3000, 0, 0.06, 0.7);
    for (const [freq, pico] of [[1850, 0.25], [2790, 0.2], [4310, 0.12]] as const) tom(s, 'square', freq, freq * 0.99, 0, 0.7, pico * 0.5);
  },
  moedas: (s) => {
    for (let i = 0; i < 4; i++) {
      const base = i % 2 ? 3200 : 2500;
      tom(s, 'sine', base, base * 0.98, i * 0.07 + Math.random() * 0.02, 0.35, 0.28);
      tom(s, 'sine', base * 1.5, base * 1.5, i * 0.07, 0.25, 0.1);
    }
  },
  alarme: (s) => {
    for (let i = 0; i < 6; i++) tom(s, 'square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, i * 0.22, 0.2, 0.22);
  },
  magia: (s) => {
    [523, 659, 784, 1047, 1319].forEach((freq, i) => tom(s, 'sine', freq, freq * 1.01, i * 0.08, 0.9, 0.22));
    sopro(s, 'highpass', 6000, 9000, 0.1, 1, 0.12);
  },
  gota: (s) => {
    [0, 0.7, 1.3].forEach((inicio, i) => tom(s, 'sine', 1400 - i * 150, 420, inicio, 0.18, 0.5));
    [0.03, 0.73, 1.33].forEach((inicio) => tom(s, 'sine', 300, 250, inicio, 0.5, 0.06));
  },
  susto: (s) => {
    for (const freq of [233, 247, 311, 740]) tom(s, 'sawtooth', freq, freq * 0.96, 0, 1.3, 0.22);
    sopro(s, 'highpass', 1200, 300, 0, 0.25, 0.5);
  },
  coracao: (s) => {
    for (let i = 0; i < 5; i++) {
      const inicio = i * 0.78 * (1 - i * 0.04);
      tom(s, 'sine', 70, 40, inicio, 0.18, 0.8);
      tom(s, 'sine', 62, 36, inicio + 0.2, 0.2, 0.55);
    }
  },
};

/** Toca o efeito (volume de 0 a 1). Sem WebAudio, ou com o navegador ainda bloqueando o som, não faz nada. */
export function tocarEfeito(id: string, volume = 1): boolean {
  const sintetizar = SINTESE[id];
  if (!sintetizar || !(volume > 0)) return false;
  const ctx = obterContexto();
  if (!ctx || ctx.state !== 'running') return false;
  const mestre = ctx.createGain();
  mestre.gain.value = Math.max(0, Math.min(1, volume)) * 0.7;
  mestre.connect(ctx.destination);
  sintetizar({ ctx, destino: mestre, t0: ctx.currentTime + 0.02 });
  return true;
}

/** Os ids que têm síntese (um teste confere que são todos os da lista). */
export const IDS_SINTETIZADOS: readonly string[] = Object.keys(SINTESE);
