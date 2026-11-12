import fs from 'node:fs';
const cm = await import('file:///C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/src/services/curvaCriatura.ts');
const curva = JSON.parse(fs.readFileSync('C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/data/regras/curva-criatura-v1.json','utf8'));
const L = new Map(curva.linhas.map(l => [l[0], l]));
const cat = JSON.parse(fs.readFileSync('C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG/data/loja/catalogo.json','utf8')).entradas.filter(e => e.tipo==='armadura');
const NIV = { comum: 1, incomum: 5, raro: 10, epico: 15, lendario: 25, 'reliquia da criacao': 35 };
const med = a => { a = a.sort((x,y)=>x-y); return a[Math.floor(a.length/2)] || 0; };
function arm(n, cat_, modo) {
  const ok = cat.filter(e => (NIV[e.conteudo.raridade] ?? 99) <= n && e.conteudo.categoria_protecao === cat_ && e.conteudo.raridade !== 'reliquia da criacao').map(e => Number(String(e.conteudo.bonus||'0').replace('+',''))||0);
  if (!ok.length) return 0;
  // mediana da melhor raridade alcançada, ou o máximo
  const best = Math.max(...ok);
  if (modo === 'max') return best;
  const rar = Object.entries(NIV).filter(([r, v]) => v <= n && r !== 'reliquia da criacao').map(([r]) => r).pop();
  return med(cat.filter(e => e.conteudo.raridade === rar && e.conteudo.categoria_protecao === cat_).map(e => Number(String(e.conteudo.bonus||'0').replace('+',''))||0));
}
const p = (atk, def) => Math.round(100 * Math.min(0.95, Math.max(0.05, (21 - (def - atk)) / 20)));
console.log('N | PC atk | def criatura padrão | PC acerta % | atk padrão / chefe | Def PC natural | +armadura típica | +armadura+escudo máx | padrão acerta nat/típ/máx % | chefe acerta máx %');
for (const n of [1,3,5,8,10,12,15,18,20,25,30,35,40,50,60]) {
  const l = L.get(n); const pad = cm.modeloDeCriatura(n,'padrao'); const che = cm.modeloDeCriatura(n,'chefe');
  const atkPad = Number(pad.pericias[0].match(/[+-]\d+/)[0]); const atkChe = Number(che.pericias[0].match(/[+-]\d+/)[0]);
  const dn = l[2]; const dt = dn + arm(n,'armadura','med'); const dm = dn + arm(n,'armadura','max') + arm(n,'escudo','max');
  console.log([n, l[1], pad.defesa, p(l[1], pad.defesa), `${atkPad}/${atkChe}`, dn, dt, dm, `${p(atkPad,dn)}/${p(atkPad,dt)}/${p(atkPad,dm)}`, p(atkChe, dm)].join(' | '));
}
