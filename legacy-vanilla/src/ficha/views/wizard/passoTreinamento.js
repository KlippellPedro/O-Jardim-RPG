import { obterVarianteRacial } from '../../services/calculoService.js';

const QUANTIDADE_PERICIAS_BASE = 6;

export function quantidadePericiasIniciais(estado) {
  const raca = estado.catalogo?.racas?.find(item => item.id === estado.racaId) || null;
  const variante = obterVarianteRacial(raca, estado.escolhaRacial);
  return QUANTIDADE_PERICIAS_BASE
    + Math.max(0, Math.trunc(Number(raca?.pericias_iniciais_adicionais) || 0))
    + Math.max(0, Math.trunc(Number(variante?.pericias_iniciais_adicionais) || 0));
}

export function treinamentoCompleto(estado) {
  const quantidade = quantidadePericiasIniciais(estado);
  const periciasOk = Array.isArray(estado.periciasIniciais)
    && estado.periciasIniciais.length === quantidade;
  const itemOk = String(estado.itemInicial || '').trim().length > 0;
  return periciasOk && itemOk;
}

function renderPericias(container, estado, ctx) {
  const escolhidas = estado.periciasIniciais || [];
  const quantidade = quantidadePericiasIniciais(estado);
  const intro = document.createElement('p');
  intro.className = 'ficha-wizard-intro';
  intro.textContent = `Escolha ${quantidade} perícias em grau Aprendiz para representar a história e o treinamento inicial do personagem.`;
  container.appendChild(intro);

  const contador = document.createElement('p');
  contador.className = 'ficha-wizard-contador';
  contador.textContent = `${escolhidas.length} de ${quantidade} escolhidas`;
  if (escolhidas.length !== quantidade) contador.classList.add('ficha-wizard-contador--pendente');
  container.appendChild(contador);

  const grade = document.createElement('div');
  grade.className = 'ficha-wizard-pericias';
  ctx.catalogo.pericias.forEach(pericia => {
    const selecionada = escolhidas.includes(pericia.id);
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'ficha-wizard-opcao';
    botao.textContent = pericia.titulo;
    botao.setAttribute('aria-pressed', String(selecionada));
    if (selecionada) botao.classList.add('ficha-wizard-opcao--selecionada');
    botao.disabled = !selecionada && escolhidas.length >= quantidade;
    botao.addEventListener('click', () => {
      estado.periciasIniciais = selecionada
        ? escolhidas.filter(id => id !== pericia.id)
        : [...escolhidas, pericia.id];
      ctx.atualizar();
    });
    grade.appendChild(botao);
  });
  container.appendChild(grade);
}

function renderItem(container, estado, ctx) {
  const titulo = document.createElement('h3');
  titulo.className = 'ficha-wizard-subtitulo';
  titulo.textContent = 'Equipamento inicial';
  container.appendChild(titulo);

  const campo = document.createElement('label');
  campo.className = 'ficha-campo';
  const rotulo = document.createElement('span');
  rotulo.className = 'ficha-campo-label';
  rotulo.textContent = 'Item comum';
  campo.appendChild(rotulo);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ficha-campo-input';
  input.placeholder = 'Ex.: kit de cura, espada curta, lanterna';
  input.value = estado.itemInicial || '';
  input.addEventListener('input', () => {
    estado.itemInicial = input.value;
    ctx.atualizarValidade();
  });
  campo.appendChild(input);
  container.appendChild(campo);
}

export function renderPassoTreinamento(container, estado, ctx) {
  if (!estado.periciasIniciais) estado.periciasIniciais = [];
  renderPericias(container, estado, ctx);
  renderItem(container, estado, ctx);
}
