import { normalizarEfeitosFicha, type IEfeitoEquipamento } from './equipamentoService';

export interface IFrutoEdenConsumido {
  itemId: string;
  titulo: string;
  consumidoEm?: string;
  despertado: boolean;
  despertadoEm?: string;
  conteudo: Record<string, any>;
}

export interface IPoderFrutoEden {
  id: string;
  nome: string;
  fonte: string;
  tipo: 'Ativa' | 'Passiva' | 'Reação' | 'Sustentada' | 'Outro';
  nivelAdquirido: string;
  custo: { recurso: 'nenhum' | 'mana' | 'vida' | 'sanidade' | 'cansaco'; valor: number };
  acao: string;
  duracao: string;
  alcance: string;
  descricao: string;
  usavel: boolean;
  estagioFruto: 'normal' | 'despertado';
}

const texto = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function obterFrutoEdenConsumido(ficha: any): IFrutoEdenConsumido | null {
  const raw = ficha?.frutoEdenConsumido;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const itemId = texto(raw.itemId);
  const titulo = texto(raw.titulo);
  if (!itemId || !titulo) return null;
  return {
    itemId,
    titulo,
    consumidoEm: texto(raw.consumidoEm) || undefined,
    despertado: raw.despertado === true,
    despertadoEm: texto(raw.despertadoEm) || undefined,
    conteudo: raw.conteudo && typeof raw.conteudo === 'object' && !Array.isArray(raw.conteudo)
      ? raw.conteudo
      : {},
  };
}

export function efeitosFichaDoFruto(ficha: any): IEfeitoEquipamento[] {
  const fruit = obterFrutoEdenConsumido(ficha);
  return normalizarEfeitosFicha(fruit?.conteudo?.efeitosFicha);
}

export function bonusRecursoDoFruto(ficha: any, target: string): number {
  return efeitosFichaDoFruto(ficha)
    .filter((effect) => effect.categoria === 'recurso' && effect.alvo === target)
    .reduce((total, effect) => total + effect.valor, 0);
}

export function habilidadeDoFruto(ficha: any) {
  const fruit = obterFrutoEdenConsumido(ficha);
  const passive = texto(fruit?.conteudo?.passivo);
  if (!fruit || !passive) return [];
  const separator = passive.indexOf(':');
  return [{
    id: `fruto:${fruit.itemId}:passivo`,
    titulo: separator > 0 ? passive.slice(0, separator).trim() : `Vínculo de ${fruit.titulo}`,
    origem: fruit.titulo,
    descricao: passive,
  }];
}

interface IRegraPoderFruto {
  id: string;
  fonte: 'tecnica' | 'despertar';
  custoMana: number;
  acao: string;
  nome?: string;
  descricao?: string;
}

