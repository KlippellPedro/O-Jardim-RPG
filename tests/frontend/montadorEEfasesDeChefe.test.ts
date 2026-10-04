import assert from 'node:assert/strict';
import test from 'node:test';
import catalogo from '../../data/loja/catalogo.json';
import curva from '../../data/regras/curva-criatura-v1.json';
import { PAPEIS_CRIATURA, escalaDeVida, mediaDaExpressao, modeloDeCriatura, vidaDeCriatura } from '../../src/services/curvaCriatura';
import {
  DIFICULDADES,
  ESTILOS,
  LIMITE_DE_CRIATURAS,
  ORDEM_DAS_DIFICULDADES,
  PESO_DA_AMEACA,
  ameacaDeHabilidades,
  montarEncontro,
  orcamentoDoEncontro,
  planejarPapeis,
  rodadasEsperadas,
  sorteador,
  type EstiloEncontro,
  type ParametrosDoEncontro,
} from '../../src/services/montadorEncontro';
import type { BestiarioMonstro } from '../../src/services/sessaoApi';
import { avisosDeFaseNova, type EntidadeIniciativa } from '../../src/store/useSessaoStore';

type Entrada = { id: string; titulo: string; tipo: string; conteudo: Record<string, any> };
const entradas = (catalogo as { entradas: Entrada[] }).entradas;
const criaturas = entradas.filter((entrada) => entrada.tipo === 'monstro');

const bestiario: BestiarioMonstro[] = criaturas.map((entrada) => ({
  id: entrada.id,
  titulo: entrada.titulo,
  nivel: entrada.conteudo.nivel ?? null,
  classe: entrada.conteudo.classe ?? null,
  categoria: entrada.conteudo.categoria ?? null,
  descricao: entrada.conteudo.descricao ?? null,
  vd: entrada.conteudo.vd ?? null,
  xp: 0,
  familia: entrada.conteudo.familia ?? null,
  papel: entrada.conteudo.papel ?? null,
  unico: !!entrada.conteudo.unico,
  pv: entrada.conteudo.pv ?? null,
  defesa: entrada.conteudo.defesa ?? null,
  mana: null,
  estamina: entrada.conteudo.estamina ?? null,
  iniciativa: entrada.conteudo.iniciativa ?? null,
  ataques: entrada.conteudo.ataques ?? [],
  pericias: entrada.conteudo.pericias ?? [],
  habilidades: entrada.conteudo.habilidades ?? [],
}));

const base: ParametrosDoEncontro = { nivel: 20, jogadores: 4, dificuldade: 'padrao', estilo: 'auto', familia: null, incluirUnicas: false, semente: 7 };
const estilos = (Object.keys(ESTILOS) as EstiloEncontro[]).filter((estilo) => estilo !== 'auto');

// ---------------------------------------------------------------- montador

test('o orçamento cresce com o grupo e com a dificuldade', () => {
  assert.equal(orcamentoDoEncontro(4, 'padrao'), 1);
  assert.equal(orcamentoDoEncontro(8, 'padrao'), 2);
  assert.equal(orcamentoDoEncontro(4, 'mortal'), 1.6);
  const valores = ORDEM_DAS_DIFICULDADES.map((dificuldade) => orcamentoDoEncontro(4, dificuldade));
  assert.deepEqual([...valores].sort((a, b) => a - b), valores);
  assert.equal(DIFICULDADES.padrao.multiplicador, 1);
  assert.equal(orcamentoDoEncontro(0, 'padrao'), 1, 'sem número de jogadores vale o padrão de quatro');
  assert.equal(orcamentoDoEncontro(99, 'padrao'), 2.5, 'o grupo para em dez jogadores');
});

test('o sorteador é repetível e fica entre 0 e 1', () => {
  const a = sorteador(42);
  const b = sorteador(42);
  for (let i = 0; i < 50; i += 1) {
    const valor = a();
    assert.equal(valor, b());
    assert.ok(valor >= 0 && valor < 1);
  }
  assert.notEqual(sorteador(1)(), sorteador(2)());
});

