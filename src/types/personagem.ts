// Tipos para criação e atualização de personagens

export interface ICreateCharacterPayload {
  nome: string;
  arvoreId: string;
  racaId: string;
  /** Nome livre pra quando racaId é a raça personalizada (ver
   * services/racaService.ts::RACA_PERSONALIZADA_ID) - nenhuma raça do
   * catálogo tem bônus zerados o bastante pra servir de "raça em branco". */
  racaNomePersonalizado?: string;
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
    estamina?: number;
    movimento: number;
    defesaNatural?: number;
    iniciativa?: number;
  };
  lunarisInicial?: number;
  pericias?: Record<string, any>;
  inventarioInicial?: any[];
  /** Ofício de antes da aventura (data/economia/oficios-v1.json). Decide Lunaris e itens iniciais. */
  oficio?: { id: string; titulo: string; faixa: string };
  /** Vínculos com que a ficha nasce: os contatos do ofício. */
  vinculos?: unknown[];
  escolhaRacial?: {
    varianteId?: string | null;
    naturezaDivinaId?: string | null;
    divindade?: string;
    [key: string]: any;
  };
}

export interface IUpdateCharacterPayload {
  nome?: string;
  ficha?: Record<string, any>;
  versao_esperada?: number;
}
