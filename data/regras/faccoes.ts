import faccoesData from '../mundo/faccoes.json';
import type { RegraTopicoDe } from './tipos';

export type NivelPrestigio = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export type NivelFama = 0 | 1 | 2 | 3 | 4 | 5;
export type AcessoFaccao = 'negado' | 'publico' | 'rotina' | 'restrito' | 'interno';

export interface FaixaPrestigio {
  nivel: NivelPrestigio;
  titulo: string;
  reacao: string;
  acesso: AcessoFaccao;
  ajusteTesteSocial: number;
  descontoPercentual: number;
}

export interface FaixaFama {
  nivel: NivelFama;
  titulo: string;
  alcance: string;
  ajusteAnonimato: number;
}

export interface AlteracaoPrestigio {
  id: string;
  variacao: -2 | -1 | 1 | 2;
  causa: string;
  limite: string;
}

export interface AlteracaoFama {
  id: string;
  variacao: -1 | 1 | 2;
  causa: string;
  limite: string;
}

export interface FaccaoDocumentada {
  id: string;
  titulo: string;
  tipo: string;
  alcance: string;
  atuacao_publica: string;
  estado: 'canonica' | 'proposta';
  registro_universal: boolean;
  fontes: Array<{ arquivo: string; entrada_id: string }>;
  /** Facção canônica sem fonte no cofre: o autor a aprovou direto. */
  aprovacao?: { por: string; em: string };
}

export type RegraTopicoFaccoes = RegraTopicoDe<'Livro do Jogador'>;

export const PRESTIGIO_MINIMO: NivelPrestigio = -3;
export const PRESTIGIO_MAXIMO: NivelPrestigio = 3;
export const FAMA_MINIMA: NivelFama = 0;
export const FAMA_MAXIMA: NivelFama = 5;
export const AJUSTE_SOCIAL_MAXIMO = 2;
export const DESCONTO_FACCAO_MAXIMO_PERCENTUAL = 10;

export const TABELA_PRESTIGIO: FaixaPrestigio[] = [
  {
    nivel: -3,
    titulo: 'Inimigo',
    reacao: 'A facção recusa cooperação e pode agir contra o personagem quando tiver motivo e meios.',
    acesso: 'negado',
    ajusteTesteSocial: -2,
    descontoPercentual: 0,
  },
  {
    nivel: -2,
    titulo: 'Adversário',
    reacao: 'A facção restringe contato e exige garantias para qualquer acordo.',
    acesso: 'negado',
    ajusteTesteSocial: -1,
    descontoPercentual: 0,
  },
  {
    nivel: -1,
    titulo: 'Sob desconfiança',
    reacao: 'A facção mantém distância e verifica pedidos antes de responder.',
    acesso: 'publico',
    ajusteTesteSocial: -1,
    descontoPercentual: 0,
  },
  {
    nivel: 0,
    titulo: 'Neutro',
    reacao: 'A facção trata o personagem pelas regras comuns do local.',
    acesso: 'publico',
    ajusteTesteSocial: 0,
    descontoPercentual: 0,
  },
  {
    nivel: 1,
    titulo: 'Reconhecido',
    reacao: 'A facção aceita contato e oferece serviços de rotina quando disponíveis.',
    acesso: 'rotina',
    ajusteTesteSocial: 1,
    descontoPercentual: 0,
  },
  {
    nivel: 2,
    titulo: 'Aliado',
    reacao: 'A facção permite solicitar recursos restritos compatíveis com a relação.',
    acesso: 'restrito',
    ajusteTesteSocial: 1,
    descontoPercentual: 5,
  },
  {
    nivel: 3,
    titulo: 'Confiança',
    reacao: 'A facção permite contato interno e pedidos compatíveis com seus interesses.',
    acesso: 'interno',
    ajusteTesteSocial: 2,
    descontoPercentual: 10,
  },
];

export const TABELA_FAMA: FaixaFama[] = [
  { nivel: 0, titulo: 'Desconhecido', alcance: 'Sem reconhecimento recorrente.', ajusteAnonimato: 2 },
  { nivel: 1, titulo: 'Local', alcance: 'Reconhecido em uma comunidade ou público específico.', ajusteAnonimato: 1 },
  { nivel: 2, titulo: 'Regional', alcance: 'Reconhecido em uma região ou setor de atividade.', ajusteAnonimato: 0 },
  { nivel: 3, titulo: 'Ampla', alcance: 'Reconhecido em diferentes regiões ligadas por comunicação.', ajusteAnonimato: -1 },
  { nivel: 4, titulo: 'Mundial', alcance: 'Reconhecido na maior parte da Dimensão Padrão com acesso a notícias.', ajusteAnonimato: -2 },
  { nivel: 5, titulo: 'Histórica', alcance: 'Nome e imagem permanecem registrados além da presença atual.', ajusteAnonimato: -2 },
];

