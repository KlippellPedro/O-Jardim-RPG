// Wizard de criação de personagem: Nome+Árvore → Raça → Classe → Atributos
// → Treinamento → Prévia. Só depois de escolher a Árvore é que
// Raça/Classe mostram as opções ligadas a ela (com fallback pra "mostrar
// todas" — ver selecaoCatalogo.js). O passo de Atributos só decide os
// valores; a Prévia calcula e mostra Vida/Mana/Movimento/Lunaris antes de
// criar, para a ficha nascer com as informações iniciais preenchidas.
// das informações iniciais preenchidas.

import { listarArvoresDisponiveis } from '../../services/arvoresService.js';
import { criarPersonagem } from '../../services/personagensService.js';
import {
  normalizarAtributosIniciais, calcularDerivados, calcularLunarisInicial,
  obterAjustesAtributosRaciais, obterLimitesAtributosRaciais,
  obterAjustesPericiasRaciais,
} from '../../services/calculoService.js';
import { renderPassoNomeArvore } from './passoNomeArvore.js';
import { renderPassoRaca } from './passoRaca.js';
import { renderPassoClasse } from './passoClasse.js';
import { renderPassoAtributos } from './passoAtributos.js';
import { renderPassoTreinamento, treinamentoCompleto } from './passoTreinamento.js';
import { renderPassoPrevia } from './passoPrevia.js';
import { obterAtributosBase } from './estadoAtributos.js';

let modalLayer = null;
let focoAnterior = null;
let modalAtual = null;

const SELETOR_FOCAVEL = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const TITULOS_PASSO = ['Nome e Árvore', 'Raça', 'Classe', 'Atributos', 'Treinamento', 'Prévia'];

function aoTeclado(e) {
  if (e.key === 'Escape') {
    fecharModal();
    return;
  }
  if (e.key !== 'Tab' || !modalAtual) return;
  const focaveis = [...modalAtual.querySelectorAll(SELETOR_FOCAVEL)]
    .filter(elemento => !elemento.hidden && elemento.getClientRects().length > 0);
  if (focaveis.length === 0) {
    e.preventDefault();
    modalAtual.focus();
    return;
  }
  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  if (e.shiftKey && document.activeElement === primeiro) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && document.activeElement === ultimo) {
    e.preventDefault();
    primeiro.focus();
  }
}

export function fecharModal() {
  if (!modalLayer || modalLayer.hidden) return;
  modalLayer.hidden = true;
  modalLayer.innerHTML = '';
  modalAtual = null;
  document.body.classList.remove('ficha-modal-aberto');
  const pagina = document.querySelector('.ficha-page');
  if (pagina) pagina.inert = false;
  document.removeEventListener('keydown', aoTeclado);
  const restaurar = focoAnterior;
  focoAnterior = null;
  if (restaurar?.isConnected && typeof restaurar.focus === 'function') restaurar.focus();
}

function validarPasso(estado) {
  if (estado.passo === 1) return estado.nome.trim().length > 0 && !!estado.arvoreId;
  if (estado.passo === 2) {
    const raca = estado.catalogo.racas.find(item => item.id === estado.racaId);
    const exigeVariante = Array.isArray(raca?.variantes) && raca.variantes.length > 0;
    return Boolean(raca) && (!exigeVariante || Boolean(estado.escolhaRacial?.varianteId));
  }
  if (estado.passo === 3) return !!estado.classeId;
  if (estado.passo === 4) return !!obterAtributosBase(estado);
  if (estado.passo === 5) {
    return treinamentoCompleto(estado);
  }
  if (estado.passo === 6) return !!obterAtributosBase(estado);
  return false;
}

