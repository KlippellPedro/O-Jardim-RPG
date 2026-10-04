import {
  ARQUETIPOS_CRIATURA,
  ORDEM_DOS_ARQUETIPOS,
  PAPEIS_CRIATURA,
  escalarCriatura,
  modeloDeCriatura,
  vdValido,
  vidaDeCriatura,
  type ArquetipoCriatura,
  type PapelCriatura,
} from './curvaCriatura';
import type { BestiarioMonstro } from './sessaoApi';

/**
 * Montador de encontro: o Mestre diz o nível do grupo, quantos jogadores e a
 * dificuldade, e sai uma lista de criaturas do Bestiário já escaladas para o VD.
 *
 * A conta é a do Guia do Mestre: uma unidade de orçamento é a Vida de um
 * inimigo padrão, aquela que um grupo de quatro leva cerca de quatro rodadas e
 * meia para derrubar. Cada papel gasta uma fatia dessa unidade (lacaio 0,1,
 * padrão 0,25, elite 0,5, chefe 1), então o encontro fecha quando a soma das
 * fatias chega ao orçamento.
 */

export type Dificuldade = 'facil' | 'padrao' | 'dificil' | 'mortal';

export const DIFICULDADES: Record<Dificuldade, { rotulo: string; multiplicador: number; descricao: string }> = {
  facil: { rotulo: 'Fácil', multiplicador: 0.65, descricao: 'Cerca de três rodadas, e o grupo sai com pouco desgaste.' },
  padrao: { rotulo: 'Padrão', multiplicador: 1, descricao: 'Cerca de quatro rodadas e meia, gastando recurso.' },
  dificil: { rotulo: 'Difícil', multiplicador: 1.3, descricao: 'Cerca de seis rodadas. Aperta, e alguém cai se o grupo errar o plano.' },
  mortal: { rotulo: 'Mortal', multiplicador: 1.6, descricao: 'Passa das sete rodadas e pode matar. Só com saída, recuo ou ajuda de cenário.' },
};
export const ORDEM_DAS_DIFICULDADES: readonly Dificuldade[] = ['facil', 'padrao', 'dificil', 'mortal'];

export type EstiloEncontro = 'auto' | 'bando' | 'lider' | 'chefe' | 'elites' | 'duelo';

export const ESTILOS: Record<EstiloEncontro, { rotulo: string; descricao: string }> = {
  auto: { rotulo: 'Automático', descricao: 'Escolhe um estilo que cabe no orçamento.' },
  bando: { rotulo: 'Bando', descricao: 'Muitos inimigos fracos e alguns padrão, todos do mesmo povo.' },
  lider: { rotulo: 'Líder e capangas', descricao: 'Um elite no comando e lacaios em volta.' },
  chefe: { rotulo: 'Chefe e escolta', descricao: 'Um chefe que anuncia o golpe forte, com escolta quando o orçamento sobra.' },
  elites: { rotulo: 'Elites', descricao: 'Poucos inimigos fortes, sem multidão.' },
  duelo: { rotulo: 'Duelo', descricao: 'Uma criatura só, do papel que mais se aproxima do orçamento.' },
};

export interface ParametrosDoEncontro {
  nivel: number;
  jogadores: number;
  dificuldade: Dificuldade;
  estilo: EstiloEncontro;
  /** Id de uma família do Bestiário, ou nulo para deixar o montador escolher um tema. */
  familia: string | null;
  /** Deixa uma criatura única ocupar a vaga de chefe. */
  incluirUnicas: boolean;
  /** Muda o sorteio sem mudar nada do resto. */
  semente: number;
  /** Quantas vezes o Mestre pediu para trocar cada vaga (chave = posição da vaga). */
  trocas?: Record<number, number>;
}

/** O que a criatura faz além de bater: cada tipo pesa um pouco no orçamento, mesmo sem mudar a Vida dela. */
export type TipoDeAmeaca = 'cura' | 'controle' | 'area';

export interface AmeacaDeHabilidades {
  tipos: TipoDeAmeaca[];
  /** Fração do custo da vaga que as habilidades acrescentam (0,1 = 10%). */
  extra: number;
}

export interface VagaDoEncontro {
  chave: string;
  posicao: number;
  papel: PapelCriatura;
  monstro: BestiarioMonstro;
  ameaca: AmeacaDeHabilidades;
  /** A criatura do Bestiário que serviu de base (nulo quando saiu do gerador por VD). */
  baseTitulo: string | null;
}

