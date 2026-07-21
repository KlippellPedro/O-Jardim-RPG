import { ApiError } from './apiClient.js?v=2';
import { authApi } from './authApi.js';
import { campanhasApi } from './campanhasApi.js';
import { renderAdmin } from './views/adminView.js';
import { renderAvisos } from './views/avisosView.js';
import { renderCampanhas as renderListaCampanhas } from './views/campanhasView.js';
import { encerrarSessao, renderCofre, renderConta } from './views/contaView.js';
import { renderMestre } from './views/mestreView.js';
import { renderTrocaObrigatoria } from './views/senhaView.js';
import { botao, campo, carregando, elemento, texto } from './views/ui.js';

const CHAVE_CAMPANHA = 'jardim-campanha-ativa';

const estado = {
  usuario: null,
  campanhas: [],
  campanha: null,
  detalhes: null,
  personagens: [],
  avisosNaoLidos: 0,
};

let raiz;
let painel;
let dock;
let dockAvisos;
let mensagem;
let inicializacao;
let exigenciaCampanha = true;
let modoAuth = 'login';
// Descoberto na primeira vez que a tela de cadastro aparece; 'aberto' é o
// palpite inicial só para não travar a tela se a consulta falhar.
let modoCadastro = 'aberto';
let modoCadastroConsultado = false;
let modoCampanha = 'entrar';

function cargoAtual() {
  return estado.usuario?.papel_plataforma || 'player';
}

function podeCriarCampanha() {
  return ['mestre', 'criador'].includes(cargoAtual());
}

function podeAdministrar() {
  return ['admin', 'criador'].includes(cargoAtual());
}

function gerenciaCampanha() {
  return ['mestre', 'assistente'].includes(estado.detalhes?.meu_papel);
}

function podeContinuarSemCampanha() {
  return podeAdministrar();
}

// Senha definida por um administrador é conhecida por outra pessoa: o site fica
// preso nesta troca até a conta ter uma senha só dela.
function precisaTrocarSenha() {
  return Boolean(estado.usuario?.senha_provisoria);
}

function limparEstado() {
  estado.usuario = null;
  estado.campanhas = [];
  estado.campanha = null;
  estado.detalhes = null;
  estado.personagens = [];
  estado.avisosNaoLidos = 0;
}

function emitirContexto() {
  document.dispatchEvent(new CustomEvent('jardim:contexto-alterado', {
    detail: obterContextoPlataforma(),
  }));
}

/* ── Casca do portal ─────────────────────────────────────────────────────── */

function montarBase() {
  if (raiz) return;
  raiz = document.createElement('div');
  raiz.id = 'jardim-plataforma';
  raiz.innerHTML = `
    <button class="plataforma-dock" type="button" aria-label="Abrir conta e campanha">
      <span class="plataforma-dock-status" aria-hidden="true"></span>
      <span class="plataforma-dock-texto">Conta</span>
      <span class="plataforma-dock-avisos" hidden aria-label="Avisos não lidos">0</span>
    </button>
    <div class="plataforma-overlay" hidden>
      <section class="plataforma-painel" role="dialog" aria-modal="true" aria-label="Conta e campanha">
        <header class="plataforma-topo">
          <div>
            <span class="plataforma-sobretitulo">O Jardim RPG</span>
            <h2 class="plataforma-titulo">Conta e campanha</h2>
          </div>
          <button class="plataforma-fechar" type="button" aria-label="Fechar">×</button>
        </header>
        <p class="plataforma-mensagem" role="status" hidden></p>
        <div class="plataforma-corpo"></div>
      </section>
    </div>
  `;
  document.body.appendChild(raiz);
  dock = raiz.querySelector('.plataforma-dock');
  dockAvisos = raiz.querySelector('.plataforma-dock-avisos');
  painel = raiz.querySelector('.plataforma-corpo');
  mensagem = raiz.querySelector('.plataforma-mensagem');
  dock.addEventListener('click', () => abrirPortal(estado.avisosNaoLidos ? 'avisos' : null));
  raiz.querySelector('.plataforma-fechar').addEventListener('click', fecharPortal);
  raiz.querySelector('.plataforma-overlay').addEventListener('click', evento => {
    if (evento.target === evento.currentTarget) fecharPortal();
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape') fecharPortal();
  });
}

