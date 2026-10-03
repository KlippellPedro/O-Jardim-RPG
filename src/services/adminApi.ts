import { api } from './apiClient';

export interface ConvitePlataforma {
  id: string;
  max_usos: number;
  usos: number;
  expira_em: string;
  revogado_em: string | null;
  criado_em: string;
  nota: string;
  criado_por_nome: string | null;
  situacao: 'ativo' | 'usado' | 'expirado' | 'revogado';
}

export const adminApi = {
  resumo() {
    return api('/admin/resumo');
  },
  listarUsuarios({ busca = '', papel = '', ativo = '', pagina = 1 } = {}) {
    const query = new URLSearchParams({ pagina: String(pagina), por_pagina: '25' });
    if (busca) query.set('busca', busca);
    if (papel) query.set('papel', papel);
    if (ativo !== '') query.set('ativo', String(ativo));
    return api(`/admin/usuarios?${query}`);
  },
  listarCampanhas(incluirArquivadas = false) {
    const query = incluirArquivadas ? '?incluir_arquivadas=true' : '';
    return api(`/admin/campanhas${query}`);
  },
  auditoria(limite = 80) {
    return api(`/admin/auditoria?limite=${encodeURIComponent(limite)}`);
  },
  limparAuditoria() {
    return api('/admin/auditoria', { method: 'DELETE' });
  },
  backupAutomatico() {
    return api('/admin/backup-automatico');
  },
  editarUsuario(usuarioId: string, dados: any) {
    return api(`/admin/usuarios/${encodeURIComponent(usuarioId)}`, {
      method: 'PUT',
      body: dados,
    });
  },
  desativarUsuario(usuarioId: string) {
    return api(`/admin/usuarios/${encodeURIComponent(usuarioId)}`, {
      method: 'DELETE',
    });
  },
  pedidosDeSenha() {
    return api('/admin/pedidos-senha');
  },
  recusarPedidoDeSenha(pedidoId: string) {
    return api(`/admin/pedidos-senha/${encodeURIComponent(pedidoId)}`, { method: 'DELETE' });
  },
  redefinirSenha(usuarioId: string) {
    return api(`/admin/usuarios/${encodeURIComponent(usuarioId)}/senha`, {
      method: 'POST',
    });
  },
  /** Convites para criar conta na plataforma (nunca entram numa campanha). */
  listarConvites(todos = false) {
    return api<{ convites: ConvitePlataforma[] }>(`/admin/convites${todos ? '?todos=true' : ''}`);
  },
  /** O código só volta aqui, na criação: depois só existe o hash. */
  criarConvite(dados: { expira_em_dias: number; max_usos: number; nota: string }) {
    return api<{ id: string; codigo: string; expira_em: string; max_usos: number; nota: string }>('/admin/convites', {
      method: 'POST',
      body: dados,
    });
  },
  revogarConvite(conviteId: string) {
    return api(`/admin/convites/${encodeURIComponent(conviteId)}`, { method: 'DELETE' });
  },
};
