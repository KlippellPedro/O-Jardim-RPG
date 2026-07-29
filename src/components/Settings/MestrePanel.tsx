import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore';
import { campanhasApi } from '../../services/campanhasApi';
import { IConvite } from '../../types/admin';
import { KeyRound, Users, UserCog, Trash2, Copy, Loader2, Check, Settings as SettingsIcon } from 'lucide-react';
import { ConfiguracaoCampanha } from './ConfiguracaoCampanha';
import { MembrosCampanha } from './MembrosCampanha';

export const MestrePanel: React.FC = () => {
  const { campanhaAtiva } = useAuthStore();
  const [convites, setConvites] = useState<IConvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Invite State
  const [papel, setPapel] = useState('jogador');
  const [usos, setUsos] = useState(1);
  const [dias, setDias] = useState(7);
  const [isCreating, setIsCreating] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'config' | 'convites' | 'membros'>('config');

  // BUG-04 + BUG-08: fetchConvites com AbortController para cancelar requisições pendentes
  // ao desmontar o componente ou ao trocar de campanha. Dependência usa campanhaAtiva?.id
  // (valor primitivo) em vez do objeto inteiro para evitar re-execuções desnecessárias.
  const fetchConvites = useCallback(
    async (signal?: AbortSignal) => {
      if (!campanhaAtiva?.id) return;
      setError(null);
      try {
        const data = await campanhasApi.listarConvites(campanhaAtiva.id);
        if (signal?.aborted) return; // Ignora resultado se a requisição foi cancelada
        setConvites((data as { convites: IConvite[] })?.convites || []);
      } catch (err: unknown) {
        if (signal?.aborted) return;
        const error = err as { message?: string };
        setError(error?.message || 'Erro ao carregar convites');
      }
    },
    [campanhaAtiva?.id] // BUG-08: depende apenas do ID primitivo, não do objeto inteiro
  );

  useEffect(() => {
    if (!campanhaAtiva?.id) return;

    const controller = new AbortController();
    setIsLoading(true);
    fetchConvites(controller.signal).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });

    // BUG-04: cleanup cancela a requisição se o componente desmontar ou campanhaAtiva.id mudar
    return () => controller.abort();
  }, [campanhaAtiva?.id, fetchConvites]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campanhaAtiva) return;
    setIsCreating(true);
    setError(null);
    try {
      await campanhasApi.criarConvite(campanhaAtiva.id, {
        papel,
        max_usos: usos,
        expira_em_dias: dias,
      });
      await fetchConvites(); // Sem signal aqui - ação intencional do usuário
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || 'Erro ao criar convite');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevoke = async (conviteId: string) => {
    if (!campanhaAtiva) return;
    try {
      await campanhasApi.revogarConvite(campanhaAtiva.id, conviteId);
      await fetchConvites();
    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || 'Erro ao revogar convite');
    }
  };

  const copyToClipboard = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiedId(codigo);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!campanhaAtiva) {
    return <div className="p-6 text-gray-400">Nenhuma campanha selecionada.</div>;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* TABS */}
      <div className="flex px-6 pt-4 gap-4 border-b border-white/5 shrink-0">
        <button
          onClick={() => setActiveTab('config')}
          className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 ${
            activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon size={16} /> Configurações
          </div>
        </button>
        <button
          onClick={() => setActiveTab('convites')}
          className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 ${
            activeTab === 'convites' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={16} /> Convites
          </div>
        </button>
        <button
          onClick={() => setActiveTab('membros')}
          className={`pb-3 text-sm font-bold tracking-widest uppercase transition-colors border-b-2 ${
            activeTab === 'membros' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserCog size={16} /> Membros
          </div>
        </button>
      </div>

      {/* Scrollable Area */}
      <div className="p-6 overflow-y-auto flex-1 space-y-8 custom-scrollbar">

        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">
            {error}
          </div>
        )}

        {activeTab === 'config' && <ConfiguracaoCampanha />}

        {activeTab === 'membros' && <MembrosCampanha />}

        {activeTab === 'convites' && (
          <>
            <section>
              <div className="flex items-center gap-2 mb-4">
                <KeyRound className="text-primary" size={20} />
                <h3 className="text-lg font-bold text-white">Gerar Convite</h3>
              </div>

              <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Papel</label>
                    <select
                      value={papel}
                      onChange={(e) => setPapel(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-primary/50 outline-none text-sm"
                    >
                      <option value="jogador">Jogador</option>
                      <option value="assistente">Assistente</option>
                      <option value="observador">Observador</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Validade</label>
                    <select
                      value={dias}
                      onChange={(e) => setDias(Number(e.target.value))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-primary/50 outline-none text-sm"
                    >
                      <option value={1}>1 Dia</option>
                      <option value={7}>7 Dias</option>
                      <option value={30}>30 Dias</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium pl-1 mb-1 block">Máximo de Usos</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={usos}
                    onChange={(e) => setUsos(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-primary/50 outline-none text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full bg-primary/20 text-primary border border-primary/50 hover:bg-primary hover:text-white transition-colors rounded-xl py-2 font-medium flex items-center justify-center gap-2 text-sm"
                >
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Criar Convite'}
                </button>
              </form>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users className="text-primary" size={20} />
                  <h3 className="text-lg font-bold text-white">Convites Ativos</h3>
                </div>
                {isLoading && <Loader2 size={16} className="animate-spin text-gray-500" />}
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {convites.length === 0 && !isLoading ? (
                    <p className="text-sm text-gray-500 text-center py-4 bg-white/5 rounded-xl border border-white/5">
                      Nenhum convite ativo.
                    </p>
                  ) : (
                    convites.map((convite) => {
                      const isRevoked = convite.revogado_em !== null;
                      const isExpired = new Date(convite.expira_em) < new Date();
                      const isExhausted = convite.usos >= convite.max_usos;
                      const isActive = !isRevoked && !isExpired && !isExhausted;

                      return (
                        <motion.div
                          key={convite.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-3 rounded-xl border ${
                            isActive ? 'bg-white/5 border-white/10' : 'bg-red-500/5 border-red-500/10 opacity-60'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-black/50 px-2 py-0.5 rounded text-white tracking-widest">
                                {convite.codigo || 'Oculto'}
                              </code>
                              {isActive && (
                                <button
                                  onClick={() => copyToClipboard(convite.codigo)}
                                  className="text-gray-400 hover:text-primary transition-colors"
                                >
                                  {copiedId === convite.codigo ? (
                                    <Check size={14} className="text-green-500" />
                                  ) : (
                                    <Copy size={14} />
                                  )}
                                </button>
                              )}
                            </div>
                            {isActive && (
                              <button
                                onClick={() => handleRevoke(convite.id)}
                                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                title="Revogar"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>

                          <div className="flex gap-2 text-xs text-gray-400 mt-2">
                            <span className="capitalize text-primary-light bg-primary/10 px-2 rounded-full">
                              {convite.papel}
                            </span>
                            <span>
                              {convite.usos} / {convite.max_usos} usos
                            </span>
                            {!isActive && (
                              <span className="text-red-400 font-medium ml-auto">Inativo</span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
