// Escala de Defesa das armaduras e escudos do catálogo da Loja.
//
// Por que existe: a Loja vende cada modelo de armadura em qualquer raridade
// (Comum a Lendário), e a raridade comprada soma +0 a +4 de Defesa. O bônus do
// modelo é, portanto, o da peça Comum. Antes desta escala um modelo de +25 saía
// no primeiro balcão, para personagem de nível 1, por até 80 Lunaris.
//
// Decisão do Pedro (2026-11-11): o bônus cresce com a raridade original do
// modelo e fica alto do Épico em diante; quem segura a peça forte são os
// pré-requisitos e o preço, como a armadura marcial já é segurada pela
// proficiência.
//   - nível mínimo (requisitoNivel) pela raridade original do modelo:
//     Comum livre, Incomum 5, Raro 10, Épico 15, Lendário 25, Relíquia 35;
//   - atributo mínimo (requisitoAtributo) do Épico em diante: Força para peça
//     marcial e escudo, Constituição para armadura simples; 15 no Épico, 18 no
//     Lendário, 20 na Relíquia;
//   - o preço da versão Comum multiplica pela raridade original
//     (plataforma/core/economy_commands.py, _MODEL_RARITY_PRICE_FACTOR);
//   - o bônus vai para a faixa da raridade, mantendo a ordem:
//       armadura  Comum +1..+3, Incomum +2..+6, Raro +4..+8, Épico +10..+15,
//                 Lendário +16..+22, Relíquia +22..+30;
//       escudo    Comum +1, Incomum +2..+3, Raro +2..+4, Épico +5..+7,
//                 Lendário +8..+11, Relíquia +10..+14.
//     Peças cuja força está em outro lugar (Espiritual, Couraça e Égide
//     Primordiais, Juggernaut) mantêm o bônus.
// Os requisitos seguem a regra da Loja: não bloqueiam a compra, avisam quem
// compra e registram a infração para o Mestre. A penalidade de cada peça não
// muda. Contas em docs/propostas/teste-de-builds-2026-11/RELATORIO.md.
//
// Uso: node tools/normalize-armor-balance.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'data', 'loja', 'catalogo.json');
const check = process.argv.includes('--check');

