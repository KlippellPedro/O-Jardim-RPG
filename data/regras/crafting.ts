import type { RegraTopicoDe } from './tipos';

export type RaridadeCraftingId =
  | 'comum'
  | 'incomum'
  | 'raro'
  | 'epico'
  | 'lendario'
  | 'reliquia'
  | 'reliquia da criacao';

export type PericiaCrafting = 'Ofício' | 'Tecnologia';
export type CategoriaCrafting = 'forja' | 'alquimia' | 'axis' | 'cibernetico';

export interface RegraRaridadeCrafting {
  id: RaridadeCraftingId;
  titulo: string;
  dt: number | null;
  diasTrabalho: number | null;
  custoMateriaisPercentual: number | null;
  requerAprovacao: boolean;
  fabricacaoComumPermitida: boolean;
  requisitoAdicional: string;
}

export interface FerramentaCrafting {
  id: string;
  titulo: string;
  categorias: CategoriaCrafting[];
  requisito: string;
}

export interface ModeloProjetoCrafting {
  id: CategoriaCrafting;
  titulo: string;
  pericia: PericiaCrafting;
  especialidade?: string;
  ferramentaId: string;
  escopo: string;
  regraEspecifica: string;
}

export interface ResultadoCrafting {
  id: 'sucesso-critico' | 'sucesso' | 'falha' | 'falha-critica';
  titulo: string;
  efeito: string;
  diasAdicionais: number;
  materiaisAdicionaisPercentual: number;
}

export interface RegraReparoCrafting {
  custoPercentual: number;
  dtMinima: number;
  reducaoDtDaRaridade: number;
  horasComumOuIncomum: number;
  horasRaroOuEpico: number;
  regra: string;
}

export type RegraTopicoCrafting = RegraTopicoDe<'Livro do Jogador'>;

export const HORAS_POR_DIA_DE_TRABALHO = 6;

export const TABELA_CRAFTING_RARIDADE: RegraRaridadeCrafting[] = [
  {
    id: 'comum',
    titulo: 'Comum',
    dt: 10,
    diasTrabalho: 1,
    custoMateriaisPercentual: 50,
    requerAprovacao: false,
    fabricacaoComumPermitida: true,
    requisitoAdicional: 'Receita ou projeto e ferramentas adequadas.',
  },
  {
    id: 'incomum',
    titulo: 'Incomum',
    dt: 15,
    diasTrabalho: 3,
    custoMateriaisPercentual: 60,
    requerAprovacao: false,
    fabricacaoComumPermitida: true,
    requisitoAdicional: 'Receita ou projeto e ferramentas adequadas.',
  },
  {
    id: 'raro',
    titulo: 'Raro',
    dt: 20,
    diasTrabalho: 7,
    custoMateriaisPercentual: 70,
    requerAprovacao: false,
    fabricacaoComumPermitida: true,
    requisitoAdicional: 'A receita indica ao menos um material específico.',
  },
  {
    id: 'epico',
    titulo: 'Épico',
    dt: 25,
    diasTrabalho: 14,
    custoMateriaisPercentual: 80,
    requerAprovacao: false,
    fabricacaoComumPermitida: true,
    requisitoAdicional: 'Receita e ao menos um material raro ligado ao efeito.',
  },
  {
    id: 'lendario',
    titulo: 'Lendário',
    dt: 30,
    diasTrabalho: 30,
    custoMateriaisPercentual: 90,
    requerAprovacao: true,
    fabricacaoComumPermitida: false,
    requisitoAdicional: 'Projeto de campanha, instalação adequada e materiais únicos definidos antes do trabalho.',
  },
  {
    id: 'reliquia',
    titulo: 'Mítico',
    dt: null,
    diasTrabalho: null,
    custoMateriaisPercentual: null,
    requerAprovacao: true,
    fabricacaoComumPermitida: false,
    requisitoAdicional: 'Não pode ser reproduzida por crafting. Criação ou restauração ocorre como projeto de campanha.',
  },
  {
    id: 'reliquia da criacao',
    titulo: 'Relíquia da Criação',
    dt: null,
    diasTrabalho: null,
    custoMateriaisPercentual: null,
    requerAprovacao: true,
    fabricacaoComumPermitida: false,
    requisitoAdicional: 'Não pode ser fabricada, copiada ou convertida a partir de outro item.',
  },
];

