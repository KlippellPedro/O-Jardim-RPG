import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ARVORES, filtrarPorArvore } from '../../data/mundo/arvoresCatalog';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { MANOBRAS_VEICULARES } from '../../data/regras/veiculosCombate';
import {
  contarRecompensasPorTipo,
  formatarRecompensaClasse,
  obterProximaProgressao,
} from '../../src/services/classeService';
import {
  escolhasHabilidadeDisponiveis,
  habilidadesAutomaticas,
  limparSelecoesHabilidadeInvalidas,
  nivelEscalonamento,
  opcoesHabilidadeSelecionadas,
  podeEscolherOpcaoHabilidade,
  resumoFichaTecnica,
  tetoEscalonamento,
  selecoesHabilidadeValidas,
  vagasEscolhaHabilidade,
} from '../../src/services/progressaoFichaService';
import {
  ehPericiaConcedida,
  grausComConcedidos,
  periciasConcedidasPelaClasse,
} from '../../src/services/periciasFichaService';
import type { IClasse } from '../../src/types/catalogo';

const classes = JSON.parse(
  readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8'),
) as IClasse[];

const obterClasse = (id: string) => {
  const classe = classes.find(item => item.id === id);
  assert.ok(classe, `Classe ausente: ${id}`);
  return classe;
};

test('publica as 28 classes com orçamento base consistente', () => {
  assert.equal(classes.length, 28);
  for (const classe of classes) {
    assert.equal(classe.vida + classe.mana, 7, `Orçamento inválido em ${classe.titulo}`);
    assert.equal(classe.recursos_provisorios, false, `Classe provisória: ${classe.titulo}`);
    assert.equal(classe.progressao_publicada, true, `Progressão ausente: ${classe.titulo}`);
    assert.ok(classe.descricao, `Descrição ausente: ${classe.titulo}`);
  }
});

