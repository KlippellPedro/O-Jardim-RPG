// Simulador de carga e números de personagens. Roda com o carregador TS do projeto:
// node --import ./tests/frontend/registerTsLoader.mjs <este arquivo>
import fs from 'node:fs';
import path from 'node:path';
const ROOT = 'C:/D.E.V/T.D.S/Diversos/RPG/Pessoais/O-Jardim-RPG';
const u = (p) => 'file:///' + path.join(ROOT, p).replace(/\\/g, '/');
const { CLASSES_CATALOGO, RACAS_CATALOGO } = await import(u('src/services/catalogoService.ts'));
const calc = await import(u('src/services/calculoService.ts'));
const prog = await import(u('src/services/progressaoNiveis.ts'));
const pfs = await import(u('src/services/progressaoFichaService.ts'));
const mag = await import(u('src/services/progressaoMagiaClasse.ts'));
const curva = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/regras/curva-criatura-v1.json'), 'utf8'));
const OUT = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'));

const CL = new Map(CLASSES_CATALOGO.map((c) => [c.id, c]));
const RA = new Map(RACAS_CATALOGO.map((r) => [r.id, r]));

// ---------- classificação de ação ----------
function tipoAcao(acao) {
  const a = String(acao || '').toLowerCase();
  if (!a) return 'indefinido';
  if (/^passiv/.test(a)) return 'passivo';
  if (/^rea[cç]/.test(a)) return 'reacao';
  if (/^a[cç][aã]o livre/.test(a)) return 'livre';
  if (/^a[cç][aã]o (padr|complet|de movimento)/.test(a)) return 'acao';
  if (/descanso|oficina|minuto|hora|fora de combate|preparo|recado|balc|empresa|rito|dizer o nome|entregue/.test(a)) return 'fora';
  return 'outro';
}
const USO_RE = /(uma|duas|tr[eê]s|\d+)\s+vez(es)?\s+por\s+(turno|rodada|combate|cena|descanso|sess[aã]o|dia)/i;
function temContador(item) {
  const t = [item.usos, item.descricao].filter(Boolean).join(' ');
  const m = t.match(USO_RE);
  if (!m) return null;
  return /turno|rodada/i.test(m[3]) ? 'turno' : 'recurso';
}

// Peças de regra de uma classe em um nível (cada estágio vale uma peça).
function pecasDaClasse(classe, nivel) {
  const pecas = [];
  for (const h of classe.habilidades || []) {
    if (!(h.niveis || []).some((n) => n <= nivel)) continue;
    if (Array.isArray(h.estagios) && h.estagios.length) {
      for (const e of h.estagios) if ((e.nivel ?? 0) <= nivel) pecas.push({ fonte: 'hab', titulo: `${h.titulo} › ${e.titulo}`, tipo: tipoAcao(e.acao), contador: temContador(e), mana: e.custo_mana, est: e.custo_estamina });
    } else {
      pecas.push({ fonte: 'hab', titulo: h.titulo, tipo: tipoAcao(h.acao), contador: temContador(h), mana: h.custo_mana, est: h.custo_estamina });
    }
    const vagas = pfs.vagasEscolhaHabilidade(h, nivel);
    if (vagas) {
      const ops = h.opcoes || [];
      const ativas = ops.filter((o) => !['passivo', 'fora', 'indefinido'].includes(tipoAcao(o.acao))).length;
      const frac = ops.length ? ativas / ops.length : 0;
      pecas.push({ fonte: 'escolha', titulo: `${h.titulo} (${vagas} escolhas)`, n: vagas, fracAtiva: frac, tipo: 'escolha' });
    }
  }
  const vagasPoder = pfs.vagasPoderDaClasse(classe, Math.min(nivel, 20));
  if (vagasPoder) {
    const ps = classe.poderes || [];
    const ativos = ps.filter((p) => !['passivo', 'fora', 'indefinido'].includes(tipoAcao(p.acao))).length;
    pecas.push({ fonte: 'poder', titulo: `Poderes (${vagasPoder})`, n: vagasPoder, fracAtiva: ps.length ? ativos / ps.length : 0, catalogo: ps.length, tipo: 'escolha' });
  }
  return pecas;
}

function magiaDaClasse(classe, nivel) {
  const linhas = mag.linhasDeMagiaDaClasse(classe).filter((l) => l.nivel <= nivel);
  const l = linhas[linhas.length - 1];
  if (!l) return { magias: 0, selos: 0, enc: 0, rit: 0, circulo: 0 };
  return { magias: l.vagasMagia || 0, selos: l.vagasSelos || 0, enc: l.vagasEncantamentos || 0, rit: l.vagasRituais || 0, circulo: l.circulo || 0 };
}

