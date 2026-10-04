import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import legados from '../../data/ficha/legados.json';
import legadosNovos from '../../data/ficha/legados-novos.json';
import escala from '../../data/economia/escala-precos-v1.json';
import { REGRAS_OFICIAIS } from '../../data/regras/regras';
import { legadosPorNivel } from '../../src/services/progressaoNiveis';

type Requisito = { nivel_personagem?: number; atributo?: string; valor_minimo?: number; pericia?: string; nivel?: string; ou?: Requisito[] };
type Legado = { id: string; titulo: string; descricao: string; pre_requisitos?: Requisito[]; repetivel?: boolean; limite?: number };

const originais = (legados as { legados: Legado[] }).legados;
const novos = (legadosNovos as { novos: Legado[] }).novos;
const todos = [...originais, ...novos];
const altos = novos.filter((legado) => (legado.pre_requisitos ?? []).some((req) => (req.nivel_personagem ?? 0) >= 20));
const ATRIBUTOS = new Set(['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo']);
const nivelDe = (legado: Legado) => Math.max(0, ...(legado.pre_requisitos ?? []).map((req) => req.nivel_personagem ?? 0));

test('os Legados de nível alto têm id único, nível de entrada e requisitos válidos', () => {
  const ids = todos.map((legado) => legado.id);
  assert.equal(new Set(ids).size, ids.length, 'id repetido entre os catálogos de Legado');
  assert.ok(altos.length >= 70, `esperava dezenas de Legados de nível alto, achei ${altos.length}`);
  for (const legado of altos) {
    assert.match(legado.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, legado.id);
    assert.ok(legado.titulo.length >= 3 && legado.descricao.length >= 40, `${legado.id}: texto curto demais`);
    const requisitos = legado.pre_requisitos ?? [];
    assert.equal(requisitos.filter((req) => req.nivel_personagem).length, 1, `${legado.id}: precisa de exatamente um nível mínimo`);
    for (const req of requisitos) {
      if (req.atributo) {
        assert.ok(ATRIBUTOS.has(req.atributo), `${legado.id}: atributo desconhecido ${req.atributo}`);
        assert.ok(Number.isInteger(req.valor_minimo) && (req.valor_minimo as number) >= 10 && (req.valor_minimo as number) <= 60, `${legado.id}: valor mínimo fora da faixa`);
      }
    }
    if (legado.repetivel) assert.ok((legado.limite ?? 0) >= 2, `${legado.id}: repetível precisa de limite`);
  }
});

test('o texto dos Legados novos segue o tom do livro', () => {
  for (const legado of altos) {
    const texto = `${legado.titulo} ${legado.descricao}`;
    assert.doesNotMatch(texto, /[—–]/, `${legado.id}: travessão`);
    assert.doesNotMatch(texto, /\beco(s)?\b/i, `${legado.id}: a palavra "eco"`);
    assert.doesNotMatch(texto, /não é [^.;:]{1,60}, é /i, `${legado.id}: antítese "não é X, é Y"`);
  }
});

test('o catálogo tem Legado de sobra em cada patamar, sem depender de atributo', () => {
  for (const nivel of [20, 50, 60, 100, 150, 200, 300, 500]) {
    const elegiveis = todos.filter((legado) => nivelDe(legado) <= nivel);
    const vagas = legadosPorNivel(nivel);
    // Repetível conta pelo limite; o resto, uma vez só.
    const escolhas = elegiveis.reduce((soma, legado) => soma + (legado.repetivel ? Math.max(1, legado.limite ?? 2) : 1), 0);
    assert.ok(escolhas >= vagas * 2, `nível ${nivel}: ${escolhas} escolhas possíveis para ${vagas} vagas`);
  }
  // Quem não investiu em nenhum atributo ainda encontra pelo menos 3 Legados novos em cada degrau.
  for (const nivel of [20, 30, 40, 50, 60, 100, 150, 200, 250, 300, 400, 500]) {
    const livres = altos.filter((legado) => nivelDe(legado) === nivel && !(legado.pre_requisitos ?? []).some((req) => req.atributo));
    assert.ok(livres.length >= 1, `nível ${nivel}: nenhum Legado livre de requisito de atributo`);
  }
  const entradaPor = (nivel: number) => altos.filter((legado) => nivelDe(legado) === nivel).length;
  assert.ok(entradaPor(500) >= 4 && entradaPor(100) >= 8 && entradaPor(60) >= 6);
});

