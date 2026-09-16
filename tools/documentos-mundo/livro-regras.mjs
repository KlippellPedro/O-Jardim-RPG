/**
 * O livro de regras de O Jardim, montado a partir do catálogo canônico.
 *
 * Fonte única: data/regras/regras.ts. Cada tópico do catálogo vira uma seção
 * do livro com o mesmo texto que a página de Regras do site mostra, sem
 * paráfrase e sem uma segunda versão para manter. A ordem e o agrupamento dos
 * capítulos saem de data/regras/navegacao.ts, e os títulos de titulos.ts, pelo
 * mesmo motivo: mudar a navegação do site reordena o livro sozinho.
 *
 * O que este arquivo acrescenta é a moldura de livro impresso: capa, folha de
 * rosto, o texto de como usar, as aberturas de capítulo e os apêndices. Os
 * espaços de arte vêm de artes.mjs, já medidos, com o pedido escrito dentro.
 *
 * Quem quebra isto em páginas é o paginador que roda dentro do navegador, em
 * gerar-livro.mjs. Aqui o conteúdo sai corrido, em blocos irmãos, porque é
 * assim que o paginador consegue medir e distribuir.
 */
import { REGRAS_OFICIAIS } from '../../data/regras/regras.ts';
import { GRUPOS_NAVEGACAO } from '../../data/regras/navegacao.ts';
import { tituloTopico } from '../../data/regras/titulos.ts';
import { ARTE_CAPA, ARTE_ROSTO, ARTES_CAPITULO, ARTES_TOPICO } from './artes.mjs';

/* ------------------------------------------------------------------ */
/* Paleta                                                              */
/* ------------------------------------------------------------------ */

/** Uma cor por capítulo, no mesmo espírito das cores que o site usa na
 *  navegação de Regras. Cada par é (cor viva, cor rebaixada): a viva vai para
 *  filete, cabeçalho de tabela e moldura, e a rebaixada para texto sobre papel
 *  claro, onde a viva não teria contraste. */
const CORES_CAPITULO = {
  'primeiros-passos': ['74,140,104', '54,104,78'],
  personagem: ['66,116,168', '46,86,128'],
  combate: ['160,62,74', '124,44,56'],
  cenas: ['180,104,52', '136,74,32'],
  magia: ['118,80,164', '88,58,126'],
  itens: ['166,120,52', '126,88,34'],
  veiculos: ['54,130,140', '36,96,106'],
  mundo: ['104,138,58', '74,102,38'],
  mestre: ['166,132,58', '124,96,34'],
};
const COR_PADRAO = ['118,108,138', '86,78,104'];

const cores = (grupoId) => CORES_CAPITULO[grupoId] || COR_PADRAO;

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const esc = (valor) => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const hoje = () => new Date().toLocaleDateString('pt-BR', {
  day: '2-digit', month: 'long', year: 'numeric',
});

const MEDIDAS = {
  capa: 'Capa · 210 × 297 mm com sangria',
  pagina: 'Página inteira · 210 × 297 mm com sangria',
  meia: 'Largura da mancha · 176 × 104 mm',
  faixa: 'Largura da mancha · 176 × 46 mm',
  coluna: 'Uma coluna · 84 × 62 mm',
};

/** Nome curto do tamanho, para a coluna do Mapa das Artes. */
const ROTULOS_TAMANHO = {
  capa: 'Capa',
  pagina: 'Página inteira',
  meia: 'Meia página',
  faixa: 'Faixa',
  coluna: 'Uma coluna',
};

/** Espaço reservado. O bloco já ocupa a altura final da imagem, então trocar o
 *  reservado pela arte não remexe a paginação em volta. */
const espacoArte = (arte, { dentroDaColuna = false } = {}) => {
  const cheia = !dentroDaColuna && arte.tamanho !== 'coluna';
  return `<figure class="arte arte--${arte.tamanho}"${cheia ? ' data-cheia="1"' : ''} data-arte="1" data-brief="${esc(arte.brief)}" data-tamanho="${esc(ROTULOS_TAMANHO[arte.tamanho] || arte.tamanho)}">
    <div class="arte-codigo" data-codigo>ART</div>
    <div class="arte-medida">${esc(MEDIDAS[arte.tamanho] || arte.tamanho)}</div>
    <figcaption class="arte-brief">${esc(arte.brief)}</figcaption>
  </figure>`;
};

