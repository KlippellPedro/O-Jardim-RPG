import { barraCatalogo, escapar, selo } from './shared.js';

const NOMES_ATRIBUTOS = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

function valorComSinal(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero === 0) return '0';
  return numero > 0 ? `+${numero}` : String(numero);
}

function secaoCard(titulo, conteudo, nota = '') {
  if (!conteudo) return '';
  return `<section class="regras-race-section">
    <div class="regras-race-section-heading"><h5>${escapar(titulo)}</h5>${nota ? `<span>${escapar(nota)}</span>` : ''}</div>
    ${conteudo}
  </section>`;
}

function listaCaracteristicas(itens) {
  if (!itens.length) return '';
  return `<ul class="regras-feature-list">${itens.map(item => `<li>
    <strong>${escapar(item.titulo)}</strong>
    <p>${escapar(item.descricao)}</p>
  </li>`).join('')}</ul>`;
}

function disponibilidadeRaca(raca, origensCompativeis, indisponivel) {
  if (indisponivel) return 'Especial · indisponível para escolha';
  if (raca.disponibilidade === 'geral') return 'Geral · todas as Árvores';
  if (raca.arvore_titulo) return `Especial · ${raca.arvore_titulo}`;
  if (origensCompativeis.length) {
    return `Especial · ${origensCompativeis.map(item => item.titulo).join(', ')}`;
  }
  return 'Especial · acesso definido pelo mestre';
}

function resumoConteudo({ caracteristicas, variantes, linhagens, condicoesAncestrais, modificacoes, assinaturas, fragmentos, maldicoes }) {
  const partes = [
    caracteristicas.length ? `${caracteristicas.length} característica${caracteristicas.length === 1 ? '' : 's'}` : '',
    variantes.length ? `${variantes.length} ${variantes.length === 1 ? 'variante' : 'variantes'}` : '',
    linhagens.length ? `${linhagens.length} linhagens` : '',
    condicoesAncestrais.length ? `${condicoesAncestrais.length} condições` : '',
    modificacoes.length ? `${modificacoes.length} modificações` : '',
    assinaturas.length ? `${assinaturas.length} assinaturas` : '',
    fragmentos.length ? `${fragmentos.length} fragmentos` : '',
    maldicoes.length ? `${maldicoes.length} maldições` : '',
  ].filter(Boolean);
  return partes.slice(0, 3).join(' · ') || 'Pacote-base';
}

