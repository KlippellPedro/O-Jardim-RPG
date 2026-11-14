import { useEffect, useRef } from 'react';
import { somPorId, urlDoSom, volumeNoAparelho, type ICamadaAmbiente } from '../motor/sonsAmbiente';

interface Props {
  /** Os sons que o Mestre ligou, com o volume de cada um. */
  camadas: ICamadaAmbiente[];
  /** Quanto este aparelho ouve, de 0 a 1 (o controle fica no painel Trilha sonora). */
  ajuste: number;
  mudo: boolean;
  /** Sobe a cada toque em "Ativar áudio da mesa": o navegador só deixa tocar depois de um gesto, e aí tentamos de novo. */
  tentativa: number;
  /** O navegador barrou o som até alguém tocar na tela. */
  onBloqueado: (bloqueado: boolean) => void;
  /** Ids dos sons que não carregaram (sem internet, arquivo fora do ar). */
  onFalhas: (ids: string[]) => void;
}

interface Tocador {
  audio: HTMLAudioElement;
  /** Volume que o último ajuste pediu; a rampa caminha até ele. */
  alvo: number;
  parando: boolean;
}

const RAMPA_MS = 700;
const PASSO_MS = 50;

/**
 * Toca os sons de ambiente da mesa, cada um num <audio> em laço, direto da fonte externa. Entrar e sair é
 * em rampa (sem estalo), e mexer no volume também. Não desenha nada na tela.
 */
export const AmbienteDaMesa = ({ camadas, ajuste, mudo, tentativa, onBloqueado, onFalhas }: Props) => {
  const tocadores = useRef(new Map<string, Tocador>());
  const falhas = useRef(new Set<string>());
  const rampa = useRef<number | null>(null);
  const callbacks = useRef({ onBloqueado, onFalhas });
  callbacks.current = { onBloqueado, onFalhas };

  // Uma rampa só para todos: caminha o volume de cada som até o alvo e solta quem terminou de sair.
  const andarNaRampa = () => {
    if (rampa.current !== null) return;
    rampa.current = window.setInterval(() => {
      let ocupado = false;
      for (const [id, tocador] of tocadores.current) {
        const passo = PASSO_MS / RAMPA_MS;
        const diferenca = tocador.alvo - tocador.audio.volume;
        if (Math.abs(diferenca) > passo) {
          tocador.audio.volume = Math.max(0, Math.min(1, tocador.audio.volume + Math.sign(diferenca) * passo));
          ocupado = true;
        } else {
          tocador.audio.volume = Math.max(0, Math.min(1, tocador.alvo));
          if (tocador.parando) {
            tocador.audio.pause();
            tocador.audio.removeAttribute('src');
            tocador.audio.load();
            tocadores.current.delete(id);
          }
        }
      }
      if (!ocupado && rampa.current !== null) {
        window.clearInterval(rampa.current);
        rampa.current = null;
      }
    }, PASSO_MS);
  };

  useEffect(() => {
    const ligados = new Set(camadas.map((camada) => camada.id));
    for (const camada of camadas) {
      const som = somPorId(camada.id);
      if (!som) continue;
      const alvo = volumeNoAparelho(camada, ajuste, mudo);
      let tocador = tocadores.current.get(camada.id);
      if (!tocador) {
        const audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0;
        audio.addEventListener('error', () => {
          falhas.current.add(camada.id);
          callbacks.current.onFalhas([...falhas.current]);
        });
        audio.addEventListener('playing', () => {
          if (falhas.current.delete(camada.id)) callbacks.current.onFalhas([...falhas.current]);
        });
        audio.src = urlDoSom(som);
        tocador = { audio, alvo, parando: false };
        tocadores.current.set(camada.id, tocador);
        void audio.play().then(() => callbacks.current.onBloqueado(false)).catch((erro: unknown) => {
          // NotAllowedError: o navegador só deixa tocar depois de um toque na tela.
          if (erro instanceof DOMException && erro.name === 'NotAllowedError') callbacks.current.onBloqueado(true);
        });
      } else {
        tocador.alvo = alvo;
        tocador.parando = false;
        if (tocador.audio.paused && !tocador.audio.error) void tocador.audio.play().catch(() => callbacks.current.onBloqueado(true));
      }
    }
    for (const [id, tocador] of tocadores.current) {
      if (!ligados.has(id)) {
        tocador.alvo = 0;
        tocador.parando = true;
        if (falhas.current.delete(id)) callbacks.current.onFalhas([...falhas.current]);
      }
    }
    andarNaRampa();
  }, [camadas, ajuste, mudo, tentativa]);

  // Ao sair do mapa, tudo para na hora.
  useEffect(() => () => {
    if (rampa.current !== null) window.clearInterval(rampa.current);
    rampa.current = null;
    for (const tocador of tocadores.current.values()) {
      tocador.audio.pause();
      tocador.audio.removeAttribute('src');
      tocador.audio.load();
    }
    tocadores.current.clear();
  }, []);

  return null;
};
