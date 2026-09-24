import catalogo from '../../../../data/loja/catalogo.json';
import type { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import type { FaccaoDocumentada } from '../../../../data/regras/faccoes';
import { loreBloqueado } from '../loreVisibility';
import { universalLoreEntries } from '../worldCodex';
import { chaveDoPadrao, ordenarPorTitulo, type IRegistro } from './registros';

type Conteudo = Record<string, any>;
interface IEntradaCatalogo { tipo: string; id: string; titulo: string; conteudo: Conteudo }

const ENTRADAS = catalogo.entradas as unknown as IEntradaCatalogo[];

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : valor == null ? '' : String(valor));

const ROTULO_RARIDADE: Record<string, string> = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
  reliquia: 'Relíquia', 'reliquia da criacao': 'Relíquia da Criação',
};

/** Habilidades e ataques vêm ora como texto, ora como { nome, detalhe }. */
const linhaDe = (item: unknown): string => {
  if (typeof item === 'string') return item;
  if (item && typeof item === 'object') {
    const { nome, detalhe } = item as { nome?: string; detalhe?: string };
    return [nome, detalhe].filter(Boolean).join(': ');
  }
  return '';
};

const camposCom = (pares: Array<[string, unknown]>): Array<[string, string]> =>
  pares.map(([rotulo, valor]): [string, string] => [rotulo, texto(valor)]).filter(([, valor]) => valor !== '');

const base = (secao: IRegistro['secao'], id: string): Omit<IRegistro, 'titulo' | 'subtitulo' | 'descricao' | 'campos' | 'blocos' | 'etiquetas'> => ({
  chave: chaveDoPadrao(secao, id),
  secao,
  origemId: id,
  serverId: null,
  revelacao: 'aberto',
  editado: false,
  proprio: false,
  editor: 'servidor',
});

const bestiarioPadrao = (): IRegistro[] => ordenarPorTitulo(ENTRADAS.filter((entrada) => entrada.tipo === 'monstro').map((entrada) => {
  const c = entrada.conteudo;
  const blocos = [
    { titulo: 'Habilidades', itens: (c.habilidades ?? []).map(linhaDe).filter(Boolean) },
    { titulo: 'Ataques', itens: (c.ataques ?? []).map(linhaDe).filter(Boolean) },
    { titulo: 'Perícias', itens: (c.pericias ?? []).map(linhaDe).filter(Boolean) },
  ].filter((bloco) => bloco.itens.length > 0);
  return {
    ...base('bestiario', entrada.id),
    titulo: entrada.titulo,
    subtitulo: [c.classe, c.subtipo].filter(Boolean).join(' · '),
    descricao: texto(c.descricao),
    campos: camposCom([
      ['Nível', c.nivel], ['VD', c.vd], ['Vida', c.pv], ['Mana', c.mana], ['Estamina', c.estamina], ['Defesa', c.defesa], ['Iniciativa', c.iniciativa],
      ['Deslocamento', c.deslocamento], ['Contrata-se como', c.funcao],
    ]),
    blocos,
    etiquetas: [c.categoria, c.subtipo, c.funcao ? 'Contratável' : ''].filter(Boolean),
  };
}));

const artefatosPadrao = (): IRegistro[] => ordenarPorTitulo(ENTRADAS.filter((entrada) => entrada.tipo === 'artefato' || entrada.tipo === 'fruto-eden').map((entrada) => {
  const c = entrada.conteudo;
  const fruto = entrada.tipo === 'fruto-eden';
  const blocos = fruto
    ? [
      { titulo: 'Poderes', itens: [c.passivo, c.tecnica, c.despertar].map(texto).filter(Boolean) },
      { titulo: 'Fraqueza', itens: [c.fraqueza].map(texto).filter(Boolean) },
    ].filter((bloco) => bloco.itens.length > 0)
    : [{ titulo: 'Efeito', itens: [c.efeito].map(texto).filter(Boolean) }].filter((bloco) => bloco.itens.length > 0);
  return {
    ...base('artefatos', entrada.id),
    titulo: entrada.titulo,
    subtitulo: fruto ? 'Fruto do Éden' : 'Artefato',
    descricao: fruto ? texto(c.lore) || texto(c.descricao) : texto(c.descricao),
    campos: camposCom([
      ['Raridade', ROTULO_RARIDADE[texto(c.raridade)] ?? c.raridade],
      ['Ativação', c.ativacao], ['Frequência', c.frequencia], ['Custo', c.custo], ['Defesa', c.defesa],
    ]),
    blocos,
    etiquetas: [fruto ? 'Fruto do Éden' : 'Artefato', ROTULO_RARIDADE[texto(c.raridade)]].filter(Boolean) as string[],
  };
}));

