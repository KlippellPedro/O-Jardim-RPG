import { api } from './apiClient.js?v=2';

export const conteudoApi = {
  visivel(campanhaId, modulo = null) {
    return api(`/conhecimento?campanha_id=${encodeURIComponent(campanhaId)}`)
      .then(resultado => ({
        informacoes: (resultado.informacoes || [])
          .filter(item => !modulo || item.tipo === modulo),
      }));
  },
  administrar(campanhaId) {
    return api(`/conhecimento?campanha_id=${encodeURIComponent(campanhaId)}&administrar=true`);
  },
  biblioteca(campanhaId, modulo) {
    return api(`/conteudo/biblioteca?campanha_id=${encodeURIComponent(campanhaId)}&modulo=${encodeURIComponent(modulo)}`);
  },
  publicar(campanhaId, modulo, chaves, acessoPadrao = 'completo') {
    return api('/conteudo/publicar', {
      method: 'POST',
      body: {
        campanha_id: campanhaId,
        modulo,
        chaves,
        acesso_padrao: acessoPadrao,
      },
    });
  },
  ocultar(informacaoId) {
    return api(`/conteudo/${encodeURIComponent(informacaoId)}`, { method: 'DELETE' });
  },
  alterarAcesso(informacaoId, acessoPadrao) {
    return api(`/conteudo/${encodeURIComponent(informacaoId)}/acesso`, {
      method: 'PUT',
      body: { acesso_padrao: acessoPadrao },
    });
  },
  liberar(informacaoId, destinatarioTipo, destinatarioId, acesso) {
    return api(`/conhecimento/${encodeURIComponent(informacaoId)}/liberacoes`, {
      method: 'PUT',
      body: {
        destinatario_tipo: destinatarioTipo,
        destinatario_id: destinatarioId,
        acesso,
      },
    });
  },
  revogar(informacaoId, destinatarioTipo, destinatarioId) {
    const query = new URLSearchParams({
      destinatario_tipo: destinatarioTipo,
      destinatario_id: destinatarioId,
    });
    return api(`/conhecimento/${encodeURIComponent(informacaoId)}/liberacoes?${query}`, {
      method: 'DELETE',
    });
  },
};
