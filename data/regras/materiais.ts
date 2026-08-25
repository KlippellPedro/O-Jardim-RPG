import { TABELA_CRAFTING_RARIDADE, type RaridadeCraftingId } from './crafting';
import {
  RECEITAS_MATERIAIS_COZINHEIRO,
  FORMULAS_MATERIAIS_ALQUIMISTA,
  PROJETOS_MATERIAIS_ENGENHEIRO,
} from './receitas-materiais';
import { RITUAIS } from './rituais';
import type { RegraTopicoDe } from './tipos';
import type { RecursoMaterialId } from './recursos-materiais';

/**
 * Infraestrutura de materiais, ingredientes e componentes.
 *
 * Os seis estoques usam a mesma ficha técnica, mas os quatro catálogos de
 * classe são separados: Componentes Químicos para Alquimista, Componentes
 * Ritualísticos para Ritualista, Sucata para Engenheiro e Mantimentos para
 * Chef. Componentes Veiculares cuidam da manutenção de veículos.
 * Matéria-prima pode reaproveitar itens adequados desses catálogos e também
 * possui materiais exclusivos para criações permanentes.
 */

export type Elemento = 'Terra' | 'Água' | 'Fogo' | 'Ar' | 'Raio' | 'Luz' | 'Escuridão';

export const ELEMENTOS_OFICIAIS: Elemento[] = ['Terra', 'Água', 'Fogo', 'Ar', 'Raio', 'Luz', 'Escuridão'];

/** Afinidade de um material: um dos sete elementos oficiais, "Nenhuma" (padrão
 * para a maioria dos materiais comuns) ou "Escolha na compra" para materiais
 * como a Amostra Elemental, que já vende assim hoje. Nunca um oitavo elemento. */
export type AfinidadeMaterial = Elemento | 'Nenhuma' | 'Escolha na compra';

export type CategoriaMaterial = 'Biológico' | 'Botânico' | 'Mineral' | 'Espiritual' | 'Arcano' | 'Artificial';

export const CATEGORIAS_MATERIAL: CategoriaMaterial[] = [
  'Biológico',
  'Botânico',
  'Mineral',
  'Espiritual',
  'Arcano',
  'Artificial',
];

export type EstadoMaterial = 'bruto' | 'processado' | 'refinado';

const ORDEM_ESTADO_MATERIAL: Record<EstadoMaterial, number> = {
  bruto: 0,
  processado: 1,
  refinado: 2,
};

/** Estado não é intensidade: só decide se o material está preparado o
 * suficiente para entrar numa linha de requisito com `estadoMinimo`. Uma
 * transformação (Extrair, Purificar, Refinar...) que também altere a
 * Potência de um material é sempre uma regra especial e nomeada, nunca
 * consequência automática de mudar de estado. */
export function estadoAtendeMinimo(estado: EstadoMaterial, minimo: EstadoMaterial): boolean {
  return ORDEM_ESTADO_MATERIAL[estado] >= ORDEM_ESTADO_MATERIAL[minimo];
}

/** Lista fechada de propriedades. Novas propriedades podem ser adicionadas
 * no futuro, mas sempre entrando conscientemente aqui - nunca como string
 * solta numa entrada de material isolada. Propriedades nunca duplicam um
 * sistema mecânico que já existe: veneno/doença apontam para Aflições
 * (`aflicoes.ts`), dano/resistência elemental usam Afinidade, e recuperação
 * de Vida usa as regras de Cura já publicadas. */
export const PROPRIEDADES_MATERIAL = {
  Físicas: ['Resistente', 'Flexível', 'Afiado', 'Condutor', 'Isolante', 'Absorvente'],
  Químicas: ['Inflamável', 'Explosivo', 'Corrosivo', 'Volátil', 'Estável', 'Conservante'],
  Biológicas: ['Nutritivo', 'Regenerativo', 'Medicinal', 'Estimulante', 'Fortificante'],
  Mágicas: ['Arcano', 'Canalizador', 'Amplificador', 'Purificador', 'Corruptor'],
  Espirituais: ['Espiritual', 'Anímico', 'Vital', 'Necrótico', 'Vinculante'],
} as const;

export type GrupoPropriedade = keyof typeof PROPRIEDADES_MATERIAL;
export type Propriedade = (typeof PROPRIEDADES_MATERIAL)[GrupoPropriedade][number];

export const TODAS_PROPRIEDADES: Propriedade[] = Object.values(PROPRIEDADES_MATERIAL).flat();

export type UsoMaterial = 'ritual' | 'alquimia' | 'engenharia' | 'cozinha' | 'veiculos' | 'forja';

/** Diretriz de curadoria (não trava de código): quantas propriedades um
 * material novo deveria receber, por perfil. Exceções acima de 3 exigem
 * justificativa forte registrada na própria `descricao`. */
export const TETO_PROPRIEDADES_POR_PERFIL: Array<{ perfil: string; teto: number; nota: string }> = [
  { perfil: 'Simples', teto: 1, nota: 'Raridade comum/incomum - a maioria dos drops de criatura mundana.' },
  { perfil: 'Complexo', teto: 2, nota: 'Raridade rara, ou biológico/espiritual de criatura incomum.' },
  { perfil: 'Raro/especial', teto: 3, nota: 'Raridade épica ou componente central a um rito nomeado.' },
];

