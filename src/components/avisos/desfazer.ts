/** Excluir sem perguntar antes, com "Desfazer" depois.
 *
 * Para item de lista que mora só na ficha (ataque, habilidade, nota...), perguntar "tem certeza?" antes é
 * mais atrito do que ajuda: o clique errado é raro, mas incomoda sempre. Aqui o item sai na hora e o aviso
 * traz o botão que o devolve, no lugar em que estava. O que é do servidor ou não tem volta continua
 * perguntando antes (`confirmar`). */

import { avisar } from './avisos';

interface OpcoesDeRemocao<T extends { id: string }> {
  item: T;
  /** A lista de agora, não a de quando o aviso apareceu (a ficha pode ter mudado nesse meio tempo). */
  ler: () => readonly T[];
  gravar: (lista: T[]) => void;
  /** O que o aviso diz, ex.: `Ataque "Espada curta" excluído.` */
  texto: string;
  aoDesfazer?: () => void;
}

/** Devolve o item à lista no lugar em que estava (ou no fim, se a lista encolheu). Nada a fazer se ele já voltou. */
export function devolverItem<T extends { id: string }>(atual: readonly T[], item: T, indice: number): T[] | null {
  if (atual.some((outro) => outro.id === item.id)) return null;
  const lista = [...atual];
  lista.splice(Math.max(0, Math.min(indice, lista.length)), 0, item);
  return lista;
}

/** Tira o item da lista e mostra o aviso com "Desfazer". Devolve false se o item já não estava na lista. */
export function removerComDesfazer<T extends { id: string }>({ item, ler, gravar, texto, aoDesfazer }: OpcoesDeRemocao<T>): boolean {
  const atual = ler();
  const indice = atual.findIndex((outro) => outro.id === item.id);
  if (indice < 0) return false;
  gravar(atual.filter((outro) => outro.id !== item.id));
  avisar.info(texto, {
    titulo: 'Excluído',
    chave: `desfazer:${item.id}`,
    acao: {
      rotulo: 'Desfazer',
      aoClicar: () => {
        const lista = devolverItem(ler(), item, indice);
        if (!lista) return;
        gravar(lista);
        aoDesfazer?.();
      },
    },
  });
  return true;
}
