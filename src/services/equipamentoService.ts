import { aplicarAjustesAtributosRaciais } from './calculoService';
import { PERICIAS_CATALOGO, RACAS_CATALOGO, UNICOS_JARDIM_CATALOGO } from './catalogoService';
import { nivelTotalFicha, opcoesHabilidadeSelecionadas } from './progressaoFichaService';
import { CONJUNTOS_EQUIPAMENTO, type IBonusConjunto, type IConjuntoEquipamento } from '../../data/regras/conjuntos';
import { resumirLimiteItensEspeciais } from './itensEspeciaisService';
import { efeitosBrutosDoFrutoEden } from './frutoEdenAwakening';

export interface IResumoEquipamento {
  defesaEquipamento: number;
  defesaItens: IDetalheEfeitoAutomatico[];
  penalidadeArmadura: number;
  espacosUsados: number;
  capacidade: number;
  sobrecarregado: boolean;
  itensEspeciais: {
    usados: number;
    limite: number;
    itensPericia: number;
    artefatos: number;
  };
  conflitos: string[];
  bonusAtributos: Record<string, number>;
  bonusRecursos: Record<string, number>;
  bonusCombate: Record<string, number>;
  bonusPericias: Record<string, number>;
  vantagens: Record<string, number>;
  desvantagens: Record<string, number>;
  efeitosAtivos: IEfeitoEquipamentoAtivo[];
  /** Itens equipados que têm formas: a forma de agora e a próxima. */
  formas: IFormaAtivaItem[];
  /** Conjuntos com pelo menos uma peça equipada, com o que já vale e o que falta. */
  conjuntos: IProgressoConjunto[];
}

export type TCategoriaEfeitoEquipamento = 'atributo' | 'recurso' | 'combate' | 'pericia';
export type TModoEfeitoEquipamento = 'bonus' | 'vantagem' | 'desvantagem';

export interface IEfeitoEquipamento {
  id: string;
  categoria: TCategoriaEfeitoEquipamento;
  alvo: string;
  modo: TModoEfeitoEquipamento;
  valor: number;
}

export interface IEfeitoEquipamentoAtivo extends IEfeitoEquipamento {
  itemId: string;
  itemNome: string;
  origem: string;
}

export interface IDetalheEfeitoAutomatico {
  nome: string;
  valor: number;
}

export interface IModificacaoEquipamento {
  id: string;
  nome: string;
  efeito: string;
  tipo: 'comum' | 'especial';
  efeitos: IEfeitoEquipamento[];
}

/** Uma forma de item: o que ele é e faz a partir de certo nível total do dono. */
export interface IFormaItem {
  nivel: number;
  titulo: string;
  descricao: string;
  efeitos: IEfeitoEquipamento[];
}

export interface IFormaAtivaItem {
  itemId: string;
  itemNome: string;
  atual: IFormaItem;
  proxima?: IFormaItem;
}

export interface IProgressoConjunto {
  conjunto: IConjuntoEquipamento;
  /** Ids do catálogo das peças equipadas, sem repetição. */
  equipadas: string[];
  ativos: IBonusConjunto[];
  proximo?: IBonusConjunto;
}

export const EFEITOS_FICHA_MAXIMOS = 5;

export interface IEfeitoUnicoJardim extends IEfeitoEquipamento {
  unicoId: string;
  unicoTitulo: string;
}

/**
 * Efeitos dos Únicos passivos que a ficha plantou no Jardim. Entre Únicos, só o
 * maior de cada alvo vale (Raiz Funda e Tronco do Jardim não somam a Vida), para
 * que a escada de preços não vire pilha de bônus.
 */