/** As facções vêm da API (o navegador não carrega a lore local), já filtradas pela campanha. */
const faccoesPadrao = (faccoes: FaccaoDocumentada[], gestor: boolean): IRegistro[] => ordenarPorTitulo(faccoes
  .filter((faccao) => faccao.registro_universal && (faccao.estado === 'canonica' || gestor))
  .map((faccao) => ({
    ...base('faccoes', faccao.id),
    titulo: faccao.titulo,
    subtitulo: faccao.alcance,
    descricao: faccao.atuacao_publica,
    campos: camposCom([['Tipo', faccao.tipo.replace(/-/g, ' ')], ['Situação', faccao.estado === 'proposta' ? 'Proposta (só o Mestre vê)' : '']]),
    blocos: [],
    etiquetas: [faccao.tipo.replace(/-/g, ' ')],
  })));

const conteudoTexto = (entrada: LoreEntry, chave: string): string => {
  const valor = (entrada.conteudo as Record<string, unknown>)[chave];
  return typeof valor === 'string' ? valor : '';
};

/** Seres e locais vêm da lore do Mundo e têm o próprio editor de conteúdo. Se ainda estão
 * trancados para o jogador, aparecem rasurados (sem o texto real) em vez de sumir. */
const lorePadrao = (
  catalog: LoreEntry[],
  secao: 'seres' | 'locais',
  visibilidade: { isMestre: boolean; loreRevelado: string[]; loreOculto: string[] },
): IRegistro[] => ordenarPorTitulo(universalLoreEntries(catalog, secao === 'seres' ? 'ser' : 'local').map((entrada) => {
  const trancado = loreBloqueado(entrada, visibilidade);
  return {
    ...base(secao, entrada.id),
    editor: 'lore' as const,
    loreRef: { tipo: entrada.tipo, id: entrada.id },
    revelacao: trancado ? 'rasurado' as const : 'aberto' as const,
    titulo: trancado ? 'Registro retido' : entrada.titulo,
    subtitulo: trancado ? '' : conteudoTexto(entrada, 'epiteto'),
    descricao: trancado ? '' : conteudoTexto(entrada, 'descricao') || 'Este registro ainda não possui uma descrição pública.',
    campos: trancado ? [] : camposCom([
      ['Localização', conteudoTexto(entrada, 'localizacao')],
      ['Responsável', conteudoTexto(entrada, 'responsavel')],
      ['Domínio', conteudoTexto(entrada, 'dominio')],
    ]),
    blocos: [],
    etiquetas: [],
  };
}));

export interface IEntradasUniversais {
  catalog: LoreEntry[];
  factions: FaccaoDocumentada[];
  isMestre: boolean;
  loreRevelado: string[];
  loreOculto: string[];
}

/** Todos os registros de fábrica, por seção. Os do Mestre entram depois, em `mesclarRegistros`. */
export function registrosDeFabrica({ catalog, factions, isMestre, loreRevelado, loreOculto }: IEntradasUniversais): IRegistro[] {
  const visibilidade = { isMestre, loreRevelado, loreOculto };
  return [
    ...bestiarioPadrao(),
    ...lorePadrao(catalog, 'seres', visibilidade),
    ...faccoesPadrao(factions, isMestre),
    ...lorePadrao(catalog, 'locais', visibilidade),
    ...artefatosPadrao(),
  ];
}