/** Ficha fixa de um material - descreve o TIPO, nunca a unidade específica
 * obtida. Qualidade (seção correspondente em corpoMestre) fica de fora de
 * propósito: ela é dado variável da pilha coletada, não do material. */
export interface MaterialFicha {
  categoria: CategoriaMaterial;
  /** Só para materiais de criatura: "Carne" | "Órgãos" | "Essência" | ... */
  parte?: string;
  origem: string;
  raridade: RaridadeCraftingId;
  potencia: 1 | 2 | 3 | 4 | 5;
  afinidade: AfinidadeMaterial;
  propriedades: Propriedade[];
  usos: UsoMaterial[];
  estadoBase: EstadoMaterial;
  /** Agrupa variantes de estado do mesmo material (ex.: sangue-de-dragao
   * bruto e refinado como duas entradas de catálogo com o mesmo id-base). */
  materialBaseId?: string;
  descricao: string;
}

// --- Qualidade da unidade obtida -------------------------------------------

export type QualidadeMaterial = 'corrompida' | 'danificada' | 'conservada' | 'padrao' | 'abate-limpo' | 'lendaria';

export interface RegraQualidadeMaterial {
  id: QualidadeMaterial;
  titulo: string;
  /** Multiplicador sobre o preço-base do material. */
  modificadorPreco: number;
  /** Corrompida/danificada não cumprem linhas com `estadoMinimo` nem `materialId`. */
  bloqueiaRequisitoPuro: boolean;
}

export const TABELA_QUALIDADE_MATERIAL: RegraQualidadeMaterial[] = [
  { id: 'corrompida', titulo: 'Corrompida', modificadorPreco: 0, bloqueiaRequisitoPuro: true },
  { id: 'danificada', titulo: 'Danificada', modificadorPreco: 0.5, bloqueiaRequisitoPuro: true },
  { id: 'conservada', titulo: 'Conservada', modificadorPreco: 0.8, bloqueiaRequisitoPuro: false },
  { id: 'padrao', titulo: 'Padrão', modificadorPreco: 1, bloqueiaRequisitoPuro: false },
  { id: 'abate-limpo', titulo: 'Abate Limpo', modificadorPreco: 1.2, bloqueiaRequisitoPuro: false },
  { id: 'lendaria', titulo: 'Origem Lendária', modificadorPreco: 2.5, bloqueiaRequisitoPuro: false },
];

export const QUALIDADE_PADRAO: QualidadeMaterial = 'padrao';

export function obterRegraQualidade(qualidade: QualidadeMaterial): RegraQualidadeMaterial {
  const regra = TABELA_QUALIDADE_MATERIAL.find((item) => item.id === qualidade);
  if (!regra) throw new RangeError(`Qualidade de material inválida: ${qualidade}`);
  return regra;
}

const SUFIXO_QUALIDADE = '@qualidade:';

/** Qualidade não é campo do material - é identidade da pilha de inventário.
 * Como `item_id` já é validado como único por personagem em
 * `plataforma/schemas.py`, uma pilha de qualidade não-padrão ganha um
 * `item_id` sufixado (`drop-x@qualidade:abate-limpo`) em vez de tentar
 * guardar qualidade como atributo solto de uma linha já travada por id
 * único. Compra normal de Loja nunca gera sufixo - só grants explícitos de
 * qualidade diferente de "padrao" (tipicamente o Mestre concedendo um drop
 * coletado em jogo). */
export function idComQualidade(itemId: string, qualidade: QualidadeMaterial): string {
  return qualidade === QUALIDADE_PADRAO ? itemId : `${itemId}${SUFIXO_QUALIDADE}${qualidade}`;
}

export function resolverMaterialBase(itemIdInventario: string): { baseId: string; qualidade: QualidadeMaterial } {
  const indice = itemIdInventario.indexOf(SUFIXO_QUALIDADE);
  if (indice === -1) return { baseId: itemIdInventario, qualidade: QUALIDADE_PADRAO };
  return {
    baseId: itemIdInventario.slice(0, indice),
    qualidade: itemIdInventario.slice(indice + SUFIXO_QUALIDADE.length) as QualidadeMaterial,
  };
}

// --- Requisitos de receita ---------------------------------------------------

const ORDEM_RARIDADE_CRAFTING: RaridadeCraftingId[] = TABELA_CRAFTING_RARIDADE.map((regra) => regra.id);

function raridadeAtendeMinima(raridade: RaridadeCraftingId, minima: RaridadeCraftingId): boolean {
  return ORDEM_RARIDADE_CRAFTING.indexOf(raridade) >= ORDEM_RARIDADE_CRAFTING.indexOf(minima);
}

export const MAX_UNIDADES_PADRAO_POR_LINHA = 3;

/** Uma linha de requisito pode combinar várias dimensões ao mesmo tempo
 * (material nomeado, categoria, propriedade+potência, afinidade, estado
 * mínimo, raridade mínima). `quantidade` é sempre um PISO - o mínimo de
 * unidades que a linha precisa consumir - nunca um teto; quem limita por
 * cima é `maxUnidades`. */
