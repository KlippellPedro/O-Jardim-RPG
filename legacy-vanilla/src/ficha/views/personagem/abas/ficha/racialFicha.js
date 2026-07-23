import {
  calcularDerivadosComClasses,
  capacidadeModificacoesRaciais,
  obterModificacoesRaciaisInstaladas,
  obterAjustesPericiasRaciais,
  obterFragmentosRaciaisConhecidos,
  obterFragmentosRaciaisExpressos,
  capacidadeMaldicoesRaciais,
  obterMaldicoesRaciaisConhecidas,
} from '../../../../services/calculoService.js';
import { salvar } from './fichaCompartilhada.js';

function textoPreRequisitosModificacao(modificacao) {
  return [
    Number(modificacao.nivel_minimo) > 1 ? `nível ${modificacao.nivel_minimo}` : '',
    Number(modificacao.passivas_exigidas) > 0
      ? `${modificacao.passivas_exigidas} passivas instaladas`
      : '',
    modificacao.postura_exigida === 'bipede' ? 'chassi bípede' : '',
  ].filter(Boolean).join(' · ');
}

export function blocoModificacoesRaciais(personagem, ctx) {
  const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  if (!Array.isArray(raca?.modificacoes) || raca.modificacoes.length === 0) return null;

  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--modificacoes-raciais';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Modificações do Autômato';
  bloco.appendChild(h);

  const capacidade = capacidadeModificacoesRaciais(raca, personagem.nivel);
  const instaladas = obterModificacoesRaciaisInstaladas(
    raca,
    personagem.escolhaRacial,
    personagem.nivel,
  );
  const idsInstaladas = new Set(instaladas.map(item => item.id));
  const passivasInstaladas = instaladas.filter(item => item.categoria === 'passiva').length;
  const ativasInstaladas = instaladas.filter(item => item.categoria === 'ativa').length;

  const resumo = document.createElement('p');
  resumo.className = 'ficha-classes-resumo';
  resumo.textContent = `${instaladas.length}/${capacidade} instaladas · ${passivasInstaladas} passivas · ${ativasInstaladas} ativas`;
  bloco.appendChild(resumo);

  const aviso = document.createElement('p');
  aviso.className = 'ficha-wizard-aviso';
  aviso.textContent = 'Selecionar aqui registra uma instalação já concluída. Tempo, peças e Lunaris continuam sendo resolvidos pelo mestre.';
  bloco.appendChild(aviso);

  const variante = raca.variantes?.find(
    item => item.id === personagem.escolhaRacial?.varianteId,
  ) || null;
  const lista = document.createElement('div');
  lista.className = 'ficha-classes-lista';

  raca.modificacoes.forEach(modificacao => {
    const linha = document.createElement('label');
    linha.className = 'ficha-modificacao-racial';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = idsInstaladas.has(modificacao.id);

    const nivelInsuficiente = personagem.nivel < Math.max(1, Number(modificacao.nivel_minimo) || 1);
    const posturaIncompativel = Boolean(modificacao.postura_exigida)
      && modificacao.postura_exigida !== variante?.postura;
    const faltamPassivas = modificacao.categoria === 'ativa'
      && passivasInstaladas < Math.max(0, Number(modificacao.passivas_exigidas) || 0);
    const semEspaco = instaladas.length >= capacidade;
    const removerQuebrariaAtivas = checkbox.checked
      && modificacao.categoria === 'passiva'
      && ativasInstaladas > 0
      && passivasInstaladas <= 3;
    checkbox.disabled = checkbox.checked
      ? removerQuebrariaAtivas
      : nivelInsuficiente || posturaIncompativel || faltamPassivas || semEspaco;

    const texto = document.createElement('span');
    const preRequisitos = textoPreRequisitosModificacao(modificacao);
    texto.textContent = `${modificacao.titulo} · ${modificacao.categoria === 'ativa' ? 'Ativa' : 'Passiva'}${preRequisitos ? ` · ${preRequisitos}` : ''}`;
    texto.title = modificacao.descricao;

    checkbox.addEventListener('change', () => {
      const idsAtuais = instaladas.map(item => item.id);
      const propostos = checkbox.checked
        ? [...idsAtuais, modificacao.id]
        : idsAtuais.filter(id => id !== modificacao.id);
      const escolhaRacial = {
        ...(personagem.escolhaRacial || {}),
        modificacoesIds: propostos,
      };
      const validas = obterModificacoesRaciaisInstaladas(
        raca,
        escolhaRacial,
        personagem.nivel,
      );
      if (checkbox.checked && !validas.some(item => item.id === modificacao.id)) {
        checkbox.checked = false;
        ctx.mostrarToast('Essa modificação ainda não cumpre todos os pré-requisitos.', 'erro');
        return;
      }
      escolhaRacial.modificacoesIds = validas.map(item => item.id);
      const { recursosDefinidos: _, ...derivados } = calcularDerivadosComClasses(
        personagem.atributosFinais,
        raca,
        personagem.classes,
        ctx.catalogo.classes,
        personagem.nivel,
        escolhaRacial,
      );
      if (salvar(personagem, ctx, { escolhaRacial, derivados })) ctx.recarregar();
    });

    linha.append(checkbox, texto);
    lista.appendChild(linha);
  });
  bloco.appendChild(lista);
  return bloco;
}

