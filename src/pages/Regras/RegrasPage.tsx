import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, ShieldAlert, Sparkles, ChevronRight, ArrowRight, ArrowLeft } from 'lucide-react';
import { REGRAS_OFICIAIS } from '../../data/regras';
import { CLASSES_CATALOGO, RACAS_CATALOGO } from '../../services/catalogoService';
import { GridRacas } from './components/GridRacas';
import { GridClasses } from './components/GridClasses';
import { RegrasContent } from './components/RegrasContent';
import { useAuthStore } from '../../store/useAuthStore';

const formatTitle = (key: string) => {
  return key
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const RegrasPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [busca, setBusca] = useState('');
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || usuario?.papel_plataforma === 'mestre' || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';

  const catalogKeys = useMemo(
    () => Object.keys(REGRAS_OFICIAIS).filter(key => key !== 'mestre' || isMestre),
    [isMestre],
  );
  const topicoSolicitado = searchParams.get('topico');
  const activeTopic = topicoSolicitado && catalogKeys.includes(topicoSolicitado)
    ? topicoSolicitado
    : 'sistema-base';

  const setActiveTopic = (topico: string) => {
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.set('topico', topico);
    setSearchParams(proximosParametros, { replace: true });
  };

  const filteredKeys = useMemo(() => {
    if (!busca.trim()) return catalogKeys;
    const lowerBusca = busca.toLowerCase();
    return catalogKeys.filter(key => {
      const topic = REGRAS_OFICIAIS[key];
      const matchTitle = formatTitle(key).toLowerCase().includes(lowerBusca);
      const matchResumo = topic.resumo.toLowerCase().includes(lowerBusca);
      return matchTitle || matchResumo;
    });
  }, [busca, catalogKeys]);

  const groupedKeys = useMemo(() => {
    const groups: Record<string, string[]> = {
      'Livro do Jogador': [],
      'Combate e Mecânicas': [],
      'Guia do Mestre': [],
      'Gerais': []
    };
    filteredKeys.forEach(key => {
      const cat = REGRAS_OFICIAIS[key].categoria || 'Gerais';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(key);
    });
    // Remove empty groups
    Object.keys(groups).forEach(k => {
      if (groups[k].length === 0) delete groups[k];
    });
    return groups;
  }, [filteredKeys]);

  const topicData = REGRAS_OFICIAIS[activeTopic];

  const activeIndex = catalogKeys.indexOf(activeTopic);
  const prevTopic = activeIndex > 0 ? catalogKeys[activeIndex - 1] : null;
  const nextTopic = activeIndex >= 0 && activeIndex < catalogKeys.length - 1 ? catalogKeys[activeIndex + 1] : null;

  return (
    <div className="pl-24 lg:pl-32 p-6 lg:p-12 relative z-10 w-full min-h-screen flex flex-col md:flex-row gap-8 max-w-[1600px] mx-auto">
      
      {/* SIDEBAR DE NAVEGAÇÃO */}
      <div className="w-full md:w-72 flex-shrink-0 flex flex-col gap-6 pt-12 md:pt-0">
        <div>
          <h2 className="text-4xl text-primary font-bold mb-2 flex items-center gap-3" style={{ fontFamily: 'Cinzel, serif' }}>
            <BookOpen size={32} className="text-yellow-600" />
            Regras
          </h2>
          <p className="text-gray-400 text-sm">O compêndio de mecânicas oficiais.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar regra..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15]/80 backdrop-blur-md border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-yellow-600/50 outline-none text-sm shadow-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2 pb-24">
          {Object.keys(groupedKeys).length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Nenhum tópico encontrado.
            </div>
          ) : (
            Object.entries(groupedKeys).map(([categoria, keys]) => (
              <div key={categoria} className="mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 pl-2">
                  {categoria}
                </h3>
                <div className="flex flex-col gap-1">
                  {keys.map(key => (
                    <button
                      key={key}
                      onClick={() => setActiveTopic(key)}
                      className={`text-left px-4 py-2.5 rounded-xl transition-all duration-300 border flex items-center justify-between group ${
                        activeTopic === key
                          ? 'bg-yellow-600/10 border-yellow-600/50 shadow-[0_0_15px_rgba(202,138,4,0.15)]'
                          : 'bg-[#0f0e15]/50 border-white/5 hover:border-white/20 hover:bg-[#15141b]/80'
                      }`}
                    >
                      <span className={`font-bold text-sm ${activeTopic === key ? 'text-yellow-500' : 'text-gray-300 group-hover:text-white'}`}>
                        {formatTitle(key)}
                      </span>
                      {activeTopic === key && (
                        <motion.div layoutId="activeIndicator">
                          <ChevronRight size={16} className="text-yellow-600" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL DE LEITURA */}
      <div className="flex-1 bg-[#0f0e15]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 lg:p-12 overflow-y-auto custom-scrollbar shadow-2xl relative">
        <AnimatePresence mode="wait">
          {topicData ? (
            <motion.div
              key={activeTopic}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={activeTopic === 'classes' || activeTopic === 'racas' ? 'max-w-none' : 'max-w-4xl'}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-yellow-600/20 border border-yellow-600/30 text-yellow-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={12} />
                  {topicData.status}
                </span>
              </div>
              
              <h1 className="text-5xl font-bold text-white mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
                {formatTitle(activeTopic)}
              </h1>
              
              <p className="text-xl text-gray-300 mb-10 leading-relaxed font-light">
                {topicData.resumo}
              </p>

              {topicData.destaques && topicData.destaques.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                  {topicData.destaques.map((d, i) => (
                    <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col items-center text-center">
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{d[0]}</span>
                      <span className="text-yellow-600 font-bold text-lg">{d[1]}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTopic === 'racas' ? (
                <GridRacas racas={RACAS_CATALOGO} />
              ) : activeTopic === 'classes' ? (
                <GridClasses classes={CLASSES_CATALOGO} />
              ) : (
                <RegrasContent htmlContent={topicData.corpo} />
              )}

              {/* CONTROLES DE PÁGINA */}
              <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-center gap-4">
                {prevTopic ? (
                  <button
                    onClick={() => setActiveTopic(prevTopic)}
                    className="flex-1 max-w-[250px] bg-white/5 border border-white/10 hover:border-yellow-600/50 hover:bg-yellow-600/10 p-4 rounded-xl flex items-center justify-start gap-4 transition-all group"
                  >
                    <div className="p-2 bg-black/50 rounded-lg group-hover:bg-yellow-600/20 text-gray-400 group-hover:text-yellow-500 transition-colors">
                      <ArrowLeft size={20} />
                    </div>
                    <div className="text-left flex flex-col overflow-hidden">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Anterior</span>
                      <span className="text-sm font-bold text-gray-300 group-hover:text-yellow-400 truncate">{formatTitle(prevTopic)}</span>
                    </div>
                  </button>
                ) : (
                  <div className="flex-1 max-w-[250px]"></div>
                )}

                {nextTopic && (
                  <button
                    onClick={() => setActiveTopic(nextTopic)}
                    className="flex-1 max-w-[250px] bg-white/5 border border-white/10 hover:border-yellow-600/50 hover:bg-yellow-600/10 p-4 rounded-xl flex items-center justify-end gap-4 transition-all group"
                  >
                    <div className="text-right flex flex-col overflow-hidden">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Próximo</span>
                      <span className="text-sm font-bold text-gray-300 group-hover:text-yellow-400 truncate">{formatTitle(nextTopic)}</span>
                    </div>
                    <div className="p-2 bg-black/50 rounded-lg group-hover:bg-yellow-600/20 text-gray-400 group-hover:text-yellow-500 transition-colors">
                      <ArrowRight size={20} />
                    </div>
                  </button>
                )}
              </div>

            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50 min-h-[400px]">
              <ShieldAlert size={64} className="mb-4" />
              <p>Selecione um tópico para ler as regras.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
