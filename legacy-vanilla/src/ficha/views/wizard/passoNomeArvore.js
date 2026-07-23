export function renderPassoNomeArvore(container, estado, ctx) {
  const campoNome = document.createElement('label');
  campoNome.className = 'ficha-campo';
  const labelNome = document.createElement('span');
  labelNome.className = 'ficha-campo-label';
  labelNome.textContent = 'Nome do personagem';
  campoNome.appendChild(labelNome);

  const inputNome = document.createElement('input');
  inputNome.type = 'text';
  inputNome.className = 'ficha-campo-input';
  inputNome.placeholder = 'Ex.: Kael Sombraverde';
  inputNome.value = estado.nome;
  // Só atualiza a validade do botão "Avançar" — evita reconstruir o passo
  // inteiro (e perder a posição do cursor) a cada tecla digitada.
  inputNome.addEventListener('input', () => {
    estado.nome = inputNome.value;
    ctx.atualizarValidade();
  });
  campoNome.appendChild(inputNome);
  container.appendChild(campoNome);

  if (ctx.arvoresDisponiveis.length === 0) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-wizard-aviso';
    aviso.textContent = 'Nenhuma Árvore foi descoberta ainda em Mundo — explore o Mundo primeiro pra desbloquear de onde seu personagem pode vir.';
    container.appendChild(aviso);
    inputNome.focus();
    return;
  }

  const campoArvore = document.createElement('div');
  campoArvore.className = 'ficha-campo';
  const labelArvore = document.createElement('span');
  labelArvore.className = 'ficha-campo-label';
  labelArvore.textContent = 'Árvore de origem';
  campoArvore.appendChild(labelArvore);

  const grade = document.createElement('div');
  grade.className = 'ficha-wizard-opcoes';
  ctx.arvoresDisponiveis.forEach(arvore => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ficha-wizard-opcao';
    if (estado.arvoreId === arvore.id) btn.classList.add('ficha-wizard-opcao--selecionada');
    btn.textContent = arvore.titulo;
    btn.addEventListener('click', () => {
      if (estado.arvoreId !== arvore.id) {
        estado.arvoreId = arvore.id;
        estado.racaId = null;
        estado.classeId = null;
      }
      ctx.atualizar();
    });
    grade.appendChild(btn);
  });
  campoArvore.appendChild(grade);
  container.appendChild(campoArvore);

  inputNome.focus();
}
