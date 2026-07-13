import { RACAS_COM_PDF, REGRAS_RACIAIS } from '../../config/catalogos.js';
import { escapar, listaHtml, objetoEmTexto, selo } from './shared.js';

function fonteRaca(raca) {
  if (!RACAS_COM_PDF.has(raca.id)) {
    return ['Citada no índice · sem ficha neste ZIP', 'pendente'];
  }
  return raca.pendente
    ? ['Em desenvolvimento', 'atencao']
    : ['Regra oficial', 'confirmado'];
}

function cardRaca(raca) {
  const [estado, tom] = fonteRaca(raca);
  const regraOficial = REGRAS_RACIAIS[raca.id];
  const atributos = !regraOficial ? objetoEmTexto(raca.modificadores_atributos) : '';
  const pericias = !regraOficial ? objetoEmTexto(raca.pericias_bonus) : '';

  return `
    <article class="regras-entity">
      <div class="regras-entity-heading"><h4>${escapar(raca.titulo)}</h4>${selo(estado, tom)}</div>
      <dl class="regras-entity-stats">
        ${raca.tamanho ? `<div><dt>Tamanho</dt><dd>${escapar(raca.tamanho)}</dd></div>` : ''}
        ${atributos ? `<div><dt>Atributos</dt><dd>${escapar(atributos)}</dd></div>` : ''}
        ${pericias ? `<div><dt>Perícias</dt><dd>${escapar(pericias)}</dd></div>` : ''}
        ${raca.legado_ascensao_inicial ? `<div><dt>Legado inicial</dt><dd>${raca.legado_ascensao_inicial}</dd></div>` : ''}
      </dl>
      ${raca.pre_requisito ? `<p class="regras-entity-note"><strong>Pré-requisito:</strong> ${escapar(raca.pre_requisito)}</p>` : ''}
      ${regraOficial ? `<div class="regras-balance-note"><strong>Regra racial</strong><p>${escapar(regraOficial)}</p></div>` : listaHtml(raca.habilidades)}
      ${!regraOficial ? listaHtml(raca.condicoes, 'regras-entity-list regras-entity-list--cost') : ''}
      ${raca.nota_pendente ? `<p class="regras-entity-note">${escapar(raca.nota_pendente)}</p>` : ''}
    </article>`;
}

function linksCategorias() {
  return `
    <div class="regras-route-grid">
      <button type="button" data-topico-link="racas-comuns"><strong>Raças comuns</strong><span>Disponíveis em todas as Árvores.</span></button>
      <button type="button" data-topico-link="racas-especiais"><strong>Raças especiais</strong><span>Restritas a algumas Árvores ou extintas.</span></button>
    </div>`;
}

export function renderizarPaginaRacas(racas, id) {
  const comuns = racas.filter(item => item.categoria === 'padrao');
  const especiais = racas.filter(item => item.categoria === 'esquecida');

  if (id === 'racas') {
    return {
      status: 'Regra oficial',
      resumo: 'Origem biológica, espiritual ou construída do personagem e sua disponibilidade entre as Árvores.',
      destaques: [
        ['Raças comuns', comuns.length],
        ['Raças especiais citadas', especiais.length],
        ['Potência especial', '+1 Legado inicial'],
      ],
      corpo: `
        <p class="regras-lead">Raças comuns existem em todas as Árvores. Raças especiais aparecem apenas em Árvores específicas ou pertencem a povos extintos.</p>
        ${linksCategorias()}
        <h3 class="regras-subtitle">Regra de disponibilidade</h3>
        <ul class="regras-list">
          <li>Uma raça comum recebe um atributo +1, uma perícia ou recurso menor e uma habilidade característica.</li>
          <li>Humano troca o pacote racial por um Legado inicial e maior liberdade de origem.</li>
          <li>Raça especial recebe um pacote racial e um Legado inicial, ficando intencionalmente um grau acima.</li>
          <li>Toda raça especial exige uma origem ou acontecimento compatível.</li>
          <li>Uma limitação só equilibra um benefício quando produz consequência mecânica real.</li>
        </ul>`,
    };
  }

  const lista = id === 'racas-comuns' ? comuns : especiais;
  const publicadas = lista.filter(item => RACAS_COM_PDF.has(item.id));
  const semFicha = lista.filter(item => !RACAS_COM_PDF.has(item.id));

  return {
    status: 'Regra oficial',
    resumo: id === 'racas-comuns'
      ? 'Povos encontrados em todas as Árvores.'
      : 'Povos restritos a determinadas Árvores ou já extintos.',
    destaques: [
      ['Com PDF', publicadas.length],
      ['Sem ficha neste ZIP', semFicha.length],
      ['Com regra oficial', publicadas.filter(item => REGRAS_RACIAIS[item.id]).length],
    ],
    corpo: `
      <p class="regras-note">Os textos abaixo já substituem os números antigos do livro. Fichas ainda incompletas permanecem marcadas como Em desenvolvimento.</p>
      <h3 class="regras-subtitle">Fichas confirmadas</h3>
      <div class="regras-entity-grid">${publicadas.map(cardRaca).join('')}</div>
      ${semFicha.length ? `<h3 class="regras-subtitle">Em desenvolvimento</h3><div class="regras-entity-grid">${semFicha.map(cardRaca).join('')}</div>` : ''}`,
  };
}
