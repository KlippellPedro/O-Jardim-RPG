/** Distribui os itens equipados nos encaixes do boneco da ficha. O inventário
 * não guarda "onde" cada peça é vestida, então o encaixe sai da categoria e do
 * nome (elmo, botas, escudo...). Peça sem pista de nome cai no torso. */

export type EncaixeCorpo = 'cabeca' | 'torso' | 'luvas' | 'pes' | 'maoPrincipal' | 'maoSecundaria';

export const ENCAIXES_CORPO: EncaixeCorpo[] = ['cabeca', 'torso', 'luvas', 'pes', 'maoPrincipal', 'maoSecundaria'];

export interface ItemDoBoneco {
  id: string;
  nome: string;
  categoria: string;
  equipado: boolean;
}

export interface DistribuicaoBoneco<T extends ItemDoBoneco> {
  corpo: Partial<Record<EncaixeCorpo, T>>;
  /** Itens de perícia e artefatos, na ordem em que aparecem no inventário. */
  especiais: T[];
  implantes: T[];
  /** Equipado, mas sem encaixe livre (segunda armadura no torso, terceira arma...). */
  outros: T[];
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const PISTAS: Array<[EncaixeCorpo, RegExp]> = [
  ['maoSecundaria', /\b(escudo|broquel|pavise|adarga)\b/],
  ['cabeca', /\b(elmo|capacete|coroa|capuz|chapeu|mascara|tiara|viseira|diadema|barrete|balaclava)\b/],
  ['luvas', /\b(luva|luvas|manopla|manoplas|braçadeira|bracadeira)\b/],
  ['pes', /\b(bota|botas|sapato|sapatos|sandalia|sandalias|botina|botinas|grevas?)\b/],
];

export function encaixeDaArmadura(nome: string): EncaixeCorpo {
  const texto = semAcento(nome);
  return PISTAS.find(([, padrao]) => padrao.test(texto))?.[0] ?? 'torso';
}

export function distribuirNoBoneco<T extends ItemDoBoneco>(
  itens: T[],
  ehEspecial: (item: T) => boolean,
): DistribuicaoBoneco<T> {
  const resultado: DistribuicaoBoneco<T> = { corpo: {}, especiais: [], implantes: [], outros: [] };
  const equipados = itens.filter((item) => item.equipado);

  const colocar = (item: T, encaixe: EncaixeCorpo) => {
    if (resultado.corpo[encaixe]) resultado.outros.push(item);
    else resultado.corpo[encaixe] = item;
  };

  // Armaduras primeiro: o escudo pega a mão secundária antes de uma segunda arma.
  equipados.filter((item) => item.categoria === 'armadura').forEach((item) => colocar(item, encaixeDaArmadura(item.nome)));
  equipados.filter((item) => item.categoria === 'arma').forEach((item) => {
    if (!resultado.corpo.maoPrincipal) colocar(item, 'maoPrincipal');
    else colocar(item, 'maoSecundaria');
  });
  equipados.forEach((item) => {
    if (item.categoria === 'armadura' || item.categoria === 'arma') return;
    if (item.categoria === 'implante') resultado.implantes.push(item);
    else if (ehEspecial(item)) resultado.especiais.push(item);
    else resultado.outros.push(item);
  });
  return resultado;
}