// id: [bônus de Defesa, nível mínimo, atributo mínimo] (null = sem requisito)
const ESCALA = {
  // comum / armadura
  "escamas": [2, null, null], // era +2
  "couro": [2, null, null], // era +2
  "padrao": [3, null, null], // era +3
  "gambeson": [1, null, null], // era +1
  "armadura-couro-javali": [2, null, null], // era +2
  "armadura-lona-encerada": [1, null, null], // era +1
  // comum / escudo
  "improvisado": [1, null, null], // era +1
  "madeira": [1, null, null], // era +1
  "broquel": [1, null, null], // era +1
  "escudo-vime": [1, null, null], // era +1
  "escudo-casco-tartaruga": [1, null, null], // era +1
  // incomum / armadura
  "pluma": [2, 5, null], // era +2
  "malha": [3, 5, null], // era +3
  "espacosa": [3, 5, null], // era +3
  "boa": [4, 5, null], // era +4
  "ossos": [4, 5, null], // era +4
  "colete": [4, 5, null], // era +5
  "ferro": [5, 5, null], // era +6
  "aco": [6, 5, null], // era +7
  "luxuosa": [4, 5, null], // era +5
  "brigantina": [4, 5, null], // era +5
  "meia-armadura": [5, 5, null], // era +6
  "armadura-carapaca-besouro": [4, 5, null], // era +4
  "armadura-cota-runica": [4, 5, null], // era +5
  "armadura-couro-sombrio": [3, 5, null], // era +3
  // incomum / escudo
  "redondo": [2, 5, null], // era +2
  "cacador": [2, 5, null], // era +2
  "osso": [2, 5, null], // era +2
  "escudo-couro-esticado": [2, 5, null], // era +2
  "escudo-targe-aco": [3, 5, null], // era +3
  // raro / armadura
  "planador": [4, 10, null], // era +5
  "excelente": [5, 10, null], // era +6
  "guerra": [6, 10, null], // era +8
  "elemental": [7, 10, null], // era +10
  "tatica": [7, 10, null], // era +10
  "vanguarda": [8, 10, null], // era +13
  "armadura-de-placas": [8, 10, null], // era +12
  "armadura-lamelar": [6, 10, null], // era +9
  "armadura-cacador-feras": [5, 10, null], // era +7
  "armadura-malha-prata": [6, 10, null], // era +8
  "armadura-ceramica-balistica": [7, 10, null], // era +11
  // raro / escudo
  "ferro-2": [3, 10, null], // era +3
  "espinhoso": [2, 10, null], // era +2
  "torre": [3, 10, null], // era +4
  "luxuoso": [3, 10, null], // era +4
  "canhao": [3, 10, null], // era +4
  "barricada": [4, 10, null], // era +5
  "escudao": [4, 10, null], // era +5
  "paves": [3, 10, null], // era +4
  "escudo-vidro-temperado": [3, 10, null], // era +3
  "escudo-rompe-lancas": [3, 10, null], // era +4
  "escudo-carapaca": [3, 10, null], // era +4
  "escudo-campo-magnetico": [3, 10, null], // era +3
  // epico / armadura
  "flexivel": [11, 15, {"constituicao":15}], // era +8
  "guardiao": [15, 15, {"forca":15}], // era +15
  "malha-elfica": [12, 15, {"forca":15}], // era +10
  "armadura-coral-vivo": [11, 15, {"constituicao":15}], // era +9
  "armadura-placas-obsidiana": [14, 15, {"forca":15}], // era +14
  "armadura-campo-cinetico": [10, 15, {"constituicao":15}], // era +7
  // epico / escudo
  "guardiao-2": [5, 15, {"forca":15}], // era +5
  "anti-magia-2": [6, 15, {"forca":15}], // era +6
  "lunar": [7, 15, {"forca":15}], // era +8
  "escudo-espelhado": [6, 15, {"forca":15}], // era +6
  "escudo-sol-portatil": [6, 15, {"forca":15}], // era +6
  "escudo-muralha": [7, 15, {"forca":15}], // era +8
  "escudo-gelo-eterno": [6, 15, {"forca":15}], // era +6
  "escudo-ressonancia": [6, 15, {"forca":15}], // era +7
  // lendario / armadura
  "espiritual": [0, 25, {"constituicao":18}], // era +0
  "anti-magia": [19, 25, {"forca":18}], // era +20
  "tecnologica": [22, 25, {"forca":18}], // era +25
  "couraca-primordial": [4, 25, {"forca":18}], // era +4
  "armadura-solar": [20, 25, {"forca":18}], // era +22
  "armadura-exoesqueleto-juggernaut": [4, 25, {"forca":18}], // era +4
  "armadura-cavaleiro-eclipsado": [20, 25, {"forca":18}], // era +21
  "armadura-pele-tita": [21, 25, {"forca":18}], // era +24
  "armadura-nanocasulo": [16, 25, {"constituicao":18}], // era +14
  // lendario / escudo
  "tecnologico": [10, 25, {"forca":18}], // era +15
  "egide-primordial": [4, 25, {"forca":18}], // era +4
  "escudo-ultimo-recuo": [10, 25, {"forca":18}], // era +14
  "escudo-barreira-fractal": [11, 25, {"forca":18}], // era +16
  "escudo-prismatico": [8, 25, {"forca":18}], // era +12
  // reliquia da criacao / armadura
  "reliquia-pele-nemeia": [28, 35, {"forca":20}], // era +30
  "reliquia-armadura-aquiles": [30, 35, {"forca":20}], // era +35
  "reliquia-couraca-sigurd": [26, 35, {"forca":20}], // era +26
  "reliquia-armadura-fenix": [24, 35, {"forca":20}], // era +20
  "reliquia-placas-golem-praga": [29, 35, {"forca":20}], // era +32
  "reliquia-exocarapaca-anansi": [22, 35, {"constituicao":20}], // era +16
  // reliquia da criacao / escudo
  "reliquia-escudo-svalinn": [14, 35, {"forca":20}], // era +20
  "reliquia-escudo-ajax": [13, 35, {"forca":20}], // era +18
  "reliquia-escudo-solar-ra": [12, 35, {"forca":20}], // era +15
  "reliquia-broquel-bagda": [10, 35, {"forca":20}], // era +8
  "reliquia-aspis-heracles": [13, 35, {"forca":20}], // era +17
  "reliquia-escudo-iris": [12, 35, {"forca":20}], // era +14
};

const formatar = (valor) => (valor > 0 ? `+${valor}` : String(valor));
const numero = (valor) => {
  const achado = String(valor ?? '').match(/[+-]?\d+/);
  return achado ? Number(achado[0]) : null;
};
const original = fs.readFileSync(catalogPath, 'utf8');
const documento = JSON.parse(original);
const vistos = new Set();

for (const entrada of documento.entradas || []) {
  if (entrada.tipo !== 'armadura') continue;
  const escala = ESCALA[entrada.id];
  const conteudo = entrada.conteudo || {};
  if (!escala) {
    if (/\d/.test(String(conteudo.bonus ?? ''))) throw new Error(`Armadura sem lugar na escala: ${entrada.id}`);
    continue;
  }
  vistos.add(entrada.id);
  const [bonus, nivelMinimo, atributoMinimo] = escala;
  // Mantém a grafia antiga ("+0") quando o número não muda.
  if (numero(conteudo.bonus) !== bonus) conteudo.bonus = formatar(bonus);
  // Defesa só em número: a Juggernaut guardava aqui o teste de Reflexos e
  // somava 0 de Defesa na ficha (o texto do teste já está na descrição).
  if ('defesa' in conteudo && conteudo.defesa !== bonus) conteudo.defesa = bonus;
  if (nivelMinimo !== null) conteudo.requisitoNivel = nivelMinimo;
  if (atributoMinimo !== null) conteudo.requisitoAtributo = atributoMinimo;
}

const faltando = Object.keys(ESCALA).filter((id) => !vistos.has(id));
if (faltando.length) throw new Error(`Ids da escala fora do catálogo: ${faltando.join(', ')}`);

const novo = `${JSON.stringify(documento, null, 2)}\n`;
if (check) {
  if (novo !== original) {
    console.error('Armaduras fora da escala. Rode: npm run normalize:armaduras');
    process.exit(1);
  }
  console.log(`Armaduras na escala: ${vistos.size} peças.`);
} else {
  fs.writeFileSync(catalogPath, novo, 'utf8');
  console.log(`Escala de armaduras aplicada: ${vistos.size} peças.`);
}