export const ALTERACOES_PRESTIGIO: AlteracaoPrestigio[] = [
  {
    id: 'servico-relevante',
    variacao: 1,
    causa: 'Concluir compromisso aceito que produza benefício relevante para a facção.',
    limite: 'No máximo uma vez pelo mesmo compromisso.',
  },
  {
    id: 'marco-de-campanha',
    variacao: 2,
    causa: 'Resolver ameaça ou objetivo central da facção em um marco de campanha.',
    limite: 'Exige consequência duradoura e não se acumula com serviço relevante pelo mesmo fato.',
  },
  {
    id: 'quebra-de-compromisso',
    variacao: -1,
    causa: 'Romper compromisso aceito ou causar prejuízo relevante à facção.',
    limite: 'A mesma consequência é registrada uma vez.',
  },
  {
    id: 'traicao',
    variacao: -2,
    causa: 'Atacar deliberadamente um objetivo central ou usar acesso concedido contra a facção.',
    limite: 'Não se acumula com quebra de compromisso pelo mesmo fato.',
  },
];

export const ALTERACOES_FAMA: AlteracaoFama[] = [
  {
    id: 'feito-publico',
    variacao: 1,
    causa: 'Realizar feito relevante diante de testemunhas ou registro verificável.',
    limite: 'Repetir o mesmo feito para o mesmo público não aumenta Fama.',
  },
  {
    id: 'exposicao-ampla',
    variacao: 2,
    causa: 'Um marco de campanha recebe circulação pública em várias regiões.',
    limite: 'Não se acumula com feito público pelo mesmo acontecimento.',
  },
  {
    id: 'identidade-obscurecida',
    variacao: -1,
    causa: 'Um acontecimento de campanha remove registros e interrompe a associação pública com a identidade.',
    limite: 'Passagem de tempo sem exposição não reduz Fama por si só.',
  },
];

export const REGRAS_PRESTIGIO = [
  'Prestígio começa em 0 e é registrado separadamente para cada facção.',
  'Prestígio mede relação. Ele não mede fama, cargo, riqueza nem reputação bancária.',
  'O ajuste social só vale em teste no qual a relação com a facção seja relevante.',
  'Acesso permite solicitar. Não garante estoque, aprovação, informação sigilosa ou ordem obedecida.',
  'Desconto vale apenas em bem ou serviço fornecido pela própria facção. Descontos de facção não se acumulam entre si.',
  'Nenhum nível obriga uma criatura a obedecer, acreditar, perdoar ou agir contra os próprios interesses.',
  'Prestígio negativo não inicia combate automaticamente. A reação depende da situação e dos recursos da facção.',
];

export const REGRAS_FAMA = [
  'Fama mede visibilidade pública de 0 a 5. Ela não indica aprovação.',
  'Fama só produz reconhecimento onde testemunho, registro ou comunicação possam ter chegado.',
  'O ajuste de anonimato vale para ocultar identidade ou passar sem reconhecimento. Ele não altera outros testes sociais.',
  'Reconhecimento não concede acesso, desconto, Prestígio ou controle sobre quem reconheceu o personagem.',
  'Quando uma habilidade de classe concede Fama mínima, use o maior valor entre a Fama atual e o valor da habilidade. Os demais efeitos permanecem na descrição da classe e não se somam a esta tabela.',
];

export const REPUTACAO_BANCARIA_SEPARADA =
  'Reputação Bancária continua sendo o valor do Banco usado para cofres, cartão e loja. Prestígio e Fama não alteram esse valor.';

export const FACCOES_DOCUMENTADAS = faccoesData.faccoes as FaccaoDocumentada[];

export function limitarPrestigio(valor: number): NivelPrestigio {
  if (!Number.isFinite(valor)) throw new RangeError('Prestígio deve ser um número finito.');
  return Math.max(PRESTIGIO_MINIMO, Math.min(PRESTIGIO_MAXIMO, Math.trunc(valor))) as NivelPrestigio;
}

