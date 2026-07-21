/* Rolagem de dados da ficha.

   Os dados são sorteados no servidor, não aqui: o log da mesa só serve como
   prova se o resultado não puder ser escolhido pelo console do navegador.
   Este módulo monta o pedido, mostra o resultado e deixa o registro gravado
   para o mestre ver na página da sessão. */

import { registrosApi } from '../../plataforma/registrosApi.js';
import { obterContextoPlataforma } from '../../plataforma/portal.js?v=5';

const ROTULO_GRAU = {
  'sucesso critico': 'Sucesso crítico',
  sucesso: 'Sucesso',
  falha: 'Falha',
  'falha critica': 'Falha crítica',
};

function contexto() {
  const { campanha, personagens } = obterContextoPlataforma();
  return { campanhaId: campanha?.id || null, personagens };
}

function sinal(valor) {
  return valor >= 0 ? `+${valor}` : String(valor);
}

/** Teste de d20 do sistema: bônus da ficha, vantagem e DT opcional. */
export async function rolarTeste({ titulo, bonus = 0, rolagem = {}, dt = null, personagemId = null, origem = {} }) {
  const { campanhaId } = contexto();
  if (!campanhaId) throw new Error('Selecione uma campanha antes de rolar.');
  const resposta = await registrosApi.rolar({
    campanha_id: campanhaId,
    personagem_id: personagemId,
    titulo,
    bonus,
    vantagens: Math.max(0, Number(rolagem.vantagens) || 0),
    desvantagens: Math.max(0, Number(rolagem.desvantagens) || 0),
    dt,
    origem,
  });
  return resposta.registro;
}

/** Dano, cura e afins: aceita `2d6+3`. */
export async function rolarFormula({ titulo, formula, personagemId = null, origem = {} }) {
  const { campanhaId } = contexto();
  if (!campanhaId) throw new Error('Selecione uma campanha antes de rolar.');
  const resposta = await registrosApi.rolar({
    campanha_id: campanhaId,
    personagem_id: personagemId,
    titulo,
    formula,
    origem,
  });
  return resposta.registro;
}

/** "Usei tal poder": entra no mesmo log, sem dado. */
export async function registrarUso({ tipo, titulo, personagemId = null, detalhes = {} }) {
  const { campanhaId } = contexto();
  if (!campanhaId) throw new Error('Selecione uma campanha antes de registrar.');
  const resposta = await registrosApi.registrarUso({
    campanha_id: campanhaId,
    personagem_id: personagemId,
    tipo,
    titulo,
    detalhes,
  });
  return resposta.registro;
}

/* ── Apresentação do resultado ───────────────────────────────────────────── */

/** Bloco visual de um resultado, usado no modal da ficha e no log da sessão. */
export function blocoResultado(registro) {
  const detalhes = registro.detalhes || {};
  const bloco = document.createElement('div');
  bloco.className = 'ficha-rolagem-resultado';
  bloco.dataset.grau = detalhes.grau || '';
  if (detalhes.critico_natural) bloco.dataset.natural = 'critico';
  if (detalhes.falha_natural) bloco.dataset.natural = 'falha';

  const total = document.createElement('strong');
  total.className = 'ficha-rolagem-total';
  total.textContent = String(registro.resultado);
  bloco.append(total);

  const detalhe = document.createElement('div');
  detalhe.className = 'ficha-rolagem-detalhe';

  const dados = Array.isArray(detalhes.dados) ? detalhes.dados : [];
  if (dados.length) {
    const linha = document.createElement('div');
    linha.className = 'ficha-rolagem-dados';
    dados.forEach(valor => {
      const face = document.createElement('span');
      face.className = 'ficha-rolagem-dado';
      face.textContent = String(valor);
      // Com vantagem/desvantagem, o dado descartado fica apagado.
      if (detalhes.natural !== undefined && dados.length > 1) {
        face.dataset.usado = String(valor === detalhes.natural);
      }
      linha.append(face);
    });
    detalhe.append(linha);
  }

  const partes = [];
  if (detalhes.modo && detalhes.modo !== 'normal') {
    partes.push(detalhes.modo === 'vantagem' ? 'com vantagem' : 'com desvantagem');
  }
  if (detalhes.bonus) partes.push(`bônus ${sinal(detalhes.bonus)}`);
  if (detalhes.dt !== undefined && detalhes.dt !== null) partes.push(`DT ${detalhes.dt}`);
  if (partes.length) {
    const explicacao = document.createElement('span');
    explicacao.className = 'ficha-rolagem-explicacao';
    explicacao.textContent = partes.join(' · ');
    detalhe.append(explicacao);
  }

  if (detalhes.grau) {
    const grau = document.createElement('span');
    grau.className = 'ficha-rolagem-grau';
    grau.textContent = ROTULO_GRAU[detalhes.grau] || detalhes.grau;
    detalhe.append(grau);
  } else if (detalhes.critico_natural) {
    detalhe.append(Object.assign(document.createElement('span'), {
      className: 'ficha-rolagem-grau',
      textContent: '20 natural',
    }));
  } else if (detalhes.falha_natural) {
    detalhe.append(Object.assign(document.createElement('span'), {
      className: 'ficha-rolagem-grau',
      textContent: '1 natural',
    }));
  }

  bloco.append(detalhe);
  return bloco;
}

/** Texto curto do resultado, para toasts e para o log da sessão. */
export function resumoDoRegistro(registro) {
  const detalhes = registro.detalhes || {};
  if (registro.resultado === null || registro.resultado === undefined) return registro.titulo;
  // Repetições (`2#d20`) valem cada uma por si; somar enganaria.
  const valor = detalhes.repeticoes > 1 && Array.isArray(detalhes.rolagens)
    ? detalhes.rolagens.map(r => r.total).join(', ')
    : registro.resultado;
  const grau = detalhes.grau ? ` — ${ROTULO_GRAU[detalhes.grau] || detalhes.grau}` : '';
  return `${registro.titulo}: ${valor}${grau}`;
}