function cardRaca(raca) {
  const provisoria = raca.recursos_provisorios !== false;
  const caracteristicas = Array.isArray(raca.caracteristicas) ? raca.caracteristicas : [];
  const fisiologia = Array.isArray(raca.fisiologia) ? raca.fisiologia : [];
  const variantes = Array.isArray(raca.variantes) ? raca.variantes : [];
  const linhagens = Array.isArray(raca.linhagens) ? raca.linhagens : [];
  const linhagensPendentes = linhagens.filter(item => item.efeito_pendente);
  const condicoesAncestrais = Array.isArray(raca.condicoes_ancestrais) ? raca.condicoes_ancestrais : [];
  const modificacoes = Array.isArray(raca.modificacoes) ? raca.modificacoes : [];
  const assinaturas = Array.isArray(raca.assinaturas) ? raca.assinaturas : [];
  const conversao = Array.isArray(raca.conversao) ? raca.conversao : [];
  const fragmentos = Array.isArray(raca.fragmentos) ? raca.fragmentos : [];
  const maldicoes = Array.isArray(raca.maldicoes) ? raca.maldicoes : [];
  const indisponivel = raca.indisponivel === true;
  const ajustesAtributos = Object.entries(raca.ajustes_atributos || {});
  const origemNatural = raca.origem_natural;
  const origemSobrenatural = raca.origem_sobrenatural;
  const origemDimensional = raca.origem_dimensional;
  const origensCompativeis = Array.isArray(raca.origens_compativeis)
    ? raca.origens_compativeis
    : [];
  const beneficiosCriacao = raca.beneficios_criacao;
  const disponibilidade = disponibilidadeRaca(raca, origensCompativeis, indisponivel);
  const estado = indisponivel
    ? 'Adiada · indisponível'
    : provisoria
      ? 'Em definição'
      : raca.categoria === 'padrao'
        ? 'Raça comum definida'
        : (linhagens.length > 0 && linhagensPendentes.length === 0)
          || (condicoesAncestrais.length > 0 && raca.condicoes_pendentes === false)
          || modificacoes.length > 0
          || (variantes.length > 0 && raca.rotulo_variante)
          || assinaturas.length > 0
          || fragmentos.length > 0
          || maldicoes.length > 0
          ? 'Pacote completo'
          : 'Pacote-base definido';
  const tom = indisponivel || provisoria ? 'atencao' : 'confirmado';
  const resumo = resumoConteudo({
    caracteristicas,
    variantes,
    linhagens,
    condicoesAncestrais,
    modificacoes,
    assinaturas,
    fragmentos,
    maldicoes,
  });

  const bonusAtributos = ajustesAtributos.map(([atributo, valor]) => {
    const limite = Number(raca.limites_atributos?.[atributo]);
    return `<span>${escapar(NOMES_ATRIBUTOS[atributo] || atributo)} <strong>${escapar(valorComSinal(valor))}</strong>${Number.isFinite(limite) ? `<small>máx. ${escapar(limite)}</small>` : ''}</span>`;
  }).join('');
  const escolhaAtributos = Number(raca.escolha_atributos?.total)
    ? `<span>${escapar(raca.escolha_atributos.titulo || 'Atributos escolhidos')} <strong>${escapar(raca.escolha_atributos.total)} × ${escapar(valorComSinal(raca.escolha_atributos.bonus_por_escolha))}</strong><small>máx. ${escapar(raca.escolha_atributos.limite)}</small></span>`
    : '';

  const origens = [
    origemNatural ? `<li><strong>Origem natural</strong><p>${escapar(`${origemNatural.dimensao} · Gênese`)}</p></li>` : '',
    origemSobrenatural ? `<li><strong>Origem sobrenatural</strong><p>${escapar(`${origemSobrenatural.galho} · Limiar`)}</p></li>` : '',
    origemDimensional ? '<li><strong>Origem dimensional</strong><p>Ser do Espaço</p></li>' : '',
    ...origensCompativeis.map(item => `<li><strong>${escapar(item.titulo)}</strong><p>${escapar(item.metodo)}</p></li>`),
  ].filter(Boolean).join('');

  const linhagensHtml = linhagens.length ? `<div class="regras-option-grid">${linhagens.map(item => {
    const efeitos = Array.isArray(item.caracteristicas) ? item.caracteristicas : [];
    return `<article class="regras-option-card">
      <h6>${escapar(item.titulo)}</h6>
      ${item.efeito_pendente || efeitos.length === 0
        ? '<p>Efeito pendente.</p>'
        : listaCaracteristicas(efeitos.map(efeito => ({
          ...efeito,
          descricao: [
            efeito.descricao,
            ...(efeito.opcoes || []).map(opcao => `${opcao.titulo}: ${opcao.descricao}`),
          ].filter(Boolean).join(' '),
        })))}
    </article>`;
  }).join('')}</div>` : '';

  const condicoesHtml = condicoesAncestrais.length ? `<div class="regras-option-grid">${condicoesAncestrais.map(condicao => `<article class="regras-option-card">
    <h6>${escapar(condicao.titulo)}</h6>
    <p>${escapar(condicao.motivo_retorno)}</p>
    <div class="regras-gift-pair"><div><span>Dádiva</span><strong>${escapar(condicao.dadiva.titulo)}</strong><p>${escapar(condicao.dadiva.descricao)}</p></div><div><span>Cicatriz</span><strong>${escapar(condicao.cicatriz.titulo)}</strong><p>${escapar(condicao.cicatriz.descricao)}</p></div></div>
  </article>`).join('')}</div>` : '';

  const variantesHtml = variantes.length ? `<div class="regras-option-grid">${variantes.map(variante => {
    const caracteristicasVariante = Array.isArray(variante.caracteristicas) ? variante.caracteristicas : [];
    const ajustes = Object.entries(variante.ajustes_atributos || {})
      .map(([atributo, valor]) => `${NOMES_ATRIBUTOS[atributo] || atributo} ${valorComSinal(valor)}`);
    const recursos = [
      `Vida ${valorComSinal(variante.vida)}`,
      `Mana ${valorComSinal(variante.mana)}`,
      Number.isFinite(Number(variante.movimento_fixo)) ? `Movimento ${variante.movimento_fixo} m` : '',
      Number(variante.movimento) ? `Movimento ${valorComSinal(variante.movimento)} m` : '',
      variante.dano_natural ? `Dano ${variante.dano_natural}` : '',
      Number(variante.vida_por_nivel) ? `${valorComSinal(variante.vida_por_nivel)} Vida/Nível` : '',
      Number(variante.escolha_pericias?.total) ? `${variante.escolha_pericias.total} perícias` : '',
      ...ajustes,
    ].filter(Boolean);
    return `<article class="regras-option-card">
      <h6>${escapar(variante.titulo)}</h6>
      <div class="regras-option-metrics">${recursos.map(item => `<span>${escapar(item)}</span>`).join('')}</div>
      ${listaCaracteristicas(caracteristicasVariante)}
    </article>`;
  }).join('')}</div>` : '';

  const modificacoesHtml = modificacoes.length ? `<div class="regras-option-grid">${modificacoes.map(modificacao => {
    const requisitos = [
      Number(modificacao.nivel_minimo) > 1 ? `Nível ${modificacao.nivel_minimo}` : '',
      Number(modificacao.passivas_exigidas) ? `${modificacao.passivas_exigidas} passivas` : '',
      modificacao.postura_exigida === 'bipede' ? 'Chassi bípede' : '',
    ].filter(Boolean);
    return `<article class="regras-option-card">
      <div class="regras-option-title"><h6>${escapar(modificacao.titulo)}</h6><span>${escapar(modificacao.categoria)}</span></div>
      <p>${escapar(modificacao.descricao)}</p>
      ${requisitos.length ? `<div class="regras-option-metrics">${requisitos.map(item => `<span>${escapar(item)}</span>`).join('')}</div>` : ''}
    </article>`;
  }).join('')}</div>` : '';

  return `
    <details class="regras-race-card${indisponivel ? ' regras-race-card--disabled' : ''}" data-catalog-item>
      <summary class="regras-race-summary">
        <span class="regras-race-summary-top">
          <span><small>${raca.categoria === 'padrao' ? 'Raça comum' : 'Raça especial'}</small><strong>${escapar(raca.titulo)}</strong></span>
          ${selo(estado, tom)}
        </span>
        <span class="regras-race-resources">
          <span class="regras-race-resource regras-race-resource--vida"><small>Vida</small><strong>${escapar(valorComSinal(raca.vida))}</strong></span>
          <span class="regras-race-resource regras-race-resource--mana"><small>Mana</small><strong>${escapar(valorComSinal(raca.mana))}</strong></span>
          ${Number(raca.movimento) ? `<span class="regras-race-resource"><small>Movimento</small><strong>${escapar(valorComSinal(raca.movimento))} m</strong></span>` : ''}
        </span>
        ${bonusAtributos || escolhaAtributos ? `<span class="regras-race-bonuses">${bonusAtributos}${escolhaAtributos}</span>` : ''}
        <span class="regras-race-meta"><span>${escapar(disponibilidade)}</span><span>${escapar(resumo)}</span></span>
        <span class="regras-race-toggle"><span class="regras-race-toggle-open">Ver regras completas</span><span class="regras-race-toggle-close">Recolher regras</span><i aria-hidden="true"></i></span>
      </summary>
      <div class="regras-race-body">
        ${indisponivel && raca.motivo_indisponivel ? `<div class="regras-callout regras-callout--warning"><strong>Indisponível nesta versão</strong><p>${escapar(raca.motivo_indisponivel)}</p></div>` : ''}
        ${secaoCard('Origens e disponibilidade', origens ? `<ul class="regras-origin-grid">${origens}</ul>` : `<p>${escapar(disponibilidade)}</p>`)}
        ${secaoCard('Fisiologia', fisiologia.length ? `<ul class="regras-clean-list">${fisiologia.map(item => `<li>${escapar(item)}</li>`).join('')}</ul>` : '')}
        ${secaoCard('Características', listaCaracteristicas(caracteristicas))}
        ${beneficiosCriacao ? secaoCard('Criação autorizada', `<div class="regras-creation-stats"><span><small>Lunaris</small><strong>${escapar(beneficiosCriacao.lunaris_total)}</strong></span><span><small>Itens comuns</small><strong>${escapar(beneficiosCriacao.itens_comuns_total)}</strong></span></div><p>Esses benefícios não são retroativos em uma transformação.</p>`) : ''}
        ${secaoCard('Linhagens Élficas', linhagensHtml, linhagensPendentes.length ? 'Existem efeitos pendentes' : 'Escolha somente uma')}
        ${secaoCard('Condições Ancestrais', condicoesHtml, 'Receba a dádiva e a cicatriz')}
        ${secaoCard('Conversão para o Jardim', conversao.length ? `<ul class="regras-conversion-list">${conversao.map(item => `<li><strong>${escapar(item.origem)}</strong><span aria-hidden="true">→</span><p>${escapar(item.destino)}</p></li>`).join('')}</ul>` : '')}
        ${secaoCard('Formatos da Assinatura Remanescente', assinaturas.length ? listaCaracteristicas(assinaturas) : '', 'Escolha somente um')}
        ${secaoCard('Fragmentos Constituintes', fragmentos.length ? listaCaracteristicas(fragmentos) : '', `Conhece ${raca.fragmentos_config?.conhecidos_iniciais || 3} · expressa ${raca.fragmentos_config?.expressos || 2}`)}
        ${secaoCard('Maldições Tecidas', maldicoes.length ? listaCaracteristicas(maldicoes) : '', `Conhece ${raca.maldicoes_config?.conhecidas_base || 3} · Grimório conhece 5`)}
        ${secaoCard(raca.rotulo_variante || 'Variantes obrigatórias', variantesHtml, raca.descricao_variantes || '')}
        ${secaoCard('Modificações', modificacoesHtml, modificacoes.length ? `Capacidade: ${raca.capacidade_modificacoes?.formula || 'definida pela raça'}` : '')}
      </div>
    </details>`;
}

