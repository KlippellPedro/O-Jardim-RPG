import { atualizarPersonagem } from '../../../../services/personagensService.js';
import { somarModificadores } from '../../../../services/modificadoresService.js';
import { atualizarCentralNotificacoesNoDom } from './notificacoesFicha.js';

export function sinal(n) {
  return n >= 0 ? `+${n}` : String(n);
}

export function salvar(personagem, ctx, patch) {
  const resultado = atualizarPersonagem(personagem.id, patch);
  if (!resultado.ok) {
    ctx.mostrarToast(resultado.mensagem, 'erro');
    return false;
  }
  Object.assign(personagem, resultado.personagem);
  atualizarStatsCalculadosNoDom(personagem);
  atualizarCentralNotificacoesNoDom(personagem);
  return true;
}

function atualizarStatsCalculadosNoDom(personagem) {
  const armadura = Number(personagem.recursos?.armadura) || 0;
  const penalidadeDefesa = Math.abs(Number(personagem.recursos?.penalidadeDefesa) || 0);
  const penalidadeMovimento = Math.abs(Number(personagem.recursos?.penalidadeMovimento) || 0);
  const valores = {
    Defesa: (personagem.derivados?.defesaNatural ?? 10)
      + (personagem.recursos?.bonusDefesa ?? 0)
      + somaAjustes(personagem.recursos?.ajustesDefesa)
      + somarModificadores(personagem, 'combate', 'defesa')
      + armadura - penalidadeDefesa,
    Iniciativa: (personagem.derivados?.iniciativa ?? 10)
      + (personagem.recursos?.bonusIniciativa ?? 0)
      + somaAjustes(personagem.recursos?.ajustesIniciativa)
      + somarModificadores(personagem, 'combate', 'iniciativa'),
    Movimento: `${(personagem.derivados?.movimento ?? 0)
      + somaAjustes(personagem.recursos?.ajustesMovimento)
      + somarModificadores(personagem, 'combate', 'movimento')
      - penalidadeMovimento} m`,
  };
  Object.entries(valores).forEach(([rotulo, valor]) => {
    const elemento = document.querySelector(`[data-stat-calculado="${rotulo}"]`);
    if (elemento) {
      if ('value' in elemento) elemento.value = valor;
      else elemento.textContent = valor;
    }
  });

  const maximos = {
    Vida: Math.max(1, (personagem.derivados?.vida ?? 1) + somaAjustes(personagem.recursos?.ajustesVida) + somarModificadores(personagem, 'recurso_maximo', 'vida')),
    Mana: Math.max(1, (personagem.derivados?.mana ?? 1) + somaAjustes(personagem.recursos?.ajustesMana) + somarModificadores(personagem, 'recurso_maximo', 'mana')),
    Sanidade: Math.max(1, 100 + somaAjustes(personagem.recursos?.ajustesSanidade) + somarModificadores(personagem, 'recurso_maximo', 'sanidade')),
  };
  Object.entries(maximos).forEach(([rotulo, maximo]) => {
    const recurso = document.querySelector(`[data-recurso="${rotulo}"]`);
    if (!recurso) return;
    recurso.dispatchEvent(new CustomEvent('ficha:recurso-maximo', {
      detail: {
        maximo,
        limiteMaximo: maximo,
        minimo: rotulo === 'Vida' ? -maximo : 0,
      },
    }));
  });
}

// ── Identidade - campos soltos, editáveis. Trocar a raça recalcula os
// derivados e sincroniza eventuais ajustes raciais de atributo.

export function criarCampoTexto({ rotulo, valor, placeholder, datalistId, datalistOpcoes, aoMudar }) {
  const campo = document.createElement('label');
  campo.className = 'ficha-campo';

  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  campo.appendChild(label);

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'ficha-campo-input';
  input.value = valor || '';
  if (placeholder) input.placeholder = placeholder;
  if (datalistId) input.setAttribute('list', datalistId);
  input.addEventListener('change', () => aoMudar(input.value.trim(), input));
  campo.appendChild(input);

  if (datalistId && datalistOpcoes) {
    const datalist = document.createElement('datalist');
    datalist.id = datalistId;
    datalistOpcoes.forEach(texto => {
      const option = document.createElement('option');
      option.value = texto;
      datalist.appendChild(option);
    });
    campo.appendChild(datalist);
  }

  return campo;
}

export function criarCampoSelect({ rotulo, valor, opcoes, aoMudar }) {
  const campo = document.createElement('label');
  campo.className = 'ficha-campo';

  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  campo.appendChild(label);

  const select = document.createElement('select');
  select.className = 'ficha-campo-select';

  const vazio = document.createElement('option');
  vazio.value = '';
  vazio.textContent = 'A definir';
  vazio.selected = !valor;
  select.appendChild(vazio);

  opcoes.forEach(opcao => {
    const option = document.createElement('option');
    option.value = opcao.id;
    option.textContent = opcao.titulo;
    option.selected = opcao.id === valor;
    select.appendChild(option);
  });
  select.addEventListener('change', () => aoMudar(select.value || null, select));
  campo.appendChild(select);
  return campo;
}


export function somaAjustes(lista) {
  return (lista || []).reduce((total, item) => total + (Number(item.valor) || 0), 0);
}