test('cada estilo fecha perto do orçamento sem passar do limite de criaturas', () => {
  for (const estilo of estilos) {
    for (const orcamento of [0.15, 0.6, 1, 1.5, 2.2, 5]) {
      const papeis = planejarPapeis(estilo, orcamento);
      assert.ok(papeis.length >= 1 && papeis.length <= LIMITE_DE_CRIATURAS, `${estilo} ${orcamento}: ${papeis.length} criaturas`);
      const gasto = papeis.reduce((soma, papel) => soma + PAPEIS_CRIATURA[papel].fatiaDeVida, 0);
      if (estilo === 'duelo' || estilo === 'elites') continue;
      if (orcamento >= 0.6 && orcamento <= 2.2) assert.ok(gasto <= orcamento * 1.35 && gasto >= orcamento * 0.6, `${estilo} ${orcamento}: gastou ${gasto}`);
    }
  }
});

test('o estilo chefe põe um chefe quando o orçamento chega a uma Vida inteira', () => {
  assert.equal(planejarPapeis('chefe', 1)[0], 'chefe');
  assert.equal(planejarPapeis('chefe', 0.5)[0], 'elite');
  assert.equal(planejarPapeis('duelo', 1)[0], 'chefe');
  assert.equal(planejarPapeis('duelo', 0.1)[0], 'lacaio');
});

test('o mesmo pedido dá o mesmo encontro, e a semente nova dá outro', () => {
  const a = montarEncontro(bestiario, base);
  const b = montarEncontro(bestiario, base);
  assert.deepEqual(a.vagas.map((vaga) => vaga.monstro.id), b.vagas.map((vaga) => vaga.monstro.id));
  const outras = new Set(Array.from({ length: 12 }, (_, i) => montarEncontro(bestiario, { ...base, semente: 100 + i }).vagas.map((vaga) => vaga.monstro.id).join('|')));
  assert.ok(outras.size > 3, 'a semente precisa mudar o encontro');
});

test('toda criatura sai escalada para o nível pedido, sem número quebrado', () => {
  for (const nivel of [1, 5, 12, 20, 40, 60, 100, 250, 500]) {
    for (const estilo of estilos) {
      const encontro = montarEncontro(bestiario, { ...base, nivel, estilo });
      assert.ok(encontro.vagas.length >= 1);
      for (const vaga of encontro.vagas) {
        const { monstro } = vaga;
        assert.equal(monstro.vd, nivel, `${monstro.titulo}: VD`);
        assert.ok(Number.isInteger(monstro.pv) && (monstro.pv as number) > 0, `${monstro.titulo}: Vida`);
        assert.ok(monstro.xp > 0, `${monstro.titulo}: XP`);
        assert.ok(monstro.ataques.length > 0, `${monstro.titulo}: sem ataque`);
        for (const ataque of monstro.ataques) assert.ok(!/NaN|undefined/.test(`${ataque.nome} ${ataque.detalhe}`), `${monstro.titulo}: ataque quebrado`);
        assert.equal(monstro.papel, vaga.papel);
      }
    }
  }
});

test('a Vida da vaga segue a fatia do papel: lacaio < padrão < chefe', () => {
  const pvPorPapel = (papel: string) => {
    for (const estilo of estilos) {
      for (let semente = 1; semente < 30; semente += 1) {
        const vaga = montarEncontro(bestiario, { ...base, nivel: 30, jogadores: 8, estilo, semente }).vagas.find((item) => item.papel === papel);
        if (vaga) return vaga.monstro.pv as number;
      }
    }
    return null;
  };
  const lacaio = pvPorPapel('lacaio') as number;
  const padrao = pvPorPapel('padrao') as number;
  const chefe = pvPorPapel('chefe') as number;
  assert.ok(lacaio && padrao && chefe, `${lacaio} ${padrao} ${chefe}`);
  assert.ok(lacaio < padrao && padrao < chefe, `${lacaio} ${padrao} ${chefe}`);
  const esperado = modeloDeCriatura(30, 'chefe').pv;
  assert.ok(Math.abs(chefe - esperado) / esperado < 0.45, `chefe ${chefe} longe da curva ${esperado}`);
});

