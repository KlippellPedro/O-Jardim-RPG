import { useEffect, useRef, useState } from 'react';
import { valoresComPadrao } from '../../Mestre/documentos/modelo';
import { modeloPorId } from '../../Mestre/documentos/modelos';
import { carregarImagens, garantirFontes, renderizar } from '../../Mestre/documentos/render';

/**
 * Desenha um documento (o modelo e os campos preenchidos) num canvas: o mesmo desenho do documento que a mesa
 * recebe e da prévia que o Mestre vê antes de mostrar. `campos` nulo é "ainda chegando": nada é desenhado.
 */
export function useDocumentoNoCanvas(modeloId: string, campos: Record<string, string> | null) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [falha, setFalha] = useState('');
  const [pronto, setPronto] = useState(false);
  const modelo = modeloPorId(modeloId);

  useEffect(() => {
    let vivo = true;
    setFalha('');
    setPronto(false);
    if (!modelo || !campos) return () => { vivo = false; };
    const valores = valoresComPadrao(modelo, campos);
    void Promise.all([garantirFontes(), carregarImagens(modelo, valores)])
      .then(([, imagens]) => {
        if (!vivo || !canvas.current) return;
        renderizar(canvas.current, modelo, valores, imagens);
        setPronto(true);
      })
      .catch(() => { if (vivo) setFalha('Não foi possível desenhar este documento neste aparelho.'); });
    return () => { vivo = false; };
  }, [modelo, campos]);

  return { canvas, modelo, falha, pronto };
}
