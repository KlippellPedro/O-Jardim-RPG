// Extras da mesa (leva 6): pausa, relógios de progresso, cronômetro, fala de NPC e o painel
// em que o Mestre mexe em tudo isso. A regra fica no servidor
// (plataforma/core/mesa_extras.py); aqui é só a tela.

import { useEffect, useState } from 'react';
import { Coffee, Crosshair, Minus, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import type { ICronometroMesa, IMesaExtras, IRelogioMesa } from '../../../services/mapaApi';
import { faltaNoCronometro, relogioNovo, textoDoCronometro } from '../motor/mesaConta';
import './mesaExtras.css';

/** Um relógio de progresso: a roda em fatias, as cheias pintadas. */
const RodaDoRelogio = ({ relogio, tamanho = 44 }: { relogio: IRelogioMesa; tamanho?: number }) => {
  const r = tamanho / 2 - 3;
  const c = tamanho / 2;
  const fatias = Array.from({ length: relogio.partes }, (_, i) => {
    const a0 = (i / relogio.partes) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / relogio.partes) * Math.PI * 2 - Math.PI / 2;
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    const d = `M ${c} ${c} L ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 ${grande} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} Z`;
    return <path key={i} d={d} className={i < relogio.cheias ? 'cheia' : ''} />;
  });
  return (
    <svg className="mesa-roda" width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} aria-hidden="true">
      {fatias}
    </svg>
  );
};

function useAgora(relogio: () => number, ligado: boolean): number {
  const [agora, setAgora] = useState(relogio);
  useEffect(() => {
    if (!ligado) return undefined;
    const id = window.setInterval(() => setAgora(relogio()), 250);
    return () => window.clearInterval(id);
  }, [relogio, ligado]);
  return agora;
}

/** Relógios e cronômetro à vista de toda a mesa. O Mestre enche (clique) e esvazia (botão direito) a roda. */
export const RelogiosDaMesa = ({
  mesa, gestor, relogio, onRelogio,
}: { mesa: IMesaExtras; gestor: boolean; relogio: () => number; onRelogio: (id: string, cheias: number) => void }) => {
  const cronometro = mesa.cronometro;
  const agora = useAgora(relogio, Boolean(cronometro?.fim));
  if (!mesa.relogios.length && !cronometro) return null;
  return (
    <aside className="mesa-relogios" aria-label="Relógios da mesa">
      {cronometro && (
        <div className={`mesa-cronometro${cronometro.fim ? ' correndo' : ''}${faltaNoCronometro(cronometro, agora) === 0 ? ' acabou' : ''}`}>
          <small>{cronometro.nome}{gestor && !cronometro.visivel ? ' (só você)' : ''}</small>
          <strong>{textoDoCronometro(cronometro, agora)}</strong>
        </div>
      )}
      {mesa.relogios.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`mesa-relogio${gestor ? '' : ' so-ver'}`}
          disabled={!gestor}
          title={gestor ? 'Clique enche uma parte; botão direito esvazia.' : undefined}
          onClick={() => gestor && onRelogio(r.id, Math.min(r.partes, r.cheias + 1))}
          onContextMenu={(e) => {
            if (!gestor) return;
            e.preventDefault();
            onRelogio(r.id, Math.max(0, r.cheias - 1));
          }}
        >
          <RodaDoRelogio relogio={r} />
          <span>{r.nome}{gestor && !r.visivel ? ' (só você)' : ''}</span>
          <small>{r.cheias}/{r.partes}</small>
        </button>
      ))}
    </aside>
  );
};

/** A pausa: o jogador vê a tela de espera; o Mestre, uma faixa com o botão de voltar. */
export const PausaDaMesa = ({ mesa, gestor, onRetomar }: { mesa: IMesaExtras; gestor: boolean; onRetomar: () => void }) => {
  if (!mesa.pausa.ligada) return null;
  if (gestor) {
    return (
      <div className="mesa-pausa-faixa" role="status">
        <Coffee size={15} /> A mesa está em pausa para os jogadores.
        <button type="button" className="mapa-botao" onClick={onRetomar}><Play size={13} /> Voltar ao jogo</button>
      </div>
    );
  }
  return (
    <div className="mesa-pausa" role="status" aria-live="polite">
      <Coffee size={40} />
      <h2>A mesa está em pausa</h2>
      <p>{mesa.pausa.texto || 'O Mestre está arrumando a próxima cena. Já voltamos.'}</p>
    </div>
  );
};

export interface FalaRecebida {
  id: number;
  nome: string;
  texto: string;
  /** O token que fala, se a mesa conhece: dele sai o retrato. */
  token: string | null;
}

