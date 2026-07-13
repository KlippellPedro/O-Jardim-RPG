// Ficha — estatísticas centrais (versão 1.0 das Regras) + recursos jogáveis.
// Início e Ficha eram abas separadas; viraram uma só (mesma ideia do projeto
// de referência Ficha-Supremacia-do-Protesto: tudo da identidade central do
// personagem numa página, em seções empilhadas de largura cheia — não um
// grid de cartões pequenos competindo por espaço).

import { router } from '../../../../core/router.js';
import { marcosAtributo, marcosLegado, totalNiveisClasse } from '../../../config/progressao.js';
import { atualizarPersonagem } from '../../../services/personagensService.js';
import { listarArvoresDisponiveis } from '../../../services/arvoresService.js';
import {
  calcularDerivados,
  modificador,
  nivelPorXp,
  TABELA_XP,
  xpProximoNivel,
} from '../../../services/calculoService.js';
import { criarBarraRecurso } from '../recursoBarra.js';
import { NOMES_ATRIBUTOS } from '../../../config/nomesAtributos.js';
import {
  listarEfeitosAtivos,
  somarModificadores,
} from '../../../services/modificadoresService.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

const SIGLA_ATRIBUTO = {
  forca: 'FOR', destreza: 'DES', constituicao: 'CON',
  inteligencia: 'INT', sabedoria: 'SAB', carisma: 'CAR', fluxo: 'FLX',
};

function sinal(n) {
  return n >= 0 ? `+${n}` : String(n);
}

