// Ficha — estatísticas centrais (versão 1.0 das Regras) + recursos jogáveis.
// Início e Ficha eram abas separadas; viraram uma só (mesma ideia do projeto
// de referência Ficha-Supremacia-do-Protesto: tudo da identidade central do
// personagem numa página, em seções empilhadas de largura cheia — não um
// grid de cartões pequenos competindo por espaço).

import { router } from '../../../../core/router.js';
import { marcosAtributo, marcosLegado, totalNiveisClasse } from '../../../config/progressao.js';
import { listarArvoresDisponiveis } from '../../../services/arvoresService.js';
import {
  calcularDerivados,
  calcularDerivadosComClasses,
  aplicarAjusteAtributoRacial,
  obterAjustesAtributosRaciais,
  obterLimitesAtributosRaciais,
  obterModificacoesRaciaisInstaladas,
  obterAjustesPericiasRaciais,
  obterArvoresClassePermitidas,
  obterMaldicoesRaciaisConhecidas,
  modificador,
  nivelPorXp,
  xpProximoNivel,
} from '../../../services/calculoService.js';
import { criarBarraRecurso } from '../recursoBarra.js';
import { NOMES_ATRIBUTOS } from '../../../config/nomesAtributos.js';
import { registrosApi } from '../../../../plataforma/registrosApi.js';
import { obterContextoPlataforma } from '../../../../plataforma/portal.js?v=8';
import {
  somarModificadores,
  valorAtributoEfetivo,
} from '../../../services/modificadoresService.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';
import {
  criarCampoSelect,
  criarCampoTexto,
  salvar,
  sinal,
  somaAjustes,
} from './ficha/fichaCompartilhada.js';
import {
  blocoFragmentosRaciais,
  blocoMaldicoesRaciais,
  blocoModificacoesRaciais,
} from './ficha/racialFicha.js';
import { blocoCombate, criarBotaoAjustes, criarBotaoInfo } from './ficha/combateFicha.js';
import {
  aplicarNiveisClasse,
  blocoClasses,
  classeDisponivel,
  validarComposicaoClasses,
} from './ficha/classesFicha.js';
import { criarCentralNotificacoes } from './ficha/notificacoesFicha.js';

