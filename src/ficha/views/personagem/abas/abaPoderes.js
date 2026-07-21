import { atualizarPersonagem } from '../../../services/personagensService.js';
import { GRAUS_PERICIA, obterGrauPericiaEfetivo } from '../../../services/calculoService.js';
import { valorAtributoEfetivo } from '../../../services/modificadoresService.js';
import { renderizarColecaoPoderesHabilidades } from '../colecaoPoderesHabilidades.js';
import { abrirModalSimples, fecharModalSimples } from '../modalSimples.js';

const CONFIG = {
  chave: 'poderes',
  prefixo: 'poder',
  genero: 'm',
  singular: 'Poder',
  plural: 'Poderes',
  descricao: 'Cadastre poderes de classe, Legados de Ascensão, itens, transformações ou qualquer outra origem da campanha.',
};

const NOMES_CAMPOS = {
  forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição',
  inteligencia: 'Inteligência', sabedoria: 'Sabedoria', carisma: 'Carisma',
};

function atendeRequisito(req, personagem) {
  if (Array.isArray(req.ou)) return req.ou.some(sub => atendeRequisito(sub, personagem));
  if (req.atributo && typeof req.valor_minimo === 'number') {
    return valorAtributoEfetivo(personagem, req.atributo) >= req.valor_minimo;
  }
  if (typeof req.nivel_personagem === 'number') return personagem.nivel >= req.nivel_personagem;
  if (req.pericia && req.nivel) {
    const grauAtual = obterGrauPericiaEfetivo(personagem, req.pericia);
    const alvo = String(req.nivel).toLowerCase();
    return GRAUS_PERICIA.indexOf(grauAtual) >= GRAUS_PERICIA.indexOf(alvo);
  }
  return true;
}

function descricaoRequisito(req) {
  if (Array.isArray(req.ou)) return req.ou.map(descricaoRequisito).join(' ou ');
  if (req.atributo && typeof req.valor_minimo === 'number') return `${NOMES_CAMPOS[req.atributo] || req.atributo} ≥ ${req.valor_minimo}`;
  if (typeof req.nivel_personagem === 'number') return `Nível ${req.nivel_personagem}`;
  if (req.pericia && req.nivel) return `${req.pericia} ${req.nivel}`;
  return '';
}

function possuiRequisitoDeNivel(req) {
  if (Array.isArray(req.ou)) return req.ou.some(possuiRequisitoDeNivel);
  return typeof req.nivel_personagem === 'number';
}

function removerUma(lista, id) {
  const indice = lista.lastIndexOf(id);
  if (indice < 0) return [...lista];
  return [...lista.slice(0, indice), ...lista.slice(indice + 1)];
}

function criarDescricaoLegado(legado) {
  const descricao = document.createElement('p');
  descricao.className = 'ficha-legado-desc';
  descricao.textContent = legado.descricao;
  return descricao;
}

function abrirEscolhaLegado(personagem, ctx) {
  const escolhidos = personagem.legadosEscolhidos || [];
  const iniciais = personagem.legadosOrigemInicial || [];
  const escolhendoInicial = personagem.legadosIniciaisPendentes > 0;
  const disponiveis = ctx.catalogo.legados.filter(legado => !escolhidos.includes(legado.id));

  const corpo = document.createElement('div');
  corpo.className = 'ficha-legados-escolha';
  const intro = document.createElement('p');
  intro.className = 'ficha-calculo-formula';
  intro.textContent = escolhendoInicial
    ? 'Esta é uma escolha de origem. Legados que exigem nível não podem ser escolhidos neste momento.'
    : 'Escolha um dos Legados que o personagem ainda não possui. Requisitos não atendidos aparecem bloqueados.';
  corpo.appendChild(intro);

  const lista = document.createElement('div');
  lista.className = 'ficha-legados-lista ficha-legados-lista--modal';
  disponiveis.forEach(legado => {
    const atende = (legado.pre_requisitos || []).every(req => atendeRequisito(req, personagem));
    const permitidoComoInicial = !(legado.pre_requisitos || []).some(possuiRequisitoDeNivel);
    const bloqueado = !atende || (escolhendoInicial && !permitidoComoInicial);
    const card = document.createElement('article');
    card.className = 'ficha-legado-card';
    if (bloqueado) card.classList.add('ficha-legado-card--bloqueado');

    const titulo = document.createElement('h3');
    titulo.className = 'ficha-legado-titulo';
    titulo.textContent = legado.titulo;
    card.append(titulo, criarDescricaoLegado(legado));

    if (legado.pre_requisitos?.length) {
      const requisito = document.createElement('p');
      requisito.className = 'ficha-legado-requisito';
      requisito.textContent = `Requer: ${legado.pre_requisitos.map(descricaoRequisito).join(' · ')}`;
      card.appendChild(requisito);
    }

    const escolher = document.createElement('button');
    escolher.type = 'button';
    escolher.className = 'ficha-cta-btn';
    escolher.textContent = bloqueado ? 'Requisito não atendido' : 'Escolher este Legado';
    escolher.disabled = bloqueado;
    escolher.addEventListener('click', () => {
      const usarInicial = personagem.legadosIniciaisPendentes > 0;
      const resultado = atualizarPersonagem(personagem.id, {
        legadosEscolhidos: [...escolhidos, legado.id],
        legadosAscensaoPendentes: Math.max(0, personagem.legadosAscensaoPendentes - 1),
        legadosOrigemInicial: usarInicial ? [...iniciais, legado.id] : iniciais,
        legadosIniciaisPendentes: Math.max(0, personagem.legadosIniciaisPendentes - (usarInicial ? 1 : 0)),
      });
      if (!resultado.ok) {
        ctx.mostrarToast(resultado.mensagem, 'erro');
        return;
      }
      fecharModalSimples();
      ctx.mostrarToast(`${legado.titulo} foi desbloqueado.`, 'sucesso');
      ctx.recarregar();
    });
    card.appendChild(escolher);
    lista.appendChild(card);
  });

  if (!disponiveis.length) {
    const vazio = document.createElement('p');
    vazio.className = 'ficha-colecao-vazio';
    vazio.textContent = 'Todos os Legados disponíveis já foram escolhidos.';
    corpo.appendChild(vazio);
  } else {
    corpo.appendChild(lista);
  }

  abrirModalSimples({
    titulo: 'Escolha seu Legado',
    corpo,
    classeExtra: 'ficha-modal--legados',
  });
}

