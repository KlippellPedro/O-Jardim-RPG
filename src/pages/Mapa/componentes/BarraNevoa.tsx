import { useState } from 'react';
import { CircleHelp, Eye, EyeOff, Paintbrush, Pentagon, Square, Undo2 } from 'lucide-react';
import type { FormaDeDesenho, OpcoesNevoa } from '../motor/palco';
import { ComDica } from './BotaoFerramenta';

interface Props {
  ligada: boolean;
  visaoPelasParedes: boolean;
  /** A cena já está na mesa: o que os jogadores baixaram sem névoa fica no aparelho deles. */
  naMesa: boolean;
  opcoes: OpcoesNevoa;
  tamanhoCasa: number;
  temFormas: boolean;
  onLigar: (ligada: boolean) => void;
  onVisaoPelasParedes: (ligada: boolean) => void;
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

/** A frase curta de uso, sempre à vista na barra. */
function dicaCurta(ligada: boolean, forma: FormaDeDesenho): string {
  if (!ligada) return 'A névoa está desligada: os jogadores veem o mapa inteiro. Ligue para revelar só o que eles enxergam.';
  if (forma === 'poligono') return 'Clique ponto a ponto e feche no primeiro ponto ou com Enter. Esc cancela.';
  return 'Arraste no mapa. O botão direito arrasta a tela.';
}

/** A explicação completa, que abre pelo botão de ajuda (depende de a cena estar na mesa e da visão por paredes). */
function ajudaLonga(ligada: boolean, visaoPelasParedes: boolean, naMesa: boolean): string {
  if (!ligada) {
    if (visaoPelasParedes && naMesa) {
      return 'Esta cena já está na mesa e a névoa manual está desligada. Ladrilhos que os jogadores baixaram antes permanecem no navegador. Para guardar segredos desde o início, ative a visão antes de abrir a cena.';
    }
    if (visaoPelasParedes) {
      return 'A visão usa os tokens próprios de cada jogador. Paredes e portas fechadas bloqueiam; áreas exploradas ficam mais claras na memória. A névoa manual continua limitando o que pode ser visto.';
    }
    return naMesa
      ? 'Com a névoa ligada, o mapa fica coberto para os jogadores e você revela o que eles enxergam. Esta cena já está na mesa: o que eles já viram continua guardado no aparelho deles. Para um segredo completo, ligue a névoa antes de pôr a cena na mesa.'
      : 'Com a névoa ligada, o mapa começa coberto para os jogadores e você revela o que eles enxergam.';
  }
  return 'Os jogadores só recebem os pedaços do mapa que você revelar. Revelar tudo abre o mapa inteiro; Cobrir tudo volta a escondê-lo. Cada forma solta já vale para a mesa.';
}

/**
 * Barra da névoa de guerra, aberta pela ferramenta do olho. Com a névoa desligada só aparecem os dois botões que
 * ligam (o resto não teria o que fazer); com ela ligada, as ferramentas de desenho. Cada forma solta já vale para a mesa.
 */
export const BarraNevoa = ({ ligada, visaoPelasParedes, naMesa, opcoes, tamanhoCasa, temFormas, onLigar, onVisaoPelasParedes, onOpcoes, onDesfazer, onRevelarTudo, onCobrirTudo }: Props) => {
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const casas = Math.round(((opcoes.raio * 2) / tamanhoCasa) * 2) / 2;
  return (
    <section className="mapa-barra-nevoa" aria-label="Névoa de guerra">
      <div className="mapa-barra-nevoa-linha">
        <button type="button" className={`mapa-botao${ligada ? '' : ' destaque'}`} onClick={() => onLigar(!ligada)}>
          {ligada ? <EyeOff size={14} /> : <Eye size={14} />} {ligada ? 'Desligar a névoa' : 'Ligar a névoa'}
        </button>
        <button
          type="button"
          className={`mapa-botao${visaoPelasParedes ? ' ativo' : ''}`}
          aria-pressed={visaoPelasParedes}
          title="Os jogadores enxergam a partir dos próprios tokens; paredes e portas fechadas bloqueiam a visão. Luzes limitam o alcance."
          onClick={() => onVisaoPelasParedes(!visaoPelasParedes)}
        >
          <Eye size={14} /> Visão por paredes
        </button>
        {ligada && (
          <>
            <span className="mapa-separador-vertical" />
            <div className="mapa-segmentos" role="group" aria-label="Revelar ou esconder">
              <button type="button" className={opcoes.op === 'revelar' ? 'ativo' : ''} onClick={() => onOpcoes({ ...opcoes, op: 'revelar' })}>Revelar</button>
              <button type="button" className={opcoes.op === 'esconder' ? 'ativo perigo' : ''} onClick={() => onOpcoes({ ...opcoes, op: 'esconder' })}>Esconder</button>
            </div>
            <div className="mapa-segmentos" role="group" aria-label="Forma">
              {FORMAS.map(({ id, rotulo, Icone }) => (
                <ComDica key={id} dica={rotulo}>
                  <button type="button" className={opcoes.forma === id ? 'ativo' : ''} aria-label={rotulo} onClick={() => onOpcoes({ ...opcoes, forma: id })}>
                    <Icone size={15} />
                  </button>
                </ComDica>
              ))}
            </div>
            {opcoes.forma === 'pincel' && (
              <label className="mapa-barra-controle">
                Pincel <span>{casas.toLocaleString('pt-BR')} {casas === 1 ? 'casa' : 'casas'}</span>
                <input
                  type="range" min={0.5} max={12} step={0.5} value={casas}
                  onChange={(e) => onOpcoes({ ...opcoes, raio: (Number(e.target.value) * tamanhoCasa) / 2 })}
                />
              </label>
            )}
          </>
        )}
        {/* Estes ficam juntos: se a barra não cabe numa linha, o grupo inteiro desce. */}
        <div className="mapa-barra-nevoa-acoes">
          {ligada && (
            <>
              <ComDica dica="Desfazer a última forma (Ctrl+Z)">
                <button type="button" className="mapa-botao-leve" disabled={!temFormas} onClick={onDesfazer}><Undo2 size={14} /> Desfazer</button>
              </ComDica>
              <button type="button" className="mapa-botao-leve" onClick={onRevelarTudo}>Revelar tudo</button>
              <button type="button" className="mapa-botao-leve" onClick={onCobrirTudo}>Cobrir tudo</button>
            </>
          )}
          <ComDica dica="Como a névoa funciona">
            <button type="button" className={`mapa-icone${ajudaAberta ? ' ativo' : ''}`} aria-label="Como a névoa funciona" aria-expanded={ajudaAberta} onClick={() => setAjudaAberta((v) => !v)}>
              <CircleHelp size={16} />
            </button>
          </ComDica>
        </div>
      </div>
      <p className="mapa-dica">{dicaCurta(ligada, opcoes.forma)}</p>
      {ajudaAberta && <p className="mapa-dica mapa-barra-nevoa-ajuda">{ajudaLonga(ligada, visaoPelasParedes, naMesa)}</p>}
    </section>
  );
};
