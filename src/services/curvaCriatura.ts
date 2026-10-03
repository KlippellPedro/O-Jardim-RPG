import curvaData from '../../data/regras/curva-criatura-v1.json';
import { VD_MAXIMO, xpPorVd } from './progressaoNiveis';

/**
 * Gerador de criaturas por Valor de Desafio. O VD é o nível do grupo que a
 * criatura desafia sozinha, e os números saem da referência de NPCs
 * (data/regras/curva-criatura-v1.json, gerado por `npm run audit:balance`):
 * ataque e testes iguais ao ataque de referência, Defesa 3 abaixo da natural,
 * dano como fatia da Vida de um personagem e Vida como fatia da "Vida de
 * inimigo padrão" (a que aguenta 4,5 rodadas de um grupo de quatro).
 *
 * As criaturas escritas à mão continuam sendo a fonte oficial e nunca são
 * sobrescritas por isto; o gerador cobre os VDs em que não há ficha escrita.
 */

export type PapelCriatura = 'solo' | 'lacaio' | 'padrao' | 'elite' | 'chefe';

export interface IPapelCriatura {
  rotulo: string;
  /** Fatia da Vida de inimigo padrão do VD. O solo é o encontro inteiro (0,8, como o bestiário). */
  fatiaDeVida: number;
  /** Fatia do XP de uma criatura solo do VD. */
  fatiaDeXp: number;
  /** Somado ao ataque de referência. */
  ajusteDeAtaque: number;
  /** Fatia da Vida média de um personagem tirada por acerto comum. */
  fatiaDeDano: number;
  /** Só o chefe (e o elite) anunciam um golpe maior, na rodada anterior. */
  fatiaDoGolpeAnunciado: number | null;
}

export const PAPEIS_CRIATURA: Record<PapelCriatura, IPapelCriatura> = {
  solo: { rotulo: 'Solo', fatiaDeVida: 0.8, fatiaDeXp: 1, ajusteDeAtaque: 0, fatiaDeDano: 0.21, fatiaDoGolpeAnunciado: null },
  lacaio: { rotulo: 'Lacaio', fatiaDeVida: 0.1, fatiaDeXp: 0.1, ajusteDeAtaque: -4, fatiaDeDano: 0.12, fatiaDoGolpeAnunciado: null },
  padrao: { rotulo: 'Inimigo padrão', fatiaDeVida: 0.25, fatiaDeXp: 0.25, ajusteDeAtaque: -2, fatiaDeDano: 0.22, fatiaDoGolpeAnunciado: null },
  elite: { rotulo: 'Elite', fatiaDeVida: 0.5, fatiaDeXp: 0.5, ajusteDeAtaque: 0, fatiaDeDano: 0.32, fatiaDoGolpeAnunciado: null },
  chefe: { rotulo: 'Chefe', fatiaDeVida: 1, fatiaDeXp: 1, ajusteDeAtaque: 2, fatiaDeDano: 0.3, fatiaDoGolpeAnunciado: 0.45 },
};

/** O jeito de lutar da criatura, por cima do papel: muda Vida, Defesa, ataque, dano,
 * iniciativa e o que ela sabe fazer, sem mexer no XP. "Comum" é o modelo neutro. */
export type ArquetipoCriatura = 'comum' | 'bruto' | 'agil' | 'atirador' | 'conjurador' | 'defensor' | 'assassino';

export interface IArquetipoCriatura {
  rotulo: string;
  descricao: string;
  fatorDeVida: number;
  ajusteDeDefesa: number;
  ajusteDeAtaque: number;
  fatorDeDano: number;
  ajusteDeIniciativa: number;
  fatorDeMana: number;
  deslocamento: string;
  ataques: Array<{ nome: string; tipo: string; modo: 'corpo' | 'distancia' }>;
  /** Texto com {dt} (a DT padrão do VD). Vazio no arquétipo comum. */
  habilidade: string;
}

