import assert from 'node:assert/strict';
import test from 'node:test';

import { detalharEfeitosAutomaticos, resumirEquipamentos } from '../../src/services/equipamentoService.ts';
import { habilidadeDoFruto, obterFrutoEdenConsumido, poderesDoFruto } from '../../src/services/frutoEdenService.ts';
import {
  grupoLimiteItemEspecial,
  limiteItensEspeciaisPorNivel,
  resumirLimiteItensEspeciais,
} from '../../src/services/itensEspeciaisService.ts';

const efeito = (id: string, categoria: string, alvo: string, valor: number, modo = 'bonus') => ({
  id,
  categoria,
  alvo,
  valor,
  modo,
});

test('efeitos de modificações e raridade só funcionam com o item equipado', () => {
  const item = (equipado: boolean) => ({
    item_id: 'item-1',
    titulo: 'Armadura da Aurora',
    quantidade: 1,
    dados: {
      categoria: 'armadura',
      equipado,
      raridade: 'raro',
      defesa: 2,
      espacos: 1,
      modificacoes: [{
        id: 'mod-1',
        nome: 'Núcleo vital',
        efeito: 'Fortalece o portador.',
        tipo: 'especial',
        efeitos: [efeito('e-1', 'recurso', 'vidaMaxima', 2)],
      }, {
        id: 'mod-2', nome: 'Placas reforçadas', efeito: '', tipo: 'comum',
        efeitos: [efeito('e-2', 'pericia', 'fortitude', 2)],
      }, {
        id: 'mod-3', nome: 'Estabilizador', efeito: '', tipo: 'comum',
        efeitos: [efeito('e-3', 'pericia', 'fortitude', 1, 'vantagem')],
      }],
      efeitosRaridade: [
        efeito('e-4', 'atributo', 'constituicao', 2),
      ],
    },
  });

  const ativo = resumirEquipamentos([item(true)], { atributosFinais: { forca: 10 }, nivel: 1 });
  assert.equal(ativo.defesaEquipamento, 2);
  assert.equal(ativo.bonusRecursos.vidaMaxima, 2);
  assert.equal(ativo.bonusAtributos.constituicao, 2);
  assert.equal(ativo.bonusCombate.defesa, undefined);
  assert.equal(ativo.bonusPericias.fortitude, 2);
  assert.equal(ativo.vantagens.fortitude, 1);
  assert.equal(ativo.efeitosAtivos.length, 4);

  const inativo = resumirEquipamentos([item(false)], { atributosFinais: { forca: 10 }, nivel: 1 });
  assert.deepEqual(inativo.bonusRecursos, {});
  assert.deepEqual(inativo.bonusAtributos, {});
  assert.equal(inativo.efeitosAtivos.length, 0);
});

test('itens de perícia e artefatos compartilham uma vaga a cada quatro níveis', () => {
  assert.equal(limiteItensEspeciaisPorNivel(1), 1);
  assert.equal(limiteItensEspeciaisPorNivel(3), 1);
  assert.equal(limiteItensEspeciaisPorNivel(4), 1);
  assert.equal(limiteItensEspeciaisPorNivel(7), 1);
  assert.equal(limiteItensEspeciaisPorNivel(8), 2);
  assert.equal(limiteItensEspeciaisPorNivel(20), 5);

  assert.equal(grupoLimiteItemEspecial({ item_id: 'acessorio-refinado', dados: {} }), 'item-pericia');
  assert.equal(grupoLimiteItemEspecial({ item_id: 'qualquer', dados: { tipo: 'artefato' } }), 'artefato');
  assert.equal(grupoLimiteItemEspecial({ item_id: 'espada', dados: { categoria: 'arma' } }), null);
});

