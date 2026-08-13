import React from 'react';
import { Gauge, Volume2, VolumeX } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { sfx } from '../../utils/audioSynth';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { usePrefersReducedMotion } from '../../hooks/usePerformance';

export const PreferenciasPanel: React.FC = () => {
  const enabled = useAudioStore((state) => state.enabled);
  const volume = useAudioStore((state) => state.volume);
  const toggleEnabled = useAudioStore((state) => state.toggleEnabled);
  const setVolume = useAudioStore((state) => state.setVolume);
  const performanceMode = usePerformanceStore((state) => state.performanceMode);
  const togglePerformanceMode = usePerformanceStore((state) => state.togglePerformanceMode);
  const prefersReducedMotion = usePrefersReducedMotion();

  const handleToggle = () => {
    // Alterna primeiro e só confirma com som se ficou ativado - senão o
    // próprio "desligar" tocaria um efeito, o que não faz sentido.
    const next = !enabled;
    toggleEnabled();
    if (next) sfx.play('confirm');
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value) / 100);
  };

  const handleVolumeCommit = () => {
    if (enabled) sfx.play('select');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1 space-y-8">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Gauge className={performanceMode ? 'text-emerald-400' : 'text-primary'} size={20} />
            <h3 className="text-lg font-bold text-white">Desempenho</h3>
          </div>
          <p id="performance-mode-description" className="mb-5 text-sm leading-6 text-gray-400">
            Reduz efeitos visuais, detalhes 3D e animações cosméticas para melhorar o desempenho em dispositivos com hardware limitado.
          </p>

          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="text-sm font-medium text-gray-300">Modo de desempenho</span>
              <p className="mt-1 text-xs text-gray-500">Desativado por padrão; todas as funções continuam disponíveis.</p>
            </div>
            <button
              type="button"
              onClick={togglePerformanceMode}
              data-sfx="off"
              role="switch"
              aria-checked={performanceMode}
              aria-describedby="performance-mode-description"
              aria-label="Ativar ou desativar modo de desempenho"
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                performanceMode ? 'bg-emerald-500' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${
                  performanceMode ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {prefersReducedMotion && (
            <p className="mt-5 rounded-xl border border-blue-400/15 bg-blue-400/5 px-3 py-2 text-xs leading-5 text-blue-200/80">
              A preferência de movimento reduzido do sistema também está ativa, independentemente deste modo.
            </p>
          )}
        </section>

        <section className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            {enabled ? <Volume2 className="text-primary" size={20} /> : <VolumeX className="text-gray-500" size={20} />}
            <h3 className="text-lg font-bold text-white">Efeitos sonoros</h3>
          </div>
          <p className="text-gray-400 text-sm mb-5">
            Sons discretos de interface - cliques, abrir/fechar menus, confirmações e navegação.
          </p>

          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-medium text-gray-300">
              {enabled ? 'Ativado' : 'Desativado'}
            </span>
            <button
              type="button"
              onClick={handleToggle}
              data-sfx="off"
              role="switch"
              aria-checked={enabled}
              aria-label="Ativar ou desativar efeitos sonoros"
              className={`relative w-14 h-8 rounded-full transition-colors shrink-0 ${
                enabled ? 'bg-primary' : 'bg-white/10'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className={`transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <label className="text-xs text-gray-400 font-medium pl-1 mb-2 block">
              Volume
            </label>
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-gray-500 shrink-0" />
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(volume * 100)}
                onChange={handleVolumeChange}
                onMouseUp={handleVolumeCommit}
                onTouchEnd={handleVolumeCommit}
                onKeyUp={handleVolumeCommit}
                disabled={!enabled}
                data-sfx="off"
                aria-label="Volume dos efeitos sonoros"
                className="flex-1 accent-primary h-1.5 cursor-pointer disabled:cursor-not-allowed"
              />
              <Volume2 size={16} className="text-gray-500 shrink-0" />
              <span className="text-xs font-mono text-gray-400 w-9 text-right">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
