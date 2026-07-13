// Card reutilizado por todas as perícias. Grau, atributo e fontes de
// vantagem/desvantagem são persistidos separadamente para que possam mudar
// durante a campanha sem alterar o catálogo base.

import {
  GRAUS_PERICIA,
  GRAUS_INFO,
  NIVEL_MINIMO_GRAU,
  modificador,
  calcularBonusPericia,
} from '../../services/calculoService.js';
import { NOMES_ATRIBUTOS } from '../../config/nomesAtributos.js';
import {
  modificadoresRolagemPericia,
  somarModificadores,
  valorAtributoEfetivo,
} from '../../services/modificadoresService.js';

function textoBonus(valor) {
  return valor >= 0 ? `+${valor}` : String(valor);
}

function estadoRolagem(rolagem) {
  const vantagens = Math.max(0, Number(rolagem?.vantagens) || 0);
  const desvantagens = Math.max(0, Number(rolagem?.desvantagens) || 0);
  const saldo = vantagens - desvantagens;
  if (saldo > 0) return { tipo: 'vantagem', texto: `V +${saldo}`, vantagens, desvantagens, saldo };
  if (saldo < 0) return { tipo: 'desvantagem', texto: `D +${Math.abs(saldo)}`, vantagens, desvantagens, saldo };
  if (vantagens || desvantagens) return { tipo: 'neutra', texto: 'Neutro', vantagens, desvantagens, saldo };
  return { tipo: 'normal', texto: 'Normal', vantagens, desvantagens, saldo };
}

