import { CLASSES_COM_PDF } from '../../config/catalogos.js';
import { escapar, selo, tituloCampo } from './shared.js';

function estadoClasse(classe) {
  if (CLASSES_COM_PDF.has(classe.id)) {
    return classe.pendente
      ? ['Em desenvolvimento', 'atencao']
      : ['Regra oficial', 'confirmado'];
  }

  return classe.categoria === 'padrao'
    ? ['Em desenvolvimento · sem PDF', 'pendente']
    : ['Citada no índice · sem ficha neste ZIP', 'pendente'];
}

function cardClasse(classe) {
  const [estado, tom] = estadoClasse(classe);
  const vida = classe.vida?.base
    ? `${classe.vida.base}${classe.vida.atributo ? ` + Mod.${tituloCampo(classe.vida.atributo)}` : ''}`
    : null;
  const mana = classe.forca_vital?.base
    ? `${classe.forca_vital.base}${classe.forca_vital.atributo ? ` + Mod.${tituloCampo(classe.forca_vital.atributo)}` : ''}`
    : null;

  return `
    <article class="regras-entity">
      <div class="regras-entity-heading"><h4>${escapar(classe.titulo)}</h4>${selo(estado, tom)}</div>
      ${vida || mana ? `<dl class="regras-entity-stats">${vida ? `<div><dt>Vida/nível</dt><dd>${escapar(vida)}</dd></div>` : ''}${mana ? `<div><dt>Mana/nível</dt><dd>${escapar(mana)}</dd></div>` : ''}</dl>` : ''}
      ${classe.nota_pendente ? `<p class="regras-entity-note">${escapar(classe.nota_pendente)}</p>` : ''}
    </article>`;
}

function linksCategorias() {
  return `
    <div class="regras-route-grid">
      <button type="button" data-topico-link="classes-comuns"><strong>Classes comuns</strong><span>Disponíveis em todas as Árvores.</span></button>
      <button type="button" data-topico-link="classes-especiais"><strong>Classes especiais</strong><span>Restritas a algumas Árvores ou extintas.</span></button>
    </div>`;
}

export function renderizarPaginaClasses(classes, id) {
  const comuns = classes.filter(item => item.categoria === 'padrao');
  const comunsPublicadas = comuns.filter(item => CLASSES_COM_PDF.has(item.id));
  const especiais = classes.filter(item => item.categoria === 'esquecida');
  const especiaisPublicadas = especiais.filter(item => CLASSES_COM_PDF.has(item.id));
  const estruturaOficial = `
    <h3 class="regras-subtitle">Progressão universal</h3>
    <ul class="regras-list">
      <li>Toda classe possui 20 níveis. O nível total é a soma de todas elas.</li>
      <li>Níveis de classe 1, 5, 10, 15 e 20 entregam as cinco Identidades exclusivas.</li>
      <li>Os demais níveis alternam Poderes de Classe e Graus de Perícia conforme a tabela universal.</li>
      <li>Ações ou reações adicionais sempre exigem Mana, recarga ou um gatilho limitado.</li>
      <li>Classes sem custo, alcance, ação ou duração definidos aparecem como Em desenvolvimento.</li>
    </ul>
    <button type="button" class="regras-inline-link" data-topico-link="xp">Abrir a tabela universal de progressão</button>`;

  if (id === 'classes') {
    return {
      status: 'Regra oficial',
      resumo: 'Escolha de progressão do personagem, separada pela disponibilidade entre as Árvores.',
      destaques: [
        ['Comuns publicadas', comunsPublicadas.length],
        ['Especiais publicadas', especiaisPublicadas.length],
        ['Níveis por classe', 20],
      ],
      corpo: `
        <p class="regras-lead">Classes comuns existem em todas as Árvores. Classes especiais existem apenas em algumas Árvores ou foram extintas; no livro elas aparecem como Classes Esquecidas.</p>
        ${linksCategorias()}
        <h3 class="regras-subtitle">Regra de escolha</h3>
        <ul class="regras-list">
          <li>O limite é de duas classes comuns e uma classe especial.</li>
          <li>Classes especiais exigem nível total 15 e um acontecimento narrativo, salvo exceção explícita.</li>
          <li>Elas podem ser mais impactantes e quebrar uma regra específica, mas seus níveis consomem nível total normalmente.</li>
          <li>Ao entrar em outra classe, não receba novamente dinheiro, itens ou benefícios de criação.</li>
        </ul>
        ${estruturaOficial}`,
    };
  }

  const lista = id === 'classes-comuns' ? comuns : especiais;
  const publicadas = lista.filter(item => CLASSES_COM_PDF.has(item.id));
  const semFicha = lista.filter(item => !CLASSES_COM_PDF.has(item.id));

  return {
    status: 'Regra oficial',
    resumo: id === 'classes-comuns'
      ? 'Classes encontradas em todas as Árvores.'
      : 'Classes restritas, perdidas ou extintas entre as Árvores.',
    destaques: [
      ['Publicadas no ZIP', publicadas.length],
      ['Somente índice/desenvolvimento', semFicha.length],
      ['Auditável por completo', lista.filter(item => !item.pendente).length],
    ],
    corpo: `
      ${estruturaOficial}
      <h3 class="regras-subtitle">Com PDF próprio</h3>
      <div class="regras-entity-grid">${publicadas.map(cardClasse).join('')}</div>
      ${semFicha.length ? `<h3 class="regras-subtitle">Ainda sem ficha publicada neste ZIP</h3><div class="regras-entity-grid">${semFicha.map(cardClasse).join('')}</div>` : ''}`,
  };
}
