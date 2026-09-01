export interface ICharacter {
  id: string;
  nome: string;
  donoUsuarioId?: string | null;
  somenteLeitura?: boolean;
  nivel: number;
  versao?: number; // controle de concorrência otimista (versão do registro na API)
  ficha?: Record<string, any>; // conteúdo completo da ficha (schema flexível da API)
  criadoEm: string;
  atualizadoEm: string;
  racaId?: string;
  classeId?: string;
  arvoreId?: string;
  classes?: Array<{ id: string; nivel: number }>;
  foto?: string | null;
  derivados?: {
    vida: number;
    mana: number;
    movimento: number;
    defesaNatural?: number;
    iniciativa?: number;
  };
  atributosFinais?: Record<string, number>; // atributos após ajustes raciais
  // Carteira e inventário centralizado: vivem em tabelas próprias no backend
  // (nunca em ficha.carteira/ficha.inventario, que a API ignora ao salvar).
  economiaVersao?: number;
  carteira?: Array<{ moeda: string; saldo: number; simbolo?: string }>;
  inventarioCentral?: Array<{ item_id: string; titulo: string; quantidade: number; dados: Record<string, any> }>;
  /** Aliados mantidos em outra ficha e compartilhados com este personagem. */
  aliadosCompartilhados?: Record<string, any>[];
  // Índice de extensão mantido intencionalmente: ICharacter mapeia dados legados da API
  // que possuem campos não documentados. Será removido quando o schema estiver estabilizado.
  // TODO: Remove [key: string]: any when full API schema is typed
  [key: string]: any;
}
