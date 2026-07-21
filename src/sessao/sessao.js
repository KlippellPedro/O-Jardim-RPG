/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Sessão ao vivo
   Mestre controla iniciativa, vida e condições; a mesa inteira
   acompanha em tempo real pelo fluxo de eventos do servidor.
   ───────────────────────────────────────────────────────── */

import { inicializarPlataforma } from '../plataforma/portal.js?v=5';
import { sessaoApi } from '../plataforma/sessaoApi.js';
import { criarLog } from './views/logView.js';
import { renderMesa } from './views/mesaView.js';
import { criarRolador } from './views/roladorView.js';

const content = document.getElementById('sessao-content');
const toast = document.getElementById('sessao-toast');
const conexaoEl = document.getElementById('sessao-conexao');
const campanhaEl = document.getElementById('sessao-campanha');

let campanhaId = null;
let estadoAtual = null;
let fonteDeEventos = null;
let toastTimer = null;
let buscando = false;
let log = null;

function avisar(mensagem, tipo = 'info') {
  toast.textContent = mensagem;
  toast.dataset.tipo = tipo;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function marcarConexao(situacao, texto) {
  conexaoEl.dataset.situacao = situacao;
  conexaoEl.querySelector('.sessao-conexao-texto').textContent = texto;
}

function desenhar() {
  if (!estadoAtual) return;
  // O log é montado uma vez e reaproveitado: recriá-lo a cada evento perderia
  // a rolagem da tela e o filtro escolhido.
  if (!log) log = criarLog(campanhaId, { comando: estadoAtual.comando });
  renderMesa(content, estadoAtual, {
    comando: estadoAtual.comando,
    abrir: async (titulo, incluirPersonagens) => executar(
      () => sessaoApi.abrir(campanhaId, titulo, incluirPersonagens),
      'Mesa aberta. Os jogadores já estão vendo.',
    ),
    encerrar: () => executar(
      () => sessaoApi.encerrar(estadoAtual.sessao.id),
      'Sessão encerrada.',
    ),
    adicionar: participante => executar(
      () => sessaoApi.adicionar(estadoAtual.sessao.id, participante),
      `${participante.nome} entrou na cena.`,
    ),
    alterar: (participanteId, dados) => executar(
      () => sessaoApi.atualizar(estadoAtual.sessao.id, participanteId, dados),
    ),
    remover: participanteId => executar(
      () => sessaoApi.remover(estadoAtual.sessao.id, participanteId),
    ),
    turno: acao => executar(() => sessaoApi.turno(estadoAtual.sessao.id, acao)),
    iniciativa: () => executar(
      () => sessaoApi.rolarIniciativa(estadoAtual.sessao.id),
      'Iniciativa rolada e fila ordenada.',
    ),
  });

  // Rolador só para quem comanda; o jogador rola pela ficha, onde estão os
  // bônus dele.
  if (estadoAtual.comando) {
    content.append(criarRolador(campanhaId, { aoRolar: () => log.atualizar() }));
  }
  content.append(log.elemento);
  log.atualizar();
}

/* Toda ação segue o mesmo caminho: manda, rebusca o estado e redesenha. O
   servidor é a única fonte de verdade — nada é adivinhado na tela. */
async function executar(acao, mensagemDeSucesso = null) {
  try {
    await acao();
    await buscarEstado();
    if (mensagemDeSucesso) avisar(mensagemDeSucesso, 'sucesso');
  } catch (erro) {
    avisar(erro.message || 'Não foi possível concluir a ação.', 'erro');
  }
}

async function buscarEstado() {
  if (buscando) return;
  buscando = true;
  try {
    const anterior = estadoAtual?.sessao?.id || null;
    estadoAtual = await sessaoApi.obter(campanhaId);
    desenhar();
    // A sessão apareceu enquanto o jogador esperava com a página aberta.
    if (!anterior && estadoAtual.sessao && !estadoAtual.comando) {
      avisar('O mestre abriu a mesa.', 'sucesso');
    }
  } catch (erro) {
    avisar(erro.message || 'Falha ao carregar a sessão.', 'erro');
  } finally {
    buscando = false;
  }
}

function ligarEventos() {
  if (fonteDeEventos) fonteDeEventos.close();
  fonteDeEventos = new EventSource(sessaoApi.enderecoDosEventos(campanhaId));

  fonteDeEventos.addEventListener('open', () => marcarConexao('ligado', 'ao vivo'));
  fonteDeEventos.addEventListener('message', () => buscarEstado());
  fonteDeEventos.addEventListener('error', () => {
    // O próprio EventSource reconecta; aqui só avisamos na tela.
    marcarConexao('religando', 'reconectando…');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  let contexto;
  try {
    contexto = await inicializarPlataforma({ exigirCampanha: true });
  } catch (erro) {
    content.innerHTML = '<p class="sessao-vazio">Não foi possível carregar a plataforma. Recarregue a página.</p>';
    console.error(erro);
    return;
  }

  campanhaId = contexto.campanha.id;
  campanhaEl.textContent = contexto.campanha.nome;

  await buscarEstado();
  ligarEventos();

  // Trocar de campanha no portal muda a mesa que estamos acompanhando.
  document.addEventListener('jardim:contexto-alterado', evento => {
    const nova = evento.detail?.campanha?.id;
    if (nova && nova !== campanhaId) window.location.reload();
  });

  // Voltar de segundo plano com a conexão morta: refaz tudo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    buscarEstado();
    if (!fonteDeEventos || fonteDeEventos.readyState === EventSource.CLOSED) ligarEventos();
  });

  window.addEventListener('pagehide', () => fonteDeEventos?.close());
});