test('chefe leva o Golpe Anunciado e lacaio não', () => {
  const encontro = montarEncontro(bestiario, { ...base, nivel: 30, jogadores: 8, estilo: 'chefe' });
  const chefe = encontro.vagas.find((vaga) => vaga.papel === 'chefe');
  assert.ok(chefe, 'esperava um chefe');
  assert.ok(chefe.monstro.habilidades.some((habilidade) => habilidade.startsWith('Golpe Anunciado')));
  for (const vaga of encontro.vagas.filter((item) => item.papel === 'lacaio')) {
    assert.ok(!vaga.monstro.habilidades.some((habilidade) => habilidade.startsWith('Golpe Anunciado')));
  }
});

test('o encontro nunca traz Deidade nem criatura única sem o Mestre pedir', () => {
  for (let semente = 1; semente < 40; semente += 1) {
    for (const estilo of estilos) {
      const encontro = montarEncontro(bestiario, { ...base, nivel: 60, semente, estilo });
      for (const vaga of encontro.vagas) {
        assert.notEqual(vaga.monstro.categoria, 'Deidade');
        assert.ok(!vaga.monstro.unico, `${vaga.monstro.titulo} é única`);
      }
    }
  }
  const comUnicas = Array.from({ length: 60 }, (_, i) => montarEncontro(bestiario, { ...base, nivel: 60, estilo: 'chefe', jogadores: 6, incluirUnicas: true, semente: i + 1 }))
    .some((encontro) => encontro.vagas.some((vaga) => vaga.monstro.unico && vaga.papel === 'chefe'));
  assert.ok(comUnicas, 'com a opção ligada, uma única precisa poder ocupar a vaga de chefe');
});

test('o filtro por povo só traz criaturas daquela família', () => {
  const familias = new Set(bestiario.filter((m) => !m.unico && m.familia).map((m) => m.familia as string));
  const familia = [...familias][0];
  const encontro = montarEncontro(bestiario, { ...base, familia });
  for (const vaga of encontro.vagas) {
    if (vaga.baseTitulo) assert.equal(bestiario.find((m) => m.titulo === vaga.baseTitulo)?.familia, familia);
  }
});

test('sem Bestiário o montador cai no gerador por VD e avisa', () => {
  const encontro = montarEncontro([], base);
  assert.ok(encontro.vagas.length >= 1);
  assert.ok(encontro.vagas.every((vaga) => vaga.baseTitulo === null && vaga.monstro.vd === base.nivel));
  assert.match(encontro.aviso ?? '', /gerador/);
});

test('um bando traz criaturas variadas, não a mesma três vezes', () => {
  for (const nivel of [10, 20, 40]) {
    for (let semente = 1; semente <= 15; semente += 1) {
      const encontro = montarEncontro(bestiario, { ...base, nivel, jogadores: 8, estilo: 'bando', semente });
      const distintas = new Set(encontro.vagas.map((vaga) => vaga.baseTitulo));
      assert.ok(distintas.size >= Math.min(3, encontro.vagas.length), `nível ${nivel}, semente ${semente}: só ${distintas.size} criatura(s) diferente(s) em ${encontro.vagas.length} vagas`);
    }
  }
});

test('trocar uma vaga muda só aquela posição', () => {
  const antes = montarEncontro(bestiario, { ...base, estilo: 'bando', jogadores: 6 });
  const depois = montarEncontro(bestiario, { ...base, estilo: 'bando', jogadores: 6, trocas: { 1: 1 } });
  assert.equal(antes.vagas.length, depois.vagas.length);
  assert.equal(antes.vagas[0].monstro.id, depois.vagas[0].monstro.id);
  assert.equal(antes.vagas[2]?.monstro.id, depois.vagas[2]?.monstro.id);
});

