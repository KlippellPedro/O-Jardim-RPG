export interface IClasse {
  id: string;
  titulo: string;
  descricao?: string;
  vida: number;
  mana: number;
  [key: string]: any; // Allow extensibility for legacy fields
}

export interface IRaca {
  id: string;
  titulo: string;
  descricao?: string;
  ajustes_atributos?: Record<string, number>;
  vida?: number;
  mana?: number;
  movimento?: number;
  variantes?: Array<{
    id: string;
    titulo: string;
    ajustes_atributos?: Record<string, number>;
    vida?: number;
    mana?: number;
    movimento?: number;
    [key: string]: any;
  }>;
  escolha_atributos?: {
    campo: string;
    total: number;
    bonus_por_escolha?: number;
    limite?: number;
  };
  [key: string]: any;
}

export interface IPericiaCatalogo {
  id: string;
  titulo: string;
  atributo: string;
  descricao?: string;
}

export interface ICatalogo {
  classes: IClasse[];
  racas: IRaca[];
  pericias: IPericiaCatalogo[];
  resistencias?: IPericiaCatalogo[];
  legados?: any[];
}
