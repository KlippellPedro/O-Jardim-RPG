/**
 * Folha de regras de mesa: duas páginas para imprimir e deixar aberta no meio
 * da mesa, com o que se consulta toda sessão (teste, turno, ataque, reações,
 * magia, queda, descanso, limites de uso e as condições que mais aparecem).
 *
 * Saiu da revisão geral de 2026-11-12 (proposta 7): o livro tem 53 tópicos e
 * quase ninguém precisa de mais de duas páginas deles durante o jogo.
 *
 * Os números saem das fontes que o livro e a ficha usam (graus de perícia,
 * escada de DT, condições, qualidade do descanso), nunca de memória. Só o
 * texto corrido repete o que está nos tópicos Combate, Ferimentos, Descanso e
 * Magia; ao mudar uma dessas regras, confira esta folha também.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './dados.mjs';
import { GRAUS_PERICIA_DADOS } from '../../src/services/progressaoNiveis.ts';
import { referenciaDoNivel } from '../../src/services/referenciaBalanceamento.ts';
import { REGRAS_DESCANSO } from '../../src/services/descansoService.ts';
import { CONDICOES_OFICIAIS } from '../../data/regras/condicoes.ts';

const CLASSES_COMUNS = JSON.parse(readFileSync(join(RAIZ, 'data', 'ficha', 'classes.json'), 'utf8'))
  .filter((classe) => classe.categoria === 'padrao');

const esc = (texto) => String(texto ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const caixa = (rotulo, dentro, clara = false) => `
  <div class="caixa${clara ? ' clara' : ''}">
    <div class="rotulo">${rotulo}</div>
    <div class="dentro">${dentro}</div>
  </div>`;

const pe = (texto) => `<div class="pe"><span>O Jardim · regras de mesa</span><span>${texto}</span></div>`;

// A folha é mais densa que as outras do kit: letra um pouco menor e caixas mais
// juntas, para tudo caber em duas páginas sem perder a leitura de relance.
const ESTILO = `<style>
  .regras-mesa { font-size: 9pt; line-height: 1.38; padding-top: 12mm; }
  .regras-mesa .caixa { margin-bottom: 3mm; }
  .regras-mesa .caixa > .dentro { padding: 2mm 2.6mm 2.2mm; }
  .regras-mesa table { font-size: 8.2pt; margin-bottom: 1.6mm; }
  .regras-mesa th, .regras-mesa td { padding: 0.9mm 1.6mm; }
  .regras-mesa ul { margin-bottom: 1mm; }
  .regras-mesa li { margin-bottom: 0.6mm; }
  .regras-mesa p { margin-bottom: 1.4mm; }
  .regras-mesa .formula {
    font-family: "Segoe UI", Corbel, sans-serif; font-weight: 600; font-size: 9.4pt;
    text-align: center; border: 0.3mm solid rgb(var(--ac)); background: var(--fundo-caixa);
    padding: 1.4mm 2mm; margin: 0 0 1.8mm;
  }
  .regras-mesa .grade2 { gap: 3mm; }
  .regras-mesa .grade2 > .caixa { margin-bottom: 3mm; }
  .regras-mesa ul.condicoes, .regras-mesa ul.solta { list-style: none; padding-left: 0; margin: 0; }
  .regras-mesa ul.condicoes li { font-size: 8.2pt; line-height: 1.32; margin-bottom: 0.8mm; }
  .regras-mesa .sai { color: var(--tinta-fraca); font-style: italic; }
  .regras-mesa .graus { font-size: 8.4pt; }
</style>`;

/* ------------------------------ números ------------------------------ */

const GRAUS = GRAUS_PERICIA_DADOS.map((grau) => ({ nome: grau.rotulo, bonus: grau.bonus, nivel: grau.nivel_minimo }));

const NIVEIS_DA_ESCADA = [1, 5, 10, 15, 20, 30, 40, 60];
const ESCADA_DE_DT = NIVEIS_DA_ESCADA.map((nivel) => ({ nivel, ...referenciaDoNivel(nivel, CLASSES_COMUNS, []).dt }));

const DT_DE_CONJURACAO = Array.from({ length: 10 }, (_, indice) => ({
  circulo: indice + 1,
  dt: 7 + Math.floor(2.5 * (indice + 1)),
}));

const porcento = (fracao) => `${Math.round(fracao * 100)}%`;

