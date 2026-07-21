import { api } from './apiClient.js?v=2';

export const authApi = {
  registrar(dados) {
    return api('/auth/registrar', { method: 'POST', body: dados });
  },
  entrar(email, senha) {
    return api('/auth/entrar', { method: 'POST', body: { email, senha } });
  },
  atual() {
    return api('/auth/eu');
  },
  // Conta, campanhas, membros e personagens em uma única ida ao servidor.
  contexto(campanhaId = null) {
    const query = campanhaId ? `?campanha_id=${encodeURIComponent(campanhaId)}` : '';
    return api(`/contexto${query}`);
  },
  // Pedido público: abre uma solicitação para um administrador atender.
  pedirAjudaComSenha(email) {
    return api('/auth/esqueci-senha', { method: 'POST', body: { email } });
  },
  alterarSenha(senhaAtual, novaSenha) {
    return api('/auth/senha', {
      method: 'POST',
      body: { senha_atual: senhaAtual, nova_senha: novaSenha },
    });
  },
  sair() {
    return api('/auth/sair', { method: 'POST' });
  },
};
