/**
 * O compêndio do livro em PDF: as fichas completas de classes e raças, o catálogo de Legados e
 * a lista de magias, rituais, selos e encantamentos.
 *
 * No site essas listas moram em componentes interativos (GridClasses, DetalhesClasse, GridRacas,
 * DetalhesRaca, CatalogoLegados, CatalogoMagico) e o texto dos tópicos `classes`, `racas` e
 * `catalogo-magico` é substituído por eles. Num PDF não há clique nem filtro, então o mesmo
 * conteúdo sai como entradas de livro, lidas dos MESMOS arquivos de dados e pelas mesmas funções
 * de serviço que a tela usa (classeService, racaService, magiaService...). Nada aqui é texto
 * escrito à mão: se o dado muda, o compêndio muda no próximo `npm run docs:livro`.
 *
 * Regras de visibilidade, as mesmas de src/services/visibilidadeRegras.ts:
 *   - edição do jogador: só o que qualquer jogador vê sem pedir liberação (categoria "padrao"
 *     e não indisponível). Classes e raças "esquecidas" dependem de o Mestre liberar mesa a mesa,
 *     e o PDF é o mesmo para todas as mesas;
 *   - edição do Mestre: tudo, com o selo de classe ou raça especial, e as notas de Mestre das
 *     magias (`aviso_mestre`), que o jogador nunca recebe.
 *
 * Cada entrada é uma lista PLANA de blocos (título, parágrafo, lista, tabela). O paginador do
 * livro só divide listas, tabelas e definições; um bloco-caixa alto demais não se parte e ficaria
 * cortado. Por isso nada aqui embrulha várias coisas numa caixa só.
 */
import { ARVORES } from '../../data/mundo/arvoresCatalog.ts';
import { ROTULO_RARIDADE_RECURSO, requisitoComponentesRitual } from '../../data/regras/recursos-materiais.ts';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO, RACAS_CATALOGO } from '../../src/services/catalogoService.ts';
import { formatarRecompensaClasse } from '../../src/services/classeService.ts';
import {
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  FLUXO_TEMAS,
  FUSOES_CATALOGO,
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  SIMBOLOS_POR_ID,
  TEMA_UNIVERSAL,
  circuloRotulo,
  magiaEhElemental,
  magiaExigeAvatar,
  rotuloPapelMagia,
  rotulosContraOAlvo,
  simbolosDoRito,
  tipoDeDanoDaMagia,
} from '../../src/services/magiaService.ts';
import { descreverRequisito } from '../../src/services/progressaoFichaService.ts';
import { linhasDeMagiaDaClasse } from '../../src/services/progressaoMagiaClasse.ts';
import { NIVEL_CONTEUDO_CLASSE, NIVEL_MAXIMO_CLASSE } from '../../src/services/progressaoNiveis.ts';
import {
  descreverOpcaoRacial,
  nivelMinimoTraco,
  obterEstagiosRaciais,
  obterGruposEscolhaRacial,
  obterTracosOpcaoRacial,
  temDescricaoPropria,
} from '../../src/services/racaService.ts';
import { rotuloCustoDePoder } from '../../src/services/statusService.ts';

