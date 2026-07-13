// Compartilhado pelos passos de Raça e Classe — filtra pela Árvore
// escolhida (campo "arvore" em data/ficha/racas.json/classes.json), com
// fallback pra mostrar tudo enquanto esse campo ainda não foi preenchido
// (hoje está null em toda raça/classe — ver conversa sobre o wizard).

function agruparPorCategoria(lista) {
  return {
    comuns: lista.filter(item => item.categoria === 'padrao'),
    especiais: lista.filter(item => item.categoria !== 'padrao'),
  };
}

export function renderSelecaoCatalogo(container, {
  lista,
  arvoreId,
  arvoreTitulo,
  valorSelecionado,
  aoSelecionar,
  tipoLabel,
  bloquearItem = () => false,
  motivoBloqueio = () => '',
}) {
  const filtrada = lista.filter(item => item.arvore === arvoreId);
  const usandoFiltro = filtrada.length > 0;
  const itens = usandoFiltro ? filtrada : lista;

  if (!usandoFiltro) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-wizard-aviso';
    aviso.textContent = `Nenhuma ${tipoLabel} associada à Árvore de ${arvoreTitulo} ainda — mostrando todas as ${lista.length}.`;
    container.appendChild(aviso);
  }

  const { comuns, especiais } = agruparPorCategoria(itens);

  function renderGrupo(rotulo, grupoItens) {
    if (grupoItens.length === 0) return;

    const tituloGrupo = document.createElement('h3');
    tituloGrupo.className = 'ficha-wizard-subtitulo';
    tituloGrupo.textContent = rotulo;
    container.appendChild(tituloGrupo);

    const grade = document.createElement('div');
    grade.className = 'ficha-wizard-opcoes';
    grupoItens.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ficha-wizard-opcao';
      const bloqueado = bloquearItem(item);
      if (valorSelecionado === item.id) btn.classList.add('ficha-wizard-opcao--selecionada');
      const emDesenvolvimento = item.pendente || item.mecanicaPendente;
      if (emDesenvolvimento) {
        btn.classList.add('ficha-wizard-opcao--pendente');
      }
      btn.disabled = bloqueado;
      btn.title = bloqueado
        ? motivoBloqueio(item)
        : emDesenvolvimento ? 'Dados mecânicos ainda incompletos para esta opção.' : '';
      btn.textContent = emDesenvolvimento ? `${item.titulo} · Em desenvolvimento` : item.titulo;
      btn.addEventListener('click', () => aoSelecionar(item.id));
      grade.appendChild(btn);
    });
    container.appendChild(grade);
  }

  renderGrupo('Comuns', comuns);
  if (especiais.length > 0) {
    const notaEspecial = document.createElement('p');
    notaEspecial.className = 'ficha-wizard-aviso';
    notaEspecial.textContent = tipoLabel === 'classe'
      ? 'Classes especiais só podem ser obtidas a partir do nível total 15 e não podem ser escolhidas na criação.'
      : 'Raças especiais exigem autorização do mestre e uma origem compatível com a Árvore da campanha.';
    container.appendChild(notaEspecial);
  }
  renderGrupo('Especiais', especiais);
}
