import assert from 'node:assert/strict';
import test from 'node:test';

import magiasData from '../../data/ficha/magias.json';
import {
  ENCANTAMENTOS_CATALOGO,
  FLUXOS_CATALOGO,
  FLUXO_TEMAS,
  FUSOES_CATALOGO,
  MAGIAS_CATALOGO,
  RITUAIS_CATALOGO,
  SELOS_CATALOGO,
  circuloPermitidoPorFluxo,
  dtConjuracaoPorCirculo,
  magiaElegivelParaAprender,
  obterPerfilMagico,
  temaDoFluxo,
} from '../../src/services/magiaService.ts';

const ficha = (classeId: string, nivel: number, fluxo: number, arvoreId = 'aethel') => ({
  arvoreId,
  racaId: 'humano',
  classeId,
  classes: [{ classeId, nivel }],
  nivel,
  atributosFinais: {
    forca: 10,
    destreza: 10,
    constituicao: 10,
    inteligencia: 10,
    sabedoria: 10,
    carisma: 10,
    fluxo,
  },
  pericias: { misticismo: 'aprendiz' },
  magiasConhecidasIds: [],
});

test('Fluxo libera os dez círculos nos limiares publicados', () => {
  assert.deepEqual(
    [13, 14, 17, 18, 21, 22, 49, 50].map(circuloPermitidoPorFluxo),
    [0, 1, 1, 2, 2, 3, 9, 10],
  );
});

test('DT cresce três pontos por círculo', () => {
  assert.deepEqual(
    Array.from({ length: 10 }, (_, index) => dtConjuracaoPorCirculo(index + 1)),
    [10, 13, 16, 19, 22, 25, 28, 31, 34, 37],
  );
});

test('os onze Fluxos usam a paleta canônica de suas Árvores', () => {
  assert.deepEqual(Object.keys(FLUXO_TEMAS).sort(), FLUXOS_CATALOGO.map((fluxo) => fluxo.id).sort());
  assert.equal(temaDoFluxo('origem').base, '#d6789c');
  assert.equal(temaDoFluxo('vazio').base, '#221e28');
  assert.equal(temaDoFluxo('fim').base, '#861c30');
  assert.equal(temaDoFluxo('tecnologia').base, '#35d8ec');
  assert.notEqual(temaDoFluxo('comunicacao').base, temaDoFluxo('tecnologia').base);
});

test('Canalizador combina limite da classe e do Fluxo sem somar metade do nível', () => {
  const nivel5 = obterPerfilMagico(ficha('canalizador', 5, 18));
  assert.equal(nivel5.circuloDaFonte, 4);
  assert.equal(nivel5.circuloDoFluxo, 2);
  assert.equal(nivel5.circuloMaximo, 2);
  assert.equal(nivel5.vagasConhecidas, 4);
  assert.equal(nivel5.bonusConjuracao, 6);
  assert.equal(nivel5.dtMagia, 13);

  const nivel20 = obterPerfilMagico(ficha('canalizador', 20, 50));
  assert.equal(nivel20.circuloMaximo, 10);
  assert.equal(nivel20.dtMagia, 37);
  assert.equal(nivel20.bonusConjuracao, 22);
});

test('Ritualista não recebe círculos porque rituais ficam fora deles', () => {
  const perfil = obterPerfilMagico(ficha('ritualista', 20, 50));
  assert.equal(perfil.possuiFonte, false);
  assert.equal(perfil.circuloDaFonte, 0);
  assert.equal(perfil.circuloMaximo, 0);
});

test('item equipado altera Fluxo, Misticismo e vantagens de conjuração', () => {
  const item = {
    item_id: 'foco-magico',
    titulo: 'Foco mágico',
    quantidade: 1,
    dados: {
      equipado: true,
      raridade: 'lendario',
      modificacoes: [{
        id: 'mod-foco',
        nome: 'Sintonia',
        tipo: 'especial',
        efeito: '',
        efeitos: [{ id: 'fluxo', categoria: 'atributo', alvo: 'fluxo', modo: 'bonus', valor: 4 }],
      }, {
        id: 'mod-misticismo', nome: 'Runas', tipo: 'especial', efeito: '',
        efeitos: [{ id: 'misticismo', categoria: 'pericia', alvo: 'misticismo', modo: 'bonus', valor: 3 }],
      }, {
        id: 'mod-vantagem', nome: 'Condução perfeita', tipo: 'especial', efeito: '',
        efeitos: [{ id: 'vantagem', categoria: 'pericia', alvo: 'misticismo', modo: 'vantagem', valor: 1 }],
      }],
    },
  };
  const perfil = obterPerfilMagico(ficha('canalizador', 5, 14), [item]);
  assert.equal(perfil.fluxo, 18);
  assert.equal(perfil.circuloDoFluxo, 2);
  assert.equal(perfil.bonusConjuracao, 9);
  assert.equal(perfil.vantagensConjuracao, 1);
});

