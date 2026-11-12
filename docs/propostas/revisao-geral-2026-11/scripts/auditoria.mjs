// Auditoria geral de carga e balanço (revisão de 2026-11-12). Só lê os dados.
// Rodar da raiz:
// node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/revisao-geral-2026-11/scripts/auditoria.mjs
import fs from 'node:fs';

const R = new URL('../../../../', import.meta.url);
const ler = (caminho) => JSON.parse(fs.readFileSync(new URL(caminho, R), 'utf8'));
const lista = (valor) => (Array.isArray(valor) ? valor : Object.values(valor).find(Array.isArray) ?? []);
const classes = ler('data/ficha/classes.json');
const racas = lista(ler('data/ficha/racas.json'));
const legados = lista(ler('data/ficha/legados.json'));
const pericias = ler('data/ficha/pericias.json').pericias;
const magias = ler('data/ficha/magias.json');
const progressao = ler('data/ficha/progressao-niveis.json');
const catalogo = ler('data/loja/catalogo.json').entradas;
const { CONDICOES_OFICIAIS, CRISES_SANIDADE } = await import(new URL('data/regras/condicoes.ts', R).href);
const longo = await import(new URL('data/regras/condicoes-longo-prazo.ts', R).href);
const aflicoes = await import(new URL('data/regras/aflicoes.ts', R).href);
const calc = await import(new URL('src/services/calculoService.ts', R).href);
const prog = await import(new URL('src/services/progressaoNiveis.ts', R).href);
const curva = ler('data/regras/curva-criatura-v1.json');
const L = new Map(curva.linhas.map((l) => [l[0], Object.fromEntries(curva.colunas.map((c, i) => [c, l[i]]))]));

