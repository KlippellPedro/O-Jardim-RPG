export const TIPOS_BASE = ['imovel', 'movel'] as const;
export type TipoBase = typeof TIPOS_BASE[number];

export const QUALIDADES_DESCANSO_BASE = ['Boa', 'Maravilhosa', 'Excelente'] as const;
export type QualidadeDescansoBase = typeof QUALIDADES_DESCANSO_BASE[number];

export type NivelInstalacaoBase = 1 | 2 | 3;

export interface IPatamarBase {
  id: string;
  titulo: string;
  ordem: number;
  espacos: number;
  ocupantes: number;
  nivelInstalacaoMaximo: NivelInstalacaoBase;
  fatorAquisicao: number;
  fatorManutencao: number;
}

export interface INivelInstalacaoBase {
  nivel: NivelInstalacaoBase;
  espacos: number;
  fatorAquisicao: number;
  fatorManutencao: number;
  efeitos: string[];
  capacidade?: number;
  qualidadeDescanso?: QualidadeDescansoBase;
}

export interface IInstalacaoBase {
  id: string;
  titulo: string;
  tiposPermitidos: TipoBase[];
  descricao: string;
  niveis: INivelInstalacaoBase[];
  limite: string;
}

export interface IReferenciaCustosBase {
  unidadeAquisicaoLunaris: number;
  unidadeManutencaoLunaris: number;
  aquisicao: string;
  manutencao: string;
  calculoAquisicao: string;
  calculoManutencao: string;
  vigencia: string;
}

export const REFERENCIA_CUSTOS_BASES: IReferenciaCustosBase = {
  unidadeAquisicaoLunaris: 1000,
  unidadeManutencaoLunaris: 100,
  aquisicao: 'Uma Unidade de Aquisição vale 1.000 Lunaris.',
  manutencao: 'Uma Unidade de Manutenção vale 100 Lunaris por mês.',
  calculoAquisicao: 'Some o fator do patamar aos fatores das instalações e multiplique pela Unidade de Aquisição.',
  calculoManutencao: 'Some o fator de manutenção do patamar aos fatores das instalações ativas e multiplique pela Unidade de Manutenção. Exceção: um terreno sem nenhuma estrutura construída (só o lote, sem edificação) paga metade da manutenção do fator do patamar, já que não há conservação de estrutura nem instalações fixas a manter.',
  vigencia: 'Use as unidades publicadas neste capítulo. Uma alteração futura não recalcula valores já pagos.',
};

export const PATAMARES_BASE: IPatamarBase[] = [
  {
    id: 'posto',
    titulo: 'Posto',
    ordem: 1,
    espacos: 3,
    ocupantes: 4,
    nivelInstalacaoMaximo: 1,
    fatorAquisicao: 1,
    fatorManutencao: 1,
  },
  {
    id: 'sede',
    titulo: 'Sede',
    ordem: 2,
    espacos: 6,
    ocupantes: 12,
    nivelInstalacaoMaximo: 2,
    fatorAquisicao: 3,
    fatorManutencao: 2,
  },
  {
    id: 'complexo',
    titulo: 'Complexo',
    ordem: 3,
    espacos: 10,
    ocupantes: 30,
    nivelInstalacaoMaximo: 3,
    fatorAquisicao: 6,
    fatorManutencao: 4,
  },
  {
    id: 'enclave',
    titulo: 'Fortaleza',
    ordem: 4,
    espacos: 16,
    ocupantes: 60,
    nivelInstalacaoMaximo: 3,
    fatorAquisicao: 10,
    fatorManutencao: 7,
  },
];

const TIPOS_PERMITIDOS: TipoBase[] = ['imovel', 'movel'];

