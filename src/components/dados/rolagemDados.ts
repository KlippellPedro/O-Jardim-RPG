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
  /** Rolagem local de vários dados sem soma (ex.: os sete atributos): o resultado mostra os valores em vez do total. */
  lista?: number[];
  /** Dado de outra pessoa que a mesa vê: não tampa a tela, não pede clique e some sozinho. */
  mesa?: { autor: string };
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

/** Quantos dados cabem numa rolagem local (a cena arruma em duas fileiras). */
export const MAX_DADOS_LOCAIS = 8;

export interface OpcoesDadosLocais {
  titulo: string;
  /** O que cada dado mostra. Quem chama já sorteou: a cena só faz o dado rolar e pousar nesses valores. */
  valores: readonly number[];
  faces?: number;
  /** A legenda do resultado (ex.: "7d20"). */
  formula?: string;
}

/** A cena de uma rolagem que não passa pelo servidor (assistente de criação), ou null se não dá para mostrar em 3D. */
export const cenaDeDadosLocais = ({ titulo, valores, faces = 20, formula = '' }: OpcoesDadosLocais): CenaRolagem | null => {
  if (!valores.length || valores.length > MAX_DADOS_LOCAIS) return null;
  if (!FACES_SUPORTADAS.includes(faces)) return null;
  if (valores.some((valor) => !Number.isInteger(valor) || valor < 1 || valor > faces)) return null;
  return {
    titulo,
    dados: valores.map((valor) => ({ faces, valor, ignorado: false })),
    total: null,
    bonus: 0,
    natural: null,
    grau: null,
    dt: null,
    formula,
    destaque: null,
    lista: [...valores],
  };
};

/** A cena que está na tela agora é de outra pessoa (o dado da mesa). */
let atualEhDaMesa = false;

const apresentar = (cena: CenaRolagem | null): Promise<void> => {
  if (!cena || !apresentador || semMovimento()) return Promise.resolve();
  // O dado de outra pessoa nunca atropela o de quem está rolando: se há um dado na tela, o dela é pulado.
  if (cena.mesa && terminarAtual && !atualEhDaMesa) return Promise.resolve();
  // Uma rolagem nova encerra a anterior em vez de empilhar.
  terminarAtual?.();
  return new Promise<void>((resolver) => {
    const terminar = () => {
      if (terminarAtual === terminar) {
        terminarAtual = null;
        atualEhDaMesa = false;
      }
      resolver();
    };
    terminarAtual = terminar;
    atualEhDaMesa = Boolean(cena.mesa);
    apresentador?.(cena, terminar);
  });
};

/** O que o servidor manda quando alguém mostra o dado à mesa (evento `dado_mesa`). */
export interface IDadoDaMesa {
  autor: string;
  titulo: string;
  formula: string;
  usuario_id: string;
  detalhes: Record<string, any>;
  /** O token do personagem na cena da mesa (o resultado sobe sobre ele no mapa). */
  token_id?: string | null;
}

/** O dado de outra pessoa como cena 3D, ou null se o pacote veio quebrado ou não cabe em 3D. */
export const cenaDoDadoDaMesa = (dado: IDadoDaMesa): CenaRolagem | null => {
  if (!dado || typeof dado.autor !== 'string' || !dado.detalhes || typeof dado.detalhes !== 'object') return null;
  const cena = extrairCena({
    id: '', tipo: 'rolagem', titulo: String(dado.titulo ?? ''), formula: String(dado.formula ?? ''),
    resultado: typeof dado.detalhes.total === 'number' ? dado.detalhes.total : null,
    detalhes: dado.detalhes, autor_nome: dado.autor, criado_em: '',
  });
  return cena ? { ...cena, titulo: `${dado.autor} · ${cena.titulo}`, mesa: { autor: dado.autor } } : null;
};

/** O dado cai na tela de quem assiste: resolve quando some. Sem host, com "reduzir movimento" ou com um dado seu na tela, não mostra. */
export const animarDadoDaMesa = (dado: IDadoDaMesa): Promise<void> => apresentar(cenaDoDadoDaMesa(dado));

/** Roda a cena e resolve quando ela termina (ou é pulada). Sem host, sem
 * suporte ou com "reduzir movimento", resolve na hora para o chamador seguir. */
export const animarRolagem = (registro: IRegistro): Promise<void> => apresentar(extrairCena(registro));

/** O mesmo para uma rolagem local: resolve no pouso (ou na hora, sem 3D) e o resultado fica na tela até a pessoa fechar. */
export const animarDadosLocais = (opcoes: OpcoesDadosLocais): Promise<void> => apresentar(cenaDeDadosLocais(opcoes));
