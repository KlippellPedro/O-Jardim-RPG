export const TIPOS_AFLICAO = ['veneno', 'doenca', 'vicio'] as const;
export type TipoAflicao = typeof TIPOS_AFLICAO[number];

export const VIAS_EXPOSICAO = ['contato', 'ferimento', 'ingestao', 'inalacao', 'ambiente', 'uso'] as const;
export type ViaExposicao = typeof VIAS_EXPOSICAO[number];

export type ClassificacaoAflicao = 'comum' | 'sobrenatural';

/** Onde a aflição costuma ser pega: uma das dez Árvores, o Vazio ou qualquer lugar. */
export const REGIOES_AFLICAO = [
  'Em qualquer lugar',
  'Gênese',
  'Alétheia',
  'A.X.I.S',
  'Anima',
  'Vórtice',
  'Baluarte',
  'Matriz',
  'Éon',
  'Limiar',
  'O Vazio',
] as const;
export type RegiaoAflicao = typeof REGIOES_AFLICAO[number];
export type UnidadeTempoAflicao = 'rodada' | 'minuto' | 'hora' | 'dia';
export type AtributoDrenado = 'Força' | 'Destreza' | 'Constituição' | 'Inteligência' | 'Sabedoria' | 'Carisma';

export interface IPeriodoAflicao {
  quantidade: number;
  unidade: UnidadeTempoAflicao;
}

export interface IDrenagemAtributo {
  atributo: AtributoDrenado;
  valor: number;
  temporaria: true;
  recuperacao: string;
}

export interface IEstagioAflicao {
  numero: number;
  efeitos: string[];
  aoEntrar?: string[];
  drenagemAtributo?: IDrenagemAtributo;
}

export interface IExposicaoAflicao {
  vias: ViaExposicao[];
  gatilho: string;
}

export interface IProgressaoAflicao {
  teste: 'Fortitude';
  sucessoCritico: -1;
  sucesso: 0;
  falha: 1;
  falhaCritica: 2;
}

export interface ITratamentoAflicao {
  pericia: 'Cura';
  dt: number;
  tempo: string;
  efeitoSucesso: string;
  limite: string;
  antidoto: 'encerra' | 'encerra_se_especifico' | 'nao_se_aplica';
}

export interface IDependenciaAflicao {
  gatilhoDependencia: string;
  inicioAbstinencia: IPeriodoAflicao;
  usoDuranteAbstinencia: string;
  restricaoAgencia: string;
}

export interface IAflicao {
  id: string;
  titulo: string;
  /** Onde o Mestre a encontra primeiro. Fora dela, só com a exposição levada junto. */
  regiao: RegiaoAflicao;
  tipo: TipoAflicao;
  classificacao: ClassificacaoAflicao;
  exposicao: IExposicaoAflicao;
  dtFortitude: number;
  incubacao: IPeriodoAflicao;
  intervalo: IPeriodoAflicao;
  progressao: IProgressaoAflicao;
  estagios: IEstagioAflicao[];
  tratamento: ITratamentoAflicao;
  dependencia?: IDependenciaAflicao;
  observacoes?: string[];
}

const PROGRESSAO_PADRAO: IProgressaoAflicao = {
  teste: 'Fortitude',
  sucessoCritico: -1,
  sucesso: 0,
  falha: 1,
  falhaCritica: 2,
};