/* ------------------------------------------------------------------ */
/* Capa e folha de rosto                                               */
/* ------------------------------------------------------------------ */

const capa = ({ comMestre }) => {
  const [ac, acd] = cores('mestre');
  return `
<section class="pagina pagina--capa" style="--ac:${ac};--acd:${acd}">
  <div class="capa-moldura"></div>
  <div class="capa-topo">
    <div class="capa-selo">Sistema d20 · Livro básico</div>
    <h1>O Jardim</h1>
    <div class="sub">Livro de Regras${comMestre ? ', edição do Mestre' : ''}</div>
    <div class="capa-regua"></div>
  </div>
  ${espacoArte(ARTE_CAPA)}
  <div class="capa-rodape">
    <strong>Volume único</strong><br>
    Criação de personagem, combate, magia, equipamento, veículos e economia
    ${comMestre ? '<div class="capa-aviso">Contém as notas do Mestre</div>' : ''}
  </div>
</section>`;
};

const rosto = ({ comMestre, totalTopicos, totalCapitulos }) => {
  const [ac, acd] = cores('primeiros-passos');
  return `
<section class="pagina pagina--rosto" style="--ac:${ac};--acd:${acd}">
  <div class="rosto-corpo">
    <div class="rosto-marca">O Jardim</div>
    <h1>Livro de Regras</h1>
    <div class="sub">${comMestre ? 'Edição do Mestre, com as notas de condução' : 'Edição do jogador'}</div>
    ${espacoArte(ARTE_ROSTO, { dentroDaColuna: true })}
    <dl class="rosto-ficha">
      <div class="linha"><dt>Sistema</dt><dd>d20, um dado resolve quase tudo</dd></div>
      <div class="linha"><dt>Conteúdo</dt><dd>${totalCapitulos} capítulos, ${totalTopicos} assuntos</dd></div>
      <div class="linha"><dt>Fonte</dt><dd>data/regras do repositório de O Jardim</dd></div>
      <div class="linha"><dt>Gerado em</dt><dd>${esc(hoje())}</dd></div>
      <div class="linha"><dt>Arte</dt><dd>Espaços reservados, ver o Mapa das Artes</dd></div>
    </dl>
    <p class="rosto-nota">
      Este volume é gerado do catálogo de regras do projeto. O texto de cada assunto
      é o mesmo que a mesa lê no site, então uma correção feita lá aparece aqui na
      próxima geração.${comMestre ? ' Esta edição inclui os trechos de condução e não vai para a mão dos jogadores.' : ''}
    </p>
  </div>
</section>`;
};

/* ------------------------------------------------------------------ */
/* Frente do livro                                                     */
/* ------------------------------------------------------------------ */

