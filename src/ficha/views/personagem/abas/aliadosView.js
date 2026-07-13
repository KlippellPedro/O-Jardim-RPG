import { router } from '../../../../core/router.js';
import {
  atualizarPersonagem,
  listarPersonagens,
} from '../../../services/personagensService.js';
import {
  criarAliadoComum,
  criarVinculoAliado,
  normalizarAliado,
} from '../../../services/aliadosService.js';
import { somarModificadores } from '../../../services/modificadoresService.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

function el(tag, classe = '', texto = '') {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== '') elemento.textContent = texto;
  return elemento;
}

function input(aria, valor = '', opcoes = {}) {
  const controle = document.createElement(opcoes.textarea ? 'textarea' : 'input');
  controle.className = 'ficha-campo-input';
  controle.setAttribute('aria-label', aria);
  if (opcoes.textarea) controle.rows = opcoes.linhas || 4;
  else controle.type = opcoes.tipo || 'text';
  if (opcoes.placeholder) controle.placeholder = opcoes.placeholder;
  if (opcoes.maxLength) controle.maxLength = opcoes.maxLength;
  if (opcoes.min !== undefined) controle.min = String(opcoes.min);
  if (opcoes.max !== undefined) controle.max = String(opcoes.max);
  controle.value = valor ?? '';
  return controle;
}

function select(aria, opcoes, atual = '') {
  const controle = el('select', 'ficha-campo-select');
  controle.setAttribute('aria-label', aria);
  opcoes.forEach(item => {
    const option = el('option', '', item.titulo);
    option.value = item.id;
    option.selected = item.id === atual;
    controle.appendChild(option);
  });
  return controle;
}

function campo(rotulo, controle, classe = '') {
  const label = el('label', `ficha-campo ${classe}`.trim());
  label.append(el('span', 'ficha-campo-label', rotulo), controle);
  return label;
}

function botao(texto, classe, acao, aria = '') {
  const controle = el('button', classe, texto);
  controle.type = 'button';
  if (aria) controle.setAttribute('aria-label', aria);
  if (acao) controle.addEventListener('click', acao);
  return controle;
}

function somaAjustes(lista) {
  return (lista || []).reduce((total, item) => total + (Number(item.valor) || 0), 0);
}

function sinal(valor) {
  const numero = Number(valor) || 0;
  return numero >= 0 ? `+${numero}` : String(numero);
}

function maximoRecurso(personagem, chave) {
  const mapa = {
    vida: ['vida', 'ajustesVida', 1],
    mana: ['mana', 'ajustesMana', 1],
    sanidade: [null, 'ajustesSanidade', 100],
  };
  const [derivado, ajustes, base] = mapa[chave];
  const valorBase = derivado ? Number(personagem.derivados?.[derivado]) || base : base;
  return Math.max(1, valorBase + somaAjustes(personagem.recursos?.[ajustes])
    + somarModificadores(personagem, 'recurso_maximo', chave));
}

function defesaPersonagem(personagem) {
  return (Number(personagem.derivados?.defesaNatural) || 10)
    + (Number(personagem.recursos?.bonusDefesa) || 0)
    + somaAjustes(personagem.recursos?.ajustesDefesa)
    + somarModificadores(personagem, 'combate', 'defesa')
    + (Number(personagem.recursos?.armadura) || 0)
    - Math.abs(Number(personagem.recursos?.penalidadeDefesa) || 0);
}

function estadoVida(atual, maxima) {
  const percentual = maxima > 0 ? atual / maxima : 0;
  if (atual <= 0) return { id: 'caido', titulo: 'Caído' };
  if (percentual <= 0.25) return { id: 'critico', titulo: 'Crítico' };
  if (percentual <= 0.5) return { id: 'ferido', titulo: 'Ferido' };
  return { id: 'bem', titulo: 'Bem' };
}

function recursoBarra(rotulo, atual, maximo, classe) {
  const grupo = el('div', `ficha-aliado-recurso ficha-aliado-recurso--${classe}`);
  const cabecalho = el('div');
  cabecalho.append(el('span', '', rotulo), el('strong', '', `${atual} / ${maximo}`));
  const barra = el('div', 'ficha-aliado-recurso-barra');
  const preenchimento = el('span');
  preenchimento.style.width = `${Math.max(0, Math.min(100, (atual / Math.max(1, maximo)) * 100))}%`;
  barra.appendChild(preenchimento);
  grupo.append(cabecalho, barra);
  return grupo;
}

