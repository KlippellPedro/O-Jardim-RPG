import type { ICaracteristicaRacial, IClasse, IEfeitoFichaClasse, IFichaTecnicaClasse, IHabilidadeClasse, IOpcaoHabilidadeClasse, IPoderClasse, IRaca, IUnicoJardim } from '../types/catalogo';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO, RACAS_CATALOGO, UNICOS_JARDIM_CATALOGO } from './catalogoService';
import {
  nivelMinimoTraco,
  obterEstagiosRaciaisAlcancados,
  obterTracosOpcaoRacial,
  obterGruposEscolhaRacial,
  tracoDisponivelNoNivel,
} from './racaService';
import { obterFragmentosRaciaisExpressos, obterModificacoesRaciaisInstaladas } from './calculoService';

export interface IReferenciaClasseFicha {
  classeId?: string;
  id?: string;
  nivel?: number;
}

export interface ISelecaoPoderClasse {
  classeId: string;
  poderId: string;
}

export interface IConteudoAutomatico {
  id: string;
  titulo: string;
  descricao: string;
  origem: string;
  nivel: number;
  custoMana?: number;
  custoEstamina?: number;
  subtipo?: 'habilidade' | 'escolha';
}

export interface IOpcaoHabilidadeSelecionada extends IConteudoAutomatico {
  subtipo: 'escolha';
  habilidadeTitulo: string;
  rotuloEscolha: string;
  nivelEscalonamento: number;
  efeitos: IEfeitoFichaClasse[];
}

export interface ILegadoCatalogo {
  id: string;
  titulo: string;
  descricao: string;
  pre_requisitos?: unknown[];
  repetivel?: boolean;
  limite?: number;
}