const SIGLA_ATRIBUTO = {
  forca: 'FOR', destreza: 'DES', constituicao: 'CON',
  inteligencia: 'INT', sabedoria: 'SAB', carisma: 'CAR', fluxo: 'FLX',
};

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
    rotulo: personagem.racaId === 'errante' ? 'Árvore atual' : 'Árvore',
    valor: personagem.arvoreId,
    opcoes: listarArvoresDisponiveis(),
    aoMudar: (valor, select) => {
      const racaAtual = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
      const racaIncompativel = racaAtual?.disponibilidade === 'restrita'
        && Array.isArray(racaAtual.arvores)
        && racaAtual.arvores.length > 0
        && !racaAtual.arvores.includes(valor);
      if (racaIncompativel) {
        ctx.mostrarToast(`${racaAtual.titulo} não está disponível nessa Árvore.`, 'erro');
        select.value = personagem.arvoreId || '';
        return;
      }
      const erro = validarComposicaoClasses(
        personagem.classes,
        ctx.catalogo.classes,
        obterArvoresClassePermitidas(personagem, valor),
      );
      if (erro) {
        ctx.mostrarToast(erro, 'erro');
        select.value = personagem.arvoreId || '';
        return;
      }
      salvar(personagem, ctx, { arvoreId: valor });
    },
  }));

  const racasDisponiveisParaEdicao = ctx.catalogo.racas.filter(raca => (
    raca.disponibilidade === 'geral' || raca.id === personagem.racaId
  ));
  grade.appendChild(criarCampoSelect({
    rotulo: 'Raça',
    valor: personagem.racaId,
    opcoes: racasDisponiveisParaEdicao,
    aoMudar: (valor, select) => {
      const raca = ctx.catalogo.racas.find(item => item.id === valor) || null;
      const escolhaRacial = Array.isArray(raca?.variantes) && raca.variantes.length > 0
        ? { varianteId: raca.variantes[0].id }
        : {};
      const erroClasses = validarComposicaoClasses(
        personagem.classes,
        ctx.catalogo.classes,
        obterArvoresClassePermitidas({ ...personagem, racaId: valor, escolhaRacial }),
      );
      if (erroClasses) {
        ctx.mostrarToast(erroClasses, 'erro');
        select.value = personagem.racaId || '';
        return;
      }
      const variante = raca?.variantes?.find(item => item.id === escolhaRacial.varianteId) || null;
      const { recursosDefinidos: _, ...derivados } = calcularDerivadosComClasses(
        personagem.atributosFinais,
        raca,
        personagem.classes,
        ctx.catalogo.classes,
        personagem.nivel,
        escolhaRacial,
      );
      salvar(personagem, ctx, {
        racaId: valor,
        escolhaRacial,
        tamanho: variante?.tamanho || personagem.tamanho,
        ajustesAtributosRaciais: obterAjustesAtributosRaciais(raca, escolhaRacial),
        limitesAtributosRaciais: obterLimitesAtributosRaciais(raca, escolhaRacial),
        ajustesPericiasRaciais: obterAjustesPericiasRaciais(raca, escolhaRacial),
        derivados,
      });
    },
  }));

  const racaAtual = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  if (racaAtual?.origem_externa) {
    grade.appendChild(criarCampoTexto({
      rotulo: 'Mundo ou RPG de origem',
      valor: personagem.escolhaRacial?.rpgOrigem,
      placeholder: 'Ex.: nome do outro RPG ou cenário',
      aoMudar: valor => salvar(personagem, ctx, {
        escolhaRacial: { ...(personagem.escolhaRacial || {}), rpgOrigem: valor },
      }),
    }));
    grade.appendChild(criarCampoTexto({
      rotulo: 'Campanha de origem',
      valor: personagem.escolhaRacial?.campanhaOrigem,
      placeholder: 'Ex.: nome da campanha anterior',
      aoMudar: valor => salvar(personagem, ctx, {
        escolhaRacial: { ...(personagem.escolhaRacial || {}), campanhaOrigem: valor },
      }),
    }));
    grade.appendChild(criarCampoSelect({
      rotulo: 'Árvore de origem equivalente',
      valor: personagem.escolhaRacial?.arvoreOrigemId,
      opcoes: listarArvoresDisponiveis(),
      aoMudar: (valor, select) => {
        const escolhaRacial = {
          ...(personagem.escolhaRacial || {}),
          arvoreOrigemId: valor,
        };
        const erro = validarComposicaoClasses(
          personagem.classes,
          ctx.catalogo.classes,
          obterArvoresClassePermitidas({ ...personagem, escolhaRacial }),
        );
        if (erro) {
          ctx.mostrarToast(erro, 'erro');
          select.value = personagem.escolhaRacial?.arvoreOrigemId || '';
          return;
        }
        salvar(personagem, ctx, { escolhaRacial });
      },
    }));
  }
  if (Array.isArray(racaAtual?.variantes) && racaAtual.variantes.length > 0) {
    grade.appendChild(criarCampoSelect({
      rotulo: racaAtual.rotulo_variante
        || (racaAtual.id === 'automato' ? 'Chassi' : 'Morfologia racial'),
      valor: personagem.escolhaRacial?.varianteId,
      opcoes: racaAtual.variantes,
      aoMudar: valor => {
        const variante = racaAtual.variantes.find(item => item.id === valor) || null;
        const escolhaBase = {
          ...(personagem.escolhaRacial || {}),
          varianteId: valor,
          ...(valor !== 'arquivo-vivo' ? { periciasProjeto: [] } : {}),
        };
        if (Array.isArray(racaAtual.maldicoes)) {
          const campoMaldicoes = String(
            racaAtual.maldicoes_config?.campo || 'maldicoesConhecidasIds',
          );
          escolhaBase[campoMaldicoes] = obterMaldicoesRaciaisConhecidas(
            racaAtual,
            escolhaBase,
          ).map(item => item.id);
        }
        const modificacoesValidas = obterModificacoesRaciaisInstaladas(
          racaAtual,
          escolhaBase,
          personagem.nivel,
        ).map(item => item.id);
        const escolhaRacial = {
          ...escolhaBase,
          ...(Array.isArray(racaAtual.modificacoes)
            ? { modificacoesIds: modificacoesValidas }
            : {}),
        };
        const { recursosDefinidos: _, ...derivados } = calcularDerivadosComClasses(
          personagem.atributosFinais,
          racaAtual,
          personagem.classes,
          ctx.catalogo.classes,
          personagem.nivel,
          escolhaRacial,
        );
        salvar(personagem, ctx, {
          escolhaRacial,
          tamanho: variante?.tamanho || personagem.tamanho,
          ajustesAtributosRaciais: obterAjustesAtributosRaciais(racaAtual, escolhaRacial),
          limitesAtributosRaciais: obterLimitesAtributosRaciais(racaAtual, escolhaRacial),
          derivados,
        });
      },
    }));
  }

  const escolhaAtributos = racaAtual?.escolha_atributos;
  const totalAtributos = Math.max(0, Math.trunc(Number(escolhaAtributos?.total) || 0));
  const campoAtributos = String(escolhaAtributos?.campo || 'atributosRaciais');
  for (let indice = 0; indice < totalAtributos; indice += 1) {
    const atuais = Array.from(
      { length: totalAtributos },
      (_, posicao) => personagem.escolhaRacial?.[campoAtributos]?.[posicao] || '',
    );
    grade.appendChild(criarCampoSelect({
      rotulo: totalAtributos > 1
        ? `${escolhaAtributos.titulo || 'Atributo racial'} ${indice + 1}`
        : (escolhaAtributos.titulo || 'Atributo racial'),
      valor: atuais[indice],
      opcoes: Object.entries(NOMES_ATRIBUTOS)
        .filter(([id]) => id === atuais[indice] || !atuais.includes(id))
        .map(([id, titulo]) => ({ id, titulo })),
      aoMudar: valor => {
        const atributosRaciais = [...atuais];
        atributosRaciais[indice] = valor || '';
        const escolhaRacial = {
          ...(personagem.escolhaRacial || {}),
          [campoAtributos]: atributosRaciais.filter(Boolean),
        };
        const { recursosDefinidos: _, ...derivados } = calcularDerivadosComClasses(
          personagem.atributosFinais,
          racaAtual,
          personagem.classes,
          ctx.catalogo.classes,
          personagem.nivel,
          escolhaRacial,
        );
        salvar(personagem, ctx, {
          escolhaRacial,
          ajustesAtributosRaciais: obterAjustesAtributosRaciais(racaAtual, escolhaRacial),
          limitesAtributosRaciais: obterLimitesAtributosRaciais(racaAtual, escolhaRacial),
          derivados,
        });
      },
    }));
  }

  const varianteAtual = racaAtual?.variantes?.find(
    item => item.id === personagem.escolhaRacial?.varianteId,
  ) || null;
  const escolhaPericias = varianteAtual?.escolha_pericias || racaAtual?.escolha_pericias;
  const totalPericiasProjeto = Math.max(0, Math.trunc(Number(escolhaPericias?.total) || 0));
  const campoPericias = String(escolhaPericias?.campo || 'periciasProjeto');
  for (let indice = 0; indice < totalPericiasProjeto; indice += 1) {
    const atuais = Array.from(
      { length: totalPericiasProjeto },
      (_, posicao) => personagem.escolhaRacial?.[campoPericias]?.[posicao] || '',
    );
    grade.appendChild(criarCampoSelect({
      rotulo: `${escolhaPericias.titulo || 'Perícia escolhida'} ${indice + 1}`,
      valor: atuais[indice],
      opcoes: (ctx.catalogo.pericias || [])
        .filter(pericia => pericia.id === atuais[indice] || !atuais.includes(pericia.id)),
      aoMudar: valor => {
        const periciasProjeto = [...atuais];
        periciasProjeto[indice] = valor || '';
        salvar(personagem, ctx, {
          escolhaRacial: {
            ...(personagem.escolhaRacial || {}),
            [campoPericias]: periciasProjeto.filter(Boolean),
          },
        });
      },
    }));
  }

  if (Array.isArray(racaAtual?.assinaturas) && racaAtual.assinaturas.length > 0) {
    grade.appendChild(criarCampoTexto({
      rotulo: 'Nome da Assinatura Remanescente',
      valor: personagem.escolhaRacial?.assinaturaNome,
      placeholder: 'Ex.: Corte do Dragão Rubro',
      aoMudar: valor => salvar(personagem, ctx, {
        escolhaRacial: { ...(personagem.escolhaRacial || {}), assinaturaNome: valor },
      }),
    }));
    grade.appendChild(criarCampoSelect({
      rotulo: 'Formato da Assinatura',
      valor: personagem.escolhaRacial?.assinaturaFormatoId,
      opcoes: racaAtual.assinaturas,
      aoMudar: valor => salvar(personagem, ctx, {
        escolhaRacial: {
          ...(personagem.escolhaRacial || {}),
          assinaturaFormatoId: valor,
        },
      }),
    }));
  }

  if (Array.isArray(racaAtual?.linhagens) && racaAtual.linhagens.length > 0) {
    grade.appendChild(criarCampoSelect({
      rotulo: 'Linhagem Élfica',
      valor: personagem.escolhaRacial?.linhagemId,
      opcoes: racaAtual.linhagens,
      aoMudar: valor => salvar(personagem, ctx, {
        escolhaRacial: {
          ...(personagem.escolhaRacial || {}),
          linhagemId: valor,
        },
      }),
    }));
  }

  if (Array.isArray(racaAtual?.condicoes_ancestrais) && racaAtual.condicoes_ancestrais.length > 0) {
    grade.appendChild(criarCampoSelect({
      rotulo: 'Condição Ancestral',
      valor: personagem.escolhaRacial?.condicaoAncestralId,
      opcoes: racaAtual.condicoes_ancestrais,
      aoMudar: valor => {
        const escolhaRacial = {
          ...(personagem.escolhaRacial || {}),
          condicaoAncestralId: valor,
        };
        salvar(personagem, ctx, {
          escolhaRacial,
          ajustesPericiasRaciais: obterAjustesPericiasRaciais(racaAtual, escolhaRacial),
        });
      },
    }));
  }

  const conhecimentosExtremosTotal = Math.max(
    0,
    Math.trunc(Number(racaAtual?.conhecimentos_extremos_total) || 0),
  );
  for (let indice = 0; indice < conhecimentosExtremosTotal; indice += 1) {
    grade.appendChild(criarCampoTexto({
      rotulo: `Conhecimento Extremo ${indice + 1}`,
      valor: personagem.escolhaRacial?.conhecimentosExtremos?.[indice],
      placeholder: 'Ex.: tecnologia A.X.I.S',
      aoMudar: valor => {
        const conhecimentosExtremos = Array.from(
          { length: conhecimentosExtremosTotal },
          (_, posicao) => personagem.escolhaRacial?.conhecimentosExtremos?.[posicao] || '',
        );
        conhecimentosExtremos[indice] = valor;
        salvar(personagem, ctx, {
          escolhaRacial: {
            ...(personagem.escolhaRacial || {}),
            conhecimentosExtremos,
          },
        });
      },
    }));
  }

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
    const bonusRacial = aplicarAjusteAtributoRacial(
      valorBase,
      personagem.ajustesAtributosRaciais?.[chave],
      personagem.limitesAtributosRaciais?.[chave],
    ) - valorBase;
    const valor = valorAtributoEfetivo(personagem, chave);
    grade.appendChild(criarCardAtributo(
      SIGLA_ATRIBUTO[chave] || chave.slice(0, 3).toUpperCase(), rotulo, valor, modificador(valor),
      (novoValor) => {
        if (!Number.isInteger(novoValor) || novoValor < 1 || novoValor > 99) {
          ctx.mostrarToast('O atributo deve ser um número inteiro entre 1 e 99.', 'erro');
          return false;
        }
        const novoValorSemEfeitos = novoValor - bonusEfeito;
        const limiteRacial = Number(personagem.limitesAtributosRaciais?.[chave]);
        const novoValorBase = Number.isFinite(limiteRacial) && novoValorSemEfeitos > limiteRacial
          ? novoValorSemEfeitos
          : novoValorSemEfeitos - bonusRacial;
        // personagem.atributosFinais é atualizado a cada salvar(); o valorBase
        // capturado no render ficaria obsoleto numa segunda edição seguida e
        // debitaria aumentos pendentes a mais.
        const baseAtual = Number(personagem.atributosFinais?.[chave]) || valorBase;
        const atributosFinais = { ...personagem.atributosFinais, [chave]: novoValorBase };
        const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
        const { recursosDefinidos: _, ...depois } = calcularDerivadosComClasses(
          atributosFinais,
          raca,
          personagem.classes,
          ctx.catalogo.classes,
          personagem.nivel,
          personagem.escolhaRacial,
        );
        return salvar(personagem, ctx, {
          atributosFinais,
          aumentosAtributoPendentes: Math.max(
            0,
            personagem.aumentosAtributoPendentes - Math.max(0, novoValorBase - baseAtual),
          ),
          derivados: depois,
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
      option.textContent = `${classe.titulo}${especial}`;
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
    const derivadosDoNivel = calcularDerivados(
      personagem.atributosFinais,
      raca,
      novoNivel,
      personagem.escolhaRacial,
    );
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

function blocoRolarTeste(personagem, ctx) {
  const card = document.createElement('div');
  card.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--rolar';
  const titulo = document.createElement('h3');
  titulo.className = 'ficha-secao-titulo';
  titulo.textContent = 'Rolar teste';
  card.append(titulo);
  const ajuda = document.createElement('p');
  ajuda.className = 'ficha-rolar-dica';
  ajuda.textContent = 'd20 + modificador do atributo. O resultado cai no log da sessão ao vivo.';
  card.append(ajuda);

  const linha = document.createElement('div');
  linha.className = 'ficha-rolar-linha';
  const select = document.createElement('select');
  select.className = 'ficha-rolar-select';
  select.setAttribute('aria-label', 'Atributo para o teste');
  Object.entries(NOMES_ATRIBUTOS).forEach(([chave, rotulo]) => {
    const mod = modificador(Number(personagem.atributosFinais?.[chave]) || 10);
    select.append(new Option(`${rotulo} (${mod >= 0 ? '+' : ''}${mod})`, chave));
  });
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'ficha-rolar-btn';
  botao.textContent = '🎲 Rolar';
  const saida = document.createElement('span');
  saida.className = 'ficha-rolar-saida';
  saida.setAttribute('role', 'status');
  linha.append(select, botao, saida);
  card.append(linha);

  botao.addEventListener('click', async () => {
    const chave = select.value;
    const mod = modificador(Number(personagem.atributosFinais?.[chave]) || 10);
    const campanhaId = obterContextoPlataforma()?.campanha?.id;
    if (!campanhaId) {
      saida.textContent = 'Sem campanha ativa.';
      return;
    }
    botao.disabled = true;
    saida.textContent = 'Rolando…';
    try {
      const { registro } = await registrosApi.rolar({
        campanha_id: campanhaId,
        personagem_id: personagem.id,
        titulo: `Teste de ${NOMES_ATRIBUTOS[chave]}`,
        bonus: mod,
        origem: { tipo: 'ficha', atributo: chave },
      });
      saida.textContent = `= ${registro.resultado} (${registro.formula})`;
      ctx.mostrarToast?.('Rolagem enviada para a sessão.', 'sucesso');
    } catch (erro) {
      saida.textContent = erro?.message || 'Não consegui rolar. A sessão está aberta?';
    } finally {
      botao.disabled = false;
    }
  });
  return card;
}

export function renderAbaFicha(container, personagem, ctx) {
  container.appendChild(criarCentralNotificacoes(personagem));
  const blocos = document.createElement('div');
  blocos.className = 'ficha-detalhe-blocos';
  const topo = document.createElement('div');
  topo.className = 'ficha-topo-grade';
  topo.append(blocoIdentidade(personagem, ctx), blocoClasses(personagem, ctx));
  blocos.appendChild(topo);
  const modificacoesRaciais = blocoModificacoesRaciais(personagem, ctx);
  if (modificacoesRaciais) blocos.appendChild(modificacoesRaciais);
  const fragmentosRaciais = blocoFragmentosRaciais(personagem, ctx);
  if (fragmentosRaciais) blocos.appendChild(fragmentosRaciais);
  const maldicoesRaciais = blocoMaldicoesRaciais(personagem, ctx);
  if (maldicoesRaciais) blocos.appendChild(maldicoesRaciais);
  blocos.appendChild(blocoAtributos(personagem, ctx));
  blocos.appendChild(blocoRolarTeste(personagem, ctx));
  blocos.appendChild(blocoRecursos(personagem, ctx));
  blocos.appendChild(blocoCombate(personagem, ctx));
  blocos.appendChild(blocoNivel(personagem, ctx));
  container.appendChild(blocos);
}