function linksCategorias() {
  return `
    <div class="regras-route-grid regras-route-grid--catalog">
      <button type="button" data-topico-link="racas-comuns"><span class="regras-route-index">01</span><strong>Raças comuns</strong><span>Povos disponíveis normalmente em todas as Árvores.</span><i aria-hidden="true">→</i></button>
      <button type="button" data-topico-link="racas-especiais"><span class="regras-route-index">02</span><strong>Raças especiais</strong><span>Recompensas e transformações poderosas autorizadas pelo mestre.</span><i aria-hidden="true">→</i></button>
    </div>`;
}

function comoAplicar() {
  return `
    <h3 class="regras-subtitle">Como aplicar</h3>
    <div class="regras-info-grid">
      <section class="regras-info-card">
        <span class="regras-card-eyebrow">Recursos iniciais</span>
        <h4>Vida e Mana entram uma única vez</h4>
        <p>O ajuste racial é somado às fórmulas iniciais e não se repete quando o personagem sobe de nível.</p>
        <div class="regras-mini-formula"><strong>Vida</strong><span>fórmula-base + ajuste racial</span></div>
        <div class="regras-mini-formula"><strong>Mana</strong><span>fórmula-base + ajuste racial</span></div>
      </section>
      <section class="regras-info-card">
        <span class="regras-card-eyebrow">Escolhas raciais</span>
        <h4>Variantes fazem parte do pacote</h4>
        <p>Morfologias, Linhagens, Condições, Projetos, Instrumentos e outras escolhas não se acumulam: use somente a opção declarada pela raça.</p>
      </section>
      <section class="regras-info-card">
        <span class="regras-card-eyebrow">Raças especiais</span>
        <h4>Acesso controlado pelo mestre</h4>
        <p>Podem ser recompensa, transformação narrativa ou escolha inicial autorizada. Uma raça especial substitui o pacote racial anterior.</p>
      </section>
    </div>`;
}

