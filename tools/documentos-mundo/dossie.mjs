/**
 * DOSSIÊ: os cadernos de campo de uma cartógrafa do Jardim.
 *
 * O que é canônico e o que é invenção, pra ficar registrado:
 *
 *  - Tudo que a pesquisadora RELATA sobre o mundo sai literal de data/mundo e
 *    data/ficha/racas.json. Tese, atmosfera, marca corporal, descrição de povo:
 *    nada disso foi reescrito. Se a lore mudar lá, o caderno muda junto.
 *  - A pesquisadora, a viagem dela e o sumiço são invenção deste arquivo, feita
 *    pra dar voz e motivo aos documentos. Nada disso contradiz o canônico: ela
 *    trabalha depois da Era do Silêncio, quando o próprio canon já diz que
 *    "ninguém teve mais com quem conferir nada".
 *  - Só emissores canônicos aparecem (Banco Lunar, Guilda dos Caçadores,
 *    Caravana do Limiar, A.X.I.S). Vigília das Raízes e Arquivo Prismático
 *    estão como `proposta` em faccoes.json e por isso ficaram de fora.
 *
 * Pra renomear a personagem ou mudar o ano, mexa só em PESQUISADORA e ANO.
 */
import {
  CRONICAS, RACAS_REAIS, IDIOMAS, PALETA,
  daArvore, porId, esc, paragrafos, lista, sinal,
} from './dados.mjs';

/** Um lugar só pra trocar nome, cargo e datas da personagem. */
export const PESQUISADORA = {
  nome: 'Teodora Vaz Braga',
  curto: 'T. Braga',
  tratamento: 'cartógrafa',
  anosDeViagem: 31,
  cidade: 'Salém',
};

/** Ano corrente da campanha, na contagem da Realidade 0. Astraluna foi fundada
 *  no ano 1.188 (linha do tempo canônica), então qualquer valor acima disso
 *  serve. Troque aqui pra alinhar com a sua mesa. */
export const ANO = 1812;

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

const prop = (classe, conteudo) => `<section class="prop ${classe}">${conteudo}</section>`;

/** Bloco corrido que o paginador recorta em páginas de caderno. */
const caderno = (classe, folioInicial, conteudo) =>
  `<section class="fluxo" data-classe="prop ${classe}" data-folio="${folioInicial}">${conteudo}</section>`;

const mancha = (topo, esquerda, tamanho, tipo = '') =>
  `<div class="mancha ${tipo}" style="top:${topo};left:${esquerda};width:${tamanho};height:${tamanho}"></div>`;

const vinco = (posicao, vertical = false) =>
  `<div class="vinco${vertical ? ' vertical' : ''}" style="${vertical ? 'left' : 'top'}:${posicao}"></div>`;

const margem = (topo, lado, texto, variacao = 1, azul = false) =>
  `<div class="margem torta-${variacao}${azul ? ' azul' : ''}" style="top:${topo};${lado}">${texto}</div>`;

const carimbo = (texto, estilo, extra = '') =>
  `<div class="carimbo ${extra}" style="${estilo}">${esc(texto)}</div>`;

/* ------------------------------------------------------------------ */
/* 1. Termo de recolhimento (a moldura de tudo)                        */
/* ------------------------------------------------------------------ */