function nomeClasse(personagem, catalogo) {
  const classes = (personagem.classes || []).map(item => {
    const classe = (catalogo?.classes || []).find(atual => atual.id === item.id);
    return `${classe?.titulo || item.id} ${item.nivel}`;
  });
  return classes.join(' · ') || 'Sem classe';
}

export function renderAliados(container, personagem, ctx) {
  let aliados = [...(personagem.aliados || [])];

  const pagina = el('section', 'ficha-aliados-pagina');
  const topo = el('header', 'ficha-aliados-topo');
  const topoTexto = el('div');
  topoTexto.append(
    el('h2', '', 'Aliados e companhia'),
    el('p', '', 'Companheiros rápidos para a mesa e fichas completas para quem precisa de todas as mecânicas.'),
  );
  const topoAcoes = el('div', 'ficha-aliados-topo-acoes');
  topoAcoes.append(
    botao('+ Aliado comum', 'ficha-cta-btn', () => abrirEditorComum()),
    botao('Vincular ficha completa', 'ficha-cta-btn ficha-cta-btn--secundario', abrirVinculoComplexo),
  );
  topo.append(topoTexto, topoAcoes);

  const resumo = el('div', 'ficha-aliados-resumo');
  const resumoRefs = {};
  [
    ['total', 'Companhia', 'aliados registrados'],
    ['comuns', 'Comuns', 'cards rápidos'],
    ['complexos', 'Complexos', 'fichas completas'],
    ['emCena', 'Em cena', 'ativos na sessão'],
  ].forEach(([chave, rotulo, descricao]) => {
    const card = el('div', 'ficha-aliados-resumo-card');
    const valor = el('strong');
    resumoRefs[chave] = valor;
    card.append(valor, el('span', '', rotulo), el('small', '', descricao));
    resumo.appendChild(card);
  });

  const tipos = el('div', 'ficha-aliados-tipos');
  const comumInfo = el('article', 'ficha-aliados-tipo-info ficha-aliados-tipo-info--comum');
  comumInfo.append(el('span', '', '◆'), el('strong', '', 'Aliado comum'), el('p', '', 'Vida, Defesa, movimento e um ataque principal. Ideal para pets, ajudantes e invocações simples.'));
  const complexoInfo = el('article', 'ficha-aliados-tipo-info ficha-aliados-tipo-info--complexo');
  complexoInfo.append(el('span', '', '✦'), el('strong', '', 'Aliado complexo'), el('p', '', 'Usa uma ficha completa já criada, com atributos, classes, perícias, inventário, ataques e magias.'));
  tipos.append(comumInfo, complexoInfo);

  const ferramentas = el('div', 'ficha-aliados-ferramentas');
  const busca = input('Buscar aliado', '', { tipo: 'search', placeholder: 'Buscar nome, papel, espécie ou observação...' });
  const filtroTipo = select('Filtrar aliados por tipo', [
    { id: '', titulo: 'Todos os tipos' },
    { id: 'comum', titulo: 'Aliados comuns' },
    { id: 'complexo', titulo: 'Aliados complexos' },
  ]);
  const filtroCena = select('Filtrar aliados por presença', [
    { id: '', titulo: 'Todos' },
    { id: 'emCena', titulo: 'Em cena' },
    { id: 'fora', titulo: 'Fora de cena' },
  ]);
  const contador = el('span', 'ficha-aliados-contador');
  ferramentas.append(busca, filtroTipo, filtroCena, contador);
  const grade = el('div', 'ficha-aliados-grade');
  pagina.append(topo, resumo, tipos, ferramentas, grade);
  container.appendChild(pagina);

  function personagensPorId() {
    return new Map(listarPersonagens().map(item => [item.id, item]));
  }

  function salvar(novaLista, mensagem = '') {
    const resultado = atualizarPersonagem(personagem.id, { aliados: novaLista });
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return false;
    }
    Object.assign(personagem, resultado.personagem);
    aliados = [...personagem.aliados];
    atualizarTela();
    if (mensagem) ctx.mostrarToast(mensagem, 'sucesso');
    return true;
  }

  function abrirEditorComum(aliado = null) {
    const form = el('form', 'ficha-aliado-form');
    const nome = input('Nome do aliado', aliado?.nome, { placeholder: 'Ex.: Corvo de vigília', maxLength: 100 });
    const especie = input('Tipo ou espécie do aliado', aliado?.especie || 'Aliado', { placeholder: 'Ex.: Animal, Espírito, Invocação...', maxLength: 80 });
    const papel = input('Papel do aliado', aliado?.papel, { placeholder: 'Ex.: Batedor, Montaria, Suporte...', maxLength: 80 });
    const nivel = input('Nível do aliado', aliado?.nivel ?? 1, { tipo: 'number', min: 0, max: 99 });
    const vidaAtual = input('Vida atual do aliado', aliado?.vidaAtual ?? 10, { tipo: 'number', min: -999999, max: 999999 });
    const vidaMaxima = input('Vida máxima do aliado', aliado?.vidaMaxima ?? 10, { tipo: 'number', min: 1, max: 999999 });
    const vidaGrupo = el('div', 'ficha-aliado-vida-grupo');
    vidaGrupo.append(vidaAtual, el('span', '', '/'), vidaMaxima);
    const defesa = input('Defesa do aliado', aliado?.defesa ?? 10, { tipo: 'number', min: -999, max: 999 });
    const movimento = input('Movimento do aliado', aliado?.movimento, { placeholder: 'Ex.: 9 m, voo 12 m', maxLength: 60 });
    const iniciativa = input('Iniciativa do aliado', aliado?.iniciativa ?? 0, { tipo: 'number', min: -999, max: 999 });
    const ataqueNome = input('Ataque principal do aliado', aliado?.ataqueNome, { placeholder: 'Ex.: Mordida', maxLength: 100 });
    const bonusAtaque = input('Bônus do ataque do aliado', aliado?.bonusAtaque ?? 0, { tipo: 'number', min: -999, max: 999 });
    const dano = input('Dano do aliado', aliado?.dano, { placeholder: 'Ex.: 1d8 + 2', maxLength: 100 });
    const alcance = input('Alcance do ataque do aliado', aliado?.alcance, { placeholder: 'Ex.: Corpo a corpo, 18 m', maxLength: 80 });
    const habilidades = input('Habilidades do aliado', aliado?.habilidades, { textarea: true, linhas: 5, placeholder: 'Traços, sentidos e ações especiais...', maxLength: 3000 });
    const condicoes = input('Condições do aliado', aliado?.condicoes, { placeholder: 'Ex.: Envenenado, oculto...', maxLength: 500 });
    const nota = input('Observações do aliado', aliado?.nota, { textarea: true, linhas: 5, placeholder: 'Personalidade, vínculo, ordens e outras informações...', maxLength: 3000 });
    const emCena = input('Aliado em cena', '', { tipo: 'checkbox' });
    emCena.checked = aliado?.emCena !== false;
    const emCenaCampo = el('label', 'ficha-aliado-em-cena-campo');
    emCenaCampo.append(emCena, el('span', '', 'Este aliado está em cena'));
    form.append(
      campo('Nome', nome, 'ficha-aliado-form-nome'),
      campo('Tipo / espécie', especie),
      campo('Papel na companhia', papel),
      campo('Nível', nivel),
      emCenaCampo,
      campo('Vida atual / máxima', vidaGrupo, 'ficha-aliado-form-vida'),
      campo('Defesa', defesa),
      campo('Movimento', movimento),
      campo('Iniciativa', iniciativa),
      campo('Ataque principal', ataqueNome),
      campo('Bônus do ataque', bonusAtaque),
      campo('Dano', dano),
      campo('Alcance', alcance),
      campo('Condições ativas', condicoes, 'ficha-aliado-form-largo'),
      campo('Habilidades e ações especiais', habilidades, 'ficha-aliado-form-largo'),
      campo('Observações', nota, 'ficha-aliado-form-largo'),
    );
    const erro = el('p', 'ficha-modal-erro ficha-aliado-form-largo');
    erro.hidden = true;
    const acoes = el('div', 'ficha-colecao-form-acoes ficha-aliado-form-largo');
    const cancelar = botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples);
    const confirmar = el('button', 'ficha-cta-btn', aliado ? 'Salvar aliado' : 'Adicionar aliado');
    confirmar.type = 'submit';
    acoes.append(cancelar, confirmar);
    form.append(erro, acoes);
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      if (nome.value.trim().length < 2) {
        erro.textContent = 'Informe um nome com pelo menos 2 caracteres.';
        erro.hidden = false;
        nome.focus();
        return;
      }
      const dados = {
        ...(aliado || {}),
        categoria: 'comum',
        nome: nome.value,
        especie: especie.value,
        papel: papel.value,
        nivel: nivel.value,
        vidaAtual: vidaAtual.value,
        vidaMaxima: vidaMaxima.value,
        defesa: defesa.value,
        movimento: movimento.value,
        iniciativa: iniciativa.value,
        ataqueNome: ataqueNome.value,
        bonusAtaque: bonusAtaque.value,
        dano: dano.value,
        alcance: alcance.value,
        habilidades: habilidades.value,
        condicoes: condicoes.value,
        nota: nota.value,
        emCena: emCena.checked,
      };
      const normalizado = aliado ? normalizarAliado(dados) : criarAliadoComum(dados);
      const novaLista = aliado
        ? aliados.map(item => item.id === aliado.id ? normalizado : item)
        : [...aliados, normalizado];
      if (salvar(novaLista, aliado ? 'Aliado atualizado.' : 'Aliado comum adicionado.')) fecharModalSimples();
    });
    abrirModalSimples({
      titulo: aliado ? `Editar — ${aliado.nome}` : 'Novo aliado comum',
      corpo: form,
      classeExtra: 'ficha-modal--aliado-editor',
    });
    nome.focus();
  }

  function abrirVinculoComplexo() {
    const vinculados = new Set(aliados.filter(item => item.categoria === 'complexo').map(item => item.personagemId));
    const disponiveis = listarPersonagens().filter(item => item.id !== personagem.id && !vinculados.has(item.id));
    const corpo = el('div', 'ficha-aliado-vinculo');
    const intro = el('p', 'ficha-calculo-formula', 'Escolha uma ficha existente. O aliado continuará sendo uma ficha independente e receberá todas as futuras melhorias do sistema.');
    corpo.appendChild(intro);
    const lista = el('div', 'ficha-aliado-vinculo-lista');
    if (!disponiveis.length) {
      const vazio = el('div', 'ficha-colecao-vazio');
      vazio.append(el('strong', '', 'Nenhuma outra ficha disponível.'), el('span', '', 'Crie uma ficha completa primeiro e depois volte para vinculá-la.'));
      lista.appendChild(vazio);
    } else disponiveis.forEach(candidato => {
      const item = el('article', 'ficha-aliado-vinculo-item');
      const avatar = el('span', 'ficha-aliado-avatar', candidato.nome.charAt(0).toLocaleUpperCase('pt-BR'));
      const texto = el('div');
      texto.append(
        el('strong', '', candidato.nome),
        el('span', '', `Nível ${candidato.nivel} · ${nomeClasse(candidato, ctx.catalogo)}`),
      );
      const vincular = botao('Vincular', 'ficha-cta-btn', () => {
        const vinculo = criarVinculoAliado(candidato.id, { papel: '', emCena: true });
        if (salvar([...aliados, vinculo], `${candidato.nome} foi vinculado como aliado complexo.`)) fecharModalSimples();
      });
      item.append(avatar, texto, vincular);
      lista.appendChild(item);
    });
    corpo.appendChild(lista);
    const criarFicha = botao('Criar uma nova ficha completa', 'ficha-cta-btn ficha-cta-btn--secundario ficha-aliado-criar-ficha', () => {
      fecharModalSimples();
      router.navegar('/');
    });
    corpo.appendChild(criarFicha);
    abrirModalSimples({ titulo: 'Vincular aliado complexo', corpo, classeExtra: 'ficha-modal--aliado-vinculo' });
  }

  function alterarAliado(aliado, alteracoes, mensagem = '') {
    const atualizado = normalizarAliado({ ...aliado, ...alteracoes });
    salvar(aliados.map(item => item.id === aliado.id ? atualizado : item), mensagem);
  }

  function alterarVida(aliado, delta) {
    alterarAliado(aliado, {
      vidaAtual: Math.max(-aliado.vidaMaxima, Math.min(aliado.vidaMaxima, aliado.vidaAtual + delta)),
    });
  }

  function abrirDetalhesComum(aliado) {
    const corpo = el('div', 'ficha-aliado-detalhes');
    const gradeDetalhes = el('dl', 'ficha-aliado-detalhes-grade');
    [
      ['Tipo / espécie', aliado.especie],
      ['Papel', aliado.papel || 'Não informado'],
      ['Nível', aliado.nivel || '—'],
      ['Vida', `${aliado.vidaAtual} / ${aliado.vidaMaxima}`],
      ['Defesa', aliado.defesa],
      ['Movimento', aliado.movimento || 'Não informado'],
      ['Iniciativa', sinal(aliado.iniciativa)],
      ['Presença', aliado.emCena ? 'Em cena' : 'Fora de cena'],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('dt', '', rotulo), el('dd', '', String(valor)));
      gradeDetalhes.appendChild(item);
    });
    corpo.appendChild(gradeDetalhes);
    const ataque = el('section');
    ataque.append(el('h3', '', 'Ataque principal'), el('p', '', aliado.ataqueNome
      ? `${aliado.ataqueNome} ${sinal(aliado.bonusAtaque)} · ${aliado.dano || 'dano não informado'} · ${aliado.alcance || 'alcance não informado'}`
      : 'Nenhum ataque principal informado.'));
    const habilidades = el('section');
    habilidades.append(el('h3', '', 'Habilidades e ações'), el('p', '', aliado.habilidades || 'Nenhuma habilidade registrada.'));
    const observacoes = el('section');
    observacoes.append(el('h3', '', 'Observações'), el('p', '', aliado.nota || 'Nenhuma observação registrada.'));
    corpo.append(ataque, habilidades, observacoes);
    if (aliado.condicoes) corpo.appendChild(el('p', 'ficha-aliado-condicoes-aviso', `Condições: ${aliado.condicoes}`));
    const acoes = el('div', 'ficha-colecao-detalhe-acoes');
    acoes.appendChild(botao('Editar aliado', 'ficha-cta-btn', () => abrirEditorComum(aliado)));
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: aliado.nome, corpo, classeExtra: 'ficha-modal--aliado-detalhes' });
  }

  function abrirRemocao(aliado, nome) {
    const complexo = aliado.categoria === 'complexo';
    const corpo = el('div', 'ficha-colecao-exclusao');
    corpo.appendChild(el('p', '', complexo
      ? `Desvincular “${nome}” desta companhia? A ficha completa não será apagada.`
      : `Remover o aliado comum “${nome}”?`));
    const acoes = el('div', 'ficha-colecao-form-acoes');
    acoes.append(
      botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples),
      botao(complexo ? 'Desvincular' : 'Remover aliado', 'ficha-cta-btn ficha-colecao-excluir-confirmar', () => {
        if (salvar(aliados.filter(item => item.id !== aliado.id), complexo ? 'Ficha desvinculada.' : 'Aliado removido.')) fecharModalSimples();
      }),
    );
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: complexo ? 'Desvincular ficha' : 'Remover aliado', corpo, classeExtra: 'ficha-modal--confirmacao' });
  }

  function duplicarComum(aliado) {
    const copia = criarAliadoComum({ ...aliado, nome: `${aliado.nome} (cópia)` });
    salvar([...aliados, copia], 'Cópia do aliado criada.');
  }

  function criarCardComum(aliado) {
    const estado = estadoVida(aliado.vidaAtual, aliado.vidaMaxima);
    const card = el('article', 'ficha-aliado-card ficha-aliado-card--comum');
    card.dataset.estado = estado.id;
    const header = el('header');
    const avatar = el('span', 'ficha-aliado-avatar', aliado.nome.charAt(0).toLocaleUpperCase('pt-BR'));
    const identidade = el('div');
    identidade.append(
      el('span', 'ficha-aliado-categoria', 'Aliado comum'),
      el('h3', '', aliado.nome),
      el('span', '', [aliado.especie, aliado.papel].filter(Boolean).join(' · ')),
    );
    const status = el('span', `ficha-aliado-status ficha-aliado-status--${estado.id}`, estado.titulo);
    header.append(avatar, identidade, status);
    const vida = el('div', 'ficha-aliado-vida-rapida');
    const vidaTopo = el('div');
    vidaTopo.append(el('span', '', 'Vida'), el('strong', '', `${aliado.vidaAtual} / ${aliado.vidaMaxima}`));
    const controles = el('div');
    [-5, -1, 1, 5].forEach(delta => controles.appendChild(botao(
      delta > 0 ? `+${delta}` : String(delta),
      'ficha-aliado-vida-btn',
      () => alterarVida(aliado, delta),
      `${delta > 0 ? 'Aumentar' : 'Diminuir'} ${Math.abs(delta)} de Vida de ${aliado.nome}`,
    )));
    const barra = el('div', 'ficha-aliado-recurso-barra');
    const preenchimento = el('span');
    preenchimento.style.width = `${Math.max(0, Math.min(100, (aliado.vidaAtual / aliado.vidaMaxima) * 100))}%`;
    barra.appendChild(preenchimento);
    vida.append(vidaTopo, barra, controles);
    const stats = el('div', 'ficha-aliado-stats');
    [
      ['Defesa', aliado.defesa],
      ['Movimento', aliado.movimento || '—'],
      ['Iniciativa', sinal(aliado.iniciativa)],
      ['Nível', aliado.nivel || '—'],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('span', '', rotulo), el('strong', '', String(valor)));
      stats.appendChild(item);
    });
    const ataque = el('div', 'ficha-aliado-ataque');
    ataque.append(
      el('span', '', 'Ataque principal'),
      el('strong', '', aliado.ataqueNome || 'Não informado'),
      el('small', '', aliado.ataqueNome ? `${sinal(aliado.bonusAtaque)} · ${aliado.dano || 'dano —'} · ${aliado.alcance || 'alcance —'}` : 'Edite o aliado para cadastrar.'),
    );
    const descricao = el('p', 'ficha-aliado-descricao', aliado.nota || aliado.habilidades || 'Sem observações registradas.');
    if (aliado.condicoes) descricao.classList.add('ficha-aliado-descricao--condicao');
    const footer = el('footer');
    const cena = botao(aliado.emCena ? 'Em cena' : 'Fora de cena', `ficha-aliado-cena ${aliado.emCena ? 'ficha-aliado-cena--ativa' : ''}`, () => alterarAliado(aliado, { emCena: !aliado.emCena }));
    cena.setAttribute('aria-pressed', String(Boolean(aliado.emCena)));
    const acoes = el('div');
    acoes.append(
      botao('?', 'ficha-info-btn', () => abrirDetalhesComum(aliado), `Ver detalhes de ${aliado.nome}`),
      botao('Editar', 'ficha-aliado-acao', () => abrirEditorComum(aliado)),
      botao('Duplicar', 'ficha-aliado-acao', () => duplicarComum(aliado)),
      botao('×', 'ficha-info-btn ficha-colecao-excluir', () => abrirRemocao(aliado, aliado.nome), `Remover ${aliado.nome}`),
    );
    footer.append(cena, acoes);
    card.append(header, vida, stats, ataque, descricao, footer);
    return card;
  }

  function criarCardComplexo(aliado, vinculado) {
    const card = el('article', 'ficha-aliado-card ficha-aliado-card--complexo');
    if (!vinculado) card.classList.add('ficha-aliado-card--ausente');
    const nome = vinculado?.nome || 'Ficha não encontrada';
    const header = el('header');
    const avatar = el('span', 'ficha-aliado-avatar ficha-aliado-avatar--complexo', nome.charAt(0).toLocaleUpperCase('pt-BR'));
    const identidade = el('div');
    identidade.append(
      el('span', 'ficha-aliado-categoria', 'Aliado complexo'),
      el('h3', '', nome),
      el('span', '', vinculado ? `Nível ${vinculado.nivel} · ${nomeClasse(vinculado, ctx.catalogo)}` : 'O personagem vinculado foi removido.'),
    );
    const status = el('span', 'ficha-aliado-status ficha-aliado-status--complexo', 'Ficha completa');
    header.append(avatar, identidade, status);
    if (!vinculado) {
      const aviso = el('div', 'ficha-aliado-vinculo-ausente');
      aviso.append(el('strong', '', 'Vínculo quebrado'), el('span', '', 'A ficha completa não existe mais neste navegador.'));
      const footer = el('footer');
      footer.append(el('span', '', 'Nenhum dado foi duplicado.'), botao('Desvincular', 'ficha-aliado-acao', () => abrirRemocao(aliado, nome)));
      card.append(header, aviso, footer);
      return card;
    }
    const vidaMaxima = maximoRecurso(vinculado, 'vida');
    const manaMaxima = maximoRecurso(vinculado, 'mana');
    const recursos = el('div', 'ficha-aliado-recursos-complexos');
    recursos.append(
      recursoBarra('Vida', Number(vinculado.recursos?.vidaAtual) || 0, vidaMaxima, 'vida'),
      recursoBarra('Mana', Number(vinculado.recursos?.manaAtual) || 0, manaMaxima, 'mana'),
    );
    const stats = el('div', 'ficha-aliado-stats ficha-aliado-stats--complexo');
    [
      ['Defesa', defesaPersonagem(vinculado)],
      ['Ataques', (vinculado.ataques || []).length],
      ['Magias', (vinculado.magias || []).length],
      ['Inventário', (vinculado.inventario || []).length],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('span', '', rotulo), el('strong', '', String(valor)));
      stats.appendChild(item);
    });
    const descricao = el('p', 'ficha-aliado-descricao', aliado.nota || aliado.papel || 'Todos os detalhes são mantidos na ficha completa vinculada.');
    const footer = el('footer');
    const abrir = botao('Abrir ficha completa', 'ficha-aliado-abrir-ficha', () => router.navegar(`/personagem/${vinculado.id}/ficha`));
    const acoes = el('div');
    const cena = botao(aliado.emCena ? 'Em cena' : 'Fora', `ficha-aliado-cena ${aliado.emCena ? 'ficha-aliado-cena--ativa' : ''}`, () => alterarAliado(aliado, { emCena: !aliado.emCena }));
    cena.setAttribute('aria-pressed', String(Boolean(aliado.emCena)));
    acoes.append(
      cena,
      botao('Desvincular', 'ficha-aliado-acao', () => abrirRemocao(aliado, nome)),
    );
    footer.append(abrir, acoes);
    card.append(header, recursos, stats, descricao, footer);
    return card;
  }

  function atualizarResumo() {
    resumoRefs.total.textContent = String(aliados.length);
    resumoRefs.comuns.textContent = String(aliados.filter(item => item.categoria === 'comum').length);
    resumoRefs.complexos.textContent = String(aliados.filter(item => item.categoria === 'complexo').length);
    resumoRefs.emCena.textContent = String(aliados.filter(item => item.emCena).length);
  }

  function atualizarTela() {
    atualizarResumo();
    grade.replaceChildren();
    const porId = personagensPorId();
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const visiveis = aliados.filter(aliado => {
      const vinculado = aliado.categoria === 'complexo' ? porId.get(aliado.personagemId) : null;
      const texto = aliado.categoria === 'comum'
        ? `${aliado.nome} ${aliado.especie} ${aliado.papel} ${aliado.nota} ${aliado.habilidades} ${aliado.condicoes}`
        : `${vinculado?.nome || ''} ${aliado.papel} ${aliado.nota} ${vinculado ? nomeClasse(vinculado, ctx.catalogo) : ''}`;
      return (!termo || texto.toLocaleLowerCase('pt-BR').includes(termo))
        && (!filtroTipo.value || aliado.categoria === filtroTipo.value)
        && (!filtroCena.value || (filtroCena.value === 'emCena' ? aliado.emCena : !aliado.emCena));
    });
    contador.textContent = `${visiveis.length} de ${aliados.length}`;
    if (!visiveis.length) {
      const vazio = el('div', 'ficha-colecao-vazio ficha-aliados-vazio');
      vazio.append(
        el('strong', '', aliados.length ? 'Nenhum aliado corresponde aos filtros.' : 'A companhia ainda está vazia.'),
        el('span', '', aliados.length ? 'Altere a busca ou os filtros.' : 'Adicione um aliado comum ou vincule uma ficha completa.'),
      );
      grade.appendChild(vazio);
      return;
    }
    visiveis.sort((a, b) => Number(b.emCena) - Number(a.emCena) || a.categoria.localeCompare(b.categoria))
      .forEach(aliado => grade.appendChild(aliado.categoria === 'comum'
        ? criarCardComum(aliado)
        : criarCardComplexo(aliado, porId.get(aliado.personagemId))));
  }

  busca.addEventListener('input', atualizarTela);
  filtroTipo.addEventListener('change', atualizarTela);
  filtroCena.addEventListener('change', atualizarTela);
  atualizarTela();
}
