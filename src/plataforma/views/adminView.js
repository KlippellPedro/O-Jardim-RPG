import { adminApi } from '../adminApi.js';
import {
  ROTULOS_CARGO,
  acao,
  ajuda,
  botao,
  cartao,
  carregando,
  dataCurta,
  dataRelativa,
  elemento,
  selo,
  seletor,
  subabas,
  texto,
  vazio,
} from './ui.js';

const SECOES = [
  ['usuarios', 'Contas'],
  ['campanhas', 'Campanhas'],
  ['registro', 'Registro da plataforma'],
  ['manutencao', 'Backup'],
];

let secaoAtual = 'usuarios';

export function renderAdmin(area, ctx, secao = null) {
  if (secao) secaoAtual = secao;
  if (!SECOES.some(([id]) => id === secaoAtual)) secaoAtual = 'usuarios';

  const topo = elemento('div', 'plataforma-mestre-topo');
  const titulo = elemento('div');
  titulo.append(
    elemento('h3', '', 'Administração da plataforma'),
    elemento('p', '', 'Contas, cargos e campanhas de todo o Jardim.'),
  );
  topo.append(titulo, ajuda('Admin gerencia contas e cargos. Criador reúne administração e mestragem, é único e não pode ser atribuído pelo painel.'));
  area.append(topo);
  area.append(subabas(SECOES, secaoAtual, id => ctx.renderPainel('admin', id)));

  const corpo = elemento('div', 'plataforma-area');
  area.append(corpo);

  if (secaoAtual === 'usuarios') return renderUsuarios(corpo, ctx);
  if (secaoAtual === 'campanhas') return renderCampanhas(corpo, ctx);
  if (secaoAtual === 'manutencao') return renderManutencao(corpo, ctx);
  return renderRegistro(corpo, ctx);
}

/* ── Backup ──────────────────────────────────────────────────────────────── */

function renderManutencao(area, ctx) {
  const card = cartao(
    'Backup do banco',
    'Baixa contas, campanhas, fichas, economia e histórico num arquivo só.',
    { larga: true },
  );

  const explicacao = elemento('div', 'plataforma-backup-info');
  explicacao.append(
    elemento('p', '', 'Guarde o arquivo fora do servidor — no seu computador ou num drive. '
      + 'É o que permite recomeçar se o banco da Discloud se perder.'),
    elemento('p', '', 'O arquivo tem e-mails e senhas cifradas: trate como material sensível '
      + 'e não poste em canal público. Sessões abertas e códigos de vínculo ficam de fora de propósito.'),
  );
  card.append(explicacao);

  const estado = elemento('p', 'plataforma-vazio', '');
  const baixar = acao('Gerar e baixar backup', '', async () => {
    estado.textContent = 'Montando o arquivo… em bancos grandes isso leva alguns segundos.';
    try {
      // Download precisa do corpo binário, não do JSON que o apiClient espera.
      const resposta = await fetch('/api/v1/admin/backup', { credentials: 'same-origin' });
      if (!resposta.ok) throw new Error(`Falha ${resposta.status} ao gerar o backup.`);
      const nome = (resposta.headers.get('content-disposition') || '')
        .split('filename=')[1]?.replaceAll('"', '') || 'jardim-backup.jsonl.gz';
      const arquivo = await resposta.blob();

      const link = document.createElement('a');
      link.href = URL.createObjectURL(arquivo);
      link.download = nome;
      link.click();
      URL.revokeObjectURL(link.href);

      const linhas = resposta.headers.get('x-backup-linhas');
      estado.textContent = `Pronto: ${nome} · ${(arquivo.size / 1024).toFixed(0)} KB`
        + (linhas ? ` · ${linhas} registros` : '');
      ctx.informar('Backup baixado. Guarde fora do servidor.', 'sucesso');
    } catch (erro) {
      estado.textContent = '';
      ctx.informar(texto(erro), 'erro');
    }
  });

  card.append(baixar, estado);

  const automacao = elemento('div', 'plataforma-subcard');
  automacao.append(
    elemento('h4', '', 'Backup automático'),
    elemento('p', '', 'Para rodar sozinho, agende o script na sua máquina ou num bot:'),
    elemento('code', 'plataforma-comando', 'python tools/backup-jardim.py --destino backups/'),
    elemento('small', '', 'Ele usa a rota interna com a SERVICE_API_KEY e mantém os arquivos rotacionados. '
      + 'Instruções completas em plataforma/README.md.'),
  );
  card.append(automacao);
  area.append(card);
}