test('catálogo novo publica todas as manifestações planejadas', () => {
  assert.equal(magiasData.versao, '3.1');
  assert.equal(magiasData.regras.circulos.length, 10);
  assert.equal(FLUXOS_CATALOGO.length, 11);
  assert.equal(MAGIAS_CATALOGO.length, 330);
  assert.equal(RITUAIS_CATALOGO.length, 33);
  assert.equal(SELOS_CATALOGO.length, 33);
  assert.equal(ENCANTAMENTOS_CATALOGO.length, 33);
  assert.equal(FUSOES_CATALOGO.length, 11);
  FLUXOS_CATALOGO.forEach((fluxoCatalogo) => {
    assert.equal(MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxoCatalogo.id).length, 30);
    [RITUAIS_CATALOGO, SELOS_CATALOGO, ENCANTAMENTOS_CATALOGO].forEach((catalogo) => {
      assert.equal(catalogo.filter((item) => item.fluxo === fluxoCatalogo.id).length, 3);
    });
  });
});

test('rituais, selos e encantamentos cobrem várias faixas de poder', () => {
  const complexidades = new Set(RITUAIS_CATALOGO.map((ritual) => ritual.complexidade));
  assert.deepEqual([...complexidades].sort(), ['complexo', 'grandioso', 'monumental', 'simples']);
  assert.deepEqual([...new Set(SELOS_CATALOGO.map((selo) => selo.grau))].sort(), [1, 2, 3, 4, 5]);
  assert.deepEqual([...new Set(ENCANTAMENTOS_CATALOGO.map((item) => item.grau))].sort(), [1, 2, 3, 4, 5]);
});

test('a escala de DT, Mana e tempo é a mesma dentro de cada faixa', () => {
  const RITUAL = {
    simples: { dt: 15, tempo: '10 minutos', custo_mana: 4 },
    complexo: { dt: 20, tempo: '1 hora', custo_mana: 8 },
    grandioso: { dt: 25, tempo: '8 horas', custo_mana: 15 },
    monumental: { dt: 30, tempo: '3 dias', custo_mana: 25 },
  } as const;
  RITUAIS_CATALOGO.forEach((ritual) => {
    const escala = RITUAL[ritual.complexidade as keyof typeof RITUAL];
    assert.ok(escala, `${ritual.id} usa uma complexidade fora da escala`);
    assert.deepEqual(
      { dt: ritual.dt, tempo: ritual.tempo, custo_mana: ritual.custo_mana },
      escala,
      `${ritual.id} fora da escala de ${ritual.complexidade}`,
    );
    assert.ok(ritual.requisito && ritual.falha, `${ritual.id} sem requisito ou consequência de falha`);
  });

  const SELO = {
    1: { dt_inscricao: 10, custo_mana: 3, tempo: '10 minutos' },
    2: { dt_inscricao: 13, custo_mana: 6, tempo: '20 minutos' },
    3: { dt_inscricao: 16, custo_mana: 9, tempo: '40 minutos' },
    4: { dt_inscricao: 19, custo_mana: 12, tempo: '2 horas' },
    5: { dt_inscricao: 22, custo_mana: 15, tempo: '8 horas' },
  } as const;
  SELOS_CATALOGO.forEach((selo) => {
    assert.deepEqual(
      { dt_inscricao: selo.dt_inscricao, custo_mana: selo.custo_mana, tempo: selo.tempo },
      SELO[selo.grau as keyof typeof SELO],
      `${selo.id} fora da escala do grau ${selo.grau}`,
    );
    assert.ok(selo.ativacao, `${selo.id} sem condição de ativação`);
  });

  const ENCANTAMENTO = {
    1: { dt: 15, custo_mana: 4, tempo: '1 hora' },
    2: { dt: 20, custo_mana: 8, tempo: '8 horas' },
    3: { dt: 25, custo_mana: 15, tempo: '24 horas' },
    4: { dt: 30, custo_mana: 25, tempo: '3 dias' },
    5: { dt: 35, custo_mana: 40, tempo: '7 dias' },
  } as const;
  ENCANTAMENTOS_CATALOGO.forEach((item) => {
    assert.deepEqual(
      { dt: item.dt, custo_mana: item.custo_mana, tempo: item.tempo },
      ENCANTAMENTO[item.grau as keyof typeof ENCANTAMENTO],
      `${item.id} fora da escala do grau ${item.grau}`,
    );
    assert.ok(item.aplicacao, `${item.id} sem alvo de aplicação`);
  });

  // O teto de encantamento por raridade é 5, então nenhum grau pode passar disso.
  const capacidadeMaxima = Math.max(...Object.values(magiasData.regras.capacidade_encantamento_por_raridade));
  assert.equal(Math.max(...ENCANTAMENTOS_CATALOGO.map((item) => item.grau)), capacidadeMaxima);
});

