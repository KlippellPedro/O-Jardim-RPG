import { HelpCircle } from 'lucide-react';
import {
  ATRIBUTOS,
  ATRIBUTO_VALOR_MINIMO,
  modificador,
  type TAtributo,
} from '../../../services/calculoService';
import {
  ajusteOrigem,
  chaveAjuste,
  nomeAjusteOrigem,
  obterAjustesManuais,
} from '../../../services/ajustesFichaService';
import type { IDetalheEfeitoAutomatico } from '../../../services/equipamentoService';
import { AjusteButton } from './AjustesFichaModal';
import { SectionTitle } from './SharedFichaComponents';

/** Nomes completos usados em cards, modais e registros de rolagem. */
export const NOMES_ATRIBUTOS: Record<TAtributo, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

interface AtributosSectionProps {
  ficha: any;
  racaTitulo?: string;
  naturais: Record<TAtributo, number>;
  antesDaRaca: Record<TAtributo, number>;
  efetivos: Record<TAtributo, number>;
  bonusEquipamento?: Record<TAtributo, number>;
  detalhesAutomaticos?: Partial<Record<TAtributo, IDetalheEfeitoAutomatico[]>>;
  onChange: (atributo: TAtributo, valorEfetivo: number) => void;
  onRoll: (atributo: TAtributo) => void;
  onOpenInfo: (modal: any) => void;
  onOpenAdjust: (
    chave: string,
    titulo: string,
    automaticos?: Array<{ nome: string; valor: number }>,
  ) => void;
}

/**
 * Editor dos sete atributos. Mantém a apresentação isolada das regras de
 * cálculo, que continuam concentradas nos services e no componente da aba.
 */
export function AtributosSection({
  ficha,
  racaTitulo,
  naturais,
  antesDaRaca,
  efetivos,
  bonusEquipamento = {} as Record<TAtributo, number>,
  detalhesAutomaticos = {},
  onChange,
  onRoll,
  onOpenInfo,
  onOpenAdjust,
}: AtributosSectionProps) {
  return (
    <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
      <SectionTitle title="Atributos" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        {ATRIBUTOS.map((atributo) => {
          const valorNatural = naturais[atributo] ?? 10;
          const valorEfetivo = efetivos[atributo] ?? 10;
          const mod = modificador(valorEfetivo);
          const modTexto = mod >= 0 ? `+${mod}` : String(mod);
          const bonusDoEquipamento = Number(bonusEquipamento[atributo]) || 0;
          const origem = {
            nome: nomeAjusteOrigem(ficha, 'atributo', atributo) || 'Origem',
            valor: ajusteOrigem(ficha, 'atributo', atributo),
          };
          const automaticos = detalhesAutomaticos[atributo]
            || (bonusDoEquipamento !== 0 ? [{ nome: 'Efeitos automáticos', valor: bonusDoEquipamento }] : []);
          const ajusteRacial = efetivos[atributo] - antesDaRaca[atributo];
          const manuais = obterAjustesManuais(ficha, chaveAjuste('atributo', atributo));
          const valorComSinal = (valor: number) => `${valor > 0 ? '+' : ''}${valor}`;

          return (
            <div key={atributo} className="min-w-0 bg-[#121118] border border-white/5 rounded-xl flex flex-col items-center px-2 pb-3 pt-10 relative group hover:border-[#c7a44c]/30 sm:px-3">
              <div className="absolute right-2 top-2 flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Ver cálculo de ${NOMES_ATRIBUTOS[atributo]}`}
                  onClick={() => onOpenInfo({
                    title: `ATRIBUTO: ${NOMES_ATRIBUTOS[atributo].toUpperCase()}`,
                    description: 'O valor mostrado já inclui raça, origem e ajustes nomeados. O teste rola 1d20 e soma somente este modificador e as penalidades ativas.',
                    items: [
                      { label: 'Valor natural', value: valorNatural },
                      { label: origem.nome, value: valorComSinal(origem.valor) },
                      ...manuais.map((item) => ({ label: `Ajuste: ${item.nome}`, value: valorComSinal(item.valor) })),
                      ...automaticos.map((item) => ({ label: item.nome, value: valorComSinal(item.valor) })),
                      { label: `Raça: ${racaTitulo || 'selecionada'}`, value: valorComSinal(ajusteRacial) },
                      { label: 'Valor efetivo', value: valorEfetivo },
                      { label: 'Cálculo', value: `floor((${valorEfetivo} - 10) / 2)` },
                    ],
                    total: { label: 'Modificador', value: modTexto, color: mod >= 0 ? 'text-green-400' : 'text-red-400' },
                    atributo,
                    onRolar: () => onRoll(atributo),
                  })}
                  className="text-[#c7a44c] opacity-50 hover:opacity-100 transition-opacity"
                >
                  <HelpCircle size={14} />
                </button>
                <AjusteButton
                  label={NOMES_ATRIBUTOS[atributo]}
                  onClick={() => onOpenAdjust(
                    chaveAjuste('atributo', atributo),
                    NOMES_ATRIBUTOS[atributo],
                    [
                      { nome: `Raça: ${racaTitulo || 'selecionada'}`, valor: ajusteRacial },
                      origem,
                      ...automaticos,
                    ],
                  )}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-500 uppercase">{atributo.substring(0, 3)}</span>
              <input
                aria-label={`Valor de ${NOMES_ATRIBUTOS[atributo]}`}
                type="number"
                min={ATRIBUTO_VALOR_MINIMO}
                value={valorEfetivo}
                onChange={(event) => onChange(atributo, Number.parseInt(event.target.value, 10) || 10)}
                className="w-16 bg-transparent text-2xl font-serif text-white my-1 text-center focus:outline-none focus:bg-white/5 rounded"
              />
              <div className="w-full py-1 text-center bg-[#c7a44c]/10 border border-[#c7a44c]/20 rounded text-[#c7a44c] font-bold text-sm mb-2 mt-1">
                {modTexto}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
