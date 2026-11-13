import { CONDICOES_OFICIAIS, CRISES_SANIDADE } from '../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../data/regras/condicoes-longo-prazo';
import { CATALOGO_AFLICOES, ROTULO_TIPO_AFLICAO } from '../../data/regras/aflicoes';
import { rotaDaRegra } from '../pages/Regras/secaoDoLivro';

/**
 * Termos do jogo que viram link no texto: quando uma habilidade diz "o alvo
 * fica Enfraquecido", a palavra leva ao lugar do Livro que explica o efeito,
 * numa guia nova, para quem lê não perder onde estava.
 *
 * As condições, crises, condições de longo prazo e aflições saem dos próprios
 * catálogos. As mecânicas (vantagem, Morrendo, Cansaço, reações...) têm um
 * resumo curto escrito aqui, tirado do tópico do Livro que as explica.
 *
 * Só a forma com maiúscula de uma condição vira link: é assim que os catálogos
 * escrevem o nome da condição ("fica Caído"), enquanto a minúscula quase
 * sempre é só a palavra ("um aliado caído", "ponto cego").
 */

export type CategoriaTermo = 'condicao' | 'crise' | 'longo-prazo' | 'aflicao' | 'mecanica';

export const ROTULO_CATEGORIA_TERMO: Record<CategoriaTermo, string> = {
  condicao: 'Condição',
  crise: 'Crise de Sanidade',
  'longo-prazo': 'Condição de longo prazo',
  aflicao: 'Aflição',
  mecanica: 'Regra',
};

export interface ITermoDoJogo {
  /** Único entre todos os termos: `${categoria}-${id do catálogo}`. */
  id: string;
  nome: string;
  categoria: CategoriaTermo;
  /** Uma ou duas frases para a dica ao pousar o mouse. */
  resumo: string;
  /** Tópico do Livro onde o termo é explicado. */
  topico: string;
  /** Endereço do Livro já na explicação do termo. */
  rota: string;
  /** Grafias exatas que viram link (com gênero e número, quando a palavra varia). */
  formas: string[];
  /** Só liga quando o texto logo depois combina ("Resistência 10", nunca "resistência" solta). */
  exigeDepois?: RegExp;
  /** Não liga quando o texto logo depois combina ("vantagem do grau" é outra regra). */
  proibeDepois?: RegExp;
}

/** Id do elemento do Livro que mostra o termo (o cartão da condição, a linha da tabela). */
export const ancoraDoTermo = (idDoTermo: string) => `termo-${idDoTermo}`;

/** Id do termo a partir do id no catálogo de origem (o Livro usa para marcar o cartão certo). */
export const ID_DO_TERMO = {
  condicao: (id: string) => `condicao-${id}`,
  crise: (id: string) => `crise-${id.replace(/^crise-/, '')}`,
  longoPrazo: (id: string) => `longo-prazo-${id}`,
  aflicao: (id: string) => `aflicao-${id}`,
};

const rotaDaAncora = (topico: string, idDoTermo: string) => {
  const parametros = new URLSearchParams({ topico, secao: ancoraDoTermo(idDoTermo) });
  return `/regras?${parametros.toString()}`;
};

const LIMITE_DO_RESUMO = 240;
const encurtar = (texto: string) => {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= LIMITE_DO_RESUMO) return limpo;
  const corte = limpo.lastIndexOf(' ', LIMITE_DO_RESUMO - 1);
  return `${limpo.slice(0, corte > 0 ? corte : LIMITE_DO_RESUMO - 1)}…`;
};

/** "Amedrontado" também aparece como "Amedrontada", "Amedrontados"; "Invisível" como "Invisíveis". */
export function formasDoNome(nome: string): string[] {
  if (/\s/.test(nome)) return [nome];
  // Gerúndio (Queimando) não varia; substantivo em "-mento" (Sangramento) só no plural.
  if (/ndo$/.test(nome)) return [nome];
  if (/mento$/.test(nome)) return [nome, `${nome}s`];
  if (/[oa]$/.test(nome)) {
    const raiz = nome.slice(0, -1);
    return [`${raiz}o`, `${raiz}a`, `${raiz}os`, `${raiz}as`];
  }
  if (/vel$/.test(nome)) return [nome, nome.replace(/vel$/, 'veis')];
  return [nome];
}

