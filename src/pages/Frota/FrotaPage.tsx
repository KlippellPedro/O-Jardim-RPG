import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Car, ChevronDown, Fuel, Heart, MapPin, Minus, Plus, Shield, Users } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCampaignSSE } from '../../hooks/useCampaignSSE';
import { veiculosCampanhaApi, type ICampanhaVeiculo, type ICampanhaVeiculoResumo } from '../../services/veiculosCampanhaApi';
import { propriedadesCampanhaApi, type ICampanhaPropriedadeResumo } from '../../services/propriedadesCampanhaApi';

const ACESSO: Record<string, string> = {
  nenhum: 'Privado',
  visualizar: 'Visível à campanha',
  utilizar: 'Uso liberado à campanha',
};

const RARIDADE: Record<string, { rotulo: string; cor: string }> = {
  comum: { rotulo: 'Comum', cor: '#9ca3af' },
  incomum: { rotulo: 'Incomum', cor: '#4ade80' },
  raro: { rotulo: 'Raro', cor: '#38bdf8' },
  epico: { rotulo: 'Épico', cor: '#a78bfa' },
  lendario: { rotulo: 'Lendário', cor: '#facc15' },
};

const percentual = (atual: number, maximo: number) => (maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0);

const corDaVida = (pct: number) => (pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : '#34d399');

interface IMedidorProps {
  icone: typeof Heart;
  rotulo: string;
  atual: number;
  maximo: number;
  cor: string;
  ocupado: boolean;
  onMenos: () => void;
  onMais: () => void;
}

const Medidor = ({ icone: Icone, rotulo, atual, maximo, cor, ocupado, onMenos, onMais }: IMedidorProps) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 font-bold text-gray-300"><Icone size={13} style={{ color: cor }} aria-hidden="true" /> {rotulo}</span>
      <span className="tabular-nums text-gray-400"><strong className="text-white">{atual}</strong> / {maximo}</span>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white disabled:opacity-30" aria-label={`Diminuir ${rotulo}`} disabled={ocupado || atual <= 0} onClick={onMenos}><Minus size={14} /></button>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={maximo} aria-valuenow={atual}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentual(atual, maximo)}%`, backgroundColor: cor }} />
      </div>
      <button type="button" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 hover:text-white disabled:opacity-30" aria-label={`Aumentar ${rotulo}`} disabled={ocupado || atual >= maximo} onClick={onMais}><Plus size={14} /></button>
    </div>
  </div>
);

interface ICartaoVeiculoProps {
  veiculo: ICampanhaVeiculoResumo;
  campanhaId: string;
  ocupado: boolean;
  onAjustar: (veiculo: ICampanhaVeiculoResumo, campo: 'delta_vida' | 'delta_combustivel', delta: number) => void;
}