const normalizar = (valor: unknown) => String(valor ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export function classesDaFicha(ficha: any): Array<{ classe: IClasse; nivel: number }> {
  const referencias: IReferenciaClasseFicha[] = Array.isArray(ficha?.classes) && ficha.classes.length
    ? ficha.classes
    : ficha?.classeId ? [{ classeId: ficha.classeId, nivel: ficha.nivel || 1 }] : [];
  return referencias.flatMap((referencia) => {
    const classeId = String(referencia.classeId || referencia.id || '');
    const classe = CLASSES_CATALOGO.find((item) => item.id === classeId);
    if (!classe) return [];
    return [{ classe, nivel: Math.max(1, Math.min(20, Math.trunc(Number(referencia.nivel) || 1))) }];
  });
}

export function nivelTotalFicha(ficha: any): number {
  return classesDaFicha(ficha).reduce((total, item) => total + item.nivel, 0);
}

export function vagasPoderDaClasse(classe: IClasse, nivel: number): number {
  return (classe.progressao || []).reduce((total, marco) => (
    marco.nivel <= nivel
      ? total + (marco.recompensas || []).filter((recompensa) => recompensa.tipo === 'poder').length
      : total
  ), 0);
}

export interface IEscolhaHabilidadeClasse {
  /** Chave usada em `ficha.escolhasHabilidade`. */
  chave: string;
  classeId: string;
  classeTitulo: string;
  habilidadeId: string;
  habilidadeTitulo: string;
  rotulo: string;
  descricao?: string;
  vagas: number;
  repetivel: boolean;
  opcoes: IOpcaoHabilidadeClasse[];
  selecionadas: IOpcaoHabilidadeClasse[];
  /** Degrau atual da escada da habilidade, e o teto dela. Zero quando a
   * habilidade não tem escada. */
  escalonamento?: { rotulo: string; nivel: number; teto: number };
}

export function chaveEscolhaHabilidade(classeId: string, habilidadeId: string): string {
  return `${classeId}:${habilidadeId}`;
}

export function vagasEscolhaHabilidade(habilidade: IHabilidadeClasse, nivel: number): number {
  const config = habilidade.escolha_opcoes;
  if (!config || !(habilidade.opcoes || []).length) return 0;
  // `total` define quantas vagas abrem juntas, não quando elas abrem. Antes
  // esse retorno acontecia antes de conferir os níveis da habilidade e fazia
  // o Estilo de Combate do Lutador (nível 18) aparecer desde o nível 1.
  const liberada = (habilidade.niveis || []).some((marco) => marco <= nivel);
  if (!liberada) return 0;
  if (config.total) return Math.max(0, Math.trunc(config.total));
  // Vaga que não sai em todo estágio: a Rede de Negócios do Comerciante abre
  // praça nos níveis 1 e 5, e nada nos estágios seguintes.
  if (config.niveis_vaga?.length) return config.niveis_vaga.filter((marco) => marco <= nivel).length;
  const estagios = (habilidade.niveis || []).filter((marco) => marco <= nivel).length;
  return Math.max(0, estagios * Math.max(1, Math.trunc(Number(config.por_estagio) || 1)));
}

/** Degrau atual de uma habilidade com escalonamento, como as fórmulas do
 * Alquimista e as receitas do Chef. Devolve 0 para habilidade sem escada. */
export function nivelEscalonamento(habilidade: IHabilidadeClasse, nivel: number): number {
  const marcos = habilidade.escalonamento?.marcos || [];
  if (!marcos.length) return 0;
  return marcos.reduce((maior, marco) => (
    marco.nivel_classe <= nivel ? Math.max(maior, Math.trunc(marco.nivel)) : maior
  ), 0);
}

export function tetoEscalonamento(habilidade: IHabilidadeClasse): number {
  return (habilidade.escalonamento?.marcos || []).reduce((maior, marco) => Math.max(maior, Math.trunc(marco.nivel)), 0);
}

/** Ids escolhidos por habilidade, já limpos do que não existe mais no catálogo
 * e cortados nas vagas liberadas pelo nível atual. */
export function selecoesHabilidadeValidas(ficha: any): Record<string, string[]> {
  const bruto = ficha?.escolhasHabilidade;
  const guardado: Record<string, string[]> = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? bruto : {};
  const resultado: Record<string, string[]> = {};
  for (const { classe, nivel } of classesDaFicha(ficha)) {
    for (const habilidade of classe.habilidades || []) {
      const vagas = vagasEscolhaHabilidade(habilidade, nivel);
      if (!vagas) continue;
      const requisito = habilidade.requer_escolha;
      if (requisito && !(resultado[requisito.chave] || []).includes(requisito.opcao_id)) continue;
      const chave = chaveEscolhaHabilidade(classe.id, habilidade.id);
      const escolhidos = Array.isArray(guardado[chave]) ? guardado[chave] : [];
      const excluidos = new Set((habilidade.excluir_escolhas || []).flatMap((outraChave) => resultado[outraChave] || []));
      const opcoesPermitidas = (habilidade.opcoes || []).filter((opcao) => {
        const requisitoOpcao = opcao.requer_escolha;
        return !requisitoOpcao || (resultado[requisitoOpcao.chave] || []).includes(requisitoOpcao.opcao_id);
      });
      const validos = escolhidos
        .filter((id: any) => typeof id === 'string' && !excluidos.has(id) && opcoesPermitidas.some((opcao) => opcao.id === id))
        .slice(0, vagas);
      const unicos = habilidade.escolha_opcoes?.repetivel ? validos : [...new Set(validos)];
      resultado[chave] = unicos;
    }
  }
  return resultado;
}

/** Remove do documento escolhas antigas que foram gravadas antes do nível ou
 * que deixaram de existir no catálogo. Só toca no campo quando ele já existe,
 * evitando preencher fichas novas com várias listas vazias. */
export function limparSelecoesHabilidadeInvalidas<T extends Record<string, any>>(ficha: T): T {
  const bruto = ficha?.escolhasHabilidade;
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return ficha;
  const validas = selecoesHabilidadeValidas(ficha);
  const limpas = Object.fromEntries(Object.keys(bruto).flatMap((chave) => (
    Object.prototype.hasOwnProperty.call(validas, chave) ? [[chave, validas[chave]]] : []
  )));
  const chavesAtuais = Object.keys(bruto);
  const chavesLimpas = Object.keys(limpas);
  const iguais = chavesAtuais.length === chavesLimpas.length
    && chavesAtuais.every((chave) => Array.isArray(bruto[chave])
      && Array.isArray(limpas[chave])
      && bruto[chave].length === limpas[chave].length
      && bruto[chave].every((id: unknown, indice: number) => id === limpas[chave][indice]));
  return iguais ? ficha : { ...ficha, escolhasHabilidade: limpas };
}

export function escolhasHabilidadeDisponiveis(ficha: any): IEscolhaHabilidadeClasse[] {
  const selecoes = selecoesHabilidadeValidas(ficha);
  return classesDaFicha(ficha).flatMap(({ classe, nivel }) => (classe.habilidades || []).flatMap((habilidade) => {
    const requisito = habilidade.requer_escolha;
    if (requisito && !(selecoes[requisito.chave] || []).includes(requisito.opcao_id)) return [];
    const vagas = vagasEscolhaHabilidade(habilidade, nivel);
    if (!vagas) return [];
    const chave = chaveEscolhaHabilidade(classe.id, habilidade.id);
    const excluidos = new Set((habilidade.excluir_escolhas || []).flatMap((outraChave) => selecoes[outraChave] || []));
    const opcoes = (habilidade.opcoes || []).filter((opcao) => {
      const requisitoOpcao = opcao.requer_escolha;
      return !excluidos.has(opcao.id)
        && (!requisitoOpcao || (selecoes[requisitoOpcao.chave] || []).includes(requisitoOpcao.opcao_id));
    });
    return [{
      chave,
      classeId: classe.id,
      classeTitulo: classe.titulo,
      habilidadeId: habilidade.id,
      habilidadeTitulo: habilidade.titulo,
      rotulo: habilidade.escolha_opcoes?.rotulo || habilidade.titulo,
      descricao: habilidade.escolha_opcoes?.descricao,
      vagas,
      repetivel: Boolean(habilidade.escolha_opcoes?.repetivel),
      opcoes,
      selecionadas: (selecoes[chave] || []).flatMap((id) => {
        const opcao = opcoes.find((item) => item.id === id);
        return opcao ? [opcao] : [];
      }),
      escalonamento: habilidade.escalonamento && {
        rotulo: habilidade.escalonamento.rotulo,
        nivel: nivelEscalonamento(habilidade, nivel),
        teto: tetoEscalonamento(habilidade),
      },
    }];
  }));
}

export function podeEscolherOpcaoHabilidade(escolha: IEscolhaHabilidadeClasse, opcaoId: string): { permitido: boolean; motivo?: string } {
  if (escolha.selecionadas.length >= escolha.vagas) return { permitido: false, motivo: 'Todas as vagas desta habilidade já foram preenchidas.' };
  if (!escolha.repetivel && escolha.selecionadas.some((item) => item.id === opcaoId)) return { permitido: false, motivo: 'Opção já escolhida.' };
  return { permitido: true };
}

const CAMPOS_FICHA_TECNICA: Array<keyof IFichaTecnicaClasse> = ['acao', 'alcance', 'duracao', 'defesa', 'dano', 'usos'];

/** Ação, alcance, duração e companhia numa linha só, para a ficha mostrar junto
 * do texto do efeito. Vazio quando o efeito não declara nenhum deles. */
export function resumoFichaTecnica(efeito: IFichaTecnicaClasse | undefined): string {
  if (!efeito) return '';
  return CAMPOS_FICHA_TECNICA.map((campo) => efeito[campo]).filter(Boolean).join(' · ');
}

function comFichaTecnica(texto: string, efeito: IFichaTecnicaClasse): string {
  const resumo = resumoFichaTecnica(efeito);
  return resumo ? `${texto}\n${resumo}` : texto;
}

function descricaoHabilidadeNoNivel(habilidade: IHabilidadeClasse, nivel: number): string {
  const estagios = [...(habilidade.estagios || [])]
    .filter((estagio) => estagio.nivel <= nivel)
    .sort((a, b) => a.nivel - b.nivel);
  if (!estagios.length) return comFichaTecnica(habilidade.descricao || 'Consulte a descrição completa da classe.', habilidade);
  // Os estágios se somam - o personagem mantém o que ganhou nos níveis
  // anteriores, então todos os já alcançados aparecem, não só o mais recente.
  return estagios
    .map((estagio) => comFichaTecnica(
      `Nível ${estagio.nivel}${estagio.titulo ? ` - ${estagio.titulo}` : ''}: ${estagio.descricao}`,
      estagio,
    ))
    .join('\n\n');
}

/** Custo de ativação vigente no nível: o do último estágio alcançado que declara
 * um (o custo de Provocar sobe de 4 a 7 conforme os estágios), ou o da própria
 * habilidade quando ela não tem estágios. Sem custo declarado, devolve zeros. */
export function custoAtivacaoHabilidadeNoNivel(
  habilidade: IHabilidadeClasse,
  nivel: number,
): { custoMana: number; custoEstamina: number } {
  const estagios = [...(habilidade.estagios || [])]
    .filter((estagio) => estagio.nivel <= nivel)
    .sort((a, b) => a.nivel - b.nivel);
  const comCusto = [...estagios].reverse().find((estagio) => (estagio.custo_mana || 0) > 0 || (estagio.custo_estamina || 0) > 0);
  const fonte = comCusto || (estagios.length ? null : habilidade);
  return {
    custoMana: Math.max(0, Number(fonte?.custo_mana) || 0),
    custoEstamina: Math.max(0, Number(fonte?.custo_estamina) || 0),
  };
}

/** Devolve somente o marco numérico vigente. Os marcos substituem os
 * anteriores, evitando somar +5, +10, +15 e +20 como se fossem cumulativos. */
export function efeitosOpcaoHabilidadeNoNivel(
  opcao: IOpcaoHabilidadeClasse,
  nivelDaEscada: number,
): IEfeitoFichaClasse[] {
  const marco = [...(opcao.efeitos_por_nivel || [])]
    .filter((item) => Number(item.nivel) <= nivelDaEscada)
    .sort((a, b) => Number(b.nivel) - Number(a.nivel))[0];
  return marco?.efeitos || [];
}

function descricaoOpcaoHabilidadeNoNivel(
  habilidade: IHabilidadeClasse,
  opcao: IOpcaoHabilidadeClasse,
  nivelClasse: number,
): string {
  const nivelDaEscada = nivelEscalonamento(habilidade, nivelClasse);
  const progresso = nivelDaEscada > 0
    ? `${habilidade.escalonamento?.rotulo || 'Nível da opção'}: ${nivelDaEscada} de ${tetoEscalonamento(habilidade)}.`
    : '';
  const descricao = comFichaTecnica(opcao.descricao, opcao);
  return [progresso, descricao, opcao.escalonamento ? `Progressão: ${opcao.escalonamento}` : '']
    .filter(Boolean)
    .join('\n\n');
}

/** Materializa as escolhas salvas como conteúdo real da ficha. Antes elas só
 * apareciam dentro do resumo da habilidade-pai na aba Progressão. */
export function opcoesHabilidadeSelecionadas(ficha: any): IOpcaoHabilidadeSelecionada[] {
  const selecoes = selecoesHabilidadeValidas(ficha);
  return classesDaFicha(ficha).flatMap(({ classe, nivel }) => (classe.habilidades || []).flatMap((habilidade) => {
    const chave = chaveEscolhaHabilidade(classe.id, habilidade.id);
    const nivelDaEscada = nivelEscalonamento(habilidade, nivel);
    return (selecoes[chave] || []).flatMap((opcaoId, indice) => {
      const opcao = (habilidade.opcoes || []).find((item) => item.id === opcaoId);
      if (!opcao) return [];
      const marcosLiberados = (habilidade.niveis || []).filter((marco) => marco <= nivel);
      return [{
        id: `classe:${classe.id}:${habilidade.id}:opcao:${opcao.id}:${indice}`,
        titulo: opcao.titulo,
        descricao: descricaoOpcaoHabilidadeNoNivel(habilidade, opcao, nivel),
        origem: classe.titulo,
        nivel: marcosLiberados.length ? Math.max(...marcosLiberados) : nivel,
        subtipo: 'escolha' as const,
        habilidadeTitulo: habilidade.titulo,
        rotuloEscolha: habilidade.escolha_opcoes?.rotulo || habilidade.titulo,
        nivelEscalonamento: nivelDaEscada,
        // Uma escolha sem escada ainda está no degrau-base 1. A escala zero é
        // mantida só para a interface não inventar um rótulo que o catálogo não tem.
        efeitos: efeitosOpcaoHabilidadeNoNivel(opcao, Math.max(1, nivelDaEscada)),
      }];
    });
  }));
}

/** Lista o que o jogador escolheu (ou ainda tem para escolher) numa habilidade
 * com catálogo próprio, para a ficha mostrar isso junto da descrição. */
function resumoEscolhasHabilidade(habilidade: IHabilidadeClasse, nivel: number, escolhidos: string[]): string {
  const vagas = vagasEscolhaHabilidade(habilidade, nivel);
  if (!vagas) return '';
  const degrau = nivelEscalonamento(habilidade, nivel);
  const escada = degrau
    ? `

${habilidade.escalonamento?.rotulo}: ${degrau} de ${tetoEscalonamento(habilidade)}.`
    : '';
  const rotulo = habilidade.escolha_opcoes?.rotulo || 'Escolhas';
  if (!escolhidos.length) return `${escada}

${rotulo}: ${vagas} vaga${vagas > 1 ? 's' : ''} livre${vagas > 1 ? 's' : ''}. A escolha fica na aba Progressão.`;
  const titulos = escolhidos.map((id) => (habilidade.opcoes || []).find((opcao) => opcao.id === id)?.titulo).filter(Boolean);
  return `${escada}

${rotulo} (${escolhidos.length}/${vagas}): ${titulos.join(', ')}.`;
}

export function habilidadesAutomaticas(ficha: any): IConteudoAutomatico[] {
  const escolhas = selecoesHabilidadeValidas(ficha);
  const vendidasNoJardim = new Set(habilidadesVendidasJardim(ficha).map((item) => `${item.classeId}:${item.habilidadeId}`));
  const habilidades = classesDaFicha(ficha).flatMap(({ classe, nivel }) => (classe.habilidades || [])
    .filter((habilidade) => (habilidade.niveis || []).some((marco) => marco <= nivel))
    .filter((habilidade) => !vendidasNoJardim.has(`${classe.id}:${habilidade.id}`))
    .map((habilidade) => ({
      id: `classe:${classe.id}:${habilidade.id}`,
      titulo: habilidade.titulo,
      descricao: descricaoHabilidadeNoNivel(habilidade, nivel)
        + resumoEscolhasHabilidade(habilidade, nivel, escolhas[chaveEscolhaHabilidade(classe.id, habilidade.id)] || []),
      origem: classe.titulo,
      nivel: Math.max(...habilidade.niveis.filter((marco) => marco <= nivel)),
      subtipo: 'habilidade' as const,
      ...custoAtivacaoHabilidadeNoNivel(habilidade, nivel),
    })));
  return [...habilidades, ...opcoesHabilidadeSelecionadas(ficha)];
}

export function eventosDesbloqueados(ficha: any): IConteudoAutomatico[] {
  return classesDaFicha(ficha).flatMap(({ classe, nivel }) => (classe.eventos || [])
    .filter((evento) => (evento.niveis || []).some((marco) => marco <= nivel))
    .map((evento) => ({
      id: `evento:${classe.id}:${evento.id}`,
      titulo: evento.titulo,
      descricao: evento.descricao,
      origem: classe.titulo,
      nivel: Math.max(...evento.niveis.filter((marco) => marco <= nivel)),
    })));
}

export function caracteristicasRaciaisAutomaticas(ficha: any): IConteudoAutomatico[] {
  const raca: IRaca | undefined = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId);
  if (!raca) return [];
  const nivel = nivelTotalFicha(ficha);
  const tracos: ICaracteristicaRacial[] = [...(raca.caracteristicas || [])];
  for (const grupo of obterGruposEscolhaRacial(raca)) {
    const opcao = grupo.opcoes.find((item) => item.id === ficha?.escolhaRacial?.[grupo.campo]);
    if (opcao) tracos.push(...obterTracosOpcaoRacial(opcao));
  }
  // Estágios raciais (Espírito Menor/Maior/Primordial) entram conforme o nível
  // total alcançado, junto dos traços da Cor que destravam no mesmo degrau.
  for (const estagio of obterEstagiosRaciaisAlcancados(raca, nivel)) {
    tracos.push(...(estagio.caracteristicas || []));
  }
  tracos.push(...obterFragmentosRaciaisExpressos(raca, ficha?.escolhaRacial).map((item: any) => ({
    ...item,
    titulo: `Fragmento: ${item.titulo}`,
  })));
  tracos.push(...obterModificacoesRaciaisInstaladas(raca, ficha?.escolhaRacial, nivel).map((item: any) => ({
    ...item,
    titulo: `Modificação: ${item.titulo}`,
  })));
  return tracos
    .filter((traco) => tracoDisponivelNoNivel(traco, nivel))
    .map((traco) => ({
      id: `raca:${raca.id}:${traco.id}`,
      titulo: traco.titulo,
      descricao: traco.descricao || 'Característica racial registrada no catálogo oficial.',
      origem: raca.titulo,
      nivel: nivelMinimoTraco(traco),
    }));
}

