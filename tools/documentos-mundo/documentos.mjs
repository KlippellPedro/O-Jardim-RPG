/**
 * Os três documentos de mesa, montados em HTML a partir das fontes canônicas.
 *
 * A regra que vale pra tudo aqui: descrição de lore sai do JSON literal, sem
 * paráfrase. O que este arquivo acrescenta é só a moldura, ou seja, o texto que
 * liga uma seção na outra e explica ao jogador o que ele está lendo. Assim uma
 * correção de lore no data/ nunca briga com uma versão reescrita no PDF.
 */
import {
  MUNDO, CRONICAS, FACCOES, RACAS, RACAS_REAIS, IDIOMAS, PALETA, COR_NEUTRA,
  cor, porId, daArvore, esc, paragrafos, lista, fichaDados, pilulas, sinal, emLinha,
} from './dados.mjs';

/* ================================================================== */
/* Peças de página                                                     */
/* ================================================================== */

const capa = ({ selo, titulo, sub, rodape, rgb }) => `
<section class="capa" style="--ac:${rgb}">
  <div class="capa-topo">
    <div class="capa-selo">${esc(selo)}</div>
    <h1>${titulo}</h1>
    <div class="sub">${esc(sub)}</div>
    <div class="capa-regua"></div>
  </div>
  <div class="capa-rodape">${rodape}</div>
</section>`;

const abertura = ({ num, titulo, resumo, rgb }) => `
<section class="abertura" style="--ac:${rgb}">
  <div class="num">${esc(num)}</div>
  <h2>${titulo}</h2>
  ${resumo ? `<div class="resumo">${esc(resumo)}</div>` : ''}
</section>`;

/** Bloco de conteúdo corrido. O paginador (ver gerar.mjs) mede os filhos
 *  diretos deste elemento e os distribui em páginas de verdade, então o que
 *  entra aqui pode ter qualquer tamanho. */
const folha = (conteudo, rgb = COR_NEUTRA) =>
  `<section class="fluxo" data-ac="${rgb}" style="--ac:${rgb}">${conteudo}</section>`;

const secao = (titulo, rotulo) => `
  <header class="cabeca">
    ${rotulo ? `<div class="rotulo">${esc(rotulo)}</div>` : ''}
    <h2 class="secao">${esc(titulo)}</h2>
    <div class="regua-ac"></div>
  </header>`;

const caixa = (rotulo, corpo) =>
  `<div class="caixa"><div class="rotulo">${esc(rotulo)}</div>${corpo}</div>`;

const cartao = (titulo, epiteto, corpo, rgb) => `
  <div class="cartao"${rgb ? ` style="--ac:${rgb}"` : ''}>
    <h4>${esc(titulo)}</h4>
    ${epiteto ? `<p class="ep">${esc(epiteto)}</p>` : ''}
    ${corpo}
  </div>`;

/** Diagrama da hierarquia. Caixas encaixadas, porque a relação real entre as
 *  camadas é de conter, e não de apontar uma pra outra. */
