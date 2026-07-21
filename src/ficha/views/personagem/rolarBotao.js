/* Botão de rolar, compartilhado pelos modais de perícia e ataque.

   Mostra o resultado no próprio modal em vez de abrir outro — quem rola quer
   ver o número sem perder de vista de onde ele saiu. */

import { blocoResultado, rolarFormula, rolarTeste } from '../../services/dadosService.js';

function campoDT() {
  const campo = document.createElement('label');
  campo.className = 'ficha-rolagem-dt';
  const rotulo = document.createElement('span');
  rotulo.textContent = 'DT (opcional)';
  const entrada = document.createElement('input');
  entrada.type = 'number';
  entrada.min = '1';
  entrada.max = '60';
  entrada.placeholder = '—';
  entrada.setAttribute('aria-label', 'Dificuldade do teste');
  campo.append(rotulo, entrada);
  campo.entrada = entrada;
  return campo;
}

/**
 * Acrescenta ao modal a área de rolagem.
 *
 * @param {object} opcoes
 * @param {HTMLElement} opcoes.corpo destino, normalmente o corpo do modal
 * @param {string} opcoes.titulo nome que vai para o log da mesa
 * @param {number} opcoes.bonus bônus total já calculado pela ficha
 * @param {object} opcoes.rolagem `{ vantagens, desvantagens }`
 * @param {string|null} opcoes.personagemId dono da ficha
 * @param {object} opcoes.origem contexto gravado no log (perícia, ataque…)
 * @param {string|null} opcoes.formula quando é dano/cura em vez de teste
 * @param {boolean} opcoes.comDT oferece o campo de dificuldade
 */
export function adicionarRolagem({
  corpo,
  titulo,
  bonus = 0,
  rolagem = {},
  personagemId = null,
  origem = {},
  formula = null,
  comDT = true,
  aoRolar = null,
}) {
  const area = document.createElement('div');
  area.className = 'ficha-rolagem-area';

  const controles = document.createElement('div');
  controles.className = 'ficha-rolagem-controles';

  const dt = comDT && !formula ? campoDT() : null;
  if (dt) controles.append(dt);

  const acao = document.createElement('button');
  acao.type = 'button';
  acao.className = 'ficha-btn ficha-btn--rolar';
  acao.textContent = formula ? `Rolar ${formula}` : 'Rolar dado';
  controles.append(acao);
  area.append(controles);

  const saida = document.createElement('div');
  saida.className = 'ficha-rolagem-saida';
  area.append(saida);

  acao.addEventListener('click', async () => {
    acao.disabled = true;
    acao.textContent = 'Rolando…';
    try {
      const alvo = dt?.entrada.value ? Math.trunc(Number(dt.entrada.value)) : null;
      const registro = formula
        ? await rolarFormula({ titulo, formula, personagemId, origem })
        : await rolarTeste({ titulo, bonus, rolagem, dt: alvo, personagemId, origem });
      saida.replaceChildren(blocoResultado(registro));
      if (aoRolar) aoRolar(registro);
    } catch (erro) {
      saida.replaceChildren(Object.assign(document.createElement('p'), {
        className: 'ficha-rolagem-erro',
        textContent: erro.message || 'Não foi possível rolar agora.',
      }));
    } finally {
      acao.disabled = false;
      acao.textContent = formula ? `Rolar ${formula}` : 'Rolar de novo';
    }
  });

  corpo.append(area);
  return area;
}
