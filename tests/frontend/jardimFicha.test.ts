import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  catalogoJardimDisponivel,
  comprarPoderNoJardim,
  nivelEstimadoPoder,
  podeSelecionarPoder,
  poderesComprasJardim,
  poderesJardimSelecionados,
  poderesVendaveisJardim,
  selecoesPoderValidas,
  sementesPorComprarPoder,
  sementesPorVenderPoder,
  vagasPoderDaClasse,
  venderPoderDeClasseNoJardim,
  venderPoderDoJardim,
} from '../../src/services/progressaoFichaService';
import type { IClasse } from '../../src/types/catalogo';

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const obterClasse = (id: string) => {
  const classe = classes.find((item) => item.id === id);
  assert.ok(classe, `Classe ausente: ${id}`);
  return classe;
};

test('nivelEstimadoPoder lê o primeiro "Nível N" dos pré-requisitos e cai para 2 sem isso', () => {
  const guerreiro = obterClasse('guerreiro');
  const arsenal = guerreiro.poderes?.find((item) => item.id === 'arma-do-arsenal');
  assert.ok(arsenal, 'poder arma-do-arsenal ausente no Guerreiro');
  assert.equal(nivelEstimadoPoder(arsenal!), 15);
  assert.equal(nivelEstimadoPoder({ id: 'x', titulo: 'X', custo_mana: 0, descricao: '' }), 2);
});

test('sementesPorComprarPoder cobra mais do que sementesPorVenderPoder devolve (sem arbitragem)', () => {
  const guerreiro = obterClasse('guerreiro');
  for (const poder of guerreiro.poderes || []) {
    const venda = sementesPorVenderPoder(poder, guerreiro);
    const compra = sementesPorComprarPoder(poder, guerreiro);
    assert.ok(compra > venda, `compra (${compra}) deveria ser maior que venda (${venda}) para ${poder.id}`);
  }
});

test('catalogoJardimDisponivel exclui as classes que o personagem já tem e marca o que já foi plantado', () => {
  const ficha = {
    classes: [{ classeId: 'guerreiro', nivel: 5 }],
    jardim: { comprados: [{ classeId: 'ninja', poderId: (obterClasse('ninja').poderes || [])[0]?.id }] },
  };
  const catalogo = catalogoJardimDisponivel(ficha);
  assert.ok(catalogo.every((item) => item.classeId !== 'guerreiro'), 'catálogo não deveria incluir poderes do Guerreiro, que já é a classe do personagem');
  const primeiroDoNinja = catalogo.find((item) => item.classeId === 'ninja' && item.poder.id === (obterClasse('ninja').poderes || [])[0]?.id);
  assert.equal(primeiroDoNinja?.jaAdquirido, true);
});

test('comprarPoderNoJardim planta um poder novo e recusa duplicar a mesma compra', () => {
  const ficha = { classes: [{ classeId: 'guerreiro', nivel: 5 }], jardim: { comprados: [] } };
  const alvo = { classeId: 'ninja', poderId: (obterClasse('ninja').poderes || [])[0]?.id as string };
  const primeiraCompra = comprarPoderNoJardim(ficha, alvo);
  assert.ok(primeiraCompra);
  assert.deepEqual(primeiraCompra, [alvo]);

  const fichaComPoder = { ...ficha, jardim: { comprados: primeiraCompra } };
  const segundaCompra = comprarPoderNoJardim(fichaComPoder, alvo);
  assert.equal(segundaCompra, null, 'não deveria permitir comprar o mesmo poder duas vezes');
});