// Trilha de Cansaço, como no tópico Descanso (data/regras/regras.ts).
const CANSACO = [
  ['0 Disposto:', 'sem penalidade'],
  ['1 Cansado:', '−1 em testes físicos'],
  ['2 Fatigado:', '−2 em testes físicos e −1 de Iniciativa'],
  ['3 Esgotado:', '−2 em todos os testes'],
  ['4 Exausto:', 'desvantagem em testes físicos; não treina'],
  ['5 Debilitado:', 'Movimento pela metade e sem reações'],
  ['6 Colapso:', 'inconsciente até baixar o Cansaço'],
];

// As condições que mais aparecem, em versão de bolso: o efeito e como sai, com
// as palavras do catálogo (data/regras/condicoes.ts) encurtadas. O título vem
// do catálogo, e uma condição que sumir de lá derruba a geração.
const RESUMO_DAS_CONDICOES = {
  caido: ['Corpo a corpo contra você +2; seus ataques −2.', 'Ação de Movimento para levantar, que provoca reações.'],
  agarrado: ['Movimento 0; atacar quem está fora do agarrão dá −2.', 'Ação Padrão e Atletismo ou Acrobacia contra 10 + Luta de quem segura.'],
  imobilizado: ['Movimento 0 e nada que exija deslocamento.', 'Ação Padrão e o teste que a fonte pedir.'],
  atordoado: ['Sem ações nem reações; Defesa −5.', 'No fim do próximo turno.'],
  exposto: ['Defesa −2, sem acumular.', 'No começo do seu próximo turno.'],
  cego: ['Desvantagem no que depende de ver; quem vê você ataca com +2.', 'Quando a fonte acaba ou é superada.'],
  amedrontado: ['Desvantagem contra a fonte; não se aproxima dela por vontade própria.', 'Vontade contra a DT da fonte, no fim do turno.'],
  desorientado: ['Desvantagem em ataques e em Percepção.', 'Fortitude ou Vontade contra a DT da fonte, no fim do turno.'],
  lento: ['Movimento pela metade, sem correr; Iniciativa −2.', 'Quando a fonte acaba.'],
  enfraquecido: ['−2 em testes de Força e no dano corpo a corpo.', 'Quando a fonte acaba.'],
  sangramento: ['1d6 de dano no fim do turno; cada nova aplicação soma +1, até +5.', 'Cura DT 15 com Ação Padrão, ou qualquer cura.'],
  queimando: ['1d6 de Fogo no fim do turno; pegar fogo de novo não soma.', 'Ação Padrão e Acrobacia ou Atletismo DT 12, ou água.'],
  envenenado: ['1d6 de veneno no fim do turno, ou o estágio da aflição.', 'Antídoto, ou Cura DT 15 com Ação Padrão.'],
  paralisado: ['Não age, reage nem se move; falha em Força e Destreza; Defesa −5.', 'Fortitude contra a DT da fonte, no fim de cada turno.'],
  silenciado: ['Sem fala e sem componente verbal; gesto e escrita valem.', 'Quando a fonte acaba ou é superada.'],
  invisivel: ['Quem não vê você ataca com desvantagem, e você ataca essa criatura com vantagem.', 'Quando a fonte acaba ou você fica Revelado.'],
};
const condicoes = Object.entries(RESUMO_DAS_CONDICOES).map(([id, [efeito, sai]]) => {
  const condicao = CONDICOES_OFICIAIS.find((item) => item.id === id);
  if (!condicao) throw new Error(`Condição "${id}" sumiu do catálogo: ajuste a folha de regras de mesa.`);
  return { titulo: condicao.titulo, efeito, sai };
});
const metadeDasCondicoes = Math.ceil(condicoes.length / 2);
const listaDeCondicoes = (lista) => `<ul class="condicoes">${lista.map((condicao) => `
  <li><b>${esc(condicao.titulo)}.</b> ${esc(condicao.efeito)} <span class="sai">Sai: ${esc(condicao.sai)}</span></li>`).join('')}
</ul>`;

/* ------------------------------ página 1 ------------------------------ */

