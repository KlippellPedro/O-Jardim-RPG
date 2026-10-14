/**
 * O livro de regras de O Jardim, montado a partir do catálogo canônico.
 *
 * Fonte única: data/regras/regras.ts. Cada tópico do catálogo vira uma seção
 * do livro com o mesmo texto que a página de Regras do site mostra, sem
 * paráfrase e sem uma segunda versão para manter. A ordem, o agrupamento em
 * capítulos, a numeração e as cores saem de data/regras/livro.ts (que por sua
 * vez lê navegacao.ts e titulos.ts), os mesmos que o site usa: mudar a
 * navegação do site reordena o livro sozinho.
 *
 * O que este arquivo acrescenta é a moldura de livro impresso: capa, folha de
 * rosto, sumário, o texto de como usar, as aberturas de capítulo, a
 * contracapa e os apêndices. Remissões entre tópicos (`regras-ref--id`) viram
 * link com número de página; o número é preenchido pelo paginador depois de
 * cada tópico ter caído numa página.
 *
 * A edição de distribuição não leva espaços reservados para ilustração. Com
 * `comArtes` o livro volta a trazer as molduras tracejadas e o Mapa das Artes
 * (artes.mjs), que servem a quem está encomendando a arte.
 *
 * Quem quebra isto em páginas é o paginador que roda dentro do navegador, em
 * gerar-livro.mjs. Aqui o conteúdo sai corrido, em blocos irmãos, porque é
 * assim que o paginador consegue medir e distribuir.
 */
import { REGRAS_OFICIAIS } from '../../data/regras/regras.ts';
import {
  ANTES_DE_LER,
  CONTINUE_EM,
  TRILHAS_DE_LEITURA,
  acentoDoCapitulo,
  cssRgb,
  numerarLivro,
  romano,
} from '../../data/regras/livro.ts';
import { tituloTopico } from '../../data/regras/titulos.ts';
import { ARTE_CAPA, ARTE_ROSTO, ARTES_CAPITULO, ARTES_TOPICO } from './artes.mjs';
import { emblemaDourado, emblemaEmCor, fioComLosango } from './emblema.mjs';
import { artePronta, imagemDePagina } from './artes-prontas.mjs';
import { aplicarAjustesDoPdf, ligarAoCompendio, partesDoCompendio } from './compendio.mjs';

/* ------------------------------------------------------------------ */
/* Cores                                                               */
/* ------------------------------------------------------------------ */

/** Cor de um capítulo como o CSS do livro espera: (viva, rebaixada) em "r,g,b". */
const COR_DAS_PARTES_DO_COMPENDIO = {
  'compendio-classes': 'personagem',
  'compendio-racas': 'mundo',
  'compendio-legados': 'itens',
  'compendio-magias': 'magia',
};

