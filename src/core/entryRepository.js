import { storage } from './storage.js';

function extrairCandidatas(json) {
  if (json && Array.isArray(json.entradas)) return json.entradas;
  if (json && typeof json === 'object' && !Array.isArray(json)) return [json];
  return null;
}

export function criarRepositorioEntradas({ chaveStorage, validarEntrada }) {
  if (!chaveStorage || typeof validarEntrada !== 'function') {
    throw new TypeError('O repositório exige chaveStorage e validarEntrada.');
  }

  function getEntradas() {
    const entradas = storage.get(chaveStorage);
    return entradas && typeof entradas === 'object' && !Array.isArray(entradas)
      ? entradas
      : {};
  }

  function entradasPorCategoria(categoria) {
    return Object.values(getEntradas())
      .filter(entrada => categoria.tipos.includes(entrada.tipo));
  }

  function processarArquivo(raw) {
    let json;

    try {
      json = JSON.parse(raw);
    } catch {
      return { ok: false, mensagem: 'Erro: arquivo inválido (JSON malformado).' };
    }

    const candidatas = extrairCandidatas(json);
    if (!candidatas) {
      return { ok: false, mensagem: 'Erro: arquivo inválido (formato não reconhecido).' };
    }

    const mapa = getEntradas();
    const erros = [];
    let sucesso = 0;

    candidatas.forEach((entrada, indice) => {
      const erro = validarEntrada(entrada);
      if (erro) {
        erros.push(`entrada ${indice + 1}: ${erro}`);
        return;
      }

      mapa[entrada.id] = {
        tipo: entrada.tipo,
        id: entrada.id,
        titulo: entrada.titulo,
        conteudo: entrada.conteudo,
        importadoEm: new Date().toISOString(),
      };
      sucesso += 1;
    });

    if (sucesso > 0 && !storage.set(chaveStorage, mapa)) {
      return {
        ok: false,
        mensagem: 'Erro: não foi possível salvar as entradas no navegador.',
        erros,
      };
    }

    if (sucesso === 0) {
      return {
        ok: false,
        mensagem: 'Erro: arquivo inválido. Nenhuma entrada pôde ser importada.',
        erros,
      };
    }

    const rotulo = sucesso === 1 ? 'entrada importada' : 'entradas importadas';
    const mensagem = erros.length > 0
      ? `${sucesso} ${rotulo} com sucesso. ${erros.length} ignorada(s) por erro.`
      : `${sucesso} ${rotulo} com sucesso.`;

    return { ok: true, sucesso, erros, mensagem };
  }

  return { getEntradas, entradasPorCategoria, processarArquivo };
}
