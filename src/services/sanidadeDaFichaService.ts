import { resumirEquipamentos } from './equipamentoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from './ajustesFichaService';

/**
 * Sanidade máxima da ficha com a mesma conta da aba Ficha: a base gravada, o
 * ajuste de origem, os ajustes manuais e os itens (os implantes instalados
 * entram aqui, cobrando). Existe para o Descanso, as Condições, os Poderes e o
 * topo da ficha não usarem o número cru da base enquanto a aba Ficha mostra
 * outro.
 */
export function sanidadeMaximaDaFicha(character: any): number {
  const ficha = character?.ficha || {};
  const status = ficha.status || {};
  const base = Math.max(1, Number(status.sanidadeMaxima) || 100);
  const resumo = resumirEquipamentos(character?.inventarioCentral || [], ficha, character?.aliadosCompartilhados || []);
  return Math.max(
    1,
    base
      + ajusteOrigem(ficha, 'sanidadeMaxima')
      + totalAjustesManuais(ficha, chaveAjuste('recurso', 'sanidadeMaxima'))
      + (resumo.bonusRecursos.sanidadeMaxima || 0),
  );
}

/** Sanidade atual, nunca acima da máxima (um implante recém-instalado baixa o teto). */
export function sanidadeAtualDaFicha(character: any, maxima = sanidadeMaximaDaFicha(character)): number {
  const status = character?.ficha?.status || {};
  return Math.min(maxima, Number(status.sanidadeAtual ?? maxima));
}
