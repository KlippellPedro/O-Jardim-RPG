import type { RegraTopicoDe } from './tipos';

export interface ITrechoTransporte {
  custoLunaris: number;
  tempo: string;
}

export interface IMeioTransporte {
  id: 'trem' | 'aeronave-comum' | 'aeronave-alto-nivel';
  titulo: string;
  mesmoReino: ITrechoTransporte;
  entreReinos: ITrechoTransporte;
  entreDimensoes: ITrechoTransporte;
}

export interface IServicoTransporte {
  id: string;
  titulo: string;
  custoLunaris: number;
  requisito: string;
  observacao: string;
}

export interface IViagemExcepcional {
  id: string;
  destino: string;
  custoLunaris: number;
  tempo: string;
  requisito: string;
  observacao: string;
}

export const TRANSPORTES_LUNARIS: readonly IMeioTransporte[] = [
  {
    id: 'trem',
    titulo: 'Trem',
    mesmoReino: { custoLunaris: 20, tempo: '30 min' },
    entreReinos: { custoLunaris: 50, tempo: '1–2 dias' },
    entreDimensoes: { custoLunaris: 200, tempo: '7 dias' },
  },
  {
    id: 'aeronave-comum',
    titulo: 'Aeronave Comum',
    mesmoReino: { custoLunaris: 50, tempo: '10 min' },
    entreReinos: { custoLunaris: 100, tempo: '1–2 horas' },
    entreDimensoes: { custoLunaris: 500, tempo: '2 dias' },
  },
  {
    id: 'aeronave-alto-nivel',
    titulo: 'Aeronave de Alto Nível',
    mesmoReino: { custoLunaris: 100, tempo: '1 min' },
    entreReinos: { custoLunaris: 250, tempo: '20–30 min' },
    entreDimensoes: { custoLunaris: 1_000, tempo: '1 hora' },
  },
];

export const ACESSO_PORTAL_DIMENSIONAL: IServicoTransporte = {
  id: 'portal-dimensional',
  titulo: 'Acesso ao Portal Dimensional',
  custoLunaris: 500,
  requisito: 'Portal disponível',
  observacao: 'Custo adicional ao transporte',
};

export const VIAGENS_EXCEPCIONAIS: readonly IViagemExcepcional[] = [
  {
    id: 'sair-da-arvore',
    destino: 'Sair da Árvore',
    custoLunaris: 10_000,
    tempo: '12 dias',
    requisito: 'Contato capaz de realizar a viagem',
    observacao: 'Dinheiro sozinho não garante acesso',
  },
];

const formatarLunaris = (valor: number) => `${new Intl.NumberFormat('pt-BR').format(valor)} Lunaris`;

const celulaTrecho = ({ custoLunaris, tempo }: ITrechoTransporte) => (
  `<strong>${formatarLunaris(custoLunaris)}</strong><br> <small>${tempo}</small>`
);

const linhasTransportes = TRANSPORTES_LUNARIS.map((transporte) => `
  <tr>
    <th scope="row">${transporte.titulo}</th>
    <td>${celulaTrecho(transporte.mesmoReino)}</td>
    <td>${celulaTrecho(transporte.entreReinos)}</td>
    <td>${celulaTrecho(transporte.entreDimensoes)}</td>
  </tr>
`).join('');

const linhasViagensExcepcionais = VIAGENS_EXCEPCIONAIS.map((viagem) => `
  <tr>
    <th scope="row">${viagem.destino}</th>
    <td><strong>${formatarLunaris(viagem.custoLunaris)}</strong></td>
    <td>${viagem.tempo}</td>
    <td>${viagem.requisito}</td>
    <td>${viagem.observacao}</td>
  </tr>
`).join('');