export const FERRAMENTAS_CRAFTING: FerramentaCrafting[] = [
  {
    id: 'kit-oficio',
    titulo: 'Kit de Ofício',
    categorias: ['forja'],
    requisito: 'O kit deve corresponder à especialidade usada no teste.',
  },
  {
    id: 'laboratorio-alquimico',
    titulo: 'Laboratório Alquímico',
    categorias: ['alquimia'],
    requisito: 'Inclui vidraria, recipientes, fonte de calor e instrumentos de medição.',
  },
  {
    id: 'oficina-axis',
    titulo: 'Oficina A.X.I.S',
    categorias: ['axis'],
    requisito: 'Inclui bancada isolada, alimentação de energia e interface de diagnóstico.',
  },
  {
    id: 'sala-de-implante',
    titulo: 'Sala de Implante',
    categorias: ['cibernetico'],
    requisito: 'Inclui oficina A.X.I.S e estrutura clínica adequada ao procedimento.',
  },
];

export const MODELOS_PROJETO_CRAFTING: ModeloProjetoCrafting[] = [
  {
    id: 'forja',
    titulo: 'Forja e artesanato',
    pericia: 'Ofício',
    especialidade: 'A especialidade deve corresponder ao objeto fabricado.',
    ferramentaId: 'kit-oficio',
    escopo: 'Armas, armaduras, ferramentas, munição e objetos mundanos.',
    regraEspecifica: 'Efeitos, modificações e limites continuam sujeitos à raridade do item.',
  },
  {
    id: 'alquimia',
    titulo: 'Alquimia',
    pericia: 'Ofício',
    especialidade: 'Alquimia',
    ferramentaId: 'laboratorio-alquimico',
    escopo: 'Poções, remédios, ácidos, venenos e outros preparados consumíveis.',
    regraEspecifica: 'A receita define doses, validade, forma de uso e efeito de cada dose.',
  },
  {
    id: 'axis',
    titulo: 'Tecnologia A.X.I.S',
    pericia: 'Tecnologia',
    ferramentaId: 'oficina-axis',
    escopo: 'Dispositivos A.X.I.S, sistemas eletrônicos, programação e maquinário avançado.',
    regraEspecifica: 'Software exige hardware compatível e não concede efeito que o projeto não possua.',
  },
  {
    id: 'cibernetico',
    titulo: 'Cibernéticos',
    pericia: 'Tecnologia',
    ferramentaId: 'sala-de-implante',
    escopo: 'Fabricação, configuração e instalação de implantes cibernéticos.',
    regraEspecifica: 'A instalação não ignora compatibilidade, limite de implantes nem pré-requisito do item.',
  },
];

export const RESULTADOS_CRAFTING: ResultadoCrafting[] = [
  {
    id: 'sucesso-critico',
    titulo: 'Sucesso crítico',
    efeito: 'Conclui uma unidade. Preserve componentes comuns de valor máximo igual a 10% do custo de materiais. Não aumenta raridade, quantidade ou efeito.',
    diasAdicionais: 0,
    materiaisAdicionaisPercentual: -10,
  },
  {
    id: 'sucesso',
    titulo: 'Sucesso',
    efeito: 'Conclui uma unidade conforme a receita ou o projeto.',
    diasAdicionais: 0,
    materiaisAdicionaisPercentual: 0,
  },
  {
    id: 'falha',
    titulo: 'Falha',
    efeito: 'O item não é concluído. O progresso permanece; uma nova tentativa exige um dia e materiais adicionais.',
    diasAdicionais: 1,
    materiaisAdicionaisPercentual: 10,
  },
  {
    id: 'falha-critica',
    titulo: 'Falha crítica',
    efeito: 'O item não é concluído. A correção exige dois dias e materiais adicionais. O projeto não é destruído automaticamente.',
    diasAdicionais: 2,
    materiaisAdicionaisPercentual: 25,
  },
];

