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
  /** A seção aparece dentro de outra na tela (Personagens vive em Seres). Continua existindo para guardar e para a visibilidade. */
  vivEm?: SecaoUniversal;
}

export const SECOES_UNIVERSAIS: ISecaoUniversal[] = [
  { id: 'bestiario', rotulo: 'Bestiário', descricao: 'As criaturas do Jardim: números, habilidades, sinais para reconhecê-las e o que costumam deixar para trás.', soProprios: false, novo: 'Nova criatura' },
  { id: 'seres', rotulo: 'Seres', descricao: 'Quem é quem acima das Árvores: os Soberanos, que são os dez seres mais fortes do Jardim fora as Deidades, as Deidades, as Entidades, os Espíritos e a gente notável.', soProprios: false, novo: 'Novo ser' },
  { id: 'faccoes', rotulo: 'Facções', descricao: 'Organizações sem Árvore.', soProprios: false, novo: 'Nova facção' },
  { id: 'locais', rotulo: 'Locais', descricao: 'Sedes e lugares que o universo inteiro conhece, mesmo quando ficam dentro de uma Árvore.', soProprios: false, novo: 'Novo local' },
  { id: 'artefatos', rotulo: 'Artefatos e Frutos', descricao: 'As Relíquias da Criação e os Frutos do Éden: o que só existe um em todo o universo.', soProprios: false, novo: 'Novo artefato' },
  { id: 'personagens', rotulo: 'Pessoas notáveis', descricao: 'Figuras notáveis que a mesa conhece ou ouviu falar.', soProprios: true, novo: 'Nova pessoa notável', vivEm: 'seres' },
  { id: 'glossario', rotulo: 'Alfabeto', descricao: 'Os idiomas do Jardim em ordem de alfabeto, com o povo que fala cada um, mais os termos, moedas e costumes que o Mestre anotar.', soProprios: false, novo: 'Novo idioma ou termo' },
  { id: 'rumores', rotulo: 'Rumores', descricao: 'O que se comenta por aí. Nem tudo é verdade.', soProprios: true, novo: 'Novo rumor' },
];

/** Em que aba da tela o registro de uma seção aparece. */
export const secaoNaTela = (secao: SecaoUniversal): SecaoUniversal =>
  SECOES_UNIVERSAIS.find((item) => item.id === secao)?.vivEm ?? secao;

/** Rótulo do grupo de uma pessoa notável, dentro de Seres. */
export const GRUPO_GENTE_NOTAVEL = 'Gente notável';

/** Os dados de uma criatura do Bestiário, como a ficha precisa. Vêm do catálogo, não do Mestre. */
export interface ICriatura {
  /** O que a criatura é na mesa: Criatura, Ser Lendário, Ajudante, Invocação, Servo ou Familiar. */
  classe: string;
  vd: number | null;
  nivel: number | null;
  pv: number | null;
  mana: number | null;
  estamina: number | null;
  defesa: number | null;
  iniciativa: number | null;
  deslocamento: string;
  atributos: Record<string, number> | null;
  ataques: Array<{ nome: string; detalhe: string }>;
  pericias: string[];
  habilidades: string[];
  fases: Array<{ quando: number | null; nome: string; anuncio: string; mudancas: string[] }>;
  raridade: string;
  categoria: string;
  familia: string;
  estagio: string;
  papel: string;
  unico: boolean;
  funcao: string;
}

/** Artefato ou Fruto do Éden do catálogo, como a ficha precisa. */
export interface IArtefato {
  fruto: boolean;
  /** Chave do catálogo (`epico`, `reliquia da criacao`...). */
  raridade: string;
  subtipo: string;
  /** Etiquetas do catálogo ("Mágico", "Resistência 15: Fogo"). */
  tags: string[];
  ativacao: string;
  frequencia: string;
  custo: string;
  defesa: string;
  duracao: string;
  efeito: string;
  lore: string;
  nivelRecomendado: number | null;
  exigeAutorizacao: boolean;
  /** Só do Fruto do Éden: poder comum e o que ele vira depois do despertar. */
  passivo: string;
  passivoDespertado: string;
  tecnica: string;
  tecnicaDespertada: string;
  despertar: string;
  fraqueza: string;
  vinculo: string;
  fluxo: string;
  deidade: string;
  /** Artefato que desperta com o dono: uma forma por patamar de nível. */
  formas: Array<{ nivel: number; titulo: string; descricao: string }>;
  dilema: string;
}