const cascataSVG = () => `
<figure class="diagrama">
<svg viewBox="0 0 620 330" xmlns="http://www.w3.org/2000/svg" role="img"
     aria-label="Jardim contém Árvore, que contém Galho, que contém Dimensão, que contém Reino">
  <defs>
    <pattern id="vazio" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#c9c1d2" stroke-width="1"/>
    </pattern>
  </defs>
  <style>
    .cx { fill: none; stroke-width: 1.3; }
    .rot { font: 600 10px "Segoe UI", sans-serif; letter-spacing: 1.6px; text-transform: uppercase; }
    .qtd { font: 400 9.5px Constantia, Georgia, serif; fill: #8b8296; font-style: italic; }
  </style>

  <rect x="8" y="8" width="604" height="314" rx="5" fill="#f2ede4" stroke="#b9b0a2" stroke-width="1.3"/>
  <text class="rot" x="22" y="27" fill="#6b6377">Jardim</text>
  <text class="qtd" x="76" y="27">o todo</text>

  <rect x="22" y="38" width="576" height="272" rx="4" fill="url(#vazio)" opacity="0.55"/>
  <text class="rot" x="34" y="56" fill="#7a7286">O Vazio</text>
  <text class="qtd" x="94" y="56">o espaço entre as Árvores, governado por Erebus</text>

  <rect class="cx" x="46" y="68" width="528" height="228" rx="4" stroke="#d6789c" fill="#fdfbfa"/>
  <text class="rot" x="60" y="87" fill="#b45a7c">Árvore</text>
  <text class="qtd" x="118" y="87">nove delas, cada uma é território, Fluxo e Deidade ao mesmo tempo</text>

  <rect class="cx" x="76" y="99" width="468" height="182" rx="4" stroke="#8454bc" fill="#fbf9fd"/>
  <text class="rot" x="90" y="118" fill="#7247ab">Galho</text>
  <text class="qtd" x="140" y="118">também chamado de Realidade</text>

  <rect class="cx" x="106" y="130" width="408" height="136" rx="4" stroke="#56ac5c" fill="#f9fcf9"/>
  <text class="rot" x="120" y="149" fill="#3f8a45">Dimensão</text>

  <rect class="cx" x="136" y="161" width="348" height="90" rx="4" stroke="#a88a48" fill="#fdfbf6"/>
  <text class="rot" x="150" y="180" fill="#8a7038">Reino e outros Locais</text>
  <text class="qtd" x="150" y="199">Salém, o Império, Emberhold, Lionês, Khazad,</text>
  <text class="qtd" x="150" y="214">Transilvânia, Alfarn, Iwagakure...</text>
  <text class="qtd" x="150" y="236">é aqui que o seu personagem pisa.</text>
</svg>
<figcaption>Descobrir uma camada não revela a de dentro. É por essa linha que a exploração acontece.</figcaption>
</figure>`;

/* ================================================================== */
/* DOCUMENTO 1 — O Jardim                                              */
/* ================================================================== */

