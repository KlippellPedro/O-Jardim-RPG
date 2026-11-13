// Preferências locais de aparência das barras abaixo do token. O servidor
// continua decidindo quais recursos cada espectador tem autorização para ver.

import type { IBarraToken, IConfigBarras, TipoBarra } from '../../../services/mapaApi';

export type RecursoDoToken = 'mana' | 'estamina' | 'nenhum';
export type ModoVisualBarra = 'barra' | 'anel' | 'numero' | 'oculta';
export type EscolhaEnergia = 'automatico' | 'mana' | 'estamina' | 'ambas' | 'nenhuma';

export interface IVisualBarra {
  modo: ModoVisualBarra;
  cor: string;
}

export interface IPreferenciasBarrasMapa {
  energia: EscolhaEnergia;
  porTipo: Record<TipoBarra, IVisualBarra>;
}

/** Tons pastel: a barra fica suave sobre o mapa e o texto branco continua legível por cima. */
export const CORES_BARRA_PADRAO: Record<TipoBarra, string> = {
  vida: '#e88a90',
  mana: '#8aa4ef',
  estamina: '#86d4ab',
  sanidade: '#b79be0',
};

/** Cores vivas do desenho antigo: quem guardou uma delas no aparelho passa para a pastel correspondente. */
const CORES_ANTIGAS: Record<string, string> = {
  '#e5484d': CORES_BARRA_PADRAO.vida,
  '#3e63dd': CORES_BARRA_PADRAO.mana,
  '#30a46c': CORES_BARRA_PADRAO.estamina,
  '#8e4ec6': CORES_BARRA_PADRAO.sanidade,
};

export const PREFERENCIAS_BARRAS_PADRAO: IPreferenciasBarrasMapa = {
  energia: 'automatico',
  porTipo: {
    vida: { modo: 'barra', cor: CORES_BARRA_PADRAO.vida },
    mana: { modo: 'barra', cor: CORES_BARRA_PADRAO.mana },
    estamina: { modo: 'barra', cor: CORES_BARRA_PADRAO.estamina },
    sanidade: { modo: 'anel', cor: CORES_BARRA_PADRAO.sanidade },
  },
};

const MODOS_VISUAIS = new Set<ModoVisualBarra>(['barra', 'anel', 'numero', 'oculta']);
const ESCOLHAS_ENERGIA = new Set<EscolhaEnergia>(['automatico', 'mana', 'estamina', 'ambas', 'nenhuma']);
const COR_HEX = /^#[0-9a-f]{6}$/i;

function normalizarVisualBarra(valor: unknown, padrao: IVisualBarra): IVisualBarra {
  if (!valor || typeof valor !== 'object') return { ...padrao };
  const dados = valor as Partial<IVisualBarra>;
  const cor = typeof dados.cor === 'string' && COR_HEX.test(dados.cor) ? dados.cor.toLowerCase() : padrao.cor;
  return {
    modo: MODOS_VISUAIS.has(dados.modo as ModoVisualBarra) ? dados.modo as ModoVisualBarra : padrao.modo,
    cor: CORES_ANTIGAS[cor] ?? cor,
  };
}

export function normalizarPreferenciasBarras(valor: unknown): IPreferenciasBarrasMapa {
  if (!valor || typeof valor !== 'object') {
    return {
      energia: PREFERENCIAS_BARRAS_PADRAO.energia,
      porTipo: {
        vida: { ...PREFERENCIAS_BARRAS_PADRAO.porTipo.vida },
        mana: { ...PREFERENCIAS_BARRAS_PADRAO.porTipo.mana },
        estamina: { ...PREFERENCIAS_BARRAS_PADRAO.porTipo.estamina },
        sanidade: { ...PREFERENCIAS_BARRAS_PADRAO.porTipo.sanidade },
      },
    };
  }
  const dados = valor as Partial<IPreferenciasBarrasMapa>;
  const energia = ESCOLHAS_ENERGIA.has(dados.energia as EscolhaEnergia)
    ? dados.energia as EscolhaEnergia
    : PREFERENCIAS_BARRAS_PADRAO.energia;
  const porTipo: Partial<Record<TipoBarra, IVisualBarra>> = dados.porTipo && typeof dados.porTipo === 'object'
    ? dados.porTipo
    : {};
  return {
    energia,
    porTipo: {
      vida: normalizarVisualBarra(porTipo.vida, PREFERENCIAS_BARRAS_PADRAO.porTipo.vida),
      mana: normalizarVisualBarra(porTipo.mana, PREFERENCIAS_BARRAS_PADRAO.porTipo.mana),
      estamina: normalizarVisualBarra(porTipo.estamina, PREFERENCIAS_BARRAS_PADRAO.porTipo.estamina),
      sanidade: normalizarVisualBarra(porTipo.sanidade, PREFERENCIAS_BARRAS_PADRAO.porTipo.sanidade),
    },
  };
}

