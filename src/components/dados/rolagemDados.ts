import type { IRegistro } from '../../services/registrosApi';
import { FACES_SUPORTADAS, MAX_DADOS_3D, type DadoCena } from './cenaDados';
import { semDado3d as semMovimento } from '../../utils/movimento';

export type GrauRolagem = 'sucesso critico' | 'sucesso' | 'falha' | 'falha critica';

export interface CenaRolagem {
  titulo: string;
  dados: DadoCena[];
  total: number | null;
  bonus: number;
  /** d20 natural do teste (o que valeu depois de vantagem/desvantagem). */
  natural: number | null;
  grau: GrauRolagem | null;
  dt: number | null;
  formula: string;
  destaque: 'critico' | 'falha' | null;
}

type Apresentador = (cena: CenaRolagem, terminar: () => void) => void;

let apresentador: Apresentador | null = null;
let terminarAtual: (() => void) | null = null;

/** O host da cena se registra aqui; devolve a função que desfaz o registro. */
export const registrarApresentadorRolagem = (funcao: Apresentador) => {
  apresentador = funcao;
  return () => { if (apresentador === funcao) apresentador = null; };
};


/** Transforma o registro devolvido pelo servidor numa cena, ou null quando não
 * dá para mostrar em 3D (dado sem modelo, muitos dados, sem dados). */
export const extrairCena = (registro: IRegistro): CenaRolagem | null => {
  const detalhes = (registro.detalhes || {}) as Record<string, any>;
  let dados: DadoCena[] = [];

  if (typeof detalhes.natural === 'number' && Array.isArray(detalhes.dados)) {
    // Teste de d20: com vantagem/desvantagem são dois dados e só um vale.
    let usado = false;
    dados = (detalhes.dados as number[]).map((valor) => {
      const escolhido = !usado && valor === detalhes.natural;
      if (escolhido) usado = true;
      return { faces: 20, valor, ignorado: detalhes.dados.length > 1 && !escolhido };
    });
  } else if (Array.isArray(detalhes.termos)) {
    detalhes.termos.forEach((termo: any) => {
      if (termo?.tipo !== 'dado' || !Array.isArray(termo.valores)) return;
      termo.valores.forEach((valor: number) => dados.push({ faces: Number(termo.faces), valor, ignorado: false }));
    });
  }

  if (!dados.length || dados.length > MAX_DADOS_3D) return null;
  if (dados.some((dado) => !FACES_SUPORTADAS.includes(dado.faces) || dado.valor < 1 || dado.valor > dado.faces)) return null;

  const natural = typeof detalhes.natural === 'number' ? detalhes.natural : null;
  const grau = (['sucesso critico', 'sucesso', 'falha', 'falha critica'] as const)
    .find((valor) => valor === detalhes.grau) ?? null;
  let destaque: CenaRolagem['destaque'] = null;
  if (detalhes.critico_natural || grau === 'sucesso critico') destaque = 'critico';
  else if (detalhes.falha_natural || grau === 'falha critica') destaque = 'falha';

  return {
    titulo: registro.titulo,
    dados,
    total: registro.resultado,
    bonus: Number(detalhes.bonus) || 0,
    natural,
    grau,
    dt: typeof detalhes.dt === 'number' ? detalhes.dt : null,
    formula: registro.formula || '',
    destaque,
  };
};

/** Roda a cena e resolve quando ela termina (ou é pulada). Sem host, sem
 * suporte ou com "reduzir movimento", resolve na hora para o chamador seguir. */
export const animarRolagem = (registro: IRegistro): Promise<void> => {
  const cena = extrairCena(registro);
  if (!cena || !apresentador || semMovimento()) return Promise.resolve();
  // Uma rolagem nova encerra a anterior em vez de empilhar.
  terminarAtual?.();
  return new Promise<void>((resolver) => {
    const terminar = () => {
      if (terminarAtual === terminar) terminarAtual = null;
      resolver();
    };
    terminarAtual = terminar;
    apresentador?.(cena, terminar);
  });
};
