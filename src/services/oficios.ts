import oficiosData from '../../data/economia/oficios-v1.json';
import periciasData from '../../data/ficha/pericias.json';
import type { LojaCatalogEntry } from './lojaApi';
import { GRAUS_PERICIA, ROTULO_GRAU } from './progressaoNiveis';
import { gerarIdVinculo, RAMOS_CONTATO, type IVinculo } from '../pages/Ficha/utils/vinculos';

/**
 * Ofícios da criação de personagem, lidos de data/economia/oficios-v1.json, o
 * mesmo arquivo que a plataforma lê em plataforma/core/oficios.py. O ofício
 * encaixa o personagem numa faixa, e a faixa decide os Lunaris iniciais,
 * quantos itens ele escolhe (e de que raridade), a renda do tempo entre
 * aventuras e os contatos com que ele começa. O servidor confere tudo de
 * novo: aqui é só para mostrar e montar o pedido.
 */

export type RaridadeDoKit = 'comum' | 'incomum';

export interface IContatoDaFaixa {
  confianca: 1 | 2;
  origem?: 'oficio';
  quem?: string;
  ramo?: string;
}

export interface IFaixaOficio {
  id: string;
  titulo: string;
  classe_social: string;
  resumo: string;
  por_dia: number;
  por_mes: number | null;
  /** O que chega à carteira por dia de trabalho, depois do custo de vida. É o que o botão Receber soma. */
  sobra_por_dia: number;
  /** Grau que a renda cheia pede numa das perícias do ofício. Sem ele, vale a faixa de baixo. */
  grau_minimo: string | null;
  renda_rotulo: string;
  lunaris_iniciais: number;
  itens: { comum: number; incomum: number };
  contatos: IContatoDaFaixa[];
  obrigacao: string | null;
}

export type ItemSugerido = string | { titulo: string };

export interface IOficio {
  id: string;
  titulo: string;
  faixa: string;
  descricao: string;
  pericias: string[];
  itens: ItemSugerido[];
  contato: { quem: string; ramo: string };
}

/** O que fica gravado na ficha. Ofício personalizado leva título e faixa escolhidos pela pessoa. */
export interface IOficioDaFicha {
  id: string;
  titulo: string;
  faixa: string;
}

/** Um item do kit: da Loja (com `itemId`) ou escrito à mão (só `titulo`, sempre comum). */
export interface IEscolhaDoKit {
  itemId?: string;
  titulo: string;
  raridade: RaridadeDoKit;
}

export const OFICIO_PERSONALIZADO = 'personalizado';
export const FAIXA_PADRAO = 'aprendiz';
export const FAIXAS: readonly IFaixaOficio[] = oficiosData.faixas as IFaixaOficio[];
export const OFICIOS: readonly IOficio[] = oficiosData.oficios as IOficio[];
const TIPOS_DO_KIT = new Set<string>(oficiosData.itens.tipos);
const NIVEL_LOJA_MAXIMO = oficiosData.itens.nivel_loja_maximo;
const NIVEL_DO_PERSONAGEM = oficiosData.itens.nivel_do_personagem;
export const TITULO_OFICIO_MAXIMO = oficiosData.itens.titulo_maximo;

const faixaPorId = new Map(FAIXAS.map((faixa) => [faixa.id, faixa]));
const oficioPorId = new Map(OFICIOS.map((oficio) => [oficio.id, oficio]));

export const obterFaixa = (id: string | null | undefined): IFaixaOficio =>
  faixaPorId.get(String(id || '')) || faixaPorId.get(FAIXA_PADRAO)!;

export const obterOficio = (id: string | null | undefined): IOficio | undefined =>
  oficioPorId.get(String(id || ''));

export const oficiosDaFaixa = (faixaId: string): IOficio[] =>
  OFICIOS.filter((oficio) => oficio.faixa === faixaId);

/** Faixa de quem já tem ofício na ficha. Sem ofício vale a faixa padrão, que é a regra antiga. */
export function faixaDoOficio(oficio: Partial<IOficioDaFicha> | null | undefined): IFaixaOficio {
  if (!oficio || typeof oficio !== 'object') return obterFaixa(FAIXA_PADRAO);
  const doCatalogo = obterOficio(oficio.id);
  if (doCatalogo) return obterFaixa(doCatalogo.faixa);
  if (oficio.id === OFICIO_PERSONALIZADO) return obterFaixa(oficio.faixa);
  return obterFaixa(FAIXA_PADRAO);
}

export function oficioDaFicha(bruto: unknown): IOficioDaFicha | null {
  if (!bruto || typeof bruto !== 'object') return null;
  const registro = bruto as Record<string, unknown>;
  const id = typeof registro.id === 'string' ? registro.id : '';
  const doCatalogo = obterOficio(id);
  if (doCatalogo) return { id, titulo: doCatalogo.titulo, faixa: doCatalogo.faixa };
  if (id !== OFICIO_PERSONALIZADO) return null;
  const titulo = typeof registro.titulo === 'string' ? registro.titulo.trim().slice(0, TITULO_OFICIO_MAXIMO) : '';
  const faixa = typeof registro.faixa === 'string' && faixaPorId.has(registro.faixa) ? registro.faixa : '';
  return titulo && faixa ? { id, titulo, faixa } : null;
}

