import { campanhasApi } from '../campanhasApi.js';
import {
  ROTULOS_PAPEL,
  acao,
  ajuda,
  botao,
  campo,
  cartao,
  elemento,
  selo,
  texto,
  vazio,
} from './ui.js';

export function renderCampanhas(area, ctx) {
  const { estado } = ctx;
  const card = cartao(
    'Suas campanhas',
    'Entre por convite, troque de mesa ou arquive as que terminaram.',
    { larga: true },
  );
  card.cabecalho?.append(ajuda('O cargo global Mestre permite criar campanhas. O papel dentro de cada campanha define o que você pode fazer naquela mesa.'));

  const acoes = elemento('div', 'plataforma-controles plataforma-controles--compactos');
  acoes.append(botao('Usar código de convite', 'plataforma-botao--secundario', () => ctx.abrirEntradaCampanha('entrar')));
  if (ctx.podeCriarCampanha()) {
    acoes.append(botao('Nova campanha', '', () => ctx.abrirEntradaCampanha('criar')));
  }
  card.append(acoes);

  const lista = elemento('div', 'plataforma-campanhas-lista');
  if (!estado.campanhas.length) {
    lista.append(vazio('Você ainda não participa de nenhuma campanha.'));
  }

  estado.campanhas.forEach(campanha => {
    const item = elemento('article', 'plataforma-campanha-item');
    const identidade = elemento('div');
    const nome = elemento('strong', '', campanha.nome);
    if (campanha.id === estado.campanha?.id) nome.append(' ', selo('Atual', 'ouro'));
    identidade.append(nome);
    identidade.append(elemento('span', '', `Seu papel: ${ROTULOS_PAPEL[campanha.papel] || campanha.papel}`));
    if (campanha.descricao) identidade.append(elemento('small', '', campanha.descricao));

    const selecionar = acao('Selecionar', 'plataforma-botao--secundario', async () => {
      try {
        await ctx.recarregar(campanha.id);
        ctx.informar(`Campanha atual: ${campanha.nome}.`, 'sucesso');
        ctx.renderPainel('campanhas');
      } catch (erro) {
        ctx.informar(texto(erro), 'erro');
      }
    });
    if (campanha.id === estado.campanha?.id) {
      selecionar.textContent = 'Campanha atual';
      selecionar.disabled = true;
    }
    item.append(identidade, selecionar);

    if (campanha.papel === 'mestre') {
      const detalhes = document.createElement('details');
      detalhes.className = 'plataforma-editor-campanha';
      const resumo = document.createElement('summary');
      resumo.textContent = 'Editar campanha';
      detalhes.append(resumo);

      const form = document.createElement('form');
      form.append(
        campo('Nome da campanha', 'text', 'nome', { required: true, minlength: 2, maxlength: 100, value: campanha.nome }),
        campo('Descrição', 'text', 'descricao', { maxlength: 2000, value: campanha.descricao || '' }),
      );
      const salvar = botao('Salvar alterações');
      salvar.type = 'submit';
      form.append(salvar, acao('Arquivar', 'plataforma-botao--perigo', async () => {
        try {
          await campanhasApi.arquivar(campanha.id);
          await ctx.recarregar();
          ctx.informar('Campanha arquivada sem apagar os dados.', 'sucesso');
          ctx.renderInicial();
        } catch (erro) {
          ctx.informar(texto(erro), 'erro');
        }
      }, { confirmar: `Arquivar “${campanha.nome}”? Os dados são preservados, mas ela sai do acesso normal.` }));

      form.addEventListener('submit', async evento => {
        evento.preventDefault();
        salvar.disabled = true;
        try {
          const dados = new FormData(form);
          await campanhasApi.editar(campanha.id, {
            nome: dados.get('nome'),
            descricao: dados.get('descricao'),
          });
          await ctx.recarregar(campanha.id);
          ctx.informar('Campanha atualizada.', 'sucesso');
          ctx.renderPainel('campanhas');
        } catch (erro) {
          ctx.informar(texto(erro), 'erro');
          salvar.disabled = false;
        }
      });
      detalhes.append(form);
      item.append(detalhes);
    }
    lista.append(item);
  });

  card.append(lista);
  area.append(card);
}