export interface LinhaRequisito {
  id: string;
  quantidade: number;
  materialId?: string;
  materiaisAlternativos?: string[];
  categoria?: CategoriaMaterial;
  propriedade?: { nome: Propriedade; valorMinimo: number };
  afinidade?: Elemento;
  estadoMinimo?: EstadoMaterial;
  raridadeMinima?: RaridadeCraftingId;
  maxUnidades?: number;
}

export type ClasseConsumidora = 'ritualista' | 'alquimista' | 'engenheiro' | 'cozinheiro' | 'geral';

export interface ReceitaMaterial {
  id: string;
  titulo: string;
  classe: ClasseConsumidora;
  /** Usa a mesma tabela de crafting.ts - decide DT, tempo e % de custo, e
   * também se material nomeado é opcional (comum/incomum) ou obrigatório
   * (raro+), conforme REGRA_MATERIAIS.corpo, seção "Receitas". */
  raridade: RaridadeCraftingId;
  linhas: LinhaRequisito[];
  efeito: string;
  /** Preparos temporários de classe usam suprimentos narrativos da bancada,
   * oficina ou cozinha. A linha fica como referência temática e nunca cobra
   * baixa de inventário do jogador. */
  modoPreparo?: 'ingredientes' | 'estoque-da-classe';
  /** Custo simplificado publicado para jogadores. Linhas antigas ficam
   * disponíveis somente para compatibilidade e curadoria do catálogo. */
  custoRecurso?: {
    recurso: RecursoMaterialId;
    quantidade: number;
    escopo: 'por-descanso' | 'por-ritual' | 'por-fabricacao';
    progressaoRaridade?: 'nivel-formula-alquimista' | 'nivel-projeto-engenheiro' | 'nivel-receita-cozinheiro';
  };
}

/** Um material comprometido numa receita: a unidade física (com sua
 * qualidade) mais a ficha do material que ela representa. */
export interface MaterialComprometido {
  materialId: string;
  material: MaterialFicha;
  qualidade: QualidadeMaterial;
}

/** Verifica uma única linha contra o conjunto de materiais comprometidos
 * com ela. Não decide dupla contagem entre linhas - isso é
 * `receitaSatisfeita`, porque depende da receita inteira. */
export function linhaRequisitoSatisfeita(linha: LinhaRequisito, comprometidos: MaterialComprometido[]): boolean {
  const teto = linha.maxUnidades ?? MAX_UNIDADES_PADRAO_POR_LINHA;
  if (comprometidos.length > teto) return false;
  if (comprometidos.length < linha.quantidade) return false;

  for (const item of comprometidos) {
    const regraQualidade = obterRegraQualidade(item.qualidade);
    const exigeMaterialPuro = Boolean(linha.materialId) || Boolean(linha.estadoMinimo) || Boolean(linha.raridadeMinima);
    if (regraQualidade.bloqueiaRequisitoPuro && exigeMaterialPuro) return false;
    if (linha.categoria && item.material.categoria !== linha.categoria) return false;
    if (linha.afinidade && item.material.afinidade !== linha.afinidade) return false;
    if (linha.estadoMinimo && !estadoAtendeMinimo(item.material.estadoBase, linha.estadoMinimo)) return false;
    if (linha.raridadeMinima && !raridadeAtendeMinima(item.material.raridade, linha.raridadeMinima)) return false;
  }

  if (linha.materialId) {
    const idsAceitos = [linha.materialId, ...(linha.materiaisAlternativos ?? [])];
    const validos = comprometidos.filter((item) => idsAceitos.includes(item.materialId));
    return validos.length >= linha.quantidade;
  }

  if (linha.propriedade) {
    const relevantes = comprometidos.filter((item) => item.material.propriedades.includes(linha.propriedade!.nome));
    const soma = relevantes.reduce((total, item) => total + item.material.potencia, 0);
    return soma >= linha.propriedade.valorMinimo;
  }

  return comprometidos.length >= linha.quantidade;
}

/** Verifica a receita inteira, aplicando a regra de "sem dupla contagem":
 * cada unidade física (materialId + qualidade, como proxy de identidade)
 * serve no máximo uma linha. `atribuicoes` é responsabilidade de quem
 * monta a jogada (UI ou Mestre) - esta função só valida o resultado. */
export function receitaSatisfeita(
  receita: ReceitaMaterial,
  atribuicoes: Record<string, MaterialComprometido[]>,
): boolean {
  const usados = new Set<string>();
  for (const linha of receita.linhas) {
    const comprometidos = atribuicoes[linha.id] ?? [];
    for (const item of comprometidos) {
      const chave = `${item.materialId}:${item.qualidade}`;
      if (usados.has(chave)) return false;
    }
    if (!linhaRequisitoSatisfeita(linha, comprometidos)) return false;
    comprometidos.forEach((item) => usados.add(`${item.materialId}:${item.qualidade}`));
  }
  return true;
}

// --- Conteúdo da página de regras -------------------------------------------

const linhasPropriedades = Object.entries(PROPRIEDADES_MATERIAL)
  .map(([grupo, lista]) => `<tr><td><strong>${grupo}</strong></td><td>${lista.join(', ')}</td></tr>`)
  .join('');

const linhasQualidade = TABELA_QUALIDADE_MATERIAL.map(
  (regra) => `<tr><td><strong>${regra.titulo}</strong></td><td>${Math.round(regra.modificadorPreco * 100)}% do preço-base</td><td>${regra.bloqueiaRequisitoPuro ? 'Não cumpre material específico nem estado mínimo.' : 'Cumpre qualquer requisito normalmente.'}</td></tr>`,
).join('');

