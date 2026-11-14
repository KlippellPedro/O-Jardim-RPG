import { FAVORES, NIVEIS_DE_CONFIANCA, RAMOS_DE_CONTATO, type IFavor } from '../../../../data/regras/contatosELacos';
import {
  PONTOS_DE_RELACAO_MAXIMOS,
  limitarPontosDeRelacao,
  sanidadeDaRelacao,
  usosRestantes,
  type PontosDeRelacao,
} from '../../../../data/regras/pontosDeRelacao';

export type TipoVinculo =
  | 'amizade'
  | 'familia'
  | 'amor'
  | 'mentor'
  | 'aliado'
  | 'contato'
  | 'divida'
  | 'rival'
  | 'inimigo';

export const TIPOS_VINCULO: { valor: TipoVinculo; rotulo: string }[] = [
  { valor: 'amizade', rotulo: 'Amizade' },
  { valor: 'familia', rotulo: 'Família' },
  { valor: 'amor', rotulo: 'Amor' },
  { valor: 'mentor', rotulo: 'Mentor' },
  { valor: 'aliado', rotulo: 'Aliado' },
  { valor: 'contato', rotulo: 'Contato' },
  { valor: 'divida', rotulo: 'Dívida' },
  { valor: 'rival', rotulo: 'Rival' },
  { valor: 'inimigo', rotulo: 'Inimigo' },
];

export const AFINIDADE_MIN = -5;
export const AFINIDADE_MAX = 5;
export const LIMITE_VINCULOS = 60;
export const LIMITE_HISTORICO = 30;
/** Retratos moram dentro da ficha (limite de 1 MB), então são miniaturas e poucos. */
export const LIMITE_FOTOS_VINCULO = 24;
export const RESOLUCAO_FOTO_VINCULO = 128;
export const TAMANHO_MAXIMO_FOTO_VINCULO = 20_000;
/** Quantos vínculos cabem na teia sem virar borrão. */
export const LIMITE_NOS_TEIA = 14;

const PREFIXOS_FOTO = ['data:image/webp;base64,', 'data:image/jpeg;base64,', 'data:image/png;base64,'];

export const fotoVinculoValida = (valor: unknown): valor is string =>
  typeof valor === 'string'
  && valor.length <= TAMANHO_MAXIMO_FOTO_VINCULO
  && PREFIXOS_FOTO.some((prefixo) => valor.startsWith(prefixo));

export interface IMudancaAfinidade {
  em: number;
  de: number;
  para: number;
  motivo: string;
}

export interface IVinculo {
  id: string;
  nome: string;
  tipo: TipoVinculo;
  afinidade: number;
  nota: string;
  fixado: boolean;
  /** Id do aliado da aba Aliados que originou o vínculo, quando houve. */
  aliadoId?: string;
  /** Miniatura em data URL. Ausente quando o vínculo usa só as iniciais. */
  foto?: string;
  /** Ramo do contato (Contatos e Laços). Presente quando a pessoa faz favores. */
  ramo?: string;
  /** A Dívida que o contato guarda, numa frase. */
  divida?: string;
  /** Frase do laço, na voz do personagem. Presente quando o vínculo é um laço. */
  laco?: string;
  /** A vantagem do laço já foi usada nesta sessão. */
  lacoUsado?: boolean;
  /** Personagem do grupo (de jogador ou Aliado): mostra Pontos de Relação no
   *  lugar da escala de afinidade. Os pontos saem da afinidade. */
  grupo?: boolean;
  /** Usos dos Pontos de Relação gastos nesta sessão. */
  pontosUsados?: number;
  criadoEm: number;
  atualizadoEm: number;
  historico: IMudancaAfinidade[];
}

const TIPOS_VALIDOS = new Set<string>(TIPOS_VINCULO.map((tipo) => tipo.valor));

export const limitarAfinidade = (valor: unknown): number => {
  const numero = typeof valor === 'number' && Number.isFinite(valor) ? Math.round(valor) : 0;
  return Math.max(AFINIDADE_MIN, Math.min(AFINIDADE_MAX, numero));
};

