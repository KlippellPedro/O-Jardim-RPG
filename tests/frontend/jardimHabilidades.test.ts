import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  catalogoJardimHabilidadesDisponivel,
  comprarHabilidadeNoJardim,
  habilidadesAutomaticas,
  habilidadesCompradasJardim,
  habilidadesJardimSelecionadas,
  habilidadesVendaveisJardim,
  habilidadesVendidasJardim,
  sementesPorVenderHabilidade,
  venderHabilidadeDeClasseNoJardim,
  venderHabilidadeDoJardim,
} from '../../src/services/progressaoFichaService';
import type { IClasse, IHabilidadeClasse } from '../../src/types/catalogo';

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const obterClasse = (id: string) => {
  const classe = classes.find((item) => item.id === id);
  assert.ok(classe, `Classe ausente: ${id}`);
  return classe;
};

const obterHabilidade = (classe: IClasse, id: string) => {
  const habilidade = classe.habilidades?.find((item) => item.id === id);
  assert.ok(habilidade, `Habilidade ausente: ${id}`);
  return habilidade as IHabilidadeClasse;
};

test('Implacável (Guerreiro) tem escada 1/5/10/15/20 e é elegível (sem escolha própria)', () => {
  const guerreiro = obterClasse('guerreiro');
  const implacavel = obterHabilidade(guerreiro, 'implacavel');
  assert.deepEqual(implacavel.niveis, [1, 5, 10, 15, 20]);
  assert.equal(implacavel.escolha_opcoes, undefined);
  assert.equal(implacavel.requer_escolha, undefined);
});

test('vender Implacável rende mais sementes quanto mais alto o nível de venda (preço cumulativo)', () => {
  const guerreiro = obterClasse('guerreiro');
  const implacavel = obterHabilidade(guerreiro, 'implacavel');
  const nivel1 = sementesPorVenderHabilidade(implacavel, 1, guerreiro);
  const nivel5 = sementesPorVenderHabilidade(implacavel, 5, guerreiro);
  const nivel10 = sementesPorVenderHabilidade(implacavel, 10, guerreiro);
  const nivel15 = sementesPorVenderHabilidade(implacavel, 15, guerreiro);
  const nivel20 = sementesPorVenderHabilidade(implacavel, 20, guerreiro);
  assert.ok(nivel1 < nivel5, `venda no nível 1 (${nivel1}) deveria valer menos que no nível 5 (${nivel5})`);
  assert.ok(nivel5 < nivel10, `venda no nível 5 (${nivel5}) deveria valer menos que no nível 10 (${nivel10})`);
  assert.ok(nivel10 < nivel15, `venda no nível 10 (${nivel10}) deveria valer menos que no nível 15 (${nivel15})`);
  assert.ok(nivel15 < nivel20, `venda no nível 15 (${nivel15}) deveria valer menos que no nível 20 (${nivel20})`);
  // Nível 2 não abre nenhum estágio novo além do 1 (o próximo marco é 5), então vale o mesmo que nível 1.
  assert.equal(sementesPorVenderHabilidade(implacavel, 2, guerreiro), nivel1);
  // Nível 4 ainda não alcançou o marco 5.
  assert.equal(sementesPorVenderHabilidade(implacavel, 4, guerreiro), nivel1);
});

test('vender a habilidade principal da própria classe tira a escada inteira, não um estágio isolado', () => {
  const ficha: any = {
    classes: [{ classeId: 'guerreiro', nivel: 15 }],
  };
  // Antes de vender: Implacável aparece cheio até o nível 15 (estágios 1,5,10,15).
  const antes = habilidadesAutomaticas(ficha);
  const implacavelAntes = antes.find((item) => item.titulo === 'Implacável');
  assert.ok(implacavelAntes, 'Implacável deveria estar na ficha antes da venda');

  const vendaveis = habilidadesVendaveisJardim(ficha);
  const alvo = vendaveis.find((item) => item.habilidadeId === 'implacavel' && item.origemTipo === 'classe');
  assert.ok(alvo);
  assert.equal(alvo!.estagiosAlcancados, 4); // 1, 5, 10, 15

  const novaLista = venderHabilidadeDeClasseNoJardim(ficha, { classeId: 'guerreiro', habilidadeId: 'implacavel' });
  assert.ok(novaLista);
  const fichaDepois = { ...ficha, jardim: { habilidadesVendidas: novaLista } };

  // Depois de vender: some da ficha inteira, nenhum estágio sobra.
  const depois = habilidadesAutomaticas(fichaDepois);
  assert.equal(depois.some((item) => item.titulo === 'Implacável'), false, 'Implacável não deveria sobrar nenhum estágio depois de vendida');

  // E subir de nível não devolve a habilidade sozinha: mesmo simulando nível 20 na ficha, ela continua fora.
  const fichaNivel20 = { ...fichaDepois, classes: [{ classeId: 'guerreiro', nivel: 20 }] };
  const depoisNivel20 = habilidadesAutomaticas(fichaNivel20);
  assert.equal(depoisNivel20.some((item) => item.titulo === 'Implacável'), false, 'subir de nível não deveria devolver a habilidade vendida');
});