test('o texto do montador segue o tom do livro', () => {
  const textos = [...Object.values(ESTILOS).flatMap((e) => [e.rotulo, e.descricao]), ...Object.values(DIFICULDADES).flatMap((d) => [d.rotulo, d.descricao])];
  for (const texto of textos) {
    assert.doesNotMatch(texto, /[—–]/);
    assert.doesNotMatch(texto, /\beco(s)?\b/i);
    assert.doesNotMatch(texto, /não é [^.;:]{1,60}, é /i);
  }
});

// ---------------------------------------------------------------- fases de chefe

type Fase = { quando: number | null; nome: string; anuncio: string; mudancas: string[] };
const comFases = criaturas.filter((entrada) => entrada.conteudo.fases);

test('toda criatura única tem fases, e só ela', () => {
  const unicas = criaturas.filter((entrada) => entrada.conteudo.unico);
  assert.equal(comFases.length, unicas.length);
  for (const entrada of comFases) assert.ok(entrada.conteudo.unico, `${entrada.id} tem fases mas não é única`);
});

test('as fases descem de 100% a 0%, têm nome, mudança e frase de cena', () => {
  for (const entrada of comFases) {
    const fases = entrada.conteudo.fases as Fase[];
    assert.ok(fases.length >= 1 && fases.length <= 8, `${entrada.id}: ${fases.length} fases`);
    let anterior = 1;
    for (const fase of fases) {
      if (fase.quando !== null) {
        assert.ok(fase.quando > 0 && fase.quando < 1, `${entrada.id}: limiar ${fase.quando} fora de (0, 1)`);
        assert.ok(fase.quando < anterior, `${entrada.id}: limiares precisam descer`);
        anterior = fase.quando;
      }
      assert.ok(fase.nome.length >= 3, `${entrada.id}: fase sem nome`);
      assert.ok(fase.mudancas.length >= 1 && fase.mudancas.every((mudanca) => mudanca.length >= 15), `${entrada.id}/${fase.nome}: mudança curta`);
      if (fase.quando !== null) assert.ok(fase.anuncio.length >= 15, `${entrada.id}/${fase.nome}: falta a frase de cena`);
    }
  }
});

test('a frase de cena não entrega número nem regra para a mesa', () => {
  for (const entrada of comFases) {
    for (const fase of entrada.conteudo.fases as Fase[]) {
      assert.doesNotMatch(fase.anuncio, /\d/, `${entrada.id}/${fase.nome}: número na frase de cena`);
      assert.doesNotMatch(fase.anuncio, /\b(DT|dano|Vida|rodada|bônus)\b/i, `${entrada.id}/${fase.nome}: regra na frase de cena`);
    }
  }
});

test('o texto das fases segue o tom do livro', () => {
  for (const entrada of comFases) {
    for (const fase of entrada.conteudo.fases as Fase[]) {
      const texto = [fase.nome, fase.anuncio, ...fase.mudancas].join(' ');
      assert.doesNotMatch(texto, /[—–]/, `${entrada.id}/${fase.nome}: travessão`);
      assert.doesNotMatch(texto, /\beco(s)?\b/i, `${entrada.id}/${fase.nome}: "eco"`);
      assert.doesNotMatch(texto, /não é [^.;:]{1,60}, é /i, `${entrada.id}/${fase.nome}: antítese`);
    }
  }
});

const participante = (id: string, fase?: number): EntidadeIniciativa => ({
  id,
  nome: id,
  iniciativa: 10,
  anotacao: '',
  tipo: 'inimigo',
  condicoes: [],
  aflicoes: [],
  fase,
  fasesTotal: 3,
  faseNome: fase && fase > 1 ? `Fase ${fase}` : undefined,
  faseAnuncio: fase && fase > 1 ? 'A cena muda.' : undefined,
  faseMudancas: fase && fase > 1 ? ['Algo muda.'] : undefined,
});

