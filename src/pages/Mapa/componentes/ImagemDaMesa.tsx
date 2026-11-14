import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { IImagemDaMesa } from '../../../services/mapaApi';
import { ImagemMontada } from './ImagemMontada';
import './visorDaMesa.css';

interface Props {
  imagem: IImagemDaMesa;
  legenda: string;
  gestor: boolean;
  /** Fecha só nesta tela. */
  onFechar: () => void;
  /** Só o Mestre: guarda a imagem para todos. */
  onGuardar?: () => void;
}

/**
 * A imagem que o Mestre mostrou à mesa, por cima do mapa: carta, retrato de um NPC, cartaz, ilustração do lugar. Aparece
 * com um fade na tela de todos; cada jogador pode fechar a dele, e o Mestre a guarda para todos.
 */
export const ImagemDaMesa = ({ imagem, legenda, gestor, onFechar, onGuardar }: Props) => {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      if (gestor && onGuardar) onGuardar();
      else onFechar();
    };
    window.addEventListener('keydown', aoTeclar, true);
    return () => window.removeEventListener('keydown', aoTeclar, true);
  }, [gestor, onFechar, onGuardar]);

  return (
    <div className="visor-mesa" role="dialog" aria-label={`${imagem.nome}: imagem mostrada pelo Mestre`} onClick={gestor && onGuardar ? undefined : onFechar}>
      <div className="visor-mesa-quadro" onClick={(evento) => evento.stopPropagation()}>
        <ImagemMontada itemId={imagem.id} largura={imagem.largura} altura={imagem.altura} descricao={legenda || imagem.nome} />
      </div>
      {legenda && <p className="visor-mesa-legenda">{legenda}</p>}
      <div className="visor-mesa-acoes">
        {gestor && onGuardar && <button type="button" onClick={onGuardar}>Guardar para todos</button>}
        <button type="button" className="visor-mesa-fechar" aria-label="Fechar a imagem (só nesta tela)" title={gestor ? 'Fecha só na sua tela' : 'Fechar'} onClick={onFechar}><X size={18} /></button>
      </div>
    </div>
  );
};
