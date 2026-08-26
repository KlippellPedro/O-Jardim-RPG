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

/** Ficha tecnica de um efeito de classe, no mesmo vocabulario das magias.
 * Todos os campos sao opcionais: cada classe preenche o que o efeito realmente
 * define, e o que fica de fora nao aparece na tela. `defesa` guarda o teste que
 * o alvo faz para escapar. */
export interface IFichaTecnicaClasse {
  acao?: string;
  alcance?: string;
  duracao?: string;
  defesa?: string;
  dano?: string;
  usos?: string;
}

export interface IEstagioHabilidadeClasse extends IFichaTecnicaClasse {
  nivel: number;
  titulo?: string;
  descricao: string;
}

export type TCategoriaEfeitoFichaClasse = 'atributo' | 'recurso' | 'combate' | 'pericia';
export type TModoEfeitoFichaClasse = 'bonus' | 'vantagem' | 'desvantagem';

/** Efeito numérico permanente que pode ser aplicado diretamente aos cálculos
 * da ficha. Bônus condicionais continuam somente na descrição para não serem
 * somados fora da situação em que realmente valem. */
export interface IEfeitoFichaClasse {
  id: string;
  categoria: TCategoriaEfeitoFichaClasse;
  alvo: string;
  modo: TModoEfeitoFichaClasse;
  valor: number;
}

export interface IMarcoEfeitosOpcaoClasse {
  /** Degrau da escada da habilidade, não o nível bruto da classe. */
  nivel: number;
  efeitos: IEfeitoFichaClasse[];
}

export interface IOpcaoHabilidadeClasse extends IFichaTecnicaClasse {
  id: string;
  titulo: string;
  descricao: string;
  /** O que esta opcao ganha nos niveis mais altos da escada da habilidade. */
  escalonamento?: string;
  /** Substitui os efeitos do degrau anterior pelo marco mais recente. */
  efeitos_por_nivel?: IMarcoEfeitosOpcaoClasse[];
}

/** Escada que faz o catalogo de uma habilidade acompanhar o nivel da classe.
 * As formulas do Alquimista sobem de 1 a 5 sozinhas, sem gastar vaga: cada
 * marco diz em que nivel da classe a escada avanca um degrau. */
export interface IMarcoEscalonamento {
  nivel: number;
  nivel_classe: number;
}

export interface IEscalonamentoHabilidade {
  rotulo: string;
  descricao?: string;
  marcos: IMarcoEscalonamento[];
}

/** Configuracao das vagas de escolha de uma habilidade (as Engenhocas do
 * Engenheiro, por exemplo). `total` fixa a quantidade; `niveis_vaga` abre uma
 * vaga em cada nivel listado, para quando as vagas nao saem em todo estagio;
 * sem os dois, cada estagio ja alcancado libera `por_estagio` vagas. */
export interface IEscolhaOpcoesClasse {
  rotulo: string;
  descricao?: string;
  total?: number;
  niveis_vaga?: number[];
  por_estagio?: number;
  repetivel?: boolean;
  /** Escolha de perfil que acompanha o personagem (a especialidade do
   * Engenheiro, a praca do Comerciante). Ela nao e um efeito acionavel, entao
   * nao declara acao, alcance nem duracao. */
  permanente?: boolean;
}

export interface IHabilidadeClasse extends IFichaTecnicaClasse {
  id: string;
  titulo: string;
  descricao?: string;
  niveis: number[];
  estagios?: IEstagioHabilidadeClasse[];
  escolha_opcoes?: IEscolhaOpcoesClasse;
  escalonamento?: IEscalonamentoHabilidade;
  opcoes?: IOpcaoHabilidadeClasse[];
}

export interface IEventoClasse {
  id: string;
  titulo: string;
  descricao: string;
  niveis: number[];
}

export interface IPoderClasse extends IFichaTecnicaClasse {
  id: string;
  titulo: string;
  custo_mana: number;
  descricao: string;
  pre_requisitos?: string[];
  repetivel?: boolean;
  limite?: number;
}

/** Pericia que a propria classe entrega ao personagem, de graca. O Oficio
 * (Engenharia) do Engenheiro e o primeiro caso: ele nao ocupa uma das pericias
 * iniciais nem gasta Grau de Treinamento. */
export interface IPericiaConcedidaClasse {
  id: string;
  titulo: string;
  atributo: string;
  grau_inicial?: string;
  descricao?: string;
}

/** Quando a classe resolve as proprias DTs rolando uma pericia em vez de usar
 * um numero fixo. O resultado da rolagem vira a DT que o alvo precisa alcancar. */
export interface IDtEfeitosClasse {
  rotulo: string;
  pericia: string;
  descricao: string;
}

export interface ITarefaBancadaClasse {
  tarefa: string;
  dt: string;
  nota?: string;
}

export interface ITarefasBancadaClasse {
  rotulo: string;
  descricao?: string;
  /** Cabecalhos da tabela. Sem eles, vale Tarefa / DT / Custo. */
  colunas?: [string, string, string];
  itens: ITarefaBancadaClasse[];
  /**
   * Quando a página da classe já mostra essa tabela em algum outro lugar (ex.: um catálogo
   * agrupado no fim da página), esse texto substitui a tabela inteira aqui no topo por uma
   * menção curta apontando pra onde ela está.
   */
  resumo_no_topo?: string;
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
  pericias_concedidas?: IPericiaConcedidaClasse[];
  dt_efeitos?: IDtEfeitosClasse;
  tarefas_bancada?: ITarefasBancadaClasse;
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
  naturezas_divinas?: IOpcaoRacial[];
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