export function selecoesPoderValidas(ficha: any): ISelecaoPoderClasse[] {
  const bruto = Array.isArray(ficha?.poderesClasseSelecionados) ? ficha.poderesClasseSelecionados : [];
  return bruto.filter((item: any) => item && typeof item.classeId === 'string' && typeof item.poderId === 'string');
}

export function poderesSelecionados(ficha: any): IConteudoAutomatico[] {
  const classes = new Map(classesDaFicha(ficha).map((item) => [item.classe.id, item]));
  return selecoesPoderValidas(ficha).flatMap((selecao) => {
    const referencia = classes.get(selecao.classeId);
    const poder = referencia?.classe.poderes?.find((item) => item.id === selecao.poderId);
    if (!referencia || !poder) return [];
    return [{
      id: `poder:${referencia.classe.id}:${poder.id}`,
      titulo: poder.titulo,
      descricao: comFichaTecnica(poder.descricao, poder),
      origem: referencia.classe.titulo,
      nivel: referencia.nivel,
      custoMana: Math.max(0, Number(poder.custo_mana) || 0),
      custoEstamina: Math.max(0, Number(poder.custo_estamina) || 0),
    }];
  });
}

/** Nível usado como referência de preço no Jardim. O catálogo não guarda um
 * nível fixo por poder (a vaga é livre, ver `vagasPoderDaClasse`), então lemos
 * o primeiro "Nível N" citado nos pré-requisitos; sem isso, assume o nível da
 * primeira vaga de poder mais comum entre as classes (2). */