export interface EncontroMontado {
  /** Quanto do orçamento as habilidades (cura, controle, área) já gastaram, em unidades de Vida de inimigo padrão. */
  pesoDasHabilidades: number;
  orcamento: number;
  gasto: number;
  estiloUsado: Exclude<EstiloEncontro, 'auto'>;
  tema: string | null;
  vagas: VagaDoEncontro[];
  xpTotal: number;
  vidaTotal: number;
  aviso: string | null;
}

export const LIMITE_DE_CRIATURAS = 12;
export const NIVEL_MAXIMO_DO_MONTADOR = 1000;
/** O ajuste de Vida para a curva nunca passa de 40% para cima nem para baixo. */
const FATOR_MAXIMO_DE_AJUSTE = 1.4;

const arredondarVida = (valor: number): number => (valor < 30 ? Math.max(1, Math.round(valor)) : Math.round(valor / 5) * 5);

export const PESO_DA_AMEACA: Record<TipoDeAmeaca, number> = { cura: 0.08, controle: 0.12, area: 0.1 };
export const ROTULO_DA_AMEACA: Record<TipoDeAmeaca, string> = { cura: 'Cura', controle: 'Controle', area: 'Área' };
const LIMITE_DA_AMEACA = 0.25;

const MARCAS_DA_AMEACA: Record<TipoDeAmeaca, RegExp> = {
  cura: /\b(cura|curar|regenera\w*|recupera\w*|restaura\w*|revive|ressuscita\w*)\b/i,
  controle: /(atordo|paralis|imobiliz|derruba|amedront|confus[ãa]o|confunde|enfeiti|\bsono\b|petrific|cegueira|\bcego\b|domina[rç]|agarra|prende|\blent[oa]\b|\bmedo\b)/i,
  // `\b` só enxerga letras ASCII e não casa antes de "á": a palavra com acento usa lookaround Unicode.
  area: /((?<!\p{L})áreas?(?!\p{L})|\bcone\b|rajada|explos|\bonda\b|\bsopro\b|nuvem|todas as criaturas|cada criatura|todos os alvos)/iu,
};

/** Lê as habilidades e os ataques da criatura e diz que tipo de ameaça extra ela traz (cura, controle, área). */
export function ameacaDeHabilidades(monstro: Pick<BestiarioMonstro, 'habilidades' | 'ataques'>): AmeacaDeHabilidades {
  const texto = [...monstro.habilidades, ...monstro.ataques.map((ataque) => `${ataque.nome} ${ataque.detalhe ?? ''}`)].join(' ');
  const tipos = (Object.keys(MARCAS_DA_AMEACA) as TipoDeAmeaca[]).filter((tipo) => MARCAS_DA_AMEACA[tipo].test(texto));
  const extra = Math.min(LIMITE_DA_AMEACA, tipos.reduce((soma, tipo) => soma + PESO_DA_AMEACA[tipo], 0));
  return { tipos, extra: Math.round(extra * 100) / 100 };
}

const PAPEIS_DO_ENCONTRO: readonly PapelCriatura[] = ['lacaio', 'padrao', 'elite', 'chefe'];
const fatia = (papel: PapelCriatura) => PAPEIS_CRIATURA[papel].fatiaDeVida;