const termosDeCondicao = (): ITermoDoJogo[] => [
  ...CONDICOES_OFICIAIS.map((condicao) => {
    const id = ID_DO_TERMO.condicao(condicao.id);
    return {
      id,
      nome: condicao.titulo,
      categoria: 'condicao' as const,
      resumo: encurtar(condicao.efeitos.filter((efeito) => !/^Veja também/.test(efeito)).join(' ')),
      topico: 'condicoes',
      rota: rotaDaAncora('condicoes', id),
      formas: formasDoNome(condicao.titulo),
    };
  }),
  // "Fúria" fica de fora: é também nome de habilidade de classe e de criatura.
  ...CRISES_SANIDADE.filter((crise) => crise.titulo !== 'Fúria').map((crise) => {
    const id = ID_DO_TERMO.crise(crise.id);
    return {
      id,
      nome: crise.titulo,
      categoria: 'crise' as const,
      resumo: encurtar(crise.efeitos.join(' ')),
      topico: 'condicoes',
      rota: rotaDaAncora('condicoes', id),
      formas: [crise.titulo],
    };
  }),
  ...CONDICOES_LONGO_PRAZO.map((condicao) => {
    const id = ID_DO_TERMO.longoPrazo(condicao.id);
    return {
      id,
      nome: condicao.titulo,
      categoria: 'longo-prazo' as const,
      resumo: encurtar(condicao.efeitos.join(' ')),
      topico: 'condicoes',
      rota: rotaDaAncora('condicoes', id),
      formas: [condicao.titulo],
    };
  }),
  ...CATALOGO_AFLICOES.map((aflicao) => {
    const id = ID_DO_TERMO.aflicao(aflicao.id);
    // O estágio 0 é só a exposição, sem efeito; o primeiro que pesa é o que vale de dica.
    const primeiro = aflicao.estagios.find((estagio) => estagio.efeitos.length)?.efeitos.join(' ') || '';
    return {
      id,
      nome: aflicao.titulo,
      categoria: 'aflicao' as const,
      resumo: encurtar(`${ROTULO_TIPO_AFLICAO[aflicao.tipo].replace(/^./, (letra) => letra.toUpperCase())}, Fortitude DT ${aflicao.dtFortitude}. Primeiro estágio: ${primeiro}`),
      topico: 'aflicoes',
      rota: rotaDaAncora('aflicoes', id),
      formas: [aflicao.titulo],
    };
  }),
];

interface IMecanica {
  id: string;
  nome: string;
  formas: string[];
  topico: string;
  /** Título do h3 do tópico, como o leitor do Livro escreve. */
  secao: string;
  resumo: string;
  exigeDepois?: RegExp;
  proibeDepois?: RegExp;
}