/** A fala de um NPC, embaixo, no meio da tela. Some sozinha depois de um tempo. */
export const FalaNaMesa = ({ fala, retrato, onFechar }: { fala: FalaRecebida; retrato: string | null; onFechar: () => void }) => {
  useEffect(() => {
    const id = window.setTimeout(onFechar, Math.min(30000, 7000 + fala.texto.length * 60));
    return () => window.clearTimeout(id);
  }, [fala.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section className="mesa-fala" aria-live="polite" aria-label={`Fala de ${fala.nome}`}>
      {retrato ? <img src={retrato} alt="" /> : <span className="mesa-fala-inicial" aria-hidden="true">{fala.nome.slice(0, 1)}</span>}
      <div>
        <strong>{fala.nome}</strong>
        <p>{fala.texto}</p>
      </div>
      <button type="button" className="mapa-icone" aria-label="Fechar a fala" onClick={onFechar}><X size={15} /></button>
    </section>
  );
};

/** O painel do Mestre: pausa, relógios, cronômetro e a vista inicial da cena. */
export const PainelMesa = ({
  mesa, relogio, temVista, onMudar, onGuardarVista, onTirarVista, onFechar,
}: {
  mesa: IMesaExtras;
  relogio: () => number;
  temVista: boolean;
  onMudar: (dados: Partial<IMesaExtras>) => void;
  onGuardarVista: () => void;
  onTirarVista: () => void;
  onFechar: () => void;
}) => {
  const [texto, setTexto] = useState(mesa.pausa.texto);
  const [novoNome, setNovoNome] = useState('');
  const [novasPartes, setNovasPartes] = useState(4);
  const [minutos, setMinutos] = useState(5);
  const cronometro = mesa.cronometro;
  const agora = useAgora(relogio, Boolean(cronometro?.fim));
  useEffect(() => setTexto(mesa.pausa.texto), [mesa.pausa.texto]);

  const relogios = (lista: IRelogioMesa[]) => onMudar({ relogios: lista });
  const cron = (novo: ICronometroMesa | null) => onMudar({ cronometro: novo });

  return (
    <section className="mapa-config mesa-painel" aria-label="Mesa">
      <header>
        <strong>Mesa</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>

      <fieldset>
        <legend>Pausa</legend>
        <label className="mapa-menu-linha">
          Recado
          <input value={texto} maxLength={140} placeholder="Já voltamos" onChange={(e) => setTexto(e.target.value)} />
        </label>
        <button
          type="button"
          className={mesa.pausa.ligada ? 'mapa-botao' : 'mapa-botao-leve'}
          onClick={() => onMudar({ pausa: { ligada: !mesa.pausa.ligada, texto } })}
        >
          {mesa.pausa.ligada ? <><Play size={13} /> Voltar ao jogo</> : <><Coffee size={13} /> Pausar a mesa</>}
        </button>
      </fieldset>

      <fieldset>
        <legend>Relógios</legend>
        <ul className="mesa-painel-lista">
          {mesa.relogios.map((r) => (
            <li key={r.id}>
              <RodaDoRelogio relogio={r} tamanho={28} />
              <span>{r.nome}</span>
              <button type="button" className="mapa-icone" aria-label={`Esvaziar uma parte de ${r.nome}`} onClick={() => relogios(mesa.relogios.map((o) => (o.id === r.id ? { ...o, cheias: Math.max(0, o.cheias - 1) } : o)))}><Minus size={13} /></button>
              <button type="button" className="mapa-icone" aria-label={`Encher uma parte de ${r.nome}`} onClick={() => relogios(mesa.relogios.map((o) => (o.id === r.id ? { ...o, cheias: Math.min(o.partes, o.cheias + 1) } : o)))}><Plus size={13} /></button>
              <label title="Os jogadores veem"><input type="checkbox" checked={r.visivel} onChange={(e) => relogios(mesa.relogios.map((o) => (o.id === r.id ? { ...o, visivel: e.target.checked } : o)))} /></label>
              <button type="button" className="mapa-icone" aria-label={`Apagar ${r.nome}`} onClick={() => relogios(mesa.relogios.filter((o) => o.id !== r.id))}><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
        <div className="mesa-painel-novo">
          <input value={novoNome} maxLength={40} placeholder="Nome do relógio" onChange={(e) => setNovoNome(e.target.value)} />
          <select value={novasPartes} onChange={(e) => setNovasPartes(Number(e.target.value))} aria-label="Partes do relógio">
            {[2, 3, 4, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} partes</option>)}
          </select>
          <button
            type="button"
            className="mapa-botao-leve"
            disabled={mesa.relogios.length >= 12}
            onClick={() => {
              relogios([...mesa.relogios, relogioNovo(novoNome, novasPartes)]);
              setNovoNome('');
            }}
          >
            <Plus size={13} /> Relógio
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend>Cronômetro</legend>
        {cronometro ? (
          <>
            <p className="mesa-painel-tempo">{textoDoCronometro(cronometro, agora)}</p>
            <div className="mapa-menu-botoes">
              {cronometro.fim ? (
                <button type="button" className="mapa-botao-leve" onClick={() => cron({ ...cronometro, fim: null, restante: faltaNoCronometro(cronometro, relogio()) })}><Pause size={13} /> Parar</button>
              ) : (
                <button type="button" className="mapa-botao-leve" disabled={!cronometro.restante} onClick={() => cron({ ...cronometro, fim: Math.round(relogio()) + (cronometro.restante ?? 0), restante: null })}><Play size={13} /> Continuar</button>
              )}
              <button type="button" className="mapa-botao-leve" onClick={() => cron(null)}><RotateCcw size={13} /> Tirar</button>
              <label className="mapa-menu-opcoes"><input type="checkbox" checked={cronometro.visivel} onChange={(e) => cron({ ...cronometro, visivel: e.target.checked })} /> Os jogadores veem</label>
            </div>
          </>
        ) : (
          <div className="mesa-painel-novo">
            <input type="number" min={1} max={1440} value={minutos} aria-label="Minutos" onChange={(e) => setMinutos(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))} />
            <span>min</span>
            <button type="button" className="mapa-botao-leve" onClick={() => cron({ nome: 'Cronômetro', fim: Math.round(relogio()) + minutos * 60000, restante: null, visivel: true })}><Play size={13} /> Começar</button>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Vista inicial da cena</legend>
        <p className="mapa-dica">Quem abrir esta cena começa vendo o pedaço do mapa e o zoom que estão na sua tela agora.</p>
        <div className="mapa-menu-botoes">
          <button type="button" className="mapa-botao-leve" onClick={onGuardarVista}><Crosshair size={13} /> Guardar esta vista</button>
          {temVista && <button type="button" className="mapa-botao-leve" onClick={onTirarVista}>Mapa inteiro</button>}
        </div>
      </fieldset>
    </section>
  );
};