export const gerarIdVinculo = () =>
  `vinculo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

const texto = (valor: unknown, limite: number) =>
  typeof valor === 'string' ? valor.trim().slice(0, limite) : '';

/** Aceita o que estiver salvo na ficha e devolve só vínculos utilizáveis. */
export function normalizarVinculos(bruto: unknown): IVinculo[] {
  if (!Array.isArray(bruto)) return [];
  const vistos = new Set<string>();
  const resultado: IVinculo[] = [];
  let fotos = 0;
  bruto.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const registro = item as Record<string, unknown>;
    const nome = texto(registro.nome, 80);
    const id = texto(registro.id, 80) || gerarIdVinculo();
    if (!nome || vistos.has(id) || resultado.length >= LIMITE_VINCULOS) return;
    vistos.add(id);
    const criadoEm = typeof registro.criadoEm === 'number' ? registro.criadoEm : 0;
    resultado.push({
      id,
      nome,
      tipo: TIPOS_VALIDOS.has(String(registro.tipo)) ? (registro.tipo as TipoVinculo) : 'contato',
      afinidade: limitarAfinidade(registro.afinidade),
      nota: texto(registro.nota, 1200),
      fixado: registro.fixado === true,
      aliadoId: texto(registro.aliadoId, 80) || undefined,
      foto: fotoVinculoValida(registro.foto) && fotos < LIMITE_FOTOS_VINCULO ? (fotos++, registro.foto) : undefined,
      ...camposDeContatoELaco(registro),
      criadoEm,
      atualizadoEm: typeof registro.atualizadoEm === 'number' ? registro.atualizadoEm : criadoEm,
      historico: Array.isArray(registro.historico)
        ? registro.historico
            .filter((mudanca): mudanca is Record<string, unknown> => !!mudanca && typeof mudanca === 'object')
            .map((mudanca) => ({
              em: typeof mudanca.em === 'number' ? mudanca.em : 0,
              de: limitarAfinidade(mudanca.de),
              para: limitarAfinidade(mudanca.para),
              motivo: texto(mudanca.motivo, 200),
            }))
            .slice(-LIMITE_HISTORICO)
        : [],
    });
  });
  return resultado;
}

// ---------------------------------------------------------- contatos e laços

const semAcentoMinusculo = (valor: string) =>
  valor.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');

/** Ramos do livro (Informação, Passagem...) com um id estável para gravar na ficha. */
export const RAMOS_CONTATO = RAMOS_DE_CONTATO.map((ramo) => ({
  valor: semAcentoMinusculo(ramo.titulo),
  rotulo: ramo.titulo,
  exemplo: ramo.exemplo,
}));
const RAMOS_VALIDOS = new Set(RAMOS_CONTATO.map((ramo) => ramo.valor));

/** Só grava os campos que existem: vínculo sem contato nem laço continua igual ao de antes. */
function camposDeContatoELaco(registro: Record<string, unknown>): Pick<IVinculo, 'ramo' | 'divida' | 'laco' | 'lacoUsado' | 'grupo' | 'pontosUsados'> {
  const campos: Pick<IVinculo, 'ramo' | 'divida' | 'laco' | 'lacoUsado' | 'grupo' | 'pontosUsados'> = {};
  if (registro.grupo === true) {
    campos.grupo = true;
    const pontos = pontosDoVinculo(limitarAfinidade(registro.afinidade));
    const usados = typeof registro.pontosUsados === 'number' && Number.isFinite(registro.pontosUsados)
      ? Math.max(0, Math.min(pontos, Math.trunc(registro.pontosUsados)))
      : 0;
    if (usados > 0) campos.pontosUsados = usados;
  }
  const ramo = texto(registro.ramo, 40);
  if (RAMOS_VALIDOS.has(ramo)) {
    campos.ramo = ramo;
    const divida = texto(registro.divida, 300);
    if (divida) campos.divida = divida;
  }
  const laco = texto(registro.laco, 300);
  if (laco) {
    campos.laco = laco;
    if (registro.lacoUsado === true) campos.lacoUsado = true;
  }
  return campos;
}

export const rotuloRamo = (ramo: string | undefined) => RAMOS_CONTATO.find((item) => item.valor === ramo)?.rotulo || '';

/** A Confiança do contato sai da afinidade do vínculo: 1 ou 2 é Conhecido, 3 ou 4 é Amigo, 5 é Leal.
 *  Afinidade 0 ou menos é contato perdido, sem favores. */
export function confiancaDoVinculo(afinidade: number): 0 | 1 | 2 | 3 {
  const valor = limitarAfinidade(afinidade);
  if (valor >= 5) return 3;
  if (valor >= 3) return 2;
  if (valor >= 1) return 1;
  return 0;
}

export function rotuloConfianca(confianca: number): string {
  return NIVEIS_DE_CONFIANCA.find((nivel) => nivel.nivel === confianca)?.titulo || 'Perdido';
}

/** Afinidade do degrau de Confiança de cima (cumprir uma Dívida que custou, salvar a pele dele). */
export function afinidadeAoSubirConfianca(afinidade: number): number {
  const valor = limitarAfinidade(afinidade);
  if (valor >= 3) return AFINIDADE_MAX;
  if (valor >= 1) return 3;
  return 1;
}

/** Afinidade do degrau de baixo (recusar uma Dívida, deixar o contato se dar mal). */
export function afinidadeAoBaixarConfianca(afinidade: number): number {
  const valor = limitarAfinidade(afinidade);
  if (valor >= 5) return 4;
  if (valor >= 3) return 2;
  if (valor >= 1) return 0;
  return valor;
}

/** Favores que a Confiança atual aceita fazer. */
export function favoresDoContato(afinidade: number): IFavor[] {
  const confianca = confiancaDoVinculo(afinidade);
  return FAVORES.filter((favor) => confianca >= favor.confiancaMinima);
}

export function cumprirDivida(vinculo: IVinculo, agora = Date.now()): IVinculo {
  const { divida: _paga, ...resto } = aplicarAfinidade(vinculo, afinidadeAoSubirConfianca(vinculo.afinidade), 'Dívida cumprida', agora);
  return { ...resto, atualizadoEm: agora };
}

export function recusarDivida(vinculo: IVinculo, agora = Date.now()): IVinculo {
  const { divida: _recusada, ...resto } = aplicarAfinidade(vinculo, afinidadeAoBaixarConfianca(vinculo.afinidade), 'Dívida recusada', agora);
  return { ...resto, atualizadoEm: agora };
}

// ------------------------------------------------------- pontos de relação

/** Os Pontos de Relação saem da afinidade pela escada da Confiança:
 *  1 ou 2 vale 1 ponto, 3 ou 4 vale 2, 5 vale 3. Afinidade 0 ou menos, nenhum. */
export function pontosDoVinculo(afinidade: number): PontosDeRelacao {
  return limitarPontosDeRelacao(confiancaDoVinculo(afinidade));
}

/** Afinidade que corresponde a um número de pontos. Se a afinidade atual já
 *  está no degrau pedido, ela fica como está (3 e 4 são os dois 2 pontos), e
 *  0 ponto preserva um atrito negativo que já existia. */
export function afinidadeDosPontos(afinidadeAtual: number, pontos: number): number {
  const atual = limitarAfinidade(afinidadeAtual);
  const alvo = limitarPontosDeRelacao(pontos);
  if (pontosDoVinculo(atual) === alvo) return atual;
  return [0, 1, 3, AFINIDADE_MAX][alvo];
}

export const ehDoGrupo = (vinculo: Pick<IVinculo, 'grupo'>) => vinculo.grupo === true;

/** Usos que ainda restam nesta sessão com essa pessoa. */
export function usosDoVinculo(vinculo: Pick<IVinculo, 'afinidade' | 'pontosUsados'>): { total: number; restantes: number } {
  const total = pontosDoVinculo(vinculo.afinidade);
  return { total, restantes: usosRestantes(total, vinculo.pontosUsados ?? 0) };
}

/** Gasta um uso (Ajuda certa, Segurar a mão, Entrar junto). Sem uso sobrando, nada muda. */
export function gastarUsoDePonto(vinculo: IVinculo, agora = Date.now()): IVinculo {
  const { restantes } = usosDoVinculo(vinculo);
  if (!ehDoGrupo(vinculo) || restantes <= 0) return vinculo;
  return { ...vinculo, pontosUsados: (vinculo.pontosUsados ?? 0) + 1, atualizadoEm: agora };
}

/** Devolve um uso marcado por engano. */
export function devolverUsoDePonto(vinculo: IVinculo, agora = Date.now()): IVinculo {
  const usados = vinculo.pontosUsados ?? 0;
  if (usados <= 0) return vinculo;
  const { pontosUsados: _antigo, ...resto } = vinculo;
  return usados - 1 > 0 ? { ...resto, pontosUsados: usados - 1, atualizadoEm: agora } : { ...resto, atualizadoEm: agora };
}

/** Muda os pontos, registrando no histórico, e corta os usos gastos ao novo teto. */
export function aplicarPontos(vinculo: IVinculo, pontos: number, motivo: string, agora = Date.now()): IVinculo {
  const atualizado = aplicarAfinidade(vinculo, afinidadeDosPontos(vinculo.afinidade, pontos), motivo, agora);
  const teto = pontosDoVinculo(atualizado.afinidade);
  if ((atualizado.pontosUsados ?? 0) <= teto) return atualizado;
  const { pontosUsados: _antigo, ...resto } = atualizado;
  return teto > 0 ? { ...resto, pontosUsados: teto } : resto;
}

/** O teste de Sanidade que a relação cobra, já pelo número de pontos, pelo
 *  laço e, quando a ficha sabe, pelo nível do personagem (ajuste de nível). */
export function sanidadeDoVinculo(vinculo: Pick<IVinculo, 'afinidade' | 'grupo' | 'laco'>, evento: 'cai' | 'perde', nivel?: number) {
  const pontos = vinculo.grupo === true ? pontosDoVinculo(vinculo.afinidade) : 0;
  return sanidadeDaRelacao(evento, pontos, { laco: !!vinculo.laco, nivel });
}

export { PONTOS_DE_RELACAO_MAXIMOS };

/** Começo de sessão: laços voltam a dar vantagem e os usos dos pontos voltam. */
export function novaSessaoNosVinculos(vinculos: IVinculo[]): IVinculo[] {
  return liberarLacos(vinculos).map((vinculo) => {
    if (!vinculo.pontosUsados) return vinculo;
    const { pontosUsados: _usados, ...resto } = vinculo;
    return resto;
  });
}

/** Uma vez por sessão: no começo da próxima, todo laço volta a dar vantagem. */
export function liberarLacos(vinculos: IVinculo[]): IVinculo[] {
  return vinculos.map((vinculo) => {
    if (!vinculo.lacoUsado) return vinculo;
    const { lacoUsado: _usado, ...resto } = vinculo;
    return resto;
  });
}

export function rotuloAfinidade(afinidade: number): string {
  const valor = limitarAfinidade(afinidade);
  if (valor >= 5) return 'Confiança total';
  if (valor >= 3) return 'Próximo';
  if (valor >= 1) return 'Amigável';
  if (valor === 0) return 'Neutro';
  if (valor >= -2) return 'Desconfiado';
  if (valor >= -4) return 'Hostil';
  return 'Inimigo declarado';
}

/** Verde para quem quer bem, dourado para neutro, vermelho para quem quer mal. */
export function corAfinidade(afinidade: number): string {
  const valor = limitarAfinidade(afinidade);
  if (valor > 0) return valor >= 3 ? '#4ade80' : '#a3e635';
  if (valor < 0) return valor <= -3 ? '#f87171' : '#fb923c';
  return '#c7a44c';
}

/**
 * Registra a nova afinidade e guarda a mudança no histórico. Se nada mudou
 * de fato, devolve o mesmo vínculo para não sujar a ficha com salvamentos.
 */
export function aplicarAfinidade(
  vinculo: IVinculo,
  nova: number,
  motivo: string,
  agora = Date.now(),
): IVinculo {
  const para = limitarAfinidade(nova);
  if (para === vinculo.afinidade) return vinculo;
  return {
    ...vinculo,
    afinidade: para,
    atualizadoEm: agora,
    historico: [
      ...vinculo.historico,
      { em: agora, de: vinculo.afinidade, para, motivo: motivo.trim().slice(0, 200) },
    ].slice(-LIMITE_HISTORICO),
  };
}

/** Fixados primeiro, depois quem tem mais afinidade (em módulo), depois nome. */
export function ordenarVinculos(vinculos: IVinculo[]): IVinculo[] {
  return [...vinculos].sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    const forca = Math.abs(b.afinidade) - Math.abs(a.afinidade);
    if (forca !== 0) return forca;
    return a.nome.localeCompare(b.nome, 'pt-BR');
  });
}

export interface IPosicaoTeia {
  id: string;
  x: number;
  y: number;
}

const ORDEM_TIPO = new Map<string, number>(TIPOS_VINCULO.map((tipo, indice) => [tipo.valor, indice]));

/**
 * Distribui os vínculos em volta do personagem. Cada tipo de relação ocupa
 * um setor do círculo (amizades juntas, rivais juntos...) e, dentro do setor,
 * quanto maior a afinidade mais perto do centro. A ordem não depende da
 * afinidade, então a teia não muda de forma quando o valor de alguém muda.
 * Com muita gente, os nós alternam um pouco de raio para os nomes não colidirem.
 */
export function posicionarTeia(vinculos: IVinculo[], raioMax: number, raioMin = raioMax * 0.38): IPosicaoTeia[] {
  const total = vinculos.length;
  if (!total) return [];
  const estavel = [...vinculos].sort((a, b) => {
    const porTipo = (ORDEM_TIPO.get(a.tipo) ?? 99) - (ORDEM_TIPO.get(b.tipo) ?? 99);
    if (porTipo !== 0) return porTipo;
    return a.criadoEm - b.criadoEm || a.id.localeCompare(b.id);
  });
  return estavel.map((vinculo, indice) => {
    const angulo = -Math.PI / 2 + (indice / total) * Math.PI * 2;
    const proximidade = (limitarAfinidade(vinculo.afinidade) - AFINIDADE_MIN) / (AFINIDADE_MAX - AFINIDADE_MIN);
    const folga = total > 10 ? (indice % 2 === 0 ? -6 : 6) : 0;
    const raio = raioMax - proximidade * (raioMax - raioMin) + folga;
    return {
      id: vinculo.id,
      x: Math.cos(angulo) * raio,
      y: Math.sin(angulo) * raio,
    };
  });
}

export interface IFiltroVinculos {
  busca: string;
  tipo: TipoVinculo | 'todos';
  faixa: 'todos' | 'proximos' | 'neutros' | 'hostis' | 'fixados' | 'grupo';
}

const semAcento = (valor: string) =>
  valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function filtrarVinculos(vinculos: IVinculo[], filtro: IFiltroVinculos): IVinculo[] {
  const termo = semAcento(filtro.busca.trim());
  return vinculos.filter((vinculo) => {
    if (filtro.tipo !== 'todos' && vinculo.tipo !== filtro.tipo) return false;
    if (filtro.faixa === 'proximos' && vinculo.afinidade <= 0) return false;
    if (filtro.faixa === 'neutros' && vinculo.afinidade !== 0) return false;
    if (filtro.faixa === 'hostis' && vinculo.afinidade >= 0) return false;
    if (filtro.faixa === 'fixados' && !vinculo.fixado) return false;
    if (filtro.faixa === 'grupo' && !ehDoGrupo(vinculo)) return false;
    return !termo || semAcento(`${vinculo.nome} ${vinculo.nota}`).includes(termo);
  });
}

export interface IGrupoVinculos {
  tipo: TipoVinculo;
  rotulo: string;
  itens: IVinculo[];
}

/** Grupos na ordem dos tipos; tipos sem ninguém não aparecem. */
export function agruparPorTipo(vinculos: IVinculo[]): IGrupoVinculos[] {
  return TIPOS_VINCULO
    .map((tipo) => ({ tipo: tipo.valor, rotulo: tipo.rotulo, itens: vinculos.filter((vinculo) => vinculo.tipo === tipo.valor) }))
    .filter((grupo) => grupo.itens.length > 0);
}

/**
 * Escolhe quem aparece na teia quando há gente demais: o vínculo selecionado
 * e os fixados primeiro, depois os de afinidade mais forte (para o bem ou
 * para o mal). `ocultos` diz quantos ficaram de fora.
 */
export function selecionarParaTeia(
  vinculos: IVinculo[],
  maximo = LIMITE_NOS_TEIA,
  selecionadoId: string | null = null,
): { visiveis: IVinculo[]; ocultos: number } {
  if (vinculos.length <= maximo) return { visiveis: vinculos, ocultos: 0 };
  const prioridade = [...vinculos].sort((a, b) => {
    const peso = (vinculo: IVinculo) => (vinculo.id === selecionadoId ? 2 : vinculo.fixado ? 1 : 0);
    const porPeso = peso(b) - peso(a);
    if (porPeso !== 0) return porPeso;
    const forca = Math.abs(b.afinidade) - Math.abs(a.afinidade);
    if (forca !== 0) return forca;
    return b.atualizadoEm - a.atualizadoEm || a.nome.localeCompare(b.nome, 'pt-BR');
  });
  const escolhidos = new Set(prioridade.slice(0, maximo).map((vinculo) => vinculo.id));
  return {
    visiveis: vinculos.filter((vinculo) => escolhidos.has(vinculo.id)),
    ocultos: vinculos.length - maximo,
  };
}

export interface IAliadoBasico {
  id?: unknown;
  nome?: unknown;
  nomeExibicao?: unknown;
}

/** Aliados da aba Aliados que ainda não viraram vínculo, para sugerir. */
export function aliadosSemVinculo(aliados: IAliadoBasico[], vinculos: IVinculo[]): { id: string; nome: string }[] {
  const ligados = new Set(vinculos.map((vinculo) => vinculo.aliadoId).filter(Boolean));
  const nomes = new Set(vinculos.map((vinculo) => vinculo.nome.toLocaleLowerCase('pt-BR')));
  return aliados
    .map((aliado) => ({
      id: typeof aliado.id === 'string' ? aliado.id : '',
      nome: typeof aliado.nome === 'string' ? aliado.nome.trim() : '',
    }))
    .filter((aliado) => aliado.id && aliado.nome && !ligados.has(aliado.id) && !nomes.has(aliado.nome.toLocaleLowerCase('pt-BR')));
}