// Texto para o jogador: sem travessão, sem "eco", sem a antítese "não é X, é Y".
const MECANICAS: IMecanica[] = [
  {
    id: 'vantagem', nome: 'Vantagem', formas: ['vantagem', 'Vantagem'], topico: 'pericias', secao: 'Vantagem e desvantagem',
    resumo: 'Role dois d20 e use o maior. Vantagem e desvantagem se cancelam uma a uma, e o que sobrar vale uma vez só.',
    proibeDepois: /^ do grau/,
  },
  {
    id: 'desvantagem', nome: 'Desvantagem', formas: ['desvantagem', 'Desvantagem'], topico: 'pericias', secao: 'Vantagem e desvantagem',
    resumo: 'Role dois d20 e use o menor. Vantagem e desvantagem se cancelam uma a uma, e o que sobrar vale uma vez só.',
  },
  {
    id: 'morrendo', nome: 'Morrendo', formas: ['Morrendo'], topico: 'ferimentos', secao: 'Morrendo',
    resumo: 'Quem chega a 0 PV cai com Morrendo 1 e rola Fortitude no fim de cada turno: falha sobe, sucesso segura, e dois sucessos seguidos ou um crítico estabilizam. Em Morrendo 3, a personagem morre.',
  },
  {
    id: 'ferido', nome: 'Ferido', formas: ['Ferido'], topico: 'ferimentos', secao: 'Remover Ferido',
    resumo: 'Quem cai e volta acorda com Ferido 1. Cada ponto soma à DT dos testes de Morrendo, e um descanso completo Bom ou melhor, com tratamento, tira 1.',
  },
  {
    id: 'deficit-de-vida', nome: 'Déficit de Vida', formas: ['Déficit de Vida'], topico: 'ferimentos', secao: 'Vida negativa',
    resumo: 'O dano que passou de 0 PV. A cura preenche o Déficit primeiro, e se ele chegar à Vida máxima a personagem morre na hora.',
  },
  {
    id: 'mutilacao', nome: 'Mutilação', formas: ['Mutilação'], topico: 'ferimentos', secao: 'Mutilação',
    resumo: 'Perder um membro para uma criatura. É sempre anunciada antes, e um sucesso no teste evita a perda.',
  },
  {
    id: 'cansaco', nome: 'Cansaço', formas: ['Cansaço'], topico: 'descanso', secao: 'Cansaço',
    resumo: 'Trilha de 0 a 6: começa em −1 nos testes físicos e termina inconsciente no 6. O descanso completo tira Cansaço.',
  },
  {
    id: 'relaxar', nome: 'Relaxar', formas: ['Relaxar'], topico: 'descanso', secao: 'Relaxar',
    resumo: 'Uma hora em segurança, uma vez entre dois descansos completos: recupera 1d6 + Mod. Sabedoria + ⌊nível ÷ 4⌋ de Mana e de Estamina.',
  },
  {
    id: 'descanso-completo', nome: 'Descanso completo', formas: ['descanso completo', 'Descanso completo', 'descansos completos'], topico: 'descanso', secao: 'Descanso completo',
    resumo: 'Oito horas. A qualidade, de Péssima a Excelente, decide quanto de Vida, Mana, Estamina e Sanidade volta e quanto Cansaço sai.',
  },
  {
    id: 'reacao', nome: 'Reação', formas: ['Reação', 'reação'], topico: 'combate', secao: 'Reações',
    resumo: 'Uma por rodada, usada no turno de outra criatura. Ela volta no começo do seu turno. As de todo mundo são Esquiva, Bloqueio, Contra-Ataque, Proteger e Ataque de Oportunidade.',
  },
  {
    id: 'esquiva', nome: 'Esquiva', formas: ['Esquiva'], topico: 'combate', secao: 'Reações',
    resumo: 'Reação antes da rolagem contra você: +4 de Defesa contra esse ataque. Se ele errar, mova 1,5 m sem provocar reação.',
  },
  {
    id: 'bloqueio', nome: 'Bloqueio', formas: ['Bloqueio'], topico: 'combate', secao: 'Reações',
    resumo: 'Reação depois de sofrer dano físico: reduz o dano em 2 + ⌊nível ÷ 2⌋ + bônus do escudo. Pede escudo ou arma que bloqueie.',
    proibeDepois: /^ de /,
  },
  {
    id: 'contra-ataque', nome: 'Contra-Ataque', formas: ['Contra-Ataque'], topico: 'combate', secao: 'Reações',
    resumo: 'Reação quando um inimigo adjacente erra você: um ataque com −2, que não pode ser crítico.',
  },
  {
    id: 'proteger', nome: 'Proteger', formas: ['Proteger'], topico: 'combate', secao: 'Reações',
    resumo: 'Reação quando um aliado adjacente é atacado: você vira o alvo e ainda pode Bloquear, se tiver reação.',
  },
  {
    id: 'ataque-de-oportunidade', nome: 'Ataque de Oportunidade', formas: ['Ataque de Oportunidade', 'ataque de oportunidade', 'ataques de oportunidade'], topico: 'combate', secao: 'Provocar reação',
    resumo: 'Reação quando um inimigo sai do seu alcance corpo a corpo ou se levanta dentro dele: um ataque corpo a corpo com −2, que não pode ser crítico. Passo cuidadoso de 1,5 m, teleporte e movimento forçado não provocam.',
  },
  {
    id: 'acao-padrao', nome: 'Ação Padrão', formas: ['Ação Padrão', 'ação padrão'], topico: 'combate', secao: 'Seu turno',
    resumo: 'A ação principal do turno: atacar, usar uma habilidade, ajudar alguém ou tentar uma manobra. Dá para trocá-la por uma segunda Ação de Movimento.',
  },
  {
    id: 'acao-de-movimento', nome: 'Ação de Movimento', formas: ['Ação de Movimento', 'ação de movimento'], topico: 'combate', secao: 'Seu turno',
    resumo: 'Se deslocar, levantar, sacar algo ou mexer num objeto que importe na cena. Uma por turno, além da Ação Padrão.',
  },
  {
    id: 'acao-completa', nome: 'Ação Completa', formas: ['Ação Completa', 'ação completa'], topico: 'combate', secao: 'Seu turno',
    resumo: 'Gasta a Ação Padrão e a Ação de Movimento do turno. Só começa se nenhuma das duas foi usada.',
  },
  {
    id: 'acao-livre', nome: 'Ação Livre', formas: ['Ação Livre', 'ação livre'], topico: 'combate', secao: 'Seu turno',
    resumo: 'Um gesto, uma fala curta ou soltar um objeto. Não faz teste, ataque nem ativa habilidade, a não ser que a regra permita.',
  },
  {
    id: 'iniciativa', nome: 'Iniciativa', formas: ['Iniciativa'], topico: 'combate', secao: 'Iniciativa',
    resumo: 'Número fixo da ficha: 10 + ⌊nível ÷ 2⌋ + Mod. Destreza + bônus. Não se rola, e decide a ordem dos turnos.',
  },
  {
    id: 'margem-de-ameaca', nome: 'Margem de ameaça', formas: ['margem de ameaça', 'Margem de ameaça', 'Margem de Ameaça'], topico: 'combate', secao: 'Ataques e cobertura',
    resumo: 'Os números do d20 que fazem crítico com a arma (20, 19-20...). Caiu na margem, é crítico, sem rolagem de confirmação.',
  },
  {
    id: 'cobertura', nome: 'Cobertura', formas: ['cobertura', 'Cobertura'], topico: 'combate', secao: 'Ataques e cobertura',
    resumo: 'Cobertura parcial dá +2 de Defesa; cobertura superior dá +5.',
  },
  {
    id: 'manobra', nome: 'Manobra', formas: ['manobra', 'manobras', 'Manobra', 'Manobras'], topico: 'combate', secao: 'Manobras',
    resumo: 'Agarrar, derrubar, empurrar, desarmar ou imobilizar: gasta a Ação Padrão e rola d20 + Luta contra 10 + Reflexos ou Fortitude do alvo.',
  },
  {
    id: 'concentracao', nome: 'Concentração', formas: ['Concentração', 'concentração'], topico: 'magia-fluxo', secao: 'Concentração',
    resumo: 'Um efeito de concentração por vez. Ao sofrer dano, role Vontade contra DT 10 ou metade do dano, o que for maior; falhou, a concentração cai.',
  },
  {
    id: 'dano-verdadeiro', nome: 'Dano verdadeiro', formas: ['dano verdadeiro', 'Dano verdadeiro'], topico: 'tipos-de-dano', secao: 'Dano verdadeiro',
    resumo: 'Nenhuma Resistência nem redução de dano vale contra ele. Só aparece quando a fonte escreve "dano verdadeiro".',
  },
  {
    id: 'resistencia', nome: 'Resistência', formas: ['Resistência'], topico: 'tipos-de-dano', secao: 'Resistência e ordem de aplicação',
    resumo: 'Tira aquele valor do dano do tipo indicado, até o mínimo 0. Entra depois do multiplicador do crítico e da vulnerabilidade.',
    exigeDepois: /^ (?:\d|a |à |ao |aos |às |contra |física|mágica|do alvo)/,
  },
  {
    id: 'sanidade', nome: 'Sanidade', formas: ['Sanidade'], topico: 'condicoes', secao: 'Sanidade',
    resumo: 'O que a mente aguenta. Ver o que não devia custa Sanidade, e abaixo de certos pontos vêm as crises.',
  },
];

