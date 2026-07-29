import type { ICaracteristicaRacial, IOpcaoRacial, IRaca } from '../types/catalogo';

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
      descricao: 'Escolha uma das sete Linhagens Élficas.',
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