const cores = (idDoCapitulo) => {
  const acento = acentoDoCapitulo(COR_DAS_PARTES_DO_COMPENDIO[idDoCapitulo] ?? idDoCapitulo);
  return [cssRgb(acento.vivo, ','), cssRgb(acento.escuro, ',')];
};

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const esc = (valor) => String(valor ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const hoje = () => new Date().toLocaleDateString('pt-BR', {
  day: 'numeric', month: 'long', year: 'numeric',
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

/** "Capítulo 3" para os capítulos de regras, "Compêndio A" para as partes do compêndio. */
const rotuloDaParte = (parte) => parte.rotulo ?? `Capítulo ${parte.numero}`;

/** "A, B e C". */
const listaHumana = (itens) => (itens.length <= 1
  ? itens.join('')
  : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`);

/** Espaço reservado. O bloco já ocupa a altura final da imagem, então trocar o
 *  reservado pela arte não remexe a paginação em volta. Só existe na edição
 *  de planejamento de arte. */
const espacoArte = (arte, { dentroDaColuna = false } = {}) => {
  const cheia = !dentroDaColuna && arte.tamanho !== 'coluna';
  return `<figure class="arte arte--${arte.tamanho}"${cheia ? ' data-cheia="1"' : ''} data-arte="1" data-brief="${esc(arte.brief)}" data-tamanho="${esc(ROTULOS_TAMANHO[arte.tamanho] || arte.tamanho)}">
    <div class="arte-codigo" data-codigo>ART</div>
    <div class="arte-medida">${esc(MEDIDAS[arte.tamanho] || arte.tamanho)}</div>
    <figcaption class="arte-brief">${esc(arte.brief)}</figcaption>
  </figure>`;
};

/** Transforma as remissões do texto (`<span class="regras-ref regras-ref--id">`) em link com número de
 *  página. O número só existe depois da paginação: o paginador preenche `data-pg`. Até lá o espaço é
 *  reservado com um número largo ("000"), senão o texto cresceria depois de medido e estouraria a coluna.
 *  Remissão para um tópico que não está nesta edição (o Guia do Mestre, no volume dos jogadores) vira texto simples.
 *  Dentro de um parêntese a página entra com vírgula, "(ver Combate, p. 47)", para não abrir parêntese dentro de
 *  parêntese. */
export const resolverRemissoes = (html, idsDaEdicao) => String(html ?? '')
  .replace(/\([^()]*\)/g, (trecho) => trecho.replaceAll('<span class="regras-ref ', '<span data-pg-virgula="1" class="regras-ref '))
  .replace(
    /<span (data-pg-virgula="1" )?class="regras-ref regras-ref--([a-z0-9-]+)">([\s\S]*?)<\/span>/g,
    (_, virgula, id, texto) => {
      if (!idsDaEdicao.has(id)) return texto;
      const formato = virgula ? ', p. {n}' : ' (p. {n})';
      return `<a class="ref" href="#t-${id}">${texto}<span class="ref-pg" data-pg="t-${id}" data-pg-formato="${formato}">${formato.replace('{n}', '000')}</span></a>`;
    },
  );

/* ------------------------------------------------------------------ */
/* Capa, folha de rosto e contracapa                                   */
/* ------------------------------------------------------------------ */

const capa = ({ comMestre, comArtes }) => {
  const [ac, acd] = cores('mestre');
  // Arte própria em docs/livro/artes/capa.jpg: a imagem vira a página e o emblema em vetor sai.
  const arte = artePronta('capa');
  return `
<section class="pagina pagina--capa${arte ? ' pagina--com-imagem' : ''}" style="--ac:${ac};--acd:${acd}">
  ${arte ? `${imagemDePagina(arte)}<div class="capa-veu"></div>` : ''}
  <div class="capa-moldura"></div>
  <div class="capa-moldura capa-moldura--fina"></div>
  <div class="capa-selo">Sistema d20 · Livro básico</div>
  ${arte ? '' : (comArtes ? espacoArte(ARTE_CAPA) : `<div class="capa-emblema">${emblemaDourado('capa-arvore')}</div>`)}
  <div class="capa-titulo">
    <div class="capa-nome">O Jardim</div>
    <div class="capa-regua"></div>
    <div class="capa-sub">Livro de Regras</div>
    <div class="capa-edicao">${comMestre ? 'Edição do Mestre' : 'Edição do jogador'}</div>
  </div>
  <div class="capa-rodape">
    Criação de personagem, combate, magia, equipamento, veículos e economia
    ${comMestre ? '<div class="capa-aviso">Contém as notas do Mestre</div>' : ''}
  </div>
</section>`;
};

const rosto = ({ comMestre, comArtes, totalTopicos, totalCapitulos, compendio, data }) => {
  const [ac, acd] = cores('primeiros-passos');
  return `
<section class="pagina pagina--rosto" style="--ac:${ac};--acd:${acd}">
  <div class="rosto-corpo">
    <div class="rosto-marca">O Jardim</div>
    <h1 class="rosto-titulo">Livro de Regras</h1>
    <div class="sub">${comMestre ? 'Edição do Mestre, com as notas de condução' : 'Edição do jogador'}</div>
    ${comArtes ? espacoArte(ARTE_ROSTO, { dentroDaColuna: true }) : `<div class="rosto-fio">${fioComLosango(acd)}</div>`}
    <dl class="rosto-ficha">
      <div class="linha"><dt>Sistema</dt><dd>d20, um dado resolve quase tudo</dd></div>
      <div class="linha"><dt>Conteúdo</dt><dd>${totalCapitulos} capítulos, ${totalTopicos} tópicos${compendio.length ? ` e o Compêndio: ${contagemDoCompendio(compendio)}` : ''}</dd></div>
      <div class="linha"><dt>Edição</dt><dd>${esc(data)}</dd></div>
      <div class="linha"><dt>No site</dt><dd>Livro de Regras com busca, ficha interativa, loja e bestiário</dd></div>
      ${comArtes ? '<div class="linha"><dt>Arte</dt><dd>Espaços reservados, ver o Mapa das Artes</dd></div>' : ''}
    </dl>
    <p class="rosto-nota">
      Este volume reúne o mesmo texto que o site mostra, tópico por tópico. Se o site trouxer uma correção depois
      desta edição, vale o que está no site.${comMestre ? ' Esta edição inclui os trechos de condução e não deve chegar às mãos dos jogadores.' : ''}
    </p>
  </div>
</section>`;
};

/** "18 classes, 12 raças, 121 Legados, além de 352 magias, 35 rituais, 33 selos e 33 encantamentos": a última parte
 *  já traz o próprio "e", então ela entra com "além de" em vez de um segundo "e". */
const contagemDoCompendio = (compendio) => {
  const contagens = compendio.map((parte) => parte.contagem);
  if (contagens.length < 2) return contagens.join('');
  return `${contagens.slice(0, -1).join(', ')}, além de ${contagens[contagens.length - 1]}`;
};

const contracapa = ({ comMestre, data }) => {
  const [ac, acd] = cores('mestre');
  const arte = artePronta('contracapa');
  return `
<section class="pagina pagina--contracapa${arte ? ' pagina--com-imagem' : ''}" style="--ac:${ac};--acd:${acd}">
  ${arte ? `${imagemDePagina(arte)}<div class="contracapa-veu"></div>` : ''}
  <div class="capa-moldura"></div>
  <div class="contracapa-corpo">
    ${arte ? '' : `<div class="capa-emblema capa-emblema--pequeno">${emblemaDourado('contracapa-arvore')}</div>`}
    <div class="contracapa-titulo">O Jardim</div>
    <div class="capa-regua"></div>
    <p class="contracapa-texto">A ficha, o mundo, a loja, o bestiário e a mesa ao vivo estão no site, com busca e com tudo o que muda de uma sessão para outra. Este livro é uma fotografia das regras e dos catálogos no dia da edição.</p>
    ${comMestre ? '<div class="capa-aviso">Edição do Mestre</div>' : ''}
    <div class="contracapa-data">${esc(data)}</div>
  </div>
</section>`;
};

/* ------------------------------------------------------------------ */
/* Frente do livro                                                     */
/* ------------------------------------------------------------------ */

const comoUsar = ({ comMestre, comArtes, ids, compendio = [] }) => {
  const ref = (id) => `<span class="regras-ref regras-ref--${id}">${esc(tituloTopico(id))}</span>`;
  const trilhas = TRILHAS_DE_LEITURA
    .filter((trilha) => comMestre || !trilha.soMestre)
    .map((trilha) => ({ ...trilha, passos: trilha.passos.filter((id) => ids.has(id)) }))
    .filter((trilha) => trilha.passos.length >= 2)
    .map((trilha) => `<li><strong>${esc(trilha.titulo)}.</strong> ${esc(trilha.para)} Leia ${listaHumana(trilha.passos.map(ref))}, nessa ordem.</li>`)
    .join('');

  return `
  <h1 class="folha-titulo" data-quebra="1" data-cabeca="Como usar este livro">Como usar este livro</h1>
  <div class="regua-ac"></div>
  <p class="regras-lead primeira">O livro está arrumado na ordem em que uma mesa costuma precisar dele. Os primeiros capítulos ensinam a jogar e a montar um personagem, o meio resolve combate e magia, e o fim trata de equipamento, viagem, dinheiro e reputação. Nada aqui exige leitura completa antes da primeira sessão.</p>

  <h3 class="regras-subtitle">Por onde começar</h3>
  <p>Se você vai jogar hoje e nunca abriu o sistema, leia ${ref('como-jogar')} e ${ref('criacao-personagem')}. Os dois bastam para a primeira sessão inteira. O resto do volume funciona como consulta: você procura o tópico no sumário, resolve a dúvida e volta para a mesa. Se preferir um caminho pronto, escolha o que combina com você:</p>
  <ul class="regras-list">${trilhas}</ul>

  <h3 class="regras-subtitle">Como cada tópico é apresentado</h3>
  <p>Todo tópico abre com o número dele (3.4 é o quarto tópico do capítulo 3), o nome, uma frase que diz para que ele serve e até três destaques com os valores que mais se consultam. Logo depois vem o texto da regra, quase sempre com uma caixa <strong>Em resumo</strong> no começo, para quem só precisa do essencial.</p>
  <div class="regras-resumo"><ul><li>Esta caixa reúne o que você precisa lembrar do tópico.</li><li>Se algo ali não bastar, a seção logo abaixo explica por inteiro.</li></ul></div>

  <h3 class="regras-subtitle">As caixas do livro</h3>
  <div class="regras-note regras-note--exemplo"><p>Uma situação resolvida passo a passo, com os números.</p></div>
  <div class="regras-note regras-note--atencao"><p>O erro que mais aparece na mesa, antes que ele aconteça.</p></div>
  <div class="regras-note regras-note--dica"><p>Um jeito de usar a regra sem travar o jogo.</p></div>
  <div class="regras-note regras-note--regra"><p>O que vale exatamente como está escrito.</p></div>
  <div class="regras-formula">d20 + bônus contra a DT</div>
  <p>Uma fórmula numa caixa centralizada, como a de cima, é uma conta fechada e vale como está escrita. Quando um tópico cita outro, o nome do outro aparece sublinhado e seguido da página, como em <span class="regras-ref regras-ref--combate">Combate</span>. No PDF, tocar no nome leva até lá.</p>

  <h3 class="regras-subtitle">Convenções</h3>
  <div class="caixa">
    <div class="rotulo">Para ler os números</div>
    <p><strong>DT</strong> é a dificuldade de um teste, <strong>d20</strong> é o dado de vinte faces e <strong>Mod.</strong> é o modificador de um atributo. Uma barra entre dois valores significa escolha, e nunca soma. O colchete de piso, ⌊valor⌋, quer dizer arredondar para baixo.</p>
  </div>

  ${compendio.length ? `<h3 class="regras-subtitle">O Compêndio</h3>
  <p>Depois dos capítulos vem o Compêndio, onde ficam as listas longas, cada entrada começando numa página nova. As entradas aparecem também no índice remissivo, pelo nome.</p>
  <ul class="regras-list">${compendio.map((parte) => `<li><strong>${esc(parte.rotulo)}, ${esc(parte.titulo)}.</strong> ${esc(parte.contagem)}. ${esc(parte.descricao)} Começa em <span class="regras-ref regras-ref--${esc(parte.topicos[0].id)}">${esc(parte.topicos[0].titulo)}</span>.</li>`).join('')}</ul>` : ''}

  <h3 class="regras-subtitle">O que está fora deste volume</h3>
  <p>${compendio.length
    ? `O que muda a toda hora ou depende da sua mesa fica no site, onde a busca e os filtros fazem o trabalho: o arsenal da loja, o bestiário, a ficha interativa${comMestre ? '' : ' e as classes e raças especiais que o Mestre libera para a sua mesa'}.`
    : 'Os catálogos longos ficam no site, onde a busca e os filtros fazem o trabalho: cada raça e cada classe com todos os seus poderes, a lista de magias, o arsenal da loja, o bestiário e a ficha interativa.'} O livro traz as regras que governam esses catálogos e os números que você precisa ter na mão.</p>
  ${comMestre
    ? '<p>Esta edição traz, no fim de cada tópico, o trecho escrito para quem conduz a mesa, sobre fundo levemente tingido e sempre depois do texto do jogador. O Guia do Mestre fecha a parte de regras, logo antes do Compêndio.</p>'
    : '<p>As tabelas de calibragem, o orçamento de encontro e o Guia do Mestre pertencem a quem conduz a mesa e saem numa edição própria deste mesmo livro.</p>'}
  ${comArtes
    ? '<p>As molduras tracejadas que aparecem ao longo do livro são espaços já medidos para ilustração. Cada uma traz um código, o tamanho final e o pedido do que deve estar na imagem, e o Mapa das Artes, no fim, lista todas com a página onde caíram.</p>'
    : ''}
`;
};

const sumario = (partes, { comArtes }) => {
  const bloco = (parte) => {
    const [ac, acd] = cores(parte.id);
    return `
    <div class="sumario-parte" style="--ac:${ac};--acd:${acd}">
      <div class="sumario-cap"><span class="cap-num">${esc(rotuloDaParte(parte))}</span> ${esc(parte.titulo)}</div>
      ${parte.topicos.map((t) => `
        <a class="sumario-item" href="#t-${t.id}">
          <span class="t"><span class="n">${esc(t.numero)}</span>${esc(t.titulo)}</span>
          <span class="fio"></span>
          <span class="pg" data-pg="t-${t.id}">00</span>
        </a>`).join('')}
    </div>`;
  };

  const letras = comArtes ? ['A', 'B', 'C'] : ['A', 'B'];
  const itensApendice = [
    ['Referência rápida', 'ap-rapida'],
    ...(comArtes ? [['Mapa das Artes', 'ap-artes']] : []),
    ['Índice remissivo', 'ap-indice'],
  ];

  return `
  <h1 class="folha-titulo" data-quebra="1" data-cabeca="Sumário">Sumário</h1>
  <div class="regua-ac"></div>
  ${partes.map(bloco).join('')}
  <div class="sumario-parte">
    <div class="sumario-cap">Apêndices</div>
    ${itensApendice.map(([nome, id], indice) => `<a class="sumario-item" href="#${id}"><span class="t"><span class="n">${letras[indice]}</span>${nome}</span><span class="fio"></span><span class="pg" data-pg="${id}">00</span></a>`).join('')}
  </div>`;
};

/* ------------------------------------------------------------------ */
/* Capítulos                                                           */
/* ------------------------------------------------------------------ */

const aberturaCapitulo = (parte, { comArtes }) => {
  const [ac, acd] = cores(parte.id);
  // Arte própria em docs/livro/artes/abertura-<id>.jpg: a imagem vira a página, com um véu escuro por baixo do texto.
  const pronta = artePronta(`abertura-${parte.id}`);
  const arte = comArtes && !pronta ? ARTES_CAPITULO[parte.id] : null;
  return `
<section class="pagina pagina--abertura${pronta ? ' pagina--com-imagem' : ''}" data-capitulo="${esc(parte.id)}" style="--ac:${ac};--acd:${acd}">
  ${pronta ? `${imagemDePagina(pronta)}<div class="abertura-veu"></div>` : (arte ? `<div class="abertura-arte" data-arte="1" data-brief="${esc(arte.brief)}" data-tamanho="${esc(ROTULOS_TAMANHO.pagina)}">
    <div class="arte-codigo" data-codigo>ART</div>
    <div class="arte-medida">${esc(MEDIDAS.pagina)}</div>
    <div class="arte-brief">${esc(arte.brief)}</div>
  </div>` : `<div class="abertura-marca">${emblemaEmCor(ac, 0.2, 'abertura-arvore')}</div>`)}
  <div class="abertura-texto">
    <div class="abertura-numeral" aria-hidden="true">${esc(parte.numeral ?? romano(parte.numero))}</div>
    <h1 class="abertura-titulo"><span class="abertura-num">${esc(rotuloDaParte(parte))}</span> <span class="abertura-nome">${esc(parte.titulo)}</span></h1>
    <div class="abertura-regua"></div>
    <p class="abertura-resumo">${esc(parte.apresentacao)}</p>
    <ul class="abertura-lista">
      ${parte.topicos.map((t) => `<li><span class="n">${esc(t.numero)}</span>${esc(t.titulo)}</li>`).join('')}
    </ul>
  </div>
</section>`;
};

const topico = (item, parte, { comMestre, comArtes, ids }) => {
  // As entradas do compêndio trazem a própria regra; os tópicos de regras vêm do catálogo.
  // Alguns tópicos falam em "catálogo do site" onde o PDF tem o Compêndio: o ajuste é só do PDF.
  const regra = item.regra ?? ligarAoCompendio(item.id, aplicarAjustesDoPdf(item.id, REGRAS_OFICIAIS[item.id]), { comMestre });
  const arte = comArtes ? ARTES_TOPICO[item.id] : null;
  const antes = (ANTES_DE_LER[item.id] ?? []).filter((id) => ids.has(id));
  const veja = (CONTINUE_EM[item.id] ?? []).filter((id) => ids.has(id));
  const abertura = `
  <header class="abre-topico" data-abre="topico" data-cabeca="${esc(item.titulo)}" data-topico-id="${esc(item.id)}" data-numero="${esc(item.numero)}" data-capitulo-id="${esc(parte.id)}"${item.quebra ? ' data-quebra="1"' : ''} id="t-${item.id}">
    <div class="abre-linha">
      <span class="abre-num">${esc(rotuloDaParte(parte))} · ${esc(parte.titulo)}</span>
      <span class="abre-selo">${esc(regra.status)}</span>
    </div>
    <h2 class="abre-titulo"><span class="abre-n">${esc(item.numero)}</span> ${esc(item.titulo)}</h2>
    <div class="abre-regua"></div>
    <p class="abre-resumo">${esc(regra.resumo)}</p>
    <div class="abre-destaques">
      ${(regra.destaques || []).map(([rotulo, valor]) => `<span><b>${esc(rotulo)}</b>${esc(valor)}</span>`).join('')}
    </div>
    ${antes.length ? `<p class="abre-antes"><b>Antes de ler</b> ${antes.map((id) => `<span class="regras-ref regras-ref--${id}">${esc(tituloTopico(id))}</span>`).join(', ')}</p>` : ''}
  </header>`;

  const vejaTambem = veja.length
    ? `<p class="veja-tambem"><b>Veja também</b> ${veja.map((id) => `<span class="regras-ref regras-ref--${id}">${esc(tituloTopico(id))}</span>`).join(', ')}</p>`
    : '';

  const mestre = comMestre && regra.corpoMestre
    ? `<h3 class="regras-subtitle mestre-abre">Pelo lado do Mestre</h3>${regra.corpoMestre}`
    : '';

  return tipografiaDoLivro(resolverRemissoes(
    [abertura, arte ? espacoArte(arte) : '', regra.corpo, vejaTambem, mestre].filter(Boolean).join('\n'),
    ids,
  ));
};

/** Acabamento de livro, só no PDF: sinal de menos de verdade antes de número ("−2", e não "-2") e aspas curvas
 *  ("“assim”") quando o trecho de texto fecha as próprias aspas. Mexe só no texto entre as tags; o site segue
 *  mostrando o texto como ele está nos dados. */
export const tipografiaDoLivro = (html) => String(html ?? '').replace(/>([^<]+)</g, (_, texto) => {
  let saida = texto.replaceAll('&quot;', '"').replace(/(^|[\s(/])-(?=\d)/g, '$1−');
  const retas = (saida.match(/"/g) || []).length;
  if (retas && retas % 2 === 0) {
    let abrir = true;
    saida = saida.replace(/"/g, () => {
      const aspa = abrir ? '“' : '”';
      abrir = !abrir;
      return aspa;
    });
  }
  return `>${saida}<`;
});

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

/** Estrutura do livro: capítulos e tópicos já numerados, na ordem da navegação, e depois as partes do compêndio. */
export function estrutura({ comMestre = false } = {}) {
  return [
    ...numerarLivro(Object.keys(REGRAS_OFICIAIS), { comMestre }),
    ...partesDoCompendio({ comMestre }),
  ];
}

/** `data` existe para o gerador calcular um hash do conteúdo que não muda de um dia para o outro. */
export function montarLivro({ comMestre = false, comArtes = false, data = hoje() } = {}) {
  const partes = estrutura({ comMestre });
  const capitulos = partes.filter((parte) => !parte.rotulo);
  const compendio = partes.filter((parte) => parte.rotulo);
  const totalTopicos = capitulos.reduce((soma, parte) => soma + parte.topicos.length, 0);
  const ids = new Set(partes.flatMap((parte) => parte.topicos.map((t) => t.id)));
  const [acFrente, acdFrente] = cores('primeiros-passos');
  const opcoes = { comMestre, comArtes, ids, compendio };

  const frente = resolverRemissoes(
    `${sumario(partes, { comArtes })}\n${comoUsar(opcoes)}`,
    ids,
  );

  const corpo = [
    capa({ comMestre, comArtes }),
    rosto({ comMestre, comArtes, totalTopicos, totalCapitulos: capitulos.length, compendio, data }),
    `<section class="fluxo" data-parte="O Jardim · Livro de Regras" data-ac="${acFrente}" data-acd="${acdFrente}">
      ${frente}
    </section>`,
  ];

  partes.forEach((parte) => {
    const [ac, acd] = cores(parte.id);
    corpo.push(aberturaCapitulo(parte, { comArtes }));
    corpo.push(`<section class="fluxo" data-parte="${esc(rotuloDaParte(parte))} · ${esc(parte.titulo)}" data-ac="${ac}" data-acd="${acd}">
      ${parte.topicos.map((item) => topico(item, parte, opcoes)).join('\n')}
    </section>`);
  });

  corpo.push('<div id="marca-apendices"></div>');
  corpo.push(contracapa({ comMestre, data }));

  const nome = comMestre ? 'O-Jardim-Livro-de-Regras-MESTRE' : 'O-Jardim-Livro-de-Regras';
  return {
    titulo: comMestre ? 'O Jardim · Livro de Regras (edição do Mestre)' : 'O Jardim · Livro de Regras',
    edicao: comMestre ? 'mestre' : 'jogador',
    arquivo: nome,
    corpo: corpo.join('\n'),
    partes,
    totalTopicos,
    comArtes,
  };
}