export function criarLinhaGrauPericia(personagem, item, {
  aoMudarGrau,
  aoMudarAtributo,
  aoEditarRolagem,
  aoAbrirDetalhes,
  aoEditar,
}) {
  const linha = document.createElement('div');
  linha.className = 'ficha-pericia-linha';
  if (item.personalizada) linha.classList.add('ficha-pericia-linha--personalizada');
  linha.dataset.nome = `${item.titulo} ${item.tipo || ''} ${item.descricao || ''} ${item.uso || ''}`.toLocaleLowerCase('pt-BR');

  const identidade = document.createElement('div');
  identidade.className = 'ficha-pericia-identidade';
  const nome = document.createElement('strong');
  nome.className = 'ficha-pericia-nome';
  nome.textContent = item.titulo;
  const detalhe = document.createElement('span');
  detalhe.className = 'ficha-pericia-descricao';
  const detalheBase = item.uso || item.descricao || 'Teste geral desta perícia.';
  detalhe.textContent = item.personalizada
    ? `${item.tipo === 'oficio' ? 'Ofício personalizado' : 'Perícia personalizada'} · ${detalheBase}`
    : detalheBase;
  identidade.append(nome, detalhe);

  let atributoAtual = personagem.atributosPericias?.[item.id] || item.atributo;
  linha.dataset.atributo = atributoAtual;
  const atributoSelect = document.createElement('select');
  atributoSelect.className = 'ficha-campo-select ficha-pericia-atributo';
  atributoSelect.setAttribute('aria-label', `Atributo de ${item.titulo}`);
  Object.entries(NOMES_ATRIBUTOS).forEach(([id, titulo]) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = titulo;
    option.selected = id === atributoAtual;
    atributoSelect.appendChild(option);
  });

  let grauAtual = personagem.pericias?.[item.id] || 'iniciante';
  const selectGrau = document.createElement('select');
  selectGrau.className = 'ficha-campo-select ficha-pericia-select';
  selectGrau.setAttribute('aria-label', `Grau de ${item.titulo}`);
  GRAUS_PERICIA.forEach(grau => {
    const opt = document.createElement('option');
    opt.value = grau;
    opt.textContent = GRAUS_INFO[grau].titulo;
    opt.selected = grau === grauAtual;
    opt.disabled = grau !== grauAtual && personagem.nivel < NIVEL_MINIMO_GRAU[grau];
    selectGrau.appendChild(opt);
  });

  let rolagemAtual = {
    vantagens: personagem.rolagensPericias?.[item.id]?.vantagens || 0,
    desvantagens: personagem.rolagensPericias?.[item.id]?.desvantagens || 0,
  };
  const rolagemAutomatica = modificadoresRolagemPericia(personagem, item.id);
  const situacao = document.createElement('button');
  situacao.type = 'button';
  situacao.className = 'ficha-pericia-situacao';
  situacao.setAttribute('aria-label', `Vantagens e desvantagens de ${item.titulo}`);

  const valor = document.createElement('output');
  valor.className = 'ficha-pericia-bonus';
  valor.setAttribute('aria-label', `Resultado de ${item.titulo}`);

  const info = document.createElement('button');
  info.type = 'button';
  info.className = 'ficha-info-btn ficha-pericia-info';
  info.textContent = '?';
  info.setAttribute('aria-label', `Como ${item.titulo} é calculada`);
  info.addEventListener('click', () => aoAbrirDetalhes(item, grauAtual, {
    atributo: atributoAtual,
    vantagens: rolagemAtual.vantagens + rolagemAutomatica.vantagens,
    desvantagens: rolagemAtual.desvantagens + rolagemAutomatica.desvantagens,
    bonusEfeitos: somarModificadores(personagem, 'pericia_bonus', item.id),
  }));

  const acoes = document.createElement('div');
  acoes.className = 'ficha-pericia-acoes';
  acoes.appendChild(info);
  if (typeof aoEditar === 'function') {
    const editar = document.createElement('button');
    editar.type = 'button';
    editar.className = 'ficha-info-btn ficha-pericia-editar';
    editar.textContent = '✎';
    editar.setAttribute('aria-label', `Editar ${item.titulo}`);
    editar.addEventListener('click', () => aoEditar(item));
    acoes.appendChild(editar);
  }

  function atualizarResultado() {
    const modAtributo = modificador(valorAtributoEfetivo(personagem, atributoAtual) || 10);
    const bonus = calcularBonusPericia(grauAtual, modAtributo, personagem.nivel)
      + somarModificadores(personagem, 'pericia_bonus', item.id);
    valor.textContent = textoBonus(bonus);
    valor.title = GRAUS_INFO[grauAtual].formula;
  }

  function atualizarSituacao() {
    const estado = estadoRolagem({
      vantagens: rolagemAtual.vantagens + rolagemAutomatica.vantagens,
      desvantagens: rolagemAtual.desvantagens + rolagemAutomatica.desvantagens,
    });
    situacao.textContent = estado.texto;
    situacao.title = `${estado.vantagens} vantagem(ns) · ${estado.desvantagens} desvantagem(ns)`;
    linha.dataset.situacao = estado.tipo;
    situacao.dataset.situacao = estado.tipo;
  }

  selectGrau.addEventListener('change', () => {
    const novoGrau = selectGrau.value;
    if (aoMudarGrau(novoGrau) === false) {
      selectGrau.value = grauAtual;
      return;
    }
    grauAtual = novoGrau;
    atualizarResultado();
    linha.dispatchEvent(new CustomEvent('pericia:grau-alterado', { bubbles: true }));
  });

  atributoSelect.addEventListener('change', () => {
    const novoAtributo = atributoSelect.value;
    if (aoMudarAtributo(novoAtributo) === false) {
      atributoSelect.value = atributoAtual;
      return;
    }
    atributoAtual = novoAtributo;
    linha.dataset.atributo = atributoAtual;
    atualizarResultado();
    linha.dispatchEvent(new CustomEvent('pericia:atributo-alterado', { bubbles: true }));
  });

  situacao.addEventListener('click', () => {
    aoEditarRolagem({ ...rolagemAtual }, novaRolagem => {
      rolagemAtual = { ...novaRolagem };
      atualizarSituacao();
    }, rolagemAutomatica);
  });

  atualizarResultado();
  atualizarSituacao();
  linha.append(identidade, atributoSelect, selectGrau, situacao, valor, acoes);
  return linha;
}
