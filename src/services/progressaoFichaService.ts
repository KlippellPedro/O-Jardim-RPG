import type { ICaracteristicaRacial, IClasse, IEfeitoFichaClasse, IFichaTecnicaClasse, IHabilidadeClasse, IOpcaoHabilidadeClasse, IPoderClasse, IRaca } from '../types/catalogo';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO, RACAS_CATALOGO } from './catalogoService';
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
      const chave = chaveEscolhaHabilidade(classe.id, habilidade.id);
      const escolhidos = Array.isArray(guardado[chave]) ? guardado[chave] : [];
      const validos = escolhidos
        .filter((id: any) => typeof id === 'string' && (habilidade.opcoes || []).some((opcao) => opcao.id === id))
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
    const vagas = vagasEscolhaHabilidade(habilidade, nivel);
    if (!vagas) return [];
    const chave = chaveEscolhaHabilidade(classe.id, habilidade.id);
    const opcoes = habilidade.opcoes || [];
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
  const habilidades = classesDaFicha(ficha).flatMap(({ classe, nivel }) => (classe.habilidades || [])
    .filter((habilidade) => (habilidade.niveis || []).some((marco) => marco <= nivel))
    .map((habilidade) => ({
      id: `classe:${classe.id}:${habilidade.id}`,
      titulo: habilidade.titulo,
      descricao: descricaoHabilidadeNoNivel(habilidade, nivel)
        + resumoEscolhasHabilidade(habilidade, nivel, escolhas[chaveEscolhaHabilidade(classe.id, habilidade.id)] || []),
      origem: classe.titulo,
      nivel: Math.max(...habilidade.niveis.filter((marco) => marco <= nivel)),
      subtipo: 'habilidade' as const,
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
    }];
  });
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
