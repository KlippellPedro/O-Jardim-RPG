import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ARVORES, filtrarPorArvore } from '../../data/mundo/arvoresCatalog';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import {
  contarRecompensasPorTipo,
  formatarRecompensaClasse,
  obterProximaProgressao,
} from '../../src/services/classeService';
import type { IClasse } from '../../src/types/catalogo';

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const obterClasse = (id: string) => {
  const classe = classes.find(item => item.id === id);
  assert.ok(classe, `Classe ausente: ${id}`);
  return classe;
};

test('publica as 27 classes com orçamento base consistente', () => {
  assert.equal(classes.length, 27);
  for (const classe of classes) {
    assert.equal(classe.vida + classe.mana, 7, `Orçamento inválido em ${classe.titulo}`);
    assert.equal(classe.recursos_provisorios, false, `Classe provisória: ${classe.titulo}`);
    assert.equal(classe.progressao_publicada, true, `Progressão ausente: ${classe.titulo}`);
    assert.ok(classe.descricao, `Descrição ausente: ${classe.titulo}`);
  }
});

test('toda classe com progressao_magia libera a primeira magia cedo, não só perto do fim da progressão', () => {
  for (const classe of classes) {
    const marcos = classe.progressao_magia?.marcos || [];
    if (!marcos.length) continue;
    const primeiroNivel = Math.min(...marcos.map((marco: { nivel: number }) => marco.nivel));
    assert.ok(
      primeiroNivel <= 5,
      `${classe.titulo} só libera a primeira magia no nível ${primeiroNivel}: uma classe de magia não deveria ficar tantos níveis sem conjurar nada`,
    );
  }
  const cartista = obterClasse('cartista-arcano');
  assert.equal(cartista.progressao_magia?.marcos?.[0]?.nivel, 1, 'Cartista Arcano deve conjurar desde o nível 1, como as demais classes de magia');
});

test('todas as classes possuem progressão completa e sem níveis duplicados', () => {
  const expected = Array.from({ length: 20 }, (_, index) => index + 1);
  for (const classe of classes) {
    const levels = classe.progressao?.map(item => item.nivel) || [];
    assert.deepEqual(levels, expected, `Progressão incompleta em ${classe.titulo}`);
    assert.equal(new Set(levels).size, 20, `Nível duplicado em ${classe.titulo}`);
    assert.ok(
      classe.progressao?.find(item => item.nivel === 20)?.recompensas.some(item => item.tipo === 'habilidade_final'),
      `Habilidade final ausente em ${classe.titulo}`,
    );
    assert.equal(contarRecompensasPorTipo(classe, 20, 'poder'), 8, `Escolhas de poder inválidas em ${classe.titulo}`);
  }
});

test('toda recompensa final resolve para uma habilidade completa de nível 20', () => {
  for (const classe of classes) {
    const finais = classe.progressao
      ?.find(item => item.nivel === 20)
      ?.recompensas.filter(item => item.tipo === 'habilidade_final') || [];

    assert.equal(finais.length, 1, `Quantidade de finais inválida em ${classe.titulo}`);
    assert.doesNotMatch(finais[0].titulo, /^Habilidade Final$/i, `Final genérica em ${classe.titulo}`);

    const correspondencias = classe.habilidades?.filter(item => item.titulo === finais[0].titulo) || [];
    assert.equal(correspondencias.length, 1, `Final sem definição única em ${classe.titulo}`);

    const habilidade = correspondencias[0];
    assert.ok(habilidade.niveis?.includes(20), `Final fora do nível 20 em ${classe.titulo}`);
    const descricao = habilidade.descricao || '';
    assert.ok(descricao, `Final sem descrição em ${classe.titulo}`);
    assert.match(descricao, /uma vez por sessão/i, `Final sem limite por sessão em ${classe.titulo}`);
    assert.doesNotMatch(
      descricao,
      /a critério do mestre|aprovação do mestre|definid[ao] pelo mestre|o mestre arbitra/i,
      `Final depende de arbitragem aberta em ${classe.titulo}`,
    );
  }
});

test('Pop Star mantém a maior progressão garantida de Fama', () => {
  const popStar = obterClasse('pop-star');
  const fama = popStar.habilidades?.find(item => item.id === 'fama');
  assert.ok(fama?.estagios);

  for (const nivel of [1, 5, 10, 15, 20]) {
    const indice = [1, 5, 10, 15, 20].indexOf(nivel) + 1;
    const descricao = fama.estagios.find(item => item.nivel === nivel)?.descricao || '';
    assert.match(descricao, new RegExp(`Fama mínima (?:é|sobe para) ${indice}`, 'i'));
    assert.match(descricao, new RegExp(`(?:\\+${indice} em Atuação|Atuação sobe para \\+${indice})`, 'i'));
  }

  const estrela = popStar.habilidades?.find(item => item.id === 'estrela-eterna');
  assert.ok(estrela);
  const descricaoEstrela = estrela.descricao || '';
  assert.match(descricaoEstrela, /8 de Mana temporária/i);
  assert.match(descricaoEstrela, /três rodadas/i);
  assert.match(descricaoEstrela, /permanece com 1 de Vida/i);
});