const saida = [];
const linha = (texto = '') => saida.push(texto);
const contar = (itens) => itens.reduce((m, k) => (m.set(k, (m.get(k) || 0) + 1), m), new Map());
const topo = (mapa, n = 12) => [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

// 1. Textos de ação e janelas de uso
const pecas = [];
for (const c of classes) {
  for (const h of c.habilidades || []) {
    pecas.push(h);
    for (const e of h.estagios || []) pecas.push(e);
    for (const o of h.opcoes || []) pecas.push(o);
  }
  for (const p of c.poderes || []) pecas.push(p);
}
const acoes = contar(pecas.map((p) => String(p.acao || '').trim()).filter(Boolean));
linha('## Textos de ação');
linha(`${acoes.size} textos diferentes de "acao" em ${pecas.length} peças de classe.`);
linha(`Os 12 mais comuns: ${topo(acoes).map(([k, v]) => `${k} (${v})`).join('; ')}`);
const raros = [...acoes.entries()].filter(([, v]) => v === 1).map(([k]) => k);
linha(`Usados uma vez só: ${raros.length}. Exemplos: ${raros.slice(0, 10).join(' | ')}`);

const janelaRe = /vez(?:es)?\s+por\s+(turno|rodada|cena|combate|descanso(?:\s+longo|\s+curto)?|sess[aã]o|dia|rito|semana|m[eê]s|aventura|ato|cap[ií]tulo)/gi;
const janelas = new Map();
for (const p of pecas) {
  const texto = `${p.usos || ''} ${p.descricao || ''}`;
  for (const m of texto.matchAll(janelaRe)) janelas.set(m[1].toLowerCase(), (janelas.get(m[1].toLowerCase()) || 0) + 1);
}
for (const r of racas) {
  const texto = JSON.stringify(r);
  for (const m of texto.matchAll(janelaRe)) janelas.set(m[1].toLowerCase(), (janelas.get(m[1].toLowerCase()) || 0) + 1);
}
linha();
linha('## Janelas de uso (classes e raças)');
linha(topo(janelas, 20).map(([k, v]) => `${k}: ${v}`).join(' | '));

// 2. Condições
linha();
linha('## Condições');
const listas = {
  oficiais: CONDICOES_OFICIAIS.length,
  crisesDeSanidade: CRISES_SANIDADE.length,
  longoPrazo: longo.CONDICOES_LONGO_PRAZO.length,
  aflicoes: aflicoes.CATALOGO_AFLICOES.length,
};
linha(Object.entries(listas).map(([k, v]) => `${k} ${v}`).join(' | '));
const gravidade = contar(CONDICOES_OFICIAIS.map((c) => c.categoria || '?'));
linha(`Oficiais por categoria: ${topo(gravidade, 20).map(([k, v]) => `${k} ${v}`).join(', ')}`);

// 3. Perícias e graus
linha();
linha('## Perícias e graus');
linha(`${pericias.length} perícias; ${calc.GRAUS_PERICIA.length} graus (${calc.GRAUS_PERICIA.join(', ')}).`);

// 4. Raças
linha();
linha('## Raças');
const camposEscolha = ['variantes', 'linhagens', 'condicoes_ancestrais', 'naturezas_divinas', 'naturezas', 'morfologias', 'estagios', 'escolha_atributos', 'fragmentos', 'modificacoes', 'clas', 'formas'];
const porRaca = racas.map((r) => {
  const tracos = [];
  const andar = (v) => { if (Array.isArray(v)) v.forEach(andar); else if (v && typeof v === 'object') { if (v.titulo && v.descricao && v.tipo) tracos.push(v); Object.values(v).forEach(andar); } };
  andar(r.caracteristicas);
  const escolhas = camposEscolha.filter((k) => r[k] && (Array.isArray(r[k]) ? r[k].length : true));
  return { id: r.id, tracos: (r.caracteristicas || []).length, escolhas, total: JSON.stringify(r).length };
});
linha(`${racas.length} raças. Traços fixos por raça: mediana ${porRaca.map((r) => r.tracos).sort((a, b) => a - b)[Math.floor(porRaca.length / 2)]}, máximo ${Math.max(...porRaca.map((r) => r.tracos))}.`);
linha(`Raças com 2+ camadas de escolha na criação: ${porRaca.filter((r) => r.escolhas.length >= 2).map((r) => `${r.id} (${r.escolhas.join('+')})`).join('; ')}`);
linha(`As 6 maiores em texto: ${[...porRaca].sort((a, b) => b.total - a.total).slice(0, 6).map((r) => `${r.id} ${Math.round(r.total / 1000)}k`).join(', ')}`);

// 5. Legados
linha();
linha('## Legados');
const pequenos = legados.filter((l) => /^(receba|ganhe|você recebe|você ganha)?\s*\+?[12]\b|\+1 em|\+2 em|\+1 de|\+2 de/i.test(l.descricao || '') && (l.descricao || '').length < 160);
linha(`${legados.length} Legados, ${prog.legadosPorNivel(60)} escolhidos até o nível 60. Curtos com bônus de +1/+2: ${pequenos.length} (${pequenos.slice(0, 12).map((l) => l.titulo).join(', ')}).`);

// 6. Moedas e recursos
linha();
linha('## Moedas');
const moedas = contar(catalogo.flatMap((e) => Object.keys(e.conteudo?.preco || {})));
linha([...moedas.entries()].map(([k, v]) => `${k} (${v} itens)`).join(' | '));
const tipos = contar(catalogo.map((e) => e.tipo));
linha(`Catálogo: ${catalogo.length} entradas em ${tipos.size} tipos: ${topo(tipos, 30).map(([k, v]) => `${k} ${v}`).join(', ')}`);

// 7. Magias
linha();
linha('## Magias');
linha(`${magias.magias.length} magias, ${(magias.rituais || []).length} rituais, ${(magias.selos || []).length} selos, ${(magias.encantamentos || []).length} encantamentos.`);

// 8. Testes e resistências pelo nível (personagem de referência)
linha();
linha('## Chance nos testes (d20 + metade do nível + mod + grau, contra a DT do Guia)');
linha('| Nível | DT padrão | Investido (mod +3..+6, maior grau) | Treinado (mod +2, 2 graus abaixo) | Sem treino (mod +1) | Resistir à DT padrão de criatura (investido / sem treino) |');
linha('| ---: | ---: | ---: | ---: | ---: | ---: |');
const p = (bonus, dt) => Math.round(100 * Math.min(0.95, Math.max(0.05, (21 - (dt - bonus)) / 20)));
for (const n of [1, 5, 10, 20, 30, 40, 60]) {
  const dt = 15 + Math.floor(n / 2);
  const i = prog.indiceDoMaiorGrauPorNivel(n);
  const mod = calc.modificador(15 + Math.ceil(prog.aumentosAtributoPorNivel(n) * 2 / 3));
  const grau = (k) => calc.BONUS_GRAU[calc.GRAUS_PERICIA[Math.max(0, k)]];
  const inv = Math.floor(n / 2) + mod + grau(i);
  const trein = Math.floor(n / 2) + 2 + grau(i - 2);
  const sem = Math.floor(n / 2) + 1;
  const dtCriatura = 15 + Math.floor(n / 2);
  linha(`| ${n} | ${dt} | ${p(inv, dt)}% | ${p(trein, dt)}% | ${p(sem, dt)}% | ${p(inv, dtCriatura)}% / ${p(sem, dtCriatura)}% |`);
}

// 9. Defesa sem armadura e magia de efeito, contra a criatura do mesmo nível
linha();
linha('## Sem armadura e magia de efeito');
linha('| Nível | Inimigo padrão acerta quem está sem armadura | Magia de efeito: criatura resiste (rolagem contra rolagem, bônus iguais) |');
linha('| ---: | ---: | ---: |');
for (const n of [1, 10, 15, 20, 40, 60]) {
  const l = L.get(n);
  const golpe = l.ataque - 2 + (l.ajusteDeArmadura || 0);
  linha(`| ${n} | ${p(golpe, l.defesaNatural)}% | perto de 50% |`);
}
const destino = new URL('docs/propostas/revisao-geral-2026-11/auditoria.md', R);
fs.writeFileSync(destino, `# Auditoria geral (gerada)\n\nGerado por \`scripts/auditoria.mjs\`. Não edite à mão.\n\n${saida.join('\n')}\n`, 'utf8');
console.log(saida.join('\n'));
