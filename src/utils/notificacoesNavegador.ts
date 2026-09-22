const ICONE = '/assets/img/icons/favicon-64.png';

/** Se o navegador nem tem a API, nenhuma das outras funções faz sentido. */
export const notificacaoDisponivel = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

export const permissaoNotificacaoConcedida = (): boolean => (
  notificacaoDisponivel() && Notification.permission === 'granted'
);

export const permissaoNotificacaoNegada = (): boolean => (
  notificacaoDisponivel() && Notification.permission === 'denied'
);

/** Só funciona chamada a partir de um clique da pessoa: é exigência do navegador,
 * não dá pra pedir permissão sozinho ao carregar a página. */
export const pedirPermissaoNotificacao = async (): Promise<boolean> => {
  if (!notificacaoDisponivel()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const resultado = await Notification.requestPermission();
    return resultado === 'granted';
  } catch {
    return false;
  }
};

/** Avisa fora da aba: só dispara com a permissão já concedida e a aba escondida
 * (se a pessoa já está olhando, o aviso na tela já basta). */
export const notificarForaDaAba = (titulo: string, corpo: string, tag: string): void => {
  if (!permissaoNotificacaoConcedida()) return;
  if (typeof document !== 'undefined' && !document.hidden) return;
  try {
    const notificacao = new Notification(titulo, { body: corpo, icon: ICONE, tag });
    notificacao.onclick = () => {
      window.focus();
      notificacao.close();
    };
  } catch {
    // Alguns navegadores recusam Notification fora de um Service Worker em certos contextos; o aviso na aba continua valendo.
  }
};
