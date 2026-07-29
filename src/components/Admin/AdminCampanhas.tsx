import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../services/adminApi';
import { Search, Loader2, Users, Sword, Newspaper, Link2 } from 'lucide-react';

interface IAdminCampanha {
  id: string;
  nome: string;
  descricao?: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
  dono_id: string | null;
  dono_nome: string | null;
  dono_email: string | null;
  membros: number;
  personagens: number;
  publicacoes: number;
  discord: boolean;
}

export const AdminCampanhas: React.FC = () => {
  const [campanhas, setCampanhas] = useState<IAdminCampanha[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [incluirArquivadas, setIncluirArquivadas] = useState(false);

  const carregar = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp: any = await adminApi.listarCampanhas(incluirArquivadas);
      setCampanhas(resp?.campanhas || []);
    } catch (e) {
      console.error('Erro ao carregar campanhas', e);
      setCampanhas([]);
    } finally {
      setIsLoading(false);
    }
  }, [incluirArquivadas]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? campanhas.filter(
        (c) =>
          c.nome.toLowerCase().includes(termo) ||
          c.dono_nome?.toLowerCase().includes(termo) ||
          c.dono_email?.toLowerCase().includes(termo)
      )
    : campanhas;

  return (
    <div className="bg-[#0b0a12]/80 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-bold text-white">Campanhas da Plataforma</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={incluirArquivadas}
              onChange={(e) => setIncluirArquivadas(e.target.checked)}
              className="accent-purple-500"
            />
            Incluir arquivadas
          </label>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou dono..."
              className="w-full bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-4 text-white text-sm focus:border-purple-500/50 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-medium">Campanha</th>
              <th className="p-4 font-medium">Dono</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Membros</th>
              <th className="p-4 font-medium">Personagens</th>
              <th className="p-4 font-medium">Publicações</th>
              <th className="p-4 font-medium">Discord</th>
              <th className="p-4 font-medium">Atualizada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <Loader2 className="animate-spin text-purple-500 mx-auto" size={32} />
                </td>
              </tr>
            ) : filtradas.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center text-gray-500">
                  Nenhuma campanha encontrada.
                </td>
              </tr>
            ) : (
              filtradas.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="p-4">
                    <span className="text-white font-medium">{c.nome}</span>
                  </td>
                  <td className="p-4 text-gray-400 text-sm">
                    {c.dono_nome ? (
                      <>
                        {c.dono_nome}
                        <div className="text-[10px] text-gray-600">{c.dono_email}</div>
                      </>
                    ) : (
                      <span className="text-gray-600 italic">sem dono</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-xs px-2 py-1 rounded-full border capitalize ${
                        c.status === 'ativa'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="p-4 text-gray-300 text-sm">
                    <span className="flex items-center gap-1.5"><Users size={13} className="text-gray-500" /> {c.membros}</span>
                  </td>
                  <td className="p-4 text-gray-300 text-sm">
                    <span className="flex items-center gap-1.5"><Sword size={13} className="text-gray-500" /> {c.personagens}</span>
                  </td>
                  <td className="p-4 text-gray-300 text-sm">
                    <span className="flex items-center gap-1.5"><Newspaper size={13} className="text-gray-500" /> {c.publicacoes}</span>
                  </td>
                  <td className="p-4">
                    {c.discord ? (
                      <span className="flex items-center gap-1 text-xs text-blue-400"><Link2 size={12} /> Vinculado</span>
                    ) : (
                      <span className="text-xs text-gray-600">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(c.atualizado_em).toLocaleString('pt-BR')}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