function salvar(personagem, ctx, patch) {
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

// ── Identidade — campos soltos, editáveis, sem efeito mecânico ──────────
// (exceto árvore/raça, que ainda só trocam o id — recalcular atributos numa
// troca de raça fica pra depois, ver nota no bloco).

function criarCampoTexto({ rotulo, valor, placeholder, datalistId, datalistOpcoes, aoMudar }) {
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

function criarCampoSelect({ rotulo, valor, opcoes, aoMudar }) {
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
  select.addEventListener('change', () => aoMudar(select.value || null));
  campo.appendChild(select);
  return campo;
}

function blocoIdentidade(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--identidade';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Identidade do Personagem';
  bloco.appendChild(h);

  const grade = document.createElement('div');
  grade.className = 'ficha-identidade-grade';

  grade.appendChild(criarCampoTexto({
    rotulo: 'Nome do Personagem',
    valor: personagem.nome,
    placeholder: 'Ex: Raijin',
    aoMudar: (novoValor, input) => {
      if (!novoValor) {
        ctx.mostrarToast('O nome não pode ficar vazio.', 'erro');
        input.value = personagem.nome;
        return;
      }
      salvar(personagem, ctx, { nome: novoValor });
    },
  }));

  grade.appendChild(criarCampoSelect({
    rotulo: 'Árvore',
    valor: personagem.arvoreId,
    opcoes: listarArvoresDisponiveis(),
    aoMudar: valor => salvar(personagem, ctx, { arvoreId: valor }),
  }));

  // Trocar de raça só atualiza o id por enquanto — recalcular atributos
  // finais/derivados a partir da nova raça (aplicarModificadoresRaciais)
  // fica pro próximo passo, já que envolve decidir o que fazer com ajustes
  // manuais que o jogador já tenha feito em cima da raça antiga.
  grade.appendChild(criarCampoSelect({
    rotulo: 'Raça',
    valor: personagem.racaId,
    opcoes: ctx.catalogo.racas,
    aoMudar: valor => salvar(personagem, ctx, { racaId: valor }),
  }));

  grade.appendChild(criarCampoTexto({
    rotulo: 'Tamanho',
    valor: personagem.tamanho,
    placeholder: 'Ex: Normal',
    datalistId: 'ficha-tamanhos-lista',
    datalistOpcoes: ['Minúsculo', 'Pequeno', 'Normal', 'Grande', 'Enorme'],
    aoMudar: valor => salvar(personagem, ctx, { tamanho: valor }),
  }));

  grade.appendChild(criarCampoTexto({
    rotulo: 'Origem',
    valor: personagem.origem,
    placeholder: 'Ex: Jornalista',
    aoMudar: valor => salvar(personagem, ctx, { origem: valor }),
  }));

  grade.appendChild(criarCampoTexto({
    rotulo: 'Título',
    valor: personagem.titulo,
    placeholder: 'Ex: O Assassino de Elementos',
    aoMudar: valor => salvar(personagem, ctx, { titulo: valor }),
  }));

  const nivelCampo = document.createElement('div');
  nivelCampo.className = 'ficha-campo';
  const nivelLabel = document.createElement('span');
  nivelLabel.className = 'ficha-campo-label';
  nivelLabel.textContent = 'Nível';
  nivelCampo.appendChild(nivelLabel);
  const nivelValor = document.createElement('div');
  nivelValor.className = 'ficha-campo-input ficha-campo-input--somente-leitura';
  nivelValor.textContent = personagem.nivel;
  nivelValor.title = 'Nível total = soma dos níveis de todas as classes. Edite o nível de cada classe na seção Classe.';
  nivelCampo.appendChild(nivelValor);
  grade.appendChild(nivelCampo);

  bloco.appendChild(grade);
  return bloco;
}

function criarCardAtributo(sigla, rotulo, valor, mod, aoMudar) {
  const card = document.createElement('div');
  card.className = 'ficha-atributo-card';
  card.title = rotulo;

  const ajuda = document.createElement('button');
  ajuda.type = 'button';
  ajuda.className = 'ficha-info-btn ficha-atributo-ajuda';
  ajuda.textContent = '?';
  ajuda.setAttribute('aria-label', `Como o modificador de ${rotulo} é calculado`);
  ajuda.addEventListener('click', () => {
    abrirModalSimples({
      titulo: `Cálculo — ${rotulo}`,
      corpo: `O valor do atributo é editável. O modificador é arredondado para baixo: (${rotulo} − 10) ÷ 2. Com ${valorEl.value}, o modificador é ${sinal(modificador(valorEl.value))}.`,
    });
  });

  const siglaEl = document.createElement('span');
  siglaEl.className = 'ficha-atributo-sigla';
  siglaEl.textContent = sigla;

  const valorEl = document.createElement('input');
  valorEl.type = 'number';
  valorEl.className = 'ficha-atributo-valor';
  valorEl.value = valor;
  valorEl.min = '1';
  valorEl.max = '99';
  valorEl.setAttribute('aria-label', rotulo);

  const modEl = document.createElement('span');
  modEl.className = 'ficha-atributo-mod';
  modEl.textContent = sinal(mod);

  let temporizador = null;
  let ultimoValorSalvo = Number(valor);
  const confirmarAlteracao = () => {
    clearTimeout(temporizador);
    const novoValor = Number(valorEl.value);
    if (novoValor === ultimoValorSalvo) return;
    const alterou = aoMudar(novoValor, valorEl);
    if (alterou === false) {
      valorEl.value = ultimoValorSalvo;
      modEl.textContent = sinal(modificador(ultimoValorSalvo));
      return;
    }
    ultimoValorSalvo = novoValor;
    modEl.textContent = sinal(modificador(novoValor));
  };
  valorEl.addEventListener('input', () => {
    const novoValor = Number(valorEl.value);
    if (Number.isFinite(novoValor)) modEl.textContent = sinal(modificador(novoValor));
    clearTimeout(temporizador);
    temporizador = setTimeout(confirmarAlteracao, 250);
  });
  valorEl.addEventListener('change', confirmarAlteracao);

  card.append(ajuda, siglaEl, valorEl, modEl);
  return card;
}

function blocoAtributos(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--atributos';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Atributos';
  bloco.appendChild(h);

  const grade = document.createElement('div');
  grade.className = 'ficha-atributos-grade';
  Object.entries(NOMES_ATRIBUTOS).forEach(([chave, rotulo]) => {
    const valorBase = personagem.atributosFinais?.[chave] ?? 0;
    const bonusEfeito = somarModificadores(personagem, 'atributo', chave);
    const valor = valorBase + bonusEfeito;
    grade.appendChild(criarCardAtributo(
      SIGLA_ATRIBUTO[chave] || chave.slice(0, 3).toUpperCase(), rotulo, valor, modificador(valor),
      (novoValor) => {
        if (!Number.isInteger(novoValor) || novoValor < 1 || novoValor > 99) {
          ctx.mostrarToast('O atributo deve ser um número inteiro entre 1 e 99.', 'erro');
          return false;
        }
        const novoValorBase = novoValor - bonusEfeito;
        // personagem.atributosFinais é atualizado a cada salvar(); o valorBase
        // capturado no render ficaria obsoleto numa segunda edição seguida e
        // debitaria aumentos pendentes a mais.
        const baseAtual = Number(personagem.atributosFinais?.[chave]) || valorBase;
        const atributosFinais = { ...personagem.atributosFinais, [chave]: novoValorBase };
        const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
        const antes = calcularDerivados(personagem.atributosFinais, raca, personagem.nivel);
        const depois = calcularDerivados(atributosFinais, raca, personagem.nivel);
        return salvar(personagem, ctx, {
          atributosFinais,
          aumentosAtributoPendentes: Math.max(
            0,
            personagem.aumentosAtributoPendentes - Math.max(0, novoValorBase - baseAtual),
          ),
          derivados: {
            ...personagem.derivados,
            vida: Math.max(1, (Number(personagem.derivados?.vida) || 0) + depois.vida - antes.vida),
            mana: Math.max(1, (Number(personagem.derivados?.mana) || 0) + depois.mana - antes.mana),
            movimento: depois.movimento,
            defesaNatural: depois.defesaNatural,
            iniciativa: depois.iniciativa,
          },
        });
      },
    ));
  });
  bloco.appendChild(grade);
  return bloco;
}

function blocoRecursos(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--recursos';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Status Vitais';
  bloco.appendChild(h);

  const salvarRecurso = (chave, novoValor) => salvar(personagem, ctx, {
    recursos: { ...personagem.recursos, [chave]: novoValor },
  });
  const vidaMaxima = Math.max(1, (personagem.derivados?.vida ?? 1) + somaAjustes(personagem.recursos?.ajustesVida) + somarModificadores(personagem, 'recurso_maximo', 'vida'));
  const manaMaxima = Math.max(1, (personagem.derivados?.mana ?? 1) + somaAjustes(personagem.recursos?.ajustesMana) + somarModificadores(personagem, 'recurso_maximo', 'mana'));
  const sanidadeMaxima = Math.max(1, 100 + somaAjustes(personagem.recursos?.ajustesSanidade) + somarModificadores(personagem, 'recurso_maximo', 'sanidade'));

  // Vida/Mana em cima (as duas "grandes"), Sanidade/Cansaço embaixo —
  // duas linhas de duas, não uma grade de quatro disputando a mesma fileira.
  const linhaPrincipal = document.createElement('div');
  linhaPrincipal.className = 'ficha-recursos-grade';
  linhaPrincipal.appendChild(criarBarraRecurso({
    rotulo: 'Vida',
    atual: personagem.recursos?.vidaAtual ?? 0,
    maximo: vidaMaxima,
    minimo: -vidaMaxima,
    limiteMaximo: vidaMaxima,
    cor: 'var(--blood)',
    tipo: 'vida',
    critico: false,
    acoes: [
      criarBotaoInfo('Vida', personagem, ctx),
      criarBotaoAjustes(personagem, ctx, 'ajustesVida', 'Vida Máxima'),
    ],
    aoMudar: valor => salvarRecurso('vidaAtual', valor),
  }));
  linhaPrincipal.appendChild(criarBarraRecurso({
    rotulo: 'Mana',
    atual: personagem.recursos?.manaAtual ?? 0,
    maximo: manaMaxima,
    minimo: 0,
    limiteMaximo: manaMaxima,
    cor: 'var(--neon)',
    tipo: 'mana',
    critico: false,
    acoes: [
      criarBotaoInfo('Mana', personagem, ctx),
      criarBotaoAjustes(personagem, ctx, 'ajustesMana', 'Mana Máxima'),
    ],
    aoMudar: valor => salvarRecurso('manaAtual', valor),
  }));

  const linhaSecundaria = document.createElement('div');
  linhaSecundaria.className = 'ficha-recursos-grade ficha-recursos-grade--secundaria';
  linhaSecundaria.appendChild(criarBarraRecurso({
    rotulo: 'Sanidade',
    atual: personagem.recursos?.sanidade ?? 100,
    maximo: sanidadeMaxima,
    minimo: 0,
    limiteMaximo: sanidadeMaxima,
    cor: 'var(--arkania)',
    tipo: 'sanidade',
    critico: false,
    acoes: [
      criarBotaoInfo('Sanidade', personagem, ctx),
      criarBotaoAjustes(personagem, ctx, 'ajustesSanidade', 'Sanidade Máxima'),
    ],
    aoMudar: valor => salvarRecurso('sanidade', valor),
  }));
  linhaSecundaria.appendChild(criarBarraRecurso({
    rotulo: 'Cansaço',
    atual: personagem.recursos?.cansaco ?? 0,
    maximo: 6,
    minimo: 0,
    limiteMaximo: 6,
    cor: 'var(--star)',
    tipo: 'cansaco',
    visualInvertido: true,
    acoes: [criarBotaoInfo('Cansaço', personagem, ctx)],
    incrementos: [1],
    critico: 'alto',
    aoMudar: valor => salvarRecurso('cansaco', valor),
  }));

  bloco.append(linhaPrincipal, linhaSecundaria);
  return bloco;
}

// Aparece na hora em que o XP empurra o nível total pra cima — deixa
// escolher a classe do novo nível ali mesmo, sem precisar procurar a seção
// Classe. "Decidir depois" só fecha; o nível pendente continua disponível
// lá embaixo, em Classe, pra investir quando quiser (classeDisponivel e
// aplicarNiveisClasse são as mesmas usadas pelo controle inline daquela seção).
function corpoModalLevelUp(personagem, ctx) {
  const container = document.createElement('div');
  container.className = 'ficha-levelup-modal';

  const destaque = document.createElement('div');
  destaque.className = 'ficha-levelup-destaque';
  const icone = document.createElement('span');
  icone.className = 'ficha-levelup-icone';
  icone.textContent = '↑';
  const intro = document.createElement('p');
  intro.className = 'ficha-levelup-intro';
  const plural = personagem.niveisClassePendentes > 1 ? 'níveis' : 'nível';
  intro.textContent = `Você conquistou ${personagem.niveisClassePendentes} ${plural} para distribuir. Escolha a classe e confirme quanto deseja investir agora.`;
  destaque.append(icone, intro);
  container.appendChild(destaque);

  const catalogoPorId = new Map(ctx.catalogo.classes.map(item => [item.id, item]));
  const disponiveis = ctx.catalogo.classes
    .filter(classe => classeDisponivel(personagem, classe, ctx.catalogo.classes));

  if (disponiveis.length === 0) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-wizard-aviso';
    aviso.textContent = 'Nenhuma classe disponível pra receber esse nível agora (limites de classe/nível). Reveja em Classe mais tarde.';
    container.appendChild(aviso);
  } else {
    const controles = document.createElement('div');
    controles.className = 'ficha-levelup-form';

    const campoClasse = document.createElement('label');
    campoClasse.className = 'ficha-campo ficha-levelup-campo-classe';
    const labelClasse = document.createElement('span');
    labelClasse.className = 'ficha-campo-label';
    labelClasse.textContent = 'Classe que receberá o nível';

    const select = document.createElement('select');
    select.className = 'ficha-campo-select';
    disponiveis.forEach(classe => {
      const option = document.createElement('option');
      option.value = classe.id;
      const especial = classe.categoria !== 'padrao' ? ' · Especial' : '';
      const pendente = classe.pendente || classe.mecanicaPendente ? ' · Em desenvolvimento' : '';
      option.textContent = `${classe.titulo}${especial}${pendente}`;
      select.appendChild(option);
    });
    campoClasse.append(labelClasse, select);

    const campoQuantidade = document.createElement('label');
    campoQuantidade.className = 'ficha-campo ficha-levelup-campo-quantidade';
    const labelQuantidade = document.createElement('span');
    labelQuantidade.className = 'ficha-campo-label';
    labelQuantidade.textContent = 'Quantidade';
    const quantidade = document.createElement('input');
    quantidade.type = 'number';
    quantidade.className = 'ficha-campo-input';
    quantidade.min = '1';
    quantidade.max = String(personagem.niveisClassePendentes);
    quantidade.value = '1';
    campoQuantidade.append(labelQuantidade, quantidade);

    const aplicar = document.createElement('button');
    aplicar.type = 'button';
    aplicar.className = 'ficha-cta-btn ficha-levelup-confirmar';
    aplicar.textContent = 'Confirmar investimento';
    aplicar.addEventListener('click', () => {
      const classe = catalogoPorId.get(select.value);
      if (!classe) return;
      if (aplicarNiveisClasse(personagem, classe, quantidade.value, ctx)) {
        fecharModalSimples();
      }
    });
    controles.append(campoClasse, campoQuantidade, aplicar);
    container.appendChild(controles);
  }

  const depois = document.createElement('button');
  depois.type = 'button';
  depois.className = 'ficha-levelup-depois';
  depois.textContent = 'Decidir depois';
  depois.addEventListener('click', () => fecharModalSimples());
  container.appendChild(depois);

  return container;
}

function blocoNivel(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--experiencia';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Experiência';
  bloco.appendChild(h);

  const proximo = xpProximoNivel(personagem.nivel);
  function aoMudarXp(xp) {
    const xpClamp = Math.max(0, xp);
    const novoNivel = nivelPorXp(xpClamp);
    const niveisAlocados = totalNiveisClasse(personagem.classes);
    if (novoNivel < niveisAlocados) {
      ctx.mostrarToast(`O XP não pode reduzir o nível total abaixo dos ${niveisAlocados} níveis de classe já distribuídos.`, 'erro');
      return false;
    }

    const novosMarcosLegado = Math.max(0, marcosLegado(novoNivel) - personagem.marcosLegadoConcedidos);
    const novosMarcosAtributo = Math.max(0, marcosAtributo(novoNivel) - personagem.marcosAtributoConcedidos);
    const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
    const derivadosDoNivel = calcularDerivados(personagem.atributosFinais, raca, novoNivel);
    const novosPendentes = Math.max(0, novoNivel - niveisAlocados);
    const subiuNivel = novosPendentes > personagem.niveisClassePendentes;

    const salvou = salvar(personagem, ctx, {
      xp: xpClamp,
      nivel: novoNivel,
      niveisClassePendentes: novosPendentes,
      legadosAscensaoPendentes: personagem.legadosAscensaoPendentes + novosMarcosLegado,
      marcosLegadoConcedidos: Math.max(personagem.marcosLegadoConcedidos, marcosLegado(novoNivel)),
      aumentosAtributoPendentes: personagem.aumentosAtributoPendentes + novosMarcosAtributo,
      marcosAtributoConcedidos: Math.max(personagem.marcosAtributoConcedidos, marcosAtributo(novoNivel)),
      derivados: {
        ...personagem.derivados,
        defesaNatural: derivadosDoNivel.defesaNatural,
        iniciativa: derivadosDoNivel.iniciativa,
      },
    });

    if (salvou && subiuNivel) {
      abrirModalSimples({
        titulo: 'Novo nível alcançado',
        corpo: corpoModalLevelUp({ ...personagem, niveisClassePendentes: novosPendentes, nivel: novoNivel }, ctx),
        classeExtra: 'ficha-modal--levelup',
      });
    }
    if (salvou) ctx.recarregar();
    return salvou;
  }

  bloco.appendChild(criarBarraRecurso({
    rotulo: 'XP',
    atual: personagem.xp,
    maximo: proximo,
    minimo: 0,
    limiteMaximo: null,
    cor: 'var(--gold)',
    incrementos: [10, 100],
    critico: false,
    mostrarRotulo: false,
    tipo: 'xp',
    aoMudar: aoMudarXp,
  }));
  return bloco;
}

// ── Combate — cada stat calculado ganha um "?" (fórmula) e, quando pode
// receber bônus situacionais (armadura, terreno, evento...), um "±" que
// abre uma lista de ajustes nomeados em vez de um único campo numérico —
// mesmo padrão do projeto de referência (calc-help + ajuste personalizado).
// Defesa Natural, Iniciativa e Movimento usam o mesmo padrão de ajustes
// nomeados; Vida, Mana e Sanidade também reutilizam esse modal.

const FORMULAS_COMBATE = {
  Vida: 'Base racial: 10 + 2 × Mod. Força + 2 × Mod. Constituição. Ganhos de classe e ajustes personalizados são somados ao máximo.',
  Mana: 'Base racial: 6 + 2 × Mod. Inteligência + Mod. Sabedoria. Ganhos de classe e ajustes personalizados são somados ao máximo.',
  Sanidade: 'Base 100 + ajustes personalizados registrados pelo jogador.',
  Cansaço: 'Escala atual de 0 a 6. Quanto mais próximo de 6, mais crítico o estado.',
  Defesa: 'Defesa Natural (10 + metade do nível total + Mod. Destreza) + Armadura − Penalidade + ajustes personalizados.',
  'Iniciativa': '10 + metade do nível total + Mod. Destreza + Bônus/Penalidade + ajustes personalizados.',
  'Movimento': '9 m (padrão humano) + 1,5 m × Mod. Destreza + bônus da raça − Penalidade + ajustes personalizados.',
};

function estadoCansaco(valor) {
  return ['Disposto', 'Cansado', 'Fatigado', 'Esgotado', 'Exausto', 'Debilitado', 'Colapso'][Math.max(0, Math.min(6, Math.round(valor)))] || 'Disposto';
}

function efeitoCansaco(valor) {
  return [
    'Sem penalidade.',
    '−1 em testes físicos.',
    '−2 em testes físicos e −1 Iniciativa.',
    '−2 em todos os testes.',
    'Desvantagem em testes físicos; não pode treinar.',
    'Movimento pela metade e sem reações.',
    'Inconsciente até reduzir Cansaço.',
  ][Math.max(0, Math.min(6, Math.round(valor)))];
}

function estadoSanidade(valor) {
  if (valor <= 0) return 'Quebra';
  if (valor <= 25) return 'Ruptura';
  if (valor <= 50) return 'Enlouquecendo';
  if (valor <= 75) return 'Abalado';
  return 'Estável';
}

function efeitoSanidade(valor) {
  if (valor <= 0) return 'Crise imediata e condição permanente definida com o jogador.';
  if (valor <= 25) return 'Nova perda exige Vontade DT 15 ou causa uma condição de crise.';
  if (valor <= 50) return 'Desvantagem para manter concentração sob ameaça.';
  if (valor <= 75) return '−1 no primeiro teste mental após perder Sanidade.';
  return 'Sem efeito.';
}

function linhasAjustes(personagem, chave) {
  return (personagem.recursos?.[chave] || []).map(item => ({
    nome: [item.origem || 'Ajuste', item.motivo].filter(Boolean).join(' · '),
    valor: Number(item.valor) || 0,
  }));
}

function linhasEfeitos(personagem, tipo, alvo) {
  return listarEfeitosAtivos(personagem, tipo, alvo).map(efeito => ({
    nome: efeito.origemNome,
    valor: Number(efeito.valor) || 0,
  }));
}

function detalhesCalculo(rotulo, personagem, ctx) {
  const recursos = personagem.recursos || {};
  const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  const baseRacial = calcularDerivados(personagem.atributosFinais, raca, personagem.nivel);
  const detalhes = [];
  let total = 0;
  let rotuloTotal = 'Total atual';

  if (rotulo === 'Vida' || rotulo === 'Mana') {
    const chave = rotulo === 'Vida' ? 'vida' : 'mana';
    const chaveAjustes = rotulo === 'Vida' ? 'ajustesVida' : 'ajustesMana';
    const base = baseRacial[chave];
    const armazenado = Number(personagem.derivados?.[chave]) || base;
    detalhes.push({ nome: 'Base de atributos e raça', valor: base, literal: true });
    const classes = armazenado - base;
    if (classes !== 0) detalhes.push({ nome: 'Progressão de classes', valor: classes });
    detalhes.push(...linhasAjustes(personagem, chaveAjustes));
    detalhes.push(...linhasEfeitos(personagem, 'recurso_maximo', chave));
    total = armazenado + somaAjustes(recursos[chaveAjustes]) + somarModificadores(personagem, 'recurso_maximo', chave);
    rotuloTotal = 'Máximo atual';
  } else if (rotulo === 'Sanidade') {
    detalhes.push({ nome: 'Base', valor: 100, literal: true });
    detalhes.push(...linhasAjustes(personagem, 'ajustesSanidade'));
    detalhes.push(...linhasEfeitos(personagem, 'recurso_maximo', 'sanidade'));
    const sanidadeAtual = Number(recursos.sanidade) || 0;
    detalhes.push({ nome: `Estado atual · ${estadoSanidade(sanidadeAtual)}`, valor: efeitoSanidade(sanidadeAtual), literal: true, negativo: sanidadeAtual <= 75 });
    total = Math.max(1, 100 + somaAjustes(recursos.ajustesSanidade) + somarModificadores(personagem, 'recurso_maximo', 'sanidade'));
    rotuloTotal = 'Máximo atual';
  } else if (rotulo === 'Cansaço') {
    const atual = Number(recursos.cansaco) || 0;
    detalhes.push({ nome: 'Nível atual', valor: atual, literal: true });
    detalhes.push({ nome: 'Estado', valor: estadoCansaco(atual), literal: true });
    detalhes.push({ nome: 'Efeito', valor: efeitoCansaco(atual), literal: true, negativo: atual > 0 });
    total = `${atual} / 6`;
    rotuloTotal = 'Cansaço atual';
  } else if (rotulo === 'Defesa') {
    const natural = Number(personagem.derivados?.defesaNatural) || 10;
    const armadura = Number(recursos.armadura) || 0;
    const penalidade = Math.abs(Number(recursos.penalidadeDefesa) || 0);
    const legado = Number(recursos.bonusDefesa) || 0;
    detalhes.push({ nome: 'Defesa Natural', valor: natural, literal: true });
    if (armadura !== 0) detalhes.push({ nome: 'Armadura', valor: armadura });
    if (penalidade !== 0) detalhes.push({ nome: 'Penalidade da Defesa', valor: -penalidade });
    if (legado !== 0) detalhes.push({ nome: 'Bônus legado', valor: legado });
    detalhes.push(...linhasAjustes(personagem, 'ajustesDefesa'));
    detalhes.push(...linhasEfeitos(personagem, 'combate', 'defesa'));
    total = natural + armadura - penalidade + legado + somaAjustes(recursos.ajustesDefesa) + somarModificadores(personagem, 'combate', 'defesa');
  } else if (rotulo === 'Iniciativa') {
    const base = Number(personagem.derivados?.iniciativa) || 10;
    const bonus = Number(recursos.bonusIniciativa) || 0;
    detalhes.push({ nome: 'Base calculada', valor: base, literal: true });
    if (bonus !== 0) detalhes.push({ nome: 'Bônus / Penalidade', valor: bonus });
    detalhes.push(...linhasAjustes(personagem, 'ajustesIniciativa'));
    detalhes.push(...linhasEfeitos(personagem, 'combate', 'iniciativa'));
    total = base + bonus + somaAjustes(recursos.ajustesIniciativa) + somarModificadores(personagem, 'combate', 'iniciativa');
  } else if (rotulo === 'Movimento') {
    const base = Number(personagem.derivados?.movimento) || 0;
    const penalidade = Math.abs(Number(recursos.penalidadeMovimento) || 0);
    detalhes.push({ nome: 'Base calculada', valor: `${base} m`, literal: true });
    if (penalidade !== 0) detalhes.push({ nome: 'Penalidade de Movimento', valor: `${-penalidade} m`, literal: true });
    detalhes.push(...linhasAjustes(personagem, 'ajustesMovimento'));
    detalhes.push(...linhasEfeitos(personagem, 'combate', 'movimento'));
    total = `${base - penalidade + somaAjustes(recursos.ajustesMovimento) + somarModificadores(personagem, 'combate', 'movimento')} m`;
  }
  return { detalhes, total, rotuloTotal };
}

function corpoModalCalculo(rotulo, personagem, ctx) {
  const corpo = document.createElement('div');
  corpo.className = 'ficha-calculo-modal';
  const formula = document.createElement('p');
  formula.className = 'ficha-calculo-formula';
  formula.textContent = FORMULAS_COMBATE[rotulo] || 'Fórmula ainda não documentada.';
  corpo.appendChild(formula);

  const { detalhes, total, rotuloTotal } = detalhesCalculo(rotulo, personagem, ctx);
  const lista = document.createElement('div');
  lista.className = 'ficha-calculo-lista';
  detalhes.forEach(item => {
    const linha = document.createElement('div');
    linha.className = 'ficha-calculo-linha';
    const nome = document.createElement('span');
    nome.textContent = item.nome;
    const valor = document.createElement('strong');
    valor.textContent = item.literal || typeof item.valor !== 'number'
      ? String(item.valor)
      : sinal(item.valor);
    if (item.negativo || (typeof item.valor === 'number' && item.valor < 0)) linha.classList.add('ficha-calculo-linha--negativa');
    linha.append(nome, valor);
    lista.appendChild(linha);
  });
  corpo.appendChild(lista);

  const totalEl = document.createElement('div');
  totalEl.className = 'ficha-calculo-total';
  totalEl.innerHTML = `<span>${rotuloTotal}</span><strong>${total}</strong>`;
  corpo.appendChild(totalEl);
  return corpo;
}

function criarBotaoInfo(rotulo, personagem, ctx) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-info-btn';
  btn.textContent = '?';
  btn.setAttribute('aria-label', `Como ${rotulo} é calculado`);
  btn.addEventListener('click', () => {
    abrirModalSimples({
      titulo: `Cálculo — ${rotulo}`,
      corpo: corpoModalCalculo(rotulo, personagem, ctx),
      classeExtra: 'ficha-modal--calculo',
    });
  });
  return btn;
}

