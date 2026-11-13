import type { LucideIcon } from 'lucide-react';

interface Props {
  icone: LucideIcon;
  rotulo: string;
  /** Nome curto escrito embaixo do ícone ("Mover", "Régua"): orienta sem precisar passar o mouse. */
  nome?: string;
  /** Tecla de atalho, mostrada na dica. */
  atalho?: string;
  ativo?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** Botão da barra de ferramentas, com a dica do site (nome e atalho) no lugar da do navegador. */
export const BotaoFerramenta = ({ icone: Icone, rotulo, nome, atalho, ativo = false, disabled = false, onClick }: Props) => (
  <button type="button" className={`mapa-ferramenta${ativo ? ' ativo' : ''}`} disabled={disabled} aria-label={rotulo} aria-pressed={ativo} onClick={onClick}>
    <Icone size={18} />
    {nome && <span className="mapa-ferramenta-nome">{nome}</span>}
    <span className="mapa-dica-flutuante" role="tooltip">
      {rotulo}
      {atalho && <kbd>{atalho}</kbd>}
    </span>
  </button>
);

/** Dica do site para qualquer elemento do mapa: o filho ganha a dica embaixo, em cima ou ao lado. */
export const ComDica = ({ dica, lado = 'baixo', children }: { dica: string; lado?: 'baixo' | 'cima' | 'direita'; children: React.ReactNode }) => (
  <span className={`mapa-com-dica mapa-com-dica--${lado}`}>
    {children}
    <span className="mapa-dica-flutuante" role="tooltip">{dica}</span>
  </span>
);
