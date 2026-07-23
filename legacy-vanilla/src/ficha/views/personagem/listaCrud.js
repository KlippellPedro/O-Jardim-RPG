// Lista genérica de itens editáveis — Inventário, Ataques, Magias e Aliados
// só declaram os campos; adicionar/editar/remover e persistência (via
// aoSalvar) são compartilhados aqui em vez de reimplementados 4 vezes.

function gerarId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function valorPadrao(campo) {
  if ('padrao' in campo) return campo.padrao;
  if (campo.tipo === 'numero') return 0;
  if (campo.tipo === 'select') return campo.opcoes?.[0]?.valor ?? '';
  return '';
}

export function renderizarListaCrud(container, { itens, campos, campoTitulo, textoVazio, textoAdicionar, aoSalvar }) {
  let lista = Array.isArray(itens) ? itens : [];

  const raiz = document.createElement('div');
  raiz.className = 'ficha-crud';

  if (lista.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'ficha-crud-vazio';
    vazio.textContent = textoVazio;
    raiz.appendChild(vazio);
  }

  lista.forEach((item) => {
    const linha = document.createElement('div');
    linha.className = 'ficha-crud-item';

    const camposEl = document.createElement('div');
    camposEl.className = 'ficha-crud-campos';

    campos.forEach(campo => {
      const grupo = document.createElement('label');
      grupo.className = 'ficha-campo ficha-crud-campo';
      if (campo.largo) grupo.classList.add('ficha-crud-campo--largo');

      const rotulo = document.createElement('span');
      rotulo.className = 'ficha-campo-label';
      rotulo.textContent = campo.rotulo;
      grupo.appendChild(rotulo);

      let input;
      if (campo.tipo === 'textarea') {
        input = document.createElement('textarea');
        input.rows = 2;
        input.className = 'ficha-campo-input ficha-crud-textarea';
      } else if (campo.tipo === 'select') {
        input = document.createElement('select');
        input.className = 'ficha-campo-select';
        (campo.opcoes || []).forEach(op => {
          const opt = document.createElement('option');
          opt.value = op.valor;
          opt.textContent = op.rotulo;
          input.appendChild(opt);
        });
      } else {
        input = document.createElement('input');
        input.type = campo.tipo === 'numero' ? 'number' : 'text';
        input.className = 'ficha-campo-input';
      }

      input.value = item[campo.chave] ?? '';
      input.addEventListener('change', () => {
        const valor = campo.tipo === 'numero' ? (Number(input.value) || 0) : input.value;
        const nova = lista.map(i => (i.id === item.id ? { ...i, [campo.chave]: valor } : i));
        lista = nova;
        aoSalvar(nova, { estrutural: false });
      });

      grupo.appendChild(input);
      camposEl.appendChild(grupo);
    });

    linha.appendChild(camposEl);

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'ficha-crud-remover';
    remover.textContent = '✕';
    remover.setAttribute('aria-label', `Remover ${item[campoTitulo] || 'item'}`);
    remover.addEventListener('click', () => {
      aoSalvar(lista.filter(i => i.id !== item.id), { estrutural: true });
    });
    linha.appendChild(remover);

    raiz.appendChild(linha);
  });

  const adicionar = document.createElement('button');
  adicionar.type = 'button';
  adicionar.className = 'ficha-cta-btn ficha-crud-adicionar';
  adicionar.textContent = textoAdicionar;
  adicionar.addEventListener('click', () => {
    const novoItem = { id: gerarId() };
    campos.forEach(campo => { novoItem[campo.chave] = valorPadrao(campo); });
    aoSalvar([...lista, novoItem], { estrutural: true });
  });
  raiz.appendChild(adicionar);

  container.appendChild(raiz);
}
