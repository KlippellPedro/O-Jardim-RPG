const m = await import('file:///' + process.argv[2] + '/carga.mjs');
const niveis = [1, 3, 5, 10, 15, 20];
const rows = [];
for (const c of m.CLASSES_CATALOGO) {
  const r = niveis.map((n) => m.simular({ nome: c.id, raca: 'humano', principal: 'forca', classes: [{ id: c.id, nivel: n }] }));
  rows.push([c.id.padEnd(22), ...r.map((x) => `${String(x.totalRegras).padStart(3)}/${String(x.opcoesAtivas).padStart(2)}/${x.reacoesLivres}`)].join(' | '));
}
console.log('classe'.padEnd(22), '| ' + niveis.map((n) => ('N' + n + ' tot/ativ/reac').padEnd(10)).join(' | '));
console.log(rows.join('\n'));
