import { motion } from 'framer-motion';
import { Brain, Camera, Loader2, Shield, Star, Sword, Trash2 } from 'lucide-react';
import type { ICharacter } from '../../../types/character';
import { obterStatusFicha } from '../../../services/statusService';

const FAMA_MAXIMA = 5;

interface PersonagemWantedCardProps {
  personagem: ICharacter;
  index: number;
  nomeRaca: string;
  nomeClasse: string;
  salvandoFoto: boolean;
  onAbrir: () => void;
  onAbrirEditorFoto: () => void;
  onExcluir: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

// Flavor puro: um valor de recompensa condizente com a escala econômica do
// Jardim (salário-base de 300 Lunaris), crescendo com o nível do personagem.
const calcularRecompensa = (nivel: number) => (nivel + 1) * 3000;

// Cartaz de procurado: a ficha de cada personagem vira um aviso pregado no
// mural, em vez de mais um card retangular igual aos de qualquer outra tela.
export const PersonagemWantedCard: React.FC<PersonagemWantedCardProps> = ({
  personagem,
  index,
  nomeRaca,
  nomeClasse,
  salvandoFoto,
  onAbrir,
  onAbrirEditorFoto,
  onExcluir,
}) => {
  const inclinacao = index % 2 === 0 ? -1.4 : 1.4;
  const moeda = personagem.carteira?.[0]?.moeda || 'Lunaris';
  const sanidadeAtual = obterStatusFicha(personagem.ficha).sanidadeAtual;
  const recompensa = calcularRecompensa(personagem.nivel);

  return (
    <motion.div
      onClick={onAbrir}
      role="link"
      tabIndex={0}
      aria-label={`Abrir ficha de ${personagem.nome}`}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onAbrir();
        }
      }}
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: inclinacao }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ rotate: 0, y: -8, scale: 1.02 }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.1, 0.5) }}
      className="wanted-poster performance-expensive-effects group relative flex cursor-pointer flex-col overflow-hidden rounded-sm p-5 pt-4 shadow-[0_18px_30px_-12px_rgba(0,0,0,0.6)]"
    >
      {/* Textura de arranhões envelhecidos */}
      <div aria-hidden="true" className="wanted-poster-scratches pointer-events-none absolute inset-0" />

      {/* Fitas do mural */}
      <span aria-hidden="true" className="absolute top-1 left-8 h-4 w-14 -rotate-6 rounded-[1px] border border-black/10 bg-gradient-to-b from-[#fbf6e6]/95 to-[#e8dcb8]/85 shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />
      <span aria-hidden="true" className="absolute top-1 right-8 h-4 w-14 rotate-3 rounded-[1px] border border-black/10 bg-gradient-to-b from-[#fbf6e6]/95 to-[#e8dcb8]/85 shadow-[0_1px_3px_rgba(0,0,0,0.3)]" />

      {/* Selo "Procurado" */}
      <div className="relative -rotate-1 border-y-[3px] border-double border-[#5c1a1a]/60 py-1.5 text-center">
        <span
          className="text-2xl font-black uppercase tracking-[0.15em] text-[#4a1414]"
          style={{ fontFamily: 'Cinzel, serif', textShadow: '1px 1px 0 rgba(0,0,0,0.12)' }}
        >
          Procurado
        </span>
        <p className="mt-0.5 text-[0.6rem] font-bold uppercase tracking-[0.4em] text-[#5c1a1a]/70">Vivo ou morto</p>
      </div>

      {/* Retrato */}
      <div className="relative mx-auto mt-4 h-24 w-24 rotate-1 border-4 border-[#2a2118] bg-[#f5ecd8] p-1 shadow-md">
        <span aria-hidden="true" className="absolute -top-2.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#7a1f1f] shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
        {personagem.foto ? (
          <img src={personagem.foto} alt={personagem.nome} loading="lazy" decoding="async" className="h-full w-full object-cover grayscale-[35%] sepia-[15%]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#e3d6ae]">
            <span className="text-2xl font-bold text-[#5a4a2f]" style={{ fontFamily: 'Cinzel, serif' }}>
              {personagem.nome.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <span className="mx-auto mt-2 rounded-full border border-[#5a4a2f]/40 bg-[#5a4a2f]/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-widest text-[#4a3b22]">
        Nível {personagem.nivel} de ameaça
      </span>

      <h2 className="mt-2 text-center text-xl font-bold leading-tight text-[#2a2118]" style={{ fontFamily: 'Cinzel, serif' }}>
        {personagem.nome}
      </h2>
      <p className="text-center text-xs uppercase tracking-wider text-[#5a4a2f]">
        {nomeRaca} · {nomeClasse}
      </p>

      {/* Recompensa */}
      <div className="mx-auto mt-2 text-center">
        <span className="block text-[0.6rem] font-bold uppercase tracking-[0.3em] text-[#5c1a1a]/70">Recompensa</span>
        <span className="text-xl font-black text-[#5c1a1a]" style={{ fontFamily: 'Cinzel, serif' }}>
          {recompensa.toLocaleString('pt-BR')} <span className="text-sm font-bold">{moeda}</span>
        </span>
      </div>

      <div className="my-3 border-t border-dashed border-[#5a4a2f]/35" />

      {/* Dossiê */}
      <div className="space-y-1 font-mono text-[0.7rem] text-[#3a2f1c]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 uppercase tracking-wide text-[#5a4a2f]"><Shield size={12} /> Vida</span>
          <span className="font-bold">{personagem.derivados?.vida ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 uppercase tracking-wide text-[#5a4a2f]"><Sword size={12} /> Mana</span>
          <span className="font-bold">{personagem.derivados?.mana ?? 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 uppercase tracking-wide text-[#5a4a2f]"><Brain size={12} /> Sanidade</span>
          <span className="font-bold">{sanidadeAtual ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 uppercase tracking-wide text-[#5a4a2f]"><Star size={12} /> Fama</span>
          <span className="font-bold">{personagem.ficha?.fama ?? 0}/{FAMA_MAXIMA}</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#5a4a2f]/25 pt-3">
        <span className="text-[0.65rem] text-[#5a4a2f]/80">
          Emitido em {new Date(personagem.criadoEm).toLocaleDateString('pt-BR')}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onAbrirEditorFoto(); }}
            disabled={salvandoFoto}
            className="rounded p-1.5 text-[#5a4a2f] transition-colors hover:bg-[#5a4a2f]/10 hover:text-[#2a2118] disabled:cursor-wait disabled:opacity-50"
            title={salvandoFoto ? 'Salvando foto...' : 'Ajustar foto'}
            aria-label={salvandoFoto ? `Salvando foto de ${personagem.nome}` : `Ajustar foto de ${personagem.nome}`}
          >
            {salvandoFoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
          </button>
          <button
            type="button"
            onClick={onExcluir}
            className="rounded p-1.5 text-[#5a4a2f] transition-colors hover:bg-[#7a1f1f]/10 hover:text-[#7a1f1f]"
            title="Excluir"
            aria-label={`Excluir ${personagem.nome}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