export const REGRAS_REPARO: RegraReparoCrafting = {
  custoPercentual: 10,
  dtMinima: 10,
  reducaoDtDaRaridade: 5,
  horasComumOuIncomum: 2,
  horasRaroOuEpico: 6,
  regra: 'O reparo restaura a Durabilidade atual até a Durabilidade máxima. Não recupera consumíveis, cargas gastas ou item destruído e não acrescenta efeito ou modificação.',
};

export const REGRAS_RECEITA_E_PROJETO = [
  'Receita registra resultado, raridade, quantidade, materiais, ferramenta, perícia, DT e tempo.',
  'Projeto é obrigatório para item novo. O efeito e o preço de referência são definidos antes do primeiro gasto.',
  'Copiar um item exige uma receita válida. Possuir ou desmontar o item não concede a receita automaticamente.',
  'Toda mudança de efeito, quantidade ou raridade cria outro projeto e exige nova aprovação quando aplicável.',
];

export const SALVAGUARDAS_ECONOMIA_CRAFTING = [
  'O custo usa o preço normal, sem promoção. Item sem preço usa o valor de um item publicado de mesma raridade e função; sem comparável, o projeto não começa.',
  'Materiais específicos e Drops só substituem parte do custo quando a receita permitir. Cada material é consumido uma vez e vale no máximo seu preço registrado.',
  'Um Drop não pode ser usado, vendido e recuperado no mesmo projeto. Desmontagem nunca devolve mais valor do que foi consumido.',
  'Item criado para uso próprio não possui lucro ou comprador automático. Revenda depende da economia local e não gera valor acima do gasto sem contrato ou demanda definidos antes da fabricação.',
  'Efeitos de classe que preparam fórmulas ou engenhocas temporárias seguem a própria classe. Eles não produzem estoque permanente nem removem custos deste capítulo.',
  'Cada personagem completa no máximo um bloco de 6 horas de crafting por dia, mesmo que trabalhe em projetos diferentes. Ao fim do bloco, ganha 1 Cansaço.',
];

export const REGRAS_ALQUIMIA = [
  'Cada preparo produz a quantidade de doses indicada na receita. Sem quantidade expressa, produz uma dose.',
  'Dose expirada ou usada não pode ser recuperada por reparo ou desmontagem.',
  'Uma fórmula de Alquimista preparada após descanso é temporária e não conta como item fabricado.',
  'Substância com efeito não publicado exige aprovação antes da fabricação.',
];

export const REGRAS_TECNOLOGIA_E_CIBERNETICOS = [
  'Tecnologia substitui Ofício apenas para item A.X.I.S, sistema eletrônico ou maquinário avançado.',
  'Programação altera funções previstas pelo projeto; não cria magia, poder de classe ou bônus sem suporte do item.',
  'Implante exige fabricação e instalação. A instalação dura 6 horas em sala-de-implante e exige testes simultâneos de Tecnologia e Cura contra a DT da raridade.',
  'Se qualquer teste de instalação falhar, o implante não concede efeito. O paciente sofre 1d6 de dano físico, e outra tentativa exige um dia e 10% do custo inicial em materiais.',
];

export function obterRegraCraftingPorRaridade(raridade: RaridadeCraftingId): RegraRaridadeCrafting {
  const regra = TABELA_CRAFTING_RARIDADE.find((item) => item.id === raridade);
  if (!regra) throw new RangeError(`Raridade de crafting inválida: ${raridade}`);
  return regra;
}

export function calcularCustoMateriais(precoReferencia: number, raridade: RaridadeCraftingId): number {
  if (!Number.isFinite(precoReferencia) || precoReferencia <= 0) {
    throw new RangeError('O preço de referência deve ser um número positivo.');
  }
  const regra = obterRegraCraftingPorRaridade(raridade);
  const percentual = regra.custoMateriaisPercentual;
  if (!regra.fabricacaoComumPermitida || percentual === null) {
    throw new RangeError('Esta raridade não possui custo comum de fabricação.');
  }
  return Math.ceil(precoReferencia * percentual / 100);
}

export function calcularDtReparo(raridade: RaridadeCraftingId): number | null {
  const regra = obterRegraCraftingPorRaridade(raridade);
  const dtFabricacao = regra.dt;
  if (!regra.fabricacaoComumPermitida || dtFabricacao === null) return null;
  return Math.max(REGRAS_REPARO.dtMinima, dtFabricacao - REGRAS_REPARO.reducaoDtDaRaridade);
}

