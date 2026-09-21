import type { IPropriedadeFicha } from '../../../services/propriedadeService';
import { calcularEspacosPropriedade } from '../../../services/propriedadeService';

export interface ResumoBens {
  propriedades: number;
  veiculos: number;
  manutencaoMensal: number;
  espacosUsados: number;
  espacosTotais: number;
}

/** Números do cabeçalho da aba Bens: quanto o personagem tem e quanto isso
 * custa por mês. Só soma o que já está na ficha, sem regra nova. */
export const resumirBens = (propriedades: IPropriedadeFicha[], veiculos: number): ResumoBens => {
  let manutencaoMensal = 0;
  let espacosUsados = 0;
  let espacosTotais = 0;
  for (const propriedade of propriedades) {
    manutencaoMensal += Math.max(0, Number(propriedade.manutencao) || 0);
    const espacos = calcularEspacosPropriedade(propriedade);
    espacosUsados += espacos.espacosUsados;
    espacosTotais += espacos.espacosTotais;
  }
  return {
    propriedades: propriedades.length,
    veiculos: Math.max(0, Math.trunc(veiculos) || 0),
    manutencaoMensal,
    espacosUsados,
    espacosTotais,
  };
};

export const textoResumoBens = (resumo: ResumoBens): string => {
  const partes = [
    `${resumo.propriedades} ${resumo.propriedades === 1 ? 'propriedade' : 'propriedades'}`,
    `${resumo.veiculos} ${resumo.veiculos === 1 ? 'veículo' : 'veículos'}`,
  ];
  if (resumo.manutencaoMensal > 0) partes.push(`manutenção ${resumo.manutencaoMensal.toLocaleString('pt-BR')} L$/mês`);
  return partes.join(' · ');
};
