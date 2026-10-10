/** Excluir da ficha sem perguntar antes, com "Desfazer" depois.
 *
 * Vale para o que mora só na ficha (ataque, habilidade, poder, nota, vínculo, prestígio, propriedade):
 * o item sai na hora e o aviso traz o botão que o devolve. A lista é lida de novo no momento de
 * desfazer, direto da ficha que está carregada, porque os dez segundos do aviso são tempo de sobra
 * para a pessoa mexer em outra coisa.
 *
 * `fichaAgora` e `listaAgora` servem ao outro caso, o de quem pergunta antes (`confirmar`): a
 * resposta chega depois de um intervalo, e a ficha pode ter mudado nesse meio tempo, então a
 * escrita parte do que está carregado agora e não do que havia quando a pergunta abriu. */

import { removerComDesfazer } from '../../components/avisos/desfazer';
import { useCharacterStore } from '../../store/useCharacterStore';

type Leitor<T> = (personagem: any) => readonly T[] | null | undefined;

/** O personagem como está carregado agora (e não como estava no render que abriu a pergunta). */
export function personagemAgora(personagemId: string): any | undefined {
  return useCharacterStore.getState().characters.find((entrada) => entrada.id === personagemId);
}

/** A ficha como está agora; `padrao` cobre o caso de o personagem ter saído do store. */
export function fichaAgora<T = any>(personagemId: string, padrao: T): any {
  return personagemAgora(personagemId)?.ficha ?? padrao;
}

/** Uma lista do personagem como está agora, ex.: `listaAgora(id, (p) => p.ficha?.aliados)`. */
export function listaAgora<T>(personagemId: string, lista: Leitor<T>): readonly T[] {
  const personagem = personagemAgora(personagemId);
  return (personagem ? lista(personagem) : null) ?? [];
}

interface OpcoesDeExclusaoNaFicha<T extends { id: string }> {
  personagemId: string;
  /** Onde a lista mora no personagem, ex.: `(p) => p.ficha?.ataques`. É lida de novo ao desfazer. */
  lista: Leitor<T>;
  /** O `id` do item que sai. */
  id: string;
  gravar: (lista: T[]) => void;
  /** O que o aviso diz, ex.: `Ataque "Espada curta" excluído.` */
  texto: string;
}

/** Devolve false (e não avisa nada) quando o item já não está na lista. */
export function excluirDaFichaComDesfazer<T extends { id: string }>({
  personagemId,
  lista,
  id,
  gravar,
  texto,
}: OpcoesDeExclusaoNaFicha<T>): boolean {
  const ler = () => listaAgora(personagemId, lista);
  const item = ler().find((outro) => outro.id === id);
  if (!item) return false;
  return removerComDesfazer({ item, ler, gravar, texto });
}
