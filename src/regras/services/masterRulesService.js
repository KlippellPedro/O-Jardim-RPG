import { storage } from '../../core/storage.js';
import { validarPacoteMestre } from '../schemas/masterRulesSchema.js';

const CHAVE_STORAGE = 'regras-mestre';

export const TOPICO_MESTRE = {
  id: 'mestre',
  titulo: 'Mestre',
  simbolo: 'MS',
  icone: 'mestre.png',
  accent: 'var(--gold)',
  grupo: 'Mestre',
  resumo: 'DTs, probabilidades, encontros e ferramentas reservadas ao mestre.',
};

export function getRegrasMestre() {
  const pacote = storage.get(CHAVE_STORAGE);
  return pacote && validarPacoteMestre(pacote) === null ? pacote : null;
}

export function temRegrasMestre() {
  return getRegrasMestre() !== null;
}

export function importarRegrasMestre(raw) {
  let pacote;

  try {
    pacote = JSON.parse(raw);
  } catch {
    return { ok: false, mensagem: 'Arquivo inválido: JSON malformado.' };
  }

  const erro = validarPacoteMestre(pacote);
  if (erro) return { ok: false, mensagem: `Arquivo inválido: ${erro}.` };

  if (!storage.set(CHAVE_STORAGE, pacote)) {
    return { ok: false, mensagem: 'Não foi possível salvar a área do mestre.' };
  }

  return {
    ok: true,
    mensagem: `Área do mestre ${pacote.versao} importada com sucesso.`,
    pacote,
  };
}
