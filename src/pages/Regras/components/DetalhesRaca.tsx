import { motion } from 'framer-motion';
import type { IRaca } from '../../../types/catalogo';
import { descreverOpcaoRacial, obterGruposEscolhaRacial, obterTracosOpcaoRacial } from '../../../services/racaService';
import { PremiumCard } from '../../../redesign/components/premium/PremiumCard';

interface DetalhesRacaProps {
  raca: IRaca;
  hideBaseTraits?: boolean;
}

/** Seções mecânicas geradas a partir do catálogo (fisiologia completa,
 * características e grupos de escolha racial), reaproveitadas por qualquer
 * página única de raça em `src/redesign/raca/`. O "em poucas palavras" fica
 * a cargo do hero de cada página, por isso não é repetido aqui. */
export const DetalhesRaca = ({ raca, hideBaseTraits }: DetalhesRacaProps) => {
  const especial = raca.categoria !== 'padrao';
  const accentColor = especial ? 'rgba(168,85,247,0.25)' : 'rgba(199,164,76,0.25)';
  const accentText = especial ? 'text-purple-400' : 'text-yellow-500';

  const fisiologia = raca.descricao ? (raca.fisiologia || []) : (raca.fisiologia?.slice(1) || []);
  const gruposEscolhaRacial = obterGruposEscolhaRacial(raca);

  return (
    <div className="space-y-8">
      {!hideBaseTraits && fisiologia.map((descricao, idx) => (
        <PremiumCard
          key={`fisiologia-${idx}`}
          glowColor={accentColor}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.08 }}
          className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8"
        >
          <h3 className={`text-xl font-bold mb-3 ${accentText}`} style={{ fontFamily: 'Cinzel, serif' }}>
            Fisiologia
          </h3>
          <p className="text-gray-300 leading-relaxed font-light text-lg">{descricao}</p>
        </PremiumCard>
      ))}

      {!hideBaseTraits && raca.caracteristicas?.map((traco, idx) => (
        <PremiumCard
          key={traco.id}
          glowColor={accentColor}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.1 }}
          className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8"
        >
          <h3 className={`text-xl font-bold mb-3 ${accentText}`} style={{ fontFamily: 'Cinzel, serif' }}>
            {traco.titulo}
          </h3>
          <p className="text-gray-300 leading-relaxed font-light text-lg">{traco.descricao}</p>
        </PremiumCard>
      ))}

      {gruposEscolhaRacial.map(grupo => (
        <section key={grupo.campo} className="pt-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              {grupo.rotulo}
            </h2>
            <p className="text-gray-400">{grupo.descricao}</p>
          </motion.div>
          <div className="space-y-5">
            {grupo.opcoes.map((opcao, opcaoIdx) => {
              const tracos = obterTracosOpcaoRacial(opcao);
              return (
                <PremiumCard
                  key={opcao.id}
                  glowColor={accentColor}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * opcaoIdx }}
                  className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8"
                >
                  <h3 className={`text-xl font-bold mb-2 ${accentText}`} style={{ fontFamily: 'Cinzel, serif' }}>
                    {opcao.titulo}
                  </h3>
                  {grupo.campo !== 'linhagemId' && (
                    <p className="text-gray-400 leading-relaxed">{descreverOpcaoRacial(opcao)}</p>
                  )}
                  {tracos.length > 0 && (
                    <div className="mt-5 space-y-4 border-t border-white/5 pt-5">
                      {tracos.map(traco => (
                        <div key={traco.id}>
                          <h4 className="text-sm font-bold text-gray-200 mb-1">{traco.titulo}</h4>
                          {traco.descricao && <p className="text-sm text-gray-400 leading-relaxed">{traco.descricao}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </PremiumCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default DetalhesRaca;