export function blocoFragmentosRaciais(personagem, ctx) {
  const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  if (!Array.isArray(raca?.fragmentos) || raca.fragmentos.length === 0) return null;

  const conhecidos = obterFragmentosRaciaisConhecidos(raca, personagem.escolhaRacial);
  const expressos = obterFragmentosRaciaisExpressos(raca, personagem.escolhaRacial);
  const idsConhecidos = new Set(conhecidos.map(item => item.id));
  const idsExpressos = new Set(expressos.map(item => item.id));
  const config = raca.fragmentos_config || {};
  const maxConhecidos = Math.max(0, Math.trunc(Number(config.conhecidos_maximo) || 0));
  const maxExpressos = Math.max(0, Math.trunc(Number(config.expressos) || 0));

  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--modificacoes-raciais';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Fragmentos Constituintes do Amálgamo';
  const resumo = document.createElement('p');
  resumo.className = 'ficha-classes-resumo';
  resumo.textContent = `${conhecidos.length}/${maxConhecidos} conhecidos · ${expressos.length}/${maxExpressos} expressos`;
  const aviso = document.createElement('p');
  aviso.className = 'ficha-wizard-aviso';
  aviso.textContent = `O Amálgamo começa com ${config.conhecidos_iniciais || 3} Fragmentos conhecidos. Novas assimilações exigem autorização do mestre. Marque até ${maxExpressos} deles como expressos após um descanso.`;
  bloco.append(h, resumo, aviso);

  const salvarFragmentos = escolhaRacial => {
    const conhecidosValidos = obterFragmentosRaciaisConhecidos(raca, escolhaRacial);
    escolhaRacial.fragmentosConhecidosIds = conhecidosValidos.map(item => item.id);
    escolhaRacial.fragmentosExpressosIds = obterFragmentosRaciaisExpressos(
      raca,
      escolhaRacial,
    ).map(item => item.id);
    const { recursosDefinidos: _, ...derivados } = calcularDerivadosComClasses(
      personagem.atributosFinais,
      raca,
      personagem.classes,
      ctx.catalogo.classes,
      personagem.nivel,
      escolhaRacial,
    );
    return salvar(personagem, ctx, {
      escolhaRacial,
      ajustesPericiasRaciais: obterAjustesPericiasRaciais(raca, escolhaRacial),
      derivados,
    });
  };

  const lista = document.createElement('div');
  lista.className = 'ficha-classes-lista';
  raca.fragmentos.forEach(fragmento => {
    const linha = document.createElement('div');
    linha.className = 'ficha-modificacao-racial';

    const conhecidoLabel = document.createElement('label');
    conhecidoLabel.className = 'ficha-fragmento-opcao';
    const conhecido = document.createElement('input');
    conhecido.type = 'checkbox';
    conhecido.checked = idsConhecidos.has(fragmento.id);
    conhecido.disabled = !conhecido.checked && conhecidos.length >= maxConhecidos;
    const conhecidoTexto = document.createElement('span');
    conhecidoTexto.textContent = `${fragmento.titulo} · Conhecido`;
    conhecidoTexto.title = fragmento.descricao;
    conhecidoLabel.append(conhecido, conhecidoTexto);

    const expressoLabel = document.createElement('label');
    expressoLabel.className = 'ficha-fragmento-opcao';
    const expresso = document.createElement('input');
    expresso.type = 'checkbox';
    expresso.checked = idsExpressos.has(fragmento.id);
    expresso.disabled = !conhecido.checked
      || (!expresso.checked && expressos.length >= maxExpressos);
    const expressoTexto = document.createElement('span');
    expressoTexto.textContent = 'Expresso';
    expressoLabel.append(expresso, expressoTexto);

    conhecido.addEventListener('change', () => {
      const novosConhecidos = conhecido.checked
        ? [...conhecidos.map(item => item.id), fragmento.id]
        : conhecidos.map(item => item.id).filter(id => id !== fragmento.id);
      const novosExpressos = conhecido.checked
        ? expressos.map(item => item.id)
        : expressos.map(item => item.id).filter(id => id !== fragmento.id);
      const escolhaRacial = {
        ...(personagem.escolhaRacial || {}),
        fragmentosConhecidosIds: novosConhecidos,
        fragmentosExpressosIds: novosExpressos,
      };
      if (salvarFragmentos(escolhaRacial)) ctx.recarregar();
    });

    expresso.addEventListener('change', () => {
      const novosExpressos = expresso.checked
        ? [...expressos.map(item => item.id), fragmento.id]
        : expressos.map(item => item.id).filter(id => id !== fragmento.id);
      const escolhaRacial = {
        ...(personagem.escolhaRacial || {}),
        fragmentosExpressosIds: novosExpressos,
      };
      if (salvarFragmentos(escolhaRacial)) ctx.recarregar();
    });

    linha.append(conhecidoLabel, expressoLabel);
    lista.appendChild(linha);
  });
  bloco.appendChild(lista);
  return bloco;
}