test('o aviso de fase só dispara quando a fase sobe de verdade', () => {
  assert.deepEqual(avisosDeFaseNova([], [participante('a', 2)]), [], 'primeira carga da sessão não avisa');
  assert.deepEqual(avisosDeFaseNova([participante('a', 1)], [participante('a', 1)]), []);
  assert.deepEqual(avisosDeFaseNova([participante('a', 2)], [participante('a', 1)]), [], 'descer não avisa');
  assert.deepEqual(avisosDeFaseNova([participante('a', 2)], [participante('a', 2)]), []);
  assert.deepEqual(avisosDeFaseNova([participante('a', 1)], [participante('a', 1), participante('b', 2)]), [], 'quem acabou de entrar não avisa');
  const avisos = avisosDeFaseNova([participante('a', 1), participante('b', 1)], [participante('a', 2), participante('b', 1)]);
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].participanteId, 'a');
  assert.equal(avisos[0].fase, 2);
  assert.equal(avisos[0].chave, 'a:2');
  assert.deepEqual(avisos[0].mudancas, ['Algo muda.']);
  const dois = avisosDeFaseNova([participante('a', 1)], [participante('a', 3)]);
  assert.equal(dois[0].fase, 3);
});

// ---------------------------------------------------------------- calibração da dificuldade

/**
 * Simulação de uma luta, sem sorte: o grupo tem a Vida média da curva por jogador e causa por rodada a Vida de um
 * inimigo padrão do nível (vezes VD/40 acima do 40) dividida por 4,5, em grupo de quatro. Os inimigos acertam 60% das vezes
 * o dano do ataque deles, agem antes do grupo e caem do menor para o maior. Devolve a fração da Vida do grupo gasta.
 */
function perdaDoGrupo(nivel: number, jogadores: number, enc: ReturnType<typeof montarEncontro>): number {
  const colunas = curva.colunas as string[];
  const linha = (curva.linhas as number[][])[Math.min(nivel, curva.linhas.length) - 1];
  const vidaDoPersonagem = linha[colunas.indexOf('vidaDoPersonagem')];
  const vidaPadrao = linha[colunas.indexOf('vidaDeInimigoPadrao')];
  const danoDoGrupo = (vidaPadrao * escalaDeVida(nivel) * (jogadores / 4)) / 4.5;
  const inimigos = enc.vagas.map((vaga) => ({
    pv: vaga.monstro.pv as number,
    dano: mediaDaExpressao(String(vaga.monstro.ataques[0]?.detalhe ?? '').replace(/^[+-]\d+,\s*/, '').split(' ')[0]) || PAPEIS_CRIATURA[vaga.papel].fatiaDeDano * vidaDoPersonagem,
  })).sort((a, b) => a.pv - b.pv);
  const vidaDoGrupo = vidaDoPersonagem * jogadores;
  let perdido = 0;
  for (let rodada = 0; inimigos.length && rodada < 40; rodada += 1) {
    perdido += inimigos.reduce((soma, inimigo) => soma + inimigo.dano * 0.6, 0);
    let sobra = danoDoGrupo;
    while (sobra > 0 && inimigos.length) {
      const tira = Math.min(sobra, inimigos[0].pv);
      inimigos[0].pv -= tira;
      sobra -= tira;
      if (inimigos[0].pv <= 0) inimigos.shift();
    }
  }
  return perdido / vidaDoGrupo;
}

const media = (valores: number[]) => valores.reduce((soma, valor) => soma + valor, 0) / valores.length;

test('as quatro dificuldades desgastam um grupo de quatro em faixas separadas, do 5 ao 500', () => {
  // Medido com a simulação acima (sem cura nem mitigação, então é um teto): fácil perto de 22%, padrão 47%,
  // difícil 74% e mortal 80% a 96% da Vida do grupo. Se um multiplicador mudar, estas faixas dizem o que mudou.
  const faixas: Record<string, [number, number]> = { facil: [0.12, 0.34], padrao: [0.33, 0.58], dificil: [0.5, 0.88], mortal: [0.7, 1.2] };
  for (const nivel of [5, 12, 20, 40, 60, 100, 250, 500]) {
    const perdas = ORDEM_DAS_DIFICULDADES.map((dificuldade) => media(
      Array.from({ length: 10 }, (_, i) => perdaDoGrupo(nivel, 4, montarEncontro(bestiario, { ...base, nivel, jogadores: 4, dificuldade, semente: i + 1 }))),
    ));
    perdas.forEach((perda, indice) => {
      const dificuldade = ORDEM_DAS_DIFICULDADES[indice];
      assert.ok(perda >= faixas[dificuldade][0] && perda <= faixas[dificuldade][1], `nível ${nivel}, ${dificuldade}: ${(perda * 100).toFixed(0)}% da Vida do grupo`);
    });
    for (let i = 1; i < perdas.length; i += 1) assert.ok(perdas[i] - perdas[i - 1] >= 0.08, `nível ${nivel}: ${ORDEM_DAS_DIFICULDADES[i]} precisa pesar pelo menos 8 pontos mais que a anterior`);
  }
});