export const CATALOGO_AFLICOES: IAflicao[] = [
  {
    id: 'toxina-paralisante',
    titulo: 'Toxina Paralisante',
    regiao: 'Em qualquer lugar',
    tipo: 'veneno',
    classificacao: 'comum',
    exposicao: {
      vias: ['ferimento', 'ingestao'],
      gatilho: 'Contato da toxina com o sangue ou ingestão de uma dose.',
    },
    dtFortitude: 15,
    incubacao: { quantidade: 0, unidade: 'rodada' },
    intervalo: { quantidade: 1, unidade: 'rodada' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['Movimento reduzido pela metade.'] },
      { numero: 2, efeitos: ['Movimento 0.', 'Desvantagem em testes de Força e Destreza.'] },
      { numero: 3, efeitos: ['Fica Imobilizado.', 'Não pode usar reações.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 15,
      tempo: 'Ação padrão.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por intervalo.',
      antidoto: 'encerra',
    },
  },
  {
    id: 'peconha-hemorragica',
    titulo: 'Peçonha Hemorrágica',
    regiao: 'Em qualquer lugar',
    tipo: 'veneno',
    classificacao: 'comum',
    exposicao: {
      vias: ['ferimento'],
      gatilho: 'Ferimento causado por presa, ferrão ou arma contaminada.',
    },
    dtFortitude: 16,
    incubacao: { quantidade: 0, unidade: 'rodada' },
    intervalo: { quantidade: 1, unidade: 'rodada' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['Sofra 1d6 de dano de veneno no fim do intervalo.'] },
      { numero: 2, efeitos: ['Sofra 2d6 de dano de veneno no fim do intervalo.'] },
      { numero: 3, efeitos: ['Sofra 3d6 de dano de veneno no fim do intervalo.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 16,
      tempo: 'Ação padrão.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por intervalo.',
      antidoto: 'encerra',
    },
  },
  {
    id: 'febre-dos-esporos',
    titulo: 'Febre dos Esporos',
    regiao: 'Em qualquer lugar',
    tipo: 'doenca',
    classificacao: 'comum',
    exposicao: {
      vias: ['inalacao', 'ambiente'],
      gatilho: 'Uma hora em área contaminada sem proteção respiratória.',
    },
    dtFortitude: 14,
    incubacao: { quantidade: 6, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em testes físicos.'] },
      { numero: 2, efeitos: ['−2 em testes físicos.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
      { numero: 3, efeitos: ['Desvantagem em testes físicos.', 'Descanso recupera uma categoria abaixo do normal, mínimo Péssima.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 14,
      tempo: '1 hora.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'definhamento-arcano',
    titulo: 'Definhamento Arcano',
    regiao: 'Em qualquer lugar',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['contato', 'ambiente'],
      gatilho: 'Contato direto com foco infeccioso sobrenatural.',
    },
    dtFortitude: 20,
    incubacao: { quantidade: 1, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Fortitude.'] },
      {
        numero: 2,
        efeitos: ['−1 em Fortitude.'],
        drenagemAtributo: {
          atributo: 'Constituição',
          valor: 1,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
      {
        numero: 3,
        efeitos: ['Desvantagem em Fortitude.'],
        drenagemAtributo: {
          atributo: 'Constituição',
          valor: 2,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 20,
      tempo: '1 hora e um reagente mágico de 50 Lunaris, consumido na tentativa.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
    observacoes: ['A drenagem indicada pelo estágio atual substitui a anterior; não acumule os valores.'],
  },
  {
    id: 'dependencia-de-estimulante',
    titulo: 'Dependência de Estimulante',
    regiao: 'Em qualquer lugar',
    tipo: 'vicio',
    classificacao: 'comum',
    exposicao: {
      vias: ['uso', 'ingestao'],
      gatilho: 'Uso repetido conforme o gatilho de dependência.',
    },
    dtFortitude: 15,
    incubacao: { quantidade: 0, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Iniciativa durante abstinência.'] },
      { numero: 2, efeitos: ['−2 em Iniciativa e em testes de Inteligência durante abstinência.'] },
      { numero: 3, efeitos: ['Desvantagem em testes de Inteligência durante abstinência.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 15,
      tempo: '1 hora de acompanhamento durante um descanso.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'nao_se_aplica',
    },
    dependencia: {
      gatilhoDependencia: 'Após consumir duas ou mais doses por dia durante três dias, teste Fortitude. Falha aplica o estágio 1. Só conta como dose um item cuja descrição o identifique como estimulante.',
      inicioAbstinencia: { quantidade: 1, unidade: 'dia' },
      usoDuranteAbstinencia: 'Uma dose suspende os efeitos e o próximo teste de progressão por um intervalo, mas não reduz o estágio.',
      restricaoAgencia: 'A abstinência não obriga o personagem a procurar, comprar ou usar a substância.',
    },
  },
  {
    id: 'tosse-cinzenta',
    titulo: 'Tosse Cinzenta',
    regiao: 'Gênese',
    tipo: 'doenca',
    classificacao: 'comum',
    exposicao: {
      vias: ['inalacao', 'contato'],
      gatilho: 'Uma noite num cômodo fechado com alguém doente, ou respirar a fumaça de um incêndio sem proteção.',
    },
    dtFortitude: 14,
    incubacao: { quantidade: 1, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Fortitude contra fumaça, gases e esforço prolongado.'] },
      { numero: 2, efeitos: ['−1 em Fortitude e −1 em Atletismo.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
      { numero: 3, efeitos: ['Desvantagem em Fortitude contra fumaça e gases e em Atletismo para correr e nadar.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 14,
      tempo: '1 hora de repouso, com ervas e vapor.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'beladona-destilada',
    titulo: 'Beladona Destilada',
    regiao: 'Gênese',
    tipo: 'veneno',
    classificacao: 'comum',
    exposicao: {
      vias: ['ingestao', 'ferimento'],
      gatilho: 'Beber o extrato ou ser ferido por arma untada com ele.',
    },
    dtFortitude: 16,
    incubacao: { quantidade: 10, unidade: 'minuto' },
    intervalo: { quantidade: 10, unidade: 'minuto' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['Visão turva: −1 em Percepção e Pontaria.'] },
      { numero: 2, efeitos: ['−2 em Percepção e Pontaria.', 'Boca seca: desvantagem em Diplomacia e Atuação faladas.'] },
      { numero: 3, efeitos: ['Desvantagem em testes que dependam de visão.', 'Movimento reduzido pela metade.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 16,
      tempo: 'Ação padrão.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por intervalo.',
      antidoto: 'encerra',
    },
  },
  {
    id: 'ofuscamento-ambar',
    titulo: 'Ofuscamento Âmbar',
    regiao: 'Alétheia',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['ambiente'],
      gatilho: 'Uma hora sob a luz âmbar constante de Alétheia sem proteger os olhos.',
    },
    dtFortitude: 17,
    incubacao: { quantidade: 0, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'hora' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Percepção que dependa de visão.'] },
      { numero: 2, efeitos: ['−2 em Percepção que dependa de visão.', '+2 em Ressonância: você enxerga o que as coisas são de verdade, querendo ou não.'] },
      { numero: 3, efeitos: ['Desvantagem em Percepção que dependa de visão.', '+2 em Ressonância.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 17,
      tempo: '1 hora na sombra, de olhos cobertos.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'dependencia-de-sincronia',
    titulo: 'Dependência de Sincronia',
    regiao: 'A.X.I.S',
    tipo: 'vicio',
    classificacao: 'comum',
    exposicao: {
      vias: ['uso'],
      gatilho: 'Uso repetido de interface neural, conforme o gatilho de dependência.',
    },
    dtFortitude: 16,
    incubacao: { quantidade: 0, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Iniciativa e em Tecnologia durante abstinência.'] },
      { numero: 2, efeitos: ['−2 em Iniciativa e em Tecnologia durante abstinência.'] },
      { numero: 3, efeitos: ['Desvantagem em Tecnologia e em testes de Inteligência durante abstinência.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 16,
      tempo: '1 hora de acompanhamento durante um descanso.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'nao_se_aplica',
    },
    dependencia: {
      gatilhoDependencia: 'Depois de usar uma interface neural em três dias seguidos, teste Fortitude. Falha aplica o estágio 1. Só conta como uso um implante ou item cuja descrição o identifique como interface neural.',
      inicioAbstinencia: { quantidade: 1, unidade: 'dia' },
      usoDuranteAbstinencia: 'Um uso suspende os efeitos e o próximo teste de progressão por um intervalo, mas não reduz o estágio.',
      restricaoAgencia: 'A abstinência não obriga o personagem a procurar, comprar ou usar a interface.',
    },
  },
  {
    id: 'podridao-do-viveiro',
    titulo: 'Podridão do Viveiro',
    regiao: 'Anima',
    tipo: 'doenca',
    classificacao: 'comum',
    exposicao: {
      vias: ['ferimento', 'ambiente'],
      gatilho: 'Ferimento aberto em contato com a mata do Viveiro ou com uma criatura infestada.',
    },
    dtFortitude: 17,
    incubacao: { quantidade: 1, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['Os ferimentos não fecham sozinhos: toda cura de Vida que você recebe cai pela metade.'] },
      { numero: 2, efeitos: ['Cura de Vida pela metade.', '−1 em testes físicos.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
      { numero: 3, efeitos: ['Cura de Vida pela metade.', '−2 em testes físicos.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 17,
      tempo: '1 hora, limpando e cauterizando a ferida.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'nectar-soninfero',
    titulo: 'Néctar Sonífero',
    regiao: 'Anima',
    tipo: 'veneno',
    classificacao: 'comum',
    exposicao: {
      vias: ['ingestao', 'inalacao'],
      gatilho: 'Comer o fruto ou respirar o pólen de uma flor que dá sono.',
    },
    dtFortitude: 15,
    incubacao: { quantidade: 1, unidade: 'minuto' },
    intervalo: { quantidade: 1, unidade: 'minuto' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Iniciativa e em Percepção.'] },
      { numero: 2, efeitos: ['−2 em Iniciativa e em Percepção.', 'Movimento reduzido pela metade.'] },
      { numero: 3, efeitos: ['Adormece: fica Inconsciente até sofrer dano ou até o próximo intervalo.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 15,
      tempo: 'Ação padrão.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por intervalo.',
      antidoto: 'encerra',
    },
  },
  {
    id: 'mal-da-inconstancia',
    titulo: 'Mal da Inconstância',
    regiao: 'Vórtice',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['ambiente', 'contato'],
      gatilho: 'Uma hora numa área em que o Fluxo da Inconstância refez o terreno, sem proteção.',
    },
    dtFortitude: 18,
    incubacao: { quantidade: 1, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em testes de precisão (Pontaria, Ladinagem e Pilotagem).'] },
      { numero: 2, efeitos: ['−2 em testes de precisão.', 'No começo de cada cena, role 1d6: com 1, a primeira rolagem da cena sofre desvantagem.'] },
      { numero: 3, efeitos: ['Desvantagem em testes de precisão.', 'No começo de cada cena, role 1d6: com 1 ou 2, a primeira rolagem da cena sofre desvantagem.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 18,
      tempo: '1 hora de repouso longe do lugar contaminado.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'pulmao-de-pedra',
    titulo: 'Pulmão de Pedra',
    regiao: 'Baluarte',
    tipo: 'doenca',
    classificacao: 'comum',
    exposicao: {
      vias: ['inalacao', 'ambiente'],
      gatilho: 'Uma hora respirando pó de rocha sem pano ou máscara.',
    },
    dtFortitude: 15,
    incubacao: { quantidade: 2, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Fortitude contra fumaça e gases.'] },
      { numero: 2, efeitos: ['−2 em Fortitude contra fumaça, gases e esforço prolongado.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
      { numero: 3, efeitos: ['Desvantagem em Fortitude contra fumaça, gases e esforço prolongado.', 'Movimento reduzido em 3 m.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 15,
      tempo: '1 hora de vapores medicinais em ar limpo.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'mal-do-intersticio',
    titulo: 'Mal do Interstício',
    regiao: 'Matriz',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['ambiente'],
      gatilho: 'Atravessar entre Galhos sem guia dimensional ou âncora, ou passar uma hora no Interstício.',
    },
    dtFortitude: 18,
    incubacao: { quantidade: 1, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Pontaria e em Percepção: a distância engana.'] },
      { numero: 2, efeitos: ['−2 em Pontaria e em Percepção.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
      { numero: 3, efeitos: ['Desvantagem em Pontaria, Percepção e Acrobacia.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 18,
      tempo: '1 hora de descanso com os pés firmes no chão, longe do Interstício.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'desgaste-do-tempo',
    titulo: 'Desgaste do Tempo',
    regiao: 'Éon',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['ambiente', 'contato'],
      gatilho: 'Uma hora numa área em que o Fluxo do Tempo foi usado em excesso.',
    },
    dtFortitude: 19,
    incubacao: { quantidade: 1, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Iniciativa.'] },
      {
        numero: 2,
        efeitos: ['−2 em Iniciativa.'],
        aoEntrar: ['Ganhe 1 Cansaço.'],
        drenagemAtributo: {
          atributo: 'Destreza',
          valor: 1,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
      {
        numero: 3,
        efeitos: ['−2 em Iniciativa.', 'Desvantagem em Reflexos.'],
        aoEntrar: ['Ganhe 1 Cansaço.'],
        drenagemAtributo: {
          atributo: 'Destreza',
          valor: 2,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 19,
      tempo: '1 hora e um reagente mágico de 50 Lunaris, consumido na tentativa.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
    observacoes: ['A drenagem indicada pelo estágio atual substitui a anterior; não acumule os valores.'],
  },
  {
    id: 'frio-do-fim',
    titulo: 'Frio do Fim',
    regiao: 'Limiar',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['ambiente'],
      gatilho: 'Um dia inteiro num lugar onde o Fluxo do Fim é forte, como Arkarin, sem proteção nem companhia viva.',
    },
    dtFortitude: 17,
    incubacao: { quantidade: 1, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Vontade.'] },
      { numero: 2, efeitos: ['−2 em Vontade.'], aoEntrar: ['Perca 1d4 de Sanidade.'] },
      { numero: 3, efeitos: ['Desvantagem em Vontade.', 'Descanso recupera metade da Sanidade.'], aoEntrar: ['Perca 1d6 de Sanidade.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 17,
      tempo: '1 hora junto a uma fogueira, com alguém vivo ao lado.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'apagamento',
    titulo: 'Apagamento',
    regiao: 'O Vazio',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['ambiente', 'contato'],
      gatilho: 'Uma hora no Vazio, longe de qualquer Árvore, sem âncora nem companhia que lembre o nome de quem entrou.',
    },
    dtFortitude: 20,
    incubacao: { quantidade: 1, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Diplomacia, Atuação e Intimidação.'] },
      {
        numero: 2,
        efeitos: ['−2 em Diplomacia, Atuação e Intimidação.'],
        drenagemAtributo: {
          atributo: 'Carisma',
          valor: 1,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
      {
        numero: 3,
        efeitos: ['Desvantagem em Diplomacia, Atuação e Intimidação.'],
        drenagemAtributo: {
          atributo: 'Carisma',
          valor: 2,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 20,
      tempo: '1 hora ao lado de alguém que conheça o nome do paciente e o diga em voz alta.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
    observacoes: ['A drenagem indicada pelo estágio atual substitui a anterior; não acumule os valores.'],
  },
];

const formatarPeriodo = (periodo: IPeriodoAflicao) =>
  periodo.quantidade === 0 ? 'imediata' : `${periodo.quantidade} ${periodo.unidade}${periodo.quantidade === 1 ? '' : 's'}`;

const catalogoPublicado = CATALOGO_AFLICOES.map((aflicao) => `
  <section>
    <h4>${aflicao.titulo}</h4>
    <p><strong>${aflicao.tipo}</strong> ${aflicao.classificacao} · ${aflicao.regiao} · Fortitude DT ${aflicao.dtFortitude} · incubação ${formatarPeriodo(aflicao.incubacao)} · intervalo ${formatarPeriodo(aflicao.intervalo)}</p>
    <p><strong>Exposição:</strong> ${aflicao.exposicao.gatilho}</p>
    <ul class="regras-list">${aflicao.estagios.map((estagio) => `<li><strong>Estágio ${estagio.numero}:</strong> ${[
      ...estagio.efeitos,
      ...(estagio.aoEntrar ?? []),
      ...(estagio.drenagemAtributo ? [`Drenagem temporária: −${estagio.drenagemAtributo.valor} ${estagio.drenagemAtributo.atributo}.`] : []),
    ].join(' ') || 'Sem efeito.'}</li>`).join('')}</ul>
    <p><strong>Tratamento:</strong> Cura DT ${aflicao.tratamento.dt}; ${aflicao.tratamento.tempo} ${aflicao.tratamento.efeitoSucesso} ${aflicao.tratamento.limite}</p>
  </section>
`).join('');

const tabelaAflicoesPorRegiao = REGIOES_AFLICAO.flatMap((regiao) => CATALOGO_AFLICOES
  .filter((aflicao) => aflicao.regiao === regiao)
  .map((aflicao) => `
        <tr>
          <td><strong>${regiao}</strong></td>
          <td>${aflicao.titulo}</td>
          <td>${aflicao.tipo}, ${aflicao.classificacao}</td>
          <td>${aflicao.dtFortitude}</td>
          <td>${aflicao.exposicao.gatilho}</td>
        </tr>`)).join('');

export const REGRA_AFLICOES = {
  status: 'Regra oficial',
  resumo: 'Exposição, progressão, estágios e tratamento de venenos, doenças e vícios.',
  destaques: [
    ['Resistência', 'Fortitude contra a DT da aflição'],
    ['Tratamento', 'Cura reduz o estágio; antídotos obedecem à própria descrição'],
    ['Encerramento', 'Estágio 0 remove a aflição'],
  ],
  categoria: 'Combate e Mecânicas' as const,
  corpo: `
    <h3 class="regras-subtitle">Aplicação</h3>
    <ol class="regras-list">
      <li>Ao sofrer exposição, teste Fortitude contra a DT da aflição. Sucesso ou sucesso crítico evita a aflição. Falha aplica o estágio 1 depois da incubação; falha crítica aplica o estágio 2.</li>
      <li>No fim de cada intervalo, faça outro teste. Sucesso crítico reduz 1 estágio; sucesso mantém; falha aumenta 1; falha crítica aumenta 2.</li>
      <li>O estágio não passa do maior valor do catálogo. Seus efeitos não se acumulam com os de estágios anteriores, salvo indicação expressa.</li>
      <li>Ao chegar ao estágio 0, remova a aflição e restaure qualquer atributo drenado conforme a recuperação indicada.</li>
    </ol>
    <h3 class="regras-subtitle">Exposições repetidas</h3>
    <p>Uma nova exposição à mesma aflição exige Fortitude. Falha aumenta 1 estágio imediatamente. Esse aumento ocorre no máximo uma vez por cena. Aflições diferentes são acompanhadas separadamente.</p>
    <h3 class="regras-subtitle">Tratamento</h3>
    <ul class="regras-list">
      <li>Cura usa a DT, o tempo e o limite registrados na aflição. Sucesso reduz 1 estágio.</li>
      <li>O Antídoto da loja encerra um veneno ativo. Preparos específicos que citam doença também podem encerrá-la.</li>
      <li>Cansaço recebido ao entrar em um estágio permanece até ser reduzido pelas regras de descanso.</li>
      <li>Drenagem de atributo é temporária, não acumula entre estágios e não pode passar de −3 por aflição.</li>
    </ul>
    <h3 class="regras-subtitle">Imunidades</h3>
    <p>Use a extensão exata da característica racial. Golem não contrai doenças comuns. Auleth é imune a doenças comuns e sobrenaturais. Autômato é imune a doenças e venenos enquanto não possuir Máquina Viva. Outras fisiologias só recebem imunidade quando o próprio texto determinar.</p>
    <h3 class="regras-subtitle">Dependência e abstinência</h3>
    <ul class="regras-list">
      <li>Um vício só começa quando seu gatilho de dependência for cumprido e o teste indicado falhar.</li>
      <li>Durante abstinência, aplique apenas os efeitos mecânicos do estágio. O jogador continua decidindo as ações do personagem.</li>
      <li>Usar a substância pode suspender efeitos conforme o catálogo, mas não reduz o estágio nem substitui tratamento.</li>
    </ul>
    <h3 class="regras-subtitle">Na ficha</h3>
    <p>A ficha tem uma seção Aflições para acompanhar o que o personagem carrega. Escolha a aflição e role Fortitude contra a DT dela, ou aplique sem teste quando o Mestre já decidiu. A cada intervalo, o botão Teste do intervalo rola de novo e sobe, mantém ou desce o estágio conforme o resultado, e o estágio mostra o que ele faz com você.</p>
    <ul class="regras-list">
      <li>O que um estágio cobra ao entrar a ficha aplica sozinha: o Cansaço (até o teto de 6) e a perda de Sanidade, rolada no servidor e com Desfazer. A drenagem de atributo do estágio atual entra nos atributos enquanto a aflição durar e some quando ela chega ao estágio 0.</li>
      <li>Raça com imunidade só ganha um aviso. A decisão de aplicar ou não continua com a mesa.</li>
      <li>O Mestre também aplica e muda aflições pelo cartão do personagem na Mesa ao Vivo, e a mudança aparece na sua ficha.</li>
    </ul>
    <h3 class="regras-subtitle">Aflições por região</h3>
    <p>Cada região do Jardim tem as próprias doenças e venenos. A tabela diz onde cada aflição costuma ser pega, para o grupo saber o que levar antes de entrar: pano no rosto em Baluarte, sombra para os olhos em Alétheia, companhia no Vazio. Fora da região, só vale se alguém levou a exposição junto, como um pó, uma amostra ou um ferimento aberto.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Região</th><th>Aflição</th><th>Tipo</th><th>DT</th><th>Como se pega</th></tr></thead>
      <tbody>${tabelaAflicoesPorRegiao}
      </tbody>
    </table></div>
    <h3 class="regras-subtitle">Catálogo de aflições</h3>
    ${catalogoPublicado}
  `,
  corpoMestre: `
    <p class="regras-lead">Aflição é a única mecânica do livro que anda sozinha depois de aplicada. Você aplica uma vez e ela cobra teste a cada intervalo até alguém tratar, o que a torna ótima para pressão de médio prazo e péssima como dano de rotina.</p>

    <h3 class="regras-subtitle">Escolher a aflição certa</h3>
    <ul class="regras-list">
      <li>O que decide o peso não é a DT, é o intervalo. Veneno de combate cobra teste a cada rodada e resolve dentro da cena; doença cobra a cada dia e atravessa sessões.</li>
      <li>O catálogo publicado anda entre DT 14 e DT 20. Fique nessa faixa: acima dela a aflição vira sentença, porque o alvo falha em quase todo intervalo.</li>
      <li>Falha crítica na exposição já entra direto no estágio 2. Isso é duro, e é o motivo para não distribuir exposição em cena banal.</li>
      <li>Use a tabela por região. A aflição de um lugar funciona melhor quando o grupo foi avisado do perigo antes: quem ouviu falar do Pulmão de Pedra em Baluarte leva pano para o rosto, e aí a escolha passa a ser dele.</li>
      <li>As aflições sobrenaturais das regiões (Alétheia, Vórtice, Matriz, Éon, Limiar e o Vazio) pedem tratamento que o grupo nem sempre alcança. Antes de aplicar uma, tenha na cabeça como a mesa vai sair dela.</li>
    </ul>

    <h3 class="regras-subtitle">Não virar imposto</h3>
    <ul class="regras-list">
      <li>Uma exposição por cena, no máximo. A regra de que nova exposição sobe só 1 estágio por cena existe justamente para impedir a soma infinita.</li>
      <li>Deixe sempre uma saída à vista: o Antídoto está na Loja, e Cura reduz um estágio por tentativa. Se o grupo não alcança nenhum dos dois, a aflição deixou de ser risco e virou punição.</li>
      <li>Drenagem de atributo é temporária e para em menos 3 por aflição. Não improvise drenagem permanente: isso é território de maldição, que é outra coisa.</li>
      <li>O Cansaço ganho ao entrar num estágio fica até o descanso reduzir. Some ao que a campanha já está cobrando antes de aplicar mais uma.</li>
    </ul>

    <h3 class="regras-subtitle">Aplicar pela mesa</h3>
    <p>Na Sessão ao Vivo, o cartão de cada personagem tem um painel de Aflições: aplique, mude o estágio ou tire sem sair da cena. O jogador vê a mudança na ficha e continua rolando os testes de intervalo. Use o estágio de entrada para a exposição que a história já resolveu, e deixe o teste de Fortitude para quando houver dúvida de verdade.</p>

    <h3 class="regras-subtitle">Respeitar as imunidades</h3>
    <p>Use a extensão exata escrita na raça: Golem escapa de doença comum, Auleth escapa de comum e sobrenatural, Autômato escapa de doença e veneno enquanto não tiver Máquina Viva. Não estenda por analogia, e não invente imunidade para fisiologia que não a declara.</p>

    <h3 class="regras-subtitle">Vício, com cuidado</h3>
    <ul class="regras-list">
      <li>Dependência só começa quando o gatilho é cumprido e o teste falha. Não aplique porque o personagem usou uma vez.</li>
      <li>Na abstinência, aplique só o efeito mecânico. Quem decide o que o personagem faz continua sendo o jogador, sempre.</li>
      <li>Este é conteúdo que pede combinação prévia. Pergunte à mesa antes de colocar vício em jogo, do mesmo jeito que perguntaria sobre qualquer tema pesado.</li>
    </ul>
  `,
};
