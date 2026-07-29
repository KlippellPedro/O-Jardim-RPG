import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { campanhasApi } from '../../services/campanhasApi';
import { Plus, Users, Crown, Eye, Loader2, KeyRound } from 'lucide-react';

export const CampanhasList: React.FC = () => {
  const { usuario, campanhas, setCampanhaAtiva, initContexto } = useAuthStore();
  const navigate = useNavigate();

  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const [codigoConvite, setCodigoConvite] = useState('');
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [descCampanha, setDescCampanha] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMestreOrAdmin = usuario?.papel_plataforma === 'mestre' || usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador';

  const handleSelectCampanha = async (id: string) => {
    setIsLoading(true);
    await setCampanhaAtiva(id);
    // isLoading será mantido true até a navegação completar -
    // o componente vai desmontar, portanto não precisamos de setIsLoading(false)
    navigate('/ficha');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoConvite.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      await campanhasApi.entrar(codigoConvite);
      await initContexto(); // recarrega a lista de campanhas
      setIsJoinModalOpen(false);
      setCodigoConvite('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || 'Erro ao entrar na campanha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCampanha.trim()) return;

    setIsLoading(true);
    setError(null);
    let novaId: string | null = null;
    try {
      const response = await campanhasApi.criar({ nome: nomeCampanha, descricao: descCampanha });
      await initContexto(); // recarrega a lista
      setIsCreateModalOpen(false);
      setNomeCampanha('');
      setDescCampanha('');
      // Guarda o ID para seleção após o finally
      if (response?.id) novaId = response.id;
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || 'Erro ao criar mesa');
    } finally {
      setIsLoading(false);
    }
    // BUG-09: Auto-seleção fora do try/finally para não competir com setIsLoading(false).
    // handleSelectCampanha gerencia seu próprio isLoading independentemente.
    if (novaId) {
      handleSelectCampanha(novaId);
    }
  };

  const getRoleIcon = (papel: string) => {
    switch (papel.toLowerCase()) {
      case 'mestre': return <Crown size={16} className="text-yellow-500" />;
      case 'jogador': return <Users size={16} className="text-blue-400" />;
      default: return <Eye size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="relative z-10 min-h-screen pt-24 px-6 pb-12 max-w-7xl mx-auto">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-bold text-white mb-2" style={{fontFamily: 'Cinzel, serif'}}>Suas Campanhas</h1>
          <p className="text-gray-400">Selecione uma mesa para continuar sua jornada.</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsJoinModalOpen(true)}
            className="px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium transition-all shadow-lg flex items-center gap-2"
          >
            <KeyRound size={18} />
            Usar Convite
          </button>
          
          {isMestreOrAdmin && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
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
          {campanhas.map((campanha, i) => (
            <motion.div
              key={campanha.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => handleSelectCampanha(campanha.id)}
              className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl cursor-pointer group hover:border-primary/50 hover:bg-white/5 transition-all shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all opacity-0 group-hover:opacity-100"></div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors" style={{fontFamily: 'Cinzel, serif'}}>
                  {campanha.nome}
                </h3>
              </div>
              
              <p className="text-gray-400 text-sm mb-6 line-clamp-2 relative z-10">
                {campanha.descricao || 'Sem descrição.'}
              </p>
              
              <div className="flex items-center gap-2 mt-auto relative z-10">
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                  {getRoleIcon(campanha.papel)}
                  <span className="text-xs font-medium text-gray-300 capitalize">{campanha.papel}</span>
                </div>
              </div>
            </motion.div>
          ))}
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

      {/* MODAL: JOIN */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsJoinModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#0b0a12] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2" style={{fontFamily: 'Cinzel, serif'}}>Entrar com Convite</h2>
              <p className="text-gray-400 text-sm mb-6">Cole o código fornecido pelo Mestre da mesa.</p>
              
              {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-500/20">{error}</div>}
              
              <form onSubmit={handleJoin} className="space-y-4">
                <input 
                  type="text" 
                  value={codigoConvite}
                  onChange={e => setCodigoConvite(e.target.value)}
                  placeholder="Código de Convite..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-primary/50 focus:bg-black/60 outline-none transition-all"
                  required
                />
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsJoinModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                  <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 transition-colors flex items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Entrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CREATE */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsCreateModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#0b0a12] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-2" style={{fontFamily: 'Cinzel, serif'}}>Forjar Nova Mesa</h2>
              <p className="text-gray-400 text-sm mb-6">Dê um nome para a sua nova campanha.</p>
              
              {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-500/20">{error}</div>}
              
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Nome da Campanha</label>
                  <input 
                    type="text" 
                    value={nomeCampanha}
                    onChange={e => setNomeCampanha(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-primary/50 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Descrição (Opcional)</label>
                  <textarea 
                    value={descCampanha}
                    onChange={e => setDescCampanha(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:border-primary/50 outline-none transition-all resize-none h-24"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancelar</button>
                  <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 transition-colors flex items-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Criar Mesa'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
