// As cartas de condição e de aflição que o token mostra no mapa. Os textos vêm dos mesmos catálogos do Livro de Regras
// (data/regras), então o que a carta diz é sempre o que a regra diz. Sem React, para testar.

import { CONDICOES_OFICIAIS, CRISES_SANIDADE, type ICondicaoRegra } from '../../../../data/regras/condicoes';
import { CONDICOES_LONGO_PRAZO } from '../../../../data/regras/condicoes-longo-prazo';
import { CATALOGO_AFLICOES, ROTULO_TIPO_AFLICAO, type IAflicao } from '../../../../data/regras/aflicoes';
import { textoDoPeriodo } from '../../../services/aflicoesFichaService';
import { termoPeloNome } from '../../../services/termosDoJogo';
import type { IEstadoToken } from '../../../services/mapaApi';

export type TomDaCarta = 'ruim' | 'bom' | 'aflicao' | 'livre';

export interface IBlocoDaCarta {
  rotulo: string;
  linhas: string[];
}

export interface ICartaDeEstado {
  /** Único por estado do token: `condicao:caido`, `aflicao:toxina-paralisante`. */
  chave: string;
  titulo: string;
  /** Linha pequena sob o título: "Condição física · leve", "Veneno · estágio 2". */
  selo: string;
  tom: TomDaCarta;
  blocos: IBlocoDaCarta[];
  /** Endereço do Livro na explicação do termo, quando existe. */
  rota: string | null;
  /** Falso para condição escrita pelo Mestre, que não está no catálogo. */
  conhecida: boolean;
  /** Texto curto para o chip do token ("Caído", "Veneno 2"). */
  chip: string;
}

export const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const TODAS_AS_CONDICOES: ICondicaoRegra[] = [...CONDICOES_OFICIAIS, ...CRISES_SANIDADE, ...CONDICOES_LONGO_PRAZO];

const condicaoPeloNome = (nome: string): ICondicaoRegra | undefined => {
  const alvo = semAcento(nome);
  return TODAS_AS_CONDICOES.find((c) => semAcento(c.titulo) === alvo);
};

export const aflicaoPeloId = (id: string): IAflicao | undefined => CATALOGO_AFLICOES.find((a) => a.id === id);

const ROTULO_CATEGORIA = { física: 'física', mental: 'mental', combate: 'de combate' } as const;

export const textoDaDuracao = (turnos: number | null | undefined): string | null => {
  if (turnos === null || turnos === undefined) return null;
  return turnos === 1 ? 'Acaba na próxima rodada.' : `Restam ${turnos} rodadas.`;
};

export function cartaDaCondicao(nome: string, turnos: number | null | undefined = null): ICartaDeEstado {
  const regra = condicaoPeloNome(nome);
  const restante = textoDaDuracao(turnos);
  if (!regra) {
    return {
      chave: `condicao:${semAcento(nome)}`,
      titulo: nome,
      selo: 'Condição',
      tom: 'livre',
      blocos: [
        { rotulo: 'O que é', linhas: ['Condição escrita pelo Mestre para esta cena. O efeito está com ele.'] },
        ...(restante ? [{ rotulo: 'Duração', linhas: [restante] }] : []),
      ],
      rota: null,
      conhecida: false,
      chip: nome,
    };
  }
  const grupo = regra.grupo ?? `${ROTULO_CATEGORIA[regra.categoria]}${regra.gravidade ? ` · ${regra.gravidade === 'leve' ? 'leve' : 'média'}` : ''}`;
  return {
    chave: `condicao:${regra.id}`,
    titulo: regra.titulo,
    selo: `${regra.positiva ? 'Condição positiva' : 'Condição'} · ${grupo}`,
    tom: regra.positiva ? 'bom' : 'ruim',
    blocos: [
      { rotulo: 'Efeitos', linhas: regra.efeitos },
      { rotulo: 'Duração', linhas: [regra.duracao, ...(restante ? [restante] : [])] },
      { rotulo: 'Como acabar', linhas: [regra.remocao] },
    ],
    rota: termoPeloNome(regra.titulo)?.rota ?? null,
    conhecida: true,
    chip: regra.titulo,
  };
}

