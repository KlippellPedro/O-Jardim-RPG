import { chaveAjuste } from '../../../services/ajustesFichaService';
import { ResourceBar, SectionTitle } from './SharedFichaComponents';

interface StatusVitaisSectionProps {
  atual: { vida: number; mana: number; sanidade: number; cansaco: number };
  maximo: { vida: number; mana: number; sanidade: number; cansaco: number };
  efeitosCansaco: string[];
  ajusteOrigem: {
    vida: { nome: string; valor: number };
    mana: { nome: string; valor: number };
    sanidade: { nome: string; valor: number };
  };
  ajusteEquipamento?: { vida: number; mana: number; sanidade: number; cansaco: number };
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
  ajusteOrigem: origem,
  ajusteEquipamento = { vida: 0, mana: 0, sanidade: 0, cansaco: 0 },
  onStatusChange,
  onSanidadeMaximaChange,
  onOpenInfo,
  onOpenAdjust,
}: StatusVitaisSectionProps) {
  const info = (title: string, description: string, label: string, value: number) =>
    onOpenInfo({ title, description, items: [{ label, value }] });

  return (
    <section className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
      <SectionTitle title="Status Vitais" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        <ResourceBar
          label="Vida"
          color="vermelho"
          current={atual.vida}
          max={maximo.vida}
          onAdd={(valor: number) => onStatusChange('vidaAtual', valor, maximo.vida)}
          onSub={(valor: number) => onStatusChange('vidaAtual', -valor, maximo.vida)}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'vidaMaxima'), 'Vida máxima', [origem.vida, { nome: 'Itens equipados', valor: ajusteEquipamento.vida }])}
          onHelpClick={() => info('PONTOS DE VIDA', 'Representa a vitalidade e saúde física. Chegar a 0 significa cair morrendo.', 'Vida máxima', maximo.vida)}
        />
        <ResourceBar
          label="Mana"
          color="azul"
          current={atual.mana}
          max={maximo.mana}
          onAdd={(valor: number) => onStatusChange('manaAtual', valor, maximo.mana)}
          onSub={(valor: number) => onStatusChange('manaAtual', -valor, maximo.mana)}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'manaMaxima'), 'Mana máxima', [origem.mana, { nome: 'Itens equipados', valor: ajusteEquipamento.mana }])}
          onHelpClick={() => info('PONTOS DE MANA', 'A energia arcana e espiritual usada em magias e habilidades especiais.', 'Mana máxima', maximo.mana)}
        />
        <ResourceBar
          label="Sanidade"
          color="roxo"
          current={atual.sanidade}
          max={maximo.sanidade}
          onAdd={(valor: number) => onStatusChange('sanidadeAtual', valor, maximo.sanidade)}
          onSub={(valor: number) => onStatusChange('sanidadeAtual', -valor, maximo.sanidade)}
          onMaxChange={onSanidadeMaximaChange}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'sanidadeMaxima'), 'Sanidade máxima', [origem.sanidade, { nome: 'Itens equipados', valor: ajusteEquipamento.sanidade }])}
          onHelpClick={() => info('PONTOS DE SANIDADE', 'A integridade mental do personagem. Ver horrores pode drená-la.', 'Sanidade máxima', maximo.sanidade)}
        />
        <ResourceBar
          label="Cansaço"
          color="cinza"
          current={atual.cansaco}
          max={maximo.cansaco}
          onAdd={(valor: number) => onStatusChange('cansacoAtual', valor, maximo.cansaco)}
          onSub={(valor: number) => onStatusChange('cansacoAtual', -valor, maximo.cansaco)}
          onAdjustClick={() => onOpenAdjust(chaveAjuste('recurso', 'cansacoMaximo'), 'Limite de Cansaço', [{ nome: 'Itens equipados', valor: ajusteEquipamento.cansaco }])}
          onHelpClick={() => onOpenInfo({
            title: 'PONTOS DE CANSAÇO',
            description: 'Funciona ao contrário dos demais recursos: aumenta de zero até o limite e aplica penalidades progressivas.',
            items: [
              { label: 'Limite', value: maximo.cansaco },
              ...efeitosCansaco.map((efeito) => ({ label: 'Efeito ativo', value: efeito })),
            ],
          })}
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
