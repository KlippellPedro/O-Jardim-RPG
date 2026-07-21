/* Desenho da mesa ao vivo. O mesmo componente serve mestre e jogador — o que
   muda é o que o servidor mandou: quem comanda recebe controles e números
   exatos, quem joga recebe a ordem do turno e o estado dos inimigos em
   palavras ("Ferido"), nunca os pontos de vida deles. */

import { sessaoApi } from '../../plataforma/sessaoApi.js';

const ROTULOS_TIPO = { jogador: 'Jogador', aliado: 'Aliado', inimigo: 'Inimigo' };

const CONDICOES_COMUNS = [
  'Caído', 'Atordoado', 'Cego', 'Surdo', 'Enfeitiçado', 'Amedrontado',
  'Agarrado', 'Paralisado', 'Envenenado', 'Invisível', 'Sangrando',
];

function elemento(tag, classe = '', texto = null) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== null && texto !== undefined) node.textContent = String(texto);
  return node;
}

function botao(rotulo, classe, aoClicar) {
  const node = elemento('button', `sessao-botao ${classe}`.trim(), rotulo);
  node.type = 'button';
  if (aoClicar) node.addEventListener('click', aoClicar);
  return node;
}

function proporcaoDeVida(participante) {
  if (!participante.vida_maxima) return null;
  return Math.max(0, Math.min(1, participante.vida_atual / participante.vida_maxima));
}

function tomDaVida(proporcao) {
  if (proporcao === null) return 'neutro';
  if (proporcao <= 0) return 'fora';
  if (proporcao <= 0.25) return 'critico';
  if (proporcao <= 0.5) return 'ferido';
  return 'saudavel';
}

/* ── Cartão de um participante ───────────────────────────────────────────── */

function cartaoParticipante(participante, estado, ctx) {
  const cartao = elemento('article', 'sessao-participante');
  cartao.dataset.tipo = participante.tipo;
  cartao.dataset.vez = String(estado.sessao.turno_de?.id === participante.id);
  if (participante.e_meu) cartao.dataset.meu = 'true';

  const topo = elemento('div', 'sessao-participante-topo');
  const iniciativa = elemento('span', 'sessao-iniciativa', participante.iniciativa);
  iniciativa.title = 'Iniciativa';
  const identidade = elemento('div', 'sessao-identidade');
  identidade.append(elemento('strong', '', participante.nome));
  const marcadores = elemento('div', 'sessao-marcadores');
  marcadores.append(elemento('span', 'sessao-tipo', ROTULOS_TIPO[participante.tipo] || participante.tipo));
  if (participante.e_meu) marcadores.append(elemento('span', 'sessao-selo-meu', 'seu personagem'));
  if (ctx.comando && !participante.visivel) {
    marcadores.append(elemento('span', 'sessao-selo-oculto', 'escondido dos jogadores'));
  }
  identidade.append(marcadores);
  topo.append(iniciativa, identidade);
  cartao.append(topo);

  // Vida: barra com números para quem pode ver, palavra para quem não pode.
  const proporcao = proporcaoDeVida(participante);
  const vida = elemento('div', 'sessao-vida');
  if (participante.vida_maxima !== undefined) {
    const barra = elemento('div', 'sessao-barra');
    const preenchimento = elemento('div', 'sessao-barra-preenchimento');
    preenchimento.style.width = `${(proporcao ?? 0) * 100}%`;
    preenchimento.dataset.tom = tomDaVida(proporcao);
    barra.append(preenchimento);
    vida.append(barra);
    vida.append(elemento('span', 'sessao-vida-numero', `${participante.vida_atual} / ${participante.vida_maxima}`));
  } else {
    vida.append(elemento('span', 'sessao-vida-estado', participante.estado_vida));
  }
  cartao.append(vida);

  if (participante.condicoes?.length) {
    const condicoes = elemento('div', 'sessao-condicoes');
    participante.condicoes.forEach(condicao => {
      const marca = elemento('span', 'sessao-condicao', condicao);
      if (ctx.comando) {
        const remover = elemento('button', 'sessao-condicao-remover', '×');
        remover.type = 'button';
        remover.setAttribute('aria-label', `Remover ${condicao}`);
        remover.addEventListener('click', () => ctx.alterar(participante.id, {
          condicoes: participante.condicoes.filter(item => item !== condicao),
        }));
        marca.append(remover);
      }
      condicoes.append(marca);
    });
    cartao.append(condicoes);
  }

  // Atalho para a ficha: o mestre consulta o personagem sem sair da mesa.
  if (participante.personagem_id && (ctx.comando || participante.e_meu)) {
    const abrir = document.createElement('a');
    abrir.className = 'sessao-abrir-ficha';
    abrir.href = `/ficha#/personagem/${participante.personagem_id}`;
    abrir.target = '_blank';
    abrir.rel = 'noopener';
    abrir.textContent = 'Abrir ficha ↗';
    cartao.append(abrir);
  }

  if (ctx.comando) cartao.append(controlesDoMestre(participante, ctx));
  return cartao;
}

