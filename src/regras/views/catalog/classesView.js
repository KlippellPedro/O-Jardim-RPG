import { RECOMPENSAS_CLASSE } from '../../../ficha/config/progressao.js';
import { ARVORES } from '../../../mundo/config/arvores.js';
import { barraCatalogo, escapar, selo } from './shared.js';

const TITULO_ARVORE = new Map(ARVORES.map(arvore => [arvore.id, arvore.titulo]));

function perfilClasse(classe) {
  if (Number(classe.vida) === 5) return { titulo: 'Resistente', tom: 'vida' };
  if (Number(classe.mana) === 4) return { titulo: 'Canalizadora', tom: 'mana' };
  return { titulo: 'Híbrida', tom: 'hibrido' };
}

function tabelaProgressao() {
  const linhas = Array.from({ length: 20 }, (_, indice) => {
    const nivel = indice + 1;
    return `<div class="regras-progression-item">
      <span class="regras-progression-level">${String(nivel).padStart(2, '0')}</span>
      <span class="regras-progression-reward">${escapar(RECOMPENSAS_CLASSE[nivel])}</span>
    </div>`;
  }).join('');

  return `
    <h3 class="regras-subtitle">Progressão universal</h3>
    <p class="regras-lead">Esta tabela vale para <strong>todas as classes</strong>, do nível 1 ao 20. Ela mostra quando são recebidos espaços de Habilidade de Classe e Graus de Treinamento.</p>
    <div class="regras-progression-grid" aria-label="Progressão de classe do nível 1 ao 20">${linhas}</div>
    <div class="regras-callout regras-callout--compact">
      <strong>Como ler</strong>
      <p>O nível 1 de cada classe é recebido somente uma vez. Graus de Treinamento respeitam o nível mínimo e o tempo de treino. Os efeitos específicos de Habilidades e Poderes continuam reservados para uma revisão posterior.</p>
    </div>`;
}

function cardClasse(classe) {
  const nomeProvisorio = Boolean(classe.nome_provisorio);
  const estado = nomeProvisorio ? 'Nome provisório' : 'Balanceada';
  const perfil = perfilClasse(classe);
  const exclusiva = classe.disponibilidade === 'exclusiva';
  const disponibilidade = exclusiva
    ? `Exclusiva de ${TITULO_ARVORE.get(classe.arvore) || 'Árvore não identificada'}`
    : 'Geral · todas as Árvores';
  const categoria = classe.categoria === 'padrao' ? 'Classe comum' : 'Classe especial';

  return `
    <article class="regras-class-card regras-class-card--${perfil.tom}" data-catalog-item>
      <header class="regras-class-card-header">
        <div>
          <span class="regras-card-eyebrow">${escapar(categoria)}</span>
          <h4>${escapar(classe.titulo)}</h4>
        </div>
        ${selo(estado, nomeProvisorio ? 'atencao' : 'confirmado')}
      </header>
      <div class="regras-resource-pair" aria-label="Recursos recebidos por nível">
        <div class="regras-resource-stat regras-resource-stat--vida">
          <span>Vida</span>
          <strong>+${escapar(classe.vida)}</strong>
          <small>+ Mod. Constituição</small>
        </div>
        <div class="regras-resource-stat regras-resource-stat--mana">
          <span>Mana</span>
          <strong>+${escapar(classe.mana)}</strong>
          <small>por nível</small>
        </div>
      </div>
      <footer class="regras-class-card-footer">
        <span class="regras-profile-pill regras-profile-pill--${perfil.tom}">${escapar(perfil.titulo)}</span>
        <span>${escapar(disponibilidade)}</span>
      </footer>
    </article>`;
}

function linksCategorias() {
  return `
    <div class="regras-route-grid regras-route-grid--catalog">
      <button type="button" data-topico-link="classes-comuns"><span class="regras-route-index">01</span><strong>Classes comuns</strong><span>Escolhas iniciais disponíveis em todas as Árvores.</span><i aria-hidden="true">→</i></button>
      <button type="button" data-topico-link="classes-especiais"><span class="regras-route-index">02</span><strong>Classes especiais</strong><span>Uma geral e dez exclusivas, acessíveis a partir do nível total 15.</span><i aria-hidden="true">→</i></button>
    </div>`;
}

