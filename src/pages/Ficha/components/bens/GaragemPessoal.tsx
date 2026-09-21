import { Car, Fuel, Heart } from 'lucide-react';
import { CardBem } from './CardBem';
import { SlotsVeiculo } from './SlotsVeiculo';
import { montarGaragem, vagasDaPeca, type ItemGaragem } from '../../utils/slotsVeiculo';

/** O que a garagem precisa de um item do inventário. O item completo mora em
 * AbaInventario; aqui só entram os campos que o cartão mostra. */
export interface ItemVeicular extends ItemGaragem {
  durabilidadeAtual?: number;
  durabilidadeMaxima?: number;
  combustivelAtual?: number;
  combustivelMaximo?: number;
  defesa?: number;
  resistencia?: number;
  deslocamentoMetros?: number;
  manobrabilidade?: number;
  capacidade?: number;
  tripulacaoMinima?: number;
  sistemasAtivosMaximos?: number;
  espacosModulosMaximos?: number;
}

interface GaragemPessoalProps<T extends ItemVeicular> {
  itens: T[];
  onInstalar: (pecaId: string, veiculoId: string) => void;
  onDesinstalar: (pecaId: string) => void;
  onLigar: (pecaId: string, ligado: boolean) => void;
}

const Barra = ({ atual, maximo, cor, rotulo, icone }: { atual: number; maximo: number; cor: string; rotulo: string; icone: React.ReactNode }) => {
  if (!maximo || maximo <= 0) return null;
  const pct = Math.max(0, Math.min(100, (atual / maximo) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
        <span className="flex items-center gap-1 uppercase tracking-wider">{icone}{rotulo}</span>
        <span className="font-mono">{atual}/{maximo}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/40" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={Math.min(atual, maximo)}>
        <div className={`h-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/** Garagem do personagem: cada veículo vira um cartão com atributos, vida,
 * combustível e as peças instaladas em encaixes. Instalar é um clique numa vaga
 * livre; a peça continua no inventário, só ganha o marcador "instalada em". */
export function GaragemPessoal<T extends ItemVeicular>({ itens, onInstalar, onDesinstalar, onLigar }: GaragemPessoalProps<T>) {
  const { veiculos, guardadas } = montarGaragem(itens);
  if (veiculos.length === 0) return null;

  return (
    <section aria-label="Garagem" className="space-y-3" data-tour="bens-garagem">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
          <Car size={18} className="text-amber-400" aria-hidden="true" /> Garagem
        </h3>
        <span className="text-[11px] text-gray-500">{guardadas.length} peça(s) guardada(s)</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {veiculos.map(({ veiculo, modulos }) => {
          const atributos: Array<[string, string | number]> = [
            ['Defesa', veiculo.defesa ?? 0],
            ['Resistência', veiculo.resistencia ?? 0],
            ['Deslocamento', `${veiculo.deslocamentoMetros ?? 0} m`],
            ['Manobra', veiculo.manobrabilidade ?? 0],
            ['Capacidade', veiculo.capacidade ?? 0],
            ['Trip. mín.', veiculo.tripulacaoMinima ?? 0],
          ];
          const sugestoes = guardadas.map((peca) => ({ id: peca.id, nome: peca.nome, espacos: vagasDaPeca(peca) }));
          return (
            <CardBem key={veiculo.id} kicker="Veículo" titulo={veiculo.nome} acento="amber">
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                {atributos.map(([rotulo, valor]) => (
                  <div key={rotulo} className="rounded-lg bg-black/30 p-1.5 text-center">
                    <p className="text-[9px] uppercase tracking-wider text-gray-500">{rotulo}</p>
                    <p className="text-sm font-bold text-white">{valor}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-2">
                <Barra atual={veiculo.durabilidadeAtual ?? 0} maximo={veiculo.durabilidadeMaxima ?? 0} cor="bg-red-500" rotulo="Vida" icone={<Heart size={10} aria-hidden="true" />} />
                <Barra atual={veiculo.combustivelAtual ?? 0} maximo={veiculo.combustivelMaximo ?? 0} cor="bg-amber-400" rotulo="Combustível" icone={<Fuel size={10} aria-hidden="true" />} />
              </div>
              <div className="mt-4 border-t border-amber-500/10 pt-4">
                <SlotsVeiculo
                  titulo="Peças instaladas"
                  espacosMaximos={veiculo.espacosModulosMaximos ?? 4}
                  sistemasAtivosMaximos={veiculo.sistemasAtivosMaximos ?? 1}
                  modulos={modulos}
                  podeUtilizar
                  podeGerenciar
                  sugestoes={sugestoes}
                  semSugestoes="Nenhuma peça guardada cabe aqui. Cadastre peças em Veículos e peças, logo abaixo."
                  onDesinstalarRotulo="Desinstalar"
                  onAlternar={(id, ativo) => onLigar(id, ativo)}
                  onRemover={onDesinstalar}
                  onInstalar={(sugestao) => { if (sugestao.id) onInstalar(sugestao.id, veiculo.id); }}
                />
              </div>
            </CardBem>
          );
        })}
      </div>
    </section>
  );
}
