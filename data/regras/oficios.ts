/** Ofícios na criação de personagem.
 *
 * As tabelas do Livro saem de data/economia/oficios-v1.json, o mesmo arquivo
 * que o assistente de criação e a plataforma leem: mudar um número lá muda o
 * texto aqui. As faixas reaproveitam a tabela Trabalhar pelo dia e os salários
 * da Economia, então nenhum valor novo nasce neste arquivo.
 */
import oficiosData from '../economia/oficios-v1.json';
import periciasData from '../ficha/pericias.json';
import progressaoData from '../ficha/progressao-niveis.json';

interface IContatoDaFaixa { confianca: number; origem?: string; quem?: string; ramo?: string }
interface IFaixa {
  id: string;
  titulo: string;
  classe_social: string;
  resumo: string;
  por_dia: number;
  por_mes: number | null;
  sobra_por_dia: number;
  grau_minimo: string | null;
  lunaris_iniciais: number;
  itens: { comum: number; incomum: number };
  contatos: IContatoDaFaixa[];
  obrigacao: string | null;
}
interface IOficio { id: string; titulo: string; faixa: string; descricao: string; pericias: string[] }

const FAIXAS = oficiosData.faixas as IFaixa[];
const OFICIOS = oficiosData.oficios as IOficio[];
const tituloPericia = new Map(periciasData.pericias.map((pericia) => [pericia.id, pericia.titulo]));
const rotuloGrau = new Map<string, string>(progressaoData.graus_pericia.graus.map((grau) => [grau.id, grau.rotulo]));

const numero = (valor: number) => valor.toLocaleString('pt-BR');

const itensDaFaixa = (faixa: IFaixa) => {
  const comuns = `${faixa.itens.comum} ${faixa.itens.comum === 1 ? 'comum' : 'comuns'}`;
  return faixa.itens.incomum ? `${comuns} e ${faixa.itens.incomum} incomum` : comuns;
};

const contatosDaFaixa = (faixa: IFaixa) => {
  const partes = faixa.contatos.map((contato) => (contato.confianca >= 2 ? 'Amigo' : 'Conhecido'));
  const texto = partes.length === 1 ? `1 ${partes[0]}` : `${partes.length}: ${partes.join(' e ')}`;
  return faixa.obrigacao ? `${texto}, e uma Dívida` : texto;
};

const sobra = (valor: number) => (valor === 1 ? 'sobra 1' : `sobram ${valor}`);

const rendaDaFaixa = (faixa: IFaixa) => {
  const detalhe = faixa.por_mes ? `cerca de ${numero(faixa.por_mes)} por mês` : 'só o serviço braçal que aparecer';
  const grau = faixa.grau_minimo ? `, com ${rotuloGrau.get(faixa.grau_minimo) || faixa.grau_minimo} numa perícia do ofício` : '';
  return `${faixa.por_dia} por dia, ${sobra(faixa.sobra_por_dia)}<br><small>${detalhe}${grau}</small>`;
};

export const TABELA_FAIXAS_DE_OFICIO = `
  <div class="regras-table-wrap"><table class="regras-table">
    <thead><tr><th>Faixa</th><th>No bolso</th><th>Itens iniciais</th><th>Trabalhando</th><th>Contatos</th></tr></thead>
    <tbody>
      ${FAIXAS.map((faixa) => `<tr><td><strong>${faixa.titulo}</strong><br><small>${faixa.resumo}</small></td><td>${faixa.lunaris_iniciais} Lunaris</td><td>${itensDaFaixa(faixa)}</td><td>${rendaDaFaixa(faixa)}</td><td>${contatosDaFaixa(faixa)}</td></tr>`).join('\n      ')}
    </tbody>
  </table></div>
`;

export const LISTA_DE_OFICIOS = FAIXAS.map((faixa) => `
  <p><strong>${faixa.titulo}</strong></p>
  <ul class="regras-list">
    ${OFICIOS.filter((oficio) => oficio.faixa === faixa.id).map((oficio) => `<li><strong>${oficio.titulo}.</strong> ${oficio.descricao} <small>(${oficio.pericias.map((id) => tituloPericia.get(id) || id).join(' e ')})</small></li>`).join('\n    ')}
  </ul>
`).join('');

/** Sobra por dia de uma faixa, para a tabela Trabalhar pelo dia de Tempo Entre Aventuras. */
export const sobraDaFaixa = (id: string) => FAIXAS.find((faixa) => faixa.id === id)?.sobra_por_dia ?? 0;
export const SOBRA_MINIMA = Math.min(...FAIXAS.map((faixa) => faixa.sobra_por_dia));
export const SOBRA_MAXIMA = Math.max(...FAIXAS.map((faixa) => faixa.sobra_por_dia));

export const FAIXA_MAIS_POBRE = FAIXAS[0];
export const FAIXA_MAIS_RICA = FAIXAS[FAIXAS.length - 1];
export const TOTAL_DE_OFICIOS = OFICIOS.length;