test('o livro cita o tamanho real do catálogo de Legados', () => {
  const texto = Object.values(REGRAS_OFICIAIS).map((pagina: any) => `${pagina.corpo ?? ''}${pagina.corpoMestre ?? ''}`).join('\n');
  assert.ok(texto.includes(`O catálogo tem ${todos.length} Legados`), `o livro precisa dizer que o catálogo tem ${todos.length} Legados`);
});

// -------------------------------------------------------------- economia acima do 50

type Faixa = { niveis: string; raridade_alvo: string; por_sessao_lunaris: number; moeda: string; por_sessao_solares?: number; por_sessao_fragmentos?: number };
const faixas = (escala as { verba_de_aventura: { faixas: Faixa[] } }).verba_de_aventura.faixas;
const emSolares = (faixa: Faixa) => faixa.por_sessao_lunaris / 100;
const inicioDe = (faixa: Faixa) => Number(faixa.niveis.replace('+', '').split('-')[0]);

test('a verba por sessão cobre todo nível, sem buraco e sem sobreposição, e só cresce', () => {
  assert.equal(inicioDe(faixas[0]), 1);
  for (let i = 1; i < faixas.length; i += 1) {
    const anterior = faixas[i - 1];
    assert.ok(!anterior.niveis.endsWith('+'), 'só a última faixa pode ser aberta');
    assert.equal(inicioDe(faixas[i]), Number(anterior.niveis.split('-')[1]) + 1, `${anterior.niveis} e ${faixas[i].niveis} deixam buraco ou se sobrepõem`);
    assert.ok(emSolares(faixas[i]) > emSolares(anterior), `${faixas[i].niveis}: a verba não pode cair`);
  }
  assert.ok(faixas[faixas.length - 1].niveis.endsWith('+'), 'a última faixa precisa valer para qualquer nível acima');
  for (const faixa of faixas) {
    if (faixa.moeda === 'Fragmentos de Estrela') assert.equal(faixa.por_sessao_lunaris, (faixa.por_sessao_fragmentos as number) * 5000, faixa.niveis);
    if (faixa.moeda === 'Solares') assert.equal(faixa.por_sessao_lunaris, (faixa.por_sessao_solares as number) * 100, faixa.niveis);
  }
});

test('quatro sessões da verba de nível alto pagam uma peça da raridade da faixa', () => {
  const banda = Object.fromEntries((escala.escada_raridade.faixas as Array<{ raridade: string; banda_fragmentos?: number[] }>).map((faixa) => [faixa.raridade, faixa.banda_fragmentos]));
  for (const faixa of faixas.filter((item) => item.moeda === 'Fragmentos de Estrela')) {
    const quatro = (faixa.por_sessao_fragmentos as number) * 4;
    const raridades = faixa.raridade_alvo.split('/').filter((r) => r === 'mitico' || r === 'reliquia');
    const alvo = raridades.map((r) => (r === 'reliquia' ? banda['reliquia da criacao'] : banda[r])).filter(Boolean) as number[][];
    if (!alvo.length) continue;
    const minimo = Math.min(...alvo.map((b) => b[0]));
    assert.ok(quatro >= minimo, `${faixa.niveis}: 4 sessões (${quatro} F) não pagam nem o piso da raridade (${minimo} F)`);
  }
});

test('o Mítico só cabe na verba a partir do nível 50, e a escada de compra termina no 40', () => {
  const pisoMitico = escala.muro_dos_fragmentos.piso_mitico_solares;
  for (const faixa of faixas) {
    const quatro = emSolares(faixa) * 4;
    const nivel = inicioDe(faixa);
    if (nivel <= 40) assert.ok(quatro < pisoMitico, `nível ${faixa.niveis}: o muro dos Fragmentos teria caído cedo demais`);
    if (nivel >= 50) assert.ok(quatro >= pisoMitico, `nível ${faixa.niveis}: a verba ainda não atravessa o muro`);
  }
});

