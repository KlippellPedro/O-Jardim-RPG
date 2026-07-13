import { escolhasRaciaisPendentes, itemInicialPermitido, pacoteRacial } from '../../config/regrasRaciais.js';

const QUANTIDADE_PERICIAS = 6;

export function treinamentoCompleto(estado, raca) {
  const escolhas = escolhasRaciaisPendentes(raca);
  const periciasOk = Array.isArray(estado.periciasIniciais)
    && estado.periciasIniciais.length === QUANTIDADE_PERICIAS;
  const itemOk = !itemInicialPermitido(raca) || String(estado.itemInicial || '').trim().length > 0;
  const acessorioOk = raca?.id !== 'humano' || String(estado.acessorioInicial || '').trim().length > 0;
  const vampiroOk = escolhas.periciaTreinada.length === 0
    || escolhas.periciaTreinada.includes(estado.periciaRacialEscolhida);
  const giganteOk = !escolhas.gigante
    || ['sabedoria', 'item-marcial'].includes(estado.escolhaGigante);
  return periciasOk && itemOk && acessorioOk && vampiroOk && giganteOk;
}

function nomePericia(catalogo, id) {
  return catalogo.pericias.find(item => item.id === id)?.titulo || id;
}

function renderEscolhasRaciais(container, estado, raca, ctx) {
  const escolhas = escolhasRaciaisPendentes(raca);
  if (escolhas.periciaTreinada.length > 0) {
    const titulo = document.createElement('h3');
    titulo.className = 'ficha-wizard-subtitulo';
    titulo.textContent = 'Treinamento racial';
    container.appendChild(titulo);

    const opcoes = document.createElement('div');
    opcoes.className = 'ficha-wizard-opcoes';
    escolhas.periciaTreinada.forEach(id => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'ficha-wizard-opcao';
      botao.textContent = `${nomePericia(ctx.catalogo, id)} Treinada`;
      if (estado.periciaRacialEscolhida === id) botao.classList.add('ficha-wizard-opcao--selecionada');
      botao.addEventListener('click', () => {
        estado.periciaRacialEscolhida = id;
        ctx.atualizar();
      });
      opcoes.appendChild(botao);
    });
    container.appendChild(opcoes);
  }

  if (escolhas.gigante) {
    const titulo = document.createElement('h3');
    titulo.className = 'ficha-wizard-subtitulo';
    titulo.textContent = 'Escolha de Gigante';
    container.appendChild(titulo);

    const opcoes = document.createElement('div');
    opcoes.className = 'ficha-wizard-opcoes';
    [
      ['sabedoria', '+1 em Sabedoria'],
      ['item-marcial', 'Item marcial inicial'],
    ].forEach(([id, rotulo]) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'ficha-wizard-opcao';
      botao.textContent = rotulo;
      if (estado.escolhaGigante === id) botao.classList.add('ficha-wizard-opcao--selecionada');
      botao.addEventListener('click', () => {
        estado.escolhaGigante = id;
        ctx.atualizar();
      });
      opcoes.appendChild(botao);
    });
    container.appendChild(opcoes);
  }
}

function renderPericias(container, estado, ctx) {
  const escolhidas = estado.periciasIniciais || [];
  const intro = document.createElement('p');
  intro.className = 'ficha-wizard-intro';
  intro.textContent = 'Escolha seis perícias em grau Aprendiz para representar a história e o treinamento inicial do personagem.';
  container.appendChild(intro);

  const contador = document.createElement('p');
  contador.className = 'ficha-wizard-contador';
  contador.textContent = `${escolhidas.length} de ${QUANTIDADE_PERICIAS} escolhidas`;
  if (escolhidas.length !== QUANTIDADE_PERICIAS) contador.classList.add('ficha-wizard-contador--pendente');
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
    botao.disabled = !selecionada && escolhidas.length >= QUANTIDADE_PERICIAS;
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

function renderItem(container, estado, raca, ctx) {
  const titulo = document.createElement('h3');
  titulo.className = 'ficha-wizard-subtitulo';
  titulo.textContent = 'Equipamento inicial';
  container.appendChild(titulo);

  if (!itemInicialPermitido(raca)) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-wizard-aviso';
    aviso.textContent = 'Golens não recebem item inicial nem Lunaris.';
    container.appendChild(aviso);
    return;
  }

  const campo = document.createElement('label');
  campo.className = 'ficha-campo';
  const rotulo = document.createElement('span');
  rotulo.className = 'ficha-campo-label';
  rotulo.textContent = estado.escolhaGigante === 'item-marcial' ? 'Item marcial' : 'Item comum';
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

  if (raca?.id === 'humano') {
    const acessorioCampo = document.createElement('label');
    acessorioCampo.className = 'ficha-campo';
    const acessorioRotulo = document.createElement('span');
    acessorioRotulo.className = 'ficha-campo-label';
    acessorioRotulo.textContent = 'Acessório humano';
    acessorioCampo.appendChild(acessorioRotulo);
    const acessorio = document.createElement('input');
    acessorio.type = 'text';
    acessorio.className = 'ficha-campo-input';
    acessorio.placeholder = 'Acessório que substitui 5 Lunaris';
    acessorio.value = estado.acessorioInicial || '';
    acessorio.addEventListener('input', () => {
      estado.acessorioInicial = acessorio.value;
      ctx.atualizarValidade();
    });
    acessorioCampo.appendChild(acessorio);
    container.appendChild(acessorioCampo);
  }
}

export function renderPassoTreinamento(container, estado, ctx) {
  const raca = ctx.catalogo.racas.find(item => item.id === estado.racaId) || null;
  if (!estado.periciasIniciais) estado.periciasIniciais = [];

  renderPericias(container, estado, ctx);
  renderEscolhasRaciais(container, estado, raca, ctx);
  renderItem(container, estado, raca, ctx);

  if (pacoteRacial(raca).incompleto) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-wizard-aviso';
    aviso.textContent = 'O pacote mecânico desta raça ainda está Em desenvolvimento; confirme a escolha com o mestre.';
    container.appendChild(aviso);
  }
}
