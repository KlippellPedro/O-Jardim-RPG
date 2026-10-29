import type { ICaracteristicaRacial, IOpcaoRacial, IRaca } from '../types/catalogo';

/** Raça mecanicamente vazia (data/ficha/racas.json) pra quem não encontra
 * nada no catálogo que sirva: sem bônus, o jogador escreve o nome livremente
 * na ficha (`ficha.racaNomePersonalizado`). */
export const RACA_PERSONALIZADA_ID = 'raca-personalizada';

/** Nome da raça pra exibição: o texto livre do jogador quando a raça é a
 * personalizada, senão o título do catálogo. */
export function nomeExibicaoRaca(racaId: string | undefined, nomePersonalizado: string | undefined, tituloCatalogo: string | undefined): string {
  if (racaId === RACA_PERSONALIZADA_ID && nomePersonalizado?.trim()) return nomePersonalizado.trim();
  return tituloCatalogo || '';
}

/** Onde a ficha guarda as condições raciais que o Mestre marcou como cumpridas
 * (a Provação Primordial do Espírito, por exemplo). */
export const CAMPO_CONDICOES_RACIAIS = 'condicoesCumpridas';

export type CampoEscolhaRacial = 'naturezaId' | 'animalId' | 'varianteId' | 'linhagemId' | 'condicaoAncestralId' | 'naturezaDivinaId';

export interface GrupoEscolhaRacial {
  campo: CampoEscolhaRacial;
  /** Identifica o grupo na tela: o campo, mais a Natureza quando as variantes
   * de cada uma aparecem em seções separadas. */
  chave: string;
  rotulo: string;
  descricao: string;
  opcoes: IOpcaoRacial[];
  /** O jogador também pode escrever a própria opção (o animal que não está na lista).
   * O texto fica em `campoPersonalizado` da escolha racial. */
  personalizavel?: boolean;
  campoPersonalizado?: string;
}

/** Onde a ficha guarda o animal que o jogador escreveu quando o dele não está no catálogo. */
export const CAMPO_ANIMAL_PERSONALIZADO = 'animalPersonalizado';

/** O animal serve à Morfologia? Animal sem lista de Morfologias serve a qualquer uma. */
export function animalServeAMorfologia(animal: IOpcaoRacial, morfologiaId: unknown): boolean {
  const lista = animal.morfologias;
  return !morfologiaId || !Array.isArray(lista) || lista.length === 0 || lista.includes(morfologiaId);
}

const CAMPOS_ESCOLHA_RACIAL: CampoEscolhaRacial[] = [
  'naturezaId',
  'animalId',
  'varianteId',
  'linhagemId',
  'condicaoAncestralId',
  'naturezaDivinaId',
];

/** Natureza que vale para a ficha: a escolhida, a única que a raça tem ou, em
 * ficha antiga que só guardou a variante, a natureza dessa variante. Raça sem
 * `naturezas` devolve null.
 *
 * `comPadrao` completa o que falta com `natureza_padrao` da raça. É para contas
 * (estágios, traços), onde a ficha antiga sem escolha nenhuma precisa continuar
 * valendo como era. A tela de escolha não usa: quem está criando decide. */
export function obterNaturezaRacialId(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
  comPadrao = false,
): string | null {
  const naturezas = raca?.naturezas;
  if (!Array.isArray(naturezas) || naturezas.length === 0) return null;
  const existe = (id: unknown): id is string => typeof id === 'string' && naturezas.some(natureza => natureza.id === id);
  const explicita = escolhaRacial?.naturezaId;
  if (existe(explicita)) return explicita;
  if (naturezas.length === 1) return naturezas[0].id;
  const variante = raca?.variantes?.find(item => item.id === escolhaRacial?.varianteId);
  if (existe(variante?.natureza)) return variante.natureza;
  return comPadrao && existe(raca?.natureza_padrao) ? raca.natureza_padrao : null;
}