test('a nota de alcance das classes sociais bate com a verba', () => {
  const alcance = (escala as { alcance_das_classes_sociais: { degraus: Array<{ classe: string; patrimonio_fragmentos: number | null; sessoes_de_um_grupo_de_quatro?: Record<string, number> }> } }).alcance_das_classes_sociais;
  const verbaDe = (nivel: number) => {
    const faixa = faixas.find((item) => {
      const [inicio, fim] = item.niveis.replace('+', '').split('-').map(Number);
      return nivel >= inicio && (item.niveis.endsWith('+') || nivel <= fim);
    }) as Faixa;
    return faixa.moeda === 'Fragmentos de Estrela' ? (faixa.por_sessao_fragmentos as number) : emSolares(faixa) / 50;
  };
  for (const degrau of alcance.degraus) {
    if (!degrau.patrimonio_fragmentos) continue;
    for (const [chave, sessoes] of Object.entries(degrau.sessoes_de_um_grupo_de_quatro ?? {})) {
      const nivel = Number(chave.replace('nivel_', ''));
      assert.equal(Math.ceil(degrau.patrimonio_fragmentos / (verbaDe(nivel) * 4)), sessoes, `${degrau.classe} no nível ${nivel}`);
    }
  }
});

test('o livro traz as faixas novas na economia e no Guia do Mestre, e o teto da Guilda', () => {
  const economiaMestre = REGRAS_OFICIAIS.economia.corpoMestre ?? '';
  const guia = REGRAS_OFICIAIS.mestre.corpo;
  for (const faixa of faixas.filter((item) => inicioDe(item) >= 41)) {
    const valor = faixa.moeda === 'Solares' ? `${faixa.por_sessao_solares} Solares` : `${faixa.por_sessao_fragmentos} Fragmentos`;
    assert.ok(economiaMestre.includes(valor), `economia: falta a verba ${valor} da faixa ${faixa.niveis}`);
    assert.ok(guia.includes(valor), `Guia do Mestre: falta a verba ${valor} da faixa ${faixa.niveis}`);
  }
  assert.match(economiaMestre, /paga no máximo 1\.600 Solares por criatura/);
  assert.equal((escala as { guilda_dos_cacadores_alto: { teto_por_criatura_solares: number } }).guilda_dos_cacadores_alto.teto_por_criatura_solares, 1600);
});

// -------------------------------------------------- contratação e compra de criaturas de VD alto

type FaixaDeCriatura = { vd: string; contratacao_fragmentos: number; mensalidade_fragmentos: number; compra_fragmentos: number };
const criaturasAltas = (escala as unknown as { criaturas_de_vd_alto: { fracao_da_verba_na_contratacao: number; compra_em_contratacoes: number; mensalidade_da_contratacao: number; vd_minimo: number; faixas: FaixaDeCriatura[] } }).criaturas_de_vd_alto;
const FRAGMENTO_EM_LUNARIS = 5000;
const verbaDaFaixa = (vd: string) => (faixas.find((faixa) => faixa.niveis === vd) as Faixa).por_sessao_lunaris;

test('a contratação de criatura de VD alto vale metade da verba de uma sessão, e a compra, dez contratações', () => {
  assert.equal(criaturasAltas.vd_minimo, 50);
  const faixasDeVerba = faixas.filter((faixa) => inicioDe(faixa) >= 50);
  assert.deepEqual(criaturasAltas.faixas.map((faixa) => faixa.vd), faixasDeVerba.map((faixa) => faixa.niveis), 'as faixas precisam ser as mesmas da verba');
  let anterior = 0;
  for (const faixa of criaturasAltas.faixas) {
    const esperado = Math.round((criaturasAltas.fracao_da_verba_na_contratacao * verbaDaFaixa(faixa.vd)) / FRAGMENTO_EM_LUNARIS);
    assert.equal(faixa.contratacao_fragmentos, esperado, `${faixa.vd}: contratação`);
    assert.equal(faixa.compra_fragmentos, esperado * criaturasAltas.compra_em_contratacoes, `${faixa.vd}: compra`);
    assert.equal(faixa.mensalidade_fragmentos, Math.round(esperado * criaturasAltas.mensalidade_da_contratacao), `${faixa.vd}: mensalidade`);
    assert.ok(faixa.contratacao_fragmentos > anterior, `${faixa.vd}: o preço só pode subir`);
    anterior = faixa.contratacao_fragmentos;
  }
});

