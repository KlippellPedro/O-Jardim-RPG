/** Contatos e laços.
 *
 * Duas formas de gente que importa. O contato é a pessoa que atende quando o
 * grupo chama: tem um ramo, uma Confiança de 1 a 3 e cobra os favores grandes
 * em Dívida. O laço é a pessoa por quem o personagem faz as coisas: uma frase,
 * no máximo três, e uma vantagem por sessão quando ele age por ela. O Guia do
 * Mestre já citava "um contato que atende" como recompensa; aqui está o que
 * esse contato faz e quanto custa.
 */
import type { RegraTopicoDe } from './tipos';

// --------------------------------------------------------------- contatos

export type ConfiancaDeContato = 1 | 2 | 3;

export interface INivelDeConfianca {
  nivel: ConfiancaDeContato;
  titulo: string;
  postura: string;
}

export const NIVEIS_DE_CONFIANCA: readonly INivelDeConfianca[] = [
  { nivel: 1, titulo: 'Conhecido', postura: 'Atende e ajuda, mas cobra até o favor pequeno.' },
  { nivel: 2, titulo: 'Amigo', postura: 'Faz o favor pequeno de graça e topa o grande, com uma Dívida.' },
  { nivel: 3, titulo: 'Leal', postura: 'Arrisca o que tem por você, e dispensa o teste no favor grande.' },
];

export const RAMOS_DE_CONTATO: readonly { titulo: string; exemplo: string }[] = [
  { titulo: 'Informação', exemplo: 'O que se diz no porto, quem dorme com quem, onde o carregamento vai parar.' },
  { titulo: 'Passagem', exemplo: 'Uma audiência, um documento carimbado, a porta dos fundos do palácio.' },
  { titulo: 'Mercadoria', exemplo: 'O que a Loja não tem, mais barato ou fora de hora.' },
  { titulo: 'Proteção', exemplo: 'Esconder alguém, guardar um baú, jurar que vocês estavam na taverna.' },
  { titulo: 'Ofício', exemplo: 'Um serviço que pede talento: falsificar, curar sem perguntas, consertar o que ninguém conserta.' },
];

export type TamanhoDeFavor = 'pequeno' | 'grande' | 'arriscado';

export interface IFavor {
  id: TamanhoDeFavor;
  titulo: string;
  exemplo: string;
  confiancaMinima: ConfiancaDeContato;
  teste: string;
  custo: string;
}

export const FAVORES: readonly IFavor[] = [
  {
    id: 'pequeno',
    titulo: 'Pequeno',
    exemplo: 'Uma informação comum, um recado, uma cama por uma noite.',
    confiancaMinima: 1,
    teste: 'Nenhum',
    custo: 'O Conhecido cobra o preço da praça ou uma troca. Amigo e Leal fazem de graça.',
  },
  {
    id: 'grande',
    titulo: 'Grande',
    exemplo: 'Um segredo, uma porta fechada, um item raro, esconder alguém por uma semana.',
    confiancaMinima: 2,
    teste: 'Diplomacia contra a DT Padrão; o Leal dispensa',
    custo: 'O contato guarda uma Dívida.',
  },
  {
    id: 'arriscado',
    titulo: 'Arriscado',
    exemplo: 'Algo que pode custar a vida, o emprego ou o nome dele.',
    confiancaMinima: 3,
    teste: 'Nenhum: ele faz',
    custo: 'Uma Dívida, e o contato paga o preço do risco: Procura, ferimento, o emprego.',
  },
];

/** Quantos contatos um personagem mantém de pé: 2 + Mod.Carisma, mínimo 1. */
export function contatosMantidos(modCarisma: number): number {
  return Math.max(1, 2 + Math.trunc(modCarisma));
}

/** O que um contato aceita fazer pela Confiança. O segundo favor no mesmo
 *  intervalo conta um tamanho acima. */
export function podePedir(confianca: number, favor: TamanhoDeFavor, { segundoNoIntervalo = false } = {}): boolean {
  const ordem: TamanhoDeFavor[] = ['pequeno', 'grande', 'arriscado'];
  const indice = Math.min(ordem.length, ordem.indexOf(favor) + (segundoNoIntervalo ? 1 : 0));
  if (indice >= ordem.length) return false;
  const pedido = FAVORES.find((item) => item.id === ordem[indice]);
  return !!pedido && confianca >= pedido.confiancaMinima;
}

/** Confiança depois de recusar uma Dívida: cai 1; em 0, o contato se perde. */
export function confiancaDepoisDaRecusa(confianca: number): number {
  return Math.max(0, Math.trunc(confianca) - 1);
}

// ------------------------------------------------------------------ laços

export const LACOS_MAXIMOS = 3;
/** Teste de Sanidade quando um laço se rompe: DT 15, perda de 1d6. */
export const DT_DE_LACO_ROMPIDO = 15;
export const PERDA_DE_LACO_ROMPIDO = '1d6';