export function docJardim() {
  const paginas = [];
  const hierarquia = porId('hierarquia-do-jardim');
  const idiomas = porId('idiomas-do-jardim');
  const sonhar = porId('sonhar-entre-as-arvores');
  const arvores = CRONICAS.arvores;
  const AC = '134,28,48';

  paginas.push(capa({
    selo: 'O Jardim · Documento de mesa',
    titulo: 'O Jardim',
    sub: 'O que existe, como está arrumado, e onde foi que você entrou nisso',
    rodape: '<strong>Guia do recém-chegado</strong><br>Escrito para jogadores. Nenhuma regra de ficha depende deste texto.',
    rgb: AC,
  }));

  /* --- antes de tudo --- */
  paginas.push(folha(`
    ${secao('Antes de tudo', 'Como usar este documento')}
    <p class="capitular">Este documento responde uma pergunta só: onde você está. Se você acabou de sentar numa mesa do Jardim, já ouviu as palavras Árvore, Galho, Dimensão e Fluxo sendo usadas como se todo mundo soubesse o que significam. Aqui elas aparecem na ordem, do maior até o chão em que o seu personagem pisa.</p>
    <p>O que está escrito adiante é geografia e história. A mecânica fica no site, na sua ficha e no módulo de Regras. Você pode ler isto inteiro sem abrir a ficha uma vez.</p>
    ${caixa('Três documentos, três assuntos', `
      <p>Este é o primeiro de três. Ele cobre a estrutura do mundo e a história geral.</p>
      <p><strong>As Dez Árvores</strong> abre cada Árvore uma por uma, com o que se sabe da Deidade, do Fluxo e dos lugares que cresceram nela.</p>
      <p><strong>Os Seres do Jardim</strong> apresenta os povos que habitam tudo isso, que é o documento que você quer na mão na hora de decidir o que o seu personagem é.</p>`)}
    ${caixa('Uma advertência sobre o que falta', `
      <p>Os registros do Jardim têm buraco, e o buraco é quase todo do mesmo período. Depois que a Malha subiu e as Deidades pararam de conversar, ninguém teve mais com quem conferir nada. Quando este documento diz que algo não foi registrado, isso é informação, e não descuido.</p>`)}
  `, AC));

  /* --- capítulo I: a forma --- */
  paginas.push(abertura({
    num: 'Capítulo I',
    titulo: 'A forma do Jardim',
    resumo: 'Cinco camadas encaixadas, nove Árvores, e um espaço entre elas que não conta como Árvore nenhuma.',
    rgb: AC,
  }));

  paginas.push(folha(`
    ${secao('A hierarquia', 'Camada por camada')}
    ${paragrafos(hierarquia?.conteudo?.descricao, 'capitular')}
    ${cascataSVG()}
  `, AC));

  /* --- índice das Árvores --- */
  const linhasArvores = arvores.map((a) => {
    const rgb = cor(a.id);
    return `<tr>
      <td style="width:6mm"><span style="display:inline-block;width:3mm;height:3mm;border-radius:50%;background:rgb(${rgb})"></span></td>
      <td><strong>${esc(a.nome)}</strong></td>
      <td>${esc(a.deidade)}</td>
      <td>${esc(a.fluxo)}</td>
      <td>${esc(a.estado)}</td>
    </tr>`;
  }).join('');

  paginas.push(folha(`
    ${secao('As nove Árvores, e o Vazio', 'Quem é quem')}
    <p class="capitular">Cada Árvore é três coisas ao mesmo tempo, e ninguém nunca conseguiu separar as três: o território, o Fluxo que ele segura e a Deidade que mora ali. Dizer "Gênese", "Fluxo da Origem" ou "Aethel" é apontar para a mesma coisa de três ângulos diferentes.</p>
    <p>A tabela abaixo é o índice do segundo documento. O estado de cada uma importa mais do que parece: das dez linhas, só duas seguem ativas.</p>
    <table class="dados">
      <thead><tr><th></th><th>Árvore</th><th>Deidade</th><th>Fluxo</th><th>Estado</th></tr></thead>
      <tbody>${linhasArvores}</tbody>
    </table>
    ${caixa('Por que O Vazio aparece na lista sem ser uma Árvore', `
      <p>O Vazio ocupa uma linha porque um personagem ainda pode se originar dele, e porque Erebus é uma Deidade como as outras. O que ele governa é o espaço entre as nove Árvores e o resto do universo, e não um pedaço de terra dentro delas. É por ficar fora de todas ao mesmo tempo que o Banco Lunar consegue existir.</p>`)}
  `, AC));

  /* --- capítulo II: história --- */
  paginas.push(abertura({
    num: 'Capítulo II',
    titulo: 'Como o Jardim chegou até aqui',
    resumo: 'Da primeira coisa a existir até os erros que começaram a aparecer quando ninguém mais estava olhando.',
    rgb: AC,
  }));

  const marcos = [...CRONICAS.linha_tempo_geral].sort((a, b) => a.ordem - b.ordem);
  const metade = Math.ceil(marcos.length / 2);
  const marcoHtml = (m) => `
    <div class="marco">
      <div class="era">${esc(m.era)}</div>
      <h4>${esc(m.titulo)}</h4>
      <p>${esc(String(m.resumo).trim())}</p>
    </div>`;

  paginas.push(folha(`
    ${secao('A linha do tempo', 'Onze marcos')}
    <p>A contagem de anos do Jardim foi reiniciada uma vez, no Cataclismo. Tudo que vem antes dele é lembrado por era, e não por data.</p>
    <div class="tempo">${marcos.slice(0, metade).map(marcoHtml).join('')}</div>
  `, AC));

  paginas.push(folha(`
    <div class="tempo">${marcos.slice(metade).map(marcoHtml).join('')}</div>
    ${caixa('O que a Era do Silêncio significa pra sua mesa', `
      <p>Depois que Jota Macedo prendeu Keryx e a Malha assumiu as mensagens entre as Árvores, as Deidades deixaram de conseguir se falar. Gênese e Limiar seguem trabalhando. As outras oito estão paralisadas, e o que elas sustentavam continua de pé por inércia.</p>
      <p>É por isso que a campanha acontece num mundo em que reinos aparecem sem ter sido fundados, seres atravessam de uma Árvore pra outra sem saber como, e dimensões começam a se juntar. Os erros da última era são material de aventura, não bug do cenário.</p>`)}
  `, AC));

  /* --- capítulo III: Realidade 0 --- */
  paginas.push(abertura({
    num: 'Capítulo III',
    titulo: 'A Realidade 0',
    resumo: 'O único Galho habitado que se conhece, e o palco onde a campanha acontece.',
    rgb: cor('aethel'),
  }));

  const dimensoes = daArvore('aethel', 'dimensao');
  const reinos = daArvore('aethel', 'reino');
  const locais = daArvore('aethel', 'local');
  const soberanos = daArvore('aethel', 'personagem');
  const eventos = daArvore('aethel', 'evento');
  const AG = cor('aethel');

  paginas.push(folha(`
    ${secao('As Dimensões', 'Onde se pisa')}
    <p class="capitular">A Realidade 0 é um Galho de Gênese, e é o único Galho habitado de que se tem notícia. Dentro dele abrem-se as Dimensões abaixo. Elas não se parecem entre si e não precisam se parecer, porque o que as mantém no mesmo Galho é a Árvore, e não qualquer semelhança.</p>
    ${dimensoes.map((d) => cartao(
      d.titulo,
      d.conteudo?.galho ? `Galho: ${d.conteudo.galho}` : '',
      `${paragrafos(d.conteudo?.descricao)}${lista(d.conteudo?.caracteristicas)}`,
      AG,
    )).join('')}
  `, AG));

  paginas.push(folha(`
    ${secao('Os Reinos e outros Locais', 'Onde se mora')}
    <p>Esta é a camada mais baixa da hierarquia, e a única em que a maioria dos personagens vai passar a campanha inteira.</p>
    ${[...reinos, ...locais].map((r) => cartao(
      r.titulo,
      [r.conteudo?.dimensao && `Dimensão: ${r.conteudo.dimensao}`, r.conteudo?.localizacao && `Local: ${r.conteudo.localizacao}`]
        .filter(Boolean).join('  ·  '),
      `${paragrafos(r.conteudo?.descricao)}
       ${fichaDados([
         ['Fundação', esc(r.conteudo?.fundacao)],
         ['Governo', esc(r.conteudo?.governo)],
         ['Responsável', esc(r.conteudo?.responsavel)],
       ])}
       ${lista(r.conteudo?.caracteristicas)}
       ${r.conteudo?.nota ? `<p class="nota">${esc(r.conteudo.nota)}</p>` : ''}`,
      AG,
    )).join('')}
  `, AG));

  paginas.push(folha(`
    ${secao('Os Soberanos', 'Quem manda')}
    <p class="capitular">Nem todo Soberano governa um reino, e nem todo reino tem um Soberano na cadeira. O que a lista abaixo tem em comum é alcance: são figuras cujas decisões chegam longe o bastante pra que a sua mesa sinta, mesmo que o seu personagem nunca encontre nenhuma delas.</p>
    ${soberanos.map((s) => cartao(
      s.titulo,
      s.conteudo?.epiteto,
      `${paragrafos(s.conteudo?.descricao)}
       ${fichaDados([
         ['Status', esc(s.conteudo?.status)],
         ['Cor', esc(s.conteudo?.cor)],
       ])}
       ${s.conteudo?.falas?.length ? `<div class="citacao">${esc(s.conteudo.falas[0])}</div>` : ''}`,
      AG,
    )).join('')}
  `, AG));

  paginas.push(folha(`
    ${secao('Os acontecimentos', 'O que ainda deixa marca')}
    ${eventos.map((e) => cartao(
      e.titulo,
      [e.conteudo?.era && `Era: ${e.conteudo.era}`, e.conteudo?.dimensao && `Dimensão: ${e.conteudo.dimensao}`]
        .filter(Boolean).join('  ·  '),
      `${paragrafos(e.conteudo?.descricao)}
       ${fichaDados([['Envolvidos', esc(emLinha(e.conteudo?.envolvidos))]])}`,
      AG,
    )).join('')}
  `, AG));

  /* --- capítulo IV: acima das Árvores --- */
  paginas.push(abertura({
    num: 'Capítulo IV',
    titulo: 'O que atravessa todas as Árvores',
    resumo: 'As instituições, os seres e os fenômenos que não pertencem a Árvore nenhuma, e por isso alcançam qualquer personagem.',
    rgb: AC,
  }));

  const canonicas = FACCOES.faccoes.filter((f) => f.estado === 'canonica');
  const propostas = FACCOES.faccoes.filter((f) => f.estado !== 'canonica');
  const universais = MUNDO.filter((e) => e.registro_universal === 'ser' || e.registro_universal === 'local');

  paginas.push(folha(`
    ${secao('As facções universais', 'Quem opera em todo lugar')}
    <p class="capitular">Uma organização entra nesta lista por um critério só: a atuação dela pode alcançar um personagem de qualquer Árvore. Uma guilda poderosa presa a um reino fica de fora, por mais poderosa que seja.</p>
    ${canonicas.map((f) => cartao(
      f.titulo,
      `${f.tipo.replace(/-/g, ' ')}  ·  alcance: ${f.alcance}`,
      `<p>${esc(f.atuacao_publica)}</p>`,
      AC,
    )).join('')}
    ${propostas.length ? caixa('Ainda em avaliação', `
      <p>As duas abaixo existem como proposta e ainda não foram aprovadas como canônicas. Pergunte ao seu mestre antes de contar com elas.</p>
      ${propostas.map((f) => `<p><strong>${esc(f.titulo)}</strong>. ${esc(f.atuacao_publica)}</p>`).join('')}`) : ''}
  `, AC));

  paginas.push(folha(`
    ${secao('Registros universais', 'Fora de toda Árvore')}
    ${universais.map((u) => cartao(
      u.titulo,
      u.conteudo?.epiteto || (u.conteudo?.localizacao ? `Localização: ${u.conteudo.localizacao}` : ''),
      `${paragrafos(u.conteudo?.descricao)}
       ${fichaDados([['Responsável', esc(u.conteudo?.responsavel)]])}`,
      AC,
    )).join('')}

    <h3>${esc(sonhar?.titulo || 'Sonhar entre as Árvores')}</h3>
    ${paragrafos(sonhar?.conteudo?.descricao)}
    ${sonhar?.conteudo?.nota ? `<p class="nota">${esc(sonhar.conteudo.nota)}</p>` : ''}

    <h3>${esc(idiomas?.titulo || 'Os Idiomas do Jardim')}</h3>
    ${paragrafos(idiomas?.conteudo?.descricao)}
    ${idiomas?.conteudo?.nota ? caixa('O que isso diz sobre um povo', `<p>${esc(idiomas.conteudo.nota)}</p>`) : ''}
  `, AC));

  /* --- fecho --- */
  paginas.push(folha(`
    ${secao('Onde continuar', 'Fim do documento')}
    <p class="capitular">O que você acabou de ler é a planta do Jardim. Ela não conta o que aconteceu dentro de cada Árvore, e é de propósito: cada uma tem história suficiente pra ocupar um documento próprio.</p>
    <div class="sumario">
      <div class="item"><div class="n">II</div><div><strong>As Dez Árvores</strong><span class="d">Uma por uma. Deidade, Fluxo, marca corporal de quem canaliza, Galhos, Dimensões e a cronologia própria de cada uma.</span></div></div>
      <div class="item"><div class="n">III</div><div><strong>Os Seres do Jardim</strong><span class="d">Os ${RACAS_REAIS.length} povos, com fisiologia, idioma e o que muda dentro de cada um conforme ele amadurece.</span></div></div>
    </div>
    ${caixa('E no site', `
      <p>O módulo Mundo tem o mesmo conteúdo em forma de consulta, com o que o seu mestre já liberou pra sua campanha. Regras, fichas técnicas e valores ficam no módulo Regras e na sua ficha, que é onde eles se mantêm atualizados.</p>`)}
  `, AC));

  return {
    arquivo: 'O-Jardim',
    titulo: 'O Jardim',
    paginas,
  };
}