test('poderesJardimSelecionados resolve contra o catálogo completo e ignora classes próprias', () => {
  const poderNinja = (obterClasse('ninja').poderes || [])[0];
  assert.ok(poderNinja);
  const ficha = {
    classes: [{ classeId: 'guerreiro', nivel: 5 }],
    jardim: { comprados: [{ classeId: 'ninja', poderId: poderNinja!.id }] },
  };
  const resolvidos = poderesJardimSelecionados(ficha);
  assert.equal(resolvidos.length, 1);
  assert.equal(resolvidos[0].origem, obterClasse('ninja').titulo);
  assert.equal(resolvidos[0].id, `jardim:ninja:${poderNinja!.id}`);

  // Se a classe de origem virar uma classe própria do personagem, o Jardim não duplica o poder.
  const fichaComNinjaProprio = { ...ficha, classes: [...ficha.classes, { classeId: 'ninja', nivel: 3 }] };
  assert.equal(poderesJardimSelecionados(fichaComNinjaProprio).length, 0);
});

test('vender um poder da própria classe libera a vaga de volta para escolher outro', () => {
  const guerreiro = obterClasse('guerreiro');
  const [primeiroPoder, segundoPoder] = guerreiro.poderes || [];
  assert.ok(primeiroPoder && segundoPoder, 'Guerreiro precisa de ao menos 2 poderes cadastrados para este teste');

  const ficha: any = {
    classes: [{ classeId: 'guerreiro', nivel: 20 }],
    poderesClasseSelecionados: [{ classeId: 'guerreiro', poderId: primeiroPoder.id }],
  };
  const vagas = vagasPoderDaClasse(guerreiro, 20);
  const antes = selecoesPoderValidas(ficha);
  // Enche todas as vagas restantes com o mesmo primeiro poder para simular "sem vaga livre".
  while (selecoesPoderValidas(ficha).length < vagas) {
    ficha.poderesClasseSelecionados.push({ classeId: 'guerreiro', poderId: primeiroPoder.id });
  }
  assert.equal(selecoesPoderValidas(ficha).length, vagas, 'pré-condição: todas as vagas devem estar preenchidas');

  const vendaveis = poderesVendaveisJardim(ficha);
  const indiceParaVender = 0;
  const novaLista = venderPoderDeClasseNoJardim(ficha, indiceParaVender);
  assert.ok(novaLista);
  assert.equal(novaLista!.length, antes.length + (vagas - antes.length) - 1);

  const fichaDepois = { ...ficha, poderesClasseSelecionados: novaLista };
  const permissao = podeSelecionarPoder(segundoPoder, guerreiro, 20, selecoesPoderValidas(fichaDepois), fichaDepois);
  assert.equal(permissao.permitido, true, permissao.motivo);
});

test('vender um poder plantado no Jardim remove só aquela ocorrência e credita Sementes', () => {
  const poderNinjaA = (obterClasse('ninja').poderes || [])[0];
  const poderNinjaB = (obterClasse('ninja').poderes || [])[1];
  assert.ok(poderNinjaA && poderNinjaB, 'Ninja precisa de ao menos 2 poderes cadastrados para este teste');

  const ficha = {
    classes: [{ classeId: 'guerreiro', nivel: 5 }],
    jardim: { comprados: [{ classeId: 'ninja', poderId: poderNinjaA!.id }, { classeId: 'ninja', poderId: poderNinjaB!.id }] },
  };
  const vendaveis = poderesVendaveisJardim(ficha);
  const alvo = vendaveis.find((item) => item.origemTipo === 'jardim' && item.poderId === poderNinjaA!.id);
  assert.ok(alvo);
  assert.equal(alvo!.sementesRecebidas, sementesPorVenderPoder(poderNinjaA!, obterClasse('ninja')));

  const novaLista = venderPoderDoJardim(ficha, alvo!.indice);
  assert.ok(novaLista);
  assert.deepEqual(novaLista, [{ classeId: 'ninja', poderId: poderNinjaB!.id }]);
});

test('poderesComprasJardim ignora entradas malformadas sem derrubar a ficha', () => {
  const ficha = { jardim: { comprados: [{ classeId: 'ninja' }, null, { poderId: 'x' }, { classeId: 'guerreiro', poderId: 'y' }] } };
  assert.deepEqual(poderesComprasJardim(ficha), [{ classeId: 'guerreiro', poderId: 'y' }]);
});