const paginaUm = () => `
<section class="folha regras-mesa">
  ${ESTILO}
  <div class="topo">
    <h1>Regras de mesa</h1>
    <div class="selo">Para toda a mesa</div>
  </div>

  ${caixa('O teste', `
    <div class="formula">d20 + Mod. do atributo + ⌊nível total ÷ 2⌋ + bônus do grau, contra a DT</div>
    <div class="grade2">
      <div>
        <ul>
          <li>Mod. do atributo = ⌊(atributo − 10) ÷ 2⌋.</li>
          <li>Igualar a DT já é sucesso. 20 natural é sucesso crítico e 1 natural é falha crítica, com qualquer bônus.</li>
          <li>Vantagem: role dois d20 e use o maior. Desvantagem: use o menor. Elas se cancelam uma a uma, e o saldo vale uma vez só.</li>
        </ul>
      </div>
      <div class="graus">
        <p><b>Bônus do grau</b> (entre parênteses, o nível total mínimo):
        ${GRAUS.map((grau) => `${esc(grau.nome)} +${grau.bonus}${grau.nivel > 1 ? ` (${grau.nivel})` : ''}`).join(' · ')}.</p>
      </div>
    </div>`)}

  ${caixa('Seu turno', `
    <div class="grade2">
      <ul>
        <li><b>Ação Padrão:</b> atacar, usar uma habilidade, ajudar alguém ou tentar uma manobra.</li>
        <li><b>Ação de Movimento:</b> se deslocar, levantar, sacar algo ou mexer num objeto que importe.</li>
        <li><b>Ação Completa:</b> gasta a Padrão e a de Movimento; só começa se nenhuma das duas foi usada.</li>
      </ul>
      <ul>
        <li><b>Ação Livre:</b> um gesto, uma fala curta, soltar um objeto. Sem teste, ataque ou habilidade, a não ser que a regra permita.</li>
        <li>Dá para trocar a Padrão por uma segunda de Movimento. Correr custa o ataque.</li>
        <li><b>Reação:</b> uma por rodada, que volta no começo do seu turno.</li>
        <li><b>Iniciativa</b> = 10 + ⌊nível ÷ 2⌋ + Mod. Destreza + bônus. Não se rola.</li>
      </ul>
    </div>
    <small>Toda habilidade diz a ação que pede: Passivo, Ação Livre, de Movimento, Padrão, Completa, Reação ou Fora de combate.</small>`)}

  ${caixa('Atacar', `
    <div class="formula">d20 + Luta ou Pontaria, contra a Defesa do alvo</div>
    <div class="grade2">
      <ul>
        <li>Empatar com a Defesa acerta. Um 1 natural sempre erra.</li>
        <li>Cobertura parcial dá +2 de Defesa; cobertura superior, +5.</li>
        <li>Manobra (agarrar, derrubar, empurrar, desarmar, imobilizar): a mesma rolagem, contra 10 + a defesa passiva do alvo.</li>
      </ul>
      <ul>
        <li><b>Crítico:</b> o d20 natural caiu na margem da arma (20, 19-20...). Sem rolagem de confirmação.</li>
        <li>O multiplicador repete só os dados da arma: em x3, 2d6+4 vira 6d6+4. Bônus de habilidade e dado extra entram uma vez.</li>
        <li><b>Ordem do dano:</b> primeiro o multiplicador do crítico, depois a Resistência do alvo.</li>
      </ul>
    </div>`)}

  ${caixa('Reações (uma por rodada; a Defesa não gasta nenhuma)', `
    <div class="grade2">
      <ul class="solta">
        <li><b>Esquiva</b>, antes da rolagem contra você: +4 de Defesa contra esse ataque. Se ele errar, mova 1,5 m sem provocar reação.</li>
        <li><b>Bloqueio</b>, depois de sofrer dano físico: reduza o dano em 2 + ⌊nível ÷ 2⌋ + bônus do escudo. Pede escudo ou arma que bloqueie.</li>
      </ul>
      <ul class="solta">
        <li><b>Contra-Ataque</b>, quando um inimigo adjacente erra você: um ataque com −2, que não pode ser crítico.</li>
        <li><b>Proteger</b>, quando um aliado adjacente é atacado: você vira o alvo e ainda pode Bloquear, se tiver reação.</li>
        <li><b>Ataque de Oportunidade</b>, quando um inimigo sai do seu alcance: ataque corpo a corpo com −2, sem crítico.</li>
      </ul>
    </div>`)}

  ${caixa('Magia', `
    <div class="formula">d20 + Mod. Fluxo + ⌊nível total ÷ 2⌋ + grau de Misticismo + bônus, contra 7 + ⌊2,5 × círculo⌋</div>
    <table>
      <thead><tr><th>Círculo</th>${DT_DE_CONJURACAO.map((linha) => `<th>${linha.circulo}º</th>`).join('')}</tr></thead>
      <tbody><tr><td><b>DT</b></td>${DT_DE_CONJURACAO.map((linha) => `<td>${linha.dt}</td>`).join('')}</tr></tbody>
    </table>
    <ul>
      <li>A Mana sai quando você declara a magia e não volta se o teste falhar.</li>
      <li>Uma concentração por vez. Ao sofrer dano, Vontade contra DT 10 ou metade do dano, o que for maior.</li>
    </ul>`)}

  ${pe('Folha 1 de 2')}
</section>`;