/* ================================================================== */
/* DOCUMENTO 2 — As Dez Árvores                                        */
/* ================================================================== */

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function docArvores() {
  const paginas = [];
  const AC = '132,84,188';

  paginas.push(capa({
    selo: 'O Jardim · Documento de mesa',
    titulo: 'As Dez Árvores',
    sub: CRONICAS.introducao?.subtitulo || '',
    rodape: '<strong>Crônicas do Jardim</strong><br>Segundo de três documentos. Leia <em>O Jardim</em> antes deste.',
    rgb: AC,
  }));

  paginas.push(folha(`
    ${secao(CRONICAS.introducao?.titulo || 'Crônicas do Jardim', 'Abertura')}
    ${paragrafos(CRONICAS.introducao?.descricao, 'capitular')}
    ${caixa('Como cada Árvore está organizada aqui', `
      <p>Toda Árvore ocupa as mesmas seções, na mesma ordem, pra que você consiga comparar duas sem procurar. Primeiro a ficha, com Deidade, Fluxo e estado atual. Depois a tese, que é a frase que resume pra que aquela Árvore existe. Em seguida a história, os lugares que cresceram nos Galhos dela e a cronologia própria.</p>
      <p>A marca corporal aparece porque ela tem uso prático na mesa: é o sinal físico que denuncia quem carrega aquele Fluxo, e é o que a perícia Ressonância procura.</p>`)}
    <div class="sumario">
      ${CRONICAS.arvores.map((a, i) => `
        <div class="item" style="--ac:${cor(a.id)}">
          <div class="n">${ROMANOS[i]}</div>
          <div><strong>${esc(a.nome)}</strong><span class="d">${esc(a.deidade)}  ·  ${esc(a.fluxo)}  ·  ${esc(a.estado)}</span></div>
        </div>`).join('')}
    </div>
  `, AC));

  CRONICAS.arvores.forEach((a, i) => {
    const rgb = cor(a.id);
    const fluxo = daArvore(a.id, 'fluxo')[0];
    const deidade = daArvore(a.id, 'deidade')[0];
    const galhos = daArvore(a.id, 'galho');
    const dims = daArvore(a.id, 'dimensao');
    const locs = daArvore(a.id, 'local');

    paginas.push(abertura({
      num: `Árvore ${ROMANOS[i]}`,
      titulo: a.nome,
      resumo: a.epiteto,
      rgb,
    }));

    paginas.push(folha(`
      ${secao(a.nome, `${a.deidade}  ·  ${a.fluxo}`)}
      ${fichaDados([
        ['Deidade', esc(a.deidade)],
        ['Fluxo', esc(a.fluxo)],
        ['Estado', esc(a.estado)],
        ['Domínio', esc(deidade?.conteudo?.dominio)],
        ['Gênero', esc(deidade?.conteudo?.genero)],
      ])}
      <div class="citacao">${esc(a.tese)}</div>
      ${pilulas(a.temas)}
      ${caixa('Atmosfera', `<p>${esc(a.atmosfera)}</p>`)}

      <h3>O que se sabe</h3>
      ${a.historia.map((p) => `<p>${esc(p)}</p>`).join('')}
    `, rgb));

    const corpoFluxo = `
      ${fluxo ? `
        <h3>${esc(fluxo.titulo)}</h3>
        ${paragrafos(fluxo.conteudo?.descricao)}
        ${fluxo.conteudo?.marca_corporal ? caixa('Marca corporal', `<p>${esc(fluxo.conteudo.marca_corporal)}</p>`) : ''}
        ${fluxo.conteudo?.citacao ? `<div class="citacao">${esc(fluxo.conteudo.citacao)}</div>` : ''}
        ${fluxo.conteudo?.subjugado_por ? `<p class="nota">Subjugado por ${esc(fluxo.conteudo.subjugado_por)}.</p>` : ''}
      ` : ''}

      ${galhos.length ? `<h3>${galhos.length > 1 ? 'Os Galhos' : 'O Galho'}</h3>` : ''}
      ${galhos.map((g) => cartao(
        g.titulo,
        'Galho',
        `${paragrafos(g.conteudo?.descricao)}
         ${g.conteudo?.mandamentos?.length ? `<div class="rotulo">Mandamentos</div>${lista(g.conteudo.mandamentos)}` : ''}
         ${g.conteudo?.nota ? `<p class="nota">${esc(g.conteudo.nota)}</p>` : ''}`,
        rgb,
      )).join('')}

      ${dims.length ? `<h3>${dims.length > 1 ? 'As Dimensões' : 'A Dimensão'}</h3>` : ''}
      ${dims.map((d) => cartao(
        d.titulo,
        d.conteudo?.galho ? `Galho: ${d.conteudo.galho}` : 'Dimensão',
        `${paragrafos(d.conteudo?.descricao)}${lista(d.conteudo?.caracteristicas)}`,
        rgb,
      )).join('')}

      ${locs.length ? `<h3>Locais</h3>` : ''}
      ${locs.map((l) => cartao(
        l.titulo,
        l.conteudo?.no_vazio ? 'No Vazio' : (l.conteudo?.local_pai ? `Em ${l.conteudo.local_pai}` : 'Local'),
        `${paragrafos(l.conteudo?.descricao)}
         ${lista(l.conteudo?.caracteristicas)}
         ${l.conteudo?.nota ? `<p class="nota">${esc(l.conteudo.nota)}</p>` : ''}`,
        rgb,
      )).join('')}`;

    paginas.push(folha(corpoFluxo, rgb));

    const cronologia = [...(a.cronologia || [])].sort((x, y) => x.ordem - y.ordem);
    paginas.push(folha(`
      ${secao(`Cronologia de ${a.nome}`, 'Linha do tempo própria')}
      <div class="tempo">
        ${cronologia.map((m) => `
          <div class="marco">
            <div class="era">${esc(m.era)}</div>
            <h4>${esc(m.titulo)}</h4>
            <p>${esc(String(m.resumo).trim())}</p>
          </div>`).join('')}
      </div>
      ${a.lugares?.length ? `
        <h3>Os lugares de ${esc(a.nome)}, em uma linha cada</h3>
        <table class="dados">
          <thead><tr><th>Lugar</th><th>Camada</th><th>Resumo</th></tr></thead>
          <tbody>${a.lugares.map((l) => `
            <tr><td><strong>${esc(l.nome)}</strong></td><td>${esc(l.tipo)}</td><td>${esc(l.resumo)}</td></tr>`).join('')}
          </tbody>
        </table>` : ''}
    `, rgb));
  });

  return { arquivo: 'As-Dez-Arvores', titulo: 'As Dez Árvores', paginas };
}