export function efeitosDosUnicosJardim(ficha: any): IEfeitoUnicoJardim[] {
  const comprados: unknown[] = Array.isArray(ficha?.jardim?.unicosComprados) ? ficha.jardim.unicosComprados : [];
  const melhores = new Map<string, IEfeitoUnicoJardim>();
  comprados.forEach((id) => {
    const unico = UNICOS_JARDIM_CATALOGO.find((item) => item.id === id);
    if (!unico) return;
    normalizarEfeitosEquipamento(unico.efeitos).forEach((efeito) => {
      const chave = `${efeito.categoria}:${efeito.alvo}:${efeito.modo}`;
      const atual = melhores.get(chave);
      if (!atual || Math.abs(efeito.valor) > Math.abs(atual.valor)) {
        melhores.set(chave, { ...efeito, unicoId: unico.id, unicoTitulo: unico.titulo });
      }
    });
  });
  return [...melhores.values()];
}

const CATEGORIAS_EFEITO = new Set<TCategoriaEfeitoEquipamento>(['atributo', 'recurso', 'combate', 'pericia']);
const MODOS_EFEITO = new Set<TModoEfeitoEquipamento>(['bonus', 'vantagem', 'desvantagem']);

export function normalizarEfeitosEquipamento(valor: unknown): IEfeitoEquipamento[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((efeito: any, indice) => {
    const categoria = String(efeito?.categoria || '') as TCategoriaEfeitoEquipamento;
    const alvo = String(efeito?.alvo || '').trim();
    const modoInformado = String(efeito?.modo || 'bonus') as TModoEfeitoEquipamento;
    const modo = MODOS_EFEITO.has(modoInformado) ? modoInformado : 'bonus';
    const valorNumerico = Number(efeito?.valor);
    if (!CATEGORIAS_EFEITO.has(categoria) || !alvo || !Number.isFinite(valorNumerico) || valorNumerico === 0) return [];
    return [{
      id: String(efeito?.id || `efeito-${indice}`),
      categoria,
      alvo,
      modo,
      valor: valorNumerico,
    }];
  });
}

/**
 * Formas de um item (`formas` no catálogo): da menor para a maior por nível
 * total do dono. A forma de agora é a de maior nível que o dono já alcançou, e
 * ela SUBSTITUI a anterior em vez de somar com ela. Item sem `formas` não tem
 * nada a normalizar.
 */
export function normalizarFormasItem(valor: unknown): IFormaItem[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .flatMap((forma: any) => {
      const nivel = Math.trunc(Number(forma?.nivel));
      if (!Number.isFinite(nivel) || nivel < 1) return [];
      return [{
        nivel,
        titulo: String(forma?.titulo || '').trim(),
        descricao: String(forma?.descricao || '').trim(),
        efeitos: normalizarEfeitosEquipamento(forma?.efeitos).map((efeito, indice) => ({
          ...efeito,
          id: efeito.id === `efeito-${indice}` ? `forma-${nivel}-${indice}` : efeito.id,
        })),
      }];
    })
    .sort((a, b) => a.nivel - b.nivel);
}

export function formaAtualDoItem(
  formas: readonly IFormaItem[],
  nivelTotal: number,
): { atual?: IFormaItem; proxima?: IFormaItem } {
  const nivel = Math.max(1, Math.trunc(Number(nivelTotal) || 1));
  const alcancadas = formas.filter((forma) => forma.nivel <= nivel);
  return {
    atual: alcancadas[alcancadas.length - 1],
    proxima: formas.find((forma) => forma.nivel > nivel),
  };
}

/** O id do catálogo de um item do inventário, sem o sufixo de raridade. */
export function idCatalogoDoItem(item: any): string {
  return String(item?.dados?.catalogo_item_id || item?.item_id || '').split('::')[0];
}

/**
 * Quais bônus de cada conjunto estão valendo para as peças equipadas. Os bônus
 * são cumulativos e uma peça repetida conta uma vez.
 */
export function progressoDosConjuntos(idsEquipados: Iterable<string>): IProgressoConjunto[] {
  const equipados = new Set(idsEquipados);
  return CONJUNTOS_EQUIPAMENTO.flatMap((conjunto) => {
    const equipadas = conjunto.pecas.map((peca) => peca.id).filter((id) => equipados.has(id));
    if (equipadas.length === 0) return [];
    const ordenados = [...conjunto.bonus].sort((a, b) => a.pecas - b.pecas);
    return [{
      conjunto,
      equipadas,
      ativos: ordenados.filter((bonus) => bonus.pecas <= equipadas.length),
      proximo: ordenados.find((bonus) => bonus.pecas > equipadas.length),
    }];
  });
}

