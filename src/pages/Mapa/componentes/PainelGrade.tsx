import { useEffect, useRef, useState } from 'react';
import { Ban, Grid3x3, Hexagon, Maximize, RefreshCw, X } from 'lucide-react';
import type { ICena } from '../../../services/mapaApi';
import {
  ehHex, medicaoEfetiva, PADRAO_GRADE,
  type IGrade, type LinhaGrade, type MedicaoGrade, type TipoGrade, type UnidadeGrade,
} from '../motor/geometria';
import './gradePainel.css';

export interface VistaDaTela {
  x: number;
  y: number;
  zoom: number;
}

interface Props {
  aberto: boolean;
  gestor: boolean;
  cena: ICena | null;
  /** Preferência do aparelho: o token e a régua grudam na grade. */
  encaixe: boolean;
  onEncaixe: (ligado: boolean) => void;
  /** Preferência do aparelho: aceitar quando alguém traz a mesa para a vista dele. */
  seguirVista: boolean;
  onSeguirVista: (ligado: boolean) => void;
  /** Lê a vista da tela agora (o painel pergunta de tempos em tempos enquanto está aberto). */
  lerVista: () => VistaDaTela | null;
  onIrParaVista: (vista: VistaDaTela) => void;
  onReiniciarVista: () => void;
  /** "Trazer todos para a minha vista". Falso quando a conexão em tempo real não está de pé. */
  podeSincronizar: boolean;
  onSincronizar: () => void;
  /** A grade ainda não salva, para a tela mostrar na hora enquanto o Mestre ajusta. */
  onPrever: (grade: IGrade) => void;
  onSalvarGrade: (mudancas: Partial<IGrade>) => void;
  onFechar: () => void;
}

const TIPOS: Array<{ id: TipoGrade; rotulo: string }> = [
  { id: 'quadrada', rotulo: 'Quadrada' },
  { id: 'hex', rotulo: 'Hexágono com ponta em cima' },
  { id: 'hex-plano', rotulo: 'Hexágono com lado reto em cima' },
  { id: 'nenhuma', rotulo: 'Sem grade' },
];

const LINHAS: Array<{ id: LinhaGrade; rotulo: string; tracejado: string | undefined }> = [
  { id: 'solida', rotulo: 'Linha contínua', tracejado: undefined },
  { id: 'tracejada', rotulo: 'Linha tracejada', tracejado: '8 5' },
  { id: 'pontilhada', rotulo: 'Linha pontilhada', tracejado: '1.5 5' },
];

const MEDIDAS_QUADRADAS: Array<{ id: MedicaoGrade; rotulo: string }> = [
  { id: 'euclidiana', rotulo: 'Reta (distância de verdade)' },
  { id: 'chebyshev', rotulo: 'Diagonal vale uma casa' },
  { id: 'alternada', rotulo: 'Diagonal alternada (1, 2, 1, 2)' },
  { id: 'manhattan', rotulo: 'Só pelos eixos (sem diagonal)' },
];

const MEDIDAS_HEX: Array<{ id: MedicaoGrade; rotulo: string }> = [
  { id: 'hex', rotulo: 'Hexágonos (passo a passo)' },
  { id: 'euclidiana', rotulo: 'Reta (distância de verdade)' },
];

const CORES_RAPIDAS = ['#000000', '#ffffff', '#ff7a00'];

const arredondar = (valor: number, casas = 0) => {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
};

