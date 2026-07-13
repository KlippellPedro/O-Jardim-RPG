function chanceBase(bonus, dt) {
  let sucessos = 0;

  for (let rolagem = 1; rolagem <= 20; rolagem += 1) {
    const total = rolagem + bonus;
    let grau = total >= dt + 10 ? 3 : total >= dt ? 2 : total <= dt - 10 ? 0 : 1;
    if (rolagem === 20) grau = Math.min(3, grau + 1);
    if (rolagem === 1) grau = Math.max(0, grau - 1);
    if (grau >= 2) sucessos += 1;
  }

  return sucessos / 20;
}

export function criarCalculadora() {
  const section = document.createElement('section');
  section.className = 'regras-calculator';
  section.innerHTML = `
    <div class="regras-calculator-heading">
      <div>
        <span class="regras-tool-kicker">Ferramenta de mesa</span>
        <h3>Calculadora de teste</h3>
      </div>
      <output class="regras-chance-output" aria-live="polite"><strong>55%</strong><span>chance de sucesso</span></output>
    </div>
    <div class="regras-calculator-controls">
      <label for="regras-bonus-total">Bônus total<input id="regras-bonus-total" type="number" name="bonus" value="5" min="-20" max="60" inputmode="numeric"></label>
      <label for="regras-dificuldade-teste">Dificuldade do Teste<input id="regras-dificuldade-teste" type="number" name="dt" value="15" min="1" max="80" inputmode="numeric"></label>
      <div class="regras-roll-mode" role="group" aria-label="Modo da rolagem">
        <button type="button" data-mode="desvantagem" aria-pressed="false">Desvantagem</button>
        <button type="button" data-mode="normal" aria-pressed="true">Normal</button>
        <button type="button" data-mode="vantagem" aria-pressed="false">Vantagem</button>
      </div>
    </div>
  `;

  const bonus = section.querySelector('[name="bonus"]');
  const dt = section.querySelector('[name="dt"]');
  const output = section.querySelector('.regras-chance-output strong');
  const botoes = [...section.querySelectorAll('[data-mode]')];
  let modo = 'normal';

  function atualizar() {
    const p = chanceBase(Number(bonus.value) || 0, Number(dt.value) || 0);
    const chance = modo === 'vantagem'
      ? 1 - ((1 - p) ** 2)
      : modo === 'desvantagem' ? p ** 2 : p;
    output.textContent = `${(chance * 100).toLocaleString('pt-BR', {
      maximumFractionDigits: 2,
    })}%`;
  }

  botoes.forEach(botao => botao.addEventListener('click', () => {
    modo = botao.dataset.mode;
    botoes.forEach(item => item.setAttribute('aria-pressed', String(item === botao)));
    atualizar();
  }));
  bonus.addEventListener('input', atualizar);
  dt.addEventListener('input', atualizar);
  return section;
}