export const INSTALACOES_BASE: IInstalacaoBase[] = [
  {
    id: 'dormitorio',
    titulo: 'Dormitório',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Fornece abrigo para descanso completo até sua capacidade.',
    limite: 'A base usa apenas o Dormitório de maior nível. Benefícios de descanso não se acumulam.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 4, qualidadeDescanso: 'Boa', efeitos: ['Permite descanso de qualidade Boa para até 4 ocupantes.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 8, qualidadeDescanso: 'Maravilhosa', efeitos: ['Permite descanso de qualidade Maravilhosa para até 8 ocupantes.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 12, qualidadeDescanso: 'Excelente', efeitos: ['Permite descanso de qualidade Excelente para até 12 ocupantes se Área Médica 2 ou superior estiver ativa; sem ela, a qualidade é Maravilhosa.'] },
    ],
  },
  {
    id: 'area-medica',
    titulo: 'Área Médica',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Fornece instrumentos, leitos e suprimentos para tratamento dentro da base.',
    limite: 'Use somente o efeito do maior nível. Bônus de outras instalações médicas não se acumulam.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 1, efeitos: ['Concede +2 em Cura para tratar um paciente por vez.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 2, efeitos: ['Concede vantagem em Cura para tratar até 2 pacientes por vez; não aplique o +2 do nível 1.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 4, efeitos: ['Concede vantagem e +2 em Cura para tratar até 4 pacientes por vez.'] },
    ],
  },
  {
    id: 'oficina',
    titulo: 'Oficina',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Atende requisitos de bancada para construção e reparo mecânico.',
    limite: 'Não fornece materiais, não reduz custos e não concede produção automática.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 1, efeitos: ['Equivale a um Kit de Ofício fixo e mantém 1 projeto mecânico em andamento.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 2, efeitos: ['Também equivale a uma Oficina A.X.I.S e mantém até 2 projetos mecânicos em andamento.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 3, efeitos: ['Mantém até 3 projetos mecânicos em andamento com Kit de Ofício ou Oficina A.X.I.S.'] },
    ],
  },
  {
    id: 'laboratorio',
    titulo: 'Laboratório',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Atende requisitos de bancada para alquimia, pesquisa, magia ou tecnologia.',
    limite: 'Escolha uma especialidade ao instalar. Não fornece materiais, não reduz custos e não concede produção automática.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 1, efeitos: ['Na especialidade Alquimia, equivale a um Laboratório Alquímico e mantém 1 projeto.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 2, efeitos: ['Mantém até 2 projetos da especialidade em andamento.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 3, efeitos: ['Com Área Médica 2 ou superior, também equivale a uma Sala de Implante e mantém até 3 projetos.'] },
    ],
  },
  {
    id: 'armazem',
    titulo: 'Armazém',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Guarda itens e materiais registrados no inventário da base.',
    limite: 'Não aumenta a capacidade de carga de personagens e não produz suprimentos.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 15, efeitos: ['Armazena até 15 itens.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 30, efeitos: ['Armazena até 30 itens.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 60, efeitos: ['Armazena até 60 itens.'] },
    ],
  },
  {
    id: 'hangar-estabulo',
    titulo: 'Hangar ou Estábulo',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Abriga veículos ou montarias. A modalidade é escolhida na instalação.',
    limite: 'Não concede veículo, montaria, deslocamento, arma, sistema veicular ou espaço de componente.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 1, efeitos: ['Abriga 1 veículo pequeno ou até 2 montarias.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 2, efeitos: ['Abriga 1 veículo médio, 2 pequenos ou até 4 montarias.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 4, efeitos: ['Abriga 2 veículos médios, 4 pequenos ou até 8 montarias.'] },
    ],
  },
  {
    id: 'seguranca',
    titulo: 'Segurança',
    tiposPermitidos: TIPOS_PERMITIDOS,
    descricao: 'Define a DT para invadir, sabotar ou abrir acesso protegido da base.',
    limite: 'Segurança não impede testes, não causa dano automático e não se acumula com outra instalação de Segurança.',
    niveis: [
      { nivel: 1, espacos: 1, fatorAquisicao: 1, fatorManutencao: 1, capacidade: 12, efeitos: ['DT 12: Ladinagem para acesso físico, Tecnologia para acesso eletrônico ou Ofício adequado para sabotagem.'] },
      { nivel: 2, espacos: 2, fatorAquisicao: 2, fatorManutencao: 2, capacidade: 16, efeitos: ['DT 16: Ladinagem para acesso físico, Tecnologia para acesso eletrônico ou Ofício adequado para sabotagem.'] },
      { nivel: 3, espacos: 3, fatorAquisicao: 4, fatorManutencao: 3, capacidade: 20, efeitos: ['DT 20: Ladinagem para acesso físico, Tecnologia para acesso eletrônico ou Ofício adequado para sabotagem.'] },
    ],
  },
];

const linhasPatamares = PATAMARES_BASE.map((patamar) => `<tr><td><strong>${patamar.titulo}</strong></td><td>${patamar.espacos}</td><td>${patamar.ocupantes}</td><td>${patamar.nivelInstalacaoMaximo}</td><td>${patamar.fatorAquisicao}</td><td>${patamar.fatorManutencao}</td></tr>`).join('');
const linhasInstalacoes = INSTALACOES_BASE.flatMap((instalacao) => instalacao.niveis.map((nivel) => `<tr><td><strong>${instalacao.titulo}</strong></td><td>${nivel.nivel}</td><td>${nivel.espacos}</td><td>${nivel.fatorAquisicao}</td><td>${nivel.fatorManutencao}</td><td>${nivel.efeitos.join(' ')}</td></tr>`)).join('');