export function obterNaturezaRacial(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
  comPadrao = false,
): IOpcaoRacial | null {
  const id = obterNaturezaRacialId(raca, escolhaRacial, comPadrao);
  return id ? raca?.naturezas?.find(natureza => natureza.id === id) ?? null : null;
}

/** A variante escolhida continua valendo se a ficha trocar para essa Natureza? Variante sem `natureza`
 * vale para todas (a Morfologia da Animália vale para toda Forma); a do Espírito pertence a uma só. */
export function varianteServeANatureza(
  raca: IRaca | null | undefined,
  varianteId: unknown,
  naturezaId: unknown,
): boolean {
  const variante = raca?.variantes?.find(item => item.id === varianteId);
  return !variante?.natureza || variante.natureza === naturezaId;
}

/** Grupos de escolha da raça, na ordem em que o jogador decide.
 *
 * Com `escolhaRacial`, as variantes saem filtradas pela Natureza da ficha (e
 * ficam de fora enquanto a Natureza não está definida). Sem ele, listam todas:
 * é o que as páginas de regras mostram. Opções `somente_mestre` continuam na
 * lista; quem oferece a escolha ao jogador filtra com `opcoesEscolhiveis`. */
export function obterGruposEscolhaRacial(
  raca: IRaca | null | undefined,
  escolhaRacial?: Record<string, unknown> | null,
): GrupoEscolhaRacial[] {
  if (!raca) return [];

  const grupos: GrupoEscolhaRacial[] = [];
  const filtrarPorNatureza = escolhaRacial !== undefined && Array.isArray(raca.naturezas) && raca.naturezas.length > 0;
  // Ficha que já tem uma escolha (a Morfologia, por exemplo) e não guardou a Natureza usa a padrão da raça.
  const natureza = filtrarPorNatureza ? obterNaturezaRacial(raca, escolhaRacial, Boolean(escolhaRacial?.varianteId)) : null;

  if (Array.isArray(raca.naturezas_divinas) && raca.naturezas_divinas.length > 0) {
    grupos.push({
      campo: 'naturezaDivinaId',
      chave: 'naturezaDivinaId',
      rotulo: raca.rotulo_natureza_divina || 'Natureza Divina',
      descricao: raca.descricao_naturezas_divinas || 'Escolha se o personagem é Deus ou Semideus.',
      opcoes: raca.naturezas_divinas,
    });
  }
  // Uma Natureza só não é escolha: ela vale por padrão e não ocupa um passo.
  if (Array.isArray(raca.naturezas) && raca.naturezas.length > 1) {
    grupos.push({
      campo: 'naturezaId',
      chave: 'naturezaId',
      rotulo: raca.rotulo_natureza || 'Natureza',
      descricao: raca.descricao_naturezas || 'Escolha a natureza da raça.',
      opcoes: raca.naturezas,
    });
  }
  if (Array.isArray(raca.variantes) && raca.variantes.length > 0) {
    // Só divide as variantes por Natureza quando alguma variante pertence a uma Natureza (o Espírito).
    // Na Animália a Morfologia vale para toda Forma, então a seção é uma só.
    const secoesPorNatureza = escolhaRacial === undefined && Array.isArray(raca.naturezas) && raca.naturezas.length > 1
      && raca.variantes.some(variante => Boolean(variante.natureza));
    if (secoesPorNatureza) {
      // Páginas de regras: uma seção por Natureza, cada uma com o seu rótulo.
      for (const item of raca.naturezas!) {
        const daNatureza = raca.variantes.filter(variante => !variante.natureza || variante.natureza === item.id);
        if (daNatureza.length === 0) continue;
        grupos.push({
          campo: 'varianteId',
          chave: `varianteId:${item.id}`,
          rotulo: item.rotulo_variante || raca.rotulo_variante || 'Variante racial',
          descricao: item.descricao_variantes || raca.descricao_variantes || 'Escolha uma das opções raciais disponíveis.',
          opcoes: daNatureza,
        });
      }
    } else {
      const escondida = filtrarPorNatureza && !natureza;
      const opcoes = filtrarPorNatureza
        ? raca.variantes.filter(variante => !variante.natureza || variante.natureza === natureza?.id)
        : raca.variantes;
      if (!escondida && opcoes.length > 0) {
        grupos.push({
          campo: 'varianteId',
          chave: 'varianteId',
          rotulo: natureza?.rotulo_variante || raca.rotulo_variante || (raca.id === 'automato' ? 'Chassi' : 'Variante racial'),
          descricao: natureza?.descricao_variantes || raca.descricao_variantes || 'Escolha uma das opções raciais disponíveis.',
          opcoes,
        });
      }
    }
  }
  if (Array.isArray(raca.animais) && raca.animais.length > 0) {
    const morfologiaId = escolhaRacial?.varianteId;
    // Com a ficha na mão, o animal só aparece depois da Morfologia e já filtrado por ela.
    const aindaSemMorfologia = escolhaRacial !== undefined && !morfologiaId;
    if (!aindaSemMorfologia) {
      grupos.push({
        campo: 'animalId',
        chave: 'animalId',
        rotulo: raca.rotulo_animal || 'Animal',
        descricao: raca.descricao_animais || 'Escolha o animal da sua ficha, ou escreva o seu.',
        opcoes: escolhaRacial === undefined ? raca.animais : raca.animais.filter(animal => animalServeAMorfologia(animal, morfologiaId)),
        personalizavel: true,
        campoPersonalizado: CAMPO_ANIMAL_PERSONALIZADO,
      });
    }
  }
  if (Array.isArray(raca.linhagens) && raca.linhagens.length > 0) {
    grupos.push({
      campo: 'linhagemId',
      chave: 'linhagemId',
      rotulo: 'Linhagem Élfica',
      descricao: 'Escolha uma das seis Linhagens Élficas. Ela vem de berço e não muda mais; nenhuma é mais forte que as outras, e cada uma resolve a cena do seu jeito.',
      opcoes: raca.linhagens,
    });
  }
  if (Array.isArray(raca.condicoes_ancestrais) && raca.condicoes_ancestrais.length > 0) {
    grupos.push({
      campo: 'condicaoAncestralId',
      chave: 'condicaoAncestralId',
      rotulo: 'Condição Ancestral',
      descricao: 'Escolha a condição que explica o retorno do Desperto.',
      opcoes: raca.condicoes_ancestrais,
    });
  }
  return grupos;
}

