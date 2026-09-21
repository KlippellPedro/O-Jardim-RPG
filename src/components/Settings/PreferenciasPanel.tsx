import React from 'react';
import { Gauge, Volume2, VolumeX } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { sfx } from '../../utils/audioSynth';
import { usePerformanceStore } from '../../store/usePerformanceStore';
import { usePrefersReducedMotion } from '../../hooks/usePerformance';
import { PERFIS_SONOROS, ROTULO_PERFIL } from '../../utils/somDeClasse';
import { CATEGORIAS_SOM, CATEGORIAS_PADRAO } from '../../utils/categoriasSom';
import { definirVozGrandeSabioLigada, vozGrandeSabioDisponivel, vozGrandeSabioLigada } from '../../pages/Ficha/components/vozGrandeSabio';

interface IInterruptorProps {
  rotulo: string;
  descricao: string;
  ligado: boolean;
  onMudar: (ligado: boolean) => void;
  desabilitado?: boolean;
}

/** Linha com título, explicação e o botão liga/desliga (sem tocar som ao mexer nele). */
const Interruptor: React.FC<IInterruptorProps> = ({ rotulo, descricao, ligado, onMudar, desabilitado }) => (
  <div className={`flex items-center justify-between gap-4 py-3 ${desabilitado ? 'opacity-40' : ''}`}>
    <div className="min-w-0">
      <span className="block text-sm font-bold text-white">{rotulo}</span>
      <span className="block text-xs leading-5 text-gray-500">{descricao}</span>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      data-sfx="off"
      onClick={() => onMudar(!ligado)}
      className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${ligado ? 'bg-primary' : 'bg-white/10'}`}
    >
      <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${ligado ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

export const PreferenciasPanel: React.FC = () => {
  const enabled = useAudioStore((state) => state.enabled);
  const volume = useAudioStore((state) => state.volume);
  const toggleEnabled = useAudioStore((state) => state.toggleEnabled);
  const somDeClasse = useAudioStore((state) => state.somDeClasse);
  const setSomDeClasse = useAudioStore((state) => state.setSomDeClasse);
  const setVolume = useAudioStore((state) => state.setVolume);
  const performanceMode = usePerformanceStore((state) => state.performanceMode);
  const togglePerformanceMode = usePerformanceStore((state) => state.togglePerformanceMode);
  const prefersReducedMotion = usePrefersReducedMotion();
  const categorias = useAudioStore((state) => state.categorias);
  const setCategoria = useAudioStore((state) => state.setCategoria);
  const celebracoes = usePerformanceStore((state) => state.celebracoes);
  const dado3d = usePerformanceStore((state) => state.dado3d);
  const setEfeito = usePerformanceStore((state) => state.setEfeito);
  const ligadoAutomaticamente = usePerformanceStore((state) => state.ligadoAutomaticamente);
  const [voz, setVoz] = React.useState(vozGrandeSabioLigada);
  const restaurar = () => {
    CATEGORIAS_SOM.forEach((categoria) => setCategoria(categoria.id, CATEGORIAS_PADRAO[categoria.id]));
    setEfeito('celebracoes', true);
    setEfeito('dado3d', true);
    definirVozGrandeSabioLigada(true);
    setVoz(true);
  };

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

        <section className={`rounded-2xl border border-white/10 bg-white/5 p-6 transition-opacity ${enabled ? '' : 'opacity-50'}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Som da classe</h3>
              <p className="mt-1 text-sm leading-6 text-gray-400">
                Um toque extra da sua classe ao equipar, conjurar, acertar um crítico e quando chega a sua vez.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { const proximo = !somDeClasse; setSomDeClasse(proximo); }}
              data-sfx="off"
              role="switch"
              aria-checked={somDeClasse}
              aria-label="Ativar ou desativar o som da classe"
              disabled={!enabled}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${somDeClasse ? 'bg-primary' : 'bg-white/10'}`}
            >
              <span className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${somDeClasse ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-500">Toque num perfil para ouvir. Cada classe usa um deles.</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PERFIS_SONOROS.map((perfil) => (
              <button
                key={perfil}
                type="button"
                data-sfx="off"
                disabled={!enabled}
                onClick={() => sfx.prever(perfil)}
                title={ROTULO_PERFIL[perfil].descricao}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left transition-colors hover:border-primary/40 disabled:cursor-not-allowed"
              >
                <span className="block text-sm font-bold text-white">{ROTULO_PERFIL[perfil].titulo}</span>
                <span className="block text-[11px] leading-4 text-gray-500">{ROTULO_PERFIL[perfil].descricao}</span>
              </button>
            ))}
          </div>
        </section>

        {ligadoAutomaticamente && performanceMode ? (
          <p className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs leading-5 text-emerald-200/90" role="status">
            Ligamos o modo de desempenho sozinhos porque este aparelho parece limitado (pouca memória ou poucos núcleos). Se ele aguentar bem, é só desligar acima.
          </p>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold text-white">Sons por tipo</h3>
          <p className="mb-2 mt-1 text-sm text-gray-400">Deixe só o que você gosta. O volume geral e o botão de efeitos sonoros continuam valendo por cima.</p>
          <div className="divide-y divide-white/5">
            {CATEGORIAS_SOM.map((categoria) => (
              <Interruptor key={categoria.id} rotulo={categoria.rotulo} descricao={categoria.descricao} ligado={categorias[categoria.id]} desabilitado={!enabled} onMudar={(ligado) => { setCategoria(categoria.id, ligado); if (ligado && enabled) sfx.play(categoria.id === 'moedas' ? 'moeda' : categoria.id === 'eventos' ? 'notification' : 'select'); }} />
            ))}
            {vozGrandeSabioDisponivel() ? (
              <Interruptor rotulo="Voz do Grande Sábio" descricao="Ele fala as análises e anuncia as conquistas." ligado={voz} onMudar={(ligado) => { definirVozGrandeSabioLigada(ligado); setVoz(ligado); }} />
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold text-white">Efeitos visuais</h3>
          <p className="mb-2 mt-1 text-sm text-gray-400">Desligar tira só o espetáculo. As informações continuam aparecendo, sem a animação.</p>
          <div className="divide-y divide-white/5">
            <Interruptor rotulo="Celebrações" descricao="Conquistas, chuva de moedas, cartas de item, círculo mágico e o aviso de “é a sua vez”." ligado={celebracoes} desabilitado={performanceMode} onMudar={(ligado) => setEfeito('celebracoes', ligado)} />
            <Interruptor rotulo="Dado 3D" descricao="O dado gira e pousa na tela. Desligado, o resultado aparece direto." ligado={dado3d} desabilitado={performanceMode} onMudar={(ligado) => setEfeito('dado3d', ligado)} />
          </div>
          {performanceMode ? <p className="mt-3 text-xs text-gray-500">O modo de desempenho já desliga estes efeitos.</p> : null}
        </section>

        <button type="button" onClick={restaurar} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Restaurar sons e efeitos ao padrão</button>
      </div>
    </div>
  );
};
