// Chance do inimigo do mesmo nível acertar o personagem, com a escala de
// armaduras atual do catálogo e a raridade por encomenda (+0 a +4 de Defesa por
// peça). Rodar da raiz:
// node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/teste-de-builds-2026-11/scripts/acerto-escala.mjs
import fs from 'node:fs';
const ROOT = new URL('../../../../', import.meta.url);
const cm = await import(new URL('src/services/curvaCriatura.ts', ROOT).href);
const curva = JSON.parse(fs.readFileSync(new URL('data/regras/curva-criatura-v1.json', ROOT), 'utf8'));
const L = new Map(curva.linhas.map((l) => [l[0], l]));
const cat = JSON.parse(fs.readFileSync(new URL('data/loja/catalogo.json', ROOT), 'utf8')).entradas.filter((e) => e.tipo === 'armadura');
const bonus = (e) => Number(String(e.conteudo.bonus ?? '').match(/[+-]?\d+/)?.[0] ?? NaN);
const modelos = (tipo, nivel = 999) => cat.filter((e) => e.conteudo.categoria_protecao === tipo && e.conteudo.raridade !== 'reliquia da criacao' && (e.conteudo.requisitoNivel ?? 1) <= nivel).map(bonus).filter(Number.isFinite).sort((a, b) => a - b);
// Modelos da raridade mais alta que o nível já libera.
const daFaixa = (tipo, nivel) => {
  const livres = cat.filter((e) => e.conteudo.categoria_protecao === tipo && e.conteudo.raridade !== 'reliquia da criacao' && (e.conteudo.requisitoNivel ?? 1) <= nivel);
  const topo = Math.max(...livres.map((e) => e.conteudo.requisitoNivel ?? 1));
  return livres.filter((e) => (e.conteudo.requisitoNivel ?? 1) === topo).map(bonus).filter((v) => v > 0).sort((a, b) => a - b);
};
const reliquias = (tipo) => cat.filter((e) => e.conteudo.categoria_protecao === tipo && e.conteudo.raridade === 'reliquia da criacao').map(bonus);
const arm = modelos('armadura');
const esc = modelos('escudo');
const mediana = (a) => a[Math.floor(a.length / 2)];
// Raridade que o nível costuma pagar (a mesma tabela da referência de balanceamento).
const tier = (n) => (n >= 25 ? 4 : n >= 15 ? 3 : n >= 10 ? 2 : n >= 5 ? 1 : 0);
const p = (atk, def) => Math.round(100 * Math.min(0.95, Math.max(0.05, (21 - (def - atk)) / 20)));
console.log(`Modelos: armadura ${arm[0]} a ${arm.at(-1)} (mediana ${mediana(arm)}), escudo ${esc[0]} a ${esc.at(-1)} (mediana ${mediana(esc)}); Relíquias: armadura até ${Math.max(...reliquias('armadura'))}, escudo até ${Math.max(...reliquias('escudo'))}`);
console.log('| Nível | Sem armadura | Armadura típica | Melhor armadura + escudo, sem raridade | Melhor armadura + escudo, com raridade | Chefe contra a melhor |');
console.log('| ---: | ---: | ---: | ---: | ---: | ---: |');
for (const n of [1, 5, 10, 15, 20, 25, 30, 40, 50, 60]) {
  const dn = L.get(n)[2];
  const atk = Number(cm.modeloDeCriatura(n, 'padrao').pericias[0].match(/[+-]\d+/)[0]);
  const che = Number(cm.modeloDeCriatura(n, 'chefe').pericias[0].match(/[+-]\d+/)[0]);
  const t = tier(n);
  const armN = modelos('armadura', n);
  const escN = modelos('escudo', n);
  const tipica = dn + mediana(daFaixa('armadura', n)) + t;
  const semRaridade = dn + armN.at(-1) + escN.at(-1);
  const melhor = semRaridade + 2 * t;
  console.log(`| ${n} | ${p(atk, dn)}% | ${p(atk, tipica)}% | ${p(atk, semRaridade)}% | ${p(atk, melhor)}% | ${p(che, melhor)}% |`);
}
