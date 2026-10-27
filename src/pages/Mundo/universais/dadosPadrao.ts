import catalogo from '../../../../data/loja/catalogo.json';
import familiasData from '../../../../data/bestiario/familias-v1.json';
import { ARVORES } from '../../../../data/mundo/arvoresCatalog';
import { CLASSIFICACOES_ENTIDADE, RANKS_PERIGO, type EntidadeCatalogo } from '../../../../data/mundo/entidades';
import type { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import type { FaccaoDocumentada } from '../../../../data/regras/faccoes';
import { loreBloqueado } from '../loreVisibility';
import { buildTreeCodex, chaveDaEntrada, codexEntryPath, mapaDeBloqueios, universalLoreEntries } from '../worldCodex';
import { raridadeDe, tipoLegivel } from './artefatos';
import { identidadeDe } from './identidadesFaccao';
import { identidadeDeLocal } from './identidadesLocal';
import { GRUPO_GENTE_NOTAVEL, chaveDoPadrao, inicialDe, ordenarPorTitulo, type IArtefato, type ICriatura, type ILigacao, type IRegistro } from './registros';
import { hexParaRgb } from './temas';

type Conteudo = Record<string, any>;
interface IEntradaCatalogo { tipo: string; id: string; titulo: string; conteudo: Conteudo }

const ENTRADAS = catalogo.entradas as unknown as IEntradaCatalogo[];
const TITULO_DA_FAMILIA: Record<string, string> = Object.fromEntries(familiasData.familias.map((familia) => [familia.id, familia.titulo]));

const texto = (valor: unknown): string => (typeof valor === 'string' ? valor : valor == null ? '' : String(valor));
const numero = (valor: unknown): number | null => (typeof valor === 'number' && Number.isFinite(valor) ? valor : null);

const ROTULO_RARIDADE: Record<string, string> = {
  comum: 'Comum', incomum: 'Incomum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário',
  reliquia: 'Relíquia', 'reliquia da criacao': 'Relíquia da Criação',
};

/** O catálogo guarda o subtipo dos mercenários como código ("merc-basico"); na tela vira nome. */
const ROTULO_SUBTIPO: Record<string, string> = {
  'merc-basico': 'Mercenário básico', 'merc-avancado': 'Mercenário avançado', 'merc-mestre': 'Mercenário mestre',
};
const subtipoLegivel = (valor: unknown): string => ROTULO_SUBTIPO[texto(valor)] ?? texto(valor);

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

// ---------------------------------------------------------------- Bestiário

const criaturaDe = (c: Conteudo): ICriatura => ({
  classe: texto(c.classe),
  vd: numero(c.vd),
  nivel: numero(c.nivel),
  pv: numero(c.pv),
  mana: numero(c.mana),
  estamina: numero(c.estamina),
  defesa: numero(c.defesa),
  iniciativa: numero(c.iniciativa),
  deslocamento: texto(c.deslocamento),
  atributos: c.atributos && typeof c.atributos === 'object' ? (c.atributos as Record<string, number>) : null,
  ataques: ((c.ataques ?? []) as unknown[]).map((ataque) => (
    typeof ataque === 'string'
      ? { nome: ataque, detalhe: '' }
      : { nome: texto((ataque as Conteudo).nome), detalhe: texto((ataque as Conteudo).detalhe) }
  )).filter((ataque) => ataque.nome),
  pericias: ((c.pericias ?? []) as unknown[]).map(linhaDe).filter(Boolean),
  habilidades: ((c.habilidades ?? []) as unknown[]).map(linhaDe).filter(Boolean),
  fases: ((c.fases ?? []) as Conteudo[]).map((fase) => ({
    quando: numero(fase.quando),
    nome: texto(fase.nome),
    anuncio: texto(fase.anuncio),
    mudancas: ((fase.mudancas ?? []) as unknown[]).map(texto).filter(Boolean),
  })),
  raridade: texto(c.raridade),
  categoria: texto(c.categoria),
  familia: TITULO_DA_FAMILIA[texto(c.familia)] ?? '',
  estagio: texto(c.estagio),
  papel: texto(c.papel),
  unico: c.unico === true,
  funcao: texto(c.funcao),
});

/** Origem que a Família diz mesmo quando a criatura não traz o subtipo: o catálogo só marcou parte delas. */
const MARCA_DA_FAMILIA: Record<string, string> = { vazio: 'Vazio', golem: 'Golem', mar: 'Marítima' };

/** As marcas de filtro de uma criatura: o que ela é no jogo (Única, Chefe, Contratável) e de onde vem (Vazio,
 * Angelical, Marítima...). Mercenário é uma marca só, sem repetir o nível, e o subtipo que repete a categoria
 * (Espírito dentro de Espírito) não marca nada. */
const marcasDaCriatura = (c: Conteudo): string[] => {
  const subtipo = texto(c.subtipo);
  const origem = subtipo.startsWith('merc-') ? 'Mercenário' : subtipo === texto(c.categoria) ? '' : subtipo;
  return [
    c.unico === true ? 'Única' : '',
    c.papel === 'chefe' ? 'Chefe' : '',
    c.funcao ? 'Contratável' : '',
    origem,
    MARCA_DA_FAMILIA[texto(c.familia)] ?? '',
  ].filter((marca, indice, lista) => marca && lista.indexOf(marca) === indice);
};

const bestiarioPadrao = (): IRegistro[] => ordenarPorTitulo(ENTRADAS.filter((entrada) => entrada.tipo === 'monstro').map((entrada) => {
  const c = entrada.conteudo;
  const criatura = criaturaDe(c);
  const blocos = [
    { titulo: 'Habilidades', itens: criatura.habilidades },
    { titulo: 'Ataques', itens: ((c.ataques ?? []) as unknown[]).map(linhaDe).filter(Boolean) },
    { titulo: 'Perícias', itens: criatura.pericias },
  ].filter((bloco) => bloco.itens.length > 0);
  return {
    ...base('bestiario', entrada.id),
    titulo: entrada.titulo,
    subtitulo: [c.classe, subtipoLegivel(c.subtipo)].filter(Boolean).join(' · '),
    descricao: texto(c.descricao),
    campos: camposCom([
      ['Nível', c.nivel], ['VD', c.vd], ['Família', c.familia], ['Estágio', c.estagio], ['Papel', c.papel], ['Vida', c.pv], ['Mana', c.mana], ['Estamina', c.estamina], ['Defesa', c.defesa], ['Iniciativa', c.iniciativa],
      ['Deslocamento', c.deslocamento], ['Contrata-se como', c.funcao],
    ]),
    blocos,
    etiquetas: marcasDaCriatura(c),
    grupo: criatura.categoria || undefined,
    vd: criatura.vd,
    criatura,
  };
}));

// ---------------------------------------------------------------- Artefatos, facções

/** A cor do Fruto do Éden é a da Árvore da Deidade dele; o catálogo escreve "Comunicação" para a A.X.I.S. */
const corDoFruto = (deidade: string): string | undefined => {
  // O Fruto da Comunicação é da Parley, a Árvore presa por baixo da A.X.I.S: leva o prata dela, não o azul neon do Fruto da Tecnologia.
  if (deidade === 'Comunicação') return ARVORES.find((item) => item.id === 'keryx')?.subjugada?.rgb;
  const arvore = ARVORES.find((item) => item.deidadeTitulo === deidade);
  return arvore ? arvore.rgbInterface ?? arvore.rgb : undefined;
};

const artefatoDe = (c: Conteudo, fruto: boolean): IArtefato => ({
  fruto,
  raridade: texto(c.raridade),
  subtipo: texto(c.subtipo),
  tags: ((c.atributos ?? []) as unknown[]).map(texto).filter(Boolean),
  ativacao: texto(c.ativacao),
  frequencia: texto(c.frequencia),
  custo: texto(c.custo),
  defesa: texto(c.defesa),
  duracao: texto(c.duracao),
  efeito: texto(c.efeito),
  lore: texto(c.lore),
  nivelRecomendado: numero(c.nivel_recomendado),
  exigeAutorizacao: c.requer_autorizacao_mestre === true,
  passivo: texto(c.passivo),
  passivoDespertado: texto(c.passivoDespertado),
  tecnica: texto(c.tecnica),
  tecnicaDespertada: texto(c.tecnicaDespertada),
  despertar: texto(c.despertar),
  fraqueza: texto(c.fraqueza),
  vinculo: texto(c.vinculo),
  fluxo: '',
  deidade: texto(c.deidade),
  formas: ((c.formas ?? []) as Conteudo[])
    .map((forma) => ({ nivel: Number(forma.nivel), titulo: texto(forma.titulo), descricao: texto(forma.descricao) }))
    .filter((forma) => Number.isFinite(forma.nivel) && forma.titulo),
  dilema: texto(c.dilema),
});

/** Registro universal é o que só existe um em todo o universo: toda Relíquia da Criação (seja arma, armadura, implante, casa...) e todo Fruto do Éden. Artefato comum (de Loja) fica de fora. */
const ehUnicoNoUniverso = (entrada: (typeof ENTRADAS)[number]): boolean =>
  entrada.tipo === 'fruto-eden' || texto(entrada.conteudo.raridade).toLowerCase().startsWith('reliquia');

/** O que a relíquia é, para a ficha dizer "Arma" em vez de "Artefato" em tudo. */
const TIPO_DA_RELIQUIA: Record<string, string> = {
  artefato: 'Artefato', arma: 'Arma', armadura: 'Armadura', implante: 'Implante',
  consumivel: 'Consumível', propriedade: 'Propriedade', 'veiculo-completo': 'Veículo',
};

const artefatosPadrao = (catalog: LoreEntry[]): IRegistro[] => ordenarPorTitulo(ENTRADAS.filter(ehUnicoNoUniverso).map((entrada) => {
  const c = entrada.conteudo;
  const fruto = entrada.tipo === 'fruto-eden';
  const rotuloDoTipo = fruto ? 'Fruto do Éden' : TIPO_DA_RELIQUIA[entrada.tipo] ?? 'Artefato';
  const artefato = artefatoDe(c, fruto);
  artefato.fluxo = tituloDoFluxo(catalog, texto(c.fluxo));
  const blocos = fruto
    ? [
      { titulo: 'Poderes', itens: [c.passivo, c.tecnica, c.despertar].map(texto).filter(Boolean) },
      { titulo: 'Fraqueza', itens: [c.fraqueza].map(texto).filter(Boolean) },
    ].filter((bloco) => bloco.itens.length > 0)
    : [{ titulo: 'Efeito', itens: [c.efeito].map(texto).filter(Boolean) }].filter((bloco) => bloco.itens.length > 0);
  return {
    ...base('artefatos', entrada.id),
    titulo: entrada.titulo,
    subtitulo: rotuloDoTipo,
    descricao: fruto ? texto(c.lore) || texto(c.descricao) : texto(c.descricao),
    campos: camposCom([
      ['Raridade', ROTULO_RARIDADE[texto(c.raridade)] ?? c.raridade],
      ['Dano', c.dano], ['Crítico', c.critico], ['Alcance', c.alcance],
      ['Ativação', c.ativacao], ['Frequência', c.frequencia], ['Custo', c.custo], ['Defesa', c.defesa],
    ]),
    blocos,
    etiquetas: [rotuloDoTipo, ROTULO_RARIDADE[texto(c.raridade)]].filter(Boolean) as string[],
    grupo: fruto ? 'Frutos do Éden' : 'Relíquias da Criação',
    corRgb: (fruto ? corDoFruto(artefato.deidade) : undefined) ?? raridadeDe(artefato.raridade).rgb,
    artefato,
  };
}));

/** O Soberano que lidera uma facção (`lidera` no conteúdo dele), quando quem lê já pode vê-lo. */
const liderDaFaccao = (catalog: LoreEntry[], faccaoId: string, visibilidade: IVisibilidade): ILigacao | undefined => {
  const lider = universalLoreEntries(catalog, 'ser').find((entrada) => conteudoTexto(entrada, 'lidera') === faccaoId);
  return lider && !loreBloqueado(lider, visibilidade) ? { id: lider.id, titulo: lider.titulo } : undefined;
};

/** O local de lore que é a sede de uma facção (`faccao` no conteúdo dele), quando quem lê já pode vê-lo. */
const sedeDaFaccao = (catalog: LoreEntry[], faccaoId: string, visibilidade: IVisibilidade): ILigacao | undefined => {
  const sede = universalLoreEntries(catalog, 'local').find((entrada) => conteudoTexto(entrada, 'faccao') === faccaoId);
  return sede && !loreBloqueado(sede, visibilidade) ? { id: sede.id, titulo: sede.titulo } : undefined;
};

/** As facções vêm da API (o navegador não carrega a lore local), já filtradas pela campanha. */
const faccoesPadrao = (faccoes: FaccaoDocumentada[], gestor: boolean, catalog: LoreEntry[], visibilidade: IVisibilidade): IRegistro[] => ordenarPorTitulo(faccoes
  .filter((faccao) => faccao.registro_universal && (faccao.estado === 'canonica' || gestor))
  .map((faccao) => ({
    ...base('faccoes', faccao.id),
    titulo: faccao.titulo,
    subtitulo: faccao.alcance,
    descricao: faccao.atuacao_publica,
    campos: camposCom([['Tipo', tipoLegivel(faccao.tipo)], ['Situação', faccao.estado === 'proposta' ? 'Proposta (só o Mestre vê)' : '']]),
    blocos: [],
    etiquetas: [tipoLegivel(faccao.tipo)],
    faccao: { tipo: faccao.tipo, alcance: faccao.alcance, proposta: faccao.estado === 'proposta', sede: sedeDaFaccao(catalog, faccao.id, visibilidade), lider: liderDaFaccao(catalog, faccao.id, visibilidade) },
    corRgb: identidadeDe(faccao.id)?.rgb,
  })));

// ---------------------------------------------------------------- Seres e Locais

const conteudoTexto = (entrada: LoreEntry, chave: string): string => {
  const valor = (entrada.conteudo as Record<string, unknown>)[chave];
  return typeof valor === 'string' ? valor : '';
};

/** A cor de um Soberano, em `r,g,b`, a partir do nome que a lore usa. */
const COR_DO_SOBERANO: Record<string, string> = {
  laranja: '240,140,60', branco: '232,232,246', preto: '150,140,178', verde: '90,200,120', roxo: '167,100,230',
  'verde água': '80,200,190', vermelho: '230,80,80', amarelo: '235,200,70', rosa: '240,130,175', azul: '90,160,255',
  dourado: '232,184,76', cinza: '170,174,184', marrom: '168,118,76', vinho: '168,52,88',
};

export const GRUPOS_DE_SERES = ['Soberanos', 'Deidades', 'Entidades', 'Espíritos', GRUPO_GENTE_NOTAVEL, 'Outros seres'] as const;

/** Soberano é quem a lore marca com `soberano: sim`: um dos dez seres mais fortes do Jardim inteiro, de qualquer Árvore.
 * Não depende do epíteto, porque os antigos "Soberanos de Gênese" levam o mesmo título sem serem desta lista. */
const grupoDoSer = (entrada: LoreEntry): string => {
  if (conteudoTexto(entrada, 'soberano') === 'sim') return 'Soberanos';
  if (entrada.tipo === 'deidade') return 'Deidades';
  if (/esp[ií]rito/i.test(conteudoTexto(entrada, 'epiteto'))) return 'Espíritos';
  return entrada.tipo === 'personagem' ? GRUPO_GENTE_NOTAVEL : 'Outros seres';
};

interface IVisibilidade { isMestre: boolean; loreRevelado: string[]; loreOculto: string[] }

/** A facção de quem o local é sede, se ela já está liberada para quem lê. */
const ligacaoComFaccao = (entrada: LoreEntry, faccoes: FaccaoDocumentada[], gestor: boolean): ILigacao | undefined => {
  const id = conteudoTexto(entrada, 'faccao');
  const faccao = faccoes.find((item) => item.id === id && item.registro_universal && (item.estado === 'canonica' || gestor));
  return faccao ? { id: faccao.id, titulo: faccao.titulo } : undefined;
};

/** Locais da lore universal. Se ainda estão trancados para o jogador, aparecem rasurados em vez de sumir. */
const locaisPadrao = (catalog: LoreEntry[], visibilidade: IVisibilidade, faccoes: FaccaoDocumentada[], gestor: boolean): IRegistro[] => ordenarPorTitulo(universalLoreEntries(catalog, 'local').map((entrada) => {
  const trancado = loreBloqueado(entrada, visibilidade);
  return {
    ...base('locais', entrada.id),
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
    corRgb: trancado ? undefined : identidadeDeLocal(entrada.id)?.rgb,
    local: trancado ? undefined : {
      localizacao: conteudoTexto(entrada, 'localizacao'),
      responsavel: conteudoTexto(entrada, 'responsavel'),
      dominio: conteudoTexto(entrada, 'dominio'),
      faccao: ligacaoComFaccao(entrada, faccoes, gestor),
    },
  };
}));

const tituloDoFluxo = (catalog: LoreEntry[], id: string): string => catalog.find((entrada) => entrada.tipo === 'fluxo' && entrada.id === id)?.titulo ?? '';

/** Ser que lidera uma facção: leva para a ficha dela, se ela já é visível para quem lê. */
const ligacaoComALideranca = (entrada: LoreEntry, faccoes: FaccaoDocumentada[], gestor: boolean): IRegistro['href'] => {
  const id = conteudoTexto(entrada, 'lidera');
  const faccao = faccoes.find((item) => item.id === id && item.registro_universal && (item.estado === 'canonica' || gestor));
  return faccao ? { para: `/mundo/universal?secao=faccoes&registro=padrao:faccoes:${encodeURIComponent(faccao.id)}`, rotulo: `Líder: ${faccao.titulo}` } : undefined;
};

/** Ser da lore que também é criatura do Bestiário (Selah): leva para a ficha de combate dele. */
const ligacaoComOBestiario = (entrada: LoreEntry): IRegistro['href'] => {
  const id = conteudoTexto(entrada, 'bestiario');
  return id ? { para: `/mundo/universal?secao=bestiario&registro=padrao:bestiario:${encodeURIComponent(id)}`, rotulo: 'Ver a ficha no Bestiário' } : undefined;
};

/** Um ser da lore (Deidade, Soberano, Espírito...) como registro. `trancado` esconde o texto e deixa só a marca. */
const registroDeSerDaLore = (
  entrada: LoreEntry,
  extras: { trancado: boolean; catalog: LoreEntry[]; arvore?: (typeof ARVORES)[number]; href?: IRegistro['href']; indexadoNoMundo?: boolean; faccoes?: FaccaoDocumentada[]; gestor?: boolean },
): IRegistro => {
  const { trancado, catalog, arvore, href, indexadoNoMundo, faccoes = [], gestor = false } = extras;
  const grupo = grupoDoSer(entrada);
  const corDoSoberano = COR_DO_SOBERANO[conteudoTexto(entrada, 'cor').toLowerCase()];
  return {
    ...base('seres', entrada.id),
    editor: 'lore',
    loreRef: { tipo: entrada.tipo, id: entrada.id },
    revelacao: trancado ? 'rasurado' : 'aberto',
    titulo: trancado ? 'Registro retido' : entrada.titulo,
    subtitulo: trancado ? '' : conteudoTexto(entrada, 'epiteto'),
    descricao: trancado ? '' : conteudoTexto(entrada, 'descricao') || 'Este registro ainda não possui uma descrição pública.',
    campos: trancado ? [] : camposCom([
      ['Árvore', entrada.tipo === 'deidade' ? arvore?.nome : ''],
      ['Fluxo', tituloDoFluxo(catalog, conteudoTexto(entrada, 'fluxo'))],
      ['Domínio', conteudoTexto(entrada, 'dominio')],
      ['Cor', conteudoTexto(entrada, 'cor')],
      ['Localização', conteudoTexto(entrada, 'localizacao')],
      ['Responsável', conteudoTexto(entrada, 'responsavel')],
    ]),
    blocos: [],
    etiquetas: [],
    grupo,
    corRgb: entrada.tipo === 'deidade' ? arvore?.rgbInterface ?? arvore?.rgb : corDoSoberano,
    href: trancado ? undefined : href ?? ligacaoComOBestiario(entrada) ?? ligacaoComALideranca(entrada, faccoes, gestor),
    indexadoNoMundo,
  };
};

const registroDeEntidade = (entidade: EntidadeCatalogo): IRegistro => {
  const rank = RANKS_PERIGO.find((item) => item.id === entidade.rankPerigo);
  const classificacoes = entidade.classificacao
    .map((id) => CLASSIFICACOES_ENTIDADE.find((item) => item.id === id)?.titulo)
    .filter((titulo): titulo is string => Boolean(titulo));
  return {
    ...base('seres', `entidade-${entidade.id}`),
    // O texto da Entidade mora no Livro das Entidades e é editado lá (painel do Criador > Entidades).
    editor: 'servidor',
    titulo: entidade.nome,
    subtitulo: entidade.epiteto || '',
    descricao: [entidade.epigrafe ? `“${entidade.epigrafe}”` : '', entidade.resumo ?? ''].filter(Boolean).join('\n\n'),
    campos: camposCom([['Rank de perigo', rank?.titulo], ['Classificação', classificacoes.join(', ')]]),
    blocos: [],
    etiquetas: rank ? [`Rank ${rank.titulo}`] : [],
    grupo: 'Entidades',
    corRgb: hexParaRgb(rank?.cor),
    href: { para: `/entidades/${entidade.id}`, rotulo: 'Ler o conto' },
  };
};

// ---------------------------------------------------------------- Alfabeto (idiomas)

/** O resumo de todas as línguas. Ele não vira ficha, mas a Visibilidade dele vale para o Alfabeto inteiro. */
const ID_DO_RESUMO_DE_IDIOMAS = 'idiomas-do-jardim';

/** "dos Vampiros", "das Sereias": o artigo segue o plural do nome do povo. A lore diz "os Animálias", no masculino. */
const doPovo = (povo: string): string => `${/as$/i.test(povo) && !/^animálias$/i.test(povo) ? 'das' : 'dos'} ${povo}`;

/** Os idiomas do Jardim, um registro por língua (data/mundo/Jardim/idiomas.json, mais as que o Criador acrescentar
 * no Painel). Cada língua segue a própria Visibilidade, como um Local: retida, aparece rasurada. Se o Mestre esconde
 * "Os Idiomas do Jardim", o Alfabeto fica sem nenhuma para o jogador. */
const idiomasPadrao = (catalog: LoreEntry[], visibilidade: IVisibilidade): IRegistro[] => {
  const resumo = catalog.find((entrada) => entrada.tipo === 'idioma' && entrada.id === ID_DO_RESUMO_DE_IDIOMAS);
  if (resumo && loreBloqueado(resumo, visibilidade)) return [];
  const linguas = catalog.filter((entrada) => entrada.tipo === 'idioma' && entrada.id !== ID_DO_RESUMO_DE_IDIOMAS);
  return ordenarPorTitulo(linguas.map((entrada): IRegistro => {
    const trancado = loreBloqueado(entrada, visibilidade);
    const povo = conteudoTexto(entrada, 'povo');
    const criador = conteudoTexto(entrada, 'criador');
    const universal = /^todos/i.test(povo);
    return {
      ...base('glossario', entrada.id),
      editor: 'lore',
      loreRef: { tipo: entrada.tipo, id: entrada.id },
      revelacao: trancado ? 'rasurado' : 'aberto',
      titulo: trancado ? 'Registro retido' : entrada.titulo,
      subtitulo: trancado ? '' : universal ? 'Idioma de todos os povos' : povo ? `Idioma ${doPovo(povo)}` : 'Idioma',
      descricao: trancado ? '' : conteudoTexto(entrada, 'descricao'),
      campos: trancado ? [] : camposCom([
        ['Como soa', conteudoTexto(entrada, 'como_soa')],
        ['Escrita', conteudoTexto(entrada, 'escrita')],
        ['Onde se ouve', conteudoTexto(entrada, 'onde_se_ouve')],
        ['Cumprimento', conteudoTexto(entrada, 'cumprimento')],
        ['Criador', criador],
      ]),
      blocos: [],
      etiquetas: trancado ? [] : ['Idioma', universal ? '' : povo].filter(Boolean),
      grupo: trancado ? undefined : inicialDe(entrada.titulo),
      idioma: trancado ? undefined : { povo, criador, universal },
    };
  }));
};

export interface IEntradasUniversais {
  catalog: LoreEntry[];
  factions: FaccaoDocumentada[];
  isMestre: boolean;
  loreRevelado: string[];
  loreOculto: string[];
  /** As Entidades publicadas (o navegador não carrega a lista local) e a visibilidade delas na campanha. */
  entities?: EntidadeCatalogo[];
  entidadesRevelado?: string[];
  entidadesOculto?: string[];
  /** Árvores trancadas para esta pessoa: a Deidade dela não entra em Seres. */
  arvoresTrancadas?: readonly string[];
}

/** Quem é quem: os Soberanos (os dez seres mais fortes do Jardim), as Deidades das Árvores, as Entidades, Espíritos e
 * os demais seres da lore universal.
 * Quem o jogador ainda não pode ler some da lista (a Árvore também o esconde); só os seres marcados
 * como universais continuam aparecendo rasurados, como antes. */
function seresPadrao(
  { catalog, factions, isMestre, loreRevelado, loreOculto, entities = [], entidadesRevelado = [], entidadesOculto = [], arvoresTrancadas = [] }: IEntradasUniversais,
): IRegistro[] {
  const visibilidade: IVisibilidade = { isMestre, loreRevelado, loreOculto };
  const vistos = new Set<string>();
  const registros: IRegistro[] = [];
  const trancadas = new Set(arvoresTrancadas);

  for (const arvore of ARVORES.filter((item) => item.id !== 'universal')) {
    if (!isMestre && trancadas.has(arvore.id)) continue;
    const codex = buildTreeCodex(catalog, arvore.id);
    const bloqueios = mapaDeBloqueios(codex, visibilidade);
    const caminho = (entrada: LoreEntry) => (arvore.naoEhArvore ? `/mundo/vazio/${entrada.tipo}/${entrada.id}` : codexEntryPath(arvore.id, entrada));
    const doCodex = [codex.deity, ...codex.entries.filter((entrada) => entrada.tipo === 'personagem' && entrada.registro_universal)]
      .filter((entrada): entrada is LoreEntry => Boolean(entrada));
    for (const entrada of doCodex) {
      const chave = chaveDaEntrada(entrada);
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      const trancado = bloqueios.get(chave) === true;
      if (trancado && !entrada.registro_universal) continue;
      registros.push(registroDeSerDaLore(entrada, {
        trancado,
        catalog,
        arvore,
        href: { para: caminho(entrada), rotulo: `Abrir na Árvore ${arvore.nome}` },
        indexadoNoMundo: true,
        faccoes: factions,
        gestor: isMestre,
      }));
    }
  }

  // Seres universais fora de qualquer Árvore (Blanc...): trancados aparecem rasurados.
  for (const entrada of universalLoreEntries(catalog, 'ser')) {
    const chave = chaveDaEntrada(entrada);
    if (vistos.has(chave)) continue; // já entrou pela Árvore (Grimm, Amadheus)
    vistos.add(chave);
    registros.push(registroDeSerDaLore(entrada, { trancado: loreBloqueado(entrada, visibilidade), catalog, faccoes: factions, gestor: isMestre }));
  }

  for (const entidade of entities) {
    if (!entidade.registroUniversal) continue;
    if (loreBloqueado(entidade, { isMestre, loreRevelado: entidadesRevelado, loreOculto: entidadesOculto })) continue;
    registros.push(registroDeEntidade(entidade));
  }

  const ordemDosGrupos = (registro: IRegistro) => {
    const posicao = GRUPOS_DE_SERES.indexOf((registro.grupo ?? 'Outros seres') as (typeof GRUPOS_DE_SERES)[number]);
    return posicao === -1 ? GRUPOS_DE_SERES.length : posicao;
  };
  return ordenarPorTitulo(registros).sort((a, b) => ordemDosGrupos(a) - ordemDosGrupos(b));
}

/** Todos os registros de fábrica, por seção. Os do Mestre entram depois, em `mesclarRegistros`. */
export function registrosDeFabrica(entradas: IEntradasUniversais): IRegistro[] {
  const { catalog, factions, isMestre, loreRevelado, loreOculto } = entradas;
  const visibilidade = { isMestre, loreRevelado, loreOculto };
  return [
    ...bestiarioPadrao(),
    ...seresPadrao(entradas),
    ...faccoesPadrao(factions, isMestre, catalog, visibilidade),
    ...locaisPadrao(catalog, visibilidade, factions, isMestre),
    ...artefatosPadrao(catalog),
    ...idiomasPadrao(catalog, visibilidade),
  ];
}
