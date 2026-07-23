import { router } from '../../../../../core/router.js';
import { abrirModalSimples, fecharModalSimples } from '../../modalSimples.js';

function listarNotificacoes(personagem) {
  const itens = [];
  if (personagem.niveisClassePendentes > 0) itens.push({
    id: 'classes',
    titulo: 'Níveis de classe pendentes',
    texto: `${personagem.niveisClassePendentes} nível(is) ainda precisam ser distribuídos entre suas classes.`,
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

export function criarCentralNotificacoes(personagem) {
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

export function atualizarCentralNotificacoesNoDom(personagem) {
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

