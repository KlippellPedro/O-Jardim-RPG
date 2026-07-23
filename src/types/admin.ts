// Tipos para a área administrativa da plataforma

export interface IAdminUser {
  id: string;
  email: string;
  nome_exibicao: string;
  papel_plataforma: 'admin' | 'criador' | 'mestre' | 'player';
  ativo: boolean;
  criado_em?: string;
  senha_provisoria?: boolean;
}

export interface IAdminResumo {
  total_usuarios: number;
  total_campanhas: number;
  total_campanhas_ativas: number;
  pedidos_senha_pendentes: number;
}

export interface IConvite {
  id: string;
  codigo: string;
  papel: string;
  usos: number;
  max_usos: number;
  expira_em: string;
  revogado_em: string | null;
  criado_em?: string;
}
