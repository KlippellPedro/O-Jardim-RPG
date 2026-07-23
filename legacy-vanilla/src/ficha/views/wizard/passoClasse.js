import { renderSelecaoCatalogo } from './selecaoCatalogo.js';

export function renderPassoClasse(container, estado, ctx) {
  const arvore = ctx.arvoresDisponiveis.find(a => a.id === estado.arvoreId);
  renderSelecaoCatalogo(container, {
    lista: ctx.catalogo.classes,
    arvoreId: estado.arvoreId,
    arvoreTitulo: arvore?.titulo || '',
    valorSelecionado: estado.classeId,
    tipoLabel: 'classe',
    aoSelecionar: (id) => { estado.classeId = id; ctx.atualizar(); },
    bloquearItem: item => item.categoria !== 'padrao',
    motivoBloqueio: () => 'Classes especiais exigem nível total 15 e não podem ser a classe inicial.',
  });
}
