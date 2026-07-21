import { api } from './apiClient.js?v=2';

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
  editarUsuario(usuarioId, dados) {
    return api(`/admin/usuarios/${encodeURIComponent(usuarioId)}`, {
      method: 'PUT',
      body: dados,
    });
  },
  desativarUsuario(usuarioId) {
    return api(`/admin/usuarios/${encodeURIComponent(usuarioId)}`, {
      method: 'DELETE',
    });
  },
  pedidosDeSenha() {
    return api('/admin/pedidos-senha');
  },
  recusarPedidoDeSenha(pedidoId) {
    return api(`/admin/pedidos-senha/${encodeURIComponent(pedidoId)}`, { method: 'DELETE' });
  },
  // A senha provisória volta em texto uma única vez, nesta resposta.
  redefinirSenha(usuarioId) {
    return api(`/admin/usuarios/${encodeURIComponent(usuarioId)}/senha`, {
      method: 'POST',
    });
  },
};
