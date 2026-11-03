// Contas das portas na mesa e dos portais entre cenas, sem Pixi (para testar). A regra de
// verdade fica no servidor (plataforma/core/paredes.py); aqui só se acha a porta clicada,
// o que um clique do jogador pede e os lugares de chegada numa outra cena.

import type { IAberturaCena, ICena, IPontoMapa } from '../../../services/mapaApi';

function distanciaAoTrecho(ponto: IPontoMapa, abertura: IAberturaCena): number {
  const sx = abertura.x2 - abertura.x1;
  const sy = abertura.y2 - abertura.y1;
  const comprimento = sx * sx + sy * sy;
  const u = comprimento < 1e-9 ? 0 : Math.max(0, Math.min(1, ((ponto.x - abertura.x1) * sx + (ponto.y - abertura.y1) * sy) / comprimento));
  return Math.hypot(ponto.x - (abertura.x1 + u * sx), ponto.y - (abertura.y1 + u * sy));
}

/** A porta (não a janela) mais perto do clique, se ele caiu nela. `escala`: o zoom da vista,
 * para a margem do clique ficar do mesmo tamanho na tela. */
export function portaEm(aberturas: IAberturaCena[], ponto: IPontoMapa, casa: number, escala = 1): IAberturaCena | null {
  const margem = Math.max(casa * 0.22, 10 / Math.max(escala, 0.05));
  let melhor: { porta: IAberturaCena; distancia: number } | null = null;
  for (const abertura of aberturas) {
    if (abertura.tipo === 'janela') continue;
    const distancia = distanciaAoTrecho(ponto, abertura);
    if (distancia <= margem && (!melhor || distancia < melhor.distancia)) melhor = { porta: abertura, distancia };
  }
  return melhor?.porta ?? null;
}

/** O que o clique do jogador pede: abrir a fechada e fechar a aberta. Trancada não muda (null). */
export function cliqueDoJogador(porta: IAberturaCena): 'aberta' | 'fechada' | null {
  if (porta.tipo !== 'porta' || porta.estado === 'trancada') return null;
  return porta.estado === 'aberta' ? 'fechada' : 'aberta';
}

/** O nome da porta para o Mestre, do jeito que ela está. */
export function nomeDaPorta(porta: IAberturaCena): string {
  if (porta.tipo === 'secreta') return 'Porta secreta';
  const estado = { aberta: 'aberta', fechada: 'fechada', trancada: 'trancada' }[porta.estado];
  return `${porta.era_secreta ? 'Porta secreta revelada' : 'Porta'} ${estado}`;
}

export interface ChegadaPortal {
  id: string;
  rotulo: string;
  ponto: IPontoMapa;
}

/** Onde o portal pode deixar o token numa outra cena: o meio dela e as bocas dos portais de lá
 * (assim o Mestre marca a chegada com um portal de volta, que já serve para o caminho de retorno). */
export function chegadasDaCena(cena: Pick<ICena, 'largura' | 'altura' | 'portais'>): ChegadaPortal[] {
  const lista: ChegadaPortal[] = [{ id: 'meio', rotulo: 'Meio da cena', ponto: { x: Math.round(cena.largura / 2), y: Math.round(cena.altura / 2) } }];
  for (const portal of cena.portais ?? []) {
    if (portal.a) lista.push({ id: `${portal.id}:a`, rotulo: `Entrada de ${portal.nome}`, ponto: { ...portal.a } });
    if (portal.b && !portal.cena) lista.push({ id: `${portal.id}:b`, rotulo: `Saída de ${portal.nome}`, ponto: { ...portal.b } });
  }
  return lista;
}

/** A chegada escolhida (a que está no ponto da saída), ou null se a saída foi para outro lugar. */
export function chegadaAtual(chegadas: ChegadaPortal[], b: IPontoMapa | null): string | null {
  if (!b) return null;
  return chegadas.find((c) => Math.abs(c.ponto.x - b.x) < 1 && Math.abs(c.ponto.y - b.y) < 1)?.id ?? null;
}
