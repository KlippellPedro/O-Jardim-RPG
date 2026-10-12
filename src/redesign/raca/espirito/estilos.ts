/** Cor crua e classes de uma marca do Espírito (Fluxo, Pecado ou Virtude).
 * `tinta` é a cor viva, usada no ponto e no filete; `text` e `border` são as
 * mesmas cores como classe do Tailwind. */
export interface EstiloMarca {
  tinta: string;
  text: string;
  border: string;
}

/** Uma paleta por marca, indexada pelo id da variante em `data/ficha/racas.json`.
 *
 * Os Fluxos usam os mesmos `destaque` de FLUXO_TEMAS em
 * `src/services/magiaService.ts`, que já carrega a paleta canônica das Árvores:
 * se a paleta de um Fluxo mudar lá, ela muda aqui também (o teste
 * `raceChoices.test.ts` trava isso). Ficam repetidos como literal porque o
 * Tailwind só enxerga classe arbitrária escrita no próprio código-fonte. */
export const ESTILO_POR_MARCA: Record<string, EstiloMarca> = {
  // Fluxo da Origem / Gênese
  rosa: { tinta: 'rgb(239,159,190)', text: 'text-[#ef9fbe]', border: 'border-[#ef9fbe]/40' },
  // Essência / Alétheia
  amarelo: { tinta: 'rgb(240,220,120)', text: 'text-[#f0dc78]', border: 'border-[#f0dc78]/40' },
  // Comunicação / Parley
  prata: { tinta: 'rgb(220,225,231)', text: 'text-[#dce1e7]', border: 'border-[#dce1e7]/40' },
  // Vitalidade / Anima
  verde: { tinta: 'rgb(121,209,127)', text: 'text-[#79d17f]', border: 'border-[#79d17f]/40' },
  // Inconstância / Vórtice
  laranja: { tinta: 'rgb(243,149,85)', text: 'text-[#f39555]', border: 'border-[#f39555]/40' },
  // Físico / Baluarte
  marrom: { tinta: 'rgb(180,130,88)', text: 'text-[#b48258]', border: 'border-[#b48258]/40' },
  // Espaço / Matriz
  roxo: { tinta: 'rgb(173,125,225)', text: 'text-[#ad7de1]', border: 'border-[#ad7de1]/40' },
  // Tempo / Éon
  dourado: { tinta: 'rgb(207,173,99)', text: 'text-[#cfad63]', border: 'border-[#cfad63]/40' },
  // Vazio / Abismo
  preto: { tinta: 'rgb(119,112,127)', text: 'text-[#77707f]', border: 'border-[#77707f]/40' },
  // Fim / Limiar
  'vermelho-vinho': { tinta: 'rgb(210,75,102)', text: 'text-[#d24b66]', border: 'border-[#d24b66]/40' },
  // Tecnologia / A.X.I.S
  'azul-neon': { tinta: 'rgb(112,237,250)', text: 'text-[#70edfa]', border: 'border-[#70edfa]/40' },
  // Universal / Blanc (TEMA_UNIVERSAL em magiaService)
  branco: { tinta: 'rgb(231,226,242)', text: 'text-[#e7e2f2]', border: 'border-[#e7e2f2]/40' },

  // Pecados do Espírito Demoníaco
  'demonio-soberba': { tinta: 'rgb(167,139,250)', text: 'text-[#a78bfa]', border: 'border-[#a78bfa]/40' },
  'demonio-ganancia': { tinta: 'rgb(224,184,74)', text: 'text-[#e0b84a]', border: 'border-[#e0b84a]/40' },
  'demonio-luxuria': { tinta: 'rgb(224,82,156)', text: 'text-[#e0529c]', border: 'border-[#e0529c]/40' },
  'demonio-inveja': { tinta: 'rgb(143,191,63)', text: 'text-[#8fbf3f]', border: 'border-[#8fbf3f]/40' },
  'demonio-gula': { tinta: 'rgb(217,130,43)', text: 'text-[#d9822b]', border: 'border-[#d9822b]/40' },
  'demonio-ira': { tinta: 'rgb(224,68,68)', text: 'text-[#e04444]', border: 'border-[#e04444]/40' },
  'demonio-preguica': { tinta: 'rgb(127,143,176)', text: 'text-[#7f8fb0]', border: 'border-[#7f8fb0]/40' },

  // Virtudes do Espírito Angelical
  'anjo-humildade': { tinta: 'rgb(142,202,230)', text: 'text-[#8ecae6]', border: 'border-[#8ecae6]/40' },
  'anjo-caridade': { tinta: 'rgb(244,213,141)', text: 'text-[#f4d58d]', border: 'border-[#f4d58d]/40' },
  'anjo-castidade': { tinta: 'rgb(242,184,208)', text: 'text-[#f2b8d0]', border: 'border-[#f2b8d0]/40' },
  'anjo-gratidao': { tinta: 'rgb(163,217,165)', text: 'text-[#a3d9a5]', border: 'border-[#a3d9a5]/40' },
  'anjo-moderacao': { tinta: 'rgb(240,185,122)', text: 'text-[#f0b97a]', border: 'border-[#f0b97a]/40' },
  'anjo-paciencia': { tinta: 'rgb(201,184,240)', text: 'text-[#c9b8f0]', border: 'border-[#c9b8f0]/40' },
  'anjo-diligencia': { tinta: 'rgb(159,184,217)', text: 'text-[#9fb8d9]', border: 'border-[#9fb8d9]/40' },
};

/** Marca sem paleta própria (conteúdo novo publicado pelo Painel, por exemplo). */
export const ESTILO_MARCA_PADRAO: EstiloMarca = {
  tinta: 'rgb(203,213,225)',
  text: 'text-slate-200',
  border: 'border-slate-300/40',
};

export const estiloDaMarca = (id: string): EstiloMarca => ESTILO_POR_MARCA[id] ?? ESTILO_MARCA_PADRAO;