function corpoModalAjustes(personagem, ctx, chave) {
  const container = document.createElement('div');
  container.className = 'ficha-ajustes-modal';

  const ajustes = [...(personagem.recursos?.[chave] || [])];

  const lista = document.createElement('div');
  lista.className = 'ficha-ajustes-lista';

  function salvarAjustes() {
    const salvou = salvar(personagem, ctx, { recursos: { ...personagem.recursos, [chave]: ajustes } });
    if (salvou && ['ajustesVida', 'ajustesMana', 'ajustesSanidade'].includes(chave)) {
      ctx.recarregar();
    }
  }

  function renderLista() {
    lista.innerHTML = '';
    if (ajustes.length === 0) {
      const vazio = document.createElement('p');
      vazio.className = 'ficha-wizard-intro';
      vazio.textContent = 'Nenhum ajuste ainda — some itens abaixo (equipamento, evento, maldição...).';
      lista.appendChild(vazio);
      return;
    }
    ajustes.forEach((item, indice) => {
      const linha = document.createElement('div');
      linha.className = 'ficha-ajuste-linha';

      const valor = document.createElement('span');
      valor.className = 'ficha-ajuste-valor';
      valor.textContent = item.valor >= 0 ? `+${item.valor}` : String(item.valor);
      linha.appendChild(valor);

      const motivo = document.createElement('span');
      motivo.className = 'ficha-ajuste-motivo';
      motivo.textContent = [item.origem, item.motivo || '(sem motivo)'].filter(Boolean).join(' · ');
      linha.appendChild(motivo);

      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'ficha-crud-remover';
      remover.textContent = '×';
      remover.setAttribute('aria-label', `Remover ajuste ${valor.textContent}`);
      remover.addEventListener('click', () => {
        ajustes.splice(indice, 1);
        salvarAjustes();
        renderLista();
      });
      linha.appendChild(remover);

      lista.appendChild(linha);
    });
  }

  renderLista();
  container.appendChild(lista);

  const form = document.createElement('form');
  form.className = 'ficha-ajuste-form';

  const valorInput = document.createElement('input');
  valorInput.type = 'number';
  valorInput.className = 'ficha-campo-input';
  valorInput.placeholder = '+2 ou -1';
  valorInput.setAttribute('aria-label', 'Valor do ajuste');

  const motivoInput = document.createElement('input');
  motivoInput.type = 'text';
  motivoInput.className = 'ficha-campo-input';
  motivoInput.placeholder = 'Motivo (opcional)';
  motivoInput.setAttribute('aria-label', 'Motivo do ajuste');

  const origemSelect = document.createElement('select');
  origemSelect.className = 'ficha-campo-select ficha-ajuste-origem';
  origemSelect.setAttribute('aria-label', 'Origem do ajuste');
  ['Outro', 'Item', 'Poder', 'Habilidade', 'Raça', 'Classe', 'Evento', 'Condição'].forEach(origem => {
    const option = document.createElement('option');
    option.value = origem;
    option.textContent = origem;
    origemSelect.appendChild(option);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'submit';
  addBtn.className = 'ficha-cta-btn';
  addBtn.textContent = 'Adicionar';

  form.append(origemSelect, valorInput, motivoInput, addBtn);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valor = Number(valorInput.value);
    if (!Number.isFinite(valor) || valor === 0) return;
    ajustes.push({ valor, motivo: motivoInput.value.trim(), origem: origemSelect.value });
    valorInput.value = '';
    motivoInput.value = '';
    salvarAjustes();
    renderLista();
  });
  container.appendChild(form);

  return container;
}

