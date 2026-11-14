import { X } from 'lucide-react';
import { useDocumentoNoCanvas } from './documentoNoCanvas';

export interface IDocumentoCompartilhado {
  id: string;
  modelo: string;
  titulo: string;
  campos: Record<string, string>;
}

export const DocumentoDaMesa = ({ documento, onFechar }: { documento: IDocumentoCompartilhado; onFechar: () => void }) => {
  const { canvas, modelo, falha } = useDocumentoNoCanvas(documento.modelo, documento.campos);

  return (
    <div className="mapa-documento-fundo" role="presentation" onMouseDown={(evento) => evento.target === evento.currentTarget && onFechar()}>
      <section className="mapa-documento" role="dialog" aria-modal="true" aria-label={documento.titulo}>
        <header>
          <strong>{documento.titulo}</strong>
          <button type="button" className="mapa-icone" aria-label="Fechar documento" onClick={onFechar}><X size={17} /></button>
        </header>
        <div className="mapa-documento-corpo">
          {modelo
            ? <canvas ref={canvas} role="img" aria-label={`Documento: ${documento.titulo}`} />
            : <p className="mapa-dica">Este aparelho não conhece o modelo deste documento.</p>}
          {falha && <p className="mapa-dica">{falha}</p>}
        </div>
      </section>
    </div>
  );
};