/** Grade e vista num painel só: o que muda a cena é do Mestre; encaixe e vista valem para cada aparelho. */
export const PainelGrade = ({
  aberto, gestor, cena, encaixe, onEncaixe, seguirVista, onSeguirVista, lerVista, onIrParaVista, onReiniciarVista,
  podeSincronizar, onSincronizar, onPrever, onSalvarGrade, onFechar,
}: Props) => {
  const [grade, setGrade] = useState<IGrade | null>(cena?.grade ?? null);
  const [vista, setVista] = useState<VistaDaTela | null>(null);
  const [rascunhoVista, setRascunhoVista] = useState<{ x: string; y: string; zoom: string; mexeu: boolean } | null>(null);
  const espera = useRef<number | null>(null);
  const pendente = useRef<Partial<IGrade>>({});
  const salvar = useRef(onSalvarGrade);
  salvar.current = onSalvarGrade;

  // Troca de cena: a grade do painel passa a ser a dela.
  useEffect(() => {
    setGrade(cena?.grade ?? null);
  }, [cena?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A tela anda enquanto o painel está aberto: os números acompanham (menos o campo em que se digita).
  useEffect(() => {
    if (!aberto) return undefined;
    const ler = () => setVista(lerVista());
    ler();
    const intervalo = window.setInterval(ler, 250);
    return () => window.clearInterval(intervalo);
  }, [aberto, lerVista]);

  // Fechar o painel com uma mudança esperando salva na hora, em vez de perder.
  useEffect(() => {
    if (!aberto) return undefined;
    return () => {
      if (espera.current !== null) {
        window.clearTimeout(espera.current);
        espera.current = null;
        const mudancas = pendente.current;
        pendente.current = {};
        if (Object.keys(mudancas).length) salvar.current(mudancas);
      }
    };
  }, [aberto]);

  if (!aberto || !cena || !grade) return null;

  const efetiva = { ...grade, unidade: grade.unidade ?? PADRAO_GRADE.unidade, espessura: grade.espessura ?? PADRAO_GRADE.espessura, linha: grade.linha ?? PADRAO_GRADE.linha };

  const mudar = (parcial: Partial<IGrade>) => {
    if (!gestor) return;
    const nova = { ...efetiva, ...parcial };
    setGrade(nova);
    onPrever(nova);
    pendente.current = { ...pendente.current, ...parcial };
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      espera.current = null;
      const mudancas = pendente.current;
      pendente.current = {};
      onSalvarGrade(mudancas);
    }, 350);
  };

  const medidas = ehHex(efetiva.tipo) ? MEDIDAS_HEX : MEDIDAS_QUADRADAS;
  const medicao = medicaoEfetiva(efetiva);
  const comGrade = efetiva.tipo !== 'nenhuma';
  const corPersonalizada = !CORES_RAPIDAS.includes(efetiva.cor.toLowerCase());

  const confirmarVista = () => {
    // Só entrar e sair do campo não mexe na tela (o zoom mostrado é arredondado).
    if (!rascunhoVista?.mexeu || !vista) {
      setRascunhoVista(null);
      return;
    }
    const numero = (texto: string, padrao: number) => {
      const valor = Number(texto.replace(',', '.'));
      return Number.isFinite(valor) ? valor : padrao;
    };
    onIrParaVista({
      x: numero(rascunhoVista.x, vista.x),
      y: numero(rascunhoVista.y, vista.y),
      zoom: numero(rascunhoVista.zoom, vista.zoom * 100) / 100,
    });
    setRascunhoVista(null);
  };

  const campoVista = (campo: 'x' | 'y' | 'zoom', rotulo: string, atual: number, sufixo?: string) => (
    <label className="grade-campo">
      <span>{rotulo}</span>
      <input
        inputMode="decimal"
        value={rascunhoVista ? rascunhoVista[campo] : String(atual)}
        onFocus={() => vista && setRascunhoVista((atual) => atual ?? ({ x: String(vista.x), y: String(vista.y), zoom: String(arredondar(vista.zoom * 100, 1)), mexeu: false }))}
        onChange={(e) => {
          const base = rascunhoVista ?? (vista ? { x: String(vista.x), y: String(vista.y), zoom: String(arredondar(vista.zoom * 100, 1)), mexeu: false } : null);
          if (base) setRascunhoVista({ ...base, [campo]: e.target.value, mexeu: true });
        }}
        onBlur={confirmarVista}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      {sufixo && <em>{sufixo}</em>}
    </label>
  );

  return (
    <section className="mapa-config mapa-grade-painel" aria-label="Grade e vista">
      <header>
        <div><Grid3x3 size={17} /><strong>Grade</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar a grade" onClick={onFechar}><X size={16} /></button>
      </header>

      <label className="grade-interruptor">
        <span>Encaixar na grade<small>Só neste aparelho. Desligado, o token e a régua ficam onde você soltar.</small></span>
        <input type="checkbox" role="switch" checked={encaixe} onChange={(e) => onEncaixe(e.target.checked)} />
      </label>

      <fieldset className="grade-grupo" disabled={!gestor}>
        <legend>Grade da cena{!gestor && ' (só o Mestre muda)'}</legend>

        <div className="grade-linha-dupla">
          <div>
            <span className="grade-rotulo">Cor</span>
            <div className="grade-cores">
              {CORES_RAPIDAS.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  className={`grade-cor${efetiva.cor.toLowerCase() === cor ? ' ativa' : ''}`}
                  style={{ background: cor }}
                  aria-label={`Cor ${cor}`}
                  aria-pressed={efetiva.cor.toLowerCase() === cor}
                  onClick={() => mudar({ cor })}
                />
              ))}
              <label className={`grade-cor grade-cor-livre${corPersonalizada ? ' ativa' : ''}`} title="Outra cor">
                <input type="color" value={efetiva.cor} onChange={(e) => mudar({ cor: e.target.value })} aria-label="Escolher outra cor" />
              </label>
            </div>
          </div>
          <label className="grade-opacidade">
            <span className="grade-rotulo">Opacidade <em>{Math.round(efetiva.opacidade * 100)}%</em></span>
            <input type="range" min={0} max={1} step={0.01} value={efetiva.opacidade} onChange={(e) => mudar({ opacidade: Number(e.target.value) })} />
          </label>
        </div>

        <div className="grade-linha-dupla">
          <label className="grade-campo">
            <span>Tamanho da casa</span>
            <input type="number" min={10} max={1000} step={1} value={arredondar(efetiva.tamanho, 1)} onChange={(e) => mudar({ tamanho: Math.max(10, Number(e.target.value) || 100) })} />
            <em>px</em>
          </label>
          <label className="grade-campo">
            <span>Espessura da linha</span>
            <input type="number" min={0.5} max={8} step={0.5} value={efetiva.espessura} onChange={(e) => mudar({ espessura: Math.min(8, Math.max(0.5, Number(e.target.value) || 1)) })} />
            <em>px</em>
          </label>
        </div>

        <span className="grade-rotulo">Formato</span>
        <div className="grade-segmentos" role="radiogroup" aria-label="Formato da grade">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.id}
              type="button"
              role="radio"
              aria-checked={efetiva.tipo === tipo.id}
              aria-label={tipo.rotulo}
              title={tipo.rotulo}
              className={efetiva.tipo === tipo.id ? 'ativo' : ''}
              onClick={() => mudar({ tipo: tipo.id, medicao: ehHex(tipo.id) ? 'hex' : efetiva.medicao === 'hex' ? 'euclidiana' : efetiva.medicao })}
            >
              {tipo.id === 'quadrada' && <Grid3x3 size={18} />}
              {tipo.id === 'hex' && <Hexagon size={18} />}
              {tipo.id === 'hex-plano' && <Hexagon size={18} style={{ transform: 'rotate(30deg)' }} />}
              {tipo.id === 'nenhuma' && <Ban size={18} />}
            </button>
          ))}
        </div>

        {comGrade && (
          <>
            <span className="grade-rotulo">Tipo de linha</span>
            <div className="grade-segmentos" role="radiogroup" aria-label="Tipo de linha">
              {LINHAS.map((linha) => (
                <button
                  key={linha.id}
                  type="button"
                  role="radio"
                  aria-checked={efetiva.linha === linha.id}
                  aria-label={linha.rotulo}
                  title={linha.rotulo}
                  className={efetiva.linha === linha.id ? 'ativo' : ''}
                  onClick={() => mudar({ linha: linha.id })}
                >
                  <svg width="30" height="8" viewBox="0 0 30 8" aria-hidden="true">
                    <line x1="1" y1="4" x2="29" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray={linha.tracejado} strokeLinecap={linha.id === 'pontilhada' ? 'round' : 'butt'} />
                  </svg>
                </button>
              ))}
            </div>

            <label className="mapa-menu-linha">
              Como a régua mede
              <select value={medicao} onChange={(e) => mudar({ medicao: e.target.value as MedicaoGrade })}>
                {medidas.map((medida) => <option key={medida.id} value={medida.id}>{medida.rotulo}</option>)}
              </select>
            </label>

            <div className="grade-linha-dupla">
              <label className="grade-campo">
                <span>Distância por casa</span>
                <input type="number" min={0.1} max={1000} step={0.5} value={efetiva.metros} onChange={(e) => mudar({ metros: Math.max(0.1, Number(e.target.value) || 1.5) })} />
              </label>
              <label className="grade-campo">
                <span>Unidade</span>
                <select value={efetiva.unidade} onChange={(e) => mudar({ unidade: e.target.value as UnidadeGrade })}>
                  <option value="m">Metros (m)</option>
                  <option value="ft">Pés (ft)</option>
                </select>
              </label>
            </div>

            <details className="grade-calibrar">
              <summary>Calibrar com o desenho do mapa</summary>
              <p className="mapa-dica">Mexa até as linhas casarem com as do desenho.</p>
              <label className="mapa-menu-linha">
                Deslocar na horizontal <span>{Math.round(efetiva.x)} px</span>
                <input type="range" min={-200} max={200} step={0.5} value={efetiva.x} onChange={(e) => mudar({ x: Number(e.target.value) })} />
              </label>
              <label className="mapa-menu-linha">
                Deslocar na vertical <span>{Math.round(efetiva.y)} px</span>
                <input type="range" min={-200} max={200} step={0.5} value={efetiva.y} onChange={(e) => mudar({ y: Number(e.target.value) })} />
              </label>
            </details>
          </>
        )}
      </fieldset>

      <fieldset className="grade-grupo">
        <legend>Vista</legend>
        <div className="grade-vista">
          {campoVista('x', 'Posição X', vista?.x ?? 0)}
          {campoVista('y', 'Posição Y', vista?.y ?? 0)}
          {campoVista('zoom', 'Zoom', arredondar((vista?.zoom ?? 1) * 100, 1), '%')}
        </div>
        <div className="grade-botoes">
          <button type="button" className="mapa-botao" onClick={onReiniciarVista}><Maximize size={14} /> Reiniciar vista</button>
          <button
            type="button"
            className="mapa-botao"
            disabled={!podeSincronizar}
            title="Todo mundo na mesa passa a ver o que você está vendo"
            onClick={onSincronizar}
          >
            <RefreshCw size={14} /> Sincronizar vista
          </button>
        </div>
        <label className="grade-interruptor">
          <span>Seguir quando alguém sincronizar<small>Só neste aparelho. Desligado, a sua tela não é puxada.</small></span>
          <input type="checkbox" role="switch" checked={seguirVista} onChange={(e) => onSeguirVista(e.target.checked)} />
        </label>
      </fieldset>
    </section>
  );
};