function informar(conteudo = '', tipo = 'info') {
  if (!mensagem) return;
  mensagem.textContent = conteudo;
  mensagem.dataset.tipo = tipo;
  mensagem.hidden = !conteudo;
}

function atualizarDock() {
  if (!dock) return;
  const textoDock = dock.querySelector('.plataforma-dock-texto');
  if (!estado.usuario) {
    textoDock.textContent = 'Entrar';
    dock.dataset.estado = 'desconectado';
    dockAvisos.hidden = true;
    return;
  }
  textoDock.textContent = estado.campanha
    ? `${estado.usuario.nome_exibicao} · ${estado.campanha.nome}`
    : `${estado.usuario.nome_exibicao} · escolher campanha`;
  dock.dataset.estado = estado.campanha ? 'conectado' : 'pendente';
  dockAvisos.textContent = String(estado.avisosNaoLidos > 99 ? '99+' : estado.avisosNaoLidos);
  dockAvisos.hidden = !estado.avisosNaoLidos;
}

function definirNaoLidos(total) {
  estado.avisosNaoLidos = Number(total) || 0;
  atualizarDock();
}

/* ── Carregamento do contexto ────────────────────────────────────────────── */

async function carregarContexto(campanhaPreferida = null) {
  const desejada = campanhaPreferida || localStorage.getItem(CHAVE_CAMPANHA) || null;
  const contexto = await authApi.contexto(desejada);
  estado.usuario = contexto.usuario;
  estado.campanhas = contexto.campanhas || [];
  estado.campanha = contexto.campanha || null;
  estado.detalhes = contexto.detalhes || null;
  estado.personagens = contexto.personagens || [];
  estado.avisosNaoLidos = contexto.avisos_nao_lidos || 0;
  if (estado.campanha) localStorage.setItem(CHAVE_CAMPANHA, estado.campanha.id);
  else localStorage.removeItem(CHAVE_CAMPANHA);
  atualizarDock();
  emitirContexto();
  return contexto;
}

async function autenticarAtual() {
  try {
    await carregarContexto();
  } catch (erro) {
    if (!(erro instanceof ApiError) || erro.status !== 401) throw erro;
    limparEstado();
    atualizarDock();
  }
}

/* ── Entrada: login e cadastro ───────────────────────────────────────────── */

function linkAlternar(pergunta, rotulo, aoClicar) {
  const paragrafo = elemento('p', 'plataforma-alternar');
  const link = elemento('button', 'plataforma-link', rotulo);
  link.type = 'button';
  link.addEventListener('click', aoClicar);
  paragrafo.append(`${pergunta} `, link);
  return paragrafo;
}

/* Não há e-mail de recuperação: o pedido vai para o painel de quem administra,
   que gera a senha provisória e entrega pelo Discord. */
function renderAjudaSenha() {
  const form = document.createElement('form');
  form.className = 'plataforma-card';
  form.append(elemento('h3', '', 'Pedir uma senha nova'));
  form.append(elemento('p', '', 'Um administrador vai gerar uma senha provisória e entregar a você pelo Discord. Não enviamos e-mail.'));
  form.append(campo('Seu e-mail', 'email', 'email', { required: true, autocomplete: 'email' }));

  const enviar = botao('Enviar pedido');
  enviar.type = 'submit';
  form.append(enviar);

  const retorno = elemento('p', 'plataforma-aviso');
  retorno.hidden = true;
  form.append(retorno);

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    enviar.disabled = true;
    try {
      const dados = new FormData(form);
      const resposta = await authApi.pedirAjudaComSenha(dados.get('email'));
      // A resposta é igual exista ou não a conta: a tela não revela cadastros.
      retorno.textContent = resposta.mensagem;
      retorno.hidden = false;
      enviar.textContent = 'Pedido enviado';
      informar('Pedido registrado.', 'sucesso');
    } catch (erro) {
      informar(texto(erro), 'erro');
      enviar.disabled = false;
    }
  });
  return form;
}