/** O que o jogador pode marcar: opção `somente_mestre` só aparece para o
 * Mestre, ou quando já é a escolha da ficha (senão o campo ficaria sem rótulo). */
export function opcoesEscolhiveis(
  opcoes: IOpcaoRacial[],
  mestre: boolean,
  atualId?: unknown,
): IOpcaoRacial[] {
  return opcoes.filter(opcao => opcao.somente_mestre !== true || mestre || opcao.id === atualId);
}

export function escolhaRacialEstaCompleta(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): boolean {
  return obterGruposEscolhaRacial(raca, escolhaRacial ?? {}).every(grupo => {
    const valor = escolhaRacial?.[grupo.campo];
    if (typeof valor === 'string' && grupo.opcoes.some(opcao => opcao.id === valor)) return true;
    // Opção escrita pelo jogador (o animal que não está na lista) também fecha o grupo.
    const escrito = grupo.campoPersonalizado ? escolhaRacial?.[grupo.campoPersonalizado] : undefined;
    return Boolean(grupo.personalizavel) && typeof escrito === 'string' && escrito.trim().length > 0;
  });
}

export function limparEscolhasPrincipaisRaciais(
  escolhaRacial: Record<string, any> | null | undefined,
): Record<string, any> {
  const limpa = { ...(escolhaRacial || {}) };
  CAMPOS_ESCOLHA_RACIAL.forEach(campo => delete limpa[campo]);
  delete limpa[CAMPO_CONDICOES_RACIAIS];
  delete limpa[CAMPO_ANIMAL_PERSONALIZADO];
  return limpa;
}

