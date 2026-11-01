import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  AMBIENTE_PADRAO,
  apagarSemAr,
  consequenciaDoClima,
  fimDoDiaSemBeber,
  fimDoDiaSemComer,
  fomeOuSedePesando,
  gastarFolego,
  morrendoSemAr,
  normalizarAmbiente,
  racoesNoInventario,
  resumoDoClima,
} from '../../src/services/ambienteFichaService';
import {
  normalizarDevocao,
  normalizarProcuras,
  passarMesQuieto,
} from '../../src/services/reputacaoFichaService';
import {
  afinidadeAoBaixarConfianca,
  afinidadeAoSubirConfianca,
  confiancaDoVinculo,
  cumprirDivida,
  favoresDoContato,
  liberarLacos,
  normalizarVinculos,
  recusarDivida,
} from '../../src/pages/Ficha/utils/vinculos';
import { idDaSecao, rotaDaRegra } from '../../src/pages/Regras/secaoDoLivro';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';

const clima = (parcial: Partial<typeof AMBIENTE_PADRAO.clima>) => ({ ...AMBIENTE_PADRAO.clima, ...parcial });

test('ambiente: o que estiver salvo vira um ambiente utilizável', () => {
  assert.deepEqual(normalizarAmbiente(undefined), AMBIENTE_PADRAO);
  const lido = normalizarAmbiente({ clima: { grau: 'lava', tipo: 'calor' }, fome: { diasSemComer: -3, diasSemBeber: 2.7 }, folego: { semAr: 'sim' } });
  assert.equal(lido.clima.grau, null);
  assert.equal(lido.clima.tipo, 'calor');
  assert.deepEqual(lido.fome, { diasSemComer: 0, diasSemBeber: 2 });
  assert.equal(lido.folego.semAr, false);
});

test('clima: roupa, Traje e abrigo descem o grau, e a falha cobra o que a regra diz', () => {
  assert.equal(resumoDoClima(clima({ grau: 'severo', roupaCerta: true }), 80).efetivo, null);
  assert.equal(resumoDoClima(clima({ grau: 'mortal', traje: true }), 80).efetivo?.id, 'extremo');
  // Extremo: um décimo da Vida máxima (8), menos 5 da Resistência do Traje.
  assert.equal(resumoDoClima(clima({ grau: 'mortal', traje: true }), 80).dano, 3);
  assert.deepEqual(consequenciaDoClima(clima({ grau: 'severo' }), 80), { cansaco: 1, dano: 0, condicao: null });
  assert.deepEqual(consequenciaDoClima(clima({ grau: 'extremo', tipo: 'frio' }), 80, { critica: true }), { cansaco: 1, dano: 8, condicao: 'congelamento' });
  assert.deepEqual(consequenciaDoClima(clima({ grau: 'extremo', tipo: 'calor' }), 80, { critica: true }), { cansaco: 2, dano: 8, condicao: null });
  assert.deepEqual(consequenciaDoClima(clima({ grau: 'mortal' }), 80), { cansaco: 0, dano: 20, condicao: null });
  assert.deepEqual(consequenciaDoClima(clima({ grau: 'mortal', abrigo: true }), 80), { cansaco: 0, dano: 0, condicao: null });
});

test('fome e sede: folga pela Constituição antes do Cansaço, sede cobra todo dia', () => {
  let fome = AMBIENTE_PADRAO.fome;
  const cansacos: number[] = [];
  for (let dia = 0; dia < 4; dia += 1) {
    const resultado = fimDoDiaSemComer(fome, 0);
    fome = resultado.fome;
    cansacos.push(resultado.cansaco);
  }
  assert.deepEqual(cansacos, [0, 0, 0, 1], 'Mod.Con 0 aguenta 3 dias sem efeito');
  assert.equal(fomeOuSedePesando(fome, 0), true);
  assert.equal(fomeOuSedePesando({ diasSemComer: 3, diasSemBeber: 0 }, 0), false);
  assert.deepEqual(fimDoDiaSemBeber({ diasSemComer: 0, diasSemBeber: 0 }), { fome: { diasSemComer: 0, diasSemBeber: 1 }, cansaco: 1 });
  assert.equal(racoesNoInventario([{ nome: 'Ração de viagem', quantidade: 3 }, { nome: 'Tocha', quantidade: 2 }, { nome: 'RAÇÃO DE VIAGEM' }]), 4);
});

test('fôlego: Estamina paga a rodada; acabou, vem a Fortitude, e apagar leva a Morrendo', () => {
  const primeira = gastarFolego({ estaminaAtual: 30 }, 30, 'normal');
  assert.equal(primeira.status.estaminaAtual, 27);
  assert.equal(gastarFolego({ estaminaAtual: 30 }, 30, 'surpresa').status.estaminaAtual, 21);
  assert.equal(gastarFolego({ estaminaAtual: 2 }, 30, 'esforco').status.estaminaAtual, 0);
  assert.equal(gastarFolego({ estaminaAtual: 0 }, 30, 'normal').sufocando, true);

  const apagado = apagarSemAr({ vidaAtual: 18 }, 40, 12);
  assert.equal(apagado.vidaAtual, 0);
  assert.equal(apagado.morrendo, 1);
  const pior = morrendoSemAr(morrendoSemAr(apagado, 12), 12);
  assert.equal(pior.morrendo, 3);
  assert.equal(pior.morto, true, 'Morrendo 3 mata quem tem Constituição abaixo de 20');
});

