/**
 * Procura e Devoção na ficha.
 *
 * Procura mora em `ficha.procuras` (uma linha por lugar, como `ficha.prestigios`
 * é uma por facção) e Devoção em `ficha.devocao`. As escalas e os efeitos vêm do
 * livro (data/regras/faccoes.ts e data/regras/devocao.ts); aqui só a leitura
 * tolerante do que estiver salvo e as contas de botão.
 */
import { limitarProcura, procuraDepoisDeUmMesQuieto, type NivelProcura } from '../../data/regras/faccoes';
import { limitarDevocao, type NivelDevocao } from '../../data/regras/devocao';

export interface IProcuraFicha {
  id: string;
  lugar: string;
  valor: NivelProcura;
}

export interface IDevocaoFicha {
  nivel: NivelDevocao;
  /** O preceito que a fé pede. */
  pede: string;
  /** O preceito que a fé proíbe. */
  proibe: string;
}

const texto = (valor: unknown, limite: number) => (typeof valor === 'string' ? valor.slice(0, limite) : '');

export const novoIdProcura = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `procura-${crypto.randomUUID()}`
    : `procura-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

export function normalizarProcuras(bruto: unknown): IProcuraFicha[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const lista: IProcuraFicha[] = [];
  bruto.forEach((item, indice) => {
    if (!item || typeof item !== 'object') return;
    const dados = item as Record<string, unknown>;
    const lugar = texto(dados.lugar, 80).trim();
    if (!lugar) return;
    const base = texto(dados.id, 80).trim() || `procura-legado-${indice}`;
    const id = vistos.has(base) ? `${base}-${indice}` : base;
    vistos.add(id);
    const numero = Number(dados.valor);
    lista.push({ id, lugar, valor: limitarProcura(Number.isFinite(numero) ? numero : 0) });
  });
  return lista;
}

/** Um mês quieto em todos os lugares: o tempo só apaga até 2. */
export function passarMesQuieto(procuras: IProcuraFicha[]): IProcuraFicha[] {
  return procuras.map((procura) => ({ ...procura, valor: procuraDepoisDeUmMesQuieto(procura.valor) }));
}

export function normalizarDevocao(bruto: unknown): IDevocaoFicha {
  const dados = bruto && typeof bruto === 'object' ? bruto as Record<string, unknown> : {};
  const numero = Number(dados.nivel);
  return {
    nivel: limitarDevocao(Number.isFinite(numero) ? numero : 0),
    pede: texto(dados.pede, 240),
    proibe: texto(dados.proibe, 240),
  };
}