test('bônus de itens especiais excedentes ficam inativos sem remover os itens antigos', () => {
  const especiais = [
    { item_id: 'acessorio', titulo: 'Estojo de ferramentas', quantidade: 1, dados: { categoria: 'geral', grupo_limite_uso: 'item-pericia', equipado: true, efeitosRaridade: [efeito('a', 'pericia', 'oficio', 1)] } },
    { item_id: 'artefato-1', titulo: 'Pedra de eco', quantidade: 1, dados: { categoria: 'geral', tipo: 'artefato', equipado: true, efeitosRaridade: [efeito('b', 'pericia', 'oficio', 2)] } },
    { item_id: 'artefato-2', titulo: 'Olho antigo', quantidade: 1, dados: { categoria: 'geral', tipo: 'artefato', equipado: true, efeitosRaridade: [efeito('c', 'pericia', 'oficio', 4)] } },
  ];
  const ficha = { atributosFinais: { forca: 10 }, classes: [{ classeId: 'piloto', nivel: 8 }] };
  const limite = resumirLimiteItensEspeciais(especiais, ficha);
  const resumo = resumirEquipamentos(especiais, ficha);

  assert.equal(limite.limite, 2);
  assert.equal(limite.usados, 3);
  assert.equal(limite.excedentes.length, 1);
  assert.equal(limite.porGrupo['item-pericia'], 1);
  assert.equal(limite.porGrupo.artefato, 1);
  assert.equal(resumo.bonusPericias.oficio, 3);
  assert.equal(resumo.itensEspeciais.usados, 3);
  assert.equal(resumo.itensEspeciais.limite, 2);
  assert.match(resumo.conflitos[0] || '', /excedem o limite de 2/i);
});

test('mutações abissais selecionadas somam Vida e Defesa sem acumular degraus antigos', () => {
  const ficha = {
    atributosFinais: { forca: 10 },
    classes: [{ classeId: 'pirata-amaldicoado', nivel: 20 }],
    escolhasHabilidade: {
      'pirata-amaldicoado:evolucao-abissal': [
        'pele-de-tubarao',
        'coracao-de-leviata',
        'faro-de-tempestade',
        'chamado-da-alcateia',
      ],
    },
  };

  const resumo = resumirEquipamentos([], ficha);
  assert.equal(resumo.bonusRecursos.vidaMaxima, 20);
  assert.equal(resumo.bonusCombate.defesa, 2);
  assert.equal(resumo.efeitosAtivos.length, 2, 'mutações condicionais não devem criar bônus permanentes');
  assert.deepEqual(detalharEfeitosAutomaticos(resumo, 'recurso', 'vidaMaxima'), [
    { nome: 'Habilidade: Coração de Leviatã', valor: 20 },
  ]);
  assert.deepEqual(detalharEfeitosAutomaticos(resumo, 'combate', 'defesa'), [
    { nome: 'Habilidade: Pele de Tubarão', valor: 2 },
  ]);
});

test('mutações não selecionadas não alteram a ficha', () => {
  const resumo = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    classes: [{ classeId: 'pirata-amaldicoado', nivel: 20 }],
    escolhasHabilidade: {
      'pirata-amaldicoado:evolucao-abissal': ['faro-de-tempestade'],
    },
  });
  assert.equal(resumo.bonusRecursos.vidaMaxima, undefined);
  assert.equal(resumo.bonusCombate.defesa, undefined);
});

test('a ficha aplica mods e efeitos acima do que o livro sugere para a raridade', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'item-livre',
    titulo: 'Peça fora do livro',
    dados: {
      categoria: 'geral',
      equipado: true,
      raridade: 'incomum',
      modificacoes: [{
        id: 'mod-1', nome: 'Excesso', tipo: 'especial', efeitos: [
          efeito('e-1', 'recurso', 'vidaMaxima', 20),
          efeito('e-2', 'recurso', 'manaMaxima', 20),
        ],
      }, {
        id: 'mod-2', nome: 'Segundo', tipo: 'comum', efeitos: [efeito('e-3', 'combate', 'defesa', 8)],
      }, {
        id: 'mod-3', nome: 'Terceiro', tipo: 'comum', efeitos: [efeito('e-4', 'combate', 'ataque', 8)],
      }],
      efeitosRaridade: [
        efeito('e-5', 'atributo', 'forca', 9),
        efeito('e-6', 'atributo', 'destreza', 9),
      ],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.equal(resumo.bonusRecursos.vidaMaxima, 20);
  assert.equal(resumo.bonusRecursos.manaMaxima, 20);
  assert.equal(resumo.bonusCombate.defesa, 8);
  assert.equal(resumo.bonusCombate.ataque, 8);
  assert.equal(resumo.bonusAtributos.forca, 9);
  assert.equal(resumo.bonusAtributos.destreza, 9);
  assert.equal(resumo.efeitosAtivos.length, 6);
  assert.deepEqual(resumo.conflitos, []);
});