function controlesDoMestre(participante, ctx) {
  const controles = elemento('div', 'sessao-controles');

  const valor = document.createElement('input');
  valor.type = 'number';
  valor.min = '1';
  valor.value = '1';
  valor.className = 'sessao-numero';
  valor.setAttribute('aria-label', `Quantidade para ${participante.nome}`);

  const quantidade = () => Math.max(1, Math.trunc(Number(valor.value) || 1));

  controles.append(
    valor,
    botao('− Dano', 'sessao-botao--dano', () => ctx.alterar(participante.id, { dano: quantidade() })),
    botao('+ Cura', 'sessao-botao--cura', () => ctx.alterar(participante.id, { cura: quantidade() })),
  );

  const condicao = document.createElement('select');
  condicao.className = 'sessao-select';
  condicao.setAttribute('aria-label', `Aplicar condição em ${participante.nome}`);
  condicao.append(new Option('+ condição', ''));
  CONDICOES_COMUNS
    .filter(item => !participante.condicoes?.includes(item))
    .forEach(item => condicao.append(new Option(item, item)));
  condicao.addEventListener('change', () => {
    if (!condicao.value) return;
    ctx.alterar(participante.id, {
      condicoes: [...(participante.condicoes || []), condicao.value],
    });
    condicao.value = '';
  });
  controles.append(condicao);

  const iniciativa = document.createElement('input');
  iniciativa.type = 'number';
  iniciativa.value = String(participante.iniciativa);
  iniciativa.className = 'sessao-numero';
  iniciativa.setAttribute('aria-label', `Iniciativa de ${participante.nome}`);
  iniciativa.addEventListener('change', () => ctx.alterar(participante.id, {
    iniciativa: Math.trunc(Number(iniciativa.value) || 0),
  }));
  const rotuloIniciativa = elemento('label', 'sessao-campo-inline');
  rotuloIniciativa.append(elemento('span', '', 'Inic.'), iniciativa);
  controles.append(rotuloIniciativa);

  const visivel = botao(
    participante.visivel ? 'Esconder' : 'Revelar',
    'sessao-botao--secundario',
    () => ctx.alterar(participante.id, { visivel: !participante.visivel }),
  );
  const vidaVisivel = botao(
    participante.vida_visivel ? 'Ocultar vida' : 'Mostrar vida',
    'sessao-botao--secundario',
    () => ctx.alterar(participante.id, { vida_visivel: !participante.vida_visivel }),
  );
  const remover = botao('Remover', 'sessao-botao--perigo', () => {
    if (window.confirm(`Tirar ${participante.nome} da cena?`)) ctx.remover(participante.id);
  });
  controles.append(visivel, vidaVisivel, remover);
  return controles;
}

/* ── Barra de comando do mestre ──────────────────────────────────────────── */

