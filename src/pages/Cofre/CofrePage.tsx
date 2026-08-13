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
  // 'banco' é o Cofre bancário do Banqueiro (tabela do bot, à esquerda na
  // tela): outro estoque, outra rota - não some do cofre de recompensas.
  | { tipo: 'banco'; moeda: string; saldo: number }
  | { tipo: 'item'; itemId: string; titulo: string; quantidade: number };

const MOEDAS_VISUAIS: Record<string, { simbolo: string; classe: string }> = {
  Lunaris: { simbolo: '☾', classe: 'border-violet-400/25 bg-violet-400/10 text-violet-200' },
  Solares: { simbolo: '☉', classe: 'border-amber-400/25 bg-amber-400/10 text-amber-200' },
  'Fragmentos de Estrela': { simbolo: '✧', classe: 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200' },
  'Créditos Sombrios': { simbolo: '♆', classe: 'border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200' },
};

function CustosUpgrade({ custos }: { custos: Record<string, number> }) {
  const entradas = Object.entries(custos ?? {}).filter(([, valor]) => valor > 0);
  if (!entradas.length) return <span className="text-gray-500">Sem custo</span>;
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {entradas.map(([moeda, valor]) => {
        const visual = MOEDAS_VISUAIS[moeda] ?? {
          simbolo: '◈',
          classe: 'border-white/10 bg-white/5 text-gray-300',
        };
        return (
          <span
            key={moeda}
            title={moeda}
            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${visual.classe}`}
          >
            <span aria-hidden>{visual.simbolo}</span>
            <strong>{valor.toLocaleString('pt-BR')}</strong>
            <span className="font-sans opacity-80">{moeda}</span>
          </span>
        );
      })}
    </span>
  );
}

function BarraCapacidade({
  atual,
  maximo,
  label,
  ilimitado = false,
}: {
  atual: number;
  maximo: number;
  label: string;
  ilimitado?: boolean;
}) {
  const percentual = ilimitado ? 100 : maximo > 0 ? Math.min(100, (atual / maximo) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-gray-300 font-mono">{atual} / {ilimitado ? '∞' : maximo}</span>
      </div>
      <div className="h-2 rounded-full bg-black/50 border border-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500 ${ilimitado ? 'opacity-30' : ''}`}
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
    transferirItem, transferirMoeda, sacarDoBanco,
  } = useCofre(campanhaAtiva?.id);

  const [selectedPersonagemId, setSelectedPersonagemId] = useState<string>('');
  const [alvo, setAlvo] = useState<Alvo | null>(null);

  const personagemSelecionado = personagens.find((p) => p.id === selectedPersonagemId);

  if (!campanhaAtiva) {
    return (
      <div className="app-page flex items-center justify-center text-gray-400">
        Selecione uma campanha ativa para ver o cofre.
      </div>
    );
  }

  return (
    <div role="main" className="app-page mx-auto flex max-w-[87.5rem] flex-col">

      <div className="mb-10 flex items-start justify-between gap-4 border-b border-white/5 pb-8 sm:items-center sm:gap-6">
        <div>
          <h1 className="mb-3 flex items-center gap-3 text-[clamp(2rem,7vw,3rem)] font-bold leading-tight tracking-wider text-primary sm:gap-4" style={{ fontFamily: 'Cinzel, serif' }}>
            <Vault size={40} />
            Cofre
          </h1>
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
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nível atual</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">
                      {nivel.tier_nivel ?? 1} de {nivel.tier_total ?? 15}
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Cinzel, serif' }}>
                    {nivel.tier?.nome}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Reputação bancária: <span className="text-gray-300 font-bold">{nivel.reputacao_bancaria ?? 1}</span>
                  </p>
                </div>

                {nivel.tier && (
                  <div className="space-y-3">
                    <BarraCapacidade
                      atual={nivel.itens_no_inventario ?? 0}
                      maximo={nivel.tier.capacidade}
                      label="Itens no cofre"
                      ilimitado={nivel.tier.limite_pratico}
                    />
                    <BarraCapacidade
                      atual={Math.max(...(nivel.saldos_guardados?.map((s) => s.saldo) ?? [0]), 0)}
                      maximo={nivel.tier.capacidade_moeda}
                      label="Maior saldo guardado"
                      ilimitado={nivel.tier.limite_pratico}
                    />
                  </div>
                )}

                {nivel.proximo_tier && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-start gap-3">
                    <Sparkles size={16} className="text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0 space-y-2 text-xs text-gray-300">
                      <p>
                        Próximo nível: <span className="text-primary font-bold">{nivel.proximo_tier.nome}</span>
                        {' '}- {nivel.proximo_tier.limite_pratico
                          ? 'capacidade sem limite prático para itens e moedas.'
                          : `${nivel.proximo_tier.capacidade.toLocaleString('pt-BR')} itens e até ${nivel.proximo_tier.capacidade_moeda.toLocaleString('pt-BR')} por moeda.`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold">Custo no Discord</span>
                        <CustosUpgrade custos={nivel.proximo_tier.custos} />
                      </div>
                      <p className="text-gray-500">
                        Exige {nivel.proximo_tier.reputacao_exigida.toLocaleString('pt-BR')} de reputação
                        {(nivel.reputacao_bancaria ?? 1) >= nivel.proximo_tier.reputacao_exigida
                          ? ' - requisito atingido.'
                          : ` - faltam ${(nivel.proximo_tier.reputacao_exigida - (nivel.reputacao_bancaria ?? 1)).toLocaleString('pt-BR')}.`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Segurança</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-white font-semibold">{nivel.seguranca?.nome}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-600 font-mono">
                      {nivel.seguranca_nivel ?? 1} de {nivel.seguranca_total ?? 15}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((nivel.seguranca?.defesa ?? 0) * 100)}% de chance de frustrar um roubo ao seu cofre.
                  </p>
                  {nivel.proxima_seguranca && (
                    <div className="text-xs text-gray-600 mt-3 space-y-2">
                      <p>
                        Próximo nível: <span className="text-gray-400 font-semibold">{nivel.proxima_seguranca.nome}</span>
                        {' '}· exige {nivel.proxima_seguranca.reputacao_exigida.toLocaleString('pt-BR')} de reputação.
                      </p>
                      <CustosUpgrade custos={nivel.proxima_seguranca.custos} />
                    </div>
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
                        <div key={s.moeda} className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-400">{s.moeda}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-mono font-bold">{s.saldo}</span>
                            {selectedPersonagemId && s.saldo > 0 && (
                              <button
                                onClick={() => setAlvo({ tipo: 'banco', moeda: s.moeda, saldo: s.saldo })}
                                className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/40 transition-colors"
                                title={`Sacar ${s.moeda} para ${personagemSelecionado?.nome ?? 'o personagem'}`}
                              >
                                <Send size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-600 mt-3">
                      {selectedPersonagemId
                        ? 'O saque vai direto pra ficha e aparece no seu /extrato no Discord.'
                        : 'Selecione um personagem ao lado para sacar direto pra ficha.'}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-gray-600 pt-2 border-t border-white/5">
                  Depósitos e melhorias continuam pelos comandos do Banqueiro no Discord.
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
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm text-gray-400 shrink-0">Transferir para:</span>
                  <Select
                    value={selectedPersonagemId}
                    onChange={setSelectedPersonagemId}
                    placeholder="Selecione um personagem"
                    options={personagens.map((p) => ({ value: p.id, label: p.nome }))}
                    className="w-full sm:w-56"
                  />
                </div>
              )}
            </div>

            {moedas.length > 0 && (
              <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
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
          titulo={alvo.tipo === 'item' ? alvo.titulo : alvo.moeda}
          disponivel={alvo.tipo === 'item' ? alvo.quantidade : alvo.saldo}
          personagemNome={personagemSelecionado.nome}
          onConfirm={(quantidade) => {
            if (alvo.tipo === 'item') return transferirItem(selectedPersonagemId, alvo.itemId, quantidade);
            if (alvo.tipo === 'banco') return sacarDoBanco(selectedPersonagemId, alvo.moeda, quantidade);
            return transferirMoeda(selectedPersonagemId, alvo.moeda, quantidade);
          }}
        />
      )}
    </div>
  );
}
