import type { ICatalogo } from '../types/catalogo';
import { ATRIBUTOS, aplicarAjustesAtributosRaciais, calcularDerivadosComClasses } from './calculoService';
import { resumirEquipamentos } from './equipamentoService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from './ajustesFichaService';

/**
 * Vida máxima e Constituição efetiva da ficha, com a mesma conta da aba Ficha (derivados da raça e das classes,
 * ajustes de origem, ajustes manuais e itens). Existe para quem precisa mexer na Vida fora daquela aba, como o
 * dano do turno de uma condição.
 */
export function calcularVidaDaFicha(character: any, catalogo: ICatalogo | null): { maxVida: number; constituicao: number } {
  const f = character?.ficha || {};
  const racaAtual = catalogo?.racas.find((raca) => raca.id === f.racaId) || null;
  const classes = f.classes?.length
    ? f.classes
    : (f.classeId ? [{ classeId: f.classeId, nivel: character?.nivel || 1 }] : []);
  const nivelTotalClasses = classes.reduce((soma: number, classe: any) => soma + (Number(classe.nivel) || 1), 0) || 1;
  const resumoEquipamento = resumirEquipamentos(character?.inventarioCentral || [], f, character?.aliadosCompartilhados || []);
  const naturais = (f.atributosFinais || character?.atributosFinais || {}) as Record<string, number>;
  const antesRacaSemEquipamento = Object.fromEntries(ATRIBUTOS.map((atributo) => [
    atributo,
    Number(naturais[atributo] ?? 10)
      + ajusteOrigem(f, 'atributo', atributo)
      + totalAjustesManuais(f, chaveAjuste('atributo', atributo)),
  ])) as Record<string, number>;
  const antesRaca = Object.fromEntries(ATRIBUTOS.map((atributo) => [
    atributo,
    antesRacaSemEquipamento[atributo] + (resumoEquipamento.bonusAtributos[atributo] || 0),
  ])) as Record<string, number>;
  const atributos = racaAtual ? aplicarAjustesAtributosRaciais(antesRaca, racaAtual, f.escolhaRacial) : antesRaca;

  const semEquipamento = catalogo
    ? calcularDerivadosComClasses(antesRacaSemEquipamento, racaAtual, classes, catalogo.classes, nivelTotalClasses, f.escolhaRacial)
    : null;
  const comEquipamento = catalogo
    ? calcularDerivadosComClasses(antesRaca, racaAtual, classes, catalogo.classes, nivelTotalClasses, f.escolhaRacial)
    : null;
  const deltaVida = Number(comEquipamento?.vida || 0) - Number(semEquipamento?.vida || 0);
  const maxVidaBase = Number(f.derivados?.vida ?? character?.derivados?.vida) || 10;
  const maxVida = Math.max(
    1,
    maxVidaBase
      + deltaVida
      + ajusteOrigem(f, 'vidaMaxima')
      + totalAjustesManuais(f, chaveAjuste('recurso', 'vidaMaxima'))
      + (resumoEquipamento.bonusRecursos.vidaMaxima || 0),
  );
  return { maxVida, constituicao: Number(atributos.constituicao) || 10 };
}
