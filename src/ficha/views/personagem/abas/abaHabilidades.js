import { recompensasAteNivel } from '../../../config/progressao.js';
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
  resumo.textContent = 'Referências de classe e raça';
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
  textoRaca.textContent = raca?.regraOficial
    || (Array.isArray(raca?.habilidades) && raca.habilidades.length ? raca.habilidades.join(' · ') : 'Nenhuma referência racial publicada.');
  blocoRaca.append(tituloRaca, textoRaca);
  conteudo.appendChild(blocoRaca);

  detalhes.appendChild(conteudo);
  return detalhes;
}

export function renderAbaHabilidades(container, personagem, ctx) {
  renderizarColecaoPoderesHabilidades(container, personagem, ctx, CONFIG);
  container.appendChild(criarReferencias(personagem, ctx.catalogo));
}
