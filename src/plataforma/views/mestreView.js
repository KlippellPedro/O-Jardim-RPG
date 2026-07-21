import { campanhasApi } from '../campanhasApi.js';
import { conteudoApi } from '../conteudoApi.js';
import { personagensApi } from '../personagensApi.js';
import {
  ROTULOS_ACESSO,
  ROTULOS_MODULO,
  ROTULOS_PAPEL,
  acao,
  ajuda,
  botao,
  cartao,
  carregando,
  dataCurta,
  dataRelativa,
  elemento,
  normalizar,
  selo,
  seletor,
  subabas,
  subcartao,
  texto,
  vazio,
} from './ui.js';

const SECOES = [
  ['mesa', 'Mesa e jogadores'],
  ['personagens', 'Personagens'],
  ['conteudo', 'Publicar conteúdo'],
  ['liberacoes', 'Quem vê o quê'],
  ['registro', 'Registro'],
];

let secaoAtual = 'mesa';

export function renderMestre(area, ctx, secao = null) {
  if (secao) secaoAtual = secao;
  if (!SECOES.some(([id]) => id === secaoAtual)) secaoAtual = 'mesa';

  const topo = elemento('div', 'plataforma-mestre-topo');
  const titulo = elemento('div');
  titulo.append(
    elemento('h3', '', `Painel do mestre · ${ctx.estado.campanha?.nome || 'campanha'}`),
    elemento('p', '', 'Tudo desta mesa em um lugar: quem participa, o que existe e quem pode ver.'),
  );
  topo.append(titulo, ajuda('Mestre controla a campanha inteira; Assistente ajuda com conteúdo e liberações, mas não remove membros nem arquiva a mesa.'));
  area.append(topo);
  area.append(subabas(SECOES, secaoAtual, id => ctx.renderPainel('mestre', id)));

  const corpo = elemento('div', 'plataforma-area');
  area.append(corpo);

  if (secaoAtual === 'mesa') return renderMesa(corpo, ctx);
  if (secaoAtual === 'personagens') return renderPersonagens(corpo, ctx);
  if (secaoAtual === 'conteudo') return renderConteudo(corpo, ctx);
  if (secaoAtual === 'liberacoes') return renderLiberacoes(corpo, ctx);
  return renderRegistro(corpo, ctx);
}

/* ── Mesa: membros, convites e Discord ───────────────────────────────────── */

