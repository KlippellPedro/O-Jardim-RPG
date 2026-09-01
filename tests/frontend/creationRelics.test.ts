import assert from 'node:assert/strict';
import test from 'node:test';
import catalogo from '../../data/loja/catalogo.json' with { type: 'json' };
import { ehReliquiaCriacao, lerRessonanciaReliquia } from '../../src/services/reliquiasCriacaoService';

type Entrada = { tipo?: string; id?: string; titulo?: string; conteudo?: Record<string, unknown> };

const entradas = (catalogo as { entradas: Entrada[] }).entradas;
const reliquias = entradas.filter((entrada) => entrada.conteudo?.natureza === 'reliquia-criacao');
const armas = reliquias.filter((entrada) => entrada.tipo === 'arma');
const artefatos = reliquias.filter((entrada) => entrada.tipo === 'artefato');

test('as Relíquias da Criação seguem sendo 17 armas e 6 artefatos', () => {
  assert.equal(reliquias.length, 23, 'o catálogo ganhou ou perdeu Relíquias da Criação');
  assert.equal(armas.length, 17);
  assert.equal(artefatos.length, 6);
  const distantes = armas.filter((entrada) => ['À distância', 'Híbrida'].includes(String(entrada.conteudo?.modo)));
  assert.ok(distantes.length >= 8, 'as Relíquias voltaram a ser quase só corpo a corpo');
  for (const entrada of reliquias) {
    assert.equal(entrada.conteudo?.raridade, 'reliquia da criacao', `${entrada.titulo}: raridade fora do lugar`);
    assert.equal(entrada.conteudo?.requer_autorizacao_mestre, true, `${entrada.titulo}: liberou sem o Mestre`);
  }
});

test('nenhuma Relíquia carrega Manifestação de Princípio', () => {
  for (const entrada of reliquias) {
    const conteudo = entrada.conteudo || {};
    assert.equal(conteudo.manifestacao, undefined, `${entrada.titulo}: a Manifestação voltou ao catálogo`);
    const etiquetas = (conteudo.atributos as string[]) || [];
    assert.ok(
      !etiquetas.includes('Manifestação de Princípio'),
      `${entrada.titulo}: a vitrine ainda anuncia Manifestação de Princípio`,
    );
    assert.doesNotMatch(
      JSON.stringify(conteudo),
      /Manifestação de Princípio|DT da Relíquia/,
      `${entrada.titulo}: sobrou texto da Manifestação`,
    );
  }
});

test('arma tem Ressonância escrita e artefato tem a própria habilidade', () => {
  for (const entrada of armas) {
    const ressonancia = lerRessonanciaReliquia(entrada.conteudo);
    assert.ok(ressonancia, `${entrada.titulo}: arma relíquia sem Ressonância`);
    assert.ok(ressonancia.efeito.length > 40, `${entrada.titulo}: Ressonância sem regra utilizável`);
    const atributos = (entrada.conteudo?.atributos as string[]) || [];
    assert.match(atributos[0], /de dano$/, `${entrada.titulo}: a ficha de combate sumiu da vitrine`);
  }
  for (const entrada of artefatos) {
    assert.equal(lerRessonanciaReliquia(entrada.conteudo), null, `${entrada.titulo}: artefato não usa Ressonância`);
    const conteudo = entrada.conteudo || {};
    assert.ok(String(conteudo.descricao || '').length > 120, `${entrada.titulo}: artefato ficou sem habilidade escrita`);
    assert.ok(conteudo.ativacao, `${entrada.titulo}: artefato sem ativação declarada`);
    assert.ok(conteudo.frequencia, `${entrada.titulo}: artefato sem frequência declarada`);
  }
});

test('o texto de vitrine das Relíquias sai limpo para o jogador', () => {
  for (const entrada of reliquias) {
    const conteudo = entrada.conteudo || {};
    const lore = String(conteudo.lore || '');
    const descricao = String(conteudo.descricao || '');
    assert.ok(lore.length > 80, `${entrada.titulo}: sem lore de mesa`);
    assert.ok(descricao.length > 30, `${entrada.titulo}: sem descrição de vitrine`);
    assert.doesNotMatch(`${lore} ${descricao}`, /—/, `${entrada.titulo}: travessão no texto do jogador`);
  }
});

test('Fruto do Éden não é confundido com Relíquia da Criação', () => {
  const fruto = entradas.find((entrada) => entrada.tipo === 'fruto-eden');
  assert.ok(fruto, 'catálogo sem Frutos do Éden');
  assert.equal(ehReliquiaCriacao({ ...fruto.conteudo, tipo: 'fruto-eden' }), false);
  assert.equal(ehReliquiaCriacao(armas[0].conteudo), true);
});