const linhasRaridade = TABELA_CRAFTING_RARIDADE.map((regra) => `
  <tr>
    <td><strong>${regra.titulo}</strong></td>
    <td>${regra.dt ?? 'Projeto de campanha'}</td>
    <td>${regra.diasTrabalho === null ? 'Projeto de campanha' : `${regra.diasTrabalho} dia${regra.diasTrabalho === 1 ? '' : 's'}`}</td>
    <td>${regra.custoMateriaisPercentual === null ? 'Definido no projeto' : `${regra.custoMateriaisPercentual}%`}</td>
    <td>${regra.requisitoAdicional}</td>
  </tr>
`).join('');

const linhasCategorias = MODELOS_PROJETO_CRAFTING.map((modelo) => `
  <tr>
    <td><strong>${modelo.titulo}</strong></td>
    <td>${modelo.pericia}${modelo.especialidade ? ` (${modelo.especialidade})` : ''}</td>
    <td>${FERRAMENTAS_CRAFTING.find((ferramenta) => ferramenta.id === modelo.ferramentaId)?.titulo ?? modelo.ferramentaId}</td>
    <td>${modelo.escopo} ${modelo.regraEspecifica}</td>
  </tr>
`).join('');

const itens = (regras: string[]) => regras.map((regra) => `<li>${regra}</li>`).join('');