function renderAuth() {
  painel.innerHTML = `
    <div class="plataforma-auth">
      <aside class="plataforma-auth-hero">
        <span class="plataforma-auth-marca">✦ O Jardim RPG</span>
        <h3>Suas fichas, campanhas e recompensas em uma conta</h3>
        <p>Entre para acessar seus personagens salvos no servidor — o JSON deixa de ser a fonte de dados.</p>
        <ul class="plataforma-auth-features">
          <li>Fichas na nuvem, sincronizadas entre abas e dispositivos</li>
          <li>Campanhas, convites e papéis por mesa (mestre, jogador, observador)</li>
          <li>Recompensas do Discord caem direto no seu cofre</li>
        </ul>
      </aside>
      <div class="plataforma-auth-form"></div>
    </div>
  `;
  const area = painel.querySelector('.plataforma-auth-form');

  if (modoAuth === 'cadastro') {
    if (modoCadastro === 'fechado') {
      const aviso = document.createElement('div');
      aviso.className = 'plataforma-card';
      aviso.append(elemento('h3', '', 'Cadastro fechado'));
      aviso.append(elemento('p', '', 'As contas desta mesa são criadas por um administrador. Fale com quem cuida do Jardim.'));
      area.append(aviso, linkAlternar('Já tem conta?', 'Entrar', () => { modoAuth = 'login'; renderAuth(); }));
      return;
    }

    const exigeConvite = modoCadastro === 'convite';
    const form = document.createElement('form');
    form.className = 'plataforma-card';
    form.append(elemento('h3', '', 'Criar conta'));
    if (exigeConvite) {
      form.append(elemento('p', 'plataforma-aviso-suave',
        'Esta mesa é por convite. Use o código que o mestre te passou — sua conta já entra na campanha dele.'));
      form.append(campo('Código do convite', 'text', 'convite', { required: true, maxlength: 120, autocomplete: 'off' }));
    }
    form.append(campo('Nome de exibição', 'text', 'nome', { required: true, minlength: 2, maxlength: 80, autocomplete: 'name' }));
    form.append(campo('E-mail', 'email', 'email', { required: true, autocomplete: 'email' }));
    form.append(campo('Senha (mínimo de 12 caracteres)', 'password', 'senha', { required: true, minlength: 12, maxlength: 128, autocomplete: 'new-password' }));
    const criar = botao('Criar conta');
    criar.type = 'submit';
    form.append(criar);
    form.addEventListener('submit', async evento => {
      evento.preventDefault();
      criar.disabled = true;
      informar('Criando conta…');
      try {
        const dados = new FormData(form);
        await authApi.registrar({
          nome_exibicao: dados.get('nome'),
          email: dados.get('email'),
          senha: dados.get('senha'),
          convite: exigeConvite ? String(dados.get('convite') || '').trim() : null,
        });
        await carregarContexto();
        informar('Conta criada com segurança.', 'sucesso');
        renderInicial();
      } catch (erro) {
        informar(texto(erro), 'erro');
      } finally {
        criar.disabled = false;
      }
    });
    area.append(form, linkAlternar('Já tem conta?', 'Entrar', () => { modoAuth = 'login'; renderAuth(); }));
    return;
  }

  if (modoAuth === 'ajuda') {
    area.append(renderAjudaSenha(), linkAlternar('Lembrou?', 'Voltar para entrar', () => { modoAuth = 'login'; renderAuth(); }));
    return;
  }

  const form = document.createElement('form');
  form.className = 'plataforma-card';
  form.append(elemento('h3', '', 'Entrar'));
  form.append(campo('E-mail', 'email', 'email', { required: true, autocomplete: 'email' }));
  form.append(campo('Senha', 'password', 'senha', { required: true, autocomplete: 'current-password' }));
  const entrar = botao('Entrar');
  entrar.type = 'submit';
  form.append(entrar);
  form.append(linkAlternar('Esqueceu a senha?', 'Pedir uma nova', () => { modoAuth = 'ajuda'; renderAuth(); }));
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    entrar.disabled = true;
    informar('Entrando…');
    try {
      const dados = new FormData(form);
      await authApi.entrar(dados.get('email'), dados.get('senha'));
      await carregarContexto();
      informar('Conta conectada.', 'sucesso');
      renderInicial();
    } catch (erro) {
      informar(texto(erro), 'erro');
    } finally {
      entrar.disabled = false;
    }
  });
  area.append(form, linkAlternar('Não tem conta?', 'Cadastre-se', abrirCadastro));
}