test('item comum aceita bônus próprios de raridade mesmo o livro sugerindo nenhum', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'item-comum',
    titulo: 'Faca de cozinha amaldiçoada',
    dados: {
      categoria: 'geral',
      equipado: true,
      raridade: 'comum',
      efeitosRaridade: [efeito('e-comum', 'combate', 'dano', 3)],
      modificacoes: [{
        id: 'mod-comum', nome: 'Fio impossível', tipo: 'especial',
        efeitos: [efeito('e-mod', 'atributo', 'forca', 4), efeito('e-mod-2', 'combate', 'iniciativa', 2)],
      }],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.equal(resumo.bonusCombate.dano, 3);
  assert.equal(resumo.bonusAtributos.forca, 4);
  assert.equal(resumo.bonusCombate.iniciativa, 2);
  assert.equal(resumo.efeitosAtivos.length, 3);
  assert.deepEqual(resumo.conflitos, []);
});

test('rótulo Mítico salvo na ficha resolve para a mesma regra da chave relíquia', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'item-mitico',
    titulo: 'Artefato Mítico',
    dados: {
      categoria: 'geral',
      equipado: true,
      raridade: 'Mítico',
      efeitosRaridade: [efeito('e-mitico', 'atributo', 'forca', 5)],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.equal(resumo.bonusAtributos.forca, 5);
  assert.equal(resumo.conflitos.length, 0);
});

test('efeitos inválidos não contaminam os totais da ficha', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'item-invalido',
    titulo: 'Item inválido',
    quantidade: 1,
    dados: {
      equipado: true,
      modificacoes: [{ id: 'mod', efeitos: [
        efeito('zero', 'recurso', 'vidaMaxima', 0),
        efeito('nan', 'recurso', 'manaMaxima', Number.NaN),
        efeito('desconhecido', 'outra', 'vidaMaxima', 10),
      ] }],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.deepEqual(resumo.bonusRecursos, {});
  assert.equal(resumo.efeitosAtivos.length, 0);
});

test('veículos não ocupam carga pessoal nem aplicam bônus ao personagem', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'rover',
    titulo: 'Rover Tatu',
    quantidade: 1,
    dados: {
      categoria: 'veiculo',
      equipado: true,
      espacos: 80,
      raridade: 'raro',
      efeitosRaridade: [efeito('blindagem', 'combate', 'defesa', 2)],
    },
  }], { atributosFinais: { forca: 10 }, nivel: 1 });

  assert.equal(resumo.espacosUsados, 0);
  assert.equal(resumo.sobrecarregado, false);
  assert.deepEqual(resumo.bonusCombate, {});
  assert.equal(resumo.efeitosAtivos.length, 0);
});

test('efeitos de poderes aceitam valores livres e preservam o limite de cinco efeitos', () => {
  const efeitos = Array.from({ length: 6 }, (_, indice) => (
    efeito(`poder-${indice}`, 'combate', 'iniciativa', 100)
  ));
  const resumo = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    nivel: 1,
    poderes: [{ id: 'aura', nome: 'Aura', efeitos }],
  });

  assert.equal(resumo.bonusCombate.iniciativa, 500);
  assert.equal(resumo.efeitosAtivos.length, 5);
});