export const esc = (valor) => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const ordemAlfabetica = (a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR');
const nomeDaArvore = (id) => ARVORES.find((arvore) => arvore.id === id)?.nome ?? id;

/** "A, B e C". */
const listaHumana = (itens) => (itens.length <= 1
  ? itens.join('')
  : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);

/** Título de uma seção dentro de uma entrada. Não é `h3.regras-subtitle` de propósito: o índice remissivo
 *  do livro cataloga todo `h3.regras-subtitle`, e "Poderes da classe" repetido em dezoito classes o encheria. */
const secao = (titulo) => `<h3 class="comp-secao">${esc(titulo)}</h3>`;

/* ------------------------------------------------------------------ */
/* Ficha técnica (execução, alcance, duração...)                       */
/* ------------------------------------------------------------------ */

const CAMPOS_DA_FICHA = [
  ['custo_mana', 'Mana'],
  ['custo_estamina', 'Estamina'],
  ['acao', 'Execução'],
  ['alcance', 'Alcance'],
  ['duracao', 'Duração'],
  ['defesa', 'Defesa'],
  ['dano', 'Dano'],
  ['usos', 'Usos'],
];

/** Os campos de execução de um efeito em linha: "EXECUÇÃO Reação · USOS Uma vez por rodada". */
const ficha = (efeito, { sem = [] } = {}) => {
  const campos = CAMPOS_DA_FICHA.filter(([chave]) => efeito[chave] && !sem.includes(chave));
  if (!campos.length) return '';
  return `<span class="ficha">${campos.map(([chave, rotulo]) => `<span><b>${rotulo}</b> ${esc(efeito[chave])}</span>`).join('')}</span>`;
};

/* ------------------------------------------------------------------ */
/* Classes                                                             */
/* ------------------------------------------------------------------ */

const niveisDe = (niveis) => (Array.isArray(niveis) && niveis.length ? listaHumana(niveis.map(String)) : '');
/** "Nível 18" ou "Níveis 1, 5 e 10". */
const rotuloDeNiveis = (niveis) => {
  const texto = niveisDe(niveis);
  if (!texto) return '';
  return `${niveis.length === 1 ? 'Nível' : 'Níveis'} ${texto}`;
};

const tabelaDeProgressao = (classe) => {
  const porNivel = new Map((classe.progressao || []).map((linha) => [linha.nivel, linha.recompensas]));
  const niveis = Array.from({ length: NIVEL_CONTEUDO_CLASSE }, (_, indice) => indice + 1);
  const linhas = niveis
    .map((nivel) => `<tr><td>${nivel}</td><td>${esc((porNivel.get(nivel) || []).map(formatarRecompensaClasse).join(', '))}</td></tr>`)
    .join('');
  return `<div class="regras-table-wrap"><table class="regras-table regras-table--dado"><thead><tr><th>Nível</th><th>Recompensas</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
};

const blocoDeMagiaDaClasse = (classe) => {
  if (!classe.progressao_magia) return '';
  const linhas = linhasDeMagiaDaClasse(classe).filter((linha) => linha.vagasMagia !== null);
  if (!linhas.length) return '';
  const teto = linhas.find((linha) => linha.tetoPorCirculo !== null);
  return `
    <h4>Magia da classe, nível a nível</h4>
    <p>A cada marco você libera um círculo mais alto e ganha vagas para aprender magias. As vagas são o total que a ficha pode conhecer${teto ? `; do nível ${teto.nivel} em diante, no máximo ${teto.tetoPorCirculo} magias do mesmo círculo` : ''}. O Fluxo recomendado de cada círculo é um aviso: você aprende o que a classe libera, e a DT do círculo decide se a magia sai.</p>
    <div class="regras-table-wrap"><table class="regras-table"><thead><tr><th>Nível da classe</th><th>Círculo liberado</th><th>Vagas de magia</th><th>Limite por círculo</th></tr></thead><tbody>${linhas.map((linha) => `<tr><td>${linha.nivel}</td><td>${linha.circulo}º</td><td>${linha.vagasMagia}</td><td>${esc(linha.tetoPorCirculo ?? 'sem limite')}</td></tr>`).join('')}</tbody></table></div>`;
};

const blocoDeEntregaDeSaida = (classe) => {
  const pericias = classe.pericias_concedidas || [];
  if (!pericias.length && !classe.dt_efeitos && !classe.tarefas_bancada) return '';
  const partes = [secao('Regras próprias da classe')];

  pericias.forEach((pericia) => {
    partes.push(`<h4>${esc(pericia.titulo)} <small>Perícia da classe${pericia.grau_inicial ? `, em ${esc(capitalizar(pericia.grau_inicial))}` : ''}</small></h4>`);
    if (pericia.descricao) partes.push(`<p>${esc(pericia.descricao)}</p>`);
  });

  if (classe.dt_efeitos) {
    partes.push(`<div class="regras-note regras-note--regra"><p><strong>${esc(classe.dt_efeitos.rotulo)}.</strong> ${esc(classe.dt_efeitos.descricao)}</p></div>`);
  }

  const bancada = classe.tarefas_bancada;
  if (bancada) {
    partes.push(`<h4>${esc(bancada.rotulo)}</h4>`);
    // `resumo_no_topo` é para a página do site, que desenha a tabela no fim.
    // No livro a tabela vem sempre aqui (o Catálogo do Invocador sumia do PDF).
    if (bancada.descricao) partes.push(`<p>${esc(bancada.descricao)}</p>`);
    const colunas = bancada.colunas || ['Tarefa', 'DT', 'Custo'];
    const linhas = (bancada.itens || [])
      .map((item) => `<tr><td><strong>${esc(item.tarefa)}</strong></td><td>${esc(item.dt)}</td><td>${esc(item.nota)}</td></tr>`)
      .join('');
    if (linhas) {
      partes.push(`<div class="regras-table-wrap"><table class="regras-table"><thead><tr>${colunas.map((coluna) => `<th>${esc(coluna)}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table></div>`);
    }
  }
  return partes.join('\n');
};

const blocoDeHabilidade = (classe, habilidade) => {
  const partes = [];
  const niveis = niveisDe(habilidade.niveis);
  partes.push(`<h4 class="hab-nome">${esc(habilidade.titulo)}${niveis ? ` <span class="hab-niveis">${esc(rotuloDeNiveis(habilidade.niveis))}</span>` : ''}</h4>`);
  if (habilidade.descricao) partes.push(`<p>${esc(habilidade.descricao)}${ficha(habilidade) ? ` ${ficha(habilidade)}` : ''}</p>`);
  else if (ficha(habilidade)) partes.push(`<p>${ficha(habilidade)}</p>`);

  const escala = habilidade.escalonamento;
  if (escala) {
    const marcos = (escala.marcos || [])
      .map((marco) => `nível ${marco.nivel} ${marco.nivel_classe > 1 ? `aos ${marco.nivel_classe}` : 'de saída'}`);
    const texto = escala.descricao || (marcos.length ? `${capitalizar(listaHumana(marcos))}.` : '');
    partes.push(`<p class="escala"><strong>${esc(escala.rotulo)}.</strong> ${esc(texto)}</p>`);
  }

  if ((habilidade.estagios || []).length) {
    partes.push(`<ul class="estagios">${habilidade.estagios.map((estagio) => `<li><strong>Nível ${esc(estagio.nivel)}${estagio.titulo ? `: ${esc(estagio.titulo)}` : ''}.</strong> ${esc(estagio.descricao)}${ficha(estagio) ? ` ${ficha(estagio)}` : ''}</li>`).join('')}</ul>`);
  }

  const opcoes = habilidade.opcoes || [];
  if (opcoes.length) {
    const rotulo = habilidade.escolha_opcoes?.rotulo || 'Opções';
    partes.push(`<p class="opcoes-titulo"><strong>${esc(rotulo)}.</strong> ${habilidade.escolha_opcoes?.descricao ? esc(habilidade.escolha_opcoes.descricao) : ''}</p>`);
    partes.push(`<ul class="opcoes">${opcoes.map((opcao) => {
      const detalhes = ficha(opcao, { sem: ['acao'] });
      const escalonamento = typeof opcao.escalonamento === 'string' ? ` <span class="opcao-escala">${esc(opcao.escalonamento)}</span>` : '';
      return `<li><strong>${esc(opcao.titulo)}</strong>${opcao.acao ? ` <span class="opcao-acao">${esc(opcao.acao)}</span>` : ''}. ${esc(opcao.descricao)}${detalhes ? ` ${detalhes}` : ''}${escalonamento}</li>`;
    }).join('')}</ul>`);
  }
  return partes.join('\n');
};

