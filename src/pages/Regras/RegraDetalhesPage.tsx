import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../services/catalogoService';
import { descreverOpcaoRacial, formatarAjustesRaciais, obterGruposEscolhaRacial, obterTracosOpcaoRacial } from '../../services/racaService';
import { formatarResumoClasse } from '../../services/classeService';
import { DetalhesClasse } from './components/DetalhesClasse';
import { useAuthStore } from '../../store/useAuthStore';
import { PremiumCard } from '../../redesign/components/premium/PremiumCard';
import { RACA_PAGES } from '../../redesign/raca/registry';
import { CLASSE_PAGES } from '../../redesign/classe/registry';

export const RegraDetalhesPage = () => {
  const { categoria, itemId } = useParams<{ categoria: string; itemId: string }>();
  const navigate = useNavigate();
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre'
    || campanhaAtiva?.papel === 'assistente';
  const config = campanhaAtiva?.configuracoes ?? {};
  const racasLiberadas = new Set([
    ...(config.racas_liberadas ?? []),
    ...((usuario?.id && config.racas_liberadas_membros?.[usuario.id]) ?? []),
  ]);
  const classesLiberadas = new Set([
    ...(config.classes_liberadas ?? []),
    ...((usuario?.id && config.classes_liberadas_membros?.[usuario.id]) ?? []),
  ]);

  const racaEncontrada = categoria === 'racas' ? RACAS_CATALOGO.find(item => item.id === itemId) : undefined;
  const raca = racaEncontrada && (isMestre || (!racaEncontrada.indisponivel
    && (racaEncontrada.categoria !== 'esquecida' || racasLiberadas.has(racaEncontrada.id))))
    ? racaEncontrada
    : undefined;
  const classeEncontrada = categoria === 'classes' ? CLASSES_CATALOGO.find(item => item.id === itemId) : undefined;
  const classe = classeEncontrada && (isMestre || (!classeEncontrada.indisponivel
    && (classeEncontrada.categoria !== 'esquecida' || classesLiberadas.has(classeEncontrada.id))))
    ? classeEncontrada
    : undefined;
  const item = raca ?? classe;
  const rotaRetorno = `/regras?topico=${categoria === 'classes' ? 'classes' : 'racas'}`;
  const gruposEscolhaRacial = obterGruposEscolhaRacial(raca);
  const resumoRaca = raca?.descricao
    || raca?.fisiologia?.[0]
    || (raca?.indisponivel
      ? raca.motivo_indisponivel || 'Ainda está na mão do Mestre: falta revisar antes de liberar pra mesa.'
      : `Raça ${raca?.categoria === 'padrao' ? 'comum: nasce em qualquer Árvore, sem precisar de liberação' : 'especial: só nasce nas Árvores compatíveis, e o Mestre precisa liberar'}.`);
  const fisiologiaRaca = raca?.descricao ? (raca.fisiologia || []) : (raca?.fisiologia?.slice(1) || []);
  const perfilClasse = classe
    ? classe.vida >= 5
      ? 'Linha de frente'
      : classe.mana >= 4
        ? 'Técnica e suporte'
        : 'Versátil'
    : '';
  const habilidadeCentral = classe?.habilidades?.[0]?.titulo;

  // Cores temáticas: dourado para raças, azul para classes especiais, violeta para classes especiais
  const isEspecial = (raca ?? classe)?.categoria !== 'padrao';
  const particleColor = categoria === 'racas'
    ? (isEspecial ? '#a855f7' : '#c7a44c')
    : (isEspecial ? '#8b5cf6' : '#60a5fa');
  const accentColor = categoria === 'racas'
    ? (isEspecial ? 'rgba(168,85,247,0.25)' : 'rgba(199,164,76,0.25)')
    : (isEspecial ? 'rgba(139,92,246,0.25)' : 'rgba(96,165,250,0.25)');
  const accentBorder = categoria === 'racas'
    ? (isEspecial ? 'border-purple-500/30' : 'border-yellow-600/30')
    : (isEspecial ? 'border-violet-500/30' : 'border-blue-400/30');
  const accentText = categoria === 'racas'
    ? (isEspecial ? 'text-purple-400' : 'text-yellow-500')
    : (isEspecial ? 'text-violet-400' : 'text-blue-400');

  if (!item) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-6 relative bg-[#07060d]">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-600/10 to-transparent" />
        <div className="relative z-10 flex flex-col items-center text-center max-w-md bg-black/60 backdrop-blur-md p-8 rounded-2xl border border-white/5">
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

  const RacaPage = raca ? RACA_PAGES[raca.id] : undefined;
  const ClassePage = classe ? CLASSE_PAGES[classe.id] : undefined;

  if (RacaPage || ClassePage) {
    return (
      <div className="relative min-h-screen">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(rotaRetorno)}
          className="fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-sm font-bold uppercase tracking-wider text-gray-300 backdrop-blur-md transition-colors hover:text-white sm:left-8 sm:top-8"
        >
          <ArrowLeft size={16} />
          Voltar
        </motion.button>
        {RacaPage && raca ? <RacaPage raca={raca} /> : ClassePage && classe ? <ClassePage classe={classe} /> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full text-white relative bg-[#07060d]">
      <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${particleColor}, transparent)` }} />

      {/* Gradient overlay para legibilidade */}
      <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-24 lg:px-12">

        {/* Botão Voltar */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(rotaRetorno)}
          className="text-gray-400 hover:text-white mb-10 text-sm font-bold uppercase tracking-wider flex items-center gap-2 group transition-colors"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para Regras
        </motion.button>

        {/* Header da página */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] mb-4 ${accentText}`}
          >
            {isEspecial && <Sparkles size={14} />}
            Catálogo de {categoria === 'racas' ? 'Raças' : 'Classes'}
            {isEspecial && ' · Especial'}
          </motion.span>

          <h1
            className="text-5xl font-black text-white drop-shadow-2xl sm:text-6xl lg:text-7xl xl:text-8xl"
            style={{ fontFamily: 'Cinzel, serif', textShadow: `0 0 60px ${particleColor}55` }}
          >
            {raca?.titulo || classe?.titulo}
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`mt-6 inline-flex flex-wrap items-center gap-3 bg-black/50 backdrop-blur-sm px-5 py-3 rounded-xl border ${accentBorder}`}
          >
            {raca && <span className="text-sm font-mono text-gray-200">{formatarAjustesRaciais(raca)}</span>}
            {classe && <span className="text-sm font-mono text-gray-200">{formatarResumoClasse(classe)}</span>}
          </motion.div>
        </motion.div>

        {/* Conteúdo principal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-8"
        >
          {/* Card "Em poucas palavras" (Classe) */}
          {classe && (
            <PremiumCard
              glowColor={accentColor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-black/50 backdrop-blur-sm border ${accentBorder} rounded-2xl p-6 sm:p-8`}
            >
              <div className={`mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${accentText}`}>
                <BookOpen size={16} />
                Em poucas palavras
              </div>
              <p className="max-w-4xl text-base leading-relaxed text-gray-200 sm:text-lg">{classe.descricao}</p>
              <p className="mt-3 max-w-4xl text-sm leading-relaxed text-gray-400">
                Na mesa, quase tudo passa por{' '}
                <strong className="text-gray-200">{habilidadeCentral || 'sua habilidade central'}</strong>.
                O resto vem em cima disso: habilidades próprias, eventos que a classe convoca e oito escolhas de poder ao longo dos 20 níveis.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">Perfil: {perfilClasse}</span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">
                  {classe.categoria === 'padrao' ? 'Classe comum' : 'Classe especial'}
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">Progressão: 20 níveis</span>
              </div>
            </PremiumCard>
          )}

          {/* Card "Em poucas palavras" (Raça) */}
          {raca && (
            <PremiumCard
              glowColor={accentColor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-black/50 backdrop-blur-sm border ${accentBorder} rounded-2xl p-6 sm:p-8`}
            >
              <div className={`mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] ${accentText}`}>
                <BookOpen size={16} />
                Em poucas palavras
              </div>
              <p className="max-w-4xl text-base leading-relaxed text-gray-200 sm:text-lg">{resumoRaca}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">
                  {raca.categoria === 'padrao' ? 'Raça comum' : 'Raça especial'}
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-gray-300">
                  {raca.categoria === 'padrao' ? 'Qualquer Árvore' : 'Árvores específicas'}
                </span>
              </div>
            </PremiumCard>
          )}

          {/* Fisiologia */}
          {fisiologiaRaca.map((descricao, idx) => (
            <PremiumCard
              key={`fisiologia-${idx}`}
              glowColor={accentColor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + (idx * 0.08) }}
              className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8"
            >
              <h3 className={`text-xl font-bold mb-3 ${accentText}`} style={{ fontFamily: 'Cinzel, serif' }}>
                Fisiologia
              </h3>
              <p className="text-gray-300 leading-relaxed font-light text-lg">{descricao}</p>
            </PremiumCard>
          ))}

          {/* Características / Traços Raciais */}
          {raca?.caracteristicas?.map((traco, idx) => (
            <PremiumCard
              key={traco.id}
              glowColor={accentColor}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (idx * 0.1) }}
              className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 sm:p-8"
            >
              <h3 className={`text-xl font-bold mb-3 ${accentText}`} style={{ fontFamily: 'Cinzel, serif' }}>
                {traco.titulo}
              </h3>
              <p className="text-gray-300 leading-relaxed font-light text-lg">
                {traco.descricao}
              </p>
            </PremiumCard>
          ))}

          {/* Grupos de Escolha Racial */}
          {gruposEscolhaRacial.map(grupo => (
            <section key={grupo.campo} className="pt-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
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
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * opcaoIdx }}
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

          {/* Detalhes da Classe (progressão, habilidades, eventos, poderes) */}
          {classe && (
            <div className="mt-4">
              <DetalhesClasse classe={classe} />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};