export function limitarFama(valor: number): NivelFama {
  if (!Number.isFinite(valor)) throw new RangeError('Fama deve ser um número finito.');
  return Math.max(FAMA_MINIMA, Math.min(FAMA_MAXIMA, Math.trunc(valor))) as NivelFama;
}

export function obterFaixaPrestigio(valor: number): FaixaPrestigio {
  const nivel = limitarPrestigio(valor);
  const faixa = TABELA_PRESTIGIO.find((item) => item.nivel === nivel);
  if (!faixa) throw new RangeError('Faixa de Prestígio ausente.');
  return faixa;
}

export function obterFaixaFama(valor: number): FaixaFama {
  const nivel = limitarFama(valor);
  const faixa = TABELA_FAMA.find((item) => item.nivel === nivel);
  if (!faixa) throw new RangeError('Faixa de Fama ausente.');
  return faixa;
}

const ROTULO_ACESSO: Record<AcessoFaccao, string> = {
  negado: 'Negado',
  publico: 'Público',
  rotina: 'Rotina',
  restrito: 'Restrito',
  interno: 'Interno',
};

/** Número com sinal para a tabela: "+2", "0" ou "−3" (sinal de menos de verdade, não hífen). */
const comSinal = (valor: number) => (valor > 0 ? `+${valor}` : valor < 0 ? `\u2212${Math.abs(valor)}` : '0');

const linhasPrestigio = TABELA_PRESTIGIO.map((faixa) => `
  <tr>
    <td><strong>${comSinal(faixa.nivel)}</strong></td>
    <td>${faixa.titulo}</td>
    <td>${faixa.reacao}</td>
    <td>${ROTULO_ACESSO[faixa.acesso]}</td>
    <td>${comSinal(faixa.ajusteTesteSocial)}</td>
    <td>${faixa.descontoPercentual}%</td>
  </tr>
`).join('');

const linhasFama = TABELA_FAMA.map((faixa) => `
  <tr>
    <td><strong>${faixa.nivel}</strong></td>
    <td>${faixa.titulo}</td>
    <td>${faixa.alcance}</td>
    <td>${comSinal(faixa.ajusteAnonimato)}</td>
  </tr>
`).join('');

const itens = (regras: string[]) => regras.map((regra) => `<li>${regra}</li>`).join('');

