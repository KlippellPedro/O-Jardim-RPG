import type {
  IBlocoRegistro,
  IDadosRegistro,
  IRegistroDoServidor,
  RevelacaoRegistro,
  SecaoUniversal,
} from '../../../services/registrosUniversaisApi';

export interface ISecaoUniversal {
  id: SecaoUniversal;
  rotulo: string;
  descricao: string;
  /** O Mestre cria os registros; o site não traz nenhum de fábrica. */
  soProprios: boolean;
  novo: string;
}

export const SECOES_UNIVERSAIS: ISecaoUniversal[] = [
  { id: 'bestiario', rotulo: 'Bestiário', descricao: 'As criaturas do Jardim, com seus números e o que se sabe delas.', soProprios: false, novo: 'Nova criatura' },
  { id: 'seres', rotulo: 'Seres', descricao: 'Seres que não pertencem a nenhuma Árvore.', soProprios: false, novo: 'Novo ser' },
  { id: 'faccoes', rotulo: 'Facções', descricao: 'Organizações sem Árvore.', soProprios: false, novo: 'Nova facção' },
  { id: 'locais', rotulo: 'Locais', descricao: 'Lugares do universo geral.', soProprios: false, novo: 'Novo local' },
  { id: 'artefatos', rotulo: 'Artefatos e Frutos', descricao: 'Artefatos raros e os Frutos do Éden.', soProprios: false, novo: 'Novo artefato' },
  { id: 'personagens', rotulo: 'Personagens', descricao: 'Figuras notáveis que a mesa conhece ou ouviu falar.', soProprios: true, novo: 'Novo personagem' },
  { id: 'glossario', rotulo: 'Glossário', descricao: 'Termos, moedas, idiomas e costumes do mundo.', soProprios: true, novo: 'Novo termo' },
  { id: 'rumores', rotulo: 'Rumores', descricao: 'O que se comenta por aí. Nem tudo é verdade.', soProprios: true, novo: 'Novo rumor' },
];

export interface IRegistro {
  /** `padrao:<secao>:<id>` para os de fábrica; `proprio:<uuid>` para os do Mestre. */
  chave: string;
  secao: SecaoUniversal;
  origemId: string | null;
  serverId: string | null;
  titulo: string;
  subtitulo: string;
  descricao: string;
  campos: Array<[string, string]>;
  blocos: IBlocoRegistro[];
  etiquetas: string[];
  revelacao: RevelacaoRegistro;
  /** O Mestre mexeu num registro de fábrica. */
  editado: boolean;
  proprio: boolean;
  /** Quem edita: o editor inline (`servidor`) ou o editor de conteúdo do Mundo (`lore`, só seres e locais). */
  editor: 'servidor' | 'lore';
  loreRef?: { tipo: string; id: string };
  href?: { para: string; rotulo: string };
}

export const chaveDoPadrao = (secao: SecaoUniversal, id: string) => `padrao:${secao}:${id}`;

const aplicar = (registro: IRegistro, dados: IDadosRegistro): IRegistro => ({
  ...registro,
  titulo: dados.titulo ?? registro.titulo,
  subtitulo: dados.subtitulo ?? registro.subtitulo,
  descricao: dados.descricao ?? registro.descricao,
  campos: dados.campos ?? registro.campos,
  blocos: dados.blocos ?? registro.blocos,
  etiquetas: dados.etiquetas ?? registro.etiquetas,
});

/** Junta os registros de fábrica com o que o Mestre ajustou e criou.
 *
 * - Ajuste de fábrica troca só os campos que ele escreveu.
 * - Registro `oculto` some para quem não é Mestre (o servidor já nem o envia).
 * - Registro `rasurado` continua na lista, mas o texto é escondido pela tela.
 */
export function mesclarRegistros(
  padroes: IRegistro[],
  doServidor: IRegistroDoServidor[],
  gestor: boolean,
): IRegistro[] {
  const ajustes = new Map(doServidor.filter((item) => item.origem_id).map((item) => [chaveDoPadrao(item.secao, item.origem_id as string), item]));
  const resultado: IRegistro[] = [];
  for (const padrao of padroes) {
    const ajuste = ajustes.get(padrao.chave);
    if (!ajuste) { resultado.push(padrao); continue; }
    if (ajuste.revelacao === 'oculto' && !gestor) continue;
    resultado.push({ ...aplicar(padrao, ajuste.dados), serverId: ajuste.id, revelacao: ajuste.revelacao, editado: true });
  }
  for (const item of doServidor) {
    if (item.origem_id) continue;
    if (item.revelacao === 'oculto' && !gestor) continue;
    resultado.push({
      chave: `proprio:${item.id}`,
      secao: item.secao,
      origemId: null,
      serverId: item.id,
      titulo: item.dados.titulo ?? '',
      subtitulo: item.dados.subtitulo ?? '',
      descricao: item.dados.descricao ?? '',
      campos: item.dados.campos ?? [],
      blocos: item.dados.blocos ?? [],
      etiquetas: item.dados.etiquetas ?? [],
      revelacao: item.revelacao,
      editado: false,
      proprio: true,
      editor: 'servidor',
    });
  }
  return resultado;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Busca por nome, subtítulo, etiquetas, campos e descrição. Registro rasurado só casa pelo lado de quem edita. */
export function filtrarRegistros(registros: IRegistro[], busca: string, etiqueta: string, gestor: boolean): IRegistro[] {
  const termo = normalizar(busca.trim());
  return registros.filter((registro) => {
    if (etiqueta && !registro.etiquetas.includes(etiqueta)) return false;
    if (!termo) return true;
    if (registro.revelacao === 'rasurado' && !gestor) return false;
    return normalizar([registro.titulo, registro.subtitulo, registro.descricao, ...registro.etiquetas, ...registro.campos.flat()].join(' ')).includes(termo);
  });
}

/** As etiquetas que existem na lista, da mais comum para a menos comum. */
export function etiquetasDaLista(registros: IRegistro[]): string[] {
  const contagem = new Map<string, number>();
  registros.forEach((registro) => registro.etiquetas.forEach((etiqueta) => contagem.set(etiqueta, (contagem.get(etiqueta) ?? 0) + 1)));
  return [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')).map(([etiqueta]) => etiqueta);
}

export const ordenarPorTitulo = (registros: IRegistro[]): IRegistro[] =>
  [...registros].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));

/** Rótulo curto do grau de revelação. */
export const ROTULO_REVELACAO: Record<RevelacaoRegistro, string> = {
  oculto: 'Oculto dos jogadores',
  rasurado: 'Rasurado para os jogadores',
  aberto: 'Aberto',
};

/** Texto de um bloco em linhas, para editar num campo só (um item por linha). */
export const itensParaTexto = (itens: string[]): string => itens.join('\n');
export const textoParaItens = (texto: string): string[] => texto.split('\n').map((linha) => linha.trim()).filter(Boolean);
