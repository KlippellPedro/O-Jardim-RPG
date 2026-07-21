import { router } from '../../../../core/router.js';
import { NOMES_ATRIBUTOS } from '../../../config/nomesAtributos.js';
import { atualizarPersonagem } from '../../../services/personagensService.js';
import { dadosCalculoAtaque, normalizarAtaque } from '../../../services/ataquesService.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';
import { adicionarRolagem } from '../rolarBotao.js';

const PERICIAS = [
  { id: 'luta', titulo: 'Luta' },
  { id: 'pontaria', titulo: 'Pontaria' },
];

function el(tag, classe = '', texto = '') {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (texto !== '') elemento.textContent = texto;
  return elemento;
}

function sinal(valor) {
  const numero = Number(valor) || 0;
  return numero >= 0 ? `+${numero}` : String(numero);
}

function input(aria, valor = '', opcoes = {}) {
  const controle = document.createElement(opcoes.textarea ? 'textarea' : 'input');
  controle.className = 'ficha-campo-input';
  controle.setAttribute('aria-label', aria);
  if (opcoes.textarea) controle.rows = opcoes.linhas || 4;
  else controle.type = opcoes.tipo || 'text';
  if (opcoes.placeholder) controle.placeholder = opcoes.placeholder;
  if (opcoes.maxLength) controle.maxLength = opcoes.maxLength;
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

function situacaoRolagem(rolagem) {
  const vantagens = Math.max(0, Number(rolagem?.vantagens) || 0);
  const desvantagens = Math.max(0, Number(rolagem?.desvantagens) || 0);
  const saldo = vantagens - desvantagens;
  if (saldo > 0) return { tipo: 'vantagem', curto: `V +${saldo}`, titulo: `Vantagem +${saldo}`, saldo };
  if (saldo < 0) return { tipo: 'desvantagem', curto: `D +${Math.abs(saldo)}`, titulo: `Desvantagem +${Math.abs(saldo)}`, saldo };
  if (vantagens || desvantagens) return { tipo: 'neutra', curto: 'Neutra', titulo: 'Fontes neutralizadas', saldo };
  return { tipo: 'normal', curto: 'Normal', titulo: 'Rolagem normal', saldo };
}

function instrucao(rolagem, bonus) {
  const vantagens = Math.max(0, Number(rolagem?.vantagens) || 0);
  const desvantagens = Math.max(0, Number(rolagem?.desvantagens) || 0);
  const estado = situacaoRolagem({ vantagens, desvantagens });
  const fontes = `${vantagens}V − ${desvantagens}D`;
  if (estado.saldo > 0) return `${fontes}: role 2d20, use o maior e some ${sinal(bonus)}.`;
  if (estado.saldo < 0) return `${fontes}: role 2d20, use o menor e some ${sinal(bonus)}.`;
  if (vantagens || desvantagens) return `${fontes}: as fontes se anulam. Role 1d20 e some ${sinal(bonus)}.`;
  return `Role 1d20 e some ${sinal(bonus)}.`;
}

function linhaCalculo(lista, nome, valor) {
  const linha = el('div', 'ficha-calculo-linha');
  if (Number(valor) < 0) linha.classList.add('ficha-calculo-linha--negativa');
  linha.append(el('span', '', nome), el('strong', '', sinal(valor)));
  lista.appendChild(linha);
}

export function renderAtaques(container, personagem, ctx) {
  let ataques = [...(personagem.ataques || [])];
  let inventario = [...(personagem.inventario || [])];

  const pagina = el('section', 'ficha-ataques-pagina');
  const topo = el('header', 'ficha-ataques-topo');
  const topoTexto = el('div');
  topoTexto.append(
    el('h2', '', 'Ataques'),
    el('p', '', 'Acesso rápido às armas equipadas, dano e cálculo da rolagem durante o combate.'),
  );
  const topoLado = el('div', 'ficha-ataques-topo-lado');
  const resumo = el('div', 'ficha-ataques-resumo');
  const resumoValor = el('strong');
  resumo.append(resumoValor, el('span', '', 'ataques prontos'));
  const novo = botao('+ Ataque manual', 'ficha-cta-btn', () => abrirEditor());
  topoLado.append(resumo, novo);
  topo.append(topoTexto, topoLado);

  const integracao = el('div', 'ficha-ataques-integracao');
  const integracaoTexto = el('div');
  integracaoTexto.append(
    el('strong', '', 'Armas equipadas aparecem aqui automaticamente'),
    el('span', '', 'Configure dano, crítico e munição no Inventário. Ataques manuais continuam independentes.'),
  );
  integracao.append(
    el('span', 'ficha-ataques-integracao-icone', '⚔'),
    integracaoTexto,
    botao('Gerenciar armas', 'ficha-cta-btn ficha-cta-btn--secundario', abrirInventario),
  );

  const ferramentas = el('div', 'ficha-ataques-ferramentas');
  const busca = input('Buscar ataque', '', { tipo: 'search', placeholder: 'Buscar ataque, dano, tipo ou descrição...' });
  const filtroPericia = select('Filtrar por perícia', [{ id: '', titulo: 'Todas as perícias' }, ...PERICIAS]);
  const filtroOrigem = select('Filtrar por origem', [
    { id: '', titulo: 'Todas as origens' },
    { id: 'inventario', titulo: 'Armas equipadas' },
    { id: 'manual', titulo: 'Ataques manuais' },
  ]);
  const contador = el('span', 'ficha-ataques-contador');
  ferramentas.append(busca, filtroPericia, filtroOrigem, contador);
  const grade = el('div', 'ficha-ataques-grade');
  pagina.append(topo, integracao, ferramentas, grade);
  container.appendChild(pagina);

  function abrirInventario() {
    router.navegar(`/personagem/${personagem.id}/inventario`);
  }

  function atualizarEstado(resultado, mensagem = '') {
    if (!resultado.ok) {
      ctx.mostrarToast(resultado.mensagem, 'erro');
      return false;
    }
    Object.assign(personagem, resultado.personagem);
    ataques = [...personagem.ataques];
    inventario = [...personagem.inventario];
    atualizarTela();
    if (mensagem) ctx.mostrarToast(mensagem, 'sucesso');
    return true;
  }

  function salvarAtaques(novaLista, mensagem = '') {
    return atualizarEstado(atualizarPersonagem(personagem.id, { ataques: novaLista }), mensagem);
  }

  function salvarInventario(novaLista, mensagem = '') {
    return atualizarEstado(atualizarPersonagem(personagem.id, { inventario: novaLista }), mensagem);
  }

  function abrirEditor(ataque = null) {
    if (ataque?.origemItemId) return;
    const form = el('form', 'ficha-ataque-form');
    const nome = input('Nome do ataque', ataque?.nome, { placeholder: 'Ex.: Golpe desarmado', maxLength: 100 });
    const pericia = select('Perícia do ataque', PERICIAS, ataque?.pericia || 'luta');
    const dano = input('Dano', ataque?.dano, { placeholder: 'Ex.: 1d6 + 2', maxLength: 100 });
    const tipo = input('Tipo de dano', ataque?.tipo, { placeholder: 'Ex.: Impacto', maxLength: 100 });
    const critico = input('Crítico', ataque?.critico, { placeholder: 'Ex.: 19–20 / ×2', maxLength: 80 });
    const alcance = input('Alcance', ataque?.alcance, { placeholder: 'Ex.: Corpo a corpo', maxLength: 100 });
    const descricao = input('Descrição', ataque?.descricao, {
      textarea: true,
      linhas: 5,
      placeholder: 'Efeitos, propriedades e observações para usar em mesa...',
      maxLength: 2000,
    });
    form.append(
      campo('Nome', nome, 'ficha-ataque-form-nome'),
      campo('Perícia', pericia),
      campo('Dano', dano),
      campo('Tipo de dano', tipo),
      campo('Crítico', critico),
      campo('Alcance', alcance),
      campo('Descrição e observações', descricao, 'ficha-ataque-form-largo'),
    );
    const erro = el('p', 'ficha-modal-erro ficha-ataque-form-largo');
    erro.hidden = true;
    const acoes = el('div', 'ficha-colecao-form-acoes ficha-ataque-form-largo');
    const cancelar = botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples);
    const salvar = el('button', 'ficha-cta-btn', ataque ? 'Salvar ataque' : 'Criar ataque');
    salvar.type = 'submit';
    acoes.append(cancelar, salvar);
    form.append(erro, acoes);
    form.addEventListener('submit', evento => {
      evento.preventDefault();
      if (nome.value.trim().length < 2) {
        erro.textContent = 'Informe um nome com pelo menos 2 caracteres.';
        erro.hidden = false;
        nome.focus();
        return;
      }
      const normalizado = normalizarAtaque({
        ...(ataque || {}),
        nome: nome.value,
        pericia: pericia.value,
        dano: dano.value,
        tipo: tipo.value,
        critico: critico.value,
        alcance: alcance.value,
        descricao: descricao.value,
      });
      const novaLista = ataque
        ? ataques.map(item => item.id === ataque.id ? normalizado : item)
        : [...ataques, normalizado];
      if (salvarAtaques(novaLista, ataque ? 'Ataque atualizado.' : 'Ataque manual criado.')) fecharModalSimples();
    });
    abrirModalSimples({
      titulo: ataque ? `Editar — ${ataque.nome}` : 'Novo ataque manual',
      corpo: form,
      classeExtra: 'ficha-modal--ataque-editor',
    });
    nome.focus();
  }

  function abrirExclusao(ataque) {
    const corpo = el('div', 'ficha-colecao-exclusao');
    corpo.appendChild(el('p', '', `Remover o ataque manual “${ataque.nome}”?`));
    const acoes = el('div', 'ficha-colecao-form-acoes');
    acoes.append(
      botao('Cancelar', 'ficha-cta-btn ficha-cta-btn--secundario', fecharModalSimples),
      botao('Remover ataque', 'ficha-cta-btn ficha-colecao-excluir-confirmar', () => {
        if (salvarAtaques(ataques.filter(item => item.id !== ataque.id), 'Ataque removido.')) fecharModalSimples();
      }),
    );
    corpo.appendChild(acoes);
    abrirModalSimples({ titulo: 'Remover ataque', corpo, classeExtra: 'ficha-modal--confirmacao' });
  }

  /* Modal curto do ataque: acerto e, logo depois, o dano. */
  function abrirRolagemDeAtaque(ataque) {
    const dados = dadosCalculoAtaque(personagem, ataque, ctx.catalogo);
    const arma = ataque.origemItemId ? inventario.find(item => item.id === ataque.origemItemId) : null;
    const corpo = el('div', 'ficha-calculo-modal');
    corpo.appendChild(el('p', 'ficha-calculo-formula',
      `${dados.pericia.titulo} · bônus ${sinal(dados.total)}${ataque.dano ? ` · dano ${ataque.dano}` : ''}`));

    const estado = situacaoRolagem(dados.rolagem);
    if (estado.tipo !== 'normal') {
      corpo.appendChild(el('p', `ficha-pericia-modal-situacao ficha-pericia-modal-situacao--${estado.tipo}`, estado.titulo));
    }

    const origem = {
      tipo: 'ataque',
      ataque: ataque.nome,
      pericia: dados.pericia.id,
      arma: arma?.nome || null,
      personagem: personagem.nome,
    };
    adicionarRolagem({
      corpo,
      titulo: `Ataque · ${ataque.nome}`,
      bonus: dados.total,
      rolagem: dados.rolagem,
      personagemId: personagem.id,
      origem,
      aoRolar: () => {
        if (!ataque.dano || corpo.querySelector('.ficha-rolagem-area--dano')) return;
        const area = adicionarRolagem({
          corpo,
          titulo: `Dano · ${ataque.nome}`,
          formula: ataque.dano,
          personagemId: personagem.id,
          origem: { ...origem, momento: 'dano' },
        });
        area.classList.add('ficha-rolagem-area--dano');
      },
    });
    abrirModalSimples({ titulo: `Rolar ${ataque.nome}`, corpo, classeExtra: 'ficha-modal--calculo' });
  }

  function abrirCalculo(ataque) {
    const dados = dadosCalculoAtaque(personagem, ataque, ctx.catalogo);
    const arma = ataque.origemItemId ? inventario.find(item => item.id === ataque.origemItemId) : null;
    const corpo = el('div', 'ficha-calculo-modal ficha-ataque-calculo');
    corpo.appendChild(el('p', 'ficha-calculo-formula', `${dados.pericia.titulo}: atributo + metade do nível + grau da perícia + efeitos ativos.`));
    const lista = el('div', 'ficha-calculo-lista');
    linhaCalculo(lista, `${NOMES_ATRIBUTOS[dados.atributo] || dados.atributo} ${dados.valorAtributo} · modificador`, dados.modAtributo);
    linhaCalculo(lista, `Metade do nível ${dados.nivel}`, dados.metadeNivel);
    linhaCalculo(lista, `Grau ${dados.grau}`, dados.bonusGrau);
    dados.efeitosBonus.forEach(efeito => linhaCalculo(lista, efeito.origemNome || efeito.descricao || 'Efeito ativo', efeito.valor));
    corpo.appendChild(lista);
    const estado = situacaoRolagem(dados.rolagem);
    const rolagem = el('div', `ficha-pericia-modal-situacao ficha-pericia-modal-situacao--${estado.tipo}`);
    rolagem.append(el('strong', '', estado.titulo), el('span', '', instrucao(dados.rolagem, dados.total)));
    corpo.appendChild(rolagem);
    const total = el('div', 'ficha-calculo-total');
    total.append(el('span', '', 'Bônus do ataque'), el('strong', '', sinal(dados.total)));
    corpo.appendChild(total);
    const ficha = el('dl', 'ficha-ataque-calculo-dados');
    [
      ['Dano', ataque.dano || 'Não informado'],
      ['Tipo', ataque.tipo || 'Não informado'],
      ['Crítico', ataque.critico || 'Não informado'],
      ['Alcance', ataque.alcance || 'Não informado'],
      ['Origem', arma ? `Arma equipada · ${arma.nome}` : 'Ataque manual'],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('dt', '', rotulo), el('dd', '', valor));
      ficha.appendChild(item);
    });
    corpo.appendChild(ficha);
    if (dados.efeitosRolagem.length) {
      const fontes = el('div', 'ficha-ataque-fontes');
      fontes.appendChild(el('strong', '', 'Fontes automáticas da rolagem'));
      const listaFontes = el('ul');
      dados.efeitosRolagem.forEach(efeito => {
        const tipo = efeito.tipo === 'pericia_vantagem' ? 'vantagem' : 'desvantagem';
        listaFontes.appendChild(el('li', '', `${efeito.origemNome || 'Efeito ativo'}: ${tipo} +${Math.max(0, Number(efeito.valor) || 0)}`));
      });
      fontes.appendChild(listaFontes);
      corpo.appendChild(fontes);
    }
    // Acerto e dano em sequência: o dano só aparece depois de rolar o ataque,
    // que é a ordem em que a mesa realmente joga.
    const origem = {
      tipo: 'ataque',
      ataque: ataque.nome,
      pericia: dados.pericia.id,
      arma: arma?.nome || null,
      personagem: personagem.nome,
    };
    adicionarRolagem({
      corpo,
      titulo: `Ataque · ${ataque.nome}`,
      bonus: dados.total,
      rolagem: dados.rolagem,
      personagemId: personagem.id,
      origem,
      aoRolar: () => {
        if (!ataque.dano || corpo.querySelector('.ficha-rolagem-area--dano')) return;
        const area = adicionarRolagem({
          corpo,
          titulo: `Dano · ${ataque.nome}`,
          formula: ataque.dano,
          personagemId: personagem.id,
          origem: { ...origem, momento: 'dano' },
        });
        area.classList.add('ficha-rolagem-area--dano');
      },
    });

    abrirModalSimples({ titulo: `Cálculo — ${ataque.nome}`, corpo, classeExtra: 'ficha-modal--ataque-calculo' });
  }

  function duplicar(ataque) {
    const copia = normalizarAtaque({ ...ataque, id: '', origemItemId: '', nome: `${ataque.nome} (cópia)` });
    salvarAtaques([...ataques, copia], 'Cópia manual criada.');
  }

  function alterarMunicao(arma, delta) {
    const maximo = Math.max(0, Number(arma.municaoMaxima) || 0);
    const atual = Math.max(0, Math.min(maximo, Number(arma.municaoAtual) || 0));
    const proximo = Math.max(0, Math.min(maximo, atual + delta));
    if (!maximo || proximo === atual) return;
    salvarInventario(
      inventario.map(item => item.id === arma.id ? { ...item, municaoAtual: proximo } : item),
      delta < 0 ? 'Munição gasta.' : 'Munição ajustada.',
    );
  }

  function cardAtaque(ataque) {
    const arma = ataque.origemItemId ? inventario.find(item => item.id === ataque.origemItemId) : null;
    const dados = dadosCalculoAtaque(personagem, ataque, ctx.catalogo);
    const estado = situacaoRolagem(dados.rolagem);
    const card = el('article', 'ficha-ataque-card');
    card.dataset.origem = arma ? 'inventario' : 'manual';
    card.dataset.situacao = estado.tipo;
    const header = el('header');
    const identidade = el('div');
    identidade.append(
      el('span', `ficha-ataque-origem ficha-ataque-origem--${arma ? 'inventario' : 'manual'}`, arma ? 'Arma equipada' : 'Ataque manual'),
      el('h3', '', ataque.nome),
      el('span', '', `${PERICIAS.find(item => item.id === ataque.pericia)?.titulo || 'Luta'} · ${NOMES_ATRIBUTOS[dados.atributo] || dados.atributo}`),
    );
    // Rolar fica no card, não escondido atrás do cálculo: é o que se faz no
    // meio da luta. O bônus continua clicável para conferir a conta.
    const acoesTopo = el('div', 'ficha-ataque-acoes-topo');
    const rolarAgora = botao('🎲', 'ficha-ataque-rolar', () => abrirRolagemDeAtaque(ataque), `Rolar ataque ${ataque.nome}`);
    const bonus = botao('', 'ficha-ataque-bonus', () => abrirCalculo(ataque), `Ver cálculo do ataque ${ataque.nome}`);
    bonus.append(el('span', '', 'Ataque'), el('strong', '', sinal(dados.total)));
    acoesTopo.append(rolarAgora, bonus);
    header.append(identidade, acoesTopo);
    const estatisticas = el('div', 'ficha-ataque-dados');
    [
      ['Dano', ataque.dano || '—'],
      ['Tipo', ataque.tipo || '—'],
      ['Crítico', ataque.critico || '—'],
      ['Alcance', ataque.alcance || '—'],
    ].forEach(([rotulo, valor]) => {
      const item = el('div');
      item.append(el('span', '', rotulo), el('strong', '', valor));
      estatisticas.appendChild(item);
    });
    const rolagem = el('div', 'ficha-ataque-rolagem');
    rolagem.append(el('strong', '', estado.curto), el('span', '', instrucao(dados.rolagem, dados.total)));
    card.append(header, estatisticas, rolagem, el('p', 'ficha-ataque-descricao', ataque.descricao || 'Sem propriedades ou observações registradas.'));
    if (arma?.municaoMaxima > 0) {
      const municao = el('div', 'ficha-ataque-municao');
      const controles = el('div');
      const menos = botao('−', '', () => alterarMunicao(arma, -1), `Gastar munição de ${arma.nome}`);
      menos.disabled = arma.municaoAtual <= 0;
      const mais = botao('+', '', () => alterarMunicao(arma, 1), `Recuperar munição de ${arma.nome}`);
      mais.disabled = arma.municaoAtual >= arma.municaoMaxima;
      controles.append(menos, el('strong', '', `${arma.municaoAtual} / ${arma.municaoMaxima}`), mais);
      municao.append(el('span', '', 'Munição'), controles);
      card.appendChild(municao);
    }
    const footer = el('footer');
    footer.appendChild(el('span', '', arma
      ? arma.durabilidadeMaxima > 0
        ? `Durabilidade ${arma.durabilidadeAtual}/${arma.durabilidadeMaxima}`
        : 'Sincronizado com o Inventário'
      : 'Criado diretamente nesta página'));
    const acoes = el('div');
    acoes.append(
      botao('?', 'ficha-info-btn', () => abrirCalculo(ataque), `Ver cálculo e fontes de ${ataque.nome}`),
      botao('Duplicar', 'ficha-ataque-acao', () => duplicar(ataque)),
    );
    if (arma) acoes.appendChild(botao('Inventário', 'ficha-ataque-acao', abrirInventario));
    else acoes.append(
      botao('Editar', 'ficha-ataque-acao', () => abrirEditor(ataque)),
      botao('×', 'ficha-info-btn ficha-colecao-excluir', () => abrirExclusao(ataque), `Remover ${ataque.nome}`),
    );
    footer.appendChild(acoes);
    card.appendChild(footer);
    return card;
  }

  function atualizarTela() {
    resumoValor.textContent = String(ataques.length);
    grade.replaceChildren();
    const termo = busca.value.trim().toLocaleLowerCase('pt-BR');
    const visiveis = ataques.filter(ataque => {
      const origem = ataque.origemItemId ? 'inventario' : 'manual';
      const texto = `${ataque.nome} ${ataque.dano} ${ataque.tipo} ${ataque.critico} ${ataque.alcance} ${ataque.descricao}`.toLocaleLowerCase('pt-BR');
      return (!termo || texto.includes(termo))
        && (!filtroPericia.value || ataque.pericia === filtroPericia.value)
        && (!filtroOrigem.value || origem === filtroOrigem.value);
    });
    contador.textContent = `${visiveis.length} de ${ataques.length}`;
    if (!visiveis.length) {
      const vazio = el('div', 'ficha-colecao-vazio ficha-ataques-vazio');
      vazio.append(
        el('strong', '', ataques.length ? 'Nenhum ataque corresponde aos filtros.' : 'Nenhum ataque pronto para usar.'),
        el('span', '', ataques.length ? 'Altere a busca ou os filtros.' : 'Equipe uma arma no Inventário ou crie um ataque manual.'),
      );
      grade.appendChild(vazio);
      return;
    }
    visiveis.sort((a, b) => Number(Boolean(b.origemItemId)) - Number(Boolean(a.origemItemId))
      || a.nome.localeCompare(b.nome, 'pt-BR'))
      .forEach(ataque => grade.appendChild(cardAtaque(ataque)));
  }

  busca.addEventListener('input', atualizarTela);
  filtroPericia.addEventListener('change', atualizarTela);
  filtroOrigem.addEventListener('change', atualizarTela);
  atualizarTela();
}