export function obterOpcaoRacialSelecionada(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): IOpcaoRacial | null {
  for (const grupo of obterGruposEscolhaRacial(raca, escolhaRacial ?? {})) {
    const selecionada = grupo.opcoes.find(opcao => opcao.id === escolhaRacial?.[grupo.campo]);
    if (selecionada) return selecionada;
  }
  return null;
}

/** Todas as escolhas raciais válidas do personagem. Algumas raças, como o
 * Divino, pedem mais de uma escolha e precisam somar os efeitos de todas elas. */
export function obterOpcoesRaciaisSelecionadas(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): IOpcaoRacial[] {
  const selecionadas = obterGruposEscolhaRacial(raca, escolhaRacial ?? {}).flatMap(grupo => {
    const selecionada = grupo.opcoes.find(opcao => opcao.id === escolhaRacial?.[grupo.campo]);
    return selecionada ? [selecionada] : [];
  });
  // Natureza única não vira grupo, mas os traços e bônus dela valem do mesmo jeito.
  const natureza = obterNaturezaRacial(raca, escolhaRacial, true);
  if (natureza && !selecionadas.includes(natureza)) selecionadas.unshift(natureza);
  return selecionadas;
}

/** Nível total a partir do qual o traço passa a valer. Sem o campo, vale desde
 * o começo - é o caso de quase todo o catálogo. */
export function nivelMinimoTraco(traco: ICaracteristicaRacial | IOpcaoRacial): number {
  return Math.max(1, Math.trunc(Number(traco?.nivel_minimo) || 1));
}

export function tracoDisponivelNoNivel(traco: ICaracteristicaRacial, nivel: number): boolean {
  return Math.max(1, Math.trunc(Number(nivel) || 1)) >= nivelMinimoTraco(traco);
}

/** A condição racial já foi marcada como cumprida na ficha? Só o Mestre marca. */
export function condicaoRacialCumprida(
  escolhaRacial: Record<string, unknown> | null | undefined,
  condicaoId: string,
): boolean {
  const lista = escolhaRacial?.[CAMPO_CONDICOES_RACIAIS];
  return Array.isArray(lista) && lista.includes(condicaoId);
}

/** Um estágio ou traço com `requer_condicao` só vale depois de o Mestre marcar a
 * condição. Sem o campo, não depende de nada. */
function liberadoPelaCondicao(
  item: ICaracteristicaRacial | IOpcaoRacial,
  escolhaRacial: Record<string, unknown> | null | undefined,
): boolean {
  const exigida = (item as { requer_condicao?: unknown }).requer_condicao;
  return !exigida || condicaoRacialCumprida(escolhaRacial, String(exigida));
}

/** Traço que vale agora: o nível total já chegou e, se ele exige uma condição, ela foi cumprida. */
export function tracoLiberado(
  traco: ICaracteristicaRacial,
  nivel: number,
  escolhaRacial: Record<string, unknown> | null | undefined,
): boolean {
  return tracoDisponivelNoNivel(traco, nivel) && liberadoPelaCondicao(traco, escolhaRacial);
}

/** Escada de maturação da raça (Espírito: Menor, Maior, Primordial), sempre em
 * ordem crescente de nível exigido.
 *
 * Um estágio com `natureza` só vale para essa Natureza (o Demônio Menor não é
 * um Espírito Menor). Com `escolhaRacial`, devolve só a escada da ficha; sem
 * ele, todas, e é o que as páginas de regras mostram. */
