/** Registra o service worker (public/sw.js) só no site publicado. No servidor de desenvolvimento
 * ele ficaria segurando arquivos velhos e confundiria a conferência de qualquer mudança. */
export function registrarServiceWorker(): void {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((erro) => {
      console.warn('Não foi possível registrar o service worker', erro);
    });
  });
}