export function abrirWizardCriacao(catalogo, { aoCriar }) {
  modalLayer = document.getElementById('ficha-modal-layer');
  if (!modalLayer) return;
  focoAnterior = document.activeElement;

  const arvoresDisponiveis = listarArvoresDisponiveis();

  const estado = {
    passo: 1,
    nome: '',
    arvoreId: arvoresDisponiveis[0]?.id || null,
    racaId: null,
    classeId: null,
    catalogo,
    metodoAtributos: 'padrao',
    atribuicaoPadrao: null,
    atributosRolados: null,
    atribuicaoDados: null,
    periciasIniciais: [],
    itemInicial: '',
    escolhaRacial: {},
  };

  modalLayer.innerHTML = '';
  modalLayer.hidden = false;
  document.body.classList.add('ficha-modal-aberto');

  const backdrop = document.createElement('div');
  backdrop.className = 'ficha-modal-backdrop';
  backdrop.addEventListener('click', () => fecharModal());

  const modal = document.createElement('div');
  modal.className = 'ficha-modal ficha-modal--wizard';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Criar personagem');
  modal.tabIndex = -1;
  modal.addEventListener('click', (e) => e.stopPropagation());

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'ficha-modal-fechar';
  fechar.setAttribute('aria-label', 'Fechar');
  fechar.textContent = '×';
  fechar.addEventListener('click', () => fecharModal());
  modal.appendChild(fechar);

  const progresso = document.createElement('div');
  progresso.className = 'ficha-wizard-progresso';
  modal.appendChild(progresso);

  const titulo = document.createElement('h2');
  titulo.className = 'ficha-modal-title';
  modal.appendChild(titulo);

  const corpo = document.createElement('div');
  corpo.className = 'ficha-wizard-corpo';
  modal.appendChild(corpo);

  const erro = document.createElement('p');
  erro.className = 'ficha-modal-erro';
  erro.hidden = true;
  modal.appendChild(erro);

  const rodape = document.createElement('div');
  rodape.className = 'ficha-wizard-rodape';
  const btnVoltar = document.createElement('button');
  btnVoltar.type = 'button';
  btnVoltar.className = 'ficha-wizard-voltar';
  btnVoltar.textContent = '‹ Voltar';
  const btnAvancar = document.createElement('button');
  btnAvancar.type = 'button';
  btnAvancar.className = 'ficha-cta-btn';
  rodape.append(btnVoltar, btnAvancar);
  modal.appendChild(rodape);

  function atualizarValidade() {
    btnAvancar.disabled = !validarPasso(estado);
  }

  function render() {
    erro.hidden = true;

    progresso.innerHTML = '';
    TITULOS_PASSO.forEach((_, i) => {
      const passoNum = i + 1;
      const bolha = document.createElement('span');
      bolha.className = 'ficha-wizard-bolha';
      if (passoNum === estado.passo) bolha.classList.add('ficha-wizard-bolha--ativa');
      else if (passoNum < estado.passo) bolha.classList.add('ficha-wizard-bolha--feita');
      bolha.textContent = String(passoNum);
      progresso.appendChild(bolha);
    });

    titulo.textContent = `Passo ${estado.passo} de ${TITULOS_PASSO.length} — ${TITULOS_PASSO[estado.passo - 1]}`;

    corpo.innerHTML = '';
    const ctx = { atualizar: render, atualizarValidade, arvoresDisponiveis, catalogo };
    if (estado.passo === 1) renderPassoNomeArvore(corpo, estado, ctx);
    if (estado.passo === 2) renderPassoRaca(corpo, estado, ctx);
    if (estado.passo === 3) renderPassoClasse(corpo, estado, ctx);
    if (estado.passo === 4) renderPassoAtributos(corpo, estado, ctx);
    if (estado.passo === 5) renderPassoTreinamento(corpo, estado, ctx);
    if (estado.passo === 6) renderPassoPrevia(corpo, estado, ctx);

    btnVoltar.hidden = estado.passo === 1;
    btnAvancar.textContent = estado.passo === TITULOS_PASSO.length ? 'Criar personagem' : 'Avançar ›';
    atualizarValidade();
  }

  btnVoltar.addEventListener('click', () => {
    estado.passo -= 1;
    render();
  });

  btnAvancar.addEventListener('click', async () => {
    if (!validarPasso(estado)) return;

    if (estado.passo < TITULOS_PASSO.length) {
      estado.passo += 1;
      render();
      return;
    }

    const raca = catalogo.racas.find(r => r.id === estado.racaId) || null;
    const atributosBase = obterAtributosBase(estado);
    const atributosFinais = normalizarAtributosIniciais(atributosBase);
    const derivados = calcularDerivados(atributosFinais, raca, 1, estado.escolhaRacial);
    const lunarisInicial = calcularLunarisInicial();
    const pericias = Object.fromEntries(
      estado.periciasIniciais.map(id => [id, 'aprendiz']),
    );
    const inventarioInicial = [{
      id: `item-inicial-${Date.now().toString(36)}`,
      nome: estado.itemInicial.trim(),
      quantidade: 1,
      descricao: 'Item comum inicial',
    }];

    btnAvancar.disabled = true;
    btnAvancar.textContent = 'Salvando na conta…';
    const resultado = await criarPersonagem({
      nome: estado.nome,
      arvoreId: estado.arvoreId,
      racaId: estado.racaId,
      classeId: estado.classeId,
      atributosBase,
      atributosFinais,
      derivados,
      lunarisInicial,
      legadosAscensaoPendentes: 0,
      pericias,
      inventarioInicial,
      escolhaRacial: estado.escolhaRacial,
      ajustesAtributosRaciais: obterAjustesAtributosRaciais(raca, estado.escolhaRacial),
      limitesAtributosRaciais: obterLimitesAtributosRaciais(raca, estado.escolhaRacial),
      ajustesPericiasRaciais: obterAjustesPericiasRaciais(raca, estado.escolhaRacial),
    });

    if (!resultado.ok) {
      erro.textContent = resultado.mensagem;
      erro.hidden = false;
      btnAvancar.disabled = false;
      btnAvancar.textContent = 'Criar personagem';
      return;
    }

    fecharModal();
    aoCriar(resultado.personagem);
  });

  backdrop.appendChild(modal);
  modalLayer.appendChild(backdrop);
  modalAtual = modal;
  const pagina = document.querySelector('.ficha-page');
  if (pagina) pagina.inert = true;

  render();
  document.addEventListener('keydown', aoTeclado);
  fechar.focus();
}
