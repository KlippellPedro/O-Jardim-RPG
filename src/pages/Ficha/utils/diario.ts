import type { IEventoDiario, IMarcaDiario, TipoEventoDiario } from '../../../services/diarioApi';

export const LIMITE_COMENTARIO_DIARIO = 600;

export const FILTROS_DIARIO: { valor: 'todos' | 'fixados' | TipoEventoDiario; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Tudo' },
  { valor: 'fixados', rotulo: 'Fixados' },
  { valor: 'sessao', rotulo: 'Sessões' },
  { valor: 'critico', rotulo: 'Críticos' },
  { valor: 'falha', rotulo: 'Desastres' },
  { valor: 'dano', rotulo: 'Golpes' },
  { valor: 'uso', rotulo: 'Primeiras vezes' },
  { valor: 'conquista', rotulo: 'Selos' },
  { valor: 'ganho', rotulo: 'Ganhos' },
  { valor: 'gasto', rotulo: 'Gastos' },
];

export type FiltroDiario = (typeof FILTROS_DIARIO)[number]['valor'];

/** Lê as marcas salvas na ficha descartando o que não for reconhecível. */
export function normalizarMarcas(bruto: unknown): Record<string, IMarcaDiario> {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
  const resultado: Record<string, IMarcaDiario> = {};
  Object.entries(bruto as Record<string, unknown>).forEach(([chave, valor]) => {
    if (!valor || typeof valor !== 'object') return;
    const marca = valor as Record<string, unknown>;
    const comentario = typeof marca.comentario === 'string'
      ? marca.comentario.trim().slice(0, LIMITE_COMENTARIO_DIARIO)
      : '';
    const fixado = marca.fixado === true;
    if (fixado || comentario) {
      resultado[chave] = { ...(fixado ? { fixado } : {}), ...(comentario ? { comentario } : {}) };
    }
  });
  return resultado;
}

/** Muda uma marca e apaga a entrada quando ela fica vazia. */
export function alterarMarca(
  marcas: Record<string, IMarcaDiario>,
  chave: string,
  mudanca: IMarcaDiario,
): Record<string, IMarcaDiario> {
  const limpa = normalizarMarcas({ [chave]: { ...marcas[chave], ...mudanca } })[chave];
  const resto = { ...marcas };
  delete resto[chave];
  return limpa ? { ...resto, [chave]: limpa } : resto;
}

export function filtrarEventos(
  eventos: IEventoDiario[],
  filtro: FiltroDiario,
  marcas: Record<string, IMarcaDiario>,
): IEventoDiario[] {
  if (filtro === 'todos') return eventos;
  if (filtro === 'fixados') return eventos.filter((evento) => marcas[evento.chave]?.fixado);
  return eventos.filter((evento) => evento.tipo === filtro);
}

export interface IDiaDiario {
  dia: string;
  rotulo: string;
  eventos: IEventoDiario[];
}

const chaveDoDia = (iso: string) => {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return 'sem-data';
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
};

/** Agrupa por dia mantendo a ordem em que os eventos chegaram (mais recente primeiro). */
export function agruparPorDia(eventos: IEventoDiario[]): IDiaDiario[] {
  const dias: IDiaDiario[] = [];
  eventos.forEach((evento) => {
    const dia = chaveDoDia(evento.quando);
    const atual = dias[dias.length - 1];
    if (atual && atual.dia === dia) {
      atual.eventos.push(evento);
      return;
    }
    const data = new Date(evento.quando);
    dias.push({
      dia,
      rotulo: Number.isNaN(data.getTime())
        ? 'Sem data'
        : data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      eventos: [evento],
    });
  });
  return dias;
}