function criarBotaoAjustes(personagem, ctx, chave, rotulo) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ficha-info-btn ficha-info-btn--ajuste';
  btn.textContent = '±';
  btn.setAttribute('aria-label', `Ajustes personalizados de ${rotulo}`);
  const total = somaAjustes(personagem.recursos?.[chave]);
  if (total !== 0) {
    btn.classList.add('ficha-info-btn--ajuste-ativo');
    btn.title = `Ajustes ativos: ${sinal(total)}`;
  }
  btn.addEventListener('click', () => {
    abrirModalSimples({
      titulo: `Ajustes — ${rotulo}`,
      corpo: corpoModalAjustes(personagem, ctx, chave),
    });
  });
  return btn;
}

function criarStatCombate({ rotulo, valor, comAjustes, campos = [], personagem, ctx }) {
  const item = document.createElement('div');
  item.className = 'ficha-combate-stat-card';

  const linhaLabel = document.createElement('div');
  linhaLabel.className = 'ficha-wizard-stat-label-linha';

  const label = document.createElement('span');
  label.className = 'ficha-campo-label ficha-combate-stat-label';
  label.textContent = rotulo;
  linhaLabel.appendChild(label);

  const acoes = document.createElement('span');
  acoes.className = 'ficha-wizard-stat-acoes';
  acoes.appendChild(criarBotaoInfo(rotulo, personagem, ctx));
  if (comAjustes) acoes.appendChild(comAjustes);
  linhaLabel.appendChild(acoes);

  const valorEl = document.createElement('input');
  valorEl.type = 'text';
  valorEl.readOnly = true;
  valorEl.className = 'ficha-combate-stat-total';
  valorEl.value = valor;
  valorEl.setAttribute('aria-label', `${rotulo} total`);
  valorEl.dataset.statCalculado = rotulo;

  item.append(linhaLabel, valorEl, ...campos);
  return item;
}