/** Um idioma do Jardim: de que povo é e quem o criou (vazio quando ninguém registrou). */
export interface IIdioma { povo: string; criador: string; universal: boolean }

/** Ligação de uma facção com a sede dela (e da sede de volta). Só existe quando o outro lado está visível para quem lê. */
export interface ILigacao { id: string; titulo: string }

export interface IFaccao { tipo: string; alcance: string; proposta: boolean; sede?: ILigacao; lider?: ILigacao }

export interface ILocal { localizacao: string; responsavel: string; dominio: string; faccao?: ILigacao }

/** O conteúdo de fábrica que o Mestre pode ajustar. */
export interface IConteudoBasico {
  titulo: string;
  subtitulo: string;
  descricao: string;
  campos: Array<[string, string]>;
  blocos: IBlocoRegistro[];
  etiquetas: string[];
}

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
  /** Quem edita: o editor inline (`servidor`) ou o editor de conteúdo do Mundo (`lore`, seres e locais da lore). */
  editor: 'servidor' | 'lore';
  loreRef?: { tipo: string; id: string };
  href?: { para: string; rotulo: string };
  /** Subgrupo dentro da seção (categoria da criatura, tipo de ser). Vira a primeira fileira de filtros. */
  grupo?: string;
  /** Cor própria do registro (rank de uma Entidade, cor da Árvore de uma Deidade), em `r,g,b`. */
  corRgb?: string;
  /** Peso da criatura em VD; só o Bestiário usa, para ordenar e pintar a lista. */
  vd?: number | null;
  /** A Busca do Jardim já acha este ser pelo códice da Árvore; sem esta marca ele apareceria duas vezes. */
  indexadoNoMundo?: boolean;
  /** Ficha de combate de uma criatura de fábrica (Bestiário). */
  criatura?: ICriatura;
  /** Fichas próprias das outras seções de fábrica. */
  artefato?: IArtefato;
  faccao?: IFaccao;
  idioma?: IIdioma;
  local?: ILocal;
  /** O que a fábrica traz, para o editor só gravar o que o Mestre mudou de verdade. */
  original?: IConteudoBasico;
  /** O Mestre trocou a grade ou as listas de uma criatura: a ficha mostra o texto dele no lugar da ficha montada. */
  camposAjustados?: boolean;
  blocosAjustados?: boolean;
}

/** A letra do alfabeto de um registro ("Ágata" e "agata" caem em A); o que não começa em letra vai para #. */
export const inicialDe = (titulo: string): string => {
  const letra = String(titulo ?? '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').charAt(0).toLocaleUpperCase('pt-BR');
  return /[A-Z]/.test(letra) ? letra : '#';
};

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

const iguais = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** O que a fábrica traz de um registro (para comparar com o que o Mestre salvou). */
export const conteudoBasico = (registro: Pick<IRegistro, 'titulo' | 'subtitulo' | 'descricao' | 'campos' | 'blocos' | 'etiquetas'>): IConteudoBasico => ({
  titulo: registro.titulo,
  subtitulo: registro.subtitulo,
  descricao: registro.descricao,
  campos: registro.campos,
  blocos: registro.blocos,
  etiquetas: registro.etiquetas,
});

/** Só os campos que diferem do original de fábrica. O editor manda tudo o que vê, mas gravar uma cópia
 * igual ao original trancaria o registro no texto de hoje: se a fábrica melhorar, o ajuste não acompanharia. */
