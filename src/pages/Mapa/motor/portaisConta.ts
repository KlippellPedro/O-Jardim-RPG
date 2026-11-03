// Contas dos portais, sem o motor (testáveis). Quem decide a travessia é o servidor
// (plataforma/core/mapa.py, portal_atingido); aqui a tela só descobre se precisa perguntar
// antes e onde está a boca que o Mestre clicou.

import type { IPontoMapa, IPortal } from '../../../services/mapaApi';

export type LadoPortal = 'a' | 'b';

function usavel(portal: IPortal, gestor: boolean): boolean {
  if (!portal.ligado) return false;
  if (portal.usa === 'jogadores' && gestor) return false;
  if (portal.usa === 'mestre' && !gestor) return false;
  return true;
}

function bocas(portal: IPortal): LadoPortal[] {
  return portal.mao === 'dupla' ? ['a', 'b'] : ['a'];
}

/** O portal que pede confirmação e foi atingido por um token solto em (x, y), ou null. */
export function portalQuePergunta(portais: IPortal[], x: number, y: number, casa: number, gestor: boolean): IPortal | null {
  for (const portal of portais) {
    if (!usavel(portal, gestor)) continue;
    for (const lado of bocas(portal)) {
      const boca = portal[lado];
      if (!boca || Math.hypot(x - boca.x, y - boca.y) > portal.raio * casa) continue;
      // Igual ao servidor: o primeiro portal atingido decide, pergunte ou não.
      return portal.confirmar && (gestor || portal.visivel) ? portal : null;
    }
  }
  return null;
}

/** A boca (de qualquer portal) mais perto do ponto, dentro do raio dela: o Mestre pega para mover. */
export function bocaEm(portais: IPortal[], ponto: IPontoMapa, casa: number): { portal: IPortal; lado: LadoPortal } | null {
  let melhor: { portal: IPortal; lado: LadoPortal; distancia: number } | null = null;
  for (const portal of portais) {
    for (const lado of ['a', 'b'] as const) {
      const boca = portal[lado];
      if (!boca || (lado === 'b' && portal.cena)) continue;
      const distancia = Math.hypot(ponto.x - boca.x, ponto.y - boca.y);
      if (distancia <= Math.max(portal.raio, 0.45) * casa && (!melhor || distancia < melhor.distancia)) melhor = { portal, lado, distancia };
    }
  }
  return melhor ? { portal: melhor.portal, lado: melhor.lado } : null;
}

/** Portal novo do Mestre, com os padrões do servidor. O id fica vazio: o servidor dá um. */
export function portalNovo(a: IPontoMapa, b: IPontoMapa, numero: number): IPortal {
  return {
    id: '', nome: `Portal ${numero}`, a, b, raio: 0.6, mao: 'dupla', usa: 'todos',
    fluxo: 'espaco', visivel: true, confirmar: false, ligado: true,
  };
}
