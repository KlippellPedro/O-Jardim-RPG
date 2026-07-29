import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gem, Loader2, Package, Send, Shield, ShieldCheck, Vault, Coins, Lock, Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCofre } from '../../hooks/useCofre';
import { Select } from '../../components/ui/Select';
import { TransferirModal } from '../../components/Cofre/TransferirModal';

type Alvo =
  | { tipo: 'moeda'; moeda: string; saldo: number }
  | { tipo: 'item'; itemId: string; titulo: string; quantidade: number };

function BarraCapacidade({ atual, maximo, label }: { atual: number; maximo: number; label: string }) {
  const percentual = maximo > 0 ? Math.min(100, (atual / maximo) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-gray-300 font-mono">{atual} / {maximo}</span>
      </div>
      <div className="h-2 rounded-full bg-black/50 border border-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary/60 to-primary rounded-full transition-all duration-500"
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

export function CofrePage() {
  const { campanhaAtiva } = useAuthStore();
  const {
    itens, moedas, vinculo, personagens, nivel, isLoading, error,
    transferirItem, transferirMoeda,
  } = useCofre(campanhaAtiva?.id);

  const [selectedPersonagemId, setSelectedPersonagemId] = useState<string>('');
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  const personagemSelecionado = personagens.find((p) => p.id === selectedPersonagemId);

  if (!campanhaAtiva) {
    return (
      <div className="pl-32 pr-12 pt-32 relative z-10 w-full min-h-screen flex items-center justify-center text-gray-400">
        Selecione uma campanha ativa para ver o cofre.
      </div>
    );
  }

  return (
    <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex flex-col max-w-[1400px] mx-auto">

      <div className="flex items-center justify-between gap-6 mb-10 border-b border-white/5 pb-8">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-wider mb-3 flex items-center gap-4 text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
            <Vault size={40} />
            Cofre
          </h2>
          <p className="text-gray-400 max-w-2xl">
            Recompensas do Discord esperando entrega e o status do seu Cofre bancário no Banqueiro.
          </p>
        </div>
        {isLoading && <Loader2 size={20} className="animate-spin text-gray-500 shrink-0" />}
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm border border-red-500/20 mb-8">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* COLUNA ESQUERDA: Cofre bancário do Banqueiro */}
        <div className="xl:col-span-1 space-y-6">
          <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={18} className="text-primary" />
              <h3 className="text-white font-bold uppercase tracking-widest text-sm">Cofre Bancário</h3>
            </div>

            {!vinculo ? (
              <div className="text-center py-8">
                <Lock size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Vincule sua conta Discord para ver o status do seu Cofre bancário.</p>
              </div>
            ) : !nivel?.vinculado ? (
              <div className="text-center py-8">
                <Lock size={32} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Esta campanha ainda não está vinculada a um servidor Discord.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Nível atual</p>
                  <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
                    {nivel.tier?.nome}
                  </p>
                </div>

                {nivel.tier && (
                  <div className="space-y-3">
                    <BarraCapacidade
                      atual={nivel.itens_no_inventario ?? 0}
                      maximo={nivel.tier.capacidade}
                      label="Itens no cofre"
                    />
                    <BarraCapacidade
                      atual={Math.max(...(nivel.saldos_guardados?.map((s) => s.saldo) ?? [0]), 0)}
                      maximo={nivel.tier.capacidade_moeda}
                      label="Maior saldo guardado"
                    />
                  </div>
                )}

                {nivel.proximo_tier && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
                    <Sparkles size={16} className="text-primary shrink-0" />
                    <p className="text-xs text-gray-300">
                      Próximo nível: <span className="text-primary font-bold">{nivel.proximo_tier.nome}</span>
                      {' '}- {nivel.proximo_tier.capacidade} itens e até{' '}
                      {nivel.proximo_tier.capacidade_moeda.toLocaleString('pt-BR')} por moeda.
                      {' '}Custa {nivel.proximo_tier.custo?.toLocaleString('pt-BR')} Lunaris no Discord.
                    </p>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Segurança</p>
                  </div>
                  <p className="text-white font-semibold">{nivel.seguranca?.nome}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((nivel.seguranca?.defesa ?? 0) * 100)}% de chance de frustrar um roubo ao seu cofre.
                  </p>
                  {nivel.proxima_seguranca && (
                    <p className="text-xs text-gray-600 mt-2">
                      Próximo nível ({nivel.proxima_seguranca.nome}) custa {nivel.proxima_seguranca.custo} Lunaris.
                    </p>
                  )}
                </div>

                {nivel.saldos_guardados && nivel.saldos_guardados.length > 0 && (
                  <div className="border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Coins size={16} className="text-primary" />
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Guardado no banco</p>
                    </div>
                    <div className="space-y-1.5">
                      {nivel.saldos_guardados.map((s) => (
                        <div key={s.moeda} className="flex justify-between text-sm">
                          <span className="text-gray-400">{s.moeda}</span>
                          <span className="text-white font-mono font-bold">{s.saldo}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-gray-600 pt-2 border-t border-white/5">
                  Depósitos, saques e melhorias continuam pelos comandos do Banqueiro no Discord. Esta página serve para consultar o cofre.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* COLUNA DIREITA: conteúdo do cofre unificado */}
        <div className="xl:col-span-2 space-y-6">
          <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
              <div className="flex items-center gap-2">
                <Gem size={18} className="text-primary" />
                <div>
                  <h3 className="text-white font-bold uppercase tracking-widest text-sm">Conteúdo do Cofre</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Itens e moedas recebidos no Discord, guardados até você transferi-los para uma ficha.
                  </p>
                </div>
              </div>
              {personagens.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 shrink-0">Transferir para:</span>
                  <Select
                    value={selectedPersonagemId}
                    onChange={setSelectedPersonagemId}
                    placeholder="Selecione um personagem"
                    options={personagens.map((p) => ({ value: p.id, label: p.nome }))}
                    className="w-56"
                  />
                </div>
              )}
            </div>

            {moedas.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {moedas.map((m) => (
                  <div
                    key={m.moeda}
                    className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-2 group"
                  >
                    <p className="text-xs text-gray-400 uppercase tracking-wider">{m.moeda}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xl font-bold text-primary" style={{ fontFamily: 'Cinzel, serif' }}>{m.saldo}</p>
                      {selectedPersonagemId && (
                        <button
                          onClick={() => setAlvo({ tipo: 'moeda', moeda: m.moeda, saldo: m.saldo })}
                          className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/40 transition-colors"
                          title="Transferir para personagem"
                        >
                          <Send size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {itens.length === 0 && moedas.length === 0 ? (
              <div className="text-center py-16 bg-white/5 rounded-xl border border-white/5">
                <Package size={40} className="text-gray-700 mx-auto mb-3 opacity-50" />
                <p className="text-gray-500 text-sm">Nenhum item ou moeda guardado neste cofre.</p>
              </div>
            ) : itens.length > 0 && (
              <div className="space-y-2">
                <AnimatePresence>
                  {itens.map((item) => (
                    <motion.div
                      key={item.item_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border border-white/5 bg-white/3 flex justify-between items-center"
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
                            className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                            title="Transferir para personagem"
                          >
                            <Send size={16} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {!selectedPersonagemId && (itens.length > 0 || moedas.length > 0) && (
              <p className="text-xs text-gray-600 pt-4">
                Selecione um personagem acima para transferir itens ou moedas.
              </p>
            )}
          </section>
        </div>
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
}
