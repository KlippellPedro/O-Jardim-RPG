// Layout da ficha completa de um personagem: menu persistente de abas
// (Ficha, Perícias, Poderes, Habilidades, Inventário, Ataques, Magias,
// Aliados, Notas) + painel da aba ativa. Ficha absorveu Início — eram duas
// abas fragmentando a mesma "identidade central" do personagem; viraram uma
// só, seguindo a lógica do projeto de referência (tudo isso é uma página
// única lá). Trocar de aba navega pra /personagem/{id}/{aba}; as próprias
// Mudanças estruturais chamam ctx.recarregar(), que redesenha somente o
// painel ativo e preserva navegação, posição da página e o restante da ficha.
//
// Sem breadcrumb/cabeçalho de identidade aqui — o "‹ Seus personagens" vira
// o próprio link do topo da página (ver ficha.js), e nome/nível/raça/classe
// saíram completamente por enquanto: vão voltar como campos editáveis (o
// personagem pode mudar de raça/classe sem precisar de outra ficha), não
// como texto fixo. Até lá, essa identidade fica só nas abas Ficha/Habilidades.

import { router } from '../../../core/router.js';
import { obterPersonagem } from '../../services/personagensService.js';
import { renderAbaFicha } from './abas/abaFicha.js';
import { renderAbaPericias } from './abas/abaPericias.js';
import { renderAbaPoderes } from './abas/abaPoderes.js';
import { renderAbaHabilidades } from './abas/abaHabilidades.js';
import { renderAbaInventario } from './abas/abaInventario.js';
import { renderAbaAtaques } from './abas/abaAtaques.js';
import { renderAbaMagias } from './abas/abaMagias.js';
import { renderAbaAliados } from './abas/abaAliados.js';
import { renderAbaNotas } from './abas/abaNotas.js';

const ABAS = [
  { id: 'ficha', titulo: 'Ficha', render: renderAbaFicha },
  { id: 'pericias', titulo: 'Perícias', render: renderAbaPericias },
  { id: 'inventario', titulo: 'Inventário', render: renderAbaInventario },
  { id: 'poderes', titulo: 'Poderes', render: renderAbaPoderes },
  { id: 'habilidades', titulo: 'Habilidades', render: renderAbaHabilidades },
  { id: 'ataques', titulo: 'Ataques', render: renderAbaAtaques },
  { id: 'magias', titulo: 'Magias', render: renderAbaMagias },
  { id: 'aliados', titulo: 'Aliados', render: renderAbaAliados },
  { id: 'notas', titulo: 'Notas', render: renderAbaNotas },
];

function tituloCatalogo(lista, id) {
  return lista?.find(item => item.id === id)?.titulo || null;
}

export function renderizarPersonagem(content, catalogo, id, abaId, opcoes = {}) {
  const personagem = obterPersonagem(id);
  if (!personagem) {
    router.navegar('/');
    return;
  }

  const caminhoBase = `/personagem/${id}`;
  const abaAtual = ABAS.find(a => a.id === abaId);
  if (!abaAtual) {
    router.navegar(`${caminhoBase}/ficha`);
    return;
  }
  const deveRestaurarFocoNaAba = document.activeElement?.classList?.contains('ficha-aba-btn');

  content.innerHTML = '';

  const contexto = document.createElement('header');
  contexto.className = 'ficha-personagem-contexto';
  const identidade = document.createElement('div');
  const sobretitulo = document.createElement('span');
  sobretitulo.textContent = 'Personagem da campanha atual';
  const nome = document.createElement('h2');
  nome.textContent = personagem.nome;
  const raca = tituloCatalogo(catalogo.racas, personagem.racaId);
  const classe = tituloCatalogo(catalogo.classes, personagem.classeId)
    || tituloCatalogo(catalogo.classes, personagem.classes?.[0]?.id);
  const meta = document.createElement('p');
  meta.textContent = [`Nível ${personagem.nivel || 1}`, raca, classe].filter(Boolean).join(' · ');
  identidade.append(sobretitulo, nome, meta);
  const ajudaBtn = document.createElement('button');
  ajudaBtn.type = 'button';
  ajudaBtn.className = 'ficha-ajuda-btn';
  ajudaBtn.textContent = '?';
  ajudaBtn.setAttribute('aria-label', 'Explicar as seções da ficha');
  ajudaBtn.setAttribute('aria-expanded', 'false');
  contexto.append(identidade, ajudaBtn);
  const explicacao = document.createElement('p');
  explicacao.className = 'ficha-ajuda-caixa';
  explicacao.textContent = 'Use as abas para separar os dados da ficha. Alterações mecânicas são salvas na conta; inventário e moedas também podem receber atualizações dos bots do Discord.';
  explicacao.hidden = true;
  ajudaBtn.addEventListener('click', () => {
    explicacao.hidden = !explicacao.hidden;
    ajudaBtn.setAttribute('aria-expanded', String(!explicacao.hidden));
  });
  content.append(contexto, explicacao);

  const nav = document.createElement('nav');
  nav.className = 'ficha-abas-nav';
  nav.setAttribute('aria-label', 'Seções da ficha');
  ABAS.forEach(aba => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ficha-aba-btn';
    if (aba.id === abaAtual.id) {
      btn.classList.add('ficha-aba-btn--ativa');
      btn.setAttribute('aria-current', 'page');
    }
    btn.textContent = aba.titulo;
    if (aba.id === 'poderes' && personagem.legadosAscensaoPendentes > 0) {
      const marca = document.createElement('span');
      marca.className = 'ficha-aba-marca';
      marca.textContent = String(personagem.legadosAscensaoPendentes);
      btn.appendChild(marca);
    }
    btn.addEventListener('click', () => router.navegar(`${caminhoBase}/${aba.id}`));
    nav.appendChild(btn);
  });
  content.appendChild(nav);

  if (deveRestaurarFocoNaAba) {
    nav.querySelector('.ficha-aba-btn--ativa')?.focus();
  }

  const painel = document.createElement('div');
  painel.className = 'ficha-aba-painel';
  content.appendChild(painel);

  nav.querySelectorAll('.ficha-aba-btn').forEach((botao, indice) => {
    botao.dataset.aba = ABAS[indice].id;
  });

  const atualizarMarcaPoderes = personagemAtual => {
    const botao = nav.querySelector('[data-aba="poderes"]');
    if (!botao) return;
    botao.querySelector('.ficha-aba-marca')?.remove();
    if (personagemAtual.legadosAscensaoPendentes > 0) {
      const marca = document.createElement('span');
      marca.className = 'ficha-aba-marca';
      marca.textContent = String(personagemAtual.legadosAscensaoPendentes);
      botao.appendChild(marca);
    }
  };

  let personagemAtual = personagem;
  const ctx = {
    catalogo,
    mostrarToast: opcoes.mostrarToast || (() => {}),
    recarregar: () => {
      const atualizado = obterPersonagem(id);
      if (!atualizado) return;
      personagemAtual = atualizado;
      painel.innerHTML = '';
      atualizarMarcaPoderes(personagemAtual);
      abaAtual.render(painel, personagemAtual, ctx);
    },
  };

  abaAtual.render(painel, personagemAtual, ctx);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}
