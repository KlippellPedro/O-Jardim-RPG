/** Voz do painel de subida de nível: usa a síntese de voz do próprio navegador
 * em português do Brasil, grave e pausada. O timbre depende do aparelho; sem
 * voz em português disponível, o painel simplesmente fica mudo. */

const CHAVE_PREFERENCIA = 'jardim:voz-grande-sabio';

const nuvem = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export const vozGrandeSabioDisponivel = () => nuvem() !== null;

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

const PREFERIDAS = /francisca|maria|luciana|thalita|antonio|google.*portugu/i;

const escolherVoz = (): SpeechSynthesisVoice | null => {
  const vozes = nuvem()?.getVoices() ?? [];
  const portuguesas = vozes.filter((voz) => /^pt(-|_|$)/i.test(voz.lang));
  return (
    portuguesas.find((voz) => /pt[-_]BR/i.test(voz.lang) && PREFERIDAS.test(voz.name))
    || portuguesas.find((voz) => /pt[-_]BR/i.test(voz.lang))
    || portuguesas[0]
    || null
  );
};

/** "Vida +7" vira "Vida mais 7" para a voz não engolir o sinal. */
export const textoParaFala = (linha: string) => linha
  .replace(/\+(\d+)/g, 'mais $1')
  .replace(/(?<=\s)-(\d+)/g, 'menos $1');

// Um "ding" curto antes da fala, sintetizado na hora (sem arquivo de áudio).
const tocarDing = () => {
  try {
    const Contexto = window.AudioContext
      || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;
    const audio = new Contexto();
    const agora = audio.currentTime;
    [880, 1320].forEach((frequencia, indice) => {
      const oscilador = audio.createOscillator();
      const ganho = audio.createGain();
      oscilador.type = 'sine';
      oscilador.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, agora + indice * 0.12);
      ganho.gain.exponentialRampToValueAtTime(0.12, agora + indice * 0.12 + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + indice * 0.12 + 0.6);
      oscilador.connect(ganho).connect(audio.destination);
      oscilador.start(agora + indice * 0.12);
      oscilador.stop(agora + indice * 0.12 + 0.65);
    });
    window.setTimeout(() => { void audio.close(); }, 1500);
  } catch {
    // áudio indisponível: segue sem o ding
  }
};

/** Fala as linhas em sequência. Devolve a função que interrompe tudo.
 * `aoIniciarLinha` avisa qual linha começou a ser falada, para a tela
 * acompanhar a voz. `aoTerminar` roda quando a última linha acaba (não roda
 * se for interrompida). */
export const falarComoGrandeSabio = (
  linhas: string[],
  aoIniciarLinha: (indice: number) => void,
  aoTerminar: () => void,
): (() => void) => {
  const sintese = nuvem();
  if (!sintese || linhas.length === 0) {
    aoTerminar();
    return () => undefined;
  }

  let cancelado = false;
  sintese.cancel();
  tocarDing();

  const voz = escolherVoz();
  linhas.forEach((linha, indice) => {
    const fala = new SpeechSynthesisUtterance(textoParaFala(linha));
    fala.lang = voz?.lang || 'pt-BR';
    if (voz) fala.voice = voz;
    fala.pitch = 0.65;
    fala.rate = 0.92;
    fala.volume = 1;
    fala.onstart = () => { if (!cancelado) aoIniciarLinha(indice); };
    if (indice === linhas.length - 1) {
      fala.onend = () => { if (!cancelado) aoTerminar(); };
      fala.onerror = () => { if (!cancelado) aoTerminar(); };
    }
    sintese.speak(fala);
  });

  return () => {
    cancelado = true;
    sintese.cancel();
  };
};
