import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useCofre } from '../../hooks/useCofre';
import { Select } from '../ui/Select';
import { TransferirModal } from '../Cofre/TransferirModal';
import { Gem, Loader2, Package, Unlink, Send, ExternalLink } from 'lucide-react';

type Alvo =
  | { tipo: 'moeda'; moeda: string; saldo: number }
  | { tipo: 'item'; itemId: string; titulo: string; quantidade: number };

export const CofrePanel: React.FC = () => {
  const navigate = useNavigate();
  const { campanhaAtiva } = useAuthStore();
  const {
    itens,
    moedas,
    vinculo,
    personagens,
    isLoading,
    error,
    transferirItem,
    transferirMoeda,
    desvincularDiscord,
  } = useCofre(campanhaAtiva?.id);

  const [isUnlinking, setIsUnlinking] = useState(false);
  const [selectedPersonagemId, setSelectedPersonagemId] = useState<string>('');
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  const handleUnlinkDiscord = async () => {
    setIsUnlinking(true);
    try {
      await desvincularDiscord();
    } catch (err) {
      console.error('Falha ao desvincular Discord:', err);
    } finally {
      setIsUnlinking(false);
    }
  };

  const personagemSelecionado = personagens.find((p) => p.id === selectedPersonagemId);

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

        <button
          onClick={() => navigate('/cofre')}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-primary/30 text-primary/80 hover:text-primary hover:border-primary/50 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          <ExternalLink size={12} /> Ver página completa do Cofre
        </button>

        {/* Personagem Selector */}
        {personagens.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3">
            <span className="text-sm text-gray-400 shrink-0">Transferir para:</span>
            <Select
              value={selectedPersonagemId}
              onChange={setSelectedPersonagemId}
              placeholder="Selecione um personagem"
              options={personagens.map((p) => ({ value: p.id, label: p.nome }))}
              className="flex-1"
            />
          </div>
        )}

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
                className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{m.moeda}</p>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
                      {m.saldo}
                    </p>
                    {selectedPersonagemId && (
                      <button
                        onClick={() => setAlvo({ tipo: 'moeda', moeda: m.moeda, saldo: m.saldo })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/40"
                        title="Transferir para personagem"
                      >
                        <Send size={14} />
                      </button>
                    )}
                  </div>
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
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-green-400">x{item.quantidade}</span>
                      {selectedPersonagemId && (
                        <button
                          onClick={() => setAlvo({
                            tipo: 'item',
                            itemId: item.item_id,
                            titulo: item.titulo,
                            quantidade: item.quantidade,
                          })}
                          className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                          title="Transferir para personagem"
                        >
                          <Send size={14} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!selectedPersonagemId && (
                <p className="text-xs text-gray-600 pt-1">
                  Selecione um personagem acima para transferir itens ou moedas.
                </p>
              )}
            </div>
          )}
        </section>

      </div>

      {alvo && personagemSelecionado && (
        <TransferirModal
          isOpen={!!alvo}
          onClose={() => setAlvo(null)}
          tipo={alvo.tipo}
          titulo={alvo.tipo === 'moeda' ? alvo.moeda : alvo.titulo}
          disponivel={alvo.tipo === 'moeda' ? alvo.saldo : alvo.quantidade}
          personagemNome={personagemSelecionado.nome}
          onConfirm={(quantidade) => (
            alvo.tipo === 'moeda'
              ? transferirMoeda(selectedPersonagemId, alvo.moeda, quantidade)
              : transferirItem(selectedPersonagemId, alvo.itemId, quantidade)
          )}
        />
      )}
    </div>
  );
};