export const ARQUETIPOS_CRIATURA: Record<ArquetipoCriatura, IArquetipoCriatura> = {
  comum: { rotulo: 'Comum', descricao: 'Modelo neutro, com um ataque corpo a corpo e um à distância.', fatorDeVida: 1, ajusteDeDefesa: 0, ajusteDeAtaque: 0, fatorDeDano: 1, ajusteDeIniciativa: 0, fatorDeMana: 1, deslocamento: '9m',
    ataques: [{ nome: 'Ataque Corpo a Corpo', tipo: 'impacto', modo: 'corpo' }, { nome: 'Ataque à Distância', tipo: 'perfurante', modo: 'distancia' }], habilidade: '' },
  bruto: { rotulo: 'Bruto', descricao: 'Aguenta e machuca, mas é lento e fácil de acertar.', fatorDeVida: 1.15, ajusteDeDefesa: -2, ajusteDeAtaque: 0, fatorDeDano: 1.35, ajusteDeIniciativa: -2, fatorDeMana: 1, deslocamento: '9m',
    ataques: [{ nome: 'Golpe Brutal', tipo: 'impacto', modo: 'corpo' }, { nome: 'Arremesso', tipo: 'impacto', modo: 'distancia' }],
    habilidade: 'Pancada Descuidada (ao acertar com 15 ou mais no d20, empurra o alvo 3 m e ele cai; Fortitude DT {dt} nega)' },
  agil: { rotulo: 'Ágil', descricao: 'Frágil, rápido e difícil de acertar; foge e volta.', fatorDeVida: 0.8, ajusteDeDefesa: 3, ajusteDeAtaque: 1, fatorDeDano: 0.85, ajusteDeIniciativa: 4, fatorDeMana: 1, deslocamento: '12m',
    ataques: [{ nome: 'Golpe Rápido', tipo: 'cortante', modo: 'corpo' }, { nome: 'Arremesso de Faca', tipo: 'perfurante', modo: 'distancia' }],
    habilidade: 'Esquiva (1/rodada, Reação: soma +4 à Defesa contra um ataque, antes da rolagem)' },
  atirador: { rotulo: 'Atirador', descricao: 'Fica longe e acerta bem; some a Vida se alguém chega perto.', fatorDeVida: 0.75, ajusteDeDefesa: -1, ajusteDeAtaque: 2, fatorDeDano: 1.15, ajusteDeIniciativa: 2, fatorDeMana: 1, deslocamento: '9m',
    ataques: [{ nome: 'Tiro Preciso', tipo: 'perfurante', modo: 'distancia' }, { nome: 'Golpe de Coronha', tipo: 'impacto', modo: 'corpo' }],
    habilidade: 'Mira Firme (se não se mover no turno, o primeiro ataque à distância tem vantagem)' },
  conjurador: { rotulo: 'Conjurador', descricao: 'Muita Mana, dano em área e pouca Vida.', fatorDeVida: 0.7, ajusteDeDefesa: -2, ajusteDeAtaque: 1, fatorDeDano: 1.2, ajusteDeIniciativa: 2, fatorDeMana: 2.5, deslocamento: '9m',
    ataques: [{ nome: 'Raio Arcano', tipo: 'mágico', modo: 'distancia' }, { nome: 'Toque Arcano', tipo: 'mágico', modo: 'corpo' }],
    habilidade: 'Conjuração Rápida (1/rodada, Ação Livre: um efeito em área; Reflexos DT {dt}, dano de um ataque dele, metade em sucesso)' },
  defensor: { rotulo: 'Defensor', descricao: 'Muita Vida e Defesa, pouco dano; protege quem está perto.', fatorDeVida: 1.35, ajusteDeDefesa: 4, ajusteDeAtaque: -1, fatorDeDano: 0.7, ajusteDeIniciativa: -2, fatorDeMana: 1, deslocamento: '9m',
    ataques: [{ nome: 'Golpe de Escudo', tipo: 'impacto', modo: 'corpo' }, { nome: 'Lança Curta', tipo: 'perfurante', modo: 'distancia' }],
    habilidade: 'Proteger (1/rodada, Reação: recebe no lugar de um aliado adjacente o ataque que o acertou)' },
  assassino: { rotulo: 'Assassino', descricao: 'Machuca muito no primeiro golpe e cai fácil.', fatorDeVida: 0.75, ajusteDeDefesa: 1, ajusteDeAtaque: 2, fatorDeDano: 1.4, ajusteDeIniciativa: 6, fatorDeMana: 1, deslocamento: '12m',
    ataques: [{ nome: 'Lâmina Escondida', tipo: 'cortante', modo: 'corpo' }, { nome: 'Dardo Envenenado', tipo: 'perfurante', modo: 'distancia' }],
    habilidade: 'Golpe Furtivo (o primeiro ataque contra quem ainda não agiu na cena causa dano dobrado)' },
};

export const ORDEM_DOS_ARQUETIPOS: readonly ArquetipoCriatura[] = ['comum', 'bruto', 'agil', 'atirador', 'conjurador', 'defensor', 'assassino'];

export const ORDEM_DOS_PAPEIS: readonly PapelCriatura[] = ['lacaio', 'padrao', 'elite', 'chefe', 'solo'];