const blocoDePoder = (poder) => {
  const custo = rotuloCustoDePoder({ custoMana: poder.custo_mana, custoEstamina: poder.custo_estamina }) || 'Passivo';
  // O custo do poder já vai na etiqueta ao lado do nome.
  const detalhes = ficha(poder, { sem: ['custo_mana', 'custo_estamina'] });
  const requisitos = (poder.pre_requisitos || []).length
    ? ` <span class="poder-req"><b>Requisito</b> ${esc(poder.pre_requisitos.join(', '))}</span>`
    : '';
  const repetivel = poder.repetivel
    ? ` <span class="poder-req">Pode ser escolhido novamente${poder.limite ? `, até ${esc(poder.limite)} vezes` : ''}.</span>`
    : '';
  return `<li><strong>${esc(poder.titulo)}</strong> <span class="opcao-acao">${esc(custo)}</span>. ${esc(poder.descricao)}${detalhes ? ` ${detalhes}` : ''}${requisitos}${repetivel}</li>`;
};

/** O estoque de material que cada classe gasta. O catálogo dos materiais (nome e raridade de cada um) só existe no site. */
const CLASSES_COM_CATALOGO_DE_MATERIAIS = {
  alquimista: 'dos Componentes Químicos',
  cozinheiro: 'dos Mantimentos',
  engenheiro: 'da Sucata',
  ritualista: 'dos Componentes Ritualísticos',
};

/** "Existe em qualquer Árvore" ou "Só existe na Árvore Matriz". */
const ondeExiste = (classe) => {
  const ids = classe.arvores?.length ? classe.arvores : (classe.arvore ? [classe.arvore] : []);
  if (!ids.length) return 'Só existe nas Árvores que o Mestre definir';
  if (ARVORES.every((arvore) => ids.includes(arvore.id))) return 'Existe em qualquer Árvore';
  const nomes = ids.map(nomeDaArvore);
  return `Só existe ${nomes.length > 1 ? 'nas Árvores' : 'na Árvore'} ${esc(listaHumana(nomes))}`;
};

/** O texto de uma classe, em blocos soltos. */
export const corpoDaClasse = (classe) => {
  const especial = classe.categoria !== 'padrao';
  const partes = [];

  partes.push(`<p class="regras-lead">${especial
    ? `Classe especial: chega por conquista durante a campanha, nunca na criação, e é mais forte que uma classe comum. ${ondeExiste(classe)}, e o Mestre precisa liberar antes de ela entrar na ficha.`
    : 'Classe comum: serve a personagem de qualquer Árvore e não depende de liberação.'} Vai até o nível ${NIVEL_MAXIMO_CLASSE}.</p>`);

  const saida = blocoDeEntregaDeSaida(classe);
  if (saida) partes.push(saida);

  partes.push(secao('Progressão da classe'));
  partes.push(tabelaDeProgressao(classe));
  partes.push(`<div class="regras-note regras-note--regra"><p><strong>Maestria, níveis ${NIVEL_CONTEUDO_CLASSE + 1} a ${NIVEL_MAXIMO_CLASSE}.</strong> A tabela termina no nível ${NIVEL_CONTEUDO_CLASSE}. Do ${NIVEL_CONTEUDO_CLASSE + 1} ao ${NIVEL_MAXIMO_CLASSE} a classe segue somando ${classe.vida} de Vida, ${classe.mana} de Mana e ${classe.estamina ?? 0} de Estamina por nível e ganha a Maestria de 5 em 5 níveis, igual para todas as classes. Não há poder, habilidade nem evento novo depois do ${NIVEL_CONTEUDO_CLASSE}.</p></div>`);
  const magia = blocoDeMagiaDaClasse(classe);
  if (magia) partes.push(magia);

  if ((classe.habilidades || []).length) {
    partes.push(secao('Habilidades de classe'));
    classe.habilidades.forEach((habilidade) => partes.push(blocoDeHabilidade(classe, habilidade)));
  }

  if ((classe.eventos || []).length) {
    partes.push(secao('Eventos da classe'));
    partes.push(`<ul class="regras-list">${classe.eventos.map((evento) => `<li><strong>${esc(evento.titulo)}</strong> <span class="hab-niveis">${esc(rotuloDeNiveis(evento.niveis))}</span>. ${esc(evento.descricao)}</li>`).join('')}</ul>`);
  }

  if ((classe.poderes || []).length) {
    partes.push(secao('Poderes da classe'));
    partes.push(`<ul class="poderes">${classe.poderes.map(blocoDePoder).join('')}</ul>`);
  }

  const catalogo = CLASSES_COM_CATALOGO_DE_MATERIAIS[classe.id];
  if (catalogo) {
    partes.push(`<div class="regras-note regras-note--dica"><p>O catálogo ${catalogo} que esta classe gasta, com o nome e a raridade de cada material, fica no site, na página de Materiais.</p></div>`);
  }
  return partes.join('\n');
};

/** Entrada de classe no formato de "tópico" que o livro sabe imprimir. */
const entradaDeClasse = (classe, numero) => {
  const especial = classe.categoria !== 'padrao';
  return {
    id: `classe-${classe.id}`,
    titulo: classe.titulo,
    numero,
    quebra: true,
    regra: {
      status: especial ? 'Classe especial' : 'Classe comum',
      resumo: classe.descricao,
      destaques: [
        ['Vida', `+${classe.vida} por nível`],
        ['Mana', `+${classe.mana} por nível`],
        ['Estamina', `+${classe.estamina ?? 0} por nível`],
      ],
      corpo: corpoDaClasse(classe),
      corpoMestre: '',
    },
  };
};

/** As classes que entram na edição: as comuns para todos, e todas na do Mestre. */
export const classesDaEdicao = ({ comMestre }) => [...CLASSES_CATALOGO]
  .filter((classe) => !classe.indisponivel && (comMestre || classe.categoria === 'padrao'))
  .sort((a, b) => (a.categoria === b.categoria ? ordemAlfabetica(a, b) : (a.categoria === 'padrao' ? -1 : 1)));

/* ------------------------------------------------------------------ */
/* Raças                                                               */
/* ------------------------------------------------------------------ */

/** "+2", "0" ou "−3": sinal de menos de verdade, não hífen. */
const comSinal = (valor) => {
  const numero = Number(valor) || 0;
  return numero > 0 ? `+${numero}` : (numero < 0 ? `−${Math.abs(numero)}` : '0');
};
const metros = (valor) => `${comSinal(valor)} m`.replace('.', ',');