function regrasRecursos() {
  return `
    <h3 class="regras-subtitle">Recursos e multiclasse</h3>
    <div class="regras-info-grid">
      <section class="regras-info-card">
        <span class="regras-card-eyebrow">Vida e Mana</span>
        <h4>Cada avanço usa a classe escolhida</h4>
        <p>O primeiro nível da primeira classe já está incluído nas fórmulas iniciais. Nos níveis seguintes, some os recursos da classe em que o nível foi investido.</p>
        <div class="regras-mini-formula"><strong>Vida</strong><span>valor da classe + Mod.Constituição</span></div>
        <div class="regras-mini-formula"><strong>Mana</strong><span>valor da classe</span></div>
      </section>
      <section class="regras-info-card">
        <span class="regras-card-eyebrow">Composição</span>
        <h4>Até três caminhos na mesma ficha</h4>
        <p>O limite normal é de duas classes comuns e uma especial. Todo nível de qualquer classe entra no Nível Total do personagem.</p>
        <div class="regras-rule-pills"><span>2 comuns</span><span>1 especial</span><span>Nível 15+</span></div>
      </section>
      <section class="regras-info-card">
        <span class="regras-card-eyebrow">Disponibilidade</span>
        <h4>Geral ou exclusiva de Árvore</h4>
        <p>Classes gerais funcionam em qualquer Árvore. Classes exclusivas exigem vínculo com a Árvore indicada e nunca ignoram os requisitos normais.</p>
      </section>
    </div>`;
}

export function renderizarPaginaClasses(classes, id) {
  const comuns = classes.filter(item => item.categoria === 'padrao');
  const especiais = classes.filter(item => item.categoria !== 'padrao');
  const gerais = classes.filter(item => item.disponibilidade === 'geral');
  const exclusivas = classes.filter(item => item.disponibilidade === 'exclusiva');

  if (id === 'classes') {
    return {
      status: 'Balanceamento inicial definido',
      resumo: 'Compare Vida e Mana rapidamente e consulte a progressão usada por todas as classes.',
      destaques: [
        ['Classes catalogadas', classes.length],
        ['Classes gerais', gerais.length],
        ['Classes exclusivas', exclusivas.length],
      ],
      corpo: `
        <p class="regras-lead">As classes estão focadas no que a ficha precisa calcular agora: <strong>Vida e Mana por nível</strong>. Habilidades e Poderes específicos permanecem fora desta versão até a revisão do livro.</p>
        ${linksCategorias()}
        ${regrasRecursos()}
        ${tabelaProgressao()}`,
    };
  }

  const lista = id === 'classes-comuns' ? comuns : especiais;
  const tituloCatalogo = id === 'classes-comuns' ? 'Catálogo de classes comuns' : 'Catálogo de classes especiais';
  return {
    status: 'Balanceamento inicial definido',
    resumo: id === 'classes-comuns'
      ? 'Compare os recursos das classes disponíveis como escolha inicial.'
      : 'Compare a classe especial geral e as exclusivas de cada Árvore.',
    destaques: [
      ['Classes', lista.length],
      ['Perfis de recursos', 3],
      ['Exclusivas de Árvore', lista.filter(item => item.disponibilidade === 'exclusiva').length],
    ],
    corpo: `
      <p class="regras-note regras-catalog-intro">Todas usam um orçamento de 7 pontos por nível: <strong>5 Vida / 2 Mana</strong>, <strong>4 Vida / 3 Mana</strong> ou <strong>3 Vida / 4 Mana</strong>. A categoria especial não aumenta esse total.</p>
      <h3 class="regras-subtitle">${tituloCatalogo}</h3>
      ${barraCatalogo({ total: lista.length, rotulo: 'classes' })}
      <div class="regras-class-grid" data-catalog-grid>${lista.map(cardClasse).join('')}</div>
      ${tabelaProgressao()}`,
  };
}
