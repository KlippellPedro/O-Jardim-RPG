import { motion } from 'framer-motion';
import { ArrowRight, MoveRight } from 'lucide-react';
import type { IRaca } from '../../../types/catalogo';
import { nivelMinimoTraco } from '../../../services/racaService';
import { PremiumCard } from '../../components/premium/PremiumCard';
import { bonusDoEstagio, marcasEscolhiveis, nomeCurtoDoEstagio, type NaturezaDoEspirito } from './dados';
import { visualDaNatureza } from './visual';

interface EspiritoHubProps {
  raca: IRaca;
  naturezas: NaturezaDoEspirito[];
  abrir: (naturezaId: string) => void;
}

/** "Demônio Menor › Maior › Primordial": o nome completo uma vez só. */
function resumoDosEstagios(estagios: NaturezaDoEspirito['estagios']): string {
  if (estagios.length === 0) return '';
  return [estagios[0].titulo, ...estagios.slice(1).map(nomeCurtoDoEstagio)].join(' › ');
}

/** O que a Natureza entrega de corpo, em uma linha para o cartão. */
function resumoDoCorpo(natureza: NaturezaDoEspirito): string {
  const traco = natureza.tracos[0];
  if (!traco) return 'Nunca tem corpo';
  return `${traco.titulo}, a partir do nível ${nivelMinimoTraco(traco)}`;
}

/** Porta de entrada do Espírito: o que todo espírito tem em comum e as Naturezas
 * para escolher. Cada Natureza abre uma página própria. */
export const EspiritoHub = ({ raca, naturezas, abrir }: EspiritoHubProps) => {
  const base = visualDaNatureza('natural');
  const passagem = raca.caracteristicas?.find(traco => traco.id === 'passagem-eterea');
  // Os degraus e o Mana são os mesmos nas três Naturezas: a primeira escada serve de amostra.
  const degraus = naturezas[0]?.estagios ?? [];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, filter: 'blur(10px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="text-center mb-16"
      >
        <base.Icone size={44} strokeWidth={1} className={`mx-auto mb-6 ${base.tema.icon}`} />
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.32em] text-cyan-300/60">Raça especial · autorização do mestre</p>
        <h1
          className={`text-5xl sm:text-7xl font-light tracking-widest ${base.tema.text} mb-6 uppercase`}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          Espírito
        </h1>
        <p className="text-lg text-cyan-200/60 max-w-2xl mx-auto font-light leading-relaxed">{raca.descricao}</p>
      </motion.header>

      <PremiumCard
        glowColor={base.tema.glow}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className={`mb-16 grid gap-8 rounded-lg ${base.tema.bg} border-t ${base.tema.border} p-6 sm:p-8 backdrop-blur-md md:grid-cols-2`}
      >
        <div>
          <h2 className={`mb-4 text-xl font-light ${base.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
            O que todo espírito tem
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-cyan-100/60">
            {(raca.fisiologia || []).map(linha => <li key={linha}>{linha}</li>)}
          </ul>
        </div>
        {passagem && (
          <div className="flex gap-4">
            <MoveRight size={28} strokeWidth={1} className={`${base.tema.icon} mt-1 shrink-0`} />
            <div>
              <h3 className={`mb-2 text-xl font-light ${base.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                {passagem.titulo}
              </h3>
              <p className="text-sm leading-relaxed text-cyan-100/60">{passagem.descricao}</p>
            </div>
          </div>
        )}
      </PremiumCard>

      <section className="mb-16">
        <div className="mb-8">
          <h2 className={`text-3xl sm:text-4xl font-bold ${base.tema.text} mb-3 uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
            Escolha a Natureza
          </h2>
          <p className="text-lg text-gray-400">
            Toda morte que deixa um espírito para trás leva a uma das três. Escolha uma para ver os estágios e as marcas dela.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {naturezas.map((completo, indice) => {
            const { natureza, estagios, rotuloMarca } = completo;
            const visual = visualDaNatureza(natureza.id);
            return (
              <motion.button
                key={natureza.id}
                type="button"
                onClick={() => abrir(natureza.id)}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: indice * 0.1 }}
                aria-label={`Abrir ${natureza.titulo}`}
                className={`group flex h-full flex-col gap-5 rounded-xl border ${visual.tema.border} ${visual.tema.bg} p-7 text-left backdrop-blur-md transition-transform duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60`}
                style={{ boxShadow: `0 0 28px ${visual.tema.glow}` }}
              >
                <div className="flex items-center gap-4">
                  <visual.Icone size={30} strokeWidth={1} className={`${visual.tema.icon} shrink-0`} />
                  <h3 className={`text-2xl font-light leading-tight ${visual.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                    {natureza.titulo}
                  </h3>
                </div>

                <p className="text-sm font-light leading-relaxed text-gray-300/75">{natureza.descricao}</p>

                <dl className="mt-auto space-y-3 border-t border-white/10 pt-5 text-xs">
                  <div>
                    <dt className="font-bold uppercase tracking-[0.14em] text-gray-500">Marca</dt>
                    <dd className="mt-0.5 text-gray-300">{rotuloMarca}, {marcasEscolhiveis(completo)} opções</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.14em] text-gray-500">Corpo</dt>
                    <dd className="mt-0.5 text-gray-300">{resumoDoCorpo(completo)}</dd>
                  </div>
                  <div>
                    <dt className="font-bold uppercase tracking-[0.14em] text-gray-500">Estágios</dt>
                    <dd className="mt-0.5 text-gray-300">{resumoDosEstagios(estagios)}</dd>
                  </div>
                </dl>

                <span className={`flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] ${visual.tema.text}`}>
                  Ver {natureza.titulo}
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </section>

      {degraus.length > 0 && (
        <section>
          <h2 className={`mb-3 text-2xl font-bold ${base.tema.text} uppercase tracking-wider`} style={{ fontFamily: 'Cinzel, serif' }}>
            Amadurecimento
          </h2>
          <p className="mb-6 max-w-3xl text-gray-400">
            O espírito amadurece sozinho, pelo nível total, em seis degraus. Cada um soma Mana e Vida, melhora o que a Natureza dá e abre o poder seguinte da marca. O último, o Primordial, pede além do nível 60 uma Provação, que só o Mestre marca como cumprida.
          </p>
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {degraus.map(estagio => (
              <li key={estagio.id} className="rounded-lg border border-white/10 bg-black/35 p-5 backdrop-blur-md">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                  Nível total {nivelMinimoTraco(estagio)}
                </p>
                <p className={`mt-1 text-xl font-light ${base.tema.text}`} style={{ fontFamily: 'Cinzel, serif' }}>
                  {nomeCurtoDoEstagio(estagio)}
                </p>
                <p className="mt-1 text-sm text-gray-400">{bonusDoEstagio(estagio) || 'Ponto de partida'}</p>
                {estagio.requer_condicao && (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">Exige uma Provação</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
};

export default EspiritoHub;
