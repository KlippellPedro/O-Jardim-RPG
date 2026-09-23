import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Dices, Loader2, Package, ShieldAlert, Smartphone, Sparkles, Swords, X, Zap } from 'lucide-react';
import { registrosApi } from '../../../services/registrosApi';
import { useWakeLock } from '../../../hooks/useWakeLock';
import {
  PASSOS_RECURSO,
  descreverConta,
  limitarBonus,
  lerResultadoRolagem,
  percentual,
  rotuloDoGrau,
  tomDaBarra,
  tomDoResultado,
  type IResultadoRolagem,
  type TomBarra,
  type TomResultado,
} from '../utils/modoMesa';

export interface IRecursoMesa {
  atual: number;
  max: number;
  /** Extra acima do máximo. */
  extra?: number;
}

export interface IAtributoMesa {
  chave: string;
  rotulo: string;
  mod: number;
  /** Desvantagens automáticas (cansaço, sobrecarga) que já valem para este teste. */
  desvantagens: number;
}

export interface ICondicaoMesa {
  id?: string;
  nome: string;
  descricao?: string;
}

interface IModoMesaProps {
  aberto: boolean;
  onFechar: () => void;
  nome: string;
  nivel: number;
  campanhaId: string | null;
  personagemId: string;
  vida: IRecursoMesa;
  mana: IRecursoMesa;
  estamina: IRecursoMesa;
  sanidade: IRecursoMesa;
  cansaco: IRecursoMesa;
  onStatus: (campo: 'vidaAtual' | 'manaAtual' | 'estaminaAtual' | 'sanidadeAtual' | 'cansacoAtual', delta: number, maximo: number) => void;
  defesa: number;
  iniciativa: number;
  movimento: number;
  atributos: IAtributoMesa[];
  condicoes: ICondicaoMesa[];
  onRemoverCondicao: (indice: number) => void;
  onAbrirAba: (aba: 'Ataques' | 'Magias' | 'Poderes' | 'Inventário') => void;
}

const COR_BARRA: Record<TomBarra, string> = { ok: '#4ade80', alerta: '#facc15', critico: '#f87171' };
const COR_RESULTADO: Record<TomResultado, string> = {
  critico: '#facc15',
  falha: '#f87171',
  sucesso: '#4ade80',
  derrota: '#fb923c',
  neutro: '#e5e7eb',
};

const vibrar = (ms = 14) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // Sem suporte a vibração (iOS, desktop): tudo continua igual.
  }
};

const sinal = (valor: number) => (valor > 0 ? `+${valor}` : String(valor));

interface ICartaoRecursoProps {
  rotulo: string;
  cor: string;
  recurso: IRecursoMesa;
  invertido?: boolean;
  onMudar: (delta: number) => void;
}

const CartaoRecurso = ({ rotulo, cor, recurso, invertido = false, onMudar }: ICartaoRecursoProps) => {
  const pct = percentual(recurso.atual, recurso.max);
  const tom = tomDaBarra(pct, invertido);
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0f0e15] p-4" aria-label={rotulo}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: cor }}>{rotulo}</span>
        <span className="font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
          <span className="text-3xl" style={{ color: tom === 'critico' && !invertido ? COR_BARRA.critico : undefined }}>{recurso.atual}</span>
          <span className="text-lg text-gray-500"> / {recurso.max}</span>
          {recurso.extra ? <span className="ml-2 text-base text-cyan-300">+{recurso.extra}</span> : null}
        </span>
      </div>
      <div
        className="mt-2 h-3 overflow-hidden rounded-full bg-black/60"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={recurso.max}
        aria-valuenow={Math.max(0, recurso.atual)}
        aria-label={`${rotulo}: ${recurso.atual} de ${recurso.max}`}
      >
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: COR_BARRA[tom] }} />
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {PASSOS_RECURSO.map((passo) => (
          <button
            key={passo}
            type="button"
            onClick={() => { vibrar(); onMudar(passo); }}
            aria-label={`${passo > 0 ? 'Somar' : 'Tirar'} ${Math.abs(passo)} de ${rotulo}`}
            className={`min-h-12 rounded-xl border text-base font-bold transition-transform active:scale-95 ${passo < 0
              ? 'border-red-400/30 bg-red-400/10 text-red-200'
              : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'}`}
          >
            {passo > 0 ? `+${passo}` : `−${Math.abs(passo)}`}
          </button>
        ))}
      </div>
    </section>
  );
};

/** Tela cheia para usar no celular durante a sessão: recursos em botões
 * grandes, dado e testes a um toque, condições e atalhos. Não muda o que a
 * ficha guarda; só reorganiza o que já existe para caber na mão. */
