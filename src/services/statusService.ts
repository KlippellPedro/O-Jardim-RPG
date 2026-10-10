export interface IStatusVital {
  vidaAtual?: number;
  manaAtual?: number;
  estaminaAtual?: number;
  sanidadeAtual?: number;
  cansacoAtual?: number;
  morrendo?: number;
  ferido?: number;
  estabilizado?: boolean;
  morto?: boolean;
  [key: string]: unknown;
}

/** Qualquer recurso que um poder, habilidade ou magia pode cobrar. Era
 * declarado três vezes (AbaPoderes, AbaHabilidades, frutoEdenService); agora
 * é uma fonte só, e adicionar um recurso novo é mexer aqui. */
export type TRecursoCusto = 'nenhum' | 'mana' | 'estamina' | 'vida' | 'sanidade' | 'cansaco';

export const RECURSOS_CUSTO_OPCOES: ReadonlyArray<{ value: TRecursoCusto; label: string }> = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'mana', label: 'Mana' },
  { value: 'estamina', label: 'Estamina' },
  { value: 'vida', label: 'Vida' },
  { value: 'sanidade', label: 'Sanidade' },
  { value: 'cansaco', label: 'Cansaço' },
];

export const ROTULO_RECURSO: Record<TRecursoCusto, string> = Object.fromEntries(
  RECURSOS_CUSTO_OPCOES.map((opcao) => [opcao.value, opcao.label]),
) as Record<TRecursoCusto, string>;

export const RECURSOS_CUSTO_VALIDOS: ReadonlyArray<Exclude<TRecursoCusto, 'nenhum'>> = [
  'mana', 'estamina', 'vida', 'sanidade', 'cansaco',
];

/** Campo de `ficha.status` onde cada recurso guarda o valor atual. */
export const CAMPO_STATUS_RECURSO: Record<Exclude<TRecursoCusto, 'nenhum'>, string> = {
  mana: 'manaAtual',
  estamina: 'estaminaAtual',
  vida: 'vidaAtual',
  sanidade: 'sanidadeAtual',
  cansaco: 'cansacoAtual',
};

/** Um poder gasta Estamina ou Mana, nunca os dois: `custo_estamina` (físico)
 * tem prioridade, e `custo_mana` (místico) vale quando ele não existe. */
export interface ICustoDePoder {
  recurso: Extract<TRecursoCusto, 'nenhum' | 'mana' | 'estamina'>;
  valor: number;
}

export function custoDePoder(fonte: { custoMana?: number; custoEstamina?: number } | null | undefined): ICustoDePoder {
  const estamina = Math.max(0, Number(fonte?.custoEstamina) || 0);
  if (estamina > 0) return { recurso: 'estamina', valor: estamina };
  const mana = Math.max(0, Number(fonte?.custoMana) || 0);
  if (mana > 0) return { recurso: 'mana', valor: mana };
  return { recurso: 'nenhum', valor: 0 };
}

/** "3 Estamina", "2 Mana" ou vazio quando o poder não custa nada. */
export function rotuloCustoDePoder(fonte: { custoMana?: number; custoEstamina?: number } | null | undefined): string {
  const custo = custoDePoder(fonte);
  return custo.recurso === 'nenhum' ? '' : `${custo.valor} ${ROTULO_RECURSO[custo.recurso]}`;
}

export interface IRegraCondicaoAplicavel {
  id: string;
  titulo: string;
  categoria: string;
  duracao: string;
  efeitos: string[];
  remocao?: string;
}

export interface ICondicaoAtivaFicha {
  id: string;
  nome: string;
  descricao: string;
  afeta: string;
  duracao: string;
  remocao?: string;
}

