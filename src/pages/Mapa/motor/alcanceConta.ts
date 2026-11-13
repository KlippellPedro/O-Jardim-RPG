// O alcance de movimento do token da vez: quanto ainda dá para andar e o contorno disso no mapa.
// É uma ajuda de mesa: nada aqui barra o movimento, só mostra e avisa.

import { casasDoTrecho, type IGrade, type IPonto } from './geometria';

/** Seis casas por turno: 9 m na grade padrão do Jardim (1,5 m por casa). Vale para quem não tem ficha. */
export const CASAS_DE_MOVIMENTO_PADRAO = 6;
/** A ficha fala em metros, e nas regras do Jardim uma casa são 1,5 m. */
export const METROS_POR_CASA_DA_FICHA = 1.5;
export const MOVIMENTO_MAXIMO = 300;
/** Quanto cada aparelho guarda de alcances ajustados (um por personagem ou token). */
const LIMITE_GUARDADO = 80;
const CHAVE_MOVIMENTOS_LOCAL = 'jardim.mapa.movimentos';

/** Um alcance acertado à mão neste aparelho: o valor e de que número ele partiu (o da ficha, ou o padrão). */
export interface AjusteDeMovimento {
  m: number;
  de: number;
}

/** O alcance de quem não tem ficha (monstro, NPC), na unidade da cena. */
export function movimentoPadrao(grade: Pick<IGrade, 'metros'>): number {
  return Math.round(CASAS_DE_MOVIMENTO_PADRAO * (grade.metros > 0 ? grade.metros : METROS_POR_CASA_DA_FICHA) * 10) / 10;
}

/** O Movimento que o servidor leu da ficha (em metros), na unidade da cena. Sem ficha, nulo. */
export function movimentoDaFicha(metros: number | null | undefined, grade: Pick<IGrade, 'metros'>): number | null {
  if (typeof metros !== 'number' || !Number.isFinite(metros) || metros < 0) return null;
  const porCasa = grade.metros > 0 ? grade.metros : METROS_POR_CASA_DA_FICHA;
  return Math.round((metros / METROS_POR_CASA_DA_FICHA) * porCasa * 10) / 10;
}

/**
 * O alcance que vale para o token: o da ficha (ou o padrão) e, por cima, o ajuste feito neste aparelho. O ajuste
 * só vale enquanto o número de onde ele partiu for o mesmo: se a ficha mudou (ficou Lento, subiu de nível), o
 * número novo da ficha volta a mandar.
 */
export function alcanceDoToken(ajuste: AjusteDeMovimento | undefined, daFicha: number | null, padrao: number): { alcance: number; base: number; ajustado: boolean } {
  const base = daFicha ?? padrao;
  const vale = Boolean(ajuste) && ajuste!.de === base && ajuste!.m !== base;
  return { alcance: vale ? ajuste!.m : base, base, ajustado: vale };
}

/** Um alcance digitado vira um número entre 0 e o teto, com uma casa decimal; lixo vira nulo. */
export function normalizarMovimento(valor: unknown): number | null {
  const numero = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(numero) || (typeof valor === 'string' && !valor.trim())) return null;
  return Math.round(Math.max(0, Math.min(MOVIMENTO_MAXIMO, numero)) * 10) / 10;
}

/** O ajuste fica guardado pelo personagem (vale em qualquer cena); token sem personagem usa o próprio id. */
export function chaveDoMovimento(token: { id: string; personagem_id?: string | null }): string {
  return token.personagem_id ? `p:${token.personagem_id}` : `t:${token.id}`;
}

export function metrosRestantes(alcance: number, andados: number): number {
  return Math.round(Math.max(0, alcance - andados) * 10) / 10;
}

/** Passou do alcance (com uma folga pequena para arredondamento de arrasto fora da grade). */
export function passouDoAlcance(alcance: number, andados: number): boolean {
  return andados > alcance + 0.05;
}

/**
 * O contorno até onde `metros` alcançam a partir de `centro`, pelo jeito de medir da cena: círculo na medida
 * reta, quadrado quando a diagonal custa igual, losango, octógono ou hexágono nas outras. Para cada direção
 * procura o ponto mais longe que ainda cabe na medida; assim o contorno bate com a régua em qualquer grade.
 */
export function contornoDoAlcance(centro: IPonto, metros: number, grade: IGrade, direcoes = 72): IPonto[] {
  if (!(metros > 0) || !(grade.metros > 0) || !(grade.tamanho > 0)) return [];
  const casas = metros / grade.metros;
  // Em qualquer medida, uma casa de custo nunca passa de duas casas de distância reta.
  const teto = (casas + 1) * grade.tamanho * 2;
  const pontos: IPonto[] = [];
  for (let i = 0; i < direcoes; i++) {
    const angulo = (i / direcoes) * Math.PI * 2;
    const cos = Math.cos(angulo);
    const sen = Math.sin(angulo);
    let perto = 0;
    let longe = teto;
    for (let passo = 0; passo < 22; passo++) {
      const meio = (perto + longe) / 2;
      const custo = casasDoTrecho(centro, { x: centro.x + cos * meio, y: centro.y + sen * meio }, grade);
      if (custo <= casas + 1e-6) perto = meio;
      else longe = meio;
    }
    pontos.push({ x: Math.round((centro.x + cos * perto) * 10) / 10, y: Math.round((centro.y + sen * perto) * 10) / 10 });
  }
  return pontos;
}

export function lerMovimentos(): Record<string, AjusteDeMovimento> {
  try {
    const salvo = JSON.parse(window.localStorage.getItem(CHAVE_MOVIMENTOS_LOCAL) ?? 'null');
    if (!salvo || typeof salvo !== 'object') return {};
    const limpo: Record<string, AjusteDeMovimento> = {};
    for (const [chave, valor] of Object.entries(salvo)) {
      const ajuste = valor as Partial<AjusteDeMovimento> | null;
      const m = normalizarMovimento(ajuste?.m);
      const de = normalizarMovimento(ajuste?.de);
      if (m !== null && de !== null && /^[pt]:/.test(chave)) limpo[chave] = { m, de };
    }
    return limpo;
  } catch {
    return {};
  }
}

/** O mapa de ajustes com este a mais (ou a menos, com nulo); passando do limite, os mais antigos saem. */
export function comMovimento(atuais: Record<string, AjusteDeMovimento>, chave: string, ajuste: AjusteDeMovimento | null): Record<string, AjusteDeMovimento> {
  const semEle = Object.entries(atuais).filter(([outra]) => outra !== chave);
  if (!ajuste) return Object.fromEntries(semEle);
  return Object.fromEntries([...semEle.slice(-(LIMITE_GUARDADO - 1)), [chave, ajuste]]);
}

export function salvarMovimentos(movimentos: Record<string, AjusteDeMovimento>): void {
  try {
    window.localStorage.setItem(CHAVE_MOVIMENTOS_LOCAL, JSON.stringify(movimentos));
  } catch {
    // Sem armazenamento do navegador, o ajuste vale só até fechar a aba.
  }
}