function termoRecolhimento() {
  return prop('oficial', `
    ${mancha('62%', '68%', '46mm')}
    ${vinco('99mm')}
    ${vinco('198mm')}
    ${carimbo('Contrato encerrado', 'top:32mm;right:16mm;transform:rotate(-9deg)')}

    <div class="timbre">
      <div>
        <div class="casa">Guilda dos Caçadores</div>
        <div class="linha2">Posto de ${esc(PESQUISADORA.cidade)} · Quadro de contratos</div>
      </div>
      <div class="ref">
        Contrato 4471-B<br>
        Ano ${ANO} da Realidade 0<br>
        Via do contratante
      </div>
    </div>

    <div class="olho">Termo de recolhimento de bens</div>
    <h1 class="titulo">Sobre o que foi encontrado no quarto</h1>
    <p class="subtitulo">Contrato de localização de pessoa. Objeto não localizado.</p>

    <div class="recuo">
      <p>A Guilda foi contratada para localizar <strong>${esc(PESQUISADORA.nome)}</strong>,
      ${esc(PESQUISADORA.tratamento)}, com última presença confirmada nesta cidade. O contrato
      previa entrega da pessoa. A pessoa não foi entregue. O caçador designado teve acesso ao
      quarto alugado e recolheu o que segue, repassado a quem quitar a taxa de guarda.</p>
    </div>

    <table class="livro">
      <thead><tr><th style="width:14mm">Item</th><th>Descrição do recolhido</th><th style="width:34mm">Estado</th></tr></thead>
      <tbody>
        <tr><td>I</td><td>Caderno de capa dura, sem título na lombada. A arrumação do Jardim.</td><td>Íntegro</td></tr>
        <tr><td>II</td><td>Caderno maior, atado com barbante. Uma entrada por Árvore.</td><td>Íntegro, margens escritas</td></tr>
        <tr><td>III</td><td>Caderno de capa mole. Catálogo dos povos.</td><td>Íntegro</td></tr>
        <tr><td>IV</td><td>Extrato de conta do Banco Lunar, dois anos.</td><td>Dobrado em quatro</td></tr>
        <tr><td>V</td><td>Via de contrato desta Guilda, anterior ao presente.</td><td>Íntegro</td></tr>
        <tr><td>VI</td><td>Folha impressa vinda da Malha. Boa parte apagada na origem.</td><td>Ilegível em parte</td></tr>
        <tr><td>VII</td><td>Folha solta, arrancada do caderno II. Escrita interrompida.</td><td>Manchada</td></tr>
      </tbody>
    </table>

    <div class="nota-campo">
      <div class="olho">Observação do caçador designado</div>
      <p>A porta estava trancada por dentro. A janela, fechada. Não havia sinal de luta, de saída
      nem de ninguém. A vela em cima da mesa tinha queimado até o fim, o que põe a última noite
      de trabalho dela antes da manhã em que a senhoria bateu.</p>
      <p>Registro também, porque me pediram para registrar tudo: contei sete cadernos na lista
      dela e recolhi três. Os outros quatro não estavam na estante.</p>
    </div>

    <div class="assinatura">
      <div class="risco">Vidal Corte</div><br>
      <span class="cargo">Caçador designado · Guilda dos Caçadores</span>
    </div>

    ${margem('268mm', 'right:16mm', 'a taxa foi paga.<br>a caixa é sua.', 3)}
  `);
}

/* ------------------------------------------------------------------ */
/* 2. Caderno I: a forma do Jardim                                     */
/* ------------------------------------------------------------------ */

function cadernoForma() {
  const hierarquia = porId('hierarquia-do-jardim');
  const sonhar = porId('sonhar-entre-as-arvores');

  return caderno('pautado', 1, `
    <div class="olho">Caderno I · ano ${ANO - 2} da Realidade 0</div>
    <h1 class="titulo">A arrumação das coisas</h1>
    <p class="subtitulo">Escrito por ${esc(PESQUISADORA.nome)}, no ano ${PESQUISADORA.anosDeViagem} de viagem.</p>

    <div class="recuo">
      <p>Começo por aqui porque foi por aqui que eu deveria ter começado há trinta anos. Passei
      a primeira década anotando lugares sem entender em que ordem eles se encaixavam, e o
      resultado foi um caderno de nomes bonitos que não servia para chegar a lugar nenhum.</p>
      <p>O que segue é a arrumação. Confirmei o que pude confirmar. Onde não pude, escrevi que
      não pude, e quem estiver lendo isto faz o favor de não apagar essa parte.</p>
    </div>

    <h2 class="titulo">A ordem, do maior para o menor</h2>
    ${paragrafos(hierarquia?.conteudo?.descricao)}

    ${diagramaMao()}

    <div class="nota-campo">
      <div class="olho">Regra prática, aprendida do jeito caro</div>
      <p>Descobrir uma camada não abre a de dentro. Saber o nome de uma Árvore não diz quais
      Galhos ela tem, e ter estado num Galho não dá acesso às Dimensões dele. Gastei quatro anos
      e uma carroça inteira aprendendo isso, então anoto aqui de graça.</p>
    </div>

    <h2 class="titulo">${esc(sonhar?.titulo || 'Sonhar entre as Árvores')}</h2>
    ${paragrafos(sonhar?.conteudo?.descricao)}
    ${sonhar?.conteudo?.nota ? `<p class="mao grafite">${esc(sonhar.conteudo.nota)}</p>` : ''}

    <div class="nota-campo">
      <div class="olho">O que eu não consegui verificar</div>
      <p>Nada disto foi conferido com quem teria autoridade para conferir. As Deidades pararam de
      se falar, e comigo elas nunca falaram. O que eu tenho é o que sobrou escrito, o que me
      contaram e o que eu vi com os meus olhos, nesta ordem de confiança.</p>
    </div>
  `);
}

