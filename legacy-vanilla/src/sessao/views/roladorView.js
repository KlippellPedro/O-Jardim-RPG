/* Rolador da mesa: o mestre também precisa de dado.

   Aceita a mesma sintaxe do Rollem que a mesa já usava no Discord — `2d6+3`,
   `1d20+1d4-2` e `2#d20` para duas rolagens separadas. Tudo cai no mesmo log
   da sessão, junto com as rolagens dos jogadores. */

import { registrosApi } from '../../plataforma/registrosApi.js';

const ATALHOS = ['d20', 'd100', '2#d20', '1d6', '2d6', '1d8', '1d10', '1d12'];

function elemento(tag, classe = '', texto = null) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== null && texto !== undefined) node.textContent = String(texto);
  return node;
}

function mostrarResultado(saida, registro) {
  const detalhes = registro.detalhes || {};
  saida.replaceChildren();
  const bloco = elemento('div', 'sessao-rolador-resultado');

  if (detalhes.repeticoes > 1 && Array.isArray(detalhes.rolagens)) {
    // Com `N#`, cada rolagem é independente: somar enganaria quem pediu dois
    // ataques separados.
    bloco.append(elemento('strong', 'sessao-rolador-total',
      detalhes.rolagens.map(r => r.total).join(', ')));
    const lista = elemento('div', 'sessao-rolador-repeticoes');
    detalhes.rolagens.forEach((rolagem, indice) => {
      lista.append(elemento('span', '', `${indice + 1}) [${rolagem.dados.join(', ')}] = ${rolagem.total}`));
    });
    bloco.append(lista);
  } else {
    bloco.append(elemento('strong', 'sessao-rolador-total', registro.resultado));
    if (Array.isArray(detalhes.dados) && detalhes.dados.length) {
      bloco.append(elemento('span', 'sessao-rolador-dados', `[${detalhes.dados.join(', ')}]`));
    }
  }
  bloco.append(elemento('span', 'sessao-rolador-formula', registro.formula || ''));
  saida.append(bloco);
}

export function criarRolador(campanhaId, { aoRolar = null } = {}) {
  const bloco = elemento('section', 'sessao-bloco sessao-rolador');
  bloco.append(elemento('h3', '', 'Rolar dado'));
  bloco.append(elemento('p', 'sessao-rolador-ajuda',
    'Use 2d6+3, 1d20+1d4-2 ou 2#d20 para duas rolagens separadas — a mesma sintaxe do Discord.'));

  const form = document.createElement('form');
  form.className = 'sessao-adicionar';

  const expressao = document.createElement('input');
  expressao.type = 'text';
  expressao.className = 'sessao-texto';
  expressao.placeholder = 'd20';
  expressao.maxLength = 40;
  expressao.setAttribute('aria-label', 'Expressão de dados');

  const motivo = document.createElement('input');
  motivo.type = 'text';
  motivo.className = 'sessao-texto';
  motivo.placeholder = 'Motivo (opcional)';
  motivo.maxLength = 80;
  motivo.setAttribute('aria-label', 'Motivo da rolagem');

  const enviar = elemento('button', 'sessao-botao sessao-botao--destaque', 'Rolar');
  enviar.type = 'submit';

  const campoExpressao = elemento('label', 'sessao-campo');
  campoExpressao.append(elemento('span', '', 'Expressão'), expressao);
  const campoMotivo = elemento('label', 'sessao-campo');
  campoMotivo.append(elemento('span', '', 'Motivo'), motivo);
  form.append(campoExpressao, campoMotivo, enviar);
  bloco.append(form);

  const atalhos = elemento('div', 'sessao-rolador-atalhos');
  ATALHOS.forEach(texto => {
    const botao = elemento('button', 'sessao-botao sessao-botao--secundario sessao-botao--mini', texto);
    botao.type = 'button';
    botao.addEventListener('click', () => {
      expressao.value = texto;
      form.requestSubmit();
    });
    atalhos.append(botao);
  });
  bloco.append(atalhos);

  const saida = elemento('div', 'sessao-rolador-saida');
  bloco.append(saida);

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const formula = expressao.value.trim() || 'd20';
    enviar.disabled = true;
    try {
      const resposta = await registrosApi.rolar({
        campanha_id: campanhaId,
        titulo: motivo.value.trim() || `Rolagem do mestre · ${formula}`,
        formula,
        origem: { tipo: 'mestre' },
      });
      mostrarResultado(saida, resposta.registro);
      motivo.value = '';
      if (aoRolar) aoRolar(resposta.registro);
    } catch (erro) {
      saida.replaceChildren(elemento('p', 'sessao-rolador-erro', erro.message || 'Não foi possível rolar.'));
    } finally {
      enviar.disabled = false;
    }
  });

  return bloco;
}