test('não é possível comprar/plantar uma habilidade cujo primeiro estágio exige nível maior que o nível total atual', () => {
  // Situação equivalente ao exemplo do usuário: personagem nível 1 não pode
  // pegar uma habilidade "de nível 5" de jeito nenhum, nem pagando Sementes -
  // o catálogo real (contra CLASSES_CATALOGO) simplesmente não oferece a opção.
  const fichaNivel1: any = { classes: [{ classeId: 'guerreiro', nivel: 1 }] };
  const fichaNivel5: any = { classes: [{ classeId: 'guerreiro', nivel: 5 }] };

  const catalogoNivel1 = catalogoJardimHabilidadesDisponivel(fichaNivel1);
  for (const item of catalogoNivel1) {
    const primeiroEstagio = Math.min(...(item.habilidade.niveis || [999]));
    assert.ok(primeiroEstagio <= 1, `${item.habilidade.titulo} (primeiro estágio ${primeiroEstagio}) não deveria aparecer pro nível total 1`);
  }
  const catalogoNivel5 = catalogoJardimHabilidadesDisponivel(fichaNivel5);
  for (const item of catalogoNivel5) {
    const primeiroEstagio = Math.min(...(item.habilidade.niveis || [999]));
    assert.ok(primeiroEstagio <= 5, `${item.habilidade.titulo} (primeiro estágio ${primeiroEstagio}) não deveria aparecer pro nível total 5`);
  }
  // O catálogo do nível 5 tem estritamente mais opções que o do nível 1 (ou igual, nunca menos).
  assert.ok(catalogoNivel5.length >= catalogoNivel1.length);
});

test('plantar uma habilidade de outra classe entrega de uma vez todos os estágios que o nível total já alcança', () => {
  const ficha: any = {
    classes: [{ classeId: 'guerreiro', nivel: 15 }],
    jardim: { comprados: [], comprosPoderes: [] },
  };
  const novaLista = comprarHabilidadeNoJardim(ficha, { classeId: 'ninja', habilidadeId: obterClasse('ninja').habilidades![0].id });
  assert.ok(novaLista);
  const fichaComHabilidade = { ...ficha, jardim: { habilidadesCompradas: novaLista } };
  const resolvidas = habilidadesJardimSelecionadas(fichaComHabilidade);
  assert.equal(resolvidas.length, 1);

  const habilidadeNinja = obterClasse('ninja').habilidades![0];
  const primeiroEstagio = Math.min(...(habilidadeNinja.niveis || []));
  if (primeiroEstagio > 15) {
    // Se a primeira habilidade do Ninja só abre depois do nível 15, ela não
    // deveria ter sido resolvida - a compra "pegou" mas não há estágio pra mostrar ainda.
    assert.equal(resolvidas.length, 0);
  } else {
    const estagiosEsperados = (habilidadeNinja.niveis || []).filter((marco) => marco <= 15).length;
    assert.equal(resolvidas[0].nivel, Math.max(...(habilidadeNinja.niveis || []).filter((marco) => marco <= 15)));
    assert.ok(estagiosEsperados >= 1);
  }
});

