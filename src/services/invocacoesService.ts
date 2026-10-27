import { CLASSES_CATALOGO } from './catalogoService';
import { selecoesHabilidadeValidas } from './progressaoFichaService';

/** Uma ficha do Catálogo de Invocações (tarefas_bancada do Invocador), já separada em números. */
export interface IInvocacaoDoCatalogo {
  /** "cacador-de-feras-2": a linha e o nível dela no Catálogo. */
  id: string;
  linha: string;
  /** Nível dentro da linha, de 1 a 5 (I a V). */
  degrau: number;
  titulo: string;
  /** Nível de Invocador que libera este degrau ("Nível 10" no Catálogo). */
  nivelMinimo: number;
  vida: number;
  defesa: number;
  movimento: string;
  /** O resto da ficha: a habilidade própria (Garras, Golpe, Toque Vital...) e o que vier junto. */
  habilidade: string;
  papel: string;
  /** A habilidade é um ataque, que acerta com o teste de conjuração do Invocador. */
  ataca: boolean;
}

/** Papel de cada linha, como a descrição do Catálogo apresenta. O Duende e a Seiva não atacam. */
const LINHAS: Record<string, { papel: string; ataca: boolean }> = {
  'Caçador de Feras': { papel: 'Ofensivo', ataca: true },
  'Colosso de Ferro': { papel: 'Defensivo', ataca: true },
  'Salamandra de Fogo': { papel: 'Suporte à distância', ataca: true },
  'Seiva Viva': { papel: 'Cura', ataca: false },
  'Duende Prestativo': { papel: 'Utilidade', ataca: false },
  'Aranha Tecelã': { papel: 'Controle', ataca: true },
};

const ROMANOS = ['I', 'II', 'III', 'IV', 'V'];

const comoId = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const invocador = () => CLASSES_CATALOGO.find((classe) => classe.id === 'invocador');

/** As 30 fichas do Catálogo, lidas do texto de cada uma ("Vida 4 · Defesa 11 · Movimento 12 m · Garras 1d8 cortante"). */
export function catalogoDeInvocacoes(): IInvocacaoDoCatalogo[] {
  return (invocador()?.tarefas_bancada?.itens || []).flatMap((item): IInvocacaoDoCatalogo[] => {
    const nome = String(item.tarefa || '');
    const casamento = nome.match(/^(.+?)\s+(I{1,3}|IV|V)$/);
    if (!casamento) return [];
    const [, linha, romano] = casamento;
    const partes = String(item.nota || '').split(' · ').map((parte) => parte.trim());
    const numero = (rotulo: string) => Number(partes.find((parte) => parte.startsWith(`${rotulo} `))?.slice(rotulo.length + 1)) || 0;
    const movimento = partes.find((parte) => parte.startsWith('Movimento '))?.slice('Movimento '.length) || '';
    const habilidade = partes.filter((parte) => !/^(Vida|Defesa|Movimento) /.test(parte)).join(' · ');
    const degrau = ROMANOS.indexOf(romano) + 1;
    return [{
      id: `${comoId(linha)}-${degrau}`,
      linha,
      degrau,
      titulo: nome,
      nivelMinimo: Number(String(item.dt || '').match(/\d+/)?.[0]) || 1,
      vida: numero('Vida'),
      defesa: numero('Defesa'),
      movimento,
      habilidade,
      papel: LINHAS[linha]?.papel || '',
      ataca: LINHAS[linha]?.ataca ?? false,
    }];
  });
}

/** Depois do 20 o Catálogo para de ganhar níveis e as invocações crescem com o Invocador (Escolha Final do Pacto):
 * +3 de Vida por nível acima do 20, +1 de Defesa a cada 5 níveis acima do 20 e +1d6 no dano ou na cura no 30, 40 e 50. */
export function crescimentoDaInvocacao(nivelInvocador: number): { vida: number; defesa: number; dadosExtras: number } {
  const acima = Math.max(0, Math.trunc(nivelInvocador) - 20);
  return {
    vida: 3 * acima,
    defesa: Math.floor(acima / 5),
    dadosExtras: [30, 40, 50].filter((nivel) => nivelInvocador >= nivel).length,
  };
}

/** Nível das Formas Vinculadas: 1 no 3, 2 no 8, 3 no 14 e 4 no 20. */
export function nivelDasFormas(nivelInvocador: number): number {
  return [3, 8, 14, 20].filter((nivel) => nivelInvocador >= nivel).length;
}

const TITULO_DA_FORMA: Record<string, string> = {
  fera: 'Fera', guardiao: 'Guardião', espirito: 'Espírito', 'broto-curador': 'Broto Curador', sombra: 'Sombra', 'nucleo-firme': 'Núcleo Firme',
};

export interface IAliadoDeInvocacao {
  nome: string;
  especieTipo: string;
  papel: string;
  nivel: number;
  vidaAtual: number;
  vidaMaxima: number;
  vidaTemporaria: number;
  defesa: number;
  movimento: string;
  iniciativa: number;
  ataquePrincipal: string;
  ataquesAdicionais: string[];
  condicoes: string;
  observacoes: string;
  invocacaoCatalogoId: string;
}

/** O aliado que nasce de uma ficha do Catálogo, com o crescimento depois do 20 e a Vida temporária do Núcleo Firme.
 * O bônus de ataque não entra no texto: ele muda com a ficha, e o cartão do aliado o calcula na hora. */
export function aliadoDaInvocacao(
  invocacao: IInvocacaoDoCatalogo,
  { ficha, nivelInvocador, iniciativa }: { ficha: any; nivelInvocador: number; iniciativa: number },
): IAliadoDeInvocacao {
  const crescimento = crescimentoDaInvocacao(nivelInvocador);
  // O Duende ajuda em perícia, e a Mão Extra não é dano nem cura: ela não ganha os dados da maestria.
  const habilidade = crescimento.dadosExtras > 0 && invocacao.linha !== 'Duende Prestativo'
    ? invocacao.habilidade.replace(/(\d+d\d+)/, `$1 + ${crescimento.dadosExtras}d6`)
    : invocacao.habilidade;
  const formas = selecoesHabilidadeValidas(ficha)['invocador:formas-vinculadas'] || [];
  const nivelForma = nivelDasFormas(nivelInvocador);
  const vidaTemporaria = formas.includes('nucleo-firme') && nivelForma >= 1 ? nivelInvocador * (nivelForma >= 2 ? 2 : 1) : 0;
  const vidaMaxima = invocacao.vida + crescimento.vida;
  return {
    nome: invocacao.titulo,
    especieTipo: 'Invocação',
    papel: invocacao.papel,
    nivel: invocacao.degrau,
    vidaAtual: vidaMaxima,
    vidaMaxima,
    vidaTemporaria,
    defesa: invocacao.defesa + crescimento.defesa,
    movimento: invocacao.movimento,
    iniciativa,
    ataquePrincipal: habilidade,
    ataquesAdicionais: [],
    condicoes: '',
    observacoes: [
      'Invocação do Catálogo. Age logo depois do seu turno, com Ação Padrão e Movimento próprios, e os testes de resistência dela usam os seus bônus. Manter não custa Mana. A 0 de Vida, ela se desfaz e volta com a Vida cheia no seu próximo descanso longo.',
      formas.length ? `Formas Vinculadas (nível ${nivelForma}): ${formas.map((id) => TITULO_DA_FORMA[id] || id).join(', ')}.` : '',
    ].filter(Boolean).join(' '),
    invocacaoCatalogoId: invocacao.id,
  };
}
