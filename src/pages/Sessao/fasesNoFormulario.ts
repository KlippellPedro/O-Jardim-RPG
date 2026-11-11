import type { FaseDeChefe } from '../../services/sessaoApi';

/** No formulário a Vida vai em porcentagem inteira e as mudanças em linhas; o servidor guarda fração e lista. */
export interface FaseNoFormulario {
  nome: string;
  vida: string;
  rodada: string;
  anuncio: string;
  mudancas: string;
}

export const MAXIMO_DE_FASES = 6;

export function paraFormulario(fases: FaseDeChefe[] | undefined): FaseNoFormulario[] {
  return (fases ?? []).map((fase) => ({
    nome: fase.nome,
    vida: fase.quando != null ? String(Math.round(fase.quando * 100)) : '',
    rodada: fase.rodada != null ? String(fase.rodada) : '',
    anuncio: fase.anuncio ?? '',
    mudancas: (fase.mudancas ?? []).join('\n'),
  }));
}

/** O que vai para o servidor. Fase sem nome fica de fora; número fora da faixa vira "sem gatilho". */
export function paraServidor(fases: FaseNoFormulario[]): FaseDeChefe[] {
  return fases
    .filter((fase) => fase.nome.trim())
    .slice(0, MAXIMO_DE_FASES)
    .map((fase) => {
      const vida = Math.trunc(Number(fase.vida));
      const rodada = Math.trunc(Number(fase.rodada));
      return {
        nome: fase.nome.trim().slice(0, 80),
        quando: fase.vida.trim() && vida >= 1 && vida <= 99 ? vida / 100 : null,
        rodada: fase.rodada.trim() && rodada >= 2 && rodada <= 99 ? rodada : null,
        anuncio: fase.anuncio.trim().slice(0, 240),
        mudancas: fase.mudancas.split('\n').map((linha) => linha.trim()).filter(Boolean).slice(0, 6),
      };
    });
}