export const REGRA_CRAFTING: RegraTopicoCrafting = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'Regras para fabricar, programar e reparar itens com materiais, ferramentas e tempo de trabalho.',
  destaques: [
    ['Dia de trabalho', '6 horas'],
    ['Teste', 'Ao fim do projeto'],
    ['Perícias', 'Ofício ou Tecnologia'],
  ],
  corpo: `
    <p class="regras-lead">A fabricação segue uma receita ou um projeto e exige materiais, ferramenta, tempo e um teste final.</p>

    <h3 class="regras-subtitle">Procedimento</h3>
    <ol class="regras-list">
      <li>Escolha uma receita ou registre um projeto.</li>
      <li>Defina preço de referência, raridade, quantidade, materiais, ferramenta e perícia.</li>
      <li>Pague o custo de materiais. Componentes específicos são consumidos quando o trabalho começa.</li>
      <li>Complete os dias de trabalho. Cada dia possui <strong>${HORAS_POR_DIA_DE_TRABALHO} horas</strong>.</li>
      <li>As mesmas horas não contam como descanso, relaxamento ou treinamento. Cada personagem completa um bloco por dia e ganha 1 Cansaço ao final.</li>
      <li>Faça um teste da perícia indicada contra a DT da raridade.</li>
    </ol>
    <p class="regras-note">Trabalho interrompido mantém o progresso e os materiais já investidos. Trocar o responsável pelo teste exige acesso ao projeto, às ferramentas e ao trabalho realizado.</p>

    <h3 class="regras-subtitle">Receitas e projetos</h3>
    <ul class="regras-list">${itens(REGRAS_RECEITA_E_PROJETO)}</ul>

    <h3 class="regras-subtitle">Raridade, DT, tempo e materiais</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Raridade</th><th>DT</th><th>Trabalho</th><th>Materiais</th><th>Requisito</th></tr></thead>
      <tbody>${linhasRaridade}</tbody>
    </table></div>
    <p>O custo de materiais é uma porcentagem do preço normal do item, arredondada para cima. Promoções não reduzem esse custo.</p>

    <h3 class="regras-subtitle">Perícias e ferramentas</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Categoria</th><th>Perícia</th><th>Ferramenta</th><th>Aplicação</th></tr></thead>
      <tbody>${linhasCategorias}</tbody>
    </table></div>
    <p>Sem a ferramenta exigida, o trabalho não começa. Ofício é uma perícia personalizada; a especialidade deve corresponder à tarefa. Tecnologia cobre sistemas A.X.I.S e maquinário avançado.</p>

    <h3 class="regras-subtitle">Resultado do teste</h3>
    <dl class="regras-kv regras-kv--boxed">
      ${RESULTADOS_CRAFTING.map((resultado) => `<dt>${resultado.titulo}</dt><dd>${resultado.efeito}</dd>`).join('')}
    </dl>
    <p>Materiais adicionais são calculados sobre o custo inicial do projeto. Cada nova tentativa ocorre após o tempo adicional e o pagamento indicado.</p>

    <h3 class="regras-subtitle">Reparos</h3>
    <ul class="regras-list">
      <li>O reparo usa a mesma perícia e ferramenta da fabricação.</li>
      <li>A DT é a DT da raridade menos ${REGRAS_REPARO.reducaoDtDaRaridade}, no mínimo ${REGRAS_REPARO.dtMinima}.</li>
      <li>O custo é ${REGRAS_REPARO.custoPercentual}% do preço normal do item, arredondado para cima.</li>
      <li>Itens comuns e incomuns exigem ${REGRAS_REPARO.horasComumOuIncomum} horas. Itens raros e épicos exigem ${REGRAS_REPARO.horasRaroOuEpico} horas.</li>
      <li>${REGRAS_REPARO.regra}</li>
      <li>Item lendário, Mítico ou Relíquia da Criação não usa reparo comum. Um projeto especial precisa registrar custo, tempo, ferramenta e DT antes do primeiro gasto.</li>
    </ul>

    <h3 class="regras-subtitle">Alquimia</h3>
    <ul class="regras-list">${itens(REGRAS_ALQUIMIA)}</ul>

    <h3 class="regras-subtitle">Tecnologia e cibernéticos</h3>
    <ul class="regras-list">${itens(REGRAS_TECNOLOGIA_E_CIBERNETICOS)}</ul>

    <h3 class="regras-subtitle">Materiais, Drops e comércio</h3>
    <ul class="regras-list">${itens(SALVAGUARDAS_ECONOMIA_CRAFTING)}</ul>

    <p class="regras-note"><strong>Classes:</strong> Alquimista e Engenheiro usam as habilidades descritas nas próprias progressões. Nenhuma classe é obrigatória para fabricar itens comuns, desde que o personagem cumpra os requisitos da receita.</p>
  `,
  corpoMestre: `
    <p class="regras-lead">Fabricar compete com aventurar: são dias de trabalho que o grupo não passa em campo. A regra se sustenta sozinha desde que você entregue tempo de intervalo e materiais.</p>

    <h3 class="regras-subtitle">A escada de custo</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Raridade</th><th>DT</th><th>Trabalho</th><th>Materiais</th></tr></thead>
      <tbody>
        <tr><td><strong>Comum</strong></td><td>10</td><td>1 dia</td><td>50%</td></tr>
        <tr><td><strong>Incomum</strong></td><td>15</td><td>3 dias</td><td>60%</td></tr>
        <tr><td><strong>Raro</strong></td><td>20</td><td>7 dias</td><td>70%</td></tr>
        <tr><td><strong>Épico</strong></td><td>25</td><td>14 dias</td><td>80%</td></tr>
        <tr><td><strong>Lendário</strong></td><td>30</td><td>30 dias</td><td>90%</td></tr>
        <tr><td><strong>Mítico e Relíquia</strong></td><td colspan="3">Projeto de campanha. Não se fabrica pelas regras normais.</td></tr>
      </tbody>
    </table></div>
    <p class="regras-note">Repare que fabricar Lendário custa 30 dias e 90% do preço. Isso não economiza dinheiro: economiza a sorte de encontrar. É por isso que crafting não desequilibra a campanha por si só.</p>

    <h3 class="regras-subtitle">Conduzir um projeto</h3>
    <ul class="regras-list">
      <li>O teste é no fim, com a DT anunciada antes do primeiro gasto. Nunca mude a DT depois de o grupo comprar material: isso é o mesmo que mudar DT depois do dado.</li>
      <li>Materiais raros são o seu ponto de controle real, não a DT. Um Épico pede pelo menos um material raro ligado ao efeito, e de onde ele vem é aventura.</li>
      <li>Mítico e Relíquia viram projeto de campanha por regra. Aproveite: um item desses construído ao longo de um arco vale mais que qualquer tesouro entregue.</li>
      <li>Cibernético exige Sala de Implante e respeita compatibilidade e pré-requisito. Fabricar não é atalho para instalar o que o corpo não comporta.</li>
    </ul>
  `,
};