test('Ação Completa usada pelas habilidades possui custo definido', () => {
  const combate = REGRAS_OFICIAIS.combate;
  assert.ok(combate);
  assert.match(combate.corpo, /Ação Completa:<\/strong> consome a Ação Padrão e a Ação de Movimento/i);
});

test('separa 16 classes comuns e 11 especiais por Árvore', () => {
  const common = classes.filter(classe => classe.categoria === 'padrao');
  const special = classes.filter(classe => classe.categoria !== 'padrao');

  assert.equal(common.length, 16);
  assert.equal(special.length, 11);
  assert.ok(common.every(classe => classe.disponibilidade === 'geral' && classe.arvore === null));
  assert.ok(common.every(classe => !classe.arvores?.length));
  assert.ok(special.every(classe => classe.disponibilidade === 'restrita'));
  assert.ok(special.every(classe => classe.requer_autorizacao_mestre === true));
  assert.ok(special.every(classe => classe.arvores?.length));

  for (const tree of ARVORES) {
    const available = filtrarPorArvore(classes, tree.id);
    assert.equal(available.filter(classe => classe.categoria === 'padrao').length, 16);
    assert.ok(
      available.some(classe => classe.categoria !== 'padrao'),
      `Árvore sem classe especial: ${tree.nome}`,
    );
  }
});

test('mantém o mapa temático das classes especiais', () => {
  const expected: Record<string, string[]> = {
    aethel: ['cartista-arcano', 'invocador'],
    ousias: ['cartista-arcano', 'decodificador', 'invocador'],
    keryx: ['cartista-arcano', 'codificador', 'interceptador', 'invocador'],
    haemus: ['cacador-de-entidades', 'cartista-arcano', 'invocador'],
    ignis: ['cartista-arcano', 'invocador', 'viajante-classe'],
    moros: ['campeao-dimensional', 'cartista-arcano', 'invocador'],
    aperion: ['cartista-arcano', 'guia-dimensional', 'invocador', 'viajante-classe'],
    chronus: ['cartista-arcano', 'invocador', 'viajante-classe'],
    erebus: ['cartista-arcano', 'invocador', 'pirata-amaldicoado'],
    'mulher-carmesim': ['cartista-arcano', 'escritor-de-contos', 'invocador'],
  };

  for (const [treeId, ids] of Object.entries(expected)) {
    assert.deepEqual(
      classes
        .filter(classe => classe.categoria !== 'padrao' && classe.arvores?.includes(treeId))
        .map(classe => classe.id)
        .sort(),
      [...ids].sort(),
    );
  }
});

test('classes especiais recebem o patamar de perícia superior', () => {
  for (const classe of classes) {
    const expected = classe.categoria === 'padrao' ? 4 : 8;
    assert.equal(
      contarRecompensasPorTipo(classe, 20, 'grau_pericia'),
      expected,
      `Patamar de perícia inválido em ${classe.titulo}`,
    );
  }

  const firstSpecialReward = obterClasse('campeao-dimensional').progressao?.[0].recompensas
    .find(reward => reward.tipo === 'grau_pericia');
  assert.ok(firstSpecialReward);
  assert.equal(formatarRecompensaClasse(firstSpecialReward), 'Grau de perícia (2x)');
});

test('todas as classes oferecem escolha real e usam somente Mana', () => {
  for (const classe of classes) {
    assert.ok((classe.habilidades?.length || 0) >= 2, `Poucas habilidades em ${classe.titulo}`);
    assert.ok((classe.eventos?.length || 0) >= 1, `Evento ausente em ${classe.titulo}`);
    assert.ok((classe.poderes?.length || 0) >= 10, `Poucos poderes em ${classe.titulo}`);
    for (const poder of classe.poderes || []) {
      assert.equal(Number.isFinite(poder.custo_mana), true, `Custo inválido em ${classe.titulo}: ${poder.titulo}`);
      assert.ok(poder.custo_mana >= 0, `Custo negativo em ${classe.titulo}: ${poder.titulo}`);
      assert.equal('custo_fv' in poder, false, `Campo antigo de F.V. em ${classe.titulo}: ${poder.titulo}`);
      assert.ok(poder.descricao, `Descrição ausente em ${classe.titulo}: ${poder.titulo}`);
    }
  }
});

test('distingue material enviado de propostas originais', () => {
  const revised = classes.filter(classe => classe.origem_conteudo === 'material_enviado_revisado');
  const proposed = classes.filter(classe => classe.origem_conteudo === 'proposta_original_balanceada');

  assert.equal(revised.length, 14);
  assert.equal(proposed.length, 13);
  assert.deepEqual(
    proposed.map(classe => classe.id).sort(),
    [
      'alquimista',
      'cacador-de-entidades',
      'canalizador',
      'codificador',
      'comerciante',
      'decodificador',
      'escritor-de-contos',
      'guia-dimensional',
      'interceptador',
      'invocador',
      'ritualista',
      'sintonizador',
      'viajante-classe',
    ],
  );
});

