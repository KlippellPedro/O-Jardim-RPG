import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { Plus, Users, Crown, Eye, KeyRound } from 'lucide-react';
import { corDaCampanha, podeCriarCampanha, ROTULO_PAPEL, urlDaCapa } from '../Campanha/campanha';
import { EntrarComConviteModal } from './EntrarComConviteModal';
import { NovaMesaModal } from './NovaMesaModal';

import { SimboloOculto } from '../../components/descobertas/SimboloOculto';

/** Todas as mesas da pessoa. Também é para onde ela cai quando ainda não tem uma mesa ativa. */
export const CampanhasList: React.FC = () => {
  const usuario = useAuthStore((estado) => estado.usuario);
  const campanhas = useAuthStore((estado) => estado.campanhas);
  const avisos = useAuthStore((estado) => estado.avisos);
  const setCampanhaAtiva = useAuthStore((estado) => estado.setCampanhaAtiva);
  const navigate = useNavigate();

  const [modal, setModal] = useState<'convite' | 'nova' | null>(null);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);

  const handleSelectCampanha = async (id: string) => {
    setAbrindoId(id);
    await setCampanhaAtiva(id);
    navigate('/campanha');
  };

  const getRoleIcon = (papel: string) => {
    switch (papel.toLowerCase()) {
      case 'mestre': return <Crown size={16} className="text-yellow-500" />;
      case 'jogador': return <Users size={16} className="text-blue-400" />;
      default: return <Eye size={16} className="text-gray-400" />;
    }
  };

  return (
    <div role="main" className="app-page mx-auto max-w-7xl">

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="mb-2 text-[clamp(2.25rem,8vw,3rem)] font-bold leading-tight text-white" style={{fontFamily: 'Cinzel, serif'}}>Suas Campanhas</h1>
          <p className="text-gray-400">Selecione uma mesa para continuar sua jornada.</p>
        </div>

        <div className="responsive-action-row flex gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setModal('convite')}
            className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all shadow-lg flex items-center gap-2"
          >
            <KeyRound size={18} />
            Usar Convite
          </button>

          {podeCriarCampanha(usuario) && (
            <button
              type="button"
              onClick={() => setModal('nova')}
              className="px-6 py-3 rounded-full bg-primary/20 border border-primary/50 text-primary hover:bg-primary/30 font-medium transition-all shadow-[0_0_15px_rgba(var(--color-primary),0.2)] flex items-center gap-2"
            >
              <Plus size={18} />
              Nova Mesa
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {campanhas.map((campanha, i) => {
            const recados = avisos.mestre_por_campanha[campanha.id] ?? 0;
            return (
              <motion.button
                type="button"
                key={campanha.id}
                disabled={abrindoId !== null}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                onClick={() => handleSelectCampanha(campanha.id)}
                className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl cursor-pointer group hover:border-primary/50 hover:bg-white/5 transition-all shadow-xl relative overflow-hidden text-left disabled:opacity-70"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100"></div>

                <div
                  className="relative z-10 -mx-6 -mt-6 mb-4 h-24 overflow-hidden rounded-t-3xl"
                  style={{ background: `radial-gradient(circle at 80% 0%, ${corDaCampanha(campanha.identidade)}55, transparent 65%), linear-gradient(160deg, #14131c, #0a0a10)` }}
                  aria-hidden="true"
                >
                  {urlDaCapa(campanha.id, campanha.identidade) ? (
                    <img src={urlDaCapa(campanha.id, campanha.identidade) ?? undefined} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                  <span className="absolute inset-x-0 bottom-0 h-1" style={{ backgroundColor: corDaCampanha(campanha.identidade) }} />
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <h2 className="text-2xl font-bold text-white group-hover:text-primary transition-colors" style={{fontFamily: 'Cinzel, serif'}}>
                    {campanha.nome}
                  </h2>
                </div>

                <p className="text-gray-400 text-sm mb-6 line-clamp-2 relative z-10">
                  {campanha.identidade?.frase ? `“${campanha.identidade.frase}”` : campanha.descricao || 'Sem descrição.'}
                </p>

                <div className="flex items-center gap-2 mt-auto relative z-10">
                  <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                    {getRoleIcon(campanha.papel)}
                    <span className="text-xs font-medium text-gray-300">{ROTULO_PAPEL[campanha.papel] ?? campanha.papel}</span>
                  </div>
                  {recados > 0 ? (
                    <span className="rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold leading-none text-white">
                      {recados} {recados === 1 ? 'aviso novo' : 'avisos novos'}
                    </span>
                  ) : null}
                </div>
              </motion.button>
            );
          })}
          {campanhas.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center"
            >
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
                <Users size={40} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Nenhuma Campanha</h3>
              <p className="text-gray-500 max-w-md mx-auto">Você não participa de nenhuma mesa. Peça um código de convite ao seu mestre ou crie uma nova campanha se tiver permissão.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EntrarComConviteModal aberto={modal === 'convite'} onFechar={() => setModal(null)} />
      <NovaMesaModal aberto={modal === 'nova'} onFechar={() => setModal(null)} />

      <div className="mt-10 flex justify-center"><SimboloOculto chave="selo_da_mesa" glifo="⚜" /></div>
    </div>
  );
};