export const totalDeItens = (faixa: IFaixaOficio) => faixa.itens.comum + faixa.itens.incomum;

/** Raridade do item da Loja se ele pode entrar no kit inicial (tipo, raridade nativa,
 * patamar da Feira e requisito de nível que um personagem novo cumpre). */
export function raridadeNoKit(entrada: Pick<LojaCatalogEntry, 'tipo' | 'conteudo'>): RaridadeDoKit | null {
  if (!TIPOS_DO_KIT.has(entrada.tipo)) return null;
  const conteudo = entrada.conteudo || {};
  // Arma e armadura vêm da API com a raridade de encomenda; a nativa fica guardada à parte.
  const bruta = conteudo.raridade_catalogo_original ?? conteudo.raridade;
  const raridade = String(bruta || '').trim().toLowerCase();
  if (raridade !== 'comum' && raridade !== 'incomum') return null;
  const nivel = Number(conteudo.nivelMinimoLoja ?? 1);
  if (!Number.isFinite(nivel) || nivel > NIVEL_LOJA_MAXIMO) return null;
  // A Loja não vende a Armadura de Aço (nível 5) a quem está no 1, e o kit sai da Loja.
  const requisito = Number(conteudo.requisitoNivel ?? 0);
  if (Number.isFinite(requisito) && requisito > NIVEL_DO_PERSONAGEM) return null;
  return raridade;
}

/** Vagas que ainda sobram. A vaga de incomum aceita um comum; o contrário não. */
export function vagasLivres(faixa: IFaixaOficio, escolhas: readonly IEscolhaDoKit[]) {
  const incomuns = escolhas.filter((escolha) => escolha.raridade === 'incomum').length;
  const total = totalDeItens(faixa);
  const livres = Math.max(0, total - escolhas.length);
  return {
    total: livres,
    incomum: Math.min(livres, Math.max(0, faixa.itens.incomum - incomuns)),
  };
}

export function podeAcrescentar(faixa: IFaixaOficio, escolhas: readonly IEscolhaDoKit[], raridade: RaridadeDoKit): boolean {
  const vagas = vagasLivres(faixa, escolhas);
  return raridade === 'incomum' ? vagas.incomum > 0 : vagas.total > 0;
}

export function kitValido(faixa: IFaixaOficio, escolhas: readonly IEscolhaDoKit[]): boolean {
  if (escolhas.length < 1 || escolhas.length > totalDeItens(faixa)) return false;
  const incomuns = escolhas.filter((escolha) => escolha.raridade === 'incomum').length;
  if (incomuns > faixa.itens.incomum) return false;
  return escolhas.every((escolha) => escolha.itemId || escolha.titulo.trim().length >= 2);
}

/** Preenche as vagas com os itens sugeridos do ofício, na ordem, pulando o que não couber. */
export function kitSugerido(
  oficio: IOficio | undefined,
  faixa: IFaixaOficio,
  catalogo: ReadonlyMap<string, LojaCatalogEntry>,
): IEscolhaDoKit[] {
  const escolhas: IEscolhaDoKit[] = [];
  for (const item of oficio?.itens || []) {
    let escolha: IEscolhaDoKit | null = null;
    if (typeof item === 'string') {
      const entrada = catalogo.get(item);
      const raridade = entrada ? raridadeNoKit(entrada) : null;
      if (entrada && raridade) escolha = { itemId: entrada.id, titulo: entrada.titulo, raridade };
    } else if (item.titulo.trim().length >= 2) {
      escolha = { titulo: item.titulo.trim(), raridade: 'comum' };
    }
    if (escolha && podeAcrescentar(faixa, escolhas, escolha.raridade)) escolhas.push(escolha);
  }
  return escolhas;
}

/** O que vai para `inventarioInicial`: o servidor só lê `item_id` ou `titulo`. */
export const pedidoDoKit = (escolhas: readonly IEscolhaDoKit[]) =>
  escolhas.map((escolha) => (escolha.itemId
    ? { item_id: escolha.itemId, titulo: escolha.titulo, quantidade: 1 }
    : { titulo: escolha.titulo.trim(), quantidade: 1 }));

const valorDoRamo = (rotulo: string | undefined) =>
  RAMOS_CONTATO.find((ramo) => ramo.rotulo === rotulo)?.valor;

// Conhecido é afinidade 1; Amigo é 3 (ver confiancaDoVinculo).
const afinidadeDaConfianca = (confianca: number) => (confianca >= 2 ? 3 : 1);