function comandoDaMesa(estado, ctx) {
  const barra = elemento('section', 'sessao-comando');

  const turno = elemento('div', 'sessao-turno');
  if (estado.sessao.em_combate) {
    turno.append(elemento('span', 'sessao-rodada', `Rodada ${estado.sessao.rodada}`));
    turno.append(elemento('strong', 'sessao-vez', estado.sessao.turno_de?.nome || '—'));
  } else {
    turno.append(elemento('span', 'sessao-rodada', 'Fora de combate'));
  }
  barra.append(turno);

  const acoes = elemento('div', 'sessao-acoes');
  // Rolar iniciativa de todos evita o mestre digitar número por número.
  const rolarIniciativa = botao('🎲 Iniciativa de todos', 'sessao-botao--secundario', () => ctx.iniciativa());
  if (estado.sessao.em_combate) {
    acoes.append(
      botao('‹ Anterior', 'sessao-botao--secundario', () => ctx.turno('anterior')),
      botao('Próximo turno ›', 'sessao-botao--destaque', () => ctx.turno('proximo')),
      rolarIniciativa,
      botao('Encerrar combate', 'sessao-botao--secundario', () => ctx.turno('encerrar')),
    );
  } else {
    acoes.append(
      rolarIniciativa,
      botao('Ordenar por iniciativa', 'sessao-botao--secundario', () => ctx.turno('ordenar')),
      botao('Iniciar combate', 'sessao-botao--destaque', () => ctx.turno('iniciar')),
    );
  }
  barra.append(acoes);
  return barra;
}

function formularioParticipante(ctx) {
  const form = document.createElement('form');
  form.className = 'sessao-adicionar';

  const nome = document.createElement('input');
  nome.type = 'text';
  nome.required = true;
  nome.maxLength = 80;
  nome.placeholder = 'Nome do inimigo ou NPC';
  nome.className = 'sessao-texto';
  nome.setAttribute('aria-label', 'Nome do participante');

  const vida = document.createElement('input');
  vida.type = 'number';
  vida.min = '0';
  vida.value = '10';
  vida.className = 'sessao-numero';
  vida.setAttribute('aria-label', 'Vida máxima');

  const iniciativa = document.createElement('input');
  iniciativa.type = 'number';
  iniciativa.value = '0';
  iniciativa.className = 'sessao-numero';
  iniciativa.setAttribute('aria-label', 'Iniciativa');

  const tipo = document.createElement('select');
  tipo.className = 'sessao-select';
  tipo.setAttribute('aria-label', 'Tipo');
  [['inimigo', 'Inimigo'], ['aliado', 'Aliado'], ['jogador', 'Jogador']]
    .forEach(([valor, rotulo]) => tipo.append(new Option(rotulo, valor)));

  const enviar = botao('Adicionar à cena', 'sessao-botao--destaque');
  enviar.type = 'submit';

  form.append(
    campoRotulado('Nome', nome),
    campoRotulado('Vida', vida),
    campoRotulado('Iniciativa', iniciativa),
    campoRotulado('Tipo', tipo),
    enviar,
  );

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    enviar.disabled = true;
    try {
      await ctx.adicionar({
        nome: nome.value,
        tipo: tipo.value,
        vida_maxima: Math.max(0, Math.trunc(Number(vida.value) || 0)),
        iniciativa: Math.trunc(Number(iniciativa.value) || 0),
        visivel: true,
        vida_visivel: false,
      });
      form.reset();
      vida.value = '10';
      iniciativa.value = '0';
      nome.focus();
    } finally {
      enviar.disabled = false;
    }
  });
  return form;
}

function campoRotulado(rotulo, controle) {
  const label = elemento('label', 'sessao-campo');
  label.append(elemento('span', '', rotulo), controle);
  return label;
}

/* ── Montagem ────────────────────────────────────────────────────────────── */

