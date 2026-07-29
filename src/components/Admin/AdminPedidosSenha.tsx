import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { adminApi } from '../../services/adminApi';
import { KeyRound, Loader2, Copy, Check, X, Inbox } from 'lucide-react';

interface IPedidoSenha {
  id: string;
  email: string;
  status: string;
  criado_em: string;
  usuario_id: string | null;
  nome_exibicao: string | null;
  papel_plataforma: string | null;
  ativo: boolean | null;
}

export const AdminPedidosSenha: React.FC = () => {
  const [pedidos, setPedidos] = useState<IPedidoSenha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [senhaRevelada, setSenhaRevelada] = useState<{ nome: string; senha: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp: any = await adminApi.pedidosDeSenha();
      setPedidos(resp?.pedidos || []);
    } catch (e) {
      console.error('Erro ao carregar pedidos de senha', e);
      setPedidos([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const gerarSenha = async (pedido: IPedidoSenha) => {
    if (!pedido.usuario_id) return;
    setProcessandoId(pedido.id);
    setErro(null);
    try {
      const resp: any = await adminApi.redefinirSenha(pedido.usuario_id);
      setSenhaRevelada({ nome: resp.nome_exibicao, senha: resp.senha_provisoria });
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao gerar senha provisória.');
    } finally {
      setProcessandoId(null);
    }
  };

  const recusar = async (pedido: IPedidoSenha) => {
    setProcessandoId(pedido.id);
    setErro(null);
    try {
      await adminApi.recusarPedidoDeSenha(pedido.id);
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao recusar o pedido.');
    } finally {
      setProcessandoId(null);
    }
  };

  const copiarSenha = () => {
    if (!senhaRevelada) return;
    navigator.clipboard.writeText(senhaRevelada.senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6">
      {erro && (
        <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20">{erro}</div>
      )}

      {senhaRevelada && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
          <p className="text-sm text-yellow-300 mb-2">
            Senha provisória para <strong>{senhaRevelada.nome}</strong>. Copie agora, pois ela não será mostrada novamente.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-black/50 px-3 py-2 rounded-lg text-white font-mono tracking-widest text-sm">
              {senhaRevelada.senha}
            </code>
            <button
              onClick={copiarSenha}
              className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
              title="Copiar"
            >
              {copiado ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
            <button
              onClick={() => setSenhaRevelada(null)}
              className="p-2 rounded-lg bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0b0a12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center gap-2">
          <KeyRound className="text-yellow-400" size={20} />
          <h2 className="text-xl font-bold text-white">Pedidos de Ajuda com Senha</h2>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-purple-500" size={32} /></div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-2">
              <Inbox size={32} className="opacity-40" />
              Nenhum pedido pendente.
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {pedidos.map((p) => {
                  const emProcesso = processandoId === p.id;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-bold">{p.email}</span>
                          {p.nome_exibicao && <span className="text-xs text-gray-500">({p.nome_exibicao})</span>}
                          {!p.usuario_id && (
                            <span className="text-[10px] text-gray-500 border border-white/10 px-1.5 rounded bg-white/5">
                              conta não encontrada
                            </span>
                          )}
                          {p.usuario_id && p.ativo === false && (
                            <span className="text-[10px] text-red-400 border border-red-500/30 px-1.5 rounded bg-red-500/10">
                              conta desativada
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Pedido em {new Date(p.criado_em).toLocaleString('pt-BR')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {p.usuario_id && p.ativo && (
                          <button
                            onClick={() => gerarSenha(p)}
                            disabled={emProcesso}
                            className="text-xs px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {emProcesso ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                            Gerar senha
                          </button>
                        )}
                        <button
                          onClick={() => recusar(p)}
                          disabled={emProcesso}
                          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-gray-400 border border-white/10 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Recusar
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
