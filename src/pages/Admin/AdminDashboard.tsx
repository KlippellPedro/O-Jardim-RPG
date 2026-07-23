import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { IAdminUser } from '../../types/admin';
import { Shield, ArrowLeft, Users, Search, Loader2, Database, ShieldAlert, KeyRound } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<IAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // BUG-05: ref para rastrear o AbortController da requisição em andamento,
  // garantindo que apenas a mais recente seja mantida viva.
  const abortControllerRef = useRef<AbortController | null>(null);

  // BUG-05: useCallback para estabilizar a referência da função entre renders
  const carregarUsuarios = useCallback(async (termoBusca: string) => {
    // Cancela qualquer requisição anterior em voo
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const response = await adminApi.listarUsuarios({ busca: termoBusca });

      // Ignora o resultado se essa requisição foi cancelada por uma mais nova
      if (controller.signal.aborted) return;

      // A API devolve { usuarios: [...], paginacao: {...} }
      if (Array.isArray(response)) {
        setUsuarios(response as IAdminUser[]);
      } else if (response.usuarios) {
        setUsuarios(response.usuarios as IAdminUser[]);
      } else {
        setUsuarios([]);
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) return; // Erro de abort é esperado, não logar
      console.error('Erro ao carregar usuários:', err);
      setUsuarios([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // BUG-05: debounce com cleanup do timer — ao desmontar ou ao mudar busca,
  // o timer anterior é cancelado. O AbortController cancela a requisição em voo.
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      carregarUsuarios(busca);
    }, 500);

    return () => {
      clearTimeout(delayDebounceFn);
      // Cleanup ao desmontar o componente: cancela requisição pendente
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [busca, carregarUsuarios]);

  return (
    <div className="relative z-10 min-h-screen pt-24 px-8 pb-12 w-full max-w-[1400px] mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3" style={{ fontFamily: 'Cinzel, serif' }}>
              <Shield className="text-purple-500" size={32} />
              Central de Administração
            </h1>
            <p className="text-gray-400 mt-1">Gerencie usuários, campanhas e acessos de segurança da plataforma.</p>
          </div>
        </div>
      </div>

      {/* CARDS DE RESUMO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-colors" />
          <Users className="text-purple-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Total de Usuários</h3>
          <p className="text-3xl font-bold text-white">{isLoading ? '...' : usuarios.length}</p>
        </div>

        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors" />
          <Database className="text-blue-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Campanhas Ativas</h3>
          <p className="text-3xl font-bold text-white">---</p>
        </div>

        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-500/30 transition-colors" />
          <KeyRound className="text-yellow-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Pedidos de Senha</h3>
          <p className="text-3xl font-bold text-white">---</p>
        </div>

        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/20 rounded-full blur-3xl group-hover:bg-red-500/30 transition-colors" />
          <ShieldAlert className="text-red-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Registros de Auditoria</h3>
          <p className="text-3xl font-bold text-white">---</p>
        </div>
      </div>

      {/* ÁREA PRINCIPAL - TABELA */}
      <div className="bg-[#0b0a12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Usuários da Plataforma</h2>

          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por e-mail ou nome..."
              className="w-full bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white text-sm focus:border-purple-500/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Usuário</th>
                <th className="p-4 font-medium">E-mail</th>
                <th className="p-4 font-medium">Papel</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <Loader2 className="animate-spin text-purple-500 mx-auto" size={32} />
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                usuarios.map((usr, i) => (
                  <motion.tr
                    key={usr.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">
                          {usr.nome_exibicao ? usr.nome_exibicao[0].toUpperCase() : '?'}
                        </div>
                        <span className="text-white font-medium">{usr.nome_exibicao}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{usr.email}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border capitalize ${
                          usr.papel_plataforma === 'admin'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : usr.papel_plataforma === 'criador'
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : usr.papel_plataforma === 'mestre'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        }`}
                      >
                        {usr.papel_plataforma}
                      </span>
                    </td>
                    <td className="p-4">
                      {usr.ativo ? (
                        <span className="text-xs px-2 py-1 rounded-full border bg-green-500/10 text-green-400 border-green-500/20">
                          Ativo
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full border bg-gray-500/10 text-gray-400 border-gray-500/20">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-xs text-gray-400 hover:text-white underline decoration-white/30 transition-colors">
                        Editar
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
