export interface IStatusVital {
  vidaAtual?: number;
  manaAtual?: number;
  sanidadeAtual?: number;
  cansacoAtual?: number;
  morrendo?: number;
  ferido?: number;
  estabilizado?: boolean;
  morto?: boolean;
  [key: string]: unknown;
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

/**
 * Cobertura de automação mecânica das condições oficiais (data/regras/condicoes.ts)
 * neste arquivo — mapa de quem tem efeito numérico aplicado automaticamente
 * aqui vs. quem depende de leitura manual do texto da condição. Registrado
 * explicitamente por pedido de auditoria (2026-08): nenhuma automação nova foi
 * criada, isto só documenta o que já existia.
 *
 * Automatizadas aqui (Defesa/Iniciativa/movimento/ataque):
 *  - Atordoado, Inconsciente, Exposto, crise Fúria → penalidadeDefesaCondicoes
 *  - Surpreendido → penalidadeIniciativaCondicoes
 *  - Caído → penalidadeAtaqueCondicoes
 *  - Agarrado, Imobilizado, Inconsciente → movimentoBloqueadoPorCondicao
 *
 * Só informativas aqui (efeito descrito em condicoes.ts, aplicado na mesa,
 * não calculado por nenhuma função deste arquivo):
 *  - Sangramento (dano periódico), Cego (desvantagem em teste visual),
 *    Concentrando (teste de Vontade ao sofrer dano), Amedrontado, Caído
 *    (efeito sobre quem ataca você), e as 5 crises de sanidade além de Fúria.
 */
export function penalidadeDefesaCondicoes(condicoes: unknown): number {
  const ids = idsCondicoes(condicoes);
  let penalidade = 0;
  if (ids.has('exposto')) penalidade += 2;
  if (ids.has('atordoado')) penalidade += 5;
  if (ids.has('inconsciente')) penalidade += 5;
  if (ids.has('furia') || ids.has('crise-furia')) penalidade += 2;
  return penalidade;
}

export function penalidadeIniciativaCondicoes(condicoes: unknown): number {
  return condicaoAtiva(condicoes, 'surpreendido') ? -5 : 0;
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

export function movimentoBloqueadoPorCondicao(condicoes: unknown): boolean {
  const ids = idsCondicoes(condicoes);
  return ids.has('agarrado') || ids.has('imobilizado') || ids.has('inconsciente');
}

export function limiteMorrendo(constituicao: unknown): 3 | 4 {
  return Number(constituicao) >= 20 ? 4 : 3;
}

export function atualizarStatusVital(
  statusAtual: IStatusVital,
  campo: string,
  alteracao: number,
  maximo: number,
  constituicao: unknown,
): IStatusVital {
  const maximoSeguro = Math.max(1, Number(maximo) || 1);
  const valorAtual = Number(statusAtual[campo] ?? (campo === 'cansacoAtual' ? 0 : maximoSeguro));
  const minimo = campo === 'vidaAtual' ? -maximoSeguro : 0;
  const proximoValor = Math.max(minimo, Math.min(maximoSeguro, valorAtual + Number(alteracao || 0)));
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