export interface IContatoInicial {
  quem: string;
  ramo: string;
  confianca: 1 | 2;
}

export function contatosIniciais(oficio: IOficio | undefined, faixa: IFaixaOficio): IContatoInicial[] {
  return faixa.contatos.map((contato) => {
    const base = contato.origem === 'oficio'
      ? (oficio?.contato || { quem: 'Alguém do seu antigo trabalho', ramo: 'Ofício' })
      : { quem: contato.quem || 'Um conhecido', ramo: contato.ramo || 'Informação' };
    return { quem: base.quem, ramo: base.ramo, confianca: contato.confianca };
  });
}

/** Vínculos com que a ficha nasce: os contatos da faixa e, no Especialista, a obrigação. */
export function vinculosIniciais(
  oficio: IOficio | undefined,
  faixa: IFaixaOficio,
  tituloDoOficio: string,
  agora = Date.now(),
): IVinculo[] {
  const vinculos: IVinculo[] = contatosIniciais(oficio, faixa).map((contato) => ({
    id: gerarIdVinculo(),
    nome: contato.quem.slice(0, 80),
    tipo: 'contato',
    afinidade: afinidadeDaConfianca(contato.confianca),
    nota: `Vem do seu tempo de ${tituloDoOficio.toLocaleLowerCase('pt-BR')}. Dê um nome e um rosto a essa pessoa.`,
    fixado: false,
    ramo: valorDoRamo(contato.ramo),
    criadoEm: agora,
    atualizadoEm: agora,
    historico: [],
  }));
  if (faixa.obrigacao) {
    vinculos.push({
      id: gerarIdVinculo(),
      nome: faixa.obrigacao.slice(0, 80),
      tipo: 'divida',
      afinidade: 0,
      nota: `A sua formação de ${tituloDoOficio.toLocaleLowerCase('pt-BR')} foi paga por alguém. Combine com o Mestre quem é e o que essa pessoa espera de volta.`,
      fixado: false,
      criadoEm: agora,
      atualizadoEm: agora,
      historico: [],
    });
  }
  return vinculos;
}

/** Quanto chega à carteira depois de `dias` de trabalho na faixa: a sobra, não o ganho bruto. */
export const rendaDoTrabalho = (faixa: IFaixaOficio, dias: number) =>
  Math.max(0, Math.trunc(dias)) * faixa.sobra_por_dia;

const tituloDaPericia = new Map<string, string>(periciasData.pericias.map((pericia) => [pericia.id, pericia.titulo]));

const indiceDoGrau = (grau: unknown) => GRAUS_PERICIA.indexOf(String(grau ?? '').trim().toLowerCase());

export interface ILinhaDeRenda {
  /** Faixa em que o personagem trabalha hoje (a do ofício ou uma abaixo). */
  faixa: IFaixaOficio;
  /** Faixa do ofício, o teto. */
  teto: IFaixaOficio;
  /** Quando a renda está abaixo do teto: o grau que falta e em que perícias (nomes; vazio no ofício escrito pela pessoa). */
  falta: { grau: string; rotulo: string; pericias: string[] } | null;
}

/**
 * Faixa em que o ofício paga hoje, pela tabela Trabalhar pelo dia: a do ofício
 * é o teto, e cada linha pede um grau numa das perícias do ofício (Aprendiz no
 * Trabalhador, Treinado no Artesão, Especialista no Especialista). Sem o grau,
 * desce para a linha de baixo. Ofício escrito pela pessoa não tem lista de
 * perícias: conta o maior grau da ficha, e o Mestre confere.
 */
export function linhaDeRenda(
  oficio: Partial<IOficioDaFicha> | null | undefined,
  pericias: Record<string, unknown> | null | undefined,
): ILinhaDeRenda {
  const teto = faixaDoOficio(oficio);
  const doCatalogo = obterOficio(oficio?.id);
  const graus = pericias && typeof pericias === 'object' ? pericias : {};
  const lista = doCatalogo ? doCatalogo.pericias : Object.keys(graus);
  const melhor = lista.reduce((maior, id) => Math.max(maior, indiceDoGrau(graus[id])), -1);
  let indice = FAIXAS.findIndex((faixa) => faixa.id === teto.id);
  let falta: ILinhaDeRenda['falta'] = null;
  while (indice > 0) {
    const faixa = FAIXAS[indice];
    if (!faixa.grau_minimo || melhor >= indiceDoGrau(faixa.grau_minimo)) break;
    if (!falta) falta = { grau: faixa.grau_minimo, rotulo: ROTULO_GRAU[faixa.grau_minimo] || faixa.grau_minimo, pericias: doCatalogo ? doCatalogo.pericias.map((id) => tituloDaPericia.get(id) || id) : [] };
    indice -= 1;
  }
  return { faixa: FAIXAS[Math.max(0, indice)], teto, falta };
}

export const formatarLunaris = (valor: number) => `${valor.toLocaleString('pt-BR')} Lunaris`;
