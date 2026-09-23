import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  catalogoJardimDisponivel,
  catalogoJardimHabilidadesDisponivel,
  sementesPorComprarHabilidade,
  sementesPorComprarPoder,
  sementesPorVenderHabilidade,
  sementesPorVenderPoder,
} from '../../src/services/progressaoFichaService';
import type { IClasse, IPoderClasse } from '../../src/types/catalogo';

// Testes de balanceamento econômico do Jardim: o pedido foi explícito - classe
// "esquecida" (especial, ex.: Campeão Dimensional) tem que custar bem mais
// que classe "padrao" (comum), a ponto de vender alguns poderes comuns nunca
// ser suficiente pra comprar algo de uma classe especial. Este arquivo prova
// isso com números reais do catálogo, não só com fórmulas isoladas.

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const obterClasse = (id: string) => {
  const classe = classes.find((item) => item.id === id);
  assert.ok(classe, `Classe ausente: ${id}`);
  return classe as IClasse;
};

const elegivelHabilidade = (h: any) => !h.escolha_opcoes && !h.requer_escolha;

test('todas as classes do catálogo são "padrao" ou "esquecida" (o multiplicador de tier cobre as duas)', () => {
  const categorias = new Set(classes.map((c) => c.categoria));
  assert.deepEqual([...categorias].sort(), ['esquecida', 'padrao']);
});

test('um poder de classe esquecida custa mais que um poder de classe padrao no mesmo nível estimado', () => {
  const padrao: IPoderClasse = { id: 'x', titulo: 'X', custo_mana: 0, descricao: '', pre_requisitos: ['Nível 10 de X'] };
  const classePadrao: IClasse = { id: 'p', titulo: 'P', vida: 1, mana: 1, categoria: 'padrao' };
  const classeEsquecida: IClasse = { id: 'e', titulo: 'E', vida: 1, mana: 1, categoria: 'esquecida' };

  const vendaPadrao = sementesPorVenderPoder(padrao, classePadrao);
  const vendaEsquecida = sementesPorVenderPoder(padrao, classeEsquecida);
  assert.ok(vendaEsquecida > vendaPadrao * 3, `esquecida (${vendaEsquecida}) deveria custar bem mais que padrao (${vendaPadrao})`);

  const compraPadrao = sementesPorComprarPoder(padrao, classePadrao);
  const compraEsquecida = sementesPorComprarPoder(padrao, classeEsquecida);
  assert.ok(compraEsquecida > compraPadrao * 3, `compra esquecida (${compraEsquecida}) deveria custar bem mais que compra padrao (${compraPadrao})`);
});

test('uma habilidade de classe esquecida custa mais que a mesma escada numa classe padrao', () => {
  const habilidade = { id: 'y', titulo: 'Y', niveis: [1, 5, 10, 15, 20] };
  const classePadrao: IClasse = { id: 'p', titulo: 'P', vida: 1, mana: 1, categoria: 'padrao' };
  const classeEsquecida: IClasse = { id: 'e', titulo: 'E', vida: 1, mana: 1, categoria: 'esquecida' };

  const vendaPadrao = sementesPorVenderHabilidade(habilidade as any, 20, classePadrao);
  const vendaEsquecida = sementesPorVenderHabilidade(habilidade as any, 20, classeEsquecida);
  assert.ok(vendaEsquecida > vendaPadrao * 3);

  const compraPadrao = sementesPorComprarHabilidade(habilidade as any, 20, classePadrao);
  const compraEsquecida = sementesPorComprarHabilidade(habilidade as any, 20, classeEsquecida);
  assert.ok(compraEsquecida > compraPadrao * 3);
});

test('cenário do usuário: vender os 3 poderes mais caros de um Piloto (padrao) não cobre nem o poder mais barato do Campeão Dimensional (esquecida)', () => {
  const piloto = obterClasse('piloto');
  const campeao = obterClasse('campeao-dimensional');

  const vendaPiloto = (piloto.poderes || []).map((p) => sementesPorVenderPoder(p, piloto)).sort((a, b) => b - a);
  const somaTresMaisCaros = vendaPiloto.slice(0, 3).reduce((a, b) => a + b, 0);

  const compraCampeao = (campeao.poderes || []).map((p) => sementesPorComprarPoder(p, campeao));
  const maisBarato = Math.min(...compraCampeao);

  assert.ok(
    somaTresMaisCaros < maisBarato,
    `vender os 3 poderes mais caros do Piloto (${somaTresMaisCaros} sementes) não deveria cobrir nem o poder mais barato do Campeão Dimensional (${maisBarato} sementes)`,
  );
});

test('cenário "moderado" (vender a habilidade principal inteira + os 2 poderes mais caros) nunca cobre o item esquecida mais barato do jogo, em nenhuma classe padrao', () => {
  const padrao = classes.filter((c) => c.categoria === 'padrao');
  const esquecida = classes.filter((c) => c.categoria === 'esquecida');
  const NIVEL = 20;

  const menorCustoEsquecida = Math.min(
    ...esquecida.flatMap((classe) => [
      ...(classe.poderes || []).map((p) => sementesPorComprarPoder(p, classe)),
      ...(classe.habilidades || []).filter(elegivelHabilidade).map((h) => sementesPorComprarHabilidade(h, NIVEL, classe)),
    ]),
  );

  for (const classe of padrao) {
    const vendasPoder = (classe.poderes || []).map((p) => sementesPorVenderPoder(p, classe)).sort((a, b) => b - a);
    const habilidadePrincipal = (classe.habilidades || []).filter(elegivelHabilidade)
      .sort((a, b) => (b.niveis?.length || 0) - (a.niveis?.length || 0))[0];
    const vendaHabilidadePrincipal = habilidadePrincipal ? sementesPorVenderHabilidade(habilidadePrincipal, NIVEL, classe) : 0;
    const vendaModerada = vendaHabilidadePrincipal + vendasPoder.slice(0, 2).reduce((a, b) => a + b, 0);

    assert.ok(
      vendaModerada < menorCustoEsquecida,
      `${classe.id}: vender a habilidade principal + os 2 poderes mais caros (${vendaModerada} sementes) não deveria cobrir o item esquecida mais barato do jogo (${menorCustoEsquecida} sementes)`,
    );
  }
});