export function nivelEstimadoPoder(poder: IPoderClasse): number {
  for (const requisito of poder.pre_requisitos || []) {
    const encontrado = String(requisito).match(/n[ií]vel\s+(\d+)/i);
    if (encontrado) return Math.max(1, Math.min(20, Number(encontrado[1])));
  }
  return 2;
}

const JARDIM_SEMENTES_BASE = 10;
const JARDIM_SEMENTES_POR_NIVEL = 4;
const JARDIM_MARKUP_COMPRA = 1.5;

/** Classes "esquecida" (Campeão Dimensional, Devorador, Invocador...) custam
 * bem mais no Jardim que classes "padrao". x10 foi calibrado simulando o
 * catálogo inteiro (ver tests/frontend/jardimEconomia.test.ts): é o menor
 * multiplicador redondo em que nem o cenário "vende a habilidade principal
 * inteira + os dois poderes mais caros" de nenhuma classe padrao (o pior caso
 * é o Guerreiro) cobre o item esquecida mais barato do jogo inteiro - só
 * liquidar o kit padrao completo consegue, e mesmo assim só os mais baratos. */
const JARDIM_MULTIPLICADOR_CATEGORIA: Record<string, number> = {
  padrao: 1,
  esquecida: 10,
};

function multiplicadorDeClasse(classe: IClasse): number {
  return JARDIM_MULTIPLICADOR_CATEGORIA[classe.categoria || 'padrao'] ?? 1;
}

/** Sementes recebidas ao podar (vender) um poder do Jardim. */
export function sementesPorVenderPoder(poder: IPoderClasse, classe: IClasse): number {
  const base = JARDIM_SEMENTES_BASE + nivelEstimadoPoder(poder) * JARDIM_SEMENTES_POR_NIVEL;
  return Math.round(base * multiplicadorDeClasse(classe));
}

/** Sementes cobradas para plantar (comprar) um poder de outra classe. Um
 * pouco mais caro que a venda para não virar uma troca sem custo. */
export function sementesPorComprarPoder(poder: IPoderClasse, classe: IClasse): number {
  return Math.ceil((sementesPorVenderPoder(poder, classe) * JARDIM_MARKUP_COMPRA) / 5) * 5;
}

/** Poderes de outras classes que o personagem já plantou no Jardim. */
export function poderesComprasJardim(ficha: any): ISelecaoPoderClasse[] {
  const bruto = Array.isArray(ficha?.jardim?.comprados) ? ficha.jardim.comprados : [];
  return bruto.filter((item: any) => item && typeof item.classeId === 'string' && typeof item.poderId === 'string');
}

/** Resolve os poderes comprados no Jardim contra o catálogo completo (não só
 * as classes que o personagem tem), com a origem para exibir na ficha. */
export function poderesJardimSelecionados(ficha: any): IConteudoAutomatico[] {
  const classesProprias = new Set(classesDaFicha(ficha).map((item) => item.classe.id));
  return poderesComprasJardim(ficha).flatMap((selecao) => {
    if (classesProprias.has(selecao.classeId)) return [];
    const classe = CLASSES_CATALOGO.find((item) => item.id === selecao.classeId);
    const poder = classe?.poderes?.find((item) => item.id === selecao.poderId);
    if (!classe || !poder) return [];
    return [{
      id: `jardim:${classe.id}:${poder.id}`,
      titulo: poder.titulo,
      descricao: comFichaTecnica(poder.descricao, poder),
      origem: classe.titulo,
      nivel: nivelEstimadoPoder(poder),
      custoMana: Math.max(0, Number(poder.custo_mana) || 0),
      custoEstamina: Math.max(0, Number(poder.custo_estamina) || 0),
    }];
  });
}

export interface IPoderCatalogoJardim {
  classeId: string;
  classeTitulo: string;
  categoriaClasse?: string;
  poder: IPoderClasse;
  custoSementes: number;
  jaAdquirido: boolean;
}

/** Catálogo de poderes disponíveis para comprar no Jardim: todo poder de
 * classe que o personagem não tem hoje (classes que não são as dele). */
export function catalogoJardimDisponivel(ficha: any): IPoderCatalogoJardim[] {
  const classesProprias = new Set(classesDaFicha(ficha).map((item) => item.classe.id));
  const jaComprados = new Set(poderesComprasJardim(ficha).map((item) => `${item.classeId}:${item.poderId}`));
  return CLASSES_CATALOGO
    .filter((classe) => !classesProprias.has(classe.id))
    .flatMap((classe) => (classe.poderes || []).map((poder) => ({
      classeId: classe.id,
      classeTitulo: classe.titulo,
      categoriaClasse: classe.categoria,
      poder,
      custoSementes: sementesPorComprarPoder(poder, classe),
      jaAdquirido: jaComprados.has(`${classe.id}:${poder.id}`),
    })));
}

export interface IPoderVendavelJardim {
  indice: number;
  classeId: string;
  poderId: string;
  titulo: string;
  origem: string;
  origemTipo: 'classe' | 'jardim';
  custoMana: number;
  custoEstamina: number;
  sementesRecebidas: number;
}

