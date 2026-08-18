import { motion } from 'framer-motion';
import type { IRaca } from '../../../types/catalogo';
import type { ThemeEntry } from '../../themeMap';
import { PremiumCard } from './PremiumCard';

interface ItemCatalogo {
  id: string;
  titulo: string;
  descricao?: string;
  categoria?: string;
  nivel_minimo?: number;
  [key: string]: any;
}

interface CatalogoRacialProps {
  raca: IRaca;
  tema: ThemeEntry;
  /** Campo da raça que guarda a lista (fragmentos, modificacoes, maldicoes). */
  campo: string;
  titulo: string;
  descricao: string;
}

/** Catálogo aberto de uma raça: os Fragmentos do Amálgamo, as Modificações do
 * Autômato, as Maldições da Bruxa. São listas que o resto da página só cita de
 * passagem, e sem elas a mecânica central da raça fica invisível no livro. */
export const CatalogoRacial = ({ raca, tema, campo, titulo, descricao }: CatalogoRacialProps) => {
  const itens = raca[campo];
  if (!Array.isArray(itens) || itens.length === 0) return null;

  return (
    <section className="pt-4 mb-16">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h2
          className={`text-4xl font-bold ${tema.text} mb-3 uppercase tracking-wider`}
          style={{ fontFamily: 'Cinzel, serif' }}
        >
          {titulo}
        </h2>
        <p className="text-lg text-gray-400">{descricao}</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {(itens as ItemCatalogo[]).map((item, indice) => (
          <PremiumCard
            key={item.id}
            glowColor={tema.primary.replace('rgb(', 'rgba(').replace(')', ',0.2)')}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: (indice % 2) * 0.08 }}
            className={`flex h-full flex-col rounded-lg border-l-2 ${tema.border.split(' ')[0]} bg-black/40 p-6 backdrop-blur-md`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h3
                className={`text-xl font-light tracking-wide ${tema.text}`}
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                {item.titulo}
              </h3>
              <span className="ml-auto flex flex-wrap gap-2">
                {item.categoria && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                    {item.categoria === 'ativa' ? 'Ativa' : 'Passiva'}
                  </span>
                )}
                {typeof item.nivel_minimo === 'number' && item.nivel_minimo > 1 && (
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600">
                    nv {item.nivel_minimo}
                  </span>
                )}
              </span>
            </div>
            {item.descricao && (
              <p className="text-sm font-light leading-relaxed text-gray-400">{item.descricao}</p>
            )}
          </PremiumCard>
        ))}
      </div>
    </section>
  );
};

export default CatalogoRacial;
