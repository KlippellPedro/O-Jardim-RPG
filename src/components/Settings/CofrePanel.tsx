import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { cofreApi, ICofreItem, ICofreMoeda } from '../../services/cofreApi';
import { discordApi, IDiscordVinculo } from '../../services/discordApi';
import { Gem, Loader2, Package, Unlink } from 'lucide-react';

export const CofrePanel: React.FC = () => {
  const { campanhaAtiva } = useAuthStore();
  const [itens, setItens] = useState<ICofreItem[]>([]);
  const [moedas, setMoedas] = useState<ICofreMoeda[]>([]);
  const [vinculo, setVinculo] = useState<IDiscordVinculo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // BUG-FIX: o cofre é lido de /cofre (por campanha) e o vínculo Discord de
  // /discord (por conta) — são dois endpoints separados, não um "shape" único.
  const fetchTudo = useCallback(async () => {
    if (!campanhaAtiva?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [cofre, discord] = await Promise.all([
        cofreApi.obter(campanhaAtiva.id),
        discordApi.obterVinculo(),
      ]);
      setItens(cofre.itens || []);
      setMoedas(cofre.moedas || []);
      setVinculo(discord.vinculo);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message || 'Erro ao carregar o cofre');
    } finally {
      setIsLoading(false);
    }
  }, [campanhaAtiva?.id]);

  useEffect(() => {
    fetchTudo();
  }, [fetchTudo]);

  const handleUnlinkDiscord = async () => {
    setIsUnlinking(true);
    try {
      await discordApi.desvincular();
      setVinculo(null);
    } catch (err) {
      console.error('Falha ao desvincular Discord:', err);
    } finally {
      setIsUnlinking(false);
    }
  };

  if (!campanhaAtiva) {
    return <div className="p-6 text-gray-400 text-sm">Nenhuma campanha selecionada.</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-6 overflow-y-auto flex-1 space-y-6">

        <div className="flex items-center gap-2 mb-2">
          <Gem className="text-primary" size={20} />
          <h3 className="text-lg font-bold text-white">Cofre de Recompensas</h3>
          {isLoading && <Loader2 size={16} className="animate-spin text-gray-500 ml-auto" />}
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {/* Discord Status */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Integração Discord</h4>
          {vinculo ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#5865F2]/20 flex items-center justify-center text-[#5865F2] text-xs font-bold">
                  D
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Vinculado</p>
                  {vinculo.discord_nome && (
                    <p className="text-gray-400 text-xs">@{vinculo.discord_nome}</p>
                  )}
                </div>
              </div>
              <p className="text-gray-500 text-xs">
                Recompensas do bot entram automaticamente neste cofre.
              </p>
              <button
                onClick={handleUnlinkDiscord}
                disabled={isUnlinking}
                className="w-full py-2 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {isUnlinking ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                Desvincular Discord
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Nenhuma conta Discord vinculada.</p>
              <p className="text-gray-500 text-xs">
                Use o bot no servidor para vincular e receber recompensas automaticamente.
              </p>
            </div>
          )}
        </section>

        {/* Saldos */}
        {moedas.length > 0 && (
          <section className="grid grid-cols-2 gap-3">
            {moedas.map((m) => (
              <div
                key={m.moeda}
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{m.moeda}</p>
                  <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
                    {m.saldo}
                  </p>
                </div>
                <Gem size={28} className="text-primary/30" />
              </div>
            ))}
          </section>
        )}

        {/* Itens aguardando entrega */}
        <section>
          <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Package size={16} />
            Itens no Cofre
          </h4>

          {itens.length === 0 ? (
            <div className="text-center py-8 bg-white/5 rounded-xl border border-white/5">
              <p className="text-gray-500 text-sm">Nenhum item aguardando entrega.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {itens.map((item) => (
                  <motion.div
                    key={item.item_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl border border-white/5 bg-white/3 text-sm flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-medium">{item.titulo}</p>
                      <p className="text-gray-500 text-xs capitalize">{item.origem}</p>
                    </div>
                    <span className="font-bold text-green-400">x{item.quantidade}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
              <p className="text-xs text-gray-600 pt-1">
                Transfira estes itens para um personagem pela ficha dele.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
