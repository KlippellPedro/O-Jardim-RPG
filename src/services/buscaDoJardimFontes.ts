/** De onde a Busca do Jardim tira as entradas, e o que cada pessoa pode ver em cada uma.
 *
 * Regra de ouro: nada entra no índice que a tela correspondente não mostraria àquela pessoa. Por isso cada
 * fonte reaproveita a mesma regra da própria página (as funções compartilhadas de visibilidade) e este módulo
 * só soma o que for de quem comanda a mesa quando `isMestre` vale. Rascunho, `corpoMestre`, lore trancado,
 * registro rasurado ou oculto e mercado escondido ficam de fora para os jogadores. */

import type { LoreEntry } from '../../data/gerado/mundoCatalog';
import { ARVORES, VAZIO_ID, arvoreVisivel } from '../../data/mundo/arvoresCatalog';
import { tituloTopico } from '../../data/regras/titulos';
import type { RegrasCatalog } from '../../data/regras/regras';
import { buildTreeCodex, codexEntryPath, chaveDaEntrada, mapaDeBloqueios } from '../pages/Mundo/worldCodex';
import { SECOES_UNIVERSAIS, type IRegistro } from '../pages/Mundo/universais/registros';
import type { ICharacter } from '../types/character';
import type { IClasse, IRaca } from '../types/catalogo';
import { limparHtml, type EntradaDaBusca } from './buscaDoJardim';
import type { LojaItem } from './lojaCatalogService';
import { classesVisiveis, liberacoesDoMembro, racasVisiveis, type ConfigDeLiberacoes } from './visibilidadeRegras';

export interface ContextoDaBusca {
  /** Admin, criador, Mestre ou assistente da campanha: a mesma conta que as páginas fazem. */
  isMestre: boolean;
  /** Mestre ou assistente DA campanha ativa (a rota /mestre exige isto, e não o cargo de plataforma). */
  gestorDaCampanha: boolean;
  isCriador: boolean;
  isAdmin: boolean;
  temCampanha: boolean;
  usuarioId?: string;
  /** `campanhaAtiva.configuracoes`. */
  config: Record<string, unknown>;
}

const lista = (valor: unknown): string[] => (Array.isArray(valor) ? valor.map(String) : []);
const paginaVisivel = (oculta: unknown, isMestre: boolean) => isMestre || oculta !== true;

// ── Atalhos ────────────────────────────────────────────────────────────────────

export function atalhosDaBusca(contexto: ContextoDaBusca): EntradaDaBusca[] {
  const { isMestre, gestorDaCampanha, isCriador, isAdmin, temCampanha, config } = contexto;
  const atalho = (
    caminho: string,
    titulo: string,
    detalhe: string,
    chaves: string[],
  ): EntradaDaBusca => ({ id: `ir:${caminho}`, grupo: 'ir', titulo, detalhe, rota: caminho, chaves });

  const atalhos: EntradaDaBusca[] = [
    atalho('/', 'Início', 'Página inicial', ['home', 'novidades', 'continuar']),
    atalho('/campanhas', 'Trocar de campanha', 'Suas mesas', ['campanhas', 'mesas', 'mesa']),
    atalho('/regras', 'Livro de regras', 'Regras, classes e raças', ['livro', 'regras', 'manual']),
    atalho('/mundo', 'Mundo', 'Árvores, Deidades e história', ['lore', 'arvores', 'historia']),
    atalho('/materiais', 'Materiais', 'Receitas e ingredientes', ['crafting', 'alquimia', 'forja', 'cozinha']),
    atalho('/entidades', 'Entidades', 'Os contos das Entidades', ['entidade', 'contos']),
  ];

  if (temCampanha) {
    atalhos.push(
      atalho('/ficha', 'Fichas', 'Seus personagens', ['personagem', 'personagens', 'ficha']),
      atalho('/loja', 'Loja', 'Comprar e vender', ['comprar', 'vender', 'mercado', 'itens']),
      atalho('/sessao', 'Sessão ao vivo', 'Iniciativa, combate e vida', ['combate', 'iniciativa', 'mesa', 'vida']),
      atalho('/quadro', 'Quadro', 'Descobertas, mural e rank', ['mural', 'rank', 'descobertas', 'agenda']),
      atalho('/campanha', 'Página da campanha', 'Capa, crônica e anteriormente', ['cronica', 'campanha']),
      atalho('/frota', 'Frota', 'Veículos da campanha', ['veiculos', 'veiculo', 'garagem']),
      atalho('/cofre', 'Cofre do Jardim', 'A meta que a mesa enche', ['cofre', 'meta']),
    );
    if (paginaVisivel(config.calendario_oculto, isMestre)) {
      atalhos.push(atalho('/mundo/calendario', 'Calendário do Mundo', 'Estações, Lua e acontecimentos', ['calendario', 'estacao', 'lua', 'data']));
    }
    atalhos.push(atalho('/mundo/livro-da-verdade', 'Livro da Verdade', 'As lendas e o que muda quando caem', ['lendas', 'verdade']));
  }
  if (paginaVisivel(config.cronologia_geral_oculta, isMestre)) {
    atalhos.push(atalho('/mundo/cronologia', 'Linha do tempo do Jardim', 'A história geral', ['cronologia', 'historia', 'tempo']));
  }
  if (paginaVisivel(config.registros_universais_ocultos, isMestre)) {
    atalhos.push(atalho('/mundo/universal', 'Registros Universais', 'Bestiário, seres, locais e rumores', ['bestiario', 'criaturas', 'monstros', 'glossario', 'rumores']));
  }

  if (gestorDaCampanha && temCampanha) atalhos.push(atalho('/mestre', 'Painel do Mestre', 'Ferramentas de quem comanda a mesa', ['mestre', 'painel']));
  if (isCriador) atalhos.push(atalho('/criador', 'Painel do Criador', 'Conteúdo, convites e catálogos', ['criador', 'editor', 'conteudo']));
  if (isAdmin) atalhos.push(atalho('/admin', 'Administração', 'Contas, campanhas e auditoria', ['admin', 'auditoria']));
  return atalhos;
}

