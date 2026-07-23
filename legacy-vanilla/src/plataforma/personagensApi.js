import { api } from './apiClient.js?v=2';

export const personagensApi = {
  // `completo` traz carteira e inventário junto, numa requisição só.
  listar(campanhaId, completo = false) {
    const query = new URLSearchParams({ campanha_id: campanhaId });
    if (completo) query.set('completo', 'true');
    return api(`/personagens?${query}`);
  },
  obter(personagemId) {
    return api(`/personagens/${encodeURIComponent(personagemId)}`);
  },
  criar(campanhaId, personagem, donoUsuarioId = null) {
    return api('/personagens', {
      method: 'POST',
      body: {
        campanha_id: campanhaId,
        nome: personagem.nome,
        dono_usuario_id: donoUsuarioId,
        ficha: personagem,
      },
    });
  },
  salvar(personagemId, versaoEsperada, personagem) {
    return api(`/personagens/${encodeURIComponent(personagemId)}`, {
      method: 'PUT',
      body: {
        versao_esperada: versaoEsperada,
        nome: personagem.nome,
        ficha: personagem,
      },
    });
  },
  salvarEconomia(personagemId, versaoEsperada, carteira, inventario) {
    return api(`/personagens/${encodeURIComponent(personagemId)}/economia`, {
      method: 'PUT',
      body: {
        versao_esperada: versaoEsperada,
        carteira,
        inventario,
      },
    });
  },
  arquivar(personagemId) {
    return api(`/personagens/${encodeURIComponent(personagemId)}`, { method: 'DELETE' });
  },
};
