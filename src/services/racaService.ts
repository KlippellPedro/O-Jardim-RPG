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

export type CampoEscolhaRacial = 'varianteId' | 'linhagemId' | 'condicaoAncestralId';

export interface GrupoEscolhaRacial {
  campo: CampoEscolhaRacial;
  rotulo: string;
  descricao: string;
  opcoes: IOpcaoRacial[];
}

const CAMPOS_ESCOLHA_RACIAL: CampoEscolhaRacial[] = [
  'varianteId',
  'linhagemId',
  'condicaoAncestralId',
];

export function obterGruposEscolhaRacial(raca: IRaca | null | undefined): GrupoEscolhaRacial[] {
  if (!raca) return [];

  const grupos: GrupoEscolhaRacial[] = [];
  if (Array.isArray(raca.variantes) && raca.variantes.length > 0) {
    grupos.push({
      campo: 'varianteId',
      rotulo: raca.rotulo_variante || (raca.id === 'automato' ? 'Chassi' : 'Variante racial'),
      descricao: raca.descricao_variantes || 'Escolha uma das opções raciais disponíveis.',
      opcoes: raca.variantes,
    });
  }
  if (Array.isArray(raca.linhagens) && raca.linhagens.length > 0) {
    grupos.push({
      campo: 'linhagemId',
      rotulo: 'Linhagem Élfica',
      descricao: 'Escolha uma das seis Linhagens Élficas. Ela vem de berço e não muda mais; nenhuma é mais forte que as outras, e cada uma resolve a cena do seu jeito.',
      opcoes: raca.linhagens,
    });
  }
  if (Array.isArray(raca.condicoes_ancestrais) && raca.condicoes_ancestrais.length > 0) {
    grupos.push({
      campo: 'condicaoAncestralId',
      rotulo: 'Condição Ancestral',
      descricao: 'Escolha a condição que explica o retorno do Desperto.',
      opcoes: raca.condicoes_ancestrais,
    });
  }
  return grupos;
}

export function escolhaRacialEstaCompleta(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): boolean {
  return obterGruposEscolhaRacial(raca).every(grupo => {
    const valor = escolhaRacial?.[grupo.campo];
    return typeof valor === 'string' && grupo.opcoes.some(opcao => opcao.id === valor);
  });
}

export function limparEscolhasPrincipaisRaciais(
  escolhaRacial: Record<string, any> | null | undefined,
): Record<string, any> {
  const limpa = { ...(escolhaRacial || {}) };
  CAMPOS_ESCOLHA_RACIAL.forEach(campo => delete limpa[campo]);
  return limpa;
}

export function obterOpcaoRacialSelecionada(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
): IOpcaoRacial | null {
  for (const grupo of obterGruposEscolhaRacial(raca)) {
    const selecionada = grupo.opcoes.find(opcao => opcao.id === escolhaRacial?.[grupo.campo]);
    if (selecionada) return selecionada;
  }
  return null;
}

/** Nível total a partir do qual o traço passa a valer. Sem o campo, vale desde
 * o começo - é o caso de quase todo o catálogo. */
export function nivelMinimoTraco(traco: ICaracteristicaRacial | IOpcaoRacial): number {
  return Math.max(1, Math.trunc(Number(traco?.nivel_minimo) || 1));
}

export function tracoDisponivelNoNivel(traco: ICaracteristicaRacial, nivel: number): boolean {
  return Math.max(1, Math.trunc(Number(nivel) || 1)) >= nivelMinimoTraco(traco);
}

/** Escada de maturação da raça (hoje só o Espírito: Menor, Maior, Primordial),
 * sempre em ordem crescente de nível exigido. */
export function obterEstagiosRaciais(raca: IRaca | null | undefined): IOpcaoRacial[] {
  if (!Array.isArray(raca?.estagios)) return [];
  return [...raca.estagios].sort((a, b) => nivelMinimoTraco(a) - nivelMinimoTraco(b));
}

/** Estágios que o personagem já alcançou. Eles se somam: o Primordial continua
 * com o que o Maior deu. */
export function obterEstagiosRaciaisAlcancados(raca: IRaca | null | undefined, nivel: number): IOpcaoRacial[] {
  const nivelTotal = Math.max(1, Math.trunc(Number(nivel) || 1));
  return obterEstagiosRaciais(raca).filter(estagio => nivelTotal >= nivelMinimoTraco(estagio));
}

/** O estágio atual - o último já alcançado. */
export function obterEstagioRacialAtivo(raca: IRaca | null | undefined, nivel: number): IOpcaoRacial | null {
  const alcancados = obterEstagiosRaciaisAlcancados(raca, nivel);
  return alcancados.length > 0 ? alcancados[alcancados.length - 1] : null;
}

/** Todos os traços que valem no nível informado: os da raça, os da opção racial
 * escolhida (Cor da Alma, linhagem, condição ancestral) e os dos estágios já
 * alcançados, cada um respeitando o próprio `nivel_minimo`. */
export function obterTracosRaciaisDisponiveis(
  raca: IRaca | null | undefined,
  escolhaRacial: Record<string, unknown> | null | undefined,
  nivel: number,
): ICaracteristicaRacial[] {
  if (!raca) return [];
  const opcao = obterOpcaoRacialSelecionada(raca, escolhaRacial);
  const tracos = [
    ...(raca.caracteristicas || []),
    ...(opcao ? obterTracosOpcaoRacial(opcao) : []),
    ...obterEstagiosRaciaisAlcancados(raca, nivel).flatMap(estagio => estagio.caracteristicas || []),
  ];
  return tracos.filter(traco => tracoDisponivelNoNivel(traco, nivel));
}

export function obterTracosOpcaoRacial(opcao: IOpcaoRacial): ICaracteristicaRacial[] {
  const tracos = Array.isArray(opcao.caracteristicas) ? [...opcao.caracteristicas] : [];
  for (const chave of ['dadiva', 'cicatriz'] as const) {
    const traco = opcao[chave];
    if (traco && typeof traco === 'object' && traco.titulo) tracos.push(traco);
  }
  return tracos;
}

export function descreverOpcaoRacial(opcao: IOpcaoRacial): string {
  if (opcao.descricao) return opcao.descricao;
  if (typeof opcao.motivo_retorno === 'string') return opcao.motivo_retorno;
  const nomes = obterTracosOpcaoRacial(opcao).map(traco => traco.titulo);
  return nomes.length > 0 ? nomes.join(', ') : 'Consulte os efeitos desta escolha nas regras da raça.';
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