const ROTULOS_ATRIBUTO: Record<string, string> = {
  forca: 'Força', destreza: 'Destreza', constituicao: 'Constituição', inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria', carisma: 'Carisma', fluxo: 'Fluxo',
};
const ROTULOS_RECURSO: Record<string, string> = {
  vidaMaxima: 'Vida máxima', manaMaxima: 'Mana máxima', estaminaMaxima: 'Estamina máxima',
  sanidadeMaxima: 'Sanidade máxima', cansacoMaximo: 'Cansaço máximo',
};
const ROTULOS_COMBATE: Record<string, string> = {
  defesa: 'Defesa', iniciativa: 'Iniciativa', movimento: 'Movimento', ataque: 'Ataques',
  dano: 'Dano', margemAmeaca: 'Margem de Ameaça', multiplicadorCritico: 'Multiplicador Crítico',
};

/** "+1 em Fortitude", "−10 de Sanidade máxima", "vantagem em Percepção": o efeito como o jogador lê. */
export function rotuloEfeitoEquipamento(efeito: Pick<IEfeitoEquipamento, 'categoria' | 'alvo' | 'modo' | 'valor'>): string {
  const alvo = efeito.categoria === 'atributo' ? ROTULOS_ATRIBUTO[efeito.alvo]
    : efeito.categoria === 'recurso' ? ROTULOS_RECURSO[efeito.alvo]
      : efeito.categoria === 'combate' ? ROTULOS_COMBATE[efeito.alvo]
        : PERICIAS_CATALOGO.find((pericia) => pericia.id === efeito.alvo)?.titulo;
  const nome = alvo ?? efeito.alvo;
  if (efeito.modo === 'vantagem') return `vantagem em ${nome}`;
  if (efeito.modo === 'desvantagem') return `desvantagem em ${nome}`;
  const numero = Math.abs(efeito.valor).toLocaleString('pt-BR');
  const sinal = efeito.valor < 0 ? '−' : '+';
  if (efeito.categoria === 'recurso') return `${sinal}${numero} de ${nome}`;
  if (efeito.categoria === 'combate' && efeito.alvo === 'movimento') return `${sinal}${numero} m de ${nome}`;
  return `${sinal}${numero} em ${nome}`;
}

export function normalizarEfeitosFicha(valor: unknown): IEfeitoEquipamento[] {
  return normalizarEfeitosEquipamento(valor)
    .slice(0, EFEITOS_FICHA_MAXIMOS);
}

export function normalizarModificacoesEquipamento(valor: unknown): IModificacaoEquipamento[] {
  if (!Array.isArray(valor)) return [];
  return valor.flatMap((modificacao: any, indice) => {
    if (!modificacao || typeof modificacao !== 'object') return [];
    return [{
      id: String(modificacao.id || `modificacao-${indice}`),
      nome: String(modificacao.nome || ''),
      efeito: String(modificacao.efeito || ''),
      tipo: modificacao.tipo === 'especial' ? 'especial' : 'comum',
      efeitos: normalizarEfeitosEquipamento(modificacao.efeitos),
    }];
  });
}

function somarNoMapa(mapa: Record<string, number>, alvo: string, valor: number) {
  mapa[alvo] = (mapa[alvo] || 0) + valor;
}

/**
 * Expõe os bônus automáticos sem perder a fonte original. O resumo numérico é
 * útil para os cálculos, enquanto esta visão detalhada alimenta os modais da
 * ficha com nomes como "Poder: Aura" ou "Armadura: Núcleo vital".
 */
