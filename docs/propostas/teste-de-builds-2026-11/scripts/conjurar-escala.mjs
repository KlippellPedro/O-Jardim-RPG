// Conjurador contra a arma de referência, com a DT e a Defesa das criaturas
// atuais. Rodar da raiz:
// node --import ./tests/frontend/registerTsLoader.mjs docs/propostas/teste-de-builds-2026-11/scripts/conjurar-escala.mjs
const R = new URL('../../../../', import.meta.url).href;
const prog = await import(R + 'src/services/progressaoNiveis.ts');
const calc = await import(R + 'src/services/calculoService.ts');
const mag = await import(R + 'src/services/magiaService.ts');
const pmc = await import(R + 'src/services/progressaoMagiaClasse.ts');
const rb = await import(R + 'src/services/referenciaBalanceamento.ts');
const { CLASSES_CATALOGO, RACAS_CATALOGO } = await import(R + 'src/services/catalogoService.ts');
const fs = await import('node:fs');
const magias = JSON.parse(fs.readFileSync(new URL('data/ficha/magias.json', R), 'utf8'));
const circulos = magias.regras?.circulos ?? magias.circulos ?? Object.values(magias.regras ?? {}).find((v) => Array.isArray(v) && v[0]?.mana_base);
const manaDoCirculo = (c) => (circulos || []).find((x) => x.circulo === c)?.mana_base ?? 0;
// Dano médio por círculo: mediana das magias de dano do catálogo (perfil alvo).
const media = (expr) => [...String(expr).matchAll(/(\d+)d(\d+)/g)].reduce((t, m) => t + Number(m[1]) * (Number(m[2]) + 1) / 2, 0)
  + [...String(expr).matchAll(/(?<![d\d])\+(\d+)/g)].reduce((t, m) => t + Number(m[1]), 0);
const danoPorCirculo = {};
for (const m of magias.magias) {
  const d = media(m.dano ?? '');
  if (d > 0 && typeof m.circulo === 'number') (danoPorCirculo[m.circulo] ??= []).push(d);
}
const mediana = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const p = (bonus, alvo) => Math.min(0.95, Math.max(0.05, (21 - (alvo - bonus)) / 20));
const cl = CLASSES_CATALOGO.find((c) => c.id === 'canalizador');
const comuns = CLASSES_CATALOGO.filter((c) => c.categoria === 'padrao');
// Dano por acerto e Vida média da referência de NPCs (gerada por npm run audit:balance).
const referencia = new Map(JSON.parse(fs.readFileSync(new URL('data/regras/balanceamento-referencia-v1.json', R), 'utf8')).referenciaNpc.map((r) => [r.nivel, r]));
const curva = JSON.parse(fs.readFileSync(new URL('data/regras/curva-criatura-v1.json', R), 'utf8'));
const L = new Map(curva.linhas.map((l) => [l[0], Object.fromEntries(curva.colunas.map((c, i) => [c, l[i]]))]));
console.log('| Nível | Círculo | Chance | Dano esperado por conjuração | Conjurações até a Mana acabar | Arma de referência por turno | Vida (Canalizador / média) |');
console.log('| ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const n of [5, 10, 15, 20, 30]) {
  const linhas = pmc.linhasDeMagiaDaClasse(cl).filter((l) => l.nivel <= n);
  const cMax = linhas[linhas.length - 1]?.circulo || 0;
  const fluxo = 15 + Math.ceil(prog.aumentosAtributoPorNivel(n) * 2 / 3);
  const mod = calc.modificador(fluxo);
  const bonus = mod + Math.floor(n / 2) + calc.BONUS_GRAU[calc.GRAUS_PERICIA[prog.indiceDoMaiorGrauPorNivel(n)]];
  const der = calc.calcularDerivadosComClasses({ forca: 10, destreza: 14, constituicao: 14, inteligencia: 10, sabedoria: 10, carisma: 8, fluxo }, null, [{ classeId: 'canalizador', nivel: Math.min(n, 50) }], CLASSES_CATALOGO, null, {});
  const ref = referencia.get(n);
  const defesa = L.get(n).defesaDeCriatura;
  for (const c of [cMax, Math.max(1, cMax - 2)]) {
    const dt = mag.dtConjuracaoPorCirculo(c);
    // Magia de ataque: a mesma rolagem passa a DT e a Defesa.
    const chance = p(bonus, Math.max(dt, defesa));
    const dano = (mediana(danoPorCirculo[c] || [0]) + mod) * chance;
    const conj = Math.floor(der.mana / Math.max(1, manaDoCirculo(c)));
    console.log(`| ${n} | ${c} | ${Math.round(chance * 100)}% | ${dano.toFixed(1)} | ${conj} | ${(rb.ACERTO_CONTRA_CRIATURA * ref.danoPorAcerto).toFixed(1)} | ${der.vida} / ${ref.vida.media} |`);
  }
}
