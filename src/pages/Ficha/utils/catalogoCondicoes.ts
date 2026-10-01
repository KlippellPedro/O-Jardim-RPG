import {
  CONDICOES_OFICIAIS,
  CRISES_SANIDADE,
  type ICondicaoRegra,
} from '../../../../data/regras/condicoes';
import {
  CONDICOES_LONGO_PRAZO,
  FILTRO_DO_GRUPO,
  type FiltroCondicao,
} from '../../../../data/regras/condicoes-longo-prazo';

export interface IFiltroCatalogo {
  id: FiltroCondicao;
  rotulo: string;
  descricao: string;
}

export const FILTROS_CATALOGO: ReadonlyArray<IFiltroCatalogo> = [
  { id: 'cena', rotulo: 'Em cena', descricao: 'Condições de combate e de cena, as que entram e saem em minutos.' },
  { id: 'lesoes', rotulo: 'Lesões', descricao: 'Ossos quebrados e ferimentos graves. Saram com tratamento e descansos.' },
  { id: 'sequelas', rotulo: 'Perdas e sequelas', descricao: 'Membros e sentidos perdidos e o que fica no corpo depois. Quase tudo permanente.' },
  { id: 'mente', rotulo: 'Mente', descricao: 'Transtornos, traumas, humor e fobias. Combine com a mesa antes de aplicar.' },
];

export const AVISO_SAUDE_MENTAL = 'Condições de saúde mental dão peso e história ao personagem. Combine com quem joga antes de aplicar, escolham juntos o gatilho e o jeito de interpretar, e não use uma condição contra o jogador.';

const semAcento = (texto: string) => texto
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

export function filtroDaCondicao(item: ICondicaoRegra): FiltroCondicao {
  return item.grupo ? FILTRO_DO_GRUPO[item.grupo] : 'cena';
}

/** Tudo que a ficha sabe aplicar: condições de cena, longo prazo e crises. */
export const TODAS_AS_CONDICOES_DA_FICHA: ICondicaoRegra[] = [
  ...CONDICOES_OFICIAIS,
  ...CONDICOES_LONGO_PRAZO,
  ...CRISES_SANIDADE,
];

/** Texto onde a busca procura: título, grupo, categoria, efeitos e remoção. */
const textoBuscavel = (item: ICondicaoRegra) => semAcento([
  item.titulo,
  item.grupo ?? '',
  item.categoria,
  item.permanente ? 'permanente' : '',
  ...item.efeitos,
  item.remocao,
].join(' '));

/**
 * Com busca preenchida, procura em todo o catálogo; sem busca, mostra o filtro
 * escolhido. Todas as palavras da busca precisam aparecer.
 */
export function listarCondicoes(filtro: FiltroCondicao, busca: string): ICondicaoRegra[] {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  const base = [...CONDICOES_OFICIAIS, ...CONDICOES_LONGO_PRAZO];
  if (!termos.length) return base.filter((item) => filtroDaCondicao(item) === filtro);
  return base.filter((item) => {
    const texto = textoBuscavel(item);
    return termos.every((termo) => texto.includes(termo));
  });
}