test('o catálogo traz as criaturas de VD alto com o preço da tabela, e contratar sempre sai mais barato que comprar', () => {
  const catalogo = (JSON.parse(readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8')) as {
    entradas: Array<{ id: string; tipo: string; conteudo: Record<string, any> }>;
  }).entradas.filter((entrada) => entrada.tipo === 'monstro');
  const altas = catalogo.filter((entrada) => entrada.conteudo.vd >= criaturasAltas.vd_minimo);
  assert.ok(altas.length >= 20);
  for (const entrada of altas) {
    const faixa = criaturasAltas.faixas.find((item) => {
      const [inicio, fim] = item.vd.replace('+', '').split('-').map(Number);
      return entrada.conteudo.vd >= inicio && (item.vd.endsWith('+') || entrada.conteudo.vd <= fim);
    }) as FaixaDeCriatura;
    assert.deepEqual(entrada.conteudo.preco, { 'Fragmentos de Estrela': faixa.compra_fragmentos }, entrada.id);
    assert.deepEqual(entrada.conteudo.preco_contratacao, { 'Fragmentos de Estrela': faixa.contratacao_fragmentos }, entrada.id);
    assert.deepEqual(entrada.conteudo.contrato_mensal, { 'Fragmentos de Estrela': faixa.mensalidade_fragmentos }, entrada.id);
    assert.ok(faixa.contratacao_fragmentos < faixa.compra_fragmentos && faixa.mensalidade_fragmentos < faixa.contratacao_fragmentos);
  }
  // Abaixo do VD 50 nada mudou: a contratação segue os degraus de Lunaris do catálogo.
  for (const entrada of catalogo.filter((item) => item.conteudo.vd < criaturasAltas.vd_minimo)) {
    assert.ok('Lunaris' in entrada.conteudo.preco_contratacao, `${entrada.id}: moeda da contratação`);
  }
});

test('contratar uma criatura custa a mesma fração da verba em qualquer nível, do 50 ao 500', () => {
  // O ponto da tabela: o preço da contratação, medido em sessões de verba de um jogador, não pode despencar com o nível.
  for (const faixa of criaturasAltas.faixas) {
    const sessoes = (faixa.contratacao_fragmentos * FRAGMENTO_EM_LUNARIS) / verbaDaFaixa(faixa.vd);
    assert.ok(sessoes >= 0.45 && sessoes <= 0.55, `${faixa.vd}: ${sessoes.toFixed(2)} sessões de verba`);
  }
});

test('as tabelas de contratação do livro ganham degraus no 100 e no 300, e o livro explica por quê', () => {
  const mestre = REGRAS_OFICIAIS.bestiario?.corpoMestre ?? Object.values(REGRAS_OFICIAIS).map((pagina: any) => pagina.corpoMestre ?? '').join('\n');
  assert.equal((mestre.match(/<td>51 a 99<\/td>/g) ?? []).length, 6, 'seis tabelas de contratação com a faixa 51 a 99');
  assert.equal((mestre.match(/<td>100 a 299<\/td>/g) ?? []).length, 6);
  assert.equal((mestre.match(/<td>300\+<\/td>/g) ?? []).length, 6);
  assert.doesNotMatch(mestre, /<td>50\+<\/td><td>\+\d+ L \/ nível/, 'a linha antiga "50+" não pode sobrar');
  assert.match(mestre, /a taxa de sempre, de 100 a 299 ela dobra/);
  assert.match(mestre, /em Fragmentos de Estrela, e acompanha a verba do VD/);
  // Cada tabela: 100 a 299 é o dobro de 51 a 99.
  const tabelas = [...mestre.matchAll(/<td>51 a 99<\/td><td>\+(\d+) L \/ nível<\/td><td>\+(\d+) L \/ nível<\/td><\/tr>\s*<tr><td>100 a 299<\/td><td>\+(\d+) L \/ nível<\/td><td>\+(\d+) L \/ nível<\/td>/g)];
  assert.equal(tabelas.length, 6);
  for (const [, a, b, dobroA, dobroB] of tabelas) {
    // O valor é arredondado de 5 em 5 Lunaris.
    assert.ok(Math.abs(Number(dobroA) - Number(a) * 2) <= 2.5, `${a} -> ${dobroA}`);
    assert.ok(Math.abs(Number(dobroB) - Number(b) * 2) <= 2.5, `${b} -> ${dobroB}`);
  }
});
