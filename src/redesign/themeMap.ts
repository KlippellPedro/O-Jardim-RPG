// PALETA CANONICA DE CORES - O Jardim RPG (versao aprovada pelo usuario em 03/08/2026)

export interface ThemeEntry {
  primary: string;
  secondary: string;
  glow: string;
  bg: string;
  border: string;
  text: string;
  icon: string;
  tag: string;
  rationale: string;
}

// ── RACAS COMUNS ─────────────────────────────────────────────────────────────

const HUMANO: ThemeEntry = {
  primary: '#d4a847', secondary: '#92764d', glow: 'rgba(212,168,71,0.30)',
  bg: 'bg-amber-950/20', border: 'border-amber-600/25 hover:border-amber-500/60',
  text: 'text-amber-400', icon: 'text-amber-600/70', tag: 'text-amber-300',
  rationale: 'Raca versatil e neutra: ouro da civilizacao, da moeda e da chama humana.',
};
const ANAO: ThemeEntry = {
  primary: '#b45309', secondary: '#d97706', glow: 'rgba(180,83,9,0.35)',
  bg: 'bg-orange-950/30', border: 'border-orange-700/30 hover:border-orange-500/60',
  text: 'text-orange-500', icon: 'text-orange-700/70', tag: 'text-orange-400',
  rationale: 'Forjadores e mineradores: brasa das forjas subterraneas e brilho do minerio.',
};
const GOBLIM: ThemeEntry = {
  primary: '#4ade80', secondary: '#166534', glow: 'rgba(74,222,128,0.25)',
  bg: 'bg-green-950/30', border: 'border-green-700/25 hover:border-green-500/55',
  text: 'text-green-400', icon: 'text-green-600/70', tag: 'text-green-300',
  rationale: 'A pele verde iconica do Goblim: astucia, agilidade e espirito furtivo.',
};
const GOLEM: ThemeEntry = {
  primary: '#a8a29e', secondary: '#44403c', glow: 'rgba(168,162,158,0.25)',
  bg: 'bg-stone-900/40', border: 'border-stone-500/25 hover:border-stone-400/55',
  text: 'text-stone-300', icon: 'text-stone-300/90', tag: 'text-stone-400',
  rationale: 'Construtos de pedra e metal: materia mineral, resistencia e peso ancestral.',
};
const ESPIRITO: ThemeEntry = {
  primary: '#d8b4fe', secondary: '#6d28d9', glow: 'rgba(216,180,254,0.28)',
  bg: 'bg-purple-950/25', border: 'border-purple-400/25 hover:border-purple-300/55',
  text: 'text-purple-200', icon: 'text-purple-400/70', tag: 'text-purple-300',
  rationale: 'Almas etereas sem corpo: luminosidade espectral distinta da magia dimensional.',
};
const GIGANTE: ThemeEntry = {
  primary: '#78716c', secondary: '#57534e', glow: 'rgba(120,113,108,0.28)',
  bg: 'bg-stone-900/40', border: 'border-stone-600/25 hover:border-stone-400/55',
  text: 'text-stone-300', icon: 'text-stone-300/90', tag: 'text-stone-400',
  rationale: 'Seres monumentais ligados a terra e montanhas: peso, solidez, poder sem adornos.',
};
const ANIMALIA: ThemeEntry = {
  primary: '#a3e635', secondary: '#4d7c0f', glow: 'rgba(163,230,53,0.28)',
  bg: 'bg-lime-950/30', border: 'border-lime-600/25 hover:border-lime-500/55',
  text: 'text-lime-400', icon: 'text-lime-600/70', tag: 'text-lime-300',
  rationale: 'Meio-animais da natureza selvagem: selva, instinto animal e forca primordial.',
};
const SEREIA: ThemeEntry = {
  primary: '#22d3ee', secondary: '#0369a1', glow: 'rgba(34,211,238,0.28)',
  bg: 'bg-cyan-950/25', border: 'border-cyan-500/25 hover:border-cyan-400/55',
  text: 'text-cyan-300', icon: 'text-cyan-500/70', tag: 'text-cyan-200',
  rationale: 'Habitantes dos mares: profundezas, espuma e escamas brilhantes.',
};
const MIMICO: ThemeEntry = {
  primary: '#c084fc', secondary: '#581c87', glow: 'rgba(192,132,252,0.28)',
  bg: 'bg-fuchsia-950/25', border: 'border-fuchsia-500/25 hover:border-fuchsia-400/55',
  text: 'text-fuchsia-300', icon: 'text-fuchsia-500/70', tag: 'text-fuchsia-200',
  rationale: 'Corpo sem forma fixa que copia o que ve: iridescencia instavel entre uma cor e outra.',
};
const SIMBIONTE: ThemeEntry = {
  primary: '#e07a5f', secondary: '#7c2d12', glow: 'rgba(224,122,95,0.28)',
  bg: 'bg-orange-950/25', border: 'border-orange-600/25 hover:border-orange-400/55',
  text: 'text-orange-300', icon: 'text-orange-500/70', tag: 'text-orange-200',
  rationale: 'Uniao de organismos distintos: materia organica, esporos e vida composta (herda a paleta do extinto Miceliano).',
};
const FEERICO: ThemeEntry = {
  primary: '#f472b6', secondary: '#be185d', glow: 'rgba(244,114,182,0.28)',
  bg: 'bg-pink-950/25', border: 'border-pink-500/25 hover:border-pink-400/55',
  text: 'text-pink-300', icon: 'text-pink-500/70', tag: 'text-pink-200',
  rationale: 'Cortes magicas e encantamentos: fantastico, romantismo sobrenatural e magia feerica.',
};
const SLIME: ThemeEntry = {
  primary: '#86efac', secondary: '#16a34a', glow: 'rgba(134,239,172,0.28)',
  bg: 'bg-green-950/25', border: 'border-green-500/25 hover:border-green-400/55',
  text: 'text-green-300', icon: 'text-green-500/70', tag: 'text-green-200',
  rationale: 'Seres gelatinosos e viscosos: gel, natureza amorfa e regeneracao.',
};
const VAMPIRO: ThemeEntry = {
  primary: '#be123c', secondary: '#4c0519', glow: 'rgba(190,18,60,0.35)',
  bg: 'bg-rose-950/30', border: 'border-rose-700/30 hover:border-rose-500/60',
  text: 'text-rose-400', icon: 'text-rose-700/70', tag: 'text-rose-300',
  rationale: 'Imortais sedentos de sangue: nobreza decadente, elegancia sombria e fome eterna.',
};