function criarCampoCombateNumero(personagem, ctx, { chave, rotulo, valor = 0 }) {
  const grupo = document.createElement('label');
  grupo.className = 'ficha-combate-subcampo';
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'ficha-campo-input';
  input.value = valor;
  input.addEventListener('input', () => {
    salvar(personagem, ctx, {
      recursos: { ...personagem.recursos, [chave]: Number(input.value) || 0 },
    });
  });
  grupo.append(label, input);
  return grupo;
}

function criarCampoCombateTexto(personagem, ctx, { chave, rotulo, placeholder, valor = '' }) {
  const grupo = document.createElement('label');
  grupo.className = 'ficha-combate-anotacao';
  const label = document.createElement('span');
  label.className = 'ficha-campo-label';
  label.textContent = rotulo;
  const textarea = document.createElement('textarea');
  textarea.className = 'ficha-campo-input ficha-combate-textarea';
  textarea.rows = 5;
  textarea.value = valor;
  textarea.placeholder = placeholder;
  let temporizador = null;
  textarea.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      salvar(personagem, ctx, {
        recursos: { ...personagem.recursos, [chave]: textarea.value },
      });
    }, 300);
  });
  grupo.append(label, textarea);
  return grupo;
}

function somaAjustes(lista) {
  return (lista || []).reduce((total, item) => total + (Number(item.valor) || 0), 0);
}