const REGRAS_PODERES_FRUTOS: Record<string, IRegraPoderFruto[]> = {
  'fruto-chamas': [
    { id: 'passo-incandescente', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'sol-infernal', fonte: 'despertar', custoMana: 9, acao: 'Ação Padrão' },
  ],
  'fruto-dragao': [
    { id: 'forma-hibrida', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'dragao-anciao', fonte: 'despertar', custoMana: 12, acao: 'Ação Padrão' },
  ],
  'fruto-tremor': [
    { id: 'golpe-sismico', fonte: 'tecnica', custoMana: 3, acao: 'Ao acertar um ataque corpo a corpo' },
    { id: 'ruptura-continental', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-gravidade': [
    { id: 'orbita-forcada', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'dominio-gravitacional', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-trovao': [
    { id: 'salto-voltaico', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento', nome: 'Salto Voltaico', descricao: 'Teleporte-se até 12 m para um espaço que possa perceber.' },
    { id: 'defesa-eletromagnetica', fonte: 'tecnica', custoMana: 2, acao: 'Reação', nome: 'Defesa Eletromagnética', descricao: 'Receba +5 de Defesa contra um ataque físico; se ele errar, desloque-se 3 m sem provocar reação.' },
    { id: 'julgamento-tempestade', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-gelo': [
    { id: 'muralha-perene', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'inverno-absoluto', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-luz': [
    { id: 'passo-fotonico', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'horizonte-branco', fonte: 'despertar', custoMana: 11, acao: 'Ação Padrão' },
  ],
  'fruto-sombra': [
    { id: 'evasao-umbral', fonte: 'tecnica', custoMana: 3, acao: 'Reação' },
    { id: 'noite-sem-horizonte', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-fenix': [
    { id: 'chama-restauradora', fonte: 'tecnica', custoMana: 4, acao: 'Ação de Movimento' },
    { id: 'renascimento-solar', fonte: 'despertar', custoMana: 12, acao: 'Sem ação, ao chegar a 0 de Vida' },
  ],
  'fruto-colosso': [
    { id: 'forma-titanica', fonte: 'tecnica', custoMana: 4, acao: 'Ação de Movimento' },
    { id: 'colosso-primordial', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-quimera': [
    { id: 'metamorfose', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'quimera-perfeita', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-portais': [
    { id: 'travessia', fonte: 'tecnica', custoMana: 3, acao: 'Ação de Movimento' },
    { id: 'labirinto-axis', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-fios': [
    { id: 'laco-cortante', fonte: 'tecnica', custoMana: 3, acao: 'Ação Padrão' },
    { id: 'teatro-marionetes', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
  'fruto-instante': [
    { id: 'repeticao-breve', fonte: 'tecnica', custoMana: 4, acao: 'Reação' },
    { id: 'segundo-proibido', fonte: 'despertar', custoMana: 14, acao: 'Sem ação, depois do próprio turno' },
  ],
  'fruto-espelho': [
    { id: 'troca-especular', fonte: 'tecnica', custoMana: 4, acao: 'Reação' },
    { id: 'palacio-reflexos', fonte: 'despertar', custoMana: 10, acao: 'Ação Padrão' },
  ],
};

function powerFromRule(fruit: IFrutoEdenConsumido, rule: IRegraPoderFruto): IPoderFrutoEden | null {
  const summary = rule.descricao || texto(fruit.conteudo[rule.fonte]);
  if (!summary) return null;
  const separator = summary.indexOf(':');
  return {
    id: `fruto:${fruit.itemId}:${rule.id}`,
    nome: rule.nome || (separator > 0 ? summary.slice(0, separator).trim() : summary),
    fonte: fruit.titulo,
    tipo: 'Ativa',
    nivelAdquirido: '',
    custo: { recurso: 'mana', valor: rule.custoMana },
    acao: rule.acao,
    duracao: texto(fruit.conteudo.duracao),
    alcance: texto(fruit.conteudo.alcance),
    descricao: summary,
    usavel: true,
    estagioFruto: rule.fonte === 'despertar' ? 'despertado' : 'normal',
  };
}

export function poderesDoFruto(ficha: any): IPoderFrutoEden[] {
  const fruit = obterFrutoEdenConsumido(ficha);
  if (!fruit) return [];

  const structured = Array.isArray(fruit.conteudo.poderesFicha)
    ? fruit.conteudo.poderesFicha.flatMap((raw: any, index: number) => {
        const name = texto(raw?.nome);
        if (!name) return [];
        const resource = ['mana', 'vida', 'sanidade', 'cansaco'].includes(raw?.custo?.recurso)
          ? raw.custo.recurso
          : 'nenhum';
        const value = Math.max(0, Math.trunc(Number(raw?.custo?.valor) || 0));
        return [{
          id: `fruto:${fruit.itemId}:poder:${texto(raw?.id) || index}`,
          nome: name,
          fonte: fruit.titulo,
          tipo: ['Ativa', 'Passiva', 'Reação', 'Sustentada', 'Outro'].includes(raw?.tipo) ? raw.tipo : 'Ativa',
          nivelAdquirido: '',
          custo: { recurso: resource, valor: value },
          acao: texto(raw?.acao),
          duracao: texto(raw?.duracao),
          alcance: texto(raw?.alcance),
          descricao: texto(raw?.descricao),
          usavel: raw?.usavel !== false,
          estagioFruto: raw?.estagio === 'despertado' ? 'despertado' : 'normal',
        } as IPoderFrutoEden];
      })
    : [];
  if (structured.length > 0) {
    return structured.filter((power) => power.estagioFruto === 'normal' || fruit.despertado);
  }
  const rules = REGRAS_PODERES_FRUTOS[fruit.itemId] || [
    { id: 'tecnica', fonte: 'tecnica', custoMana: 0, acao: texto(fruit.conteudo.ativacao) },
    { id: 'despertar', fonte: 'despertar', custoMana: 0, acao: texto(fruit.conteudo.ativacao) },
  ];
  return rules
    .filter((rule) => rule.fonte === 'tecnica' || fruit.despertado)
    .map((rule) => powerFromRule(fruit, rule))
    .filter((power): power is IPoderFrutoEden => Boolean(power));
}
