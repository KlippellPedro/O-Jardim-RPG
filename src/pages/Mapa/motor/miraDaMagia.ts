// A ponte da ficha com o mapa: o que a magia diz do próprio alcance e da própria área vira a mira do efeito no mapa.
// Só conta, sem Pixi nem React, para testar. Os textos vêm do catálogo de magias ("Longo (25 m); área de 9 m",
// "Uma linha de até 3 m"); um teste lê as 355 magias e falha se algum texto sair do padrão, para a ponte nunca
// chutar. Nada aqui muda regra: o efeito é só visual e o dano e o custo seguem pela ficha.

import type { FormaMagia } from '../../../services/mapaApi';
import { CORES_FLUXO } from './molduras';
import type { IPonto } from './geometria';

/** Um quadrado do mapa tem 1,5 m (as regras); "Toque" e "Adjacente" alcançam uma casa. */
export const METROS_DE_UMA_CASA = 1.5;

export interface IAlcanceLido {
  /** A magia é sobre quem conjura: não há o que mirar. */
  pessoal: boolean;
  /** Até onde a magia alcança, em metros (a distância do conjurador). */
  alcanceM: number | null;
  /** "área de 9 m": o tamanho do círculo. Tratado como o raio, a mesma medida da ferramenta de magia. */
  areaM: number | null;
  coneM: number | null;
  /** "Uma linha de até 3 m", que mora no campo do alvo. */
  linhaM: number | null;
}

export interface IMiraDaMagia {
  titulo: string;
  forma: FormaMagia;
  /** A cor do Fluxo; nulo para a magia universal, que pega o Fluxo escolhido na barra. */
  fluxo: keyof typeof CORES_FLUXO | null;
  alcanceM: number | null;
  tamanhoM: number | null;
  /** Uma frase para a barra: "Alcance 25 m, raio 9 m". */
  resumo: string;
}

const numero = (texto: string) => Number(texto.replace(',', '.'));

/** O alcance e a área de uma magia, ou nulo quando o texto não é nenhum dos jeitos que o catálogo escreve. */
export function lerAlcanceDaMagia(alcance: string, alvo = ''): IAlcanceLido | null {
  const texto = String(alcance ?? '').trim();
  if (!texto) return null;
  const linha = /linha de até (\d+(?:,\d+)?) m/i.exec(String(alvo ?? ''));
  const linhaM = linha ? numero(linha[1]) : null;
  if (/^pessoal/i.test(texto)) return { pessoal: true, alcanceM: null, areaM: null, coneM: null, linhaM };
  if (/^(toque|adjacente)$/i.test(texto)) return { pessoal: false, alcanceM: METROS_DE_UMA_CASA, areaM: null, coneM: null, linhaM };
  const faixa = /^(?:Curto|Médio|Longo\+?|Extremo|Colossal) \((\d+(?:,\d+)?) m\)/.exec(texto);
  if (!faixa) return null;
  const resto = texto.slice(faixa[0].length);
  if (resto && !/^; (?:área|cone) de \d+(?:,\d+)? m$/.test(resto)) return null;
  const area = /^; área de (\d+(?:,\d+)?) m$/.exec(resto);
  const cone = /^; cone de (\d+(?:,\d+)?) m$/.exec(resto);
  return { pessoal: false, alcanceM: numero(faixa[1]), areaM: area ? numero(area[1]) : null, coneM: cone ? numero(cone[1]) : null, linhaM };
}

const formatar = (metros: number) => metros.toLocaleString('pt-BR');

/** A mira que a ficha pede ao mapa, ou nulo (magia pessoal, ou texto que o catálogo não escreve assim). */
export function miraDaMagia(magia: { titulo: string; fluxo: string; alcance: string; alvo?: string }): IMiraDaMagia | null {
  const lido = lerAlcanceDaMagia(magia.alcance, magia.alvo);
  if (!lido || lido.pessoal) return null;
  const forma: FormaMagia = lido.coneM !== null ? 'cone' : lido.linhaM !== null ? 'linha' : lido.areaM !== null ? 'circulo' : 'impacto';
  const tamanhoM = lido.coneM ?? lido.linhaM ?? lido.areaM;
  const partes = [lido.alcanceM !== null ? `alcance ${formatar(lido.alcanceM)} m` : null];
  if (lido.coneM !== null) partes.push(`cone de ${formatar(lido.coneM)} m`);
  else if (lido.linhaM !== null) partes.push(`linha de ${formatar(lido.linhaM)} m`);
  else if (lido.areaM !== null) partes.push(`raio de ${formatar(lido.areaM)} m`);
  const resumo = partes.filter(Boolean).join(', ');
  return {
    titulo: magia.titulo,
    forma,
    fluxo: magia.fluxo in CORES_FLUXO ? (magia.fluxo as keyof typeof CORES_FLUXO) : null,
    alcanceM: lido.alcanceM,
    tamanhoM,
    resumo: resumo.charAt(0).toUpperCase() + resumo.slice(1),
  };
}

const distancia = (a: IPonto, b: IPonto) => Math.hypot(b.x - a.x, b.y - a.y);

/** O ponto limitado a `raio` de `centro`: passou do alcance, fica na borda dele, na direção do ponto. */
export function limitarAoAlcance(centro: IPonto, ponto: IPonto, raio: number | null): IPonto {
  if (raio === null) return ponto;
  const d = distancia(centro, ponto);
  if (d <= raio || d === 0) return ponto;
  return { x: centro.x + ((ponto.x - centro.x) / d) * raio, y: centro.y + ((ponto.y - centro.y) / d) * raio };
}

/**
 * Onde a magia cai, dado onde está a mão: o círculo (com a área conhecida) tem centro dentro do alcance e raio fixo;
 * o cone e a linha saem do conjurador na direção da mão, com o tamanho da magia; o impacto vai até a mão, sem passar do
 * alcance. `origem` é o token do conjurador (nulo: a magia sai da própria mão, sem limite de lugar).
 */
export function ajustarMira(
  forma: FormaMagia, origem: IPonto | null, mao: IPonto, alcancePx: number | null, tamanhoPx: number | null,
): { inicio: IPonto; fim: IPonto } {
  if (forma === 'circulo') {
    const centro = origem ? limitarAoAlcance(origem, mao, alcancePx) : mao;
    return { inicio: centro, fim: tamanhoPx !== null ? { x: centro.x + tamanhoPx, y: centro.y } : mao };
  }
  const inicio = origem ?? mao;
  if ((forma === 'cone' || forma === 'linha') && tamanhoPx !== null) {
    const d = distancia(inicio, mao);
    const ux = d === 0 ? 1 : (mao.x - inicio.x) / d;
    const uy = d === 0 ? 0 : (mao.y - inicio.y) / d;
    return { inicio, fim: { x: inicio.x + ux * tamanhoPx, y: inicio.y + uy * tamanhoPx } };
  }
  return { inicio, fim: origem ? limitarAoAlcance(origem, mao, alcancePx) : mao };
}
