import { marcosAtributo, marcosLegado, totalNiveisClasse } from '../../../../config/progressao.js';
import {
  calcularDerivadosComClasses,
  obterArvoresClassePermitidas,
  TABELA_XP,
} from '../../../../services/calculoService.js';
import { salvar } from './fichaCompartilhada.js';

export function classeDisponivel(personagem, classe, catalogoClasses) {
  const atuais = personagem.classes || [];
  const existente = atuais.find(item => item.id === classe.id);
  const especial = classe.categoria !== 'padrao';
  if (classe.disponibilidade === 'exclusiva'
    && !obterArvoresClassePermitidas(personagem).includes(classe.arvore)) {
    return false;
  }
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

export function validarComposicaoClasses(classes, catalogoClasses, arvoreId = null) {
  const arvoresPermitidas = new Set(
    (Array.isArray(arvoreId) ? arvoreId : [arvoreId]).filter(Boolean),
  );
  if (!Array.isArray(classes) || classes.length === 0) {
    return 'O personagem precisa ter pelo menos uma classe.';
  }
  if (new Set(classes.map(item => item.id)).size !== classes.length) {
    return 'A mesma classe não pode ser adicionada duas vezes.';
  }
  if (classes.some(item => !Number.isInteger(item.nivel) || item.nivel < 1 || item.nivel > 20)) {
    return 'Cada classe precisa ter um nível inteiro entre 1 e 20.';
  }
  const exclusivaIncompativel = classes
    .map(item => catalogoClasses.find(classe => classe.id === item.id))
    .find(classe => classe?.disponibilidade === 'exclusiva'
      && !arvoresPermitidas.has(classe.arvore));
  if (exclusivaIncompativel) {
    return `${exclusivaIncompativel.titulo} é exclusiva de outra Árvore.`;
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

export function aplicarNiveisClasse(personagem, classe, quantidade, ctx) {
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

  const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  const derivadosCalculados = calcularDerivadosComClasses(
    personagem.atributosFinais,
    raca,
    classes,
    ctx.catalogo.classes,
    personagem.nivel,
    personagem.escolhaRacial,
  );
  const { recursosDefinidos, ...derivados } = derivadosCalculados;

  const salvou = salvar(personagem, ctx, {
    classes,
    niveisClassePendentes: personagem.niveisClassePendentes - aplicar,
    niveisRecursosPendentes: recursosDefinidos ? 0 : personagem.niveisRecursosPendentes + aplicar,
    derivados,
  });
  if (salvou) ctx.recarregar();
  return salvou;
}

export function blocoClasses(personagem, ctx) {
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
    const erroComposicao = validarComposicaoClasses(
      classes,
      ctx.catalogo.classes,
      obterArvoresClassePermitidas(personagem),
    );
    if (erroComposicao) {
      ctx.mostrarToast(erroComposicao, 'erro');
      return false;
    }
    const nivel = totalNiveisClasse(classes);
    const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
    const derivadosCalculados = calcularDerivadosComClasses(
      personagem.atributosFinais,
      raca,
      classes,
      ctx.catalogo.classes,
      null,
      personagem.escolhaRacial,
    );
    const { recursosDefinidos, ...derivadosNivel } = derivadosCalculados;
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
      niveisRecursosPendentes: recursosDefinidos ? 0 : personagem.niveisRecursosPendentes,
      derivados: derivadosNivel,
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
        && Boolean(validarComposicaoClasses(
          composicaoCandidata,
          ctx.catalogo.classes,
          obterArvoresClassePermitidas(personagem),
        ));
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
      return !validarComposicaoClasses(
        candidatas,
        ctx.catalogo.classes,
        obterArvoresClassePermitidas(personagem),
      );
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
      option.textContent = `${classe.titulo}${especial}`;
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

