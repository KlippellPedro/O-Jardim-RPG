// Mudanças do mapa que chegam prontas pelo tempo real (plataforma/core/tempo_real.py,
// `diferenca`): o servidor manda o estado inteiro na primeira vez e depois só o que
// mudou para esta tela. Aqui a diferença é aplicada no estado que a página já tem.

import type { ICena, IEstadoMapa, IResumoCena, ITempoMapa, ITokenMapa } from '../../services/mapaApi';

export interface DeltaMapa {
  /** A cena a que a diferença se refere: se a tela mostra outra, ela não vale. */
  cena_id: string | null;
  gestor?: boolean;
  usuario_id?: string;
  ao_vivo?: boolean;
  bloqueado?: boolean;
  cenas?: IResumoCena[];
  moldura_mesa?: string | null;
  tempo?: ITempoMapa | null;
  cena?: ICena | null;
  /** Tokens novos ou mudados, inteiros. */
  mudar?: ITokenMapa[];
  /** Tokens que saíram desta tela (removidos, escondidos, na névoa). */
  tirar?: string[];
  /** A ordem dos tokens quando ela muda (quem fica por cima de quem). */
  ordem?: string[];
}

const CAMPOS = ['gestor', 'usuario_id', 'ao_vivo', 'bloqueado', 'cenas', 'moldura_mesa', 'tempo', 'cena'] as const;

/** O estado com a diferença aplicada; o mesmo objeto quando ela é de outra cena. */
export function aplicarDelta(atual: IEstadoMapa, delta: DeltaMapa): IEstadoMapa {
  if ((atual.cena?.id ?? null) !== delta.cena_id) return atual;
  const novo: IEstadoMapa = { ...atual };
  for (const campo of CAMPOS) {
    if (campo in delta) (novo as unknown as Record<string, unknown>)[campo] = delta[campo];
  }
  if (delta.mudar || delta.tirar || delta.ordem) {
    const porId = new Map(atual.tokens.map((token) => [token.id, token]));
    for (const id of delta.tirar ?? []) porId.delete(id);
    for (const token of delta.mudar ?? []) porId.set(token.id, token);
    const ordem = delta.ordem ?? [...porId.keys()];
    novo.tokens = ordem.map((id) => porId.get(id)).filter((token): token is ITokenMapa => Boolean(token));
  }
  return novo;
}
