import {
  INSTALACOES_BASE,
  PATAMARES_BASE,
  REFERENCIA_CUSTOS_BASES,
  type IInstalacaoBase,
  type INivelInstalacaoBase,
  type IPatamarBase,
} from '../../../../data/regras/bases';

export interface InstalacaoPlanta {
  id: string;
  nome: string;
  nivel: number;
  espacos: number;
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

/** O patamar chega como id ("sede") na ficha e como texto livre ("Sede") nas
 * bases da campanha; aceita os dois. */
export const acharPatamar = (valor: string | null | undefined): IPatamarBase | undefined => {
  const chave = normalizar(String(valor ?? ''));
  if (!chave) return undefined;
  return PATAMARES_BASE.find((p) => p.id === chave || normalizar(p.titulo) === chave);
};

/** Instalação criada pelo catálogo guarda o título como nome. As personalizadas
 * não casam, e por isso não têm efeito nem melhoria calculados. */
export const acharCatalogo = (nome: string): IInstalacaoBase | undefined => {
  const chave = normalizar(nome);
  return chave ? INSTALACOES_BASE.find((i) => normalizar(i.titulo) === chave) : undefined;
};

export const nivelDoCatalogo = (catalogo: IInstalacaoBase | undefined, nivel: number): INivelInstalacaoBase | undefined =>
  catalogo?.niveis.find((n) => n.nivel === nivel);

export interface CustoBase {
  aquisicao: number;
  manutencao: number;
}

const custoDeFatores = (fatorAquisicao: number, fatorManutencao: number): CustoBase => ({
  aquisicao: fatorAquisicao * REFERENCIA_CUSTOS_BASES.unidadeAquisicaoLunaris,
  manutencao: fatorManutencao * REFERENCIA_CUSTOS_BASES.unidadeManutencaoLunaris,
});

export const custoDoNivel = (nivel: INivelInstalacaoBase): CustoBase =>
  custoDeFatores(nivel.fatorAquisicao, nivel.fatorManutencao);

export type MotivoBloqueio = 'patamar' | 'espacos';

export interface MelhoriaInstalacao {
  instalacao: InstalacaoPlanta;
  proximo: INivelInstalacaoBase;
  /** Só a diferença: a regra manda pagar a diferença de fatores e trocar o nível. */
  custo: CustoBase;
  espacosExtras: number;
  bloqueio: MotivoBloqueio | null;
  /** Menor patamar em que essa melhoria passa a caber, quando o bloqueio é o patamar. */
  patamarNecessario?: IPatamarBase;
}

export const espacosUsados = (instalacoes: InstalacaoPlanta[]) =>
  instalacoes.reduce((total, i) => total + Math.max(0, i.espacos), 0);

export const melhoriaDaInstalacao = (
  instalacao: InstalacaoPlanta,
  patamar: IPatamarBase | undefined,
  espacosLivres: number,
): MelhoriaInstalacao | null => {
  const catalogo = acharCatalogo(instalacao.nome);
  const atual = nivelDoCatalogo(catalogo, instalacao.nivel);
  const proximo = nivelDoCatalogo(catalogo, instalacao.nivel + 1);
  if (!atual || !proximo) return null;
  const espacosExtras = Math.max(0, proximo.espacos - instalacao.espacos);
  let bloqueio: MotivoBloqueio | null = null;
  let patamarNecessario: IPatamarBase | undefined;
  if (patamar && proximo.nivel > patamar.nivelInstalacaoMaximo) {
    bloqueio = 'patamar';
    patamarNecessario = PATAMARES_BASE.find((p) => p.nivelInstalacaoMaximo >= proximo.nivel);
  } else if (patamar && espacosExtras > espacosLivres) {
    bloqueio = 'espacos';
  }
  return {
    instalacao,
    proximo,
    custo: custoDeFatores(
      Math.max(0, proximo.fatorAquisicao - atual.fatorAquisicao),
      Math.max(0, proximo.fatorManutencao - atual.fatorManutencao),
    ),
    espacosExtras,
    bloqueio,
    patamarNecessario,
  };
};

export interface ConstrucaoPossivel {
  catalogo: IInstalacaoBase;
  nivel: INivelInstalacaoBase;
  custo: CustoBase;
}

/** O que ainda dá para instalar: uma opção por instalação do catálogo, no maior
 * nível que cabe no patamar e nos espaços livres. Some quem já foi construída. */
export const construcoesPossiveis = (
  instalacoes: InstalacaoPlanta[],
  patamar: IPatamarBase | undefined,
  espacosLivres: number,
): ConstrucaoPossivel[] => {
  if (!patamar) return [];
  const jaTem = new Set(instalacoes.map((i) => acharCatalogo(i.nome)?.id).filter(Boolean));
  const lista: ConstrucaoPossivel[] = [];
  for (const catalogo of INSTALACOES_BASE) {
    if (jaTem.has(catalogo.id)) continue;
    const cabem = catalogo.niveis.filter((n) => n.nivel <= patamar.nivelInstalacaoMaximo && n.espacos <= espacosLivres);
    const nivel = cabem[cabem.length - 1];
    if (nivel) lista.push({ catalogo, nivel, custo: custoDoNivel(nivel) });
  }
  return lista;
};

export interface SubidaDePatamar {
  proximo: IPatamarBase;
  espacosExtras: number;
  custo: CustoBase;
}

export const proximoPatamar = (patamar: IPatamarBase | undefined): SubidaDePatamar | null => {
  if (!patamar) return null;
  const proximo = PATAMARES_BASE.find((p) => p.ordem === patamar.ordem + 1);
  if (!proximo) return null;
  return {
    proximo,
    espacosExtras: proximo.espacos - patamar.espacos,
    custo: custoDeFatores(proximo.fatorAquisicao - patamar.fatorAquisicao, proximo.fatorManutencao - patamar.fatorManutencao),
  };
};

export interface CustoSugerido extends CustoBase {
  /** Instalações que não casam com o catálogo e por isso ficaram fora da conta. */
  ignoradas: number;
}

/** Custo pela regra da base: fator do patamar mais o fator de cada instalação,
 * vezes a unidade. Terreno sem nenhuma estrutura paga metade da manutenção. */
export const custoSugerido = (
  patamarTexto: string | null | undefined,
  tipo: string,
  instalacoes: InstalacaoPlanta[],
): CustoSugerido | null => {
  const patamar = acharPatamar(patamarTexto);
  if (!patamar) return null;
  let fatorAquisicao = patamar.fatorAquisicao;
  let fatorManutencao = patamar.fatorManutencao;
  let ignoradas = 0;
  for (const inst of instalacoes) {
    const nivel = nivelDoCatalogo(acharCatalogo(inst.nome), inst.nivel);
    if (!nivel) { ignoradas += 1; continue; }
    fatorAquisicao += nivel.fatorAquisicao;
    fatorManutencao += nivel.fatorManutencao;
  }
  if (tipo === 'terreno' && instalacoes.length === 0) fatorManutencao /= 2;
  return { ...custoDeFatores(fatorAquisicao, fatorManutencao), ignoradas };
};