/** O diagrama tal como ela desenharia: caixas dentro de caixas, torto. */
function diagramaMao() {
  return `
  <figure style="margin:6mm 0 7mm;text-align:center">
    <svg viewBox="0 0 620 300" xmlns="http://www.w3.org/2000/svg" style="max-width:100%">
      <style>
        .cx { fill: none; stroke: #6b4a2a; stroke-width: 1.6; stroke-linecap: round; }
        .rt { font: 700 11px "Segoe UI", sans-serif; letter-spacing: 1.4px;
              text-transform: uppercase; fill: #4a3620; }
        .mo { font: 400 12px "Ink Free", "Segoe Script", cursive; fill: #8a2f26; }
      </style>
      <rect class="cx" x="10" y="10" width="600" height="280" rx="6" transform="rotate(-0.35 310 150)"/>
      <text class="rt" x="26" y="30">Jardim</text>

      <rect class="cx" x="40" y="44" width="540" height="216" rx="5"
            stroke-dasharray="7 5" transform="rotate(0.3 310 152)"/>
      <text class="rt" x="56" y="64">O Vazio</text>
      <text class="mo" x="128" y="65">o espaço entre. Erebus manda aqui, e só aqui.</text>

      <rect class="cx" x="72" y="78" width="476" height="150" rx="5" transform="rotate(-0.25 310 153)"/>
      <text class="rt" x="88" y="98">Árvore</text>
      <text class="mo" x="152" y="99">nove. território, Fluxo e Deidade na mesma coisa.</text>

      <rect class="cx" x="104" y="110" width="412" height="104" rx="5" transform="rotate(0.4 310 162)"/>
      <text class="rt" x="120" y="130">Galho</text>
      <text class="mo" x="176" y="131">= Realidade</text>

      <rect class="cx" x="136" y="142" width="348" height="58" rx="5" transform="rotate(-0.3 310 171)"/>
      <text class="rt" x="152" y="162">Dimensão</text>

      <rect class="cx" x="168" y="172" width="284" height="22" rx="4"/>
      <text class="rt" x="182" y="188">Reino e outros Locais</text>

      <text class="mo" x="196" y="216">é aqui embaixo que a gente pisa,</text>
      <text class="mo" x="196" y="234">e daqui de baixo não dá pra ver o resto.</text>
    </svg>
  </figure>`;
}

/* ------------------------------------------------------------------ */
/* 3. Caderno II: as Árvores                                           */
/* ------------------------------------------------------------------ */

/** Uma anotação de margem por Árvore. É o que dá voz ao caderno: o dado sai do
 *  JSON, a experiência de campo sai daqui. */
