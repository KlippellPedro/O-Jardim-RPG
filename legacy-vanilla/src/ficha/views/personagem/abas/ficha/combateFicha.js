import { calcularDerivados } from '../../../../services/calculoService.js';
import {
  listarEfeitosAtivos,
  somarModificadores,
} from '../../../../services/modificadoresService.js';
import { abrirModalSimples } from '../../modalSimples.js';
import { salvar, sinal, somaAjustes } from './fichaCompartilhada.js';

// ── Combate — cada stat calculado ganha um "?" (fórmula) e, quando pode
// receber bônus situacionais (armadura, terreno, evento...), um "±" que
// abre uma lista de ajustes nomeados em vez de um único campo numérico —
// mesmo padrão do projeto de referência (calc-help + ajuste personalizado).
// Defesa Natural, Iniciativa e Movimento usam o mesmo padrão de ajustes
// nomeados; Vida, Mana e Sanidade também reutilizam esse modal.

const FORMULAS_COMBATE = {
  Vida: 'Base racial: 10 + 2 × Mod. Força + 2 × Mod. Constituição. Chassi, modificações, ganhos de classe e ajustes personalizados são somados ao máximo quando aplicáveis.',
  Mana: 'Base racial: 6 + 2 × Mod. Inteligência + Mod. Sabedoria. Para Autômatos, a mesma barra representa Energia do Núcleo.',
  Sanidade: 'Base 100 + ajustes personalizados registrados pelo jogador.',
  Cansaço: 'Escala atual de 0 a 6. Quanto mais próximo de 6, mais crítico o estado.',
  Defesa: 'Defesa Natural (10 + metade do nível total + Mod. Destreza) + Armadura − Penalidade + ajustes personalizados.',
  'Iniciativa': '10 + metade do nível total + Mod. Destreza + Bônus/Penalidade + ajustes personalizados.',
  'Movimento': '9 m (padrão humano) + 1,5 m × Mod. Destreza + bônus da raça − Penalidade + ajustes personalizados. Um chassi que declare Movimento fixo substitui a fórmula-base.',
};

function estadoCansaco(valor) {
  return ['Disposto', 'Cansado', 'Fatigado', 'Esgotado', 'Exausto', 'Debilitado', 'Colapso'][Math.max(0, Math.min(6, Math.round(valor)))] || 'Disposto';
}

function efeitoCansaco(valor) {
  return [
    'Sem penalidade.',
    '−1 em testes físicos.',
    '−2 em testes físicos e −1 Iniciativa.',
    '−2 em todos os testes.',
    'Desvantagem em testes físicos; não pode treinar.',
    'Movimento pela metade e sem reações.',
    'Inconsciente até reduzir Cansaço.',
  ][Math.max(0, Math.min(6, Math.round(valor)))];
}

function estadoSanidade(valor) {
  if (valor <= 0) return 'Quebra';
  if (valor <= 25) return 'Ruptura';
  if (valor <= 50) return 'Enlouquecendo';
  if (valor <= 75) return 'Abalado';
  return 'Estável';
}

function efeitoSanidade(valor) {
  if (valor <= 0) return 'Crise imediata e condição permanente definida com o jogador.';
  if (valor <= 25) return 'Nova perda exige Vontade DT 15 ou causa uma condição de crise.';
  if (valor <= 50) return 'Desvantagem para manter concentração sob ameaça.';
  if (valor <= 75) return '−1 no primeiro teste mental após perder Sanidade.';
  return 'Sem efeito.';
}

function linhasAjustes(personagem, chave) {
  return (personagem.recursos?.[chave] || []).map(item => ({
    nome: [item.origem || 'Ajuste', item.motivo].filter(Boolean).join(' · '),
    valor: Number(item.valor) || 0,
  }));
}

function linhasEfeitos(personagem, tipo, alvo) {
  return listarEfeitosAtivos(personagem, tipo, alvo).map(efeito => ({
    nome: efeito.origemNome,
    valor: Number(efeito.valor) || 0,
  }));
}

