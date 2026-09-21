import { useState, type CSSProperties } from 'react';
import { Eye, EyeOff, Hourglass, Minus, PieChart, Plus, Timer, Trash2 } from 'lucide-react';
import type { CorRelogio, ICronometro, IRelogio } from '../../../services/mesaApi';
import { COR_RELOGIO, TAMANHOS_RELOGIO, relogioCompleto } from './relogios';
import { ATALHOS_DURACAO, duracaoDe, formatarTempo } from './cronometros';
import { CronometroCartao } from './CronometroCartao';
import { RelogioSvg } from './RelogioSvg';
import { useTempo } from './useTempo';

interface IAbaRelogiosProps {
  relogios: IRelogio[];
  cronometros: ICronometro[];
  recebidoEm: number;
  gestor: boolean;
  ocupado: boolean;
  agir: (acao: string, dados?: Record<string, unknown>) => Promise<boolean>;
}

type Tipo = 'relogio' | 'cronometro';

const SeletorDeCor = ({ cor, onCor }: { cor: CorRelogio; onCor: (cor: CorRelogio) => void }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Cor">
    {(Object.keys(COR_RELOGIO) as CorRelogio[]).map((chave) => (
      <button
        key={chave}
        type="button"
        aria-pressed={cor === chave}
        onClick={() => onCor(chave)}
        className="mesa-botao mesa-botao--pequeno"
        style={cor === chave ? { borderColor: COR_RELOGIO[chave].cheia, color: '#fff' } : undefined}
      >
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COR_RELOGIO[chave].cheia }} aria-hidden="true" />
        {COR_RELOGIO[chave].rotulo}
      </button>
    ))}
  </div>
);

