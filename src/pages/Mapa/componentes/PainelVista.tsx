import { useEffect, useState } from 'react';
import { LocateFixed, Maximize, RefreshCw, X } from 'lucide-react';
import './gradePainel.css';

export interface VistaDaTela {
  x: number;
  y: number;
  zoom: number;
}

interface Props {
  aberto: boolean;
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
  onFechar: () => void;
}

const arredondar = (valor: number, casas = 0) => {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
};

/** A vista da tela (onde o mapa está e o zoom): números, reiniciar, trazer a mesa para ela e seguir quem sincroniza. */
export const PainelVista = ({ aberto, seguirVista, onSeguirVista, lerVista, onIrParaVista, onReiniciarVista, podeSincronizar, onSincronizar, onFechar }: Props) => {
  const [vista, setVista] = useState<VistaDaTela | null>(null);
  const [rascunho, setRascunho] = useState<{ x: string; y: string; zoom: string; mexeu: boolean } | null>(null);

  // A tela anda enquanto o painel está aberto: os números acompanham (menos o campo em que se digita).
  useEffect(() => {
    if (!aberto) return undefined;
    const ler = () => setVista(lerVista());
    ler();
    const intervalo = window.setInterval(ler, 250);
    return () => window.clearInterval(intervalo);
  }, [aberto, lerVista]);

  if (!aberto) return null;

  const confirmar = () => {
    // Só entrar e sair do campo não mexe na tela (o zoom mostrado é arredondado).
    if (!rascunho?.mexeu || !vista) {
      setRascunho(null);
      return;
    }
    const numero = (texto: string, padrao: number) => {
      const valor = Number(texto.replace(',', '.'));
      return Number.isFinite(valor) ? valor : padrao;
    };
    onIrParaVista({
      x: numero(rascunho.x, vista.x),
      y: numero(rascunho.y, vista.y),
      zoom: numero(rascunho.zoom, vista.zoom * 100) / 100,
    });
    setRascunho(null);
  };

  const campo = (qual: 'x' | 'y' | 'zoom', rotulo: string, atual: number, sufixo?: string) => (
    <label className="grade-campo">
      <span>{rotulo}</span>
      <input
        inputMode="decimal"
        value={rascunho ? rascunho[qual] : String(atual)}
        onFocus={() => vista && setRascunho((anterior) => anterior ?? ({ x: String(vista.x), y: String(vista.y), zoom: String(arredondar(vista.zoom * 100, 1)), mexeu: false }))}
        onChange={(e) => {
          const base = rascunho ?? (vista ? { x: String(vista.x), y: String(vista.y), zoom: String(arredondar(vista.zoom * 100, 1)), mexeu: false } : null);
          if (base) setRascunho({ ...base, [qual]: e.target.value, mexeu: true });
        }}
        onBlur={confirmar}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      />
      {sufixo && <em>{sufixo}</em>}
    </label>
  );

  return (
    <section className="mapa-config mapa-grade-painel" aria-label="Vista da tela">
      <header>
        <div><LocateFixed size={17} /><strong>Vista</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar a vista" onClick={onFechar}><X size={16} /></button>
      </header>

      <div className="grade-vista">
        {campo('x', 'Posição X', vista?.x ?? 0)}
        {campo('y', 'Posição Y', vista?.y ?? 0)}
        {campo('zoom', 'Zoom', arredondar((vista?.zoom ?? 1) * 100, 1), '%')}
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
    </section>
  );
};
