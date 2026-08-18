export const TIPOS_AFLICAO = ['veneno', 'doenca', 'vicio'] as const;
export type TipoAflicao = typeof TIPOS_AFLICAO[number];

export const VIAS_EXPOSICAO = ['contato', 'ferimento', 'ingestao', 'inalacao', 'ambiente', 'uso'] as const;
export type ViaExposicao = typeof VIAS_EXPOSICAO[number];

export type ClassificacaoAflicao = 'comum' | 'sobrenatural';
export type UnidadeTempoAflicao = 'rodada' | 'minuto' | 'hora' | 'dia';
export type AtributoDrenado = 'Força' | 'Destreza' | 'Constituição' | 'Inteligência' | 'Sabedoria' | 'Carisma';

export interface IPeriodoAflicao {
  quantidade: number;
  unidade: UnidadeTempoAflicao;
}

export interface IDrenagemAtributo {
  atributo: AtributoDrenado;
  valor: number;
  temporaria: true;
  recuperacao: string;
}

export interface IEstagioAflicao {
  numero: number;
  efeitos: string[];
  aoEntrar?: string[];
  drenagemAtributo?: IDrenagemAtributo;
}

export interface IExposicaoAflicao {
  vias: ViaExposicao[];
  gatilho: string;
}

export interface IProgressaoAflicao {
  teste: 'Fortitude';
  sucessoCritico: -1;
  sucesso: 0;
  falha: 1;
  falhaCritica: 2;
}

export interface ITratamentoAflicao {
  pericia: 'Cura';
  dt: number;
  tempo: string;
  efeitoSucesso: string;
  limite: string;
  antidoto: 'encerra' | 'encerra_se_especifico' | 'nao_se_aplica';
}

export interface IDependenciaAflicao {
  gatilhoDependencia: string;
  inicioAbstinencia: IPeriodoAflicao;
  usoDuranteAbstinencia: string;
  restricaoAgencia: string;
}

export interface IAflicao {
  id: string;
  titulo: string;
  tipo: TipoAflicao;
  classificacao: ClassificacaoAflicao;
  exposicao: IExposicaoAflicao;
  dtFortitude: number;
  incubacao: IPeriodoAflicao;
  intervalo: IPeriodoAflicao;
  progressao: IProgressaoAflicao;
  estagios: IEstagioAflicao[];
  tratamento: ITratamentoAflicao;
  dependencia?: IDependenciaAflicao;
  observacoes?: string[];
}

const PROGRESSAO_PADRAO: IProgressaoAflicao = {
  teste: 'Fortitude',
  sucessoCritico: -1,
  sucesso: 0,
  falha: 1,
  falhaCritica: 2,
};