const TITULOS_MATERIAIS_PILOTO: Record<string, string> = {
  'drop-vampiro-orgaos': 'Órgãos de Vampiro',
  'drop-vampiro-essência': 'Essência de Vampiro',
  'comp-terra-fertil': 'Terra Fértil',
  'comp-sementes-viaveis': 'Sementes Viáveis',
  'comp-agua-pura': 'Água Pura',
  'comp-marco-de-pedra': 'Marco de Pedra Ritual',
  'comp-receptor-inscrito': 'Receptor Inscrito',
  'comp-amostra-biologica': 'Amostra Biológica',
  'comp-ervas-comuns': 'Ervas Comuns',
  'comp-amostra-elemental': 'Amostra Elemental',
};

function resumirLinhaRequisito(linha: LinhaRequisito): string {
  const partes: string[] = [];
  if (linha.materialId) partes.push(TITULOS_MATERIAIS_PILOTO[linha.materialId] ?? linha.materialId);
  if (linha.categoria) partes.push(`Categoria ${linha.categoria}`);
  if (linha.propriedade) partes.push(`${linha.propriedade.nome} ${linha.propriedade.valorMinimo}`);
  if (linha.afinidade) partes.push(`Afinidade ${linha.afinidade}`);
  if (linha.estadoMinimo) partes.push(`estado mínimo ${linha.estadoMinimo}`);
  if (linha.raridadeMinima) partes.push(`raridade mínima ${linha.raridadeMinima}`);
  return `${linha.quantidade}× ${partes.join(' + ')}`;
}

function linhasTabelaReceitas(receitas: ReceitaMaterial[]): string {
  return receitas.map((receita) => `
    <tr>
      <td><strong>${receita.titulo}</strong></td>
      <td>${receita.raridade}</td>
      <td>${receita.linhas.map(resumirLinhaRequisito).join('<br>')}</td>
    </tr>`).join('');
}

const itens = (linhas: string[]) => linhas.map((linha) => `<li>${linha}</li>`).join('');