// ── RACAS ESPECIAIS ───────────────────────────────────────────────────────────

const ELFO: ThemeEntry = {
  primary: '#34d399', secondary: '#065f46', glow: 'rgba(52,211,153,0.28)',
  bg: 'bg-emerald-950/25', border: 'border-emerald-500/25 hover:border-emerald-400/55',
  text: 'text-emerald-300', icon: 'text-emerald-500/70', tag: 'text-emerald-200',
  rationale: 'Floresta milenar, runas e harmonia com a natureza: esmeralda ancestral.',
};
const DESPERTO: ThemeEntry = {
  primary: '#b91c1c', secondary: '#450a0a', glow: 'rgba(185,28,28,0.40)',
  bg: 'bg-red-950/35', border: 'border-red-800/30 hover:border-red-600/60',
  text: 'text-red-400', icon: 'text-red-700/70', tag: 'text-red-300',
  rationale: 'Mortos-vivos dos portoes de Arkarin: sangue coagulado e penumbra entre vida e morte.',
};
const AULETH: ThemeEntry = {
  primary: '#818cf8', secondary: '#3730a3', glow: 'rgba(129,140,248,0.28)',
  bg: 'bg-indigo-950/25', border: 'border-indigo-500/25 hover:border-indigo-400/55',
  text: 'text-indigo-300', icon: 'text-indigo-500/70', tag: 'text-indigo-200',
  rationale: 'Seres de poeira estelar e vazio cosmico: luminescencia estelar e natureza eterea.',
};
const AUTOMATO: ThemeEntry = {
  primary: '#06b6d4', secondary: '#b45309', glow: 'rgba(6,182,212,0.28)',
  bg: 'bg-cyan-950/30', border: 'border-cyan-600/25 hover:border-cyan-400/55',
  text: 'text-cyan-300', icon: 'text-cyan-600/70', tag: 'text-cyan-200',
  rationale: 'Construtos mecanicos e digitais: circuitos energizados e cobre incandescente.',
};
const CLONE: ThemeEntry = {
  primary: '#99f6e4', secondary: '#134e4a', glow: 'rgba(153,246,228,0.25)',
  bg: 'bg-teal-950/25', border: 'border-teal-400/25 hover:border-teal-300/55',
  text: 'text-teal-200', icon: 'text-teal-400/70', tag: 'text-teal-300',
  rationale: 'Copias geneticas de laboratorio: ambientes estereis, biotecnologia e artificialidade.',
};
const ENTIDADE: ThemeEntry = {
  primary: '#a3a3a3', secondary: '#171717', glow: 'rgba(163,163,163,0.18)',
  bg: 'bg-neutral-950/60', border: 'border-neutral-700/30 hover:border-neutral-500/55',
  text: 'text-neutral-300', icon: 'text-neutral-400/85', tag: 'text-neutral-400',
  rationale: 'Seres incompreensiveis sem forma: ausencia, vazio cosmico, alem da compreensao.',
};
const ANOMALIA: ThemeEntry = {
  primary: '#fef08a', secondary: '#854d0e', glow: 'rgba(254,240,138,0.28)',
  bg: 'bg-yellow-950/25', border: 'border-yellow-400/25 hover:border-yellow-300/55',
  text: 'text-yellow-200', icon: 'text-yellow-400/70', tag: 'text-yellow-300',
  rationale: 'Viajantes interdimensionais: brilho suave de estrela-guia e poeira de mundos.',
};
const BRUXA: ThemeEntry = {
  primary: '#a855f7', secondary: '#581c87', glow: 'rgba(168,85,247,0.30)',
  bg: 'bg-purple-950/30', border: 'border-purple-600/25 hover:border-purple-400/55',
  text: 'text-purple-300', icon: 'text-purple-600/70', tag: 'text-purple-200',
  rationale: 'Magias negras, rituais e pactos: ocultismo e magia arcana selvagem.',
};
const AMALGAMO: ThemeEntry = {
  primary: '#475569', secondary: '#1e293b', glow: 'rgba(71,85,105,0.28)',
  bg: 'bg-slate-950/40', border: 'border-slate-600/25 hover:border-slate-400/55',
  text: 'text-slate-300', icon: 'text-slate-300/90', tag: 'text-slate-400',
  rationale: 'Quimera espiritual de almas fundidas: cinza-azulado desbotado, instavel e sombrio.',
};
const ONIRICO: ThemeEntry = {
  primary: '#818cf8', secondary: '#312e81', glow: 'rgba(129,140,248,0.30)',
  bg: 'bg-indigo-950/30', border: 'border-indigo-400/25 hover:border-indigo-300/55',
  text: 'text-indigo-200', icon: 'text-indigo-400/70', tag: 'text-indigo-300',
  rationale: 'Seres nascidos em Sonhar: indigo profundo de ceu noturno e logica onirica.',
};
const DIVINO: ThemeEntry = {
  primary: '#facc15', secondary: '#78350f', glow: 'rgba(250,204,21,0.32)',
  bg: 'bg-amber-950/30', border: 'border-yellow-400/25 hover:border-yellow-300/55',
  text: 'text-yellow-300', icon: 'text-yellow-400/70', tag: 'text-yellow-200',
  rationale: 'Deuses e semideuses: dourado solar, presenca forte e brilho divino.',
};

