import { renderSelecaoCatalogo } from './selecaoCatalogo.js';
import { pacoteRacial } from '../../config/regrasRaciais.js';

export function renderPassoRaca(container, estado, ctx) {
  const arvore = ctx.arvoresDisponiveis.find(a => a.id === estado.arvoreId);
  renderSelecaoCatalogo(container, {
    lista: ctx.catalogo.racas,
    arvoreId: estado.arvoreId,
    arvoreTitulo: arvore?.titulo || '',
    valorSelecionado: estado.racaId,
    tipoLabel: 'raça',
    aoSelecionar: (id) => {
      if (estado.racaId !== id) {
        estado.racaId = id;
        estado.periciaRacialEscolhida = null;
        estado.escolhaGigante = null;
        estado.acessorioInicial = '';
      }
      ctx.atualizar();
    },
    bloquearItem: item => Boolean(item.pendente) || pacoteRacial(item).incompleto,
    motivoBloqueio: () => 'O pacote mecânico desta raça ainda não foi publicado.',
  });
}
