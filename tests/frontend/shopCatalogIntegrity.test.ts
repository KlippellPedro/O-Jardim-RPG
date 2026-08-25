import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

type CatalogEntry = {
  tipo: string;
  id: string;
  titulo: string;
  conteudo: Record<string, any>;
};

const catalogo = JSON.parse(
  readFileSync(new URL('../../data/loja/catalogo.json', import.meta.url), 'utf8'),
) as { entradas: CatalogEntry[] };

const escala = JSON.parse(
  readFileSync(new URL('../../data/economia/escala-precos-v1.json', import.meta.url), 'utf8'),
) as {
  cambio: Record<string, number>;
  escada_raridade: {
    banda: { minimo: number; maximo: number };
    piso_comum_por_categoria?: Record<string, number>;
    faixas: { raridade: string; referencia_lunaris: number; congelada?: boolean }[];
  };
  multiplicador_por_categoria: Record<string, number>;
};

const CAMBIO = escala.cambio;
const emSolares = (preco: { moeda: string; valor: number }) => preco.valor * (CAMBIO[preco.moeda] ?? 1);
const faixaDe = (raridade: string) => escala.escada_raridade.faixas
  .find(faixa => normalizar(faixa.raridade) === (raridade === 'reliquia' ? 'reliquia da criacao' : raridade));

const TIPOS = new Set([
  'arma', 'armadura', 'equipamento', 'modificacao', 'consumivel', 'artefato',
  'fruto-eden', 'implante', 'veiculo', 'veiculo-completo', 'monstro', 'drop',
  'propriedade',
]);
const MOEDAS = new Set(['Solares', 'Lunaris', 'Fragmentos de Estrela', 'Créditos Sombrios']);
const RARIDADES = new Set([
  'comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico', 'reliquia',
  'reliquia da criacao',
]);

const normalizar = (valor: unknown): string => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLocaleLowerCase('pt-BR');

const precoValido = (preco: unknown): boolean => {
  if (typeof preco === 'number') return Number.isSafeInteger(preco) && preco > 0;
  if (!preco || typeof preco !== 'object' || Array.isArray(preco)) return false;
  const pares = Object.entries(preco as Record<string, unknown>);
  return pares.length === 1
    && MOEDAS.has(pares[0][0])
    && typeof pares[0][1] === 'number'
    && Number.isSafeInteger(pares[0][1])
    && pares[0][1] > 0;
};

const lerPreco = (preco: unknown): { moeda: string; valor: number } | null => {
  if (typeof preco === 'number' && precoValido(preco)) return { moeda: 'Solares', valor: preco };
  if (!precoValido(preco)) return null;
  const [moeda, valor] = Object.entries(preco as Record<string, number>)[0];
  return { moeda, valor };
};

test('catálogo possui schema básico completo e identificadores únicos', () => {
  assert.ok(Array.isArray(catalogo.entradas) && catalogo.entradas.length > 0);
  const ids = new Set<string>();

  for (const entrada of catalogo.entradas) {
    assert.ok(TIPOS.has(entrada.tipo), `${entrada.id}: tipo desconhecido ${entrada.tipo}`);
    assert.match(entrada.id, /^[\p{Ll}\p{Nd}]+(?:-[\p{Ll}\p{Nd}]+)*$/u, `${entrada.id}: ID fora do padrão slug`);
    assert.equal(ids.has(entrada.id), false, `${entrada.id}: ID duplicado`);
    ids.add(entrada.id);
    assert.ok(entrada.titulo?.trim(), `${entrada.id}: título ausente`);
    assert.ok(entrada.conteudo && typeof entrada.conteudo === 'object', `${entrada.id}: conteúdo ausente`);
    assert.ok(String(entrada.conteudo.descricao ?? '').trim(), `${entrada.id}: descrição ausente`);
    assert.equal(/um item peculiar de utilidade questionável/i.test(entrada.conteudo.descricao), false, `${entrada.id}: descrição substituta`);
    assert.equal(/\u2014/.test(JSON.stringify(entrada)), false, `${entrada.id}: contém travessão`);
    assert.ok(precoValido(entrada.conteudo.preco), `${entrada.id}: preço inválido`);
    assert.ok(RARIDADES.has(normalizar(entrada.conteudo.raridade)), `${entrada.id}: raridade desconhecida`);
  }
});

