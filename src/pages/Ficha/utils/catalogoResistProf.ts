import { CATALOGO_AFLICOES } from '../../../../data/regras/aflicoes';
import { CONDICOES_OFICIAIS } from '../../../../data/regras/condicoes';
import { FERRAMENTAS_CRAFTING } from '../../../../data/regras/crafting';

export interface IOpcaoCatalogo {
  id: string;
  nome: string;
  /** Frase curta que aparece embaixo do nome no seletor. */
  dica?: string;
}

export interface IGrupoCatalogo {
  titulo: string;
  itens: IOpcaoCatalogo[];
}

export type ModoResistencia = 'resistencia' | 'vulnerabilidade' | 'imunidade';

export const MODOS_RESISTENCIA: ReadonlyArray<{ id: ModoResistencia; rotulo: string }> = [
  { id: 'resistencia', rotulo: 'Resistência' },
  { id: 'vulnerabilidade', rotulo: 'Vulnerabilidade ×2' },
  { id: 'imunidade', rotulo: 'Imunidade' },
];

/** Uma linha da lista de Resistências da ficha. `id` vazio marca uma entrada personalizada. */
export interface IResistenciaFicha {
  id: string;
  nome: string;
  modo: ModoResistencia;
  valor: number | null;
  nota: string;
}

const item = (id: string, nome: string, dica?: string): IOpcaoCatalogo => ({ id, nome, dica });

/** Tipos de dano, Fluxos, aflições e condições que o jogo já define. */
export const GRUPOS_RESISTENCIA: ReadonlyArray<IGrupoCatalogo> = [
  {
    titulo: 'Dano físico',
    itens: [
      item('fisico-geral', 'Físico geral', 'Corte, Perfuração e Impacto. Balístico fica de fora.'),
      item('corte', 'Corte'),
      item('perfuracao', 'Perfuração'),
      item('impacto', 'Impacto'),
      item('balistico', 'Balístico'),
    ],
  },
  {
    titulo: 'Dano persistente',
    itens: [
      item('sangramento', 'Sangramento'),
      item('veneno-dano', 'Veneno', 'O dano que bate de novo no fim do turno.'),
    ],
  },
  {
    titulo: 'Elementos',
    itens: ['Terra', 'Água', 'Fogo', 'Ar', 'Raio', 'Luz', 'Escuridão'].map((nome) => item(`elemento-${nome.toLocaleLowerCase('pt-BR')}`, nome)),
  },
  {
    titulo: 'Dano mágico e outros',
    itens: [
      item('magico-geral', 'Mágico geral', 'Cobre elementos e os Fluxos naturais, não o tecnológico.'),
      item('tecnologico', 'Tecnológico', 'Dano do Fluxo de Tecnologia (A.X.I.S).'),
      item('mental', 'Mental', 'Horror, revelação e ataques ao canal mágico.'),
      ...['Origem', 'Essência', 'Comunicação', 'Vitalidade', 'Inconstância', 'Físico', 'Espaço', 'Tempo', 'Vazio', 'Fim']
        .map((nome) => item(`fluxo-${nome.toLocaleLowerCase('pt-BR')}`, `Fluxo de ${nome}`)),
    ],
  },
  {
    titulo: 'Venenos, doenças e vícios',
    itens: [
      item('aflicao-veneno', 'Venenos', 'Todos os venenos.'),
      item('aflicao-doenca-comum', 'Doenças comuns'),
      item('aflicao-doenca-sobrenatural', 'Doenças sobrenaturais'),
      item('aflicao-vicio', 'Vícios'),
      ...CATALOGO_AFLICOES.map((aflicao) => item(`aflicao:${aflicao.id}`, aflicao.titulo, `${aflicao.tipo === 'doenca' ? 'Doença' : aflicao.tipo === 'veneno' ? 'Veneno' : 'Vício'} · ${aflicao.regiao}`)),
    ],
  },
  {
    titulo: 'Condições',
    itens: CONDICOES_OFICIAIS
      .filter((condicao) => !condicao.positiva)
      .map((condicao) => item(`condicao:${condicao.id}`, condicao.titulo)),
  },
];