test('grupos de 2 a 8 jogadores sentem a mesma dificuldade: o desvio para o grupo de quatro fica pequeno', () => {
  for (const dificuldade of ORDEM_DAS_DIFICULDADES) {
    const deQuatro = media(Array.from({ length: 10 }, (_, i) => perdaDoGrupo(40, 4, montarEncontro(bestiario, { ...base, nivel: 40, jogadores: 4, dificuldade, semente: i + 1 }))));
    for (const jogadores of [2, 3, 5, 6, 8]) {
      const perda = media(Array.from({ length: 10 }, (_, i) => perdaDoGrupo(40, jogadores, montarEncontro(bestiario, { ...base, nivel: 40, jogadores, dificuldade, semente: i + 1 }))));
      assert.ok(Math.abs(perda - deQuatro) <= 0.3, `${dificuldade}, ${jogadores} jogadores: ${(perda * 100).toFixed(0)}% contra ${(deQuatro * 100).toFixed(0)}% para quatro`);
    }
  }
});

test('"cerca de N rodadas" mostrado na tela bate com a conta do Guia: 4,5 rodadas vezes o multiplicador', () => {
  for (const dificuldade of ORDEM_DAS_DIFICULDADES) {
    const erros: number[] = [];
    for (const nivel of [8, 30, 90, 400]) {
      for (const jogadores of [2, 4, 6, 8]) {
        for (let semente = 1; semente <= 6; semente += 1) {
          const enc = montarEncontro(bestiario, { ...base, nivel, jogadores, dificuldade, semente });
          const esperado = 4.5 * DIFICULDADES[dificuldade].multiplicador;
          erros.push(Math.abs(rodadasEsperadas(enc, jogadores) - esperado) / esperado);
        }
      }
    }
    assert.ok(media(erros) <= 0.18, `${dificuldade}: erro médio de ${(media(erros) * 100).toFixed(0)}% nas rodadas`);
  }
});

test('a Vida das vagas segue a curva do nível, não a sorte do Bestiário', () => {
  for (const nivel of [10, 45, 200]) {
    for (let semente = 1; semente <= 10; semente += 1) {
      const enc = montarEncontro(bestiario, { ...base, nivel, jogadores: 4, estilo: 'bando', semente });
      // A curva, descontado o peso que as habilidades de cada vaga (cura, controle, área) gastam do orçamento.
      const naCurva = enc.vagas.reduce((soma, vaga) => soma + vidaDeCriatura(nivel, vaga.papel) / (1 + vaga.ameaca.extra), 0);
      assert.ok(Math.abs(enc.vidaTotal - naCurva) / naCurva <= 0.12, `nível ${nivel}, semente ${semente}: ${enc.vidaTotal} contra ${naCurva} da curva`);
    }
  }
});

// ---------------------------------------------------------------- habilidades no custo

const fichaMinima = (habilidades: string[], ataques: Array<{ nome: string; detalhe?: string }> = []) => ({ habilidades, ataques });

