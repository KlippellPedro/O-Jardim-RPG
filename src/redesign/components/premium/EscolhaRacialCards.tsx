import { motion } from 'framer-motion';
import type { IRaca } from '../../../types/catalogo';
import {
  descreverOpcaoRacial,
  nivelMinimoTraco,
  obterEstagiosRaciais,
  obterGruposEscolhaRacial,
  obterTracosOpcaoRacial,
  temDescricaoPropria,
} from '../../../services/racaService';
import type { ThemeEntry } from '../../themeMap';
import { PremiumCard } from './PremiumCard';

/** Cor crua de uma opção racial, usada no filete e no ponto do cartão. */
export interface EstiloOpcaoRacial {
  tinta: string;
  text: string;
  border: string;
}

interface EscolhaRacialCardsProps {
  raca: IRaca;
  tema: ThemeEntry;
  /** Paleta opcional por id de opção (as Cores da Alma do Espírito, o sangue
   * de cada Linhagem Gigante...). Sem ela, todos os cartões usam o tema da raça. */
  paleta?: Record<string, EstiloOpcaoRacial>;
}

/** Grade de cartões das escolhas raciais - variantes, linhagens e condições
 * ancestrais. Substituiu a tabela de três colunas que espremia opção,
 * descrição e traços num scroll horizontal ilegível. */
export const EscolhaRacialCards = ({ raca, tema, paleta }: EscolhaRacialCardsProps) => {
  const grupos = obterGruposEscolhaRacial(raca);
  if (grupos.length === 0) return null;

  const padrao: EstiloOpcaoRacial = {
    tinta: tema.primary,
    text: tema.text,
    border: tema.border.split(' ')[0],
  };

  // Nível exigido -> nome curto do estágio, pra etiquetar cada traço.
  const estagios = obterEstagiosRaciais(raca);
  const nomeDoEstagio = new Map(estagios.map(estagio => {
    const bruto = String(estagio.titulo || '');
    const curto = bruto.replace(new RegExp(`^${raca.titulo}\\s+`, 'i'), '');
    return [nivelMinimoTraco(estagio), curto || bruto];
  }));

  return (
    <>
      {grupos.map(grupo => (
        <section key={grupo.campo} className="pt-4 mb-16">
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
              {grupo.rotulo}
            </h2>
            <p className="text-lg text-gray-400">{grupo.descricao}</p>
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {grupo.opcoes.map((opcao, indice) => {
              const tracos = obterTracosOpcaoRacial(opcao);
              const estilo = paleta?.[opcao.id] || padrao;

              return (
                <PremiumCard
                  key={opcao.id}
                  glowColor={estilo.tinta.replace('rgb(', 'rgba(').replace(')', ',0.2)')}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: (indice % 2) * 0.08 }}
                  className={`flex h-full flex-col rounded-lg border-l-2 ${estilo.border} bg-black/40 p-7 backdrop-blur-md`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: estilo.tinta }} />
                    <h3
                      className={`text-2xl font-light tracking-wide ${estilo.text}`}
                      style={{ fontFamily: 'Cinzel, serif' }}
                    >
                      {opcao.titulo}
                    </h3>
                    {opcao.fluxo && (
                      <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">
                        Fluxo {String(opcao.fluxo)}
                      </span>
                    )}
                  </div>

                  {temDescricaoPropria(opcao) && (
                    <p className="text-sm font-light leading-relaxed text-gray-400">
                      {descreverOpcaoRacial(opcao)}
                    </p>
                  )}

                  {tracos.length > 0 && (
                    <div className="mt-6 space-y-4 border-t border-white/10 pt-5">
                      {tracos.map(traco => {
                        const nivel = nivelMinimoTraco(traco);
                        return (
                          <div key={traco.id} className="grid grid-cols-[auto_1fr] gap-x-4">
                            <span
                              className="mt-1 w-24 shrink-0 text-[10px] font-bold uppercase leading-4 tracking-[0.14em] text-gray-500"
                              title={nivel > 1 ? `Desperta no nível total ${nivel}` : 'Vale desde o começo'}
                            >
                              {nomeDoEstagio.get(nivel) || (nivel > 1 ? 'Avançado' : 'Inicial')}
                              <span className="block text-gray-600">nv {nivel}</span>
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-gray-200">{traco.titulo}</h4>
                              {traco.descricao && (
                                <p className="mt-1 text-xs leading-relaxed text-gray-400">{traco.descricao}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </PremiumCard>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
};

export default EscolhaRacialCards;