const comoUsar = ({ comMestre, totalCapitulos }) => `
  <h2 class="folha-titulo">Como usar este livro</h2>
  <div class="regua-ac"></div>
  <p class="regras-lead primeira">O livro está arrumado na ordem em que uma mesa costuma precisar dele. Os primeiros capítulos ensinam a jogar e a montar um personagem, o meio resolve combate e magia, e o fim trata de equipamento, viagem, dinheiro e reputação. Nada aqui exige leitura completa antes da primeira sessão.</p>

  <h3 class="regras-subtitle">A leitura mínima</h3>
  <p>Se você vai jogar hoje e nunca abriu o sistema, leia <strong>Como Jogar</strong> e <strong>Criação de Personagem</strong>. São dois assuntos, e eles bastam para a primeira sessão inteira. O resto do volume funciona como consulta: você procura o assunto no sumário, resolve a dúvida e volta para a mesa.</p>

  <h3 class="regras-subtitle">Como cada assunto é apresentado</h3>
  <p>Todo assunto abre em página nova, com o número do capítulo, um resumo de uma frase e três destaques com os valores que mais se consultam. Depois vem o texto da regra. Quando um número aparece numa caixa centralizada, ele é uma fórmula fechada, e vale como está escrito.</p>
  <div class="caixa">
    <div class="rotulo">Convenções</div>
    <p><strong>DT</strong> é a dificuldade de um teste. <strong>d20</strong> é o dado de vinte faces. <strong>Mod.</strong> é o modificador de um atributo. Uma barra entre dois valores significa escolha, e nunca soma.</p>
    <p>Colchete de piso, no formato ⌊valor⌋, quer dizer arredondar para baixo. Ele aparece sempre que o nível entra numa conta.</p>
  </div>

  <h3 class="regras-subtitle">O que está fora deste volume</h3>
  <p>Catálogos que mudam com frequência ficam no site, onde a busca e os filtros fazem o trabalho: a lista completa de magias, o arsenal, o bestiário e a ficha interativa. O livro traz as regras que governam esses catálogos, além dos números que você precisa ter na mão sem abrir o navegador.</p>
  ${comMestre
    ? '<p>Esta edição carrega, no fim de cada assunto, o trecho escrito para quem conduz a mesa. Ele aparece sobre fundo levemente tingido e começa sempre no mesmo lugar, depois do texto do jogador.</p>'
    : '<p>As tabelas de calibragem, orçamento de encontro e condução da campanha pertencem ao Mestre e saem numa edição própria deste mesmo volume.</p>'}

  <h3 class="regras-subtitle">Os espaços de arte</h3>
  <p>As molduras tracejadas que aparecem ao longo do livro são espaços já medidos para ilustração. Cada uma traz um código, o tamanho final e o pedido do que deve estar na imagem. O <strong>Mapa das Artes</strong>, no fim do volume, lista todas com a página onde caíram. Enquanto a ilustração não existe, o livro pode ser impresso e usado do mesmo jeito.</p>
  <p class="regras-note">São ${totalCapitulos} capítulos. A numeração dos assuntos segue o capítulo, então 3.4 é o quarto assunto do terceiro capítulo, e é assim que o sumário e o índice remissivo se referem a eles.</p>
`;

const sumario = (partes) => {
  const bloco = (parte) => `
    <div class="sumario-parte">
      <h3>Capítulo ${parte.numero} · ${esc(parte.titulo)}</h3>
      ${parte.topicos.map((t) => `
        <div class="sumario-item">
          <span class="t">${esc(t.numero)} ${esc(t.titulo)}</span>
          <span class="fio"></span>
          <span class="pg" data-pg="t-${t.id}">00</span>
        </div>`).join('')}
    </div>`;

  return `
  <h2 class="folha-titulo" data-quebra="1">Sumário</h2>
  <div class="regua-ac"></div>
  ${partes.map(bloco).join('')}
  <div class="sumario-parte">
    <h3>Apêndices</h3>
    <div class="sumario-item"><span class="t">A. Referência rápida</span><span class="fio"></span><span class="pg" data-pg="ap-rapida">00</span></div>
    <div class="sumario-item"><span class="t">B. Mapa das Artes</span><span class="fio"></span><span class="pg" data-pg="ap-artes">00</span></div>
    <div class="sumario-item"><span class="t">C. Índice remissivo</span><span class="fio"></span><span class="pg" data-pg="ap-indice">00</span></div>
  </div>`;
};

/* ------------------------------------------------------------------ */
/* Capítulos                                                           */
/* ------------------------------------------------------------------ */

const aberturaCapitulo = (parte) => {
  const [ac, acd] = cores(parte.id);
  const arte = ARTES_CAPITULO[parte.id];
  return `
<section class="pagina pagina--abertura" style="--ac:${ac};--acd:${acd}">
  ${arte ? `<div class="abertura-arte" data-arte="1" data-brief="${esc(arte.brief)}" data-tamanho="${esc(ROTULOS_TAMANHO.pagina)}">
    <div class="arte-codigo" data-codigo>ART</div>
    <div class="arte-medida">${esc(MEDIDAS.pagina)}</div>
    <div class="arte-brief">${esc(arte.brief)}</div>
  </div>` : ''}
  <div class="abertura-texto">
    <div class="abertura-num">Capítulo ${parte.numero}</div>
    <h2>${esc(parte.titulo)}</h2>
    <p class="abertura-resumo">${esc(parte.descricao)}</p>
    <ul class="abertura-lista">
      ${parte.topicos.map((t) => `<li><span class="n">${esc(t.numero)}</span>${esc(t.titulo)}</li>`).join('')}
    </ul>
  </div>
</section>`;
};

