// Último passo — só revisão, nada pra escolher aqui. Mostra o resumo (nome,
// Árvore, raça, classe) e tudo que os passos anteriores já calcularam
// (atributos finais, Vida/Mana/Movimento/Lunaris), para a ficha nascer
// com a maioria das informações iniciais preenchidas.

import {
  ATRIBUTOS, aplicarModificadoresRaciais, calcularDerivados, calcularLunarisInicial, legadosAscensaoIniciais,
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

  const finais = aplicarModificadoresRaciais(valoresBase, raca, {
    escolhaGigante: estado.escolhaGigante,
  });
  const derivados = calcularDerivados(finais, raca);
  const lunaris = calcularLunarisInicial(raca);
  const legados = legadosAscensaoIniciais(raca);

  const preview = document.createElement('div');
  preview.className = 'ficha-wizard-preview';

  const tituloPreview = document.createElement('h3');
  tituloPreview.className = 'ficha-wizard-subtitulo';
  tituloPreview.textContent = 'Atributos e recursos iniciais';
  preview.appendChild(tituloPreview);

  const linhas = [
    ...ATRIBUTOS.map(chave => [NOMES_ATRIBUTOS[chave], finais[chave]]),
    ['Vida', derivados.vida],
    ['Mana', derivados.mana],
    ['Movimento', `${derivados.movimento} m`],
    ['Defesa Natural', derivados.defesaNatural],
    ['Iniciativa', derivados.iniciativa],
    ['Lunaris inicial', lunaris],
  ];
  preview.appendChild(criarListaStats(linhas));
  container.appendChild(preview);

  const escolhas = document.createElement('div');
  escolhas.className = 'ficha-wizard-preview';
  const tituloEscolhas = document.createElement('h3');
  tituloEscolhas.className = 'ficha-wizard-subtitulo';
  tituloEscolhas.textContent = 'Treinamento inicial';
  escolhas.appendChild(tituloEscolhas);
  const pericias = document.createElement('p');
  pericias.className = 'ficha-wizard-intro';
  pericias.textContent = `${estado.periciasIniciais.length} perícias em Aprendiz${estado.periciaRacialEscolhida ? ' e uma escolha racial em Treinado' : ''}.`;
  escolhas.appendChild(pericias);
  const item = document.createElement('p');
  item.className = 'ficha-wizard-intro';
  item.textContent = estado.itemInicial?.trim()
    ? `Item inicial: ${estado.itemInicial.trim()}.`
    : 'Esta raça não recebe item inicial.';
  escolhas.appendChild(item);
  if (estado.acessorioInicial?.trim()) {
    const acessorio = document.createElement('p');
    acessorio.className = 'ficha-wizard-intro';
    acessorio.textContent = `Acessório humano: ${estado.acessorioInicial.trim()}.`;
    escolhas.appendChild(acessorio);
  }
  container.appendChild(escolhas);

  if (legados > 0) {
    const avisoLegado = document.createElement('p');
    avisoLegado.className = 'ficha-wizard-aviso';
    const plural = legados > 1 ? 'Legados de Ascensão' : 'Legado de Ascensão';
    avisoLegado.textContent = `Depois de criado, escolha ${legados} ${plural} na aba Poderes.`;
    container.appendChild(avisoLegado);
  }

  if (classe?.pendente || classe?.mecanicaPendente) {
    const avisoClasse = document.createElement('p');
    avisoClasse.className = 'ficha-wizard-aviso';
    avisoClasse.textContent = 'As Identidades e os Poderes desta classe estão Em desenvolvimento; a estrutura universal de níveis já será aplicada.';
    container.appendChild(avisoClasse);
  }
}
