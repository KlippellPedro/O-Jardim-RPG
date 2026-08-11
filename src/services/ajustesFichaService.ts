import { obterOrigemExemplo } from '../../data/ficha/origensData';

export interface IAjusteFicha {
  id: string;
  nome: string;
  valor: number;
}

export type AjustesFicha = Record<string, IAjusteFicha[]>;

export function chaveAjuste(grupo: 'atributo' | 'pericia' | 'recurso' | 'combate', alvo: string): string {
  return `${grupo}.${alvo}`;
}

export function obterAjustesManuais(ficha: any, chave: string): IAjusteFicha[] {
  const itens = ficha?.ajustesFicha?.[chave];
  if (!Array.isArray(itens)) return [];
  return itens.flatMap((item: any) => {
    const valor = Number(item?.valor);
    const nome = String(item?.nome || '').trim();
    if (!nome || !Number.isFinite(valor) || valor === 0) return [];
    return [{ id: String(item.id || `${chave}-${nome}`), nome, valor }];
  });
}

export function totalAjustesManuais(ficha: any, chave: string): number {
  return obterAjustesManuais(ficha, chave).reduce((total, item) => total + item.valor, 0);
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Uma origem cuja `chave` aponta pra uma perícia sem id fixo no catálogo (ex.:
 * "oficio", que hoje só existe como perícia personalizada com id gerado por
 * timestamp) casa pelo título normalizado da perícia em vez do id. */
function origemCasaComPericia(chave: string, periciaId?: string, tituloPericia?: string): boolean {
  if (periciaId && chave === periciaId) return true;
  if (tituloPericia && normalizarTexto(tituloPericia) === normalizarTexto(chave)) return true;
  return false;
}

export function ajusteOrigem(ficha: any, alvo: string, chave?: string, tituloAlvo?: string): number {
  const origem = obterOrigemExemplo(ficha?.origemId);
  if (!origem || origem.ajuste.alvo !== alvo) return 0;
  if (!chave) return origem.ajuste.valor;
  const chaveOrigem = origem.ajuste.chave;
  if (!chaveOrigem) return 0;
  if (alvo === 'pericia' ? !origemCasaComPericia(chaveOrigem, chave, tituloAlvo) : chaveOrigem !== chave) return 0;
  return origem.ajuste.valor;
}

export function nomeAjusteOrigem(ficha: any, alvo: string, chave?: string, tituloAlvo?: string): string | null {
  const origem = obterOrigemExemplo(ficha?.origemId);
  if (!origem || origem.ajuste.alvo !== alvo) return null;
  if (!chave) return `Origem: ${origem.titulo}`;
  const chaveOrigem = origem.ajuste.chave;
  if (!chaveOrigem) return null;
  if (alvo === 'pericia' ? !origemCasaComPericia(chaveOrigem, chave, tituloAlvo) : chaveOrigem !== chave) return null;
  return `Origem: ${origem.titulo}`;
}
