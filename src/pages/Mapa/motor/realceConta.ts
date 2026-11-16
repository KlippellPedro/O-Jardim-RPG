// O "Realce" do mapa: um filtro de nitidez (máscara de nitidez), contraste e cor aplicado só às imagens do mapa
// (o fundo e os mapas colocados), para uma imagem boa ficar mais focada e viva na tela. É preferência de quem
// olha, guardada no aparelho; não muda nada na cena. Sem Pixi, para testar.

export type NivelDeRealce = 'desligado' | 'suave' | 'forte';

export interface ParametrosDoRealce {
  /** Quanto da diferença entre o pixel e a vizinhança volta para a imagem (0 não muda nada). */
  forca: number;
  /** 1 mantém; acima de 1 afasta os tons do meio (0,5). */
  contraste: number;
  /** 1 mantém a cor; acima de 1 satura. */
  saturacao: number;
}

export const NIVEIS_DE_REALCE: Array<{ id: NivelDeRealce; rotulo: string; dica: string }> = [
  { id: 'desligado', rotulo: 'Desligado', dica: 'A imagem como foi enviada.' },
  { id: 'suave', rotulo: 'Suave', dica: 'Mais foco nas bordas e um toque de contraste e cor, sem se notar.' },
  { id: 'forte', rotulo: 'Forte', dica: 'Foco e cor bem marcados. Ajuda imagem amolecida ou ampliada; pode endurecer texturas finas.' },
];

const PARAMETROS: Record<Exclude<NivelDeRealce, 'desligado'>, ParametrosDoRealce> = {
  suave: { forca: 0.45, contraste: 1.04, saturacao: 1.05 },
  forte: { forca: 0.95, contraste: 1.09, saturacao: 1.12 },
};

/** Os números do filtro para o nível; o desligado dá nulo (nenhum filtro). */
export function parametrosDoRealce(nivel: NivelDeRealce): ParametrosDoRealce | null {
  return nivel === 'desligado' ? null : PARAMETROS[nivel];
}

/** Valor guardado no navegador (ou lixo) vira um nível; sem nada guardado, o suave. */
export function lerNivelDeRealce(bruto: string | null | undefined): NivelDeRealce {
  return bruto === 'desligado' || bruto === 'suave' || bruto === 'forte' ? bruto : 'suave';
}

/**
 * O passo da vizinhança, em pixels do filtro: em tela de alta densidade (retina) o pixel é menor, e o mesmo passo de
 * 1 pixel mexeria numa faixa fina demais para se ver. Fica entre 1 e 2.
 */
export function passoDaVizinhanca(densidade: number): number {
  if (!Number.isFinite(densidade) || densidade <= 1) return 1;
  return Math.min(2, 1 + (densidade - 1) * 0.6);
}