export const REGRA_BASES = {
  status: 'Regra oficial',
  resumo: 'Aquisição, espaços, instalações, melhorias e manutenção de propriedades imóveis ou móveis.',
  destaques: [
    ['Capacidade', 'Cada instalação ocupa os espaços do nível atual'],
    ['Melhoria', 'Pague a diferença de fatores e substitua o nível anterior'],
    ['Manutenção', 'Cobrança mensal sem perda automática da propriedade'],
  ],
  categoria: 'Guia do Mestre' as const,
  corpo: `
    <h3 class="regras-subtitle">Registro da base</h3>
    <ul class="regras-list">
      <li>Registre nome, tipo, patamar, localização, responsáveis, espaços ocupados e instalações.</li>
      <li>Uma base imóvel permanece no local registrado. Uma base móvel depende de uma plataforma ou veículo já capaz de transportá-la.</li>
      <li>Estas regras não concedem deslocamento, Vida, Defesa, armas, tripulação nem componentes veiculares.</li>
    </ul>
    <h3 class="regras-subtitle">Espaços e instalações</h3>
    <ul class="regras-list">
      <li>A soma dos espaços ocupados não pode superar os espaços do patamar.</li>
      <li>O nível da instalação não pode superar o limite do patamar.</li>
      <li>Cada instalação ocupa apenas os espaços do nível atual. Uma melhoria substitui o nível anterior.</li>
      <li>Instalações de mesmo id não acumulam. Use apenas o maior nível ativo.</li>
      <li>Uma instalação inativa ocupa espaços, mas não concede efeitos.</li>
      <li>O limite de ocupantes indica quantas criaturas recebem serviços e descanso da base ao mesmo tempo. Excedentes não recebem benefícios de instalações.</li>
    </ul>
    <div class="regras-table-wrap"><table class="regras-table"><thead><tr><th>Patamar</th><th>Espaços</th><th>Ocupantes</th><th>Nível máximo</th><th>Aquisição</th><th>Manutenção</th></tr></thead><tbody>${linhasPatamares}</tbody></table></div>
    <div class="regras-table-wrap"><table class="regras-table"><thead><tr><th>Instalação</th><th>Nível</th><th>Espaços</th><th>Aquisição</th><th>Manutenção</th><th>Efeito</th></tr></thead><tbody>${linhasInstalacoes}</tbody></table></div>
    <h3 class="regras-subtitle">Aquisição e melhoria</h3>
    <ul class="regras-list">
      <li>${REFERENCIA_CUSTOS_BASES.aquisicao} ${REFERENCIA_CUSTOS_BASES.manutencao}</li>
      <li>Para adquirir uma base, some o fator do patamar aos fatores das instalações iniciais.</li>
      <li>Para melhorar patamar ou instalação, pague somente a diferença positiva entre os fatores antigos e novos.</li>
      <li>Remover uma instalação libera seus espaços e não concede reembolso automático.</li>
    </ul>
    <h3 class="regras-subtitle">Descanso e produção</h3>
    <ul class="regras-list">
      <li>Dormitório define o limite de qualidade; duração, interrupções, alimento, água e demais requisitos continuam aplicáveis.</li>
      <li>Cada personagem recebe os benefícios de um único descanso. Dormitórios e efeitos equivalentes não se acumulam.</li>
      <li>Oficina e Laboratório apenas atendem requisitos e limitam projetos simultâneos. Materiais, tempo, testes e falhas seguem as regras do projeto.</li>
    </ul>
    <h3 class="regras-subtitle">Manutenção</h3>
    <ol class="regras-list">
      <li>Calcule a manutenção uma vez por mês com o fator do patamar e das instalações ativas.</li>
      <li>Com um pagamento atrasado, a base fica pendente e não pode iniciar melhorias.</li>
      <li>Com dois pagamentos atrasados, o proprietário escolhe uma instalação para ficar inativa.</li>
      <li>A cada novo atraso, o proprietário escolhe mais uma instalação ativa para ficar inativa.</li>
      <li>Quitar os atrasos reativa as instalações em 24 horas. A inadimplência não transfere nem confisca a propriedade automaticamente.</li>
    </ol>
    <h3 class="regras-subtitle">Bases móveis</h3>
    <p>A ficha da plataforma precisa informar quantos espaços de base suporta; sem esse campo, ela não recebe instalações de base. Quando uma peça veicular e uma instalação forem equivalentes, use o efeito publicado da peça e não aplique o efeito-base. Movimento, perseguição, colisão, dano e reparo continuam sob as regras da plataforma.</p>
  `,
};