export const REGRA_TRANSPORTE: RegraTopicoDe<'Livro do Jogador'> = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'Custos por personagem, duração das rotas e requisitos para viajar dentro de um reino, entre reinos, entre dimensões ou para fora da Árvore.',
  destaques: [
    ['Cobrança', 'Por personagem'],
    ['Portal Dimensional', `${formatarLunaris(ACESSO_PORTAL_DIMENSIONAL.custoLunaris)} adicionais`],
    ['Viagem excepcional', 'Acesso depende de contato'],
  ],
  corpo: `
    <p class="regras-lead">Escolha o meio de transporte e a extensão da rota. Cada célula mostra primeiro o <strong>preço por personagem</strong> e, abaixo, o tempo normal de viagem. Os valores servem como referência de compra; clima, conflitos, bloqueios de rota e acontecimentos da campanha podem alterar a duração.</p>

    <h3 class="regras-subtitle">Transporte entre reinos e dimensões</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <caption class="sr-only">Custos e tempos dos meios de transporte de Lunaris</caption>
      <thead><tr><th scope="col">Transporte</th><th scope="col">Mesmo Reino</th><th scope="col">Entre Reinos</th><th scope="col">Entre Dimensões</th></tr></thead>
      <tbody>${linhasTransportes}</tbody>
    </table></div>
    <p class="regras-note"><strong>Rota entre dimensões:</strong> exige um Portal Dimensional disponível. Some a taxa de acesso ao preço do meio de transporte escolhido.</p>

    <h3 class="regras-subtitle">Portal Dimensional</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <caption class="sr-only">Taxa de acesso ao Portal Dimensional</caption>
      <thead><tr><th scope="col">Serviço</th><th scope="col">Custo</th><th scope="col">Requisito</th><th scope="col">Observação</th></tr></thead>
      <tbody><tr>
        <th scope="row">${ACESSO_PORTAL_DIMENSIONAL.titulo}</th>
        <td><strong>${formatarLunaris(ACESSO_PORTAL_DIMENSIONAL.custoLunaris)}</strong></td>
        <td>${ACESSO_PORTAL_DIMENSIONAL.requisito}</td>
        <td>${ACESSO_PORTAL_DIMENSIONAL.observacao}</td>
      </tr></tbody>
    </table></div>

    <h3 class="regras-subtitle">Viagens excepcionais</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <caption class="sr-only">Custos, tempos e requisitos de viagens excepcionais</caption>
      <thead><tr><th scope="col">Destino</th><th scope="col">Custo</th><th scope="col">Tempo</th><th scope="col">Requisito</th><th scope="col">Observação</th></tr></thead>
      <tbody>${linhasViagensExcepcionais}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Como aplicar os valores</h3>
    <ul class="regras-list">
      <li>Os preços são cobrados por personagem. Multiplique o valor da rota pelo número de viajantes que precisam de passagem.</li>
      <li>Os tempos representam a duração normal da viagem, antes de qualquer imprevisto da campanha.</li>
      <li>Viajar entre dimensões exige acesso a um Portal Dimensional e o pagamento adicional indicado na tabela.</li>
      <li>Uma viagem excepcional pode exigir algo além de dinheiro. Para sair da Árvore, o grupo também precisa de um contato capaz de realizar a viagem.</li>
    </ul>
  `,
  corpoMestre: `
    <p class="regras-lead">A tabela resolve a referência econômica; disponibilidade e complicações continuam sendo ferramentas de cena. Informe custo, requisito e duração antes de o grupo confirmar a viagem, especialmente quando cada personagem paga uma passagem.</p>

    <h3 class="regras-subtitle">Quando alterar a duração</h3>
    <p>Clima, conflitos, bloqueios de rota e acontecimentos da campanha podem estender ou interromper uma viagem. Deixe claro qual evento mudou o tempo previsto para que a tabela continue sendo uma referência confiável, e não uma promessa que varia sem motivo visível.</p>

    <h3 class="regras-subtitle">Acesso antes do pagamento</h3>
    <p>Dinheiro não cria um Portal disponível nem substitui o contato necessário para sair da Árvore. Confirme primeiro se o requisito existe na ficção; só depois cobre a passagem e a taxa adicional. Isso evita que o grupo pague por um serviço que não poderia usar.</p>

    <h3 class="regras-subtitle">Conferência do grupo</h3>
    <p>Como todo valor é individual, apresente também o total para o grupo antes da compra. Não há desconto coletivo definido nesta regra: qualquer alteração de preço deve ser uma decisão explícita da campanha, registrada como exceção em vez de substituir silenciosamente os valores de referência.</p>
  `,
};
