/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Mundo
   Import de conteúdo por arquivo JSON. Sem senha, sem tags de
   desbloqueio: quem tem o arquivo, vê. Quem não tem, não vê.
   ───────────────────────────────────────────────────────── */

import { storage } from '../core/storage.js';
import { TIPOS_VALIDOS } from './categorias.js';

const CHAVE = 'mundo-entradas';

export function getEntradas() {
  return storage.get(CHAVE) || {};
}

function salvar(mapa) {
  storage.set(CHAVE, mapa);
}

export function entradasPorCategoria(categoria) {
  const mapa = getEntradas();
  return Object.values(mapa).filter(e => categoria.tipos.includes(e.tipo));
}

function validarEntrada(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return 'entrada inválida';
  if (typeof obj.tipo !== 'string' || !TIPOS_VALIDOS.includes(obj.tipo)) return `tipo desconhecido: "${obj.tipo}"`;
  if (typeof obj.id !== 'string' || !obj.id.trim()) return 'faltando "id"';
  if (typeof obj.titulo !== 'string' || !obj.titulo.trim()) return 'faltando "titulo"';
  if (!obj.conteudo || typeof obj.conteudo !== 'object' || Array.isArray(obj.conteudo)) return 'faltando "conteudo"';
  return null;
}

// Aceita tanto uma entrada única ({ tipo, id, titulo, conteudo })
// quanto um pacote ({ pacote, entradas: [...] }) — detecta sozinho.
export function processarArquivo(raw) {
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, mensagem: 'Erro: arquivo inválido (JSON malformado).' };
  }

  let candidatas;
  if (json && Array.isArray(json.entradas)) {
    candidatas = json.entradas;
  } else if (json && typeof json === 'object' && !Array.isArray(json)) {
    candidatas = [json];
  } else {
    return { ok: false, mensagem: 'Erro: arquivo inválido (formato não reconhecido).' };
  }

  const mapa = getEntradas();
  let sucesso = 0;
  const erros = [];

  candidatas.forEach((entrada, i) => {
    const erro = validarEntrada(entrada);
    if (erro) {
      erros.push(`entrada ${i + 1}: ${erro}`);
      return;
    }
    // Chave por id: se já existe, atualiza — nunca duplica.
    mapa[entrada.id] = {
      tipo: entrada.tipo,
      id: entrada.id,
      titulo: entrada.titulo,
      conteudo: entrada.conteudo,
      importadoEm: new Date().toISOString(),
    };
    sucesso++;
  });

  if (sucesso > 0) salvar(mapa);

  if (sucesso === 0) {
    return {
      ok: false,
      mensagem: 'Erro: arquivo inválido. Nenhuma entrada pôde ser importada.',
      erros,
    };
  }

  const rotulo = sucesso === 1 ? 'entrada importada' : 'entradas importadas';
  const mensagem = erros.length
    ? `${sucesso} ${rotulo} com sucesso. ${erros.length} ignorada(s) por erro.`
    : `${sucesso} ${rotulo} com sucesso.`;

  return { ok: true, sucesso, erros, mensagem };
}
