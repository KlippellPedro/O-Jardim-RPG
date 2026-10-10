/** Regras de apresentação do combate na Sessão: quando a Vida de alguém "reage" (número
 * flutuando, tremor, batimento) e quando a mesa recebe o aviso de início, de rodada e de fim.
 *
 * Tudo aqui parte do que o cliente já recebe. Se o servidor escondeu o número (criatura de
 * visibilidade parcial), não há valor para comparar, e a única pista continua sendo o texto de
 * estado que a mesa já via ("Ferido", "Quase morto"). */

export type SituacaoDeVida = 'normal' | 'baixa' | 'critica' | 'caida';

/** Os mesmos cortes da barra da Ficha: até 25% é baixa, até 10% é crítica. */
export const LIMITE_VIDA_BAIXA = 0.25;
export const LIMITE_VIDA_CRITICA = 0.1;

export const ESTADO_FORA_DE_COMBATE = 'Fora de combate';
export const ESTADO_QUASE_MORTO = 'Quase morto';

/** Como está a Vida de um participante. Sem número (visibilidade parcial), só o texto de estado do servidor conta. */
export function situacaoDaVida(
  atual: number | undefined,
  maximo: number | undefined,
  estado?: string | null,
): SituacaoDeVida {
  if (atual !== undefined) {
    if (atual <= 0) return 'caida';
    if (maximo !== undefined && maximo > 0) {
      const proporcao = atual / maximo;
      if (proporcao <= LIMITE_VIDA_CRITICA) return 'critica';
      if (proporcao <= LIMITE_VIDA_BAIXA) return 'baixa';
    }
    return 'normal';
  }
  if (estado === ESTADO_FORA_DE_COMBATE) return 'caida';
  if (estado === ESTADO_QUASE_MORTO) return 'critica';
  return 'normal';
}

/** Quanto o valor mudou entre duas leituras; 0 quando falta uma das duas (nada para mostrar). */
export function deltaDaBarra(anterior: number | undefined, atual: number | undefined): number {
  if (anterior === undefined || atual === undefined) return 0;
  const delta = atual - anterior;
  return Number.isFinite(delta) ? Math.trunc(delta) : 0;
}

/** Algum participante meu (do jogador logado) perdeu Vida entre duas leituras? Quem não manda número (visibilidade parcial)
 * nunca conta, porque sem número não há como comparar. */
export function houveDanoNosMeus(
  antes: ReadonlyArray<{ id: string; hpAtual?: number }>,
  depois: ReadonlyArray<{ id: string; eMeu?: boolean; hpAtual?: number }>,
): boolean {
  const vidaAntes = new Map(antes.map((item) => [item.id, item.hpAtual]));
  return depois.some((item) => {
    if (!item.eMeu || item.hpAtual === undefined) return false;
    const anterior = vidaAntes.get(item.id);
    return anterior !== undefined && item.hpAtual < anterior;
  });
}

export type TomDaBarra = 'health' | 'mana' | 'stamina';
export type TipoDeFlutuante = 'dano' | 'cura' | 'mana' | 'estamina';

/** A cor do número flutuante: perda de Vida é vermelha, cura é verde; Mana e Estamina têm a cor do próprio recurso. */
export function tipoDoFlutuante(tom: TomDaBarra, delta: number): TipoDeFlutuante {
  if (tom === 'mana') return 'mana';
  if (tom === 'stamina') return 'estamina';
  return delta < 0 ? 'dano' : 'cura';
}

export function textoDoDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Força do tremor (em pixels) de acordo com o tamanho do golpe em relação à Vida máxima. */
export function forcaDoTremor(delta: number, maximo: number | undefined): number {
  if (delta >= 0) return 0;
  const base = maximo && maximo > 0 ? Math.abs(delta) / maximo : 0.1;
  return Math.min(9, 3 + base * 36);
}

export interface EstadoDeCombate {
  sessaoId: string | null;
  emCombate: boolean;
  rodada: number;
}

export type TipoAvisoDeCombate = 'inicio' | 'rodada' | 'fim';

export interface AvisoDeCombate {
  chave: string;
  tipo: TipoAvisoDeCombate;
  rodada: number;
  /** Quem joga agora, quando a mesa pode saber (criatura escondida fica sem nome). */
  nomeDaVez?: string;
}

/** O que mudou no combate entre duas leituras do estado da sessão, ou null. A primeira leitura
 * (página recém-aberta) e a troca de sessão nunca anunciam, e voltar um turno não é rodada nova. */
export function mudancaDeCombate(
  antes: EstadoDeCombate | null,
  depois: EstadoDeCombate,
): { tipo: TipoAvisoDeCombate; rodada: number } | null {
  if (!antes || !antes.sessaoId || antes.sessaoId !== depois.sessaoId) return null;
  if (!antes.emCombate && depois.emCombate) return { tipo: 'inicio', rodada: Math.max(1, depois.rodada) };
  if (antes.emCombate && !depois.emCombate) return { tipo: 'fim', rodada: antes.rodada };
  if (antes.emCombate && depois.emCombate && depois.rodada > antes.rodada) return { tipo: 'rodada', rodada: depois.rodada };
  return null;
}

export const TEXTO_DO_AVISO: Record<TipoAvisoDeCombate, { titulo: (rodada: number) => string; legenda: (aviso: AvisoDeCombate) => string }> = {
  inicio: {
    titulo: () => 'Combate!',
    legenda: (aviso) => (aviso.nomeDaVez ? `A rodada 1 abre com ${aviso.nomeDaVez}` : 'A rodada 1 começou'),
  },
  rodada: {
    titulo: (rodada) => `Rodada ${rodada}`,
    legenda: (aviso) => (aviso.nomeDaVez ? `${aviso.nomeDaVez} abre a rodada` : 'Uma nova rodada começou'),
  },
  fim: {
    titulo: () => 'Fim do combate',
    legenda: () => 'A cena volta à preparação',
  },
};
