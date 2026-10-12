import type { ICaracteristicaRacial, IOpcaoRacial, IRaca } from '../../../types/catalogo';
import { obterEstagiosRaciais, obterTracosOpcaoRacial } from '../../../services/racaService';

/** Tudo o que a página mostra de uma Natureza do Espírito, já separado. */
export interface NaturezaDoEspirito {
  natureza: IOpcaoRacial;
  /** Fluxos, Pecados ou Virtudes desta Natureza. */
  marcas: IOpcaoRacial[];
  /** Escada de estágios desta Natureza, em ordem de nível. */
  estagios: IOpcaoRacial[];
  /** Características que a Natureza dá por si (a Possessão, a Encarnação). */
  tracos: ICaracteristicaRacial[];
  /** "Fluxo", "Pecado" ou "Virtude". */
  rotuloMarca: string;
}

const NATUREZA_PADRAO: IOpcaoRacial = { id: 'natural', titulo: 'Espírito Natural', descricao: '' };

/** Separa o catálogo do Espírito por Natureza.
 *
 * Aguenta dado antigo: sem `naturezas` na raça, tudo vira uma Natureza só, e
 * variante sem `natureza` conta como da primeira. Isso evita página vazia quando
 * o catálogo resolvido ainda é de antes das Naturezas. */
export function organizarEspirito(raca: IRaca): NaturezaDoEspirito[] {
  const naturezas = raca.naturezas?.length ? raca.naturezas : [NATUREZA_PADRAO];
  const primeira = naturezas[0].id;
  return naturezas.map((natureza) => ({
    natureza,
    marcas: (raca.variantes || []).filter((variante) => (variante.natureza ?? primeira) === natureza.id),
    estagios: obterEstagiosRaciais(raca, { naturezaId: natureza.id }),
    tracos: obterTracosOpcaoRacial(natureza),
    rotuloMarca: natureza.rotulo_variante || raca.rotulo_variante || 'Marca',
  }));
}

/** Marca que a página deve mostrar: a pedida na URL, ou a primeira da Natureza. */
export function marcaSelecionada(natureza: NaturezaDoEspirito, idPedido: string | null): IOpcaoRacial | undefined {
  return natureza.marcas.find((marca) => marca.id === idPedido) ?? natureza.marcas[0];
}

/** A marca oposta, quando existe: o Pecado de uma Virtude e a Virtude de um Pecado. */
export function marcaOposta(
  marca: IOpcaoRacial,
  todas: NaturezaDoEspirito[],
): { natureza: NaturezaDoEspirito; marca: IOpcaoRacial } | null {
  for (const natureza of todas) {
    const oposta = natureza.marcas.find((candidata) => (
      (typeof marca.virtude_oposta === 'string' && candidata.virtude === marca.virtude_oposta)
      || (typeof marca.pecado_oposto === 'string' && candidata.pecado === marca.pecado_oposto)
    ));
    if (oposta) return { natureza, marca: oposta };
  }
  return null;
}

const TIPOS: Record<string, string> = {
  acao: 'Ação',
  acao_completa: 'Ação completa',
  reacao: 'Reação',
  movimento: 'Movimento',
  passiva: 'Passiva',
  rerrolagem: 'Rerrolagem',
  limitacao: 'Limitação',
};

const numeroBr = (valor: number) => String(valor).replace('.', ',');

/** Os números que importam de um traço, para virar etiquetas: tipo, Mana, usos e alcance. */
export function etiquetasDoTraco(traco: ICaracteristicaRacial): string[] {
  const etiquetas: string[] = [];
  const tipo = TIPOS[String(traco.tipo)];
  if (tipo) etiquetas.push(tipo);
  const mana = Number(traco.custo_mana);
  if (mana > 0) etiquetas.push(`${mana} Mana`);
  const usos = Number(traco.usos);
  if (usos > 0) {
    const quando = traco.recuperacao === 'sessao' ? 'sessão' : 'cena';
    etiquetas.push(usos === 1 ? `1 vez por ${quando}` : `${usos} vezes por ${quando}`);
  }
  const alcance = Number(traco.alcance_m);
  if (alcance > 0) etiquetas.push(`${numeroBr(alcance)} m`);
  return etiquetas;
}

/** "Espírito Menor" vira "Menor": o nome do degrau sem o nome da Natureza. */
export function nomeCurtoDoEstagio(estagio: IOpcaoRacial): string {
  const partes = String(estagio.titulo || '').split(' ');
  return partes.length > 1 ? partes.slice(1).join(' ') : String(estagio.titulo || '');
}

/** O que um degrau soma, em texto: "Mana +3 · Vida +15". Vazio quando não soma nada. */
export function bonusDoEstagio(estagio: IOpcaoRacial): string {
  return [
    Number(estagio.mana) ? `Mana +${estagio.mana}` : '',
    Number(estagio.vida) ? `Vida +${estagio.vida}` : '',
  ].filter(Boolean).join(' · ');
}

/** A condição que um degrau ou traço exige (a Provação Primordial), se exigir. */
export function condicaoExigida(
  item: ICaracteristicaRacial | IOpcaoRacial,
  condicoes: IOpcaoRacial[],
): IOpcaoRacial | undefined {
  const id = (item as { requer_condicao?: unknown }).requer_condicao;
  return typeof id === 'string' ? condicoes.find((condicao) => condicao.id === id) : undefined;
}

/** Quantas marcas o jogador pode escolher de fato (o Universal é só do Mestre). */
export function marcasEscolhiveis(natureza: NaturezaDoEspirito): number {
  return natureza.marcas.filter((marca) => marca.somente_mestre !== true).length;
}
