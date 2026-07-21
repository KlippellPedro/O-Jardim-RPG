import { avisosApi } from '../avisosApi.js';
import { acao, botao, cartao, carregando, dataRelativa, elemento, texto, vazio } from './ui.js';

const ICONES = {
  conta: '👤',
  campanha: '⚔',
  conteudo: '✦',
  economia: '❖',
};

export async function renderAvisos(area, ctx) {
  const card = cartao(
    'Avisos',
    'Tudo que o mestre ou a administração mudaram e que afeta você aparece aqui.',
    { larga: true },
  );
  const acoes = elemento('div', 'plataforma-controles plataforma-controles--compactos');
  const lista = elemento('div', 'plataforma-avisos-lista');
  card.append(acoes, lista);
  area.append(card);

  async function carregar() {
    lista.replaceChildren(carregando('Buscando avisos…'));
    acoes.replaceChildren();
    try {
      const resposta = await avisosApi.listar({ limite: 60 });
      const avisos = resposta.avisos || [];
      ctx.definirNaoLidos(resposta.nao_lidos || 0);

      if (resposta.nao_lidos) {
        acoes.append(acao('Marcar tudo como lido', 'plataforma-botao--secundario', async () => {
          try {
            const atualizado = await avisosApi.marcarLidos([]);
            ctx.definirNaoLidos(atualizado.nao_lidos || 0);
            await carregar();
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }));
      }
      if (avisos.some(item => item.lida_em)) {
        acoes.append(acao('Limpar os lidos', 'plataforma-botao--secundario', async () => {
          try {
            await avisosApi.limparLidos();
            await carregar();
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, { confirmar: 'Apagar os avisos já lidos?' }));
      }

      if (!avisos.length) {
        lista.replaceChildren(vazio('Nenhum aviso por enquanto. Mudanças no painel aparecem aqui.'));
        return;
      }

      lista.replaceChildren();
      avisos.forEach(item => {
        const bloco = elemento('article', 'plataforma-aviso-item');
        bloco.dataset.lido = String(Boolean(item.lida_em));
        bloco.append(elemento('span', 'plataforma-aviso-icone', ICONES[item.categoria] || '•'));

        const corpo = elemento('div', 'plataforma-aviso-corpo');
        corpo.append(elemento('strong', '', item.titulo));
        if (item.mensagem) corpo.append(elemento('p', '', item.mensagem));
        const rodape = [
          item.campanha_nome,
          item.origem_nome ? `por ${item.origem_nome}` : null,
          dataRelativa(item.criado_em),
        ].filter(Boolean).join(' · ');
        corpo.append(elemento('small', '', rodape));
        bloco.append(corpo);

        if (!item.lida_em) {
          bloco.append(botao('Marcar lido', 'plataforma-botao--secundario plataforma-botao--mini', async () => {
            try {
              const atualizado = await avisosApi.marcarLidos([item.id]);
              ctx.definirNaoLidos(atualizado.nao_lidos || 0);
              bloco.dataset.lido = 'true';
              await carregar();
            } catch (erro) {
              ctx.informar(texto(erro), 'erro');
            }
          }));
        }
        lista.append(bloco);
      });
    } catch (erro) {
      lista.replaceChildren(vazio(texto(erro)));
    }
  }

  await carregar();
}