// ── Fichas ─────────────────────────────────────────────────────────────────────

export function fichasDaBusca(personagens: readonly ICharacter[]): EntradaDaBusca[] {
  return personagens
    .filter((personagem) => personagem.id && personagem.nome)
    .map((personagem) => ({
      id: `ficha:${personagem.id}`,
      grupo: 'ficha' as const,
      titulo: personagem.nome,
      detalhe: `Ficha · nível ${personagem.nivel || 1}`,
      rota: `/ficha/${personagem.id}`,
    }));
}

// ── Livro de regras ────────────────────────────────────────────────────────────

/** Uma manifestação do Catálogo mágico. Só o que o Livro mostra a todos: o aviso do Mestre nunca entra. */
interface ItemMagico {
  id: string;
  titulo: string;
  descricao?: string;
  efeito?: string;
  fluxo?: string;
  circulo?: number | string;
  grau?: number;
}

interface ItemDeCondicao {
  id: string;
  titulo: string;
  categoria: string;
  efeitos: readonly string[];
}

export interface FonteDeRegras {
  regras: RegrasCatalog;
  titulos: Record<string, string>;
  classes: readonly IClasse[];
  racas: readonly IRaca[];
  fluxos?: ReadonlyArray<{ id: string; titulo: string }>;
  magias?: readonly ItemMagico[];
  rituais?: readonly ItemMagico[];
  selos?: readonly ItemMagico[];
  encantamentos?: readonly ItemMagico[];
  condicoes?: readonly ItemDeCondicao[];
  crises?: readonly ItemDeCondicao[];
}

const ABAS_DO_CATALOGO_MAGICO = [
  { chave: 'magias', rotulo: 'Magia' },
  { chave: 'rituais', rotulo: 'Ritual' },
  { chave: 'selos', rotulo: 'Selo' },
  { chave: 'encantamentos', rotulo: 'Encantamento' },
] as const;