test('contatos: a Confiança sai da afinidade e as Dívidas movem um degrau', () => {
  assert.deepEqual([-2, 0, 1, 2, 3, 4, 5].map(confiancaDoVinculo), [0, 0, 1, 1, 2, 2, 3]);
  assert.equal(afinidadeAoSubirConfianca(1), 3);
  assert.equal(afinidadeAoSubirConfianca(4), 5);
  assert.equal(afinidadeAoBaixarConfianca(5), 4);
  assert.equal(afinidadeAoBaixarConfianca(3), 2);
  assert.equal(afinidadeAoBaixarConfianca(2), 0);
  assert.deepEqual(favoresDoContato(2).map((favor) => favor.id), ['pequeno']);
  assert.deepEqual(favoresDoContato(5).map((favor) => favor.id), ['pequeno', 'grande', 'arriscado']);

  const [escrivao] = normalizarVinculos([{ id: 'e', nome: 'Escrivão', afinidade: 3, ramo: 'passagem', divida: 'Tirar o sobrinho da dívida', criadoEm: 1 }]);
  assert.equal(escrivao.ramo, 'passagem');
  const pago = cumprirDivida(escrivao, 50);
  assert.equal(pago.afinidade, 5);
  assert.equal(pago.divida, undefined);
  assert.equal(pago.historico.at(-1)?.motivo, 'Dívida cumprida');
  assert.equal(recusarDivida(escrivao, 50).afinidade, 2);
});

test('vínculo sem contato nem laço continua igual, e laço usado se libera na sessão seguinte', () => {
  const [antigo] = normalizarVinculos([{ id: 'a', nome: 'Mira', afinidade: 1, ramo: 'qualquer coisa', divida: 'sem ramo não vale', criadoEm: 1 }]);
  assert.equal('ramo' in antigo, false, 'ramo desconhecido não entra na ficha');
  assert.equal('divida' in antigo, false, 'Dívida só existe em contato');
  assert.equal('laco' in antigo, false);

  const lista = normalizarVinculos([{ id: 'b', nome: 'Kel', laco: 'Ele sabe meu nome verdadeiro.', lacoUsado: true }]);
  assert.equal(lista[0].lacoUsado, true);
  assert.equal(liberarLacos(lista)[0].lacoUsado, undefined);
});

test('Procura e Devoção: leitura tolerante e o mês quieto só apaga até 2', () => {
  const procuras = normalizarProcuras([{ id: 'p', lugar: 'Porto', valor: 2 }, { lugar: 'Capital', valor: 4 }, { lugar: '', valor: 1 }, 'lixo']);
  assert.deepEqual(procuras.map((procura) => procura.valor), [2, 4]);
  assert.deepEqual(passarMesQuieto(procuras).map((procura) => procura.valor), [1, 4]);
  assert.deepEqual(normalizarDevocao({ nivel: 9, pede: 'Nunca deixar um morto sem nome' }), { nivel: 3, pede: 'Nunca deixar um morto sem nome', proibe: '' });
  assert.equal(normalizarDevocao(null).nivel, 0);
});

test('o botão da ficha abre o livro na seção certa, e a seção existe no tópico', () => {
  assert.equal(idDaSecao('Fome e sede'), 'secao-fome-e-sede');
  assert.equal(idDaSecao('Fôlego'), 'secao-folego');
  assert.equal(rotaDaRegra('perigos', 'Fome e sede'), '/regras?topico=perigos&secao=secao-fome-e-sede');
  assert.equal(rotaDaRegra('descanso'), '/regras?topico=descanso');

  // Cada par (tópico, seção) que a ficha usa precisa existir no livro, senão o botão abre no topo.
  const usados: Array<[string, string]> = [
    ['perigos', 'Clima'], ['perigos', 'Fome e sede'], ['perigos', 'Fôlego'], ['perigos', 'Queda'],
    ['mundo-faccoes', 'Fama'], ['mundo-faccoes', 'Prestígio'], ['mundo-faccoes', 'Procura'],
    ['frutos-implantes', 'Devoção'], ['contatos-lacos', 'Favores'], ['contatos-lacos', 'Laços'],
  ];
  usados.forEach(([topico, secao]) => {
    assert.match(REGRAS_OFICIAIS[topico].corpo, new RegExp(`<h3 class="regras-subtitle">${secao}</h3>`), `${topico}: sem a seção ${secao}`);
  });

  // E os arquivos da ficha citam esses mesmos pares.
  const fontes = ['AmbienteSection.tsx', 'FamaPrestigioSection.tsx', 'notas/PainelVinculos.tsx']
    .map((arquivo) => readFileSync(new URL(`../../src/pages/Ficha/components/${arquivo}`, import.meta.url), 'utf8'))
    .join('\n');
  ['secao="Fome e sede"', 'secao="Procura"', 'secao="Devoção"', 'secao="Favores"', 'secao="Laços"'].forEach((trecho) => {
    assert.ok(fontes.includes(trecho), `a ficha não usa mais ${trecho}`);
  });
});