export const EXEMPLOS_DE_LACO: readonly string[] = [
  'Devo a vida a ela, e ela nunca cobrou.',
  'Ele é o único que sabe o meu nome verdadeiro.',
  'Prometi à mãe dela que traria a filha de volta.',
  'A gente cresceu na mesma rua, e eu sei o que ele fez para sair de lá.',
  'Eu não confio nela, e é por isso que fico perto.',
];

// ------------------------------------------------------------------ página

const tabelaConfianca = NIVEIS_DE_CONFIANCA.map((nivel) => `
  <tr><td><strong>${nivel.nivel}</strong></td><td>${nivel.titulo}</td><td>${nivel.postura}</td></tr>
`).join('');

const tabelaRamos = RAMOS_DE_CONTATO.map((ramo) => `
  <tr><td><strong>${ramo.titulo}</strong></td><td>${ramo.exemplo}</td></tr>
`).join('');

const tituloDaConfianca = (nivel: number) => NIVEIS_DE_CONFIANCA.find((item) => item.nivel === nivel)?.titulo ?? '';

const tabelaFavores = FAVORES.map((favor) => `
  <tr>
    <td><strong>${favor.titulo}</strong><br><small>${tituloDaConfianca(favor.confiancaMinima)} ou mais</small></td>
    <td>${favor.exemplo}<small class="regras-mecanica"><strong>Teste:</strong> ${favor.teste}. <strong>Custo:</strong> ${favor.custo}</small></td>
  </tr>
`).join('');

const listaExemplos = EXEMPLOS_DE_LACO.map((exemplo) => `<li>"${exemplo}"</li>`).join('\n      ');

