// As contas das zonas de terreno (cobertura, gatilho e terreno), sem Pixi nem React, para testar.
// O servidor decide tudo o que importa (plataforma/core/zonas.py); aqui só ficam os nomes, as cores e os textos.

import type { IZona } from '../../../services/mapaApi';
import { ARMADILHAS_PRONTAS } from '../../../../data/regras/perigosAmbiente';

export type CoberturaDaLinha = 'total' | 'superior' | 'parcial' | null;

/** O texto que a régua mostra entre dois tokens: o que a linha atravessa e o que isso vale pelo Livro de Regras. */
export function textoDaCobertura(cobertura: CoberturaDaLinha | undefined): string | undefined {
  if (cobertura === undefined) return undefined;
  if (cobertura === 'total') return 'Cobertura total: não pode ser alvo direto';
  if (cobertura === 'superior') return 'Cobertura superior: +5 de Defesa';
  if (cobertura === 'parcial') return 'Cobertura parcial: +2 de Defesa';
  return 'Sem cobertura no caminho';
}

export interface ITerrenoDaMesa {
  id: string;
  rotulo: string;
  cor: string;
  /** Uma ideia para o Mestre usar a marca (não é regra do Livro). */
  ideia: string;
}

/** As marcas de terreno e a cor de cada uma: a mesma lista do servidor (core/zonas.py, TERRENOS). */
export const TERRENOS: readonly ITerrenoDaMesa[] = [
  { id: 'molhado', rotulo: 'Molhado', cor: '#5aa9e6', ideia: 'Ideia de mesa: fogo apaga aqui, e raio ou frio pesam mais em quem está na poça.' },
  { id: 'lama', rotulo: 'Lama', cor: '#8b6b43', ideia: 'Ideia de mesa: terreno difícil, e correr aqui pede um teste.' },
  { id: 'gelo', rotulo: 'Gelo escorregadio', cor: '#bfe6f5', ideia: 'Ideia de mesa: quem se move rápido demais pode cair.' },
  { id: 'em-chamas', rotulo: 'Em chamas', cor: '#f26a21', ideia: 'Ideia de mesa: quem entra ou começa o turno aqui pode ficar Queimando.' },
  { id: 'eletrificado', rotulo: 'Eletrificado', cor: '#fcd34d', ideia: 'Ideia de mesa: um choque para quem toca a área, que some quando a corrente acaba.' },
  { id: 'fumaca', rotulo: 'Fumaça', cor: '#9aa0a6', ideia: 'Ideia de mesa: dá cobertura parcial e atrapalha quem tenta enxergar através.' },
  { id: 'escuridao', rotulo: 'Escuridão', cor: '#3b3358', ideia: 'Ideia de mesa: sem luz própria, ninguém enxerga aqui direito.' },
  { id: 'veneno', rotulo: 'Veneno', cor: '#7bc043', ideia: 'Ideia de mesa: gás ou esporos que pedem um teste de resistência a cada rodada.' },
  { id: 'sagrado', rotulo: 'Terreno sagrado', cor: '#fff2b3', ideia: 'Ideia de mesa: criaturas profanas hesitam em entrar.' },
  { id: 'vazio', rotulo: 'Vazio', cor: '#7a6f8f', ideia: 'Ideia de mesa: o Fluxo falha aqui: magia pede mais esforço.' },
];

export const terrenoPorId = (id: string | null | undefined): ITerrenoDaMesa | undefined => TERRENOS.find((terreno) => terreno.id === id);

export const COR_DA_COBERTURA = '#f6ad55';
export const COR_DO_GATILHO = '#e879f9';

/** A cor da zona no mapa: a do terreno, senão a da cobertura, senão a do gatilho. */
export function corDaZona(zona: Pick<IZona, 'terreno' | 'cobertura' | 'gatilho'>): string {
  return terrenoPorId(zona.terreno?.rotulo)?.cor ?? (zona.cobertura ? COR_DA_COBERTURA : COR_DO_GATILHO);
}

/** A linha pequena sob o nome da zona: o que ela faz ("Cobertura parcial · Gatilho · Molhado"). */
export function resumoDaZona(zona: Pick<IZona, 'terreno' | 'cobertura' | 'gatilho'> & { telhado?: boolean }): string {
  const partes: string[] = [];
  if (zona.telhado) partes.push('Telhado');
  if (zona.cobertura) partes.push(`Cobertura ${zona.cobertura === 'superior' ? 'superior +5' : 'parcial +2'}`);
  if (zona.gatilho) partes.push(zona.gatilho.armadilha ? `Gatilho: ${armadilhaDoLivro(zona.gatilho.armadilha)?.titulo ?? 'armadilha'}` : 'Gatilho');
  if (zona.terreno) partes.push(terrenoPorId(zona.terreno.rotulo)?.rotulo ?? zona.terreno.rotulo);
  return partes.join(' · ');
}

/** Quanto do telhado aparece (0 some, 1 cobre tudo): o jogador vê opaco até o grupo entrar; o Mestre sempre enxerga através. */
export function alvoDoTelhado(grupoDentro: boolean, gestor: boolean): number {
  if (gestor) return grupoDentro ? 0.08 : 0.38;
  return grupoDentro ? 0 : 1;
}

/** Algum dos pontos (centros dos tokens do grupo) está dentro do retângulo da zona? */
export function algumDentro(zona: Pick<IZona, 'x' | 'y' | 'w' | 'h'>, pontos: ReadonlyArray<{ x: number; y: number }>): boolean {
  return pontos.some((ponto) => ponto.x >= zona.x && ponto.x <= zona.x + zona.w && ponto.y >= zona.y && ponto.y <= zona.y + zona.h);
}

export const armadilhaDoLivro = (numero: number | null | undefined) => ARMADILHAS_PRONTAS.find((a) => a.d6 === numero);

/** A zona nova que nasce de um retângulo desenhado: sem função nenhuma ainda (o Mestre escolhe no painel). */
export function zonaNova(retangulo: { x: number; y: number; w: number; h: number }, numero: number, id: string): IZona {
  return {
    id, nome: `Zona ${numero}`,
    x: Math.round(retangulo.x), y: Math.round(retangulo.y), w: Math.max(1, Math.round(retangulo.w)), h: Math.max(1, Math.round(retangulo.h)),
    cobertura: null, gatilho: null, terreno: null, telhado: false,
  };
}

/** Um gatilho recém-ligado: dispara uma vez, para jogadores, com a Mesa avisada do que aconteceu. */
export const GATILHO_NOVO = { texto_pisador: '', texto_mesa: '', quem: 'jogadores', uma_vez: true, armadilha: null } as const;

/** O texto que o Mestre lê quando alguém dispara um gatilho: quem, onde e o cartão da armadilha do Livro, se a zona tem uma. */
export function avisoDoGatilho(quem: string, zona: string, armadilha: number | null): string {
  const base = `${quem} pisou em "${zona}".`;
  const carta = armadilhaDoLivro(armadilha);
  return carta ? `${base} ${carta.titulo}: ${carta.regra}` : base;
}
