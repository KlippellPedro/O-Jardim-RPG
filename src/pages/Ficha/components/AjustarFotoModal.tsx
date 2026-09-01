import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, Move, X, ZoomIn, ZoomOut } from 'lucide-react';
import { RESOLUCAO_FOTO, TIPOS_FOTO_ACEITOS, validarArquivoFoto } from '../utils/fotoPersonagem';

const VISOR = 260; // px do quadro de enquadramento
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

interface AjustarFotoModalProps {
  nome: string;
  fotoAtual: string | null;
  salvando?: boolean;
  onCancelar: () => void;
  onConfirmar: (dataUrl: string) => void;
}

interface Deslocamento {
  x: number;
  y: number;
}

// Editor de enquadramento: arrastar para reposicionar e um controle de zoom,
// pra substituir o corte automático no centro que não dava nenhuma escolha.
export const AjustarFotoModal: React.FC<AjustarFotoModalProps> = ({ nome, fotoAtual, salvando, onCancelar, onConfirmar }) => {
  const [src, setSrc] = useState<string | null>(fotoAtual);
  const [erro, setErro] = useState<string | null>(null);
  const [tamanhoNatural, setTamanhoNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Deslocamento>({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const arrastoRef = useRef<{ startX: number; startY: number; startOffset: Deslocamento } | null>(null);

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelar();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancelar]);

  const escalaBase = (tamanho: { w: number; h: number }) => Math.max(VISOR / tamanho.w, VISOR / tamanho.h);

  const limitarDeslocamento = (valor: Deslocamento, zoomAtual: number, tamanho = tamanhoNatural): Deslocamento => {
    if (!tamanho) return valor;
    const escala = escalaBase(tamanho) * zoomAtual;
    const largura = tamanho.w * escala;
    const altura = tamanho.h * escala;
    const maxX = Math.max(0, (largura - VISOR) / 2);
    const maxY = Math.max(0, (altura - VISOR) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, valor.x)),
      y: Math.min(maxY, Math.max(-maxY, valor.y)),
    };
  };

  const escolherArquivo = () => fileInputRef.current?.click();

  const trocarArquivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      validarArquivoFoto(file);
    } catch (validationError) {
      setErro(validationError instanceof Error ? validationError.message : 'Não foi possível abrir a imagem.');
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setErro(null);
    setTamanhoNatural(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSrc(objectUrl);
  };

  const aoCarregarImagem = () => {
    const imagem = imgRef.current;
    if (!imagem) return;
    setTamanhoNatural({ w: imagem.naturalWidth, h: imagem.naturalHeight });
    setOffset({ x: 0, y: 0 });
  };

  const aoIniciarArrasto = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!tamanhoNatural) return;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    arrastoRef.current = { startX: event.clientX, startY: event.clientY, startOffset: offset };
  };

  const aoMoverArrasto = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastoRef.current) return;
    const dx = event.clientX - arrastoRef.current.startX;
    const dy = event.clientY - arrastoRef.current.startY;
    setOffset(limitarDeslocamento({ x: arrastoRef.current.startOffset.x + dx, y: arrastoRef.current.startOffset.y + dy }, zoom));
  };

  const aoSoltarArrasto = () => {
    arrastoRef.current = null;
  };

  const aoRolarZoom = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!tamanhoNatural) return;
    event.preventDefault();
    const novoZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom - event.deltaY * 0.0015));
    setZoom(novoZoom);
    setOffset((atual) => limitarDeslocamento(atual, novoZoom));
  };

  const aoMudarZoomSlider = (event: React.ChangeEvent<HTMLInputElement>) => {
    const novoZoom = Number(event.target.value);
    setZoom(novoZoom);
    setOffset((atual) => limitarDeslocamento(atual, novoZoom));
  };

  const confirmar = () => {
    const imagem = imgRef.current;
    if (!imagem || !tamanhoNatural) return;
    const canvas = document.createElement('canvas');
    canvas.width = RESOLUCAO_FOTO;
    canvas.height = RESOLUCAO_FOTO;
    const contexto = canvas.getContext('2d');
    if (!contexto) return;

    const fator = RESOLUCAO_FOTO / VISOR;
    const escala = escalaBase(tamanhoNatural) * zoom * fator;
    contexto.save();
    contexto.translate(RESOLUCAO_FOTO / 2 + offset.x * fator, RESOLUCAO_FOTO / 2 + offset.y * fator);
    contexto.scale(escala, escala);
    contexto.drawImage(imagem, -tamanhoNatural.w / 2, -tamanhoNatural.h / 2);
    contexto.restore();

    onConfirmar(canvas.toDataURL('image/webp', 0.85));
  };

  const escala = tamanhoNatural ? escalaBase(tamanhoNatural) * zoom : 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ajustar foto de ${nome}`}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancelar}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0a12] p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>Ajustar foto</h3>
          <button type="button" onClick={onCancelar} aria-label="Fechar" className="rounded-full p-1.5 text-gray-500 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={Array.from(TIPOS_FOTO_ACEITOS).join(',')}
          className="sr-only"
          aria-label={`Escolher foto de ${nome}`}
          onChange={trocarArquivo}
        />

        {erro && (
          <p role="alert" className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300">
            {erro}
          </p>
        )}

        {!src ? (
          <button
            type="button"
            onClick={escolherArquivo}
            className="flex h-[260px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/15 text-gray-400 transition-colors hover:border-primary/40 hover:text-white"
          >
            <ImagePlus size={32} />
            <span className="text-sm font-medium">Escolher uma foto</span>
          </button>
        ) : (
          <>
            <div
              className="relative mx-auto h-[260px] w-[260px] touch-none overflow-hidden rounded-xl border border-white/10 bg-black/40 [cursor:grab] active:[cursor:grabbing]"
              onPointerDown={aoIniciarArrasto}
              onPointerMove={aoMoverArrasto}
              onPointerUp={aoSoltarArrasto}
              onPointerLeave={aoSoltarArrasto}
              onWheel={aoRolarZoom}
            >
              <img
                ref={imgRef}
                src={src}
                alt=""
                draggable={false}
                onLoad={aoCarregarImagem}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                style={
                  tamanhoNatural
                    ? {
                        width: tamanhoNatural.w * escala,
                        height: tamanhoNatural.h * escala,
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                      }
                    : { opacity: 0 }
                }
              />
              {!tamanhoNatural && (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <ZoomOut size={16} className="shrink-0 text-gray-400" />
              <input
                type="range"
                min={ZOOM_MIN}
                max={ZOOM_MAX}
                step={0.01}
                value={zoom}
                onChange={aoMudarZoomSlider}
                disabled={!tamanhoNatural}
                aria-label="Zoom da foto"
                className="flex-1 accent-primary"
              />
              <ZoomIn size={16} className="shrink-0 text-gray-400" />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs text-gray-500">
                <Move size={12} /> Arraste pra reposicionar
              </p>
              <button type="button" onClick={escolherArquivo} className="text-xs font-medium text-primary hover:text-primary-light">
                Trocar imagem
              </button>
            </div>
          </>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={!tamanhoNatural || salvando}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-2.5 text-sm font-bold text-white transition-all hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? <Loader2 className="animate-spin" size={16} /> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