/* ================================================================== */
/* DOCUMENTO 3 — Os Seres                                              */
/* ================================================================== */

/** Descrição de um povo. Sai de fora a mecânica detalhada de característica,
 *  que vive no módulo Regras e muda a cada balanceamento; aqui ficam só os
 *  nomes dos caminhos e dos estágios, que são fato do mundo. */
function fichaSer(r, rgb) {
  const idioma = IDIOMAS[r.id];
  const arvore = r.arvore ? PALETA.get(r.arvore) : null;
  const caminhos = (r.variantes || []).map((v) => v.titulo);
  const estagios = (r.estagios || []).map((e) =>
    `${e.titulo}${e.nivel_minimo > 1 ? ` (nível ${e.nivel_minimo})` : ''}`);

  return `
    <div class="cartao" style="--ac:${rgb}">
      <h4>${esc(r.titulo)}</h4>
      <p class="ep">${r.categoria === 'esquecida' ? 'Raça esquecida' : 'Povo comum'}${
        r.disponibilidade === 'restrita' ? '  ·  precisa de autorização do mestre' : ''
      }${arvore ? `  ·  Árvore de origem: ${esc(arvore.nome)}` : ''}</p>
      ${paragrafos(r.descricao)}
      ${fichaDados([
        ['Idioma', idioma ? `${esc(idioma.lingua)}${idioma.criador ? `, criado por ${esc(idioma.criador)}` : ''}` : 'Só o Universal'],
        ['Vida', sinal(r.vida)],
        ['Mana', sinal(r.mana)],
        ['Movimento', r.movimento ? `${sinal(r.movimento)} m` : '—'],
        ['Perícia extra', r.pericias_iniciais_adicionais ? `${r.pericias_iniciais_adicionais}` : ''],
        ['Legado extra', r.legados_adicionais ? `${r.legados_adicionais}` : ''],
        [r.rotulo_variante || 'Caminhos', caminhos.length ? esc(caminhos.join(', ')) : ''],
        ['Estágios', estagios.length ? esc(estagios.join(' → ')) : ''],
      ])}
      ${r.fisiologia?.length ? `<div class="rotulo">Fisiologia</div>${lista(r.fisiologia)}` : ''}
      ${r.indisponivel ? `<p class="nota"><strong>Não jogável.</strong> ${esc(r.motivo_indisponivel || '')}</p>` : ''}
    </div>`;
}