/** Descobre se a mesa pede convite antes de desenhar o formulário. */
async function abrirCadastro() {
  if (!modoCadastroConsultado) {
    try {
      const resposta = await authApi.modoDeCadastro();
      modoCadastro = resposta?.modo || 'aberto';
    } catch {
      // Servidor antigo ou fora do ar: o formulário simples ainda funciona, e
      // o próprio cadastro recusa se faltar convite.
      modoCadastro = 'aberto';
    }
    modoCadastroConsultado = true;
  }
  modoAuth = 'cadastro';
  renderAuth();
}

function renderEntradaCampanha() {
  if (modoCampanha === 'criar' && !podeCriarCampanha()) modoCampanha = 'entrar';
  painel.replaceChildren();
  const intro = elemento('div', 'plataforma-intro');
  intro.append(
    elemento('h3', '', modoCampanha === 'criar' ? 'Criar uma campanha' : 'Entre em uma campanha'),
    elemento('p', '', modoCampanha === 'criar'
      ? 'Você entra como mestre e pode convidar os jogadores em seguida.'
      : 'Use o código enviado pelo mestre. Criar mesas exige o cargo de Mestre.'),
  );
  painel.append(intro);

  const grade = elemento('div', 'plataforma-auth-grid');
  painel.append(grade);

  if (modoCampanha === 'criar') {
    const form = document.createElement('form');
    form.className = 'plataforma-card';
    form.append(elemento('h3', '', 'Nova campanha'));
    form.append(campo('Nome', 'text', 'nome', { required: true, minlength: 2, maxlength: 100 }));
    form.append(campo('Descrição', 'text', 'descricao', { maxlength: 2000 }));
    const criar = botao('Criar como mestre');
    criar.type = 'submit';
    form.append(criar);
    form.addEventListener('submit', async evento => {
      evento.preventDefault();
      criar.disabled = true;
      try {
        const dados = new FormData(form);
        const nova = await campanhasApi.criar({ nome: dados.get('nome'), descricao: dados.get('descricao') });
        await carregarContexto(nova.id);
        informar('Campanha criada. Convide os jogadores em Painel do mestre › Mesa.', 'sucesso');
        renderPainel('mestre', 'mesa');
      } catch (erro) {
        informar(texto(erro), 'erro');
      } finally {
        criar.disabled = false;
      }
    });
    grade.append(form, linkAlternar('Já tem um convite?', 'Entrar em uma campanha', () => { modoCampanha = 'entrar'; renderEntradaCampanha(); }));
    return;
  }

  const form = document.createElement('form');
  form.className = 'plataforma-card';
  form.append(elemento('h3', '', 'Entrar por convite'));
  form.append(campo('Código do convite', 'text', 'codigo', { required: true, minlength: 6, maxlength: 32 }));
  const entrar = botao('Entrar na campanha');
  entrar.type = 'submit';
  form.append(entrar);
  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    entrar.disabled = true;
    try {
      const dados = new FormData(form);
      const vinculo = await campanhasApi.entrar(String(dados.get('codigo')).trim());
      await carregarContexto(vinculo.campanha_id);
      informar('Você entrou na campanha.', 'sucesso');
      renderPainel('conta');
    } catch (erro) {
      informar(texto(erro), 'erro');
    } finally {
      entrar.disabled = false;
    }
  });
  grade.append(form);
  if (podeCriarCampanha()) {
    grade.append(linkAlternar('Vai mestrar uma nova mesa?', 'Criar campanha', () => { modoCampanha = 'criar'; renderEntradaCampanha(); }));
  } else {
    grade.append(elemento('p', 'plataforma-aviso', 'Precisa criar uma mesa? Um administrador deve alterar o cargo da sua conta para Mestre.'));
  }
  if (estado.campanhas.length) {
    grade.append(linkAlternar('Já participa de alguma?', 'Ver minhas campanhas', () => renderPainel('campanhas')));
  }
}