export const ModoMesa = ({
  aberto,
  onFechar,
  nome,
  nivel,
  campanhaId,
  personagemId,
  vida,
  mana,
  estamina,
  sanidade,
  cansaco,
  onStatus,
  defesa,
  iniciativa,
  movimento,
  atributos,
  condicoes,
  onRemoverCondicao,
  onAbrirAba,
}: IModoMesaProps) => {
  const [manterTela, setManterTela] = useState(true);
  const [bonus, setBonus] = useState(0);
  const [modo, setModo] = useState<'normal' | 'vantagem' | 'desvantagem'>('normal');
  const [rolando, setRolando] = useState(false);
  const [erro, setErro] = useState('');
  const [ultimo, setUltimo] = useState<{ titulo: string; resultado: IResultadoRolagem } | null>(null);
  const { suportado, travado } = useWakeLock(aberto && manterTela);

  useEffect(() => {
    if (!aberto) return undefined;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const aoTeclar = (evento: KeyboardEvent) => { if (evento.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto, onFechar]);

  if (!aberto || typeof document === 'undefined') return null;

  const rolar = async (titulo: string, bonusTeste: number, vantagens: number, desvantagens: number) => {
    if (rolando) return;
    if (!campanhaId) {
      setErro('Selecione uma campanha para rolar dados.');
      return;
    }
    setErro('');
    setRolando(true);
    vibrar(20);
    try {
      const { registro } = await registrosApi.rolar({ campanhaId, personagemId, titulo, bonus: bonusTeste, vantagens, desvantagens });
      const resultado = lerResultadoRolagem(registro);
      if (resultado) setUltimo({ titulo, resultado });
      vibrar(resultado?.critico || resultado?.falha ? 60 : 25);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível rolar o dado.');
    } finally {
      setRolando(false);
    }
  };

  const rolarLivre = () => rolar('Teste', bonus, modo === 'vantagem' ? 1 : 0, modo === 'desvantagem' ? 1 : 0);
  const rolarAtributo = (atributo: IAtributoMesa) => rolar(`Teste de ${atributo.rotulo}`, atributo.mod, 0, atributo.desvantagens);

  const atalhos = [
    { aba: 'Ataques' as const, rotulo: 'Ataques', icone: Swords },
    { aba: 'Magias' as const, rotulo: 'Magias', icone: Sparkles },
    { aba: 'Poderes' as const, rotulo: 'Poderes', icone: Zap },
    { aba: 'Inventário' as const, rotulo: 'Itens', icone: Package },
  ];

  const tomUltimo = ultimo ? tomDoResultado(ultimo.resultado) : 'neutro';
  const grau = ultimo ? rotuloDoGrau(ultimo.resultado) : null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Modo mesa de ${nome}`}
      className="fixed inset-0 z-[150] flex flex-col bg-[#07060b] text-white"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b0a10] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#c7a44c]">
            <Smartphone size={12} aria-hidden="true" /> Modo mesa
          </p>
          <h2 className="truncate text-lg font-bold" style={{ fontFamily: 'Cinzel, serif' }}>{nome} <span className="text-sm font-normal text-gray-500">Nv {nivel}</span></h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {suportado ? (
            <button
              type="button"
              aria-pressed={manterTela}
              onClick={() => setManterTela(!manterTela)}
              title={travado ? 'A tela não vai apagar' : 'Manter a tela ligada'}
              className={`min-h-11 rounded-xl border px-3 text-[11px] font-bold ${manterTela ? 'border-[#c7a44c]/40 bg-[#c7a44c]/10 text-[#e3c46f]' : 'border-white/10 text-gray-400'}`}
            >
              {manterTela ? (travado ? 'Tela ligada' : 'Ligando...') : 'Tela normal'}
            </button>
          ) : null}
          <button type="button" onClick={onFechar} aria-label="Sair do Modo mesa" className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-gray-300 active:scale-95">
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 pb-6 pt-4">
        <CartaoRecurso rotulo="Vida" cor="#f87171" recurso={vida} onMudar={(delta) => onStatus('vidaAtual', delta, vida.max)} />
        <CartaoRecurso rotulo="Mana" cor="#60a5fa" recurso={mana} onMudar={(delta) => onStatus('manaAtual', delta, mana.max)} />
        <CartaoRecurso rotulo="Estamina" cor="#34d399" recurso={estamina} onMudar={(delta) => onStatus('estaminaAtual', delta, estamina.max)} />
        <CartaoRecurso rotulo="Sanidade" cor="#c084fc" recurso={sanidade} onMudar={(delta) => onStatus('sanidadeAtual', delta, sanidade.max)} />

        <div className="grid grid-cols-3 gap-2">
          {[['Defesa', String(defesa)], ['Iniciativa', sinal(iniciativa)], ['Movimento', `${String(movimento).replace('.', ',')} m`]].map(([rotulo, valor]) => (
            <div key={rotulo} className="rounded-xl border border-white/10 bg-[#0f0e15] px-2 py-3 text-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{rotulo}</div>
              <div className="text-xl font-bold" style={{ fontFamily: 'Cinzel, serif' }}>{valor}</div>
            </div>
          ))}
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0f0e15] p-4" aria-label="Cansaço">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">Cansaço</span>
              <span className="ml-2 font-bold" style={{ fontFamily: 'Cinzel, serif' }}>{cansaco.atual}<span className="text-gray-500"> / {cansaco.max}</span></span>
            </div>
            <div className="flex gap-2">
              {[-1, 1].map((passo) => (
                <button
                  key={passo}
                  type="button"
                  onClick={() => { vibrar(); onStatus('cansacoAtual', passo, cansaco.max); }}
                  aria-label={passo > 0 ? 'Somar 1 de Cansaço' : 'Tirar 1 de Cansaço'}
                  className="h-11 w-14 rounded-xl border border-white/15 bg-white/[0.04] text-base font-bold active:scale-95"
                >
                  {passo > 0 ? '+1' : '−1'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Testes de atributo">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Testes rápidos</h3>
          <div className="grid grid-cols-4 gap-2">
            {atributos.map((atributo) => (
              <button
                key={atributo.chave}
                type="button"
                disabled={rolando}
                onClick={() => void rolarAtributo(atributo)}
                aria-label={`Testar ${atributo.rotulo}, modificador ${sinal(atributo.mod)}`}
                className="flex min-h-16 flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0f0e15] active:scale-95 disabled:opacity-50"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{atributo.rotulo.slice(0, 3)}</span>
                <span className="text-lg font-bold" style={{ color: atributo.mod >= 0 ? '#86efac' : '#fca5a5' }}>{sinal(atributo.mod)}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Condições ativas">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            <ShieldAlert size={12} /> Condições ativas
          </h3>
          {condicoes.length ? (
            <ul className="space-y-2">
              {condicoes.map((condicao, indice) => (
                <li key={condicao.id || `${condicao.nome}-${indice}`} className="flex items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.05] p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold uppercase tracking-wide text-red-300">{condicao.nome}</div>
                    {condicao.descricao ? <p className="mt-0.5 line-clamp-3 text-xs leading-5 text-gray-400">{condicao.descricao}</p> : null}
                  </div>
                  <button type="button" onClick={() => onRemoverCondicao(indice)} aria-label={`Remover condição ${condicao.nome}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-400 active:scale-95">
                    <X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 py-4 text-center text-sm text-gray-600">Nenhuma condição ativa.</p>
          )}
        </section>

        <section aria-label="Atalhos">
          <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
            <BookOpen size={12} /> Ir para
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {atalhos.map(({ aba, rotulo, icone: Icone }) => (
              <button
                key={aba}
                type="button"
                onClick={() => { onFechar(); onAbrirAba(aba); }}
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-[#0f0e15] text-xs font-bold text-gray-300 active:scale-95"
              >
                <Icone size={18} aria-hidden="true" />
                {rotulo}
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="border-t border-[#c7a44c]/25 bg-[#0b0a10] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.5)]" aria-label="Rolar dado">
        {erro ? <p role="alert" className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{erro}</p> : null}
        {ultimo ? (
          <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border bg-black/40 px-3 py-2" style={{ borderColor: `${COR_RESULTADO[tomUltimo]}66` }} role="status">
            <div className="min-w-0">
              <div className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">{ultimo.titulo}</div>
              <div className="truncate text-xs text-gray-400">{descreverConta(ultimo.resultado)}{grau ? <span className="ml-2 font-black tracking-widest" style={{ color: COR_RESULTADO[tomUltimo] }}>{grau}</span> : null}</div>
            </div>
            <div className="shrink-0 text-4xl font-black leading-none" style={{ color: COR_RESULTADO[tomUltimo], fontFamily: 'Cinzel, serif' }}>{ultimo.resultado.total ?? ultimo.resultado.natural}</div>
          </div>
        ) : null}
        <div className="mb-2 grid grid-cols-[1fr_auto] items-center gap-3">
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Vantagem ou desvantagem">
            {([['desvantagem', 'Desv.'], ['normal', 'Normal'], ['vantagem', 'Vant.']] as const).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={modo === valor}
                onClick={() => setModo(valor)}
                className={`min-h-10 rounded-lg border text-xs font-bold ${modo === valor
                  ? valor === 'vantagem' ? 'border-emerald-400/60 bg-emerald-400/15 text-emerald-200'
                    : valor === 'desvantagem' ? 'border-red-400/60 bg-red-400/15 text-red-200'
                      : 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e3c46f]'
                  : 'border-white/10 text-gray-400'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1" role="group" aria-label="Bônus do teste">
            <button type="button" aria-label="Diminuir bônus" onClick={() => setBonus((valor) => limitarBonus(valor - 1))} className="h-10 w-10 rounded-lg border border-white/15 bg-black/30 text-lg font-bold active:scale-95">−</button>
            <span className="w-9 text-center text-base font-bold" aria-live="polite">{sinal(bonus)}</span>
            <button type="button" aria-label="Aumentar bônus" onClick={() => setBonus((valor) => limitarBonus(valor + 1))} className="h-10 w-10 rounded-lg border border-white/15 bg-black/30 text-lg font-bold active:scale-95">+</button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void rolarLivre()}
          disabled={rolando}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#c7a44c]/50 bg-[#c7a44c]/20 text-lg font-black uppercase tracking-[0.12em] text-[#f3dc8f] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {rolando ? <Loader2 size={24} className="animate-spin" /> : <Dices size={24} />}
          Rolar d20 {bonus !== 0 ? sinal(bonus) : ''}
        </button>
      </footer>
    </div>,
    document.body,
  );
};