/** Tudo que o personagem pode podar hoje: poderes escolhidos da própria
 * classe e poderes plantados no Jardim vindos de outras classes. O índice
 * identifica a ocorrência exata (poderes repetíveis podem aparecer mais de
 * uma vez) para a venda remover só aquela entrada. */
export function poderesVendaveisJardim(ficha: any): IPoderVendavelJardim[] {
  const classes = new Map(classesDaFicha(ficha).map((item) => [item.classe.id, item]));
  const proprios = selecoesPoderValidas(ficha).map((selecao, indice): IPoderVendavelJardim | null => {
    const referencia = classes.get(selecao.classeId);
    const poder = referencia?.classe.poderes?.find((item) => item.id === selecao.poderId);
    if (!referencia || !poder) return null;
    return {
      indice,
      classeId: selecao.classeId,
      poderId: selecao.poderId,
      titulo: poder.titulo,
      origem: referencia.classe.titulo,
      origemTipo: 'classe',
      custoMana: Math.max(0, Number(poder.custo_mana) || 0),
      custoEstamina: Math.max(0, Number(poder.custo_estamina) || 0),
      sementesRecebidas: sementesPorVenderPoder(poder, referencia.classe),
    };
  }).filter((item): item is IPoderVendavelJardim => item !== null);
  const doJardim = poderesComprasJardim(ficha).map((selecao, indice): IPoderVendavelJardim | null => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === selecao.classeId);
    const poder = classe?.poderes?.find((item) => item.id === selecao.poderId);
    if (!classe || !poder) return null;
    return {
      indice,
      classeId: selecao.classeId,
      poderId: selecao.poderId,
      titulo: poder.titulo,
      origem: classe.titulo,
      origemTipo: 'jardim',
      custoMana: Math.max(0, Number(poder.custo_mana) || 0),
      custoEstamina: Math.max(0, Number(poder.custo_estamina) || 0),
      sementesRecebidas: sementesPorVenderPoder(poder, classe),
    };
  }).filter((item): item is IPoderVendavelJardim => item !== null);
  return [...proprios, ...doJardim];
}

/** Remove a ocorrência `indice` de `poderesClasseSelecionados` (venda de um
 * poder da própria classe: a vaga volta a ficar livre para escolher outro). */
export function venderPoderDeClasseNoJardim(ficha: any, indice: number): ISelecaoPoderClasse[] | null {
  const atuais = selecoesPoderValidas(ficha);
  if (indice < 0 || indice >= atuais.length) return null;
  return [...atuais.slice(0, indice), ...atuais.slice(indice + 1)];
}

/** Remove a ocorrência `indice` de `jardim.comprados` (venda de um poder que
 * tinha sido plantado a partir de outra classe). */
export function venderPoderDoJardim(ficha: any, indice: number): ISelecaoPoderClasse[] | null {
  const atuais = poderesComprasJardim(ficha);
  if (indice < 0 || indice >= atuais.length) return null;
  return [...atuais.slice(0, indice), ...atuais.slice(indice + 1)];
}

/** Planta um poder de outra classe no Jardim. Devolve null se o personagem já
 * tem aquele poder plantado (compra não é cumulativa). */
export function comprarPoderNoJardim(ficha: any, alvo: { classeId: string; poderId: string }): ISelecaoPoderClasse[] | null {
  const atuais = poderesComprasJardim(ficha);
  if (atuais.some((item) => item.classeId === alvo.classeId && item.poderId === alvo.poderId)) return null;
  return [...atuais, { classeId: alvo.classeId, poderId: alvo.poderId }];
}

export interface ISelecaoHabilidadeJardim {
  classeId: string;
  habilidadeId: string;
}

/** Quantos estágios da escada (ex.: Implacável 1/5/10/15/20) já foram
 * alcançados num dado nível de referência. */
function estagiosAlcancadosHabilidade(habilidade: IHabilidadeClasse, nivelReferencia: number): number {
  return (habilidade.niveis || []).filter((marco) => marco <= nivelReferencia).length;
}

const JARDIM_SEMENTES_HABILIDADE_BASE = 20;
const JARDIM_SEMENTES_HABILIDADE_POR_ESTAGIO = 15;

/** Sementes por podar uma habilidade em escada: o preço soma todos os
 * estágios que o personagem já alcançou, porque vender tira a escada
 * inteira, não um estágio isolado - não dá pra manter o estágio 3 e vender
 * só o 1. Vender no nível 15 rende mais que vender no nível 1 porque há mais
 * estágio embutido na mesma venda. Habilidade de classe esquecida também leva
 * o multiplicador de tier, pelo mesmo motivo dos poderes. */
export function sementesPorVenderHabilidade(habilidade: IHabilidadeClasse, nivelReferencia: number, classe: IClasse): number {
  const estagios = Math.max(1, estagiosAlcancadosHabilidade(habilidade, nivelReferencia));
  const base = JARDIM_SEMENTES_HABILIDADE_BASE + (estagios - 1) * JARDIM_SEMENTES_HABILIDADE_POR_ESTAGIO;
  return Math.round(base * multiplicadorDeClasse(classe));
}

/** Sementes por plantar uma habilidade em escada. Comprar também é tudo ou
 * nada: o personagem recebe de uma vez todos os estágios que o próprio nível
 * total já alcançaria, nunca um estágio maior que o seu nível permite. */
export function sementesPorComprarHabilidade(habilidade: IHabilidadeClasse, nivelReferencia: number, classe: IClasse): number {
  return Math.ceil((sementesPorVenderHabilidade(habilidade, nivelReferencia, classe) * JARDIM_MARKUP_COMPRA) / 5) * 5;
}

/** Só habilidades "simples" entram no Jardim: as que têm catálogo de escolha
 * próprio (Engenhocas do Engenheiro) ou dependem de outra escolha guardam
 * estado em `ficha.escolhasHabilidade` que não faz sentido transplantar entre
 * classes, então ficam de fora por enquanto. */
function habilidadeElegivelParaJardim(habilidade: IHabilidadeClasse): boolean {
  return !habilidade.escolha_opcoes && !habilidade.requer_escolha;
}

export function habilidadesVendidasJardim(ficha: any): ISelecaoHabilidadeJardim[] {
  const bruto = Array.isArray(ficha?.jardim?.habilidadesVendidas) ? ficha.jardim.habilidadesVendidas : [];
  return bruto.filter((item: any) => item && typeof item.classeId === 'string' && typeof item.habilidadeId === 'string');
}

export function habilidadesCompradasJardim(ficha: any): ISelecaoHabilidadeJardim[] {
  const bruto = Array.isArray(ficha?.jardim?.habilidadesCompradas) ? ficha.jardim.habilidadesCompradas : [];
  return bruto.filter((item: any) => item && typeof item.classeId === 'string' && typeof item.habilidadeId === 'string');
}

/** Habilidades plantadas no Jardim (da própria classe recomprada ou de outra
 * classe), resolvidas contra o catálogo completo e escaladas pelo nível total
 * atual do personagem - por isso continuam ganhando estágio novo sozinhas se
 * o personagem subir de nível depois de plantada. */
