import { useEffect, useRef, useState } from 'react';
import { Music2, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import type { MusicaTemaEntidade } from '../../../data/mundo/entidades';
import { useAudioStore } from '../../store/useAudioStore';

interface EntityThemeMusicProps {
  musica: MusicaTemaEntidade;
}

export function EntityThemeMusic({ musica }: EntityThemeMusicProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  const [erro, setErro] = useState('');
  const audioHabilitado = useAudioStore((state) => state.enabled);
  const volume = useAudioStore((state) => state.volume);
  const toggleAudioHabilitado = useAudioStore((state) => state.toggleEnabled);
  const definirVolume = useAudioStore((state) => state.setVolume);
  const volumeEfetivo = volume * (musica.volumeAlvo ?? 1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = audioHabilitado ? volume * (musica.volumeAlvo ?? 1) : 0;
  }, [audioHabilitado, volume, musica.volumeAlvo]);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  // Toca sozinha ao entrar no conto. Navegadores bloqueiam autoplay sem interação
  // do usuário, então, se a tentativa falhar, aguardamos o primeiro toque/clique
  // na página para tentar de novo, sem exibir isso como um erro.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioHabilitado) return;

    const tentarTocar = () => {
      if (!audio.paused) return;
      audio.play().catch(() => {});
    };

    tentarTocar();
    document.addEventListener('pointerdown', tentarTocar);
    document.addEventListener('keydown', tentarTocar);
    return () => {
      document.removeEventListener('pointerdown', tentarTocar);
      document.removeEventListener('keydown', tentarTocar);
    };
  }, [audioHabilitado, musica.arquivo]);

  const alternarReproducao = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    setErro('');

    if (!audio.paused) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setTocando(false);
      setErro('Não foi possível tocar esta faixa neste navegador.');
    }
  };

  return (
    <aside className="entity-music" aria-label="Música tema desta entidade">
      <audio
        ref={audioRef}
        src={musica.arquivo}
        loop
        preload="metadata"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
        onError={() => setErro('O arquivo da música tema não foi encontrado.')}
      />
      <button type="button" onClick={alternarReproducao} className="entity-music__button" aria-label={tocando ? 'Pausar música tema' : 'Tocar música tema'}>
        {tocando ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <Music2 size={18} aria-hidden="true" />
      <div className="entity-music__copy">
        <span>Música tema</span>
        <strong>{musica.titulo}</strong>
        {musica.credito ? <small>{musica.credito}</small> : null}
        {erro ? <small role="status" className="entity-music__error">{erro}</small> : null}
      </div>
      <div className="entity-music__volume">
        <button
          type="button"
          onClick={toggleAudioHabilitado}
          aria-label={audioHabilitado ? 'Mutar áudio do site' : 'Ativar áudio do site'}
          aria-pressed={!audioHabilitado}
        >
          {audioHabilitado ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(evento) => definirVolume(Number(evento.target.value) / 100)}
          disabled={!audioHabilitado}
          aria-label="Volume da música tema"
        />
        <span>{audioHabilitado ? `${Math.round(volumeEfetivo * 100)}%` : 'Mudo'}</span>
      </div>
    </aside>
  );
}
