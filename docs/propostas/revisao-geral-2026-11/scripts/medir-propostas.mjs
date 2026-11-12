// Mede as quatro propostas de balanceamento da revisão geral depois de aplicadas.
// Rodar da raiz:
// node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/revisao-geral-2026-11/scripts/medir-propostas.mjs
import fs from 'node:fs';

const R = new URL('../../../../', import.meta.url);
const ler = (caminho) => JSON.parse(fs.readFileSync(new URL(caminho, R), 'utf8'));
const cm = await import(new URL('src/services/curvaCriatura.ts', R).href);
const calc = await import(new URL('src/services/calculoService.ts', R).href);
const prog = await import(new URL('src/services/progressaoNiveis.ts', R).href);
const { defesaSemArmadura } = await import(new URL('src/services/defesaSemArmadura.ts', R).href);
const inv = await import(new URL('src/services/invocacoesService.ts', R).href);
const curva = ler('data/regras/curva-criatura-v1.json');
const L = new Map(curva.linhas.map((l) => [l[0], Object.fromEntries(curva.colunas.map((c, i) => [c, l[i]]))]));
const catalogo = ler('data/loja/catalogo.json').entradas.filter((e) => e.tipo === 'armadura');

const p = (bonus, alvo) => Math.round(100 * Math.min(0.95, Math.max(0.05, (21 - (alvo - bonus)) / 20)));
const bonusDe = (e) => Number(String(e.conteudo.bonus ?? '').match(/[+-]?\d+/)?.[0] ?? NaN);
const tier = (n) => (n >= 25 ? 4 : n >= 15 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0);
const melhor = (tipo, n) => Math.max(...catalogo
  .filter((e) => e.conteudo.categoria_protecao === tipo && e.conteudo.raridade !== 'reliquia da criacao' && (e.conteudo.requisitoNivel ?? 1) <= n)
  .map(bonusDe).filter(Number.isFinite));
const golpePadrao = (n) => Number(cm.modeloDeCriatura(n, 'padrao').pericias[0].match(/[+-]\d+/)[0]);
const golpeChefe = (n) => Number(cm.modeloDeCriatura(n, 'chefe').pericias[0].match(/[+-]\d+/)[0]);
const NIVEIS = [1, 5, 10, 15, 20, 25, 40, 60];

console.log('## 1. Inimigo padrão do mesmo nível acertando');
console.log('| Nível | Sem armadura | Lutador com Guarda Aberta | Armadura típica | Melhor armadura + escudo, raridade alta | Chefe contra essa defesa |');
console.log('| ---: | ---: | ---: | ---: | ---: | ---: |');
for (const n of NIVEIS) {
  const dn = L.get(n).defesaNatural;
  const t = tier(n);
  const tanque = dn + melhor('armadura', n) + t + melhor('escudo', n) + Math.floor(t / 2);
  console.log(`| ${n} | ${p(golpePadrao(n), dn)}% | ${p(golpePadrao(n), dn + defesaSemArmadura(n))}% | ${p(golpePadrao(n), dn + defesaSemArmadura(n))}% | ${p(golpePadrao(n), tanque)}% | ${p(golpeChefe(n), tanque)}% |`);
}

console.log('\n## 2. Resistir à DT de efeito da criatura do mesmo nível');
console.log('| Nível | DT (antes → agora) | Investido | Treinado (2 graus abaixo) | Sem treino |');
console.log('| ---: | ---: | ---: | ---: | ---: |');
const grau = (k) => calc.BONUS_GRAU[calc.GRAUS_PERICIA[Math.max(0, k)]];
for (const n of NIVEIS) {
  const i = prog.indiceDoMaiorGrauPorNivel(n);
  const mod = calc.modificador(15 + Math.ceil(prog.aumentosAtributoPorNivel(n) * 2 / 3));
  const h = Math.floor(n / 2);
  const dt = cm.dtPadraoDoVd(n);
  console.log(`| ${n} | ${15 + h} → ${dt} | ${p(h + mod + grau(i), dt)}% | ${p(h + 2 + grau(i - 2), dt)}% | ${p(h + 1, dt)}% |`);
}

console.log('\n## 3. Inimigo padrão acertando a invocação (Invocador do nível total)');
const ids = ['cacador-de-feras', 'colosso-de-ferro'];
const cat = inv.catalogoDeInvocacoes();
console.log('| Nível total | Degrau | Caçador de Feras (antes → agora) | Colosso de Ferro (antes → agora) |');
console.log('| ---: | ---: | ---: | ---: |');
for (const n of NIVEIS) {
  const degrau = n >= 20 ? 5 : n >= 15 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : 1;
  const nivelInvocador = Math.min(n, 50);
  const celulas = ids.map((linha) => {
    const ficha = cat.find((item) => item.id === `${linha}-${degrau}`);
    const antes = ficha.defesa + Math.floor(Math.max(0, nivelInvocador - 20) / 5);
    const agora = inv.defesaDaInvocacao(ficha, n);
    return `${p(golpePadrao(n), antes)}% → ${p(golpePadrao(n), agora)}%`;
  });
  console.log(`| ${n} | ${degrau} | ${celulas.join(' | ')} |`);
}