export function habilidadesJardimSelecionadas(ficha: any): IConteudoAutomatico[] {
  const nivel = nivelTotalFicha(ficha);
  return habilidadesCompradasJardim(ficha).flatMap((selecao) => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === selecao.classeId);
    const habilidade = classe?.habilidades?.find((item) => item.id === selecao.habilidadeId);
    if (!classe || !habilidade || !habilidadeElegivelParaJardim(habilidade)) return [];
    const estagios = estagiosAlcancadosHabilidade(habilidade, nivel);
    if (!estagios) return [];
    return [{
      id: `jardim-habilidade:${classe.id}:${habilidade.id}`,
      titulo: habilidade.titulo,
      descricao: descricaoHabilidadeNoNivel(habilidade, nivel),
      origem: classe.titulo,
      nivel: Math.max(...habilidade.niveis.filter((marco) => marco <= nivel)),
      subtipo: 'habilidade' as const,
      ...custoAtivacaoHabilidadeNoNivel(habilidade, nivel),
    }];
  });
}

export interface IHabilidadeCatalogoJardim {
  classeId: string;
  classeTitulo: string;
  categoriaClasse?: string;
  habilidade: IHabilidadeClasse;
  custoSementes: number;
  estagiosNoNivelAtual: number;
  /** Texto completo, estágio a estágio, do que o personagem recebe ao
   * plantar agora - não é só a descrição genérica do catálogo (que costuma
   * ser uma linha tipo "cada estágio soma ao anterior"). */
  descricaoNoNivelAtual: string;
  jaAdquirida: boolean;
}

/** Catálogo de habilidades plantáveis: da própria classe, só entra se já foi
 * vendida (senão o personagem já tem ela de graça); de outra classe, sempre
 * pode - mas em ambos os casos só aparece se o nível total do personagem já
 * alcançou o primeiro estágio da escada. Não dá pra plantar uma habilidade
 * "de nível 5" estando no nível 1: o próprio catálogo já filtra isso fora. */
export function catalogoJardimHabilidadesDisponivel(ficha: any): IHabilidadeCatalogoJardim[] {
  const nivel = nivelTotalFicha(ficha);
  const classesProprias = new Set(classesDaFicha(ficha).map((item) => item.classe.id));
  const vendidas = new Set(habilidadesVendidasJardim(ficha).map((item) => `${item.classeId}:${item.habilidadeId}`));
  const jaCompradas = new Set(habilidadesCompradasJardim(ficha).map((item) => `${item.classeId}:${item.habilidadeId}`));
  return CLASSES_CATALOGO.flatMap((classe) => (classe.habilidades || [])
    .filter((habilidade) => habilidadeElegivelParaJardim(habilidade))
    .filter((habilidade) => {
      const propria = classesProprias.has(classe.id);
      return !propria || vendidas.has(`${classe.id}:${habilidade.id}`);
    })
    .map((habilidade) => ({
      classeId: classe.id,
      classeTitulo: classe.titulo,
      categoriaClasse: classe.categoria,
      habilidade,
      custoSementes: sementesPorComprarHabilidade(habilidade, nivel, classe),
      estagiosNoNivelAtual: estagiosAlcancadosHabilidade(habilidade, nivel),
      descricaoNoNivelAtual: descricaoHabilidadeNoNivel(habilidade, nivel),
      jaAdquirida: jaCompradas.has(`${classe.id}:${habilidade.id}`),
    }))
    .filter((item) => item.estagiosNoNivelAtual > 0));
}

export interface IHabilidadeVendavelJardim {
  classeId: string;
  habilidadeId: string;
  titulo: string;
  origem: string;
  origemTipo: 'classe' | 'jardim';
  estagiosAlcancados: number;
  sementesRecebidas: number;
  /** Texto completo, estágio a estágio, do que o personagem perde ao podar. */
  descricaoAtual: string;
}

/** Tudo que o personagem pode podar hoje: a habilidade principal da própria
 * classe (inteira, todos os estágios já alcançados) e habilidades plantadas
 * no Jardim vindas de outra classe. */
export function habilidadesVendaveisJardim(ficha: any): IHabilidadeVendavelJardim[] {
  const nivel = nivelTotalFicha(ficha);
  const vendidas = new Set(habilidadesVendidasJardim(ficha).map((item) => `${item.classeId}:${item.habilidadeId}`));
  const proprias = classesDaFicha(ficha).flatMap(({ classe, nivel: nivelClasse }) => (classe.habilidades || [])
    .filter((habilidade) => habilidadeElegivelParaJardim(habilidade))
    .filter((habilidade) => (habilidade.niveis || []).some((marco) => marco <= nivelClasse))
    .filter((habilidade) => !vendidas.has(`${classe.id}:${habilidade.id}`))
    .map((habilidade): IHabilidadeVendavelJardim => ({
      classeId: classe.id,
      habilidadeId: habilidade.id,
      titulo: habilidade.titulo,
      origem: classe.titulo,
      origemTipo: 'classe',
      estagiosAlcancados: estagiosAlcancadosHabilidade(habilidade, nivel),
      sementesRecebidas: sementesPorVenderHabilidade(habilidade, nivel, classe),
      descricaoAtual: descricaoHabilidadeNoNivel(habilidade, nivel),
    })));
  const doJardim = habilidadesCompradasJardim(ficha).flatMap((selecao): IHabilidadeVendavelJardim[] => {
    const classe = CLASSES_CATALOGO.find((item) => item.id === selecao.classeId);
    const habilidade = classe?.habilidades?.find((item) => item.id === selecao.habilidadeId);
    if (!classe || !habilidade) return [];
    return [{
      classeId: classe.id,
      habilidadeId: habilidade.id,
      titulo: habilidade.titulo,
      origem: classe.titulo,
      origemTipo: 'jardim',
      estagiosAlcancados: estagiosAlcancadosHabilidade(habilidade, nivel),
      sementesRecebidas: sementesPorVenderHabilidade(habilidade, nivel, classe),
      descricaoAtual: descricaoHabilidadeNoNivel(habilidade, nivel),
    }];
  });
  return [...proprias, ...doJardim];
}

/** Poda a habilidade principal da própria classe: sai inteira (todos os
 * estágios), e a classe não volta a concedê-la sozinha subindo de nível. */
export function venderHabilidadeDeClasseNoJardim(ficha: any, alvo: { classeId: string; habilidadeId: string }): ISelecaoHabilidadeJardim[] | null {
  const atuais = habilidadesVendidasJardim(ficha);
  if (atuais.some((item) => item.classeId === alvo.classeId && item.habilidadeId === alvo.habilidadeId)) return null;
  return [...atuais, { classeId: alvo.classeId, habilidadeId: alvo.habilidadeId }];
}

