import { motion } from 'framer-motion';
import { ArrowRight, PawPrint, Volume2 } from 'lucide-react';
import type { IRaca } from '../../../types/catalogo';
import { nivelMinimoTraco } from '../../../services/racaService';
import { PremiumCard } from '../../components/premium/PremiumCard';
import {
  bonusDaOpcao,
  bonusDoDegrau,
  contagemPorMorfologia,
  danoDaArmaNatural,
  degrausDaAnimalia,
  nomeCurtoDoDegrau,
  type FormaDaAnimalia,
} from './dados';
import { iconeDaMorfologia, visualDaForma } from './visual';

interface AnimaliaHubProps {
  raca: IRaca;
  formas: FormaDaAnimalia[];
  abrir: (formaId: string, morfologiaId?: string) => void;
}

/** O que a Forma entrega em uma linha para o cartão: a arma natural, ou a falta dela. */
function resumoDaArma(completa: FormaDaAnimalia): string {
  const dano = danoDaArmaNatural(completa.forma);
  return dano ? `Arma natural com dano base ${dano}` : 'Sem arma natural';
}

/** Porta de entrada da Animália: o que todo bicho tem, as três Formas, as Morfologias e o amadurecimento.
 * Cada Forma abre uma página própria, onde o jogador monta Morfologia e animal. */
export const AnimaliaHub = ({ raca, formas, abrir }: AnimaliaHubProps) => {
  const base = visualDaForma('hibrido');
  const voz = raca.caracteristicas?.find(traco => traco.id === 'voz-da-fauna');
  const contagem = contagemPorMorfologia(raca);
  const degraus = degrausDaAnimalia(raca);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center mb-16"
      >
        <div className={`w-24 h-24 mx-auto ${base.tema.bg} rounded-full flex items-center justify-center mb-8 backdrop-blur-md`}>
          <PawPrint size={44} className={base.tema.icon} strokeWidth={1.5} />
        </div>
        <h1
          className={`text-5xl sm:text-7xl font-bold tracking-tight ${base.tema.text} mb-6 uppercase`}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Animália
        </h1>
        <p className="text-lg text-green-100/60 max-w-2xl mx-auto font-medium leading-relaxed">{raca.descricao}</p>
      </motion.header>

      <PremiumCard
        glowColor={base.tema.glow}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={`mb-16 grid gap-8 rounded-2xl ${base.tema.bg} border-t ${base.tema.border} p-6 sm:p-8 backdrop-blur-md md:grid-cols-2`}
      >
        <div>
          <h2 className={`mb-4 text-xl font-bold ${base.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
            O que toda Animália tem
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-green-100/60">
            {(raca.fisiologia || []).map(linha => <li key={linha}>{linha}</li>)}
          </ul>
        </div>
        {voz && (
          <div className="flex gap-4">
            <Volume2 size={32} strokeWidth={1.5} className={`${base.tema.icon} mt-1 shrink-0`} />
            <div>
              <h3 className={`mb-2 text-xl font-bold ${base.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                {voz.titulo}
              </h3>
              <p className="text-sm leading-relaxed text-green-100/60">{voz.descricao}</p>
            </div>
          </div>
        )}
      </PremiumCard>

      <section className="mb-16">
        <div className="mb-8">
          <h2 className={`text-3xl sm:text-4xl font-bold ${base.tema.text} mb-3 uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
            Escolha a Forma
          </h2>
          <p className="max-w-3xl text-lg text-gray-400">{raca.descricao_naturezas}</p>
          <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs font-bold uppercase tracking-[0.14em] text-gray-500">
            <li>1 · Forma</li>
            <li>2 · Morfologia</li>
            <li>3 · Animal</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {formas.map((completa, indice) => {
            const { forma, tracos } = completa;
            const visual = visualDaForma(forma.id);
            return (
              <motion.button
                key={forma.id}
                type="button"
                onClick={() => abrir(forma.id)}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: indice * 0.1 }}
                aria-label={`Abrir ${forma.titulo}`}
                className={`group flex h-full flex-col gap-5 rounded-xl border ${visual.tema.border} ${visual.tema.bg} p-7 text-left backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60`}
                style={{ boxShadow: `0 0 28px ${visual.tema.glow}` }}
              >
                <div className="flex items-center gap-4">
                  <visual.Icone size={30} strokeWidth={1.5} className={`${visual.tema.icon} shrink-0`} />
                  <h3 className={`text-2xl font-bold leading-tight ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                    {forma.titulo}
                  </h3>
                </div>

                <p className="text-sm leading-relaxed text-gray-300/75">{forma.descricao}</p>

                <dl className="mt-auto space-y-3 border-t border-white/10 pt-5 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-[0.14em] text-gray-500">Corpo</dt>
                    <dd className="mt-0.5 text-gray-300">{bonusDaOpcao(forma) || 'Sem ajuste de Vida, Mana ou Estamina'}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.14em] text-gray-500">Combate</dt>
                    <dd className="mt-0.5 text-gray-300">{resumoDaArma(completa)}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.14em] text-gray-500">Traço</dt>
                    <dd className="mt-0.5 text-gray-300">{tracos.map(traco => traco.titulo).join(' e ')}</dd>
                  </div>
                </dl>

                <span className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] ${visual.tema.text}`}>
                  Ver {forma.titulo}
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="mb-16">
        <h2 className={`mb-3 text-3xl font-bold ${base.tema.text} uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
          Morfologias
        </h2>
        <p className="mb-6 max-w-3xl text-gray-400">{raca.descricao_variantes}</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(raca.variantes || []).map(morfologia => {
            const Icone = iconeDaMorfologia(morfologia.id);
            return (
              <li key={morfologia.id}>
                <button
                  type="button"
                  onClick={() => abrir('hibrido', morfologia.id)}
                  className="flex h-full w-full flex-col gap-2 rounded-lg border border-white/10 bg-black/35 p-4 text-left backdrop-blur-md transition-colors hover:border-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
                >
                  <span className="flex items-center gap-3">
                    <Icone size={20} strokeWidth={1.5} className={`${base.tema.icon} shrink-0`} />
                    <span className={`text-base font-bold ${base.tema.text}`}>{morfologia.titulo}</span>
                  </span>
                  <span className="text-xs leading-relaxed text-gray-400">{morfologia.descricao}</span>
                  <span className="mt-auto text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">
                    {bonusDaOpcao(morfologia) || 'Sem ajuste'} · {contagem.get(morfologia.id) ?? 0} animais
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {degraus.length > 0 && (
        <section>
          <h2 className={`mb-3 text-2xl font-bold ${base.tema.text} uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
            Amadurecimento
          </h2>
          <p className="mb-6 max-w-3xl text-gray-400">
            A Animália amadurece sozinha, pelo nível total, em três degraus. Eles somam Vida e Estamina, e o último
            também Mana. Os degraus valem para qualquer Forma e Morfologia.
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {degraus.map(estagio => (
              <li key={estagio.id} className="rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Nível total {nivelMinimoTraco(estagio)}
                </p>
                <p className={`mt-1 text-xl font-bold ${base.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                  {nomeCurtoDoDegrau(estagio)}
                </p>
                <p className="mt-1 text-sm text-gray-400">{bonusDoDegrau(estagio) || 'Ponto de partida'}</p>
                {(estagio.caracteristicas || []).map(traco => (
                  <div key={traco.id} className="mt-3 border-t border-white/10 pt-3">
                    <h3 className="text-sm font-bold text-gray-200">{traco.titulo}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">{traco.descricao}</p>
                  </div>
                ))}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
};

export default AnimaliaHub;