let cache: ITermoDoJogo[] | null = null;

/** Todos os termos que viram link. */
export function termosDoJogo(): ITermoDoJogo[] {
  if (cache) return cache;
  cache = [
    ...termosDeCondicao(),
    ...MECANICAS.map((mecanica) => ({
      id: `mecanica-${mecanica.id}`,
      nome: mecanica.nome,
      categoria: 'mecanica' as const,
      resumo: mecanica.resumo,
      topico: mecanica.topico,
      rota: rotaDaRegra(mecanica.topico, mecanica.secao),
      formas: mecanica.formas,
      ...(mecanica.exigeDepois ? { exigeDepois: mecanica.exigeDepois } : {}),
      ...(mecanica.proibeDepois ? { proibeDepois: mecanica.proibeDepois } : {}),
    })),
  ];
  return cache;
}

/** O termo de uma condição, crise, condição de longo prazo ou aflição pelo nome exato. */
export function termoPeloNome(nome: string): ITermoDoJogo | undefined {
  const limpo = nome.trim();
  return termosDoJogo().find((termo) => termo.categoria !== 'mecanica' && termo.nome === limpo);
}

/** Seções que as mecânicas apontam, para o teste conferir que existem no Livro. */
export const SECOES_DAS_MECANICAS = MECANICAS.map(({ id, topico, secao }) => ({ id, topico, secao }));