test('efeitos de poderes e habilidades não cortam bônus ou penalidades acima de vinte', () => {
  const resumo = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    nivel: 1,
    poderes: [{
      id: 'vitalidade-impossivel',
      nome: 'Vitalidade Impossível',
      efeitos: [efeito('vida-livre', 'recurso', 'vidaMaxima', 2_500)],
    }],
    habilidades: [{
      id: 'fragilidade-absoluta',
      nome: 'Fragilidade Absoluta',
      efeitos: [
        efeito('defesa-livre', 'combate', 'defesa', -75),
        efeito('movimento-fracionado', 'combate', 'movimento', 1.5),
      ],
    }],
  });

  assert.equal(resumo.bonusRecursos.vidaMaxima, 2_500);
  assert.equal(resumo.bonusCombate.defesa, -75);
  assert.equal(resumo.bonusCombate.movimento, 1.5);
});

test('detalhamento automático preserva o nome de cada item, poder e habilidade', () => {
  const resumo = resumirEquipamentos([{
    item_id: 'cinto',
    titulo: 'Cinto do Colosso',
    dados: {
      equipado: true,
      raridade: 'raro',
      modificacoes: [{
        id: 'vigor',
        nome: 'Vigor armazenado',
        tipo: 'especial',
        efeitos: [efeito('vida-item', 'recurso', 'vidaMaxima', 2)],
      }],
    },
  }], {
    atributosFinais: { forca: 10 },
    nivel: 1,
    poderes: [{
      id: 'coracao',
      nome: 'Coração Infinito',
      efeitos: [
        efeito('vida-poder-1', 'recurso', 'vidaMaxima', 30),
        efeito('vida-poder-2', 'recurso', 'vidaMaxima', 20),
      ],
    }],
    habilidades: [{
      id: 'fragilidade',
      nome: 'Corpo Frágil',
      efeitos: [efeito('vida-habilidade', 'recurso', 'vidaMaxima', -5)],
    }],
  });

  assert.deepEqual(detalharEfeitosAutomaticos(resumo, 'recurso', 'vidaMaxima'), [
    { nome: 'Cinto do Colosso: Vigor armazenado', valor: 2 },
    { nome: 'Poder: Coração Infinito', valor: 50 },
    { nome: 'Habilidade: Corpo Frágil', valor: -5 },
  ]);
});

test('poderes incompletos não interrompem o cálculo da ficha', () => {
  const resumo = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    nivel: 1,
    poderes: [null, {}, { efeitos: 'inválido' }],
  });

  assert.deepEqual(resumo.bonusCombate, {});
  assert.equal(resumo.efeitosAtivos.length, 0);
});

