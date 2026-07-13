import {
  ATRIBUTOS,
  rolarAtributos,
  VALORES_ATRIBUTOS_PADRAO,
} from '../../services/calculoService.js';
import { NOMES_ATRIBUTOS } from '../../config/nomesAtributos.js';

function atribuicaoInicial() {
  return Object.fromEntries(ATRIBUTOS.map((chave, indice) => [chave, indice]));
}

function trocarMetodo(estado, ctx, metodo) {
  estado.metodoAtributos = metodo;
  if (metodo === 'padrao' && !estado.atribuicaoPadrao) {
    estado.atribuicaoPadrao = atribuicaoInicial();
  }
  if (metodo === 'dados') {
    estado.atributosRolados = rolarAtributos();
    estado.atribuicaoDados = atribuicaoInicial();
  }
  ctx.atualizar();
}

function criarSeletorMetodo(estado, ctx) {
  const grupo = document.createElement('div');
  grupo.className = 'ficha-wizard-metodo-seletor';

  [
    ['padrao', 'Matriz padrão'],
    ['dados', 'Variante 7d20 do mestre'],
  ].forEach(([id, rotulo]) => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'ficha-wizard-opcao';
    botao.textContent = rotulo;
    botao.setAttribute('aria-pressed', String(estado.metodoAtributos === id));
    if (estado.metodoAtributos === id) botao.classList.add('ficha-wizard-opcao--selecionada');
    botao.addEventListener('click', () => trocarMetodo(estado, ctx, id));
    grupo.appendChild(botao);
  });
  return grupo;
}

function renderDistribuicao(container, estado, valores, chaveEstado, ctx) {
  const atribuicao = estado[chaveEstado];
  const grade = document.createElement('div');
  grade.className = 'ficha-wizard-atributos-grade';

  ATRIBUTOS.forEach(chave => {
    const campo = document.createElement('label');
    campo.className = 'ficha-campo';

    const rotulo = document.createElement('span');
    rotulo.className = 'ficha-campo-label';
    rotulo.textContent = NOMES_ATRIBUTOS[chave];
    campo.appendChild(rotulo);

    const select = document.createElement('select');
    select.className = 'ficha-campo-select';
    const indiceAtual = atribuicao[chave];

    valores.forEach((valor, indice) => {
      const option = document.createElement('option');
      option.value = String(indice);
      option.textContent = String(valor);
      option.selected = indice === indiceAtual;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      const novoIndice = Number(select.value);
      const outraEntrada = Object.entries(atribuicao)
        .find(([outraChave, outroIndice]) => outraChave !== chave && outroIndice === novoIndice);
      if (outraEntrada) atribuicao[outraEntrada[0]] = indiceAtual;
      atribuicao[chave] = novoIndice;
      estado[chaveEstado] = { ...atribuicao };
      ctx.atualizar();
    });
    campo.appendChild(select);
    grade.appendChild(campo);
  });
  container.appendChild(grade);
}

export function renderPassoAtributos(container, estado, ctx) {
  if (!estado.metodoAtributos) estado.metodoAtributos = 'padrao';
  if (!estado.atribuicaoPadrao) estado.atribuicaoPadrao = atribuicaoInicial();

  const intro = document.createElement('p');
  intro.className = 'ficha-wizard-intro';
  intro.textContent = estado.metodoAtributos === 'padrao'
    ? 'Distribua 15, 14, 13, 12, 10, 8 e 7. Esta é a regra oficial de criação.'
    : 'A rolagem 7d20 cria personagens muito desiguais e só deve ser usada quando o mestre autorizar.';
  container.append(intro, criarSeletorMetodo(estado, ctx));

  if (estado.metodoAtributos === 'dados') {
    if (!estado.atributosRolados || !estado.atribuicaoDados) {
      estado.atributosRolados = rolarAtributos();
      estado.atribuicaoDados = atribuicaoInicial();
    }
    const rerolar = document.createElement('button');
    rerolar.type = 'button';
    rerolar.className = 'ficha-wizard-rerolar';
    rerolar.textContent = 'Rolar novamente';
    rerolar.addEventListener('click', () => trocarMetodo(estado, ctx, 'dados'));
    container.appendChild(rerolar);
    renderDistribuicao(container, estado, estado.atributosRolados, 'atribuicaoDados', ctx);
    return;
  }

  renderDistribuicao(container, estado, VALORES_ATRIBUTOS_PADRAO, 'atribuicaoPadrao', ctx);
}
