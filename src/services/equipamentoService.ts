import { aplicarAjustesAtributosRaciais } from './calculoService';
import { RACAS_CATALOGO } from './catalogoService';
import {
  EFEITOS_POR_MODIFICACAO_MAXIMOS,
  obterRegraRaridade,
} from '../../data/regras/raridadesEquipamentos';

export interface IResumoEquipamento {
  defesaEquipamento: number;
  defesaItens: IDetalheEfeitoAutomatico[];
  penalidadeArmadura: number;
  espacosUsados: number;
  capacidade: number;
  sobrecarregado: boolean;
  conflitos: string[];
  bonusAtributos: Record<string, number>;
  bonusRecursos: Record<string, number>;
  bonusCombate: Record<string, number>;
  bonusPericias: Record<string, number>;
  vantagens: Record<string, number>;
  desvantagens: Record<string, number>;
  efeitosAtivos: IEfeitoEquipamentoAtivo[];
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

export const EFEITOS_FICHA_MAXIMOS = 5;

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
      const origemAutonoma = /^(Poder|Habilidade|Fruto do Éden):/i.test(efeito.origem);
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

export function resumirEquipamentos(inventarioCentral: any[], ficha: any): IResumoEquipamento {
  const itens = Array.isArray(inventarioCentral) ? inventarioCentral : [];
  // Veículos são bens independentes: não ocupam a carga pessoal e seus
  // sistemas não aplicam bônus diretamente ao personagem.
  const itensPessoais = itens.filter((item) => item?.dados?.categoria !== 'veiculo');
  const equipados = itensPessoais.filter((item) => item?.dados?.equipado);
  const bonusAtributos: Record<string, number> = {};
  const bonusRecursos: Record<string, number> = {};
  const bonusCombate: Record<string, number> = {};
  const bonusPericias: Record<string, number> = {};
  const vantagens: Record<string, number> = {};
  const desvantagens: Record<string, number> = {};
  const efeitosAtivos: IEfeitoEquipamentoAtivo[] = [];
  const conflitos: string[] = [];

  equipados.forEach((item) => {
    const regraRaridade = obterRegraRaridade(String(item?.dados?.raridade || 'comum'));
    const modificacoesInformadas = normalizarModificacoesEquipamento(item?.dados?.modificacoes);
    const efeitosRaridadeInformados = normalizarEfeitosEquipamento(item?.dados?.efeitosRaridade);
    const nomeItem = String(item?.titulo || 'Item');
    const valorLimitado = (efeito: IEfeitoEquipamento): IEfeitoEquipamento => ({
      ...efeito,
      valor: Math.sign(efeito.valor) * Math.min(Math.abs(efeito.valor), regraRaridade.valorMaximoPorEfeito),
    });
    const modificacoes = modificacoesInformadas
      .slice(0, regraRaridade.modificacoesMaximas)
      .map((modificacao) => ({
        ...modificacao,
        efeitos: modificacao.efeitos.slice(0, EFEITOS_POR_MODIFICACAO_MAXIMOS).map(valorLimitado),
      }));
    const efeitosRaridade = efeitosRaridadeInformados
      .slice(0, regraRaridade.efeitosRaridadeMaximos)
      .map(valorLimitado);
    const excedeuLimites = modificacoesInformadas.length > regraRaridade.modificacoesMaximas
      || efeitosRaridadeInformados.length > regraRaridade.efeitosRaridadeMaximos
      || modificacoesInformadas.some((modificacao) => modificacao.efeitos.length > EFEITOS_POR_MODIFICACAO_MAXIMOS)
      || [...modificacoesInformadas.flatMap((modificacao) => modificacao.efeitos), ...efeitosRaridadeInformados]
        .some((efeito) => Math.abs(efeito.valor) > regraRaridade.valorMaximoPorEfeito);
    if (excedeuLimites) conflitos.push(`${nomeItem} excede os limites de ${regraRaridade.titulo}; efeitos excedentes foram ignorados.`);

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
    fontes.forEach((fonte) => fonte.efeitos.forEach((efeito) => {
      efeitosAtivos.push({
        ...efeito,
        itemId: String(item?.item_id || ''),
        itemNome: String(item?.titulo || 'Item'),
        origem: fonte.origem,
      });
      if (efeito.categoria === 'atributo') somarNoMapa(bonusAtributos, efeito.alvo, efeito.valor);
      else if (efeito.categoria === 'recurso') somarNoMapa(bonusRecursos, efeito.alvo, efeito.valor);
      else if (efeito.categoria === 'combate') somarNoMapa(bonusCombate, efeito.alvo, efeito.valor);
      else if (efeito.modo === 'vantagem') somarNoMapa(vantagens, efeito.alvo, Math.abs(efeito.valor));
      else if (efeito.modo === 'desvantagem') somarNoMapa(desvantagens, efeito.alvo, Math.abs(efeito.valor));
      else somarNoMapa(bonusPericias, efeito.alvo, efeito.valor);
    }));
  });

  const fontesDaFicha = [
    { itens: ficha?.poderes, rotulo: 'Poder' },
    { itens: ficha?.habilidades, rotulo: 'Habilidade' },
    {
      itens: ficha?.frutoEdenConsumido?.conteudo?.efeitosFicha?.length
        ? [{
            id: `fruto:${ficha.frutoEdenConsumido.itemId || 'eden'}`,
            nome: ficha.frutoEdenConsumido.titulo || 'Fruto do Éden',
            efeitos: ficha.frutoEdenConsumido.conteudo.efeitosFicha,
          }]
        : [],
      rotulo: 'Fruto do Éden',
    },
  ];
  fontesDaFicha.forEach(({ itens, rotulo }) => {
    (Array.isArray(itens) ? itens : []).forEach((item: any) => {
      if (Array.isArray(item?.efeitos) && item.efeitos.length > 0) {
        const efeitosInformados = normalizarEfeitosFicha(item.efeitos);
      efeitosInformados.forEach((efeito) => {
        efeitosAtivos.push({
          ...efeito,
          itemId: String(item.id || ''),
          itemNome: String(item.nome || rotulo),
          origem: `${rotulo}: ${item.nome || 'Desconhecido'}`,
        });
        if (efeito.categoria === 'atributo') somarNoMapa(bonusAtributos, efeito.alvo, efeito.valor);
        else if (efeito.categoria === 'recurso') somarNoMapa(bonusRecursos, efeito.alvo, efeito.valor);
        else if (efeito.categoria === 'combate') somarNoMapa(bonusCombate, efeito.alvo, efeito.valor);
        else if (efeito.modo === 'vantagem') somarNoMapa(vantagens, efeito.alvo, Math.abs(efeito.valor));
        else if (efeito.modo === 'desvantagem') somarNoMapa(desvantagens, efeito.alvo, Math.abs(efeito.valor));
        else somarNoMapa(bonusPericias, efeito.alvo, efeito.valor);
      });
      }
    });
  });
  const armaduras = equipados.filter((item) => item?.dados?.categoria === 'armadura');
  const escudos = armaduras.filter((item) => String(item?.dados?.subtipo || item?.titulo || '').toLowerCase().includes('escudo'));
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
    conflitos,
    bonusAtributos,
    bonusRecursos,
    bonusCombate,
    bonusPericias,
    vantagens,
    desvantagens,
    efeitosAtivos,
  };
}

export function aplicarResistencia(dano: number, resistencia: number): number {
  return Math.max(0, Math.trunc(Number(dano) || 0) - Math.max(0, Math.trunc(Number(resistencia) || 0)));
}
