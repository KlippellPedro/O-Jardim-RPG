import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Cpu, Crown, Footprints, Gem, Hand, Shield, Shirt, Sword } from 'lucide-react';
import {
  distribuirNoBoneco,
  type EncaixeCorpo,
  type ItemDoBoneco,
} from '../utils/bonecoEquipamento';
import { grupoLimiteItemEspecial } from '../../../services/itensEspeciaisService';
import './bonecoEquipamento.css';

export interface ItemBoneco extends ItemDoBoneco {
  raridade: string;
  dano?: string;
  defesa?: number;
  penalidade?: number;
  efeito?: string;
}

interface BonecoEquipamentoProps {
  itens: ItemBoneco[];
  vagasEspeciais: number;
  /** Item recém-equipado: o encaixe dele "acende" por um instante. */
  recenteId?: string | null;
  onGuardar: (id: string) => void;
}

const COR_RARIDADE: Record<string, string> = {
  comum: '#94a3b8',
  incomum: '#34d399',
  raro: '#60a5fa',
  epico: '#c084fc',
  lendario: '#fbbf24',
  reliquia: '#f87171',
  'reliquia da criacao': '#e0f2fe',
};

const ROTULO_RARIDADE: Record<string, string> = {
  comum: 'Comum',
  incomum: 'Incomum',
  raro: 'Raro',
  epico: 'Épico',
  lendario: 'Lendário',
  reliquia: 'Mítico',
  'reliquia da criacao': 'Relíquia da Criação',
};

const ENCAIXES: Array<{ id: EncaixeCorpo; rotulo: string; icone: ReactNode; x: number; y: number }> = [
  { id: 'cabeca', rotulo: 'Cabeça', icone: <Crown size={18} />, x: 50, y: 9 },
  { id: 'torso', rotulo: 'Torso', icone: <Shirt size={18} />, x: 50, y: 35 },
  { id: 'maoPrincipal', rotulo: 'Mão principal', icone: <Sword size={18} />, x: 15, y: 47 },
  { id: 'maoSecundaria', rotulo: 'Mão secundária', icone: <Shield size={18} />, x: 85, y: 47 },
  { id: 'luvas', rotulo: 'Luvas', icone: <Hand size={18} />, x: 15, y: 71 },
  { id: 'pes', rotulo: 'Pés', icone: <Footprints size={18} />, x: 50, y: 90 },
];

const corDe = (item: ItemBoneco) => COR_RARIDADE[item.raridade] ?? COR_RARIDADE.comum;

/** Boneco do personagem: mostra o que está vestido e onde, no lugar de uma
 * lista. Só apresenta; guardar um item chama o mesmo fluxo do inventário. */