test('todo Fluxo cobre os dez círculos com três magias cada', () => {
  FLUXOS_CATALOGO.forEach((fluxoCatalogo) => {
    for (let circulo = 1; circulo <= 10; circulo += 1) {
      const doCirculo = MAGIAS_CATALOGO.filter((magia) => magia.fluxo === fluxoCatalogo.id && magia.circulo === circulo);
      assert.equal(doCirculo.length, 3, `${fluxoCatalogo.titulo} no ${circulo}º círculo`);
    }
  });
});

test('custo de Mana e fontes acompanham o círculo publicado', () => {
  const manaPorCirculo = new Map(magiasData.regras.circulos.map((item) => [item.circulo, item.mana_base]));
  MAGIAS_CATALOGO.forEach((magia) => {
    if (typeof magia.circulo !== 'number') return;
    assert.equal(magia.custo_mana, manaPorCirculo.get(magia.circulo), `${magia.id} fora do custo do círculo`);
    // Cartomancia de Fluxo para no 2º círculo, então não aparece acima dele.
    assert.equal(
      magia.fontes_permitidas.includes('Cartomancia de Fluxo'),
      magia.circulo <= 2,
      `${magia.id} com fonte incompatível`,
    );
  });
});

test('ids e títulos das magias continuam únicos', () => {
  assert.equal(new Set(MAGIAS_CATALOGO.map((magia) => magia.id)).size, MAGIAS_CATALOGO.length);
  assert.equal(new Set(MAGIAS_CATALOGO.map((magia) => magia.titulo)).size, MAGIAS_CATALOGO.length);
});

test('toda manifestação do Fim avisa sobre a autorização do Mestre', () => {
  const doFim = [
    ...MAGIAS_CATALOGO,
    ...RITUAIS_CATALOGO,
    ...SELOS_CATALOGO,
    ...ENCANTAMENTOS_CATALOGO,
  ].filter((item) => item.fluxo === 'fim');
  assert.equal(doFim.length, 39);
  doFim.forEach((item) => {
    assert.match(item.aviso_mestre || '', /autoriza[cç][aã]o do Mestre/i, `${item.id} sem aviso`);
  });
});

test('ids e títulos não colidem entre as quatro formas de manifestação', () => {
  const tudo = [...MAGIAS_CATALOGO, ...RITUAIS_CATALOGO, ...SELOS_CATALOGO, ...ENCANTAMENTOS_CATALOGO];
  assert.equal(new Set(tudo.map((item) => item.id)).size, tudo.length);
  assert.equal(new Set(tudo.map((item) => item.titulo)).size, tudo.length);
});

test('Árvore define o Fluxo nativo usado para aprender magias', () => {
  const fichaOrigem = ficha('canalizador', 1, 14, 'aethel');
  const magiaOrigem = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'origem');
  const magiaVazio = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'vazio');
  assert.ok(magiaOrigem);
  assert.ok(magiaVazio);
  assert.equal(magiaElegivelParaAprender(fichaOrigem, magiaOrigem).permitido, true);
  assert.equal(magiaElegivelParaAprender(fichaOrigem, magiaVazio).permitido, false);
});

test('Fluxo do Fim avisa sobre autorização do Mestre sem bloquear o catálogo', () => {
  const fichaFim = ficha('canalizador', 1, 14, 'mulher-carmesim');
  const magiaFim = MAGIAS_CATALOGO.find((magia) => magia.fluxo === 'fim');
  assert.ok(magiaFim);
  const perfil = obterPerfilMagico(fichaFim);
  assert.equal(perfil.fluxoNativoId, 'fim');
  assert.match(perfil.avisoFluxo || '', /autoriza[cç][aã]o do Mestre/i);
  assert.equal(magiaElegivelParaAprender(fichaFim, magiaFim).permitido, true);
});
