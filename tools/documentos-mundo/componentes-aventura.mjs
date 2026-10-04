/**
 * Peças em comum das aventuras do kit do Mestre: caixa de leitura, relógio,
 * caixa de destaque, rodapé e a ficha de criatura.
 *
 * A ficha sai de `modeloDeCriatura` (a mesma curva do Bestiário e do Montador de
 * encontro da Sessão), então Vida, Defesa, ataque e dano de uma criatura
 * inventada para a aventura batem com as do catálogo no mesmo VD e papel. Por
 * isso o gerador do kit do Mestre roda com o carregador de TypeScript do projeto.
 */
import { modeloDeCriatura } from '../../src/services/curvaCriatura.ts';

export const leitura = (...paragrafos) => `<div class="leitura">${paragrafos.map((p) => `<p>${p}</p>`).join('')}</div>`;
export const relogio = (n) => `<div class="relogio">${'<u></u>'.repeat(n)}</div>`;

export const caixa = (rotulo, dentro, clara = false) => `
  <div class="caixa${clara ? ' clara' : ''}">
    <div class="rotulo">${rotulo}</div>
    <div class="dentro">${dentro}</div>
  </div>`;

export const criatura = (nome, numeros, linhas) => `
  <div class="criatura">
    <h4>${nome}</h4>
    <div class="numeros">${numeros}</div>
    ${linhas.map((linha) => `<p>${linha}</p>`).join('')}
  </div>`;

export const rodape = (titulo) => (texto) => `<div class="pe"><span>${titulo}</span><span>${texto}</span></div>`;

const NOMES_DOS_ATRIBUTOS = { forca: 'Força', agilidade: 'Agilidade', vigor: 'Vigor', presenca: 'Presença', intelecto: 'Intelecto' };

/**
 * Ficha de uma criatura nova da aventura. `golpes` troca o nome e o tipo de dano do ataque
 * da curva: [['Garra de pedra', 'impacto']]. O número de acerto e o dano ficam os da curva.
 * `extras` entra depois das perícias, uma linha por habilidade.
 */
export function ficha(nome, { vd, papel = 'padrao', arquetipo = 'comum', golpes = [], extras = [], rotulo = '' }) {
  const m = modeloDeCriatura(vd, papel, arquetipo);
  const atributos = Object.entries(m.atributos).map(([chave, valor]) => `${NOMES_DOS_ATRIBUTOS[chave]} ${valor}`).join(', ');
  const ataques = (golpes.length ? golpes : m.ataques.map((a) => [a.nome, a.detalhe.split(' ').slice(-1)[0]])).map(([titulo, tipo], indice) => {
    const base = m.ataques[Math.min(indice, m.ataques.length - 1)].detalhe;
    return `<strong>${titulo}:</strong> ${base.split(' ').slice(0, -1).join(' ')} ${tipo}.`;
  });
  return criatura(
    `${nome}${rotulo ? ` <small>(${rotulo})</small>` : ''}`,
    `VD ${vd} · Vida ${m.pv} · Defesa ${m.defesa} · Iniciativa ${m.iniciativa} · Deslocamento ${m.deslocamento} · ${atributos}`,
    [`<strong>Perícias:</strong> ${m.pericias.join(', ')}.`, ...ataques, ...extras],
  );
}

/** O golpe anunciado do papel, para quem precisa citar o número numa regra própria. */
export const golpeAnunciado = (vd, papel = 'chefe', arquetipo = 'comum') => modeloDeCriatura(vd, papel, arquetipo).golpeAnunciadoMedio;