export function regrasDaBusca(fonte: FonteDeRegras, contexto: ContextoDaBusca): EntradaDaBusca[] {
  const { isMestre, usuarioId, config } = contexto;
  const entradas: EntradaDaBusca[] = [];

  // O Guia do Mestre inteiro e o `corpoMestre` de cada regra só existem para quem comanda.
  Object.keys(fonte.regras)
    .filter((chave) => chave !== 'mestre' || isMestre)
    .forEach((chave) => {
      const topico = fonte.regras[chave];
      const corpo = limparHtml(`${topico.corpo ?? ''} ${isMestre ? topico.corpoMestre ?? '' : ''}`);
      entradas.push({
        id: `regra:${chave}`,
        grupo: 'regra',
        titulo: tituloTopico(chave, fonte.titulos),
        detalhe: 'Livro de regras',
        rota: `/regras?topico=${encodeURIComponent(chave)}`,
        corpo: [topico.resumo, corpo].filter(Boolean).join(' '),
      });
    });

  const liberacoes = liberacoesDoMembro(config as ConfigDeLiberacoes, usuarioId);
  classesVisiveis(fonte.classes, isMestre, liberacoes.classes).forEach((classe) => {
    entradas.push({
      id: `regra:classe:${classe.id}`,
      grupo: 'regra',
      titulo: classe.titulo,
      detalhe: 'Classe',
      rota: `/regras/classes/${encodeURIComponent(classe.id)}`,
      corpo: classe.descricao ? limparHtml(classe.descricao) : undefined,
      chaves: ['classe'],
    });
  });
  racasVisiveis(fonte.racas, isMestre, liberacoes.racas).forEach((raca) => {
    entradas.push({
      id: `regra:raca:${raca.id}`,
      grupo: 'regra',
      titulo: raca.titulo,
      detalhe: 'Raça',
      rota: `/regras/racas/${encodeURIComponent(raca.id)}`,
      corpo: raca.descricao ? limparHtml(raca.descricao) : undefined,
      chaves: ['raca'],
    });
  });

  // Catálogo mágico: cada magia, ritual, selo e encantamento abre o Catálogo já na aba e no item certos.
  const nomeDoFluxo = new Map((fonte.fluxos ?? []).map((fluxo) => [fluxo.id, fluxo.titulo]));
  ABAS_DO_CATALOGO_MAGICO.forEach(({ chave, rotulo }) => {
    (fonte[chave] ?? []).forEach((item) => {
      const grau = item.circulo !== undefined ? `${item.circulo}º círculo` : item.grau !== undefined ? `grau ${item.grau}` : '';
      entradas.push({
        id: `regra:${chave}:${item.id}`,
        grupo: 'regra',
        titulo: item.titulo,
        detalhe: [rotulo, grau, item.fluxo ? nomeDoFluxo.get(item.fluxo) ?? '' : ''].filter(Boolean).join(' · '),
        rota: `/regras?topico=catalogo-magico&aba=${chave}&item=${encodeURIComponent(item.id)}`,
        corpo: limparHtml([item.descricao, item.efeito].filter((valor): valor is string => typeof valor === 'string').join(' ')),
        chaves: [rotulo],
      });
    });
  });

  // Condições e crises moram no capítulo das Condições.
  [...(fonte.condicoes ?? []), ...(fonte.crises ?? [])].forEach((condicao) => {
    entradas.push({
      id: `regra:condicao:${condicao.id}`,
      grupo: 'regra',
      titulo: condicao.titulo,
      detalhe: `Condição · ${condicao.categoria}`,
      rota: '/regras?topico=condicoes',
      corpo: condicao.efeitos.join(' '),
      chaves: ['condicao'],
    });
  });
  return entradas;
}

// ── Mundo ──────────────────────────────────────────────────────────────────────

const ROTULO_DO_TIPO: Record<string, string> = {
  cosmologia: 'Cosmologia', conceito: 'Conceito', deidade: 'Deidade', fluxo: 'Fluxo', realidade: 'Realidade',
  galho: 'Galho', dimensao: 'Dimensão', mundo: 'Mundo', reino: 'Reino', personagem: 'Personagem',
  soberano: 'Soberano', npc: 'Personagem', evento: 'Evento', idioma: 'Idioma', cultura: 'Cultura', local: 'Local',
};

const texto = (valor: unknown): string => (Array.isArray(valor) ? valor.filter((item) => typeof item === 'string').join(' ') : typeof valor === 'string' ? valor : '');

