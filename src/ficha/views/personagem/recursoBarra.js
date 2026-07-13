// Barra de recurso — valor atual/máximo sobreposto numa barra colorida por
// recurso, com botões de passo rápido (±1/±5, configurável) nas duas pontas
// e o número atual como input editável (aceita valor absoluto OU delta,
// +N/-N). Layout inspirado no HUD do projeto de referência
// (Ficha-Supremacia-do-Protesto), mas usando as próprias cores/tokens do
// Jardim (--blood, --neon, --arkania...) em vez de inventar cor nova.
//
// Sem `maximo`, vira um "chip" simples (steppers + número, sem barra de
// preenchimento) — usado por recursos sem teto, como Lunaris.

function aplicarEntrada(valorAtual, entrada) {
  const texto = entrada.trim();
  if (/^[+-]\d+$/.test(texto)) return valorAtual + Number(texto);
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : valorAtual;
}

function criarBotaoStepper(delta, aoClicar) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-recurso-btn';
  if (Math.abs(delta) > 1) btn.classList.add('ficha-recurso-btn--grande');
  btn.textContent = delta > 0 ? `+${delta}` : String(delta);
  btn.setAttribute('aria-label', delta > 0 ? `Aumentar ${delta}` : `Diminuir ${Math.abs(delta)}`);
  btn.addEventListener('click', () => aoClicar(delta));
  return btn;
}

export function criarBarraRecurso({
  rotulo,
  atual,
  maximo,
  minimo = null,
  limiteMaximo = maximo,
  cor = 'var(--gold)',
  incrementos = [1, 5],
  critico = 'baixo', // 'baixo' (alerta perto do mínimo) | 'alto' (perto do teto, ex. Cansaço) | false (sem alerta — XP/Lunaris não têm "zona de perigo")
  mostrarRotulo = true,
  acoes = [],
  tipo = 'padrao',
  visualInvertido = false,
  aoMudar,
}) {
  const bloco = document.createElement('div');
  bloco.className = `ficha-recurso ficha-recurso--${tipo}`;
  bloco.dataset.recurso = rotulo;
  bloco.style.setProperty('--recurso-cor', cor);

  if (mostrarRotulo) {
    const cabecalho = document.createElement('div');
    cabecalho.className = 'ficha-recurso-cabecalho';
    const label = document.createElement('span');
    label.className = 'ficha-recurso-label';
    label.textContent = rotulo;
    cabecalho.appendChild(label);
    if (acoes.length > 0) {
      const botoes = document.createElement('span');
      botoes.className = 'ficha-wizard-stat-acoes';
      acoes.forEach(acao => botoes.appendChild(acao));
      cabecalho.appendChild(botoes);
    }
    bloco.appendChild(cabecalho);
  }

  function clamp(valor) {
    let v = valor;
    if (typeof minimo === 'number') v = Math.max(minimo, v);
    if (typeof limiteMaximo === 'number') v = Math.min(limiteMaximo, v);
    return v;
  }

  function aplicarDelta(delta) {
    const novo = clamp(atual + delta);
    if (novo !== atual) aplicarNovoValor(novo);
  }

  const passos = [...new Set(incrementos.map(Math.abs))].sort((a, b) => a - b);

  const linha = document.createElement('div');
  linha.className = 'ficha-recurso-linha';

  const esquerda = document.createElement('div');
  esquerda.className = 'ficha-recurso-steppers';
  [...passos].reverse().forEach(p => esquerda.appendChild(criarBotaoStepper(-p, aplicarDelta)));

  const temBarra = typeof maximo === 'number' && maximo > 0;
  const caixa = document.createElement('div');
  caixa.className = temBarra ? 'ficha-recurso-barra' : 'ficha-recurso-chip';

  let preenchido = null;
  if (temBarra) {
    preenchido = document.createElement('div');
    preenchido.className = 'ficha-recurso-preenchido';
    caixa.appendChild(preenchido);
  }

  const texto = document.createElement('div');
  texto.className = 'ficha-recurso-texto';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.className = 'ficha-recurso-atual';
  input.value = atual;
  input.setAttribute('aria-label', `${rotulo} atual`);
  input.addEventListener('focus', () => input.select());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
  });
  input.addEventListener('blur', () => {
    const valorDigitado = input.value.trim();
    input.value = atual;
    if (!valorDigitado) return;
    const novo = clamp(aplicarEntrada(atual, valorDigitado));
    if (novo !== atual) aplicarNovoValor(novo);
  });
  texto.appendChild(input);

  let maxTexto = null;
  if (typeof maximo === 'number') {
    maxTexto = document.createElement('span');
    maxTexto.className = 'ficha-recurso-max';
    maxTexto.textContent = `/ ${maximo}`;
    texto.appendChild(maxTexto);
  }

  caixa.appendChild(texto);

  function atualizarVisual() {
    input.value = atual;
    if (!preenchido || !temBarra) return;
    const pct = Math.max(0, Math.min(100, (atual / maximo) * 100));
    const pctVisual = visualInvertido ? 100 - pct : pct;
    preenchido.style.width = `${pctVisual}%`;
    bloco.style.setProperty('--recurso-pct', String(pct));
    const emAlerta = critico === 'alto' ? pct >= 75 : critico === 'baixo' && pct <= 25;
    caixa.classList.toggle('ficha-recurso-barra--critico', Boolean(emAlerta));
    bloco.classList.toggle('ficha-recurso--abaixo-25', pct <= 25);
    bloco.classList.toggle('ficha-recurso--vazio', atual <= 0);
    if (tipo === 'sanidade') {
      bloco.dataset.estado = atual <= 0 ? 'quebra'
        : pct <= 25 ? 'ruptura'
          : pct <= 50 ? 'enlouquecendo'
            : pct <= 75 ? 'abalado' : 'estavel';
    }
    if (tipo === 'cansaco') bloco.dataset.estado = String(Math.max(0, Math.min(6, Math.round(atual))));
  }

  function aplicarNovoValor(novo) {
    const anterior = atual;
    const alterou = aoMudar(novo);
    if (alterou === false) {
      atual = anterior;
      atualizarVisual();
      return;
    }
    atual = novo;
    atualizarVisual();
  }

  bloco.addEventListener('ficha:recurso-maximo', (evento) => {
    const detalhe = evento.detail || {};
    if (typeof detalhe.maximo === 'number') maximo = detalhe.maximo;
    if (typeof detalhe.minimo === 'number') minimo = detalhe.minimo;
    if (typeof detalhe.limiteMaximo === 'number') limiteMaximo = detalhe.limiteMaximo;
    if (maxTexto) maxTexto.textContent = `/ ${maximo}`;
    const anterior = atual;
    const ajustado = clamp(atual);
    if (ajustado !== anterior) {
      // Atualizar só a barra fazia o valor inválido reaparecer no próximo
      // render. Atribuímos antes do callback para evitar redisparo recursivo
      // quando o salvamento recalcula os máximos no mesmo ciclo.
      atual = ajustado;
      if (aoMudar(ajustado) === false) atual = anterior;
    }
    atualizarVisual();
  });

  const direita = document.createElement('div');
  direita.className = 'ficha-recurso-steppers';
  passos.forEach(p => direita.appendChild(criarBotaoStepper(p, aplicarDelta)));

  linha.append(esquerda, caixa, direita);
  bloco.appendChild(linha);
  atualizarVisual();

  return bloco;
}
