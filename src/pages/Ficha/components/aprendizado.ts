import { temaDoFluxo, type FluxoDeMagia } from '../../../services/magiaService';

export type TipoAprendizado = 'Magia' | 'Ritual' | 'Selo' | 'Encantamento';

export interface CenaAprendizado {
  chave: number;
  tipo: TipoAprendizado;
  titulo: string;
  /** "Gênese · 3º círculo", montado por quem dispara. */
  detalhe: string;
  destaque: string;
  brilho: string;
  /** Frase falada antes do nome: "Magia aprendida", "Ritual aprendido"... */
  frase: string;
}

const FRASES: Record<TipoAprendizado, string> = {
  Magia: 'Magia aprendida',
  Ritual: 'Ritual aprendido',
  Selo: 'Selo aprendido',
  Encantamento: 'Encantamento aprendido',
};

// Chaves usadas pelo gerador de voz (tools/gerar-voz-sabio.py): mantenha iguais.
export const FRASES_APRENDIZADO = FRASES;

type Ouvinte = (cena: CenaAprendizado) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

export const dispararAprendizado = (dados: {
  tipo: TipoAprendizado;
  titulo: string;
  detalhe: string;
  fluxo: FluxoDeMagia | string | null | undefined;
}) => {
  let destaque = '#c4b5fd';
  let brilho = 'rgba(196, 181, 253, 0.35)';
  try {
    const tema = temaDoFluxo((dados.fluxo || 'universal') as FluxoDeMagia);
    if (tema) {
      destaque = tema.destaque;
      brilho = tema.brilho;
    }
  } catch {
    // Fluxo desconhecido: fica com a cor neutra.
  }
  contador += 1;
  const cena = {
    chave: contador,
    tipo: dados.tipo,
    titulo: dados.titulo,
    detalhe: dados.detalhe,
    destaque,
    brilho,
    frase: FRASES[dados.tipo],
  };
  ouvintes.forEach((ouvinte) => ouvinte(cena));
};

export const inscreverAprendizado = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
