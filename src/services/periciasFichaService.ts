import type { IPericiaCatalogo } from '../types/catalogo';
import { classesDaFicha } from './progressaoFichaService';

/**
 * Perícias e ofícios da ficha. O catálogo traz o atributo padrão de cada
 * perícia, mas a mesa pode trocar esse atributo em qualquer uma delas, padrão
 * ou criada à mão, e a troca fica guardada em `ficha.periciasAtributos`.
 */

export const ATRIBUTOS_PERICIA: Record<string, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

const ATRIBUTO_PADRAO = 'forca';

export function atributoValido(valor: unknown): boolean {
  return typeof valor === 'string' && Object.prototype.hasOwnProperty.call(ATRIBUTOS_PERICIA, valor);
}

/** Mapa saneado de trocas de atributo guardadas na ficha. */
export function obterAtributosPersonalizados(ficha: any): Record<string, string> {
  const bruto = ficha?.periciasAtributos;
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return {};
  return Object.fromEntries(Object.entries(bruto).filter(([id, atributo]) => (
    typeof id === 'string' && id.trim() !== '' && atributoValido(atributo)
  ))) as Record<string, string>;
}

/** Atributo que a ficha usa hoje para a perícia, já considerando a troca manual. */
export function obterAtributoPericia(ficha: any, periciaId: string, atributoPadrao?: string): string {
  const personalizado = obterAtributosPersonalizados(ficha)[periciaId];
  if (personalizado) return personalizado;
  return atributoValido(atributoPadrao) ? String(atributoPadrao) : ATRIBUTO_PADRAO;
}

/**
 * Devolve o mapa atualizado para gravar em `ficha.periciasAtributos`. Voltar ao
 * atributo padrão do catálogo apaga a entrada em vez de guardar redundância.
 */
export function definirAtributoPericia(
  ficha: any,
  periciaId: string,
  atributo: string,
  atributoPadrao?: string,
): Record<string, string> {
  const proximos = { ...obterAtributosPersonalizados(ficha) };
  if (!atributoValido(atributo)) return proximos;
  if (atributo === atributoPadrao) delete proximos[periciaId];
  else proximos[periciaId] = atributo;
  return proximos;
}

/** Perícias e ofícios criados à mão, já filtrando registros quebrados. */
export function obterPericiasCustomizadas(ficha: any): IPericiaCatalogo[] {
  const bruto = ficha?.periciasCustomizadas;
  if (!Array.isArray(bruto)) return [];
  return bruto.flatMap((pericia: any) => {
    const id = typeof pericia?.id === 'string' ? pericia.id.trim() : '';
    const titulo = typeof pericia?.titulo === 'string' ? pericia.titulo.trim() : '';
    if (!id || !titulo) return [];
    return [{
      id,
      titulo,
      atributo: atributoValido(pericia?.atributo) ? String(pericia.atributo) : ATRIBUTO_PADRAO,
      descricao: typeof pericia?.descricao === 'string' ? pericia.descricao : undefined,
    }];
  });
}

export function ehPericiaCustomizada(ficha: any, periciaId: string): boolean {
  return obterPericiasCustomizadas(ficha).some((pericia) => pericia.id === periciaId);
}

export interface IRenomeacaoPericia {
  titulo: string;
  atributo: string;
}

/** Aplica nome e atributo novos a um ofício criado à mão. */
export function renomearPericiaCustomizada(
  ficha: any,
  periciaId: string,
  { titulo, atributo }: IRenomeacaoPericia,
): IPericiaCatalogo[] {
  return obterPericiasCustomizadas(ficha).map((pericia) => (
    pericia.id === periciaId
      ? {
        ...pericia,
        titulo: titulo.trim() || pericia.titulo,
        atributo: atributoValido(atributo) ? atributo : pericia.atributo,
      }
      : pericia
  ));
}

export interface IRemocaoPericia {
  periciasCustomizadas: IPericiaCatalogo[];
  pericias: Record<string, string>;
  periciasFavoritas: string[];
  rolagensPericias: Record<string, unknown>;
  periciasAtributos: Record<string, string>;
  ajustesFicha: Record<string, unknown>;
}

/**
 * Apagar um ofício precisa limpar tudo que apontava para ele, senão o grau, o
 * favorito e os ajustes manuais continuariam pesando numa perícia inexistente.
 */