export function obterEstagiosRaciais(
  raca: IRaca | null | undefined,
  escolhaRacial?: Record<string, unknown> | null,
): IOpcaoRacial[] {
  if (!Array.isArray(raca?.estagios)) return [];
  let estagios = [...raca.estagios];
  if (escolhaRacial !== undefined && Array.isArray(raca.naturezas) && raca.naturezas.length > 0) {
    const natureza = obterNaturezaRacialId(raca, escolhaRacial, true);
    estagios = estagios.filter(estagio => !estagio.natureza || estagio.natureza === natureza);
  }
  // Com mais de uma escada na lista, cada Natureza fica junta e na ordem em que a raça a declara.
  const ordemDaNatureza = (estagio: IOpcaoRacial) => raca.naturezas?.findIndex(item => item.id === estagio.natureza) ?? -1;
  return estagios.sort((a, b) => ordemDaNatureza(a) - ordemDaNatureza(b) || nivelMinimoTraco(a) - nivelMinimoTraco(b));
}

/** Estágios que o personagem já alcançou. Eles se somam: o Primordial continua
 * com o que o Maior deu. */
export function obterEstagiosRaciaisAlcancados(
  raca: IRaca | null | undefined,
  nivel: number,
  escolhaRacial?: Record<string, unknown> | null,
): IOpcaoRacial[] {
  const nivelTotal = Math.max(1, Math.trunc(Number(nivel) || 1));
  return obterEstagiosRaciais(raca, escolhaRacial).filter(estagio => (
    nivelTotal >= nivelMinimoTraco(estagio) && liberadoPelaCondicao(estagio, escolhaRacial)
  ));
}

/** O estágio atual - o último já alcançado. */
export function obterEstagioRacialAtivo(
  raca: IRaca | null | undefined,
  nivel: number,
  escolhaRacial?: Record<string, unknown> | null,
): IOpcaoRacial | null {
  const alcancados = obterEstagiosRaciaisAlcancados(raca, nivel, escolhaRacial);
  return alcancados.length > 0 ? alcancados[alcancados.length - 1] : null;
}

/** Todos os traços que valem no nível informado: os da raça, os da opção racial
 * escolhida (Fluxo, Virtude ou Pecado, linhagem, condição ancestral) e os dos estágios já
 * alcançados, cada um respeitando o próprio `nivel_minimo`. */
export function obterTracosRaciaisDisponiveis(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
  nivel: number,
): ICaracteristicaRacial[] {
  if (!raca) return [];
  const opcoes = obterOpcoesRaciaisSelecionadas(raca, escolhaRacial);
  const tracos = [
    ...(raca.caracteristicas || []),
    ...opcoes.flatMap(obterTracosOpcaoRacial),
    ...obterEstagiosRaciaisAlcancados(raca, nivel, escolhaRacial ?? {}).flatMap(estagio => estagio.caracteristicas || []),
  ];
  return tracos.filter(traco => tracoLiberado(traco, nivel, escolhaRacial));
}

export function obterTracosOpcaoRacial(opcao: IOpcaoRacial): ICaracteristicaRacial[] {
  const tracos = Array.isArray(opcao.caracteristicas) ? [...opcao.caracteristicas] : [];
  for (const chave of ['dadiva', 'cicatriz'] as const) {
    const traco = opcao[chave];
    if (traco && typeof traco === 'object' && traco.titulo) tracos.push(traco);
  }
  return tracos;
}

/** O animal escolhido no catálogo, se houver. */
export function obterAnimalRacial(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): IOpcaoRacial | null {
  const id = escolhaRacial?.animalId;
  return typeof id === 'string' ? raca?.animais?.find(animal => animal.id === id) ?? null : null;
}

/** A arma natural que a Forma dá (a Fera morde com dano base 1d8, o Híbrido com 1d6, os Traços não têm). O nome
 * vem do animal escolhido ("Garra de Leão"); sem animal do catálogo, ou com um que o jogador escreveu, fica
 * "Arma natural". O ataque nasce da escolha racial e não é gravado na ficha: trocar de Forma já o troca. */
export interface IArmaNaturalRacial {
  nome: string;
  dano: string;
}