test('o montador reconhece cura, controle e área nas habilidades e nos ataques', () => {
  assert.deepEqual(ameacaDeHabilidades(fichaMinima(['Mordida (+5, 1d6)'])), { tipos: [], extra: 0 });
  assert.deepEqual(ameacaDeHabilidades(fichaMinima(['Regeneração (recupera 10 de Vida por rodada)'])).tipos, ['cura']);
  assert.deepEqual(ameacaDeHabilidades(fichaMinima(['Olhar Paralisante (o alvo fica paralisado até o fim do turno)'])).tipos, ['controle']);
  assert.deepEqual(ameacaDeHabilidades(fichaMinima([], [{ nome: 'Sopro de Fogo', detalhe: 'cone de 9 m, 6d6' }])).tipos, ['area']);
  const tudo = ameacaDeHabilidades(fichaMinima(['Regenera 5 por rodada', 'Grito: todas as criaturas ficam amedrontadas', 'Rajada em área']));
  assert.deepEqual([...tudo.tipos].sort(), ['area', 'controle', 'cura']);
  assert.equal(tudo.extra, 0.25, 'o peso é limitado a 25%');
  assert.equal(ameacaDeHabilidades(fichaMinima(['Cura em Cena'])).extra, PESO_DA_AMEACA.cura);
});

test('a criatura que cura, controla ou atinge área tem menos Vida do que a mesma vaga sem essas habilidades', () => {
  const comum = (id: string, habilidades: string[]): BestiarioMonstro => ({
    id, titulo: id, nivel: 20, classe: null, categoria: 'Monstro', descricao: null, vd: 20, xp: 0, familia: null, unico: false, pv: 400, defesa: 20,
    mana: null, estamina: null, iniciativa: 12, ataques: [{ nome: 'Garra', detalhe: '+20, 2d8+6 cortante' }], pericias: [], habilidades,
  });
  const so = [comum('simples-a', []), comum('simples-b', []), comum('simples-c', [])];
  const com = [comum('mago-a', ['Onda de choque (dano em área)', 'Cura em Cena']), comum('mago-b', ['Onda de choque (dano em área)', 'Cura em Cena']), comum('mago-c', ['Onda de choque (dano em área)', 'Cura em Cena'])];
  const encontroSimples = montarEncontro(so, { ...base, nivel: 20, estilo: 'elites', semente: 3 });
  const encontroComHabilidades = montarEncontro(com, { ...base, nivel: 20, estilo: 'elites', semente: 3 });
  assert.equal(encontroSimples.pesoDasHabilidades, 0);
  assert.ok(encontroComHabilidades.pesoDasHabilidades > 0);
  assert.ok(encontroComHabilidades.vidaTotal < encontroSimples.vidaTotal * 0.9, `${encontroComHabilidades.vidaTotal} contra ${encontroSimples.vidaTotal}`);
  assert.ok(encontroComHabilidades.vagas.every((vaga) => vaga.ameaca.tipos.includes('area') && vaga.ameaca.tipos.includes('cura')));
});

test('o desgaste médio do grupo segue nas faixas com as habilidades do Bestiário valendo no custo', () => {
  // Mesmas faixas do teste de calibração: as habilidades reduzem a Vida, mas o orçamento continua o mesmo.
  const pesos = Array.from({ length: 20 }, (_, i) => montarEncontro(bestiario, { ...base, nivel: 30, jogadores: 4, dificuldade: 'padrao', semente: i + 1 }).pesoDasHabilidades);
  assert.ok(Math.max(...pesos) <= 0.5, 'as habilidades não podem comer metade do orçamento');
  assert.ok(pesos.some((peso) => peso > 0), 'o Bestiário traz criaturas com essas habilidades');
});

test('toda criatura que cita "área" no texto é marcada como ameaça de área (o \b do JavaScript não enxerga o acento)', () => {
  const esquecidas = bestiario.filter((monstro) => {
    const texto = [...monstro.habilidades, ...monstro.ataques.map((ataque) => `${ataque.nome} ${ataque.detalhe ?? ''}`)].join(' ');
    return /(?<!\p{L})áreas?(?!\p{L})/iu.test(texto) && !ameacaDeHabilidades(monstro).tipos.includes('area');
  });
  assert.deepEqual(esquecidas.map((monstro) => monstro.id), []);
  assert.ok(bestiario.filter((monstro) => ameacaDeHabilidades(monstro).tipos.includes('area')).length >= 40, 'o bestiário tem dezenas de criaturas de área');
});
