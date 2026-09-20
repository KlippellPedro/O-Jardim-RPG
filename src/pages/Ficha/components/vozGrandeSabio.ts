/** Voz do painel de subida de nível.
 *
 * As falas são pecas gravadas antes (tools/gerar-voz-sabio.py, voz neural em
 * português) e montadas na hora: "Guerreiro" + "chegou ao nível" + "três".
 * As pecas são coladas com o silêncio das pontas cortado, para a frase soar
 * corrida. Se algum passo tiver uma peça que não existe no manifest, só esse
 * passo cai na voz do navegador; sem nenhum dos dois, o painel fica mudo. */

const CHAVE_PREFERENCIA = 'jardim:voz-grande-sabio';
const PASTA = '/audio/sabio/';
const LIMIAR_SILENCIO = 0.012;
const MARGEM_CORTE_S = 0.012;
const PAUSA_ENTRE_PECAS_S = 0.03;
const PAUSA_ENTRE_PASSOS_S = 0.4;
const ATRASO_INICIAL_S = 0.55;
const MS_POR_CARACTERE_FALLBACK = 75;

export interface PassoFala {
  /** Texto mostrado na tela (e falado pela voz do navegador, se cair no fallback). */
  texto: string;
  /** Chaves das pecas gravadas, na ordem em que são faladas. */
  pecas: string[];
}

export interface OuvintesFala {
  /** Um passo começou; `duracaoMs` é o tempo estimado até ele terminar. */
  aoIniciarPasso: (indice: number, duracaoMs: number) => void;
  aoTerminar: () => void;
}

type ContextoAudio = typeof AudioContext;

const construtorAudio = (): ContextoAudio | null => {
  if (typeof window === 'undefined') return null;
  return window.AudioContext
    || (window as unknown as { webkitAudioContext?: ContextoAudio }).webkitAudioContext
    || null;
};

const sinteseNavegador = () => (
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
);

export const vozGrandeSabioDisponivel = () => construtorAudio() !== null || sinteseNavegador() !== null;

/** Ligada por padrão; a escolha do jogador fica guardada neste navegador. */
export const vozGrandeSabioLigada = (): boolean => {
  try {
    return window.localStorage.getItem(CHAVE_PREFERENCIA) !== 'off';
  } catch {
    return true;
  }
};

export const definirVozGrandeSabioLigada = (ligada: boolean) => {
  try {
    window.localStorage.setItem(CHAVE_PREFERENCIA, ligada ? 'on' : 'off');
  } catch {
    // sem armazenamento: vale só nesta abertura
  }
};

// ── Manifest e pecas ──────────────────────────────────────────────────────

let manifestPromessa: Promise<Record<string, string>> | null = null;

const carregarManifest = () => {
  if (!manifestPromessa) {
    manifestPromessa = fetch(`${PASTA}manifest.json`)
      .then((resposta) => (resposta.ok ? resposta.json() : { clips: {} }))
      .then((dados) => (dados?.clips || {}) as Record<string, string>)
      .catch(() => ({}));
  }
  return manifestPromessa;
};

interface Peca {
  buffer: AudioBuffer;
  inicio: number;
  duracao: number;
}

const cachePecas = new Map<string, Promise<Peca | null>>();

/** Acha onde a fala de fato começa e termina, ignorando o silêncio das pontas. */
const medirFala = (buffer: AudioBuffer): { inicio: number; duracao: number } => {
  const dados = buffer.getChannelData(0);
  let primeiro = 0;
  let ultimo = dados.length - 1;
  while (primeiro < ultimo && Math.abs(dados[primeiro]) < LIMIAR_SILENCIO) primeiro += 1;
  while (ultimo > primeiro && Math.abs(dados[ultimo]) < LIMIAR_SILENCIO) ultimo -= 1;
  const inicio = Math.max(0, primeiro / buffer.sampleRate - MARGEM_CORTE_S);
  const fim = Math.min(buffer.duration, ultimo / buffer.sampleRate + MARGEM_CORTE_S * 2);
  return { inicio, duracao: Math.max(0.05, fim - inicio) };
};

const carregarPeca = (audio: AudioContext, arquivo: string): Promise<Peca | null> => {
  let promessa = cachePecas.get(arquivo);
  if (!promessa) {
    promessa = fetch(`${PASTA}${arquivo}`)
      .then((resposta) => (resposta.ok ? resposta.arrayBuffer() : Promise.reject(new Error('sem áudio'))))
      .then((bytes) => audio.decodeAudioData(bytes))
      .then((buffer) => ({ buffer, ...medirFala(buffer) }))
      .catch(() => null);
    cachePecas.set(arquivo, promessa);
  }
  return promessa;
};

