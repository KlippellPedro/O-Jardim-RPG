import type { IRaca } from '../types/catalogo';
import { aplicarAjustesAtributosRaciais, obterAjustesPericiasRaciais } from './calculoService';
import { BONUS_GRAU, vantagensDoGrau } from './progressaoNiveis';
import { resumirEquipamentos } from './equipamentoService';
import { desvantagensAutomaticasTeste, efeitosCondicoesNoTeste, obterStatusFicha, penalidadeCansacoTeste } from './statusService';
import { ajusteOrigem, chaveAjuste, totalAjustesManuais } from './ajustesFichaService';
import { ATRIBUTOS_PERICIA, grausComConcedidos, obterAtributoPericia } from './periciasFichaService';

export interface ITestePericia {
  bonus: number;
  vantagens: number;
  desvantagens: number;
}

/**
 * Bônus, vantagens e desvantagens de um teste de perícia, com a mesma conta
 * da aba Perícias (atributo com raça e equipamento, metade do nível, grau,
 * ajustes, armadura e Cansaço). Usado por quem precisa rolar uma perícia fora
 * daquela aba, como o teste de Fortitude das aflições.
 */
export function calcularTestePericia(
  character: any,
  periciaId: string,
  atributoPadrao: string,
  raca: IRaca | null,
  tituloPericia?: string,
): ITestePericia {
  const f = character?.ficha || {};
  const pericias = grausComConcedidos(f);
  const status = obterStatusFicha(f);
  const attrsBase = f.atributosFinais || character?.atributosFinais || {};
  const resumoEquipamento = resumirEquipamentos(character?.inventarioCentral || [], f, character?.aliadosCompartilhados || []);
  const attrsAntesRaca = Object.fromEntries(Object.keys(ATRIBUTOS_PERICIA).map((atributo) => [
    atributo,
    Number(attrsBase[atributo] ?? 10)
      + ajusteOrigem(f, 'atributo', atributo)
      + totalAjustesManuais(f, chaveAjuste('atributo', atributo))
      + (resumoEquipamento.bonusAtributos[atributo] || 0),
  ]));
  const attrs = raca ? aplicarAjustesAtributosRaciais(attrsAntesRaca, raca, f.escolhaRacial) : attrsAntesRaca;
  const atributo = obterAtributoPericia(f, periciaId, atributoPadrao);
  const fisico = ['forca', 'destreza', 'constituicao'].includes(atributo);
  const grau = pericias[periciaId] || 'iniciante';
  const modificador = Math.floor(((Number(attrs[atributo]) || 10) - 10) / 2);
  const metadeNivel = Math.floor(Math.max(1, Number(character?.nivel) || 1) / 2);
  const racial = obterAjustesPericiasRaciais(raca, f.escolhaRacial)[periciaId] || 0;
  const extra = ajusteOrigem(f, 'pericia', periciaId, tituloPericia)
    + totalAjustesManuais(f, chaveAjuste('pericia', periciaId))
    + (resumoEquipamento.bonusPericias[periciaId] || 0);
  const armadura = ['acrobacia', 'atletismo', 'furtividade'].includes(periciaId) ? resumoEquipamento.penalidadeArmadura : 0;
  const cansaco = penalidadeCansacoTeste(status.cansacoAtual, fisico);
  const manual = (f.rolagensPericias || {})[periciaId] || { vantagens: 0, desvantagens: 0 };
  const condicoes = efeitosCondicoesNoTeste(f.condicoesAtivas, { periciaId, atributoId: atributo });

  return {
    bonus: modificador + metadeNivel + (BONUS_GRAU[grau] || 0) + racial + extra - armadura + cansaco + condicoes.bonus,
    vantagens: (Number(manual.vantagens) || 0)
      + (resumoEquipamento.vantagens[periciaId] || 0)
      + (resumoEquipamento.vantagens['testes'] || 0)
      + vantagensDoGrau(grau),
    desvantagens: (Number(manual.desvantagens) || 0)
      + desvantagensAutomaticasTeste(status.cansacoAtual, fisico, resumoEquipamento.sobrecarregado)
      + (resumoEquipamento.desvantagens[periciaId] || 0)
      + (resumoEquipamento.desvantagens['testes'] || 0)
      + condicoes.desvantagens,
  };
}
