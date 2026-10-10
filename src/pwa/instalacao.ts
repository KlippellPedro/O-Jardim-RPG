/** Instalar o Jardim como app (PWA).
 *
 * O navegador oferece a instalação uma vez, num evento (`beforeinstallprompt`) que chega cedo,
 * antes de qualquer tela estar pronta. Este módulo começa a escutar logo na abertura do site,
 * guarda o evento e entrega para a tela de Preferências (e para a sugestão única no celular). */

import { avisar } from '../components/avisos/avisos';

export type SituacaoDeInstalacao = 'instalado' | 'disponivel' | 'ios' | 'indisponivel';
export type ResultadoDaInstalacao = 'aceitou' | 'recusou' | 'indisponivel';

interface EventoDeInstalacao extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface EntradaDaSituacao {
  rodandoComoApp: boolean;
  instaladoNestaSessao: boolean;
  temEvento: boolean;
  ios: boolean;
}

/** O que a tela de Preferências mostra: já instalado, botão de instalar, instrução do iOS ou orientação geral. */
export function decidirSituacao(entrada: EntradaDaSituacao): SituacaoDeInstalacao {
  if (entrada.rodandoComoApp || entrada.instaladoNestaSessao) return 'instalado';
  if (entrada.temEvento) return 'disponivel';
  if (entrada.ios) return 'ios';
  return 'indisponivel';
}

/** iPhone, iPad e iPod; o iPad novo se apresenta como Mac, mas é o único "Mac" com tela de toque. */
export function ehDispositivoIos(userAgent: string, plataforma: string, pontosDeToque: number): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent) || (plataforma === 'MacIntel' && pontosDeToque > 1);
}

let evento: EventoDeInstalacao | null = null;
let instaladoNestaSessao = false;
let iniciado = false;
const ouvintes = new Set<() => void>();

const emitir = () => ouvintes.forEach((ouvinte) => ouvinte());

/** O site está aberto como app instalado (janela própria, sem a barra do navegador). */
export function rodandoComoApp(): boolean {
  if (typeof window === 'undefined') return false;
  const navegador = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.('(display-mode: standalone)').matches) || navegador.standalone === true;
}

export function situacaoDeInstalacao(): SituacaoDeInstalacao {
  const ambiente = typeof navigator === 'undefined' ? null : navigator;
  return decidirSituacao({
    rodandoComoApp: rodandoComoApp(),
    instaladoNestaSessao,
    temEvento: evento !== null,
    ios: ambiente ? ehDispositivoIos(ambiente.userAgent, ambiente.platform, ambiente.maxTouchPoints ?? 0) : false,
  });
}

export function inscreverInstalacao(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
}

/** Abre o pedido de instalação do navegador. O evento só vale uma vez: depois dele, só o navegador oferece de novo. */
export async function pedirInstalacao(): Promise<ResultadoDaInstalacao> {
  if (!evento) return 'indisponivel';
  const pedido = evento;
  evento = null;
  emitir();
  await pedido.prompt();
  const { outcome } = await pedido.userChoice;
  return outcome === 'accepted' ? 'aceitou' : 'recusou';
}

const CHAVE_DA_SUGESTAO = 'jardim:pwa-sugestao';
const ESPERA_DA_SUGESTAO_MS = 6000;

async function instalarDaSugestao() {
  try {
    if ((await pedirInstalacao()) === 'aceitou') avisar.sucesso('Instalado! Procure o ícone do Jardim na tela inicial.');
  } catch {
    avisar.erro('Não foi possível abrir a instalação agora. Tente pelo menu do navegador.');
  }
}

/** No celular e no tablet, sugere a instalação uma única vez por aparelho, com o botão no próprio aviso. */
function sugerirUmaVez() {
  try {
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;
    if (window.localStorage.getItem(CHAVE_DA_SUGESTAO)) return;
    window.localStorage.setItem(CHAVE_DA_SUGESTAO, 'feita');
  } catch {
    return;
  }
  window.setTimeout(() => {
    if (evento === null || document.visibilityState !== 'visible') return;
    avisar.info('Dá pra instalar o Jardim no celular: abre mais rápido e em tela cheia.', {
      titulo: 'Instalar o Jardim',
      chave: 'pwa:sugestao',
      duracaoMs: 14000,
      acao: { rotulo: 'Instalar', aoClicar: instalarDaSugestao },
    });
  }, ESPERA_DA_SUGESTAO_MS);
}

/** Começa a escutar o navegador; chamado uma vez, antes de a tela montar. */
export function iniciarCapturaDeInstalacao(): void {
  if (iniciado || typeof window === 'undefined') return;
  iniciado = true;
  window.addEventListener('beforeinstallprompt', (recebido) => {
    // Sem isso o navegador mostra o próprio mini aviso na hora errada; a oferta é nossa.
    recebido.preventDefault();
    evento = recebido as EventoDeInstalacao;
    emitir();
    sugerirUmaVez();
  });
  window.addEventListener('appinstalled', () => {
    evento = null;
    instaladoNestaSessao = true;
    emitir();
  });
}