const CartaoVeiculo = ({ veiculo, campanhaId, ocupado, onAjustar }: ICartaoVeiculoProps) => {
  const [aberto, setAberto] = useState(false);
  const [detalhe, setDetalhe] = useState<ICampanhaVeiculo | null>(null);
  const raridade = RARIDADE[veiculo.raridade] ?? RARIDADE.comum;
  const pctVida = percentual(veiculo.vida_atual, veiculo.vida_maxima);

  useEffect(() => {
    if (!aberto || detalhe) return;
    veiculosCampanhaApi.obter(campanhaId, veiculo.id).then(setDetalhe).catch(() => undefined);
  }, [aberto, detalhe, campanhaId, veiculo.id]);

  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-[#100f17]">
      <div className="relative h-32 bg-gradient-to-br from-amber-500/15 via-transparent to-transparent">
        {veiculo.imagem_url ? (
          <img src={veiculo.imagem_url} alt={veiculo.nome} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center"><Car size={44} className="text-amber-400/60" aria-hidden="true" /></div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#100f17] to-transparent" />
        <span className="absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest backdrop-blur-md" style={{ borderColor: `${raridade.cor}88`, color: raridade.cor, backgroundColor: 'rgba(11,10,16,0.7)' }}>{raridade.rotulo}</span>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h3 className="truncate text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{veiculo.nome}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><Users size={11} aria-hidden="true" /> Capacidade {veiculo.capacidade}</span>
            <span>{ACESSO[veiculo.nivel_acesso_campanha] ?? veiculo.nivel_acesso_campanha}</span>
          </p>
        </div>

        <Medidor icone={Heart} rotulo="Estrutura" atual={veiculo.vida_atual} maximo={veiculo.vida_maxima} cor={corDaVida(pctVida)} ocupado={ocupado} onMenos={() => onAjustar(veiculo, 'delta_vida', -1)} onMais={() => onAjustar(veiculo, 'delta_vida', 1)} />
        <Medidor icone={Fuel} rotulo="Combustível" atual={veiculo.combustivel_atual} maximo={veiculo.combustivel_maximo} cor="#f59e0b" ocupado={ocupado} onMenos={() => onAjustar(veiculo, 'delta_combustivel', -1)} onMais={() => onAjustar(veiculo, 'delta_combustivel', 1)} />

        <button type="button" onClick={() => setAberto((valor) => !valor)} aria-expanded={aberto} className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:bg-white/5">
          Ficha técnica <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {aberto ? (
          detalhe ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {([
                ['Defesa', detalhe.defesa], ['Resistência', detalhe.resistencia], ['Deslocamento', detalhe.deslocamento],
                ['Manobra', detalhe.manobrabilidade], ['Cobertura', detalhe.cobertura], ['Tripulação mínima', detalhe.tripulacao_minima],
              ] as Array<[string, string | number]>).map(([rotulo, valor]) => (
                <div key={rotulo} className="flex justify-between border-b border-white/5 pb-1"><dt className="text-gray-500">{rotulo}</dt><dd className="font-bold text-gray-200">{valor === '' ? '-' : valor}</dd></div>
              ))}
              {detalhe.descricao ? <p className="col-span-2 mt-1 leading-5 text-gray-400">{detalhe.descricao}</p> : null}
            </dl>
          ) : <p className="text-xs text-gray-500" aria-busy="true">Abrindo a ficha técnica...</p>
        ) : null}
      </div>
    </li>
  );
};

/** Frota e bases da campanha numa página só: o que é de todos, com vida e combustível à vista. */
export default function FrotaPage() {
  const navigate = useNavigate();
  const campanhaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  const campanhaNome = useAuthStore((estado) => estado.campanhaAtiva?.nome);
  const [aba, setAba] = useState<'veiculos' | 'propriedades'>('veiculos');
  const [veiculos, setVeiculos] = useState<ICampanhaVeiculoResumo[]>([]);
  const [propriedades, setPropriedades] = useState<ICampanhaPropriedadeResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [ajustando, setAjustando] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!campanhaId) return;
    try {
      const [v, p] = await Promise.all([veiculosCampanhaApi.listar(campanhaId), propriedadesCampanhaApi.listar(campanhaId)]);
      setVeiculos(v.veiculos);
      setPropriedades(p.propriedades);
      setErro('');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar a frota.');
    } finally {
      setCarregando(false);
    }
  }, [campanhaId]);

  useEffect(() => { void carregar(); }, [carregar]);

  useCampaignSSE(campanhaId, (tipo) => {
    if (tipo.startsWith('veiculo_') || tipo.startsWith('propriedade_')) void carregar();
  });

  const ajustar = async (veiculo: ICampanhaVeiculoResumo, campo: 'delta_vida' | 'delta_combustivel', delta: number) => {
    if (!campanhaId || ajustando) return;
    setAjustando(veiculo.id);
    try {
      await veiculosCampanhaApi.atualizarDelta(campanhaId, veiculo.id, { versao: veiculo.versao, [campo]: delta });
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível ajustar o veículo.');
    } finally {
      setAjustando(null);
    }
  };

  if (!campanhaId) {
    return <main className="app-page mx-auto max-w-3xl text-center text-gray-400"><p>Selecione uma campanha para ver a frota e as bases.</p></main>;
  }

  return (
    <main className="app-page mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <button type="button" onClick={() => navigate('/sessao')} className="mb-3 flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white"><ArrowLeft size={14} /> Voltar à sessão</button>
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#c7a44c]">{campanhaNome}</p>
        <h1 className="mt-1 text-[clamp(1.9rem,6vw,2.8rem)] font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Frota e Bases</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">Veículos e bases que a campanha inteira pode ver. Vida e combustível mudam aqui na hora, para todo mundo.</p>
      </header>

      <div className="flex gap-2 border-b border-white/10 pb-3" role="tablist" aria-label="Frota ou bases">
        {([['veiculos', 'Veículos', Car, veiculos.length], ['propriedades', 'Bases', Building2, propriedades.length]] as const).map(([id, rotulo, Icone, total]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-colors ${aba === id ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#f3dc8f]' : 'border-transparent text-gray-400 hover:text-white'}`}>
            <Icone size={15} aria-hidden="true" /> {rotulo} <span className="rounded-full bg-white/10 px-2 text-[11px]">{total}</span>
          </button>
        ))}
      </div>

      {erro ? <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{erro}</p> : null}
      {carregando ? <p className="py-12 text-center text-sm text-gray-500" aria-busy="true">Carregando...</p> : null}

      {!carregando && aba === 'veiculos' ? (
        veiculos.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-gray-500">Nenhum veículo visível nesta campanha.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {veiculos.map((veiculo) => <CartaoVeiculo key={veiculo.id} veiculo={veiculo} campanhaId={campanhaId} ocupado={ajustando === veiculo.id} onAjustar={(v, campo, delta) => void ajustar(v, campo, delta)} />)}
          </ul>
        )
      ) : null}

      {!carregando && aba === 'propriedades' ? (
        propriedades.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-gray-500">Nenhuma base visível nesta campanha.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {propriedades.map((base) => (
              <li key={base.id} className="rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-emerald-500/10 to-transparent p-5">
                <Building2 size={26} className="mb-3 text-emerald-300" aria-hidden="true" />
                <h3 className="truncate text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{base.nome}</h3>
                <p className="mt-1 text-sm capitalize text-gray-300">{base.tipo}</p>
                {base.localizacao ? <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-400"><MapPin size={12} aria-hidden="true" /> {base.localizacao}</p> : null}
                <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500"><Shield size={11} aria-hidden="true" /> {ACESSO[base.nivel_acesso_campanha] ?? base.nivel_acesso_campanha}</p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </main>
  );
}
