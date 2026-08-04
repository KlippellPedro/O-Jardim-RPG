import type { ICatalogo, IClasse, IRaca, IPericiaCatalogo } from '../types/catalogo';

// We import JSONs directly in Vite for faster loading and static bundling.
import classesData from '../../data/ficha/classes.json';
import racasData from '../../data/ficha/racas.json';
import periciasData from '../../data/ficha/pericias.json';
import legadosData from '../../data/ficha/legados.json';
import legadosNovosData from '../../data/ficha/legados-novos.json';
import legadosRegrasData from '../../data/ficha/legados-regras-v1.json';

type RegraLegadoV1 = { descricao: string; pre_requisitos?: unknown[] };
const REGRAS_LEGADOS = legadosRegrasData.regras as Record<string, RegraLegadoV1>;

let cache: ICatalogo | null = null;

export const RACAS_CATALOGO = racasData as unknown as IRaca[];
export const CLASSES_CATALOGO = classesData as unknown as IClasse[];
const PERICIAS_RAW = periciasData as { pericias: IPericiaCatalogo[]; resistencias?: IPericiaCatalogo[] };
export const PERICIAS_CATALOGO = [...new Map(
  [...(PERICIAS_RAW.pericias || []), ...(PERICIAS_RAW.resistencias || [])].map((item) => [item.id, item]),
).values()];
export const LEGADOS_CATALOGO = [
  ...(legadosData as any).legados.map((legado: any) => ({
    ...legado,
    ...(REGRAS_LEGADOS[legado.id] || {}),
    versaoRegras: REGRAS_LEGADOS[legado.id] ? legadosRegrasData.versao : 'fonte',
  })),
  ...(legadosNovosData as any).novos.map((legado: any) => ({ ...legado, versaoRegras: '1.0' })),
];

export async function carregarCatalogo(): Promise<ICatalogo> {
  if (!cache) {
    const classes = CLASSES_CATALOGO;
    const racas = RACAS_CATALOGO;
    cache = {
      classes,
      racas,
      pericias: PERICIAS_CATALOGO,
      resistencias: [],
      legados: LEGADOS_CATALOGO,
    };
  }
  return cache;
}