export function renderizarPaginaRacas(racas, id) {
  const comuns = racas.filter(item => item.categoria === 'padrao');
  const especiais = racas.filter(item => item.categoria !== 'padrao');

  if (id === 'racas') {
    return {
      status: 'Catálogo racial revisado',
      resumo: 'Compare recursos rapidamente e abra somente as raças cujas regras deseja consultar.',
      destaques: [
        ['Raças comuns', comuns.length],
        ['Raças especiais', especiais.length],
        ['Pacotes definidos', racas.filter(item => item.recursos_provisorios === false).length],
      ],
      corpo: `
        <p class="regras-lead">Cada raça combina ajustes iniciais, fisiologia e características próprias. Os catálogos agora mostram primeiro o que importa para comparar; as regras completas ficam organizadas dentro de cada raça.</p>
        ${linksCategorias()}
        ${comoAplicar()}`,
    };
  }

  const lista = id === 'racas-comuns' ? comuns : especiais;
  const tituloCatalogo = id === 'racas-comuns' ? 'Catálogo de raças comuns' : 'Catálogo de raças especiais';
  return {
    status: id === 'racas-comuns' ? 'Raças comuns definidas' : 'Pacotes especiais revisados',
    resumo: id === 'racas-comuns'
      ? 'Compare Vida, Mana e características dos povos disponíveis normalmente.'
      : 'Consulte recompensas e transformações poderosas autorizadas pelo mestre.',
    destaques: [
      ['Raças', lista.length],
      ['Pacotes completos', lista.filter(item => item.recursos_provisorios === false).length],
      ['Indisponíveis', lista.filter(item => item.indisponivel === true).length],
    ],
    corpo: `
      <p class="regras-note regras-catalog-intro">${id === 'racas-comuns'
        ? 'Use a busca para encontrar uma característica e abra apenas os detalhes que deseja comparar.'
        : 'Raças especiais são deliberadamente fortes, exigem autorização e podem possuir várias camadas de escolhas. A Entidade permanece adiada e indisponível.'}</p>
      <h3 class="regras-subtitle">${tituloCatalogo}</h3>
      ${barraCatalogo({ total: lista.length, rotulo: 'raças', expansivel: true })}
      <div class="regras-race-grid" data-catalog-grid>${lista.map(cardRaca).join('')}</div>`,
  };
}
