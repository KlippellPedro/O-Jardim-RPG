/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Loja
   Categorias e o mapeamento de tipo → categoria. Mesmo
   esquema de src/mundo/categorias.js, com ícone e cor de
   destaque próprios pra cada card do índice.
   ───────────────────────────────────────────────────────── */

export const CATEGORIAS = [
  {
    id: 'arsenal',
    titulo: 'Arsenal',
    tipos: ['arma', 'armadura', 'equipamento'],
    simbolo: '⚔',
    accent: 'var(--blood)',
    descricao: 'Armas, armaduras e equipamentos para arriscar tudo em campo.',
    vazio: 'Nenhuma arma ou equipamento foi descoberto ainda. O arsenal continua trancado.',
  },
  {
    id: 'veiculos',
    titulo: 'Veículos',
    tipos: ['veiculo'],
    simbolo: '⚙',
    accent: 'var(--neon)',
    descricao: 'Montarias, naves e máquinas para ir além do alcance dos seus pés.',
    vazio: 'Nenhum veículo foi descoberto ainda. Por enquanto, seus próprios pés bastam.',
  },
  {
    id: 'bestiario',
    titulo: 'Bestiário',
    tipos: ['monstro'],
    simbolo: '◉',
    accent: 'var(--moss)',
    descricao: 'Criaturas, monstros e ameaças que rondam O Jardim.',
    vazio: 'Nenhuma criatura foi catalogada ainda. O que ronda a escuridão continua desconhecido.',
  },
  {
    id: 'drops',
    titulo: 'Drops',
    tipos: ['drop'],
    simbolo: '◆',
    accent: 'var(--gold)',
    descricao: 'Itens, materiais e recompensas que caem depois da caçada.',
    vazio: 'Nenhum drop foi registrado ainda. A caçada ainda não rendeu nada.',
  },
];

export function categoriaPorTipo(tipo) {
  return CATEGORIAS.find(c => c.tipos.includes(tipo)) || null;
}

export function categoriaPorId(id) {
  return CATEGORIAS.find(c => c.id === id) || null;
}

export const TIPOS_VALIDOS = CATEGORIAS.flatMap(c => c.tipos);