export function removerPericiaCustomizada(ficha: any, periciaId: string): IRemocaoPericia {
  const pericias = { ...(ficha?.pericias && typeof ficha.pericias === 'object' ? ficha.pericias : {}) };
  delete pericias[periciaId];

  const rolagens = { ...(ficha?.rolagensPericias && typeof ficha.rolagensPericias === 'object' ? ficha.rolagensPericias : {}) };
  delete rolagens[periciaId];

  const atributos = obterAtributosPersonalizados(ficha);
  delete atributos[periciaId];

  const ajustes = { ...(ficha?.ajustesFicha && typeof ficha.ajustesFicha === 'object' ? ficha.ajustesFicha : {}) };
  delete ajustes[`pericia.${periciaId}`];

  const favoritas = Array.isArray(ficha?.periciasFavoritas)
    ? ficha.periciasFavoritas.filter((id: unknown) => typeof id === 'string' && id !== periciaId)
    : [];

  return {
    periciasCustomizadas: obterPericiasCustomizadas(ficha).filter((pericia) => pericia.id !== periciaId),
    pericias,
    periciasFavoritas: favoritas,
    rolagensPericias: rolagens,
    periciasAtributos: atributos,
    ajustesFicha: ajustes,
  };
}

/** Ordem dos graus, do menor para o maior. Espelha o que a ficha e a plataforma
 * usam para comparar treinamento. */
export const GRAUS_PERICIA = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'];

export interface IPericiaConcedida extends IPericiaCatalogo {
  /** Grau que a classe já entrega, sem gastar Grau de Treinamento. */
  grauInicial: string;
  /** Classe que concedeu, para a ficha dizer de onde veio. */
  origem: string;
}

/**
 * Perícias que a própria classe entrega ao personagem, como o Ofício
 * (Engenharia) do Engenheiro. Elas não são criadas à mão e não podem ser
 * apagadas: enquanto a classe estiver na ficha, a perícia existe.
 */
export function periciasConcedidasPelaClasse(ficha: any): IPericiaConcedida[] {
  const vistas = new Map<string, IPericiaConcedida>();
  for (const { classe } of classesDaFicha(ficha)) {
    for (const concedida of classe.pericias_concedidas || []) {
      const id = typeof concedida?.id === 'string' ? concedida.id.trim() : '';
      const titulo = typeof concedida?.titulo === 'string' ? concedida.titulo.trim() : '';
      if (!id || !titulo || vistas.has(id)) continue;
      const grauInicial = GRAUS_PERICIA.includes(String(concedida.grau_inicial)) ? String(concedida.grau_inicial) : 'aprendiz';
      vistas.set(id, {
        id,
        titulo,
        atributo: atributoValido(concedida.atributo) ? String(concedida.atributo) : ATRIBUTO_PADRAO,
        descricao: typeof concedida.descricao === 'string' ? concedida.descricao : undefined,
        grauInicial,
        origem: classe.titulo,
      });
    }
  }
  return [...vistas.values()];
}

export function ehPericiaConcedida(ficha: any, periciaId: string): boolean {
  return periciasConcedidasPelaClasse(ficha).some((pericia) => pericia.id === periciaId);
}

export interface IPericiaParaEfeito {
  id: string;
  titulo: string;
}

/**
 * Lista completa usada ao configurar efeitos automáticos. Além das perícias
 * do catálogo, inclui os Ofícios entregues pelas classes e os que foram
 * criados à mão na própria ficha.
 */
export function periciasDisponiveisParaEfeitos(
  ficha: any,
  catalogo: Array<Pick<IPericiaCatalogo, 'id' | 'titulo'>>,
): IPericiaParaEfeito[] {
  const unicas = new Map<string, IPericiaParaEfeito>();
  for (const pericia of [
    ...catalogo,
    ...periciasConcedidasPelaClasse(ficha),
    ...obterPericiasCustomizadas(ficha),
  ]) {
    const id = String(pericia?.id || '').trim();
    const titulo = String(pericia?.titulo || '').trim();
    if (id && titulo && !unicas.has(id)) unicas.set(id, { id, titulo });
  }
  return [...unicas.values()];
}

/**
 * Graus da ficha com o piso que as classes concedem já aplicado. O jogador pode
 * subir a perícia concedida com os Graus de Treinamento dele, e nunca vê ela
 * abaixo do grau que a classe deu.
 */
export function grausComConcedidos(ficha: any): Record<string, string> {
  const guardados = ficha?.pericias && typeof ficha.pericias === 'object' && !Array.isArray(ficha.pericias)
    ? { ...ficha.pericias } as Record<string, string>
    : {};
  for (const concedida of periciasConcedidasPelaClasse(ficha)) {
    const atual = GRAUS_PERICIA.indexOf(String(guardados[concedida.id]));
    if (atual < GRAUS_PERICIA.indexOf(concedida.grauInicial)) guardados[concedida.id] = concedida.grauInicial;
  }
  return guardados;
}