export function obterArmaNaturalRacial(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): IArmaNaturalRacial | null {
  const forma = obterNaturezaRacial(raca, escolhaRacial, true);
  const dano = forma?.arma_natural_dano;
  if (!forma || forma.sem_arma_natural || typeof dano !== 'string' || !dano) return null;
  const animal = obterAnimalRacial(raca, escolhaRacial);
  const arma = typeof animal?.arma_natural === 'string' ? animal.arma_natural : '';
  return { nome: arma && animal ? `${arma} de ${animal.titulo}` : 'Arma natural', dano };
}

/** Tamanho que a raça dá: o da Forma, quando ela fixa um (os Traços da Animália têm corpo de pessoa,
 * qualquer que seja o animal); senão o do animal escolhido (um rato é Pequeno, um rinoceronte é Grande);
 * senão o da variante, quando a raça fixa o tamanho por ela (Golem, Fada). */
export function obterTamanhoRacial(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): string | null {
  const daForma = obterNaturezaRacial(raca, escolhaRacial, true)?.tamanho;
  if (typeof daForma === 'string' && daForma) return daForma;
  const doAnimal = obterAnimalRacial(raca, escolhaRacial)?.tamanho;
  if (typeof doAnimal === 'string' && doAnimal) return doAnimal;
  const variante = raca?.variantes?.find(item => item.id === escolhaRacial?.varianteId);
  return typeof variante?.tamanho === 'string' && variante.tamanho ? variante.tamanho : null;
}

const juntarNomes = (nomes: string[]) => (nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0]);

/** A frase da língua do povo, para a página da raça e o Livro. Sem língua
 * própria, o povo fala o Universal, que é de todos; quem veio de outro povo
 * traz a própria frase em `linguas_nota`. Raça sem o campo não ganha frase. */
export function fraseDaLinguaDoPovo(raca: IRaca | null | undefined): string | null {
  if (!raca || !Array.isArray(raca.linguas)) return null;
  const nomes = raca.linguas.map((lingua) => {
    const natureza = raca.naturezas?.find((item) => item.id === lingua.natureza)?.titulo;
    return natureza ? `${lingua.titulo} (${natureza})` : lingua.titulo;
  });
  if (nomes.length) {
    const propria = `${nomes.length > 1 ? 'Línguas' : 'Língua'} do povo: ${juntarNomes(nomes)}. Como todo mundo, também fala o Universal.`;
    return raca.linguas_nota ? `${propria} ${raca.linguas_nota}` : propria;
  }
  return raca.linguas_nota || 'Este povo não tem língua própria e fala o Universal, a língua de todos.';
}

export function descreverOpcaoRacial(opcao: IOpcaoRacial): string {
  if (opcao.descricao) return opcao.descricao;
  if (typeof opcao.motivo_retorno === 'string') return opcao.motivo_retorno;
  const nomes = obterTracosOpcaoRacial(opcao).map(traco => traco.titulo);
  return nomes.length > 0 ? nomes.join(', ') : 'Consulte os efeitos desta escolha nas regras da raça.';
}

/** Uma variante sem `descricao` ou `motivo_retorno` próprios faz
 * `descreverOpcaoRacial` cair no fallback que só repete o nome dos traços -
 * texto redundante ao lado do título da própria opção. Páginas com coluna ou
 * bloco de "Descrição" devem chamar isto antes de renderizá-lo. */
export function temDescricaoPropria(opcao: IOpcaoRacial): boolean {
  return Boolean(opcao.descricao) || typeof opcao.motivo_retorno === 'string';
}

function numeroComSinal(valor: unknown): string {
  const numero = Number(valor) || 0;
  return `${numero >= 0 ? '+' : ''}${numero}`;
}

export function formatarAjustesRaciais(raca: IRaca): string {
  return [
    `Vida: ${numeroComSinal(raca.vida)}`,
    `Mana: ${numeroComSinal(raca.mana)}`,
    `Movimento: ${numeroComSinal(raca.movimento)} m`,
  ].join(' | ');
}
