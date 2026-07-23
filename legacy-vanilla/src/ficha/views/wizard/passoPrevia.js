// Último passo — só revisão, nada pra escolher aqui. Mostra o resumo (nome,
// Árvore, raça, classe) e tudo que os passos anteriores já calcularam
// (atributos finais, Vida/Mana/Movimento/Lunaris), para a ficha nascer
// com a maioria das informações iniciais preenchidas.

import {
  ATRIBUTOS,
  aplicarAjustesAtributosRaciais,
  normalizarAtributosIniciais,
  calcularDerivados,
  calcularLunarisInicial,
} from '../../services/calculoService.js';
import { criarListaStats } from '../statLista.js';
import { obterAtributosBase } from './estadoAtributos.js';
import { NOMES_ATRIBUTOS } from '../../config/nomesAtributos.js';

export function renderPassoPrevia(container, estado, ctx) {
  const arvore = ctx.arvoresDisponiveis.find(a => a.id === estado.arvoreId);
  const raca = ctx.catalogo.racas.find(r => r.id === estado.racaId) || null;
  const classe = ctx.catalogo.classes.find(c => c.id === estado.classeId) || null;

  const cabecalho = document.createElement('div');
  cabecalho.className = 'ficha-wizard-previa-cabecalho';

  const nome = document.createElement('span');
  nome.className = 'ficha-wizard-previa-nome';
  nome.textContent = estado.nome;
  cabecalho.appendChild(nome);

  const subtitulo = document.createElement('span');
  subtitulo.className = 'ficha-wizard-previa-subtitulo';
  subtitulo.textContent = [arvore?.titulo, raca?.titulo, classe?.titulo].filter(Boolean).join(' · ');
  cabecalho.appendChild(subtitulo);

  container.appendChild(cabecalho);

  const valoresBase = obterAtributosBase(estado);
  if (!valoresBase) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-wizard-aviso';
    aviso.textContent = 'Volte pro passo de Atributos e complete a distribuição antes de continuar.';
    container.appendChild(aviso);
    return;
  }

  const finais = normalizarAtributosIniciais(valoresBase);
  const efetivos = aplicarAjustesAtributosRaciais(finais, raca, estado.escolhaRacial);
  const variante = raca?.variantes?.find(item => item.id === estado.escolhaRacial?.varianteId) || null;
  const derivados = calcularDerivados(finais, raca, 1, estado.escolhaRacial);
  const lunaris = calcularLunarisInicial();

  const preview = document.createElement('div');
  preview.className = 'ficha-wizard-preview';

  const tituloPreview = document.createElement('h3');
  tituloPreview.className = 'ficha-wizard-subtitulo';
  tituloPreview.textContent = 'Atributos e recursos iniciais';
  preview.appendChild(tituloPreview);

  const linhas = [
    ...ATRIBUTOS.map(chave => [NOMES_ATRIBUTOS[chave], efetivos[chave]]),
    ['Vida', derivados.vida],
    [raca?.nome_mana || 'Mana', derivados.mana],
    ['Movimento', `${derivados.movimento} m`],
    ['Defesa Natural', derivados.defesaNatural],
    ['Iniciativa', derivados.iniciativa],
    ['Lunaris inicial', lunaris],
    ...(variante ? [[
      raca?.rotulo_variante || (raca?.id === 'automato' ? 'Chassi' : 'Morfologia racial'),
      variante.titulo,
    ]] : []),
    ['Vida em cada próximo nível desta classe', `+${classe?.vida ?? 0} + Mod.Constituição (mínimo 1)`],
    ['Mana em cada próximo nível desta classe', `+${classe?.mana ?? 0} (mínimo 1)`],
  ];
  preview.appendChild(criarListaStats(linhas));
  container.appendChild(preview);

  const referenciasRaciais = [
    ...(raca?.fisiologia || []).map(descricao => ({ titulo: 'Fisiologia', descricao })),
    ...(raca?.caracteristicas || []),
    ...(variante?.caracteristicas || []),
  ];
  if (referenciasRaciais.length > 0) {
    const blocoRacial = document.createElement('div');
    blocoRacial.className = 'ficha-wizard-preview';
    const tituloRacial = document.createElement('h3');
    tituloRacial.className = 'ficha-wizard-subtitulo';
    tituloRacial.textContent = 'Características raciais';
    const listaRacial = document.createElement('ul');
    listaRacial.className = 'regras-list';
    referenciasRaciais.forEach(referencia => {
      const itemRacial = document.createElement('li');
      itemRacial.textContent = `${referencia.titulo}: ${referencia.descricao}`;
      listaRacial.appendChild(itemRacial);
    });
    blocoRacial.append(tituloRacial, listaRacial);
    container.appendChild(blocoRacial);
  }

  const escolhas = document.createElement('div');
  escolhas.className = 'ficha-wizard-preview';
  const tituloEscolhas = document.createElement('h3');
  tituloEscolhas.className = 'ficha-wizard-subtitulo';
  tituloEscolhas.textContent = 'Treinamento inicial';
  escolhas.appendChild(tituloEscolhas);
  const pericias = document.createElement('p');
  pericias.className = 'ficha-wizard-intro';
  pericias.textContent = `${estado.periciasIniciais.length} perícias em Aprendiz.`;
  escolhas.appendChild(pericias);
  const item = document.createElement('p');
  item.className = 'ficha-wizard-intro';
  item.textContent = `Item inicial: ${estado.itemInicial.trim()}.`;
  escolhas.appendChild(item);
  container.appendChild(escolhas);
}
