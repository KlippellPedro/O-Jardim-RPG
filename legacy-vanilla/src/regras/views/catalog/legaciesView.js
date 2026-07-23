import { REGRAS_LEGADOS, REQUISITOS_LEGADOS_V1 } from '../../config/catalogos.js';
import { escapar, selo, tituloCampo } from './shared.js';

function requisitosLegado(requisitos) {
  if (!Array.isArray(requisitos) || !requisitos.length) {
    return 'Sem pré-requisito registrado';
  }

  return requisitos.map(requisito => {
    if (requisito.nivel_personagem) return `Nível ${requisito.nivel_personagem}`;
    if (requisito.atributo) {
      return `${tituloCampo(requisito.atributo)} ${requisito.valor_minimo}+`;
    }
    if (requisito.pericia) {
      return `${tituloCampo(requisito.pericia)} ${requisito.nivel}`;
    }
    if (Array.isArray(requisito.ou)) {
      return requisito.ou
        .map(item => `${tituloCampo(item.pericia)} ${item.nivel}`)
        .join(' ou ');
    }
    return 'Requisito especial';
  }).join(' · ');
}

function cardLegado(legado) {
  const ajuste = REGRAS_LEGADOS[legado.id];
  const requisitos = REQUISITOS_LEGADOS_V1[legado.id] || legado.pre_requisitos;
  const novo = legado.fonte?.startsWith('Criação da versão 1.0');

  return `
    <article class="regras-entity">
      <div class="regras-entity-heading"><h4>${escapar(legado.titulo)}</h4>${selo(novo ? 'Adicionado na versão 1.0' : 'Regra oficial', 'confirmado')}</div>
      <p>${escapar(ajuste || legado.descricao)}</p>
      <p class="regras-entity-note"><strong>Requisitos:</strong> ${escapar(requisitosLegado(requisitos))}</p>
      <div class="regras-balance-status is-adjusted">Versão 1.0</div>
    </article>`;
}

export function renderizarPaginaLegados(dados, dadosNovos) {
  const legados = dados.legados || [];
  const novos = dadosNovos.novos || [];
  const ajustados = legados.filter(item => REGRAS_LEGADOS[item.id]).length;

  return {
    status: 'Regra oficial',
    resumo: 'Bônus de progressão que representam aptidões conquistadas além de classe e raça.',
    destaques: [
      ['Dos PDFs', legados.length],
      ['Balanceados', ajustados],
      ['Adicionados na v1.0', novos.length],
    ],
    corpo: `
      <p class="regras-lead">Todos os personagens escolhem um Legado nos níveis totais 5, 10, 15, 20, 25, 30, 35 e 40. Nenhuma raça concede Legado adicional nesta versão técnica.</p>
      <div class="regras-balance-note"><strong>Regra de seleção</strong><p>Bônus com o mesmo nome ou função não acumulam. Um Legado só pode ser escolhido novamente quando o próprio texto permitir. Ações, reações, redução de dano e multiplicadores sempre obedecem ao custo ou à frequência descrita.</p></div>
      <h3 class="regras-subtitle">Legados catalogados</h3>
      <div class="regras-entity-grid regras-entity-grid--legacies">${legados.map(cardLegado).join('')}</div>
      <h3 class="regras-subtitle">Legados adicionados na versão 1.0</h3>
      <div class="regras-entity-grid regras-entity-grid--legacies">${novos.map(cardLegado).join('')}</div>
      ${dados.pendente ? `<h3 class="regras-subtitle">Pendência conhecida</h3><p class="regras-note">${escapar(dados.pendente)}</p>` : ''}`,
  };
}
