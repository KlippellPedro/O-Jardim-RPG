import { api } from './apiClient';

export interface ICampanhaPropriedadeResumo {
  id: string;
  proprietario_personagem_id: string | null;
  nome: string;
  tipo: string;
  localizacao: string;
  versao: number;
  nivel_acesso_campanha: 'nenhum' | 'visualizar' | 'utilizar';
}

export interface ICampanhaInstalacao {
  id: string;
  propriedade_id: string;
  nome: string;
  nivel: number;
  espacos_ocupados: number;
}

export interface ICampanhaPropriedadePermissao {
  propriedade_id: string;
  personagem_id: string;
  nivel_permissao: 'visualizar' | 'utilizar' | 'gerenciar';
}

export interface ICampanhaPropriedade extends ICampanhaPropriedadeResumo {
  descricao: string;
  qualidade_quartos: string;
  patamar: string;
  valor_aquisicao: number;
  manutencao: number;
  origem_item_id: string | null;
  instalacoes: ICampanhaInstalacao[];
  permissoes: ICampanhaPropriedadePermissao[];
  criado_em: string;
  atualizado_em: string;
}

export interface ICampanhaPropriedadeInput {
  nome: string;
  tipo: string;
  localizacao?: string;
  descricao?: string;
  qualidade_quartos?: string;
  patamar?: string;
  valor_aquisicao?: number;
  manutencao?: number;
  nivel_acesso_campanha?: 'nenhum' | 'visualizar' | 'utilizar';
}

export const propriedadesCampanhaApi = {
  listar(campanhaId: string): Promise<{ propriedades: ICampanhaPropriedadeResumo[] }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades`);
  },

  obter(campanhaId: string, propriedadeId: string): Promise<ICampanhaPropriedade> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}`);
  },

  criar(campanhaId: string, dados: ICampanhaPropriedadeInput): Promise<{ id: string }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades`, {
      method: 'POST',
      body: dados,
    });
  },

  atualizar(campanhaId: string, propriedadeId: string, dados: ICampanhaPropriedadeInput): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}`, {
      method: 'PUT',
      body: dados,
    });
  },

  migrar(
    campanhaId: string,
    dados: {
      personagem_id: string;
      propriedade_local_id: string;
      nome: string;
      tipo?: string;
      localizacao?: string;
      descricao?: string;
      qualidade_quartos?: string;
      patamar?: string;
      valor_aquisicao?: number;
      manutencao?: number;
      instalacoes?: Array<{ nome: string; nivel: number; espacos: number }>;
      compartilhar_campanha?: boolean;
    }
  ): Promise<{ id: string; migrated_already?: boolean }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/migrar`, {
      method: 'POST',
      body: dados,
    });
  },

  remover(campanhaId: string, propriedadeId: string): Promise<{ id: string }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}`, {
      method: 'DELETE',
    });
  },

  definirPermissao(
    campanhaId: string,
    propriedadeId: string,
    dados: { personagem_id: string; nivel_permissao: 'visualizar' | 'utilizar' | 'gerenciar' }
  ): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}/permissoes`, {
      method: 'PUT',
      body: dados,
    });
  },

  removerPermissao(campanhaId: string, propriedadeId: string, personagemId: string): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}/permissoes/${encodeURIComponent(personagemId)}`, {
      method: 'DELETE',
    });
  },

  adicionarInstalacao(
    campanhaId: string,
    propriedadeId: string,
    dados: { nome: string; nivel?: number; espacos_ocupados?: number }
  ): Promise<{ id: string; versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}/instalacoes`, {
      method: 'POST',
      body: dados,
    });
  },

  editarInstalacao(
    campanhaId: string,
    propriedadeId: string,
    instalacaoId: string,
    dados: { nome: string; nivel?: number; espacos_ocupados?: number }
  ): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}/instalacoes/${encodeURIComponent(instalacaoId)}`, {
      method: 'PATCH',
      body: dados,
    });
  },

  removerInstalacao(campanhaId: string, propriedadeId: string, instalacaoId: string): Promise<{ versao: number }> {
    return api(`/campanhas/${encodeURIComponent(campanhaId)}/propriedades/${encodeURIComponent(propriedadeId)}/instalacoes/${encodeURIComponent(instalacaoId)}`, {
      method: 'DELETE',
    });
  },
};
