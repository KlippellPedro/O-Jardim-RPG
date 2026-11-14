import { ArrowUpRight, Circle, Eye, EyeOff, Minus, Pencil, Square, Trash2 } from 'lucide-react';
import { DURACAO_FIXA_MS, DURACOES_DO_TRACO_MS, type FormaDeTraco, type OpcoesDeDesenho } from '../motor/tracosConta';
import '../efeitosMapa.css';

interface Props {
  opcoes: OpcoesDeDesenho;
  /** O Mestre pode desenhar um rascunho que só ele vê. */
  gestor: boolean;
  /** A cena está na mesa: o desenho vai para todos. Fora dela (cena em preparo), só quem desenha vê. */
  naMesa: boolean;
  onOpcoes: (opcoes: OpcoesDeDesenho) => void;
  /** Apaga todos os meus traços na tela de todos. */
  onLimpar: () => void;
  /** Quantos desenhos fixos a cena tem (só o Mestre usa). */
  fixos?: number;
  /** O Mestre apaga todos os desenhos fixos da cena. */
  onLimparFixos?: () => void;
}

const FORMAS: Array<{ id: FormaDeTraco; rotulo: string; Icone: typeof Pencil }> = [
  { id: 'lapis', rotulo: 'Lápis', Icone: Pencil },
  { id: 'linha', rotulo: 'Linha', Icone: Minus },
  { id: 'seta', rotulo: 'Seta', Icone: ArrowUpRight },
  { id: 'circulo', rotulo: 'Círculo', Icone: Circle },
  { id: 'retangulo', rotulo: 'Retângulo', Icone: Square },
];

const rotuloDaDuracao = (ms: number) => (ms >= 60000 ? '1 min' : `${ms / 1000} s`);

/** Barra do desenho livre: a forma, quanto tempo o traço fica na tela, e (para o Mestre) o rascunho só dele. */
export const BarraDesenho = ({ opcoes, gestor, naMesa, onOpcoes, onLimpar, fixos = 0, onLimparFixos }: Props) => (
  <section className="mapa-barra-magia mapa-barra-desenho" aria-label="Desenho livre">
    <div className="mapa-segmentos" role="group" aria-label="Forma">
      {FORMAS.map(({ id, rotulo, Icone }) => (
        <button key={id} type="button" className={opcoes.forma === id ? 'ativo' : ''} aria-pressed={opcoes.forma === id} onClick={() => onOpcoes({ ...opcoes, forma: id })}>
          <Icone size={15} /> {rotulo}
        </button>
      ))}
    </div>
    <div className="mapa-segmentos" role="group" aria-label="Quanto tempo o traço fica na tela">
      {DURACOES_DO_TRACO_MS.map((ms) => (
        <button key={ms} type="button" className={opcoes.duracao === ms ? 'ativo' : ''} aria-pressed={opcoes.duracao === ms} onClick={() => onOpcoes({ ...opcoes, duracao: ms })}>
          {rotuloDaDuracao(ms)}
        </button>
      ))}
      {gestor && (
        <button type="button" className={opcoes.duracao === DURACAO_FIXA_MS ? 'ativo' : ''} aria-pressed={opcoes.duracao === DURACAO_FIXA_MS} title="O traço fica na cena até você apagar (Ctrl + Z desfaz o último fixo)" onClick={() => onOpcoes({ ...opcoes, duracao: DURACAO_FIXA_MS })}>
          Fixo
        </button>
      )}
    </div>
    <div className="mapa-barra-desenho-acoes">
      {gestor && (
        <button
          type="button"
          role="switch"
          aria-checked={opcoes.privado}
          className={`mapa-dados-mesa${opcoes.privado ? ' ativo' : ''}`}
          title={opcoes.privado ? 'Só você vê: serve de rascunho para planejar a cena.' : 'Todos veem o desenho.'}
          onClick={() => onOpcoes({ ...opcoes, privado: !opcoes.privado })}
        >
          {opcoes.privado ? <EyeOff size={14} /> : <Eye size={14} />} {opcoes.privado ? 'Só eu vejo' : 'Todos veem'}
        </button>
      )}
      {gestor && fixos > 0 && onLimparFixos && (
        <button type="button" className="mapa-dados-mesa" title="Apaga todos os desenhos fixos desta cena" onClick={onLimparFixos}>
          <Trash2 size={14} /> Apagar os fixos ({fixos})
        </button>
      )}
      <button type="button" className="mapa-dados-mesa" title="Apaga todos os traços que você fez, na tela de todos (Ctrl + Z desfaz o último)" onClick={onLimpar}>
        <Trash2 size={14} /> Limpar os meus
      </button>
    </div>
    <p className="mapa-dica">
      Arraste no mapa. O traço some sozinho, a menos que você (Mestre) escolha Fixo. {naMesa ? 'A mesa inteira vê.' : 'Esta cena não está na mesa: só você vê.'} Ctrl + Z desfaz o último; o botão direito arrasta o mapa.
    </p>
  </section>
);