/** Os ajustes de Vida, Mana, Estamina e Movimento de uma opção, só os que mexem. */
const ajustesDaOpcao = (opcao) => [
  ['Vida', opcao.vida],
  ['Mana', opcao.mana],
  ['Estamina', opcao.estamina],
].filter(([, valor]) => Number(valor)).map(([rotulo, valor]) => `${rotulo} ${comSinal(valor)}`)
  .concat(Number(opcao.movimento) ? [`Movimento ${metros(opcao.movimento)}`] : []);

const rotuloDoFluxoDaOpcao = (fluxo) => {
  if (!fluxo) return '';
  if (fluxo === 'universal') return TEMA_UNIVERSAL.arvore;
  return FLUXO_TEMAS[fluxo] ? `Árvore ${FLUXO_TEMAS[fluxo].arvore}` : `Fluxo ${fluxo}`;
};

const itemDeTraco = (traco, { comNivel = true } = {}) => {
  const nivel = nivelMinimoTraco(traco);
  return `<li><strong>${esc(traco.titulo)}</strong>${comNivel && nivel > 1 ? ` <span class="opcao-acao">nível ${nivel}</span>` : ''}${traco.descricao ? `. ${esc(traco.descricao)}` : ''}</li>`;
};

const blocoDeOpcaoRacial = (opcao) => {
  const partes = [];
  const etiquetas = [
    rotuloDoFluxoDaOpcao(opcao.fluxo),
    opcao.somente_mestre === true ? 'Só o Mestre concede' : '',
    opcao.requer_autorizacao_mestre === true ? 'Com aval do Mestre' : '',
    ...ajustesDaOpcao(opcao),
  ].filter(Boolean);
  partes.push(`<h4 class="hab-nome">${esc(opcao.titulo)}${etiquetas.length ? ` <span class="hab-niveis">${esc(etiquetas.join(' · '))}</span>` : ''}</h4>`);
  if (temDescricaoPropria(opcao)) partes.push(`<p>${esc(descreverOpcaoRacial(opcao))}</p>`);
  const tracos = obterTracosOpcaoRacial(opcao);
  if (tracos.length) partes.push(`<ul class="estagios">${tracos.map((traco) => itemDeTraco(traco)).join('')}</ul>`);
  return partes.join('\n');
};

const blocoDeAnimais = (grupo, raca) => {
  const nomeDaMorfologia = new Map((raca.variantes || []).map((variante) => [variante.id, variante.titulo]));
  return `<ul class="opcoes">${grupo.opcoes.map((animal) => {
    const morfologias = (animal.morfologias || []).map((id) => nomeDaMorfologia.get(id) || id);
    const detalhes = [
      morfologias.length ? morfologias.join(', ') : '',
      animal.tamanho ? `Tamanho ${animal.tamanho}` : '',
      animal.arma_natural || '',
    ].filter(Boolean).join(' · ');
    return `<li><strong>${esc(animal.titulo)}</strong>${detalhes ? ` <span class="opcao-acao">${esc(detalhes)}</span>` : ''}${animal.descricao ? `. ${esc(animal.descricao)}` : ''}</li>`;
  }).join('')}</ul>`;
};

export const corpoDaRaca = (raca) => {
  const especial = raca.categoria !== 'padrao';
  const arvores = (raca.arvores?.length ? raca.arvores : (raca.arvore ? [raca.arvore] : [])).map(nomeDaArvore);
  const partes = [];

  partes.push(`<p class="regras-lead">${especial
    ? `Raça especial: tem regras e origem próprias${arvores.length && !raca.transformacao_em_qualquer_arvore ? ` e só existe ${arvores.length > 1 ? 'nas Árvores' : 'na Árvore'} ${esc(listaHumana(arvores))}` : ''}, e o Mestre precisa liberar antes de ela entrar na ficha.`
    : 'Raça comum: nasce em qualquer Árvore e fica liberada desde o começo, sem precisar pedir ao Mestre.'}</p>`);

  const fisiologia = raca.descricao ? (raca.fisiologia || []) : (raca.fisiologia || []).slice(1);
  if (fisiologia.length) {
    partes.push(secao('Fisiologia'));
    fisiologia.forEach((paragrafo) => partes.push(`<p>${esc(paragrafo)}</p>`));
  }

  if ((raca.caracteristicas || []).length) {
    partes.push(secao('Características'));
    partes.push(`<ul class="estagios">${raca.caracteristicas.map((traco) => itemDeTraco(traco)).join('')}</ul>`);
  }

  const estagios = obterEstagiosRaciais(raca);
  if (estagios.length) {
    partes.push(secao('Estágios'));
    partes.push('<p>Destravam sozinhos pelo nível total, sem precisar de autorização. Os efeitos se acumulam.</p>');
    estagios.forEach((estagio) => {
      const ajustes = ajustesDaOpcao(estagio);
      partes.push(`<h4 class="hab-nome">${esc(estagio.titulo)} <span class="hab-niveis">A partir do nível total ${nivelMinimoTraco(estagio)}${ajustes.length ? ` · ${esc(ajustes.join(' · '))}` : ''}</span></h4>`);
      if (estagio.descricao) partes.push(`<p>${esc(estagio.descricao)}</p>`);
      if ((estagio.caracteristicas || []).length) {
        partes.push(`<ul class="estagios">${estagio.caracteristicas.map((traco) => itemDeTraco(traco, { comNivel: false })).join('')}</ul>`);
      }
    });
  }

  obterGruposEscolhaRacial(raca).forEach((grupo) => {
    partes.push(secao(grupo.rotulo));
    if (grupo.descricao) partes.push(`<p>${esc(grupo.descricao)}</p>`);
    if (grupo.campo === 'animalId') partes.push(blocoDeAnimais(grupo, raca));
    else grupo.opcoes.forEach((opcao) => partes.push(blocoDeOpcaoRacial(opcao)));
  });
  return partes.join('\n');
};

