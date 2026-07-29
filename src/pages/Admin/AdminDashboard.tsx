import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../../services/adminApi';
import { Shield, ArrowLeft, Users, Database, ShieldAlert, KeyRound, ScrollText, HardDriveDownload } from 'lucide-react';
import { AdminUsuarios } from '../../components/Admin/AdminUsuarios';
import { AdminCampanhas } from '../../components/Admin/AdminCampanhas';
import { AdminPedidosSenha } from '../../components/Admin/AdminPedidosSenha';
import { AdminAuditoria } from '../../components/Admin/AdminAuditoria';
import { AdminBackup } from '../../components/Admin/AdminBackup';

type Aba = 'usuarios' | 'campanhas' | 'pedidos' | 'auditoria' | 'backup';

interface IKpis {
  totalUsuarios: number | null;
  campanhasAtivas: number | null;
  pedidosPendentes: number | null;
  eventosRecentes: number | null;
}

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>('usuarios');
  const [kpis, setKpis] = useState<IKpis>({
    totalUsuarios: null,
    campanhasAtivas: null,
    pedidosPendentes: null,
    eventosRecentes: null,
  });

  useEffect(() => {
    let cancelado = false;
    Promise.allSettled([
      adminApi.listarUsuarios({ pagina: 1 }),
      adminApi.listarCampanhas(false),
      adminApi.pedidosDeSenha(),
      adminApi.auditoria(100),
    ]).then(([usuarios, campanhas, pedidos, auditoria]) => {
      if (cancelado) return;
      setKpis({
        totalUsuarios: usuarios.status === 'fulfilled' ? (usuarios.value as any)?.paginacao?.total ?? null : null,
        campanhasAtivas: campanhas.status === 'fulfilled' ? (campanhas.value as any)?.campanhas?.length ?? null : null,
        pedidosPendentes: pedidos.status === 'fulfilled' ? (pedidos.value as any)?.pedidos?.length ?? null : null,
        eventosRecentes: auditoria.status === 'fulfilled' ? (auditoria.value as any)?.eventos?.length ?? null : null,
      });
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const ABAS: { id: Aba; label: string; icon: React.ReactNode }[] = [
    { id: 'usuarios', label: 'Usuários', icon: <Users size={16} /> },
    { id: 'campanhas', label: 'Campanhas', icon: <Database size={16} /> },
    { id: 'pedidos', label: 'Pedidos de Senha', icon: <KeyRound size={16} /> },
    { id: 'auditoria', label: 'Auditoria', icon: <ScrollText size={16} /> },
    { id: 'backup', label: 'Backup', icon: <HardDriveDownload size={16} /> },
  ];

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
          <p className="text-3xl font-bold text-white">{kpis.totalUsuarios ?? '...'}</p>
        </div>

        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors" />
          <Database className="text-blue-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Campanhas Ativas</h3>
          <p className="text-3xl font-bold text-white">{kpis.campanhasAtivas ?? '...'}</p>
        </div>

        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-500/30 transition-colors" />
          <KeyRound className="text-yellow-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Pedidos de Senha</h3>
          <p className="text-3xl font-bold text-white">{kpis.pedidosPendentes ?? '...'}</p>
        </div>

        <div className="bg-[#0b0a12]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/20 rounded-full blur-3xl group-hover:bg-red-500/30 transition-colors" />
          <ShieldAlert className="text-red-400 mb-4" size={28} />
          <h3 className="text-gray-400 text-sm font-medium mb-1">Eventos Recentes</h3>
          <p className="text-3xl font-bold text-white">{kpis.eventosRecentes ?? '...'}</p>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex gap-4 mb-6 border-b border-white/10 pb-1 overflow-x-auto custom-scrollbar">
        {ABAS.map((item) => (
          <button
            key={item.id}
            onClick={() => setAba(item.id)}
            className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase text-xs transition-colors whitespace-nowrap ${
              aba === item.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={aba}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {aba === 'usuarios' && <AdminUsuarios />}
          {aba === 'campanhas' && <AdminCampanhas />}
          {aba === 'pedidos' && <AdminPedidosSenha />}
          {aba === 'auditoria' && <AdminAuditoria />}
          {aba === 'backup' && <AdminBackup />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
