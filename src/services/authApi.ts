import { api } from './apiClient';

export const authApi = {
  registrar(dados: any) {
    return api('/auth/registrar', { method: 'POST', body: dados });
  },
  // 'aberto' | 'convite' | 'fechado'
  modoDeCadastro() {
    return api('/auth/cadastro');
  },
  entrar(email: string, senha: string) {
    return api('/auth/entrar', { method: 'POST', body: { email, senha } });
  },
  atual() {
    return api('/auth/eu');
  },
  contexto(campanhaId: string | null = null) {
    const query = campanhaId ? `?campanha_id=${encodeURIComponent(campanhaId)}` : '';
    return api(`/contexto${query}`);
  },
  pedirAjudaComSenha(email: string) {
    return api('/auth/esqueci-senha', { method: 'POST', body: { email } });
  },
  alterarSenha(senhaAtual: string, novaSenha: string) {
    return api('/auth/senha', {
      method: 'POST',
      body: { senha_atual: senhaAtual, nova_senha: novaSenha },
    });
  },
  sair() {
    return api('/auth/sair', { method: 'POST' });
  },
};