export function cartaDaAflicao(id: string, estagio = 1, incubando = false): ICartaDeEstado {
  const aflicao = aflicaoPeloId(id);
  if (!aflicao) {
    return {
      chave: `aflicao:${id}`,
      titulo: id,
      selo: 'Aflição',
      tom: 'aflicao',
      blocos: [{ rotulo: 'O que é', linhas: ['Esta aflição não está mais no catálogo.'] }],
      rota: null,
      conhecida: false,
      chip: id,
    };
  }
  const atual = aflicao.estagios.find((e) => e.numero === estagio);
  const ultimo = aflicao.estagios[aflicao.estagios.length - 1]?.numero ?? estagio;
  const blocos: IBlocoDaCarta[] = [];
  if (incubando) blocos.push({ rotulo: 'Só o Mestre vê', linhas: ['Ainda incubando: os sintomas não apareceram.'] });
  blocos.push({ rotulo: `Estágio ${estagio} de ${ultimo}`, linhas: atual?.efeitos.length ? atual.efeitos : ['Sem efeito neste estágio.'] });
  if (atual?.aoEntrar?.length) blocos.push({ rotulo: 'Ao entrar no estágio', linhas: atual.aoEntrar });
  if (atual?.drenagemAtributo) {
    blocos.push({ rotulo: 'Atributo drenado', linhas: [`${atual.drenagemAtributo.atributo} ${atual.drenagemAtributo.valor}. ${atual.drenagemAtributo.recuperacao}`] });
  }
  blocos.push({
    rotulo: 'A cada intervalo',
    linhas: [`Teste de Fortitude DT ${aflicao.dtFortitude} mais o ajuste de nível, a cada ${textoDoPeriodo(aflicao.intervalo)}. Falhar sobe o estágio; passar ${aflicao.progressao.sucesso === -1 ? 'desce um estágio' : 'mantém o estágio'}.`],
  });
  blocos.push({
    rotulo: 'Tratamento',
    linhas: [`${aflicao.tratamento.pericia} DT ${aflicao.tratamento.dt} mais o ajuste de nível, ${aflicao.tratamento.tempo.replace(/\.$/, '').toLowerCase()}. ${aflicao.tratamento.efeitoSucesso}`],
  });
  if (aflicao.observacoes?.length) blocos.push({ rotulo: 'Observações', linhas: aflicao.observacoes });
  return {
    chave: `aflicao:${aflicao.id}`,
    titulo: aflicao.titulo,
    selo: `${ROTULO_TIPO_AFLICAO[aflicao.tipo].replace(/^./, (l) => l.toUpperCase())} · estágio ${estagio}`,
    tom: 'aflicao',
    blocos,
    rota: termoPeloNome(aflicao.titulo)?.rota ?? null,
    conhecida: true,
    chip: `${aflicao.titulo} ${estagio}`,
  };
}

export function cartaDoEstado(estado: IEstadoToken): ICartaDeEstado {
  return estado.tipo === 'condicao'
    ? cartaDaCondicao(estado.nome, estado.turnos)
    : cartaDaAflicao(estado.id, estado.estagio, estado.incubando === true);
}

/** Para o seletor do Mestre: tudo que dá para pôr no token, agrupado. */
export interface IOpcaoDeEstado {
  chave: string;
  tipo: 'condicao' | 'aflicao';
  /** Nome gravado na Sessão (condição) ou id do catálogo (aflição). */
  valor: string;
  titulo: string;
  grupo: string;
}

export function opcoesDeEstado(): IOpcaoDeEstado[] {
  const condicoes = [...CONDICOES_OFICIAIS, ...CRISES_SANIDADE].map((c): IOpcaoDeEstado => ({
    chave: `condicao:${c.id}`,
    tipo: 'condicao',
    valor: c.titulo,
    titulo: c.titulo,
    grupo: c.positiva ? 'Condições positivas' : c.id.startsWith('crise-') ? 'Crises de Sanidade' : 'Condições',
  }));
  const longoPrazo = CONDICOES_LONGO_PRAZO.map((c): IOpcaoDeEstado => ({
    chave: `condicao:${c.id}`, tipo: 'condicao', valor: c.titulo, titulo: c.titulo, grupo: `Longo prazo: ${c.grupo ?? 'outras'}`,
  }));
  const aflicoes = CATALOGO_AFLICOES.map((a): IOpcaoDeEstado => ({
    chave: `aflicao:${a.id}`, tipo: 'aflicao', valor: a.id, titulo: a.titulo, grupo: `Aflições: ${ROTULO_TIPO_AFLICAO[a.tipo]}`,
  }));
  return [...condicoes, ...longoPrazo, ...aflicoes];
}

/** Filtra as opções por um trecho do nome, sem acento, e tira o que o token já tem. */
export function buscarOpcoes(opcoes: IOpcaoDeEstado[], busca: string, jaTem: ReadonlySet<string>, limite = 12): IOpcaoDeEstado[] {
  const termo = semAcento(busca);
  return opcoes
    .filter((o) => !jaTem.has(o.chave) && (!termo || semAcento(o.titulo).includes(termo)))
    .slice(0, limite);
}

/** A chave que um estado do token ocupa, para saber o que ele já tem. */
export function chaveDoEstado(estado: IEstadoToken): string {
  if (estado.tipo === 'aflicao') return `aflicao:${estado.id}`;
  const regra = condicaoPeloNome(estado.nome);
  return regra ? `condicao:${regra.id}` : `condicao:${semAcento(estado.nome)}`;
}