export function BonecoEquipamento({ itens, vagasEspeciais, recenteId, onGuardar }: BonecoEquipamentoProps) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const distribuicao = useMemo(
    () => distribuirNoBoneco(itens, (item) => grupoLimiteItemEspecial(item) !== null),
    [itens],
  );
  const totalEquipados = itens.filter((item) => item.equipado).length;
  const selecionado = itens.find((item) => item.id === selecionadoId && item.equipado) ?? null;

  const botaoItem = (item: ItemBoneco | undefined, rotulo: string, icone: ReactNode, estilo?: CSSProperties, classe = '') => {
    const cor = item ? corDe(item) : undefined;
    return (
      <button
        type="button"
        key={item?.id ?? rotulo}
        onClick={() => item && setSelecionadoId((atual) => (atual === item.id ? null : item.id))}
        disabled={!item}
        aria-pressed={item ? selecionadoId === item.id : undefined}
        aria-label={item ? `${rotulo}: ${item.nome}` : `${rotulo}: vazio`}
        title={item ? item.nome : `${rotulo} (vazio)`}
        style={{ ...estilo, ...(cor ? { '--boneco-cor': cor } : {}) } as CSSProperties}
        className={`boneco-encaixe ${item ? 'boneco-encaixe--cheio' : ''} ${item && item.id === recenteId ? 'boneco-encaixe--novo' : ''} ${item && selecionadoId === item.id ? 'boneco-encaixe--selecionado' : ''} ${classe}`}
      >
        {icone}
        {item ? <span className="boneco-encaixe__nome">{item.nome}</span> : null}
      </button>
    );
  };

  return (
    <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-5" data-tour="inventario-boneco">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-lg font-bold text-white">Equipamento</h3>
        <span className="text-xs text-gray-500">{totalEquipados} {totalEquipados === 1 ? 'peça vestida' : 'peças vestidas'}</span>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,280px)_1fr]">
        <div className="boneco mx-auto w-full max-w-[280px]">
          <svg viewBox="0 0 100 133" className="boneco__silhueta" aria-hidden="true">
            <defs>
              <linearGradient id="boneco-corpo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#c7a44c" stopOpacity="0.28" />
                <stop offset="1" stopColor="#c7a44c" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="13" r="8" fill="url(#boneco-corpo)" stroke="#c7a44c" strokeOpacity="0.35" />
            <path
              d="M38 24 Q50 28 62 24 L72 30 L76 62 L68 64 L66 46 L64 84 L60 124 L52 124 L50 92 L48 124 L40 124 L36 84 L34 46 L32 64 L24 62 L28 30 Z"
              fill="url(#boneco-corpo)"
              stroke="#c7a44c"
              strokeOpacity="0.35"
              strokeLinejoin="round"
            />
          </svg>
          {ENCAIXES.map((encaixe) => botaoItem(
            distribuicao.corpo[encaixe.id],
            encaixe.rotulo,
            encaixe.icone,
            { left: `${encaixe.x}%`, top: `${encaixe.y}%` },
            'boneco-encaixe--corpo',
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/80">
              Vagas especiais · {distribuicao.especiais.length}/{vagasEspeciais}
            </h4>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: Math.max(vagasEspeciais, distribuicao.especiais.length) }, (_, indice) => botaoItem(
                distribuicao.especiais[indice],
                `Vaga especial ${indice + 1}`,
                <Gem size={18} />,
                undefined,
                'boneco-encaixe--lista',
              ))}
            </div>
          </div>

          {distribuicao.implantes.length ? (
            <div>
              <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300/80">Implantes</h4>
              <div className="flex flex-wrap gap-2">
                {distribuicao.implantes.map((item) => botaoItem(item, 'Implante', <Cpu size={18} />, undefined, 'boneco-encaixe--lista'))}
              </div>
            </div>
          ) : null}

          {distribuicao.outros.length ? (
            <div>
              <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Também em uso</h4>
              <div className="flex flex-wrap gap-2">
                {distribuicao.outros.map((item) => botaoItem(item, 'Em uso', <Sword size={18} />, undefined, 'boneco-encaixe--lista'))}
              </div>
            </div>
          ) : null}

          <div className="min-h-[92px] rounded-xl border border-white/5 bg-black/25 p-3 text-sm" aria-live="polite">
            {selecionado ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="block truncate text-white">{selecionado.nome}</strong>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: corDe(selecionado) }}>
                      {ROTULO_RARIDADE[selecionado.raridade] ?? 'Comum'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onGuardar(selecionado.id); setSelecionadoId(null); }}
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:border-[#c7a44c]/40 hover:text-[#c7a44c]"
                  >
                    Guardar
                  </button>
                </div>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  {[
                    selecionado.dano ? `Dano ${selecionado.dano}` : null,
                    selecionado.defesa ? `Defesa +${selecionado.defesa}` : null,
                    selecionado.penalidade ? `Penalidade -${selecionado.penalidade}` : null,
                    selecionado.efeito || null,
                  ].filter(Boolean).join(' · ') || 'Sem números registrados.'}
                </p>
              </>
            ) : (
              <p className="text-xs leading-5 text-gray-500">
                {totalEquipados
                  ? 'Toque numa peça para ver os detalhes ou guardá-la.'
                  : 'Nada equipado ainda. Equipe uma arma ou armadura no inventário e ela aparece aqui.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
