import { motion } from 'framer-motion';
import { Languages, Target, Users } from 'lucide-react';
import type { IRaca } from '../../../types/catalogo';
import { fraseDaLinguaDoPovo } from '../../../services/racaService';

interface PovoDaRacaProps {
  raca: IRaca;
  /** Nas páginas únicas de raça, as seções entram depois da página e precisam
   * do próprio container por cima do fundo fixo dela. */
  avulsa?: boolean;
}

const CARTAO = 'rounded-2xl border border-white/10 bg-black/55 p-6 backdrop-blur-sm sm:p-8';

/** O que todo povo da raça carrega em qualquer Árvore. Vem só do corpo e da
 * natureza da raça; o jeito de viver de cada lugar mora no reino da lore e nas
 * tabelas de cultura do Guia do Mestre. Logo abaixo, a DT dos traços da raça. */
export const PovoDaRaca = ({ raca, avulsa }: PovoDaRacaProps) => {
  const linhas = (raca.povo || []).filter(Boolean);
  const lingua = fraseDaLinguaDoPovo(raca);
  const dt = raca.dt_efeitos;
  if (!linhas.length && !dt) return null;

  const secoes = (
    <>
      {linhas.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          aria-labelledby={`povo-${raca.id}`}
          className={CARTAO}
        >
          <div className="mb-4 flex items-center gap-3">
            <Users size={22} className="text-[#e1c77e]" strokeWidth={1.5} />
            <h2 id={`povo-${raca.id}`} className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              O que todo povo carrega
            </h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-gray-400">
            Vale em qualquer Árvore, porque vem do corpo e da natureza da raça. O jeito de viver de cada lugar fica com o reino de onde o povo é, e o Mestre monta o resto.
          </p>
          <ul className="space-y-3">
            {linhas.map((linha, indice) => (
              <li key={indice} className="flex gap-3 leading-relaxed text-gray-200">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7a44c]" />
                <span>{linha}</span>
              </li>
            ))}
          </ul>
          {lingua && (
            <p className="mt-5 flex gap-3 border-t border-white/10 pt-5 leading-relaxed text-gray-300">
              <Languages size={18} className="mt-1 shrink-0 text-[#e1c77e]" strokeWidth={1.5} aria-hidden />
              <span>{lingua}</span>
            </p>
          )}
        </motion.section>
      )}
      {dt && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          aria-labelledby={`dt-${raca.id}`}
          className={CARTAO}
        >
          <div className="mb-3 flex items-center gap-3">
            <Target size={22} className="text-[#e1c77e]" strokeWidth={1.5} />
            <h2 id={`dt-${raca.id}`} className="text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              {dt.rotulo}
            </h2>
          </div>
          <p className="leading-relaxed text-gray-200">{dt.descricao}</p>
        </motion.section>
      )}
    </>
  );

  if (!avulsa) return <div className="space-y-6">{secoes}</div>;
  return (
    <div className="relative z-10 mx-auto w-full max-w-5xl space-y-6 px-4 pb-24 sm:px-8">
      {secoes}
    </div>
  );
};

export default PovoDaRaca;
