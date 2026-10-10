/** A última ficha aberta em cada campanha, para o "Continuar" da Home.
 *
 * Só o id e o nome ficam no navegador de quem abriu (nada da ficha em si). Quem abriu a ficha pode
 * perder acesso depois (personagem arquivado, saída da campanha): a ficha confere o acesso ao abrir
 * e o "Continuar" só leva até ela. */

export interface UltimaFicha {
  id: string;
  nome: string;
}

const prefixo = 'jardim:ultima-ficha:v1:';

export const chaveDaUltimaFicha = (usuarioId: string, campanhaId: string): string => `${prefixo}${usuarioId}:${campanhaId}`;

export function lerUltimaFicha(bruto: string | null): UltimaFicha | null {
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as { id?: unknown; nome?: unknown };
    if (typeof dados.id !== 'string' || !dados.id.trim()) return null;
    if (typeof dados.nome !== 'string' || !dados.nome.trim()) return null;
    return { id: dados.id, nome: dados.nome.trim().slice(0, 80) };
  } catch {
    return null;
  }
}

export function lembrarUltimaFicha(usuarioId: string, campanhaId: string, ficha: UltimaFicha): void {
  try {
    localStorage.setItem(chaveDaUltimaFicha(usuarioId, campanhaId), JSON.stringify({ id: ficha.id, nome: ficha.nome }));
  } catch {
    // Sem armazenamento local o "Continuar" some; o resto do site segue igual.
  }
}

export function recordarUltimaFicha(usuarioId: string, campanhaId: string): UltimaFicha | null {
  try {
    return lerUltimaFicha(localStorage.getItem(chaveDaUltimaFicha(usuarioId, campanhaId)));
  } catch {
    return null;
  }
}

export function esquecerUltimaFicha(usuarioId: string, campanhaId: string): void {
  try {
    localStorage.removeItem(chaveDaUltimaFicha(usuarioId, campanhaId));
  } catch {
    // Nada a fazer.
  }
}