const NOTAS_DE_CAMPO = {
  aethel: 'Perguntei a três parteiras de Salém de onde vem o que nasce. As três riram de mim. Uma parou de rir depois.',
  ousias: 'Não entre na Sala dos Nomes acompanhada. Eu entrei. Ele soube o meu e eu soube o dele, e nunca mais trabalhamos juntos.',
  keryx: 'Pedi acesso quatro vezes. Quatro recusas com a mesma redação, palavra por palavra. Isso me diz mais do que um sim diria.',
  haemus: 'Marquei a trilha que abri na véspera. Na manhã seguinte a trilha não existia. Cresceu por cima numa noite.',
  ignis: 'O fogo da Fornalha me deixou com frio por seis dias. Não é modo de falar, eu tive febre ao contrário.',
  moros: 'Desci até onde a corda deu. Ainda havia brilho embaixo. Voltei porque acabou a corda, e não porque acabou o Salão.',
  aperion: 'As fendas estão maiores do que na primeira medição. Tenho os dois números anotados. Ninguém quis ver os dois números.',
  chronus: 'Cronometrei a mesma travessia sete vezes e anotei sete durações diferentes. O relógio estava certo, eu conferi.',
  erebus: 'Escrevi um nome nesta margem. No dia seguinte a margem estava em branco e eu não lembrava de quem era. É esse o ponto.',
  'mulher-carmesim': 'A Biblioteca guarda um livro por vida encerrada. Procurei o meu. O bibliotecário disse que não se procura o próprio. Não disse que não havia.',
};

function cadernoArvores() {
  const entradas = CRONICAS.arvores.map((a, i) => {
    const fluxo = daArvore(a.id, 'fluxo')[0];
    const deidade = daArvore(a.id, 'deidade')[0];
    const rgb = PALETA.get(a.id)?.rgb || '110,90,60';
    const nota = NOTAS_DE_CAMPO[a.id];

    return `
      <div class="nota-campo" style="border-left:1.4mm solid rgb(${rgb})">
        <div class="olho">Entrada ${i + 1} de ${CRONICAS.arvores.length}</div>
        <h3 class="titulo">${esc(a.nome)}</h3>
        <dl class="formulario">
          <div class="campo"><dt>Deidade</dt><dd>${esc(a.deidade)}</dd></div>
          <div class="campo"><dt>Fluxo</dt><dd>${esc(a.fluxo)}</dd></div>
          <div class="campo"><dt>Estado em que a encontrei</dt><dd>${esc(a.estado)}</dd></div>
          ${deidade?.conteudo?.dominio
            ? `<div class="campo"><dt>Do que ela cuida</dt><dd>${esc(deidade.conteudo.dominio)}</dd></div>` : ''}
          ${fluxo?.conteudo?.marca_corporal
            ? `<div class="campo"><dt>Marca em quem carrega</dt><dd class="preenchido">${esc(fluxo.conteudo.marca_corporal)}</dd></div>` : ''}
        </dl>
        <p><strong>O que dizem que ela é.</strong> ${esc(a.tese)}</p>
        <p><strong>O que eu senti no lugar.</strong> ${esc(a.atmosfera)}</p>
        ${fluxo?.conteudo?.descricao ? `<p><strong>Sobre o Fluxo.</strong> ${esc(fluxo.conteudo.descricao)}</p>` : ''}
        ${nota ? `<p class="mao">${esc(nota)}</p>` : ''}
      </div>`;
  }).join('');

  return caderno('pautado', 1, `
    <div class="olho">Caderno II · atado com barbante</div>
    <h1 class="titulo">Uma entrada por Árvore</h1>
    <p class="subtitulo">Nove Árvores e o Vazio, que insiste em aparecer na lista sem ser uma delas.</p>

    <div class="recuo">
      <p>Escrevi cada entrada no mesmo formato de propósito, para poder comparar duas sem folhear
      o caderno inteiro. Primeiro o que os registros dizem, depois o que eu vi, e por último o que
      eu acho, que vale menos e por isso vai por último.</p>
      <p>Anoto a marca corporal em todas as entradas porque é a única coisa desta lista que serve
      no dia a dia. É por ela que se reconhece quem carrega qual Fluxo, e já me tirou de duas
      conversas que não teriam terminado bem.</p>
    </div>

    ${entradas}

    <div class="nota-campo">
      <div class="olho">Fecho do caderno II</div>
      <p>Oito das dez estão paradas. Duas seguem trabalhando. Eu escrevi essa frase pela primeira
      vez no ano dezenove de viagem, achando que era observação de passagem, e ela continua valendo
      doze anos depois. Nada volta a andar sozinho.</p>
      <p class="mao">e mesmo assim coisa nova continua aparecendo. de onde?</p>
    </div>
  `);
}

