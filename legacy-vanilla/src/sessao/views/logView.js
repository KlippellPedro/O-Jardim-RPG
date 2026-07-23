/* Log da mesa: rolagens e usos de poder, do mais recente ao mais antigo.

   O mestre vê tudo — é o ponto do registro, a prova do que aconteceu. O
   jogador vê só o que ele mesmo registrou: descobrir pelo log que outro rolou
   Furtividade entregaria a cena. Esse recorte é feito no servidor. */

import { registrosApi } from '../../plataforma/registrosApi.js';

const ICONES = {
  rolagem: '🎲',
  dano: '💥',
  poder: '✦',
  habilidade: '◈',
  magia: '✧',
  item: '❖',
  anotacao: '✎',
};

const ROTULO_GRAU = {
  'sucesso critico': 'Sucesso crítico',
  sucesso: 'Sucesso',
  falha: 'Falha',
  'falha critica': 'Falha crítica',
};

function elemento(tag, classe = '', texto = null) {
  const node = document.createElement(tag);
  if (classe) node.className = classe;
  if (texto !== null && texto !== undefined) node.textContent = String(texto);
  return node;
}

function horario(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function linhaDoRegistro(registro) {
  const detalhes = registro.detalhes || {};
  const linha = elemento('article', 'sessao-log-item');
  linha.dataset.tipo = registro.tipo;
  if (detalhes.grau) linha.dataset.grau = detalhes.grau;

  linha.append(elemento('span', 'sessao-log-icone', ICONES[registro.tipo] || '•'));

  const corpo = elemento('div', 'sessao-log-corpo');
  const cabecalho = elemento('div', 'sessao-log-cabecalho');
  cabecalho.append(elemento('strong', '', registro.autor_nome || registro.conta_nome || 'Alguém'));
  cabecalho.append(elemento('span', 'sessao-log-titulo', registro.titulo));
  corpo.append(cabecalho);

  if (registro.resultado !== null && registro.resultado !== undefined) {
    const numeros = elemento('div', 'sessao-log-numeros');

    // `2#d20` são duas rolagens independentes: mostrar a soma seria mentir
    // para quem pediu dois ataques separados.
    const repetido = detalhes.repeticoes > 1 && Array.isArray(detalhes.rolagens);
    numeros.append(elemento(
      'strong',
      'sessao-log-total',
      repetido ? detalhes.rolagens.map(r => r.total).join(', ') : registro.resultado,
    ));

    const dados = Array.isArray(detalhes.dados) ? detalhes.dados : [];
    if (repetido) {
      const detalhe = elemento('span', 'sessao-log-dados',
        detalhes.rolagens.map((r, i) => `${i + 1}) [${r.dados.join(', ')}]=${r.total}`).join('  '));
      detalhe.title = 'Cada rolagem, sorteada pelo servidor';
      numeros.append(detalhe);
    } else if (dados.length) {
      const face = elemento('span', 'sessao-log-dados', `[${dados.join(', ')}]`);
      face.title = 'Dados rolados pelo servidor';
      numeros.append(face);
    }
    const partes = [];
    if (registro.formula) partes.push(registro.formula);
    if (detalhes.modo && detalhes.modo !== 'normal') partes.push(detalhes.modo);
    if (detalhes.dt !== undefined && detalhes.dt !== null) partes.push(`DT ${detalhes.dt}`);
    if (partes.length) numeros.append(elemento('span', 'sessao-log-formula', partes.join(' · ')));
    if (detalhes.grau) {
      numeros.append(elemento('span', 'sessao-log-grau', ROTULO_GRAU[detalhes.grau] || detalhes.grau));
    }
    corpo.append(numeros);
  } else if (detalhes.custo) {
    corpo.append(elemento('span', 'sessao-log-custo', `Custou ${detalhes.custo} de ${detalhes.tipo_custo || 'recurso'}`));
  }

  // Origem declarada pela ficha: mostra de onde o bônus saiu.
  const origem = detalhes.origem || {};
  const contexto = [origem.pericia && `perícia ${origem.pericia}`, origem.arma && `arma ${origem.arma}`, origem.grau]
    .filter(Boolean).join(' · ');
  if (contexto) corpo.append(elemento('small', 'sessao-log-origem', contexto));

  linha.append(corpo);
  linha.append(elemento('time', 'sessao-log-hora', horario(registro.criado_em)));
  return linha;
}

/**
 * Painel do log. Devolve `{ elemento, atualizar }` — quem chama decide quando
 * recarregar (o fluxo de eventos da sessão avisa a cada novo registro).
 */
export function criarLog(campanhaId, { comando = false } = {}) {
  const bloco = elemento('section', 'sessao-bloco sessao-log');
  const topo = elemento('div', 'sessao-log-topo');
  topo.append(elemento('h3', '', comando ? 'Log da mesa' : 'Suas rolagens'));

  const filtro = document.createElement('select');
  filtro.className = 'sessao-select';
  filtro.setAttribute('aria-label', 'Filtrar o log');
  [
    ['sessao', 'Só desta sessão'],
    ['tudo', 'Toda a campanha'],
  ].forEach(([valor, rotulo]) => filtro.append(new Option(rotulo, valor)));
  topo.append(filtro);
  bloco.append(topo);

  if (comando) {
    bloco.append(elemento('p', 'sessao-log-explicacao',
      'Os dados são rolados no servidor: ninguém escolhe o resultado pelo navegador.'));
  }

  const lista = elemento('div', 'sessao-log-lista');
  bloco.append(lista);

  let carregando = false;

  async function atualizar() {
    if (carregando) return;
    carregando = true;
    try {
      const resposta = await registrosApi.listar(campanhaId, {
        apenasSessao: filtro.value === 'sessao',
        limite: 80,
      });
      const registros = resposta.registros || [];
      lista.replaceChildren();
      if (!registros.length) {
        lista.append(elemento('p', 'sessao-vazio', comando
          ? 'Nada registrado ainda. Rolagens e poderes usados na ficha aparecem aqui.'
          : 'Você ainda não rolou nada nesta sessão.'));
        return;
      }
      registros.forEach(registro => lista.append(linhaDoRegistro(registro)));
    } catch (erro) {
      lista.replaceChildren(elemento('p', 'sessao-vazio', erro.message || 'Falha ao carregar o log.'));
    } finally {
      carregando = false;
    }
  }

  filtro.addEventListener('change', atualizar);
  return { elemento: bloco, atualizar };
}