async function renderMesa(area, ctx) {
  const { estado } = ctx;
  const souMestre = estado.detalhes?.meu_papel === 'mestre';
  const membros = estado.detalhes?.membros || [];

  const card = cartao('Jogadores da mesa', 'Papel define o que cada conta pode fazer nesta campanha.', { larga: true });
  const lista = elemento('div', 'plataforma-membros');
  if (!membros.length) {
    lista.append(vazio('Ninguém entrou ainda. Gere um convite abaixo.'));
  }
  membros.forEach(membro => {
    const linha = elemento('div', 'plataforma-membro-item');
    const identidade = elemento('div');
    const nome = elemento('strong', '', membro.nome_exibicao);
    if (membro.id === estado.campanha.dono_id) nome.append(' ', selo('Dono', 'ouro'));
    identidade.append(nome, elemento('span', '', membro.email));
    const personagensDoMembro = estado.personagens.filter(item => item.dono_usuario_id === membro.id);
    identidade.append(elemento('small', '', personagensDoMembro.length
      ? `${personagensDoMembro.length} personagem(ns) · desde ${dataCurta(membro.entrou_em)}`
      : `Sem personagem · desde ${dataCurta(membro.entrou_em)}`));

    // O dono precisa continuar mestre (o servidor recusa o contrário), então o
    // seletor dele fica travado em vez de oferecer uma escolha que dá erro.
    const ehDono = membro.id === estado.campanha.dono_id;
    const papel = seletor('', Object.entries(ROTULOS_PAPEL), membro.papel);
    papel.select.disabled = !souMestre || ehDono;

    const acoes = elemento('div', 'plataforma-usuario-acoes');
    if (souMestre && !ehDono) {
      acoes.append(acao('Salvar papel', 'plataforma-botao--secundario', async () => {
        try {
          await campanhasApi.alterarPapel(estado.campanha.id, membro.id, papel.select.value);
          await ctx.recarregar(estado.campanha.id);
          ctx.informar(`${membro.nome_exibicao} agora é ${ROTULOS_PAPEL[papel.select.value]}.`, 'sucesso');
          ctx.renderPainel('mestre', 'mesa');
        } catch (erro) {
          ctx.informar(texto(erro), 'erro');
        }
      }));

      const podeTransferir = (estado.campanha.dono_id === estado.usuario.id || estado.usuario.papel_plataforma === 'criador')
        && membro.id !== estado.campanha.dono_id
        && ['mestre', 'criador'].includes(membro.papel_plataforma);
      if (podeTransferir) {
        acoes.append(acao('Tornar dono', 'plataforma-botao--secundario', async () => {
          try {
            await campanhasApi.transferirPropriedade(estado.campanha.id, membro.id);
            await ctx.recarregar(estado.campanha.id);
            ctx.informar('Propriedade da campanha transferida.', 'sucesso');
            ctx.renderPainel('mestre', 'mesa');
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, { confirmar: `Transferir “${estado.campanha.nome}” para ${membro.nome_exibicao}?` }));
      }
      if (membro.id !== estado.campanha.dono_id && membro.id !== estado.usuario.id) {
        acoes.append(acao('Remover', 'plataforma-botao--perigo', async () => {
          try {
            await campanhasApi.removerMembro(estado.campanha.id, membro.id);
            await ctx.recarregar(estado.campanha.id);
            ctx.informar('Membro removido. As fichas dele continuam salvas.', 'sucesso');
            ctx.renderPainel('mestre', 'mesa');
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, { confirmar: `Remover ${membro.nome_exibicao} da campanha? As fichas continuam salvas.` }));
      }
    }
    linha.append(identidade, papel, acoes);
    lista.append(linha);
  });
  card.append(lista);
  area.append(card);

  const conviteCard = cartao('Convites', 'Cada código entra na campanha já com o papel escolhido.');
  const form = elemento('div', 'plataforma-controles');
  const papelConvite = seletor('Papel de entrada', [
    ['jogador', 'Jogador'],
    ['observador', 'Observador'],
    ['assistente', 'Assistente'],
  ], 'jogador');
  const usos = seletor('Quantos usos', [['1', '1 pessoa'], ['5', 'até 5'], ['20', 'até 20']], '1');
  const validade = seletor('Validade', [['7', '7 dias'], ['1', '1 dia'], ['30', '30 dias']], '7');
  form.append(papelConvite, usos, validade);

  const resultado = elemento('div', 'plataforma-codigo');
  const listaConvites = elemento('div', 'plataforma-lista-liberacoes');
  conviteCard.append(form, resultado, listaConvites);
  area.append(conviteCard);

  async function carregarConvites() {
    listaConvites.replaceChildren(carregando('Buscando convites…'));
    try {
      const resposta = await campanhasApi.listarConvites(estado.campanha.id);
      const convites = resposta.convites || [];
      listaConvites.replaceChildren();
      if (!convites.length) {
        listaConvites.append(vazio('Nenhum convite ativo.'));
        return;
      }
      convites.forEach(convite => {
        const item = elemento('div', 'plataforma-liberacao-item');
        item.append(elemento('span', '', `${ROTULOS_PAPEL[convite.papel] || convite.papel} · ${convite.usos}/${convite.max_usos} usos · expira ${dataCurta(convite.expira_em)}`));
        item.append(acao('Revogar', 'plataforma-botao--perigo plataforma-botao--mini', async () => {
          try {
            await campanhasApi.revogarConvite(estado.campanha.id, convite.id);
            ctx.informar('Convite revogado.', 'sucesso');
            await carregarConvites();
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }));
        listaConvites.append(item);
      });
    } catch (erro) {
      listaConvites.replaceChildren(vazio(texto(erro)));
    }
  }

  form.append(acao('Gerar convite', '', async () => {
    try {
      const resposta = await campanhasApi.criarConvite(estado.campanha.id, {
        papel: papelConvite.select.value,
        max_usos: Number(usos.select.value),
        expira_em_dias: Number(validade.select.value),
      });
      resultado.replaceChildren(
        elemento('strong', '', resposta.codigo),
        elemento('span', '', 'Envie este código ao jogador. Ele entra em Campanhas › Usar código de convite.'),
      );
      await carregarConvites();
    } catch (erro) {
      ctx.informar(texto(erro), 'erro');
    }
  }));

  const discord = subcartao('Servidor Discord');
  discord.append(elemento('p', '', estado.detalhes?.discord
    ? `Conectado ao servidor ${estado.detalhes.discord.discord_guild_id}.`
    : `Ainda não conectado. Use /campanha_vincular ${estado.campanha.id} no Banqueiro depois de vincular sua conta.`));
  conviteCard.append(discord);

  await carregarConvites();
}

/* ── Personagens dos jogadores ───────────────────────────────────────────── */

// O servidor resolve raça e classe para nome legível (core/character_summary)
// e não manda a ficha inteira — aqui só sobra a apresentação.
function resumoFicha(resumo = {}) {
  const partes = [];
  if (resumo.raca) partes.push(resumo.raca);
  if (resumo.classes?.length) partes.push(resumo.classes.join(' / '));
  if (resumo.nivel) partes.push(`Nível ${resumo.nivel}`);
  return partes.join(' · ');
}

function vitalidade(resumo = {}) {
  if (resumo.vida_maxima === undefined) return null;
  return {
    rotulo: `${resumo.vida_atual}/${resumo.vida_maxima} de vida`,
    // Vermelho abaixo de um terço: o mestre bate o olho e vê quem está mal.
    tom: resumo.vida_atual <= resumo.vida_maxima / 3 ? 'vermelho' : 'vida',
  };
}

async function renderPersonagens(area, ctx) {
  const { estado } = ctx;
  const card = cartao(
    'Personagens da campanha',
    'Todas as fichas dos seus jogadores, do jeito que estão salvas agora.',
    { larga: true },
  );
  const filtros = elemento('div', 'plataforma-controles');
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.placeholder = 'Buscar por personagem ou jogador…';
  busca.setAttribute('aria-label', 'Buscar personagem');
  const porDono = seletor('', [
    ['todos', 'Todos os jogadores'],
    ...(estado.detalhes?.membros || []).map(membro => [membro.id, membro.nome_exibicao]),
  ], 'todos');
  filtros.append(busca, porDono);
  const lista = elemento('div', 'plataforma-personagens-lista');
  card.append(filtros, lista);
  area.append(card);

  function desenhar() {
    const termo = normalizar(busca.value.trim());
    const dono = porDono.select.value;
    const itens = estado.personagens.filter(personagem => {
      const casaBusca = !termo
        || normalizar(personagem.nome).includes(termo)
        || normalizar(personagem.dono_nome).includes(termo);
      const casaDono = dono === 'todos' || personagem.dono_usuario_id === dono;
      return casaBusca && casaDono;
    });

    lista.replaceChildren();
    if (!itens.length) {
      lista.append(vazio('Nenhum personagem encontrado nesta campanha.'));
      return;
    }
    itens.forEach(personagem => {
      const bloco = elemento('article', 'plataforma-personagem-item');
      const identidade = elemento('div');
      identidade.append(elemento('strong', '', personagem.nome));
      identidade.append(elemento('span', '', `Jogador: ${personagem.dono_nome || 'sem dono'}`));
      const detalhe = resumoFicha(personagem.resumo);
      if (detalhe) identidade.append(elemento('small', '', detalhe));

      const estatisticas = elemento('div', 'plataforma-personagem-stats');
      const pv = vitalidade(personagem.resumo);
      if (pv) estatisticas.append(selo(pv.rotulo, pv.tom));
      estatisticas.append(selo(`v${personagem.versao}`, 'neutro'));
      estatisticas.append(elemento('small', '', `Salvo ${dataRelativa(personagem.atualizado_em)}`));

      const acoes = elemento('div', 'plataforma-usuario-acoes');
      acoes.append(botao('Abrir ficha', 'plataforma-botao--secundario', () => {
        window.location.href = `/ficha#/personagem/${personagem.id}`;
      }));
      if (estado.detalhes?.meu_papel === 'mestre') {
        acoes.append(acao('Arquivar', 'plataforma-botao--perigo plataforma-botao--mini', async () => {
          try {
            await personagensApi.arquivar(personagem.id);
            await ctx.recarregar(estado.campanha.id);
            ctx.informar('Personagem arquivado. Nada foi apagado.', 'sucesso');
            ctx.renderPainel('mestre', 'personagens');
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, { confirmar: `Arquivar “${personagem.nome}”? A ficha sai da lista, mas continua salva.` }));
      }

      bloco.append(identidade, estatisticas, acoes);
      lista.append(bloco);
    });
  }

  busca.addEventListener('input', desenhar);
  porDono.select.addEventListener('change', desenhar);
  desenhar();
}

/* ── Publicar conteúdo ───────────────────────────────────────────────────── */

async function renderConteudo(area, ctx) {
  const { estado } = ctx;
  const card = cartao(
    'Biblioteca da campanha',
    'Escolha o que existe nesta mesa. Nada aparece para os jogadores antes de ser publicado.',
    { larga: true },
  );
  const controles = elemento('div', 'plataforma-controles');
  const modulo = seletor('Módulo', [
    ['mundo', 'Mundo'],
    ['loja', 'Itens'],
    ['regras', 'Área do mestre'],
  ], 'mundo');
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.placeholder = 'Buscar na biblioteca…';
  busca.setAttribute('aria-label', 'Buscar conteúdo');
  const filtroStatus = seletor('Situação', [
    ['todos', 'Tudo'],
    ['publicado', 'Já publicado'],
    ['oculto', 'Fora da campanha'],
  ], 'todos');
  controles.append(modulo, busca, filtroStatus);

  const barra = elemento('div', 'plataforma-barra-selecao');
  const contador = elemento('span', 'plataforma-contador', 'Nada selecionado');
  const acessoPadrao = seletor('Ao publicar', [
    ['completo', 'Todos da mesa já veem'],
    ['oculto', 'Guardado; libero depois'],
  ], 'completo');
  barra.append(contador, acessoPadrao);

  const lista = elemento('div', 'plataforma-biblioteca');
  card.append(controles, barra, lista);
  area.append(card);

  let biblioteca = [];

  const selecionadas = () => [...lista.querySelectorAll('input[type="checkbox"]:checked')].map(item => item.value);

  function atualizarContador() {
    const total = selecionadas().length;
    contador.textContent = total ? `${total} selecionado(s)` : 'Nada selecionado';
    barra.dataset.ativo = String(total > 0);
  }

  async function carregar() {
    lista.replaceChildren(carregando('Carregando biblioteca…'));
    try {
      const resposta = await conteudoApi.biblioteca(estado.campanha.id, modulo.select.value);
      biblioteca = resposta.entradas || [];
      desenhar();
    } catch (erro) {
      lista.replaceChildren(vazio(texto(erro)));
    }
  }

  function desenhar() {
    const termo = normalizar(busca.value.trim());
    const status = filtroStatus.select.value;
    const visiveis = biblioteca.filter(item => {
      const casaBusca = !termo || normalizar(item.titulo).includes(termo);
      const publicado = Boolean(item.publicacao);
      const casaStatus = status === 'todos'
        || (status === 'publicado' && publicado)
        || (status === 'oculto' && !publicado);
      return casaBusca && casaStatus;
    });

    lista.replaceChildren();
    if (!visiveis.length) {
      lista.append(vazio('Nada encontrado com esses filtros.'));
      atualizarContador();
      return;
    }

    // Agrupar por tipo dá contexto: "12 deidades, 40 armas" em vez de uma
    // lista corrida de centenas de títulos sem hierarquia.
    const grupos = new Map();
    visiveis.forEach(item => {
      if (!grupos.has(item.tipo)) grupos.set(item.tipo, []);
      grupos.get(item.tipo).push(item);
    });

    [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).forEach(([tipo, itens]) => {
      const grupo = elemento('section', 'plataforma-grupo');
      const cabecalho = elemento('header', 'plataforma-grupo-topo');
      const publicados = itens.filter(item => item.publicacao).length;
      cabecalho.append(elemento('h4', '', tipo));
      cabecalho.append(elemento('small', '', `${publicados} de ${itens.length} na campanha`));
      const marcarTodos = botao('Selecionar grupo', 'plataforma-botao--secundario plataforma-botao--mini', () => {
        const caixas = [...grupo.querySelectorAll('input[type="checkbox"]')];
        const marcar = caixas.some(caixa => !caixa.checked);
        caixas.forEach(caixa => { caixa.checked = marcar; });
        atualizarContador();
      });
      cabecalho.append(marcarTodos);
      grupo.append(cabecalho);

      itens.forEach(item => {
        const label = elemento('label', 'plataforma-biblioteca-item');
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.value = item.chave;
        check.addEventListener('change', atualizarContador);
        label.append(check, elemento('span', '', item.titulo));
        label.append(item.publicacao
          ? selo(ROTULOS_ACESSO[item.publicacao.acesso_padrao] || item.publicacao.acesso_padrao,
            item.publicacao.acesso_padrao === 'oculto' ? 'neutro' : 'verde')
          : selo('Fora da campanha', 'apagado'));
        grupo.append(label);
      });
      lista.append(grupo);
    });
    atualizarContador();
  }

  barra.append(acao('Publicar selecionados', '', async () => {
    const chaves = selecionadas();
    if (!chaves.length) { ctx.informar('Selecione ao menos um conteúdo.', 'erro'); return; }
    try {
      await conteudoApi.publicar(estado.campanha.id, modulo.select.value, chaves, acessoPadrao.select.value);
      ctx.informar(acessoPadrao.select.value === 'completo'
        ? `${chaves.length} conteúdo(s) publicados e já visíveis para a mesa.`
        : `${chaves.length} conteúdo(s) guardados. Libere em “Quem vê o quê”.`, 'sucesso');
      await carregar();
    } catch (erro) {
      ctx.informar(texto(erro), 'erro');
    }
  }));

  barra.append(acao('Tirar da campanha', 'plataforma-botao--perigo', async () => {
    const chaves = new Set(selecionadas());
    const publicacoes = biblioteca
      .filter(item => chaves.has(item.chave) && item.publicacao?.id)
      .map(item => item.publicacao.id);
    if (!publicacoes.length) { ctx.informar('Selecione conteúdo já publicado.', 'erro'); return; }
    try {
      await Promise.all(publicacoes.map(id => conteudoApi.ocultar(id)));
      ctx.informar('Conteúdo removido da campanha e acessos revogados.', 'sucesso');
      await carregar();
    } catch (erro) {
      ctx.informar(texto(erro), 'erro');
    }
  }, { confirmar: 'Remover o conteúdo selecionado da campanha? As liberações dele também somem.' }));

  modulo.select.addEventListener('change', () => {
    if (modulo.select.value === 'regras') acessoPadrao.select.value = 'oculto';
    carregar();
  });
  busca.addEventListener('input', desenhar);
  filtroStatus.select.addEventListener('change', desenhar);
  await carregar();
}

/* ── Quem vê o quê ───────────────────────────────────────────────────────── */

async function renderLiberacoes(area, ctx) {
  const { estado } = ctx;
  const card = cartao(
    'Quem vê o quê',
    'Cada informação publicada e exatamente quem tem acesso a ela.',
    { larga: true },
  );
  const controles = elemento('div', 'plataforma-controles');
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.placeholder = 'Buscar informação…';
  busca.setAttribute('aria-label', 'Buscar informação publicada');
  const filtroVisibilidade = seletor('Mostrar', [
    ['todos', 'Todas'],
    ['aberto', 'Abertas para a mesa'],
    ['restrito', 'Restritas'],
  ], 'todos');
  controles.append(busca, filtroVisibilidade);

  const alvoLinha = elemento('div', 'plataforma-controles');
  const alvo = seletor('Liberar para', montarAlvos(estado), 'papel:jogador');
  const nivel = seletor('Nível', [
    ['completo', 'Completo'],
    ['parcial', 'Parcial'],
    ['rumor', 'Só um rumor'],
  ], 'completo');
  alvoLinha.append(alvo, nivel);

  const lista = elemento('div', 'plataforma-liberacoes-lista');
  card.append(controles, alvoLinha, lista);
  area.append(card);

  let informacoes = [];
  let liberacoes = [];

  const selecionadas = () => [...lista.querySelectorAll('input[type="checkbox"]:checked')].map(item => item.value);

  alvoLinha.append(acao('Liberar selecionadas', '', async () => {
    const ids = selecionadas();
    if (!ids.length) { ctx.informar('Marque ao menos uma informação.', 'erro'); return; }
    const [tipo, id] = alvo.select.value.split(':');
    try {
      await Promise.all(ids.map(informacaoId => conteudoApi.liberar(informacaoId, tipo, id, nivel.select.value)));
      ctx.informar(`${ids.length} informação(ões) liberadas. O jogador recebe um aviso.`, 'sucesso');
      await carregar();
    } catch (erro) {
      ctx.informar(texto(erro), 'erro');
    }
  }));

  function nomeDoAlvo(tipo, id) {
    if (tipo === 'papel') return `Todos os ${ROTULOS_PAPEL[id]?.toLowerCase() || id}es`;
    if (tipo === 'usuario') {
      const membro = (estado.detalhes?.membros || []).find(item => item.id === id);
      return membro ? membro.nome_exibicao : 'Jogador removido';
    }
    const personagem = estado.personagens.find(item => item.id === id);
    return personagem ? personagem.nome : 'Personagem arquivado';
  }

  async function carregar() {
    lista.replaceChildren(carregando('Carregando liberações…'));
    try {
      const resposta = await conteudoApi.administrar(estado.campanha.id);
      informacoes = resposta.informacoes || [];
      liberacoes = resposta.liberacoes || [];
      desenhar();
    } catch (erro) {
      lista.replaceChildren(vazio(texto(erro)));
    }
  }

  function desenhar() {
    const termo = normalizar(busca.value.trim());
    const modo = filtroVisibilidade.select.value;
    const porInformacao = new Map();
    liberacoes.forEach(item => {
      if (!porInformacao.has(item.informacao_id)) porInformacao.set(item.informacao_id, []);
      porInformacao.get(item.informacao_id).push(item);
    });

    const visiveis = informacoes.filter(item => {
      const casaBusca = !termo || normalizar(item.titulo).includes(termo);
      const aberto = item.acesso_padrao !== 'oculto';
      const casaModo = modo === 'todos'
        || (modo === 'aberto' && aberto)
        || (modo === 'restrito' && !aberto);
      return casaBusca && casaModo;
    });

    lista.replaceChildren();
    if (!informacoes.length) {
      lista.append(vazio('Publique algum conteúdo em “Publicar conteúdo” primeiro.'));
      return;
    }
    if (!visiveis.length) {
      lista.append(vazio('Nenhuma informação com esses filtros.'));
      return;
    }

    visiveis.forEach(informacao => {
      const bloco = elemento('article', 'plataforma-liberacao-card');
      const topo = elemento('div', 'plataforma-liberacao-topo');
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.value = informacao.id;
      check.setAttribute('aria-label', `Selecionar ${informacao.titulo}`);
      const identidade = elemento('div');
      identidade.append(elemento('strong', '', informacao.titulo));
      identidade.append(elemento('small', '', ROTULOS_MODULO[informacao.tipo] || informacao.tipo));

      const padrao = seletor('', [
        ['oculto', 'Só quem eu liberar'],
        ['rumor', 'Mesa vê o rumor'],
        ['parcial', 'Mesa vê o parcial'],
        ['completo', 'Mesa vê tudo'],
      ], informacao.acesso_padrao);
      padrao.select.addEventListener('change', async () => {
        padrao.select.disabled = true;
        try {
          await conteudoApi.alterarAcesso(informacao.id, padrao.select.value);
          ctx.informar(`“${informacao.titulo}” atualizada.`, 'sucesso');
          await carregar();
        } catch (erro) {
          ctx.informar(texto(erro), 'erro');
          padrao.select.disabled = false;
        }
      });

      topo.append(check, identidade, padrao);
      bloco.append(topo);

      const especificas = porInformacao.get(informacao.id) || [];
      const chips = elemento('div', 'plataforma-chips');
      if (informacao.acesso_padrao !== 'oculto') {
        chips.append(selo(`Mesa inteira · ${ROTULOS_ACESSO[informacao.acesso_padrao]}`, 'verde'));
      }
      especificas.forEach(item => {
        const chip = elemento('span', 'plataforma-chip');
        chip.append(elemento('span', '', `${nomeDoAlvo(item.destinatario_tipo, item.destinatario_id)} · ${ROTULOS_ACESSO[item.acesso]}`));
        chip.append(botao('×', 'plataforma-chip-remover', async () => {
          try {
            await conteudoApi.revogar(informacao.id, item.destinatario_tipo, item.destinatario_id);
            ctx.informar('Acesso revogado.', 'sucesso');
            await carregar();
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }));
        chips.append(chip);
      });
      if (!chips.children.length) chips.append(elemento('small', 'plataforma-chip-vazio', 'Ninguém vê esta informação ainda.'));
      bloco.append(chips);
      lista.append(bloco);
    });
  }

  busca.addEventListener('input', desenhar);
  filtroVisibilidade.select.addEventListener('change', desenhar);
  await carregar();
}

function montarAlvos(estado) {
  return [
    ['papel:jogador', 'Todos os jogadores'],
    ['papel:observador', 'Todos os observadores'],
    ...(estado.detalhes?.membros || [])
      .filter(membro => membro.papel !== 'mestre')
      .map(membro => [`usuario:${membro.id}`, `Jogador · ${membro.nome_exibicao}`]),
    ...estado.personagens.map(personagem => [`personagem:${personagem.id}`, `Personagem · ${personagem.nome}`]),
  ];
}

/* ── Registro da campanha ────────────────────────────────────────────────── */

const ACOES_LEGIVEIS = {
  'campanha.criada': 'criou a campanha',
  'campanha.atualizada': 'editou a campanha',
  'campanha.arquivada': 'arquivou a campanha',
  'campanha.convite_criado': 'gerou um convite',
  'campanha.convite_revogado': 'revogou um convite',
  'campanha.membro_entrou': 'entrou na campanha',
  'campanha.membro_removido': 'removeu um membro',
  'campanha.papel_alterado': 'mudou o papel de um membro',
  'campanha.propriedade_transferida': 'transferiu a campanha',
  'campanha.personagem_ativo_alterado': 'trocou o personagem ativo',
  'conteudo.publicado': 'publicou conteúdo',
  'conteudo.ocultado': 'tirou conteúdo da campanha',
  'conteudo.acesso_alterado': 'mudou o acesso de uma informação',
  'conhecimento.liberado': 'liberou uma informação',
  'conhecimento.liberacao_revogada': 'revogou uma liberação',
  'personagem.criado': 'criou um personagem',
  'personagem.atualizado': 'salvou uma ficha',
  'personagem.arquivado': 'arquivou um personagem',
  'personagem.economia_sincronizada': 'sincronizou inventário/carteira',
  'cofre.item_transferido': 'entregou um item do cofre',
  'cofre.moeda_transferida': 'entregou moedas do cofre',
};

async function renderRegistro(area, ctx) {
  const card = cartao(
    'Registro da campanha',
    'Tudo que aconteceu nesta mesa, do mais recente ao mais antigo.',
    { larga: true },
  );
  const lista = elemento('div', 'plataforma-registro');
  card.append(lista);
  area.append(card);

  lista.replaceChildren(carregando('Carregando o registro…'));
  try {
    const resposta = await campanhasApi.auditoria(ctx.estado.campanha.id, 120);
    const eventos = resposta.eventos || [];
    lista.replaceChildren();
    if (!eventos.length) {
      lista.append(vazio('Nada registrado ainda nesta campanha.'));
      return;
    }
    eventos.forEach(evento => {
      const linha = elemento('div', 'plataforma-registro-item');
      const ator = evento.ator_nome || evento.ator_servico || 'Sistema';
      linha.append(elemento('strong', '', ator));
      linha.append(elemento('span', '', ACOES_LEGIVEIS[evento.acao] || evento.acao));
      linha.append(elemento('small', '', dataRelativa(evento.criado_em)));
      lista.append(linha);
    });
  } catch (erro) {
    lista.replaceChildren(vazio(texto(erro)));
  }
}
