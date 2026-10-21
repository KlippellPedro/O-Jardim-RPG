import assert from 'node:assert/strict';
import test from 'node:test';

import classesData from '../../data/ficha/classes.json';
import magiasData from '../../data/ficha/magias.json';
import marcasData from '../../data/ficha/marcas-de-circulo.json';
import pecadosData from '../../data/ficha/pecados-e-virtudes.json';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { MAGIAS_CATALOGO } from '../../src/services/magiaService';

// Decisão de 2026-10-20 (segunda passada dos oito Fluxos, caminho A): as
// melhorias dos relatórios e o relatório das universais, com as seis respostas:
// Arma de Fluxo com 2d8 + Mod. pela cena, interceptação da Tecnologia com
// Misticismo, dano de Fogo que não continua, "Recomeço Absoluto" e "Sorte
// Virada", chefe resiste ao Exílio com vantagem e "mesma dimensão" nas magias.

const todas = [
  ...MAGIAS_CATALOGO,
  ...(magiasData.rituais as any[]),
  ...(magiasData.selos as any[]),
  ...(magiasData.encantamentos as any[]),
  ...(magiasData.fusoes as any[]),
] as any[];

const item = (id: string) => {
  const encontrado = todas.find((entrada) => entrada.id === id);
  assert.ok(encontrado, `${id} sumiu do catálogo`);
  return encontrado;
};
const variacao = (id: string, fluxo: string) => String(item(id).efeitos_por_fluxo?.[fluxo] || '');
const regras = Object.values(REGRAS_OFICIAIS).map((regra: any) => regra.corpo).join('\n');

test('as respostas de design estão no catálogo e no Livro', () => {
  assert.equal(item('arma-de-fluxo').dano, '2d8 + Mod. Fluxo');
  assert.equal(item('arma-de-fluxo').duracao, 'Cena, concentração');
  for (const id of ['firewall', 'interceptacao-ativa', 'interceptacao-regional']) {
    assert.match(item(id).efeito, /Misticismo contra a DT de conjuração/, id);
  }
  assert.match(regras, /dano de Fogo de uma magia cai uma vez e não continua/);
  assert.equal(item('recomeco-absoluto').titulo, 'Recomeço Absoluto');
  assert.equal(item('reviravolta-inscrita').titulo, 'Sorte Virada');
  assert.match(item('fenda-absoluta').efeito, /chefe resiste com vantagem/);
  assert.doesNotMatch(JSON.stringify(magiasData), /mesma realidade/);
  assert.match(regras, /<strong>Lugar conhecido\.<\/strong>/);
  assert.match(regras, /<strong>Mesma dimensão\.<\/strong>/);
});

test('universais: Marca, Clone, Muralha, Convocação e bases com efeito próprio', () => {
  assert.match(item('marca-canalizada').efeito, /primeiro ataque dele ou de um aliado/);
  assert.match(item('clone-de-fluxo').efeito, /1d8 \+ Mod\. Fluxo/);
  assert.match(item('muralha-canalizada').efeito, /quem atravessa sofre o que a variação/);
  assert.match(item('convocacao-do-fluxo').efeito, /Defesa igual à do conjurador/);
  assert.match(item('campo-do-fluxo').efeito, /terreno difícil/);
  assert.match(item('elo-canalizado').efeito, /\+1 na ajuda/);
  assert.doesNotMatch(item('territorio-do-fluxo').descricao, /às cegas/);
  assert.match(variacao('toque-do-fluxo', 'tecnologia'), /^O alvo perde a próxima reação/);
  assert.match(item('rito-dos-sete-pecados').requisito, /Virtude oposta/);
  assert.match(JSON.stringify(pecadosData), /Fim de Todos os Ciclos/);
});

test('Inconstância: listas com valor no lugar de "sorteado pelo Mestre"', () => {
  for (const id of ['forma-de-fluxo', 'avatar-do-fluxo', 'convocacao-do-fluxo', 'campo-do-fluxo', 'clone-de-fluxo', 'singularidade', 'territorio-do-fluxo', 'sinal-do-fluxo']) {
    assert.doesNotMatch(variacao(id, 'inconstancia'), /sorteado pelo Mestre|sorteada pelo Mestre|imunidade sorteada/, id);
  }
  assert.match(item('roleta-de-fluxo').efeito, /uma vez na cena/);
  assert.match(item('mutacao-passageira').efeito, /\+2 em Furtividade/);
  assert.match(item('improbabilidade-absoluta').efeito, /2 Cansaço/);
  assert.match(JSON.stringify(marcasData), /tabela de Resistência da Inconstância/);
});

test('Espaço e Vitalidade: o fim do refúgio, a bolha que se desfaz e curas com teto', () => {
  assert.match(item('refugio-de-bolso').efeito, /reaparecem onde entraram/);
  assert.match(item('prisao-de-fronteira').efeito, /a bolha se desfaz/);
  assert.match(item('dobra').efeito, /até 3 m/);
  assert.match(item('pandemia').efeito, /10%/);
  assert.match(item('seiva-persistente').efeito, /não acumula com a Marca/);
  assert.equal(item('grande-crescimento').dano, '3d6');
  assert.equal(item('grande-crescimento').defesa, 'Reflexos');
  assert.match(variacao('arma-de-fluxo', 'vitalidade'), /um quarto do dano/);
});

test('Essência, Origem e Comunicação: limites, condições do catálogo e a ajuda', () => {
  assert.match(item('aletheia').efeito, /até uma frase/);
  assert.match(item('campo-veridico').efeito, /Vontade com desvantagem/);
  assert.match(variacao('lei-do-fluxo', 'origem'), /benéficos/);
  assert.match(item('floresta-insurgente').efeito, /na hora em que ela nasce/);
  assert.match(item('sobrecarga-de-canal').efeito, /Silenciado/);
  assert.match(item('coro-dissonante').efeito, /Desorientado/);
  assert.match(variacao('arma-de-fluxo', 'comunicacao'), /metade dos dados/);
  assert.match(JSON.stringify(classesData), /A magia se origina numa criatura voluntária/);
});

test('Tecnologia e Físico: autômato no tamanho do círculo e armas na régua da Infusão', () => {
  assert.match(item('automato-assistente').efeito, /3 × Mod\. Fluxo/);
  assert.match(item('nucleo-de-comando').efeito, /uma vez na cena/);
  assert.match(item('montagem-de-automato').falha, /ingredientes se perdem/);
  assert.match(item('coracao-dos-sete-saloes').efeito, /Uma vez por turno/);
  assert.equal(item('forma-elemental').concentracao, true);
  assert.match(item('baluarte').efeito, /causa o dano ao domo no lugar/);
  assert.match(item('reformar-o-terreno').efeito, /não causa dano/);
  assert.match(JSON.stringify(classesData), /Escolha um dos sete elementos ao conjurar/);
});
