import { authApi } from '../authApi.js';
import { botao, campo, elemento, texto } from './ui.js';

/* Bloco recolhido para "Minha conta".

   Aberto por padrão, o formulário parecia uma exigência — quem entrava achava
   que precisava trocar a senha para continuar. Recolhido, some do caminho de
   quem só queria ver o perfil, e continua a um clique de quem quer trocar. */
export function blocoTrocarSenha(ctx) {
  const bloco = document.createElement('details');
  bloco.className = 'plataforma-card plataforma-senha-opcional';

  const titulo = document.createElement('summary');
  titulo.textContent = 'Trocar minha senha';
  bloco.append(titulo);

  const formulario = formularioSenha(ctx);
  // O título já está no summary; dentro fica só o formulário.
  formulario.querySelector('h3')?.remove();
  formulario.classList.remove('plataforma-card');
  bloco.append(formulario);
  return bloco;
}

/* Formulário de troca de senha, usado em dois lugares:
   - "Minha conta", como opção voluntária (recolhido em blocoTrocarSenha);
   - tela travada, quando um administrador definiu uma senha provisória. */
export function formularioSenha(ctx, { obrigatorio = false, aoConcluir = null } = {}) {
  const form = document.createElement('form');
  form.className = 'plataforma-card plataforma-form-senha';
  form.append(elemento('h3', '', obrigatorio ? 'Escolha uma senha nova' : 'Trocar senha'));
  form.append(elemento('p', '', obrigatorio
    ? 'Um administrador gerou uma senha provisória para você. Use-a abaixo e escolha uma senha só sua.'
    : 'Trocar a senha desconecta os outros aparelhos onde sua conta estiver aberta.'));

  form.append(campo(
    obrigatorio ? 'Senha provisória que você recebeu' : 'Senha atual',
    'password',
    'atual',
    { required: true, minlength: 1, maxlength: 128, autocomplete: 'current-password' },
  ));
  form.append(campo('Nova senha (mínimo de 12 caracteres)', 'password', 'nova', {
    required: true, minlength: 12, maxlength: 128, autocomplete: 'new-password',
  }));
  form.append(campo('Repita a nova senha', 'password', 'confirmacao', {
    required: true, minlength: 12, maxlength: 128, autocomplete: 'new-password',
  }));

  const enviar = botao('Salvar nova senha');
  enviar.type = 'submit';
  form.append(enviar);

  form.addEventListener('submit', async evento => {
    evento.preventDefault();
    const dados = new FormData(form);
    const nova = String(dados.get('nova'));
    if (nova !== String(dados.get('confirmacao'))) {
      ctx.informar('As duas senhas novas não são iguais.', 'erro');
      return;
    }
    enviar.disabled = true;
    try {
      await authApi.alterarSenha(String(dados.get('atual')), nova);
      ctx.atualizarUsuario({ senha_provisoria: false });
      ctx.informar('Senha atualizada. Os outros aparelhos foram desconectados.', 'sucesso');
      form.reset();
      if (aoConcluir) aoConcluir();
    } catch (erro) {
      ctx.informar(texto(erro), 'erro');
    } finally {
      enviar.disabled = false;
    }
  });

  return form;
}

/* Tela cheia mostrada enquanto a senha provisória não for trocada. */
export function renderTrocaObrigatoria(painel, ctx) {
  painel.replaceChildren();
  const bloco = elemento('div', 'plataforma-intro');
  bloco.append(
    elemento('h3', '', 'Sua senha foi redefinida'),
    elemento('p', '', 'Antes de voltar ao Jardim, defina uma senha que só você conheça.'),
  );
  painel.append(bloco);

  const grade = elemento('div', 'plataforma-auth-grid');
  grade.append(formularioSenha(ctx, {
    obrigatorio: true,
    aoConcluir: () => {
      ctx.renderInicial();
      ctx.tentarFechar();
    },
  }));

  const sair = botao('Sair da conta', 'plataforma-botao--secundario', () => ctx.sair());
  grade.append(sair);
  painel.append(grade);
}