/** Acima deste VD a Vida cresce na proporção do VD (VD 100 tem 2,5 vezes a Vida do VD 40). */
export const VD_ONDE_A_VIDA_ESCALA = 40;
const DEFESA_ABAIXO_DA_NATURAL = 3;
const PERCEPCAO_ABAIXO_DO_ATAQUE = 8;

interface ILinhaDaCurva {
  ataque: number;
  defesaNatural: number;
  vidaDoPersonagem: number;
  vidaDeInimigoPadrao: number;
  modificadorPrincipal: number;
}

const COLUNAS = curvaData.colunas;
const LINHAS = new Map<number, ILinhaDaCurva>(
  curvaData.linhas.map((linha) => {
    const porColuna = Object.fromEntries(COLUNAS.map((coluna, indice) => [coluna, linha[indice]]));
    return [porColuna.vd, porColuna as unknown as ILinhaDaCurva];
  }),
);

export interface IAtaqueDeCriatura { nome: string; detalhe: string }

export interface IModeloDeCriatura {
  vd: number;
  papel: PapelCriatura;
  papelRotulo: string;
  arquetipo: ArquetipoCriatura;
  arquetipoRotulo: string;
  pv: number;
  defesa: number;
  iniciativa: number;
  deslocamento: string;
  mana: number;
  estamina: number;
  /** Bloco de monstro (forca, agilidade, vigor, presenca, intelecto), em modificadores. */
  atributos: { forca: number; agilidade: number; vigor: number; presenca: number; intelecto: number };
  pericias: string[];
  ataques: IAtaqueDeCriatura[];
  habilidades: string[];
  /** Dano médio de um acerto comum e do golpe anunciado (quando o papel tem um). */
  danoMedio: number;
  golpeAnunciadoMedio: number | null;
  /** XP da criatura, que a Sessão soma e reparte entre os jogadores. */
  xp: number;
}

/** Vida de aliado = este fator vezes a Vida média de um personagem do VD. */
export const FATOR_DE_VIDA_DE_ALIADO = 2;

/** Vida da criatura na ficha de quem a comprou ou contratou. No Bestiário a Vida é a
 * de um inimigo solo; como aliado ela luta ao lado do grupo, então vale no máximo
 * 2x a Vida média de um personagem do VD (nunca mais que a do catálogo). Espelha
 * plataforma/core/curva_criatura.py. */
export function vidaDeAliado(vd: unknown, pvDoCatalogo: number): number {
  const numero = Number(vd);
  const linha = vd === null || vd === undefined || !Number.isFinite(numero) ? undefined : LINHAS.get(vdValido(numero));
  if (!linha || !Number.isFinite(pvDoCatalogo)) return Math.max(1, Math.trunc(pvDoCatalogo) || 1);
  return Math.max(1, Math.min(Math.trunc(pvDoCatalogo), FATOR_DE_VIDA_DE_ALIADO * linha.vidaDoPersonagem));
}

export function vdValido(vd: unknown): number {
  return Math.min(VD_MAXIMO, Math.max(1, Math.trunc(Number(vd) || 1)));
}

/** Multiplicador de Vida acima do VD 40: VD/40, nunca abaixo de 1. */
export function escalaDeVida(vd: number): number {
  return Math.max(1, vdValido(vd) / VD_ONDE_A_VIDA_ESCALA);
}

const arredondarVida = (valor: number): number => (
  valor < 30 ? Math.max(1, Math.round(valor)) : Math.round(valor / 5) * 5
);

/** Vida de uma criatura do papel no VD. */
export function vidaDeCriatura(vd: unknown, papel: PapelCriatura = 'solo'): number {
  const alvo = vdValido(vd);
  const linha = LINHAS.get(alvo) as ILinhaDaCurva;
  return arredondarVida(linha.vidaDeInimigoPadrao * PAPEIS_CRIATURA[papel].fatiaDeVida * escalaDeVida(alvo));
}

const FACES_POR_FAIXA: Array<[number, number]> = [[5, 4], [8, 6], [16, 8], [Infinity, 10]];

/** Expressão de dado ("4d10+12") cuja média é a mais próxima possível de `media`. */
export function expressaoDeDano(media: number): string {
  const alvo = Math.max(2, Math.round(media));
  const faces = (FACES_POR_FAIXA.find(([limite]) => alvo < limite) as [number, number])[1];
  const mediaDoDado = (faces + 1) / 2;
  const dados = Math.max(1, Math.round((alvo * 0.6) / mediaDoDado));
  const fixo = Math.max(0, Math.round(alvo - dados * mediaDoDado));
  return `${dados}d${faces}${fixo > 0 ? `+${fixo}` : ''}`;
}

