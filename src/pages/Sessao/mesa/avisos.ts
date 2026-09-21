import type { IEstadoMesa } from '../../../services/mesaApi';
import { relogiosRecemCompletos } from './relogios';

export type AbaMesa = 'relogios' | 'votacao' | 'bilhetes' | 'replay';

export interface IAvisoMesa {
  chave: string;
  texto: string;
  aba: AbaMesa;
  /** Toca o gongo (relógio que se completou). */
  gongo?: boolean;
}

/** Compara duas leituras da mesa e diz o que é novidade para quem está olhando.
 * A primeira leitura (`antes` nulo) nunca avisa: entrar na mesa no meio da
 * sessão não pode disparar um aviso para cada coisa que já existia. */
export function detectarNovidades(antes: IEstadoMesa | null, depois: IEstadoMesa, gestor: boolean): IAvisoMesa[] {
  if (!antes) return [];
  const avisos: IAvisoMesa[] = [];

  if (!gestor) {
    const conhecidos = new Set(antes.bilhetes.map((bilhete) => bilhete.id));
    depois.bilhetes
      .filter((bilhete) => !bilhete.aberto_em && !conhecidos.has(bilhete.id))
      .forEach((bilhete) => avisos.push({ chave: `bilhete:${bilhete.id}`, texto: 'Chegou um bilhete só para você.', aba: 'bilhetes' }));
  } else {
    const antesPorId = new Map(antes.bilhetes.map((bilhete) => [bilhete.id, bilhete]));
    depois.bilhetes.forEach((bilhete) => {
      const anterior = antesPorId.get(bilhete.id);
      if (anterior && !anterior.aberto_em && bilhete.aberto_em) {
        avisos.push({ chave: `lido:${bilhete.id}`, texto: `${bilhete.para_nome ?? 'Um jogador'} abriu o bilhete “${bilhete.titulo}”.`, aba: 'bilhetes' });
      }
    });
  }

  if (depois.votacao && depois.votacao.id !== antes.votacao?.id && !gestor) {
    avisos.push({ chave: `votacao:${depois.votacao.id}`, texto: `Votação aberta: ${depois.votacao.pergunta}`, aba: 'votacao' });
  }
  if (antes.votacao && !depois.votacao && depois.ultima_votacao?.id === antes.votacao.id) {
    avisos.push({ chave: `votacao-fim:${antes.votacao.id}`, texto: 'A votação foi encerrada. Veja o resultado.', aba: 'votacao' });
  }

  relogiosRecemCompletos(antes.relogios, depois.relogios).forEach((relogio) => {
    avisos.push({ chave: `relogio:${relogio.id}:${relogio.cheias}`, texto: `O relógio “${relogio.titulo}” se completou!`, aba: 'relogios', gongo: true });
  });

  return avisos;
}

/** Quantas coisas pedem a atenção de quem olha: o número que aparece no botão da mesa. */
export function contarPendencias(estado: IEstadoMesa | null, gestor: boolean): number {
  if (!estado) return 0;
  if (gestor) return 0;
  const bilhetesNovos = estado.bilhetes.filter((bilhete) => !bilhete.aberto_em).length;
  const precisaVotar = estado.votacao && !estado.votacao.meu_voto ? 1 : 0;
  return bilhetesNovos + precisaVotar;
}