function detalhesCalculo(rotulo, personagem, ctx) {
  const recursos = personagem.recursos || {};
  const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  const baseRacial = calcularDerivados(
    personagem.atributosFinais,
    raca,
    personagem.nivel,
    personagem.escolhaRacial,
  );
  const detalhes = [];
  let total = 0;
  let rotuloTotal = 'Total atual';

  if (rotulo === 'Vida' || rotulo === 'Mana') {
    const chave = rotulo === 'Vida' ? 'vida' : 'mana';
    const chaveAjustes = rotulo === 'Vida' ? 'ajustesVida' : 'ajustesMana';
    const base = baseRacial[chave];
    const armazenado = Number(personagem.derivados?.[chave]) || base;
    detalhes.push({ nome: 'Base de atributos e raça', valor: base, literal: true });
    const classes = armazenado - base;
    if (classes !== 0) detalhes.push({ nome: 'Progressão de classes', valor: classes });
    detalhes.push(...linhasAjustes(personagem, chaveAjustes));
    detalhes.push(...linhasEfeitos(personagem, 'recurso_maximo', chave));
    total = armazenado + somaAjustes(recursos[chaveAjustes]) + somarModificadores(personagem, 'recurso_maximo', chave);
    rotuloTotal = 'Máximo atual';
  } else if (rotulo === 'Sanidade') {
    detalhes.push({ nome: 'Base', valor: 100, literal: true });
    detalhes.push(...linhasAjustes(personagem, 'ajustesSanidade'));
    detalhes.push(...linhasEfeitos(personagem, 'recurso_maximo', 'sanidade'));
    const sanidadeAtual = Number(recursos.sanidade) || 0;
    detalhes.push({ nome: `Estado atual · ${estadoSanidade(sanidadeAtual)}`, valor: efeitoSanidade(sanidadeAtual), literal: true, negativo: sanidadeAtual <= 75 });
    total = Math.max(1, 100 + somaAjustes(recursos.ajustesSanidade) + somarModificadores(personagem, 'recurso_maximo', 'sanidade'));
    rotuloTotal = 'Máximo atual';
  } else if (rotulo === 'Cansaço') {
    const atual = Number(recursos.cansaco) || 0;
    detalhes.push({ nome: 'Nível atual', valor: atual, literal: true });
    detalhes.push({ nome: 'Estado', valor: estadoCansaco(atual), literal: true });
    detalhes.push({ nome: 'Efeito', valor: efeitoCansaco(atual), literal: true, negativo: atual > 0 });
    total = `${atual} / 6`;
    rotuloTotal = 'Cansaço atual';
  } else if (rotulo === 'Defesa') {
    const natural = Number(personagem.derivados?.defesaNatural) || 10;
    const armadura = Number(recursos.armadura) || 0;
    const penalidade = Math.abs(Number(recursos.penalidadeDefesa) || 0);
    const legado = Number(recursos.bonusDefesa) || 0;
    detalhes.push({ nome: 'Defesa Natural', valor: natural, literal: true });
    if (armadura !== 0) detalhes.push({ nome: 'Armadura', valor: armadura });
    if (penalidade !== 0) detalhes.push({ nome: 'Penalidade da Defesa', valor: -penalidade });
    if (legado !== 0) detalhes.push({ nome: 'Bônus legado', valor: legado });
    detalhes.push(...linhasAjustes(personagem, 'ajustesDefesa'));
    detalhes.push(...linhasEfeitos(personagem, 'combate', 'defesa'));
    total = natural + armadura - penalidade + legado + somaAjustes(recursos.ajustesDefesa) + somarModificadores(personagem, 'combate', 'defesa');
  } else if (rotulo === 'Iniciativa') {
    const base = Number(personagem.derivados?.iniciativa) || 10;
    const bonus = Number(recursos.bonusIniciativa) || 0;
    detalhes.push({ nome: 'Base calculada', valor: base, literal: true });
    if (bonus !== 0) detalhes.push({ nome: 'Bônus / Penalidade', valor: bonus });
    detalhes.push(...linhasAjustes(personagem, 'ajustesIniciativa'));
    detalhes.push(...linhasEfeitos(personagem, 'combate', 'iniciativa'));
    total = base + bonus + somaAjustes(recursos.ajustesIniciativa) + somarModificadores(personagem, 'combate', 'iniciativa');
  } else if (rotulo === 'Movimento') {
    const base = Number(personagem.derivados?.movimento) || 0;
    const penalidade = Math.abs(Number(recursos.penalidadeMovimento) || 0);
    detalhes.push({ nome: 'Base calculada', valor: `${base} m`, literal: true });
    if (penalidade !== 0) detalhes.push({ nome: 'Penalidade de Movimento', valor: `${-penalidade} m`, literal: true });
    detalhes.push(...linhasAjustes(personagem, 'ajustesMovimento'));
    detalhes.push(...linhasEfeitos(personagem, 'combate', 'movimento'));
    total = `${base - penalidade + somaAjustes(recursos.ajustesMovimento) + somarModificadores(personagem, 'combate', 'movimento')} m`;
  }
  return { detalhes, total, rotuloTotal };
}