export function docSeres() {
  const paginas = [];
  const AC = '86,172,92';
  const comuns = RACAS_REAIS.filter((r) => r.categoria !== 'esquecida');
  const esquecidas = RACAS_REAIS.filter((r) => r.categoria === 'esquecida');
  const personalizada = RACAS.find((r) => r.id === 'raca-personalizada');

  paginas.push(capa({
    selo: 'O Jardim · Documento de mesa',
    titulo: 'Os Seres do Jardim',
    sub: `Os ${RACAS_REAIS.length} povos que habitam as Árvores, e o que cada um é antes de virar ficha`,
    rodape: '<strong>Guia dos povos</strong><br>Terceiro de três documentos. A mecânica completa fica no site.',
    rgb: AC,
  }));

  paginas.push(folha(`
    ${secao('O que este documento é', 'Leia isto primeiro')}
    <p class="capitular">Existem ${RACAS_REAIS.length} povos catalogados no Jardim, e eles se dividem em dois grupos com uma diferença clara entre si. Os comuns você encontra na rua de qualquer reino. Os esquecidos sobreviveram em número pequeno demais pra isso, e trazer um pra mesa é conversa com o seu mestre antes de virar ficha.</p>
    <p>Cada verbete traz o que aquele povo é no mundo: como o corpo funciona, que língua fala, de que Árvore veio quando se sabe, e o que muda dentro dele conforme amadurece.</p>
    ${caixa('Onde estão os números', `
      <p>Vida, Mana e Movimento aparecem aqui como o ajuste que o povo dá, e servem pra você comparar um com o outro de relance. A ficha técnica completa, com característica, custo de Mana, nível mínimo e uso por cena, fica no módulo Regras do site, que é onde ela se mantém correta depois de cada balanceamento.</p>
      <p>Os nomes de caminho e de estágio estão aqui porque são fato do mundo. Um Vampiro Recém-Virado e um de Sangue Velho são a mesma raça em momentos diferentes da vida, e isso vale pra história tanto quanto pros dados.</p>`)}
    <table class="dados">
      <thead><tr><th>Povo</th><th>Grupo</th><th class="num">Vida</th><th class="num">Mana</th><th>Idioma</th></tr></thead>
      <tbody>${RACAS_REAIS.map((r) => `
        <tr>
          <td><strong>${esc(r.titulo)}</strong></td>
          <td>${r.categoria === 'esquecida' ? 'Esquecida' : 'Comum'}</td>
          <td class="num">${sinal(r.vida)}</td>
          <td class="num">${sinal(r.mana)}</td>
          <td>${IDIOMAS[r.id] ? esc(IDIOMAS[r.id].lingua) : 'Universal'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `, AC));

  paginas.push(abertura({
    num: 'Parte I',
    titulo: 'Os povos comuns',
    resumo: `${comuns.length} povos que qualquer personagem encontra sem precisar procurar.`,
    rgb: AC,
  }));

  paginas.push(folha(comuns.map((r) => fichaSer(r, AC)).join(''), AC));

  const AE = '132,84,188';
  paginas.push(abertura({
    num: 'Parte II',
    titulo: 'As raças esquecidas',
    resumo: `${esquecidas.length} povos que restaram em número pequeno demais pra passarem despercebidos. Nenhum deles entra numa mesa sem o mestre saber.`,
    rgb: AE,
  }));

  paginas.push(folha(esquecidas.map((r) => fichaSer(r, AE)).join(''), AE));

  paginas.push(folha(`
    ${secao('Duas notas de fechamento', 'Fim do documento')}
    <h3>Quando o seu personagem não é nenhum dos ${RACAS_REAIS.length}</h3>
    ${paragrafos(personalizada?.descricao)}
    <p>Essa opção existe na ficha como espaço em branco, e por isso não tem verbete próprio neste documento. O que ela vale é combinado entre você e o mestre.</p>

    <h3>Sobre a Entidade</h3>
    <p>A Entidade aparece na lista e no site, e ainda assim não é escolha de criação de personagem. Cada Entidade nasce de um conto, o que quer dizer que ela precisa de um texto existindo antes dela. Quem escreve esse texto é o Escritor de Contos, e só a partir do nível 20.</p>

    ${caixa('Para continuar', `
      <p>Os outros dois documentos são <strong>O Jardim</strong>, com a estrutura e a história geral, e <strong>As Dez Árvores</strong>, com cada Árvore aberta uma por uma. Se algum povo deste documento citou uma Árvore que você não conhece, é lá que ela está.</p>`)}
  `, AC));

  return { arquivo: 'Os-Seres-do-Jardim', titulo: 'Os Seres do Jardim', paginas };
}

export const DOCUMENTOS = [docJardim, docArvores, docSeres];