test('modificações só automatizam efeitos estruturados e verificáveis', () => {
  const modificacoes = catalogo.entradas.filter((entrada) => entrada.tipo === 'modificacao');
  const reforcada = modificacoes.find((entrada) => entrada.id === 'mod-reforcada');
  assert.ok(reforcada, 'mod-reforcada ausente');
  assert.deepEqual(reforcada.conteudo.efeitos, [{
    id: 'mod-reforcada-defesa',
    categoria: 'combate',
    alvo: 'defesa',
    modo: 'bonus',
    valor: 1,
  }]);

  for (const modificacao of modificacoes) {
    const efeitos = modificacao.conteudo.efeitos;
    if (efeitos === undefined) continue;
    assert.ok(Array.isArray(efeitos), `${modificacao.id}: efeitos deve ser uma lista`);
    assert.ok(efeitos.length <= 1, `${modificacao.id}: uma modificação aceita no máximo um efeito automático`);
    for (const efeito of efeitos) {
      assert.ok(['atributo', 'recurso', 'combate', 'pericia'].includes(efeito.categoria), `${modificacao.id}: categoria de efeito inválida`);
      assert.ok(String(efeito.alvo ?? '').trim(), `${modificacao.id}: alvo de efeito ausente`);
      assert.ok(['bonus', 'vantagem', 'desvantagem'].includes(efeito.modo), `${modificacao.id}: modo de efeito inválido`);
      assert.ok(Number.isFinite(efeito.valor) && efeito.valor !== 0, `${modificacao.id}: valor de efeito inválido`);
    }
  }
});

test('catálogo não hardcoda promoção: a vitrine gira sozinha pelo servidor', () => {
  // "Ofertas em destaque" é 100% calculada por plataforma/core/promotions.py
  // a cada requisição, numa janela de 12h. Se um item nascer com `promocao`
  // ou `preco_original` fixo no catálogo estático, ele fica em oferta pra
  // sempre e trava a rotação - foi exatamente esse bug que motivou o cálculo
  // dinâmico no servidor.
  for (const entrada of catalogo.entradas) {
    assert.equal(entrada.conteudo.promocao, undefined, `${entrada.id}: promoção não pode vir hardcoded no catálogo`);
    assert.equal(entrada.conteudo.preco_original, undefined, `${entrada.id}: preco_original não pode vir hardcoded no catálogo`);
  }
});

test('todo preço cai na banda da própria raridade, pela escala oficial', () => {
  // A escada multiplica por 4 a cada degrau e a banda vai de 0,5x a 2,0x da
  // referência, então degraus vizinhos se encostam sem vão e sem cruzar. Se este
  // teste quebra, ou o catálogo saiu da escala ou a escala mudou de propósito:
  // rode `node tools/normalize-shop-prices.mjs` e confira o diff.
  const { minimo, maximo } = escala.escada_raridade.banda;
  const pisoComum = escala.escada_raridade.piso_comum_por_categoria ?? {};
  for (const entrada of catalogo.entradas) {
    const preco = lerPreco(entrada.conteudo.preco);
    if (!preco) continue;
    const raridade = normalizar(entrada.conteudo.raridade);
    const faixa = faixaDe(raridade);
    assert.ok(faixa, `${entrada.id}: raridade "${entrada.conteudo.raridade}" fora da escala`);
    if (faixa.congelada) continue;

    const multiplicador = escala.multiplicador_por_categoria[entrada.tipo] ?? 1;
    const referencia = (faixa.referencia_lunaris / 100) * multiplicador;
    // A faixa Comum de categorias que misturam bugiganga e bem de verdade tem o
    // piso afrouxado. Como nada existe abaixo de Comum, isso não abre inversão.
    const piso = raridade === 'comum' ? (pisoComum[entrada.tipo] ?? minimo) : minimo;
    const valor = emSolares(preco);
    assert.ok(
      valor >= referencia * piso * 0.999 && valor <= referencia * maximo * 1.001,
      `${entrada.id}: ${preco.valor} ${preco.moeda} fora da banda de ${entrada.tipo} ${raridade} `
        + `(${(referencia * piso).toFixed(2)} a ${(referencia * maximo).toFixed(2)} Solares)`,
    );
  }
});