function corpoModalCalculo(rotulo, personagem, ctx) {
  const corpo = document.createElement('div');
  corpo.className = 'ficha-calculo-modal';
  const formula = document.createElement('p');
  formula.className = 'ficha-calculo-formula';
  formula.textContent = FORMULAS_COMBATE[rotulo] || 'Fórmula ainda não documentada.';
  corpo.appendChild(formula);

  const { detalhes, total, rotuloTotal } = detalhesCalculo(rotulo, personagem, ctx);
  const lista = document.createElement('div');
  lista.className = 'ficha-calculo-lista';
  detalhes.forEach(item => {
    const linha = document.createElement('div');
    linha.className = 'ficha-calculo-linha';
    const nome = document.createElement('span');
    nome.textContent = item.nome;
    const valor = document.createElement('strong');
    valor.textContent = item.literal || typeof item.valor !== 'number'
      ? String(item.valor)
      : sinal(item.valor);
    if (item.negativo || (typeof item.valor === 'number' && item.valor < 0)) linha.classList.add('ficha-calculo-linha--negativa');
    linha.append(nome, valor);
    lista.appendChild(linha);
  });
  corpo.appendChild(lista);

  const totalEl = document.createElement('div');
  totalEl.className = 'ficha-calculo-total';
  totalEl.innerHTML = `<span>${rotuloTotal}</span><strong>${total}</strong>`;
  corpo.appendChild(totalEl);
  return corpo;
}

export function criarBotaoInfo(rotulo, personagem, ctx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-info-btn';
  btn.textContent = '?';
  btn.setAttribute('aria-label', `Como ${rotulo} é calculado`);
  btn.addEventListener('click', () => {
    abrirModalSimples({
      titulo: `Cálculo — ${rotulo}`,
      corpo: corpoModalCalculo(rotulo, personagem, ctx),
      classeExtra: 'ficha-modal--calculo',
    });
  });
  return btn;
}

function corpoModalAjustes(personagem, ctx, chave) {
  const container = document.createElement('div');
  container.className = 'ficha-ajustes-modal';

  const ajustes = [...(personagem.recursos?.[chave] || [])];

  const lista = document.createElement('div');
  lista.className = 'ficha-ajustes-lista';

  function salvarAjustes() {
    const salvou = salvar(personagem, ctx, { recursos: { ...personagem.recursos, [chave]: ajustes } });
    if (salvou && ['ajustesVida', 'ajustesMana', 'ajustesSanidade'].includes(chave)) {
      ctx.recarregar();
    }
  }

  function renderLista() {
    lista.innerHTML = '';
    if (ajustes.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'ficha-wizard-intro';
      vazio.textContent = 'Nenhum ajuste ainda — some itens abaixo (equipamento, evento, maldição...).';
      lista.appendChild(vazio);
      return;
    }
    ajustes.forEach((item, indice) => {
      const linha = document.createElement('div');
      linha.className = 'ficha-ajuste-linha';

      const valor = document.createElement('span');
      valor.className = 'ficha-ajuste-valor';
      valor.textContent = item.valor >= 0 ? `+${item.valor}` : String(item.valor);
      linha.appendChild(valor);

      const motivo = document.createElement('span');
      motivo.className = 'ficha-ajuste-motivo';
      motivo.textContent = [item.origem, item.motivo || '(sem motivo)'].filter(Boolean).join(' · ');
      linha.appendChild(motivo);

      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'ficha-crud-remover';
      remover.textContent = '×';
      remover.setAttribute('aria-label', `Remover ajuste ${valor.textContent}`);
      remover.addEventListener('click', () => {
        ajustes.splice(indice, 1);
        salvarAjustes();
        renderLista();
      });
      linha.appendChild(remover);

      lista.appendChild(linha);
    });
  }

  renderLista();
  container.appendChild(lista);

  const form = document.createElement('form');
  form.className = 'ficha-ajuste-form';

  const valorInput = document.createElement('input');
  valorInput.type = 'number';
  valorInput.className = 'ficha-campo-input';
  valorInput.placeholder = '+2 ou -1';
  valorInput.setAttribute('aria-label', 'Valor do ajuste');

  const motivoInput = document.createElement('input');
  motivoInput.type = 'text';
  motivoInput.className = 'ficha-campo-input';
  motivoInput.placeholder = 'Motivo (opcional)';
  motivoInput.setAttribute('aria-label', 'Motivo do ajuste');

  const origemSelect = document.createElement('select');
  origemSelect.className = 'ficha-campo-select ficha-ajuste-origem';
  origemSelect.setAttribute('aria-label', 'Origem do ajuste');
  ['Outro', 'Item', 'Poder', 'Habilidade', 'Raça', 'Classe', 'Evento', 'Condição'].forEach(origem => {
    const option = document.createElement('option');
    option.value = origem;
    option.textContent = origem;
    origemSelect.appendChild(option);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.className = 'ficha-cta-btn';
  addBtn.textContent = 'Adicionar';

  form.append(origemSelect, valorInput, motivoInput, addBtn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = Number(valorInput.value);
    if (!Number.isFinite(valor) || valor === 0) return;
    ajustes.push({ valor, motivo: motivoInput.value.trim(), origem: origemSelect.value });
    valorInput.value = '';
    motivoInput.value = '';
    salvarAjustes();
    renderLista();
  });
  container.appendChild(form);

  return container;
}

export function criarBotaoAjustes(personagem, ctx, chave, rotulo) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-info-btn ficha-info-btn--ajuste';
  btn.textContent = '±';
  btn.setAttribute('aria-label', `Ajustes personalizados de ${rotulo}`);
  const total = somaAjustes(personagem.recursos?.[chave]);
  if (total !== 0) {
    btn.classList.add('ficha-info-btn--ajuste-ativo');
    btn.title = `Ajustes ativos: ${sinal(total)}`;
  }
  btn.addEventListener('click', () => {
    abrirModalSimples({
      titulo: `Ajustes — ${rotulo}`,
      corpo: corpoModalAjustes(personagem, ctx, chave),
    });
  });
  return btn;
}

