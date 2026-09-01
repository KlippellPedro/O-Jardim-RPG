import { chaveAjuste, type IAjusteFicha } from '../../../services/ajustesFichaService';
import { ResourceBar, SectionTitle } from './SharedFichaComponents';

export interface IComposicaoStatusVital {
  base: number;
  automaticos: Array<{ nome: string; valor: number }>;
  manuais: IAjusteFicha[];
}

interface StatusVitaisSectionProps {
  atual: { vida: number; mana: number; sanidade: number; cansaco: number };
  maximo: { vida: number; mana: number; sanidade: number; cansaco: number };
  efeitosCansaco: string[];
  composicao: Record<'vida' | 'mana' | 'sanidade' | 'cansaco', IComposicaoStatusVital>;
  onStatusChange: (campo: string, mudanca: number, maximo: number) => void;
  onSanidadeMaximaChange: (maximo: number) => void;
  onOpenInfo: (modal: any) => void;
  onOpenAdjust: (
    chave: string,
    titulo: string,
    automaticos?: Array<{ nome: string; valor: number }>,
  ) => void;
}

/** Recursos mutáveis da ficha e os efeitos já ativos de Cansaço. */
export function StatusVitaisSection({
  atual,
  maximo,
  efeitosCansaco,
  composicao,
  onStatusChange,
  onSanidadeMaximaChange,
  onOpenInfo,
  onOpenAdjust,
}: StatusVitaisSectionProps) {
  const formatarContribuicao = (valor: number) => `${valor > 0 ? '+' : ''}${valor}`;
  const info = (
    title: string,
    description: string,
    labelTotal: string,
    value: number,
    detalhes: IComposicaoStatusVital,
    itensExtras: Array<{ label: string; value: string | number }> = [],
  ) => {
    const componentes = [
      { label: 'Valor normal da ficha', value: detalhes.base },
      ...detalhes.automaticos.map((item) => ({ label: item.nome, value: formatarContribuicao(item.valor) })),
      ...detalhes.manuais.map((item) => ({ label: `Ajuste: ${item.nome}`, value: formatarContribuicao(item.valor) })),
    ];
    const soma = detalhes.base
      + detalhes.automaticos.reduce((total, item) => total + item.valor, 0)
      + detalhes.manuais.reduce((total, item) => total + item.valor, 0);
    const correcaoLimite = value - soma;
    if (correcaoLimite !== 0) {
      componentes.push({ label: 'Limite mínimo da ficha', value: formatarContribuicao(correcaoLimite) });
    }
    onOpenInfo({
      title,
      description,
      items: [...componentes, ...itensExtras],
      total: { label: labelTotal, value },
    });
  };

  return (
    <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6" data-tour="ficha-recursos">
      <SectionTitle title="Status Vitais" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <ResourceBar
          label="Vida"
          color="vermelho"
          current={atual.vida}
          max={maximo.vida}
          onAdd={(valor: number) => onStatusChange('vidaAtual', valor, maximo.vida)}
          onSub={(valor: number) => onStatusChange('vidaAtual', -valor, maximo.vida)}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'vidaMaxima'), 'Vida máxima', composicao.vida.automaticos)}
          onHelpClick={() => info('PONTOS DE VIDA', 'Representa a vitalidade e saúde física. Chegar a 0 significa cair morrendo.', 'Vida máxima', maximo.vida, composicao.vida)}
        />
        <ResourceBar
          label="Mana"
          color="azul"
          current={atual.mana}
          max={maximo.mana}
          onAdd={(valor: number) => onStatusChange('manaAtual', valor, maximo.mana)}
          onSub={(valor: number) => onStatusChange('manaAtual', -valor, maximo.mana)}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'manaMaxima'), 'Mana máxima', composicao.mana.automaticos)}
          onHelpClick={() => info('PONTOS DE MANA', 'A energia arcana e espiritual usada em magias e habilidades especiais.', 'Mana máxima', maximo.mana, composicao.mana)}
        />
        <ResourceBar
          label="Sanidade"
          color="roxo"
          current={atual.sanidade}
          max={maximo.sanidade}
          onAdd={(valor: number) => onStatusChange('sanidadeAtual', valor, maximo.sanidade)}
          onSub={(valor: number) => onStatusChange('sanidadeAtual', -valor, maximo.sanidade)}
          onMaxChange={onSanidadeMaximaChange}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'sanidadeMaxima'), 'Sanidade máxima', composicao.sanidade.automaticos)}
          onHelpClick={() => info('PONTOS DE SANIDADE', 'A integridade mental do personagem. Ver horrores pode drená-la.', 'Sanidade máxima', maximo.sanidade, composicao.sanidade)}
        />
        <ResourceBar
          label="Cansaço"
          color="cinza"
          current={atual.cansaco}
          max={maximo.cansaco}
          onAdd={(valor: number) => onStatusChange('cansacoAtual', valor, maximo.cansaco)}
          onSub={(valor: number) => onStatusChange('cansacoAtual', -valor, maximo.cansaco)}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'cansacoMaximo'), 'Limite de Cansaço', composicao.cansaco.automaticos)}
          onHelpClick={() => info(
            'PONTOS DE CANSAÇO',
            'Funciona ao contrário dos demais recursos: aumenta de zero até o limite e aplica penalidades progressivas.',
            'Limite de Cansaço',
            maximo.cansaco,
            composicao.cansaco,
            efeitosCansaco.map((efeito) => ({ label: 'Efeito ativo', value: efeito })),
          )}
        />
      </div>
      {efeitosCansaco.length > 0 && (
        <p className="mt-4 rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          <strong>Cansaço {atual.cansaco}:</strong> {efeitosCansaco.join(' · ')}
        </p>
      )}
    </section>
  );
}
