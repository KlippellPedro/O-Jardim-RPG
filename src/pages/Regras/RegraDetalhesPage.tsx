import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, BookOpen } from 'lucide-react';
import AtmosphericBackground from '../../AtmosphericBackground';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../services/catalogoService';
import { descreverOpcaoRacial, formatarAjustesRaciais, obterGruposEscolhaRacial, obterTracosOpcaoRacial } from '../../services/racaService';
import { formatarResumoClasse } from '../../services/classeService';
import { DetalhesClasse } from './components/DetalhesClasse';

export const RegraDetalhesPage = () => {
  const { categoria, itemId } = useParams<{ categoria: string; itemId: string }>();
  const navigate = useNavigate();

  const raca = categoria === 'racas' ? RACAS_CATALOGO.find(item => item.id === itemId) : undefined;
  const classe = categoria === 'classes' ? CLASSES_CATALOGO.find(item => item.id === itemId) : undefined;
  const item = raca ?? classe;
  const rotaRetorno = `/regras?topico=${categoria === 'classes' ? 'classes' : 'racas'}`;
  const gruposEscolhaRacial = obterGruposEscolhaRacial(raca);
  const resumoRaca = raca?.descricao
    || raca?.fisiologia?.[0]
    || (raca?.indisponivel
      ? 'Esta raça especial ainda não possui um pacote jogável publicado.'
      : `Uma raça ${raca?.categoria === 'padrao' ? 'comum, disponível em qualquer Árvore' : 'especial, ligada apenas às Árvores compatíveis'}.`);
  const fisiologiaRaca = raca?.descricao ? (raca.fisiologia || []) : (raca?.fisiologia?.slice(1) || []);
  const perfilClasse = classe
    ? classe.vida >= 5
      ? 'Linha de frente'
      : classe.mana >= 4
        ? 'Técnica e suporte'
        : 'Versátil'
    : '';
  const habilidadeCentral = classe?.habilidades?.[0]?.titulo;

  if (!item) {
    return (
      <div className="min-h-screen bg-[#07060a] text-white flex flex-col items-center justify-center p-6 relative">
        <AtmosphericBackground />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md bg-[#0f0e15]/80 backdrop-blur-md p-8 rounded-2xl border border-white/5">
          <ShieldAlert size={64} className="text-yellow-600 mb-6" />
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Cinzel, serif' }}>Tópico Não Encontrado</h1>
          <p className="text-gray-400 mb-8">A página solicitada não existe ou foi removida dos compêndios.</p>
          <button 
            onClick={() => navigate(rotaRetorno)}
            className="px-6 py-3 rounded-full bg-yellow-600/20 text-yellow-500 font-bold hover:bg-yellow-600/30 border border-yellow-600/30 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            Voltar para as Regras
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#07060a] text-white relative">
      <AtmosphericBackground />
      
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-24 lg:px-12">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(rotaRetorno)}
          className="text-gray-400 hover:text-white mb-10 text-sm font-bold uppercase tracking-wider flex items-center gap-2 group transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para Regras
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-[#0f0e15]/80 p-5 shadow-2xl backdrop-blur-xl sm:p-8 lg:p-12 xl:p-14"
        >
          <div className="mb-10 border-b border-white/5 pb-8 lg:mb-12">
            <span className="text-yellow-600/80 text-xs font-bold uppercase tracking-widest mb-3 block">
              Catálogo de {categoria === 'racas' ? 'Raças' : 'Classes'}
            </span>
            <h1 className="mb-4 text-4xl font-bold text-white drop-shadow-md sm:text-5xl lg:text-6xl" style={{ fontFamily: 'Cinzel, serif' }}>
              {raca?.titulo || classe?.titulo}
            </h1>
            
            {raca && (
              <div className="inline-flex flex-wrap items-center gap-3 bg-black/40 px-4 py-2.5 rounded-lg border border-white/5">
                <span className="text-sm font-mono text-gray-300">{formatarAjustesRaciais(raca)}</span>
              </div>
            )}
            {classe && (
              <div className="inline-flex flex-wrap items-center gap-3 bg-black/40 px-4 py-2.5 rounded-lg border border-white/5">
                <span className="text-sm font-mono text-gray-300">{formatarResumoClasse(classe)}</span>
              </div>
            )}
          </div>

          <div className="space-y-10">
            {classe && (
              <section className="rounded-2xl border border-yellow-600/20 bg-gradient-to-br from-yellow-600/10 via-black/20 to-transparent p-5 sm:p-7">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-500">
                  <BookOpen size={16} />
                  Em poucas palavras
                </div>
                <p className="max-w-4xl text-base leading-relaxed text-gray-200 sm:text-lg">{classe.descricao}</p>
                <p className="mt-3 max-w-4xl text-sm leading-relaxed text-gray-400">
                  Em jogo, sua evolução gira em torno de <strong className="text-gray-200">{habilidadeCentral || 'sua habilidade central'}</strong>, acompanhada por habilidades próprias, eventos e oito escolhas de poder ao longo dos 20 níveis.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">Perfil: {perfilClasse}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">{classe.categoria === 'padrao' ? 'Classe comum' : 'Classe especial'}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">Progressão: 20 níveis</span>
                </div>
              </section>
            )}

            {raca && (
              <section className="rounded-2xl border border-yellow-600/20 bg-gradient-to-br from-yellow-600/10 via-black/20 to-transparent p-5 sm:p-7">
                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-yellow-500">
                  <BookOpen size={16} />
                  Em poucas palavras
                </div>
                <p className="max-w-4xl text-base leading-relaxed text-gray-200 sm:text-lg">{resumoRaca}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">{raca.categoria === 'padrao' ? 'Raça comum' : 'Raça especial'}</span>
                  <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">{raca.categoria === 'padrao' ? 'Qualquer Árvore' : 'Árvores específicas'}</span>
                </div>
              </section>
            )}

            {fisiologiaRaca.map((descricao, idx) => (
              <motion.div
                key={`fisiologia-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (idx * 0.05) }}
                className="group"
              >
                <h3 className="text-xl font-bold text-yellow-500 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  Fisiologia
                </h3>
                <p className="text-gray-300 leading-relaxed font-light text-lg">{descricao}</p>
              </motion.div>
            ))}

            {raca?.caracteristicas?.map((traco, idx) => (
              <motion.div 
                key={traco.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + (idx * 0.1) }}
                className="group"
              >
                <h3 className="text-xl font-bold text-yellow-500 mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  {traco.titulo}
                </h3>
                <p className="text-gray-300 leading-relaxed font-light text-lg">
                  {traco.descricao}
                </p>
              </motion.div>
            ))}

            {gruposEscolhaRacial.map(grupo => (
              <section key={grupo.campo} className="pt-8 border-t border-white/10">
                <h2 className="text-3xl font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                  {grupo.rotulo}
                </h2>
                <p className="text-gray-400 mb-6">{grupo.descricao}</p>
                <div className="space-y-5">
                  {grupo.opcoes.map(opcao => {
                    const tracos = obterTracosOpcaoRacial(opcao);
                    return (
                      <article key={opcao.id} className="bg-black/30 border border-white/10 rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-yellow-500 mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                          {opcao.titulo}
                        </h3>
                        <p className="text-gray-400 leading-relaxed">{descreverOpcaoRacial(opcao)}</p>
                        {tracos.length > 0 && (
                          <div className="mt-5 space-y-4">
                            {tracos.map(traco => (
                              <div key={traco.id}>
                                <h4 className="text-sm font-bold text-gray-200 mb-1">{traco.titulo}</h4>
                                {traco.descricao && <p className="text-sm text-gray-400 leading-relaxed">{traco.descricao}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            
            {classe && <DetalhesClasse classe={classe} />}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
