import { api } from './apiClient';

interface SecaoRegraMestre {
  id?: string;
  titulo?: string;
  tipo?: string;
  itens?: string[];
}

interface EntradaRegraMestre {
  chave?: string;
  dados?: {
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

export async function carregarNotasEditoriaisMestre(
  campanhaId: string,
  signal?: AbortSignal,
): Promise<NotasEditoriaisMestre | null> {
  const query = new URLSearchParams({ campanha_id: campanhaId, modulo: 'regras' });
  const biblioteca = await api<BibliotecaRegrasMestre>(`/conteudo/biblioteca?${query}`, { signal });
  const entrada = biblioteca.entradas?.find((item) => item.chave === 'regras-mestre:mestre-v1');
  const secao = entrada?.dados?.secoes?.find((item) => item.id === 'notas-editoriais');
  if (!secao?.itens?.length) return null;
  return {
    titulo: secao.titulo || 'Notas editoriais e histórico de decisões',
    itens: secao.itens.filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
  };
}
