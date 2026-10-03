/**
 * Conjuntos de equipamento: peças da Loja que, usadas juntas, dão um bônus de
 * coleção. É a única fonte dos bônus. A ficha (resumirEquipamentos), a Loja e o
 * livro leem daqui; as peças só dizem a que conjunto pertencem (`conjunto` no
 * catálogo) e o que cada uma faz sozinha (`formas`).
 *
 * Como conta:
 *  - Só peça equipada vale, e uma peça repetida conta uma vez.
 *  - Os bônus são cumulativos: com 3 peças valem o de 2 e o de 3.
 *  - Efeitos usam o mesmo formato dos efeitos de equipamento da ficha
 *    (categoria, alvo, modo, valor), então somam com os de itens e poderes.
 *
 * Para criar um conjunto novo: acrescente as peças ao catálogo da Loja com
 * `conjunto: '<id>'`, liste os ids aqui e rode `npm run test:shop`. O teste
 * confere que toda peça existe, aponta de volta para o conjunto e que o bônus
 * cresce com o número de peças.
 */
/** Mesmo formato de IEfeitoEquipamento (src/services/equipamentoService.ts), sem o id. */
export interface IEfeitoConjunto {
  categoria: 'atributo' | 'recurso' | 'combate' | 'pericia';
  alvo: string;
  modo: 'bonus' | 'vantagem' | 'desvantagem';
  valor: number;
}

export interface IBonusConjunto {
  /** Quantas peças equipadas liberam este bônus. */
  pecas: number;
  /** Texto para o jogador, no mesmo tom das descrições da Loja. */
  descricao: string;
  efeitos: IEfeitoConjunto[];
}

export interface IPecaConjunto {
  id: string;
  titulo: string;
}

export interface IConjuntoEquipamento {
  id: string;
  titulo: string;
  resumo: string;
  /** Peças do catálogo da Loja (id e nome), na ordem em que aparecem nas telas. */
  pecas: IPecaConjunto[];
  bonus: IBonusConjunto[];
}

export const CONJUNTOS_EQUIPAMENTO: IConjuntoEquipamento[] = [
  {
    id: 'caminhante',
    titulo: 'Conjunto do Caminhante',
    resumo: 'Roupa de quem vive na estrada, pensada para o dia longo pesar menos.',
    pecas: [{ id: 'equipamento-capa-de-caminhante', titulo: 'Capa de Caminhante' }, { id: 'equipamento-botas-de-longa-marcha', titulo: 'Botas de Longa Marcha' }, { id: 'equipamento-cinto-de-alforjes', titulo: 'Cinto de Alforjes' }],
    bonus: [
      {
        pecas: 2,
        descricao: 'O corpo aprende o ritmo da viagem: +5 de Estamina máxima.',
        efeitos: [{ categoria: 'recurso', alvo: 'estaminaMaxima', modo: 'bonus', valor: 5 }],
      },
      {
        pecas: 3,
        descricao: 'Tudo no lugar e nenhum passo desperdiçado: +3 m de Movimento.',
        efeitos: [{ categoria: 'combate', alvo: 'movimento', modo: 'bonus', valor: 3 }],
      },
    ],
  },
  {
    id: 'estudioso',
    titulo: 'Conjunto do Estudioso',
    resumo: 'O pequeno equipamento de quem passa mais tempo lendo do que lutando.',
    pecas: [{ id: 'equipamento-lentes-de-leitura', titulo: 'Lentes de Leitura' }, { id: 'equipamento-tinteiro-de-viagem', titulo: 'Tinteiro de Viagem' }, { id: 'equipamento-livro-de-bolso-anotado', titulo: 'Livro de Bolso Anotado' }],
    bonus: [
      {
        pecas: 2,
        descricao: 'Anotar rende: +5 de Mana máxima.',
        efeitos: [{ categoria: 'recurso', alvo: 'manaMaxima', modo: 'bonus', valor: 5 }],
      },
      {
        pecas: 3,
        descricao: 'Com tudo à mão, pensar fica mais fácil: +1 em Inteligência.',
        efeitos: [{ categoria: 'atributo', alvo: 'inteligencia', modo: 'bonus', valor: 1 }],
      },
    ],
  },
  {
    id: 'sentinela',
    titulo: 'Conjunto do Sentinela',
    resumo: 'Quatro peças de ronda. Quem usa o conjunto inteiro raramente é pego de surpresa.',
    pecas: [
      { id: 'equipamento-apito-de-sentinela', titulo: 'Apito de Sentinela' },
      { id: 'equipamento-manto-de-vigilia', titulo: 'Manto de Vigília' },
      { id: 'equipamento-luvas-de-ronda', titulo: 'Luvas de Ronda' },
      { id: 'equipamento-bracadeira-de-ronda', titulo: 'Braçadeira de Ronda' },
    ],
    bonus: [
      {
        pecas: 2,
        descricao: 'Pronto antes do alarme: +1 em Iniciativa.',
        efeitos: [{ categoria: 'combate', alvo: 'iniciativa', modo: 'bonus', valor: 1 }],
      },
      {
        pecas: 3,
        descricao: 'Quem faz ronda aprende a não dar as costas: +1 de Defesa.',
        efeitos: [{ categoria: 'combate', alvo: 'defesa', modo: 'bonus', valor: 1 }],
      },
      {
        pecas: 4,
        descricao: 'Nada passa despercebido: vantagem em Percepção.',
        efeitos: [{ categoria: 'pericia', alvo: 'percepcao', modo: 'vantagem', valor: 1 }],
      },
    ],
  },
];

/** O conjunto a que uma peça do catálogo pertence, se houver. */
export function conjuntoDaPeca(catalogoItemId: unknown): IConjuntoEquipamento | undefined {
  const id = String(catalogoItemId ?? '');
  return CONJUNTOS_EQUIPAMENTO.find((conjunto) => conjunto.pecas.some((peca) => peca.id === id));
}