function criarLegadosDesbloqueados(personagem, ctx) {
  const secao = document.createElement('section');
  secao.className = 'ficha-legados-desbloqueados';
  const cabecalho = document.createElement('header');
  cabecalho.className = 'ficha-legados-desbloqueados-topo';
  const textos = document.createElement('div');
  const titulo = document.createElement('h2');
  titulo.textContent = 'Legados desbloqueados';
  const descricao = document.createElement('p');
  descricao.textContent = 'Aqui aparecem somente os Legados que pertencem a este personagem.';
  textos.append(titulo, descricao);
  cabecalho.appendChild(textos);

  if (personagem.legadosAscensaoPendentes > 0) {
    const escolher = document.createElement('button');
    escolher.type = 'button';
    escolher.className = 'ficha-cta-btn ficha-legados-escolher';
    escolher.textContent = personagem.legadosAscensaoPendentes > 1
      ? `Escolha seu Legado · ${personagem.legadosAscensaoPendentes}`
      : 'Escolha seu Legado';
    escolher.addEventListener('click', () => abrirEscolhaLegado(personagem, ctx));
    cabecalho.appendChild(escolher);
  }
  secao.appendChild(cabecalho);

  const escolhidos = personagem.legadosEscolhidos || [];
  const agrupados = escolhidos.reduce((mapa, id) => mapa.set(id, (mapa.get(id) || 0) + 1), new Map());
  const lista = document.createElement('div');
  lista.className = 'ficha-legados-lista';

  agrupados.forEach((quantidade, id) => {
    const legado = ctx.catalogo.legados.find(item => item.id === id);
    if (!legado) return;
    const card = document.createElement('article');
    card.className = 'ficha-legado-card ficha-legado-card--escolhido';
    const tituloLegado = document.createElement('h3');
    tituloLegado.className = 'ficha-legado-titulo';
    tituloLegado.textContent = quantidade > 1 ? `${legado.titulo} ×${quantidade}` : legado.titulo;
    card.append(tituloLegado, criarDescricaoLegado(legado));

    const desfazer = document.createElement('button');
    desfazer.type = 'button';
    desfazer.className = 'ficha-cta-btn ficha-cta-btn--secundario';
    desfazer.textContent = 'Remover escolha';
    desfazer.addEventListener('click', () => {
      const iniciais = personagem.legadosOrigemInicial || [];
      const eraInicial = iniciais.includes(legado.id);
      const resultado = atualizarPersonagem(personagem.id, {
        legadosEscolhidos: removerUma(escolhidos, legado.id),
        legadosAscensaoPendentes: personagem.legadosAscensaoPendentes + 1,
        legadosOrigemInicial: eraInicial ? removerUma(iniciais, legado.id) : iniciais,
        legadosIniciaisPendentes: personagem.legadosIniciaisPendentes + (eraInicial ? 1 : 0),
      });
      if (!resultado.ok) {
        ctx.mostrarToast(resultado.mensagem, 'erro');
        return;
      }
      ctx.mostrarToast(`${legado.titulo} voltou para as escolhas disponíveis.`, 'info');
      ctx.recarregar();
    });
    card.appendChild(desfazer);
    lista.appendChild(card);
  });

  if (!lista.children.length) {
    const vazio = document.createElement('div');
    vazio.className = 'ficha-colecao-vazio';
    const texto = document.createElement('span');
    texto.textContent = personagem.legadosAscensaoPendentes > 0
      ? 'Nenhum Legado foi escolhido ainda. Use o botão acima para desbloquear um.'
      : 'Este personagem ainda não possui Legados desbloqueados.';
    vazio.appendChild(texto);
    secao.appendChild(vazio);
  } else {
    secao.appendChild(lista);
  }
  return secao;
}

export function renderAbaPoderes(container, personagem, ctx) {
  renderizarColecaoPoderesHabilidades(container, personagem, ctx, CONFIG);
  container.appendChild(criarLegadosDesbloqueados(personagem, ctx));
}