/* ── Painel autenticado ──────────────────────────────────────────────────── */

function criarNavegacao(abaAtiva) {
  const nav = elemento('nav', 'plataforma-abas');
  const abas = [['conta', 'Minha conta'], ['avisos', 'Avisos']];
  if (estado.campanha) abas.push(['cofre', 'Cofre']);
  abas.push(['campanhas', 'Campanhas']);
  if (gerenciaCampanha()) abas.push(['mestre', 'Painel do mestre']);
  if (podeAdministrar()) abas.push(['admin', 'Administração']);

  abas.forEach(([id, rotulo]) => {
    const item = botao(rotulo, 'plataforma-aba', () => renderPainel(id));
    item.dataset.ativo = String(id === abaAtiva);
    if (id === 'avisos' && estado.avisosNaoLidos) {
      item.append(elemento('span', 'plataforma-aba-contador', String(estado.avisosNaoLidos)));
    }
    nav.append(item);
  });
  return nav;
}

function seletorCampanha() {
  const wrapper = elemento('label', 'plataforma-seletor-campanha');
  wrapper.append(elemento('span', '', 'Campanha atual'));
  const select = document.createElement('select');
  estado.campanhas.forEach(campanha => {
    const option = document.createElement('option');
    option.value = campanha.id;
    option.textContent = `${campanha.nome} · ${campanha.papel}`;
    option.selected = campanha.id === estado.campanha?.id;
    select.append(option);
  });
  select.addEventListener('change', async () => {
    select.disabled = true;
    try {
      await carregarContexto(select.value);
      renderPainel();
    } catch (erro) {
      informar(texto(erro), 'erro');
      select.disabled = false;
    }
  });
  wrapper.append(select);
  return wrapper;
}

const ctx = {
  estado,
  informar,
  renderPainel: (aba, secao) => renderPainel(aba, secao),
  renderInicial: () => renderInicial(),
  // Sai da frente quando não há mais nada pendente (fecharPortal ignora o
  // pedido enquanto faltar conta, senha nova ou campanha).
  tentarFechar: () => fecharPortal(),
  recarregar: (campanhaId = null) => carregarContexto(campanhaId || estado.campanha?.id || null),
  definirNaoLidos,
  podeAdministrar,
  podeCriarCampanha,
  atualizarUsuario(dados) {
    estado.usuario = { ...estado.usuario, ...dados };
    atualizarDock();
    emitirContexto();
  },
  abrirEntradaCampanha(modo = 'entrar') {
    modoCampanha = modo;
    renderEntradaCampanha();
  },
  async sair() {
    await encerrarSessao();
    limparEstado();
    modoAuth = 'login';
    atualizarDock();
    renderAuth();
    emitirContexto();
  },
};

function renderPainel(aba = 'conta', secao = null) {
  painel.replaceChildren();
  if (estado.campanhas.length) painel.append(seletorCampanha());
  painel.append(criarNavegacao(aba));

  const area = elemento('div', aba === 'mestre' || aba === 'admin' ? 'plataforma-area-plena' : 'plataforma-area');
  painel.append(area);

  const desenhar = {
    conta: () => renderConta(area, ctx),
    avisos: () => renderAvisos(area, ctx),
    cofre: () => renderCofre(area, ctx),
    campanhas: () => renderListaCampanhas(area, ctx),
    mestre: () => renderMestre(area, ctx, secao),
    admin: () => renderAdmin(area, ctx, secao),
  }[aba];

  const resultado = desenhar ? desenhar() : renderConta(area, ctx);
  if (resultado && typeof resultado.catch === 'function') {
    resultado.catch(erro => informar(texto(erro), 'erro'));
  }
}