function blocoCombate(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--combate';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Combate';
  bloco.appendChild(h);

  // bonusDefesa é o campo antigo (número solto) — quem já tinha um valor
  // aqui não perde nada; ajustesDefesa (lista nomeada) é o novo jeito de
  // somar, os dois se acumulam.
  const bonusDefesaLegado = personagem.recursos?.bonusDefesa ?? 0;
  const bonusDefesa = bonusDefesaLegado + somaAjustes(personagem.recursos?.ajustesDefesa);
  const bonusIniciativa = personagem.recursos?.bonusIniciativa ?? 0;
  const ajustesIniciativa = somaAjustes(personagem.recursos?.ajustesIniciativa);
  const ajustesMovimento = somaAjustes(personagem.recursos?.ajustesMovimento);
  const efeitoDefesa = somarModificadores(personagem, 'combate', 'defesa');
  const efeitoIniciativa = somarModificadores(personagem, 'combate', 'iniciativa');
  const efeitoMovimento = somarModificadores(personagem, 'combate', 'movimento');
  const armadura = Number(personagem.recursos?.armadura) || 0;
  const penalidadeDefesa = Math.abs(Number(personagem.recursos?.penalidadeDefesa) || 0);
  const penalidadeMovimento = Math.abs(Number(personagem.recursos?.penalidadeMovimento) || 0);

  const grade = document.createElement('div');
  grade.className = 'ficha-combate-stats';
  grade.appendChild(criarStatCombate({
    rotulo: 'Defesa',
    personagem,
    ctx,
    valor: (personagem.derivados?.defesaNatural ?? 10) + bonusDefesa + efeitoDefesa + armadura - penalidadeDefesa,
    comAjustes: criarBotaoAjustes(personagem, ctx, 'ajustesDefesa', 'Defesa'),
    campos: [
      criarCampoCombateNumero(personagem, ctx, { chave: 'armadura', rotulo: 'Armadura', valor: armadura }),
      criarCampoCombateNumero(personagem, ctx, {
        chave: 'penalidadeDefesa', rotulo: 'Penalidade da Defesa', valor: penalidadeDefesa,
      }),
    ],
  }));
  grade.appendChild(criarStatCombate({
    rotulo: 'Iniciativa',
    personagem,
    ctx,
    valor: (personagem.derivados?.iniciativa ?? 10) + bonusIniciativa + ajustesIniciativa + efeitoIniciativa,
    comAjustes: criarBotaoAjustes(personagem, ctx, 'ajustesIniciativa', 'Iniciativa'),
    campos: [
      criarCampoCombateNumero(personagem, ctx, {
        chave: 'bonusIniciativa', rotulo: 'Bônus / Penalidade', valor: bonusIniciativa,
      }),
    ],
  }));
  grade.appendChild(criarStatCombate({
    rotulo: 'Movimento',
    personagem,
    ctx,
    valor: `${(personagem.derivados?.movimento ?? 0) + ajustesMovimento + efeitoMovimento - penalidadeMovimento} m`,
    comAjustes: criarBotaoAjustes(personagem, ctx, 'ajustesMovimento', 'Movimento'),
    campos: [
      criarCampoCombateNumero(personagem, ctx, {
        chave: 'penalidadeMovimento', rotulo: 'Penalidade de Movimento', valor: penalidadeMovimento,
      }),
    ],
  }));
  bloco.appendChild(grade);

  const anotacoes = document.createElement('div');
  anotacoes.className = 'ficha-combate-anotacoes';
  anotacoes.append(
    criarCampoCombateTexto(personagem, ctx, {
      chave: 'resistencias',
      rotulo: 'Resistências',
      valor: personagem.recursos?.resistencias,
      placeholder: 'Ex.: Fogo 5, Corte 3, venenos...',
    }),
    criarCampoCombateTexto(personagem, ctx, {
      chave: 'proficiencias',
      rotulo: 'Proficiências',
      valor: personagem.recursos?.proficiencias,
      placeholder: 'Ex.: Armas simples, armaduras leves...',
    }),
    criarCampoCombateTexto(personagem, ctx, {
      chave: 'condicoesAtivas',
      rotulo: 'Condições Ativas',
      valor: personagem.recursos?.condicoesAtivas || personagem.recursos?.status,
      placeholder: 'Ex.: Envenenado (3 turnos), Caído...',
    }),
  );
  bloco.appendChild(anotacoes);

  return bloco;
}

function classeDisponivel(personagem, classe, catalogoClasses) {
  const atuais = personagem.classes || [];
  const existente = atuais.find(item => item.id === classe.id);
  const especial = classe.categoria !== 'padrao';
  if (existente) return existente.nivel < 20 && (!especial || personagem.nivel >= 15);
  if (especial) {
    return personagem.nivel >= 15
      && !atuais.some(item => {
        const catalogada = catalogoClasses.find(c => c.id === item.id);
        return catalogada?.categoria !== 'padrao';
      });
  }

  const comuns = atuais.filter(item => {
    const catalogada = catalogoClasses.find(c => c.id === item.id);
    return !catalogada || catalogada.categoria === 'padrao';
  });
  return comuns.length < 2;
}

function validarComposicaoClasses(classes, catalogoClasses) {
  if (!Array.isArray(classes) || classes.length === 0) {
    return 'O personagem precisa ter pelo menos uma classe.';
  }
  if (new Set(classes.map(item => item.id)).size !== classes.length) {
    return 'A mesma classe não pode ser adicionada duas vezes.';
  }
  if (classes.some(item => !Number.isInteger(item.nivel) || item.nivel < 1 || item.nivel > 20)) {
    return 'Cada classe precisa ter um nível inteiro entre 1 e 20.';
  }
  const total = totalNiveisClasse(classes);
  if (total > 40) return 'A soma dos níveis de classe não pode passar de 40.';

  const especiais = classes.filter(item => {
    const classe = catalogoClasses.find(catalogada => catalogada.id === item.id);
    return classe?.categoria !== 'padrao';
  });
  const comuns = classes.length - especiais.length;
  if (comuns > 2) return 'O limite normal é de duas classes comuns.';
  if (especiais.length > 1) return 'O limite normal é de uma classe especial.';
  if (especiais.length > 0 && total < 15) {
    return 'Classes especiais exigem nível total 15.';
  }
  return null;
}