test('habilidade plantada no Jardim continua ganhando estágio sozinha se o personagem subir de nível depois', () => {
  const ninja = obterClasse('ninja');
  const habilidadeElegivel = (ninja.habilidades || []).find((item) => !item.escolha_opcoes && !item.requer_escolha && (item.niveis || []).length > 1);
  assert.ok(habilidadeElegivel, 'precisa de uma habilidade em escada elegível no Ninja para este teste');

  const compras = comprarHabilidadeNoJardim({ jardim: {} }, { classeId: 'ninja', habilidadeId: habilidadeElegivel!.id });
  assert.ok(compras);

  const nivelBaixo = Math.min(...habilidadeElegivel!.niveis);
  const nivelAlto = Math.max(...habilidadeElegivel!.niveis);

  const fichaNivelBaixo = { classes: [{ classeId: 'guerreiro', nivel: nivelBaixo }], jardim: { habilidadesCompradas: compras } };
  const fichaNivelAlto = { classes: [{ classeId: 'guerreiro', nivel: nivelAlto }], jardim: { habilidadesCompradas: compras } };

  const noNivelBaixo = habilidadesJardimSelecionadas(fichaNivelBaixo)[0];
  const noNivelAlto = habilidadesJardimSelecionadas(fichaNivelAlto)[0];
  assert.ok(noNivelBaixo);
  assert.ok(noNivelAlto);
  assert.equal(noNivelBaixo.nivel, nivelBaixo);
  assert.equal(noNivelAlto.nivel, nivelAlto);
});

test('habilidade com catálogo de escolha próprio (escolha_opcoes) fica fora do Jardim', () => {
  const engenheiro = obterClasse('engenheiro');
  const comEscolha = (engenheiro.habilidades || []).find((item) => item.escolha_opcoes);
  assert.ok(comEscolha, 'precisa de uma habilidade com escolha_opcoes no Engenheiro para este teste (ex.: Engenhocas)');

  const fichaComEngenheiro: any = { classes: [{ classeId: 'engenheiro', nivel: 20 }] };
  const vendaveis = habilidadesVendaveisJardim(fichaComEngenheiro);
  assert.equal(vendaveis.some((item) => item.habilidadeId === comEscolha!.id), false, 'habilidade com escolha própria não deveria ser vendável no Jardim');

  const fichaSemEngenheiro: any = { classes: [{ classeId: 'guerreiro', nivel: 20 }] };
  const catalogo = catalogoJardimHabilidadesDisponivel(fichaSemEngenheiro);
  assert.equal(catalogo.some((item) => item.classeId === 'engenheiro' && item.habilidade.id === comEscolha!.id), false, 'habilidade com escolha própria não deveria aparecer no catálogo do Jardim');
});

test('comprarHabilidadeNoJardim recusa duplicar a mesma compra, e venderHabilidadeDoJardim some com exatamente aquela', () => {
  const primeira = comprarHabilidadeNoJardim({ jardim: {} }, { classeId: 'ninja', habilidadeId: 'x' });
  assert.deepEqual(primeira, [{ classeId: 'ninja', habilidadeId: 'x' }]);
  const fichaComCompra = { jardim: { habilidadesCompradas: primeira } };
  const segunda = comprarHabilidadeNoJardim(fichaComCompra, { classeId: 'ninja', habilidadeId: 'x' });
  assert.equal(segunda, null);

  const comDuas = { jardim: { habilidadesCompradas: [{ classeId: 'ninja', habilidadeId: 'x' }, { classeId: 'piloto', habilidadeId: 'y' }] } };
  const depoisDeVender = venderHabilidadeDoJardim(comDuas, { classeId: 'ninja', habilidadeId: 'x' });
  assert.deepEqual(depoisDeVender, [{ classeId: 'piloto', habilidadeId: 'y' }]);
});

test('habilidadesVendidasJardim e habilidadesCompradasJardim ignoram entradas malformadas', () => {
  const ficha = { jardim: { habilidadesVendidas: [{ classeId: 'x' }, null, { classeId: 'guerreiro', habilidadeId: 'implacavel' }] } };
  assert.deepEqual(habilidadesVendidasJardim(ficha), [{ classeId: 'guerreiro', habilidadeId: 'implacavel' }]);
  const ficha2 = { jardim: { habilidadesCompradas: [{ habilidadeId: 'y' }, { classeId: 'ninja', habilidadeId: 'z' }] } };
  assert.deepEqual(habilidadesCompradasJardim(ficha2), [{ classeId: 'ninja', habilidadeId: 'z' }]);
});