const entradaDeRaca = (raca) => {
  const especial = raca.categoria !== 'padrao';
  return {
    id: `raca-${raca.id}`,
    titulo: raca.titulo,
    quebra: true,
    regra: {
      status: especial ? 'Raça especial' : 'Raça comum',
      resumo: raca.descricao || '',
      destaques: [
        ['Vida', comSinal(raca.vida)],
        ['Mana', comSinal(raca.mana)],
        ['Estamina', comSinal(raca.estamina)],
        ['Movimento', raca.movimento ? metros(raca.movimento) : '0'],
      ],
      corpo: corpoDaRaca(raca),
      corpoMestre: '',
    },
  };
};

/** As raças que entram na edição: as comuns para todos, e todas na do Mestre. A raça personalizada não tem ficha
 *  mecânica, e a Entidade existe no Livro das Entidades, não no livro de regras. */
export const racasDaEdicao = ({ comMestre }) => [...RACAS_CATALOGO]
  .filter((raca) => raca.id !== 'raca-personalizada' && raca.id !== 'entidade' && !raca.indisponivel
    && (comMestre || raca.categoria === 'padrao'))
  .sort((a, b) => (a.categoria === b.categoria ? ordemAlfabetica(a, b) : (a.categoria === 'padrao' ? -1 : 1)));

/* ------------------------------------------------------------------ */
/* Legados                                                             */
/* ------------------------------------------------------------------ */

const capitalizar = (valor) => `${String(valor).charAt(0).toLocaleUpperCase('pt-BR')}${String(valor).slice(1)}`;

/** Atributo e perícia saem com o nome da ficha ("Constituição 20+"), pela mesma função que a ficha usa. */
const formatarRequisito = (requisito) => {
  if (Array.isArray(requisito.ou)) return requisito.ou.map(formatarRequisito).join(' ou ');
  if (requisito.nivel_personagem) return `Nível ${requisito.nivel_personagem}+`;
  return descreverRequisito(requisito);
};

const requisitosDoLegado = (legado) => {
  const formatados = (legado.pre_requisitos || []).map(formatarRequisito).filter(Boolean);
  return formatados.length ? formatados.join(' · ') : 'Nenhum';
};

const corpoDosLegados = () => {
  const legados = [...LEGADOS_CATALOGO].sort(ordemAlfabetica);
  return [
    '<p class="regras-lead">Todos os Legados disponíveis para consulta, sem precisar abrir uma ficha para ver o que cada um faz. Cada nível de personagem que o ritmo de Legados libera abre uma escolha desta lista, e algumas raças dão vagas extras.</p>',
    `<div class="regras-table-wrap"><table class="regras-table" data-cartoes="1"><thead><tr><th>Legado</th><th>Pré-requisitos</th><th>Efeito</th></tr></thead><tbody>${legados.map((legado) => `<tr><td><strong>${esc(legado.titulo)}</strong></td><td>${esc(requisitosDoLegado(legado))}</td><td>${esc(legado.descricao)}</td></tr>`).join('')}</tbody></table></div>`,
  ].join('\n');
};

/* ------------------------------------------------------------------ */
/* Magias, rituais, selos, encantamentos e fusões                      */
/* ------------------------------------------------------------------ */

const fluxosPorId = new Map(FLUXOS_CATALOGO.map((fluxo) => [fluxo.id, fluxo]));
const tituloDoFluxo = (id) => (id === 'universal' ? 'Universal' : (fluxosPorId.get(id)?.titulo ?? id));

const linhaDeCampos = (campos) => {
  const validos = campos.filter(([, valor]) => valor !== undefined && valor !== null && valor !== '');
  if (!validos.length) return '';
  return `<span class="ficha">${validos.map(([rotulo, valor]) => `<span><b>${esc(rotulo)}</b> ${esc(valor)}</span>`).join('')}</span>`;
};

const blocoDeMagia = (magia) => {
  const partes = [];
  partes.push(`<h4 class="hab-nome">${esc(magia.titulo)} <span class="hab-niveis">${esc(rotuloPapelMagia(magia.papel))} · ${esc(magia.custo_mana)} Mana</span></h4>`);
  if (magia.descricao) partes.push(`<p class="magia-descricao">${esc(magia.descricao)}</p>`);
  partes.push(`<p>${linhaDeCampos([
    ['Execução', magia.execucao],
    ['Alcance', magia.alcance],
    ['Alvo', magia.alvo],
    ['Duração', magia.duracao],
    ['Concentração', magia.concentracao ? 'Sim' : 'Não'],
    ['Contra', rotulosContraOAlvo(magia).join(' · ') || 'Nenhum teste'],
    ['Dano', magia.dano ? `${magia.dano} ${tipoDeDanoDaMagia(magia, null)}` : ''],
    ['Acesso', magiaEhElemental(magia) ? 'Exclusiva de Elementarista · usa um elemento dominado' : ''],
    ['Aptidão', magiaExigeAvatar(magia) ? 'Exige Avatar desperto' : ''],
  ])}</p>`);
  partes.push(`<p><strong>Efeito.</strong> ${esc(magia.efeito)}</p>`);
  const porFluxo = magia.efeitos_por_fluxo
    ? FLUXOS_CATALOGO.filter((fluxo) => magia.efeitos_por_fluxo[fluxo.id])
    : [];
  if (porFluxo.length) {
    partes.push(`<ul class="opcoes">${porFluxo.map((fluxo) => `<li><strong>Canalizada por ${esc(fluxo.titulo)}.</strong> ${esc(magia.efeitos_por_fluxo[fluxo.id])}</li>`).join('')}</ul>`);
  }
  if (magia.aviso_mestre) partes.push(`<p class="aviso"><b>Aviso</b> ${esc(magia.aviso_mestre)}</p>`);
  return partes.join('\n');
};

const ordemDeMagia = (a, b) => (a.circulo - b.circulo) || a.titulo.localeCompare(b.titulo, 'pt-BR');