export const REGRA_MUNDO_FACCOES: RegraTopicoFaccoes = {
  categoria: 'Livro do Jogador',
  status: 'Regra oficial',
  resumo: 'Regras de Prestígio, Fama, acesso e reação para organizações de qualquer Árvore.',
  destaques: [
    ['Prestígio', '−3 a +3 por facção'],
    ['Fama', '0 a 5'],
    ['Bônus máximo', '±2'],
  ],
  corpo: `
    <p class="regras-lead">Duas escalas dizem como o mundo enxerga o grupo. Prestígio mede a relação com cada facção, uma a uma. Fama mede quanta gente conhece o nome do personagem, sem dizer se gostam dele. Valem para qualquer organização da campanha, independentemente da Árvore.</p>

    <div class="regras-resumo">
      <ul>
        <li>Prestígio vai de ${comSinal(PRESTIGIO_MINIMO)} a ${comSinal(PRESTIGIO_MAXIMO)}, começa em 0 e é registrado separadamente para cada facção.</li>
        <li>Fama vai de ${FAMA_MINIMA} a ${FAMA_MAXIMA} e mede visibilidade pública, em uma escala única.</li>
        <li>O ajuste de teste social e o de anonimato nunca passam de ±${AJUSTE_SOCIAL_MAXIMO}, e o desconto de facção chega a ${DESCONTO_FACCAO_MAXIMO_PERCENTUAL}% no máximo.</li>
        <li>Acesso permite pedir, e nada garante que o pedido será atendido. Nenhum nível obriga alguém a obedecer.</li>
        <li>Um mesmo fato nunca gera dois ajustes. Reputação Bancária é outro valor, e Prestígio e Fama não a alteram.</li>
      </ul>
    </div>

    <h3 class="regras-subtitle">Facções documentadas</h3>
    <p>Consulte as facções disponíveis para esta campanha nos Registros Universais do Mundo.</p>

    <h3 class="regras-subtitle">Prestígio</h3>
    <p>Prestígio registra a relação de um personagem ou grupo com uma facção específica. O valor inicial é 0.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível</th><th>Estado</th><th>Reação</th><th>Acesso</th><th>Teste social</th><th>Desconto</th></tr></thead>
      <tbody>${linhasPrestigio}</tbody>
    </table></div>
    <ul class="regras-list">${itens(REGRAS_PRESTIGIO)}</ul>

    <h3 class="regras-subtitle">Alterar Prestígio</h3>
    <dl class="regras-kv regras-kv--boxed">
      ${ALTERACOES_PRESTIGIO.map((alteracao) => `<dt>${alteracao.variacao > 0 ? '+' : '−'}${Math.abs(alteracao.variacao)}</dt><dd>${alteracao.causa} ${alteracao.limite}</dd>`).join('')}
    </dl>
    <p>Depois de aplicar a mudança, limite o resultado entre ${comSinal(PRESTIGIO_MINIMO)} e ${comSinal(PRESTIGIO_MAXIMO)}. Um mesmo fato não gera dois ajustes.</p>
    <div class="regras-note regras-note--exemplo">
      <p>Duda aceita ajudar uma guilda de ferreiros e recupera o carregamento roubado, um compromisso aceito que traz benefício relevante: o Prestígio dela com a guilda sobe de 0 para +1, Reconhecido. Meses depois, ao negociar com os ferreiros, ela soma +1 no teste social. O desconto ainda é 0%, e só aparece em +2, Aliado, com 5%.</p>
    </div>

    <h3 class="regras-subtitle">Fama</h3>
    <p>Fama registra visibilidade pública. Ela usa uma escala única e não substitui a relação com cada facção.</p>
    <div class="regras-table-wrap"><table class="regras-table">
      <thead><tr><th>Nível</th><th>Título</th><th>Alcance</th><th>Anonimato</th></tr></thead>
      <tbody>${linhasFama}</tbody>
    </table></div>
    <ul class="regras-list">${itens(REGRAS_FAMA)}</ul>

    <h3 class="regras-subtitle">Alterar Fama</h3>
    <dl class="regras-kv regras-kv--boxed">
      ${ALTERACOES_FAMA.map((alteracao) => `<dt>${alteracao.variacao > 0 ? '+' : '−'}${Math.abs(alteracao.variacao)}</dt><dd>${alteracao.causa} ${alteracao.limite}</dd>`).join('')}
    </dl>
    <p>Depois de aplicar a mudança, limite o resultado entre ${FAMA_MINIMA} e ${FAMA_MAXIMA}.</p>
    <div class="regras-note regras-note--exemplo">
      <p>Duda derruba o monstro que aterrorizava a vila diante de metade dos moradores. É um feito relevante com testemunhas, então a Fama dela sobe de 0, Desconhecido, para 1, Local. Repetir o mesmo feito para o mesmo público não sobe de novo.</p>
    </div>

    <div class="regras-note regras-note--atencao">
      <p><strong>Sistemas separados:</strong> ${REPUTACAO_BANCARIA_SEPARADA}</p>
    </div>
  `,
  corpoMestre: `
    <p class="regras-lead">Prestígio e Fama são os dois relógios lentos da campanha. Eles quase nunca mudam dentro de uma sessão, e é isso que os torna úteis: registram o que o grupo vem fazendo há meses.</p>

    <h3 class="regras-subtitle">Mover os números</h3>
    <ul class="regras-list">
      <li>Prestígio anda de \u22123 a +3 por facção. Mova um degrau por acontecimento relevante, no fim da sessão, e diga em voz alta o que mudou e por quê.</li>
      <li>Fama vai de 0 a 5 e é uma só, para o grupo inteiro. Ela sobe por feito público: o que ninguém viu não gera Fama.</li>
      <li>O bônus máximo é de \u00b12. Como número, é pequeno de propósito. O valor real está no acesso e na reação, que são coisas de ficção.</li>
    </ul>

    <h3 class="regras-subtitle">Fazer render</h3>
    <ul class="regras-list">
      <li>Facção inimiga vale tanto quanto aliada. Prestígio negativo fecha portas e abre perseguições, e as duas coisas rendem sessão.</li>
      <li>Fama alta tem custo: quem é reconhecido não passa despercebido. Use isso antes de o grupo reclamar de ser famoso demais.</li>
      <li>Agradar uma facção costuma desagradar outra. Deixe essa tensão explícita no mapa de facções, para a escolha ser informada.</li>
    </ul>
  `,
};