export function detalharEfeitosAutomaticos(
  resumo: Pick<IResumoEquipamento, 'efeitosAtivos'>,
  categoria: TCategoriaEfeitoEquipamento,
  alvo: string,
): IDetalheEfeitoAutomatico[] {
  const totais = new Map<string, number>();

  resumo.efeitosAtivos
    .filter((efeito) => efeito.categoria === categoria && efeito.alvo === alvo)
    .forEach((efeito) => {
      const origemAutonoma = /^(Poder|Habilidade|Fruto do Éden|Aliado):/i.test(efeito.origem);
      const nome = origemAutonoma
        ? efeito.origem
        : `${efeito.itemNome}: ${efeito.origem}`;
      totais.set(nome, (totais.get(nome) || 0) + efeito.valor);
    });

  return [...totais.entries()]
    .filter(([, valor]) => Number.isFinite(valor) && valor !== 0)
    .map(([nome, valor]) => ({ nome, valor }));
}

const numero = (valor: unknown) => {
  const encontrado = String(valor ?? '').match(/[+-]?\d+(?:[.,]\d+)?/);
  return encontrado ? Number(encontrado[0].replace(',', '.')) : 0;
};

export function capacidadeCarga(forca: number, nivel: number): number {
  const modificador = Math.floor((Number(forca || 10) - 10) / 2);
  return Math.max(5, 10 + Math.max(0, modificador) * 2 + Math.floor(Math.max(1, Number(nivel) || 1) / 2));
}