/* ------------------------------------------------------------------ */
/* 4. Caderno III: os povos                                            */
/* ------------------------------------------------------------------ */

const NOTAS_POVOS = {
  humano: 'O povo que mais me hospedou e o que menos me explicou coisa alguma.',
  espirito: 'A cor do espírito não se escolhe. Perguntei a onze deles, e os onze acharam a pergunta ofensiva.',
  vampiro: 'Em Întuneric a conversa é fácil. O difícil é sair da conversa.',
  automato: 'Um deles me corrigiu uma medição minha de seis anos antes. Estava certo.',
  clone: 'Falam de trás para frente e entendem entre si sem esforço. Levei um mês para pegar uma frase.',
  anomalia: 'Não anotei o encontro no dia. Anotei três dias depois, e a letra não parecia minha.',
};

function cadernoPovos() {
  const verbete = (r) => {
    const idioma = IDIOMAS[r.id];
    const arvore = r.arvore ? PALETA.get(r.arvore) : null;
    const estagios = (r.estagios || []).map((e) => e.titulo);
    const caminhos = (r.variantes || []).map((v) => v.titulo);
    const nota = NOTAS_POVOS[r.id];

    return `
      <div class="nota-campo">
        <h3 class="titulo">${esc(r.titulo)}
          <span style="font-size:9pt;font-weight:400;color:var(--tinta-apagada)">
            ${r.categoria === 'esquecida' ? 'raro, quase não se encontra' : 'comum'}</span>
        </h3>
        ${paragrafos(r.descricao)}
        <dl class="formulario">
          <div class="campo"><dt>Língua</dt><dd>${
            idioma ? `${esc(idioma.lingua)}${idioma.criador ? `, dada por ${esc(idioma.criador)}` : ', sem criador registrado'}` : 'só o Universal'
          }</dd></div>
          ${arvore ? `<div class="campo"><dt>Árvore de origem</dt><dd>${esc(arvore.nome)}</dd></div>` : ''}
          ${caminhos.length ? `<div class="campo"><dt>${esc(r.rotulo_variante || 'Ramos')}</dt><dd>${esc(caminhos.join(', '))}</dd></div>` : ''}
          ${estagios.length ? `<div class="campo"><dt>Amadurece em</dt><dd>${esc(estagios.join(', então '))}</dd></div>` : ''}
        </dl>
        ${r.fisiologia?.length ? `<div class="olho">Observado no corpo</div>${lista(r.fisiologia)}` : ''}
        ${nota ? `<p class="mao">${esc(nota)}</p>` : ''}
      </div>`;
  };

  return caderno('pautado', 1, `
    <div class="olho">Caderno III · capa mole, molhado numa travessia</div>
    <h1 class="titulo">Catálogo dos povos</h1>
    <p class="subtitulo">${RACAS_REAIS.length} povos anotados no formato de quem anota bicho, com o pedido de desculpas que isso merece.</p>

    <div class="recuo">
      <p>Uso a mesma ficha que usava para catalogar animal, e sei o que isso parece. Continuei
      usando porque funciona: corpo, língua, origem e o que muda no ser conforme ele envelhece.
      Quem se ofender com o formato tem razão, e mesmo assim vai achar aqui o que precisa.</p>
      <p>A divisão entre comum e raro é minha, e é só sobre quantos ainda restam. Não é sobre
      valor de ninguém, e quem usar este caderno para dizer o contrário está usando errado.</p>
    </div>

    ${RACAS_REAIS.map(verbete).join('')}

    <div class="nota-campo">
      <div class="olho">Fecho do caderno III</div>
      <p>Faltam povos nesta lista. Tenho relato de pelo menos dois que não consegui confirmar
      com ninguém que os tivesse visto de perto, e prefiro deixar de fora a colocar por
      insistência. Se alguém completar este caderno depois de mim, que complete com nome de
      testemunha ao lado.</p>
    </div>
  `);
}

