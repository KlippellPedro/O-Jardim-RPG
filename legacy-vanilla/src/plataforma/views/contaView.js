import { authApi } from '../authApi.js';
import { campanhasApi } from '../campanhasApi.js';
import { discordApi } from '../discordApi.js';
import { blocoTrocarSenha } from './senhaView.js?v=2';
import {
  ROTULOS_CARGO,
  acao,
  ajuda,
  botao,
  campo,
  cartao,
  elemento,
  seletor,
  subcartao,
  texto,
} from './ui.js';

export async function renderConta(area, ctx) {
  const { estado } = ctx;
  const card = cartao(estado.usuario.nome_exibicao, estado.usuario.email);

  const cargo = elemento('div', 'plataforma-cargo');
  const papel = estado.usuario.papel_plataforma || 'player';
  cargo.append(
    'Cargo da conta: ',
    elemento('span', '', ROTULOS_CARGO[papel] || papel),
    ajuda('Player participa de campanhas; Mestre pode criar mesas; Admin gerencia contas; Criador possui os acessos de administração e mestragem.'),
  );
  card.append(cargo);

  const proprios = estado.personagens.filter(item => item.dono_usuario_id === estado.usuario.id);
  if (proprios.length && estado.campanha) {
    const bloco = subcartao('Personagem ativo', 'Usado pela Loja e pelas ações que pedem um personagem padrão.');
    const escolha = seletor(
      '',
      proprios.map(item => [item.id, item.nome]),
      estado.campanha.personagem_ativo_id,
    );
    bloco.append(escolha, acao('Usar este personagem', '', async () => {
      try {
        await campanhasApi.selecionarPersonagem(estado.campanha.id, escolha.select.value);
        await ctx.recarregar(estado.campanha.id);
        ctx.informar('Personagem ativo atualizado.', 'sucesso');
        ctx.renderPainel('conta');
      } catch (erro) {
        ctx.informar(texto(erro), 'erro');
      }
    }));
    card.append(bloco);
  }

  const discord = subcartao('Discord e recompensas', 'Consultando vínculo…');
  card.append(discord);
  area.append(card);
  area.append(blocoTrocarSenha(ctx));

  try {
    const resposta = await discordApi.obter();
    discord.replaceChildren(elemento('h4', '', 'Discord e recompensas'));
    if (resposta.vinculo) {
      const nome = resposta.vinculo.discord_nome || resposta.vinculo.discord_user_id;
      discord.append(
        elemento('p', '', `Vinculado a ${nome}. O loot do bot entra no cofre desta conta.`),
        acao('Desvincular Discord', 'plataforma-botao--perigo', async () => {
          try {
            await discordApi.desvincular();
            ctx.renderPainel('conta');
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, { confirmar: 'Desvincular o Discord desta conta?' }),
      );
      return;
    }
    const instrucao = elemento('p', '', 'Ainda não vinculado. Gere um código e envie ao comando /vincular do Banqueiro.');
    discord.append(instrucao, acao('Gerar código de vínculo', '', async () => {
      try {
        const codigo = await discordApi.criarCodigo();
        instrucao.textContent = `Use /vincular ${codigo.codigo} no Discord. O código expira em 10 minutos.`;
        ctx.informar('Código criado. Não compartilhe fora do seu Discord.', 'sucesso');
      } catch (erro) {
        ctx.informar(texto(erro), 'erro');
      }
    }));
  } catch (erro) {
    discord.replaceChildren(
      elemento('h4', '', 'Discord e recompensas'),
      elemento('p', '', texto(erro)),
    );
  } finally {
    card.append(botao('Sair da conta', 'plataforma-botao--secundario', () => ctx.sair()));
  }
}

function formatarMovimento(mov) {
  const d = mov.detalhes || {};
  const quando = new Date(mov.criado_em).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  if (mov.origem === 'site') {
    if (d.compra) {
      return { entrada: false, quando, texto: `Comprou ${d.titulo || 'item'} por ${d.preco} ${d.moeda}` };
    }
    // Saída: entrega do cofre para um personagem.
    let linha = 'Movimentação';
    if (d.item_id) linha = `Entregou ${d.quantidade}× item a um personagem`;
    else if (d.moeda) linha = `Entregou ${d.quantidade} ${d.moeda} a um personagem`;
    return { entrada: false, quando, texto: linha };
  }
  // Entrada: caiu no cofre vindo de um bot do Discord.
  const partes = [];
  (d.itens || []).forEach(i => partes.push(`${i.quantidade || 1}× ${i.titulo || i.item_id}`));
  (d.moedas || []).forEach(m => partes.push(`${m.quantidade} ${m.moeda}`));
  const resumo = partes.length ? partes.join(', ') : (d.motivo || 'recompensa');
  return { entrada: true, quando, texto: `Recebeu de ${mov.origem}: ${resumo}` };
}

async function preencherExtrato(card, cofreApi, campanhaId) {
  try {
    const { movimentos } = await cofreApi.movimentos(campanhaId);
    if (!movimentos.length) {
      card.append(elemento('p', 'plataforma-vazio', 'Nenhuma movimentação registrada ainda.'));
      return;
    }
    const lista = elemento('ul', 'plataforma-extrato');
    movimentos.forEach(mov => {
      const { entrada, quando, texto: linha } = formatarMovimento(mov);
      const item = elemento('li', 'plataforma-extrato-item');
      item.dataset.entrada = String(entrada);
      item.append(
        elemento('span', 'plataforma-extrato-seta', entrada ? '↓' : '↑'),
        elemento('span', 'plataforma-extrato-texto', linha),
        elemento('time', 'plataforma-extrato-quando', quando),
      );
      lista.append(item);
    });
    card.append(lista);
  } catch (erro) {
    card.append(elemento('p', 'plataforma-vazio', texto(erro)));
  }
}

export async function renderCofre(area, ctx) {
  const { estado } = ctx;
  const card = cartao(
    'Cofre da conta',
    'Recompensas do Discord ficam aqui até você escolher o personagem.',
    { larga: true },
  );
  area.append(card);

  const { cofreApi } = await import('../cofreApi.js');

  // Extrato (histórico): entradas do Discord e entregas aos personagens. Fica
  // logo abaixo do cofre e continua visível mesmo quando o cofre está vazio.
  const extratoCard = cartao('Extrato do cofre', 'Entradas do Discord e entregas aos seus personagens.', { larga: true });
  area.append(extratoCard);
  preencherExtrato(extratoCard, cofreApi, estado.campanha.id);

  try {
    const resposta = await cofreApi.obter(estado.campanha.id);
    const proprios = estado.personagens.filter(item => item.dono_usuario_id === estado.usuario.id);
    if (!resposta.itens.length && !resposta.moedas.length) {
      card.append(elemento('p', 'plataforma-vazio', 'Seu cofre está vazio nesta campanha.'));
      return;
    }
    if (!proprios.length) {
      card.append(elemento('p', 'plataforma-aviso', 'Crie um personagem na Ficha antes de transferir recompensas.'));
      const pendente = (titulo, quantidade) => {
        const bloco = elemento('div', 'plataforma-cofre-linha plataforma-cofre-linha--pendente');
        const info = elemento('div');
        info.append(elemento('strong', '', titulo), elemento('span', '', `Disponível: ${quantidade}`));
        bloco.append(info, elemento('span', 'plataforma-cofre-estado', 'Aguardando personagem'));
        return bloco;
      };
      resposta.itens.forEach(item => card.append(pendente(item.titulo, item.quantidade)));
      resposta.moedas.forEach(moeda => card.append(pendente(moeda.moeda, moeda.saldo)));
      return;
    }

    const linha = (titulo, quantidade, transferir) => {
      const bloco = elemento('div', 'plataforma-cofre-linha');
      const info = elemento('div');
      info.append(elemento('strong', '', titulo), elemento('span', '', `Disponível: ${quantidade}`));
      const alvo = seletor(
        'Entregar para',
        proprios.map(personagem => [personagem.id, personagem.nome]),
      );
      const quantidadeCampo = campo('Quantidade', 'number', 'quantidade', {
        min: 1,
        max: String(quantidade),
        value: 1,
        inputmode: 'numeric',
      });
      const numero = quantidadeCampo.input;
      const entregar = acao('Entregar', '', async () => {
        const valor = Math.max(1, Math.min(quantidade, Math.trunc(Number(numero.value) || 1)));
        try {
          await transferir(alvo.select.value, valor);
          await ctx.recarregar(estado.campanha.id);
          ctx.informar('Recompensa entregue ao personagem.', 'sucesso');
          ctx.renderPainel('cofre');
        } catch (erro) {
          ctx.informar(texto(erro), 'erro');
        }
      });
      bloco.append(info, alvo, quantidadeCampo, entregar);
      return bloco;
    };

    resposta.itens.forEach(item => card.append(linha(
      item.titulo,
      item.quantidade,
      (personagemId, quantidade) => cofreApi.transferirItem(estado.campanha.id, personagemId, item.item_id, quantidade),
    )));
    resposta.moedas.forEach(moeda => card.append(linha(
      moeda.moeda,
      moeda.saldo,
      (personagemId, quantidade) => cofreApi.transferirMoeda(estado.campanha.id, personagemId, moeda.moeda, quantidade),
    )));
  } catch (erro) {
    card.append(elemento('p', 'plataforma-vazio', texto(erro)));
  }
}

export async function encerrarSessao() {
  try {
    await authApi.sair();
  } catch {
    // Sessão já expirada no servidor: o estado local é limpo do mesmo jeito.
  }
}
