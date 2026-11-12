// Leva o ajuste de armadura da curva de criaturas para as fichas do Bestiário.
//
// A curva (data/regras/curva-criatura-v1.json, coluna `ajusteDeArmadura`) soma ao
// golpe da criatura, do VD 15 em diante, o que falta para o inimigo padrão acertar
// perto de 50% um personagem com a armadura típica do nível. As fichas do
// catálogo foram escritas (ou geradas e refinadas à mão) antes disso, então este
// script soma o ajuste só onde ele vale:
//   - no bônus do começo de cada `ataques[].detalhe` ("+26, 3d10+7 fogo");
//   - nas perícias de golpe (Luta e Pontaria).
// Testes de resistência, Percepção, Defesa, dano e DTs não mudam.
//
// Cada ficha guarda em `ajusteDeAtaqueArmadura` quanto já recebeu. Rodar de novo
// só aplica a diferença; se a curva mudar, o script acompanha.
//
// Uso: node --import ./tests/frontend/registerTsLoader.mjs tools/ajustar-ataque-bestiario.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogoPath = process.env.BESTIARIO_CATALOGO ?? path.join(root, 'data', 'loja', 'catalogo.json');
const check = process.argv.includes('--check');
const { ajusteDeArmaduraDoVd, PERICIAS_DE_GOLPE } = await import('../src/services/curvaCriatura.ts');

const sinal = (valor) => (valor >= 0 ? `+${valor}` : String(valor));
const BONUS_NO_INICIO = /^([+-]\d+)(,.*)$/s;
const BONUS_NO_FIM = /^(.*?)([+-]\d+)\s*$/;

const original = fs.readFileSync(catalogoPath, 'utf8');
const catalogo = JSON.parse(original);
let mudadas = 0;
let golpes = 0;

for (const entrada of catalogo.entradas || []) {
  if (entrada.tipo !== 'monstro') continue;
  const conteudo = entrada.conteudo || {};
  const vd = Number(conteudo.vd ?? conteudo.nivel);
  if (!Number.isFinite(vd) || vd < 1) continue;
  const alvo = ajusteDeArmaduraDoVd(vd);
  const aplicado = Number(conteudo.ajusteDeAtaqueArmadura ?? 0) || 0;
  const delta = alvo - aplicado;
  if (delta === 0) continue;
  mudadas += 1;
  conteudo.ataques = (conteudo.ataques || []).map((ataque) => {
    const partes = String(ataque?.detalhe ?? '').match(BONUS_NO_INICIO);
    if (!partes) return ataque;
    golpes += 1;
    return { ...ataque, detalhe: `${sinal(Number(partes[1]) + delta)}${partes[2]}` };
  });
  conteudo.pericias = (conteudo.pericias || []).map((pericia) => {
    const partes = String(pericia).match(BONUS_NO_FIM);
    if (!partes || !PERICIAS_DE_GOLPE.test(partes[1].trim())) return pericia;
    return `${partes[1]}${sinal(Number(partes[2]) + delta)}`;
  });
  if (alvo === 0) delete conteudo.ajusteDeAtaqueArmadura;
  else conteudo.ajusteDeAtaqueArmadura = alvo;
}

const novo = `${JSON.stringify(catalogo, null, 2)}\n`;
if (check) {
  if (novo !== original) {
    console.error(`${mudadas} criaturas sem o ajuste de armadura da curva. Rode: npm run bestiario:ajuste-armadura`);
    process.exit(1);
  }
  console.log('Bestiário com o ajuste de armadura da curva.');
} else {
  fs.writeFileSync(catalogoPath, novo, 'utf8');
  console.log(`Ajuste de armadura aplicado: ${mudadas} criaturas, ${golpes} golpes.`);
}