const corpoDeFluxo = (fluxoId) => {
  const partes = [];
  const fluxo = fluxosPorId.get(fluxoId);
  if (fluxoId === 'universal') {
    partes.push('<p class="regras-lead">Uma magia universal não pertence a Fluxo nenhum: qualquer Fluxo a aprende, e o efeito muda conforme quem canaliza. Cada entrada traz o efeito base e, logo abaixo, o que ele vira em cada um dos onze Fluxos.</p>');
  } else if (fluxo) {
    partes.push(`<p class="regras-lead">${esc(fluxo.essencia)}</p>`);
    if ((fluxo.possibilidades || []).length) {
      partes.push(`<h4>Possibilidades</h4><ul class="regras-list">${fluxo.possibilidades.map((texto) => `<li>${esc(texto)}</li>`).join('')}</ul>`);
    }
    if ((fluxo.limites || []).length) {
      partes.push(`<h4>Limites</h4><ul class="regras-list">${fluxo.limites.map((texto) => `<li>${esc(texto)}</li>`).join('')}</ul>`);
    }
    if (fluxoId === 'fim') {
      partes.push('<div class="regras-note regras-note--atencao"><p>O Fluxo do Fim exige autorização do Mestre antes de ser escolhido.</p></div>');
    }
  }
  const magias = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxoId).sort(ordemDeMagia);
  let circuloAtual = null;
  magias.forEach((magia) => {
    if (magia.circulo !== circuloAtual) {
      circuloAtual = magia.circulo;
      partes.push(secao(circuloRotulo(magia.circulo)));
    }
    partes.push(blocoDeMagia(magia));
  });
  return partes.join('\n');
};

const posicaoDoFluxo = (id) => FLUXOS_CATALOGO.findIndex((fluxo) => fluxo.id === id);
const ordemPorFluxo = (a, b) => (posicaoDoFluxo(a.fluxo) - posicaoDoFluxo(b.fluxo)) || a.titulo.localeCompare(b.titulo, 'pt-BR');

const cabecalhoDeRito = (titulo, fluxoId) => `<h4 class="hab-nome">${esc(titulo)} <span class="hab-niveis">${esc(tituloDoFluxo(fluxoId))}</span></h4>`;

const blocoDeRitual = (ritual) => {
  const partes = [cabecalhoDeRito(ritual.titulo, ritual.fluxo)];
  if (ritual.descricao) partes.push(`<p class="magia-descricao">${esc(ritual.descricao)}</p>`);
  partes.push(`<p>${linhaDeCampos([
    ['Tempo', ritual.tempo],
    ['Complexidade', ritual.complexidade],
    ['DT', ritual.dt],
    ['Mana', ritual.custo_mana],
    ['Requisito', ritual.requisito],
  ])}</p>`);
  partes.push(`<p><strong>Efeito.</strong> ${esc(ritual.efeito)}</p>`);
  if (ritual.falha) partes.push(`<p><strong>Falha.</strong> ${esc(ritual.falha)}</p>`);
  const requisito = requisitoComponentesRitual(ritual.complexidade);
  const raridade = ROTULO_RARIDADE_RECURSO[requisito.raridade];
  partes.push(`<p class="aviso"><b>Componentes ritualísticos</b> Este rito é ${esc(requisito.titulo)}: gaste ${esc(requisito.quantidade)} ${requisito.quantidade === 1 ? 'lote' : 'lotes'} de raridade ${esc(raridade)} ao começar. A Mana também é comprometida nesse momento.</p>`);
  const simbolos = simbolosDoRito(ritual.id);
  if (simbolos.length) {
    partes.push('<h4>O que cada Símbolo dá e cobra</h4>');
    partes.push(`<ul class="opcoes">${simbolos.map((simbolo) => `<li><strong>${esc(simbolo.titulo)}</strong> <span class="opcao-acao">${esc(simbolo.natureza === 'pecado' ? `Apagado por ${SIMBOLOS_POR_ID.get(simbolo.opostoId)?.titulo ?? '?'}` : `Apaga ${SIMBOLOS_POR_ID.get(simbolo.opostoId)?.titulo ?? '?'}`)}</span>. <b class="sinal">Dá</b> ${esc(simbolo.bonus.join(' '))} <b class="sinal">Cobra</b> ${esc(simbolo.onus.join(' '))}</li>`).join('')}</ul>`);
  }
  if (ritual.aviso_mestre) partes.push(`<p class="aviso"><b>Aviso</b> ${esc(ritual.aviso_mestre)}</p>`);
  return partes.join('\n');
};

const blocoDeSelo = (selo) => {
  const partes = [cabecalhoDeRito(selo.titulo, selo.fluxo)];
  if (selo.descricao) partes.push(`<p class="magia-descricao">${esc(selo.descricao)}</p>`);
  partes.push(`<p>${linhaDeCampos([
    ['Tempo de inscrição', selo.tempo],
    ['Grau', selo.grau],
    ['DT', selo.dt_inscricao],
    ['Mana', selo.custo_mana],
    ['Ativação', selo.ativacao],
  ])}</p>`);
  partes.push(`<p><strong>Efeito.</strong> ${esc(selo.efeito)}</p>`);
  if (selo.aviso_mestre) partes.push(`<p class="aviso"><b>Aviso</b> ${esc(selo.aviso_mestre)}</p>`);
  return partes.join('\n');
};

const blocoDeEncantamento = (encantamento) => {
  const partes = [cabecalhoDeRito(encantamento.titulo, encantamento.fluxo)];
  if (encantamento.descricao) partes.push(`<p class="magia-descricao">${esc(encantamento.descricao)}</p>`);
  partes.push(`<p>${linhaDeCampos([
    ['Tempo', encantamento.tempo],
    ['Aplicação', encantamento.aplicacao],
    ['Grau', encantamento.grau],
    ['DT', encantamento.dt],
    ['Mana', encantamento.custo_mana],
  ])}</p>`);
  partes.push(`<p><strong>Efeito.</strong> ${esc(encantamento.efeito)}</p>`);
  if (encantamento.aviso_mestre) partes.push(`<p class="aviso"><b>Aviso</b> ${esc(encantamento.aviso_mestre)}</p>`);
  return partes.join('\n');
};