/** Gerador pseudoaleatório pequeno e repetível: a mesma semente dá o mesmo encontro. */
export function sorteador(semente: number): () => number {
  let estado = (Math.trunc(semente) >>> 0) || 1;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function orcamentoDoEncontro(jogadores: number, dificuldade: Dificuldade): number {
  const quantos = Math.min(10, Math.max(1, Math.trunc(Number(jogadores)) || 4));
  return Math.round((quantos / 4) * DIFICULDADES[dificuldade].multiplicador * 100) / 100;
}

/** Enche o orçamento com os papéis permitidos, do maior que cabe para o menor, sem passar do limite. */
function encher(restante: number, permitidos: readonly PapelCriatura[], limite: number): PapelCriatura[] {
  const ordenados = [...permitidos].sort((a, b) => fatia(b) - fatia(a));
  const menor = ordenados[ordenados.length - 1];
  const saida: PapelCriatura[] = [];
  let sobra = restante;
  while (saida.length < limite && sobra >= fatia(menor) * 0.6) {
    const cabe = ordenados.find((papel) => fatia(papel) <= sobra + 0.04);
    const escolhido = cabe ?? menor;
    saida.push(escolhido);
    sobra -= fatia(escolhido);
  }
  return saida;
}

export function planejarPapeis(estilo: Exclude<EstiloEncontro, 'auto'>, orcamento: number): PapelCriatura[] {
  const maisProximo = (alvo: number): PapelCriatura => PAPEIS_DO_ENCONTRO.reduce(
    (melhor, papel) => (Math.abs(fatia(papel) - alvo) < Math.abs(fatia(melhor) - alvo) ? papel : melhor),
  );
  switch (estilo) {
    case 'duelo':
      return [maisProximo(orcamento)];
    case 'chefe': {
      const principal: PapelCriatura = orcamento >= 0.9 ? 'chefe' : orcamento >= 0.45 ? 'elite' : 'padrao';
      const escolta = orcamento >= 2.2 ? ['elite', 'padrao', 'lacaio'] as const : ['padrao', 'lacaio'] as const;
      return [principal, ...encher(orcamento - fatia(principal), escolta, LIMITE_DE_CRIATURAS - 1)];
    }
    case 'lider': {
      const principal: PapelCriatura = orcamento >= 0.75 ? 'elite' : 'padrao';
      return [principal, ...encher(orcamento - fatia(principal), ['lacaio', 'padrao'], LIMITE_DE_CRIATURAS - 1)];
    }
    case 'elites': {
      const lista = encher(orcamento, ['elite', 'padrao', 'lacaio'], 8);
      return lista.length ? lista : ['padrao'];
    }
    case 'bando':
    default: {
      // Bando de verdade: uns poucos padrão para dar corpo e o resto em lacaios, que são muitos.
      const corpo = orcamento >= 0.6 ? encher(orcamento * 0.4, ['padrao'], 4) : [];
      const gastoDoCorpo = corpo.reduce((soma, papel) => soma + fatia(papel), 0);
      const lacaios = encher(orcamento - gastoDoCorpo, ['lacaio'], Math.min(6, LIMITE_DE_CRIATURAS - corpo.length));
      const lista = [...corpo, ...lacaios];
      let sobra = orcamento - lista.reduce((soma, papel) => soma + fatia(papel), 0);
      // Seis lacaios já formam o bando: o que sobrar do orçamento vira mais padrão.
      while (sobra >= fatia('padrao') * 0.6 && lista.length < LIMITE_DE_CRIATURAS) {
        lista.push('padrao');
        sobra -= fatia('padrao');
      }
      return lista.length ? lista : ['lacaio'];
    }
  }
}

function escolherEstilo(orcamento: number, sorteio: () => number): Exclude<EstiloEncontro, 'auto'> {
  const candidatos: Array<Exclude<EstiloEncontro, 'auto'>> = orcamento < 0.35
    ? ['bando', 'duelo']
    : orcamento < 0.8
      ? ['lider', 'bando', 'elites']
      : orcamento < 1.6
        ? ['chefe', 'lider', 'bando', 'elites']
        : ['chefe', 'elites', 'bando'];
  return candidatos[Math.floor(sorteio() * candidatos.length)];
}

const eCriaturaDeEncontro = (monstro: BestiarioMonstro) => (
  monstro.categoria !== 'Universal'
  && monstro.categoria !== 'Deidade'
  && monstro.pv != null
  && monstro.ataques.length > 0
  && monstro.vd != null
);

const distanciaDeVd = (monstro: BestiarioMonstro, nivel: number) => Math.abs((monstro.vd ?? 9999) - nivel);

function escolherTema(pool: BestiarioMonstro[], nivel: number, sorteio: () => number): string | null {
  const alcance = Math.max(10, Math.round(nivel * 0.5));
  const porCategoria = new Map<string, number>();
  for (const monstro of pool) {
    if (!monstro.categoria || distanciaDeVd(monstro, nivel) > alcance) continue;
    porCategoria.set(monstro.categoria, (porCategoria.get(monstro.categoria) ?? 0) + 1);
  }
  // Um tema precisa de criaturas para variar; categoria com duas ou três não vira povo.
  const temas = [...porCategoria.entries()].filter(([, quantos]) => quantos >= 4).map(([categoria]) => categoria).sort();
  return temas.length ? temas[Math.floor(sorteio() * temas.length)] : null;
}

/** A ficha que o gerador por VD monta, no formato do Bestiário (o servidor monta o saque pelo id). */
export function monstroDoGerador(vd: number, papel: PapelCriatura, arquetipo: ArquetipoCriatura): BestiarioMonstro {
  const modelo = modeloDeCriatura(vd, papel, arquetipo);
  return {
    id: `sob-medida-${modelo.vd}-${papel}-${arquetipo}`,
    titulo: `Criatura de VD ${modelo.vd} (${modelo.papelRotulo}${arquetipo === 'comum' ? '' : `, ${modelo.arquetipoRotulo}`})`,
    nivel: modelo.vd,
    classe: 'Sob medida',
    categoria: 'Universal',
    descricao: null,
    vd: modelo.vd,
    xp: modelo.xp,
    pv: modelo.pv,
    defesa: modelo.defesa,
    mana: modelo.mana,
    estamina: modelo.estamina,
    iniciativa: modelo.iniciativa,
    ataques: modelo.ataques,
    pericias: modelo.pericias,
    habilidades: modelo.habilidades,
    papel,
  };
}

/** Leva uma criatura do Bestiário para o nível e para o papel da vaga, mantendo nome, família e habilidades dela. */
export function escalarParaAVaga(base: BestiarioMonstro, nivel: number, papel: PapelCriatura): BestiarioMonstro {
  const escalada = escalarCriatura({
    vd: base.vd ?? nivel,
    pv: base.pv ?? 1,
    defesa: base.defesa,
    mana: base.mana,
    estamina: base.estamina,
    iniciativa: base.iniciativa ?? 10,
    ataques: base.ataques.map((ataque) => ({ nome: ataque.nome, detalhe: ataque.detalhe ?? '' })),
    pericias: base.pericias,
  }, nivel, { papelDe: 'solo', papelPara: papel });
  const modelo = modeloDeCriatura(nivel, papel);
  const habilidades = [...base.habilidades];
  const golpe = modelo.habilidades.find((habilidade) => habilidade.startsWith('Golpe Anunciado'));
  if (golpe && !habilidades.some((habilidade) => habilidade.includes('Golpe Anunciado'))) habilidades.push(golpe);
  return {
    ...base,
    vd: escalada.vd,
    nivel: escalada.vd,
    xp: modelo.xp,
    papel,
    pv: escalada.pv,
    defesa: escalada.defesa ?? base.defesa,
    mana: escalada.mana ?? base.mana,
    estamina: escalada.estamina ?? base.estamina,
    iniciativa: escalada.iniciativa,
    ataques: escalada.ataques,
    pericias: escalada.pericias,
    habilidades,
  };
}

/** Monta o encontro. Sem criatura no Bestiário que sirva, a vaga sai do gerador por VD. */
export function montarEncontro(bestiario: BestiarioMonstro[], parametros: ParametrosDoEncontro): EncontroMontado {
  const nivel = vdValido(Math.min(NIVEL_MAXIMO_DO_MONTADOR, parametros.nivel));
  const orcamento = orcamentoDoEncontro(parametros.jogadores, parametros.dificuldade);
  const sorteioGeral = sorteador(parametros.semente);
  const estiloUsado = parametros.estilo === 'auto' ? escolherEstilo(orcamento, sorteioGeral) : parametros.estilo;
  const papeis = planejarPapeis(estiloUsado, orcamento);

  const pool = bestiario.filter(eCriaturaDeEncontro);
  const comuns = pool.filter((monstro) => !monstro.unico);
  const base = parametros.familia ? comuns.filter((monstro) => monstro.familia === parametros.familia) : comuns;
  const tema = parametros.familia ? null : escolherTema(base, nivel, sorteioGeral);
  const doTema = tema ? base.filter((monstro) => monstro.categoria === tema) : base;
  const unicas = parametros.incluirUnicas
    ? pool.filter((monstro) => monstro.unico && (!parametros.familia || monstro.familia === parametros.familia))
    : [];

  const usadas = new Map<string, number>();
  const vagasSorteadas: VagaDoEncontro[] = papeis.map((papel, posicao) => {
    const sorteio = sorteador(parametros.semente + posicao * 7919 + (parametros.trocas?.[posicao] ?? 0) * 104729);
    const candidatas = (papel === 'chefe' && unicas.length ? [...doTema, ...unicas] : doTema)
      .filter((monstro) => papel === 'chefe' || !monstro.unico);
    // As mais próximas do nível entram no sorteio; as já usadas ficam para o fim.
    const ordenadas = [...candidatas].sort((a, b) => (
      (usadas.get(a.id) ?? 0) - (usadas.get(b.id) ?? 0)
      || distanciaDeVd(a, nivel) - distanciaDeVd(b, nivel)
      || a.titulo.localeCompare(b.titulo, 'pt-BR')
    ));
    // Só entram no sorteio as menos repetidas, para o bando não sair com a mesma criatura três vezes.
    const menosUsadas = ordenadas.filter((monstro) => (usadas.get(monstro.id) ?? 0) === (usadas.get(ordenadas[0].id) ?? 0));
    const baseDaVaga = ordenadas.length ? menosUsadas[Math.floor(sorteio() * Math.min(6, menosUsadas.length))] : null;
    if (baseDaVaga) usadas.set(baseDaVaga.id, (usadas.get(baseDaVaga.id) ?? 0) + 1);
    const monstro = baseDaVaga
      ? escalarParaAVaga(baseDaVaga, nivel, papel)
      : monstroDoGerador(nivel, papel, ORDEM_DOS_ARQUETIPOS[Math.floor(sorteio() * ORDEM_DOS_ARQUETIPOS.length)]);
    return {
      chave: `${posicao}:${monstro.id}:${papel}:${parametros.trocas?.[posicao] ?? 0}`,
      posicao,
      papel,
      monstro,
      ameaca: ameacaDeHabilidades(monstro),
      baseTitulo: baseDaVaga?.titulo ?? null,
    };
  });

  // As criaturas do Bestiário fogem da curva (de metade a um pouco acima dela). Para a dificuldade pedida valer de
  // verdade, a Vida das vagas é levada à Vida que a curva dá para esses papéis. A criatura que cura, controla ou
  // atinge área recebe menos Vida na mesma proporção em que a habilidade pesa: ela pesa na luta sem ser só Vida.
  const vidaAlvo = vagasSorteadas.reduce((soma, vaga) => soma + vidaDeCriatura(nivel, vaga.papel) / (1 + vaga.ameaca.extra), 0);
  const vidaComPeso = vagasSorteadas.reduce((soma, vaga) => soma + (vaga.monstro.pv ?? 0) / (1 + vaga.ameaca.extra), 0);
  const fatorDeVida = vidaComPeso > 0 ? Math.min(FATOR_MAXIMO_DE_AJUSTE, Math.max(1 / FATOR_MAXIMO_DE_AJUSTE, vidaAlvo / vidaComPeso)) : 1;
  const vagas = vagasSorteadas.map((vaga) => ({
    ...vaga,
    monstro: {
      ...vaga.monstro,
      pv: vaga.monstro.pv == null ? vaga.monstro.pv : arredondarVida((vaga.monstro.pv * fatorDeVida) / (1 + vaga.ameaca.extra)),
    },
  }));
  const pesoDasHabilidades = vagas.reduce((soma, vaga) => soma + fatia(vaga.papel) * vaga.ameaca.extra, 0);

  const gasto = Math.round(vagas.reduce((soma, vaga) => soma + fatia(vaga.papel), 0) * 100) / 100;
  let aviso: string | null = null;
  if (gasto < orcamento * 0.7) aviso = 'O estilo escolhido não fecha o orçamento. Use "Chefe e escolta" ou "Elites" para encher a cena, ou aceite um encontro mais leve.';
  else if (gasto > orcamento * 1.3) aviso = 'O menor encontro do estilo já passa do orçamento: ele sai mais difícil do que a dificuldade pedida.';
  if (!pool.length) aviso = 'O Bestiário ainda não carregou: as vagas saíram do gerador por VD.';

  return {
    orcamento,
    gasto,
    estiloUsado,
    tema,
    vagas,
    pesoDasHabilidades: Math.round(pesoDasHabilidades * 100) / 100,
    xpTotal: vagas.reduce((soma, vaga) => soma + vaga.monstro.xp, 0),
    vidaTotal: vagas.reduce((soma, vaga) => soma + (vaga.monstro.pv ?? 0), 0),
    aviso,
  };
}

/**
 * Quantas rodadas o grupo leva para derrubar o encontro inteiro. A conta é a do Guia: o grupo de quatro
 * tira, por rodada, a Vida de um inimigo padrão do nível dividida por 4,5, e o dano cresce com o número de jogadores.
 */
export function rodadasEsperadas(encontro: EncontroMontado, jogadores: number): number {
  const nivel = encontro.vagas[0]?.monstro.vd;
  if (!nivel || !encontro.vidaTotal) return 0;
  const jogadoresValidos = Math.min(10, Math.max(1, Math.trunc(Number(jogadores)) || 4));
  const danoPorRodada = (vidaDeCriatura(nivel, 'chefe') * jogadoresValidos) / (4 * 4.5);
  return Math.round((encontro.vidaTotal / danoPorRodada) * 10) / 10;
}

export { ARQUETIPOS_CRIATURA };