const chavePreferencias = (usuarioId: string) => `jardim.mapa.barras.v1.${usuarioId}`;

export function lerPreferenciasBarras(usuarioId: string | null | undefined): IPreferenciasBarrasMapa {
  if (!usuarioId || typeof window === 'undefined') return normalizarPreferenciasBarras(null);
  try {
    return normalizarPreferenciasBarras(JSON.parse(window.localStorage.getItem(chavePreferencias(usuarioId)) ?? 'null'));
  } catch {
    return normalizarPreferenciasBarras(null);
  }
}

export function salvarPreferenciasBarras(usuarioId: string | null | undefined, preferencias: IPreferenciasBarrasMapa) {
  if (!usuarioId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(chavePreferencias(usuarioId), JSON.stringify(normalizarPreferenciasBarras(preferencias)));
  } catch {
    // Sem armazenamento disponível, as preferências valem até fechar a página.
  }
}

/**
 * O texto das barras é miúdo no mundo e o mapa dá zoom nele: com a resolução padrão da textura ele fica borrado.
 * A resolução acompanha o zoom da tela (em degraus de 1, 2 e 4, para não refazer a textura a todo quadro).
 */
export function resolucaoDoTexto(zoom: number, dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1): number {
  const alvo = Math.max(1, zoom * dpr);
  return Math.min(4, 2 ** Math.ceil(Math.log2(alvo)));
}

export interface IBarrasSeparadas {
  vida: IBarraToken | null;
  recurso: IBarraToken | null;
  sanidade: IBarraToken | null;
}

export function fracaoDaBarra(barra: IBarraToken): number {
  if (barra.fracao !== undefined) return Math.max(0, Math.min(1, barra.fracao));
  if (!barra.maximo) return 0;
  return Math.max(0, Math.min(1, (barra.atual ?? 0) / barra.maximo));
}

/** Porcentagem arredondada, com 1% para quem ainda tem alguma coisa. */
export function porcentagemDaBarra(barra: IBarraToken): number {
  const fracao = fracaoDaBarra(barra);
  if (fracao > 0 && fracao < 0.01) return 1;
  return Math.round(fracao * 100);
}

export function separarBarras(barras: IBarraToken[]): IBarrasSeparadas {
  const achar = (tipo: TipoBarra) => barras.find((b) => b.tipo === tipo) ?? null;
  return {
    vida: achar('vida'),
    // Compatibilidade com telas que ainda resumem Mana e Estamina em um recurso.
    recurso: achar('mana') ?? achar('estamina'),
    sanidade: achar('sanidade'),
  };
}

/** Recursos já filtrados pelo servidor, limitados às escolhas pessoais de aparência. */
export function barrasParaDesenhar(barras: IBarraToken[], preferencias: IPreferenciasBarrasMapa): IBarraToken[] {
  const porTipo = new Map<TipoBarra, IBarraToken>(barras.map((barra): [TipoBarra, IBarraToken] => [barra.tipo, barra]));
  const energia: TipoBarra[] = preferencias.energia === 'ambas'
    ? ['mana', 'estamina']
    : preferencias.energia === 'mana'
      ? ['mana']
      : preferencias.energia === 'estamina'
        ? ['estamina']
        : preferencias.energia === 'nenhuma'
          ? []
          : porTipo.has('mana') ? ['mana'] : porTipo.has('estamina') ? ['estamina'] : [];
  const ordem: TipoBarra[] = ['vida', ...energia, 'sanidade'];
  return ordem.flatMap((tipo) => {
    const barra = porTipo.get(tipo);
    return barra && preferencias.porTipo[tipo].modo !== 'oculta' ? [barra] : [];
  });
}

/** A segunda barra que o menu mostra marcada: a que aparece no token, ou a primeira marcada. */
export function recursoEscolhido(config: IConfigBarras, barras: IBarraToken[]): RecursoDoToken {
  const temMana = config.mostrar.includes('mana');
  const temEstamina = config.mostrar.includes('estamina');
  if (temMana && temEstamina) return separarBarras(barras).recurso?.tipo === 'estamina' ? 'estamina' : 'mana';
  if (temMana) return 'mana';
  if (temEstamina) return 'estamina';
  return 'nenhum';
}

/** A lista `mostrar` com o recurso trocado e o resto (Vida, Sanidade) do jeito que estava. */
export function mostrarComRecurso(mostrar: TipoBarra[], recurso: RecursoDoToken): TipoBarra[] {
  const resto = mostrar.filter((b) => b !== 'mana' && b !== 'estamina');
  return recurso === 'nenhum' ? resto : [...resto, recurso];
}