/** Poda uma habilidade que tinha sido plantada a partir de outra classe. */
export function venderHabilidadeDoJardim(ficha: any, alvo: { classeId: string; habilidadeId: string }): ISelecaoHabilidadeJardim[] | null {
  const atuais = habilidadesCompradasJardim(ficha);
  const indice = atuais.findIndex((item) => item.classeId === alvo.classeId && item.habilidadeId === alvo.habilidadeId);
  if (indice === -1) return null;
  return [...atuais.slice(0, indice), ...atuais.slice(indice + 1)];
}

/** Planta uma habilidade (da própria classe vendida antes, ou de outra
 * classe) inteira, no estágio que o nível total atual já alcança. */
export function comprarHabilidadeNoJardim(ficha: any, alvo: { classeId: string; habilidadeId: string }): ISelecaoHabilidadeJardim[] | null {
  const atuais = habilidadesCompradasJardim(ficha);
  if (atuais.some((item) => item.classeId === alvo.classeId && item.habilidadeId === alvo.habilidadeId)) return null;
  return [...atuais, { classeId: alvo.classeId, habilidadeId: alvo.habilidadeId }];
}

/** Sementes recebidas ao podar um Único de volta. O preço de compra do
 * catálogo já é o valor final (não depende de classe nem nível); a venda
 * volta um pouco menor, na mesma proporção do markup dos poderes e
 * habilidades, pra manter a regra de que comprar e vender de volta sempre dá
 * prejuízo em qualquer canto do Jardim. */
export function sementesPorVenderUnico(unico: IUnicoJardim): number {
  return Math.floor(unico.custoSementes / JARDIM_MARKUP_COMPRA / 5) * 5;
}

export function unicosComprasJardim(ficha: any): string[] {
  const bruto = Array.isArray(ficha?.jardim?.unicosComprados) ? ficha.jardim.unicosComprados : [];
  return bruto.filter((id: any) => typeof id === 'string');
}

/** Únicos que o personagem já plantou, resolvidos contra o catálogo. Não têm
 * classe de origem nem nível: uma vez plantados, são seus, ponto final. */
export function unicosJardimSelecionados(ficha: any): IConteudoAutomatico[] {
  return unicosComprasJardim(ficha).flatMap((id) => {
    const unico = UNICOS_JARDIM_CATALOGO.find((item) => item.id === id);
    if (!unico) return [];
    return [{
      id: `jardim-unico:${unico.id}`,
      titulo: unico.titulo,
      descricao: comFichaTecnica(unico.descricao, unico),
      origem: 'Jardim',
      nivel: 0,
      custoMana: Math.max(0, Number(unico.custo_mana) || 0),
      custoEstamina: Math.max(0, Number(unico.custo_estamina) || 0),
    }];
  });
}

/** Catálogo de Únicos disponíveis pra plantar: tudo que ainda não foi
 * comprado. Sem filtro de classe ou de nível - são acessíveis a qualquer
 * personagem, o que trava o acesso é só o preço em Sementes. */
export function catalogoJardimUnicosDisponivel(ficha: any): Array<{ unico: IUnicoJardim; jaAdquirido: boolean }> {
  const jaComprados = new Set(unicosComprasJardim(ficha));
  return UNICOS_JARDIM_CATALOGO.map((unico) => ({
    unico,
    jaAdquirido: jaComprados.has(unico.id),
  }));
}

export interface IUnicoVendavelJardim {
  id: string;
  titulo: string;
  tipo: string;
  tier: string;
  sementesRecebidas: number;
}

export function unicosVendaveisJardim(ficha: any): IUnicoVendavelJardim[] {
  return unicosComprasJardim(ficha).flatMap((id) => {
    const unico = UNICOS_JARDIM_CATALOGO.find((item) => item.id === id);
    if (!unico) return [];
    return [{
      id: unico.id,
      titulo: unico.titulo,
      tipo: unico.tipo,
      tier: unico.tier,
      sementesRecebidas: sementesPorVenderUnico(unico),
    }];
  });
}

/** Poda um Único plantado. */
export function venderUnicoNoJardim(ficha: any, id: string): string[] | null {
  const atuais = unicosComprasJardim(ficha);
  const indice = atuais.indexOf(id);
  if (indice === -1) return null;
  return [...atuais.slice(0, indice), ...atuais.slice(indice + 1)];
}

/** Planta um Único novo. Não é cumulativo: só pode ter um de cada. */
export function comprarUnicoNoJardim(ficha: any, id: string): string[] | null {
  const atuais = unicosComprasJardim(ficha);
  if (atuais.includes(id)) return null;
  return [...atuais, id];
}

export function podeSelecionarPoder(
  poder: IPoderClasse,
  classe: IClasse,
  nivel: number,
  selecoes: ISelecaoPoderClasse[],
  ficha: any = {},
): { permitido: boolean; motivo?: string } {
  const daClasse = selecoes.filter((item) => item.classeId === classe.id);
  const repeticoes = daClasse.filter((item) => item.poderId === poder.id).length;
  if (daClasse.length >= vagasPoderDaClasse(classe, nivel)) return { permitido: false, motivo: 'Todas as vagas desta classe já foram preenchidas.' };
  const limite = poder.repetivel ? Math.max(1, Number(poder.limite) || 99) : 1;
  if (repeticoes >= limite) return { permitido: false, motivo: poder.repetivel ? `Limite ${limite}.` : 'Poder já escolhido.' };
  for (const requisito of poder.pre_requisitos || []) {
    const encontrado = String(requisito).match(/n[ií]vel\s+(\d+)(?:\s+de\s+(.+))?/i);
    if (encontrado) {
      const minimo = Number(encontrado[1]);
      const nomeClasse = normalizar(encontrado[2] || classe.titulo);
      const corresponde = normalizar(classe.titulo) === nomeClasse || normalizar(classe.id) === nomeClasse;
      if (corresponde && nivel < minimo) return { permitido: false, motivo: String(requisito) };
      continue;
    }
    const atributo = String(requisito).match(/^(for[cç]a|destreza|constitui[cç][aã]o|intelig[eê]ncia|sabedoria|carisma|fluxo)\s+(\d+)$/i);
    if (atributo) {
      if ((Number(ficha?.atributosFinais?.[normalizar(atributo[1])]) || 0) < Number(atributo[2])) return { permitido: false, motivo: String(requisito) };
      continue;
    }
    const estagio = String(requisito).match(/^(.+?)\s+(\d+)$/);
    if (estagio) {
      const habilidade = (classe.habilidades || []).find((item) => normalizar(item.titulo) === normalizar(estagio[1]));
      const liberados = habilidade?.niveis?.filter((marco) => marco <= nivel).length || 0;
      if (!habilidade || liberados < Number(estagio[2])) return { permitido: false, motivo: String(requisito) };
      continue;
    }
    const poderExigido = (classe.poderes || []).find((item) => normalizar(item.titulo) === normalizar(requisito));
    if (!poderExigido || !daClasse.some((item) => item.poderId === poderExigido.id)) return { permitido: false, motivo: String(requisito) };
  }
  return { permitido: true };
}

export function vagasLegado(ficha: any): number {
  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId);
  return Math.floor(nivelTotalFicha(ficha) / 5) + Math.max(0, Number(raca?.legados_adicionais) || 0);
}

