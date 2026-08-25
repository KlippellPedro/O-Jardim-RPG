export interface GrupoNavegacaoRegras {
  id: string;
  titulo: string;
  descricao: string;
  topicos: readonly string[];
  cor: string;
}

export const GRUPOS_NAVEGACAO: readonly GrupoNavegacaoRegras[] = [
  {
    id: 'primeiros-passos',
    titulo: 'Primeiros Passos',
    descricao: 'Entenda o jogo e monte a primeira ficha.',
    topicos: ['como-jogar', 'criacao-personagem', 'sistema-base'],
    cor: 'border-emerald-300/20 from-emerald-400/10',
  },
  {
    id: 'personagem',
    titulo: 'Personagem e Progressão',
    descricao: 'Raças, classes, perícias, níveis e escolhas permanentes.',
    topicos: ['racas', 'classes', 'poderes-habilidades', 'pericias', 'treinar', 'xp', 'legados', 'aliados', 'frutos-implantes'],
    cor: 'border-sky-300/20 from-sky-400/10',
  },
  {
    id: 'combate',
    titulo: 'Combate e Cenas',
    descricao: 'Turnos, dano, condições e ações compartilhadas.',
    topicos: ['combate', 'distancias', 'ferimentos', 'coreografia', 'descanso', 'acoes-coletivas', 'ataques-combinados', 'mesa-ao-vivo', 'condicoes', 'aflicoes'],
    cor: 'border-rose-300/20 from-rose-400/10',
  },
  {
    id: 'magia',
    titulo: 'Magia e Fluxos',
    descricao: 'Conjuração, preços dos círculos e formas mágicas.',
    topicos: ['magia-fluxo', 'marcas-cicatrizes', 'rituais-selos', 'catalogo-magico'],
    cor: 'border-violet-300/20 from-violet-400/10',
  },
  {
    id: 'itens',
    titulo: 'Equipamentos e Criação',
    descricao: 'Itens, raridades, modificações, fabricação e materiais.',
    topicos: ['equipamentos', 'raridades-modificacoes', 'modificacoes-equipamentos', 'crafting', 'materiais'],
    cor: 'border-amber-300/20 from-amber-400/10',
  },
  {
    id: 'veiculos',
    titulo: 'Veículos e Viagens',
    descricao: 'Condução, perseguições, manutenção e transporte pago.',
    topicos: ['veiculos', 'veiculos-cenas', 'veiculos-manutencao', 'transporte'],
    cor: 'border-cyan-300/20 from-cyan-400/10',
  },
  {
    id: 'mundo',
    titulo: 'Mundo e Recursos',
    descricao: 'Criaturas, dinheiro, lojas, bases e reputação.',
    topicos: ['bestiario', 'economia', 'loja', 'bases', 'mundo-faccoes'],
    cor: 'border-lime-300/20 from-lime-400/10',
  },
  {
    id: 'mestre',
    titulo: 'Guia do Mestre',
    descricao: 'Preparação, dificuldades e condução da campanha.',
    topicos: ['mestre'],
    cor: 'border-[#c7a44c]/25 from-[#c7a44c]/10',
  },
];

export const grupoDoTopico = (topico: string) => (
  GRUPOS_NAVEGACAO.find((grupo) => grupo.topicos.includes(topico))
);

export const ordenarTopicosPorNavegacao = (topicos: string[]) => {
  const disponiveis = new Set(topicos);
  const ordenados = GRUPOS_NAVEGACAO.flatMap((grupo) => grupo.topicos).filter((topico) => disponiveis.has(topico));
  const conhecidos = new Set(ordenados);
  return [...ordenados, ...topicos.filter((topico) => !conhecidos.has(topico))];
};