// ── CLASSES ───────────────────────────────────────────────────────────────────

const ALQUIMISTA: ThemeEntry = {
  primary: '#10b981', secondary: '#581c87', glow: 'rgba(16,185,129,0.28)',
  bg: 'bg-emerald-950/25', border: 'border-emerald-500/25 hover:border-emerald-400/55',
  text: 'text-emerald-400', icon: 'text-emerald-600/70', tag: 'text-emerald-300',
  rationale: 'Pocoes, acidos e transmutacao: verde venenoso equilibrado por roxo arcano.',
};
const ATIRADOR: ThemeEntry = {
  primary: '#fbbf24', secondary: '#78350f', glow: 'rgba(251,191,36,0.28)',
  bg: 'bg-yellow-950/25', border: 'border-yellow-600/25 hover:border-yellow-400/55',
  text: 'text-yellow-300', icon: 'text-yellow-500/70', tag: 'text-yellow-200',
  rationale: 'Armas de longo alcance: clarao da polvora e latao das municoes.',
};
const CACADOR: ThemeEntry = {
  primary: '#84cc16', secondary: '#365314', glow: 'rgba(132,204,22,0.25)',
  bg: 'bg-lime-950/25', border: 'border-lime-600/25 hover:border-lime-500/55',
  text: 'text-lime-400', icon: 'text-lime-600/70', tag: 'text-lime-300',
  rationale: 'Rastreamento e predacao: floresta, paciencia predatoria e instinto.',
};
const CACADOR_DAS_ALMAS: ThemeEntry = {
  primary: '#6366f1', secondary: '#1e1b4b', glow: 'rgba(99,102,241,0.28)',
  bg: 'bg-indigo-950/30', border: 'border-indigo-600/25 hover:border-indigo-400/55',
  text: 'text-indigo-300', icon: 'text-indigo-600/70', tag: 'text-indigo-200',
  rationale: 'Combate contra o incompreensivel: possessao entre sagrado e profano.',
};
const CAMPEAO_DIMENSIONAL: ThemeEntry = {
  primary: '#c084fc', secondary: '#4c1d95', glow: 'rgba(192,132,252,0.28)',
  bg: 'bg-violet-950/25', border: 'border-violet-500/25 hover:border-violet-400/55',
  text: 'text-violet-300', icon: 'text-violet-500/70', tag: 'text-violet-200',
  rationale: 'Guerreiros de outros planos: ruptura do espaco e grandiosidade epica.',
};
const CANALIZADOR: ThemeEntry = {
  primary: '#67e8f9', secondary: '#0e7490', glow: 'rgba(103,232,249,0.28)',
  bg: 'bg-cyan-950/25', border: 'border-cyan-400/25 hover:border-cyan-300/55',
  text: 'text-cyan-200', icon: 'text-cyan-400/70', tag: 'text-cyan-300',
  rationale: 'Canal de energia pura e mana: fluxo de poder e conexao entre planos.',
};
const CARTISTA_ARCANO: ThemeEntry = {
  primary: '#c9a227', secondary: '#5b21b6', glow: 'rgba(201,162,39,0.30)',
  bg: 'bg-amber-950/25', border: 'border-amber-500/25 hover:border-amber-400/55',
  text: 'text-amber-300', icon: 'text-amber-500/70', tag: 'text-amber-200',
  rationale: 'Cartas, taro e sorte: ouro antigo de oraculo combinado a magia violeta do destino.',
};
const COMERCIANTE: ThemeEntry = {
  primary: '#fcd34d', secondary: '#92400e', glow: 'rgba(252,211,77,0.28)',
  bg: 'bg-yellow-950/25', border: 'border-yellow-500/25 hover:border-yellow-400/55',
  text: 'text-yellow-300', icon: 'text-yellow-500/70', tag: 'text-yellow-200',
  rationale: 'Riqueza, redes e influencia: poder financeiro e barganha.',
};
const COZINHEIRO: ThemeEntry = {
  primary: '#f59e0b', secondary: '#166534', glow: 'rgba(245,158,11,0.28)',
  bg: 'bg-amber-950/25', border: 'border-amber-500/25 hover:border-amber-400/55',
  text: 'text-amber-300', icon: 'text-amber-500/80', tag: 'text-lime-200',
  rationale: 'Cozinha, calor e ingredientes frescos: cobre de fogao com verde de ervas e horta.',
};
const ENGENHEIRO: ThemeEntry = {
  primary: '#94a3b8', secondary: '#1e293b', glow: 'rgba(148,163,184,0.25)',
  bg: 'bg-slate-950/30', border: 'border-slate-500/25 hover:border-slate-400/55',
  text: 'text-slate-300', icon: 'text-slate-300/90', tag: 'text-slate-400',
  rationale: 'Construtores de maquinas: engrenagens, projetos tecnicos e racionalidade mecanica.',
};
const ESCRITOR_CONTOS: ThemeEntry = {
  primary: '#e879f9', secondary: '#701a75', glow: 'rgba(232,121,249,0.28)',
  bg: 'bg-fuchsia-950/25', border: 'border-fuchsia-500/25 hover:border-fuchsia-400/55',
  text: 'text-fuchsia-300', icon: 'text-fuchsia-500/70', tag: 'text-fuchsia-200',
  rationale: 'Molda a narrativa e a realidade com palavras: criatividade e ficcao viva.',
};
const ESPADACHIM: ThemeEntry = {
  primary: '#e2e8f0', secondary: '#334155', glow: 'rgba(226,232,240,0.20)',
  bg: 'bg-slate-950/30', border: 'border-slate-400/25 hover:border-slate-300/55',
  text: 'text-slate-200', icon: 'text-slate-300/90', tag: 'text-slate-300',
  rationale: 'Elegancia do combate com lamina: metal polido, tecnica refinada e esgrima.',
};
const GUARDIAO: ThemeEntry = {
  primary: '#38bdf8', secondary: '#1e3a5f', glow: 'rgba(56,189,248,0.28)',
  bg: 'bg-sky-950/25', border: 'border-sky-500/25 hover:border-sky-400/55',
  text: 'text-sky-300', icon: 'text-sky-500/70', tag: 'text-sky-200',
  rationale: 'Protecao de aliados: escudo, lealdade e resistencia inabalavel.',
};
const GUERREIRO: ThemeEntry = {
  primary: '#ef4444', secondary: '#7f1d1d', glow: 'rgba(239,68,68,0.35)',
  bg: 'bg-red-950/30', border: 'border-red-600/25 hover:border-red-500/60',
  text: 'text-red-400', icon: 'text-red-600/70', tag: 'text-red-300',
  rationale: 'Forca bruta do combate direto: poder, adrenalina e linha de frente.',
};
const GUIA_DIMENSIONAL: ThemeEntry = {
  primary: '#60a5fa', secondary: '#312e81', glow: 'rgba(96,165,250,0.28)',
  bg: 'bg-blue-950/25', border: 'border-blue-500/25 hover:border-blue-400/55',
  text: 'text-blue-300', icon: 'text-blue-500/70', tag: 'text-blue-200',
  rationale: 'Navega entre planos: mapas celestes, rotas impossiveis e orientacao no espaco-tempo.',
};
const INTERCEPTADOR: ThemeEntry = {
  primary: '#f97316', secondary: '#431407', glow: 'rgba(249,115,22,0.28)',
  bg: 'bg-orange-950/25', border: 'border-orange-500/25 hover:border-orange-400/55',
  text: 'text-orange-400', icon: 'text-orange-500/70', tag: 'text-orange-300',
  rationale: 'Velocidade e ataque-relampago: incandescencia, reacao imediata e impacto.',
};
const INVOCADOR: ThemeEntry = {
  primary: '#c026d3', secondary: '#3b0764', glow: 'rgba(192,38,211,0.30)',
  bg: 'bg-fuchsia-950/30', border: 'border-fuchsia-700/25 hover:border-fuchsia-500/55',
  text: 'text-fuchsia-400', icon: 'text-fuchsia-600/70', tag: 'text-fuchsia-300',
  rationale: 'Invoca seres de outros planos: portais instaveis e vinculos sobrenaturais.',
};
const LUTADOR: ThemeEntry = {
  primary: '#c2410c', secondary: '#7c2d12', glow: 'rgba(194,65,12,0.32)',
  bg: 'bg-orange-950/30', border: 'border-orange-700/25 hover:border-orange-500/60',
  text: 'text-orange-500', icon: 'text-orange-700/70', tag: 'text-orange-400',
  rationale: 'Combate corpo a corpo de impacto: poeira de arena, couro e forca fisica.',
};
const MEDICO: ThemeEntry = {
  primary: '#f8fafc', secondary: '#ef4444', glow: 'rgba(248,250,252,0.20)',
  bg: 'bg-white/5', border: 'border-white/20 hover:border-red-400/50',
  text: 'text-white', icon: 'text-red-400', tag: 'text-red-300',
  rationale: 'Cura e cirurgia: branco asseptico combinado ao vermelho medico.',
};
const NINJA: ThemeEntry = {
  primary: '#111827', secondary: '#64748b', glow: 'rgba(17,24,39,0.40)',
  bg: 'bg-gray-950/60', border: 'border-gray-700/30 hover:border-gray-500/55',
  text: 'text-gray-300', icon: 'text-gray-300/90', tag: 'text-gray-400',
  rationale: 'Furtividade extrema e golpe silencioso: sombra profunda com contraste para interfaces.',
};
const PILOTO: ThemeEntry = {
  primary: '#0ea5e9', secondary: '#0c4a6e', glow: 'rgba(14,165,233,0.28)',
  bg: 'bg-sky-950/25', border: 'border-sky-600/25 hover:border-sky-400/55',
  text: 'text-sky-300', icon: 'text-sky-600/70', tag: 'text-sky-200',
  rationale: 'Domina veiculos e aeronaves: liberdade, altitude e precisao em alta velocidade.',
};
const PIRATA_AMALDICOADO: ThemeEntry = {
  primary: '#ca8a04', secondary: '#164e63', glow: 'rgba(202,138,4,0.30)',
  bg: 'bg-yellow-950/25', border: 'border-yellow-600/25 hover:border-yellow-500/55',
  text: 'text-yellow-400', icon: 'text-yellow-600/70', tag: 'text-yellow-300',
  rationale: 'Maldicoes e mares: tesouro corrido, naufrагios e profundezas perigosas.',
};
const POPSTAR: ThemeEntry = {
  primary: '#ec4899', secondary: '#9d174d', glow: 'rgba(236,72,153,0.28)',
  bg: 'bg-pink-950/25', border: 'border-pink-500/25 hover:border-pink-400/55',
  text: 'text-pink-300', icon: 'text-pink-500/70', tag: 'text-pink-200',
  rationale: 'Artistas com poder de influencia: palco, holofotes, glamour e carisma.',
};
const RITUALISTA: ThemeEntry = {
  primary: '#7c3aed', secondary: '#2e1065', glow: 'rgba(124,58,237,0.32)',
  bg: 'bg-violet-950/30', border: 'border-violet-600/25 hover:border-violet-500/55',
  text: 'text-violet-400', icon: 'text-violet-600/70', tag: 'text-violet-300',
  rationale: 'Rituais, sacrificios e invocacoes: ocultismo e poderes proibidos.',
};
const SINTONIZADOR: ThemeEntry = {
  primary: '#2dd4bf', secondary: '#0f4c45', glow: 'rgba(45,212,191,0.28)',
  bg: 'bg-teal-950/25', border: 'border-teal-500/25 hover:border-teal-400/55',
  text: 'text-teal-300', icon: 'text-teal-500/70', tag: 'text-teal-200',
  rationale: 'Conexao a frequencias e energias: ondas, harmonia e ligacao invisivel.',
};
const VIAJANTE: ThemeEntry = {
  primary: '#a78bfa', secondary: '#4c1d95', glow: 'rgba(167,139,250,0.28)',
  bg: 'bg-violet-950/25', border: 'border-violet-500/25 hover:border-violet-400/55',
  text: 'text-violet-300', icon: 'text-violet-500/70', tag: 'text-violet-200',
  rationale: 'Cruza mundos e dimensoes: portais interdimensionais e sabedoria de eras.',
};
const DETETIVE: ThemeEntry = {
  primary: '#d97706', secondary: '#451a03', glow: 'rgba(217,119,6,0.28)',
  bg: 'bg-amber-950/30', border: 'border-amber-600/25 hover:border-amber-500/55',
  text: 'text-amber-400', icon: 'text-amber-600/70', tag: 'text-amber-300',
  rationale: 'Investigacao e deducao: sepia de arquivo antigo, lupa e luz de escritorio.',
};
const DEVORADOR: ThemeEntry = {
  primary: '#dc2626', secondary: '#450a0a', glow: 'rgba(220,38,38,0.32)',
  bg: 'bg-red-950/35', border: 'border-red-700/30 hover:border-red-600/60',
  text: 'text-red-400', icon: 'text-red-600/80', tag: 'text-red-300',
  rationale: 'Fome e apropriacao: sangue, presa e poder emprestado de quem ja morreu.',
};

