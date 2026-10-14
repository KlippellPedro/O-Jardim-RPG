import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { adminApi } from '../../services/adminApi';
import { useAuthStore } from '../../store/useAuthStore';
import { Bell, ShieldCheck, Users, Database, ShieldAlert, KeyRound, ScrollText, HardDriveDownload } from 'lucide-react';
import { AdminUsuarios } from '../../components/Admin/AdminUsuarios';
import { AdminCampanhas } from '../../components/Admin/AdminCampanhas';
import { AdminPedidosSenha } from '../../components/Admin/AdminPedidosSenha';
import { AdminAuditoria } from '../../components/Admin/AdminAuditoria';
import { AdminBackup } from '../../components/Admin/AdminBackup';
import { CaixaDeAvisos } from '../../components/caixaDeAvisos/CaixaDeAvisos';
import { PainelCartao, PainelShell, type IAbaDoPainel } from '../../components/painel/PainelShell';
import { useAbaNaUrl } from '../../components/painel/useAbaNaUrl';

const ABAS_DA_ADMINISTRACAO = ['usuarios', 'campanhas', 'pedidos', 'avisos', 'auditoria', 'backup'] as const;
type AbaDaAdministracao = typeof ABAS_DA_ADMINISTRACAO[number];

interface IKpis {
  totalUsuarios: number | null;
  campanhasAtivas: number | null;
  pedidosPendentes: number | null;
  eventosRecentes: number | null;
}

export const AdminDashboard: React.FC = () => {
  const [aba, trocarAba] = useAbaNaUrl<AbaDaAdministracao>(ABAS_DA_ADMINISTRACAO, 'usuarios');
  const avisosDaAdministracao = useAuthStore((estado) => estado.avisos.admin);
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

  const abas = useMemo<IAbaDoPainel<AbaDaAdministracao>[]>(() => [
    { id: 'usuarios', rotulo: 'Usuários', icone: Users },
    { id: 'campanhas', rotulo: 'Campanhas', icone: Database },
    { id: 'pedidos', rotulo: 'Pedidos de Senha', icone: KeyRound, contagem: kpis.pedidosPendentes ?? 0 },
    { id: 'avisos', rotulo: 'Avisos', icone: Bell, contagem: avisosDaAdministracao },
    { id: 'auditoria', rotulo: 'Auditoria', icone: ScrollText },
    { id: 'backup', rotulo: 'Backup', icone: HardDriveDownload },
  ], [kpis.pedidosPendentes, avisosDaAdministracao]);

  const cartoes = [
    { id: 'usuarios', titulo: 'Total de Usuários', valor: kpis.totalUsuarios, icone: Users, icone_classe: 'text-purple-400', brilho: 'bg-purple-500/20 group-hover:bg-purple-500/30' },
    { id: 'campanhas', titulo: 'Campanhas Ativas', valor: kpis.campanhasAtivas, icone: Database, icone_classe: 'text-blue-400', brilho: 'bg-blue-500/20 group-hover:bg-blue-500/30' },
    { id: 'pedidos', titulo: 'Pedidos de Senha', valor: kpis.pedidosPendentes, icone: KeyRound, icone_classe: 'text-yellow-400', brilho: 'bg-yellow-500/20 group-hover:bg-yellow-500/30' },
    { id: 'auditoria', titulo: 'Eventos Recentes', valor: kpis.eventosRecentes, icone: ShieldAlert, icone_classe: 'text-red-400', brilho: 'bg-red-500/20 group-hover:bg-red-500/30' },
  ] as const;

  const resumo = (
    <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-4 sm:gap-6">
      {cartoes.map(({ id, titulo, valor, icone: Icone, icone_classe, brilho }) => (
        // Cada número leva à aba que o explica.
        <button
          key={id}
          type="button"
          onClick={() => trocarAba(id)}
          className="group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0b0a12]/60 p-6 text-left backdrop-blur-xl transition-colors hover:border-white/15"
        >
          <div className={`absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl transition-colors ${brilho}`} />
          <Icone className={`${icone_classe} mb-4`} size={28} />
          <h3 className="mb-1 text-sm font-medium text-gray-400">{titulo}</h3>
          <p className="text-3xl font-bold text-white">{valor ?? '...'}</p>
        </button>
      ))}
    </div>
  );

  return (
    <PainelShell
      icone={ShieldCheck}
      titulo="Painel de Administração"
      subtitulo="Gerencie usuários, campanhas e acessos de segurança da plataforma."
      tom="roxo"
      largura="larga"
      resumo={resumo}
      abas={abas}
      abaAtiva={aba}
      aoTrocarAba={trocarAba}
    >
      <motion.div key={aba} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {aba === 'usuarios' && <AdminUsuarios />}
        {aba === 'campanhas' && <AdminCampanhas />}
        {aba === 'pedidos' && <AdminPedidosSenha />}
        {aba === 'avisos' && (
          <PainelCartao>
            <CaixaDeAvisos painel="admin" mostrarMesa={false} textoVazio="Nenhum aviso da administração por enquanto." />
          </PainelCartao>
        )}
        {aba === 'auditoria' && <AdminAuditoria />}
        {aba === 'backup' && <AdminBackup />}
      </motion.div>
    </PainelShell>
  );
};

export default AdminDashboard;