function criarStatCombate({ rotulo, valor, comAjustes, campos = [], personagem, ctx }) {
  const item = document.createElement('div');
  item.className = 'ficha-combate-stat-card';

  const linhaLabel = document.createElement('div');
  linhaLabel.className = 'ficha-wizard-stat-label-linha';

  const label = document.createElement('span');
  label.className = 'ficha-campo-label ficha-combate-stat-label';
  label.textContent = rotulo;
  linhaLabel.appendChild(label);

  const acoes = document.createElement('span');
  acoes.className = 'ficha-wizard-stat-acoes';
  acoes.appendChild(criarBotaoInfo(rotulo, personagem, ctx));
  if (comAjustes) acoes.appendChild(comAjustes);
  linhaLabel.appendChild(acoes);

  const valorEl = document.createElement('input');
  valorEl.type = 'text';
  valorEl.readOnly = true;
  valorEl.className = 'ficha-combate-stat-total';
  valorEl.value = valor;
  valorEl.setAttribute('aria-label', `${rotulo} total`);
  valorEl.dataset.statCalculado = rotulo;

  item.append(linhaLabel, valorEl, ...campos);
  return item;
}

function criarCampoCombateNumero(personagem, ctx, { chave, rotulo, valor = 0 }) {
  const grupo = document.createElement('label');
  grupo.className = 'ficha-combate-subcampo';
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'ficha-campo-input';
  input.value = valor;
  input.addEventListener('input', () => {
    salvar(personagem, ctx, {
      recursos: { ...personagem.recursos, [chave]: Number(input.value) || 0 },
    });
  });
  grupo.append(label, input);
  return grupo;
}

function criarCampoCombateTexto(personagem, ctx, { chave, rotulo, placeholder, valor = '' }) {
  const grupo = document.createElement('label');
  grupo.className = 'ficha-combate-anotacao';
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  const textarea = document.createElement('textarea');
  textarea.className = 'ficha-campo-input ficha-combate-textarea';
  textarea.rows = 5;
  textarea.value = valor;
  textarea.placeholder = placeholder;
  let temporizador = null;
  textarea.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      salvar(personagem, ctx, {
        recursos: { ...personagem.recursos, [chave]: textarea.value },
      });
    }, 300);
  });
  grupo.append(label, textarea);
  return grupo;
}