/* ------------------------------ página 2 ------------------------------ */

const paginaDois = () => `
<section class="folha regras-mesa">
  <div class="topo">
    <h1>Queda, descanso e condições</h1>
    <div class="selo">Para toda a mesa</div>
  </div>

  <div class="grade2">
    ${caixa('Cair e morrer', `
      <ul>
        <li>Em 0 PV ou menos você cai inconsciente com <b>Morrendo 1</b>. O dano abaixo de 0 é o Déficit de Vida; se ele chegar à Vida máxima, é morte na hora.</li>
        <li>No fim de cada turno seu: Fortitude contra DT 12 + 2 × Gravidade + Ferido. Sucesso segura, dois seguidos ou um crítico estabilizam, falha sobe 1, falha crítica sobe 1 e pede trauma.</li>
        <li><b>Gravidade</b> pelo Déficit: até 10% da Vida máxima 0, até 25% 1, até 50% 2, até 75% 3, acima disso 4.</li>
        <li>Em <b>Morrendo 3</b> você morre (4 com a maestria de Constituição). Quem volta a 1 PV acorda com Ferido 1.</li>
        <li>Fora de combate, 10 minutos e Cura DT 15 devolvem 1d6 de Vida ou 10% da Vida máxima.</li>
      </ul>`)}
    ${caixa('Descanso completo e Relaxar', `
      <table>
        <thead><tr><th>8 horas</th><th>PV, Mana, Est.</th><th>Sanidade</th><th>Cansaço</th></tr></thead>
        <tbody>
          ${REGRAS_DESCANSO.map((regra) => `<tr><td>${esc(regra.titulo)}</td><td>${porcento(regra.recuperacao)}</td><td>${porcento(regra.recuperacaoSanidade)}</td><td>${regra.reduzCansaco >= 99 ? 'zera' : `−${regra.reduzCansaco}`}</td></tr>`).join('')}
        </tbody>
      </table>
      <p><b>Relaxar:</b> uma hora em segurança, uma vez entre dois descansos completos. Recupera 1d6 + Mod. Sabedoria + ⌊nível ÷ 4⌋ de Mana e de Estamina, numa rolagem só.</p>`)}
  </div>

  <div class="grade2">
    ${caixa('Cansaço, de 0 a 6', `
      <p>${CANSACO.map(([nivel, efeito]) => `<b>${nivel}</b> ${efeito}`).join(' · ')}.</p>
      <small>Combate intenso, seis horas de treino e uma noite em claro valem 1 cada.</small>`)}
    ${caixa('Limite de uso', `
      <ul class="solta">
        <li><b>Por rodada:</b> volta na rodada seguinte, como a Reação.</li>
        <li><b>Por turno:</b> uma vez em cada turno, de qualquer criatura.</li>
        <li><b>Por cena:</b> volta no fim da cena; um combate é uma cena.</li>
        <li><b>Por descanso:</b> volta no descanso completo, nunca no Relaxar.</li>
        <li><b>Por sessão:</b> volta na próxima sessão; é de história e sorte.</li>
      </ul>`)}
  </div>

  ${caixa('Condições que mais aparecem', `
    <div class="grade2">
      ${listaDeCondicoes(condicoes.slice(0, metadeDasCondicoes))}
      ${listaDeCondicoes(condicoes.slice(metadeDasCondicoes))}
    </div>`)}

  ${caixa('Para quem conduz: DT pelo nível do grupo', `
    <table>
      <thead><tr><th>Nível</th>${ESCADA_DE_DT.map((linha) => `<th>${linha.nivel}</th>`).join('')}</tr></thead>
      <tbody>
        <tr><td>Rotineira</td>${ESCADA_DE_DT.map((linha) => `<td>${linha.rotineira}</td>`).join('')}</tr>
        <tr><td><b>Padrão</b></td>${ESCADA_DE_DT.map((linha) => `<td><b>${linha.padrao}</b></td>`).join('')}</tr>
        <tr><td>Difícil</td>${ESCADA_DE_DT.map((linha) => `<td>${linha.dificil}</td>`).join('')}</tr>
        <tr><td>Extrema</td>${ESCADA_DE_DT.map((linha) => `<td>${linha.extrema}</td>`).join('')}</tr>
      </tbody>
    </table>
`, true)}

  ${pe('Folha 2 de 2')}
</section>`;

export function folhaDeRegrasDeMesa() {
  return {
    arquivo: 'Folha-de-Regras-de-Mesa',
    titulo: 'Folha de regras de mesa',
    paginas: [paginaUm(), paginaDois()],
  };
}