function tracosRaciais(raca, nivel) {
  if (!raca) return [];
  const variante = (raca.variantes || [])[0];
  const lista = [...(raca.caracteristicas || []), ...((variante && variante.caracteristicas) || [])];
  for (const e of raca.estagios || []) if ((e.nivel_minimo ?? 1) <= nivel) lista.push(...(e.caracteristicas || []));
  return lista.filter((t) => (t.nivel_minimo ?? 1) <= nivel).map((t) => ({
    titulo: t.titulo,
    ativo: ['acao', 'reacao', 'acao_completa', 'movimento'].includes(t.tipo),
    contador: t.usos ? 'recurso' : null,
  }));
}

// Atributos: conjunto padrão com o principal em 15 e aumentos no principal/Con.
function atributosDaBuild(principal, nivel, secundario = 'constituicao') {
  const base = { forca: 10, destreza: 12, constituicao: 14, inteligencia: 8, sabedoria: 12, carisma: 8, fluxo: 13 };
  const at = { ...base };
  at[principal] = 15; at[secundario] = Math.max(at[secundario], 14);
  const aum = prog.aumentosAtributoPorNivel(nivel);
  for (let i = 0; i < aum; i++) at[i % 3 === 2 ? secundario : principal] += 1;
  return at;
}

export function simular(build) {
  const nivel = build.classes.reduce((t, c) => t + c.nivel, 0);
  const raca = RA.get(build.raca) || null;
  const at = atributosDaBuild(build.principal, nivel, build.secundario);
  const der = calc.calcularDerivadosComClasses(at, raca, build.classes.map((c) => ({ classeId: c.id, nivel: c.nivel })), CLASSES_CATALOGO, null, {});
  let pecas = [];
  let magia = { magias: 0, selos: 0, enc: 0, rit: 0, circulo: 0 };
  for (const c of build.classes) {
    const cl = CL.get(c.id);
    pecas.push(...pecasDaClasse(cl, c.nivel).map((p) => ({ ...p, classe: cl.titulo })));
    const m = magiaDaClasse(cl, c.nivel);
    magia = { magias: magia.magias + m.magias, selos: magia.selos + m.selos, enc: magia.enc + m.enc, rit: magia.rit + m.rit, circulo: Math.max(magia.circulo, m.circulo) };
  }
  const racial = tracosRaciais(raca, nivel);
  const legados = prog.legadosPorNivel(nivel) + Number(raca?.legados_adicionais || 0);
  // Contagem
  let regras = 0, ativas = 0, reacoesLivres = 0, contTurno = 0, contRecurso = 0;
  for (const p of pecas) {
    if (p.tipo === 'escolha') { regras += p.n; ativas += p.n * p.fracAtiva; continue; }
    regras += 1;
    if (['acao', 'outro'].includes(p.tipo)) ativas += 1;
    if (['reacao', 'livre'].includes(p.tipo)) { ativas += 1; reacoesLivres += 1; }
    if (p.contador === 'turno') contTurno += 1;
    if (p.contador === 'recurso') contRecurso += 1;
  }
  const racAtivas = racial.filter((t) => t.ativo).length;
  const totalRegras = regras + racial.length + legados + magia.magias + magia.selos + magia.enc;
  const opcoesAtivasCombate = ativas + racAtivas + magia.magias + legados * 0.4; // ~40% dos legados pedem decisão
  const linha = curva.linhas[Math.min(curva.linhas.length, Math.max(1, nivel)) - 1];
  return {
    nome: build.nome, nivel, raca: raca?.titulo, classes: build.classes.map((c) => `${CL.get(c.id).titulo} ${c.nivel}`).join(' / '),
    vida: der.vida, mana: der.mana, estamina: der.estamina, defesa: der.defesaNatural,
    vidaCurva: linha[3], ataqueCurva: linha[1], defesaCurva: linha[2],
    regrasClasse: Math.round(regras), racial: racial.length, legados, magia,
    totalRegras: Math.round(totalRegras), opcoesAtivas: Math.round(opcoesAtivasCombate), reacoesLivres, contTurno, contRecurso: contRecurso + racial.filter((t) => t.contador).length,
    pecas,
  };
}

export { CLASSES_CATALOGO, RACAS_CATALOGO, pecasDaClasse, magiaDaClasse, tipoAcao, OUT };
