import type { IContagemDeAvisos } from '../../services/avisosApi';
import type { ICampanha, IUser } from '../../store/useAuthStore';
import { ROTULO_PAPEL } from '../../pages/Campanha/campanha';

/** O que o menu da engrenagem mostra para cada pessoa. Puro, para testar quem vê o quê sem montar a tela. */

export type IconeDoMenu = 'conta' | 'avisos' | 'cofre' | 'preferencias' | 'mestre' | 'criador' | 'admin';

export type AcaoDoMenu =
  | { tipo: 'painel'; painel: 'conta' | 'avisos' | 'preferencias' }
  | { tipo: 'rota'; caminho: string };

export interface IItemDoMenu {
  id: string;
  rotulo: string;
  icone: IconeDoMenu;
  acao: AcaoDoMenu;
  /** Avisos esperando nesse lugar (o número vermelho do item). */
  contagem?: number;
}

export interface ISecaoDoMenu {
  id: 'conta' | 'paineis';
  rotulo: string;
  itens: IItemDoMenu[];
}

export interface IEntradaDoMenu {
  usuario: Pick<IUser, 'papel_plataforma'>;
  campanhaAtiva: Pick<ICampanha, 'id' | 'papel'> | null;
  avisos: IContagemDeAvisos;
}

/** Mestre e Assistente da campanha ativa. O criador entra como Mestre em qualquer campanha (o servidor já manda assim). */
export function gerenciaACampanha(campanhaAtiva: Pick<ICampanha, 'papel'> | null | undefined): boolean {
  return campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
}

export function ehAdministrador(usuario: Pick<IUser, 'papel_plataforma'>): boolean {
  return usuario.papel_plataforma === 'admin' || usuario.papel_plataforma === 'criador';
}

export function montarMenuDaEngrenagem({ usuario, campanhaAtiva, avisos }: IEntradaDoMenu): ISecaoDoMenu[] {
  const conta: IItemDoMenu[] = [
    { id: 'conta', rotulo: 'Minha conta', icone: 'conta', acao: { tipo: 'painel', painel: 'conta' } },
    { id: 'avisos', rotulo: 'Avisos', icone: 'avisos', acao: { tipo: 'painel', painel: 'avisos' }, contagem: avisos.geral },
  ];
  // O Cofre é por campanha: sem mesa ativa a rota só devolveria a pessoa para a lista de mesas.
  if (campanhaAtiva) conta.push({ id: 'cofre', rotulo: 'Cofre', icone: 'cofre', acao: { tipo: 'rota', caminho: '/cofre' } });
  conta.push({ id: 'preferencias', rotulo: 'Preferências', icone: 'preferencias', acao: { tipo: 'painel', painel: 'preferencias' } });

  const paineis: IItemDoMenu[] = [];
  if (gerenciaACampanha(campanhaAtiva)) {
    paineis.push({ id: 'mestre', rotulo: 'Painel do Mestre', icone: 'mestre', acao: { tipo: 'rota', caminho: '/mestre' }, contagem: avisos.mestre });
  }
  if (usuario.papel_plataforma === 'criador') {
    paineis.push({ id: 'criador', rotulo: 'Painel do Criador', icone: 'criador', acao: { tipo: 'rota', caminho: '/criador' } });
  }
  if (ehAdministrador(usuario)) {
    paineis.push({ id: 'admin', rotulo: 'Administração', icone: 'admin', acao: { tipo: 'rota', caminho: '/admin' }, contagem: avisos.admin });
  }

  const secoes: ISecaoDoMenu[] = [{ id: 'conta', rotulo: 'Conta', itens: conta }];
  if (paineis.length > 0) secoes.push({ id: 'paineis', rotulo: 'Painéis', itens: paineis });
  return secoes;
}

/** Avisos do Mestre esperando em mesas que não são a ativa. O menu não tem um item para elas, então ganham uma linha própria. */
export function avisosEmOutrasMesas({ campanhaAtiva, avisos }: Pick<IEntradaDoMenu, 'campanhaAtiva' | 'avisos'>): number {
  return Object.entries(avisos.mestre_por_campanha)
    .filter(([campanhaId]) => campanhaId !== campanhaAtiva?.id)
    .reduce((soma, [, quantidade]) => soma + quantidade, 0);
}

/**
 * O número do botão da engrenagem: tudo que ainda espera a pessoa. Cada parcela tem um lugar no menu onde
 * aparece de novo: os itens (Avisos, Painel do Mestre, Administração) e a linha das outras mesas.
 */
export function totalDaEngrenagem(entrada: IEntradaDoMenu): number {
  const dosItens = montarMenuDaEngrenagem(entrada)
    .flatMap((secao) => secao.itens)
    .reduce((soma, item) => soma + (item.contagem ?? 0), 0);
  return dosItens + avisosEmOutrasMesas(entrada);
}

export interface IAtalhoDePainel {
  id: 'mestre' | 'admin';
  rotulo: string;
  quantidade: number;
  caminho: string;
}

/** Painéis, fora a caixa geral, com recado esperando. Aparecem no topo dos Avisos para quem ainda procura ali. */
export function atalhosComRecado(entrada: IEntradaDoMenu): IAtalhoDePainel[] {
  const atalhos: IAtalhoDePainel[] = [];
  const itens = montarMenuDaEngrenagem(entrada).flatMap((secao) => secao.itens);
  for (const item of itens) {
    if ((item.id === 'mestre' || item.id === 'admin') && item.acao.tipo === 'rota' && (item.contagem ?? 0) > 0) {
      atalhos.push({
        id: item.id,
        rotulo: item.rotulo,
        quantidade: item.contagem ?? 0,
        caminho: `${item.acao.caminho}?aba=avisos`,
      });
    }
  }
  return atalhos;
}

/** "Mestre", "Jogador"... do papel que a pessoa tem na mesa ativa (rótulo do cartão da mesa no menu). */
export function rotuloDoPapelNaMesa(campanhaAtiva: Pick<ICampanha, 'papel'> | null | undefined): string {
  if (!campanhaAtiva) return '';
  return ROTULO_PAPEL[campanhaAtiva.papel] ?? campanhaAtiva.papel;
}