function aplicarNiveisClasse(personagem, classe, quantidade, ctx) {
  const quantidadeInteira = Math.trunc(Number(quantidade));
  if (!Number.isInteger(quantidadeInteira) || quantidadeInteira < 1) {
    ctx.mostrarToast('Informe uma quantidade inteira de níveis.', 'erro');
    return false;
  }
  const classes = (personagem.classes || []).map(item => ({ ...item }));
  const existente = classes.find(item => item.id === classe.id);
  const nivelAtual = existente?.nivel || 0;
  const maximo = Math.min(personagem.niveisClassePendentes, 20 - nivelAtual);
  const aplicar = Math.max(1, Math.min(maximo, quantidadeInteira));
  if (maximo <= 0) return false;

  if (existente) existente.nivel += aplicar;
  else classes.push({ id: classe.id, nivel: aplicar });

  const baseVida = Number(classe.vida?.base);
  const baseMana = Number(classe.forca_vital?.base);
  const recursosDefinidos = Number.isFinite(baseVida) && Number.isFinite(baseMana);
  const derivados = { ...personagem.derivados };
  let niveisRecursosPendentes = personagem.niveisRecursosPendentes;
  if (recursosDefinidos) {
    derivados.vida = (Number(derivados.vida) || 0)
      + aplicar * Math.max(1, baseVida + modificador(personagem.atributosFinais.constituicao));
    derivados.mana = (Number(derivados.mana) || 0)
      + aplicar * Math.max(1, baseMana);
  } else {
    niveisRecursosPendentes += aplicar;
  }

  const salvou = salvar(personagem, ctx, {
    classes,
    niveisClassePendentes: personagem.niveisClassePendentes - aplicar,
    niveisRecursosPendentes,
    derivados,
  });
  if (salvou) ctx.recarregar();
  return salvou;
}

function blocoClasses(personagem, ctx) {
  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--classes';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Classe';
  bloco.appendChild(h);

  const resumoClasses = document.createElement('p');
  resumoClasses.className = 'ficha-classes-resumo';
  const totalClasses = (personagem.classes || []).length;
  resumoClasses.textContent = `${totalClasses} ${totalClasses === 1 ? 'classe' : 'classes'} · nível total ${personagem.nivel}`;
  bloco.appendChild(resumoClasses);

  const catalogoPorId = new Map(ctx.catalogo.classes.map(item => [item.id, item]));
  const lista = document.createElement('div');
  lista.className = 'ficha-classes-lista';
  const salvarClasses = classes => {
    const erroComposicao = validarComposicaoClasses(classes, ctx.catalogo.classes);
    if (erroComposicao) {
      ctx.mostrarToast(erroComposicao, 'erro');
      return false;
    }
    const nivel = totalNiveisClasse(classes);
    const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
    const derivadosNivel = calcularDerivados(personagem.atributosFinais, raca, nivel);
    const novosMarcosLegado = Math.max(0, marcosLegado(nivel) - personagem.marcosLegadoConcedidos);
    const novosMarcosAtributo = Math.max(0, marcosAtributo(nivel) - personagem.marcosAtributoConcedidos);
    const salvou = salvar(personagem, ctx, {
      classes,
      classeId: classes[0].id,
      nivel,
      xp: nivel === personagem.nivel ? personagem.xp : (TABELA_XP[nivel - 1] ?? personagem.xp),
      niveisClassePendentes: 0,
      legadosAscensaoPendentes: personagem.legadosAscensaoPendentes + novosMarcosLegado,
      marcosLegadoConcedidos: Math.max(personagem.marcosLegadoConcedidos, marcosLegado(nivel)),
      aumentosAtributoPendentes: personagem.aumentosAtributoPendentes + novosMarcosAtributo,
      marcosAtributoConcedidos: Math.max(personagem.marcosAtributoConcedidos, marcosAtributo(nivel)),
      derivados: {
        ...personagem.derivados,
        defesaNatural: derivadosNivel.defesaNatural,
        iniciativa: derivadosNivel.iniciativa,
      },
    });
    if (salvou) ctx.recarregar();
    return salvou;
  };

  (personagem.classes || []).forEach((item, indice) => {
    const linha = document.createElement('div');
    linha.className = 'ficha-classe-linha';
    const select = document.createElement('select');
    select.className = 'ficha-campo-select ficha-classe-select';
    select.setAttribute('aria-label', `Classe ${indice + 1}`);
    ctx.catalogo.classes.forEach(classe => {
      const option = document.createElement('option');
      option.value = classe.id;
      option.textContent = classe.titulo;
      option.selected = classe.id === item.id;
      const composicaoCandidata = (personagem.classes || [])
        .map((atual, i) => i === indice ? { ...atual, id: classe.id } : atual);
      option.disabled = classe.id !== item.id
        && Boolean(validarComposicaoClasses(composicaoCandidata, ctx.catalogo.classes));
      select.appendChild(option);
    });
    select.addEventListener('change', () => {
      if ((personagem.classes || []).some((classe, i) => i !== indice && classe.id === select.value)) {
        ctx.mostrarToast('Essa classe já está adicionada.', 'erro');
        select.value = item.id;
        return;
      }
      salvarClasses((personagem.classes || []).map((classe, i) => i === indice ? { ...classe, id: select.value } : classe));
    });

    const nivelGrupo = document.createElement('label');
    nivelGrupo.className = 'ficha-classe-nivel-grupo';
    const nivelLabel = document.createElement('span');
    nivelLabel.className = 'ficha-campo-label';
    nivelLabel.textContent = 'Nível';
    const nivelInput = document.createElement('input');
    nivelInput.type = 'number';
    nivelInput.className = 'ficha-campo-input ficha-classe-nivel';
    nivelInput.min = '1';
    nivelInput.max = '20';
    nivelInput.value = item.nivel;
    nivelInput.addEventListener('change', () => {
      const nivel = Number(nivelInput.value);
      if (!Number.isInteger(nivel) || nivel < 1 || nivel > 20) {
        ctx.mostrarToast('O nível da classe deve estar entre 1 e 20.', 'erro');
        nivelInput.value = item.nivel;
        return;
      }
      salvarClasses((personagem.classes || []).map((classe, i) => i === indice ? { ...classe, nivel } : classe));
    });
    nivelGrupo.append(nivelLabel, nivelInput);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'ficha-classe-remover';
    remover.textContent = '×';
    remover.setAttribute('aria-label', `Remover ${catalogoPorId.get(item.id)?.titulo || item.id}`);
    remover.disabled = (personagem.classes || []).length <= 1;
    remover.addEventListener('click', () => salvarClasses((personagem.classes || []).filter((_, i) => i !== indice)));
    linha.append(select, nivelGrupo, remover);
    lista.appendChild(linha);
  });
  bloco.appendChild(lista);

  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.className = 'ficha-adicionar-classe';
  adicionar.textContent = '+ Adicionar Classe';
  adicionar.addEventListener('click', () => {
    const novaClasse = ctx.catalogo.classes.find(classe => {
      if ((personagem.classes || []).some(atual => atual.id === classe.id)) return false;
      const candidatas = [...(personagem.classes || []), { id: classe.id, nivel: 1 }];
      return !validarComposicaoClasses(candidatas, ctx.catalogo.classes);
    });
    if (!novaClasse) {
      ctx.mostrarToast('Não há outra classe disponível para adicionar.', 'erro');
      return;
    }
    salvarClasses([...(personagem.classes || []), { id: novaClasse.id, nivel: 1 }]);
  });
  bloco.appendChild(adicionar);

  if (personagem.niveisClassePendentes > 0) {
    const disponiveis = ctx.catalogo.classes
      .filter(classe => classeDisponivel(personagem, classe, ctx.catalogo.classes));
    const resumo = document.createElement('p');
    resumo.className = 'ficha-progressao-resumo';
    resumo.textContent = `Distribuir ${personagem.niveisClassePendentes} nível(is) pendente(s)`;
    bloco.appendChild(resumo);
    const controles = document.createElement('div');
    controles.className = 'ficha-progressao-controles';

    const select = document.createElement('select');
    select.className = 'ficha-campo-select';
    disponiveis.forEach(classe => {
      const option = document.createElement('option');
      option.value = classe.id;
      const especial = classe.categoria !== 'padrao' ? ' · Especial' : '';
      const pendente = classe.pendente || classe.mecanicaPendente ? ' · Em desenvolvimento' : '';
      option.textContent = `${classe.titulo}${especial}${pendente}`;
      select.appendChild(option);
    });

    const quantidade = document.createElement('input');
    quantidade.type = 'number';
    quantidade.className = 'ficha-campo-input';
    quantidade.min = '1';
    quantidade.max = String(personagem.niveisClassePendentes);
    quantidade.value = '1';

    const aplicar = document.createElement('button');
    aplicar.type = 'button';
    aplicar.className = 'ficha-cta-btn';
    aplicar.textContent = 'Investir níveis';
    aplicar.disabled = disponiveis.length === 0;
    aplicar.addEventListener('click', () => {
      const classe = catalogoPorId.get(select.value);
      if (classe) aplicarNiveisClasse(personagem, classe, quantidade.value, ctx);
    });
    controles.append(select, quantidade, aplicar);
    bloco.appendChild(controles);
  }

  return bloco;
}