/** Relógios de fatias (progresso de algo) e cronômetros (pressão de tempo real). */
export const AbaRelogios = ({ relogios, cronometros, recebidoEm, gestor, ocupado, agir }: IAbaRelogiosProps) => {
  const [tipo, setTipo] = useState<Tipo>('relogio');
  const [titulo, setTitulo] = useState('');
  const [fatias, setFatias] = useState<number>(6);
  const [cor, setCor] = useState<CorRelogio>('perigo');
  const [visivel, setVisivel] = useState(true);
  const [minutos, setMinutos] = useState('5');
  const [segundos, setSegundos] = useState('0');
  const [iniciar, setIniciar] = useState(true);

  const agora = useTempo(cronometros.some((cronometro) => cronometro.situacao === 'correndo'));
  const duracao = duracaoDe(minutos, segundos);

  const criar = async () => {
    if (!titulo.trim()) return;
    const feito = tipo === 'relogio'
      ? await agir('relogio_criar', { titulo, fatias, cor, visivel })
      : duracao >= 5 && await agir('cronometro_criar', { titulo, duracao_s: duracao, cor, visivel, iniciar });
    if (feito) setTitulo('');
  };

  const vazio = relogios.length === 0 && cronometros.length === 0;

  return (
    <div className="space-y-7">
      <p className="text-sm leading-6 text-gray-400">
        <strong className="text-gray-200">Relógios</strong> mostram o quanto falta para algo acontecer (um ritual, uma perseguição).
        <strong className="text-gray-200"> Cronômetros</strong> contam o tempo de verdade, para dar pressão: a bomba, o desmoronamento, a decisão que precisa sair agora.
      </p>

      {vazio ? (
        <div className="mesa-cartao mesa-cartao--vazio">
          <Hourglass className="mx-auto mb-2 text-gray-600" size={26} aria-hidden="true" />
          Nada correndo na mesa agora.{gestor ? ' Crie um relógio ou um cronômetro abaixo.' : ''}
        </div>
      ) : null}

      {cronometros.length > 0 ? (
        <section aria-label="Cronômetros">
          <h3 className="mesa-titulo"><Timer size={14} aria-hidden="true" /> Cronômetros</h3>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cronometros.map((cronometro) => (
              <CronometroCartao key={cronometro.id} cronometro={cronometro} recebidoEm={recebidoEm} agora={agora} gestor={gestor} ocupado={ocupado} agir={agir} />
            ))}
          </ul>
        </section>
      ) : null}

      {relogios.length > 0 ? (
        <section aria-label="Relógios de progresso">
          <h3 className="mesa-titulo"><PieChart size={14} aria-hidden="true" /> Relógios de progresso</h3>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {relogios.map((relogio) => {
              const paleta = COR_RELOGIO[relogio.cor] ?? COR_RELOGIO.perigo;
              const completo = relogioCompleto(relogio);
              return (
                <li key={relogio.id} className="mesa-cartao" style={{ borderColor: completo ? `${paleta.cheia}99` : undefined, '--cor': paleta.cheia } as CSSProperties}>
                  <div className="flex items-center gap-4">
                    <RelogioSvg
                      relogio={relogio}
                      tamanho={96}
                      onFatia={gestor ? (indice) => void agir('relogio_ajustar', { relogio_id: relogio.id, delta: indice + 1 - relogio.cheias }) : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-bold text-white">{relogio.titulo}</h4>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: paleta.cheia }}>
                        {completo ? 'Completo' : `${relogio.cheias} de ${relogio.fatias}`} · {paleta.rotulo}
                      </p>
                      {gestor ? (
                        <div className="mt-2 flex items-center gap-1.5">
                          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-label={`Voltar uma fatia de ${relogio.titulo}`} disabled={ocupado || relogio.cheias === 0} onClick={() => void agir('relogio_ajustar', { relogio_id: relogio.id, delta: -1 })}><Minus size={14} /></button>
                          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-label={`Avançar uma fatia de ${relogio.titulo}`} disabled={ocupado || completo} onClick={() => void agir('relogio_ajustar', { relogio_id: relogio.id, delta: 1 })}><Plus size={14} /></button>
                          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-pressed={!relogio.visivel} aria-label={relogio.visivel ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'} title={relogio.visivel ? 'Visível aos jogadores' : 'Escondido dos jogadores'} onClick={() => void agir('relogio_editar', { relogio_id: relogio.id, visivel: !relogio.visivel })}>
                            {relogio.visivel ? <Eye size={14} /> : <EyeOff size={14} className="text-amber-300" />}
                          </button>
                          <button type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone ml-auto" aria-label={`Apagar ${relogio.titulo}`} onClick={() => { if (window.confirm(`Apagar o relógio "${relogio.titulo}"?`)) void agir('relogio_apagar', { relogio_id: relogio.id }); }}><Trash2 size={14} /></button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {gestor ? (
        <form className="mesa-cartao space-y-4" onSubmit={(evento) => { evento.preventDefault(); void criar(); }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="mesa-titulo !mb-0">Criar novo</h3>
            <div className="flex gap-1.5" role="group" aria-label="Tipo">
              <button type="button" className="mesa-botao mesa-botao--pequeno" aria-pressed={tipo === 'relogio'} onClick={() => setTipo('relogio')}><PieChart size={14} /> Relógio</button>
              <button type="button" className="mesa-botao mesa-botao--pequeno" aria-pressed={tipo === 'cronometro'} onClick={() => setTipo('cronometro')}><Timer size={14} /> Cronômetro</button>
            </div>
          </div>
          <input
            className="mesa-campo"
            value={titulo}
            maxLength={60}
            onChange={(evento) => setTitulo(evento.target.value)}
            placeholder={tipo === 'relogio' ? 'Ex.: O ritual se completa' : 'Ex.: A ponte desaba'}
            aria-label={tipo === 'relogio' ? 'Título do relógio' : 'Título do cronômetro'}
          />

          {tipo === 'relogio' ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-gray-500">Fatias</span>
              {TAMANHOS_RELOGIO.map((quantidade) => (
                <button key={quantidade} type="button" className="mesa-botao mesa-botao--pequeno mesa-botao--icone" aria-pressed={fatias === quantidade} onClick={() => setFatias(quantidade)}>{quantidade}</button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <label className="mesa-rotulo w-24">Minutos<input className="mesa-campo" type="number" min={0} max={1440} value={minutos} onChange={(evento) => setMinutos(evento.target.value)} /></label>
                <label className="mesa-rotulo w-24">Segundos<input className="mesa-campo" type="number" min={0} max={59} value={segundos} onChange={(evento) => setSegundos(evento.target.value)} /></label>
                <p className="pb-3 text-sm font-bold text-[#f3dc8f]" aria-live="polite">= {formatarTempo(duracao)}</p>
              </div>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Atalhos de duração">
                {ATALHOS_DURACAO.map((atalho) => (
                  <button key={atalho.segundos} type="button" className="mesa-botao mesa-botao--pequeno" onClick={() => { setMinutos(String(Math.floor(atalho.segundos / 60))); setSegundos(String(atalho.segundos % 60)); }}>{atalho.rotulo}</button>
                ))}
              </div>
            </div>
          )}

          <SeletorDeCor cor={cor} onCor={setCor} />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400">
            <label className="flex items-center gap-2"><input type="checkbox" checked={visivel} onChange={(evento) => setVisivel(evento.target.checked)} /> Visível aos jogadores</label>
            {tipo === 'cronometro' ? <label className="flex items-center gap-2"><input type="checkbox" checked={iniciar} onChange={(evento) => setIniciar(evento.target.checked)} /> Começar a contar já</label> : null}
          </div>
          <button type="submit" className="mesa-botao mesa-botao--ouro" disabled={ocupado || !titulo.trim() || (tipo === 'cronometro' && duracao < 5)}>
            <Plus size={15} /> {tipo === 'relogio' ? 'Criar relógio' : 'Criar cronômetro'}
          </button>
          {tipo === 'cronometro' && duracao < 5 ? <p className="text-xs text-amber-300/80">O tempo mínimo é de 5 segundos.</p> : null}
        </form>
      ) : null}
    </div>
  );
};