const corpoDeLista = (itens, blocoDe, abertura) => [
  `<p class="regras-lead">${esc(abertura)}</p>`,
  ...[...itens].sort(ordemPorFluxo).map(blocoDe),
].join('\n');

const corpoDasFusoes = () => [
  '<p class="regras-lead">Uma fusão acrescenta a uma magia a assinatura de um segundo Fluxo. Cada magia aceita no máximo um Fluxo secundário, e cada Fluxo secundário tem a sua assinatura.</p>',
  `<ul class="opcoes">${FUSOES_CATALOGO.map((fusao) => `<li><strong>${esc(fusao.titulo)}</strong> <span class="opcao-acao">Fluxo secundário: ${esc(tituloDoFluxo(fusao.fluxo_secundario))}</span>. ${esc(fusao.efeito)}</li>`).join('')}</ul>`,
].join('\n');

/* ------------------------------------------------------------------ */
/* Partes do compêndio                                                 */
/* ------------------------------------------------------------------ */

const numerar = (letra, entradas) => entradas.map((entrada, indice) => ({ ...entrada, numero: `${letra}.${indice + 1}` }));

const entradaSimples = ({ id, titulo, status, resumo, destaques = [], corpo, quebra = true }) => ({
  id, titulo, quebra, regra: { status, resumo, destaques, corpo, corpoMestre: '' },
});

/** As partes do compêndio desta edição, no formato dos capítulos do livro (ver `numerarLivro`). */
export const partesDoCompendio = ({ comMestre }) => {
  const partes = [];

  const classes = classesDaEdicao({ comMestre });
  if (classes.length) {
    partes.push({
      id: 'compendio-classes',
      rotulo: 'Compêndio A',
      numeral: 'A',
      titulo: 'Classes',
      contagem: `${classes.length} classes`,
      descricao: 'A ficha completa de cada classe, nível a nível.',
      apresentacao: `Cada entrada traz as regras próprias da classe, a tabela de progressão do nível 1 ao ${NIVEL_CONTEUDO_CLASSE}, as habilidades com seus estágios e opções, os eventos e os poderes. Toda classe vai até o nível ${NIVEL_MAXIMO_CLASSE}; a segunda classe comum abre quando uma das suas chega ao nível ${NIVEL_CONTEUDO_CLASSE}, e daí em diante os níveis podem ser intercalados como você preferir. ${comMestre ? 'Esta edição inclui as classes especiais, que o Mestre libera mesa a mesa.' : 'Entram as classes comuns, que qualquer jogador pode escolher. As classes especiais dependem de liberação do Mestre e aparecem no site quando ele as libera.'}`,
      topicos: numerar('A', classes.map((classe) => entradaDeClasse(classe, ''))),
    });
  }

  const racas = racasDaEdicao({ comMestre });
  if (racas.length) {
    partes.push({
      id: 'compendio-racas',
      rotulo: 'Compêndio B',
      numeral: 'B',
      titulo: 'Raças',
      contagem: `${racas.length} raças`,
      descricao: 'A fisiologia, as características e as escolhas de cada raça.',
      apresentacao: `Cada entrada traz o ajuste inicial de Vida, Mana, Estamina e Movimento, a fisiologia, as características, os estágios que se destravam com o nível total e as escolhas da raça, como clã, forma ou linhagem. ${comMestre ? 'Esta edição inclui as raças especiais, que o Mestre libera mesa a mesa.' : 'Entram as raças comuns. As raças especiais dependem de liberação do Mestre e aparecem no site quando ele as libera.'}`,
      topicos: numerar('B', racas.map(entradaDeRaca)),
    });
  }

  partes.push({
    id: 'compendio-legados',
    rotulo: 'Compêndio C',
    numeral: 'C',
    titulo: 'Legados',
    contagem: `${LEGADOS_CATALOGO.length} Legados`,
    descricao: 'O catálogo de Legados, com pré-requisitos e efeito.',
    apresentacao: 'Um catálogo só, em ordem alfabética. Cada Legado mostra o pré-requisito, quando há, e o que ele faz.',
    topicos: numerar('C', [entradaSimples({
      id: 'legados-catalogo',
      titulo: 'Catálogo de Legados',
      status: 'Catálogo',
      resumo: 'Todos os Legados disponíveis para consulta.',
      destaques: [['Legados', String(LEGADOS_CATALOGO.length)]],
      corpo: corpoDosLegados(),
    })]),
  });

  const fluxosComMagia = ['universal', ...FLUXOS_CATALOGO.map((fluxo) => fluxo.id)];
  const entradasDeMagia = fluxosComMagia
    .filter((fluxoId) => MAGIAS_CATALOGO.some((magia) => magia.fluxo === fluxoId))
    .map((fluxoId) => {
      const total = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxoId).length;
      const fluxo = fluxosPorId.get(fluxoId);
      return entradaSimples({
        id: `magias-${fluxoId}`,
        titulo: fluxoId === 'universal' ? 'Magias universais' : `Fluxo ${tituloDoFluxo(fluxoId)}`,
        status: fluxoId === 'universal' ? 'Qualquer Fluxo' : `Árvore ${FLUXO_TEMAS[fluxoId]?.arvore ?? ''}`.trim(),
        resumo: fluxo?.essencia ?? 'Magias que qualquer Fluxo aprende, com o efeito de cada um.',
        destaques: [['Magias', String(total)], ['Círculos', '1º ao 10º']],
        corpo: corpoDeFluxo(fluxoId),
      });
    });
  const entradasDeRito = [
    entradaSimples({
      id: 'magias-rituais',
      titulo: 'Rituais',
      status: 'Sem círculo',
      resumo: 'Operações preparadas e demoradas, que ficam de fora do combate.',
      destaques: [['Rituais', String(RITUAIS_CATALOGO.length)]],
      corpo: corpoDeLista(RITUAIS_CATALOGO, blocoDeRitual, 'Ritual não tem círculo: a complexidade decide o custo em componentes. A Mana indicada fica comprometida ao começar o rito e não volta se ele falhar ou for interrompido.'),
    }),
    entradaSimples({
      id: 'magias-selos',
      titulo: 'Selos',
      status: 'Consumíveis',
      resumo: 'Efeitos inscritos antes e ativados por pessoas comuns.',
      destaques: [['Selos', String(SELOS_CATALOGO.length)]],
      corpo: corpoDeLista(SELOS_CATALOGO, blocoDeSelo, 'Um selo guarda um efeito previamente inscrito. Quem o inscreve gasta o tempo e a Mana indicados, e depois qualquer pessoa pode ativá-lo quando a condição de ativação acontece.'),
    }),
    entradaSimples({
      id: 'magias-encantamentos',
      titulo: 'Encantamentos',
      status: 'Persistentes',
      resumo: 'Padrões duradouros aplicados a um item, a uma criatura ou a um lugar.',
      destaques: [['Encantamentos', String(ENCANTAMENTOS_CATALOGO.length)]],
      corpo: corpoDeLista(ENCANTAMENTOS_CATALOGO, blocoDeEncantamento, 'Um encantamento é um padrão persistente. A aplicação diz onde ele pode ser posto, e o grau diz o tamanho do efeito.'),
    }),
    entradaSimples({
      id: 'magias-fusoes',
      titulo: 'Fusões de Fluxo',
      status: 'Assinaturas',
      resumo: 'A assinatura que um segundo Fluxo acrescenta a uma magia.',
      destaques: [['Fusões', String(FUSOES_CATALOGO.length)]],
      corpo: corpoDasFusoes(),
    }),
  ];
  partes.push({
    id: 'compendio-magias',
    rotulo: 'Compêndio D',
    numeral: 'D',
    titulo: 'Magias',
    contagem: `${MAGIAS_CATALOGO.length} magias, ${RITUAIS_CATALOGO.length} rituais, ${SELOS_CATALOGO.length} selos e ${ENCANTAMENTOS_CATALOGO.length} encantamentos`,
    descricao: 'Magias por Fluxo, rituais, selos, encantamentos e fusões.',
    apresentacao: 'As magias estão separadas por Fluxo e, dentro de cada um, por círculo. As magias universais abrem a parte, porque qualquer Fluxo as aprende. Depois vêm os rituais, os selos, os encantamentos e as fusões.',
    topicos: numerar('D', [...entradasDeMagia, ...entradasDeRito]),
  });

  return partes;
};