function listarNotificacoes(personagem) {
  const itens = [];
  if (personagem.niveisClassePendentes > 0) itens.push({
    id: 'classes',
    titulo: 'Níveis de classe pendentes',
    texto: `${personagem.niveisClassePendentes} nível(is) ainda precisam ser distribuídos entre suas classes.`,
  });
  if (personagem.niveisRecursosPendentes > 0) itens.push({
    id: 'recursos',
    titulo: 'Progressão em desenvolvimento',
    texto: `${personagem.niveisRecursosPendentes} nível(is) pertencem a classes cujo ganho de Vida e Mana ainda não foi publicado.`,
  });
  if (personagem.legadosAscensaoPendentes > 0) itens.push({
    id: 'poderes',
    titulo: 'Legado de Ascensão disponível',
    texto: `${personagem.legadosAscensaoPendentes} escolha(s) aguardam na aba Poderes.`,
  });
  if (personagem.aumentosAtributoPendentes > 0) itens.push({
    id: 'atributos',
    titulo: 'Aumento de atributo disponível',
    texto: `${personagem.aumentosAtributoPendentes} ponto(s) podem ser aplicados diretamente nos atributos.`,
  });
  return itens;
}

function abrirNotificacoes(personagem) {
  const notificacoes = listarNotificacoes(personagem);
  const corpo = document.createElement('div');
  corpo.className = 'ficha-notificacoes-modal';

  if (notificacoes.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'ficha-wizard-intro';
    vazio.textContent = 'Nenhum aviso pendente. A ficha está em dia.';
    corpo.appendChild(vazio);
  }

  notificacoes.forEach(item => {
    const card = document.createElement('article');
    card.className = 'ficha-notificacao-card';
    const titulo = document.createElement('strong');
    titulo.className = 'ficha-notificacao-titulo';
    titulo.textContent = item.titulo;
    const texto = document.createElement('p');
    texto.className = 'ficha-notificacao-texto';
    texto.textContent = item.texto;
    card.append(titulo, texto);

    if (['classes', 'atributos', 'poderes'].includes(item.id)) {
      const acao = document.createElement('button');
      acao.type = 'button';
      acao.className = 'ficha-notificacao-acao';
      acao.textContent = item.id === 'poderes' ? 'Abrir Poderes' : 'Mostrar na ficha';
      acao.addEventListener('click', () => {
        fecharModalSimples();
        if (item.id === 'poderes') {
          router.navegar(`/personagem/${personagem.id}/poderes`);
          return;
        }
        const seletor = item.id === 'classes'
          ? '.ficha-detalhe-bloco--classes'
          : '.ficha-detalhe-bloco--atributos';
        document.querySelector(seletor)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      card.appendChild(acao);
    }
    corpo.appendChild(card);
  });

  abrirModalSimples({ titulo: 'Notificações da ficha', corpo, classeExtra: 'ficha-modal--notificacoes' });
}

function criarCentralNotificacoes(personagem) {
  const notificacoes = listarNotificacoes(personagem);
  const barra = document.createElement('div');
  barra.className = 'ficha-notificacoes-barra';
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'ficha-notificacoes-btn';
  botao.setAttribute('aria-label', `Notificações da ficha: ${notificacoes.length}`);
  botao.innerHTML = '<span aria-hidden="true">🔔</span><span>Avisos</span>';
  if (notificacoes.length > 0) {
    const badge = document.createElement('span');
    badge.className = 'ficha-notificacoes-badge';
    badge.textContent = String(notificacoes.length);
    botao.appendChild(badge);
  }
  botao.addEventListener('click', () => abrirNotificacoes(personagem));
  barra.appendChild(botao);
  return barra;
}

function atualizarCentralNotificacoesNoDom(personagem) {
  const botao = document.querySelector('.ficha-notificacoes-btn');
  if (!botao) return;
  const total = listarNotificacoes(personagem).length;
  botao.setAttribute('aria-label', `Notificações da ficha: ${total}`);
  let badge = botao.querySelector('.ficha-notificacoes-badge');
  if (total === 0) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'ficha-notificacoes-badge';
    botao.appendChild(badge);
  }
  badge.textContent = String(total);
}

export function renderAbaFicha(container, personagem, ctx) {
  container.appendChild(criarCentralNotificacoes(personagem));
  const blocos = document.createElement('div');
  blocos.className = 'ficha-detalhe-blocos';
  const topo = document.createElement('div');
  topo.className = 'ficha-topo-grade';
  topo.append(blocoIdentidade(personagem, ctx), blocoClasses(personagem, ctx));
  blocos.appendChild(topo);
  blocos.appendChild(blocoAtributos(personagem, ctx));
  blocos.appendChild(blocoRecursos(personagem, ctx));
  blocos.appendChild(blocoCombate(personagem, ctx));
  blocos.appendChild(blocoNivel(personagem, ctx));
  container.appendChild(blocos);
}