/* ── Contas ──────────────────────────────────────────────────────────────── */

/* A senha provisória chega uma única vez: ela é mostrada dentro da própria
   linha da conta, com botão de copiar, e some ao recarregar a lista. */
function mostrarSenhaProvisoria(linha, resultado) {
  linha.querySelector('.plataforma-senha-provisoria')?.remove();
  const bloco = elemento('div', 'plataforma-senha-provisoria');
  bloco.append(elemento('strong', '', 'Senha provisória — anote agora, ela não aparece de novo'));

  const codigo = elemento('code', 'plataforma-senha-codigo', resultado.senha_provisoria);
  const copiar = botao('Copiar', 'plataforma-botao--secundario plataforma-botao--mini', async () => {
    try {
      await navigator.clipboard.writeText(resultado.senha_provisoria);
      copiar.textContent = 'Copiado';
    } catch {
      // Sem permissão de área de transferência: o código continua na tela.
      copiar.textContent = 'Copie da tela';
    }
  });
  const linhaCodigo = elemento('div', 'plataforma-senha-linha');
  linhaCodigo.append(codigo, copiar);

  bloco.append(
    linhaCodigo,
    elemento('small', '', `Envie para ${resultado.nome_exibicao} pelo Discord. `
      + 'Ao entrar, o site vai exigir que ela escolha uma senha nova.'),
  );
  linha.append(bloco);
}

