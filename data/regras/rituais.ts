import magiasData from '../ficha/magias.json';
import type { EstadoMaterial, ReceitaMaterial } from './materiais';
import {
  custoComponentesRitual,
  raridadeComponentePorComplexidadeRitual,
} from './recursos-materiais';

interface RitualFonte {
  id: string;
  titulo: string;
  complexidade: string;
  efeito: string;
  ingredientes?: Array<{ item_id: string; quantidade: number }>;
}

/** A escala dos rituais já usa as mesmas DTs da régua de crafting. */
export const RARIDADE_POR_COMPLEXIDADE_RITUAL = Object.fromEntries(
  ['simples', 'complexo', 'grandioso', 'monumental'].map((complexidade) => [
    complexidade,
    raridadeComponentePorComplexidadeRitual(complexidade),
  ]),
) as Record<string, ReturnType<typeof raridadeComponentePorComplexidadeRitual>>;

const ESTADO_MINIMO_COMPONENTE: Record<string, EstadoMaterial> = {
  'comp-marco-de-pedra': 'processado',
  'comp-papel-e-tinta': 'processado',
  'comp-simbolo-pessoal': 'processado',
  'comp-receptor-inscrito': 'processado',
  'comp-amostra-biologica': 'processado',
  'comp-material-medicinal': 'processado',
  'comp-materiais-diversos': 'processado',
  'comp-amostra-elemental': 'processado',
  'comp-metal-para-forja': 'processado',
  'comp-ancora-de-pedra': 'processado',
  'comp-objeto-fixo': 'processado',
  'comp-recipiente-selavel': 'processado',
  'comp-ampulheta-graduada': 'processado',
  'comp-ferramentas-bancada': 'processado',
  'comp-nucleo-tecnologico': 'refinado',
  'comp-emissor-axis': 'processado',
  'comp-pecas-mecanicas': 'processado',
  'comp-simbolo-pecado': 'refinado',
  'comp-simbolo-virtude': 'refinado',
};

/**
 * Requisitos materiais de todos os rituais que consomem ingredientes.
 *
 * `data/ficha/magias.json` permanece a fonte canônica de título, execução,
 * efeito e ingredientes. A adaptação é derivada em vez de copiar 30 ritos à
 * mão; assim um ingrediente novo no catálogo mágico precisa passar pelos
 * testes de materiais antes de chegar ao livro.
 */
export const RITUAIS: ReceitaMaterial[] = (magiasData.rituais as RitualFonte[])
  .filter((ritual) => ritual.ingredientes?.length)
  .map((ritual) => {
    const raridade = RARIDADE_POR_COMPLEXIDADE_RITUAL[ritual.complexidade];
    if (!raridade) throw new RangeError(`Complexidade de ritual sem raridade de materiais: ${ritual.complexidade}`);
    return {
      id: ritual.id,
      titulo: ritual.titulo,
      classe: 'ritualista',
      raridade,
      custoRecurso: {
        recurso: 'componentes-ritualisticos',
        quantidade: custoComponentesRitual(ritual.complexidade),
        escopo: 'por-ritual',
      },
      linhas: ritual.ingredientes!.map((ingrediente, indice) => ({
        id: `${ingrediente.item_id}-${indice + 1}`,
        quantidade: ingrediente.quantidade,
        materialId: ingrediente.item_id,
        estadoMinimo: ESTADO_MINIMO_COMPONENTE[ingrediente.item_id],
        maxUnidades: ingrediente.quantidade > 3 ? ingrediente.quantidade : undefined,
      })),
      efeito: ritual.efeito,
    };
  });