export function renderMesa(area, estado, ctx) {
  area.replaceChildren();

  if (!estado.sessao) {
    area.append(telaSemSessao(estado, ctx));
    return;
  }

  const cabecalho = elemento('div', 'sessao-cabecalho');
  const titulo = elemento('div');
  titulo.append(elemento('h2', '', estado.sessao.titulo || 'Sessão em andamento'));
  titulo.append(elemento('span', 'sessao-subtitulo',
    `${estado.participantes.length} em cena · começou ${new Date(estado.sessao.iniciada_em).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}`));
  cabecalho.append(titulo);
  if (ctx.comando) {
    cabecalho.append(botao('Encerrar sessão', 'sessao-botao--perigo', () => {
      if (window.confirm('Encerrar a sessão? A ordem de iniciativa é perdida.')) ctx.encerrar();
    }));
  }
  area.append(cabecalho);

  if (ctx.comando) area.append(comandoDaMesa(estado, ctx));
  else area.append(painelDoJogador(estado));

  const lista = elemento('div', 'sessao-lista');
  if (!estado.participantes.length) {
    lista.append(elemento('p', 'sessao-vazio', ctx.comando
      ? 'Ninguém em cena ainda. Adicione inimigos abaixo ou reabra a sessão incluindo os personagens.'
      : 'O mestre ainda não colocou ninguém em cena.'));
  }
  estado.participantes.forEach(participante => {
    lista.append(cartaoParticipante(participante, estado, ctx));
  });
  area.append(lista);

  if (ctx.comando) {
    const adicionar = elemento('section', 'sessao-bloco');
    adicionar.append(elemento('h3', '', 'Colocar alguém na cena'));
    adicionar.append(formularioParticipante(ctx));
    area.append(adicionar);
  }
}

function painelDoJogador(estado) {
  const painel = elemento('section', 'sessao-comando sessao-comando--jogador');
  const turno = elemento('div', 'sessao-turno');
  if (estado.sessao.em_combate) {
    turno.append(elemento('span', 'sessao-rodada', `Rodada ${estado.sessao.rodada}`));
    const vez = estado.sessao.turno_de;
    const ehMinhaVez = estado.participantes.some(p => p.id === vez?.id && p.e_meu);
    turno.append(elemento('strong', 'sessao-vez', ehMinhaVez ? `Sua vez: ${vez.nome}` : `Vez de ${vez?.nome || '—'}`));
    if (ehMinhaVez) painel.dataset.minhaVez = 'true';
  } else {
    turno.append(elemento('span', 'sessao-rodada', 'Sem combate no momento'));
  }
  painel.append(turno);
  return painel;
}

function telaSemSessao(estado, ctx) {
  const bloco = elemento('section', 'sessao-bloco sessao-bloco--centro');
  bloco.append(elemento('h2', '', 'Nenhuma sessão acontecendo'));

  if (!ctx.comando) {
    bloco.append(elemento('p', 'sessao-vazio',
      'Quando o mestre abrir a mesa, esta página acende sozinha — pode deixar aberta.'));
    return bloco;
  }

  bloco.append(elemento('p', 'sessao-vazio',
    'Abra a mesa para controlar iniciativa, vida e condições. Os jogadores acompanham em tempo real.'));

  const form = document.createElement('form');
  form.className = 'sessao-adicionar';
  const titulo = document.createElement('input');
  titulo.type = 'text';
  titulo.maxLength = 120;
  titulo.placeholder = 'Ex.: Emboscada na ponte';
  titulo.className = 'sessao-texto';
  titulo.setAttribute('aria-label', 'Nome da cena');

  const incluir = document.createElement('input');
  incluir.type = 'checkbox';
  incluir.checked = true;
  const rotuloIncluir = elemento('label', 'sessao-check');
  rotuloIncluir.append(incluir, elemento('span', '', 'Já trazer os personagens da campanha'));

  const abrir = botao('Abrir a mesa', 'sessao-botao--destaque');
  abrir.type = 'submit';
  form.append(campoRotulado('Nome da cena', titulo), rotuloIncluir, abrir);
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    abrir.disabled = true;
    try {
      await ctx.abrir(titulo.value, incluir.checked);
    } finally {
      abrir.disabled = false;
    }
  });
  bloco.append(form);
  return bloco;
}

export { sessaoApi };