export type TrechoComTermo = string | { texto: string; termo: ITermoDoJogo };

let buscador: { regex: RegExp; porForma: Map<string, ITermoDoJogo> } | null = null;

function montarBuscador() {
  if (buscador) return buscador;
  const porForma = new Map<string, ITermoDoJogo>();
  for (const termo of termosDoJogo()) {
    for (const forma of termo.formas) if (!porForma.has(forma)) porForma.set(forma, termo);
  }
  const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A forma mais longa primeiro: "Ataques de Pânico" ganha de "Pânico".
  const alternativas = [...porForma.keys()].sort((a, b) => b.length - a.length).map(escapar);
  const regex = new RegExp(`(?<![\\p{L}\\p{N}-])(?:${alternativas.join('|')})(?![\\p{L}\\p{N}-])`, 'gu');
  buscador = { regex, porForma };
  return buscador;
}

export interface IOpcoesDosTermos {
  /** Termos que não viram link neste texto (o próprio cartão da condição, por exemplo). */
  ignorar?: Iterable<string>;
  /** Tópico em que o texto está: termo explicado ali mesmo não vira link. */
  topicoAtual?: string;
  /** Termos que já viraram link antes, no mesmo bloco (para ligar só a primeira vez). */
  jaLigados?: Set<string>;
}

/** Corta o texto nos termos do jogo. Cada termo vira link só na primeira vez que aparece. */
export function dividirEmTermos(texto: string, opcoes: IOpcoesDosTermos = {}): TrechoComTermo[] {
  if (!texto) return [];
  const { regex, porForma } = montarBuscador();
  const ignorar = new Set(opcoes.ignorar ?? []);
  const ligados = opcoes.jaLigados ?? new Set<string>();
  const trechos: TrechoComTermo[] = [];
  let cursor = 0;
  regex.lastIndex = 0;
  for (const achado of texto.matchAll(regex)) {
    const termo = porForma.get(achado[0]);
    const inicio = achado.index ?? 0;
    const fim = inicio + achado[0].length;
    if (!termo || ignorar.has(termo.id) || ligados.has(termo.id) || termo.topico === opcoes.topicoAtual) continue;
    const depois = texto.slice(fim, fim + 24);
    if (termo.exigeDepois && !termo.exigeDepois.test(depois)) continue;
    if (termo.proibeDepois && termo.proibeDepois.test(depois)) continue;
    if (inicio > cursor) trechos.push(texto.slice(cursor, inicio));
    trechos.push({ texto: achado[0], termo });
    ligados.add(termo.id);
    cursor = fim;
  }
  if (cursor < texto.length) trechos.push(texto.slice(cursor));
  return trechos;
}

/** Dica do link: o que o termo faz e onde o Livro explica. */
export const dicaDoTermo = (termo: ITermoDoJogo) => `${termo.nome} (${ROTULO_CATEGORIA_TERMO[termo.categoria]}): ${termo.resumo} Clique para abrir no Livro, numa guia nova.`;
