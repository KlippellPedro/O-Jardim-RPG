import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resumirEquipamentos } from '../../src/services/equipamentoService';

// Revisão das classes de outubro de 2026 (docs/propostas/revisao-classes-2026-10).
const classesTexto = readFileSync(new URL('../../data/ficha/classes.json', import.meta.url), 'utf8');

test('bônus permanentes que o texto das classes promete chegam à ficha', () => {
  const devorador = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    classes: [{ classeId: 'devorador', nivel: 8 }],
    escolhasHabilidade: { 'devorador:instintos-do-devorador': ['pele-curtida', 'reflexos-de-predador'] },
  });
  assert.equal(devorador.bonusCombate.defesa, 2, 'Pele Curtida promete +2 de Defesa');
  assert.equal(devorador.bonusCombate.iniciativa, 2, 'Reflexos de Predador promete +2 de Iniciativa');

  const cacadorDasAlmas = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    classes: [{ classeId: 'cacador-das-almas', nivel: 3 }],
    escolhasHabilidade: { 'cacador-das-almas:treinamento-de-ceifeiro': ['hoho'] },
  });
  assert.equal(cacadorDasAlmas.bonusCombate.movimento, 3, 'Hohō promete +3 m de Movimento');

  // Além do Comum repete o mesmo atributo até +2.
  const campeao = resumirEquipamentos([], {
    atributosFinais: { forca: 10 },
    classes: [{ classeId: 'campeao-dimensional', nivel: 8 }],
    escolhasHabilidade: { 'campeao-dimensional:alem-do-comum': ['forca-reforcada', 'forca-reforcada'] },
  });
  assert.equal(campeao.bonusAtributos.forca, 2);
});

test('as classes usam os nomes das regras para perícia, dano, condição e Iniciativa', () => {
  const proibidos: Array<[RegExp, string]> = [
    [/exigindo Medicina|teste de Medicina|em Medicina\b/, 'Medicina não é perícia: é Cura'],
    // Resistência a frio continua valendo: é o frio do ambiente.
    [/\d+d\d+ de (dano de )?frio/, 'frio é dano de ambiente; o golpe é gelo'],
    [/dano de Energia/, 'Energia não é tipo de dano'],
    [/DT de Pop Star/, 'a DT da Pop Star chama DT de Palco'],
    [/categoria especializada|mais uma categoria|terceira categoria/, 'a Especialização do Caçador escolhe raça'],
    [/iniciativa que rolar|iniciativa recebe vantagem/i, 'a Iniciativa não se rola'],
    [/imunidade a (medo|paralisia)\b/, 'condição com o nome oficial (Amedrontado, Paralisado)'],
    [/Ação Livre ao derrubar/, 'derrubar é a manobra que deixa Caído'],
  ];
  const achados = proibidos.flatMap(([padrao, motivo]) => {
    const encontrado = padrao.exec(classesTexto);
    return encontrado ? [`${motivo}: ...${classesTexto.slice(Math.max(0, encontrado.index - 50), encontrado.index + 40)}...`] : [];
  });
  assert.deepEqual(achados, []);
});
