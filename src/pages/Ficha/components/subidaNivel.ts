/** Uma recompensa já pronta para o painel. */
export interface RecompensaSubida {
  /** Etiqueta da linha (Poder, Habilidade, Ganho...). */
  rotulo: string;
  /** Texto principal da linha. */
  texto: string;
  /** Frase falada; também é a chave da gravação (ver tools/gerar-voz-sabio.py). */
  fala: string;
}

const ROTULOS_TIPO: Record<string, string> = {
  poder: 'Poder',
  habilidade: 'Habilidade',
  grau_pericia: 'Grau de perícia',
  evento: 'Evento',
  habilidade_final: 'Habilidade final',
};

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Monta a linha de uma recompensa evitando repetir o que a etiqueta já diz:
 * "Grau de perícia: Grau de perícia" vira "Ganho: Mais um grau de perícia" e
 * "Poder: Poder de Guerreiro" vira "Ganho: Poder de Guerreiro".
 * A mesma regra existe em tools/gerar-voz-sabio.py; mantenha as duas iguais. */
export const descreverRecompensa = (
  tipo: string,
  titulo: string,
  quantidade = 1,
): RecompensaSubida => {
  if (tipo === 'grau_pericia') {
    const texto = quantidade === 1 ? 'Mais um grau de perícia' : `Mais ${quantidade} graus de perícia`;
    return { rotulo: 'Ganho', texto, fala: texto };
  }
  const rotulo = ROTULOS_TIPO[tipo] || 'Recompensa';
  if (semAcento(titulo).startsWith(`${semAcento(rotulo)} `)) {
    return { rotulo: 'Ganho', texto: titulo, fala: titulo };
  }
  return { rotulo, texto: titulo, fala: `${rotulo}: ${titulo}` };
};

export interface SubidaNivel {
  chave: number;
  /** Nível total do personagem depois de subir. */
  nivelTotal: number;
  classeId: string;
  nomeClasse: string;
  /** Nível da classe que recebeu o ponto (ou 1, quando é classe nova). */
  nivelClasse: number;
  classeNova: boolean;
  especial: boolean;
  /** Ganhos reais de Vida e Mana calculados pela própria ficha. */
  ganhoVida: number;
  ganhoMana: number;
  /** Recompensas publicadas para aquele nível da classe. */
  recompensas: RecompensaSubida[];
}

type Ouvinte = (subida: SubidaNivel) => void;

const ouvintes = new Set<Ouvinte>();
let contador = 0;

export const dispararSubidaNivel = (dados: Omit<SubidaNivel, 'chave'>) => {
  contador += 1;
  const subida = { ...dados, chave: contador };
  ouvintes.forEach((ouvinte) => ouvinte(subida));
};

export const inscreverSubidaNivel = (ouvinte: Ouvinte) => {
  ouvintes.add(ouvinte);
  return () => { ouvintes.delete(ouvinte); };
};