test('classes não usam travessão e nomes revisados aparecem para o Engenheiro', () => {
  for (const classe of classes) {
    assert.equal(JSON.stringify(classe).includes('—'), false, `Travessão encontrado em ${classe.titulo}`);
  }

  const engenheiro = obterClasse('engenheiro');
  assert.ok(engenheiro.habilidades?.some(item => item.titulo === 'Arquitetura de Campo'));
  assert.ok(engenheiro.poderes?.some(item => item.titulo === 'Potência Máxima'));
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

test('separa 18 classes comuns e 10 especiais por Árvore', () => {
  const common = classes.filter(classe => classe.categoria === 'padrao');
  const special = classes.filter(classe => classe.categoria !== 'padrao');

  assert.equal(common.length, 18);
  assert.equal(special.length, 10);
  assert.ok(common.every(classe => classe.disponibilidade === 'geral' && classe.arvore === null));
  assert.ok(common.every(classe => !classe.arvores?.length));
  assert.ok(special.every(classe => classe.disponibilidade === 'restrita'));
  assert.ok(special.every(classe => classe.requer_autorizacao_mestre === true));
  assert.ok(special.every(classe => classe.arvores?.length));

  for (const tree of ARVORES) {
    const available = filtrarPorArvore(classes, tree.id);
    assert.equal(available.filter(classe => classe.categoria === 'padrao').length, 18);
    assert.ok(
      available.some(classe => classe.categoria !== 'padrao'),
      `Árvore sem classe especial: ${tree.nome}`,
    );
  }
});

test('classes comuns publicam limites para suas mecânicas mais abertas', () => {
  const guerreiro = obterClasse('guerreiro');
  const batalhao = guerreiro.habilidades?.find(item => item.id === 'batalhao');
  assert.match(batalhao?.descricao || '', /Levanta! no nível 4 é a única exceção/i);
  assert.match(
    batalhao?.opcoes?.find(item => item.id === 'ninguem-passa')?.escalonamento || '',
    /segundo ataque não gasta outra Reação/i,
  );

  const piloto = obterClasse('piloto');
  assert.match(
    piloto.habilidades?.find(item => item.id === 'meu-xodo')?.descricao || '',
    /só pode manter um por vez/i,
  );

  const ninja = obterClasse('ninja');
  const armaNinja = ninja.habilidades?.find(item => item.id === 'arma-ninja');
  assert.match(armaNinja?.descricao || '', /somente quando concede um bônus numérico/i);
  assert.match(armaNinja?.descricao || '', /só funcionam uma vez por arma/i);

  const lutador = obterClasse('lutador');
  const marcas = lutador.habilidades
    ?.find(item => item.id === 'instinto-de-combate')
    ?.estagios?.find(item => item.nivel === 10);
  assert.match(marcas?.descricao || '', /uma por turno em cada alvo/i);
  assert.doesNotMatch(marcas?.descricao || '', /uma por alvo\./i);

  const atirador = obterClasse('atirador');
  const marcaDaMira = atirador.habilidades
    ?.find(item => item.id === 'na-mira')
    ?.estagios?.find(item => item.nivel === 5);
  assert.equal(marcaDaMira?.usos, 'Uma vez por turno');
  assert.match(marcaDaMira?.descricao || '', /só mantém uma marca/i);
  assert.match(
    atirador.habilidades?.find(item => item.id === 'disparo-calculado')?.descricao || '',
    /não atravessa cobertura total/i,
  );

  const medico = obterClasse('medico');
  const segundaChance = medico.habilidades
    ?.find(item => item.id === 'medicina')
    ?.opcoes?.find(item => item.id === 'segunda-chance');
  assert.match(segundaChance?.descricao || '', /some \+1d6 à cura/i);
  assert.doesNotMatch(segundaChance?.descricao || '', /ignora Resistência/i);

  const guardiao = obterClasse('guardiao');
  const protegidoNivel5 = guardiao.habilidades
    ?.find(item => item.id === 'protegido')
    ?.estagios?.find(item => item.nivel === 5);
  assert.match(protegidoNivel5?.descricao || '', /dividir o dano antes das Resistências/i);
  assert.match(
    guardiao.habilidades?.find(item => item.id === 'castelo')?.descricao || '',
    /use sua Reação para se tornar o alvo/i,
  );
});

test('Sintonizador, Ritualista e Detetive explicitam custos e exceções', () => {
  const sintonizador = obterClasse('sintonizador');
  assert.match(
    sintonizador.habilidades?.find(item => item.id === 'fusao-controlada')?.descricao || '',
    /Reativá-lo exige os dez minutos fora de combate de Sintonia Catalisada/i,
  );
  assert.match(
    sintonizador.habilidades?.find(item => item.id === 'convergencia-segura')?.descricao || '',
    /sem desativá-lo/i,
  );

  const ritualista = obterClasse('ritualista');
  const grandeOficiante = ritualista.habilidades?.find(item => item.id === 'grande-oficiante');
  assert.match(grandeOficiante?.descricao || '', /exceção explícita.*em combate/i);
  assert.match(grandeOficiante?.descricao || '', /Ação Completa em cada um dos seus três turnos/i);
  assert.match(grandeOficiante?.descricao || '', /permaneça Concentrando/i);

  const detetive = obterClasse('detetive');
  const casoEncerrado = detetive.habilidades?.find(item => item.id === 'caso-encerrado');
  assert.match(casoEncerrado?.descricao || '', /apenas confirma o erro/i);
  assert.match(casoEncerrado?.descricao || '', /não revela a resposta correta/i);

  for (const id of ['golpe-certeiro-de-logica', 'sexto-sentido']) {
    const poder = detetive.poderes?.find(item => item.id === id);
    assert.notEqual(poder?.acao, 'Passivo', `${poder?.titulo} cobra Mana e precisa declarar o gatilho`);
    assert.match(poder?.descricao || '', new RegExp(`${poder?.custo_mana} Mana`, 'i'));
  }

  assert.match(
    detetive.poderes?.find(item => item.id === 'instinto-de-perigo')?.descricao || '',
    /exceção à restrição de Reações de Surpreendido/i,
  );
});

test('mantém o mapa temático das classes especiais', () => {
  const expected: Record<string, string[]> = {
    aethel: ['cartista-arcano', 'invocador'],
    ousias: ['cartista-arcano', 'invocador'],
    keryx: ['cartista-arcano', 'interceptador', 'invocador'],
    haemus: ['cacador-das-almas', 'cartista-arcano', 'invocador'],
    ignis: ['cartista-arcano', 'invocador', 'viajante-classe'],
    moros: ['campeao-dimensional', 'cartista-arcano', 'invocador'],
    aperion: ['cartista-arcano', 'guia-dimensional', 'invocador', 'viajante-classe'],
    chronus: ['cartista-arcano', 'invocador', 'viajante-classe'],
    erebus: ['cartista-arcano', 'invocador', 'pirata-amaldicoado'],
    'mulher-carmesim': ['cartista-arcano', 'devorador', 'escritor-de-contos', 'invocador'],
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
  assert.equal(proposed.length, 14);
  assert.deepEqual(
    proposed.map(classe => classe.id).sort(),
    [
      'alquimista',
      'cacador-das-almas',
      'canalizador',
      'comerciante',
      'cozinheiro',
      'detetive',
      'devorador',
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


test('toda habilidade com escolha declarada publica o catálogo que o jogador escolhe', () => {
  for (const classe of classes) {
    for (const habilidade of classe.habilidades || []) {
      if (!habilidade.escolha_opcoes && !habilidade.opcoes) continue;
      assert.ok(habilidade.escolha_opcoes?.rotulo, `Escolha sem rótulo em ${classe.titulo}/${habilidade.titulo}`);
      assert.ok((habilidade.opcoes || []).length >= 2, `Escolha sem opções reais em ${classe.titulo}/${habilidade.titulo}`);
      const ids = (habilidade.opcoes || []).map(opcao => opcao.id);
      assert.equal(new Set(ids).size, ids.length, `Opção repetida em ${classe.titulo}/${habilidade.titulo}`);
      for (const opcao of habilidade.opcoes || []) {
        assert.ok(opcao.titulo, `Opção sem título em ${classe.titulo}/${habilidade.titulo}`);
        assert.ok(opcao.descricao, `Opção sem descrição em ${classe.titulo}/${habilidade.titulo}`);
      }
    }
  }
});

test('Engenheiro publica as engenhocas e as especialidades que pode escolher', () => {
  const engenheiro = obterClasse('engenheiro');

  const engenhocas = engenheiro.habilidades?.find(item => item.id === 'engenhocas');
  assert.ok(engenhocas, 'Engenhocas ausente no catálogo');
  assert.equal(engenhocas.opcoes?.length, 20, 'Engenhocas deve publicar vinte projetos');
  assert.deepEqual(engenhocas.escalonamento?.marcos.map(marco => [marco.nivel, marco.nivel_classe]), [[1, 3], [2, 5], [3, 9], [4, 13], [5, 17]]);
  const marcosProjetos = { 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const projeto of engenhocas.opcoes || []) {
    const niveis = [...(projeto.escalonamento || '').matchAll(/Nível ([2-5]):/g)].map(resultado => Number(resultado[1]));
    assert.equal(niveis.length, 2, `${projeto.titulo}: precisa informar exatamente duas melhorias`);
    assert.ok(niveis[0] < niveis[1], `${projeto.titulo}: os marcos precisam estar em ordem crescente`);
    for (const nivel of niveis) marcosProjetos[nivel as keyof typeof marcosProjetos] += 1;
  }
  assert.deepEqual(marcosProjetos, { 2: 10, 3: 10, 4: 10, 5: 10 });
  assert.equal(engenhocas.escolha_opcoes?.por_estagio, 1);
  assert.equal(engenhocas.escolha_opcoes?.repetivel, true);
  // Uma engenhoca por estágio: 1 no nível 3, 2 no 8, 3 no 14 e 4 no 20.
  assert.equal(vagasEscolhaHabilidade(engenhocas, 2), 0);
  assert.equal(vagasEscolhaHabilidade(engenhocas, 3), 1);
  assert.equal(vagasEscolhaHabilidade(engenhocas, 8), 2);
  assert.equal(vagasEscolhaHabilidade(engenhocas, 14), 3);
  assert.equal(vagasEscolhaHabilidade(engenhocas, 20), 4);

  const meusFilhos = engenheiro.habilidades?.find(item => item.id === 'meus-filhos');
  assert.ok(meusFilhos);
  assert.equal(meusFilhos.opcoes?.length, 20, 'A classe deve publicar vinte especialidades de engenharia');
  assert.equal(new Set(meusFilhos.opcoes?.map(opcao => opcao.id)).size, 20, 'Especialidades com id duplicado');
  assert.equal(meusFilhos.escolha_opcoes?.total, 1);
  assert.equal(vagasEscolhaHabilidade(meusFilhos, 1), 1);
  assert.equal(vagasEscolhaHabilidade(meusFilhos, 20), 1);
});

test('ficha do Engenheiro guarda as engenhocas preparadas dentro das vagas do nível', () => {
  const ficha = {
    classes: [{ classeId: 'engenheiro', nivel: 8 }],
    escolhasHabilidade: {
      'engenheiro:engenhocas': ['drone-batedor', 'drone-batedor', 'mina-adesiva'],
      'engenheiro:meus-filhos': ['robotica'],
      'engenheiro:inexistente': ['sei-la'],
    },
  };

  const validas = selecoesHabilidadeValidas(ficha);
  // Duas vagas no nível 8: a terceira engenhoca cai fora, e repetir a mesma vale.
  assert.deepEqual(validas['engenheiro:engenhocas'], ['drone-batedor', 'drone-batedor']);
  assert.deepEqual(validas['engenheiro:meus-filhos'], ['robotica']);
  assert.equal(validas['engenheiro:inexistente'], undefined);

  const escolhas = escolhasHabilidadeDisponiveis(ficha);
  const preparadas = escolhas.find(item => item.chave === 'engenheiro:engenhocas');
  assert.ok(preparadas);
  assert.equal(preparadas.vagas, 2);
  assert.equal(preparadas.selecionadas.length, 2);
  assert.equal(podeEscolherOpcaoHabilidade(preparadas, 'mina-adesiva').permitido, false);

  const especialidade = escolhas.find(item => item.chave === 'engenheiro:meus-filhos');
  assert.ok(especialidade);
  assert.equal(podeEscolherOpcaoHabilidade(especialidade, 'mecanica').permitido, false, 'Especialidade só tem uma vaga');

  const habilidade = habilidadesAutomaticas(ficha).find(item => item.titulo === 'Engenhocas');
  assert.ok(habilidade);
  assert.match(habilidade.descricao, /Engenhocas preparadas \(2\/2\): Drone Batedor, Drone Batedor\./);
});

test('Engenheiro sem escolha feita mostra as vagas livres na ficha', () => {
  const ficha = { classes: [{ classeId: 'engenheiro', nivel: 3 }] };
  const habilidade = habilidadesAutomaticas(ficha).find(item => item.titulo === 'Engenhocas');
  assert.ok(habilidade);
  assert.match(habilidade.descricao, /Engenhocas preparadas: 1 vaga livre/);
});

// Classes já revisadas no molde do Engenheiro: catálogo de escolha publicado,
// ficha técnica preenchida, DT declarada e perícia concedida pela classe.
const CLASSES_POLIDAS = ['engenheiro', 'alquimista', 'cozinheiro', 'comerciante', 'ritualista', 'pop-star', 'lutador', 'guerreiro', 'piloto', 'pirata-amaldicoado', 'ninja', 'atirador', 'medico', 'espadachim', 'guardiao', 'cacador', 'canalizador', 'sintonizador', 'campeao-dimensional', 'cartista-arcano', 'guia-dimensional', 'cacador-das-almas', 'escritor-de-contos', 'invocador', 'viajante-classe', 'interceptador', 'detetive', 'devorador'];

// Um efeito que manda o alvo testar resistência sem dizer contra qual número
// para a mesa: ou o texto aponta a DT, ou a classe define de onde ela sai.
test('nenhum efeito das classes revisadas pede teste de resistência sem apontar a DT', () => {
  for (const id of CLASSES_POLIDAS) {
    const classe = obterClasse(id);
    assert.ok(classe.dt_efeitos, `${classe.titulo} precisa declarar de onde sai a DT dela`);
    // A DT sai de uma perícia que existe: ou o ofício que a classe concede, ou
    // uma do catálogo geral, como o Misticismo do Ritualista.
    const doCatalogo = JSON.parse(
      readFileSync(new URL('../../data/ficha/pericias.json', import.meta.url), 'utf8'),
    ) as { pericias: Array<{ id: string }> };
    assert.ok(
      (classe.pericias_concedidas || []).some(pericia => pericia.id === classe.dt_efeitos?.pericia)
        || doCatalogo.pericias.some(pericia => pericia.id === classe.dt_efeitos?.pericia),
      `${classe.titulo}: a DT aponta para uma perícia que não existe`,
    );

    const textos: Array<{ onde: string; texto: string }> = [];
    for (const habilidade of classe.habilidades || []) {
      if (habilidade.descricao) textos.push({ onde: habilidade.titulo, texto: habilidade.descricao });
      for (const estagio of habilidade.estagios || []) textos.push({ onde: `${habilidade.titulo} N${estagio.nivel}`, texto: estagio.descricao });
      for (const opcao of habilidade.opcoes || []) textos.push({ onde: `${habilidade.titulo}/${opcao.titulo}`, texto: opcao.descricao });
    }
    for (const poder of classe.poderes || []) textos.push({ onde: poder.titulo, texto: poder.descricao });

    for (const { onde, texto } of textos) {
      if (!/test(a|am|e|ar).*(Fortitude|Reflexos|Vontade|Percepção)/i.test(texto)) continue;
      assert.match(texto, /DT/, `${classe.titulo}/${onde}: pede teste de resistência sem dizer a DT`);
    }
  }
});

test('todo item de catálogo das classes revisadas declara como usa, alcance e duração', () => {
  for (const id of CLASSES_POLIDAS) {
    const classe = obterClasse(id);
    const comCatalogo = (classe.habilidades || []).filter(habilidade => (habilidade.opcoes || []).length > 0);
    assert.ok(comCatalogo.length, `${classe.titulo}: nenhuma habilidade publica catálogo`);
    for (const habilidade of comCatalogo) {
      // Escolha permanente de perfil (a especialidade do Engenheiro, a praça do
      // Comerciante) não é efeito acionável: não tem ação nem alcance a declarar.
      if (habilidade.escolha_opcoes?.permanente) continue;
      for (const opcao of habilidade.opcoes || []) {
        assert.ok(opcao.acao, `${classe.titulo}/${opcao.titulo}: sem ação declarada`);
        assert.ok(opcao.alcance, `${classe.titulo}/${opcao.titulo}: sem alcance declarado`);
        assert.ok(opcao.duracao, `${classe.titulo}/${opcao.titulo}: sem duração declarada`);
      }
    }
  }
});

test('perícia concedida por classe traz id, atributo e grau utilizáveis pela ficha', () => {
  const atributos = ['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'];
  const graus = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'];
  for (const classe of classes) {
    for (const pericia of classe.pericias_concedidas || []) {
      assert.ok(pericia.id?.trim(), `${classe.titulo}: perícia concedida sem id`);
      assert.ok(pericia.titulo?.trim(), `${classe.titulo}: perícia concedida sem título`);
      assert.ok(atributos.includes(pericia.atributo), `${classe.titulo}/${pericia.titulo}: atributo fora da lista`);
      if (pericia.grau_inicial) assert.ok(graus.includes(pericia.grau_inicial), `${classe.titulo}/${pericia.titulo}: grau inválido`);
    }
  }

  const engenheiro = obterClasse('engenheiro');
  const oficio = engenheiro.pericias_concedidas?.find(item => item.id === 'oficio-engenharia');
  assert.ok(oficio, 'O Engenheiro entra na classe com o Ofício (Engenharia)');
  assert.equal(oficio.atributo, 'inteligencia');
  assert.equal(oficio.grau_inicial, 'aprendiz');
});

test('ficha de Engenheiro mostra o Ofício (Engenharia) treinado sem gravar nada', () => {
  const ficha = { classes: [{ classeId: 'engenheiro', nivel: 1 }], pericias: { percepcao: 'aprendiz' } };
  const concedidas = periciasConcedidasPelaClasse(ficha);
  assert.equal(concedidas.length, 1);
  assert.equal(concedidas[0].titulo, 'Ofício (Engenharia)');
  assert.equal(concedidas[0].origem, 'Engenheiro');
  assert.equal(ehPericiaConcedida(ficha, 'oficio-engenharia'), true);

  const graus = grausComConcedidos(ficha);
  assert.equal(graus['oficio-engenharia'], 'aprendiz');
  assert.equal(graus.percepcao, 'aprendiz');
  assert.equal(ficha.pericias['oficio-engenharia'], undefined, 'o piso é de leitura, não grava na ficha');

  // Quem já treinou acima do piso não é rebaixado.
  const veterana = { classes: [{ classeId: 'engenheiro', nivel: 7 }], pericias: { 'oficio-engenharia': 'especialista' } };
  assert.equal(grausComConcedidos(veterana)['oficio-engenharia'], 'especialista');

  // Sem a classe na ficha, nada é concedido.
  assert.deepEqual(periciasConcedidasPelaClasse({ classes: [{ classeId: 'guerreiro', nivel: 5 }] }), []);
});

test('ficha técnica do efeito vira uma linha só na ficha do jogador', () => {
  const ficha = { classes: [{ classeId: 'engenheiro', nivel: 10 }] };
  const meusFilhos = habilidadesAutomaticas(ficha).find(item => item.titulo === 'Meus Filhos');
  assert.ok(meusFilhos);
  assert.match(meusFilhos.descricao, /Ação Livre · Toque · Até o fim do combate · Uma vez por combate/);

  const engenheiro = obterClasse('engenheiro');
  const torreta = engenheiro.poderes?.find(item => item.id === 'torreta-compacta');
  assert.ok(torreta);
  assert.equal(resumoFichaTecnica(torreta), 'Ação Padrão · Adjacente para montar, 18 m de tiro · Três rodadas · 1d10 de perfuração ou 1d8 de raio');
  assert.equal(resumoFichaTecnica({}), '');
});

test('Alquimista publica o catálogo de fórmulas e as vagas por estágio', () => {
  const alquimista = obterClasse('alquimista');

  const formulas = alquimista.habilidades?.find(item => item.id === 'formulas');
  assert.ok(formulas, 'Fórmulas ausente no catálogo');
  assert.equal((formulas.opcoes || []).length, 20, 'Catálogo do Alquimista incompleto');
  assert.equal(formulas.escolha_opcoes?.por_estagio, 1);
  assert.equal(formulas.escolha_opcoes?.repetivel, false);
  // Uma fórmula por estágio: 1 no nível 3, 2 no 8, 3 no 14 e 4 no 20.
  assert.equal(vagasEscolhaHabilidade(formulas, 2), 0);
  assert.equal(vagasEscolhaHabilidade(formulas, 3), 1);
  assert.equal(vagasEscolhaHabilidade(formulas, 8), 2);
  assert.equal(vagasEscolhaHabilidade(formulas, 14), 3);
  assert.equal(vagasEscolhaHabilidade(formulas, 20), 4);

  // As três de base chegam pela Grande Obra no nível 1, então o Alquimista de
  // nível 1 tem o que preparar antes da primeira vaga de escolha abrir.
  const base = ['cura-menor', 'fogo-alquimico', 'antidoto'];
  for (const id of base) {
    assert.ok(formulas.opcoes?.some(opcao => opcao.id === id), `Fórmula de base fora do catálogo: ${id}`);
  }
  const nivel1 = alquimista.habilidades?.find(item => item.id === 'grande-obra')?.estagios?.find(item => item.nivel === 1);
  assert.match(nivel1?.descricao || '', /Cura Menor, Fogo Alquímico e Antídoto/);

  const oficio = alquimista.pericias_concedidas?.find(item => item.id === 'oficio-alquimia');
  assert.ok(oficio, 'O Alquimista entra na classe com o Ofício (Alquimia)');
  assert.equal(oficio.atributo, 'inteligencia');
});

test('ficha de Alquimista guarda as fórmulas aprendidas dentro das vagas do nível', () => {
  const ficha = {
    classes: [{ classeId: 'alquimista', nivel: 8 }],
    escolhasHabilidade: { 'alquimista:formulas': ['acido-corrosivo', 'nevoa-densa', 'oleo-deslizante'] },
  };

  const validas = selecoesHabilidadeValidas(ficha);
  // Duas vagas no nível 8: a terceira fórmula cai fora.
  assert.deepEqual(validas['alquimista:formulas'], ['acido-corrosivo', 'nevoa-densa']);

  const escolha = escolhasHabilidadeDisponiveis(ficha).find(item => item.chave === 'alquimista:formulas');
  assert.ok(escolha);
  assert.equal(escolha.vagas, 2);
  assert.equal(podeEscolherOpcaoHabilidade(escolha, 'acido-corrosivo').permitido, false, 'Fórmula não se aprende duas vezes');

  const concedidas = periciasConcedidasPelaClasse(ficha);
  assert.equal(concedidas.length, 1);
  assert.equal(concedidas[0].titulo, 'Ofício (Alquimia)');
  assert.equal(grausComConcedidos(ficha)['oficio-alquimia'], 'aprendiz');
});

test('as fórmulas do Alquimista sobem de nível sozinhas, sem gastar vaga', () => {
  const formulas = obterClasse('alquimista').habilidades?.find(item => item.id === 'formulas');
  assert.ok(formulas?.escalonamento, 'Fórmulas sem escada de nível');
  assert.equal(tetoEscalonamento(formulas), 5);

  // Nível 2 aos 5, 3 aos 9, 4 aos 13 e 5 aos 17.
  const esperado: Array<[number, number]> = [[1, 1], [4, 1], [5, 2], [8, 2], [9, 3], [12, 3], [13, 4], [16, 4], [17, 5], [20, 5]];
  for (const [nivelClasse, degrau] of esperado) {
    assert.equal(nivelEscalonamento(formulas, nivelClasse), degrau, `Nível ${nivelClasse} de Alquimista`);
  }

  // Toda fórmula diz o que ganha nos degraus altos, senão a escada só vale para
  // quem tem dado de dano ou de cura.
  for (const opcao of formulas.opcoes || []) {
    assert.ok(opcao.escalonamento, `${opcao.titulo}: sem degrau próprio na escada`);
  }

  // Os projetos do Engenheiro agora seguem a mesma escada automática.
  const engenhocas = obterClasse('engenheiro').habilidades?.find(item => item.id === 'engenhocas');
  assert.ok(engenhocas);
  assert.equal(nivelEscalonamento(engenhocas, 3), 1);
  assert.equal(nivelEscalonamento(engenhocas, 8), 2);
  assert.equal(nivelEscalonamento(engenhocas, 20), 5);
  assert.equal(tetoEscalonamento(engenhocas), 5);
});

test('a ficha mostra em que degrau as fórmulas do personagem estão', () => {
  const ficha = { classes: [{ classeId: 'alquimista', nivel: 13 }] };

  const escolha = escolhasHabilidadeDisponiveis(ficha).find(item => item.chave === 'alquimista:formulas');
  assert.ok(escolha);
  assert.deepEqual(escolha.escalonamento, { rotulo: 'Nível da fórmula', nivel: 4, teto: 5 });

  const habilidade = habilidadesAutomaticas(ficha).find(item => item.titulo === 'Fórmulas');
  assert.ok(habilidade);
  assert.match(habilidade.descricao, /Nível da fórmula: 4 de 5\./);

  // A ficha também mostra o degrau atual dos projetos do Engenheiro.
  const engenheiro = { classes: [{ classeId: 'engenheiro', nivel: 8 }] };
  const engenhocas = habilidadesAutomaticas(engenheiro).find(item => item.titulo === 'Engenhocas');
  assert.ok(engenhocas);
  assert.match(engenhocas.descricao, /Nível do projeto: 2 de 5\./);
});

test('Chef publica vinte receitas reais, Mise en Place direta e cinco níveis automáticos', () => {
  const cozinheiro = obterClasse('cozinheiro');
  assert.equal(cozinheiro.titulo, 'Chef');
  assert.equal(cozinheiro.vida, 3);
  assert.equal(cozinheiro.mana, 4);

  const oficio = cozinheiro.pericias_concedidas?.find(item => item.id === 'oficio-cozinha');
  assert.ok(oficio);
  assert.equal(oficio.atributo, 'sabedoria');
  assert.equal(cozinheiro.dt_efeitos?.pericia, 'oficio-cozinha');

  const cardapio = cozinheiro.habilidades?.find(item => item.id === 'cardapio');
  assert.ok(cardapio);
  assert.equal(cardapio.opcoes?.length, 20);
  assert.deepEqual(cardapio.escalonamento?.marcos.map(marco => [marco.nivel, marco.nivel_classe]), [[1, 1], [2, 5], [3, 9], [4, 13], [5, 17]]);
  assert.doesNotMatch(cardapio.escalonamento?.descricao || '', /cada nível.+soma/i);
  const marcosReceitas = { 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const receita of cardapio.opcoes || []) {
    const niveis = [...(receita.escalonamento || '').matchAll(/Nível ([2-5]):/g)].map(resultado => Number(resultado[1]));
    assert.equal(niveis.length, 2, `${receita.titulo}: precisa informar exatamente duas melhorias`);
    assert.ok(niveis[0] < niveis[1], `${receita.titulo}: os marcos precisam estar em ordem crescente`);
    for (const nivel of niveis) marcosReceitas[nivel as keyof typeof marcosReceitas] += 1;
  }
  assert.deepEqual(marcosReceitas, { 2: 10, 3: 10, 4: 10, 5: 10 });
  assert.equal(cardapio.escolha_opcoes?.por_estagio, 1);
  assert.equal(vagasEscolhaHabilidade(cardapio, 2), 0);
  assert.equal(vagasEscolhaHabilidade(cardapio, 3), 1);
  assert.equal(vagasEscolhaHabilidade(cardapio, 8), 2);
  assert.equal(vagasEscolhaHabilidade(cardapio, 14), 3);
  assert.equal(vagasEscolhaHabilidade(cardapio, 20), 4);

  const iniciais = ['infusao-de-ervas-puras', 'sementes-de-marcha', 'caldo-regenerativo'];
  for (const id of iniciais) assert.ok(cardapio.opcoes?.some(item => item.id === id), `Receita inicial ausente: ${id}`);
  const primeiroEstagio = cozinheiro.habilidades?.find(item => item.id === 'mise-en-place')?.estagios?.[0];
  assert.match(primeiroEstagio?.descricao || '', /Chá de Hortelã, Paçoca de Amendoim e Canja de Galinha/);
  assert.match(primeiroEstagio?.descricao || '', /gaste 1 lote de Mantimentos/i);
  assert.match(primeiroEstagio?.descricao || '', /É um único lote para todas as porções/i);
  assert.ok((primeiroEstagio?.descricao.length || Infinity) < 500);

  const assinatura = cozinheiro.habilidades?.find(item => item.id === 'prato-assinatura');
  assert.ok(assinatura);
  assert.deepEqual(assinatura.niveis, [18]);
  assert.match(assinatura.descricao, /segunda criatura.+sem gastar outra porção/i);

  assert.equal(cozinheiro.poderes?.length, 10);
  assert.equal(cozinheiro.poderes?.find(item => item.id === 'aroma-reconfortante')?.titulo, 'Paladar Apurado');
  assert.equal(cozinheiro.poderes?.find(item => item.id === 'picante-na-medida')?.titulo, 'Fogo Alto');
  assert.equal(cozinheiro.poderes?.find(item => item.id === 'doce-recompensa')?.titulo, 'Harmonização');
});

test('ficha de Chef limita as escolhas de receita às vagas do nível', () => {
  const ficha = {
    classes: [{ classeId: 'cozinheiro', nivel: 8 }],
    escolhasHabilidade: {
      'cozinheiro:cardapio': ['pao-de-vigilia', 'cha-de-foco', 'ensopado-fortificante'],
    },
  };

  const validas = selecoesHabilidadeValidas(ficha);
  assert.deepEqual(validas['cozinheiro:cardapio'], ['pao-de-vigilia', 'cha-de-foco']);
  const escolha = escolhasHabilidadeDisponiveis(ficha).find(item => item.chave === 'cozinheiro:cardapio');
  assert.ok(escolha);
  assert.equal(escolha.vagas, 2);
  assert.equal(podeEscolherOpcaoHabilidade(escolha, 'pao-de-vigilia').permitido, false);
});

test('Comerciante publica as praças e as linhas de estoque', () => {
  const comerciante = obterClasse('comerciante');

  const rede = comerciante.habilidades?.find(item => item.id === 'rede-de-negocios');
  assert.ok(rede);
  assert.ok((rede.opcoes || []).length >= 5, 'Praças ausentes do catálogo');
  // Praça sai nos níveis 1 e 5, e para: os estágios 10, 15 e 20 entregam outra coisa.
  assert.deepEqual(rede.escolha_opcoes?.niveis_vaga, [1, 5]);
  assert.equal(vagasEscolhaHabilidade(rede, 1), 1);
  assert.equal(vagasEscolhaHabilidade(rede, 4), 1);
  assert.equal(vagasEscolhaHabilidade(rede, 5), 2);
  assert.equal(vagasEscolhaHabilidade(rede, 20), 2);

  const estoque = comerciante.habilidades?.find(item => item.id === 'estoque');
  assert.ok(estoque);
  assert.ok((estoque.opcoes || []).length >= 8, 'Linhas de estoque ausentes');
  assert.equal(estoque.escolha_opcoes?.por_estagio, 1);
  assert.equal(estoque.escolha_opcoes?.repetivel, true);
  assert.equal(vagasEscolhaHabilidade(estoque, 20), 4);
  // O teto de preço do consignado sobe junto com a classe.
  assert.equal(tetoEscalonamento(estoque), 4);
  assert.equal(nivelEscalonamento(estoque, 3), 1);
  assert.equal(nivelEscalonamento(estoque, 13), 2);
  assert.equal(nivelEscalonamento(estoque, 20), 4);

  const oficio = comerciante.pericias_concedidas?.find(item => item.id === 'oficio-comercio');
  assert.ok(oficio, 'O Comerciante entra na classe com o Ofício (Comércio)');
  assert.equal(oficio.atributo, 'carisma');
});

test('a classe não cita perícia que não existe no catálogo', () => {
  const pericias = JSON.parse(
    readFileSync(new URL('../../data/ficha/pericias.json', import.meta.url), 'utf8'),
  ) as { pericias: Array<{ titulo: string }> };
  const oficiosConcedidos = classes.flatMap(classe => (classe.pericias_concedidas || []).map(item => item.titulo));
  // Teste de atributo é legítimo e não passa pelo catálogo de perícias.
  const atributos = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma', 'Fluxo'];
  // Testes que o livro nomeia sem serem perícia.
  const testesDoLivro = ['Morrendo', 'Grupo'];
  const conhecidas = [...pericias.pericias.map(item => item.titulo), ...oficiosConcedidos, ...atributos, ...testesDoLivro];

  for (const id of CLASSES_POLIDAS) {
    const classe = obterClasse(id);
    const textos = [
      ...(classe.habilidades || []).flatMap(habilidade => [
        habilidade.descricao || '',
        ...(habilidade.estagios || []).map(estagio => estagio.descricao),
        ...(habilidade.opcoes || []).map(opcao => opcao.descricao),
      ]),
      ...(classe.poderes || []).map(poder => poder.descricao),
    ];
    // "teste de Comércio" era o caso: a classe cobrava uma perícia que o
    // catálogo nunca publicou.
    for (const texto of textos) {
      for (const achado of texto.matchAll(/teste[s]? de ([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]*(?: \([\wÀ-ÿ]+\))?)/g)) {
        const nome = achado[1];
        assert.ok(
          conhecidas.some(conhecida => conhecida === nome || conhecida.startsWith(`${nome} (`)),
          `${classe.titulo}: cita "teste de ${nome}", que não existe no catálogo de perícias`,
        );
      }
    }
  }
});

test('Ritualista publica os preparos do círculo e amarra a regra de interrupção', () => {
  const ritualista = obterClasse('ritualista');

  const circulo = ritualista.habilidades?.find(item => item.id === 'circulo-preparado');
  assert.ok(circulo);
  assert.ok((circulo.opcoes || []).length >= 5, 'Preparos do círculo ausentes');
  // Quatro vagas até o nível 20 numa lista de seis: nem o Ritualista de 20 leva tudo.
  assert.equal(vagasEscolhaHabilidade(circulo, 20), 4);
  assert.ok((circulo.opcoes || []).length > vagasEscolhaHabilidade(circulo, 20), 'A lista precisa ser maior que as vagas');
  assert.equal(tetoEscalonamento(circulo), 4);
  assert.equal(nivelEscalonamento(circulo, 8), 2);
  const marcosPreparos = { 2: 0, 3: 0, 4: 0 };
  for (const preparo of circulo.opcoes || []) {
    const niveis = [...(preparo.escalonamento || '').matchAll(/Nível ([2-4]):/g)].map(resultado => Number(resultado[1]));
    assert.equal(niveis.length, 2, `${preparo.titulo}: precisa informar exatamente duas melhorias`);
    assert.ok(niveis[0] < niveis[1], `${preparo.titulo}: os marcos precisam estar em ordem crescente`);
    for (const nivel of niveis) marcosPreparos[nivel as keyof typeof marcosPreparos] += 1;
  }
  assert.deepEqual(marcosPreparos, { 2: 4, 3: 4, 4: 4 });
  assert.match(circulo.opcoes?.find(item => item.id === 'economia')?.descricao || '', /nunca reduz os Componentes Ritualísticos/i);

  // O teste do rito e a interrupção rolam Misticismo, que já existe no catálogo,
  // então esta classe não ganha ofício novo.
  assert.equal(ritualista.dt_efeitos?.pericia, 'misticismo');
  assert.equal(ritualista.pericias_concedidas, undefined);
  assert.match(ritualista.dt_efeitos?.descricao || '', /interrup/i);

  // A mesa de trabalho publica as quatro complexidades do catálogo de rituais.
  const complexidades = (ritualista.tarefas_bancada?.itens || []).map(item => item.tarefa);
  for (const nome of ['Simples', 'Complexo', 'Grandioso', 'Monumental']) {
    assert.ok(complexidades.includes(nome), `Complexidade ausente da mesa: ${nome}`);
  }
  assert.match(ritualista.tarefas_bancada?.itens.find(item => item.tarefa === 'Simples')?.nota || '', /1 Componente Ritualístico Incomum/);
  assert.match(ritualista.tarefas_bancada?.itens.find(item => item.tarefa === 'Monumental')?.nota || '', /2 Componentes Ritualísticos Lendários/);

  const grandeOficiante = ritualista.habilidades?.find(item => item.id === 'grande-oficiante');
  assert.deepEqual(grandeOficiante?.niveis, [20]);
  assert.equal(ritualista.progressao?.find(item => item.nivel === 18)?.recompensas.some(item => item.titulo === 'Grande Oficiante'), false);
});

test('as DTs que o Ritualista publica batem com o catálogo de rituais', () => {
  const magias = JSON.parse(
    readFileSync(new URL('../../data/ficha/magias.json', import.meta.url), 'utf8'),
  ) as { rituais: Array<{ complexidade: string; dt: number; tempo: string }> };

  const mesa = obterClasse('ritualista').tarefas_bancada?.itens || [];
  for (const ritual of magias.rituais) {
    const linha = mesa.find(item => item.tarefa.toLowerCase() === ritual.complexidade);
    assert.ok(linha, `Complexidade sem linha na mesa: ${ritual.complexidade}`);
    assert.equal(linha.dt, `DT ${ritual.dt}`, `DT divergente em ${ritual.titulo ?? ritual.complexidade}`);
    assert.ok(linha.nota?.includes(ritual.tempo), `Tempo divergente em ${ritual.complexidade}`);
  }
});

test('Pop Star publica os contratos de Publi e amarra a Fama à tabela de Facções', () => {
  const pop = obterClasse('pop-star');

  const publi = pop.habilidades?.find(item => item.id === 'publi');
  assert.ok(publi);
  assert.ok((publi.opcoes || []).length >= 8, 'Contratos de Publi ausentes');
  assert.equal(publi.escolha_opcoes?.repetivel, false, 'A mesma marca não fecha dois contratos');
  assert.equal(vagasEscolhaHabilidade(publi, 20), 4);
  assert.equal(tetoEscalonamento(publi), 4);
  assert.equal(nivelEscalonamento(publi, 14), 3);

  // O piso de Fama sobe junto com a tabela oficial: 1 no nível 1 até 5 no 20.
  const fama = pop.habilidades?.find(item => item.id === 'fama');
  assert.ok(fama);
  const pisos = (fama.estagios || []).map(estagio => Number(estagio.descricao.match(/Fama mínima (?:é|sobe para) (\d)/)?.[1]));
  assert.deepEqual(pisos, [1, 2, 3, 4, 5]);

  // O número de palco rola Atuação, que já existe no catálogo de perícias.
  assert.equal(pop.dt_efeitos?.pericia, 'atuacao');
});

test('a escada de Fama da Pop Star bate com a tabela de Facções', () => {
  const escada = obterClasse('pop-star').tarefas_bancada?.itens || [];
  const titulos = ['Local', 'Regional', 'Ampla', 'Mundial', 'Histórica'];
  for (const [indice, titulo] of titulos.entries()) {
    const linha = escada.find(item => item.tarefa === `${indice + 1}, ${titulo}`);
    assert.ok(linha, `Faixa de Fama ausente da escada: ${titulo}`);
  }
  // TABELA_FAMA em data/regras/faccoes.ts: o anonimato piora conforme a Fama sobe.
  assert.match(escada.find(item => item.tarefa.startsWith('4,'))?.nota || '', /Anonimato −2/);
});

// Esta frase do livro já saiu de sincronia duas vezes: toda rodada de polimento
// que limpa um alerta muda a lista, e ninguém lembra de voltar aqui.
test('a lista de alertas no livro bate com a referência de balanceamento', () => {
  const referencia = JSON.parse(
    readFileSync(new URL('../../data/regras/balanceamento-referencia-v1.json', import.meta.url), 'utf8'),
  ) as { classes: Array<{ titulo: string; alertasTexto: string[] }> };
  const comAlerta = referencia.classes.filter(item => item.alertasTexto.length).map(item => item.titulo);

  const paginas = Object.values(REGRAS_OFICIAIS).map(pagina => `${pagina.corpo} ${pagina.corpoMestre || ''}`);
  const frase = paginas.join(' ').match(/\w+ classes carregam alerta qualitativo na referência: ([^.]+)\./);
  assert.ok(frase, 'o livro precisa citar os alertas da referência em algum lugar');

  const citadas = frase[1].split(/,| e /).map(nome => nome.trim()).filter(Boolean);
  assert.deepEqual(citadas.sort(), [...comAlerta].sort(), 'o livro cita alertas que a referência não tem mais, ou deixou de citar algum');
});

test('Lutador publica os estilos e amarra as manobras ao capítulo de Combate', () => {
  const lutador = obterClasse('lutador');

  const estilo = lutador.habilidades?.find(item => item.id === 'estilo-de-combate');
  assert.ok(estilo);
  assert.equal(vagasEscolhaHabilidade(estilo, 8), 0, 'Estilo não pode abrir dez níveis antes');
  assert.equal(vagasEscolhaHabilidade(estilo, 17), 0);
  assert.equal(vagasEscolhaHabilidade(estilo, 18), 1);
  assert.ok((estilo.opcoes || []).length >= 6, 'Estilos de combate ausentes');
  assert.equal(estilo.escolha_opcoes?.total, 1);
  assert.equal(estilo.escolha_opcoes?.permanente, true);
  // Cada estilo publica a vantagem e a limitação que a habilidade exige.
  for (const opcao of estilo.opcoes || []) {
    assert.match(opcao.descricao, /Vantagem:/, `${opcao.titulo}: sem vantagem declarada`);
    assert.match(opcao.descricao, /Limitação:/, `${opcao.titulo}: sem limitação declarada`);
  }

  // Punhos de Ferro virou escada de estágios, com o dado de cada degrau.
  const punhos = lutador.habilidades?.find(item => item.id === 'punhos-de-ferro');
  assert.ok(punhos);
  assert.deepEqual((punhos.estagios || []).map(item => item.dano), ['1d6', '1d8+2', '1d10+4', '2d6+6']);

  assert.equal(lutador.dt_efeitos?.pericia, 'luta');
});

test('ficha antiga perde Estilo de Combate gravado antes do nível 18', () => {
  const invalida = {
    classes: [{ classeId: 'lutador', nivel: 8 }],
    escolhasHabilidade: { 'lutador:estilo-de-combate': ['boxe'] },
  };
  assert.equal(
    escolhasHabilidadeDisponiveis(invalida).some(item => item.chave === 'lutador:estilo-de-combate'),
    false,
  );
  assert.equal(habilidadesAutomaticas(invalida).some(item => item.titulo === 'Boxe'), false);
  assert.deepEqual(limparSelecoesHabilidadeInvalidas(invalida).escolhasHabilidade, {});

  const valida = { ...invalida, classes: [{ classeId: 'lutador', nivel: 18 }] };
  assert.deepEqual(selecoesHabilidadeValidas(valida)['lutador:estilo-de-combate'], ['boxe']);
  assert.ok(habilidadesAutomaticas(valida).some(item => item.titulo === 'Boxe'));
});

test('toda escolha de total fixo respeita o primeiro nível da própria habilidade', () => {
  for (const classe of classes) {
    for (const habilidade of classe.habilidades || []) {
      if (!habilidade.escolha_opcoes?.total) continue;
      const primeiroNivel = Math.min(...habilidade.niveis);
      if (primeiroNivel > 1) assert.equal(vagasEscolhaHabilidade(habilidade, primeiroNivel - 1), 0);
      assert.equal(vagasEscolhaHabilidade(habilidade, primeiroNivel), habilidade.escolha_opcoes.total);
    }
  }
});

// As manobras eram citadas por três habilidades do Lutador e não existiam em
// regra nenhuma. Agora moram no capítulo de Combate, e a classe só aponta.
test('as manobras da classe existem no capítulo de Combate', () => {
  const combate = Object.values(REGRAS_OFICIAIS).map(pagina => pagina.corpo).join(' ');
  assert.match(combate, /<h3 class="regras-subtitle">Manobras<\/h3>/);

  const naClasse = (obterClasse('lutador').tarefas_bancada?.itens || []).map(item => item.tarefa);
  for (const manobra of ['Agarrar', 'Derrubar', 'Empurrar', 'Desarmar', 'Imobilizar']) {
    assert.ok(naClasse.includes(manobra), `Manobra fora da tabela da classe: ${manobra}`);
    assert.match(combate, new RegExp(`<strong>${manobra}</strong>`), `Manobra fora do livro: ${manobra}`);
  }
});

test('Guerreiro publica as ordens do Batalhão e trava os poderes do Arsenal', () => {
  const guerreiro = obterClasse('guerreiro');

  const batalhao = guerreiro.habilidades?.find(item => item.id === 'batalhao');
  assert.ok(batalhao);
  assert.ok((batalhao.opcoes || []).length >= 6, 'Ordens do Batalhão ausentes');
  assert.equal(vagasEscolhaHabilidade(batalhao, 20), 4);
  assert.ok((batalhao.opcoes || []).length > 4, 'A lista de ordens precisa ser maior que as vagas');
  assert.equal(tetoEscalonamento(batalhao), 4);

  // Arsenal Especial só chega no 15, e três poderes dependem dele. Sem o
  // requisito, dava para gastar uma vaga no nível 2 num poder morto por 13 níveis.
  const arsenal = guerreiro.habilidades?.find(item => item.id === 'arsenal-especial');
  assert.deepEqual(arsenal?.niveis, [15]);
  const dependentes = (guerreiro.poderes || []).filter(poder => /Arsenal Especial/.test(poder.descricao));
  assert.equal(dependentes.length, 4);
  for (const poder of dependentes) {
    assert.deepEqual(poder.pre_requisitos, ['Nível 15 de Guerreiro'], `${poder.titulo}: sem o requisito do Arsenal`);
  }

  assert.equal(guerreiro.dt_efeitos?.pericia, 'intimidacao');
});

// Poder que depende de habilidade de nível alto precisa dizer isso, senão a
// ficha deixa gastar a vaga cedo demais e o jogador descobre em jogo.
// A página lista as habilidades na ordem do array, então array fora de ordem
// mostra a habilidade de nível 18 antes da de nível 3 e confunde quem lê.
test('as habilidades das classes revisadas aparecem na ordem em que o personagem as ganha', () => {
  for (const id of CLASSES_POLIDAS) {
    const classe = obterClasse(id);
    const primeiros = (classe.habilidades || []).map(habilidade => Math.min(...habilidade.niveis));
    const ordenados = [...primeiros].sort((a, b) => a - b);
    assert.deepEqual(primeiros, ordenados, `${classe.titulo}: habilidades fora da ordem de nível`);
  }
});

test('poder que cita habilidade de nível alto declara o requisito', () => {
  for (const id of CLASSES_POLIDAS) {
    const classe = obterClasse(id);
    const tardias = (classe.habilidades || []).filter(habilidade => Math.min(...habilidade.niveis) >= 15);
    for (const habilidade of tardias) {
      for (const poder of classe.poderes || []) {
        if (!poder.descricao.includes(habilidade.titulo)) continue;
        assert.ok(
          (poder.pre_requisitos || []).length,
          `${classe.titulo}/${poder.titulo}: depende de ${habilidade.titulo} (nível ${Math.min(...habilidade.niveis)}) e não declara requisito`,
        );
      }
    }
  }
});

// A ação já sai como etiqueta na página e como linha na ficha. Repetir
// "Passivo." no começo do texto era a marcação antiga, de quando o campo não
// existia, e agora aparece duas vezes na tela.
test('classe revisada não repete a ação dentro do texto do poder', () => {
  for (const id of CLASSES_POLIDAS) {
    const classe = obterClasse(id);
    for (const poder of classe.poderes || []) {
      assert.doesNotMatch(
        poder.descricao,
        /^(Passivo|Ação (Livre|Padrão|de Movimento|Completa)|Reação)\b\s*[.:]/,
        `${classe.titulo}/${poder.titulo}: o texto repete a ação que já está na etiqueta`,
      );
    }
  }
});

// Ordem do Batalhão e poder de classe são vagas diferentes: se os dois fazem a
// mesma coisa, o jogador gasta duas escolhas no mesmo efeito.
test('as ordens do Batalhão não repetem um poder do Guerreiro', () => {
  const guerreiro = obterClasse('guerreiro');
  const ordens = guerreiro.habilidades?.find(item => item.id === 'batalhao')?.opcoes || [];
  const poderes = guerreiro.poderes || [];

  for (const ordem of ordens) {
    for (const poder of poderes) {
      const mesmoEfeito = /primeiro ataque de cada aliado do Batalhão/.test(ordem.descricao)
        && /primeiro ataque de cada aliado do Batalhão/.test(poder.descricao);
      assert.ok(!mesmoEfeito, `${ordem.titulo} repete o poder ${poder.titulo}`);
    }
  }
});

test('Piloto publica as modificações e usa o capítulo de Veículos', () => {
  const piloto = obterClasse('piloto');

  const tuning = piloto.habilidades?.find(item => item.id === 'tuning');
  assert.ok(tuning);
  assert.ok((tuning.opcoes || []).length >= 8, 'Modificações de Tuning ausentes');
  assert.equal(tuning.escolha_opcoes?.repetivel, false, 'A mesma peça não se instala duas vezes');
  assert.equal(vagasEscolhaHabilidade(tuning, 20), 4);
  assert.equal(tetoEscalonamento(tuning), 4);

  assert.equal(piloto.dt_efeitos?.pericia, 'pilotagem');
});

// A classe inteira acontece dentro do capítulo de Veículos, que já existia com
// manobras, faixas de perseguição e tabela de avaria. A tabela da classe é uma
// cópia de bolso: se o capítulo mudar, ela precisa mudar junto.
test('as manobras do Piloto batem com o capítulo de Veículos', () => {
  const mesa = obterClasse('piloto').tarefas_bancada?.itens || [];
  const publicadas = MANOBRAS_VEICULARES.map(item => item.titulo);

  for (const linha of mesa) {
    assert.ok(
      publicadas.some(titulo => titulo.toLowerCase().includes(linha.tarefa.toLowerCase())),
      `Manobra na classe que não existe no capítulo: ${linha.tarefa}`,
    );
  }
  // As duas de movimento continuam sendo as duas de movimento.
  for (const nome of ['Conduzir', 'Recuperar controle']) {
    const publicada = MANOBRAS_VEICULARES.find(item => item.titulo === nome);
    assert.equal(publicada?.acao, 'movimento', `${nome} deixou de ser Ação de Movimento`);
    const linha = mesa.find(item => nome.toLowerCase().includes(item.tarefa.toLowerCase()));
    assert.match(linha?.nota || '', /Ação de Movimento/, `${nome}: a classe não diz que é Ação de Movimento`);
  }
});

test('Pirata Amaldiçoado não cita perícia inexistente e publica as mutações abissais', () => {
  const pirata = obterClasse('pirata-amaldicoado');

  // "Navegação" e "Percepção marítima" não existem no catálogo de perícias:
  // a versão antiga da classe cobrava as duas.
  const textoCompleto = JSON.stringify(pirata);
  assert.doesNotMatch(textoCompleto, /Navegação/, 'Navegação não é uma perícia do catálogo');
  assert.doesNotMatch(textoCompleto, /Percepção marítima/, 'Percepção marítima não é uma perícia do catálogo');

  const evolucao = pirata.habilidades?.find(item => item.id === 'evolucao-abissal');
  assert.ok(evolucao);
  assert.equal(evolucao.opcoes?.length, 14, 'Catálogo de mutações abissais incompleto');
  assert.equal(new Set(evolucao.opcoes?.map(item => item.id)).size, 14, 'Mutação abissal repetida');
  assert.equal(evolucao.escolha_opcoes?.permanente, true);
  assert.equal(vagasEscolhaHabilidade(evolucao, 20), 4);
  assert.ok((evolucao.opcoes || []).length > 4, 'A lista de mutações precisa ser maior que as vagas');
  assert.deepEqual(
    evolucao.escalonamento?.marcos.map(marco => [marco.nivel, marco.nivel_classe]),
    [[1, 3], [2, 8], [3, 14], [4, 20]],
  );
  assert.equal(nivelEscalonamento(evolucao, 2), 0);
  assert.equal(nivelEscalonamento(evolucao, 3), 1);
  assert.equal(nivelEscalonamento(evolucao, 8), 2);
  assert.equal(nivelEscalonamento(evolucao, 14), 3);
  assert.equal(nivelEscalonamento(evolucao, 20), 4);
  for (const mutacao of evolucao.opcoes || []) {
    const niveis = [...(mutacao.escalonamento || '').matchAll(/Nível ([2-4]):/g)].map(resultado => Number(resultado[1]));
    assert.deepEqual(niveis, [2, 3, 4], `${mutacao.titulo}: progressão incompleta`);
  }

  const ficha = { classes: [{ classeId: 'pirata-amaldicoado', nivel: 14 }] };
  const escolha = escolhasHabilidadeDisponiveis(ficha).find(item => item.chave === 'pirata-amaldicoado:evolucao-abissal');
  assert.deepEqual(escolha?.escalonamento, { rotulo: 'Nível da mutação', nivel: 3, teto: 4 });

  // Classe especial: continua presa à Árvore Erebus e exigindo autorização do mestre.
  assert.equal(pirata.categoria, 'esquecida');
  assert.deepEqual(pirata.arvores, ['erebus']);
  assert.equal(pirata.requer_autorizacao_mestre, true);
  assert.equal(pirata.dt_efeitos?.pericia, 'intimidacao');
});

test('mutações escolhidas viram habilidades próprias e usam o efeito do degrau atual', () => {
  const escolhasHabilidade = {
    'pirata-amaldicoado:evolucao-abissal': ['pele-de-tubarao', 'coracao-de-leviata'],
  };
  const fichaNivel8 = {
    classes: [{ classeId: 'pirata-amaldicoado', nivel: 8 }],
    escolhasHabilidade,
  };
  const fichaNivel20 = {
    classes: [{ classeId: 'pirata-amaldicoado', nivel: 20 }],
    escolhasHabilidade,
  };

  const nivel8 = opcoesHabilidadeSelecionadas(fichaNivel8);
  assert.deepEqual(nivel8.map(item => item.titulo), ['Pele de Tubarão', 'Coração de Leviatã']);
  assert.deepEqual(nivel8.find(item => item.titulo === 'Pele de Tubarão')?.efeitos, [{
    id: 'defesa-natural', categoria: 'combate', alvo: 'defesa', modo: 'bonus', valor: 1,
  }]);
  assert.equal(nivel8.find(item => item.titulo === 'Coração de Leviatã')?.efeitos[0]?.valor, 10);
  assert.match(nivel8[0].descricao, /Nível da mutação: 2 de 4/);

  const nivel20 = opcoesHabilidadeSelecionadas(fichaNivel20);
  assert.equal(nivel20.find(item => item.titulo === 'Pele de Tubarão')?.efeitos[0]?.valor, 2);
  assert.equal(nivel20.find(item => item.titulo === 'Coração de Leviatã')?.efeitos[0]?.valor, 20);
  assert.match(nivel20.find(item => item.titulo === 'Coração de Leviatã')?.descricao || '', /aumento total passa para 20/);

  const automaticas = habilidadesAutomaticas(fichaNivel20);
  assert.ok(automaticas.some(item => item.titulo === 'Evolução Abissal' && item.subtipo === 'habilidade'));
  assert.ok(automaticas.some(item => item.titulo === 'Pele de Tubarão' && item.subtipo === 'escolha'));
  assert.ok(automaticas.some(item => item.titulo === 'Coração de Leviatã' && item.subtipo === 'escolha'));
});

test('escolhas de outras classes também aparecem na aba Habilidades sem inventar bônus', () => {
  const alquimista = {
    classes: [{ classeId: 'alquimista', nivel: 3 }],
    escolhasHabilidade: { 'alquimista:formulas': ['acido-corrosivo'] },
  };
  const formula = opcoesHabilidadeSelecionadas(alquimista).find(item => item.titulo === 'Ácido Corrosivo');
  assert.ok(formula, 'a fórmula selecionada deveria ser materializada como habilidade');
  assert.deepEqual(formula.efeitos, [], 'efeito não estruturado não deve virar bônus permanente');
});

test('Tripulação dos Condenados publica ficha completa dos espectros invocados', () => {
  const habilidade = obterClasse('pirata-amaldicoado').habilidades?.find(item => item.id === 'tripulacao-dos-condenados');
  assert.ok(habilidade);
  assert.match(habilidade.descricao, /Defesa igual à sua/);
  assert.match(habilidade.descricao, /1 de Vida/);
  assert.ok(habilidade.alcance, 'Sem alcance declarado para a invocação');
  assert.ok(habilidade.duracao, 'Sem duração declarada para a invocação');
});

test('Ninja publica as melhorias da Arma Ninja como catálogo, sem escolha solta', () => {
  const ninja = obterClasse('ninja');

  const arma = ninja.habilidades?.find(item => item.id === 'arma-ninja');
  assert.ok(arma);
  assert.equal((arma.opcoes || []).length, 12, 'Catálogo de melhorias da Arma Ninja incompleto');
  assert.equal(new Set(arma.opcoes?.map(item => item.id)).size, 12, 'Melhoria da Arma Ninja repetida');
  assert.ok((arma.opcoes || []).length > vagasEscolhaHabilidade(arma, 20), 'A lista de melhorias precisa ser maior que as vagas');
  assert.equal(arma.escolha_opcoes?.por_estagio, 1);
  assert.equal(arma.escolha_opcoes?.repetivel, true, 'A mesma melhoria pode empilhar na mesma arma');
  assert.equal(vagasEscolhaHabilidade(arma, 3), 1);
  assert.equal(vagasEscolhaHabilidade(arma, 8), 2);
  assert.equal(vagasEscolhaHabilidade(arma, 14), 3);
  assert.equal(vagasEscolhaHabilidade(arma, 20), 4);
  for (const opcao of arma.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }

  assert.equal(ninja.dt_efeitos?.pericia, 'furtividade');
});

test('a Hierarquia do Ninja soma um bônus de Furtividade a cada posto e cada posto rende algo novo', () => {
  const hierarquia = obterClasse('ninja').habilidades?.find(item => item.id === 'hierarquia');
  assert.ok(hierarquia);
  const bonus = (hierarquia.estagios || []).map(estagio => {
    const achado = estagio.descricao.match(/\+(\d) em Furtividade|Furtividade sobe para \+(\d)/);
    return Number(achado?.[1] ?? achado?.[2]);
  });
  assert.deepEqual(bonus, [1, 2, 3, 4, 5]);

  // Cada posto declara pelo menos um uso concreto, não só o bônus numérico e o flavor.
  for (const estagio of hierarquia.estagios || []) {
    assert.ok(estagio.usos, `${estagio.titulo}: sem uso declarado além do bônus de Furtividade`);
  }

  // O Chunnin comanda Gennin, o Jonnin pesa nas decisões dos anciãos: a
  // hierarquia não é só flavor, cada posto intermediário também faz algo.
  const chunnin = hierarquia.estagios?.find(item => item.nivel === 10);
  assert.match(chunnin?.descricao || '', /coordenar até dois Gennin/);
  const jonnin = hierarquia.estagios?.find(item => item.nivel === 15);
  assert.match(jonnin?.descricao || '', /anciãos/);

  // O Kage é o chefe da vila: autoridade de verdade, não só "peça apoio".
  const kage = hierarquia.estagios?.find(item => item.nivel === 20);
  assert.match(kage?.descricao || '', /líder da vila/);
  assert.match(kage?.descricao || '', /autoridade final|autoriza, nega ou reescreve/);
  assert.match(kage?.descricao || '', /tratados e disputas territoriais/);
});

test('Substituição chega no nível 18 do Ninja com ficha completa', () => {
  const ninja = obterClasse('ninja');

  const n18 = ninja.progressao?.find(item => item.nivel === 18);
  assert.ok(n18?.recompensas.some(item => item.tipo === 'habilidade' && item.titulo === 'Substituição'), 'Nível 18 sem habilidade nova');
  assert.ok(n18?.recompensas.some(item => item.tipo === 'evento' && item.titulo === 'Treinamento Ninja'), 'Nível 18 perdeu o evento que já tinha');

  const substituicao = ninja.habilidades?.find(item => item.id === 'substituicao');
  assert.ok(substituicao);
  assert.deepEqual(substituicao.niveis, [18]);
  assert.equal(substituicao.acao, 'Reação');
  assert.ok(substituicao.duracao, 'Sem duração declarada');
  assert.equal(substituicao.usos, 'Uma vez por combate');
});

test('Clone das Sombras e os poderes de combate do Ninja têm ficha completa', () => {
  const ninja = obterClasse('ninja');

  const clone = ninja.poderes?.find(item => item.id === 'clone-das-sombras');
  assert.ok(clone);
  assert.match(clone.descricao, /1 de Vida/);
  assert.match(clone.descricao, /sua Defesa/);
  assert.match(clone.descricao, /seu Movimento/);
  assert.ok(clone.duracao, 'Sem duração declarada para o clone');
  assert.deepEqual(clone.pre_requisitos, ['Nível 5 de Ninja']);

  // Extra attack sem teto de uso é o padrão de erro que Guerreiro e Lutador já
  // corrigiram: sempre uma vez por combate/sessão, nunca por turno a um custo fixo.
  const ataque = ninja.poderes?.find(item => item.id === 'ataque-em-movimento');
  assert.ok(ataque);
  assert.equal(ataque.usos, 'Uma vez por combate');
  assert.doesNotMatch(ataque.descricao, /uma vez por turno/i);

  // Evasão e Esquiva Sobrenatural são traços passivos, não ações que se pagam
  // com Mana toda vez que o gatilho acontece.
  for (const id of ['evasao', 'esquiva-sobrenatural']) {
    const poder = ninja.poderes?.find(item => item.id === id);
    assert.ok(poder);
    assert.equal(poder.custo_mana, 0, `${poder.titulo}: passivo não deveria custar Mana`);
    assert.equal(poder.acao, 'Passivo');
  }

  // "Desprevenido" não é condição do livro; a oficial é Surpreendido.
  const esquiva = ninja.poderes?.find(item => item.id === 'esquiva-sobrenatural');
  assert.match(esquiva?.descricao || '', /Surpreendido/);
  assert.doesNotMatch(esquiva?.descricao || '', /desprevenido/i);
});

test('Atirador publica os benefícios do Tiro de Impulso como catálogo e a DT sai de Pontaria', () => {
  const atirador = obterClasse('atirador');

  const impulso = atirador.habilidades?.find(item => item.id === 'tiro-de-impulso');
  assert.ok(impulso);
  assert.equal((impulso.opcoes || []).length, 8, 'Catálogo de benefícios do Tiro de Impulso incompleto');
  assert.equal(new Set(impulso.opcoes?.map(item => item.id)).size, 8, 'Benefício do Tiro de Impulso repetido');
  assert.equal(impulso.escolha_opcoes?.por_estagio, 1);
  assert.equal(impulso.escolha_opcoes?.repetivel, false, 'Cada benefício se aprende uma vez só');
  assert.equal(vagasEscolhaHabilidade(impulso, 3), 1);
  assert.equal(vagasEscolhaHabilidade(impulso, 8), 2);
  assert.equal(vagasEscolhaHabilidade(impulso, 14), 3);
  assert.equal(vagasEscolhaHabilidade(impulso, 20), 4);
  for (const opcao of impulso.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }

  assert.equal(atirador.dt_efeitos?.pericia, 'pontaria');
  // O teste que Na Mira impõe no nível 10 precisa apontar a DT, não só citar Fortitude solto.
  const naMira = atirador.habilidades?.find(item => item.id === 'na-mira');
  const n10 = naMira?.estagios?.find(item => item.nivel === 10);
  assert.match(n10?.descricao || '', /DT do Atirador/);
});

test('a Munição Especial do Atirador cobre a lacuna da munição etérea e mora numa tabela própria', () => {
  const atirador = obterClasse('atirador');

  const mesa = atirador.tarefas_bancada?.itens || [];
  const nomes = mesa.map(item => item.tarefa);
  for (const nome of ['Perfurante', 'Explosiva', 'Etérea', 'Incendiária']) {
    assert.ok(nomes.includes(nome), `Munição especial ausente da tabela: ${nome}`);
  }
  // A versão antiga deixava "etérea" sem efeito nenhum definido.
  const eterea = mesa.find(item => item.tarefa === 'Etérea');
  assert.ok(eterea?.dt && eterea.dt.length > 10, 'Munição Etérea sem efeito definido');

  const n15 = atirador.habilidades?.find(item => item.id === 'na-mira')?.estagios?.find(item => item.nivel === 15);
  assert.match(n15?.descricao || '', /duas doses/);
  assert.equal(n15?.usos, 'Duas doses por sessão');
});

test('Disparo Calculado chega no nível 18 do Atirador e Um Só Disparo tem ficha completa', () => {
  const atirador = obterClasse('atirador');

  const n18 = atirador.progressao?.find(item => item.nivel === 18);
  assert.ok(n18?.recompensas.some(item => item.tipo === 'habilidade' && item.titulo === 'Disparo Calculado'), 'Nível 18 sem habilidade nova');
  assert.ok(n18?.recompensas.some(item => item.tipo === 'evento' && item.titulo === 'Tiro ao Alvo'), 'Nível 18 perdeu o evento que já tinha');

  const calculado = atirador.habilidades?.find(item => item.id === 'disparo-calculado');
  assert.ok(calculado);
  assert.deepEqual(calculado.niveis, [18]);
  assert.equal(calculado.usos, 'Uma vez por combate');

  const ultimo = atirador.habilidades?.find(item => item.id === 'um-so-disparo');
  assert.ok(ultimo);
  assert.equal(ultimo.acao, 'Ação Completa');
  assert.equal(ultimo.usos, 'Uma vez por sessão');
});

test('poderes revisados do Atirador não repetem "Passivo." no texto', () => {
  const atirador = obterClasse('atirador');
  for (const id of ['olho-afiado', 'mira-fria', 'arma-quente']) {
    const poder = atirador.poderes?.find(item => item.id === id);
    assert.ok(poder);
    assert.equal(poder.acao, 'Passivo');
    assert.doesNotMatch(poder.descricao, /^Passivo\./);
  }
});

test('Médico publica os Protocolos de Emergência como catálogo e a DT sai de Cura', () => {
  const medico = obterClasse('medico');

  const socorro = medico.habilidades?.find(item => item.id === 'socorro-de-emergencia');
  assert.ok(socorro);
  assert.equal((socorro.opcoes || []).length, 8, 'Catálogo de Protocolos de Emergência incompleto');
  assert.equal(new Set(socorro.opcoes?.map(item => item.id)).size, 8, 'Protocolo de Emergência repetido');
  assert.equal(socorro.escolha_opcoes?.por_estagio, 1);
  assert.equal(socorro.escolha_opcoes?.repetivel, false, 'Cada protocolo se aprende uma vez só');
  assert.equal(vagasEscolhaHabilidade(socorro, 3), 1);
  assert.equal(vagasEscolhaHabilidade(socorro, 8), 2);
  assert.equal(vagasEscolhaHabilidade(socorro, 14), 3);
  assert.equal(vagasEscolhaHabilidade(socorro, 20), 4);
  for (const opcao of socorro.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }
  // Socorro de Emergência agora publica os quatro estágios como o resto das
  // habilidades multi-nível, em vez de um parágrafo só cobrindo tudo.
  assert.equal(socorro.estagios?.length, 4);
  assert.deepEqual(socorro.estagios?.map(item => item.nivel), [3, 8, 14, 20]);

  assert.equal(medico.dt_efeitos?.pericia, 'cura');
});

test('Medicina e Socorro de Emergência do Médico usam Mod.Sabedoria, não Mod.Inteligência', () => {
  const medico = obterClasse('medico');
  const textoCompleto = JSON.stringify(medico);
  // A perícia central da classe (Cura) é de Sabedoria; o texto antigo citava
  // Mod.Inteligência em dois pontos, e "+4 em Medicina" citava o nome da
  // própria habilidade em vez da perícia real.
  assert.doesNotMatch(textoCompleto, /Mod\.Inteligência/, 'Médico ainda cita Mod.Inteligência em vez de Mod.Sabedoria');
  assert.doesNotMatch(textoCompleto, /em Medicina/, 'Médico ainda cita "em Medicina" em vez da perícia Cura');
  assert.doesNotMatch(textoCompleto, /de Status\b/, 'Médico ainda cita o bônus indefinido "de Status"');

  const medicina = medico.habilidades?.find(item => item.id === 'medicina');
  const n10 = medicina?.estagios?.find(item => item.nivel === 10);
  assert.match(n10?.dano || '', /Mod\.Sabedoria/);
  const n15 = medicina?.estagios?.find(item => item.nivel === 15);
  assert.match(n15?.descricao || '', /\+4 em Cura/);

  const socorro = medico.habilidades?.find(item => item.id === 'socorro-de-emergencia');
  const ultimoEstagio = socorro?.estagios?.find(item => item.nivel === 20);
  assert.match(ultimoEstagio?.dano || '', /Mod\.Sabedoria/);
});

test('Milagre e Mestre da Vida do Médico têm ficha completa', () => {
  const medico = obterClasse('medico');

  const milagre = medico.habilidades?.find(item => item.id === 'milagre');
  assert.ok(milagre);
  assert.deepEqual(milagre.niveis, [18]);
  assert.equal(milagre.usos, 'Uma vez a cada cinco sessões');

  const mestre = medico.habilidades?.find(item => item.id === 'mestre-da-vida');
  assert.ok(mestre);
  assert.equal(mestre.acao, 'Ação Completa');
  assert.equal(mestre.usos, 'Uma vez por sessão');
  assert.ok(mestre.alcance, 'Sem alcance declarado para Mestre da Vida');
});

test('Medicina publica os Tratamentos Especializados, cada um reagindo a um problema real do alvo', () => {
  const medico = obterClasse('medico');
  const medicina = medico.habilidades?.find(item => item.id === 'medicina');
  assert.ok(medicina);

  assert.equal((medicina.opcoes || []).length, 6, 'Catálogo de Tratamentos Especializados incompleto');
  assert.equal(new Set(medicina.opcoes?.map(item => item.id)).size, 6, 'Tratamento Especializado repetido');
  assert.deepEqual(medicina.escolha_opcoes?.niveis_vaga, [10, 15]);
  assert.equal(medicina.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(medicina, 9), 0);
  assert.equal(vagasEscolhaHabilidade(medicina, 10), 1);
  assert.equal(vagasEscolhaHabilidade(medicina, 14), 1);
  assert.equal(vagasEscolhaHabilidade(medicina, 15), 2);
  assert.equal(vagasEscolhaHabilidade(medicina, 20), 2);
  for (const opcao of medicina.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
    // Todo tratamento é uma reação a um problema específico do alvo (condição
    // ou situação), não um bônus solto: o gatilho "Se o alvo..." é o que
    // diferencia isso de um poder qualquer.
    assert.match(opcao.descricao, /^Se /, `${opcao.titulo}: não declara a condição-gatilho do tratamento`);
  }

  // Não pode colidir de nome com os Protocolos de Emergência, que moram na
  // outra habilidade da mesma classe.
  const socorro = medico.habilidades?.find(item => item.id === 'socorro-de-emergencia');
  const nomesProtocolos = new Set((socorro?.opcoes || []).map(item => item.titulo));
  for (const tratamento of medicina.opcoes || []) {
    assert.ok(!nomesProtocolos.has(tratamento.titulo), `${tratamento.titulo}: mesmo nome de um Protocolo de Emergência`);
  }
});

test('Socorro de Emergência acelera dentro do mesmo combate: 2ª e 3ª ativação rendem mais', () => {
  const medico = obterClasse('medico');
  const socorro = medico.habilidades?.find(item => item.id === 'socorro-de-emergencia');
  const n3 = socorro?.estagios?.find(item => item.nivel === 3);
  assert.match(n3?.descricao || '', /2ª ativação neste combate soma \+1 dado/);
  assert.match(n3?.descricao || '', /3ª soma \+2 dados e também encerra uma condição leve/);
  assert.match(n3?.dano || '', /\+1 dado na 2ª ativação/);

  const n20 = socorro?.estagios?.find(item => item.nivel === 20);
  assert.match(n20?.dano || '', /1d12 \+ Mod\.Sabedoria/);
  assert.match(n20?.dano || '', /\+2 dados na 3ª/);
});

test('Espadachim publica as Posturas de Combate como catálogo e a DT sai de Luta', () => {
  const espadachim = obterClasse('espadachim');

  const talento = espadachim.habilidades?.find(item => item.id === 'talento-de-combate');
  assert.ok(talento);
  assert.equal(talento.titulo, 'Posturas de Combate');
  assert.equal((talento.opcoes || []).length, 8, 'Catálogo de Posturas de Combate incompleto');
  assert.equal(new Set(talento.opcoes?.map(item => item.id)).size, 8, 'Postura de Combate repetida');
  assert.equal(talento.escolha_opcoes?.por_estagio, 1);
  assert.equal(talento.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(talento, 3), 1);
  assert.equal(vagasEscolhaHabilidade(talento, 8), 2);
  assert.equal(vagasEscolhaHabilidade(talento, 14), 3);
  assert.equal(vagasEscolhaHabilidade(talento, 20), 4);
  for (const opcao of talento.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }
  // Os três estilos originais (Precisão, Devastação, Defesa Ágil) continuam no catálogo.
  for (const titulo of ['Precisão', 'Devastação', 'Defesa Ágil']) {
    assert.ok(talento.opcoes?.some(item => item.titulo === titulo), `Estilo original ausente: ${titulo}`);
  }

  assert.equal(espadachim.dt_efeitos?.pericia, 'luta');
});

test('Espírito da Espada aponta pra Arte da Espada, não pra uma "Maestria em Espada" que não existe', () => {
  const espadachim = obterClasse('espadachim');
  const textoCompleto = JSON.stringify(espadachim);
  assert.doesNotMatch(textoCompleto, /Maestria em Espada/, 'Espadachim ainda cita uma habilidade que não existe');

  const espirito = espadachim.habilidades?.find(item => item.id === 'espirito-da-espada');
  assert.ok(espirito);
  assert.match(espirito.descricao, /vinculada por Arte da Espada/);
  assert.equal(espirito.acao, 'Ação Livre');
  assert.equal(espirito.usos, 'Uma vez por sessão');
});

test('a redução de dano da Arte da Espada e o Combo do Espadachim têm ficha completa', () => {
  const espadachim = obterClasse('espadachim');
  const arte = espadachim.habilidades?.find(item => item.id === 'arte-da-espada');

  const n5 = arte?.estagios?.find(item => item.nivel === 5);
  assert.equal(n5?.acao, 'Reação para a redução de dano');
  assert.equal(n5?.usos, 'Uma vez por combate para a redução de dano');

  const combo = espadachim.habilidades?.find(item => item.id === 'combo');
  assert.ok(combo);
  assert.deepEqual(combo.niveis, [18]);
  assert.equal(combo.usos, 'Uma vez por combate');
});

test('Guardião publica os Juramentos de Guarda como catálogo e a DT de Provocar sai de Intimidação', () => {
  const guardiao = obterClasse('guardiao');

  const protegido = guardiao.habilidades?.find(item => item.id === 'protegido');
  assert.ok(protegido);
  assert.equal((protegido.opcoes || []).length, 8, 'Catálogo de Juramentos de Guarda incompleto');
  assert.equal(new Set(protegido.opcoes?.map(item => item.id)).size, 8, 'Juramento de Guarda repetido');
  assert.equal(protegido.escolha_opcoes?.por_estagio, 1);
  assert.equal(protegido.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(protegido, 1), 1);
  assert.equal(vagasEscolhaHabilidade(protegido, 5), 2);
  assert.equal(vagasEscolhaHabilidade(protegido, 10), 3);
  assert.equal(vagasEscolhaHabilidade(protegido, 15), 4);
  assert.equal(vagasEscolhaHabilidade(protegido, 20), 5);
  for (const opcao of protegido.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }

  assert.equal(guardiao.dt_efeitos?.pericia, 'intimidacao');
  const provocar = guardiao.habilidades?.find(item => item.id === 'provocar');
  assert.equal(provocar?.estagios?.length, 4, 'Provocar precisa publicar os quatro estágios, não um parágrafo só');
  const n3 = provocar?.estagios?.find(item => item.nivel === 3);
  assert.match(n3?.descricao || '', /DT do Guardião/);
});

test('Punhos de Ferro do Lutador ganhou catálogo de Técnicas de Punho além da escada de dado', () => {
  const lutador = obterClasse('lutador');
  const punhos = lutador.habilidades?.find(item => item.id === 'punhos-de-ferro');
  assert.ok(punhos);
  assert.equal((punhos.opcoes || []).length, 8, 'Catálogo de Técnicas de Punho incompleto');
  assert.equal(new Set(punhos.opcoes?.map(item => item.id)).size, 8, 'Técnica de Punho repetida');
  assert.equal(punhos.escolha_opcoes?.por_estagio, 1);
  assert.equal(punhos.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(punhos, 3), 1);
  assert.equal(vagasEscolhaHabilidade(punhos, 8), 2);
  assert.equal(vagasEscolhaHabilidade(punhos, 14), 3);
  assert.equal(vagasEscolhaHabilidade(punhos, 20), 4);
  for (const opcao of punhos.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }
  // A escada de dado (1d6 a 2d6) continua junto, o catálogo soma em cima dela.
  assert.deepEqual((punhos.estagios || []).map(item => item.dano), ['1d6', '1d8+2', '1d10+4', '2d6+6']);

  // Nenhuma técnica repete o nome de um estilo que a mesma classe já publica.
  const estilo = lutador.habilidades?.find(item => item.id === 'estilo-de-combate');
  const nomesEstilos = new Set((estilo?.opcoes || []).map(item => item.titulo));
  for (const tecnica of punhos.opcoes || []) {
    assert.ok(!nomesEstilos.has(tecnica.titulo), `${tecnica.titulo}: mesmo nome de um Estilo de Combate`);
  }
});

test('o Batalhão do Guerreiro ganhou duas ordens novas, mantendo as vagas em quatro', () => {
  const guerreiro = obterClasse('guerreiro');
  const batalhao = guerreiro.habilidades?.find(item => item.id === 'batalhao');
  assert.ok(batalhao);
  assert.equal((batalhao.opcoes || []).length, 10, 'Ordens do Batalhão fora do total esperado');
  assert.equal(new Set(batalhao.opcoes?.map(item => item.id)).size, 10, 'Ordem do Batalhão repetida');
  assert.equal(vagasEscolhaHabilidade(batalhao, 20), 4, 'Adicionar ordens não pode mudar quantas o Guerreiro conhece');
  for (const nova of ['firme-na-linha', 'cobertura']) {
    const ordem = batalhao.opcoes?.find(item => item.id === nova);
    assert.ok(ordem, `Ordem nova ausente: ${nova}`);
    assert.ok(ordem.escalonamento, `${ordem.titulo}: sem escalonamento pelos quatro níveis`);
  }
});

// O Lutador é a única classe que não pode trocar de arma: o dado do punho é
// tudo que ele tem. Sem um bônus próprio ele chega no nível 20 socando como
// arma Incomum, enquanto o resto da mesa carrega Épico ou Lendário.
test('o punho do Lutador escala até o patamar de arma de fim de jogo', () => {
  const punhos = obterClasse('lutador').habilidades?.find(item => item.id === 'punhos-de-ferro');
  assert.ok(punhos);
  assert.deepEqual((punhos.estagios || []).map(item => item.dano), ['1d6', '1d8+2', '1d10+4', '2d6+6']);

  const media = (formula: string) => {
    let total = 0;
    for (const [, quantidade, faces] of formula.matchAll(/(\d+)d(\d+)/g)) total += Number(quantidade) * (Number(faces) + 1) / 2;
    for (const [, fixo] of formula.matchAll(/\+(\d+)(?!d)/g)) total += Number(fixo);
    return total;
  };
  const porEstagio = (punhos.estagios || []).map(item => media(String(item.dano)));
  // A escada precisa subir de verdade em todo degrau, não empacar no meio.
  for (let i = 1; i < porEstagio.length; i += 1) {
    assert.ok(porEstagio[i] > porEstagio[i - 1], `Estágio ${i + 1} do punho não cresce`);
  }
  // No nível 20 o punho precisa passar da mediana de arma Rara (11), senão a
  // classe termina a carreira atrás de equipamento que ela nem pode usar.
  assert.ok(porEstagio[porEstagio.length - 1] > 11, 'O punho de nível 20 ficou abaixo de arma Rara');
});

test('os Juramentos de Guarda do Guardião sobem de nível junto com Protegido', () => {
  const protegido = obterClasse('guardiao').habilidades?.find(item => item.id === 'protegido');
  assert.ok(protegido?.escalonamento, 'Juramentos sem escada de nível');
  assert.deepEqual(
    protegido.escalonamento.marcos.map(marco => [marco.nivel, marco.nivel_classe]),
    [[1, 1], [2, 5], [3, 10], [4, 15], [5, 20]],
  );
  assert.equal(tetoEscalonamento(protegido), 5);
  assert.equal(nivelEscalonamento(protegido, 1), 1);
  assert.equal(nivelEscalonamento(protegido, 9), 2);
  assert.equal(nivelEscalonamento(protegido, 10), 3);
  assert.equal(nivelEscalonamento(protegido, 20), 5);

  // Todo juramento diz o que ganha nos degraus, senão a escada só vale no papel.
  for (const juramento of protegido.opcoes || []) {
    const niveis = [...(juramento.escalonamento || '').matchAll(/Nível ([2-5]):/g)].map(item => Number(item[1]));
    assert.equal(niveis.length, 2, `${juramento.titulo}: precisa informar exatamente duas melhorias`);
    assert.ok(niveis[0] < niveis[1], `${juramento.titulo}: os marcos precisam estar em ordem crescente`);
  }
});

// O bloco recolhível é escolhido por tamanho: catálogo grande vem fechado para
// a página não virar um paredão. Se a habilidade não estiver no mapa de rótulos
// ela ainda recolhe, mas o botão diz "opções" em vez do nome da lista - então
// este teste cobra que todo catálogo publicado tenha o próprio substantivo.
test('todo catálogo grande tem rótulo próprio no botão de recolher da página de classe', () => {
  const fonte = readFileSync(new URL('../../src/pages/Regras/components/DetalhesClasse.tsx', import.meta.url), 'utf8');
  const minimo = Number(fonte.match(/const MINIMO_PARA_RECOLHER = (\d+)/)?.[1]);
  assert.ok(minimo > 0, 'a página precisa declarar a partir de quantas opções o catálogo recolhe');

  const mapeados = new Set([...fonte.matchAll(/^\s*'([\w-]+:[\w-]+)': \{ cor:/gm)].map(item => item[1]));
  for (const classe of classes) {
    for (const habilidade of classe.habilidades || []) {
      const total = (habilidade.opcoes || []).length;
      if (total < minimo) continue;
      assert.ok(
        mapeados.has(`${classe.id}:${habilidade.id}`),
        `${classe.titulo}/${habilidade.titulo}: ${total} opções e nenhum rótulo no botão de recolher`,
      );
    }
  }
});

test('Especialização do Caçador publica raças de verdade do jogo como categoria de presa', () => {
  const cacador = obterClasse('cacador');

  const especializacao = cacador.habilidades?.find(item => item.id === 'especializacao');
  assert.ok(especializacao);
  assert.deepEqual(especializacao.escolha_opcoes?.niveis_vaga, [1, 5, 10]);
  assert.equal(especializacao.escolha_opcoes?.permanente, true);
  assert.equal(vagasEscolhaHabilidade(especializacao, 1), 1);
  assert.equal(vagasEscolhaHabilidade(especializacao, 4), 1);
  assert.equal(vagasEscolhaHabilidade(especializacao, 5), 2);
  assert.equal(vagasEscolhaHabilidade(especializacao, 10), 3);
  assert.equal(vagasEscolhaHabilidade(especializacao, 20), 3);

  // Cruza contra o catálogo real de raças: toda raça jogável ou esquecida
  // (menos a personalizada e a que o próprio jogo marca como indisponível)
  // precisa aparecer como opção, e nenhuma opção pode inventar uma raça
  // que o catálogo não tem.
  const racas = JSON.parse(
    readFileSync(new URL('../../data/ficha/racas.json', import.meta.url), 'utf8'),
  ) as Array<{ id: string; titulo: string; indisponivel?: boolean }>;
  const esperadas = racas.filter(raca => raca.id !== 'raca-personalizada' && !raca.indisponivel).map(raca => raca.id);
  assert.deepEqual([...(especializacao.opcoes || [])].map(item => item.id).sort(), [...esperadas].sort());
  assert.ok(especializacao.opcoes!.length >= 20, 'Especialização precisa cobrir a maioria das raças do jogo');

  for (const opcao of especializacao.opcoes || []) {
    assert.ok(opcao.descricao?.length, `${opcao.titulo}: sem nota de caçador`);
  }

  const n15 = especializacao.estagios?.find(item => item.nivel === 15);
  assert.match(n15?.descricao || '', /DT do Caçador/);
});

test('Agência dos Caçadores escala por nível como o Batalhão do Guerreiro, e a DT do Caçador sai de Sobrevivência', () => {
  const cacador = obterClasse('cacador');
  const agencia = cacador.habilidades?.find(item => item.id === 'agencia-dos-cacadores');
  assert.ok(agencia);
  assert.ok((agencia.opcoes || []).length >= 10, 'Catálogo de Benefícios da Guilda ficou pequeno demais');
  assert.equal(new Set(agencia.opcoes?.map(item => item.id)).size, agencia.opcoes?.length, 'Benefício da Guilda repetido');
  assert.equal(agencia.escolha_opcoes?.por_estagio, 1);
  assert.equal(vagasEscolhaHabilidade(agencia, 20), 4);
  assert.ok((agencia.opcoes || []).length > 4, 'A lista de benefícios precisa ser maior que as vagas');

  assert.ok(agencia.escalonamento, 'Agência dos Caçadores sem escada de nível');
  assert.deepEqual(
    agencia.escalonamento.marcos.map(marco => [marco.nivel, marco.nivel_classe]),
    [[1, 3], [2, 8], [3, 14], [4, 20]],
  );
  assert.equal(tetoEscalonamento(agencia), 4);
  assert.equal(nivelEscalonamento(agencia, 3), 1);
  assert.equal(nivelEscalonamento(agencia, 13), 2);
  assert.equal(nivelEscalonamento(agencia, 20), 4);

  for (const opcao of agencia.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
    // Cada benefício precisa dizer o que ganha nos três degraus seguintes,
    // senão a escada só existe no campo e não no texto que o jogador lê.
    const niveis = [...(opcao.escalonamento || '').matchAll(/Nível ([2-4]):/g)].map(item => Number(item[1]));
    assert.deepEqual(niveis, [2, 3, 4], `${opcao.titulo}: progressão incompleta pelos níveis 2 a 4`);
  }

  assert.equal(cacador.dt_efeitos?.pericia, 'sobrevivencia');
});

test('a Armadilha do Caçador usa a condição Imobilizado, não "Imóvel", e o Companheiro tem ficha de combate', () => {
  const cacador = obterClasse('cacador');
  const textoCompleto = JSON.stringify(cacador);
  assert.doesNotMatch(textoCompleto, /Imóvel/, 'Caçador ainda cita a condição inexistente "Imóvel"');

  const armadilha = cacador.poderes?.find(item => item.id === 'armadilha');
  assert.match(armadilha?.descricao || '', /Imobilizada/);
  assert.match(armadilha?.descricao || '', /DT do Caçador/);

  const companheiro = cacador.poderes?.find(item => item.id === 'companheiro');
  assert.match(companheiro?.descricao || '', /Defesa igual à sua/);
  assert.match(companheiro?.descricao || '', /5 vezes o seu nível de Caçador/);
});

test('Canalização Nativa publica os dez Fluxos naturais como escolha permanente, sem a Tecnologia', () => {
  const canalizador = obterClasse('canalizador');

  const nativa = canalizador.habilidades?.find(item => item.id === 'canalizacao-nativa');
  assert.ok(nativa);
  assert.equal(nativa.escolha_opcoes?.total, 1);
  assert.equal(nativa.escolha_opcoes?.permanente, true);
  assert.equal(vagasEscolhaHabilidade(nativa, 1), 1, 'O Fluxo Nativo precisa abrir já no nível 1');

  // Cruza contra os Fluxos publicados no capítulo de Magia: os dez naturais
  // entram, a Tecnologia fica de fora porque o livro diz que ela nunca é
  // nativa, só se instala de fora.
  const magias = JSON.parse(
    readFileSync(new URL('../../data/ficha/magias.json', import.meta.url), 'utf8'),
  ) as { fluxos: Array<{ id: string; titulo: string }> };
  const naturais = magias.fluxos.filter(fluxo => fluxo.id !== 'tecnologia').map(fluxo => fluxo.id);
  assert.deepEqual([...(nativa.opcoes || [])].map(item => item.id).sort(), [...naturais].sort());
  assert.equal(nativa.opcoes?.some(item => item.id === 'tecnologia'), false, 'Tecnologia não é um Fluxo nativo');

  // O Fluxo do Fim é raro no livro e exige autorização do Mestre antes de
  // ser escolhido - a classe precisa repetir esse aviso, não só listar.
  const fim = nativa.opcoes?.find(item => item.id === 'fim');
  assert.match(fim?.descricao || '', /autorização do Mestre/);

  assert.equal(canalizador.dt_efeitos?.pericia, 'misticismo');
});

test('Forma do Fluxo do Canalizador publica as quatro formas com ficha completa, e o nível 18 não repete Voz da Deidade', () => {
  const canalizador = obterClasse('canalizador');

  const forma = canalizador.habilidades?.find(item => item.id === 'forma-do-fluxo');
  assert.ok(forma);
  assert.equal((forma.opcoes || []).length, 4);
  assert.equal(vagasEscolhaHabilidade(forma, 20), 4);
  for (const opcao of forma.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }

  // "Voz da Deidade" só existe como habilidade_final no nível 20; o nível 18
  // citava ela de novo por engano, sem a classe ter essa habilidade nesse
  // nível. Virou "Fluxo Sem Filtro", que é uma habilidade de verdade.
  const n18 = canalizador.progressao?.find(item => item.nivel === 18);
  assert.ok(n18?.recompensas.some(item => item.tipo === 'habilidade' && item.titulo === 'Fluxo Sem Filtro'));
  assert.equal(n18?.recompensas.some(item => item.titulo === 'Voz da Deidade' && item.tipo === 'habilidade'), false);

  const semFiltro = canalizador.habilidades?.find(item => item.id === 'fluxo-sem-filtro');
  assert.ok(semFiltro);
  assert.deepEqual(semFiltro.niveis, [18]);
  assert.equal(semFiltro.usos, 'Uma vez por combate');

  const vozDaDeidade = canalizador.habilidades?.filter(item => item.titulo === 'Voz da Deidade');
  assert.equal(vozDaDeidade?.length, 1, 'Voz da Deidade não pode existir em duas habilidades');
  assert.deepEqual(vozDaDeidade?.[0]?.niveis, [20]);
});

test('Fusão Controlada do Sintonizador publica as onze fusões oficiais, uma por Fluxo, com Tecnologia incluída', () => {
  const sintonizador = obterClasse('sintonizador');

  const fusao = sintonizador.habilidades?.find(item => item.id === 'fusao-controlada');
  assert.ok(fusao);
  assert.equal(fusao.escolha_opcoes?.por_estagio, 1);
  assert.equal(fusao.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(fusao, 20), 4);

  // As fusões já são catálogo oficial do capítulo de Magia (uma por Fluxo,
  // incluindo Tecnologia - diferente do Fluxo Nativo do Canalizador, que
  // exclui Tecnologia porque ela nunca é nativa).
  const magias = JSON.parse(
    readFileSync(new URL('../../data/ficha/magias.json', import.meta.url), 'utf8'),
  ) as { fusoes: Array<{ id: string; titulo: string; fluxo_secundario: string }> };
  assert.deepEqual(
    [...(fusao.opcoes || [])].map(item => item.id).sort(),
    magias.fusoes.map(item => item.id).sort(),
  );
  assert.equal(fusao.opcoes?.some(item => item.id === 'programacao'), true, 'Programação (fusão com Tecnologia) precisa estar disponível');
  assert.equal(fusao.opcoes?.length, 11);

  assert.equal(sintonizador.dt_efeitos?.pericia, 'misticismo');
});

test('Religação de Emergência chega no nível 18 do Sintonizador, e Convergência Segura não se repete', () => {
  const sintonizador = obterClasse('sintonizador');

  // "Convergência Segura" só existe como habilidade final no nível 20; o
  // nível 18 citava ela de novo por engano, sem a classe ter essa habilidade
  // nesse nível (mesmo bug que o Canalizador tinha com Voz da Deidade).
  const n18 = sintonizador.progressao?.find(item => item.nivel === 18);
  assert.ok(n18?.recompensas.some(item => item.tipo === 'habilidade' && item.titulo === 'Religação de Emergência'));
  assert.equal(n18?.recompensas.some(item => item.titulo === 'Convergência Segura' && item.tipo === 'habilidade'), false);

  const religacao = sintonizador.habilidades?.find(item => item.id === 'religacao-de-emergencia');
  assert.ok(religacao);
  assert.deepEqual(religacao.niveis, [18]);
  assert.equal(religacao.acao, 'Reação');
  assert.equal(religacao.usos, 'Uma vez por combate');

  const convergencia = sintonizador.habilidades?.filter(item => item.titulo === 'Convergência Segura');
  assert.equal(convergencia?.length, 1, 'Convergência Segura não pode existir em duas habilidades');
  assert.deepEqual(convergencia?.[0]?.niveis, [20]);
});

// A Vida/Mana das classes comuns usava só três proporções fixas (Marcial
// 5/2, Misto 4/3, Conjurador 3/4), então classes bem diferentes entre si
// (Guerreiro e Guardião, ou Chef e Ninja) tinham o número idêntico. Virou
// cinco graus, ainda somando 7 por nível (nenhuma classe fica mais forte no
// papel), redistribuídos por conceito: quem não usa arma nem armadura vai
// pro extremo marcial, quem realmente conjura magia (Fluxo com progressão
// própria) ou compromete Mana adiantado num ritual vai pro extremo
// conjurador, e as classes "de preparo" (poção, comércio, culinária) saem do
// bloco de combatentes ativos e se juntam às conjuradoras.
test('classes comuns usam cinco graus de Vida/Mana dentro do mesmo orçamento de 7, não só três', () => {
  const esperado: Record<string, [number, number]> = {
    lutador: [6, 1],
    guerreiro: [5, 2],
    espadachim: [5, 2],
    guardiao: [5, 2],
    piloto: [4, 3],
    ninja: [4, 3],
    atirador: [4, 3],
    cacador: [4, 3],
    detetive: [4, 3],
    'pop-star': [3, 4],
    medico: [3, 4],
    engenheiro: [3, 4],
    alquimista: [3, 4],
    comerciante: [3, 4],
    cozinheiro: [3, 4],
    ritualista: [2, 5],
    canalizador: [2, 5],
    sintonizador: [2, 5],
  };

  const comuns = classes.filter(classe => classe.categoria === 'padrao');
  assert.equal(comuns.length, Object.keys(esperado).length);

  for (const classe of comuns) {
    const par = esperado[classe.id];
    assert.ok(par, `${classe.titulo}: classe comum sem grau esperado no teste`);
    assert.deepEqual([classe.vida, classe.mana], par, `${classe.titulo}: Vida/Mana fora do grau esperado`);
    assert.equal(classe.vida + classe.mana, 7, `${classe.titulo}: orçamento fora de 7`);
  }

  // Cinco graus de verdade em uso, não só três.
  const grausEmUso = new Set(comuns.map(classe => `${classe.vida}/${classe.mana}`));
  assert.equal(grausEmUso.size, 5, `Graus distintos em uso: ${[...grausEmUso].sort().join(', ')}`);
});

test('Campeão Dimensional publica Além do Comum como catálogo e a DT sai de Intimidação com Força', () => {
  const campeao = obterClasse('campeao-dimensional');
  assert.equal(campeao.titulo, 'Campeão Dimensional');
  assert.equal(campeao.dt_efeitos?.pericia, 'intimidacao');
  assert.match(campeao.dt_efeitos?.descricao || '', /Força no lugar de Carisma/);

  const alemDoComum = campeao.habilidades?.find(item => item.id === 'alem-do-comum');
  assert.ok(alemDoComum);
  assert.equal(alemDoComum.escolha_opcoes?.por_estagio, 1);
  assert.equal(alemDoComum.escolha_opcoes?.repetivel, true);
  assert.equal(alemDoComum.escolha_opcoes?.permanente, true);
  assert.equal(vagasEscolhaHabilidade(alemDoComum, 20), 4);
  assert.deepEqual(
    [...(alemDoComum.opcoes || [])].map(item => item.titulo).sort(),
    ['Constituição', 'Destreza', 'Força'],
  );
});

test('Pisada, Avanço, Pulso e Punho do Campeão Dimensional apontam pra própria DT, e Marcha/Número 1 não disparam o alerta de "dobra"', () => {
  const campeao = obterClasse('campeao-dimensional');

  for (const id of ['pisada', 'avanco', 'pulso', 'punho']) {
    const poder = campeao.poderes?.find(item => item.id === id);
    assert.ok(poder, `poder ausente: ${id}`);
    assert.match(poder.descricao, /DT do Campeão Dimensional/, `${poder.titulo}: sem referência à própria DT`);
  }

  const marcha = campeao.poderes?.find(item => item.id === 'marcha');
  assert.ok(marcha);
  assert.doesNotMatch(marcha.descricao, /\bdobra\b/i, 'Marcha ainda usa "dobra" em vez de um bônus fixo de Movimento');
  assert.match(marcha.descricao, /aumenta em 9 m/);

  const numero1 = campeao.habilidades?.find(item => item.id === 'numero-1');
  const n15 = numero1?.estagios?.find(item => item.nivel === 15);
  assert.ok(n15);
  assert.doesNotMatch(n15.descricao, /\bdobra\b/i, 'Número 1 N15 ainda usa "dobra" em vez de deixar o bônus fixo');

  const punho = campeao.poderes?.find(item => item.id === 'punho');
  assert.match(punho?.descricao || '', /Fratura \(−2 em testes físicos até tratamento e descanso completo\)/);
});

test('Cartista Arcano publica os quatro Naipes Arcanos como catálogo e a DT sai de Misticismo', () => {
  const cartista = obterClasse('cartista-arcano');
  assert.equal(cartista.dt_efeitos?.pericia, 'misticismo');

  const cartasAfiadas = cartista.habilidades?.find(item => item.id === 'cartas-afiadas');
  assert.ok(cartasAfiadas);
  assert.equal(cartasAfiadas.escolha_opcoes?.por_estagio, 1);
  assert.equal(cartasAfiadas.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(cartasAfiadas, 20), 4);
  assert.deepEqual(
    [...(cartasAfiadas.opcoes || [])].map(item => item.titulo).sort(),
    ['Copas', 'Espadas', 'Ouros', 'Paus'],
  );

  const aLua = cartista.poderes?.find(item => item.id === 'a-lua');
  assert.match(aLua?.descricao || '', /DT do Cartista Arcano/);
});

test('Morte do Cartista Arcano não dispara o alerta de "automaticamente"', () => {
  const cartista = obterClasse('cartista-arcano');
  const morte = cartista.poderes?.find(item => item.id === 'morte');
  assert.ok(morte);
  assert.doesNotMatch(morte.descricao, /automaticamente/i);
  assert.match(morte.descricao, /Morrendo/);
});

test('Guia Dimensional publica os quatro Tipos de Âncora como catálogo e a DT sai de Misticismo', () => {
  const guia = obterClasse('guia-dimensional');
  assert.equal(guia.dt_efeitos?.pericia, 'misticismo');
  assert.equal(guia.progressao_magia, undefined, 'Guia Dimensional não é conjurador de círculos, só usa Mana em poderes');

  const ancoras = guia.habilidades?.find(item => item.id === 'ancoras');
  assert.ok(ancoras);
  assert.equal(ancoras.escolha_opcoes?.por_estagio, 1);
  assert.equal(ancoras.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(ancoras, 20), 4);
  assert.deepEqual(
    [...(ancoras.opcoes || [])].map(item => item.titulo).sort(),
    ['Âncora Compartilhada', 'Âncora Oculta', 'Âncora de Emergência', 'Âncora de Vigia'],
  );

  const oculta = ancoras.opcoes?.find(item => item.id === 'ancora-oculta');
  assert.match(oculta?.descricao || '', /DT do Guia Dimensional/);

  const quedaLateral = guia.poderes?.find(item => item.id === 'queda-lateral');
  assert.match(quedaLateral?.descricao || '', /DT do Guia Dimensional/);
});

test('Caçador das Almas publica Zanpakutō, Shikai, as quatro artes e Bankai', () => {
  assert.equal(classes.some(classe => classe.id === 'cacador-de-entidades'), false);
  const cacador = obterClasse('cacador-das-almas');
  assert.equal(cacador.titulo, 'Caçador das Almas');
  assert.equal(cacador.dt_efeitos?.pericia, 'misticismo');

  // O nome antigo não volta: a classe caça e purifica almas, não uma raça jogável.
  const textoClasse = JSON.stringify(cacador);
  assert.doesNotMatch(textoClasse, /entidade/i);

  const zanpakuto = cacador.habilidades?.find(item => item.id === 'zanpakuto');
  assert.ok(zanpakuto);
  assert.deepEqual(zanpakuto.estagios?.map(item => item.titulo), [
    'Asauchi',
    'Nome da Lâmina',
    'Shikai',
    'Shikai Dominado',
    'Forma Verdadeira',
  ]);
  assert.deepEqual(zanpakuto.escolha_opcoes?.niveis_vaga, [10]);
  assert.equal(zanpakuto.escolha_opcoes?.permanente, true);
  assert.equal(vagasEscolhaHabilidade(zanpakuto, 9), 0);
  assert.equal(vagasEscolhaHabilidade(zanpakuto, 10), 1);
  assert.equal(zanpakuto.opcoes?.length, 22);
  for (const aspecto of zanpakuto.opcoes || []) {
    assert.match(aspecto.descricao, /Shikai:/);
    assert.match(aspecto.escalonamento || '', /Bankai:/);
  }

  const treinamento = cacador.habilidades?.find(item => item.id === 'treinamento-de-ceifeiro');
  assert.ok(treinamento);
  assert.equal(treinamento.escolha_opcoes?.por_estagio, 1);
  assert.equal(vagasEscolhaHabilidade(treinamento, 20), 4);
  assert.deepEqual(
    [...(treinamento.opcoes || [])].map(item => item.titulo).sort(),
    ['Hakuda', 'Hohō', 'Kidō', 'Zanjutsu'],
  );

  const final = cacador.progressao?.find(item => item.nivel === 20)
    ?.recompensas.find(item => item.tipo === 'habilidade_final');
  assert.equal(final?.titulo, 'Bankai');
  const bankai = cacador.habilidades?.find(item => item.id === 'bankai');
  assert.match(bankai?.descricao || '', /uma vez por sessão/i);
  assert.match(bankai?.descricao || '', /Shikai/);

  for (const id of ['passo-relampago', 'pressao-espiritual', 'hado-raio-branco', 'bakudo-seis-luzes']) {
    assert.ok(cacador.poderes?.some(item => item.id === id), `Referência espiritual ausente: ${id}`);
  }
});

test('Escritor de Contos publica os quatro Arquétipos de Contato como catálogo e a DT sai de Enganação', () => {
  const escritor = obterClasse('escritor-de-contos');
  assert.equal(escritor.dt_efeitos?.pericia, 'enganacao');

  const personagens = escritor.habilidades?.find(item => item.id === 'personagens-recorrentes');
  assert.ok(personagens);
  assert.equal(personagens.escolha_opcoes?.permanente, true);
  assert.equal(personagens.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(personagens, 20), 4);
  assert.deepEqual(
    [...(personagens.opcoes || [])].map(item => item.titulo).sort(),
    ['Contrabandista', 'Curandeiro', 'Guarda-Costas', 'Informante'],
  );

  const cliffhanger = escritor.poderes?.find(item => item.id === 'cliffhanger');
  assert.match(cliffhanger?.descricao || '', /Imobilizado/);
  assert.doesNotMatch(cliffhanger?.descricao || '', /\bImóvel\b/);
});

test('Último Capítulo do Escritor de Contos ganha o gancho de criar uma Entidade nova, sem depender de arbitragem aberta', () => {
  const escritor = obterClasse('escritor-de-contos');
  const ultimoCapitulo = escritor.habilidades?.find(item => item.id === 'ultimo-capitulo');
  assert.ok(ultimoCapitulo);
  assert.match(ultimoCapitulo.descricao, /Entidade nova/);
  assert.match(ultimoCapitulo.descricao, /uma vez por sessão/i);
  assert.doesNotMatch(
    ultimoCapitulo.descricao,
    /a critério do mestre|aprovação do mestre|definid[ao] pelo mestre|o mestre arbitra/i,
  );
});

test('Formas Vinculadas do Invocador publica quatro funções reais como catálogo e a DT sai de Misticismo', () => {
  const invocador = obterClasse('invocador');
  assert.equal(invocador.dt_efeitos?.pericia, 'misticismo');
  assert.equal(invocador.progressao_magia, undefined, 'Invocador não é conjurador de círculos, só usa Mana em poderes e nas invocações');

  const formas = invocador.habilidades?.find(item => item.id === 'formas-vinculadas');
  assert.ok(formas);
  assert.equal(formas.escolha_opcoes?.por_estagio, 1);
  assert.equal(formas.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(formas, 20), 4);
  assert.deepEqual(
    [...(formas.opcoes || [])].map(item => item.titulo).sort(),
    ['Broto Curador', 'Espírito', 'Fera', 'Guardião', 'Núcleo Firme', 'Sombra'],
  );

  // O nível 1 do Pacto precisa mandar pro Catálogo (ficha pronta), não mais descrever uma
  // fórmula de Vida/Defesa solta.
  const pacto = invocador.habilidades?.find(item => item.id === 'pacto-de-genese');
  const n1 = pacto?.estagios?.find(item => item.nivel === 1);
  assert.match(n1?.descricao || '', /Catálogo de Invocações/);
  assert.match(n1?.descricao || '', /ficha pronta/);
  assert.equal(n1?.titulo, 'Primeiro Vínculo');
});

test('Pacto de Fluxo Nativo do Invocador cresce de duas em duas invocações, sem catálogo de escolha próprio', () => {
  const invocador = obterClasse('invocador');
  const pacto = invocador.habilidades?.find(item => item.id === 'pacto-de-genese');
  assert.ok(pacto);
  // A escolha de crescer (duas invocações novas) ou fortalecer (duas que já tem) agora mora só na
  // prosa dos estágios - não é mais um catálogo estruturado (escolha_opcoes/opcoes) próprio, porque
  // as opções em si (quais criaturas) já vêm do Catálogo de Invocações da classe.
  assert.equal(pacto.escolha_opcoes, undefined);
  assert.equal(pacto.opcoes, undefined);
  assert.equal(pacto.estagios?.length, 5);

  const n1 = pacto.estagios?.find(item => item.nivel === 1);
  assert.match(n1?.descricao || '', /duas criaturas/, 'Nível 1 precisa vincular duas invocações, não uma');

  for (const nivel of [5, 10, 15, 20]) {
    const estagio = pacto.estagios?.find(item => item.nivel === nivel);
    assert.match(estagio?.descricao || '', /duas invocações novas/, `Nível ${nivel}: falta a opção de crescer em dupla`);
    assert.match(estagio?.descricao || '', /duas que já tem/, `Nível ${nivel}: falta a opção de fortalecer em dupla`);
  }

  // O poder "Chamado Rápido" citava trocar entre formas preparadas, mecânica que não existe mais
  // agora que as invocações coexistem em vez de alternar uma ativa por vez.
  const chamadoRapido = invocador.poderes?.find(item => item.id === 'chamado-rapido');
  assert.doesNotMatch(chamadoRapido?.descricao || '', /troque sua forma/i);

  // Convergência Primordial precisa falar de "invocações", não mais de "manifestações" - e nenhum
  // texto da classe pode sobrar com a palavra antiga.
  const convergencia = invocador.habilidades?.find(item => item.id === 'convergencia-primordial');
  assert.match(convergencia?.descricao || '', /suas invocações/);
  assert.doesNotMatch(JSON.stringify(invocador), /manifest/i);

  // As invocações agem com a própria Ação Padrão e Movimento, sem depender de o Invocador gastar
  // a própria Ação de Movimento - premissa antiga que tornava Convergência Primordial e "Avatar de
  // sua Deidade" sem sentido nenhum.
  assert.doesNotMatch(JSON.stringify(invocador), /gasta sua Ação de Movimento/);
  assert.equal(n1?.acao, 'Passivo');
  assert.match(n1?.descricao || '', /própria Ação Padrão e o próprio Movimento/);
});

test('Invocador publica um Catálogo de Invocações próprio (ficha pronta, sem puxar da Loja)', () => {
  const invocador = obterClasse('invocador');
  const catalogo = invocador.tarefas_bancada;
  assert.ok(catalogo, 'Invocador precisa do Catálogo de Invocações como tarefas_bancada');
  assert.equal(catalogo.itens.length, 30, 'seis linhas de criatura, cinco níveis cada');

  const linhas = new Set(catalogo.itens.map(item => item.tarefa.replace(/ (I|II|III|IV|V)$/, '')));
  assert.deepEqual(
    [...linhas].sort(),
    ['Aranha Tecelã', 'Caçador de Feras', 'Colosso de Ferro', 'Duende Prestativo', 'Salamandra de Fogo', 'Seiva Viva'],
  );

  // O Caçador de Feras é o line ofensivo dedicado: precisa bater mais forte que o Colosso de Ferro
  // (o tanque), senão os dois viram a mesma escolha com nome diferente.
  const colosso = catalogo.itens.filter(item => item.tarefa.startsWith('Colosso de Ferro'));
  const cacador = catalogo.itens.filter(item => item.tarefa.startsWith('Caçador de Feras'));
  const mediaDado = (expressao: string) => {
    const [, quantidade, lados] = expressao.match(/(\d+)d(\d+)/) || [];
    return Number(quantidade) * (Number(lados) + 1) / 2;
  };
  for (let indice = 0; indice < 5; indice += 1) {
    const danoColosso = mediaDado(colosso[indice].nota.match(/Golpe (\d+d\d+)/)?.[1] || '');
    const danoCacador = mediaDado(cacador[indice].nota.match(/Garras (\d+d\d+)/)?.[1] || '');
    assert.ok(
      danoCacador > danoColosso,
      `Nível ${colosso[indice].dt}: Caçador de Feras (${danoCacador}) precisa bater mais forte que Colosso de Ferro (${danoColosso})`,
    );
  }

  const niveisPorLinha: Record<string, string[]> = {};
  for (const item of catalogo.itens) {
    const linha = item.tarefa.replace(/ (I|II|III|IV|V)$/, '');
    (niveisPorLinha[linha] ||= []).push(item.dt);
  }
  for (const linha of linhas) {
    assert.deepEqual(niveisPorLinha[linha], ['Nível 1', 'Nível 5', 'Nível 10', 'Nível 15', 'Nível 20']);
  }

  // Toda entrada precisa de Vida, Defesa, Movimento e um ataque na "ficha" - não pode ser só flavor.
  for (const item of catalogo.itens) {
    assert.match(item.nota, /Vida \d+/, `${item.tarefa}: sem Vida`);
    assert.match(item.nota, /Defesa \d+/, `${item.tarefa}: sem Defesa`);
    assert.match(item.nota, /Movimento/, `${item.tarefa}: sem Movimento`);
  }
});

test('Avatar de sua Deidade do Invocador não fica preso à Aethel: classe é aberta a qualquer Árvore', () => {
  const invocador = obterClasse('invocador');
  const avatar = invocador.poderes?.find(item => item.titulo === 'Avatar de sua Deidade');
  assert.ok(avatar);
  assert.notEqual(avatar.id, 'avatar-de-aethel', 'o id ainda referencia uma Árvore específica, mas a classe vale pra qualquer uma');
});

test('Formas Vinculadas do Invocador escala por nível como o Batalhão do Guerreiro', () => {
  const invocador = obterClasse('invocador');
  const formas = invocador.habilidades?.find(item => item.id === 'formas-vinculadas');
  assert.ok(formas);
  assert.ok(formas.escalonamento, 'Formas Vinculadas sem escada de nível');
  assert.deepEqual(
    formas.escalonamento.marcos.map(marco => [marco.nivel, marco.nivel_classe]),
    [[1, 3], [2, 8], [3, 14], [4, 20]],
  );

  for (const opcao of formas.opcoes || []) {
    const niveis = [...(opcao.escalonamento || '').matchAll(/Nível ([2-4]):/g)].map(item => Number(item[1]));
    assert.deepEqual(niveis, [2, 3, 4], `${opcao.titulo}: progressão incompleta pelos níveis 2 a 4`);
  }
});

test('Viajante publica Lições da Estrada como catálogo e a DT sai de Sobrevivência', () => {
  const viajante = obterClasse('viajante-classe');
  assert.equal(viajante.dt_efeitos?.pericia, 'sobrevivencia');
  assert.equal(viajante.progressao_magia, undefined, 'Viajante não conjura, só usa Mana em poderes');

  const licoes = viajante.habilidades?.find(item => item.id === 'licoes-da-estrada');
  assert.ok(licoes);
  assert.equal((licoes.opcoes || []).length, 8, 'Catálogo de Lições da Estrada incompleto');
  assert.equal(new Set(licoes.opcoes?.map(item => item.id)).size, licoes.opcoes?.length, 'Lição repetida');
  assert.equal(licoes.escolha_opcoes?.por_estagio, 1);
  assert.equal(licoes.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(licoes, 20), 4, 'quatro lições entre os níveis 3 e 20');

  for (const opcao of licoes.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }

  // As perícias das lições precisam existir no catálogo fixo - nada de "Comércio"/"Persuasão"
  // inventados, o mesmo erro que já apareceu em outras classes revisadas.
  const textoCompleto = JSON.stringify(viajante);
  for (const nome of ['Comércio', 'Persuasão']) {
    assert.doesNotMatch(textoCompleto, new RegExp(nome), `Viajante cita "${nome}", que não existe no catálogo de perícias`);
  }
});

test('Sem Fronteiras do Viajante cobra Ação de Movimento pra teleportar, e Horizonte Aberto não cita a condição inexistente "Perdido"', () => {
  const viajante = obterClasse('viajante-classe');
  const semFronteiras = viajante.habilidades?.find(item => item.id === 'sem-fronteiras');
  assert.ok(semFronteiras);
  assert.match(semFronteiras.descricao || '', /uma vez por sessão/i);
  assert.match(semFronteiras.descricao || '', /gastar a própria Ação de Movimento/, 'teleporte precisa custar uma ação, não ser de graça');
  assert.doesNotMatch(semFronteiras.descricao || '', /sem gastar ação/i);

  const horizonteAberto = viajante.poderes?.find(item => item.id === 'horizonte-aberto');
  assert.ok(horizonteAberto);
  assert.doesNotMatch(horizonteAberto.descricao || '', /\bPerdidos?\b/, '"Perdido" não é condição oficial do livro');

  // O poder "Mochila Impossível" e "Dormir em Qualquer Lugar" citavam "Passivo." dentro do texto,
  // marcação redundante com o campo `acao` que já existe - mesmo bug que o Ninja teve. Os dois
  // custam 0 de Mana, então "Passivo" é coerente com o campo `acao`.
  for (const id of ['mochila-impossivel', 'dormir-em-qualquer-lugar']) {
    const poder = viajante.poderes?.find(item => item.id === id);
    assert.equal(poder?.custo_mana, 0);
    assert.equal(poder?.acao, 'Passivo');
    assert.doesNotMatch(poder?.descricao || '', /^Passivo\./i);
  }

  // "Carona" custa 4 de Mana pra ativar - não pode ser "Passivo" (isso é oq
  // efeito de custo zero e sempre ligado tem). Marcá-lo como Passivo escondia
  // que era preciso gastar Mana pra ligar o efeito em cada viagem.
  const carona = viajante.poderes?.find(item => item.id === 'carona');
  assert.ok(carona?.custo_mana && carona.custo_mana > 0, 'Carona precisa custar Mana pra valer a pena existir como poder');
  assert.notEqual(carona?.acao, 'Passivo', 'poder com custo de Mana não pode ser Passivo');
});

test('Interceptador publica Hackear Fluxo como catálogo e distingue a DT do Interceptador da DT de conjuração', () => {
  const interceptador = obterClasse('interceptador');
  assert.equal(interceptador.dt_efeitos?.pericia, 'misticismo');
  assert.equal(interceptador.progressao_magia, undefined, 'Interceptador não conjura, só atrapalha quem conjura');
  assert.match(interceptador.dt_efeitos?.descricao || '', /DT de conjuração/, 'precisa distinguir a DT do Interceptador da DT de conjuração da magia interceptada');

  const hackear = interceptador.habilidades?.find(item => item.id === 'hackear-fluxo');
  assert.ok(hackear);
  assert.equal((hackear.opcoes || []).length, 6, 'Catálogo de técnicas de Hackear Fluxo incompleto');
  assert.equal(new Set(hackear.opcoes?.map(item => item.id)).size, hackear.opcoes?.length, 'Técnica repetida');
  assert.equal(hackear.escolha_opcoes?.por_estagio, 1);
  assert.equal(hackear.escolha_opcoes?.repetivel, false);
  assert.equal(vagasEscolhaHabilidade(hackear, 20), 4, 'quatro técnicas entre os níveis 3 e 20');

  for (const opcao of hackear.opcoes || []) {
    assert.ok(opcao.acao, `${opcao.titulo}: sem ação declarada`);
    assert.ok(opcao.alcance, `${opcao.titulo}: sem alcance declarado`);
    assert.ok(opcao.duracao, `${opcao.titulo}: sem duração declarada`);
  }

  // Acesso Administrador precisa referenciar as técnicas de Hackear Fluxo já aprendidas, em vez de
  // listar uma segunda vez com nomes diferentes (cancelar/redirecionar/suspender, como antes).
  const capstone = interceptador.habilidades?.find(item => item.id === 'acesso-administrador');
  assert.match(capstone?.descricao || '', /técnicas? de Hackear Fluxo/i);
  assert.match(capstone?.descricao || '', /uma vez por sessão/i);
});

test('poderes do Interceptador não têm "Passivo." embutido no texto e Cortar Concentração aponta pra DT do Interceptador', () => {
  const interceptador = obterClasse('interceptador');
  const registroForense = interceptador.poderes?.find(item => item.id === 'registro-forense');
  assert.equal(registroForense?.acao, 'Passivo');
  assert.doesNotMatch(registroForense?.descricao || '', /^Passivo\./i);

  const cortarConcentracao = interceptador.poderes?.find(item => item.id === 'cortar-concentracao');
  assert.match(cortarConcentracao?.descricao || '', /DT do Interceptador/);

  for (const poder of interceptador.poderes || []) {
    assert.ok(poder.acao, `${poder.titulo}: sem ação declarada`);
  }
});
