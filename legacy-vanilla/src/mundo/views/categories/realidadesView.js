import { router } from '../../../core/router.js';
import { categoriaPorTipo } from '../../config/categorias.js';
import { TEMA_PADRAO, temaDeEntrada } from '../../config/temas.js';
import { getEntradas } from '../../services/entradasService.js';
import { humanizarSlug } from '../../utils/texto.js';
import { content } from '../dom.js';

function navegarParaEntrada(entrada) {
  const categoria = categoriaPorTipo(entrada.tipo);
  if (categoria) router.navegar(`/${categoria.id}/${entrada.id}`);
}

function criarGrupoArvore(arvore, arvoreId, galhos) {
  const tema = arvore ? temaDeEntrada(arvore) : TEMA_PADRAO;
  const titulo = arvore ? arvore.titulo : humanizarSlug(arvoreId);
  const mapa = getEntradas();

  const grupo = document.createElement('section');
  grupo.className = 'galho-grupo';

  const header = document.createElement('div');
  header.className = 'galho-grupo-header';
  header.style.setProperty('--accent', tema.cor);

  const simbolo = document.createElement('span');
  simbolo.className = 'galho-grupo-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = tema.simbolo;

  const h3 = document.createElement('h3');
  h3.className = 'galho-grupo-titulo';
  h3.textContent = titulo;

  header.append(simbolo, h3);
  grupo.appendChild(header);

  const lista = document.createElement('div');
  lista.className = 'galho-lista';

  galhos
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(galho => {
      const item = document.createElement('div');
      item.className = 'galho-item';

      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'galho-item-link';
      botao.textContent = galho.titulo;
      botao.addEventListener('click', () => navegarParaEntrada(galho));
      item.appendChild(botao);

      const dimensoes = Object.values(mapa)
        .filter(entrada => entrada.tipo === 'dimensao' && entrada.conteudo?.galho === galho.id);

      if (dimensoes.length > 0) {
        const sublista = document.createElement('div');
        sublista.className = 'dimensao-sublista';

        dimensoes
          .slice()
          .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
          .forEach(dimensao => {
            const subBotao = document.createElement('button');
            subBotao.type = 'button';
            subBotao.className = 'dimensao-sublista-link';
            subBotao.textContent = dimensao.titulo;
            subBotao.addEventListener('click', () => navegarParaEntrada(dimensao));
            sublista.appendChild(subBotao);
          });

        item.appendChild(sublista);
      }

      lista.appendChild(item);
    });

  grupo.appendChild(lista);
  return grupo;
}

function criarGrupoDimensoesOrfas(dimensoes) {
  const grupo = document.createElement('section');
  grupo.className = 'galho-grupo';

  const header = document.createElement('div');
  header.className = 'galho-grupo-header';
  header.style.setProperty('--accent', TEMA_PADRAO.cor);

  const simbolo = document.createElement('span');
  simbolo.className = 'galho-grupo-simbolo';
  simbolo.setAttribute('aria-hidden', 'true');
  simbolo.textContent = TEMA_PADRAO.simbolo;

  const titulo = document.createElement('h3');
  titulo.className = 'galho-grupo-titulo';
  titulo.textContent = 'Outras Dimensões';

  header.append(simbolo, titulo);
  grupo.appendChild(header);

  const sublista = document.createElement('div');
  sublista.className = 'dimensao-sublista dimensao-sublista--solta';

  dimensoes
    .slice()
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(dimensao => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'dimensao-sublista-link';
      botao.textContent = dimensao.titulo;
      botao.addEventListener('click', () => navegarParaEntrada(dimensao));
      sublista.appendChild(botao);
    });

  grupo.appendChild(sublista);
  return grupo;
}

export function renderizarRealidades(entradas) {
  const mapa = getEntradas();
  const galhos = entradas.filter(entrada => entrada.tipo === 'galho' || entrada.tipo === 'realidade');
  const dimensoes = entradas.filter(entrada => entrada.tipo === 'dimensao');
  const galhosPorArvore = new Map();

  galhos.forEach(galho => {
    const arvoreId = galho.conteudo?.arvore || null;
    if (!galhosPorArvore.has(arvoreId)) galhosPorArvore.set(arvoreId, []);
    galhosPorArvore.get(arvoreId).push(galho);
  });

  Array.from(galhosPorArvore.entries())
    .map(([arvoreId, galhosDoGrupo]) => ({
      arvore: arvoreId ? mapa[arvoreId] : null,
      arvoreId,
      titulo: arvoreId && mapa[arvoreId]
        ? mapa[arvoreId].titulo
        : humanizarSlug(arvoreId || 'arvore-nao-identificada'),
      galhos: galhosDoGrupo,
    }))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'))
    .forEach(grupo => {
      content.appendChild(criarGrupoArvore(grupo.arvore, grupo.arvoreId, grupo.galhos));
    });

  const idsGalhosConhecidos = new Set(galhos.map(galho => galho.id));
  const dimensoesOrfas = dimensoes
    .filter(dimensao => !idsGalhosConhecidos.has(dimensao.conteudo?.galho));

  if (dimensoesOrfas.length > 0) {
    content.appendChild(criarGrupoDimensoesOrfas(dimensoesOrfas));
  }
}