function normalizarIdentificador(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function idsCondicoes(condicoes: unknown): Set<string> {
  if (!Array.isArray(condicoes)) return new Set();
  return new Set(condicoes.flatMap((item) => {
    if (typeof item === 'string') return [normalizarIdentificador(item)];
    if (!item || typeof item !== 'object') return [];
    const condicao = item as Record<string, unknown>;
    return [condicao.id, condicao.nome, condicao.titulo]
      .map(normalizarIdentificador)
      .filter(Boolean);
  }));
}

export function obterStatusFicha(ficha: Record<string, any> | null | undefined): IStatusVital {
  const legado = ficha?.recursos && typeof ficha.recursos === 'object' ? ficha.recursos : {};
  const atual = ficha?.status && typeof ficha.status === 'object' ? ficha.status : {};
  return { ...legado, ...atual };
}

export function condicaoAtiva(condicoes: unknown, id: string): boolean {
  return idsCondicoes(condicoes).has(normalizarIdentificador(id));
}

export function adicionarCondicaoOficial(
  condicoes: unknown,
  regra: IRegraCondicaoAplicavel,
): { condicoes: Array<unknown>; adicionada: boolean } {
  const atuais = Array.isArray(condicoes) ? [...condicoes] : [];
  if (condicaoAtiva(atuais, regra.id) || condicaoAtiva(atuais, regra.titulo)) {
    return { condicoes: atuais, adicionada: false };
  }

  const novaCondicao: ICondicaoAtivaFicha = {
    id: regra.id,
    nome: regra.titulo,
    descricao: regra.efeitos.join(' '),
    afeta: regra.categoria,
    duracao: regra.duracao,
    ...(regra.remocao ? { remocao: regra.remocao } : {}),
  };

  return { condicoes: [...atuais, novaCondicao], adicionada: true };
}

/**
 * Cobertura de automação mecânica das condições oficiais (data/regras/condicoes.ts)
 * neste arquivo - mapa de quem tem efeito numérico aplicado automaticamente
 * aqui vs. quem depende de leitura manual do texto da condição. Registrado
 * explicitamente por pedido de auditoria (2026-08): nenhuma automação nova foi
 * criada, isto só documenta o que já existia.
 *
 * Automatizadas aqui (Defesa/Iniciativa/movimento/ataque/testes):
 *  - Atordoado, Inconsciente, Paralisado, Exposto, crise Fúria → penalidadeDefesaCondicoes
 *  - Resguardado → bonusDefesaCondicoes
 *  - Surpreendido, Lento, Apressado → penalidadeIniciativaCondicoes
 *  - Caído → penalidadeAtaqueCondicoes
 *  - Agarrado, Imobilizado, Paralisado, Inconsciente → movimentoBloqueadoPorCondicao
 *  - Lento, Perna Quebrada e Perda de uma Perna (metade) e Apressado (+3 m) → movimentoComCondicoes
 *  - Testes e ataques (tabela REGRAS_TESTE_CONDICOES → efeitosCondicoesNoTeste): Enfraquecido,
 *    Favorecido, Desorientado, Cego, e as lesões e sequelas de longo prazo que têm número fixo
 *    e valem sempre (mãos, braços, olho, pernas, costelas, mandíbula, concussão, tremor, congelamento)
 *  - Enfraquecido (−2 no dano corpo a corpo) → penalidadeDanoCorpoACorpoCondicoes
 *  - Inspirado (+2 num teste, consumido) → oferecido na hora de rolar ataque e perícia
 *  - Sangramento, Queimando, Envenenado e Revigorado → botão de turno (efeitosDoTurnoService)
 *
 * Só informativas aqui (efeito descrito em condicoes.ts, aplicado na mesa,
 * não calculado por nenhuma função deste arquivo): o que depende da cena,
 * como "para escalar", "contra fumaça", "diante do gatilho" ou "com armadura
 * pesada"; Concentrando, Amedrontado, Silenciado, Focado (+2 em Vontade só
 * contra efeito mental), os transtornos, as fobias, e as crises de sanidade
 * além de Fúria.
 */
export function penalidadeDefesaCondicoes(condicoes: unknown): number {
  const ids = idsCondicoes(condicoes);
  let penalidade = 0;
  if (ids.has('exposto')) penalidade += 2;
  if (ids.has('atordoado')) penalidade += 5;
  if (ids.has('inconsciente')) penalidade += 5;
  if (ids.has('paralisado')) penalidade += 2;
  if (ids.has('furia') || ids.has('crise-furia')) penalidade += 2;
  return penalidade;
}

/** Defesa que uma condição benéfica soma. Fica separada da penalidade para a
 * ficha mostrar "Penalidade da Defesa" sem número negativo. */
export function bonusDefesaCondicoes(condicoes: unknown): number {
  return condicaoAtiva(condicoes, 'resguardado') ? 2 : 0;
}

/** Soma de Iniciativa das condições: negativa quando atrapalha, positiva quando ajuda. */
export function penalidadeIniciativaCondicoes(condicoes: unknown): number {
  const ids = idsCondicoes(condicoes);
  let ajuste = 0;
  if (ids.has('surpreendido')) ajuste -= 5;
  if (ids.has('lento')) ajuste -= 2;
  if (ids.has('apressado')) ajuste += 2;
  return ajuste;
}

export function bonusIniciativaFicha(ficha: Record<string, any> | null | undefined): number {
  const recursos = obterStatusFicha(ficha);
  let total = Number(recursos.bonusIniciativa) || 0;
  total += (Array.isArray(recursos.ajustesIniciativa) ? recursos.ajustesIniciativa : [])
    .reduce((soma: number, item: any) => soma + (Number(item?.valor) || 0), 0);

  const ativos = ficha?.efeitosAtivos && typeof ficha.efeitosAtivos === 'object' ? ficha.efeitosAtivos : {};
  for (const colecao of ['poderes', 'habilidades', 'magias']) {
    for (const item of Array.isArray(ficha?.[colecao]) ? ficha[colecao] : []) {
      for (const efeito of Array.isArray(item?.efeitos) ? item.efeitos : []) {
        const ativo = efeito?.modo === 'sempre' || ativos[String(item?.id)] === true;
        if (ativo && efeito?.tipo === 'combate' && efeito?.alvo === 'iniciativa') {
          total += Number(efeito?.valor) || 0;
        }
      }
    }
  }
  return total;
}

export function penalidadeAtaqueCondicoes(condicoes: unknown): number {
  return condicaoAtiva(condicoes, 'caido') ? -2 : 0;
}

export interface IEfeitoCondicaoTeste {
  bonus: number;
  vantagens: number;
  desvantagens: number;
  /** Uma linha por condição que mexeu no bônus, para a ficha mostrar de onde veio o número. */
  partes: Array<{ nome: string; valor: number }>;
  /** Nome das condições que deram desvantagem. */
  fontesDesvantagem: string[];
}

export type TipoAtaqueCondicao = 'corpo' | 'distancia';

interface IRegraTesteCondicao {
  /** Perícias afetadas. */
  pericias?: string[];
  /** Todo teste que usa este atributo como base. */
  atributo?: string;
  /** Rolagem de ataque: todas, só corpo a corpo ou só à distância. */
  ataque?: 'todos' | TipoAtaqueCondicao;
  bonus?: number;
  desvantagem?: boolean;
  /** Regras com o mesmo grupo não somam entre si, como duas condições que tiram 2 da mesma mão. */
  grupo?: string;
}

/**
 * Efeitos de condição que a ficha calcula sozinha em testes e ataques. Só entra o que tem número fixo e vale sempre;
 * o que depende da cena ("para escalar", "contra fumaça", "diante do gatilho") fica com a mesa.
 * O texto de cada condição continua em data/regras/condicoes.ts e condicoes-longo-prazo.ts.
 */
export const REGRAS_TESTE_CONDICOES: Readonly<Record<string, { nome: string; regras: IRegraTesteCondicao[] }>> = {
  enfraquecido: { nome: 'Enfraquecido', regras: [{ atributo: 'forca', bonus: -2 }] },
  favorecido: { nome: 'Favorecido', regras: [{ pericias: ['fortitude', 'reflexos', 'vontade'], bonus: 1 }] },
  desorientado: { nome: 'Desorientado', regras: [{ ataque: 'todos', desvantagem: true }, { pericias: ['percepcao'], desvantagem: true }] },
  cego: { nome: 'Cego', regras: [{ pericias: ['percepcao'], desvantagem: true, grupo: 'visao' }] },
  'cegueira-permanente': { nome: 'Cegueira Permanente', regras: [{ pericias: ['percepcao'], desvantagem: true, grupo: 'visao' }] },
  'braco-dominante-quebrado': { nome: 'Braço Dominante Quebrado', regras: [{ ataque: 'todos', bonus: -2, grupo: 'mao-dominante' }] },
  'perda-mao-dominante': { nome: 'Perda da Mão Dominante', regras: [{ ataque: 'todos', bonus: -2, grupo: 'mao-dominante' }] },
  'ombro-deslocado': { nome: 'Ombro Deslocado', regras: [{ ataque: 'corpo', desvantagem: true }] },
  'perda-olho': { nome: 'Perda de um Olho', regras: [{ ataque: 'distancia', bonus: -2 }, { pericias: ['percepcao'], bonus: -2 }] },
  'perna-quebrada': { nome: 'Perna Quebrada', regras: [{ pericias: ['acrobacia', 'furtividade'], desvantagem: true, grupo: 'perna' }] },
  'perda-perna': { nome: 'Perda de uma Perna', regras: [{ pericias: ['acrobacia', 'furtividade'], desvantagem: true, grupo: 'perna' }] },
  'tornozelo-torcido': { nome: 'Tornozelo Torcido', regras: [{ pericias: ['acrobacia'], desvantagem: true }] },
  manqueira: { nome: 'Manqueira', regras: [{ pericias: ['acrobacia'], desvantagem: true }] },
  'costelas-fraturadas': { nome: 'Costelas Fraturadas', regras: [{ pericias: ['atletismo'], bonus: -2 }] },
  'mao-fraturada': { nome: 'Mão Fraturada', regras: [{ pericias: ['ladinagem', 'pontaria'], desvantagem: true }] },
  congelamento: { nome: 'Congelamento', regras: [{ pericias: ['ladinagem', 'pontaria'], desvantagem: true }] },
  'tremor-nas-maos': { nome: 'Tremor nas Mãos', regras: [{ pericias: ['ladinagem', 'pontaria'], desvantagem: true }] },
  'mandibula-quebrada': { nome: 'Mandíbula Quebrada', regras: [{ pericias: ['diplomacia', 'atuacao', 'intimidacao'], desvantagem: true }] },
  concussao: { nome: 'Concussão', regras: [{ pericias: ['percepcao', 'investigacao', 'conhecimento'], desvantagem: true }] },
};

/** A condição está na ficha, salva pelo id ou pelo nome. */
function condicaoNaFicha(ids: Set<string>, id: string, nome: string): boolean {
  return ids.has(id) || ids.has(normalizarIdentificador(nome));
}

/**
 * O que as condições em vigor somam, tiram ou dão de desvantagem num teste. `atributoId` é o atributo base da
 * perícia (Enfraquecido mexe em tudo que usa Força), `ataque` marca a rolagem de acerto e `tipoAtaque` separa
 * corpo a corpo de à distância.
 */
export function efeitosCondicoesNoTeste(
  condicoes: unknown,
  contexto: { periciaId?: string; atributoId?: string; ataque?: boolean; tipoAtaque?: TipoAtaqueCondicao },
): IEfeitoCondicaoTeste {
  const ids = idsCondicoes(condicoes);
  const pericia = contexto.periciaId || '';
  const partes: Array<{ nome: string; valor: number }> = [];
  const fontesDesvantagem: string[] = [];
  const gruposUsados = new Set<string>();
  let bonus = 0;

  for (const [id, { nome, regras }] of Object.entries(REGRAS_TESTE_CONDICOES)) {
    if (!condicaoNaFicha(ids, id, nome)) continue;
    for (const regra of regras) {
      const vale = (regra.pericias?.includes(pericia) ?? false)
        || (regra.atributo !== undefined && regra.atributo === contexto.atributoId)
        || (regra.ataque !== undefined && Boolean(contexto.ataque)
          && (regra.ataque === 'todos' || regra.ataque === contexto.tipoAtaque));
      if (!vale) continue;
      if (regra.grupo) {
        if (gruposUsados.has(regra.grupo)) continue;
        gruposUsados.add(regra.grupo);
      }
      if (regra.bonus) {
        bonus += regra.bonus;
        partes.push({ nome, valor: regra.bonus });
      }
      if (regra.desvantagem) fontesDesvantagem.push(nome);
    }
  }
  return { bonus, vantagens: 0, desvantagens: fontesDesvantagem.length, partes, fontesDesvantagem };
}

/** Enfraquecido tira 2 do dano de ataques corpo a corpo. */
export function penalidadeDanoCorpoACorpoCondicoes(condicoes: unknown): number {
  return condicaoAtiva(condicoes, 'enfraquecido') ? -2 : 0;
}

/** Condições que cortam o Movimento pela metade. Lento só vale quando Apressado não está junto. */
const METADE_DO_MOVIMENTO: ReadonlyArray<[string, string]> = [
  ['perna-quebrada', 'Perna Quebrada'],
  ['perda-perna', 'Perda de uma Perna'],
];

function efeitoNoMovimento(condicoes: unknown): { metade: string[]; apressado: boolean; anulados: boolean } {
  const ids = idsCondicoes(condicoes);
  const lento = condicaoAtiva(condicoes, 'lento');
  const apressado = condicaoAtiva(condicoes, 'apressado');
  const metade = METADE_DO_MOVIMENTO.filter(([id, nome]) => condicaoNaFicha(ids, id, nome)).map(([, nome]) => nome);
  if (lento && !apressado) metade.unshift('Lento');
  return { metade, apressado: apressado && !lento, anulados: lento && apressado };
}

/**
 * Movimento depois das condições: Lento e as lesões de perna cortam pela metade (uma vez só, não empilha) e
 * Apressado soma 3 m. Lento e Apressado juntos se anulam. Quem não pode se mover (Agarrado, Paralisado...)
 * continua tratado em `movimentoBloqueadoPorCondicao`.
 */
export function movimentoComCondicoes(movimento: number, condicoes: unknown): number {
  const efeito = efeitoNoMovimento(condicoes);
  let resultado = efeito.metade.length > 0 ? Math.floor(movimento / 2) : movimento;
  if (efeito.apressado) resultado += 3;
  return resultado;
}

/** Frase curta para o cálculo do Movimento: o que as condições fizeram. Vazio quando nenhuma vale. */
export function textoMovimentoCondicoes(condicoes: unknown): string {
  const efeito = efeitoNoMovimento(condicoes);
  const partes: string[] = [];
  if (efeito.metade.length > 0) partes.push(`${efeito.metade.join(' e ')}: metade`);
  if (efeito.apressado) partes.push('Apressado: +3 m');
  if (efeito.anulados) partes.push('Lento e Apressado se anulam');
  return partes.join('; ');
}

/** Inspirado: +2 num teste à escolha de quem joga, e a condição acaba depois dele. */
export const BONUS_INSPIRADO = 2;

export function inspiradoAtivo(condicoes: unknown): boolean {
  return condicaoAtiva(condicoes, 'inspirado');
}

/** Tira uma condição da lista salva na ficha, achada por id ou nome. */
export function removerCondicao(condicoes: unknown, id: string): unknown[] {
  const lista = Array.isArray(condicoes) ? condicoes : [];
  const alvo = normalizarIdentificador(id);
  return lista.filter((item) => !idsCondicoes([item]).has(alvo));
}

export function movimentoBloqueadoPorCondicao(condicoes: unknown): boolean {
  const ids = idsCondicoes(condicoes);
  return ids.has('agarrado') || ids.has('imobilizado') || ids.has('paralisado') || ids.has('inconsciente');
}

/** Vida, Mana, Estamina e Sanidade aceitam um extra temporário acima do
 * máximo. Ele fica num campo à parte (ex.: `vidaTemporaria`), então
 * `vidaAtual` continua dentro do máximo e nada que depende disso (banco,
 * sessão, descanso) muda. O Cansaço não tem extra: passar do limite é
 * colapso, não bônus. */
const CAMPOS_COM_TEMPORARIO = ['vidaAtual', 'manaAtual', 'estaminaAtual', 'sanidadeAtual'];

export const aceitaTemporario = (campo: string) => CAMPOS_COM_TEMPORARIO.includes(campo);

export const campoTemporario = (campo: string) => campo.replace('Atual', 'Temporaria');

export function obterTemporario(status: IStatusVital | null | undefined, campo: string): number {
  if (!status || !aceitaTemporario(campo)) return 0;
  return Math.max(0, Math.trunc(Number(status[campoTemporario(campo)]) || 0));
}

/** Gasto de custo (magia, poder, habilidade): o temporário paga primeiro. */
export function gastarComTemporario(
  status: IStatusVital,
  campo: string,
  atual: number,
  custo: number,
): { atual: number; temporario: number } {
  const temporario = obterTemporario(status, campo);
  const absorvido = Math.min(temporario, Math.max(0, custo));
  return { atual: atual - (custo - absorvido), temporario: temporario - absorvido };
}

export function limiteMorrendo(constituicao: unknown): 3 | 4 {
  return Number(constituicao) >= 20 ? 4 : 3;
}

export function atualizarStatusVital(
  statusEntrada: IStatusVital,
  campo: string,
  alteracaoBruta: number,
  maximo: number,
  constituicao: unknown,
  opcoes: { ignorarTemporario?: boolean } = {},
): IStatusVital {
  const maximoSeguro = Math.max(1, Number(maximo) || 1);
  const valorAtual = Number(statusEntrada[campo] ?? (campo === 'cansacoAtual' ? 0 : maximoSeguro));

  // Extra temporário: o dano gasta ele primeiro e o que passa do máximo vira ele.
  let statusAtual = statusEntrada;
  let alteracao = Number(alteracaoBruta || 0);
  if (aceitaTemporario(campo)) {
    let temporario = obterTemporario(statusEntrada, campo);
    if (alteracao < 0 && !opcoes.ignorarTemporario && temporario > 0) {
      const absorvido = Math.min(temporario, -alteracao);
      temporario -= absorvido;
      alteracao += absorvido;
    } else if (alteracao > 0 && valorAtual + alteracao > maximoSeguro) {
      const excesso = valorAtual + alteracao - maximoSeguro;
      temporario += excesso;
      alteracao -= excesso;
    }
    statusAtual = { ...statusEntrada, [campoTemporario(campo)]: temporario };
  }
  const minimo = campo === 'vidaAtual' ? -maximoSeguro : 0;
  const proximoValor = Math.max(minimo, Math.min(maximoSeguro, valorAtual + alteracao));
  const proximo: IStatusVital = { ...statusAtual, [campo]: proximoValor };

  if (campo !== 'vidaAtual') return proximo;

  const limite = limiteMorrendo(constituicao);
  if (proximoValor <= -maximoSeguro) {
    return { ...proximo, morto: true, estabilizado: false, morrendo: limite };
  }
  if (proximoValor <= 0 && valorAtual > 0) {
    return {
      ...proximo,
      morto: false,
      estabilizado: false,
      morrendo: Math.max(1, Number(statusAtual.morrendo) || 0),
    };
  }
  if (proximoValor >= 1 && valorAtual <= 0) {
    return {
      ...proximo,
      morto: false,
      estabilizado: false,
      morrendo: 0,
      ferido: Math.max(0, Number(statusAtual.ferido) || 0) + 1,
    };
  }
  return { ...proximo, morto: false };
}

export function estadoVida(status: IStatusVital, vidaMaxima: number): 'morto' | 'deficit' | 'consciente' {
  if (status.morto || Number(status.vidaAtual) <= -Math.max(1, Number(vidaMaxima) || 1)) return 'morto';
  if (Number(status.vidaAtual) <= 0) return 'deficit';
  return 'consciente';
}

export function penalidadeCansacoTeste(cansaco: unknown, testeFisico: boolean): number {
  const nivel = Math.max(0, Math.min(6, Math.trunc(Number(cansaco) || 0)));
  if (nivel >= 3) return -2;
  if (!testeFisico) return 0;
  if (nivel === 2) return -2;
  if (nivel === 1) return -1;
  return 0;
}

export function penalidadeCansacoIniciativa(cansaco: unknown): number {
  return Math.max(0, Math.trunc(Number(cansaco) || 0)) >= 2 ? -1 : 0;
}

export function desvantagensAutomaticasTeste(
  cansaco: unknown,
  testeFisico: boolean,
  sobrecarregado = false,
): number {
  if (!testeFisico) return 0;
  const porCansaco = Math.max(0, Math.trunc(Number(cansaco) || 0)) >= 4 ? 1 : 0;
  return porCansaco + (sobrecarregado ? 1 : 0);
}

export function multiplicadorMovimentoCansaco(cansaco: unknown): number {
  return Math.max(0, Math.trunc(Number(cansaco) || 0)) >= 5 ? 0.5 : 1;
}