/* ------------------------------------------------------------------ */
/* 5. Extrato do Banco Lunar                                           */
/* ------------------------------------------------------------------ */

function extratoBanco() {
  const linhas = [
    ['Primavera', `Passagem, Caravana do Limiar. Trecho Salém a Interstício.`, '-1.240'],
    ['Primavera', 'Estadia e mantimentos.', '-380'],
    ['Verão', 'Passagem, Caravana do Limiar. Trecho de retorno.', '-1.240'],
    ['Verão', 'Reposição de instrumento de medida (segunda vez no ano).', '-2.100'],
    ['Outono', 'Contrato de escolta, Guilda dos Caçadores. Sinal.', '-3.500'],
    ['Outono', 'Papel, tinta, encadernação.', '-410'],
    ['Inverno', 'Passagem, Caravana do Limiar. Trecho não constante em tabela.', '-4.800'],
    ['Inverno', 'Estadia prolongada, quarto alugado em Salém.', '-900'],
  ];

  return prop('oficial', `
    ${mancha('8%', '74%', '38mm')}
    ${vinco('74mm')}
    ${vinco('149mm')}
    ${vinco('223mm')}
    ${vinco('105mm', true)}
    ${carimbo('Conta encerrada por inatividade', 'top:250mm;left:22mm;transform:rotate(-3deg)', 'pequeno')}

    <div class="timbre">
      <div>
        <div class="casa">Banco Lunar</div>
        <div class="linha2">A casa que fica fora de todas as Árvores</div>
      </div>
      <div class="ref">
        Extrato de conta<br>
        Titular: ${esc(PESQUISADORA.nome)}<br>
        Exercício ${ANO - 1} a ${ANO}
      </div>
    </div>

    <p class="subtitulo">Movimentação em Lunaris. Documento emitido a pedido de terceiro habilitado.</p>

    <table class="livro">
      <thead><tr><th style="width:24mm">Estação</th><th>Histórico</th><th style="width:26mm" class="valor">Valor</th></tr></thead>
      <tbody>
        ${linhas.map(([e, h, v]) => `<tr><td>${esc(e)}</td><td>${esc(h)}</td><td class="valor">${esc(v)}</td></tr>`).join('')}
        <tr>
          <td>Inverno</td>
          <td><strong>Crédito recebido. Ordem de terceiro.
            Identificação do depositante retida a pedido do próprio, conforme cláusula de sigilo.</strong></td>
          <td class="valor"><strong>+60.000</strong></td>
        </tr>
        <tr class="somatorio"><td></td><td>Saldo ao encerramento</td><td class="valor">60.000</td></tr>
      </tbody>
    </table>

    <div class="nota-campo">
      <div class="olho">Advertência da casa</div>
      <p>O Banco Lunar guarda, administra e investe. Não pergunta de onde vem e não diz para onde
      foi. A cláusula de sigilo do depositante é irrevogável, inclusive perante o titular da conta
      que recebe, e permanece válida após o encerramento.</p>
      <p>Saldo não sacado permanece à disposição de quem apresentar título. A casa não localiza
      titulares.</p>
    </div>

    <div class="assinatura">
      <div class="risco">A. Colona</div><br>
      <span class="cargo">Pela casa · Banco Lunar</span>
    </div>

    ${margem('252mm', 'right:16mm', 'sessenta mil.<br>eu nunca vi isso<br>na vida inteira.<br>quem?', 2)}
  `);
}

/* ------------------------------------------------------------------ */
/* 6. Contrato de escolta                                              */
/* ------------------------------------------------------------------ */

