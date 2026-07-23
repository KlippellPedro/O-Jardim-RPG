import { renderSelecaoCatalogo } from './selecaoCatalogo.js';

function renderVariantes(container, estado, raca, ctx) {
  if (!Array.isArray(raca?.variantes) || raca.variantes.length === 0) return;

  const titulo = document.createElement('h3');
  titulo.className = 'ficha-wizard-subtitulo';
  titulo.textContent = raca.rotulo_variante
    || (raca.id === 'automato' ? 'Chassi' : 'Morfologia racial');
  container.appendChild(titulo);

  const aviso = document.createElement('p');
  aviso.className = 'ficha-wizard-aviso';
  aviso.textContent = raca.descricao_variantes || (raca.id === 'automato'
    ? 'O chassi define seus ajustes físicos, Vida, Movimento e dano natural.'
    : 'Esta raça exige uma variante. A escolha altera seus recursos e sua característica racial.');
  container.appendChild(aviso);

  const grade = document.createElement('div');
  grade.className = 'ficha-wizard-opcoes';
  raca.variantes.forEach(variante => {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'ficha-wizard-opcao';
    if (estado.escolhaRacial?.varianteId === variante.id) {
      botao.classList.add('ficha-wizard-opcao--selecionada');
    }
    const vida = Number(variante.vida) || 0;
    const mana = Number(variante.mana) || 0;
    const movimento = Number.isFinite(Number(variante.movimento_fixo))
      ? ` · Movimento ${variante.movimento_fixo} m`
      : '';
    botao.textContent = `${variante.titulo} · Vida ${vida >= 0 ? '+' : ''}${vida} · Mana ${mana >= 0 ? '+' : ''}${mana}${movimento}`;
    botao.addEventListener('click', () => {
      estado.escolhaRacial = { ...(estado.escolhaRacial || {}), varianteId: variante.id };
      ctx.atualizar();
    });
    grade.appendChild(botao);
  });
  container.appendChild(grade);
}

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
        estado.escolhaRacial = {};
        estado.periciasIniciais = [];
      }
      ctx.atualizar();
    },
    bloquearItem: item => item.disponibilidade === 'restrita',
    motivoBloqueio: () => 'Raças especiais exigem autorização do mestre e não podem ser escolhidas na criação comum.',
  });

  const raca = ctx.catalogo.racas.find(item => item.id === estado.racaId) || null;
  renderVariantes(container, estado, raca, ctx);
}