async function renderUsuarios(area, ctx) {
  const card = cartao('Contas', 'Defina cargos e desative acessos sem apagar o histórico do RPG.', { larga: true });
  const resumo = elemento('div', 'plataforma-resumo');
  resumo.setAttribute('aria-label', 'Resumo da plataforma');
  const filtros = elemento('div', 'plataforma-filtros');
  const busca = document.createElement('input');
  busca.type = 'search';
  busca.placeholder = 'Buscar por nome ou e-mail';
  busca.setAttribute('aria-label', 'Buscar usuários');
  const filtroPapel = seletor('', [
    ['', 'Todos os cargos'],
    ['player', 'Player'],
    ['mestre', 'Mestre'],
    ['admin', 'Administrador'],
    ['criador', 'Criador'],
  ], '');
  const filtroAtivo = seletor('', [
    ['', 'Ativos e desativados'],
    ['true', 'Somente ativos'],
    ['false', 'Somente desativados'],
  ], '');
  filtros.append(busca, filtroPapel, filtroAtivo);

  const lista = elemento('div', 'plataforma-usuarios-lista');
  const paginacao = elemento('div', 'plataforma-paginacao');
  const pedidos = elemento('div', 'plataforma-pedidos');
  card.append(resumo, pedidos, filtros, lista, paginacao);
  area.append(card);

  let pagina = 1;

  /* Quem clicou em "esqueci a senha" aparece no topo, com o botão que já existe
     para gerar a provisória — o admin resolve sem procurar a conta na lista. */
  async function desenharPedidos() {
    try {
      const resposta = await adminApi.pedidosDeSenha();
      const abertos = resposta.pedidos || [];
      pedidos.replaceChildren();
      if (!abertos.length) return;

      const bloco = elemento('div', 'plataforma-pedidos-bloco');
      bloco.append(elemento('h4', '', `${abertos.length} pedido(s) de senha nova`));
      abertos.forEach(pedido => {
        const linha = elemento('div', 'plataforma-pedido-item');
        const identidade = elemento('div');
        identidade.append(elemento('strong', '', pedido.nome_exibicao || 'Conta não encontrada'));
        identidade.append(elemento('span', '', `${pedido.email} · pedido ${dataRelativa(pedido.criado_em)}`));
        linha.append(identidade);

        const acoes = elemento('div', 'plataforma-usuario-acoes');
        if (pedido.usuario_id && pedido.papel_plataforma !== 'criador') {
          acoes.append(acao('Gerar senha', '', async () => {
            try {
              const resultado = await adminApi.redefinirSenha(pedido.usuario_id);
              // A fila NÃO é redesenhada aqui: a senha provisória aparece uma
              // única vez, e recarregar a lista a apagaria antes de ser copiada.
              // O pedido já foi fechado no servidor; some na próxima abertura.
              mostrarSenhaProvisoria(linha, resultado);
              linha.dataset.atendido = 'true';
              acoes.replaceChildren();
              ctx.informar(`Senha provisória criada para ${resultado.nome_exibicao}. Copie antes de sair.`, 'sucesso');
              await carregar();
            } catch (erro) {
              ctx.informar(texto(erro), 'erro');
            }
          }, { confirmar: `Gerar senha provisória para ${pedido.email}?` }));
        }
        acoes.append(acao('Descartar', 'plataforma-botao--secundario', async () => {
          try {
            await adminApi.recusarPedidoDeSenha(pedido.id);
            await desenharPedidos();
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, { confirmar: 'Descartar este pedido sem redefinir a senha?' }));

        linha.append(acoes);
        bloco.append(linha);
      });
      pedidos.append(bloco);
    } catch {
      // Banco anterior à migração 9: a fila simplesmente não aparece.
      pedidos.replaceChildren();
    }
  }

  async function desenharResumo() {
    try {
      const dados = await adminApi.resumo();
      resumo.replaceChildren();
      const contagens = new Map((dados.usuarios || []).map(item => [`${item.papel_plataforma}:${item.ativo}`, Number(item.total)]));
      ['player', 'mestre', 'admin', 'criador'].forEach(papel => {
        const item = elemento('div', 'plataforma-resumo-item');
        const total = (contagens.get(`${papel}:true`) || 0) + (contagens.get(`${papel}:false`) || 0);
        item.append(elemento('strong', '', String(total)), elemento('span', '', ROTULOS_CARGO[papel]));
        resumo.append(item);
      });
      const campanhas = (dados.campanhas || []).reduce((mapa, item) => {
        mapa[item.status] = Number(item.total);
        return mapa;
      }, {});
      const bloco = elemento('div', 'plataforma-resumo-item');
      bloco.append(
        elemento('strong', '', String(campanhas.ativa || 0)),
        elemento('span', '', `Campanhas ativas${campanhas.arquivada ? ` · ${campanhas.arquivada} arquivadas` : ''}`),
      );
      resumo.append(bloco);
    } catch (erro) {
      resumo.replaceChildren(vazio(texto(erro)));
    }
  }

  async function carregar() {
    lista.replaceChildren(carregando('Carregando contas…'));
    paginacao.replaceChildren();
    try {
      const resposta = await adminApi.listarUsuarios({
        busca: busca.value.trim(),
        papel: filtroPapel.select.value,
        ativo: filtroAtivo.select.value,
        pagina,
      });
      lista.replaceChildren();
      const usuarios = resposta.usuarios || [];
      if (!usuarios.length) {
        lista.append(vazio('Nenhuma conta encontrada com esses filtros.'));
      }

      usuarios.forEach(usuario => {
        const linha = elemento('article', 'plataforma-usuario-item');
        linha.dataset.ativo = String(usuario.ativo);
        const protegido = usuario.papel_plataforma === 'criador';

        const identidade = elemento('div', 'plataforma-usuario-identidade');
        const nome = document.createElement('input');
        nome.type = 'text';
        nome.value = usuario.nome_exibicao;
        nome.maxLength = 80;
        nome.disabled = protegido;
        nome.setAttribute('aria-label', `Nome de ${usuario.nome_exibicao}`);
        identidade.append(nome, elemento('span', '', usuario.email));
        identidade.append(elemento('small', '', `Entrou em ${dataCurta(usuario.criado_em)}`));

        const papel = seletor('', protegido
          ? [['criador', 'Criador']]
          : [['player', 'Player'], ['mestre', 'Mestre'], ['admin', 'Administrador']],
        usuario.papel_plataforma);
        papel.select.disabled = protegido;
        papel.select.setAttribute('aria-label', `Cargo de ${usuario.nome_exibicao}`);

        const situacao = selo(usuario.ativo ? 'Ativo' : 'Desativado', usuario.ativo ? 'verde' : 'vermelho');

        const acoes = elemento('div', 'plataforma-usuario-acoes');
        const salvar = acao('Salvar', '', async () => {
          try {
            const resultado = await adminApi.editarUsuario(usuario.id, {
              nome_exibicao: nome.value.trim(),
              papel_plataforma: papel.select.value,
            });
            if (usuario.id === ctx.estado.usuario.id) {
              ctx.atualizarUsuario(resultado.usuario);
              if (!ctx.podeAdministrar()) {
                ctx.informar('Sua conta foi atualizada e não possui mais acesso administrativo.', 'sucesso');
                ctx.renderPainel(ctx.estado.campanha ? 'conta' : 'campanhas');
                return;
              }
            }
            ctx.informar(`Conta de ${nome.value.trim()} atualizada. A pessoa recebe um aviso.`, 'sucesso');
            await Promise.all([carregar(), desenharResumo()]);
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        });
        salvar.disabled = protegido;

        const alternar = acao(
          usuario.ativo ? 'Desativar' : 'Reativar',
          usuario.ativo ? 'plataforma-botao--perigo' : 'plataforma-botao--secundario',
          async () => {
            try {
              if (usuario.ativo) await adminApi.desativarUsuario(usuario.id);
              else await adminApi.editarUsuario(usuario.id, { ativo: true });
              ctx.informar(`Conta ${usuario.ativo ? 'desativada' : 'reativada'}.`, 'sucesso');
              await Promise.all([carregar(), desenharResumo()]);
            } catch (erro) {
              ctx.informar(texto(erro), 'erro');
            }
          },
          { confirmar: `Deseja ${usuario.ativo ? 'desativar' : 'reativar'} a conta de ${usuario.nome_exibicao}?` },
        );
        alternar.disabled = protegido || usuario.id === ctx.estado.usuario.id;

        const redefinir = acao('Redefinir senha', 'plataforma-botao--secundario', async () => {
          try {
            const resultado = await adminApi.redefinirSenha(usuario.id);
            mostrarSenhaProvisoria(linha, resultado);
            ctx.informar(`Senha provisória criada para ${usuario.nome_exibicao}. Entregue o código a ela.`, 'sucesso');
          } catch (erro) {
            ctx.informar(texto(erro), 'erro');
          }
        }, {
          confirmar: `Gerar uma senha provisória para ${usuario.nome_exibicao}? `
            + 'A senha atual para de funcionar na hora e a pessoa é desconectada.',
        });
        redefinir.disabled = protegido || !usuario.ativo;

        acoes.append(salvar, redefinir, alternar);
        linha.append(identidade, papel, situacao, acoes);
        lista.append(linha);
      });

      const dados = resposta.paginacao;
      const anterior = botao('Anterior', 'plataforma-botao--secundario', () => { pagina -= 1; carregar(); });
      anterior.disabled = dados.pagina <= 1;
      const proxima = botao('Próxima', 'plataforma-botao--secundario', () => { pagina += 1; carregar(); });
      proxima.disabled = dados.pagina >= dados.paginas;
      paginacao.append(
        anterior,
        elemento('span', '', `Página ${dados.pagina} de ${dados.paginas} · ${dados.total} contas`),
        proxima,
      );
    } catch (erro) {
      lista.replaceChildren(vazio(texto(erro)));
    }
  }

  const aplicar = () => { pagina = 1; carregar(); };
  filtros.append(botao('Aplicar filtros', 'plataforma-botao--secundario', aplicar));
  filtroPapel.select.addEventListener('change', aplicar);
  filtroAtivo.select.addEventListener('change', aplicar);
  busca.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') { evento.preventDefault(); aplicar(); }
  });

  await Promise.all([desenharResumo(), desenharPedidos(), carregar()]);
}

/* ── Campanhas de toda a plataforma ──────────────────────────────────────── */

async function renderCampanhas(area, ctx) {
  const card = cartao('Campanhas', 'Todas as mesas do Jardim, com dono e tamanho.', { larga: true });
  const controles = elemento('div', 'plataforma-controles plataforma-controles--compactos');
  const incluirArquivadas = document.createElement('label');
  incluirArquivadas.className = 'plataforma-check-inline';
  const check = document.createElement('input');
  check.type = 'checkbox';
  incluirArquivadas.append(check, elemento('span', '', 'Mostrar arquivadas'));
  controles.append(incluirArquivadas);
  const lista = elemento('div', 'plataforma-campanhas-lista');
  card.append(controles, lista);
  area.append(card);

  async function carregar() {
    lista.replaceChildren(carregando('Carregando campanhas…'));
    try {
      const resposta = await adminApi.listarCampanhas(check.checked);
      const campanhas = resposta.campanhas || [];
      lista.replaceChildren();
      if (!campanhas.length) {
        lista.append(vazio('Nenhuma campanha cadastrada.'));
        return;
      }
      campanhas.forEach(campanha => {
        const item = elemento('article', 'plataforma-campanha-item');
        const identidade = elemento('div');
        const nome = elemento('strong', '', campanha.nome);
        if (campanha.status !== 'ativa') nome.append(' ', selo('Arquivada', 'apagado'));
        if (campanha.discord) nome.append(' ', selo('Discord', 'azul'));
        identidade.append(nome);
        identidade.append(elemento('span', '', `Mestre: ${campanha.dono_nome || 'sem dono'} · ${campanha.dono_email || ''}`));
        identidade.append(elemento('small', '', `${campanha.membros} membro(s) · ${campanha.personagens} personagem(ns) · ${campanha.publicacoes} publicação(ões) · ativa ${dataRelativa(campanha.atualizado_em)}`));
        item.append(identidade);
        lista.append(item);
      });
    } catch (erro) {
      lista.replaceChildren(vazio(texto(erro)));
    }
  }

  check.addEventListener('change', carregar);
  await carregar();
}

/* ── Registro global ─────────────────────────────────────────────────────── */

async function renderRegistro(area, ctx) {
  const card = cartao(
    'Registro da plataforma',
    'Últimos eventos de todas as campanhas e contas.',
    { larga: true },
  );
  const lista = elemento('div', 'plataforma-registro');
  card.append(lista);
  area.append(card);

  lista.replaceChildren(carregando('Carregando eventos…'));
  try {
    const resposta = await adminApi.auditoria(120);
    const eventos = resposta.eventos || [];
    lista.replaceChildren();
    if (!eventos.length) {
      lista.append(vazio('Nada registrado ainda.'));
      return;
    }
    eventos.forEach(evento => {
      const linha = elemento('div', 'plataforma-registro-item');
      linha.append(elemento('strong', '', evento.ator_nome || evento.ator_servico || 'Sistema'));
      linha.append(elemento('span', '', `${evento.acao}${evento.campanha_nome ? ` · ${evento.campanha_nome}` : ''}`));
      linha.append(elemento('small', '', dataRelativa(evento.criado_em)));
      lista.append(linha);
    });
  } catch (erro) {
    lista.replaceChildren(vazio(texto(erro)));
  }
}
