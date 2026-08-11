import type { ICaracteristicaRacial, IClasse, IHabilidadeClasse, IPoderClasse, IRaca } from '../types/catalogo';
import { CLASSES_CATALOGO, LEGADOS_CATALOGO, RACAS_CATALOGO } from './catalogoService';
import { obterTracosOpcaoRacial, obterGruposEscolhaRacial } from './racaService';
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

function descricaoHabilidadeNoNivel(habilidade: IHabilidadeClasse, nivel: number): string {
  const estagios = [...(habilidade.estagios || [])]
    .filter((estagio) => estagio.nivel <= nivel)
    .sort((a, b) => b.nivel - a.nivel);
  return estagios[0]?.descricao || habilidade.descricao || 'Consulte a descrição completa da classe.';
}

export function habilidadesAutomaticas(ficha: any): IConteudoAutomatico[] {
  return classesDaFicha(ficha).flatMap(({ classe, nivel }) => (classe.habilidades || [])
    .filter((habilidade) => (habilidade.niveis || []).some((marco) => marco <= nivel))
    .map((habilidade) => ({
      id: `classe:${classe.id}:${habilidade.id}`,
      titulo: habilidade.titulo,
      descricao: descricaoHabilidadeNoNivel(habilidade, nivel),
      origem: classe.titulo,
      nivel: Math.max(...habilidade.niveis.filter((marco) => marco <= nivel)),
    })));
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
  const tracos: ICaracteristicaRacial[] = [...(raca.caracteristicas || [])];
  for (const grupo of obterGruposEscolhaRacial(raca)) {
    const opcao = grupo.opcoes.find((item) => item.id === ficha?.escolhaRacial?.[grupo.campo]);
    if (opcao) tracos.push(...obterTracosOpcaoRacial(opcao));
  }
  const nivel = nivelTotalFicha(ficha);
  tracos.push(...obterFragmentosRaciaisExpressos(raca, ficha?.escolhaRacial).map((item: any) => ({
    ...item,
    titulo: `Fragmento: ${item.titulo}`,
  })));
  tracos.push(...obterModificacoesRaciaisInstaladas(raca, ficha?.escolhaRacial, nivel).map((item: any) => ({
    ...item,
    titulo: `Modificação: ${item.titulo}`,
  })));
  return tracos.map((traco) => ({
    id: `raca:${raca.id}:${traco.id}`,
    titulo: traco.titulo,
    descricao: traco.descricao || 'Característica racial registrada no catálogo oficial.',
    origem: raca.titulo,
    nivel: 1,
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
      descricao: poder.descricao,
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