// Mantida somente como base estrutural para compatibilidade. O conteúdo
// publicado ao jogador é substituído integralmente em REGRA_MATERIAIS.
const REGRA_MATERIAIS_LEGADA: RegraTopicoDe<'Livro do Jogador'> = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'Categorias, propriedades, afinidades e potência que descrevem qualquer material de fabricação - a infraestrutura que Ritualista, Alquimista, Engenheiro e Chef compartilham.',
  destaques: [
    ['Afinidades', '7 elementos oficiais, ou Nenhuma'],
    ['Potência', '1 a 5, soma por linha de receita'],
    ['Estado', 'Bruto, Processado, Refinado'],
  ],
  corpo: `
    <p class="regras-lead">Todo material de fabricação - drop de criatura, componente ritualístico, minério, erva - descreve-se pelos mesmos campos, e as classes de criação Ritualista, Alquimista, Engenheiro e Chef leem esses campos de formas diferentes. Este capítulo é infraestrutura: não substitui as regras próprias de cada classe, só estabelece o vocabulário comum entre elas.</p>

    <h3 class="regras-subtitle">Categoria, Parte, Afinidade e Propriedade nunca se misturam</h3>
    <p>Um material tem uma <strong>Categoria</strong> (o que ele fisicamente é), pode ter uma <strong>Parte</strong> (só para material de criatura: Carne, Órgãos, Essência...), uma <strong>Afinidade</strong> elemental e uma ou mais <strong>Propriedades</strong>. São eixos independentes: Órgãos de Vampiro é Categoria Biológico, Parte Órgãos, Afinidade Nenhuma, Propriedade Regenerativo - os quatro campos descrevem coisas diferentes do mesmo item.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Categoria</th><th>O que cobre</th></tr></thead>
      <tbody>
        <tr><td><strong>Biológico</strong></td><td>Partes de seres vivos ou que já foram vivos: carne, sangue, osso, órgão, glândula.</td></tr>
        <tr><td><strong>Botânico</strong></td><td>Recursos vegetais: erva, flor, raiz, semente, seiva, resina.</td></tr>
        <tr><td><strong>Mineral</strong></td><td>Pedra, minério, metal, cristal, sal - o ambiente inanimado.</td></tr>
        <tr><td><strong>Espiritual</strong></td><td>Alma, essência, ectoplasma, memória, energia condensada.</td></tr>
        <tr><td><strong>Arcano</strong></td><td>Substâncias originadas diretamente de magia: mana cristalizada, núcleo arcano, catalisador.</td></tr>
        <tr><td><strong>Artificial</strong></td><td>Materiais já processados por mãos ou máquinas: liga, tecido, peça mecânica.</td></tr>
      </tbody>
    </table></div>

    <h3 class="regras-subtitle">Afinidade - só quando é de verdade elemental</h3>
    <p>Afinidade usa exatamente os sete elementos oficiais do Jardim - Terra, Água, Fogo, Ar, Raio, Luz, Escuridão - mais <strong>Nenhuma</strong>, o valor padrão para a maioria dos materiais comuns. Um material só recebe afinidade elemental quando ao menos uma destas condições é verdadeira: a origem dele é uma criatura, planta ou fenômeno já explicitamente elemental na ficção; o material já é usado, em sua própria função de jogo, como canal ou catalisador daquele elemento; ou um rito/fórmula/projeto existente já trata o material como fonte específica do elemento. Um minério de ferro não ganha Terra só por ter saído do chão.</p>

    <h3 class="regras-subtitle">Propriedades</h3>
    <p>A lista de propriedades é fechada - não se inventa uma nova a cada material. Propriedades nunca duplicam um sistema que já existe: veneno e doença apontam para o capítulo de Aflições, dano e resistência elemental usam Afinidade, recuperação de Vida usa Cura. Uma propriedade descreve o material; o efeito mecânico final sempre aponta para a regra correspondente já publicada.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Grupo</th><th>Propriedades</th></tr></thead>
      <tbody>${linhasPropriedades}</tbody>
    </table></div>
    <p class="regras-note">Diretriz de quantidade: materiais simples costumam ter 1 propriedade, materiais complexos 2, e materiais raros ou centrais a um rito nomeado até 3. Passar de 3 exige justificativa forte na própria descrição do material.</p>

    <h3 class="regras-subtitle">Potência</h3>
    <p>Potência (1 a 5) mede a intensidade das propriedades de um material - nunca é cópia da raridade, que continua decidindo o quão específica a receita precisa ser. Uma receita que exige uma propriedade a um certo valor soma a Potência de cada material comprometido que a possua, até no máximo <strong>3 unidades por linha</strong>. Nenhum material serve duas linhas de requisito ao mesmo tempo na mesma receita.</p>
    <p>Exemplo: uma receita pede Inflamável 5. Um material Inflamável Potência 3 mais outro Inflamável Potência 2 somam 5 e cumprem o requisito juntos; três unidades de um material Potência 1 somam só 3 e não bastam - para requisitos altos, é preciso ao menos um material mais potente, não só mais quantidade.</p>

    <h3 class="regras-subtitle">Estado: Bruto, Processado, Refinado</h3>
    <p>Estado nunca aumenta Potência automaticamente - ele controla acesso, não intensidade. Bruto é como o material foi coletado; Processado passou por preparo básico; Refinado está purificado, estabilizado e isolado, preparado para receitas avançadas, sem ficar "mais forte" no processo. Avançar de estado é uma transformação - uma receita menor dentro do próprio capítulo de Criação, Forja e Alquimia - que consome unidades do estado anterior e produz o estado seguinte, mantendo a mesma Potência e as mesmas Propriedades, salvo exceção especial e documentada.</p>

    <h3 class="regras-subtitle">Qualidade não é do material, é da pilha</h3>
    <p>Qualidade descreve a unidade que você efetivamente obteve - não o tipo de material. Duas unidades de Carne de Lobo podem ter qualidades diferentes dependendo de como foram coletadas, conservadas ou se sofreram corrupção. A tabela abaixo é a mesma régua que hoje já aparece em prosa na descrição de cada drop de criatura.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Qualidade</th><th>Preço</th><th>Efeito em requisitos</th></tr></thead>
      <tbody>${linhasQualidade}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Receitas: material específico é sobre obrigação, não permissão</h3>
    <ul class="regras-list">${itens([
      'Comum e Incomum: material específico é opcional - a receita pode ter uma linha nomeada por escolha de design, mas não é obrigada.',
      'Raro: ao menos uma linha exige material específico nomeado, conforme a regra já publicada de fabricação.',
      'Épico: linhas nomeadas e/ou materiais de raridade mínima ligada ao efeito.',
      'Lendário e superior: fortemente específico, normalmente sem substituição - decidido caso a caso pelo Mestre.',
    ])}</ul>

    <h3 class="regras-subtitle">Como cada classe usa</h3>
    <ul class="regras-list">${itens([
      '<strong>Ritualista:</strong> lê propriedade como vínculo e intenção - Canalizador e Amplificador reduzem custo ou tempo de um ritual; Purificador e Corruptor decidem o desfecho; afinidade elemental é obrigatória em ritos de elemento nomeado.',
      '<strong>Alquimista:</strong> lê propriedade como o próprio produto - extrai, combina e transmuta propriedades diretamente em poções, bombas, ácidos e tônicos.',
      '<strong>Engenheiro:</strong> lê propriedade como componente físico ou funcional - Condutor vira energia de um dispositivo, Resistente vira integridade estrutural, Explosivo vira munição.',
      '<strong>Chef:</strong> lê propriedade como efeito de consumo - bebidas agem rápido, lanches acompanham a marcha e refeições alteram descanso ou concedem efeitos duradouros.',
    ])}</ul>
    <p class="regras-note">A mesma propriedade produz quatro resultados diferentes - nunca a mesma receita reaproveitada com nome trocado.</p>

    <h3 class="regras-subtitle">Piloto de receitas e preparação de classe</h3>
    <p>O catálogo liga materiais estruturados a <strong>${RITUAIS.length} rituais com ingredientes</strong>, ${FORMULAS_MATERIAIS_ALQUIMISTA.length} fórmulas de Alquimista, ${PROJETOS_MATERIAIS_ENGENHEIRO.length} projetos de Engenheiro e ${RECEITAS_MATERIAIS_COZINHEIRO.length} receitas do Chef. Grande Obra, Engenhocas e Mise en Place usam os estoques simplificados das classes; os ingredientes nomeados ficam como referência narrativa.</p>
    <p>A Fase 5 acrescenta quinze materiais-base ao catálogo: cinco Minerais, cinco Artificiais e cinco Botânicos. Eles cobrem propriedades comuns de forja, engenharia, alquimia e cozinha sem criar afinidades elementais por associação temática.</p>
    <p class="regras-note">Porções preparadas pela classe expiram conforme Mise en Place e não podem ser vendidas como produtos permanentes. Fabricação para estoque ou comércio continua seguindo integralmente o capítulo de Criação, Forja e Alquimia.</p>
  `,
  corpoMestre: `
    <p class="regras-lead">O catálogo atual reúne todos os materiais publicados, ${FORMULAS_MATERIAIS_ALQUIMISTA.length} fórmulas de Alquimista e ${RECEITAS_MATERIAIS_COZINHEIRO.length} receitas do Chef. DT, tempo, Mana, ativação e efeito continuam nas fontes canônicas de ritual e classe; as tabelas abaixo cuidam somente dos requisitos materiais.</p>

    <h3 class="regras-subtitle">Rituais formalizados</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Ritual</th><th>Raridade</th><th>Linhas de material</th></tr></thead>
      <tbody>${linhasTabelaReceitas(RITUAIS)}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Fórmulas do Alquimista</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Fórmula</th><th>Raridade</th><th>Linhas de material</th></tr></thead>
      <tbody>${linhasTabelaReceitas(FORMULAS_MATERIAIS_ALQUIMISTA)}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Projetos do Engenheiro</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Projeto</th><th>Raridade</th><th>Linhas de material</th></tr></thead>
      <tbody>${linhasTabelaReceitas(PROJETOS_MATERIAIS_ENGENHEIRO)}</tbody>
    </table></div>

    <h3 class="regras-subtitle">Receitas do Chef</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Conceito</th><th>Raridade</th><th>Linhas de material</th></tr></thead>
      <tbody>${linhasTabelaReceitas(RECEITAS_MATERIAIS_COZINHEIRO)}</tbody>
    </table></div>
    <p class="regras-note">Mise en Place gasta um único lote de Mantimentos da raridade do nível atual das receitas e produz porções temporárias. As linhas acima descrevem combinações possíveis, mas não criam uma segunda baixa de inventário.</p>

    <h3 class="regras-subtitle">Limite conhecido da Amostra Elemental</h3>
    <p><code>comp-amostra-elemental</code> ainda guarda <code>Escolha na compra</code> na ficha do catálogo, mas o inventário não persiste qual dos sete elementos foi escolhido em cada pilha. Nesta fase, Bobina de Choque exige uma amostra escolhida como Raio e Holofote de Campo exige Luz, com conferência do Mestre. Não trate <code>Escolha na compra</code> como se satisfizesse automaticamente qualquer afinidade. Antes de automatizar o consumo na Fase 4, a escolha precisa ganhar uma identidade persistente sem fundir Afinidade com Qualidade.</p>

    <h3 class="regras-subtitle">Curando um material novo</h3>
    <ul class="regras-list">
      <li>Escolha Categoria e, se for de criatura, Parte - nunca misture os dois papéis num campo só.</li>
      <li>Só marque Afinidade diferente de "Nenhuma" se o material tiver ligação elemental real - não por associação temática.</li>
      <li>Respeite o teto de propriedades por perfil (1 simples, 2 complexo, até 3 raro/especial). Passar disso é exceção, não regra.</li>
      <li>Potência mede intensidade da propriedade, não raridade nem preço. Calibre pensando em "quanto desse material preenche uma linha de receita", não em "quão difícil é achar".</li>
    </ul>

    <h3 class="regras-subtitle">Qualidade e o inventário</h3>
    <p>Como <code>item_id</code> é validado como único por personagem, uma pilha de qualidade não-padrão usa um id sufixado (<code>idComQualidade</code>) em vez de tentar guardar qualidade solta numa linha já travada por id único. Isso não muda nada para compras normais de Loja - só passa a existir quando você concede um drop coletado em jogo com qualidade diferente de "padrao".</p>

    <h3 class="regras-subtitle">Sem sistema paralelo</h3>
    <p>Antes de criar uma propriedade nova para "material que causa veneno" ou "material que causa dano de fogo", verifique se Aflições ou Afinidade já resolvem isso. A propriedade certa aqui descreve o material; o efeito mecânico final sempre aponta para o capítulo que já existe.</p>
  `,
};