/* ------------------------------------------------------------------ */
/* Ajustes que só valem para o PDF                                     */
/* ------------------------------------------------------------------ */

/** Texto do site que fala em "catálogo" onde o PDF tem o Compêndio. O texto do tópico é um só, para o site e para o
 *  PDF; a troca acontece na montagem do PDF. Se alguém reescrever uma dessas frases, a montagem para com um erro que
 *  diz qual (em vez de deixar o PDF mandar o leitor para um catálogo que não existe no volume). */
export const AJUSTES_DO_PDF = {
  classes: {
    trocas: [[
      'A progressão completa, com habilidades, poderes e eventos por nível, está no catálogo de classes do site.',
      'A progressão completa, com habilidades, poderes e eventos por nível, está no Compêndio A, no fim deste volume, e no catálogo de classes do site.',
    ]],
  },
  racas: {
    trocas: [[
      'Fisiologia, traços e variantes completos estão no catálogo de raças do site.',
      'Fisiologia, traços e variantes completos estão no Compêndio B, no fim deste volume, e no catálogo de raças do site.',
    ]],
  },
  'catalogo-magico': {
    resumo: 'Onde achar cada magia, manifestação, ritual, selo, encantamento e assinatura de fusão, separados das regras de conjuração.',
    destaques: [['Onde', 'Compêndio D'], ['Organização', 'por Fluxo e círculo'], ['Consulta', 'regras e catálogo separados']],
    trocas: [[
      'Os filtros abaixo reúnem magias, manifestações de cada Fluxo, rituais, selos, encantamentos e assinaturas de fusão. Escolha primeiro a forma que procura e depois reduza pelos demais campos disponíveis.',
      'O Compêndio D, no fim deste volume, reúne magias, manifestações de cada Fluxo, rituais, selos, encantamentos e assinaturas de fusão, separados por Fluxo e, dentro de cada um, por círculo. O site traz os mesmos catálogos com busca e filtros.',
    ]],
  },
};

export const aplicarAjustesDoPdf = (id, regra) => {
  const ajuste = AJUSTES_DO_PDF[id];
  if (!ajuste) return regra;
  let corpo = regra.corpo;
  (ajuste.trocas ?? []).forEach(([de, para]) => {
    if (!corpo.includes(de)) {
      throw new Error(`O ajuste do PDF para "${id}" ficou velho: a frase "${de.slice(0, 60)}..." não existe mais no texto. Atualize AJUSTES_DO_PDF em tools/documentos-mundo/compendio.mjs.`);
    }
    corpo = corpo.replace(de, para);
  });
  return {
    ...regra,
    corpo,
    ...(ajuste.resumo ? { resumo: ajuste.resumo } : {}),
    ...(ajuste.destaques ? { destaques: ajuste.destaques } : {}),
  };
};

/** No PDF, o nome de cada classe e de cada raça nas listas dos tópicos `classes` e `racas` vira remissão para a
 *  entrada do Compêndio (com a página). Quem não tem entrada nesta edição (as especiais, no volume dos jogadores)
 *  fica como texto. */
export const ligarAoCompendio = (id, regra, { comMestre }) => {
  let corpo = regra.corpo;
  if (id === 'classes') {
    classesDaEdicao({ comMestre }).forEach((classe) => {
      corpo = corpo.replace(`<strong>${classe.titulo}</strong>`, `<strong><span class="regras-ref regras-ref--classe-${classe.id}">${classe.titulo}</span></strong>`);
    });
  }
  if (id === 'racas') {
    racasDaEdicao({ comMestre }).forEach((raca) => {
      corpo = corpo.replace(`<td><strong>${raca.titulo}</strong></td>`, `<td><strong><span class="regras-ref regras-ref--raca-${raca.id}">${raca.titulo}</span></strong></td>`);
    });
  }
  return corpo === regra.corpo ? regra : { ...regra, corpo };
};
