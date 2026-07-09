/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Mundo
   Categorias e o mapeamento de tipo → categoria.
   ───────────────────────────────────────────────────────── */

export const CATEGORIAS = [
  {
    id: 'cosmologia',
    titulo: 'Cosmologia',
    tipos: ['cosmologia', 'conceito'],
    descricao: 'A estrutura do Jardim: Árvores, Galhos, Dimensões, Mundos e Reinos.',
    vazio: 'Nada sobre a estrutura do Jardim foi descoberto ainda. Continue explorando.',
  },
  {
    id: 'deidades',
    titulo: 'Deidades e Fluxos',
    tipos: ['deidade', 'fluxo'],
    descricao: 'As Árvores do Jardim e os Fluxos que cada uma rege.',
    vazio: 'Nenhuma deidade ou fluxo descoberto ainda. Continue explorando O Jardim.',
  },
  {
    id: 'realidades',
    titulo: 'Realidades e Dimensões',
    tipos: ['realidade', 'galho', 'dimensao'],
    descricao: 'Os Galhos e as Dimensões que se abrem dentro deles.',
    vazio: 'Nenhuma realidade ou dimensão descoberta ainda. O mapa continua em branco.',
  },
  {
    id: 'reinos',
    titulo: 'Reinos e Mundos',
    tipos: ['mundo', 'reino'],
    descricao: 'Os mundos e reinos que existem dentro de cada Dimensão.',
    vazio: 'Nenhum reino ou mundo descoberto ainda.',
  },
  {
    id: 'personagens',
    titulo: 'Personagens',
    tipos: ['personagem', 'soberano', 'npc'],
    descricao: 'Soberanos, NPCs e outras figuras notáveis.',
    vazio: 'Nenhum personagem descoberto ainda. Ninguém foi encontrado pelo caminho — por enquanto.',
  },
  {
    id: 'eventos',
    titulo: 'Eventos',
    tipos: ['evento'],
    descricao: 'Eclipses, chuvas e outras noites especiais que marcaram a campanha.',
    vazio: 'Nenhum evento registrado ainda.',
  },
  {
    id: 'idiomas',
    titulo: 'Idiomas e Cultura',
    tipos: ['idioma', 'cultura'],
    descricao: 'Línguas, costumes e tradições dos povos do Jardim.',
    vazio: 'Nada sobre idiomas ou cultura foi descoberto ainda.',
  },
];

export function categoriaPorTipo(tipo) {
  return CATEGORIAS.find(c => c.tipos.includes(tipo)) || null;
}

export const TIPOS_VALIDOS = CATEGORIAS.flatMap(c => c.tipos);
