import fs from 'node:fs';
const m = await import('file:///' + process.argv[2] + '/carga.mjs');
const cm = await import('file:///C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/src/services/curvaCriatura.ts');
const B = (nome, raca, principal, classes, secundario) => ({ nome, raca, principal, secundario, classes: classes.map(([id, nivel]) => ({ id, nivel })) });
const builds = [
  B('Tanque iniciante', 'anao', 'forca', [['guerreiro', 1]]),
  B('Maga iniciante', 'elfo', 'fluxo', [['canalizador', 1]]),
  B('Mercador iniciante', 'goblim', 'carisma', [['comerciante', 1]]),
  B('Duelista N5', 'humano', 'destreza', [['espadachim', 5]]),
  B('Médica N5', 'feerico', 'sabedoria', [['medico', 5]]),
  B('Sintonizador N5', 'humano', 'fluxo', [['sintonizador', 5]]),
  B('Ninja N10', 'vampiro', 'destreza', [['ninja', 10]]),
  B('Atirador N10', 'humano', 'destreza', [['atirador', 10]]),
  B('Alquimista N10', 'slime', 'inteligencia', [['alquimista', 10]]),
  B('Guardião N15', 'golem', 'constituicao', [['guardiao', 15]], 'forca'),
  B('Engenheiro N15', 'automato', 'inteligencia', [['engenheiro', 15]]),
  B('Guerreiro N20', 'gigante', 'forca', [['guerreiro', 20]]),
  B('Canalizador N20', 'elfo', 'fluxo', [['canalizador', 20]]),
  B('Sintonizador N20', 'humano', 'fluxo', [['sintonizador', 20]]),
  B('Guerreiro20+Médico10', 'humano', 'forca', [['guerreiro', 20], ['medico', 10]]),
  B('Canal20+Invocador10', 'elfo', 'fluxo', [['canalizador', 20], ['invocador', 10]]),
  B('Espadachim20+Ninja20', 'humano', 'destreza', [['espadachim', 20], ['ninja', 20]]),
  B('Canal20+Sinton20 (pior caso)', 'elfo', 'fluxo', [['canalizador', 20], ['sintonizador', 20]]),
  B('Padrão 60: Guer/Guard/Campeão', 'humano', 'forca', [['guerreiro', 20], ['guardiao', 20], ['campeao-dimensional', 20]]),
  B('Padrão 60: Canal/Sinton/Element', 'elfo', 'fluxo', [['canalizador', 20], ['sintonizador', 20], ['elementarista', 20]]),
  B('Padrão 60: Ninja50+Devorador10', 'humano', 'destreza', [['ninja', 50], ['devorador', 10]]),
  B('N100: cinco classes no 20', 'humano', 'forca', [['guerreiro', 20], ['espadachim', 20], ['lutador', 20], ['guardiao', 20], ['campeao-dimensional', 20]]),
];
const out = [];
const kits = [];
for (const b of builds) {
  const r = m.simular(b);
  const cri = cm.modeloDeCriatura(Math.max(1, r.nivel), 'padrao');
  const chefe = cm.modeloDeCriatura(Math.max(1, r.nivel), 'chefe');
  const chanceCri = Math.min(0.95, Math.max(0.05, (21 - (r.defesa - cri.ataques.length * 0 - 0) + (cri.pericias[0].match(/[+-]\d+/) ? Number(cri.pericias[0].match(/[+-]\d+/)[0]) : 0)) / 20));
  const golpesParaCair = Math.ceil(r.vida / cri.danoMedio);
  out.push({ ...r, pecas: undefined, criDano: cri.danoMedio, criAtaque: cri.pericias[0], chefeDano: chefe.danoMedio, chefeAnunciado: chefe.golpeAnunciadoMedio, golpesParaCair, chanceCri: Math.round(chanceCri * 100) });
  kits.push(`\n## ${b.nome} (N${r.nivel}, ${r.raca}, ${r.classes})\n` + r.pecas.map((p) => `- [${p.tipo}${p.contador ? ',' + p.contador : ''}] ${p.classe}: ${p.titulo}${p.fracAtiva !== undefined ? ` (~${Math.round(p.fracAtiva * 100)}% do catálogo é ativo)` : ''}`).join('\n'));
}
console.log('nome | N | Vida(curva) | Mana | Est | Def(curva) | regras total | ativas | reações/livres | contadores turno/recurso | magias/selos | legados | golpes de inimigo padrão p/ cair | acerto do padrão %');
for (const r of out) console.log([r.nome, r.nivel, `${r.vida}(${r.vidaCurva})`, r.mana, r.estamina, `${r.defesa}(${r.defesaCurva})`, r.totalRegras, r.opcoesAtivas, r.reacoesLivres, `${r.contTurno}/${r.contRecurso}`, `${r.magia.magias}/${r.magia.selos}`, r.legados, r.golpesParaCair, r.chanceCri].join(' | '));
fs.writeFileSync(process.argv[2] + '/kits.md', kits.join('\n'));
fs.writeFileSync(process.argv[2] + '/builds.json', JSON.stringify(out, null, 1));
