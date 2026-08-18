import { motion } from 'framer-motion';
import type { IRaca } from '../../../types/catalogo';
import { nivelMinimoTraco, obterEstagiosRaciais } from '../../../services/racaService';
import type { ThemeEntry } from '../../themeMap';
import { PremiumCard } from './PremiumCard';

interface EstagiosRaciaisProps {
  raca: IRaca;
  tema: ThemeEntry;
  /** Título da seção. Cada raça chama a própria escada pelo nome: "Estágios da
   * Alma" no Espírito, "Massa" no Slime, "Idade" no Elfo. */
  titulo?: string;
  descricao?: string;
}

/** Escada de maturação por nível total. Só aparece para raças que declaram
 * `estagios` em data/ficha/racas.json. */
export const EstagiosRaciais = ({ raca, tema, titulo = 'Estágios', descricao }: EstagiosRaciaisProps) => {
  const estagios = obterEstagiosRaciais(raca);
  if (estagios.length === 0) return null;

  const texto = descricao
    || 'Os degraus abrem por nível total, sem precisar de autorização do mestre, e o que eles dão se acumula.';

  return (
    <section className="pt-4 mb-20">
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
        <p className="text-lg text-gray-400">{texto}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {estagios.map((estagio, idx) => (
          <PremiumCard
            key={estagio.id}
            glowColor={tema.glow}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.12 }}
            className={`p-8 rounded-lg ${tema.bg} border-t ${tema.border} backdrop-blur-md`}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500">
              Nível total {nivelMinimoTraco(estagio)}+
            </span>
            <h3
              className={`text-2xl font-light ${tema.text} mt-2 mb-3`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {estagio.titulo}
            </h3>
            {estagio.descricao && (
              <p className="text-sm font-light leading-relaxed text-gray-400">{estagio.descricao}</p>
            )}
            {(Number(estagio.vida) !== 0 || Number(estagio.mana) !== 0) && (
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-gray-500">
                {[
                  Number(estagio.vida) ? `Vida ${Number(estagio.vida) > 0 ? '+' : ''}${estagio.vida}` : '',
                  Number(estagio.mana) ? `Mana ${Number(estagio.mana) > 0 ? '+' : ''}${estagio.mana}` : '',
                ].filter(Boolean).join(' · ')}
              </p>
            )}
            {(estagio.caracteristicas?.length || 0) > 0 && (
              <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                {estagio.caracteristicas?.map(traco => (
                  <div key={traco.id}>
                    <h4 className="text-sm font-bold text-gray-200 mb-1">{traco.titulo}</h4>
                    {traco.descricao && (
                      <p className="text-xs leading-relaxed text-gray-400">{traco.descricao}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </PremiumCard>
        ))}
      </div>
    </section>
  );
};

export default EstagiosRaciais;
