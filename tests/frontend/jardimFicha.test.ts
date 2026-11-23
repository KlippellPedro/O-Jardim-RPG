import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  catalogoJardimDisponivel,
  comprarPoderNoJardim,
  nivelEstimadoPoder,
  nivelExigidoPoder,
  pendenciasProgressao,
  podeSelecionarPoder,
  poderesComprasJardim,
  poderesJardimSelecionados,
  poderesVendaveisJardim,
  selecoesPoderValidas,
  sementesPorComprarPoder,
  sementesPorVenderPoder,
  vagasPodadasDaClasse,
  vagasPoderDaClasse,
  vagasPoderNaFicha,
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

test('podar um poder da própria classe gasta a vaga: não dá para escolher outro no lugar', () => {
  const guerreiro = obterClasse('guerreiro');
  const livres = (guerreiro.poderes || []).filter((poder) => !(poder.pre_requisitos || []).length);
  const [primeiroPoder, segundoPoder] = livres;
  assert.ok(primeiroPoder && segundoPoder, 'Guerreiro precisa de ao menos 2 poderes sem requisito para este teste');

  // Guerreiro 6 tem 2 vagas, as duas preenchidas.
  const ficha: any = {
    classes: [{ classeId: 'guerreiro', nivel: 6 }],
    poderesClasseSelecionados: [
      { classeId: 'guerreiro', poderId: primeiroPoder.id },
      { classeId: 'guerreiro', poderId: segundoPoder.id },
    ],
  };
  assert.equal(vagasPoderDaClasse(guerreiro, 6), 2);

  const venda = venderPoderDeClasseNoJardim(ficha, 0);
  assert.ok(venda);
  assert.deepEqual(venda!.poderesClasseSelecionados, [{ classeId: 'guerreiro', poderId: segundoPoder.id }]);
  assert.deepEqual(venda!.poderesPodados, [{ classeId: 'guerreiro', poderId: primeiroPoder.id }]);

  const depois = { ...ficha, poderesClasseSelecionados: venda!.poderesClasseSelecionados, jardim: { poderesPodados: venda!.poderesPodados } };
  assert.equal(vagasPodadasDaClasse(depois, 'guerreiro'), 1);
  assert.equal(vagasPoderNaFicha(depois, guerreiro, 6), 1);
  const permissao = podeSelecionarPoder(primeiroPoder, guerreiro, 6, selecoesPoderValidas(depois), depois);
  assert.equal(permissao.permitido, false);
  assert.match(permissao.motivo || '', /podada no Jardim/);
  // A Progressão não acusa vaga aberta para escolher.
  assert.equal(pendenciasProgressao(depois).some((item) => item.id === 'poder:guerreiro'), false);

  // Ao subir de nível, a vaga nova abre normalmente (a podada segue gasta).
  const nivel9 = { ...depois, classes: [{ classeId: 'guerreiro', nivel: 9 }] };
  assert.equal(vagasPoderNaFicha(nivel9, guerreiro, 9), vagasPoderDaClasse(guerreiro, 9) - 1);
  assert.equal(podeSelecionarPoder(primeiroPoder, guerreiro, 9, selecoesPoderValidas(nivel9), nivel9).permitido, true);
});

test('escolher e podar de novo não gera Sementes sem fim', () => {
  const guerreiro = obterClasse('guerreiro');
  const poder = (guerreiro.poderes || []).find((item) => !(item.pre_requisitos || []).length)!;
  let ficha: any = { classes: [{ classeId: 'guerreiro', nivel: 6 }], poderesClasseSelecionados: [], jardim: { sementes: 0 } };
  for (let volta = 0; volta < 10; volta += 1) {
    const selecoes = selecoesPoderValidas(ficha);
    if (!podeSelecionarPoder(poder, guerreiro, 6, selecoes, ficha).permitido) break;
    ficha = { ...ficha, poderesClasseSelecionados: [...selecoes, { classeId: 'guerreiro', poderId: poder.id }] };
    const alvo = poderesVendaveisJardim(ficha).find((item) => item.origemTipo === 'classe')!;
    const venda = venderPoderDeClasseNoJardim(ficha, alvo.indice)!;
    ficha = {
      ...ficha,
      poderesClasseSelecionados: venda.poderesClasseSelecionados,
      jardim: { ...ficha.jardim, poderesPodados: venda.poderesPodados, sementes: ficha.jardim.sementes + alvo.sementesRecebidas },
    };
  }
  // Duas vagas no nível 6: no máximo duas podas pagam.
  assert.equal(ficha.jardim.sementes, 2 * sementesPorVenderPoder(poder, guerreiro));
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

test('catálogo de poderes respeita o nível pedido, como o de habilidades', () => {
  const comNivel = classes.flatMap((classe) => (classe.poderes || [])
    .filter((poder) => nivelExigidoPoder(poder) > 1)
    .map((poder) => ({ classe, poder })));
  assert.ok(comNivel.length > 0, 'o catálogo precisa ter poderes com nível pedido');
  const alvo = comNivel.find(({ classe }) => classe.id !== 'guerreiro')!;
  const exigido = nivelExigidoPoder(alvo.poder);

  const antes = catalogoJardimDisponivel({ classes: [{ classeId: 'guerreiro', nivel: exigido - 1 }] });
  assert.equal(antes.some((item) => item.poder.id === alvo.poder.id && item.classeId === alvo.classe.id), false);
  const depois = catalogoJardimDisponivel({ classes: [{ classeId: 'guerreiro', nivel: exigido }] });
  assert.equal(depois.some((item) => item.poder.id === alvo.poder.id && item.classeId === alvo.classe.id), true);

  // Poder sem nível pedido aparece desde o nível 1.
  const nivel1 = catalogoJardimDisponivel({ classes: [{ classeId: 'guerreiro', nivel: 1 }] });
  assert.ok(nivel1.every((item) => nivelExigidoPoder(item.poder) <= 1));
  assert.ok(nivel1.length > 0);

  // Um poder já plantado continua listado (como plantado) mesmo se o nível baixar.
  const plantado = catalogoJardimDisponivel({
    classes: [{ classeId: 'guerreiro', nivel: 1 }],
    jardim: { comprados: [{ classeId: alvo.classe.id, poderId: alvo.poder.id }] },
  });
  assert.equal(plantado.find((item) => item.poder.id === alvo.poder.id && item.classeId === alvo.classe.id)?.jaAdquirido, true);
});
