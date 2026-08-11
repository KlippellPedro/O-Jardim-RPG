import { useCallback, useEffect, useState } from 'react';
import { Building2, Car, Fuel, Heart, Minus, Plus, X } from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import { useCampaignSSE } from '../../../hooks/useCampaignSSE';
import { veiculosCampanhaApi, type ICampanhaVeiculoResumo } from '../../../services/veiculosCampanhaApi';
import { propriedadesCampanhaApi, type ICampanhaPropriedadeResumo } from '../../../services/propriedadesCampanhaApi';

const NIVEL_ACESSO_LABEL: Record<string, string> = {
  nenhum: 'Privado',
  visualizar: 'Visível à campanha',
  utilizar: 'Uso liberado à campanha',
};

const BarraRecurso = ({ atual, maximo, cor }: { atual: number; maximo: number; cor: string }) => {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

interface FrotaBasesPanelProps {
  onClose?: () => void;
}

export const FrotaBasesPanel = ({ onClose }: FrotaBasesPanelProps) => {
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const campanhaId = campanhaAtiva?.id;

  const [aba, setAba] = useState<'veiculos' | 'propriedades'>('veiculos');
  const [veiculos, setVeiculos] = useState<ICampanhaVeiculoResumo[]>([]);
  const [propriedades, setPropriedades] = useState<ICampanhaPropriedadeResumo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [ajustando, setAjustando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!campanhaId) return;
    setCarregando(true);
    try {
      const [v, p] = await Promise.all([
        veiculosCampanhaApi.listar(campanhaId),
        propriedadesCampanhaApi.listar(campanhaId),
      ]);
      setVeiculos(v.veiculos);
      setPropriedades(p.propriedades);
    } catch {
      // Falha silenciosa: o painel simplesmente mantém os últimos dados carregados.
    } finally {
      setCarregando(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useCampaignSSE(campanhaId, (tipo) => {
    if (tipo.startsWith('veiculo_') || tipo.startsWith('propriedade_')) void carregar();
  });

  const ajustarVida = async (v: ICampanhaVeiculoResumo, delta: number) => {
    if (!campanhaId || ajustando) return;
    setAjustando(v.id);
    try {
      await veiculosCampanhaApi.atualizarDelta(campanhaId, v.id, { versao: v.versao, delta_vida: delta });
      await carregar();
    } catch (e: any) {
      alert(e?.message || 'Não foi possível ajustar a vida do veículo.');
    } finally {
      setAjustando(null);
    }
  };

  const ajustarCombustivel = async (v: ICampanhaVeiculoResumo, delta: number) => {
    if (!campanhaId || ajustando) return;
    setAjustando(v.id);
    try {
      await veiculosCampanhaApi.atualizarDelta(campanhaId, v.id, { versao: v.versao, delta_combustivel: delta });
      await carregar();
    } catch (e: any) {
      alert(e?.message || 'Não foi possível ajustar o combustível do veículo.');
    } finally {
      setAjustando(null);
    }
  };

  if (!campanhaId) return null;

  return (
    <div className="flex h-full flex-col bg-[#0b0a10]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Frota & Bases</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white" aria-label="Fechar painel">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex border-b border-white/10">
        <button
          type="button"
          onClick={() => setAba('veiculos')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wide ${aba === 'veiculos' ? 'border-b-2 border-amber-400 text-amber-300' : 'text-white/40 hover:text-white/70'}`}
        >
          <Car size={13} /> Veículos
        </button>
        <button
          type="button"
          onClick={() => setAba('propriedades')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wide ${aba === 'propriedades' ? 'border-b-2 border-emerald-400 text-emerald-300' : 'text-white/40 hover:text-white/70'}`}
        >
          <Building2 size={13} /> Bases
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {carregando && veiculos.length === 0 && propriedades.length === 0 && (
          <p className="py-8 text-center text-xs text-white/40">Carregando...</p>
        )}

        {aba === 'veiculos' && (
          <div className="space-y-2">
            {veiculos.map((v) => (
              <div key={v.id} className="rounded-lg border border-amber-500/15 bg-amber-950/10 p-3">
                <div className="flex items-center gap-2">
                  {v.imagem_url
                    ? <img src={v.imagem_url} alt={v.nome} className="h-8 w-8 flex-shrink-0 rounded object-cover" />
                    : <Car size={18} className="flex-shrink-0 text-amber-400" />
                  }
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{v.nome}</span>
                </div>

                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Heart size={11} className="flex-shrink-0 text-red-400" />
                    <BarraRecurso atual={v.vida_atual} maximo={v.vida_maxima} cor="bg-red-500" />
                    <span className="w-12 flex-shrink-0 text-right text-[10px] font-mono text-white/60">{v.vida_atual}/{v.vida_maxima}</span>
                    <button type="button" disabled={ajustando === v.id} onClick={() => ajustarVida(v, -1)} className="text-white/40 hover:text-red-300 disabled:opacity-30"><Minus size={12} /></button>
                    <button type="button" disabled={ajustando === v.id} onClick={() => ajustarVida(v, 1)} className="text-white/40 hover:text-emerald-300 disabled:opacity-30"><Plus size={12} /></button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Fuel size={11} className="flex-shrink-0 text-amber-400" />
                    <BarraRecurso atual={v.combustivel_atual} maximo={v.combustivel_maximo} cor="bg-amber-500" />
                    <span className="w-12 flex-shrink-0 text-right text-[10px] font-mono text-white/60">{v.combustivel_atual}/{v.combustivel_maximo}</span>
                    <button type="button" disabled={ajustando === v.id} onClick={() => ajustarCombustivel(v, -1)} className="text-white/40 hover:text-red-300 disabled:opacity-30"><Minus size={12} /></button>
                    <button type="button" disabled={ajustando === v.id} onClick={() => ajustarCombustivel(v, 1)} className="text-white/40 hover:text-emerald-300 disabled:opacity-30"><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
            {!carregando && veiculos.length === 0 && (
              <p className="py-8 text-center text-xs text-white/40">Nenhum veículo visível nesta campanha.</p>
            )}
          </div>
        )}

        {aba === 'propriedades' && (
          <div className="space-y-2">
            {propriedades.map((p) => (
              <div key={p.id} className="rounded-lg border border-emerald-500/15 bg-emerald-950/10 p-3">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="flex-shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{p.nome}</span>
                </div>
                <p className="mt-1 text-[11px] text-white/50">
                  {p.tipo}{p.localizacao ? ` · ${p.localizacao}` : ''}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-white/30">
                  {NIVEL_ACESSO_LABEL[p.nivel_acesso_campanha] ?? p.nivel_acesso_campanha}
                </p>
              </div>
            ))}
            {!carregando && propriedades.length === 0 && (
              <p className="py-8 text-center text-xs text-white/40">Nenhuma base visível nesta campanha.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
