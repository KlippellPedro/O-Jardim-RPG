import { recompensasAteNivel } from '../../../config/progressao.js';
import { NOMES_ATRIBUTOS } from '../../../config/nomesAtributos.js';
import {
  capacidadeModificacoesRaciais,
  obterFragmentosRaciaisConhecidos,
  obterFragmentosRaciaisExpressos,
  obterMaldicoesRaciaisConhecidas,
  obterModificacoesRaciaisInstaladas,
} from '../../../services/calculoService.js';
import { renderizarColecaoPoderesHabilidades } from '../colecaoPoderesHabilidades.js';

const CONFIG = {
  chave: 'habilidades',
  prefixo: 'habilidade',
  genero: 'f',
  singular: 'Habilidade',
  plural: 'Habilidades',
  descricao: 'Registre habilidades de classe, raça, itens ou acontecimentos da campanha no momento em que forem adquiridas.',
};

function criarReferencias(personagem, catalogo) {
  const detalhes = document.createElement('details');
  detalhes.className = 'ficha-colecao-referencias';
  const resumo = document.createElement('summary');
  resumo.textContent = 'Progressão universal e recursos raciais';
  detalhes.appendChild(resumo);
  const conteudo = document.createElement('div');
  conteudo.className = 'ficha-colecao-referencias-conteudo';

  (personagem.classes || []).forEach(classePersonagem => {
    const classe = catalogo.classes.find(item => item.id === classePersonagem.id);
    const bloco = document.createElement('section');
    const titulo = document.createElement('h3');
    titulo.textContent = `${classe?.titulo || 'Classe a definir'} · nível ${classePersonagem.nivel}`;
    const lista = document.createElement('ul');
    recompensasAteNivel(classePersonagem.nivel).forEach(item => {
      const linha = document.createElement('li');
      linha.textContent = `Nível ${item.nivel}: ${item.recompensa}`;
      lista.appendChild(linha);
    });
    bloco.append(titulo, lista);
    conteudo.appendChild(bloco);
  });

  const raca = catalogo.racas.find(item => item.id === personagem.racaId);
  const blocoRaca = document.createElement('section');
  const tituloRaca = document.createElement('h3');
  tituloRaca.textContent = `Raça · ${raca?.titulo || 'a definir'}`;
  const textoRaca = document.createElement('p');
  const variante = raca?.variantes?.find(item => item.id === personagem.escolhaRacial?.varianteId) || null;
  const linhagem = raca?.linhagens?.find(item => item.id === personagem.escolhaRacial?.linhagemId) || null;
  const condicaoAncestral = raca?.condicoes_ancestrais?.find(
    item => item.id === personagem.escolhaRacial?.condicaoAncestralId,
  ) || null;
  const conhecimentosExtremos = (personagem.escolhaRacial?.conhecimentosExtremos || [])
    .map(item => String(item || '').trim())
    .filter(Boolean);
  const atributosRaciais = (personagem.escolhaRacial?.atributosRaciais || [])
    .map(item => NOMES_ATRIBUTOS[item] || String(item || '').trim())
    .filter(Boolean);
  const periciasProjeto = (personagem.escolhaRacial?.periciasProjeto || [])
    .map(id => catalogo.pericias?.find(item => item.id === id)?.titulo || id)
    .filter(Boolean);
  const periciasMemoria = (personagem.escolhaRacial?.periciasMemoria || [])
    .map(id => catalogo.pericias?.find(item => item.id === id)?.titulo || id)
    .filter(Boolean);
  const assinatura = raca?.assinaturas?.find(
    item => item.id === personagem.escolhaRacial?.assinaturaFormatoId,
  ) || null;
  const fragmentosConhecidos = obterFragmentosRaciaisConhecidos(
    raca,
    personagem.escolhaRacial,
  );
  const fragmentosExpressos = obterFragmentosRaciaisExpressos(
    raca,
    personagem.escolhaRacial,
  );
  const maldicoesConhecidas = obterMaldicoesRaciaisConhecidas(
    raca,
    personagem.escolhaRacial,
  );
  const vida = Number(raca?.vida) || 0;
  const mana = Number(raca?.mana) || 0;
  const vidaVariante = Number(variante?.vida) || 0;
  const manaVariante = Number(variante?.mana) || 0;
  const nomeMana = raca?.nome_mana || 'Mana';
  const modificacoesInstaladas = obterModificacoesRaciaisInstaladas(
    raca,
    personagem.escolhaRacial,
    personagem.nivel,
  );
  const capacidadeModificacoes = capacidadeModificacoesRaciais(raca, personagem.nivel);
  textoRaca.textContent = `Ajuste inicial: ${vida + vidaVariante >= 0 ? '+' : ''}${vida + vidaVariante} Vida e ${mana + manaVariante >= 0 ? '+' : ''}${mana + manaVariante} ${nomeMana}${variante ? ` · ${raca?.rotulo_variante || 'Variante'}: ${variante.titulo}` : ''}${linhagem ? ` · Linhagem ${linhagem.titulo}` : ''}${condicaoAncestral ? ` · Condição ${condicaoAncestral.titulo}` : ''}${conhecimentosExtremos.length ? ` · Conhecimentos Extremos: ${conhecimentosExtremos.join(' e ')}` : ''}${atributosRaciais.length ? ` · Atributo racial: ${atributosRaciais.join(' e ')}` : ''}${periciasProjeto.length ? ` · Arquivo: ${periciasProjeto.join(' e ')}` : ''}${periciasMemoria.length ? ` · Memórias: ${periciasMemoria.join(', ')}` : ''}${assinatura ? ` · Assinatura: ${personagem.escolhaRacial?.assinaturaNome || assinatura.titulo} (${assinatura.titulo})` : ''}${fragmentosConhecidos.length ? ` · Fragmentos conhecidos: ${fragmentosConhecidos.length}` : ''}${fragmentosExpressos.length ? ` · Expressos: ${fragmentosExpressos.map(item => item.titulo).join(' e ')}` : ''}${maldicoesConhecidas.length ? ` · Maldições: ${maldicoesConhecidas.map(item => item.titulo).join(', ')}` : ''}${capacidadeModificacoes ? ` · Modificações ${modificacoesInstaladas.length}/${capacidadeModificacoes}` : ''}.`;
  blocoRaca.append(tituloRaca, textoRaca);

  const referencias = [
    ...(raca?.fisiologia || []).map(descricao => ({ titulo: 'Fisiologia', descricao })),
    ...(raca?.caracteristicas || []),
    ...(variante?.caracteristicas || []),
    ...(assinatura ? [{
      ...assinatura,
      titulo: `Assinatura Remanescente — ${personagem.escolhaRacial?.assinaturaNome || assinatura.titulo}`,
    }] : []),
    ...fragmentosExpressos.map(fragmento => ({
      ...fragmento,
      titulo: `Fragmento Expresso — ${fragmento.titulo}`,
    })),
    ...maldicoesConhecidas.map(maldicao => ({
      ...maldicao,
      titulo: `Maldição Conhecida — ${maldicao.titulo}`,
    })),
    ...modificacoesInstaladas.map(modificacao => ({
      ...modificacao,
      titulo: `Modificação ${modificacao.categoria === 'ativa' ? 'Ativa' : 'Passiva'} — ${modificacao.titulo}`,
    })),
    ...(linhagem?.caracteristicas || []).map(referencia => ({
      ...referencia,
      descricao: [
        referencia.descricao,
        ...(referencia.opcoes || []).map(opcao => `${opcao.titulo}: ${opcao.descricao}`),
      ].filter(Boolean).join(' '),
    })),
    ...(condicaoAncestral ? [
      {
        ...condicaoAncestral.dadiva,
        titulo: `Dádiva — ${condicaoAncestral.dadiva.titulo}`,
      },
      {
        ...condicaoAncestral.cicatriz,
        titulo: `Cicatriz — ${condicaoAncestral.cicatriz.titulo}`,
      },
    ] : []),
  ];
  if (referencias.length > 0) {
    const listaRacial = document.createElement('ul');
    referencias.forEach(referencia => {
      const item = document.createElement('li');
      const titulo = referencia.titulo ? `${referencia.titulo}: ` : '';
      item.textContent = `${titulo}${referencia.descricao}`;
      listaRacial.appendChild(item);
    });
    blocoRaca.appendChild(listaRacial);
  }
  conteudo.appendChild(blocoRaca);

  detalhes.appendChild(conteudo);
  return detalhes;
}

export function renderAbaHabilidades(container, personagem, ctx) {
  renderizarColecaoPoderesHabilidades(container, personagem, ctx, CONFIG);
  container.appendChild(criarReferencias(personagem, ctx.catalogo));
}
