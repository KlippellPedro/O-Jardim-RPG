import { PATAMARES_BASE } from '../../data/regras/bases';

export interface IInstalacaoFicha {
  id: string;
  nome: string;
  nivel: number;
  espacosOcupados: number;
}

export interface IPropriedadeFicha {
  id: string;
  nome: string;
  tipo: string;
  localizacao: string;
  patamar: string;
  valorAquisicao: number;
  manutencao: number;
  descricao: string;
  qualidadeQuartos: string;
  instalacoes: IInstalacaoFicha[];
}

export const PROPRIEDADE_VAZIA: Omit<IPropriedadeFicha, 'id'> = {
  nome: '',
  tipo: 'residencia',
  localizacao: '',
  patamar: '',
  valorAquisicao: 0,
  manutencao: 0,
  descricao: '',
  qualidadeQuartos: '',
  instalacoes: [],
};

export const TIPOS_PROPRIEDADE = [
  { value: 'residencia', label: 'Residência' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'comercio', label: 'Comércio' },
  { value: 'base', label: 'Base' },
  { value: 'outro', label: 'Outro' },
];

export const QUALIDADES_QUARTO = [
  { value: '', label: 'Padrão / Não possui' },
  { value: 'boa', label: 'Boa' },
  { value: 'maravilhosa', label: 'Maravilhosa' },
  { value: 'excelente', label: 'Excelente' },
];

export const novoIdPropriedade = (prefixo: string) => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${prefixo}-${crypto.randomUUID()}`
    : `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export const numeroFinito = (valor: unknown, padrao = 0) => {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : padrao;
};

export const textoSeguro = (valor: unknown, padrao = '') => (
  typeof valor === 'string' ? valor : valor == null ? padrao : String(valor)
);

export const normalizarInstalacoes = (valor: unknown): IInstalacaoFicha[] => {
  if (!Array.isArray(valor)) return [];
  return valor.map((item, index) => {
    const dados = item && typeof item === 'object' && !Array.isArray(item) ? item as Record<string, unknown> : {};
    return {
      id: textoSeguro(dados.id) || novoIdPropriedade(`instal-${index}`),
      nome: textoSeguro(dados.nome),
      nivel: Math.max(1, numeroFinito(dados.nivel, 1)),
      espacosOcupados: Math.max(1, numeroFinito(dados.espacosOcupados, 1)),
    };
  });
};

export const normalizarPropriedades = (valor: unknown): IPropriedadeFicha[] => {
  if (!Array.isArray(valor)) return [];
  const idsUsados = new Set<string>();
  return valor.map((item, index) => {
    const dados = item && typeof item === 'object' && !Array.isArray(item)
      ? item as Record<string, unknown>
      : {};
    const idBase = textoSeguro(dados.id).trim() || `propriedade-legado-${index}`;
    const id = idsUsados.has(idBase) ? `${idBase}-${index}` : idBase;
    idsUsados.add(id);
    return {
      id,
      nome: textoSeguro(dados.nome),
      tipo: textoSeguro(dados.tipo, 'outro') || 'outro',
      localizacao: textoSeguro(dados.localizacao),
      patamar: textoSeguro(dados.patamar),
      valorAquisicao: Math.max(0, numeroFinito(dados.valorAquisicao)),
      manutencao: Math.max(0, numeroFinito(dados.manutencao)),
      descricao: textoSeguro(dados.descricao),
      qualidadeQuartos: textoSeguro(dados.qualidadeQuartos),
      instalacoes: normalizarInstalacoes(dados.instalacoes),
    };
  });
};

export const calcularEspacosPropriedade = (propriedade: IPropriedadeFicha) => {
  const patamarDados = PATAMARES_BASE.find(p => p.id === propriedade.patamar);
  const espacosTotais = patamarDados ? patamarDados.espacos : 0;
  const espacosUsados = propriedade.instalacoes.reduce((acc, inst) => acc + inst.espacosOcupados, 0);
  return { espacosTotais, espacosUsados };
};