export const CATALOGO_AFLICOES: IAflicao[] = [
  {
    id: 'toxina-paralisante',
    titulo: 'Toxina Paralisante',
    tipo: 'veneno',
    classificacao: 'comum',
    exposicao: {
      vias: ['ferimento', 'ingestao'],
      gatilho: 'Contato da toxina com o sangue ou ingestão de uma dose.',
    },
    dtFortitude: 15,
    incubacao: { quantidade: 0, unidade: 'rodada' },
    intervalo: { quantidade: 1, unidade: 'rodada' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['Movimento reduzido pela metade.'] },
      { numero: 2, efeitos: ['Movimento 0.', 'Desvantagem em testes de Força e Destreza.'] },
      { numero: 3, efeitos: ['Fica Imobilizado.', 'Não pode usar reações.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 15,
      tempo: 'Ação padrão.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por intervalo.',
      antidoto: 'encerra',
    },
  },
  {
    id: 'peconha-hemorragica',
    titulo: 'Peçonha Hemorrágica',
    tipo: 'veneno',
    classificacao: 'comum',
    exposicao: {
      vias: ['ferimento'],
      gatilho: 'Ferimento causado por presa, ferrão ou arma contaminada.',
    },
    dtFortitude: 16,
    incubacao: { quantidade: 0, unidade: 'rodada' },
    intervalo: { quantidade: 1, unidade: 'rodada' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['Sofra 1d6 de dano de veneno no fim do intervalo.'] },
      { numero: 2, efeitos: ['Sofra 2d6 de dano de veneno no fim do intervalo.'] },
      { numero: 3, efeitos: ['Sofra 3d6 de dano de veneno no fim do intervalo.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 16,
      tempo: 'Ação padrão.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por intervalo.',
      antidoto: 'encerra',
    },
  },
  {
    id: 'febre-dos-esporos',
    titulo: 'Febre dos Esporos',
    tipo: 'doenca',
    classificacao: 'comum',
    exposicao: {
      vias: ['inalacao', 'ambiente'],
      gatilho: 'Uma hora em área contaminada sem proteção respiratória.',
    },
    dtFortitude: 14,
    incubacao: { quantidade: 6, unidade: 'hora' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em testes físicos.'] },
      { numero: 2, efeitos: ['−2 em testes físicos.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
      { numero: 3, efeitos: ['Desvantagem em testes físicos.', 'Descanso recupera uma categoria abaixo do normal, mínimo Péssima.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 14,
      tempo: '1 hora.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
  },
  {
    id: 'definhamento-arcano',
    titulo: 'Definhamento Arcano',
    tipo: 'doenca',
    classificacao: 'sobrenatural',
    exposicao: {
      vias: ['contato', 'ambiente'],
      gatilho: 'Contato direto com foco infeccioso sobrenatural.',
    },
    dtFortitude: 20,
    incubacao: { quantidade: 1, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Fortitude.'] },
      {
        numero: 2,
        efeitos: ['−1 em Fortitude.'],
        drenagemAtributo: {
          atributo: 'Constituição',
          valor: 1,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
      {
        numero: 3,
        efeitos: ['Desvantagem em Fortitude.'],
        drenagemAtributo: {
          atributo: 'Constituição',
          valor: 2,
          temporaria: true,
          recuperacao: 'Restaure o valor quando a aflição chegar ao estágio 0.',
        },
      },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 20,
      tempo: '1 hora e um reagente mágico de 50 Lunaris, consumido na tentativa.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'encerra_se_especifico',
    },
    observacoes: ['A drenagem indicada pelo estágio atual substitui a anterior; não acumule os valores.'],
  },
  {
    id: 'dependencia-de-estimulante',
    titulo: 'Dependência de Estimulante',
    tipo: 'vicio',
    classificacao: 'comum',
    exposicao: {
      vias: ['uso', 'ingestao'],
      gatilho: 'Uso repetido conforme o gatilho de dependência.',
    },
    dtFortitude: 15,
    incubacao: { quantidade: 0, unidade: 'dia' },
    intervalo: { quantidade: 1, unidade: 'dia' },
    progressao: PROGRESSAO_PADRAO,
    estagios: [
      { numero: 0, efeitos: [] },
      { numero: 1, efeitos: ['−1 em Iniciativa durante abstinência.'] },
      { numero: 2, efeitos: ['−2 em Iniciativa e em testes de Inteligência durante abstinência.'] },
      { numero: 3, efeitos: ['Desvantagem em testes de Inteligência durante abstinência.'], aoEntrar: ['Ganhe 1 Cansaço.'] },
    ],
    tratamento: {
      pericia: 'Cura',
      dt: 15,
      tempo: '1 hora de acompanhamento durante um descanso.',
      efeitoSucesso: 'Reduza o estágio em 1.',
      limite: 'Uma tentativa por dia.',
      antidoto: 'nao_se_aplica',
    },
    dependencia: {
      gatilhoDependencia: 'Após consumir duas ou mais doses por dia durante três dias, teste Fortitude. Falha aplica o estágio 1. Só conta como dose um item cuja descrição o identifique como estimulante.',
      inicioAbstinencia: { quantidade: 1, unidade: 'dia' },
      usoDuranteAbstinencia: 'Uma dose suspende os efeitos e o próximo teste de progressão por um intervalo, mas não reduz o estágio.',
      restricaoAgencia: 'A abstinência não obriga o personagem a procurar, comprar ou usar a substância.',
    },
  },
];

const formatarPeriodo = (periodo: IPeriodoAflicao) =>
  periodo.quantidade === 0 ? 'imediata' : `${periodo.quantidade} ${periodo.unidade}${periodo.quantidade === 1 ? '' : 's'}`;

const catalogoPublicado = CATALOGO_AFLICOES.map((aflicao) => `
  <section>
    <h4>${aflicao.titulo}</h4>
    <p><strong>${aflicao.tipo}</strong> ${aflicao.classificacao} · Fortitude DT ${aflicao.dtFortitude} · incubação ${formatarPeriodo(aflicao.incubacao)} · intervalo ${formatarPeriodo(aflicao.intervalo)}</p>
    <p><strong>Exposição:</strong> ${aflicao.exposicao.gatilho}</p>
    <ul class="regras-list">${aflicao.estagios.map((estagio) => `<li><strong>Estágio ${estagio.numero}:</strong> ${[
      ...estagio.efeitos,
      ...(estagio.aoEntrar ?? []),
      ...(estagio.drenagemAtributo ? [`Drenagem temporária: −${estagio.drenagemAtributo.valor} ${estagio.drenagemAtributo.atributo}.`] : []),
    ].join(' ') || 'Sem efeito.'}</li>`).join('')}</ul>
    <p><strong>Tratamento:</strong> Cura DT ${aflicao.tratamento.dt}; ${aflicao.tratamento.tempo} ${aflicao.tratamento.efeitoSucesso} ${aflicao.tratamento.limite}</p>
  </section>
`).join('');

export const REGRA_AFLICOES = {
  status: 'Regra oficial',
  resumo: 'Exposição, progressão, estágios e tratamento de venenos, doenças e vícios.',
  destaques: [
    ['Resistência', 'Fortitude contra a DT da aflição'],
    ['Tratamento', 'Cura reduz o estágio; antídotos obedecem à própria descrição'],
    ['Encerramento', 'Estágio 0 remove a aflição'],
  ],
  categoria: 'Combate e Mecânicas' as const,
  corpo: `
    <h3 class="regras-subtitle">Aplicação</h3>
    <ol class="regras-list">
      <li>Ao sofrer exposição, teste Fortitude contra a DT da aflição. Sucesso ou sucesso crítico evita a aflição. Falha aplica o estágio 1 depois da incubação; falha crítica aplica o estágio 2.</li>
      <li>No fim de cada intervalo, faça outro teste. Sucesso crítico reduz 1 estágio; sucesso mantém; falha aumenta 1; falha crítica aumenta 2.</li>
      <li>O estágio não passa do maior valor do catálogo. Seus efeitos não se acumulam com os de estágios anteriores, salvo indicação expressa.</li>
      <li>Ao chegar ao estágio 0, remova a aflição e restaure qualquer atributo drenado conforme a recuperação indicada.</li>
    </ol>
    <h3 class="regras-subtitle">Exposições repetidas</h3>
    <p>Uma nova exposição à mesma aflição exige Fortitude. Falha aumenta 1 estágio imediatamente. Esse aumento ocorre no máximo uma vez por cena. Aflições diferentes são acompanhadas separadamente.</p>
    <h3 class="regras-subtitle">Tratamento</h3>
    <ul class="regras-list">
      <li>Cura usa a DT, o tempo e o limite registrados na aflição. Sucesso reduz 1 estágio.</li>
      <li>O Antídoto da loja encerra um veneno ativo. Preparos específicos que citam doença também podem encerrá-la.</li>
      <li>Cansaço recebido ao entrar em um estágio permanece até ser reduzido pelas regras de descanso.</li>
      <li>Drenagem de atributo é temporária, não acumula entre estágios e não pode passar de −3 por aflição.</li>
    </ul>
    <h3 class="regras-subtitle">Imunidades</h3>
    <p>Use a extensão exata da característica racial. Golem não contrai doenças comuns. Auleth é imune a doenças comuns e sobrenaturais. Autômato é imune a doenças e venenos enquanto não possuir Máquina Viva. Outras fisiologias só recebem imunidade quando o próprio texto determinar.</p>
    <h3 class="regras-subtitle">Dependência e abstinência</h3>
    <ul class="regras-list">
      <li>Um vício só começa quando seu gatilho de dependência for cumprido e o teste indicado falhar.</li>
      <li>Durante abstinência, aplique apenas os efeitos mecânicos do estágio. O jogador continua decidindo as ações do personagem.</li>
      <li>Usar a substância pode suspender efeitos conforme o catálogo, mas não reduz o estágio nem substitui tratamento.</li>
    </ul>
    <h3 class="regras-subtitle">Catálogo de aflições</h3>
    ${catalogoPublicado}
  `,
  corpoMestre: `
    <p class="regras-lead">Aflição é a única mecânica do livro que anda sozinha depois de aplicada. Você aplica uma vez e ela cobra teste a cada intervalo até alguém tratar, o que a torna ótima para pressão de médio prazo e péssima como dano de rotina.</p>

    <h3 class="regras-subtitle">Escolher a aflição certa</h3>
    <ul class="regras-list">
      <li>O que decide o peso não é a DT, é o intervalo. Veneno de combate cobra teste a cada rodada e resolve dentro da cena; doença cobra a cada dia e atravessa sessões.</li>
      <li>O catálogo publicado anda entre DT 14 e DT 20. Fique nessa faixa: acima dela a aflição vira sentença, porque o alvo falha em quase todo intervalo.</li>
      <li>Falha crítica na exposição já entra direto no estágio 2. Isso é duro, e é o motivo para não distribuir exposição em cena banal.</li>
    </ul>

    <h3 class="regras-subtitle">Não virar imposto</h3>
    <ul class="regras-list">
      <li>Uma exposição por cena, no máximo. A regra de que nova exposição sobe só 1 estágio por cena existe justamente para impedir a soma infinita.</li>
      <li>Deixe sempre uma saída à vista: o Antídoto está na Loja, e Cura reduz um estágio por tentativa. Se o grupo não alcança nenhum dos dois, a aflição deixou de ser risco e virou punição.</li>
      <li>Drenagem de atributo é temporária e para em menos 3 por aflição. Não improvise drenagem permanente: isso é território de maldição, que é outra coisa.</li>
      <li>O Cansaço ganho ao entrar num estágio fica até o descanso reduzir. Some ao que a campanha já está cobrando antes de aplicar mais uma.</li>
    </ul>

    <h3 class="regras-subtitle">Respeitar as imunidades</h3>
    <p>Use a extensão exata escrita na raça: Golem escapa de doença comum, Auleth escapa de comum e sobrenatural, Autômato escapa de doença e veneno enquanto não tiver Máquina Viva. Não estenda por analogia, e não invente imunidade para fisiologia que não a declara.</p>

    <h3 class="regras-subtitle">Vício, com cuidado</h3>
    <ul class="regras-list">
      <li>Dependência só começa quando o gatilho é cumprido e o teste falha. Não aplique porque o personagem usou uma vez.</li>
      <li>Na abstinência, aplique só o efeito mecânico. Quem decide o que o personagem faz continua sendo o jogador, sempre.</li>
      <li>Este é conteúdo que pede combinação prévia. Pergunte à mesa antes de colocar vício em jogo, do mesmo jeito que perguntaria sobre qualquer tema pesado.</li>
    </ul>
  `,
};
