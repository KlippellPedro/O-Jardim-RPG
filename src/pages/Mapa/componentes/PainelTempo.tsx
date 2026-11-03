import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Undo2, X } from 'lucide-react';
import type { ICeu, ITempoMapa, ModoCeu } from '../../../services/mapaApi';
import { MARCOS_DO_DIA, horaExtenso, minutosAte, nomeDaLua, periodoDaHora } from '../motor/ceuConta';

interface Props {
  tempo: ITempoMapa;
  /** A luz da cena aberta; null sem cena. */
  ceu: ICeu | null;
  ocupado: boolean;
  onAvancar: (minutos: number) => void;
  onDesfazer: () => void;
  onCeu: (ceu: ICeu) => void;
  onPreviaCeu: (ceu: ICeu) => void;
  onFechar: () => void;
}

const PULOS = [
  { rotulo: '+10 min', minutos: 10 },
  { rotulo: '+1 h', minutos: 60 },
  { rotulo: '+8 h', minutos: 8 * 60, dica: 'Um descanso longo' },
  { rotulo: '+1 dia', minutos: 24 * 60 },
];

const MODOS: Array<{ id: ModoCeu; rotulo: string }> = [
  { id: 'nenhum', rotulo: 'Não muda' },
  { id: 'mundo', rotulo: 'Segue o mundo' },
  { id: 'fixo', rotulo: 'Hora fixa' },
];

/** Painel Tempo do Mestre: a hora do mundo (o calendário da campanha) e como a luz desta cena segue a hora. */
export const PainelTempo = ({ tempo, ceu: doServidor, ocupado, onAvancar, onDesfazer, onCeu, onPreviaCeu, onFechar }: Props) => {
  const periodo = periodoDaHora(tempo.minuto);
  const [ceu, setCeu] = useState<ICeu | null>(doServidor);
  const espera = useRef<number | null>(null);

  // O que veio do servidor vale, menos enquanto a régua da hora fixa ainda vai mandar a sua.
  useEffect(() => {
    if (espera.current === null) setCeu(doServidor);
  }, [doServidor]);

  useEffect(() => () => {
    if (espera.current !== null) window.clearTimeout(espera.current);
  }, []);

  const mudarCeu = (novo: ICeu, imediato = false) => {
    setCeu(novo);
    onPreviaCeu(novo);
    if (espera.current !== null) window.clearTimeout(espera.current);
    const salvar = () => {
      espera.current = null;
      onCeu(novo);
    };
    if (imediato) salvar();
    else espera.current = window.setTimeout(salvar, 400);
  };

  return (
    <section className="mapa-config mapa-tempo-painel" aria-label="Tempo do mundo">
      <header>
        <strong>Tempo do mundo</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      <div className="mapa-tempo-agora">
        <strong>{tempo.hora_extenso}</strong>
        <span>{periodo.rotulo}</span>
      </div>
      <p className="mapa-tempo-data">
        {tempo.data?.extenso ?? 'Data do mundo'} · {nomeDaLua(tempo.lua, tempo.lua_carmesim)}
      </p>

      <fieldset disabled={ocupado}>
        <legend>Avançar</legend>
        <div className="mapa-tempo-botoes">
          {PULOS.map((pulo) => (
            <button key={pulo.rotulo} type="button" className="mapa-botao" aria-label={pulo.dica ?? `Avançar ${pulo.rotulo.slice(1)}`} onClick={() => onAvancar(pulo.minutos)}>
              {pulo.rotulo}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={ocupado}>
        <legend>Ir para o próximo</legend>
        <div className="mapa-tempo-botoes">
          {MARCOS_DO_DIA.map((marco) => (
            <button key={marco.id} type="button" className="mapa-botao-leve" onClick={() => onAvancar(minutosAte(tempo.minuto, marco.minuto))}>
              {marco.rotulo}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mapa-tempo-rodape">
        <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={onDesfazer}><Undo2 size={14} /> Desfazer</button>
        <a className="mapa-botao-leve" href="/mundo/calendario" target="_blank" rel="noreferrer"><CalendarDays size={14} /> Calendário</a>
      </div>

      {ceu && (
        <fieldset>
          <legend>Luz desta cena</legend>
          <div className="mapa-segmentos" role="group" aria-label="Como a luz da cena segue a hora">
            {MODOS.map((modo) => (
              <button key={modo.id} type="button" className={ceu.modo === modo.id ? 'ativo' : ''} onClick={() => mudarCeu({ ...ceu, modo: modo.id }, true)}>
                {modo.rotulo}
              </button>
            ))}
          </div>
          {ceu.modo === 'fixo' && (
            <label className="mapa-menu-linha">
              Hora da cena <span>{horaExtenso(ceu.minuto)}, {periodoDaHora(ceu.minuto).rotulo.toLowerCase()}</span>
              <input type="range" min={0} max={1425} step={15} value={ceu.minuto} onChange={(e) => mudarCeu({ ...ceu, minuto: Number(e.target.value) })} />
            </label>
          )}
          <p className="mapa-dica">
            {ceu.modo === 'nenhum' && 'A cena fica sempre igual, como um lugar fechado.'}
            {ceu.modo === 'mundo' && 'A cena escurece e muda de cor com a hora do mundo; a lua e a estação também pesam.'}
            {ceu.modo === 'fixo' && 'A cena fica nesta hora, seja qual for a do mundo (um sonho, outro plano).'}
            {' '}Tochas e personagens abrem caminho no escuro.
          </p>
        </fieldset>
      )}
    </section>
  );
};
