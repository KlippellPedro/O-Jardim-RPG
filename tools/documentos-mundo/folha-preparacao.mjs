/**
 * Folha de preparação de sessão: duas páginas para imprimir e preencher a
 * lápis antes de a mesa começar.
 *
 * A folha existe para caber numa preparação de trinta minutos, então ela só
 * pede o que o Guia do Mestre diz que muda uma sessão: cenas prováveis,
 * relógios correndo, NPCs com uma linha cada, um encontro orçado, os segredos
 * que podem ser descobertos e o que anotar quando acabar.
 *
 * Os números da faixa de referência saem das mesmas fontes canônicas que o
 * livro usa (escala de preços e calibragem do Mestre), e não de memória.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RAIZ } from './dados.mjs';

const ESCALA = JSON.parse(
  readFileSync(join(RAIZ, 'data', 'economia', 'escala-precos-v1.json'), 'utf8'),
);

const pauta = (n, curta = false) => `<div class="pauta${curta ? ' curta' : ''}">${'<i></i>'.repeat(n)}</div>`;
const relogio = (n) => `<div class="relogio">${'<u></u>'.repeat(n)}</div>`;
const campo = (rotulo) => `<div class="campo"><b>${rotulo}</b><span></span></div>`;

const caixa = (rotulo, dentro, clara = false) => `
  <div class="caixa${clara ? ' clara' : ''}">
    <div class="rotulo">${rotulo}</div>
    <div class="dentro">${dentro}</div>
  </div>`;

const pe = (texto) => `<div class="pe"><span>O Jardim · folha de preparação</span><span>${texto}</span></div>`;

/** Verba por sessão, por jogador, direto da escala. Escrita na folha para o
 *  Mestre não precisar abrir o livro na hora de decidir o tesouro. */
const verbaEmLinha = ESCALA.verba_de_aventura.faixas.map((faixa) => {
  const valor = faixa.moeda === 'Solares'
    ? `${faixa.por_sessao_solares} Solares`
    : `${faixa.por_sessao_lunaris} Lunaris`;
  return `níveis ${faixa.niveis.replace('-', ' a ')}, ${valor}`;
}).join(' · ');

const paginaUm = () => `
<section class="folha">
  <div class="topo">
    <h1>Preparação de sessão</h1>
    <div class="selo">Uso do Mestre</div>
  </div>

  <div class="grade2">
    <div>${campo('Campanha')}${campo('Sessão nº')}${campo('Data')}</div>
    <div>${campo('Quem joga hoje')}${campo('Personagens e nível')}${campo('Duração prevista')}</div>
  </div>

  ${caixa('Onde paramos', pauta(2, true))}

  ${caixa('O que esta sessão precisa entregar', `
    <small>Uma frase. Se a sessão acabar e isso não tiver acontecido, faltou.</small>
    ${pauta(2, true)}`)}

  ${caixa('Cenas prováveis', `
    <div class="grade3">
      <div><small>Onde</small>${pauta(1, true)}<small>O que está acontecendo</small>${pauta(2, true)}<small>Muda se o grupo agir</small>${pauta(1, true)}</div>
      <div><small>Onde</small>${pauta(1, true)}<small>O que está acontecendo</small>${pauta(2, true)}<small>Muda se o grupo agir</small>${pauta(1, true)}</div>
      <div><small>Onde</small>${pauta(1, true)}<small>O que está acontecendo</small>${pauta(2, true)}<small>Muda se o grupo agir</small>${pauta(1, true)}</div>
    </div>`)}

  ${caixa('Relógios correndo', `
    <div class="grade3">
      <div><small>O quê, e o que acontece ao fechar</small>${pauta(2, true)}${relogio(4)}</div>
      <div><small>O quê, e o que acontece ao fechar</small>${pauta(2, true)}${relogio(6)}</div>
      <div><small>O quê, e o que acontece ao fechar</small>${pauta(2, true)}${relogio(8)}</div>
    </div>
    <small>Pinte uma parte por gatilho declarado. Nenhum relógio esvazia sozinho.</small>`)}

  ${caixa('NPCs que podem aparecer', `
    <table>
      <thead><tr><th>Nome</th><th>Jeito</th><th>O que quer</th><th>O que esconde</th><th>Atitude</th></tr></thead>
      <tbody>
        ${'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>'.repeat(4)}
      </tbody>
    </table>
    <small>Sem nome pronto, role o NPC no Guia do Mestre: nome, jeito, o que quer, o que esconde, atitude em 2d6.</small>`)}

  ${pe('Folha 1 de 2')}
</section>`;

const paginaDois = () => `
<section class="folha">
  <div class="topo">
    <h1>Encontro, segredos e fecho</h1>
    <div class="selo">Uso do Mestre</div>
  </div>

  ${caixa('Encontro preparado', `
    <div class="grade2">
      <div>
        ${campo('Onde')}
        ${campo('Objetivo além de vencer')}
        ${campo('Terreno que muda decisão')}
      </div>
      <div>
        ${campo('Dano do grupo por rodada')}
        ${campo('Vida total do encontro')}
        ${campo('Ações inimigas por rodada')}
      </div>
    </div>
    <table>
      <thead><tr><th>Criatura</th><th>Papel</th><th>Vida</th><th>Ataque</th><th>A decisão dela</th></tr></thead>
      <tbody>
        ${'<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>'.repeat(4)}
      </tbody>
    </table>
    <small>Vida total do encontro padrão: o dano do grupo por rodada vezes 4,5. Confronto curto usa 3, chefe resistente usa 6.</small>`)}

  ${caixa('Segredos que podem ser descobertos hoje', `
    <table>
      <thead><tr><th>O segredo</th><th>Como o grupo chega nele</th><th>Entregue quando</th></tr></thead>
      <tbody>
        ${'<tr><td>&nbsp;</td><td></td><td></td></tr>'.repeat(2)}
      </tbody>
    </table>
    <small>Informação necessária para usar uma mecânica nunca é segredo.</small>`)}

  ${caixa('Tesouro desta sessão', `
    <div class="grade2">
      <div>${campo('Jogadores × verba')}${campo('Em que forma chega')}</div>
      <div>${campo('Acesso, favor ou contato')}${campo('Item, e de que raridade')}</div>
    </div>
    <p><small><b>Verba por sessão, por jogador:</b> ${verbaEmLinha}. Dobre num fim de arco e triplique num fim de temporada.</small></p>`)}

  ${caixa('Ganchos que ficam abertos', pauta(3, true))}

  ${caixa('Depois da sessão', `
    <div class="grade2">
      <div>${campo('XP concedido')}${campo('Prestígio que mudou')}</div>
      <div>${campo('Relógios que andaram')}${campo('Anotar para a próxima')}</div>
    </div>
    <small>Marcos de XP: descoberta 10% do próximo nível, missão relevante 25%, fim de arco 50%.</small>`, true)}

  ${pe('Folha 2 de 2')}
</section>`;

export function folhaDePreparacao() {
  return {
    arquivo: 'Folha-de-Preparacao-de-Sessao',
    titulo: 'Folha de preparação de sessão',
    paginas: [paginaUm(), paginaDois()],
  };
}
