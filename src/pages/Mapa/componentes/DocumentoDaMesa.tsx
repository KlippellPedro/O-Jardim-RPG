import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { valoresComPadrao } from '../../Mestre/documentos/modelo';
import { modeloPorId } from '../../Mestre/documentos/modelos';
import { carregarImagens, garantirFontes, renderizar } from '../../Mestre/documentos/render';

export interface IDocumentoCompartilhado {
  id: string;
  modelo: string;
  titulo: string;
  campos: Record<string, string>;
}

export const DocumentoDaMesa = ({ documento, onFechar }: { documento: IDocumentoCompartilhado; onFechar: () => void }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [falha, setFalha] = useState('');
  const modelo = modeloPorId(documento.modelo);

  useEffect(() => {
    let vivo = true;
    setFalha('');
    if (!modelo) return () => { vivo = false; };
    const valores = valoresComPadrao(modelo, documento.campos);
    void Promise.all([garantirFontes(), carregarImagens(modelo, valores)])
      .then(([, imagens]) => {
        if (vivo && canvas.current) renderizar(canvas.current, modelo, valores, imagens);
      })
      .catch(() => { if (vivo) setFalha('Não foi possível desenhar este documento neste aparelho.'); });
    return () => { vivo = false; };
  }, [documento, modelo]);

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