export function mundoDaBusca(catalog: readonly LoreEntry[], contexto: ContextoDaBusca): EntradaDaBusca[] {
  const { isMestre, config } = contexto;
  const loreRevelado = lista(config.lore_revelado);
  const loreOculto = lista(config.lore_oculto);
  const visibilidade = config as Parameters<typeof arvoreVisivel>[1];
  const entradas: EntradaDaBusca[] = [];
  const jaVistas = new Set<string>();

  const arvores = ARVORES.filter((arvore) => arvore.id !== 'universal');
  for (const arvore of arvores) {
    // A Árvore inteira trancada some da busca, como some do visualizador e da lista do Mundo.
    if (!isMestre && !arvoreVisivel(arvore.id, visibilidade, isMestre)) continue;
    const codex = buildTreeCodex(catalog as LoreEntry[], arvore.id);
    const bloqueios = mapaDeBloqueios(codex, { isMestre, loreRevelado, loreOculto });
    for (const entry of [...codex.entries, ...codex.crossTreeConcepts]) {
      const chave = chaveDaEntrada(entry);
      if (bloqueios.get(chave) === true || jaVistas.has(chave)) continue;
      jaVistas.add(chave);
      const epiteto = texto(entry.conteudo.epiteto);
      entradas.push({
        id: `mundo:${chave}`,
        grupo: 'mundo',
        titulo: entry.titulo,
        detalhe: [ROTULO_DO_TIPO[entry.tipo] ?? entry.tipo, arvore.id === VAZIO_ID ? 'O Vazio' : arvore.nome].filter(Boolean).join(' · '),
        rota: arvore.id === VAZIO_ID ? `/mundo/vazio/${entry.tipo}/${entry.id}` : codexEntryPath(arvore.id, entry),
        corpo: [epiteto, limparHtml(texto(entry.conteudo.descricao))].filter(Boolean).join(' '),
      });
    }
  }
  return entradas;
}

// ── Registros Universais ───────────────────────────────────────────────────────

export function registrosDaBusca(registros: readonly IRegistro[], contexto: ContextoDaBusca): EntradaDaBusca[] {
  const { isMestre, config } = contexto;
  if (!paginaVisivel(config.registros_universais_ocultos, isMestre)) return [];
  const secoesOcultas = lista(config.registros_universais_secoes_ocultas);
  const rotuloDaSecao = new Map(SECOES_UNIVERSAIS.map((secao) => [secao.id, secao.rotulo]));

  return registros
    .filter((registro) => (
      registro.titulo.trim()
      // Registro rasurado existe, mas o texto fica escondido para os jogadores; oculto o servidor nem envia.
      && (isMestre || (registro.revelacao === 'aberto' && !secoesOcultas.includes(registro.secao)))
    ))
    .map((registro) => ({
      id: `registro:${registro.chave}`,
      grupo: 'registro' as const,
      titulo: registro.titulo,
      detalhe: [rotuloDaSecao.get(registro.secao) ?? registro.secao, registro.subtitulo].filter(Boolean).join(' · '),
      rota: `/mundo/universal?secao=${encodeURIComponent(registro.secao)}&registro=${encodeURIComponent(registro.chave)}`,
      corpo: limparHtml([registro.descricao, ...registro.etiquetas, ...registro.campos.flat()].join(' ')),
    }));
}

// ── Loja ───────────────────────────────────────────────────────────────────────

/** Os mercados (1 a 4) que esta pessoa pode abrir: os que o Mestre escondeu só ele enxerga (por padrão, 3 e 4). */
export function mercadosAbertos(config: Record<string, unknown>, isMestre: boolean): number[] {
  const ocultos = Array.isArray(config.locais_ocultos) ? config.locais_ocultos.map(Number) : [3, 4];
  return [1, 2, 3, 4].filter((id) => isMestre || !ocultos.includes(id));
}

export function itensDaBusca(itens: readonly LojaItem[], contexto: ContextoDaBusca): EntradaDaBusca[] {
  const { isMestre, config } = contexto;
  const abertos = mercadosAbertos(config, isMestre);
  if (!abertos.length) return [];
  // A prateleira é cumulativa (cada mercado mostra o seu nível e os de baixo): o item aparece se algum mercado aberto o alcança.
  const maisAlto = Math.max(...abertos);
  return itens
    .filter((item) => item.nivelLoja <= maisAlto)
    .map((item) => {
      // O mercado em que o item aparece: o primeiro aberto que o alcança (a Loja só troca para mercado aberto).
      const mercado = abertos.find((id) => id >= item.nivelLoja) ?? maisAlto;
      const dados = (item.dadosBrutos ?? {}) as Record<string, unknown>;
      return {
        id: `item:${item.id}`,
        grupo: 'item' as const,
        titulo: item.nome,
        detalhe: [item.categoria, item.raridade].filter(Boolean).join(' · '),
        rota: `/loja?busca=${encodeURIComponent(item.nome)}&localizacao=${mercado}`,
        corpo: limparHtml(item.descricao ?? ''),
        chaves: [texto(dados.subtipo), texto(dados.funcao)].filter(Boolean),
      };
    });
}
