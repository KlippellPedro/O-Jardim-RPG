import { Eye, EyeOff, Paintbrush, Pentagon, Square, Undo2 } from 'lucide-react';
import type { FormaDeDesenho, OpcoesNevoa } from '../motor/palco';

interface Props {
  ligada: boolean;
  /** A cena já está na mesa: o que os jogadores baixaram sem névoa fica no aparelho deles. */
  naMesa: boolean;
  opcoes: OpcoesNevoa;
  tamanhoCasa: number;
  temFormas: boolean;
  onLigar: (ligada: boolean) => void;
  onOpcoes: (opcoes: OpcoesNevoa) => void;
  onDesfazer: () => void;
  onRevelarTudo: () => void;
  onCobrirTudo: () => void;
}

const FORMAS: Array<{ id: FormaDeDesenho; rotulo: string; Icone: typeof Square }> = [
  { id: 'pincel', rotulo: 'Pincel', Icone: Paintbrush },
  { id: 'retangulo', rotulo: 'Retângulo', Icone: Square },
  { id: 'poligono', rotulo: 'Polígono', Icone: Pentagon },
];

/** Barra da névoa de guerra, aberta pela ferramenta do olho. Cada forma solta já vale para a mesa. */
export const BarraNevoa = ({ ligada, naMesa, opcoes, tamanhoCasa, temFormas, onLigar, onOpcoes, onDesfazer, onRevelarTudo, onCobrirTudo }: Props) => {
  const casas = Math.round(((opcoes.raio * 2) / tamanhoCasa) * 2) / 2;
  return (
    <section className="mapa-barra-nevoa" aria-label="Névoa de guerra">
      <button type="button" className={`mapa-botao${ligada ? '' : ' destaque'}`} onClick={() => onLigar(!ligada)}>
        {ligada ? <EyeOff size={14} /> : <Eye size={14} />} {ligada ? 'Desligar a névoa' : 'Ligar a névoa'}
      </button>
      <div className="mapa-segmentos" role="group" aria-label="Revelar ou esconder">
        <button type="button" disabled={!ligada} className={opcoes.op === 'revelar' ? 'ativo' : ''} onClick={() => onOpcoes({ ...opcoes, op: 'revelar' })}>Revelar</button>
        <button type="button" disabled={!ligada} className={opcoes.op === 'esconder' ? 'ativo perigo' : ''} onClick={() => onOpcoes({ ...opcoes, op: 'esconder' })}>Esconder</button>
      </div>
      <div className="mapa-segmentos" role="group" aria-label="Forma">
        {FORMAS.map(({ id, rotulo, Icone }) => (
          <button key={id} type="button" disabled={!ligada} className={opcoes.forma === id ? 'ativo' : ''} title={rotulo} aria-label={rotulo} onClick={() => onOpcoes({ ...opcoes, forma: id })}>
            <Icone size={15} />
          </button>
        ))}
      </div>
      {opcoes.forma === 'pincel' && (
        <label className="mapa-barra-controle">
          Pincel <span>{casas.toLocaleString('pt-BR')} {casas === 1 ? 'casa' : 'casas'}</span>
          <input
            type="range" min={0.5} max={12} step={0.5} value={casas} disabled={!ligada}
            onChange={(e) => onOpcoes({ ...opcoes, raio: (Number(e.target.value) * tamanhoCasa) / 2 })}
          />
        </label>
      )}
      <span className="mapa-separador-vertical" />
      <button type="button" className="mapa-botao-leve" disabled={!ligada || !temFormas} onClick={onDesfazer} title="Desfazer a última forma (Ctrl+Z)"><Undo2 size={14} /> Desfazer</button>
      <button type="button" className="mapa-botao-leve" disabled={!ligada} onClick={onRevelarTudo}>Revelar tudo</button>
      <button type="button" className="mapa-botao-leve" disabled={!ligada} onClick={onCobrirTudo}>Cobrir tudo</button>
      <p className="mapa-dica">
        {ligada
          ? opcoes.forma === 'poligono'
            ? 'Clique ponto a ponto e feche no primeiro ponto ou com Enter. Esc cancela. O botão direito arrasta o mapa.'
            : 'Arraste no mapa. O botão direito arrasta o mapa. Os jogadores só recebem os pedaços do mapa que você revelar.'
          : naMesa
            ? 'Com a névoa ligada, o mapa fica coberto para os jogadores e você revela o que eles enxergam. Esta cena já está na mesa: o que eles já viram continua guardado no aparelho deles. Para um segredo completo, ligue a névoa antes de pôr a cena na mesa.'
            : 'Com a névoa ligada, o mapa começa coberto para os jogadores e você revela o que eles enxergam.'}
      </p>
    </section>
  );
};