function grauPericia(ficha: any, id: string): number {
  const ordem = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'];
  return ordem.indexOf(normalizar(ficha?.pericias?.[id]));
}

const NOMES_ATRIBUTOS: Record<string, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

const NOMES_GRAUS_PERICIA: Record<string, string> = {
  iniciante: 'Iniciante',
  aprendiz: 'Aprendiz',
  treinado: 'Treinado',
  especialista: 'Especialista',
  mestre: 'Mestre',
  veterano: 'Veterano',
  renomado: 'Renomado',
};

export function descreverRequisito(requisito: any): string {
  if (!requisito || typeof requisito !== 'object') return '';
  if (Array.isArray(requisito.ou)) return requisito.ou.map(descreverRequisito).filter(Boolean).join(' ou ');
  if (requisito.nivel_personagem) return `Nível de personagem ${requisito.nivel_personagem}+`;
  if (requisito.atributo) {
    const nome = NOMES_ATRIBUTOS[normalizar(requisito.atributo)] || requisito.atributo;
    return `${nome} ${requisito.valor_minimo || 0}+`;
  }
  if (requisito.pericia) {
    const nomeGrau = NOMES_GRAUS_PERICIA[normalizar(requisito.nivel)] || requisito.nivel;
    const nomePericia = String(requisito.pericia).charAt(0).toUpperCase() + String(requisito.pericia).slice(1);
    return `${nomePericia} (${nomeGrau})`;
  }
  return '';
}

export function descreverPreRequisitos(pre_requisitos?: unknown[]): string[] {
  return (pre_requisitos || []).map(descreverRequisito).filter(Boolean);
}

function atendeRequisito(requisito: any, ficha: any): boolean {
  if (!requisito || typeof requisito !== 'object') return true;
  if (Array.isArray(requisito.ou)) return requisito.ou.some((item: any) => atendeRequisito(item, ficha));
  if (requisito.nivel_personagem && nivelTotalFicha(ficha) < Number(requisito.nivel_personagem)) return false;
  if (requisito.atributo) {
    const atual = Number(ficha?.atributosFinais?.[normalizar(requisito.atributo)]) || 0;
    if (atual < Number(requisito.valor_minimo || 0)) return false;
  }
  if (requisito.pericia) {
    const exigido = grauPericia({ pericias: { [requisito.pericia]: requisito.nivel } }, requisito.pericia);
    if (grauPericia(ficha, requisito.pericia) < exigido) return false;
  }
  return true;
}

export function avaliarLegado(legado: ILegadoCatalogo, ficha: any, selecionados: string[]): { permitido: boolean; motivo?: string } {
  if (selecionados.length >= vagasLegado(ficha)) return { permitido: false, motivo: 'Todas as vagas de Legado já foram preenchidas.' };
  const repeticoes = selecionados.filter((id) => id === legado.id).length;
  const limite = legado.repetivel ? Math.max(1, Number(legado.limite) || 2) : 1;
  if (repeticoes >= limite) return { permitido: false, motivo: legado.repetivel ? `Limite ${limite}.` : 'Legado já escolhido.' };
  if (!(legado.pre_requisitos || []).every((requisito) => atendeRequisito(requisito, ficha))) {
    return { permitido: false, motivo: 'Pré-requisitos ainda não atendidos.' };
  }
  return { permitido: true };
}

export function legadosSelecionados(ficha: any): ILegadoCatalogo[] {
  const ids: string[] = Array.isArray(ficha?.legadosSelecionados) ? ficha.legadosSelecionados : [];
  return ids.flatMap((id) => {
    const legado = (LEGADOS_CATALOGO as ILegadoCatalogo[]).find((item) => item.id === id);
    return legado ? [legado] : [];
  });
}

export interface IPendenciaProgressao {
  id: string;
  titulo: string;
  descricao: string;
  quantidade: number;
}

/** Levanta escolhas que a ficha já liberou (por nível/raça/classe) mas o
 * jogador ainda não fez - usado pelo sino de notificação da ficha, pra quem
 * some por umas sessões não perder Legado, poder ou habilidade de escolha. */
export function pendenciasProgressao(ficha: any): IPendenciaProgressao[] {
  const pendencias: IPendenciaProgressao[] = [];

  const vagasLegados = vagasLegado(ficha);
  const idsLegados: string[] = Array.isArray(ficha?.legadosSelecionados) ? ficha.legadosSelecionados : [];
  const legadosLivres = vagasLegados - idsLegados.length;
  if (legadosLivres > 0) {
    pendencias.push({
      id: 'legados',
      titulo: legadosLivres === 1 ? '1 Legado disponível' : `${legadosLivres} Legados disponíveis`,
      descricao: 'Você já tem vaga para escolher um Legado de Ascensão.',
      quantidade: legadosLivres,
    });
  }

  const selecoesPoder = selecoesPoderValidas(ficha);
  for (const { classe, nivel } of classesDaFicha(ficha)) {
    const vagas = vagasPoderDaClasse(classe, nivel);
    const escolhidos = selecoesPoder.filter((item) => item.classeId === classe.id).length;
    const livres = vagas - escolhidos;
    if (livres > 0) {
      pendencias.push({
        id: `poder:${classe.id}`,
        titulo: livres === 1 ? `1 poder de ${classe.titulo}` : `${livres} poderes de ${classe.titulo}`,
        descricao: `${classe.titulo} liberou vaga de poder de classe para escolher.`,
        quantidade: livres,
      });
    }
  }

  for (const escolha of escolhasHabilidadeDisponiveis(ficha)) {
    const livres = escolha.vagas - escolha.selecionadas.length;
    if (livres > 0) {
      pendencias.push({
        id: `escolha:${escolha.chave}`,
        titulo: livres === 1 ? `1 escolha em ${escolha.rotulo}` : `${livres} escolhas em ${escolha.rotulo}`,
        descricao: `${escolha.classeTitulo} · ${escolha.habilidadeTitulo} tem opção para escolher.`,
        quantidade: livres,
      });
    }
  }

  const raca = RACAS_CATALOGO.find((item) => item.id === ficha?.racaId);
  const configuracaoAtributos = raca?.escolha_atributos;
  if (configuracaoAtributos) {
    const campo = String(configuracaoAtributos.campo || 'atributosRaciais');
    const total = Math.max(0, Math.trunc(Number(configuracaoAtributos.total) || 0));
    const escolhidos = Array.isArray(ficha?.escolhaRacial?.[campo]) ? ficha.escolhaRacial[campo].length : 0;
    const livres = total - escolhidos;
    if (livres > 0) {
      pendencias.push({
        id: 'atributos-raciais',
        titulo: livres === 1 ? '1 aumento de atributo' : `${livres} aumentos de atributo`,
        descricao: `${(configuracaoAtributos as any).titulo || raca?.titulo || 'Sua raça'} ainda tem bônus de atributo para escolher.`,
        quantidade: livres,
      });
    }
  }

  return pendencias;
}