export function resumirEquipamentos(
  inventarioCentral: any[],
  ficha: any,
  aliadosCompartilhados: any[] = [],
): IResumoEquipamento {
  const itens = Array.isArray(inventarioCentral) ? inventarioCentral : [];
  // Veículos são bens independentes: não ocupam a carga pessoal e seus
  // sistemas não aplicam bônus diretamente ao personagem.
  const itensPessoais = itens.filter((item) => item?.dados?.categoria !== 'veiculo');
  const resumoItensEspeciais = resumirLimiteItensEspeciais(itensPessoais, ficha);
  const idsEspeciaisExcedentes = new Set(resumoItensEspeciais.excedentes.map((item) => String(item.item_id || item.id || '')));
  const equipados = itensPessoais.filter((item) => (
    item?.dados?.equipado && !idsEspeciaisExcedentes.has(String(item?.item_id || item?.id || ''))
  ));
  const bonusAtributos: Record<string, number> = {};
  const bonusRecursos: Record<string, number> = {};
  const bonusCombate: Record<string, number> = {};
  const bonusPericias: Record<string, number> = {};
  const vantagens: Record<string, number> = {};
  const desvantagens: Record<string, number> = {};
  const efeitosAtivos: IEfeitoEquipamentoAtivo[] = [];
  const conflitos: string[] = [];
  if (resumoItensEspeciais.excedentes.length > 0) {
    conflitos.push(
      `${resumoItensEspeciais.excedentes.length} item(ns) especial(is) excedem o limite de ${resumoItensEspeciais.limite}; os bônus excedentes estão inativos.`,
    );
  }

  const adicionarEfeitos = (
    efeitos: unknown,
    fonte: { itemId: string; itemNome: string; origem: string },
    limitarQuantidade = false,
  ) => {
    const normalizados = limitarQuantidade
      ? normalizarEfeitosFicha(efeitos)
      : normalizarEfeitosEquipamento(efeitos);
    normalizados.forEach((efeito) => {
      efeitosAtivos.push({ ...efeito, ...fonte });
      if (efeito.categoria === 'atributo') somarNoMapa(bonusAtributos, efeito.alvo, efeito.valor);
      else if (efeito.categoria === 'recurso') somarNoMapa(bonusRecursos, efeito.alvo, efeito.valor);
      else if (efeito.categoria === 'combate') somarNoMapa(bonusCombate, efeito.alvo, efeito.valor);
      else if (efeito.modo === 'vantagem') somarNoMapa(vantagens, efeito.alvo, Math.abs(efeito.valor));
      else if (efeito.modo === 'desvantagem') somarNoMapa(desvantagens, efeito.alvo, Math.abs(efeito.valor));
      else somarNoMapa(bonusPericias, efeito.alvo, efeito.valor);
    });
  };

  equipados.forEach((item) => {
    // Só os itens especiais que cabem no orçamento de uso chegam a esta lista.
    // Itens antigos acima do limite continuam no inventário, mas seus efeitos
    // excedentes não alteram a ficha até uma vaga ser liberada.
    const modificacoes = normalizarModificacoesEquipamento(item?.dados?.modificacoes);
    const efeitosRaridade = normalizarEfeitosEquipamento(item?.dados?.efeitosRaridade);

    const fontes = [
      ...modificacoes.map((modificacao) => ({
        origem: modificacao.nome.trim() || 'Modificação',
        efeitos: modificacao.efeitos,
      })),
      {
        origem: `Raridade: ${String(item?.dados?.raridade || 'comum')}`,
        efeitos: efeitosRaridade,
      },
    ];
    fontes.forEach((fonte) => adicionarEfeitos(fonte.efeitos, {
        itemId: String(item?.item_id || ''),
        itemNome: String(item?.titulo || 'Item'),
        origem: fonte.origem,
      }));
  });

  // Formas que despertam com o dono: só a forma de agora vale, e só equipado.
  const nivelDoDono = Math.max(1, nivelTotalFicha(ficha));
  const formas: IFormaAtivaItem[] = [];
  equipados.forEach((item) => {
    const lista = normalizarFormasItem(item?.dados?.formas);
    if (lista.length === 0) return;
    const { atual, proxima } = formaAtualDoItem(lista, nivelDoDono);
    const itemId = String(item?.item_id || '');
    const itemNome = String(item?.titulo || 'Item');
    if (!atual) return;
    formas.push({ itemId, itemNome, atual, proxima });
    adicionarEfeitos(atual.efeitos, { itemId, itemNome, origem: `Forma: ${atual.titulo || `nível ${atual.nivel}`}` });
  });

  // Conjuntos: bônus de coleção das peças equipadas.
  const conjuntos = progressoDosConjuntos(equipados.map(idCatalogoDoItem));
  conjuntos.forEach(({ conjunto, equipadas, ativos }) => {
    ativos.forEach((bonus) => adicionarEfeitos(bonus.efeitos, {
      itemId: `conjunto:${conjunto.id}`,
      itemNome: conjunto.titulo,
      origem: `${bonus.pecas} peças (${equipadas.length} de ${conjunto.pecas.length} em uso)`,
    }));
  });

  const efeitosFruto = efeitosBrutosDoFrutoEden(ficha);
  const fontesDaFicha = [
    { itens: ficha?.poderes, rotulo: 'Poder' },
    { itens: ficha?.habilidades, rotulo: 'Habilidade' },
    {
      itens: ficha?.frutoEdenConsumido && Array.isArray(efeitosFruto) && efeitosFruto.length > 0
        ? [{
            id: `fruto:${ficha.frutoEdenConsumido.itemId || 'eden'}`,
            nome: ficha.frutoEdenConsumido.titulo || 'Fruto do Éden',
            efeitos: efeitosFruto,
          }]
        : [],
      rotulo: 'Fruto do Éden',
    },
  ];
  fontesDaFicha.forEach(({ itens, rotulo }) => {
    (Array.isArray(itens) ? itens : []).forEach((item: any) => {
      if (Array.isArray(item?.efeitos) && item.efeitos.length > 0) {
        adicionarEfeitos(item.efeitos, {
          itemId: String(item.id || ''),
          itemNome: String(item.nome || rotulo),
          origem: `${rotulo}: ${item.nome || 'Desconhecido'}`,
        }, true);
      }
    });
  });
  efeitosDosUnicosJardim(ficha).forEach(({ unicoId, unicoTitulo, ...efeito }) => adicionarEfeitos([efeito], {
    itemId: `jardim-unico:${unicoId}`,
    itemNome: unicoTitulo,
    origem: `Único do Jardim: ${unicoTitulo}`,
  }));
  const aliadosAtivos = [
    ...(Array.isArray(ficha?.aliados) ? ficha.aliados : []),
    ...(Array.isArray(aliadosCompartilhados) ? aliadosCompartilhados : []),
  ].filter((aliado: any) => aliado?.emCena !== false);
  aliadosAtivos.forEach((aliado: any) => {
    adicionarEfeitos(aliado?.efeitos, {
      itemId: String(aliado?.id || ''),
      itemNome: String(aliado?.nome || 'Aliado'),
      origem: `Aliado: ${aliado?.nome || 'Desconhecido'}`,
    }, true);
  });
  opcoesHabilidadeSelecionadas(ficha).forEach((opcao) => {
    adicionarEfeitos(opcao.efeitos, {
      itemId: opcao.id,
      itemNome: opcao.titulo,
      origem: `Habilidade: ${opcao.titulo}`,
    }, true);
  });
  const armaduras = equipados.filter((item) => item?.dados?.categoria === 'armadura');
  const escudos = armaduras.filter((item) => (
    item?.dados?.categoria_protecao
      ? item.dados.categoria_protecao === 'escudo'
      // Peça comprada antes da separação escudo/armadura ainda não tem
      // categoria_protecao: cai pro subtipo antigo ou pro título.
      : String(item?.dados?.subtipo || item?.titulo || '').toLowerCase().includes('escudo')
  ));
  const malhas = armaduras.filter((item) => String(item?.dados?.material || item?.titulo || '').toLowerCase().includes('malha'));
  const principais = armaduras.filter((item) => !escudos.includes(item) && !malhas.includes(item));
  if (principais.length > 1) conflitos.push('Equipe no máximo uma armadura principal.');
  if (escudos.length > 1) conflitos.push('Equipe no máximo um escudo.');
  if (malhas.length > 1) conflitos.push('Equipe no máximo uma malha sob a armadura.');
  const validas = [principais[0], malhas[0], escudos[0]].filter(Boolean);
  const defesaItens = validas.flatMap((item) => {
    const valor = numero(item?.dados?.defesa ?? item?.dados?.bonus);
    return valor === 0 ? [] : [{ nome: String(item?.titulo || 'Armadura ou escudo'), valor }];
  });
  const defesaEquipamento = defesaItens.reduce((total, item) => total + item.valor, 0);
  const penalidadeArmadura = validas.reduce((total, item) => total + Math.abs(numero(item?.dados?.penalidade)), 0);
  const espacosUsados = itensPessoais.reduce((total, item) => total + Math.max(0, numero(item?.dados?.espacos ?? 1)) * Math.max(1, numero(item?.quantidade ?? 1)), 0);
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId);
  const atributosEfetivos = raca
    ? aplicarAjustesAtributosRaciais(ficha?.atributosFinais || {}, raca, ficha?.escolhaRacial)
    : ficha?.atributosFinais || {};
  const capacidade = capacidadeCarga((Number(atributosEfetivos.forca) || 10) + (bonusAtributos.forca || 0), Number(ficha?.nivel) || 1);
  return {
    defesaEquipamento,
    defesaItens,
    penalidadeArmadura,
    espacosUsados,
    capacidade,
    sobrecarregado: espacosUsados > capacidade,
    itensEspeciais: {
      usados: resumoItensEspeciais.usados,
      limite: resumoItensEspeciais.limite,
      itensPericia: resumoItensEspeciais.porGrupo['item-pericia'],
      artefatos: resumoItensEspeciais.porGrupo.artefato,
    },
    conflitos,
    bonusAtributos,
    bonusRecursos,
    bonusCombate,
    bonusPericias,
    vantagens,
    desvantagens,
    efeitosAtivos,
    formas,
    conjuntos,
  };
}

export function aplicarResistencia(dano: number, resistencia: number): number {
  return Math.max(0, Math.trunc(Number(dano) || 0) - Math.max(0, Math.trunc(Number(resistencia) || 0)));
}