/** Versão simplificada publicada. A estrutura detalhada continua acima apenas
 * como referência de compatibilidade para dados antigos; ela não é cobrada de
 * jogadores nem usada no preparo normal das classes. */
export const REGRA_MATERIAIS: RegraTopicoDe<'Livro do Jogador'> = {
  ...REGRA_MATERIAIS_LEGADA,
  resumo: 'Todo material vira um de seis estoques: Componentes Químicos, Componentes Ritualísticos, Componentes Veiculares, Sucata, Mantimentos ou Matéria-prima.',
  destaques: [
    ['Estoques', '6 tipos, separados por raridade'],
    ['Preparo de classe', '1 lote por descanso'],
    ['Ritual', '1 Incomum a 2 Lendários'],
  ],
  corpo: `
    <p class="regras-lead">O nome exato de um material conta a história; o <strong>lote genérico</strong> é o que entra na ficha. Ervas, venenos e sais podem virar Componentes Químicos. Fios, placas e engrenagens podem virar Sucata. Assim o grupo ainda encontra coisas interessantes sem transformar cada preparo numa lista de compras.</p>

    <h3 class="regras-subtitle">A regra em trinta segundos</h3>
    <ul class="regras-list">
      <li>Ao receber um material, coloque-o no estoque indicado pelo catálogo e preserve a raridade: material Comum vira lote Comum, material Raro vira lote Raro.</li>
      <li>Componentes Químicos, Componentes Ritualísticos, Sucata e Mantimentos têm listas próprias. Somente alguns materiais marcados no catálogo também podem virar Matéria-prima.</li>
      <li>Alquimista, Engenheiro e Chef gastam 1 lote depois de um descanso para abastecer <strong>todos</strong> os preparos permitidos pela classe.</li>
      <li>As fórmulas do Alquimista exigem Componentes Químicos da raridade do nível atual: Comum no nível 1, Incomum no 2, Raro no 3, Épico no 4 e Lendário no 5.</li>
      <li>Os projetos do Engenheiro seguem a mesma escada com Sucata: Comum no nível 1, Incomum no 2, Rara no 3, Épica no 4 e Lendária no 5.</li>
      <li>As receitas do Chef seguem a mesma escada com Mantimentos: Comum no nível 1, Incomum no 2, Raro no 3, Épico no 4 e Lendário no 5.</li>
      <li>Rituais não têm círculo nem nível: a complexidade decide o custo. Simples gasta 1 Componente Ritualístico Incomum; Complexo, 1 Raro; Grandioso, 2 Épicos; Monumental, 2 Lendários.</li>
      <li>Veículos usados no mês gastam Componentes Veiculares da própria raridade. O custo é 1 lote pelo veículo e mais 1 lote por módulo de utilidade instalado.</li>
      <li>Ingredientes específicos são descrição narrativa e mercadoria. Uma receita só exige o estoque genérico indicado.</li>
    </ul>

    <h3 class="regras-subtitle">Os seis estoques</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Estoque</th><th>Serve para</th><th>Custo normal</th></tr></thead>
      <tbody>
        <tr><td><strong>Componentes Químicos</strong></td><td>Fórmulas e doses do Alquimista.</td><td>1 por descanso, da raridade do nível atual das fórmulas.</td></tr>
        <tr><td><strong>Componentes Ritualísticos</strong></td><td>Oferendas, símbolos e catalisadores de rituais.</td><td>De 1 Incomum a 2 Lendários, conforme a complexidade.</td></tr>
        <tr><td><strong>Componentes Veiculares</strong></td><td>Manutenção de veículos e dos módulos de utilidade instalados.</td><td>1 por mês de uso, mais 1 por módulo de utilidade instalado, sempre da raridade do veículo.</td></tr>
        <tr><td><strong>Sucata</strong></td><td>Engenhocas temporárias do Engenheiro.</td><td>1 por descanso, da raridade do nível atual dos projetos.</td></tr>
        <tr><td><strong>Mantimentos</strong></td><td>Porções do Chef.</td><td>1 por descanso, da raridade do nível atual das receitas.</td></tr>
        <tr><td><strong>Matéria-prima</strong></td><td>Armas, armaduras e outras criações permanentes.</td><td>Conforme a raridade.</td></tr>
      </tbody>
    </table></div>

    <h3 class="regras-subtitle">Componentes por complexidade do ritual</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Complexidade</th><th>Componentes exigidos</th><th>Quando são gastos</th></tr></thead>
      <tbody>
        <tr><td>Simples</td><td>1 Incomum</td><td>Ao começar o rito</td></tr>
        <tr><td>Complexo</td><td>1 Raro</td><td>Ao começar o rito</td></tr>
        <tr><td>Grandioso</td><td>2 Épicos</td><td>Ao começar o rito</td></tr>
        <tr><td>Monumental</td><td>2 Lendários</td><td>Ao começar o rito</td></tr>
      </tbody>
    </table></div>
    <p>O símbolo ou oferenda exata pode combinar com a cena, mas a quantidade e a raridade não mudam. Um lote superior substitui um inferior; lotes inferiores <strong>não podem ser somados</strong> para alcançar outra raridade. A Mana indicada no ritual também fica comprometida ao começar e não volta se o rito falhar ou for interrompido.</p>

    <h3 class="regras-subtitle">Quando os Componentes Químicos aumentam</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível da fórmula</th><th>Nível de Alquimista</th><th>Componente exigido</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>1–4</td><td>Comum</td></tr>
        <tr><td>2</td><td>5–8</td><td>Incomum</td></tr>
        <tr><td>3</td><td>9–12</td><td>Raro</td></tr>
        <tr><td>4</td><td>13–16</td><td>Épico</td></tr>
        <tr><td>5</td><td>17–20</td><td>Lendário</td></tr>
      </tbody>
    </table></div>
    <p>Um componente de raridade superior pode substituir um inferior. Componentes inferiores <strong>não podem ser somados</strong> para alcançar uma raridade maior. Assim, Água Pura Comum abastece fórmulas de nível 1, mas nunca uma fórmula de nível 2 ou superior.</p>

    <h3 class="regras-subtitle">Quando a Sucata aumenta</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível do projeto</th><th>Nível de Engenheiro</th><th>Sucata exigida</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>3–4</td><td>Comum</td></tr>
        <tr><td>2</td><td>5–8</td><td>Incomum</td></tr>
        <tr><td>3</td><td>9–12</td><td>Rara</td></tr>
        <tr><td>4</td><td>13–16</td><td>Épica</td></tr>
        <tr><td>5</td><td>17–20</td><td>Lendária</td></tr>
      </tbody>
    </table></div>
    <p>Sucata superior pode substituir uma inferior. Lotes inferiores não se somam para alcançar um patamar maior. Todos os projetos conhecidos melhoram automaticamente com o nível do Engenheiro; as vagas de Engenhoca continuam sendo liberadas separadamente.</p>

    <h3 class="regras-subtitle">Quando os Mantimentos aumentam</h3>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível da receita</th><th>Nível de Chef</th><th>Mantimento exigido</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>1–4</td><td>Comum</td></tr>
        <tr><td>2</td><td>5–8</td><td>Incomum</td></tr>
        <tr><td>3</td><td>9–12</td><td>Raro</td></tr>
        <tr><td>4</td><td>13–16</td><td>Épico</td></tr>
        <tr><td>5</td><td>17–20</td><td>Lendário</td></tr>
      </tbody>
    </table></div>
    <p>Um Mantimento superior pode substituir um inferior. Mantimentos inferiores não se somam para criar uma raridade maior. Todas as receitas conhecidas sobem automaticamente com o nível do Chef.</p>

    <h3 class="regras-subtitle">Manutenção de veículos</h3>
    <p>No fim de cada mês em que um veículo foi usado, gaste <strong>1 Componente Veicular da raridade do veículo</strong>, mais <strong>1 lote da mesma raridade por módulo de utilidade instalado</strong>. Conte os módulos instalados mesmo que estejam desligados. Armas, Núcleo e Estrutura não aumentam esse custo.</p>
    <p>Exemplo: uma nave Rara com Geladeira e Área Médica instaladas gasta 3 Componentes Veiculares Raros no mês. Um lote superior pode substituir um inferior; lotes inferiores não podem ser somados para alcançar outra raridade.</p>
    <p>Se o custo não for pago, o veículo fica <strong>sem manutenção</strong> e não pode se mover por conta própria nem ativar sistemas. Ele volta a funcionar assim que a manutenção for paga. O custo atrasado não acumula e o veículo não é destruído por falta de pagamento.</p>

    <h3 class="regras-subtitle">Fabricação permanente</h3>
    <p>Além do teste, tempo e dinheiro do capítulo de Criação, gaste Matéria-prima conforme a raridade: <strong>1</strong> para Comum ou Incomum, <strong>2</strong> para Raro, <strong>3</strong> para Épico, <strong>4</strong> para Lendário, <strong>5</strong> para Relíquia e <strong>6</strong> para Relíquia da Criação.</p>

    <h3 class="regras-subtitle">Somente Matéria-prima pode aproveitar outro catálogo</h3>
    <p>Os quatro estoques de classe e os Componentes Veiculares não se misturam. Um ingrediente de cozinha não vira reagente alquímico, e Sucata de engenhoca não substitui uma peça preparada para manter um veículo. Alguns materiais resistentes ou especiais também trazem a marca de Matéria-prima porque podem entrar numa criação permanente. Mesmo nesses casos, cada unidade entra em <strong>um único estoque e na própria raridade</strong>. Não duplique o mesmo achado.</p>

    <p class="regras-note"><strong>Regra de ouro:</strong> siga o catálogo, baixe um número e continue jogando. Potência, qualidade e estado não são contas exigidas dos jogadores.</p>
  `,
  corpoMestre: `
    <p class="regras-lead">Conceda materiais como lotes diretamente quando o nome específico não importar. Use nomes detalhados apenas quando eles melhorarem a ficção, a negociação ou a recompensa.</p>

    <h3 class="regras-subtitle">Decisão rápida para o Mestre</h3>
    <ul class="regras-list">
      <li>Reagente, extrato ou essência de laboratório: Componente Químico.</li>
      <li>Símbolo, oferenda ou foco mágico: Componente Ritualístico.</li>
      <li>Peça preparada para casco, propulsão, navegação ou manutenção de veículo: Componente Veicular.</li>
      <li>Peça mecânica ou tecnológica: Sucata.</li>
      <li>Comida, bebida ou tempero: Mantimento.</li>
      <li>Parte estrutural para objeto permanente: Matéria-prima. Alguns materiais dos outros catálogos também recebem esse uso quando são adequados para uma criação duradoura.</li>
    </ul>

    <h3 class="regras-subtitle">Escassez sem planilha</h3>
    <p>Um lote representa material suficiente para uma etapa relevante, não uma medida física fixa. Uma caixa de reagentes e uma essência rara podem valer o mesmo 1 lote por motivos diferentes. Avise o valor antes da escolha de conversão.</p>

    <h3 class="regras-subtitle">Exceções</h3>
    <p>Se uma aventura realmente depender de um objeto único, trate-o como chave narrativa separada, nunca como nova moeda permanente. Depois da cena, volte aos seis estoques.</p>
  `,
};
