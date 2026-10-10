/** O 20 e o 1 natural de quem está na mesa, anunciados para todos durante a sessão ao vivo.
 *
 * O servidor manda só o necessário (`destaque_mesa`: quem rolou, o título da rolagem e se foi 20 ou 1); o resultado, a DT e o bônus
 * continuam no registro, que cada pessoa lê pelo recorte do papel dela. */

export type TipoDeDestaque = 'critico' | 'falha';

export interface DestaqueDaMesa {
  /** Muda a cada destaque, para a faixa recomeçar. */
  chave: string;
  tipo: TipoDeDestaque;
  autor: string;
  titulo: string;
  /** Foi a própria pessoa que rolou: ela já viu o dado, então sem som nem vibração de novo. */
  proprio: boolean;
}

export const TEXTO_DO_DESTAQUE: Record<TipoDeDestaque, { titulo: string; rotulo: string }> = {
  critico: { titulo: '20 natural', rotulo: 'Crítico' },
  falha: { titulo: '1 natural', rotulo: 'Falha crítica' },
};

const limitar = (valor: unknown, maximo: number): string => (typeof valor === 'string' ? valor.trim().slice(0, maximo) : '');

let contador = 0;

/** Lê o corpo do evento sem confiar nele: sem tipo conhecido ou sem autor, não há destaque. */
export function lerDestaque(carga: Record<string, unknown>, meuUsuarioId: string | null | undefined): DestaqueDaMesa | null {
  const tipo = carga.destaque === 'critico' || carga.destaque === 'falha' ? carga.destaque : null;
  const autor = limitar(carga.autor, 60);
  if (!tipo || !autor) return null;
  contador += 1;
  return {
    chave: `${Date.now()}-${contador}`,
    tipo,
    autor,
    titulo: limitar(carga.titulo, 80),
    proprio: Boolean(meuUsuarioId) && carga.usuario_id === meuUsuarioId,
  };
}

/** A faixa mostra o destaque mais recente: um novo substitui o que ainda estava na tela. */
export const empilharDestaque = (_atuais: readonly DestaqueDaMesa[], novo: DestaqueDaMesa): DestaqueDaMesa[] => [novo];