/** Média de uma expressão do tipo "4d10+12" (o inverso de expressaoDeDano). */
export function mediaDaExpressao(expressao: string): number {
  const partes = expressao.match(/^(\d+)d(\d+)(?:\+(\d+))?$/);
  if (!partes) return 0;
  return Number(partes[1]) * ((Number(partes[2]) + 1) / 2) + Number(partes[3] ?? 0);
}

const sinal = (valor: number) => (valor >= 0 ? `+${valor}` : String(valor));

/** A criatura de um VD e um papel, com todos os números prontos. */
export function modeloDeCriatura(vd: unknown, papel: PapelCriatura = 'solo', arquetipo: ArquetipoCriatura = 'comum'): IModeloDeCriatura {
  const alvo = vdValido(vd);
  const linha = LINHAS.get(alvo) as ILinhaDaCurva;
  const regra = PAPEIS_CRIATURA[papel];
  const jeito = ARQUETIPOS_CRIATURA[arquetipo];
  const ataque = linha.ataque + regra.ajusteDeAtaque + jeito.ajusteDeAtaque;
  const defesa = Math.max(8, linha.defesaNatural - DEFESA_ABAIXO_DA_NATURAL + jeito.ajusteDeDefesa);
  const modificador = Math.max(1, linha.modificadorPrincipal);
  const danoMedio = Math.max(2, Math.round(regra.fatiaDeDano * jeito.fatorDeDano * linha.vidaDoPersonagem));
  const golpeAnunciadoMedio = regra.fatiaDoGolpeAnunciado === null
    ? null
    : Math.max(danoMedio + 1, Math.round(regra.fatiaDoGolpeAnunciado * linha.vidaDoPersonagem));
  const ataques: IAtaqueDeCriatura[] = jeito.ataques.map((item) => ({
    nome: item.nome,
    detalhe: `${sinal(ataque)}, ${expressaoDeDano(danoMedio)} ${item.tipo}`,
  }));
  const habilidades: string[] = [];
  if (jeito.habilidade) habilidades.push(jeito.habilidade.split('{dt}').join(String(15 + Math.floor(alvo / 2))));
  if (golpeAnunciadoMedio !== null) {
    habilidades.push(
      `Golpe Anunciado (anuncie na rodada anterior; acerta ${expressaoDeDano(golpeAnunciadoMedio)}, cerca de ${Math.round((regra.fatiaDoGolpeAnunciado as number) * 100)}% da Vida de um personagem do nível; quem sai da frente a tempo não sofre nada)`,
    );
  }
  return {
    vd: alvo,
    papel,
    papelRotulo: regra.rotulo,
    arquetipo,
    arquetipoRotulo: jeito.rotulo,
    pv: arredondarVida(vidaDeCriatura(alvo, papel) * jeito.fatorDeVida),
    defesa,
    iniciativa: 10 + Math.floor(alvo / 2) + modificador + jeito.ajusteDeIniciativa,
    deslocamento: jeito.deslocamento,
    mana: Math.round((3 * alvo + 5) * jeito.fatorDeMana),
    estamina: 2 * alvo,
    atributos: {
      forca: modificador,
      agilidade: modificador,
      vigor: modificador,
      presenca: Math.max(0, modificador - 1),
      intelecto: Math.max(0, modificador - 1),
    },
    pericias: [
      `Luta ${sinal(ataque)}`,
      `Fortitude ${sinal(ataque)}`,
      `Reflexos ${sinal(ataque)}`,
      `Vontade ${sinal(ataque - 1)}`,
      `Percepção ${sinal(ataque - PERCEPCAO_ABAIXO_DO_ATAQUE)}`,
    ],
    ataques,
    habilidades,
    danoMedio,
    golpeAnunciadoMedio,
    xp: Math.round(xpPorVd(alvo) * regra.fatiaDeXp),
  };
}

/** Os números de uma criatura em cena que mudam quando ela muda de VD. */
export interface ICriaturaEscalavel {
  vd: number;
  pv: number;
  pvAtual?: number;
  defesa?: number | null;
  mana?: number | null;
  manaAtual?: number | null;
  estamina?: number | null;
  estaminaAtual?: number | null;
  iniciativa: number;
  ataques: IAtaqueDeCriatura[];
  pericias: string[];
}

export interface ICriaturaEscalada extends Omit<ICriaturaEscalavel, 'vd'> {
  vd: number;
  de: number;
  /** Quantos pontos o bônus de ataque e de perícia andaram. */
  deltaDeAtaque: number;
}