// ── MAPA PRINCIPAL ────────────────────────────────────────────────────────────

export const THEME_MAP: Record<string, ThemeEntry> = {
  // Racas Comuns
  humano: HUMANO, anao: ANAO, goblim: GOBLIM, golem: GOLEM,
  espirito: ESPIRITO, gigante: GIGANTE, animalia: ANIMALIA,
  sereia: SEREIA, tritao: SEREIA, sereiaoututritao: SEREIA,
  mimico: MIMICO, simbionte: SIMBIONTE, feerico: FEERICO, slime: SLIME, vampiro: VAMPIRO,
  // Racas Especiais
  elfo: ELFO, desperto: DESPERTO, auleth: AULETH, automato: AUTOMATO,
  clone: CLONE, entidade: ENTIDADE, anomalia: ANOMALIA, bruxa: BRUXA, amalgamo: AMALGAMO,
  onirico: ONIRICO, divino: DIVINO,
  // Classes
  alquimista: ALQUIMISTA, atirador: ATIRADOR, cacador: CACADOR,
  cacadordasalmas: CACADOR_DAS_ALMAS,
  campeaodimensional: CAMPEAO_DIMENSIONAL, canalizador: CANALIZADOR,
  cartistaarcano: CARTISTA_ARCANO,
  comerciante: COMERCIANTE, cozinheiro: COZINHEIRO,
  engenheiro: ENGENHEIRO, escritordecontos: ESCRITOR_CONTOS,
  espadachim: ESPADACHIM, guardiao: GUARDIAO, guerreiro: GUERREIRO,
  guiadimensional: GUIA_DIMENSIONAL, interceptador: INTERCEPTADOR,
  invocador: INVOCADOR, lutador: LUTADOR, medico: MEDICO,
  ninja: NINJA, piloto: PILOTO, pirataamaldicoado: PIRATA_AMALDICOADO,
  popstar: POPSTAR, ritualista: RITUALISTA, sintonizador: SINTONIZADOR,
  viajanteclasse: VIAJANTE, viajante: VIAJANTE,
  detetive: DETETIVE, devorador: DEVORADOR,
};

export const DEFAULT_THEME: ThemeEntry = HUMANO;

/**
 * Retorna o tema de uma raca ou classe pelo id/titulo normalizado.
 * Remove acentos, espacos e caracteres especiais antes de buscar.
 */
export const obterTemaPorId = (id: string): ThemeEntry => {
  const norm = id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  return THEME_MAP[norm] ?? DEFAULT_THEME;
};