function contratoEscolta() {
  return prop('oficial', `
    ${mancha('70%', '10%', '52mm')}
    ${vinco('148mm')}
    ${carimbo('Baixa sem entrega', 'top:210mm;right:24mm;transform:rotate(6deg)')}

    <div class="timbre">
      <div>
        <div class="casa">Guilda dos Caçadores</div>
        <div class="linha2">Contrato de escolta · via do contratante</div>
      </div>
      <div class="ref">
        Contrato 4188-E<br>
        Outono, ano ${ANO - 1}<br>
        Encerrado
      </div>
    </div>

    <dl class="formulario">
      <div class="campo"><dt>Contratante</dt><dd class="preenchido">${esc(PESQUISADORA.nome)}</dd></div>
      <div class="campo"><dt>Objeto</dt><dd class="preenchido">Escolta armada, ida e volta</dd></div>
      <div class="campo"><dt>Destino declarado</dt><dd class="preenchido">Interstício. Ponto informado pela contratante, fora de rota da Caravana.</dd></div>
      <div class="campo"><dt>Prazo</dt><dd class="preenchido">Onze dias</dd></div>
      <div class="campo"><dt>Caçador designado</dt><dd class="preenchido">Vidal Corte</dd></div>
      <div class="campo"><dt>Sinal pago</dt><dd class="preenchido">3.500 Lunaris</dd></div>
    </dl>

    <h2 class="titulo">Cláusulas que a contratante fez questão de acrescentar</h2>
    <ol class="numerada">
      <li>O caçador não pergunta o que a contratante está medindo, e não repete a ninguém o que
      vir sendo medido.</li>
      <li>Se a contratante mandar parar e voltar, o caçador para e volta, sem discutir o motivo
      naquele momento.</li>
      <li>Se a contratante não puder voltar, o caçador volta assim mesmo e entrega os cadernos
      em ${esc(PESQUISADORA.cidade)}. Os cadernos têm prioridade sobre o corpo.</li>
    </ol>

    <div class="nota-campo">
      <div class="olho">Baixa do contrato, escrita no retorno</div>
      <p>Cumpridos os onze dias. A contratante voltou comigo, viva e andando pelo próprio pé, e
      quem quiser dizer o contrário que venha dizer na minha frente.</p>
      <p>Registro o que me foi pedido para registrar e mais uma coisa que não me foi pedida: no
      nono dia ela mediu o mesmo vão duas vezes, com um dia de intervalo, e os dois números não
      bateram. Ela não pareceu surpresa. Ela pareceu aliviada, que é pior.</p>
    </div>

    <div class="assinatura">
      <div class="risco">Vidal Corte</div><br>
      <span class="cargo">Caçador designado</span>
    </div>

    ${margem('120mm', 'right:12mm', 'a cláusula 3<br>foi ideia dela.<br>ela sabia.', 1, true)}
  `);
}

/* ------------------------------------------------------------------ */
/* 7. Resposta da Malha                                                */
/* ------------------------------------------------------------------ */

