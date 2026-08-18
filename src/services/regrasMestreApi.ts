import { api } from './apiClient';

export interface SecaoRegraMestre {
  id?: string;
  titulo?: string;
  tipo?: string;
  itens?: string[];
  colunas?: string[];
  linhas?: Array<Array<string | number>>;
  paragrafos?: string[];
}

interface EntradaRegraMestre {
  chave?: string;
  dados?: {
    titulo?: string;
    resumo?: string;
    destaques?: Array<[string, string]>;
    secoes?: SecaoRegraMestre[];
  };
}

interface BibliotecaRegrasMestre {
  entradas?: EntradaRegraMestre[];
}

export interface NotasEditoriaisMestre {
  titulo: string;
  itens: string[];
}

export interface FerramentasMestre {
  titulo: string;
  resumo?: string;
  destaques: Array<[string, string]>;
  secoes: SecaoRegraMestre[];
}

async function carregarEntradaRegrasMestre(
  campanhaId: string,
  signal?: AbortSignal,
): Promise<EntradaRegraMestre | undefined> {
  const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'regras' });
  const biblioteca = await api<BibliotecaRegrasMestre>(`/conteudo/biblioteca?${query}`, { signal });
  return biblioteca.entradas?.find((item) => item.chave === 'regras-mestre:mestre-v1');
}

export async function carregarNotasEditoriaisMestre(
  campanhaId: string,
  signal?: AbortSignal,
): Promise<NotasEditoriaisMestre | null> {
  const entrada = await carregarEntradaRegrasMestre(campanhaId, signal);
  const secao = entrada?.dados?.secoes?.find((item) => item.id === 'notas-editoriais');
  if (!secao?.itens?.length) return null;
  return {
    titulo: secao.titulo || 'Notas editoriais e histórico de decisões',
    itens: secao.itens.filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
  };
}

/** Tabelas e listas de referência do Mestre (DT, orçamento de encontro, dano
 * de inimigos, descanso, XP, vida negativa, segredos), publicadas em
 * mestre-v1.json mas fora das notas editoriais. Antes desta função, nenhuma
 * tela lia essas seções: só as notas editoriais chegavam à interface. */
export async function carregarFerramentasMestre(
  campanhaId: string,
  signal?: AbortSignal,
): Promise<FerramentasMestre | null> {
  const entrada = await carregarEntradaRegrasMestre(campanhaId, signal);
  const dados = entrada?.dados;
  const secoes = (dados?.secoes || []).filter(
    (secao) => secao.id !== 'notas-editoriais' && secao.tipo && secao.titulo,
  );
  if (!secoes.length) return null;
  return {
    titulo: dados?.titulo || 'Ferramentas do Mestre',
    resumo: dados?.resumo,
    destaques: Array.isArray(dados?.destaques) ? dados.destaques : [],
    secoes,
  };
}