const DADO_NO_TEXTO = /(\d+)d(\d+)(?:\s*\+\s*(\d+))?/;
const BONUS_NO_FIM = /^(.*?)([+-]\d+)\s*$/;
const BONUS_NO_INICIO = /^([+-]\d+)(.*)$/;
const DT_NO_TEXTO = /\bDT\s*(\d+)/g;

const proporcional = (valor: number, de: number, para: number): number => (
  de > 0 ? Math.max(0, Math.round((valor * para) / de)) : valor
);

/** Muda só o dado de dano de um texto como "+7, 2d8+4 cortante", pela razão entre os danos de referência. */
const escalarDano = (detalhe: string, razao: number): string => detalhe.replace(DADO_NO_TEXTO, (_inteiro, quantos, faces, fixo) => {
  const media = Number(quantos) * ((Number(faces) + 1) / 2) + Number(fixo ?? 0);
  return expressaoDeDano(media * razao);
});

/** As DTs citadas no texto andam o mesmo que a DT do gerador (15 + metade do VD). */
const escalarDt = (detalhe: string, delta: number): string => (
  delta === 0 ? detalhe : detalhe.replace(DT_NO_TEXTO, (_inteiro, dt) => `DT ${Math.max(1, Number(dt) + delta)}`)
);

const escalarBonusDoAtaque = (detalhe: string, delta: number): string => {
  const partes = detalhe.match(BONUS_NO_INICIO);
  if (!partes) return detalhe;
  return `${sinal(Number(partes[1]) + delta)}${partes[2]}`;
};

/**
 * Leva uma criatura que já está em cena para outro VD sem trocar quem ela é: a
 * Vida mantém a proporção que a criatura tinha em relação à curva, o ataque e
 * as perícias andam o mesmo tanto que o ataque de referência, a Defesa e a
 * iniciativa andam a diferença entre os dois VDs, e o dano segue a razão entre
 * os danos de referência. Nomes de ataque e habilidades ficam como estão.
 */
export function escalarCriatura(criatura: ICriaturaEscalavel, vdAlvo: unknown): ICriaturaEscalada {
  const de = vdValido(criatura.vd);
  const para = vdValido(vdAlvo);
  const antes = modeloDeCriatura(de);
  const depois = modeloDeCriatura(para);
  const deltaDeAtaque = (LINHAS.get(para) as ILinhaDaCurva).ataque - (LINHAS.get(de) as ILinhaDaCurva).ataque;
  const deltaDeDt = Math.floor(para / 2) - Math.floor(de / 2);
  const razaoDeDano = antes.danoMedio > 0 ? depois.danoMedio / antes.danoMedio : 1;

  const pv = Math.max(1, arredondarVida(proporcional(criatura.pv, vidaDeCriatura(de), vidaDeCriatura(para))));
  const pvAtual = criatura.pvAtual === undefined
    ? undefined
    : criatura.pv > 0 ? Math.max(0, Math.round((criatura.pvAtual * pv) / criatura.pv)) : pv;
  const escalarRecurso = (maximo: number | null | undefined, atual: number | null | undefined, referenciaAntes: number, referenciaDepois: number) => {
    if (maximo == null) return { maximo, atual };
    const novoMaximo = proporcional(maximo, referenciaAntes, referenciaDepois);
    const novoAtual = atual == null ? atual : maximo > 0 ? Math.min(novoMaximo, Math.round((atual * novoMaximo) / maximo)) : novoMaximo;
    return { maximo: novoMaximo, atual: novoAtual };
  };
  const mana = escalarRecurso(criatura.mana, criatura.manaAtual, antes.mana, depois.mana);
  const estamina = escalarRecurso(criatura.estamina, criatura.estaminaAtual, antes.estamina, depois.estamina);

  return {
    vd: para,
    de,
    deltaDeAtaque,
    pv,
    pvAtual,
    defesa: criatura.defesa == null ? criatura.defesa : Math.max(0, criatura.defesa + depois.defesa - antes.defesa),
    mana: mana.maximo,
    manaAtual: mana.atual,
    estamina: estamina.maximo,
    estaminaAtual: estamina.atual,
    iniciativa: criatura.iniciativa + depois.iniciativa - antes.iniciativa,
    ataques: criatura.ataques.map((ataque) => ({
      nome: ataque.nome,
      detalhe: escalarDt(escalarDano(escalarBonusDoAtaque(ataque.detalhe, deltaDeAtaque), razaoDeDano), deltaDeDt),
    })),
    pericias: criatura.pericias.map((pericia) => {
      const partes = pericia.match(BONUS_NO_FIM);
      return partes ? `${partes[1]}${sinal(Number(partes[2]) + deltaDeAtaque)}` : pericia;
    }),
  };
}
