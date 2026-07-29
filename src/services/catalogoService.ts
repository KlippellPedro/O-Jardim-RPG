import { ICatalogo, IClasse, IRaca, IPericiaCatalogo } from '../types/catalogo';

// We import JSONs directly in Vite for faster loading and static bundling.
import classesData from '../../data/ficha/classes.json';
import racasData from '../../data/ficha/racas.json';
import periciasData from '../../data/ficha/pericias.json';
import legadosData from '../../data/ficha/legados.json';
import legadosNovosData from '../../data/ficha/legados-novos.json';

// Legacy compatibility configurations (simplified or omitted if not strictly needed for creation)
const REGRAS_LEGADOS: Record<string, string> = {};
const REQUISITOS_LEGADOS_V1: Record<string, string[]> = {};

let cache: ICatalogo | null = null;

export const RACAS_CATALOGO = racasData as unknown as IRaca[];
export const CLASSES_CATALOGO = classesData as unknown as IClasse[];

export async function carregarCatalogo(): Promise<ICatalogo> {
  if (!cache) {
    const classes = CLASSES_CATALOGO;
    const racas = RACAS_CATALOGO;
    const periciasRaw = periciasData as { pericias: IPericiaCatalogo[]; resistencias?: IPericiaCatalogo[] };
    
    const todasPericias = [...(periciasRaw.pericias || []), ...(periciasRaw.resistencias || [])];
    const unicas = [...new Map(todasPericias.map(item => [item.id, item])).values()];

    cache = {
      classes,
      racas,
      pericias: unicas,
      resistencias: [],
      legados: [
        ...(legadosData as any).legados.map((legado: any) => ({
          ...legado,
          descricao: REGRAS_LEGADOS[legado.id] || legado.descricao,
          pre_requisitos: REQUISITOS_LEGADOS_V1[legado.id] || legado.pre_requisitos,
          versaoRegras: REGRAS_LEGADOS[legado.id] ? '1.0' : 'fonte',
        })),
        ...(legadosNovosData as any).novos.map((legado: any) => ({ ...legado, versaoRegras: '1.0' })),
      ],
    };
  }
  return cache;
}
