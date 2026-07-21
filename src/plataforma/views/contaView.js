import { authApi } from '../authApi.js';
import { campanhasApi } from '../campanhasApi.js';
import { discordApi } from '../discordApi.js';
import { blocoTrocarSenha } from './senhaView.js';
import {
  ROTULOS_CARGO,
  acao,
  ajuda,
  botao,
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

export async function renderCofre(area, ctx) {
  const { estado } = ctx;
  const card = cartao('Cofre da conta', 'Recompensas do Discord ficam aqui até você escolher o personagem.');
  area.append(card);

  const { cofreApi } = await import('../cofreApi.js');
  try {
    const resposta = await cofreApi.obter(estado.campanha.id);
    const proprios = estado.personagens.filter(item => item.dono_usuario_id === estado.usuario.id);
    if (!resposta.itens.length && !resposta.moedas.length) {
      card.append(elemento('p', 'plataforma-vazio', 'Seu cofre está vazio nesta campanha.'));
      return;
    }
    if (!proprios.length) {
      card.append(elemento('p', 'plataforma-aviso', 'Crie um personagem na Ficha antes de transferir recompensas.'));
    }

    const linha = (titulo, quantidade, transferir) => {
      const bloco = elemento('div', 'plataforma-cofre-linha');
      const info = elemento('div');
      info.append(elemento('strong', '', titulo), elemento('span', '', `Disponível: ${quantidade}`));
      const alvo = document.createElement('select');
      proprios.forEach(personagem => {
        const option = document.createElement('option');
        option.value = personagem.id;
        option.textContent = personagem.nome;
        alvo.append(option);
      });
      const numero = document.createElement('input');
      numero.type = 'number';
      numero.min = '1';
      numero.max = String(quantidade);
      numero.value = '1';
      const entregar = acao('Entregar', '', async () => {
        const valor = Math.max(1, Math.min(quantidade, Math.trunc(Number(numero.value) || 1)));
        try {
          await transferir(alvo.value, valor);
          await ctx.recarregar(estado.campanha.id);
          ctx.informar('Recompensa entregue ao personagem.', 'sucesso');
          ctx.renderPainel('cofre');
        } catch (erro) {
          ctx.informar(texto(erro), 'erro');
        }
      });
      entregar.disabled = !proprios.length;
      bloco.append(info, alvo, numero, entregar);
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