export function blocoMaldicoesRaciais(personagem, ctx) {
  const raca = ctx.catalogo.racas.find(item => item.id === personagem.racaId) || null;
  if (!Array.isArray(raca?.maldicoes) || raca.maldicoes.length === 0) return null;

  const capacidade = capacidadeMaldicoesRaciais(raca, personagem.escolhaRacial);
  const conhecidas = obterMaldicoesRaciaisConhecidas(raca, personagem.escolhaRacial);
  const idsConhecidas = new Set(conhecidas.map(item => item.id));
  const campo = String(raca.maldicoes_config?.campo || 'maldicoesConhecidasIds');

  const bloco = document.createElement('div');
  bloco.className = 'ficha-detalhe-bloco ficha-detalhe-bloco--modificacoes-raciais';
  const h = document.createElement('h3');
  h.className = 'ficha-secao-titulo';
  h.textContent = 'Maldições Conhecidas da Bruxa';
  const resumo = document.createElement('p');
  resumo.className = 'ficha-classes-resumo';
  resumo.textContent = `${conhecidas.length}/${capacidade} conhecidas`;
  const aviso = document.createElement('p');
  aviso.className = 'ficha-wizard-aviso';
  aviso.textContent = personagem.escolhaRacial?.varianteId === 'grimorio'
    ? 'O Grimório permite conhecer cinco Maldições. Trocar de Instrumento reduz o limite para três.'
    : 'Escolha três Maldições. Apenas uma Maldição Tecida da mesma Bruxa pode afetar uma criatura por vez.';
  bloco.append(h, resumo, aviso);

  const lista = document.createElement('div');
  lista.className = 'ficha-classes-lista';
  raca.maldicoes.forEach(maldicao => {
    const linha = document.createElement('label');
    linha.className = 'ficha-modificacao-racial';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = idsConhecidas.has(maldicao.id);
    checkbox.disabled = !checkbox.checked && conhecidas.length >= capacidade;
    const texto = document.createElement('span');
    texto.textContent = maldicao.titulo;
    texto.title = maldicao.descricao;

    checkbox.addEventListener('change', () => {
      const ids = checkbox.checked
        ? [...conhecidas.map(item => item.id), maldicao.id]
        : conhecidas.map(item => item.id).filter(id => id !== maldicao.id);
      const escolhaRacial = {
        ...(personagem.escolhaRacial || {}),
        [campo]: ids,
      };
      escolhaRacial[campo] = obterMaldicoesRaciaisConhecidas(
        raca,
        escolhaRacial,
      ).map(item => item.id);
      if (salvar(personagem, ctx, { escolhaRacial })) ctx.recarregar();
    });

    linha.append(checkbox, texto);
    lista.appendChild(linha);
  });
  bloco.appendChild(lista);
  return bloco;
}