const topico = (item, { comMestre }) => {
  const regra = REGRAS_OFICIAIS[item.id];
  const arte = ARTES_TOPICO[item.id];
  const abertura = `
  <header class="abre-topico" data-abre="topico" data-topico="${esc(item.titulo)}" id="t-${item.id}">
    <div class="abre-linha">
      <span class="abre-num">Assunto ${esc(item.numero)}</span>
      <span class="abre-selo">${esc(regra.status)}</span>
    </div>
    <h2 class="abre-titulo">${esc(item.titulo)}</h2>
    <div class="abre-regua"></div>
    <p class="abre-resumo">${esc(regra.resumo)}</p>
    <div class="abre-destaques">
      ${regra.destaques.map(([rotulo, valor]) => `<span><b>${esc(rotulo)}</b>${esc(valor)}</span>`).join('')}
    </div>
  </header>`;

  const mestre = comMestre && regra.corpoMestre
    ? `<h3 class="regras-subtitle mestre-abre">Pelo lado do Mestre</h3>${regra.corpoMestre}`
    : '';

  return [abertura, arte ? espacoArte(arte) : '', regra.corpo, mestre].filter(Boolean).join('\n');
};

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

/** Estrutura do livro: capítulos e assuntos já numerados, na ordem da
 *  navegação. Tópico que exista no catálogo e não esteja em nenhum grupo entra
 *  num capítulo final, para nunca sumir do livro por esquecimento. */
export function estrutura({ comMestre = false } = {}) {
  const grupos = GRUPOS_NAVEGACAO.filter((grupo) => comMestre || grupo.id !== 'mestre');
  const usados = new Set();
  const partes = [];

  grupos.forEach((grupo) => {
    const numero = partes.length + 1;
    const topicos = grupo.topicos
      .filter((id) => REGRAS_OFICIAIS[id])
      .map((id, indice) => {
        usados.add(id);
        return { id, titulo: tituloTopico(id), numero: `${numero}.${indice + 1}` };
      });
    if (!topicos.length) return;
    partes.push({ id: grupo.id, numero, titulo: grupo.titulo, descricao: grupo.descricao, topicos });
  });

  const soltos = Object.keys(REGRAS_OFICIAIS)
    .filter((id) => !usados.has(id) && (comMestre || id !== 'mestre'));
  if (soltos.length) {
    const numero = partes.length + 1;
    partes.push({
      id: 'avulsos',
      numero,
      titulo: 'Regras avulsas',
      descricao: 'Assuntos que ainda não foram colocados em nenhum capítulo da navegação.',
      topicos: soltos.map((id, indice) => ({ id, titulo: tituloTopico(id), numero: `${numero}.${indice + 1}` })),
    });
  }

  return partes;
}

export function montarLivro({ comMestre = false } = {}) {
  const partes = estrutura({ comMestre });
  const totalTopicos = partes.reduce((soma, parte) => soma + parte.topicos.length, 0);
  const [acFrente, acdFrente] = cores('primeiros-passos');

  const corpo = [
    capa({ comMestre }),
    rosto({ comMestre, totalTopicos, totalCapitulos: partes.length }),
    `<section class="fluxo" data-parte="Abertura" data-ac="${acFrente}" data-acd="${acdFrente}">
      ${comoUsar({ comMestre, totalCapitulos: partes.length })}
      ${sumario(partes)}
    </section>`,
  ];

  partes.forEach((parte) => {
    const [ac, acd] = cores(parte.id);
    corpo.push(aberturaCapitulo(parte));
    corpo.push(`<section class="fluxo" data-parte="${esc(parte.titulo)}" data-ac="${ac}" data-acd="${acd}">
      ${parte.topicos.map((item) => topico(item, { comMestre })).join('\n')}
    </section>`);
  });

  corpo.push('<div id="marca-apendices"></div>');

  return {
    titulo: comMestre ? 'O Jardim · Livro de Regras (edição do Mestre)' : 'O Jardim · Livro de Regras',
    arquivo: comMestre ? 'O-Jardim-Livro-de-Regras-MESTRE' : 'O-Jardim-Livro-de-Regras',
    corpo: corpo.join('\n'),
    partes,
    totalTopicos,
  };
}
