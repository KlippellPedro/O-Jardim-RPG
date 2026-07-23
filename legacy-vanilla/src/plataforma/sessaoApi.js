import { api } from './apiClient.js?v=2';

export const sessaoApi = {
  obter(campanhaId) {
    return api(`/sessao?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  abrir(campanhaId, titulo = '', incluirPersonagens = true) {
    return api('/sessao', {
      method: 'POST',
      body: { campanha_id: campanhaId, titulo, incluir_personagens: incluirPersonagens },
    });
  },
  encerrar(sessaoId) {
    return api(`/sessao/${encodeURIComponent(sessaoId)}`, { method: 'DELETE' });
  },
  adicionar(sessaoId, participante) {
    return api(`/sessao/${encodeURIComponent(sessaoId)}/participantes`, {
      method: 'POST',
      body: participante,
    });
  },
  atualizar(sessaoId, participanteId, dados) {
    return api(`/sessao/${encodeURIComponent(sessaoId)}/participantes/${encodeURIComponent(participanteId)}`, {
      method: 'PUT',
      body: dados,
    });
  },
  remover(sessaoId, participanteId) {
    return api(`/sessao/${encodeURIComponent(sessaoId)}/participantes/${encodeURIComponent(participanteId)}`, {
      method: 'DELETE',
    });
  },
  // Atualiza personagens pela iniciativa fixa da ficha e ordena a fila.
  sincronizarIniciativa(sessaoId) {
    return api(`/sessao/${encodeURIComponent(sessaoId)}/iniciativa`, { method: 'POST' });
  },
  turno(sessaoId, acao) {
    return api(`/sessao/${encodeURIComponent(sessaoId)}/turno`, {
      method: 'POST',
      body: { acao },
    });
  },
  // Monstros do catálogo pro mestre montar a cena (só quem comanda a mesa).
  bestiario(campanhaId) {
    return api(`/sessao/bestiario?campanha_id=${encodeURIComponent(campanhaId)}`);
  },
  // O SSE avisa que mudou; quem recebe refaz o obter().
  enderecoDosEventos(campanhaId) {
    return `/api/v1/sessao/${encodeURIComponent(campanhaId)}/eventos`;
  },
};
