import { conteudoApi } from '../../plataforma/conteudoApi.js';
import { validarPacoteMestre } from '../schemas/masterRulesSchema.js';

let regrasMestre = null;

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
  return regrasMestre;
}

export function temRegrasMestre() {
  return getRegrasMestre() !== null;
}

export async function carregarRegrasMestre(campanhaId) {
  const resposta = await conteudoApi.visivel(campanhaId, 'regras');
  const pacote = (resposta.informacoes || [])
    .map(item => item.dados)
    .find(item => validarPacoteMestre(item) === null);
  regrasMestre = pacote || null;
  return regrasMestre;
}