// ── Efeitos ───────────────────────────────────────────────────────────────

/** Dois toques suaves antes da fala, sintetizados na hora. */
const agendarDing = (audio: AudioContext, quando: number) => {
  [880, 1320].forEach((frequencia, indice) => {
    const oscilador = audio.createOscillator();
    const ganho = audio.createGain();
    const inicio = quando + indice * 0.12;
    oscilador.type = 'sine';
    oscilador.frequency.value = frequencia;
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.1, inicio + 0.02);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + 0.55);
    oscilador.connect(ganho).connect(audio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + 0.6);
  });
};

// ── Voz do navegador (só para passos sem pecas gravadas) ─────────────────

const falarNoNavegador = (texto: string) => {
  const sintese = sinteseNavegador();
  if (!sintese) return;
  const fala = new SpeechSynthesisUtterance(
    texto.replace(/\+(\d+)/g, 'mais $1').replace(/(?<=\s)-(\d+)/g, 'menos $1'),
  );
  fala.lang = 'pt-BR';
  fala.rate = 0.95;
  sintese.speak(fala);
};

// ── Sequência ─────────────────────────────────────────────────────────────

/** Fala os passos em sequência e devolve a função que interrompe tudo. */
export const falarSequencia = (passos: PassoFala[], ouvintes: OuvintesFala): (() => void) => {
  const Construtor = construtorAudio();
  let cancelado = false;
  const timers: number[] = [];
  const fontes: AudioBufferSourceNode[] = [];
  let audio: AudioContext | null = null;

  const parar = () => {
    cancelado = true;
    timers.forEach((timer) => window.clearTimeout(timer));
    fontes.forEach((fonte) => { try { fonte.stop(); } catch { /* já parou */ } });
    sinteseNavegador()?.cancel();
    if (audio) void audio.close().catch(() => undefined);
  };

  if (!Construtor || passos.length === 0) {
    // Sem Web Audio, resta a voz do navegador, passo a passo.
    let acumulado = 0;
    passos.forEach((passo, indice) => {
      const duracao = passo.texto.length * MS_POR_CARACTERE_FALLBACK;
      timers.push(window.setTimeout(() => {
        ouvintes.aoIniciarPasso(indice, duracao);
        falarNoNavegador(passo.texto);
      }, acumulado));
      acumulado += duracao + PAUSA_ENTRE_PASSOS_S * 1000;
    });
    timers.push(window.setTimeout(ouvintes.aoTerminar, acumulado));
    return parar;
  }

  audio = new Construtor();
  const ctx = audio;
  void ctx.resume().catch(() => undefined);

  void (async () => {
    const manifest = await carregarManifest();
    const carregados = await Promise.all(passos.map((passo) => Promise.all(
      passo.pecas.map((chave) => (manifest[chave] ? carregarPeca(ctx, manifest[chave]) : Promise.resolve(null))),
    )));
    if (cancelado) return;

    const base = ctx.currentTime + ATRASO_INICIAL_S;
    agendarDing(ctx, ctx.currentTime + 0.05);

    let cursor = 0; // segundos a partir de `base`
    passos.forEach((passo, indice) => {
      const pecas = carregados[indice];
      const completo = pecas.length > 0 && pecas.every((peca) => peca !== null);
      const inicioPasso = cursor;
      let duracaoPasso: number;

      if (completo) {
        let ponta = cursor;
        (pecas as Peca[]).forEach((peca) => {
          const fonte = ctx.createBufferSource();
          fonte.buffer = peca.buffer;
          fonte.connect(ctx.destination);
          fonte.start(base + ponta, peca.inicio, peca.duracao);
          fontes.push(fonte);
          ponta += peca.duracao + PAUSA_ENTRE_PECAS_S;
        });
        duracaoPasso = ponta - cursor;
      } else {
        duracaoPasso = (passo.texto.length * MS_POR_CARACTERE_FALLBACK) / 1000;
      }

      const aoIniciar = () => {
        if (cancelado) return;
        ouvintes.aoIniciarPasso(indice, duracaoPasso * 1000);
        if (!completo) falarNoNavegador(passo.texto);
      };
      timers.push(window.setTimeout(aoIniciar, (ATRASO_INICIAL_S + inicioPasso) * 1000));
      cursor += duracaoPasso + PAUSA_ENTRE_PASSOS_S;
    });

    timers.push(window.setTimeout(() => { if (!cancelado) ouvintes.aoTerminar(); }, (ATRASO_INICIAL_S + cursor) * 1000));
  })();

  return parar;
};