test('Fruto do Éden só aplica efeitos depois de existir um vínculo consumido na ficha', () => {
  const comprado = resumirEquipamentos([{
    item_id: 'fruto-instante',
    titulo: 'Fruto do Instante',
    quantidade: 1,
    dados: {
      tipo: 'fruto-eden',
      efeitosFicha: [efeito('iniciativa', 'combate', 'iniciativa', 2)],
    },
  }], {});
  assert.equal(comprado.bonusCombate.iniciativa, undefined);

  const ficha = {
    frutoEdenConsumido: {
      itemId: 'fruto-instante',
      titulo: 'Fruto do Instante',
      conteudo: {
        passivo: 'Olhar entre Segundos: Iniciativa +2.',
        passivoDespertado: 'Olhar Antes do Instante: Iniciativa +4 e você não pode ficar Surpreendido.',
        tecnica: 'Repetição Breve: refaz uma rolagem.',
        tecnicaDespertada: 'Repetição Escolhida: refaz uma rolagem e escolhe o resultado.',
        despertar: 'Segundo Proibido: realiza um turno adicional.',
        custo: '4 Mana na Repetição; 14 Mana no Despertar',
        efeitosFicha: [efeito('iniciativa', 'combate', 'iniciativa', 2)],
        efeitosFichaDespertado: [efeito('iniciativa', 'combate', 'iniciativa', 4)],
        poderesDespertados: {
          'repeticao-breve': {
            nome: 'Repetição Escolhida',
            descricao: 'Refaça uma rolagem própria e escolha qual resultado usar.',
          },
        },
      },
    },
  };
  const consumido = resumirEquipamentos([], ficha);
  assert.equal(consumido.bonusCombate.iniciativa, 2);
  assert.equal(obterFrutoEdenConsumido(ficha)?.titulo, 'Fruto do Instante');
  assert.equal(habilidadeDoFruto(ficha)[0]?.titulo, 'Olhar entre Segundos');
  assert.deepEqual(poderesDoFruto(ficha).map((item) => item.nome), ['Repetição Breve']);
  assert.equal(poderesDoFruto(ficha)[0]?.custo.valor, 4);
  assert.ok(poderesDoFruto(ficha).every((item) => item.usavel === true));

  const despertada = {
    ...ficha,
    frutoEdenConsumido: { ...ficha.frutoEdenConsumido, despertado: true },
  };
  const resumoDespertado = resumirEquipamentos([], despertada);
  assert.equal(resumoDespertado.bonusCombate.iniciativa, 4);
  assert.equal(habilidadeDoFruto(despertada)[0]?.titulo, 'Olhar Antes do Instante');
  assert.deepEqual(poderesDoFruto(despertada).map((item) => item.nome), ['Repetição Escolhida', 'Segundo Proibido']);
  assert.equal(poderesDoFruto(despertada)[0]?.estagioFruto, 'aprimorado');
  assert.equal(poderesDoFruto(despertada)[1]?.custo.valor, 14);
  assert.equal(poderesDoFruto(despertada)[1]?.estagioFruto, 'despertado');
});

test('Fruto do Trovão publica separadamente suas duas técnicas com custos corretos', () => {
  const ficha = {
    frutoEdenConsumido: {
      itemId: 'fruto-trovao',
      titulo: 'Fruto do Trovão',
      conteudo: {
        tecnica: 'Salto Voltaico e Defesa Eletromagnética',
        despertar: 'Julgamento da Tempestade: tempestade em área.',
      },
    },
  };
  const poderes = poderesDoFruto(ficha);
  assert.deepEqual(poderes.map((item) => [item.nome, item.custo.valor]), [
    ['Salto Voltaico', 3],
    ['Defesa Eletromagnética', 2],
  ]);
});

test('aliados em cena aplicam bônus e vantagens locais ou compartilhados', () => {
  const efeitoPericia = efeito('e-pericia', 'pericia', 'percepcao', 2);
  const efeitoVantagem = efeito('e-vantagem', 'pericia', 'percepcao', 1, 'vantagem');
  const local = {
    id: 'aliado-local',
    nome: 'Corvo de vigília',
    emCena: true,
    efeitos: [efeitoPericia, efeitoVantagem],
  };
  const compartilhado = {
    id: 'aliado-compartilhado',
    nome: 'Guia espectral',
    emCena: true,
    efeitos: [efeito('e-defesa', 'combate', 'defesa', 1)],
  };

  const ativo = resumirEquipamentos([], { aliados: [local] }, [compartilhado]);
  assert.equal(ativo.bonusPericias.percepcao, 2);
  assert.equal(ativo.vantagens.percepcao, 1);
  assert.equal(ativo.bonusCombate.defesa, 1);
  assert.deepEqual(detalharEfeitosAutomaticos(ativo, 'pericia', 'percepcao'), [
    { nome: 'Aliado: Corvo de vigília', valor: 3 },
  ]);

  const inativo = resumirEquipamentos([], {
    aliados: [{ ...local, emCena: false }],
  }, [{ ...compartilhado, emCena: false }]);
  assert.equal(inativo.bonusPericias.percepcao, undefined);
  assert.equal(inativo.vantagens.percepcao, undefined);
  assert.equal(inativo.bonusCombate.defesa, undefined);
});