test('a raridade ordena o preço dentro de cada categoria, sem inversão', () => {
  const ORDEM = ['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico', 'reliquia da criacao'];
  const grupos = new Map<string, number[]>();
  for (const entrada of catalogo.entradas) {
    const preco = lerPreco(entrada.conteudo.preco);
    if (!preco) continue;
    const raridade = normalizar(entrada.conteudo.raridade);
    const chave = `${entrada.tipo}|${raridade === 'reliquia' ? 'reliquia da criacao' : raridade}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(emSolares(preco));
  }

  for (const tipo of new Set(catalogo.entradas.map(item => item.tipo))) {
    let tetoAnterior: number | null = null;
    let raridadeAnterior = '';
    for (const raridade of ORDEM) {
      const valores = grupos.get(`${tipo}|${raridade}`);
      if (!valores?.length) continue;
      const piso = Math.min(...valores);
      if (tetoAnterior !== null) {
        assert.ok(
          piso >= tetoAnterior * 0.999,
          `${tipo}: ${raridade} começa em ${piso.toFixed(2)} Solares, abaixo do teto de ${raridadeAnterior} (${tetoAnterior.toFixed(2)})`,
        );
      }
      tetoAnterior = Math.max(...valores);
      raridadeAnterior = raridade;
    }
  }
});

test('a moeda acompanha o bolso: Lunaris no cotidiano, Solares no alto valor', () => {
  const TETO_DO_BOLSO = 20; // Solares. Acima disso a regra manda cotar em Solar.
  for (const entrada of catalogo.entradas) {
    const preco = lerPreco(entrada.conteudo.preco);
    if (!preco) continue;
    // Implante e Fruto do Éden têm moeda fixa por categoria, e modificação é
    // encomenda de oficina: os três ignoram o teto do bolso de propósito.
    if (['implante', 'fruto-eden', 'modificacao'].includes(entrada.tipo)) continue;
    if (preco.moeda !== 'Lunaris') continue;
    assert.ok(
      emSolares(preco) <= TETO_DO_BOLSO,
      `${entrada.id}: ${preco.valor} Lunaris não cabe num bolso, devia estar em Solares`,
    );
  }

  // Bem convencional de raridade baixa continua sendo compra de Lunaris.
  const convencionais = catalogo.entradas.filter(item => (
    (item.tipo === 'arma' || item.tipo === 'armadura')
      && new Set(['comum', 'incomum', 'raro']).has(normalizar(item.conteudo.raridade))
  ));
  assert.ok(convencionais.length > 0);
  for (const item of convencionais) {
    assert.equal(lerPreco(item.conteudo.preco)?.moeda, 'Lunaris', `${item.id}: bem convencional fora de Lunaris`);
  }

  // E o topo do catálogo continua cotado nas moedas do seu próprio balcão.
  for (const item of catalogo.entradas.filter(entrada => entrada.tipo === 'implante')) {
    assert.equal(lerPreco(item.conteudo.preco)?.moeda, 'Créditos Sombrios', `${item.id}: implante fora do Crédito Sombrio`);
  }
  for (const item of catalogo.entradas.filter(entrada => entrada.tipo === 'fruto-eden')) {
    assert.equal(lerPreco(item.conteudo.preco)?.moeda, 'Fragmentos de Estrela', `${item.id}: Fruto fora do Fragmento`);
  }
});

test('armas publicam dano, modo e crítico mecanicamente coerentes', () => {
  const armas = catalogo.entradas.filter(item => item.tipo === 'arma');
  assert.ok(armas.length > 0);
  for (const arma of armas) {
    const { dano, modo, margem_ameaca: margem, multiplicador_critico: multiplicador, critico } = arma.conteudo;
    assert.ok(typeof dano === 'string' && /\d+d\d+/i.test(dano), `${arma.id}: dano ausente ou não rolável`);
    assert.ok(['corpo a corpo', 'a distancia', 'hibrida'].includes(normalizar(modo)), `${arma.id}: modo inválido`);
    assert.ok([18, 19, 20].includes(margem), `${arma.id}: margem de ameaça inválida`);
    assert.ok([2, 3, 4].includes(multiplicador), `${arma.id}: multiplicador crítico inválido`);
    if (margem < 20) assert.equal(multiplicador, 2, `${arma.id}: margem ampla exige x2`);
    if (multiplicador > 2) assert.equal(margem, 20, `${arma.id}: x3/x4 exige margem 20`);
    const esperado = `${margem === 20 ? '20' : `${margem}-20`}/x${multiplicador}`;
    assert.equal(normalizar(critico), esperado, `${arma.id}: texto de crítico divergente`);
  }
});

test('armaduras usam nomes explícitos para não se confundirem com outros itens', () => {
  const armaduras = catalogo.entradas.filter(item => (
    item.tipo === 'armadura' && normalizar(item.conteudo.subtipo) !== 'escudo'
  ));
  assert.ok(armaduras.length > 0);
  for (const armadura of armaduras) {
    assert.match(armadura.titulo, /^Armadura de /, `${armadura.id}: título não identifica a peça como armadura`);
  }
});

test('peças veiculares e veículos completos possuem ficha utilizável', () => {
  const pecas = catalogo.entradas.filter(item => item.tipo === 'veiculo');
  const completos = catalogo.entradas.filter(item => item.tipo === 'veiculo-completo');
  assert.ok(pecas.length > 0 && completos.length > 0);

  for (const peca of pecas) {
    assert.ok(String(peca.conteudo.sistema ?? '').trim(), `${peca.id}: sistema ausente`);
    assert.ok(String(peca.conteudo.subtipo ?? '').trim(), `${peca.id}: subtipo ausente`);
    assert.match(String(peca.conteudo.tier ?? ''), /^T[0-3]$/, `${peca.id}: tier não comercializável`);
  }

  const campos = [
    'Vida', 'Defesa', 'Resistência', 'deslocamento', 'Manobrabilidade', 'capacidade',
    'cobertura', 'tripulação mínima', 'sistemas ativos', 'espaços de base',
  ];
  for (const veiculo of completos) {
    for (const campo of campos) {
      assert.match(veiculo.conteudo.descricao, new RegExp(campo, 'i'), `${veiculo.id}: ${campo} ausente`);
    }
  }
});

test('criaturas comercializadas possuem ficha e listas estruturadas', () => {
  const monstros = catalogo.entradas.filter(item => item.tipo === 'monstro');
  assert.ok(monstros.length > 0);
  for (const monstro of monstros) {
    for (const campo of ['pv', 'nivel', 'vd', 'defesa', 'iniciativa']) {
      assert.ok(Number.isFinite(monstro.conteudo[campo]) && monstro.conteudo[campo] >= 0, `${monstro.id}: ${campo} inválido`);
    }
    assert.ok(String(monstro.conteudo.deslocamento ?? '').trim(), `${monstro.id}: deslocamento ausente`);
    assert.ok(monstro.conteudo.atributos && typeof monstro.conteudo.atributos === 'object', `${monstro.id}: atributos ausentes`);
    for (const campo of ['pericias', 'ataques', 'habilidades', 'loot']) {
      assert.ok(Array.isArray(monstro.conteudo[campo]), `${monstro.id}: ${campo} deve ser lista`);
    }
    assert.ok(monstro.conteudo.ataques.length > 0, `${monstro.id}: criatura sem ataque publicado`);
  }
});

test('perfil universal fica só no bestiário e na sessão, fora do balcão', () => {
  // Os perfis universais existem para o Mestre montar inimigo com números
  // prontos. Eles continuam publicados (o Bestiário e o seletor da sessão leem
  // o mesmo catálogo) e declaram `disponivelNaLoja: false`, que é o que a Loja
  // usa para não vendê-los. Quem tirar essa marca coloca "Ameaça Genérica" à
  // venda na categoria Mercenários, que foi exatamente o problema relatado.
  const universais = catalogo.entradas.filter(item => item.conteudo.categoria === 'Universal');
  assert.ok(universais.length > 0);
  for (const item of universais) {
    assert.equal(item.conteudo.disponivelNaLoja, false, `${item.id}: perfil universal não pode ir a balcão`);
  }

  const emBalcao = catalogo.entradas.filter(item => item.conteudo.disponivelNaLoja === false);
  assert.equal(emBalcao.length, universais.length, 'só perfil universal sai do balcão hoje');
});

const FUNCOES = new Set(['Guarda de local', 'Escolta', 'Tripulação', 'Ofício']);

test('todo ser contratável declara para que serve, e as quatro funções têm oferta', () => {
  // `funcao` é o que separa quem se contrata para um serviço de quem se compra
  // como fera de combate. Ela alimenta o subfiltro do balcão de Mercenários e
  // vira o papel do Aliado criado na ficha, então classe "Ajudante" sem função
  // deixa a contratação sem descrição de serviço nos dois lugares.
  const monstros = catalogo.entradas.filter(item => item.tipo === 'monstro');
  const ajudantes = monstros.filter(item => item.conteudo.classe === 'Ajudante');
  assert.ok(ajudantes.length > 0);

  for (const item of monstros) {
    if (item.conteudo.funcao === undefined) {
      assert.notEqual(item.conteudo.classe, 'Ajudante', `${item.id}: Ajudante sem funcao declarada`);
      continue;
    }
    assert.ok(FUNCOES.has(item.conteudo.funcao), `${item.id}: funcao "${item.conteudo.funcao}" fora do enum`);
    assert.notEqual(item.conteudo.disponivelNaLoja, false, `${item.id}: contratável precisa estar no balcão`);
  }

  for (const funcao of FUNCOES) {
    const ofertas = monstros.filter(item => item.conteudo.funcao === funcao);
    assert.ok(ofertas.length >= 3, `função ${funcao} tem só ${ofertas.length} contratável(is) no catálogo`);
  }

  // Guardar um lugar foi a lacuna que motivou esta leva: precisa de opção em
  // mais de uma faixa de preço, senão só um patamar de mesa consegue contratar.
  const guardas = monstros.filter(item => item.conteudo.funcao === 'Guarda de local');
  const raridadesDeGuarda = new Set(guardas.map(item => normalizar(item.conteudo.raridade)));
  assert.ok(raridadesDeGuarda.size >= 3, 'guarda de local precisa existir em pelo menos três raridades');
});

test('itens especiais publicam marcadores para busca e filtros', () => {
  const especiais = catalogo.entradas.filter(item => [
    'consumivel', 'artefato', 'fruto-eden', 'implante', 'drop',
  ].includes(item.tipo));
  for (const item of especiais) {
    assert.ok(Array.isArray(item.conteudo.atributos) || item.tipo === 'drop', `${item.id}: atributos ausentes`);
    if (item.tipo !== 'drop') assert.ok(item.conteudo.atributos.length > 0, `${item.id}: marcadores vazios`);
  }
});

test('Frutos do Éden têm escala de Relíquia, contrajogo e três níveis de poder', () => {
  const frutos = catalogo.entradas.filter(item => item.tipo === 'fruto-eden');
  assert.equal(frutos.length, 15);

  const familias = new Set(['sobrenatural', 'mutacao', 'elemental']);
  for (const fruto of frutos) {
    assert.deepEqual(
      Object.keys(fruto.conteudo.preco),
      ['Fragmentos de Estrela'],
      `${fruto.id}: Fruto deve usar Fragmentos de Estrela`,
    );
    assert.equal(normalizar(fruto.conteudo.raridade), 'reliquia da criacao');
    assert.ok(
      fruto.conteudo.atributos.some((atributo: unknown) => familias.has(normalizar(atributo))),
      `${fruto.id}: família Sobrenatural, Mutação ou Elemental ausente`,
    );
    for (const campo of ['passivo', 'tecnica', 'despertar', 'fraqueza', 'vinculo']) {
      assert.ok(String(fruto.conteudo[campo] ?? '').trim(), `${fruto.id}: ${campo} ausente`);
    }
    assert.match(fruto.conteudo.descricao, /água do mar/i, `${fruto.id}: fraqueza comum ausente`);
    assert.match(fruto.conteudo.vinculo, /único/i, `${fruto.id}: Vínculo único ausente`);
  }
});

// Achado 11 da auditoria 2026-08: `aplicacao` validado como enum fechado (o
// mesmo que plataforma/core/content_seed.py exige pra sincronizar o catálogo)
// e `pre_requisitos`, quando presente, usa a mesma estrutura tipada de Legados
// — nunca um texto solto que nenhum código consegue validar.
const APLICACOES_VALIDAS = new Set(['armas', 'armaduras', 'escudos', 'itens gerais e magicos']);

const preRequisitoValido = (item: unknown): boolean => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  const obj = item as Record<string, unknown>;
  if ('nivel_personagem' in obj) return typeof obj.nivel_personagem === 'number';
  if ('atributo' in obj) return typeof obj.atributo === 'string' && typeof obj.valor_minimo === 'number';
  if ('ou' in obj) return Array.isArray(obj.ou) && (obj.ou as unknown[]).every(preRequisitoValido);
  return false;
};

test('modificações declaram aplicacao dentro do enum e pre_requisitos tipados como Legados', () => {
  const modificacoes = catalogo.entradas.filter(item => item.tipo === 'modificacao');
  assert.ok(modificacoes.length > 0);
  let comPreRequisitoTipado = 0;
  for (const mod of modificacoes) {
    const aplicacaoNormalizada = normalizar(mod.conteudo.aplicacao);
    assert.ok(
      APLICACOES_VALIDAS.has(aplicacaoNormalizada),
      `${mod.id}: aplicacao ${JSON.stringify(mod.conteudo.aplicacao)} fora do enum`,
    );
    if (mod.conteudo.pre_requisito) {
      assert.ok(
        Array.isArray(mod.conteudo.pre_requisitos) && mod.conteudo.pre_requisitos.length > 0,
        `${mod.id}: tem pre_requisito em texto mas não tem pre_requisitos tipado`,
      );
      for (const requisito of mod.conteudo.pre_requisitos) {
        assert.ok(preRequisitoValido(requisito), `${mod.id}: pre_requisitos com formato inválido: ${JSON.stringify(requisito)}`);
      }
      comPreRequisitoTipado += 1;
    }
  }
  // As 15 modificações "marciais" com pré-requisito identificadas na auditoria.
  assert.equal(comPreRequisitoTipado, 15);
});
