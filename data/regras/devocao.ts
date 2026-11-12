/** Devoção: o quanto a fé do personagem pesa.
 *
 * A divindade da ficha (passo 4 da Criação) era só texto. A Devoção dá a ela
 * um efeito pequeno e preso às oferendas, que já existiam: quem cultua um
 * Fluxo de verdade é ouvido melhor por ele. A Devoção mede a fé do personagem
 * e os preceitos que ele mesmo escreveu, nunca o estado da deidade: se ela
 * responde, e como, continua com o Mestre, e nada aqui cita o que só o Guia
 * sabe (dadivas-v1.json segue a mesma regra).
 */

export type NivelDevocao = 0 | 1 | 2 | 3;

export interface FaixaDevocao {
  nivel: NivelDevocao;
  titulo: string;
  efeito: string;
}

export const DEVOCAO_MAXIMA: NivelDevocao = 3;
/** Bônus no teste de oferenda ao Fluxo da própria divindade, a partir de Fiel. */
export const BONUS_DE_OFERENDA_DO_FIEL = 2;

export const TABELA_DEVOCAO: FaixaDevocao[] = [
  { nivel: 0, titulo: 'Sem devoção', efeito: 'A divindade na ficha diz em que o personagem acredita, e só.' },
  { nivel: 1, titulo: 'Fiel', efeito: `+${BONUS_DE_OFERENDA_DO_FIEL} no teste de oferenda ao Fluxo da sua divindade.` },
  { nivel: 2, titulo: 'Devoto', efeito: 'A dádiva desse Fluxo dura até o fim da sessão, mesmo depois de um descanso completo.' },
  { nivel: 3, titulo: 'Consagrado', efeito: 'A dádiva desse Fluxo vem ampliada, como para quem carrega o Fruto do mesmo Fluxo. As duas ampliações não se somam.' },
];

export const MUDANCAS_DE_DEVOCAO: readonly { variacao: string; causa: string }[] = [
  { variacao: '+1', causa: 'Uma oferenda Preciosa ou um sacrifício de história feito pela fé, ou cumprir um preceito quando cumpri-lo custava caro. No máximo uma vez por arco.' },
  { variacao: '−1', causa: 'Quebrar um preceito por conveniência.' },
  { variacao: 'para 0', causa: 'Renegar a fé, ou trocar de divindade.' },
];

export function limitarDevocao(valor: number): NivelDevocao {
  if (!Number.isFinite(valor)) throw new RangeError('Devoção deve ser um número finito.');
  return Math.max(0, Math.min(DEVOCAO_MAXIMA, Math.trunc(valor))) as NivelDevocao;
}

/** Devoção depois de um arco: sobe no máximo 1, por mais atos de fé que haja. */
export function devocaoNoFimDoArco(atual: number, atosDeFe: number, quebras: number): NivelDevocao {
  return limitarDevocao(atual + Math.min(1, Math.max(0, Math.trunc(atosDeFe))) - Math.max(0, Math.trunc(quebras)));
}

const linhasDevocao = TABELA_DEVOCAO.map((faixa) => `
          <tr><td><strong>${faixa.nivel}</strong></td><td>${faixa.titulo}</td><td>${faixa.efeito}</td></tr>`).join('');

const linhasMudancas = MUDANCAS_DE_DEVOCAO.map((mudanca) => `<dt>${mudanca.variacao}</dt><dd>${mudanca.causa}</dd>`).join('');

export const HTML_DEVOCAO = `
      <h3 class="regras-subtitle">Devoção</h3>
      <p>A divindade que você registrou na ficha pode ser só crença, ou pode pesar. A Devoção mede o quanto o personagem vive a própria fé, e as oferendas ao Fluxo da divindade dele sentem a diferença.</p>
      <ul class="regras-list">
        <li><strong>Os preceitos:</strong> quando escolher a divindade, escreva com o Mestre dois preceitos, na voz do personagem: uma coisa que a fé dele pede e uma que ela proíbe. Eles são o que o personagem acredita, e podem estar errados sobre a deidade.</li>
        <li><strong>A Devoção começa em 0</strong> e vai até ${DEVOCAO_MAXIMA}. Cada degrau soma ao anterior.</li>
      </ul>
      <div class="regras-table-wrap"><table class="regras-table">
        <thead><tr><th>Nível</th><th>Estado</th><th>Efeito</th></tr></thead>
        <tbody>${linhasDevocao}
        </tbody>
      </table></div>
      <dl class="regras-kv regras-kv--boxed">${linhasMudancas}</dl>
      <p class="regras-note">A Devoção vale para o Fluxo da divindade que o personagem cultua. As travas das oferendas continuam as mesmas: uma oferenda por pessoa por sessão, uma dádiva ativa por vez, e a dádiva do Fim só com autorização do Mestre. Ter Devoção não garante resposta: quem decide se a deidade ouve continua sendo o Mestre.</p>`;

// O lado do Mestre mora direto no corpoMestre de 'frutos-implantes', em
// regras.ts: o filtro do Vite só apaga a propriedade corpoMestre, e uma
// constante exportada daqui iria inteira para o navegador.
