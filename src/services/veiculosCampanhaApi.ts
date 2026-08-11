import { api } from './apiClient';

export interface ICampanhaVeiculoResumo {
  id: string;
  proprietario_personagem_id: string | null;
  nome: string;
  imagem_url: string | null;
  vida_atual: number;
  vida_maxima: number;
  combustivel_atual: number;
  combustivel_maximo: number;
  capacidade: number;
  versao: number;
  nivel_acesso_campanha: 'nenhum' | 'visualizar' | 'utilizar';
}

export interface ICampanhaVeiculo extends ICampanhaVeiculoResumo {
  descricao: string;
  defesa: number;
  resistencia: number;
  deslocamento: number;
  manobrabilidade: number;
  cobertura: string;
  tripulacao_minima: number;
  sistemas_ativos_maximos: number;
  espacos_modulos_maximos: number;
  espacos_base: number;
  origem_item_id: string | null;
  modulos: ICampanhaModulo[];
  ocupantes: ICampanhaOcupante[];
  inventario: ICampanhaVeiculoItem[];
  permissoes: ICampanhaPermissao[];
  criado_em: string;
  atualizado_em: string;
}

export interface ICampanhaModulo {
  id: string;
  veiculo_id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  espacos_ocupados: number;
  criado_em: string;
  atualizado_em: string;
}

export interface ICampanhaOcupante {
  id: string;
  veiculo_id: string;
  personagem_id: string;
  papel: string;
  tipo: 'tripulacao' | 'passageiro';
}

export interface ICampanhaVeiculoItem {
  id: string;
  veiculo_id: string;
  item_id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  espacos: number;
  descricao: string;
  dados: Record<string, unknown>;
  adicionado_por: string | null;
  criado_em: string;
}

export interface ICampanhaPermissao {
  veiculo_id?: string;
  propriedade_id?: string;
  personagem_id: string;
  nivel_permissao: 'visualizar' | 'utilizar' | 'gerenciar';
}

export interface ICampanhaVeiculoInput {
  nome: string;
  imagem_url?: string | null;
  descricao?: string;
  vida_maxima?: number;
  combustivel_maximo?: number;
  defesa?: number;
  resistencia?: number;
  deslocamento?: number;
  manobrabilidade?: number;
  cobertura?: string;
  capacidade?: number;
  tripulacao_minima?: number;
  sistemas_ativos_maximos?: number;
  espacos_modulos_maximos?: number;
  espacos_base?: number;
  nivel_acesso_campanha?: 'nenhum' | 'visualizar' | 'utilizar';
}

export const veiculosCampanhaApi = {
  listar(campanhaId: string): Promise<{ veiculos: ICampanhaVeiculoResumo[] }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos`);
  },

  obter(campanhaId: string, veiculoId: string): Promise<ICampanhaVeiculo> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}`);
  },

  criar(campanhaId: string, dados: ICampanhaVeiculoInput): Promise<{ id: string }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos`, {
      method: 'POST',
      body: dados,
    });
  },

  atualizar(campanhaId: string, veiculoId: string, dados: ICampanhaVeiculoInput): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}`, {
      method: 'PUT',
      body: dados,
    });
  },

  atualizarDelta(
    campanhaId: string,
    veiculoId: string,
    delta: { versao: number; delta_vida?: number; delta_combustivel?: number }
  ): Promise<{ versao: number; vida_atual: number; combustivel_atual: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/delta`, {
      method: 'PATCH',
      body: delta,
    });
  },

  migrar(
    campanhaId: string,
    dados: { personagem_id: string; item_id: string; compartilhar_campanha?: boolean }
  ): Promise<{ id: string; migrated_already?: boolean }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/migrar`, {
      method: 'POST',
      body: dados,
    });
  },

  remover(campanhaId: string, veiculoId: string): Promise<{ id: string }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}`, {
      method: 'DELETE',
    });
  },

  definirPermissao(
    campanhaId: string,
    veiculoId: string,
    dados: { personagem_id: string; nivel_permissao: 'visualizar' | 'utilizar' | 'gerenciar' }
  ): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/permissoes`, {
      method: 'PUT',
      body: dados,
    });
  },

  removerPermissao(campanhaId: string, veiculoId: string, personagemId: string): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/permissoes/${encodeURIComponent(personagemId)}`, {
      method: 'DELETE',
    });
  },

  definirOcupante(
    campanhaId: string,
    veiculoId: string,
    dados: { personagem_id: string; papel: string; tipo: 'tripulacao' | 'passageiro' }
  ): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/ocupantes`, {
      method: 'PUT',
      body: dados,
    });
  },

  removerOcupante(campanhaId: string, veiculoId: string, personagemId: string): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/ocupantes/${encodeURIComponent(personagemId)}`, {
      method: 'DELETE',
    });
  },

  adicionarModulo(
    campanhaId: string,
    veiculoId: string,
    dados: { nome: string; descricao?: string; espacos_ocupados?: number }
  ): Promise<{ id: string; versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/modulos`, {
      method: 'POST',
      body: dados,
    });
  },

  alternarModulo(campanhaId: string, veiculoId: string, moduloId: string, ativo: boolean): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/modulos/${encodeURIComponent(moduloId)}`, {
      method: 'PATCH',
      body: { ativo },
    });
  },

  removerModulo(campanhaId: string, veiculoId: string, moduloId: string): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/modulos/${encodeURIComponent(moduloId)}`, {
      method: 'DELETE',
    });
  },

  adicionarCarga(
    campanhaId: string,
    veiculoId: string,
    dados: { nome: string; categoria?: string; quantidade?: number; espacos?: number; descricao?: string }
  ): Promise<{ id: string; versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/inventario`, {
      method: 'POST',
      body: dados,
    });
  },

  atualizarCarga(campanhaId: string, veiculoId: string, itemId: string, quantidade: number): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/inventario/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: { quantidade },
    });
  },

  removerCarga(campanhaId: string, veiculoId: string, itemId: string): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/veiculos/${encodeURIComponent(veiculoId)}/inventario/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
  },
};