function renderInicial() {
  if (!estado.usuario) return renderAuth();
  if (precisaTrocarSenha()) return renderTrocaObrigatoria(painel, ctx);
  if (!estado.campanha && podeAdministrar()) return renderPainel('admin');
  if (!estado.campanha) return renderEntradaCampanha();
  return renderPainel();
}

/* ── API pública ─────────────────────────────────────────────────────────── */

export function obterContextoPlataforma() {
  return {
    usuario: estado.usuario,
    campanhas: [...estado.campanhas],
    campanha: estado.campanha,
    detalhes: estado.detalhes,
    personagens: [...estado.personagens],
    avisosNaoLidos: estado.avisosNaoLidos,
  };
}

export function abrirPortal(aba = null) {
  montarBase();
  informar('');

  if (!estado.usuario || !aba || precisaTrocarSenha()) {
    renderInicial();
  } else if (aba === 'cofre' && !estado.campanha) {
    renderPainel('campanhas');
    informar('Escolha uma campanha antes de abrir o cofre.', 'erro');
  } else if (aba === 'mestre' && !gerenciaCampanha()) {
    renderPainel('conta');
    informar('O painel do mestre exige papel de mestre ou assistente nesta campanha.', 'erro');
  } else if (aba === 'admin' && !podeAdministrar()) {
    renderPainel('conta');
    informar('O painel administrativo exige cargo de administrador ou criador.', 'erro');
  } else {
    renderPainel(aba);
  }

  raiz.querySelector('.plataforma-overlay').hidden = false;
  document.body.classList.add('plataforma-aberta');
}

export function fecharPortal() {
  if (!raiz) return;
  // Sem conta, com senha provisória ou sem campanha o site não tem o que
  // mostrar: o portal fica preso aberto de propósito, em vez de revelar uma
  // página vazia atrás dele.
  if (!estado.usuario || precisaTrocarSenha()) return;
  if (exigenciaCampanha && !estado.campanha && !podeContinuarSemCampanha()) return;
  raiz.querySelector('.plataforma-overlay').hidden = true;
  document.body.classList.remove('plataforma-aberta');
}

export async function inicializarPlataforma({ exigirCampanha = true } = {}) {
  exigenciaCampanha = exigirCampanha;
  montarBase();

  if (!inicializacao) {
    // Enquanto a sessão é conferida, o portal mostra que está trabalhando:
    // antes a tela ficava parada e parecia travada.
    painel.replaceChildren(carregando('Conferindo sua conta e campanha…'));
    raiz.querySelector('.plataforma-overlay').hidden = false;
    document.body.classList.add('plataforma-aberta');
    inicializacao = autenticarAtual().catch(erro => {
      informar(texto(erro, 'Não foi possível falar com a plataforma. Recarregue a página.'), 'erro');
      limparEstado();
    });
  }
  await inicializacao;
  atualizarDock();

  const precisaResolver = !estado.usuario
    || precisaTrocarSenha()
    || (exigirCampanha && !estado.campanha && !podeContinuarSemCampanha());
  if (!precisaResolver) {
    // Painel fica em branco até alguém abri-lo: renderizar aqui custava uma
    // consulta ao Discord em toda página, sem ninguém estar olhando.
    painel.replaceChildren();
    raiz.querySelector('.plataforma-overlay').hidden = true;
    document.body.classList.remove('plataforma-aberta');
    return obterContextoPlataforma();
  }

  abrirPortal();
  return new Promise(resolve => {
    const aguardar = () => {
      if (!estado.usuario || precisaTrocarSenha()) return;
      if (exigirCampanha && !estado.campanha && !podeContinuarSemCampanha()) return;
      document.removeEventListener('jardim:contexto-alterado', aguardar);
      resolve(obterContextoPlataforma());
    };
    document.addEventListener('jardim:contexto-alterado', aguardar);
  });
}