test('preserva os marcos das duas classes previamente publicadas', () => {
  for (const id of ['piloto', 'ninja']) {
    const classe = obterClasse(id);
    assert.equal(classe.vida, 4);
    assert.equal(classe.mana, 3);
    assert.deepEqual(
      classe.progressao
        ?.filter(item => item.recompensas.some(reward => reward.tipo === 'grau_pericia'))
        .map(item => item.nivel),
      [1, 6, 11, 17],
    );
  }

  assert.equal(obterProximaProgressao(obterClasse('piloto'), 5)?.nivel, 6);
  assert.equal(obterProximaProgressao(obterClasse('ninja'), 20), null);
});

test('remove Elementarista e publica as novas classes mágicas', () => {
  assert.equal(classes.some(classe => classe.id === 'elementarista'), false);
  for (const id of ['canalizador', 'sintonizador', 'ritualista', 'interceptador']) obterClasse(id);
  assert.doesNotMatch(REGRAS_OFICIAIS.xp.corpo, /Modelo de progressão de classe/i);
  assert.doesNotMatch(REGRAS_OFICIAIS.xp.corpo, /classes que ainda não receberam progressão própria/i);
  // Prende a REGRA (classe comum não é restrita a Árvore), não a redação exata:
  // o texto do capítulo é reescrito de tempos em tempos e a frase muda de forma.
  assert.match(REGRAS_OFICIAIS.xp.corpo, /Classes? comu(m|ns)[^.]{0,60}qualquer Árvore/i);
});

test('guia de criação acompanha o assistente e fixa classe especial no nível total 20', () => {
  const guia = REGRAS_OFICIAIS['criacao-personagem'];
  assert.ok(guia);
  assert.match(guia.corpo, /1\. Nome e Árvore de origem/i);
  assert.match(guia.corpo, /7\. Conferência da ficha/i);
  assert.match(guia.corpo, /seis perícias/i);
  assert.match(guia.corpo, /20 Lunaris/i);
  assert.match(guia.corpo, /Sanidade[\s\S]{0,80}100 de 100/i);
  assert.match(guia.corpo, /Cansaço[\s\S]{0,80}0 de 6/i);

  const livroPublico = JSON.stringify(Object.fromEntries(
    Object.entries(REGRAS_OFICIAIS).filter(([id]) => id !== 'mestre'),
  ));
  assert.match(livroPublico, /Classe especial exige[^.]{0,80}nível total 20/i);
  assert.doesNotMatch(livroPublico, /Classe especial exige[^.]{0,80}nível total 15/i);
});

test('publica Ajudar e Testes de Grupo sem permitir somar dano', () => {
  const coletivas = REGRAS_OFICIAIS['acoes-coletivas'];
  assert.ok(coletivas);
  assert.match(coletivas.corpo, /Ajudar/);
  assert.match(coletivas.corpo, /No máximo <strong>dois ajudantes<\/strong>/i);
  assert.match(coletivas.corpo, /pelo menos metade dos participantes/i);
  assert.match(coletivas.corpo, /Ajudar não permite somar dano/i);
});

test('livro público não expõe notas editoriais preservadas na área protegida do mestre', () => {
  const conteudoPublico = JSON.stringify(Object.fromEntries(
    Object.entries(REGRAS_OFICIAIS).filter(([id]) => id !== 'mestre'),
  ));
  assert.doesNotMatch(conteudoPublico, /Elementarista foi removido/i);
  assert.doesNotMatch(conteudoPublico, /playtest/i);
  assert.doesNotMatch(conteudoPublico, /tabela antiga/i);
  assert.doesNotMatch(conteudoPublico, /proposta original|material enviado/i);
  assert.doesNotMatch(conteudoPublico, /\badiad[ao]\b/i);
  assert.doesNotMatch(conteudoPublico, /catálogo estruturado possui/i);
  assert.doesNotMatch(conteudoPublico, /o texto manda|o Mestre arbitra/i);

  const regrasMestre = JSON.parse(
    readFileSync(new URL('../../data/regras/mestre-v1.json', import.meta.url), 'utf8'),
  ) as { secoes?: Array<{ id?: string; itens?: string[] }> };
  const notas = regrasMestre.secoes?.find((secao) => secao.id === 'notas-editoriais')?.itens?.join(' ') || '';
  assert.match(notas, /Elementarista foi removido/i);
  assert.match(notas, /tabela antiga de XP/i);
  assert.match(notas, /Alquimista, Comerciante, Guia Dimensional/i);
  assert.match(notas, /raça Entidade permanece deliberadamente adiada/i);
});
