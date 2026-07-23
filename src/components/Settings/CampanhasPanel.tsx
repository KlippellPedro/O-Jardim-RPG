import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, ICampanha } from '../../store/useAuthStore';
import { Swords, Check, Loader2, PlusCircle, LogIn } from 'lucide-react';
import { campanhasApi } from '../../services/campanhasApi';

export const CampanhasPanel: React.FC = () => {
  const { usuario, campanhas, campanhaAtiva, setCampanhaAtiva, initContexto } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrar com código de convite
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [codigoConvite, setCodigoConvite] = useState('');

  const handleSelectCampanha = async (id: string) => {
    if (campanhaAtiva?.id === id) return;
    setIsLoading(true);
    setError(null);
    try {
      await setCampanhaAtiva(id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Erro ao trocar de campanha');
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoConvite.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await campanhasApi.entrar(codigoConvite.trim());
      await initContexto();
      setShowJoinForm(false);
      setCodigoConvite('');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Código inválido ou expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const roleLabel = (papel: string) => {
    const map: Record<string, string> = {
      mestre: 'Mestre',
      assistente: 'Assistente',
      jogador: 'Jogador',
      observador: 'Observador',
    };
    return map[papel.toLowerCase()] ?? papel;
  };

  const roleBadgeColor = (papel: string) => {
    const p = papel.toLowerCase();
    if (p === 'mestre') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (p === 'assistente') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (p === 'jogador') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const canCreateCampanha = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador' || usuario?.papel_plataforma === 'mestre';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1 space-y-6">

        <div className="flex items-center gap-2 mb-2">
          <Swords className="text-primary" size={20} />
          <h3 className="text-lg font-bold text-white">Minhas Mesas</h3>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {campanhas.length === 0 && (
          <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-gray-400 text-sm">Você não está em nenhuma mesa ainda.</p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {campanhas.map((campanha: ICampanha) => {
              const isActive = campanhaAtiva?.id === campanha.id;
              return (
                <motion.button
                  key={campanha.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => handleSelectCampanha(campanha.id)}
                  disabled={isLoading}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-primary/10 border-primary/40 shadow-[0_0_12px_rgba(196,160,82,0.15)]'
                      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {isActive && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className={`font-semibold truncate ${isActive ? 'text-primary' : 'text-white'}`}>
                          {campanha.nome}
                        </p>
                        {campanha.descricao && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{campanha.descricao}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${roleBadgeColor(campanha.papel)}`}>
                        {roleLabel(campanha.papel)}
                      </span>
                      {isActive && <Check size={16} className="text-primary" />}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Entrar com Convite */}
        <div className="border-t border-white/5 pt-4 space-y-3">
          {!showJoinForm ? (
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-dashed border-white/15 text-gray-400 hover:text-white hover:border-white/30 text-sm transition-colors"
            >
              <LogIn size={16} />
              Entrar com código de convite
            </button>
          ) : (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleJoin}
              className="space-y-3"
            >
              <div>
                <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Código de Convite</label>
                <input
                  type="text"
                  value={codigoConvite}
                  onChange={(e) => setCodigoConvite(e.target.value.toUpperCase())}
                  placeholder="Ex: ABCD-1234"
                  autoFocus
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-white focus:border-primary/50 outline-none text-sm font-mono tracking-widest"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowJoinForm(false); setCodigoConvite(''); }}
                  className="flex-1 py-2 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !codigoConvite.trim()}
                  className="flex-1 py-2 rounded-xl bg-primary/20 text-primary border border-primary/40 hover:bg-primary hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Entrar'}
                </button>
              </div>
            </motion.form>
          )}

          {canCreateCampanha && (
            <button
              onClick={() => window.location.href = '/campanhas'}
              className="w-full flex items-center gap-2 justify-center p-3 rounded-xl border border-dashed border-primary/20 text-primary/60 hover:text-primary hover:border-primary/40 text-sm transition-colors"
            >
              <PlusCircle size={16} />
              Criar nova mesa
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
