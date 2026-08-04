import React from 'react';
import { motion } from 'framer-motion';
import { LoreEntry, MUNDO_CATALOG } from '../../../../data/gerado/mundoCatalog';
import { useAuthStore } from '../../../store/useAuthStore';
import { ShieldAlert, History } from 'lucide-react';

interface TimelineHistoryProps {
  onSelectEvent: (entry: LoreEntry) => void;
}

export const TimelineHistory: React.FC<TimelineHistoryProps> = ({ onSelectEvent }) => {
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';

  const eventos = MUNDO_CATALOG.filter(e => e.tipo === 'evento');

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 py-8 relative">
      <div className="flex flex-col items-center mb-16">
        <History className="text-yellow-600/50 mb-4" size={48} />
        <h3 className="text-3xl font-bold text-white tracking-widest uppercase" style={{ fontFamily: 'Cinzel, serif' }}>Os Ecos do Tempo</h3>
        <p className="text-gray-500 text-sm mt-2 font-serif italic text-center max-w-lg">O Fio de Aethel tece os momentos cruciais. Siga a trilha dourada para compreender o que trouxe o Jardim até aqui.</p>
      </div>

      {/* Trilha Dourada (Linha vertical) */}
      <div className="absolute left-8 md:left-1/2 top-48 bottom-0 w-[2px] bg-gradient-to-b from-yellow-600/0 via-yellow-600/50 to-yellow-600/0 transform md:-translate-x-1/2"></div>

      <div className="space-y-12 relative z-10">
        {eventos.map((evento, index) => {
          const isLocked = evento.revelado === false && !isMestre;
          const isLeft = index % 2 === 0;

          return (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              key={evento.id}
              className={`flex flex-col md:flex-row items-center justify-between w-full ${isLeft ? 'md:flex-row-reverse' : ''}`}
            >
              {/* Espaço Vazio para alinhar */}
              <div className="hidden md:block w-5/12"></div>
              
              {/* Nó Central na Trilha */}
              <div className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full bg-yellow-600 border-4 border-[#0a090e] shadow-[0_0_15px_rgba(202,138,4,0.8)] transform -translate-x-1/2 z-20"></div>
              
              {/* Conteúdo do Evento */}
              <div 
                className="w-full pl-20 md:pl-0 md:w-5/12 cursor-pointer group"
                onClick={() => onSelectEvent(evento)}
              >
                <div className={`bg-black/60 backdrop-blur-md border border-white/5 rounded-2xl p-6 hover:border-yellow-600/50 hover:bg-[#15141b]/80 transition-all shadow-xl group-hover:-translate-y-1 ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
                  {evento.conteudo.era && (
                    <span className="text-yellow-600 font-bold uppercase tracking-widest text-[10px] mb-2 block">
                      {evento.conteudo.era}
                    </span>
                  )}
                  
                  <div className={`flex items-center gap-2 mb-2 ${isLeft ? 'md:justify-end' : 'md:justify-start'}`}>
                    {isLocked && <ShieldAlert size={14} className="text-red-500" />}
                    <h4 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors" style={{ fontFamily: 'Cinzel, serif' }}>
                      {evento.titulo}
                    </h4>
                  </div>
                  
                  {isLocked ? (
                    <p className="text-gray-600 text-xs italic">Evento censurado. Os registros foram apagados.</p>
                  ) : (
                    <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                      {evento.conteudo.descricao}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
