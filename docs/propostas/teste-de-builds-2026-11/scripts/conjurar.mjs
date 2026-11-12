const prog = await import('file:///C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/src/services/progressaoNiveis.ts');
const sim = await import('file:///' + process.argv[2] + '/carga.mjs');
const dano = { 1: 5.5, 2: 9, 3: 10.5, 4: 18, 5: 17.5, 6: 27, 7: 24.5, 8: 36, 9: 31.5, 10: 55 };
const mana = { 1: 2, 2: 4, 3: 7, 4: 10, 5: 14, 6: 19, 7: 25, 8: 32, 9: 42, 10: 55 };
const armaRef = { 1: 8, 5: 12, 10: 20.5, 15: 29, 20: 30 };
console.log('N | círculo máx | teste d20+ | DT | chance % | dano esperado/turno (magia, sem mod) | turnos de Mana | arma ref/turno (95%)');
for (const n of [1, 5, 10, 15, 20]) {
  const r = sim.simular({ nome: 'c', raca: 'elfo', principal: 'fluxo', classes: [{ id: 'canalizador', nivel: n }] });
  const fluxo = 15 + Math.ceil(prog.aumentosAtributoPorNivel(n) * 2 / 3);
  const mod = Math.floor((fluxo - 10) / 2);
  const grau = [0, 2, 4, 6, 8, 10, 12][prog.indiceDoMaiorGrauPorNivel(n)];
  for (const c of [r.magia.circulo, Math.max(1, r.magia.circulo - 2)]) {
    const bonus = mod + Math.floor(n / 2) + grau;
    const dt = 7 + 3 * c;
    const ch = Math.min(0.95, Math.max(0.05, (21 - (dt - bonus)) / 20));
    console.log([n, c, bonus, dt, Math.round(ch * 100), (ch * (dano[c] + mod)).toFixed(1), Math.floor(r.mana / mana[c]), (0.95 * armaRef[n]).toFixed(1)].join(' | '));
  }
}
