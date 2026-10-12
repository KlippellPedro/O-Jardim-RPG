import type { ICaracteristicaRacial, IOpcaoRacial, IRaca } from '../../../types/catalogo';
import { animalServeAMorfologia, obterEstagiosRaciais, obterTracosOpcaoRacial } from '../../../services/racaService';

/** Tudo o que a página mostra de uma Forma da Animália (Fera, Híbrido, Traços). */
export interface FormaDaAnimalia {
  forma: IOpcaoRacial;
  /** Traços que a Forma dá por si (Corpo de Fera, Equipamento Adaptado). */
  tracos: ICaracteristicaRacial[];
  fisiologia: string[];
}

/** Separa o catálogo da Animália por Forma. Aguenta dado antigo: sem `naturezas`, a raça vira uma Forma
 * só (a Híbrida), para a página nunca abrir vazia enquanto o catálogo resolvido ainda é o de antes. */
export function organizarAnimalia(raca: IRaca): FormaDaAnimalia[] {
  const formas = raca.naturezas?.length
    ? raca.naturezas
    : [{ id: 'hibrido', titulo: 'Híbrido', descricao: raca.descricao || '' } as IOpcaoRacial];
  return formas.map(forma => ({
    forma,
    tracos: obterTracosOpcaoRacial(forma),
    fisiologia: Array.isArray(forma.fisiologia) ? (forma.fisiologia as string[]) : [],
  }));
}

/** Morfologia que a página deve mostrar: a pedida na URL, ou a primeira. */
export function morfologiaSelecionada(raca: IRaca, idPedido: string | null): IOpcaoRacial | undefined {
  const lista = raca.variantes || [];
  return lista.find(item => item.id === idPedido) ?? lista[0];
}

export const TAMANHOS = ['Pequeno', 'Normal', 'Grande', 'Enorme'] as const;
export type TamanhoAnimal = (typeof TAMANHOS)[number];

/** Animais que servem à Morfologia, do menor para o maior e depois por nome. */
export function animaisDaMorfologia(raca: IRaca, morfologiaId: string): IOpcaoRacial[] {
  const posicao = (animal: IOpcaoRacial) => {
    const indice = TAMANHOS.indexOf(String(animal.tamanho) as TamanhoAnimal);
    return indice < 0 ? TAMANHOS.length : indice;
  };
  return (raca.animais || [])
    .filter(animal => animalServeAMorfologia(animal, morfologiaId))
    .sort((a, b) => posicao(a) - posicao(b) || String(a.titulo).localeCompare(String(b.titulo), 'pt-BR'));
}

/** Quantos animais do catálogo servem a cada Morfologia. */
export function contagemPorMorfologia(raca: IRaca): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const morfologia of raca.variantes || []) {
    contagem.set(morfologia.id, (raca.animais || []).filter(animal => animalServeAMorfologia(animal, morfologia.id)).length);
  }
  return contagem;
}

/** Tira acento e caixa para a busca do jogador achar "Dragão" digitando "dragao". */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Filtra o catálogo por tamanho e por texto (nome, arma natural e descrição). */
export function filtrarAnimais(animais: IOpcaoRacial[], tamanho: string | null, busca: string): IOpcaoRacial[] {
  const termo = normalizar(busca);
  return animais.filter(animal => {
    if (tamanho && animal.tamanho !== tamanho) return false;
    if (!termo) return true;
    return normalizar(`${animal.titulo} ${animal.arma_natural ?? ''} ${animal.descricao ?? ''}`).includes(termo);
  });
}

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : `−${Math.abs(valor)}`);

/** "Vida +2 · Mana −1": o que uma opção soma ou tira. Vazio quando não mexe em nada. */
export function bonusDaOpcao(opcao: IOpcaoRacial): string {
  return ([
    ['Vida', Number(opcao.vida)],
    ['Mana', Number(opcao.mana)],
    ['Estamina', Number(opcao.estamina)],
  ] as const)
    .filter(([, valor]) => Number.isFinite(valor) && valor !== 0)
    .map(([nome, valor]) => `${nome} ${sinal(valor)}`)
    .concat(Number(opcao.movimento) ? [`Movimento ${sinal(Number(opcao.movimento)).replace('.', ',')} m`] : [])
    .join(' · ');
}

/** Soma o que a Forma e a Morfologia escolhidas dão juntas no nível 1, para o resumo "Monte o seu". */
export function somaDaCombinacao(forma: IOpcaoRacial, morfologia: IOpcaoRacial | undefined): IOpcaoRacial {
  const soma = (campo: 'vida' | 'mana' | 'estamina' | 'movimento') =>
    (Number(forma[campo]) || 0) + (Number(morfologia?.[campo]) || 0);
  return { id: 'soma', titulo: 'Soma', vida: soma('vida'), mana: soma('mana'), estamina: soma('estamina'), movimento: soma('movimento') };
}

/** Dano base da arma natural na Forma: a Fera morde mais forte e o Traços não tem arma natural. */
export function danoDaArmaNatural(forma: IOpcaoRacial): string | null {
  const texto = (forma.caracteristicas || []).map(traco => String(traco.descricao || '')).join(' ');
  const achado = texto.match(/dano base (\d+d\d+)/);
  return achado ? achado[1] : null;
}

/** Degraus da escada da Animália (Jovem, Adulta, Alfa), em ordem de nível. */
export function degrausDaAnimalia(raca: IRaca): IOpcaoRacial[] {
  return obterEstagiosRaciais(raca);
}

/** "Animália Adulta" vira "Adulta": o nome do degrau sem o nome da raça. */
export function nomeCurtoDoDegrau(estagio: IOpcaoRacial): string {
  const partes = String(estagio.titulo || '').split(' ');
  return partes.length > 1 ? partes.slice(1).join(' ') : String(estagio.titulo || '');
}

/** O que um degrau soma, em texto: "Vida +2 · Estamina +2". */
export function bonusDoDegrau(estagio: IOpcaoRacial): string {
  return bonusDaOpcao(estagio);
}