test('só liquidando o kit inteiro (todos os poderes + a habilidade principal) uma classe padrao alcança o item esquecida mais barato - e ainda assim não dá pra comprar dois', () => {
  const padrao = classes.filter((c) => c.categoria === 'padrao');
  const esquecida = classes.filter((c) => c.categoria === 'esquecida');
  const NIVEL = 20;

  const valorDoKit = (classe: IClasse) => {
    const poderes = (classe.poderes || []).reduce((a, p) => a + sementesPorVenderPoder(p, classe), 0);
    const habilidades = (classe.habilidades || []).filter(elegivelHabilidade)
      .reduce((a, h) => a + sementesPorVenderHabilidade(h, NIVEL, classe), 0);
    return poderes + habilidades;
  };
  const menorCustoEsquecida = Math.min(
    ...esquecida.flatMap((classe) => [
      ...(classe.poderes || []).map((p) => sementesPorComprarPoder(p, classe)),
      ...(classe.habilidades || []).filter(elegivelHabilidade).map((h) => sementesPorComprarHabilidade(h, NIVEL, classe)),
    ]),
  );

  // Pelo menos uma classe padrao consegue, liquidando a ficha inteira (fica
  // sem nenhum poder ou habilidade próprios), bancar UM item esquecida barato
  // - isso é o sacrifício extremo e deliberado que o Jardim permite. O que
  // não pode acontecer é isso virar fábrica de sementes: nenhuma classe
  // padrao, nem a mais rica, consegue bancar DOIS itens esquecida vendendo
  // tudo de uma vez só.
  const maiorKitPadrao = Math.max(...padrao.map(valorDoKit));
  assert.ok(maiorKitPadrao >= menorCustoEsquecida, 'liquidar o kit inteiro da classe mais rica deveria alcançar ao menos o item esquecida mais barato');
  assert.ok(
    maiorKitPadrao < menorCustoEsquecida * 2,
    `mesmo o kit padrao mais valioso (${maiorKitPadrao}) não deveria cobrir dois itens esquecida ao preço mais barato (2x${menorCustoEsquecida}=${menorCustoEsquecida * 2})`,
  );
});

test('nenhuma classe esquecida consegue comprar a habilidade principal mais cara de outra classe esquecida vendendo só a própria habilidade principal', () => {
  const esquecida = classes.filter((c) => c.categoria === 'esquecida');
  const NIVEL = 20;
  const habilidadePrincipal = (classe: IClasse) => (classe.habilidades || []).filter(elegivelHabilidade)
    .sort((a, b) => (b.niveis?.length || 0) - (a.niveis?.length || 0))[0];

  const custos = esquecida.map((classe) => {
    const h = habilidadePrincipal(classe);
    return h ? sementesPorComprarHabilidade(h, NIVEL, classe) : 0;
  }).filter((v) => v > 0);
  const maisCara = Math.max(...custos);

  for (const classe of esquecida) {
    const h = habilidadePrincipal(classe);
    if (!h) continue;
    const venda = sementesPorVenderHabilidade(h, NIVEL, classe);
    assert.ok(
      venda < maisCara,
      `${classe.id}: vender a própria habilidade principal (${venda}) não deveria já cobrir a habilidade principal esquecida mais cara do jogo (${maisCara})`,
    );
  }
});

test('comprar e revender em seguida sempre dá prejuízo (markup), em qualquer tier de classe', () => {
  for (const classe of classes) {
    for (const poder of classe.poderes || []) {
      const compra = sementesPorComprarPoder(poder, classe);
      const vendaDeVolta = sementesPorVenderPoder(poder, classe);
      assert.ok(vendaDeVolta < compra, `${classe.id}/${poder.id}: revender (${vendaDeVolta}) deveria valer menos que comprar (${compra})`);
    }
  }
});

test('catálogo do Jardim carrega a categoria da classe de origem, para a ficha poder avisar visualmente', () => {
  const fichaComGuerreiro: any = { classes: [{ classeId: 'guerreiro', nivel: 20 }] };
  const catalogoPoderes = catalogoJardimDisponivel(fichaComGuerreiro);
  const algumEsquecida = catalogoPoderes.find((item) => item.classeId === 'campeao-dimensional');
  assert.equal(algumEsquecida?.categoriaClasse, 'esquecida');
  const algumPadrao = catalogoPoderes.find((item) => item.classeId === 'ninja');
  assert.equal(algumPadrao?.categoriaClasse, 'padrao');

  const catalogoHabilidades = catalogoJardimHabilidadesDisponivel(fichaComGuerreiro);
  const habilidadeEsquecida = catalogoHabilidades.find((item) => item.classeId === 'campeao-dimensional');
  assert.equal(habilidadeEsquecida?.categoriaClasse, 'esquecida');
});
