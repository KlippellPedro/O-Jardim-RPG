// Regra de permissão compartilhada por veículos e propriedades da campanha:
// o backend já concede controle total ao dono do personagem proprietário
// (ver _require_vehicle_permission em routers/vehicles.py e
// _require_property_permission em routers/properties.py) - o Mestre também
// gerencia tudo, e os demais jogadores seguem o nível concedido em `permissoes`
// ou, na ausência de um específico, o nível padrão da campanha.

export const PONTUACAO_NIVEL: Record<string, number> = { nenhum: 0, visualizar: 1, utilizar: 2, gerenciar: 3 };

export function souDonoDoRecurso(characterId: string | undefined, proprietarioId: string | null): boolean {
  return !!characterId && proprietarioId === characterId;
}

interface RecursoComProprietario {
  proprietario_personagem_id: string | null;
}

export function podeGerenciarRecursoResumo(
  isMestre: boolean,
  characterId: string | undefined,
  recurso: RecursoComProprietario,
): boolean {
  return isMestre || souDonoDoRecurso(characterId, recurso.proprietario_personagem_id);
}

interface RecursoDetalheComPermissoes extends RecursoComProprietario {
  nivel_acesso_campanha: string;
  permissoes: Array<{ personagem_id: string; nivel_permissao: string }>;
}

export function nivelEfetivoRecursoDetalhe(
  isMestre: boolean,
  characterId: string | undefined,
  recurso: RecursoDetalheComPermissoes | null,
): string {
  if (!recurso) return 'nenhum';
  if (isMestre || souDonoDoRecurso(characterId, recurso.proprietario_personagem_id)) return 'gerenciar';
  let melhor = recurso.nivel_acesso_campanha;
  const minhaPermissao = recurso.permissoes.find((perm) => perm.personagem_id === characterId);
  if (minhaPermissao && PONTUACAO_NIVEL[minhaPermissao.nivel_permissao] > PONTUACAO_NIVEL[melhor]) {
    melhor = minhaPermissao.nivel_permissao;
  }
  return melhor;
}