function respostaMalha() {
  const t = (n) => `<span class="tarja">${'█'.repeat(n)}</span>`;

  return prop('tecnico', `
    ${carimbo('Indeferido', 'top:36mm;right:18mm;transform:rotate(-7deg)', 'azul')}

    <div class="cabecalho-malha">
      <div class="linha-log"><b>ORIGEM</b> ......... A.X.I.S / Núcleo Zero / Atendimento externo</div>
      <div class="linha-log"><b>DESTINO</b> ........ ${esc(PESQUISADORA.nome)}, ${esc(PESQUISADORA.cidade)}</div>
      <div class="linha-log"><b>REFERÊNCIA</b> ..... Pedido de acesso 4 de 4</div>
      <div class="linha-log"><b>ROTA</b> ........... Malha, trecho direto</div>
      <div class="linha-log"><b>INTEGRIDADE</b> .... <span class="ruido">parcial. supressão aplicada na origem.</span></div>
    </div>

    <p>SEU PEDIDO DE ACESSO A NUCLEO ZERO FOI INDEFERIDO.</p>
    <p>MOTIVO: ${t(28)}</p>
    <p>NUCLEO ZERO E A UNICA DIMENSAO DO JARDIM COM CONTROLE DE ACESSO. O CONTROLE NAO E
    DISCUTIDO COM O REQUERENTE.</p>

    <div class="tarja-bloco" style="width:100%"></div>
    <div class="tarja-bloco" style="width:86%"></div>
    <div class="tarja-bloco" style="width:94%"></div>

    <p>QUANTO AO SEGUNDO PONTO DO SEU PEDIDO, ESCLARECEMOS QUE AS OCORRENCIAS QUE A SENHORA
    DESCREVE COMO ${t(12)} NAO CONSTAM DE REGISTRO DESTA MALHA.</p>
    <p>NAO CONSTAR DE REGISTRO SIGNIFICA QUE NAO PASSARAM POR AQUI. NAO SIGNIFICA QUE NAO
    ACONTECERAM. A SENHORA CONFUNDE AS DUAS COISAS EM TODOS OS QUATRO PEDIDOS.</p>

    <div class="tarja-bloco" style="width:72%"></div>

    <p>DESACONSELHAMOS NOVA MEDICAO NO PONTO INFORMADO.</p>
    <p>DESACONSELHAMOS TAMBEM QUE A SENHORA CONTINUE ENVIANDO SUAS MEDICOES POR ESTA MALHA.
    TUDO QUE ATRAVESSA A MALHA FICA REGISTRADO NA MALHA. A SENHORA E CARTOGRAFA E DEVERIA
    ENTENDER O QUE ISSO QUER DIZER MELHOR DO QUE A MAIORIA.</p>

    <div class="tarja-bloco" style="width:100%"></div>
    <div class="tarja-bloco" style="width:64%"></div>

    <p class="ruido">[FIM DA TRANSMISSAO. 4 BLOCOS SUPRIMIDOS NA ORIGEM. 1 BLOCO
    ENTREGUE SEM SUPRESSAO POR FALHA DE APLICACAO.]</p>

    ${margem('214mm', 'left:22mm', 'o parágrafo do "não passaram por aqui"<br>não era pra ter vindo.<br>alguém deixou passar de propósito.<br>ou não deixou, e é pior.', 3, true)}
  `);
}

/* ------------------------------------------------------------------ */
/* 8. A última folha                                                   */
/* ------------------------------------------------------------------ */

function ultimaFolha() {
  return prop('pautado', `
    ${mancha('58%', '48%', '54mm')}
    ${mancha('70%', '20%', '32mm')}
    ${vinco('165mm')}

    <div class="olho">Folha solta · arrancada do caderno II</div>
    <h1 class="titulo">Sobre um lugar que ainda não devia ter nome</h1>

    <div class="recuo">
      <p>Voltei ao vão pela terceira vez e medi de novo. O número mudou de novo, e mudou para o
      mesmo lado das outras duas vezes, o que descarta erro meu e descarta o instrumento.</p>
      <p>Passei os últimos quatro anos tratando os Erros como acidente. Reino que aparece sem ter
      sido fundado, gente que atravessa de uma Árvore para outra sem saber como, Dimensão que
      encosta noutra Dimensão. Todo mundo trata como acidente. Eu tratei como acidente porque
      todo mundo tratava.</p>
      <p>Só que acidente não escolhe lugar. Marquei os quatorze pontos que consegui visitar em
      trinta e um anos, e eles não estão espalhados. Estão em volta. Estão em volta de uma coisa
      só, e a coisa fica</p>
    </div>

    <p class="mao" style="font-size:13pt;margin-top:8mm">bateram na porta.</p>
    <p class="mao" style="font-size:13pt">volto nisso amanhã de manhã</p>

    <div class="folio">31</div>
  `);
}

/* ------------------------------------------------------------------ */
/* Montagem                                                            */
/* ------------------------------------------------------------------ */

export function dossieJogador() {
  return {
    arquivo: 'Dossie-Cadernos-de-Campo',
    titulo: `Cadernos de ${PESQUISADORA.curto}`,
    paginas: [
      termoRecolhimento(),
      cadernoForma(),
      cadernoArvores(),
      cadernoPovos(),
      extratoBanco(),
      contratoEscolta(),
      respostaMalha(),
      ultimaFolha(),
    ],
  };
}
