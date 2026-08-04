export type AlvoOrigem =
  | 'atributo'
  | 'pericia'
  | 'vidaMaxima'
  | 'manaMaxima'
  | 'sanidadeMaxima'
  | 'movimento';

export interface IOrigemExemplo {
  id: string;
  titulo: string;
  descricao: string;
  ajuste: {
    alvo: AlvoOrigem;
    chave?: string;
    valor: number;
    rotulo: string;
  };
}

// Origens são deliberadamente menores que benefícios raciais e de classe.
// Elas dão identidade mecânica sem definir sozinhas a função do personagem.
export const ORIGENS_EXEMPLO: IOrigemExemplo[] = [
  { id: 'academico', titulo: 'Acadêmico', descricao: 'Estudou arquivos, teorias e culturas antes de se aventurar.', ajuste: { alvo: 'pericia', chave: 'conhecimento', valor: 1, rotulo: 'Conhecimento +1' } },
  { id: 'artesao', titulo: 'Artesão', descricao: 'Aprendeu um ofício trabalhando com ferramentas e materiais.', ajuste: { alvo: 'pericia', chave: 'oficio', valor: 1, rotulo: 'Ofício +1' } },
  { id: 'batedor', titulo: 'Batedor', descricao: 'Costumava abrir caminho e reconhecer terrenos perigosos.', ajuste: { alvo: 'movimento', valor: 1.5, rotulo: 'Movimento +1,5 m' } },
  { id: 'devoto', titulo: 'Devoto', descricao: 'Cresceu próximo de ritos, templos ou tradições espirituais.', ajuste: { alvo: 'pericia', chave: 'religiao', valor: 1, rotulo: 'Religião +1' } },
  { id: 'guarda', titulo: 'Guarda', descricao: 'Foi treinado para vigiar, patrulhar e notar problemas cedo.', ajuste: { alvo: 'pericia', chave: 'percepcao', valor: 1, rotulo: 'Percepção +1' } },
  { id: 'herborista', titulo: 'Herborista', descricao: 'Conhece remédios simples, ervas e primeiros socorros.', ajuste: { alvo: 'pericia', chave: 'cura', valor: 1, rotulo: 'Cura +1' } },
  { id: 'mensageiro', titulo: 'Mensageiro', descricao: 'Passou anos viajando e entregando mensagens sob pressão.', ajuste: { alvo: 'atributo', chave: 'destreza', valor: 1, rotulo: 'Destreza +1' } },
  { id: 'negociador', titulo: 'Negociador', descricao: 'Aprendeu a encontrar acordos em situações tensas.', ajuste: { alvo: 'pericia', chave: 'diplomacia', valor: 1, rotulo: 'Diplomacia +1' } },
  { id: 'sobrevivente', titulo: 'Sobrevivente', descricao: 'Resistiu a uma rotina difícil e aprendeu a poupar forças.', ajuste: { alvo: 'vidaMaxima', valor: 2, rotulo: 'Vida máxima +2' } },
  { id: 'viajante', titulo: 'Viajante', descricao: 'Conhece rotas, abrigos e sinais deixados pela natureza.', ajuste: { alvo: 'pericia', chave: 'sobrevivencia', valor: 1, rotulo: 'Sobrevivência +1' } },
];

export function obterOrigemExemplo(id: unknown): IOrigemExemplo | null {
  return ORIGENS_EXEMPLO.find((origem) => origem.id === id) || null;
}