/** Vocabulário que já existe no jogo: Simples/Marcial em armas, armaduras e escudos, e as ferramentas de crafting. */
export const GRUPOS_PROFICIENCIA: ReadonlyArray<IGrupoCatalogo> = [
  {
    titulo: 'Armas',
    itens: [
      item('armas_simples', 'Armas simples'),
      item('armas_marcial', 'Armas marciais', 'Sem isso, o ataque sofre −5.'),
    ],
  },
  {
    titulo: 'Armaduras',
    itens: [
      item('armaduras_simples', 'Armaduras simples'),
      item('armaduras_marcial', 'Armaduras marciais', 'Sem isso, a peça perde 2 de Defesa e a penalidade dobra.'),
    ],
  },
  {
    titulo: 'Escudos',
    itens: [
      item('escudos_simples', 'Escudos simples'),
      item('escudos_marcial', 'Escudos marciais', 'Sem isso, a peça perde 2 de Defesa e a penalidade dobra.'),
    ],
  },
  {
    titulo: 'Ferramentas',
    itens: FERRAMENTAS_CRAFTING.map((ferramenta) => item(`ferramenta_${ferramenta.id}`, ferramenta.titulo)),
  },
];

export const semAcento = (texto: string) => texto
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLocaleLowerCase('pt-BR')
  .trim();

const PROFICIENCIAS_POR_ID = new Map(GRUPOS_PROFICIENCIA.flatMap((grupo) => grupo.itens).map((opcao) => [opcao.id, opcao]));

/** Textos antigos digitados à mão ("armas marciais", "armaduras leves") apontam para o id do catálogo. */
const SINONIMOS_PROFICIENCIA: Record<string, string> = {
  marcial: 'armas_marcial',
  marciais: 'armas_marcial',
  'armas marcial': 'armas_marcial',
  'armas marciais': 'armas_marcial',
  'armas_marcial': 'armas_marcial',
  simples: 'armas_simples',
  'armas simples': 'armas_simples',
  'armaduras marcial': 'armaduras_marcial',
  'armaduras marciais': 'armaduras_marcial',
  'armaduras simples': 'armaduras_simples',
  'armaduras leves': 'armaduras_simples',
  'escudos marcial': 'escudos_marcial',
  'escudos marciais': 'escudos_marcial',
  'escudos simples': 'escudos_simples',
};

/** Devolve o id canônico de uma proficiência salva (catálogo ou texto antigo), ou o texto limpo se for personalizada. */
export function normalizarProficiencia(bruto: string): string {
  const texto = bruto.trim().toLocaleLowerCase('pt-BR');
  if (PROFICIENCIAS_POR_ID.has(texto)) return texto;
  return SINONIMOS_PROFICIENCIA[semAcento(texto)] ?? texto;
}

export function rotuloProficiencia(valor: string): { rotulo: string; personalizada: boolean } {
  const opcao = PROFICIENCIAS_POR_ID.get(normalizarProficiencia(valor));
  if (opcao) return { rotulo: opcao.nome, personalizada: false };
  const texto = valor.trim();
  return { rotulo: texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1), personalizada: true };
}

/** A ficha tem proficiência para o subtipo (simples/marcial) desta categoria de equipamento? */
export function temProficienciaEquipamento(proficiencias: unknown, categoria: 'armas' | 'armaduras' | 'escudos', subtipo: string): boolean {
  const lista = Array.isArray(proficiencias) ? proficiencias : [];
  const alvo = `${categoria}_${semAcento(subtipo)}`;
  return lista.some((valor) => normalizarProficiencia(String(valor)) === alvo);
}

const RESISTENCIAS_POR_ID = new Map(GRUPOS_RESISTENCIA.flatMap((grupo) => grupo.itens).map((opcao) => [opcao.id, opcao]));

export const nomeDaResistenciaOficial = (id: string) => RESISTENCIAS_POR_ID.get(id)?.nome ?? '';

/** Lê as resistências salvas na ficha, descartando o que não for reconhecível. */
export function normalizarResistencias(bruto: unknown): IResistenciaFicha[] {
  if (!Array.isArray(bruto)) return [];
  const modos = new Set<string>(MODOS_RESISTENCIA.map((modo) => modo.id));
  return bruto.flatMap((entrada): IResistenciaFicha[] => {
    if (!entrada || typeof entrada !== 'object') return [];
    const dados = entrada as Record<string, unknown>;
    const id = typeof dados.id === 'string' ? dados.id : '';
    const nome = (id ? nomeDaResistenciaOficial(id) : '') || (typeof dados.nome === 'string' ? dados.nome.trim() : '');
    if (!nome) return [];
    const valor = Number(dados.valor);
    return [{
      id,
      nome,
      modo: modos.has(String(dados.modo)) ? (dados.modo as ModoResistencia) : 'resistencia',
      valor: dados.valor === null || dados.valor === undefined || dados.valor === '' || !Number.isFinite(valor) ? null : valor,
      nota: typeof dados.nota === 'string' ? dados.nota : '',
    }];
  });
}
