export type TipoRecompensaClasse = 'poder' | 'habilidade' | 'grau_pericia' | 'evento' | 'habilidade_final';

export interface IRecompensaClasse {
  tipo: TipoRecompensaClasse;
  titulo: string;
  estagio?: number;
  quantidade?: number;
}

export interface IProgressaoClasse {
  nivel: number;
  recompensas: IRecompensaClasse[];
}

export interface IEstagioHabilidadeClasse {
  nivel: number;
  titulo?: string;
  descricao: string;
}

export interface IHabilidadeClasse {
  id: string;
  titulo: string;
  descricao?: string;
  niveis: number[];
  estagios?: IEstagioHabilidadeClasse[];
}

export interface IEventoClasse {
  id: string;
  titulo: string;
  descricao: string;
  niveis: number[];
}

export interface IPoderClasse {
  id: string;
  titulo: string;
  custo_mana: number;
  descricao: string;
  pre_requisitos?: string[];
  repetivel?: boolean;
  limite?: number;
}

export interface IClasse {
  id: string;
  titulo: string;
  descricao?: string;
  vida: number;
  mana: number;
  categoria?: string;
  disponibilidade?: string;
  arvore?: string | null;
  arvores?: string[];
  origem_conteudo?: 'material_enviado_revisado' | 'proposta_original_balanceada';
  versao_balanceamento?: string;
  progressao_publicada?: boolean;
  progressao?: IProgressaoClasse[];
  habilidades?: IHabilidadeClasse[];
  eventos?: IEventoClasse[];
  poderes?: IPoderClasse[];
  [key: string]: any; // Allow extensibility for legacy fields
}

export interface ICaracteristicaRacial {
  id: string;
  titulo: string;
  descricao?: string;
  /** Nível total exigido para o traço valer. Ausente = vale desde o nível 1. */
  nivel_minimo?: number;
  [key: string]: any;
}

export interface IOpcaoRacial {
  id: string;
  titulo: string;
  descricao?: string;
  caracteristicas?: ICaracteristicaRacial[];
  ajustes_atributos?: Record<string, number>;
  vida?: number;
  mana?: number;
  movimento?: number;
  [key: string]: any;
}

export interface IRaca {
  id: string;
  titulo: string;
  descricao?: string;
  ajustes_atributos?: Record<string, number>;
  vida?: number;
  mana?: number;
  movimento?: number;
  categoria?: string;
  disponibilidade?: string;
  arvore?: string | null;
  arvores?: string[];
  fisiologia?: string[];
  caracteristicas?: ICaracteristicaRacial[];
  variantes?: IOpcaoRacial[];
  /** Escada de maturação da raça, destravada por nível total (Espírito). */
  estagios?: IOpcaoRacial[];
  linhagens?: IOpcaoRacial[];
  condicoes_ancestrais?: IOpcaoRacial[];
  rotulo_variante?: string;
  descricao_variantes?: string;
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