export function blocoCombate(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--combate';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Combate';
  bloco.appendChild(h);

  // bonusDefesa é o campo antigo (número solto) — quem já tinha um valor
  // aqui não perde nada; ajustesDefesa (lista nomeada) é o novo jeito de
  // somar, os dois se acumulam.
  const bonusDefesaLegado = personagem.recursos?.bonusDefesa ?? 0;
  const bonusDefesa = bonusDefesaLegado + somaAjustes(personagem.recursos?.ajustesDefesa);
  const bonusIniciativa = personagem.recursos?.bonusIniciativa ?? 0;
  const ajustesIniciativa = somaAjustes(personagem.recursos?.ajustesIniciativa);
  const ajustesMovimento = somaAjustes(personagem.recursos?.ajustesMovimento);
  const efeitoDefesa = somarModificadores(personagem, 'combate', 'defesa');
  const efeitoIniciativa = somarModificadores(personagem, 'combate', 'iniciativa');
  const efeitoMovimento = somarModificadores(personagem, 'combate', 'movimento');
  const armadura = Number(personagem.recursos?.armadura) || 0;
  const penalidadeDefesa = Math.abs(Number(personagem.recursos?.penalidadeDefesa) || 0);
  const penalidadeMovimento = Math.abs(Number(personagem.recursos?.penalidadeMovimento) || 0);

  const grade = document.createElement('div');
  grade.className = 'ficha-combate-stats';
  grade.appendChild(criarStatCombate({
    rotulo: 'Defesa',
    personagem,
    ctx,
    valor: (personagem.derivados?.defesaNatural ?? 10) + bonusDefesa + efeitoDefesa + armadura - penalidadeDefesa,
    comAjustes: criarBotaoAjustes(personagem, ctx, 'ajustesDefesa', 'Defesa'),
    campos: [
      criarCampoCombateNumero(personagem, ctx, { chave: 'armadura', rotulo: 'Armadura', valor: armadura }),
      criarCampoCombateNumero(personagem, ctx, {
        chave: 'penalidadeDefesa', rotulo: 'Penalidade da Defesa', valor: penalidadeDefesa,
      }),
    ],
  }));
  grade.appendChild(criarStatCombate({
    rotulo: 'Iniciativa',
    personagem,
    ctx,
    valor: (personagem.derivados?.iniciativa ?? 10) + bonusIniciativa + ajustesIniciativa + efeitoIniciativa,
    comAjustes: criarBotaoAjustes(personagem, ctx, 'ajustesIniciativa', 'Iniciativa'),
    campos: [
      criarCampoCombateNumero(personagem, ctx, {
        chave: 'bonusIniciativa', rotulo: 'Bônus / Penalidade', valor: bonusIniciativa,
      }),
    ],
  }));
  grade.appendChild(criarStatCombate({
    rotulo: 'Movimento',
    personagem,
    ctx,
    valor: `${(personagem.derivados?.movimento ?? 0) + ajustesMovimento + efeitoMovimento - penalidadeMovimento} m`,
    comAjustes: criarBotaoAjustes(personagem, ctx, 'ajustesMovimento', 'Movimento'),
    campos: [
      criarCampoCombateNumero(personagem, ctx, {
        chave: 'penalidadeMovimento', rotulo: 'Penalidade de Movimento', valor: penalidadeMovimento,
      }),
    ],
  }));
  bloco.appendChild(grade);

  const anotacoes = document.createElement('div');
  anotacoes.className = 'ficha-combate-anotacoes';
  anotacoes.append(
    criarCampoCombateTexto(personagem, ctx, {
      chave: 'resistencias',
      rotulo: 'Resistências',
      valor: personagem.recursos?.resistencias,
      placeholder: 'Ex.: Fogo 5, Corte 3, venenos...',
    }),
    criarCampoCombateTexto(personagem, ctx, {
      chave: 'proficiencias',
      rotulo: 'Proficiências',
      valor: personagem.recursos?.proficiencias,
      placeholder: 'Ex.: Armas simples, armaduras leves...',
    }),
    criarCampoCombateTexto(personagem, ctx, {
      chave: 'condicoesAtivas',
      rotulo: 'Condições Ativas',
      valor: personagem.recursos?.condicoesAtivas || personagem.recursos?.status,
      placeholder: 'Ex.: Envenenado (3 turnos), Caído...',
    }),
  );
  bloco.appendChild(anotacoes);

  return bloco;
}

