import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { sfx } from '../../utils/audioSynth';
import { inscreverLoot, type CartaLoot } from './loot';
import './loot.css';
import { semMovimento } from '../../utils/movimento';

const MAX_CARTAS = 6;
const FLIP_MS = 720;
const APOS_ABRIR_MS = 1700;


/** Carta que vira para revelar o item que chegou (compra na loja ou item novo
 * na ficha). Brilho, raios e faíscas crescem com a raridade. Clique vira ou
 * passa para a próxima; Esc fecha. As cartas raras vêm por último. */
export const LootHost = memo(function LootHost() {
  const [cartas, setCartas] = useState<CartaLoot[]>([]);
  const [extras, setExtras] = useState(0);
  const [indice, setIndice] = useState(0);
  const [virada, setVirada] = useState(false);
  const [instante, setInstante] = useState(0);

  useEffect(() => inscreverLoot((novas) => {
    if (semMovimento()) return;
    setCartas(novas.slice(-MAX_CARTAS));
    setExtras(Math.max(0, novas.length - MAX_CARTAS));
    setIndice(0);
    setVirada(false);
    setInstante((valor) => valor + 1);
  }), []);

  const carta = cartas[indice] ?? null;

  const fechar = useCallback(() => { setCartas([]); setExtras(0); }, []);
  const virar = useCallback(() => {
    setVirada(true);
    if (!carta) return;
    if (carta.nivel >= 4) sfx.playCritSound();
    else if (carta.nivel >= 2) sfx.play('estrela');
    else sfx.play('confirm');
  }, [carta]);
  const proxima = useCallback(() => {
    if (indice >= cartas.length - 1) { fechar(); return; }
    setIndice((atual) => atual + 1);
    setVirada(false);
  }, [indice, cartas.length, fechar]);

  // Vira sozinha depois de um suspense que cresce com a raridade; passa sozinha depois de aberta.
  useEffect(() => {
    if (!carta) return undefined;
    const timer = virada
      ? window.setTimeout(proxima, FLIP_MS + APOS_ABRIR_MS)
      : window.setTimeout(virar, 650 + carta.nivel * 170);
    return () => window.clearTimeout(timer);
  }, [carta, virada, virar, proxima]);

  useEffect(() => {
    if (!carta) return undefined;
    const aoTecla = (evento: KeyboardEvent) => { if (evento.key === 'Escape') fechar(); };
    document.addEventListener('keydown', aoTecla, true);
    return () => document.removeEventListener('keydown', aoTecla, true);
  }, [carta, fechar]);

  if (!carta) return null;
  const estilo = { '--loot-cor': carta.cor, '--loot-brilho': carta.brilho } as CSSProperties;
  const faiscas = carta.nivel >= 3 ? 14 : 0;

  return createPortal(
    <div
      role="dialog"
      aria-label={`Item recebido: ${carta.nome}, ${carta.rotulo}`}
      className={`loot loot--n${carta.nivel}${carta.prismatica ? ' loot--prismatica' : ''}${virada ? ' loot--aberta' : ''}`}
      style={estilo}
      onClick={() => (virada ? proxima() : virar())}
    >
      <div className="loot__raios" aria-hidden="true" />
      <div className="loot__palco">
        <div key={`${instante}-${indice}`} className={`loot__carta${virada ? ' loot__carta--virada' : ''}`}>
          <div className="loot__face loot__face--costas">
            <svg viewBox="-50 -50 100 100" aria-hidden="true">
              <polygon points="0,-42 36,-21 36,21 0,42 -36,21 -36,-21" fill="none" stroke="currentColor" strokeWidth="2" />
              <polygon points="0,-26 22,-13 22,13 0,26 -22,13 -22,-13" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
              <circle r="4" fill="currentColor" />
            </svg>
          </div>
          <div className="loot__face loot__face--frente">
            <span className="loot__categoria">{carta.categoria || 'Item'}</span>
            <strong className="loot__nome">{carta.nome}</strong>
            <span className="loot__raridade">{carta.rotulo}</span>
            {carta.quantidade > 1 ? <span className="loot__quantidade">x{carta.quantidade}</span> : null}
          </div>
        </div>
        {virada && faiscas > 0 ? (
          <div className="loot__faiscas" aria-hidden="true">
            {Array.from({ length: faiscas }, (_, i) => (
              <i key={i} style={{ '--l-x': `${8 + i * 6.4}%`, '--l-atraso': `${(i % 6) * 0.09}s` } as CSSProperties} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="loot__rodape">
        {cartas.length > 1 ? <span>{indice + 1} / {cartas.length}{extras ? ` (+${extras} itens)` : ''}</span> : null}
        <em>{virada ? 'Toque para continuar' : 'Toque para revelar'}</em>
      </div>
    </div>,
    document.body,
  );
});
