/* ─────────────────────────────────────────────────────────
   O Jardim RPG — Regras
   Dados dos tópicos: cada um vira um card no índice e uma
   página própria (rota /<id> dentro do router isolado desta
   página — ver src/regras/regras.js).
   ───────────────────────────────────────────────────────── */

export const TOPICOS = [
  {
    id: 'sistema-base',
    titulo: 'Sistema Base',
    simbolo: '§',
    accent: 'var(--gold)',
    resumo: 'Atributos, dados e as fórmulas que sustentam sua ficha.',
    corpo: `
      <ul class="regras-list">
        <li>Dado base: <strong>d20</strong></li>
        <li>6 atributos: Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma</li>
        <li>Criação de personagem: rolar <strong>6d20</strong> e distribuir os resultados entre os 6 atributos</li>
        <li>Perícias iniciais: 3 vindas da história + 3 à escolha</li>
        <li>Itens iniciais: 1 item comum + 20 Lunaris</li>
        <li>Limite de <strong>2 classes</strong> por personagem — Classes Esquecidas não contam nesse limite</li>
      </ul>

      <h3 class="regras-subtitle">Fórmulas</h3>
      <dl class="regras-kv">
        <dt>Modificador</dt><dd>(atributo − 10) ÷ 2, arred. p/ baixo</dd>
        <dt>Vida</dt><dd>Mod.Constituição + (Força × 3)</dd>
        <dt>Força Vital</dt><dd>Mod.Sabedoria + (Inteligência × 2)</dd>
        <dt>Movimento</dt><dd>Mod.Destreza × 2</dd>
      </dl>

      <h3 class="regras-subtitle">Bônus ao atingir Mod +5 (sem itens, efeitos ou magias)</h3>
      <ul class="regras-sublist">
        <li><strong>Força</strong> — danos corpo a corpo causam +1 dado</li>
        <li><strong>Destreza</strong> — +6 no deslocamento</li>
        <li><strong>Constituição</strong> — ao entrar em "morrendo", aguenta 4 rodadas em vez de 3</li>
        <li><strong>Inteligência</strong> — +1 proficiência ou +2 perícias extras</li>
        <li><strong>Sabedoria</strong> — ao entrar em "enlouquecendo", aguenta 4 rodadas em vez de 3</li>
        <li><strong>Carisma</strong> — mais chances de NPCs importantes virem falar com você</li>
      </ul>
    `,
  },
  {
    id: 'pericias',
    titulo: 'Perícias e Resistências',
    simbolo: '◈',
    accent: 'var(--frost)',
    resumo: 'O que cada atributo destrava — e como resistir ao que vem contra você.',
    corpo: `
      <h3 class="regras-subtitle">Resistências (defesas passivas, não são perícias)</h3>
      <ul class="regras-list">
        <li><strong>Fortitude</strong> (Constituição) — resistência física: doenças, venenos, exaustão</li>
        <li><strong>Reflexos</strong> (Destreza) — resistência a ataques evitáveis: armadilhas, explosões, áreas</li>
        <li><strong>Vontade</strong> (Sabedoria) — resistência mental: ilusões, encantamentos, medo, sanidade</li>
      </ul>
      <p class="regras-note">Iniciativa também não é uma perícia — é um número estático que só define a ordem de ação em combate. Ver <button type="button" class="regras-inline-link" data-topico-link="condicoes">Condições Especiais</button>.</p>

      <h3 class="regras-subtitle">Perícias por atributo</h3>
      <ul class="regras-sublist">
        <li><strong>Força</strong> — Atletismo, Luta</li>
        <li><strong>Destreza</strong> — Acrobacia, Cavalgar, Furtividade, Ladinagem, Pilotagem, Pontaria</li>
        <li><strong>Inteligência</strong> — Conhecimento, Guerra, Investigação, Misticismo, Nobreza, Ofício</li>
        <li><strong>Sabedoria</strong> — Cura, Intuição, Percepção, Religião, Sobrevivência</li>
        <li><strong>Carisma</strong> — Atuação, Diplomacia, Enganação, Intimidação, Jogatina, Lidar com Animais, Obter Informação</li>
      </ul>

      <h3 class="regras-subtitle">Perícias de O Jardim</h3>
      <ul class="regras-list">
        <li><strong>Ressonância</strong> (Sabedoria) — perceber, identificar e resistir a Fluxos alheios</li>
        <li><strong>Tecnologia</strong> (Inteligência) — operar, reparar e entender itens A.X.I.S e maquinário avançado</li>
        <li><strong>Ritos de Arkarin</strong> (Sabedoria) — rituais ligados à morte, ao Fluxo do Sangue, à Mulher Carmesim</li>
        <li><strong>Sanidade</strong> (Sabedoria) — teste usado quando a Trilha de Sanidade é abalada. Ver <button type="button" class="regras-inline-link" data-topico-link="condicoes">Condições Especiais</button>.</li>
      </ul>
    `,
  },
  {
    id: 'acoes',
    titulo: 'Ações, Reações e Dano',
    simbolo: '⚔',
    accent: 'var(--blood)',
    resumo: 'O que fazer no seu turno, como reagir ao golpe, e como o dano se divide.',
    corpo: `
      <h3 class="regras-subtitle">Ações por turno</h3>
      <ul class="regras-list">
        <li><strong>Ação Padrão</strong> — ação principal do turno</li>
        <li><strong>Ação de Movimento</strong> — movimento ou ação secundária</li>
        <li><strong>Ação Livre</strong> — ação rápida sem custo significativo</li>
      </ul>

      <h3 class="regras-subtitle">Reação (1 por turno, escolha uma)</h3>
      <ul class="regras-list">
        <li><strong>Esquiva</strong> (teste de Reflexos) — evita o ataque completamente</li>
        <li><strong>Contra-Ataque</strong> (teste de Luta) — revida o ataque; não pode critar</li>
        <li><strong>Bloqueio</strong> (teste de Fortitude) — bloqueia metade do dano para você e um aliado</li>
        <li><strong>Defesa Natural</strong> (ilimitada) — defesa passiva padrão, sem teste</li>
      </ul>

      <h3 class="regras-subtitle">Tipos de dano</h3>
      <ul class="regras-list">
        <li>Comuns — Corte, Perfuração, Impacto, Balístico (subtipo de Perfuração)</li>
        <li>Variados — Mental, Veneno, Sangramento, Explosão, Elemental (Fluxo Elemental)</li>
      </ul>
    `,
  },
  {
    id: 'distancias',
    titulo: 'Distâncias',
    simbolo: '↔',
    accent: 'var(--neon)',
    resumo: 'Do corpo a corpo ao alcance galáctico — as faixas que definem o campo de batalha.',
    corpo: `
      <ul class="regras-list regras-list--inline">
        <li>Adjacente — corpo a corpo</li>
        <li>Curto — 5m</li>
        <li>Médio — 15m</li>
        <li>Longo — 25m</li>
        <li>Longo+ — 50m</li>
        <li>Extremo — 90m</li>
        <li>Colossal — 150m</li>
        <li>Lunar — 200m</li>
        <li>Estelar — 500m</li>
        <li>Galáctico — 1000m</li>
      </ul>
      <p class="regras-note">Para atingir Extremo ou distâncias maiores, são necessários itens específicos.</p>
    `,
  },
  {
    id: 'ferimentos',
    titulo: 'Ferimentos Críticos',
    simbolo: '☠',
    accent: 'var(--arkania)',
    resumo: 'O que acontece quando você cai a 0 P.V.. Role 1d20 e descubra.',
    corpo: `
      <p class="regras-note">Ao chegar a 0 P.V., rola 1d20 e consulta a tabela abaixo.</p>
      <ul class="regras-list">
        <li><strong>1–5, Hemorragia</strong> — perde 1 rodada para ser salvo</li>
        <li><strong>6–11, Osso Trincado</strong> — −2 em todos os testes físicos por 7 dias</li>
        <li><strong>12–14, Choque Mágico</strong> — perde 1dN de Força Vital máxima</li>
        <li><strong>15–19, Cicatriz Permanente</strong> — +2 em Intimidação, mais um debuff à escolha do mestre</li>
        <li><strong>20, Aqui não é o Final</strong> — volta com 1 P.V., vantagem e +5 no próximo teste</li>
      </ul>
    `,
  },
  {
    id: 'coreografia',
    titulo: 'Coreografia de Combate',
    simbolo: '✹',
    accent: 'var(--arkania-glow)',
    resumo: 'Declare uma ação cinematográfica e escolha o quanto está disposto a arriscar.',
    corpo: `
      <p class="regras-note">Em combates X1, o player pode declarar uma ação coreografada (estilosa/cinematográfica) e escolher o nível de risco antes de rolar.</p>
      <ul class="regras-list">
        <li><strong>Seguro</strong> — bônus: vantagem · falha: +1d6 de dano recebido</li>
        <li><strong>Arriscado</strong> — bônus: vantagem + 4 de dano · falha: +1d12 e perde ação de movimento</li>
        <li><strong>Mediano</strong> — bônus: vantagem + 6 de dano · falha: +2d8 e perde 2 na Defesa</li>
        <li><strong>Perigoso</strong> — bônus: vantagem + 8 de dano · falha: +2d8 e perde o próximo turno</li>
        <li><strong>All-In</strong> — bônus: crítico mortal com dano máximo · falha: crítico mortal recebido (3× dano) e cai no chão</li>
      </ul>
    `,
  },
  {
    id: 'descanso',
    titulo: 'Descanso, Relaxar e Cansaço',
    simbolo: '☾',
    accent: 'var(--star)',
    resumo: 'Como recuperar Vida e Força Vital — e o preço de nunca parar.',
    corpo: `
      <h3 class="regras-subtitle">Descanso — recupera Pontos de Vida</h3>
      <ul class="regras-list regras-list--inline">
        <li>Péssima — 0 + N/3</li>
        <li>Ruim — 1d2 + N/2</li>
        <li>Neutra — 1d4 + N</li>
        <li>Boa — 1d6 + N</li>
        <li>Maravilhosa — 1d8 + N</li>
        <li>Excelente — 2d5 + N (×2)</li>
      </ul>

      <h3 class="regras-subtitle">Relaxar — recupera Força Vital</h3>
      <ul class="regras-list regras-list--inline">
        <li>Péssima — 0 + N/3</li>
        <li>Ruim — 1d1 + N/2</li>
        <li>Neutra — 1d2 + N</li>
        <li>Boa — 1d4 + N</li>
        <li>Maravilhosa — 1d6 + N</li>
        <li>Excelente — 2d4 + N (×2)</li>
      </ul>

      <h3 class="regras-subtitle">Cansaço — como ganhar pontos</h3>
      <ul class="regras-list regras-list--inline">
        <li>Combate Intenso — +2</li>
        <li>Treinar (6h) — +1,5</li>
        <li>Treinar Pesado (12h) — +2,5</li>
        <li>Relaxar — −0,25</li>
        <li>Descansar — −1,5</li>
      </ul>

      <h3 class="regras-subtitle">Cansaço — níveis e efeitos</h3>
      <ul class="regras-list">
        <li><strong>Leve</strong> (1–2 pontos) — −2 em testes físicos</li>
        <li><strong>Moderado</strong> (3–4 pontos) — −5 em testes, −2 iniciativa</li>
        <li><strong>Intenso</strong> (5–6 pontos) — −5 em testes, treinos levam +50% do tempo</li>
        <li><strong>Grave</strong> (7–8 pontos) — −8 em tudo, não pode treinar</li>
        <li><strong>Exausto</strong> (9+ pontos) — desmaia ou −3 P.V. máximo</li>
      </ul>
    `,
  },
  {
    id: 'treinar',
    titulo: 'Treinar',
    simbolo: '▲',
    accent: 'var(--moss)',
    resumo: 'A jornada de Iniciante a Renomado em qualquer perícia.',
    corpo: `
      <p class="regras-note">Nível inicial: Iniciante. Para avançar de Iniciante para Aprendiz é necessária aula ou livro — não basta praticar.</p>
      <ul class="regras-list">
        <li><strong>Aprendiz</strong> — 3 dias + aula ou livro · bônus: Atributo</li>
        <li><strong>Treinado</strong> — 7 dias · bônus: N/2 + Atributo</li>
        <li><strong>Especialista</strong> — 14 dias · bônus: Nível + Atributo</li>
        <li><strong>Mestre</strong> — 21 dias + aula · bônus: Nível + Atributo + 2</li>
        <li><strong>Veterano</strong> — 32 dias + evento notável · bônus: Nível + Atributo + 4 + Vantagem</li>
        <li><strong>Renomado</strong> — 62 dias + evento + item especial · bônus: Nível + Atributo + 6 + Habilidade especial</li>
      </ul>
    `,
  },
  {
    id: 'xp',
    titulo: 'XP e Níveis',
    simbolo: '☆',
    accent: 'var(--gold-light)',
    resumo: 'A tabela de experiência completa, do Nível 1 ao 40.',
    corpo: `
      <div class="regras-xp-grid">
        <span>N1 — 0</span><span>N2 — 1.000</span><span>N3 — 3.000</span><span>N4 — 6.000</span>
        <span>N5 — 10.000</span><span>N6 — 15.000</span><span>N7 — 21.000</span><span>N8 — 28.000</span>
        <span>N9 — 36.000</span><span>N10 — 45.000</span><span>N11 — 55.000</span><span>N12 — 66.000</span>
        <span>N13 — 78.000</span><span>N14 — 91.000</span><span>N15 — 105.000</span><span>N16 — 120.000</span>
        <span>N17 — 136.000</span><span>N18 — 153.000</span><span>N19 — 171.000</span><span>N20 — 190.000</span>
        <span>N21 — 210.000</span><span>N22 — 231.000</span><span>N23 — 253.000</span><span>N24 — 277.000</span>
        <span>N25 — 301.000</span><span>N26 — 326.000</span><span>N27 — 352.000</span><span>N28 — 379.000</span>
        <span>N29 — 407.000</span><span>N30 — 436.000</span><span>N31 — 466.000</span><span>N32 — 497.000</span>
        <span>N33 — 529.000</span><span>N34 — 562.000</span><span>N35 — 596.000</span><span>N36 — 631.000</span>
        <span>N37 — 667.000</span><span>N38 — 704.000</span><span>N39 — 742.000</span><span>N40 — 781.000</span>
      </div>
    `,
  },
  {
    id: 'condicoes',
    titulo: 'Condições Especiais',
    simbolo: '⚠',
    accent: 'var(--arkania)',
    resumo: 'Sanidade, Morrendo, Grau de Perícia e Iniciativa.',
    corpo: `
      <h3 class="regras-subtitle">Sanidade</h3>
      <p class="regras-note">Todo ser começa com a Trilha de Sanidade em 100%. Testes de Sanidade malsucedidos reduzem esse valor conforme eventos traumáticos acontecem.</p>
      <ul class="regras-list">
        <li><strong>100% a 51%</strong> — mente estável</li>
        <li><strong>50%</strong> — entra em <strong>Enlouquecendo</strong></li>
        <li><strong>0%</strong> — a mente se quebra: o personagem ganha condições permanentes de enlouquecimento</li>
      </ul>

      <h3 class="regras-subtitle">Morrendo</h3>
      <ul class="regras-list">
        <li>Ativada ao chegar a <strong>0 P.V.</strong></li>
        <li>Por padrão, o personagem tem <strong>3 rodadas</strong> para ser salvo por outro personagem antes de morrer</li>
      </ul>

      <h3 class="regras-subtitle">Grau de Perícia</h3>
      <ul class="regras-list">
        <li>Permite subir uma perícia para o grau imediatamente acima</li>
        <li>Normalmente concedido em níveis específicos de progressão de classe</li>
      </ul>

      <h3 class="regras-subtitle">Iniciativa</h3>
      <ul class="regras-list">
        <li>Não é uma perícia — como a Defesa Natural, é um <strong>número estático</strong>, sem rolagem de dado</li>
        <li>Define quem age primeiro no combate</li>
        <li>Pode receber os mesmos bônus que uma perícia, só não rola dado junto com eles</li>
      </ul>
    `,
  },
];

export function topicoPorId(id) {
  return TOPICOS.find(t => t.id === id) || null;
}
