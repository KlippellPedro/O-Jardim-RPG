import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../services/adminApi';
import { useAuthStore } from '../../store/useAuthStore';
import { IAdminUser } from '../../types/admin';
import { Select } from '../ui/Select';
import { Search, Loader2, KeyRound, Ban, RotateCcw, Copy, Check, X } from 'lucide-react';

const PAPEIS = [
  { value: 'player', label: 'Player' },
  { value: 'mestre', label: 'Mestre' },
  { value: 'admin', label: 'Administrador' },
];

export const AdminUsuarios: React.FC = () => {
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const [usuarios, setUsuarios] = useState<IAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState<string | null>(null);
  const [papelEdicao, setPapelEdicao] = useState('player');
  const [nomeEdicao, setNomeEdicao] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [confirmandoDesativar, setConfirmandoDesativar] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [senhaRevelada, setSenhaRevelada] = useState<{ usuarioId: string; nome: string; senha: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const carregarUsuarios = useCallback(async (termoBusca: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    try {
      const response: any = await adminApi.listarUsuarios({ busca: termoBusca });
      if (controller.signal.aborted) return;
      setUsuarios(response?.usuarios || []);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      console.error('Erro ao carregar usuários:', err);
      setUsuarios([]);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const delay = setTimeout(() => carregarUsuarios(busca), 500);
    return () => {
      clearTimeout(delay);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [busca, carregarUsuarios]);

  const iniciarEdicao = (usr: IAdminUser) => {
    setErro(null);
    setEditando(usr.id);
    setPapelEdicao(usr.papel_plataforma === 'criador' ? 'admin' : usr.papel_plataforma);
    setNomeEdicao(usr.nome_exibicao);
  };

  const salvarEdicao = async (usr: IAdminUser) => {
    setSalvando(true);
    setErro(null);
    try {
      await adminApi.editarUsuario(usr.id, {
        nome_exibicao: nomeEdicao.trim() || undefined,
        papel_plataforma: papelEdicao,
      });
      setEditando(null);
      await carregarUsuarios(busca);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao salvar usuário.');
    } finally {
      setSalvando(false);
    }
  };

  const alternarAtivo = async (usr: IAdminUser) => {
    setProcessandoId(usr.id);
    setErro(null);
    try {
      if (usr.ativo) {
        await adminApi.desativarUsuario(usr.id);
      } else {
        await adminApi.editarUsuario(usr.id, { ativo: true });
      }
      await carregarUsuarios(busca);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao alterar o status da conta.');
    } finally {
      setProcessandoId(null);
      setConfirmandoDesativar(null);
    }
  };

  const redefinirSenha = async (usr: IAdminUser) => {
    setProcessandoId(usr.id);
    setErro(null);
    try {
      const resp: any = await adminApi.redefinirSenha(usr.id);
      setSenhaRevelada({ usuarioId: usr.id, nome: resp.nome_exibicao, senha: resp.senha_provisoria });
    } catch (e: any) {
      setErro(e?.message || 'Erro ao redefinir a senha.');
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
        <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl font-bold text-white">Usuários da Plataforma</h2>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              aria-label="Buscar usuários"
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
                usuarios.map((usr, i) => {
                  const ehVocMesmo = usr.id === usuarioLogado?.id;
                  const ehCriador = usr.papel_plataforma === 'criador';
                  const emEdicao = editando === usr.id;
                  const emProcesso = processandoId === usr.id;

                  return (
                    <motion.tr
                      key={usr.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-white/[0.02] transition-colors group align-top"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {usr.nome_exibicao ? usr.nome_exibicao[0].toUpperCase() : '?'}
                          </div>
                          {emEdicao ? (
                            <input
                              type="text"
                              value={nomeEdicao}
                              onChange={(e) => setNomeEdicao(e.target.value)}
                              className="bg-black/40 border border-white/10 rounded-lg py-1 px-2 text-white text-sm w-40 focus:border-purple-500/50 outline-none"
                            />
                          ) : (
                            <span className="text-white font-medium">
                              {usr.nome_exibicao} {ehVocMesmo && <span className="text-[10px] text-gray-500">(você)</span>}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{usr.email}</td>
                      <td className="p-4">
                        {emEdicao && !ehCriador ? (
                          <Select value={papelEdicao} onChange={setPapelEdicao} options={PAPEIS} className="w-36" disabled={salvando} />
                        ) : (
                          <span
                            className={`text-xs px-2 py-1 rounded-full border capitalize ${
                              usr.papel_plataforma === 'admin' || usr.papel_plataforma === 'criador'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                : usr.papel_plataforma === 'mestre'
                                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                            }`}
                          >
                            {usr.papel_plataforma}
                          </span>
                        )}
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
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {emEdicao ? (
                            <>
                              <button
                                onClick={() => salvarEdicao(usr)}
                                disabled={salvando || !nomeEdicao.trim()}
                                className="text-xs px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 disabled:opacity-50"
                              >
                                {salvando ? <Loader2 size={12} className="animate-spin" /> : 'Salvar'}
                              </button>
                              <button onClick={() => setEditando(null)} className="text-xs px-2 py-1.5 text-gray-400 hover:text-white">
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <>
                              {!ehCriador && (
                                <button
                                  onClick={() => iniciarEdicao(usr)}
                                  className="text-xs text-gray-400 hover:text-white underline decoration-white/30 transition-colors"
                                >
                                  Editar
                                </button>
                              )}
                              {!ehCriador && usr.ativo && (
                                <button
                                  onClick={() => redefinirSenha(usr)}
                                  disabled={emProcesso}
                                  title="Gerar senha provisória"
                                  className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                                >
                                  {emProcesso ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                                </button>
                              )}
                              {!ehCriador && !ehVocMesmo && (
                                confirmandoDesativar === usr.id ? (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => alternarAtivo(usr)}
                                      disabled={emProcesso}
                                      className="text-xs px-2 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 disabled:opacity-50"
                                    >
                                      {emProcesso ? <Loader2 size={12} className="animate-spin" /> : 'Confirmar'}
                                    </button>
                                    <button onClick={() => setConfirmandoDesativar(null)} className="text-xs px-2 py-1.5 text-gray-400 hover:text-white">
                                      Cancelar
                                    </button>
                                  </div>
                                ) : usr.ativo ? (
                                  <button
                                    onClick={() => setConfirmandoDesativar(usr.id)}
                                    title="Desativar conta"
                                    className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  >
                                    <Ban size={14} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => alternarAtivo(usr)}
                                    disabled={emProcesso}
                                    title="Reativar conta"
                                    className="p-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                                  >
                                    {emProcesso ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                  </button>
                                )
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
