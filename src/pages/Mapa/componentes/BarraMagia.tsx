import { Circle, Slash, Triangle, Zap } from 'lucide-react';
import type { FormaMagia } from '../../../services/mapaApi';
import type { OpcoesMagia } from '../motor/palco';
import { CORES_FLUXO, FLUXOS_DO_MAPA } from '../motor/molduras';
import { ComDica } from './BotaoFerramenta';
import type { IMiraDaMagia } from '../motor/miraDaMagia';
import '../efeitosMapa.css';

interface Props {
  opcoes: OpcoesMagia;
  /** A cena está na mesa: a magia vai para todos. Fora dela (cena em preparo), só quem lança vê. */
  naMesa: boolean;
  onOpcoes: (opcoes: OpcoesMagia) => void;
  /** A magia que a ficha mandou mirar: o alcance e a área dela mandam na mira. */
  mira?: IMiraDaMagia | null;
  onSoltarMira?: () => void;
}

const FORMAS: Array<{ id: FormaMagia; rotulo: string; dica: string; Icone: typeof Circle }> = [
  { id: 'circulo', rotulo: 'Círculo', dica: 'Arraste do centro até a borda.', Icone: Circle },
  { id: 'cone', rotulo: 'Cone', dica: 'Arraste de onde sai até onde chega.', Icone: Triangle },
  { id: 'linha', rotulo: 'Linha', dica: 'Arraste de onde sai até onde chega: uma casa de largura.', Icone: Slash },
  { id: 'impacto', rotulo: 'Impacto', dica: 'Arraste de quem lança até o alvo, ou clique no alvo.', Icone: Zap },
];

const FLUXOS = FLUXOS_DO_MAPA.map((fluxo) => ({ ...fluxo, cor: CORES_FLUXO[fluxo.id] }));

/** Barra da magia: escolher a forma e o Fluxo (a cor), e arrastar no mapa. A mesa inteira vê. */
export const BarraMagia = ({ opcoes, naMesa, onOpcoes, mira, onSoltarMira }: Props) => {
  const forma = FORMAS.find((f) => f.id === opcoes.forma) ?? FORMAS[0];
  // Com a magia vinda da ficha, o tamanho é o dela: a dica diz o que fazer em vez de "arraste do centro até a borda".
  const dicaDaFicha = mira && mira.forma === opcoes.forma && mira.tamanhoM !== null
    ? { circulo: 'Clique onde ela cai (arrastar muda o ponto). O tamanho é o da magia e o centro fica dentro do anel de alcance.', cone: 'Aponte para onde ela vai. O tamanho é o da magia e o cone sai de quem conjura.', linha: 'Aponte para onde ela vai. O tamanho é o da magia e a linha sai de quem conjura.', impacto: 'Clique no alvo, dentro do anel de alcance.' }[opcoes.forma]
    : mira && mira.forma === opcoes.forma && opcoes.forma === 'impacto' ? 'Clique no alvo, dentro do anel de alcance.' : null;
  return (
    <section className="mapa-barra-magia" aria-label="Efeito de magia">
      {mira && (
        <p className="mapa-barra-magia-mira" role="status">
          <strong>{mira.titulo}</strong>
          <span>{mira.resumo}</span>
          {onSoltarMira && <button type="button" onClick={onSoltarMira}>Mira livre</button>}
        </p>
      )}
      <div className="mapa-segmentos" role="group" aria-label="Forma">
        {FORMAS.map(({ id, rotulo, Icone }) => (
          <button key={id} type="button" className={opcoes.forma === id ? 'ativo' : ''} onClick={() => onOpcoes({ ...opcoes, forma: id })}>
            <Icone size={15} /> {rotulo}
          </button>
        ))}
      </div>
      <div className="mapa-fluxos" role="group" aria-label="Fluxo da magia">
        {FLUXOS.map((fluxo) => (
          <ComDica key={fluxo.id} dica={fluxo.rotulo}>
            <button
              type="button"
              className={`mapa-fluxo-botao${opcoes.fluxo === fluxo.id ? ' ativo' : ''}`}
              style={{ background: fluxo.cor }}
              aria-label={fluxo.rotulo}
              aria-pressed={opcoes.fluxo === fluxo.id}
              onClick={() => onOpcoes({ ...opcoes, fluxo: fluxo.id })}
            />
          </ComDica>
        ))}
      </div>
      <p className="mapa-dica">
        {dicaDaFicha ?? forma.dica} {naMesa ? 'A mesa inteira vê.' : 'Esta cena não está na mesa: só você vê.'} O botão direito arrasta o mapa.
      </p>
    </section>
  );
};