export function dadosAjustados(atual: IConteudoBasico, original: IConteudoBasico | undefined): IDadosRegistro {
  if (!original) return { ...atual };
  const dados: IDadosRegistro = {};
  if (atual.titulo !== original.titulo) dados.titulo = atual.titulo;
  if (atual.subtitulo !== original.subtitulo) dados.subtitulo = atual.subtitulo;
  if (atual.descricao !== original.descricao) dados.descricao = atual.descricao;
  if (!iguais(atual.campos, original.campos)) dados.campos = atual.campos;
  if (!iguais(atual.blocos, original.blocos)) dados.blocos = atual.blocos;
  if (!iguais(atual.etiquetas, original.etiquetas)) dados.etiquetas = atual.etiquetas;
  return dados;
}

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
    if (!ajuste) { resultado.push({ ...padrao, original: conteudoBasico(padrao) }); continue; }
    if (ajuste.revelacao === 'oculto' && !gestor) continue;
    // Um ajuste antigo pode trazer cópias iguais ao original (o editor mandava tudo). Só conta como
    // ajuste da grade ou das listas se o texto é diferente do que a fábrica traz hoje.
    const dados = ajuste.dados;
    resultado.push({
      ...aplicar(padrao, dados),
      original: conteudoBasico(padrao),
      serverId: ajuste.id,
      revelacao: ajuste.revelacao,
      editado: true,
      camposAjustados: dados.campos !== undefined && !iguais(dados.campos, padrao.campos),
      blocosAjustados: dados.blocos !== undefined && !iguais(dados.blocos, padrao.blocos),
    });
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
      grupo: item.secao === 'personagens' ? GRUPO_GENTE_NOTAVEL : item.secao === 'seres' ? 'Outros seres' : item.secao === 'glossario' ? inicialDe(item.dados.titulo ?? '') : undefined,
    });
  }
  return resultado;
}

const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Busca por nome, subtítulo, etiquetas, campos e descrição. Registro rasurado só casa pelo lado de quem edita. */
export function filtrarRegistros(registros: IRegistro[], busca: string, etiqueta: string, gestor: boolean, grupo = ''): IRegistro[] {
  const termo = normalizar(busca.trim());
  return registros.filter((registro) => {
    if (grupo && registro.grupo !== grupo) return false;
    if (etiqueta && !registro.etiquetas.includes(etiqueta)) return false;
    if (!termo) return true;
    if (registro.revelacao === 'rasurado' && !gestor) return false;
    return normalizar([registro.titulo, registro.subtitulo, registro.descricao, registro.grupo ?? '', ...registro.etiquetas, ...registro.campos.flat()].join(' ')).includes(termo);
  });
}

/** Os grupos que existem na lista, na ordem em que aparecem (a fábrica já os traz na ordem certa), com a contagem. */
export function gruposDaLista(registros: IRegistro[], ordem: readonly string[] = []): Array<{ grupo: string; total: number }> {
  const contagem = new Map<string, number>();
  registros.forEach((registro) => { if (registro.grupo) contagem.set(registro.grupo, (contagem.get(registro.grupo) ?? 0) + 1); });
  const posicao = (grupo: string) => { const indice = ordem.indexOf(grupo); return indice === -1 ? ordem.length : indice; };
  return [...contagem.entries()]
    .sort((a, b) => posicao(a[0]) - posicao(b[0]) || b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([grupo, total]) => ({ grupo, total }));
}

/** As etiquetas que existem na lista, da mais comum para a menos comum. */
export function etiquetasDaLista(registros: IRegistro[]): string[] {
  const contagem = new Map<string, number>();
  registros.forEach((registro) => registro.etiquetas.forEach((etiqueta) => contagem.set(etiqueta, (contagem.get(etiqueta) ?? 0) + 1)));
  return [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR')).map(([etiqueta]) => etiqueta);
}

/** Ordem em que os tipos de criatura aparecem no filtro: primeiro o que se enfrenta, depois o que a mesa convoca ou contrata. */
const ORDEM_DOS_TIPOS = ['Criatura', 'Ser Lendário', 'Ajudante', 'Invocação', 'Servo', 'Familiar'];

/** Os tipos (a classe do catálogo) que existem na lista de criaturas, com a contagem, na ordem de ORDEM_DOS_TIPOS. */
export function tiposDeCriatura(registros: IRegistro[]): Array<{ tipo: string; total: number }> {
  const contagem = new Map<string, number>();
  registros.forEach((registro) => {
    const classe = registro.criatura?.classe;
    if (classe) contagem.set(classe, (contagem.get(classe) ?? 0) + 1);
  });
  const posicao = (tipo: string) => { const indice = ORDEM_DOS_TIPOS.indexOf(tipo); return indice === -1 ? ORDEM_DOS_TIPOS.length : indice; };
  return [...contagem.entries()]
    .sort((a, b) => posicao(a[0]) - posicao(b[0]) || a[0].localeCompare(b[0], 'pt-BR'))
    .map(([tipo, total]) => ({ tipo, total }));
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
