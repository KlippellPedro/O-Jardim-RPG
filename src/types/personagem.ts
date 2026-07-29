// Tipos para criação e atualização de personagens

export interface ICreateCharacterPayload {
  nome: string;
  arvoreId: string;
  racaId: string;
  classeId: string;
  classes: Array<{ classeId: string; nivel: number }>;
  nivel: number;
  xp: number;
  metodoAtributos: 'padrao' | 'pontos' | 'rolado';
  atributosBase: Record<string, number>;
  atributosFinais: Record<string, number>;
  derivados: {
    vida: number;
    mana: number;
    movimento: number;
    defesaNatural?: number;
    iniciativa?: number;
  };
  lunarisInicial?: number;
  pericias?: Record<string, any>;
  inventarioInicial?: any[];
  escolhaRacial?: {
    varianteId?: string | null;
    divindade?: string;
    [key: string]: any;
  };
}

export interface IUpdateCharacterPayload {
  nome?: string;
  ficha?: Record<string, any>;
  versao_esperada?: number;
}
