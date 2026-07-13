/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Loja
   Categorias e o mapeamento de tipo → categoria. Mesmo
   esquema de src/mundo/config/categorias.js, com ícone e cor de
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
    acao: 'Comprar',
  },
  {
    id: 'veiculos',
    titulo: 'Veículos',
    tipos: ['veiculo'],
    simbolo: '⚙',
    accent: 'var(--neon)',
    descricao: 'Montarias, naves e máquinas para ir além do alcance dos seus pés.',
    vazio: 'Nenhum veículo foi descoberto ainda. Por enquanto, seus próprios pés bastam.',
    acao: 'Comprar',
  },
  {
    id: 'bestiario',
    titulo: 'Bestiário',
    tipos: ['monstro'],
    simbolo: '◉',
    accent: 'var(--moss)',
    descricao: 'Criaturas, monstros e ameaças que rondam O Jardim.',
    vazio: 'Nenhuma criatura foi catalogada ainda. O que ronda a escuridão continua desconhecido.',
    // Seres, não mercadoria — o verbo do botão reflete isso (ver plano da
    // reforma visual da Loja: Bestiário usa "Contratar", não "Comprar").
    acao: 'Contratar',
  },
  {
    id: 'drops',
    titulo: 'Drops',
    tipos: ['drop'],
    simbolo: '◆',
    accent: 'var(--gold)',
    descricao: 'Itens, materiais e recompensas que caem depois da caçada.',
    vazio: 'Nenhum drop foi registrado ainda. A caçada ainda não rendeu nada.',
    acao: 'Comprar',
  },
];

export function categoriaPorTipo(tipo) {
  return CATEGORIAS.find(c => c.tipos.includes(tipo)) || null;
}

export function categoriaPorId(id) {
  return CATEGORIAS.find(c => c.id === id) || null;
}

export const TIPOS_VALIDOS = CATEGORIAS.flatMap(c => c.tipos);