export const REGRA_CONTATOS_LACOS: RegraTopicoDe<'Livro do Jogador'> = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'As pessoas que atendem quando o grupo chama, e as pessoas por quem cada personagem faz as coisas. Contatos fazem favores e cobram Dívidas; laços dão vantagem quando você age por alguém.',
  destaques: [
    ['Contatos', `2 + Mod.Carisma`],
    ['Confiança', 'Conhecido, Amigo, Leal'],
    ['Laços', `até ${LACOS_MAXIMOS}`],
  ],
  corpo: `
    <p class="regras-lead">A velha que responde a carta no mesmo dia, o escrivão que carimba sem ler, o amigo de infância que você jurou proteger. Ninguém atravessa o Jardim sozinho. Esta página dá peso a essas pessoas: o contato é quem atende quando vocês chamam, e o laço é quem faz o personagem levantar quando seria mais fácil ficar sentado.</p>

    <div class="regras-resumo">
      <ul>
        <li>Um <strong>contato</strong> tem nome, lugar, um ramo (o que ele sabe ou faz) e uma Confiança de 1 a 3.</li>
        <li>Favor pequeno sai fácil. Favor grande pede Amigo, teste e deixa uma <strong>Dívida</strong>, que o contato cobra quando precisar.</li>
        <li>Cada personagem mantém até 2 + Mod.Carisma contatos (mínimo 1).</li>
        <li>Um <strong>laço</strong> é uma frase sobre alguém que importa. São até ${LACOS_MAXIMOS}, e uma vez por sessão o teste feito por causa de um laço tem vantagem.</li>
        <li>Laço rompido (morte, traição, abandono) pede teste de Sanidade.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Contatos</h3>
    <p>Anote na ficha o nome, o lugar onde ele está, o ramo e a Confiança. O contato é uma pessoa, com vida própria e interesses próprios, e vai continuar sendo depois do favor.</p>
    <p class="regras-note">Na ficha, o contato é um vínculo das Notas marcado como "faz favores", e a Confiança sai da afinidade dele: 1 ou 2 é Conhecido, 3 ou 4 é Amigo e 5 é Leal. Com afinidade 0 ou menos, o contato se perdeu. Subir ou baixar a Confiança é levar a afinidade ao degrau seguinte, e o laço também mora no vínculo.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Confiança</th><th>Estado</th><th>Como ele trata você</th></tr></thead>
      <tbody>${tabelaConfianca}</tbody>
    </table></div>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Ramo</th><th>Exemplo</th></tr></thead>
      <tbody>${tabelaRamos}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Favores</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Favor</th><th>Exemplo, teste e custo</th></tr></thead>
      <tbody>${tabelaFavores}</tbody>
    </table></div>
    <ul class="regras-list">
      <li><strong>Um favor por intervalo</strong> entre aventuras sai sem desgaste. O segundo no mesmo intervalo conta um tamanho acima: o pequeno vira grande.</li>
      <li><strong>O favor fica no ramo dele.</strong> O escrivão carimba o documento; esconder alguém é outro contato.</li>
      <li><strong>A Dívida é do contato.</strong> O Mestre traz o pedido quando ele precisar: uma carta, um recado, alguém batendo na porta. Cumprir apaga a Dívida. Recusar baixa a Confiança em 1, e em 0 o contato se perde.</li>
    </ul>

    <h3 class="regras-subtitle">Ganhar e perder contatos</h3>
    <ul class="regras-list">
      <li><strong>Na criação,</strong> se quiser, combine com o Mestre um contato Conhecido ligado ao seu povo ou à sua Árvore.</li>
      <li><strong>Na estrada:</strong> um Conflito Social bem resolvido, um favor feito sem pedir nada em troca, uma recompensa da história.</li>
      <li><strong>No Tempo Entre Aventuras,</strong> três dias de convivência com alguém (uma bebida, uma ajuda, uma conversa longa) e Diplomacia contra a DT Padrão fazem dele um contato Conhecido.</li>
      <li><strong>A Confiança sobe 1</strong> quando o grupo cumpre uma Dívida que custou, salva a pele do contato ou vive com ele uma cena que importa. Uma vez por arco.</li>
      <li><strong>A Confiança cai</strong> quando o contato sai prejudicado por causa do grupo: exposto, preso, ferido. Com a Procura do grupo em 4, os contatos daquele lugar ficam sob pressão.</li>
      <li><strong>Passou do limite de contatos?</strong> Um deles esfria: continua sendo alguém que você conhece, sem Confiança nem favores.</li>
      <li><strong>Contato não luta pelo grupo</strong> (isso é Aliado) e não mexe no Prestígio da facção onde trabalha: ele é a pessoa, e o Prestígio é com a organização.</li>
    </ul>
    <div class="regras-note regras-note--exemplo">
      <p>Duda tem um contato Amigo no cartório da cidade, do ramo Passagem. Ela pede uma certidão falsa para entrar no arquivo do conselho, um favor grande: testa Diplomacia, passa, e o escrivão guarda uma Dívida. Duas sessões depois, ele aparece pedindo que Duda tire o sobrinho dele de uma dívida de jogo. Ela cumpre, a Dívida some e o escrivão sobe para Leal.</p>
    </div>

    <h3 class="regras-subtitle">Laços</h3>
    <p>Um laço é uma frase, na voz do personagem, sobre alguém que importa: outro personagem do grupo, uma pessoa da campanha, um aliado. Ele diz por que o personagem faria alguma coisa por essa pessoa.</p>
    <ul class="regras-list">
      ${listaExemplos}
    </ul>
    <ul class="regras-list">
      <li><strong>Até ${LACOS_MAXIMOS} laços</strong> por personagem. Um laço com outro personagem do grupo ajuda a mesa a começar junta.</li>
      <li><strong>Uma vez por sessão,</strong> num teste feito por causa de um laço (para proteger, ajudar, alcançar ou vingar aquela pessoa), role com vantagem.</li>
      <li><strong>Laço rompido:</strong> quando a pessoa morre, trai ou some, o personagem testa Sanidade contra DT ${DT_DE_LACO_ROMPIDO}, com perda de ${PERDA_DE_LACO_ROMPIDO} (<span class="regras-ref regras-ref--condicoes">Condições</span>). A mesa pode aplicar Luto Profundo, uma condição de longo prazo.</li>
      <li><strong>Laço muda:</strong> no fim de cada arco, cada um pode reescrever ou trocar um laço. O rompido costuma virar outro: "vou achar quem fez isso".</li>
      <li><strong>Laço é de quem escreve.</strong> A outra pessoa não precisa sentir o mesmo, e a diferença costuma render as melhores cenas.</li>
    </ul>
  `,
  corpoMestre: `
    <p class="regras-lead">Contatos e laços são as cordas que prendem o grupo ao mundo. Puxe por elas: o contato que pede ajuda e a pessoa do laço em perigo abrem sessão melhor que qualquer cartaz de missão.</p>

    <h3 class="regras-subtitle">Contatos na mesa</h3>
    <ul class="regras-list">
      <li>Dê ao contato um desejo próprio e um defeito. O escrivão quer se aposentar; a informante bebe demais. É isso que faz a Dívida ter cara.</li>
      <li>Cobre a Dívida num momento em que custe, sem tornar impossível. O pedido bom chega quando o grupo está ocupado com outra coisa.</li>
      <li>Um contato ameaçado é gancho pronto: quando a Procura sobe ou uma facção inimiga avança, é por ele que o mundo chega ao grupo.</li>
    </ul>

    <h3 class="regras-subtitle">Laços na mesa</h3>
    <ul class="regras-list">
      <li>Leia os laços antes de preparar a sessão. Uma cena por arco com a pessoa de um laço vale mais que qualquer tesouro.</li>
      <li>Romper um laço é a coisa mais forte que você pode fazer com um personagem. Faça raramente, com aviso na ficção, e nunca só para punir.</li>
      <li>A vantagem é pequena de propósito. O valor do laço está na decisão que ele provoca, e a regra só lembra a mesa de que ele existe.</li>
    </ul>
  `,
};
