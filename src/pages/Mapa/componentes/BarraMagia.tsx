import { Circle, Slash, Triangle, Zap } from 'lucide-react';
import type { FormaMagia } from '../../../services/mapaApi';
import type { OpcoesMagia } from '../motor/palco';
import { CORES_FLUXO, FLUXOS_DO_MAPA } from '../motor/molduras';
import { ComDica } from './BotaoFerramenta';
import '../efeitosMapa.css';

interface Props {
  opcoes: OpcoesMagia;
  /** A cena está na mesa: a magia vai para todos. Fora dela (cena em preparo), só quem lança vê. */
  naMesa: boolean;
  onOpcoes: (opcoes: OpcoesMagia) => void;
}

const FORMAS: Array<{ id: FormaMagia; rotulo: string; dica: string; Icone: typeof Circle }> = [
  { id: 'circulo', rotulo: 'Círculo', dica: 'Arraste do centro até a borda.', Icone: Circle },
  { id: 'cone', rotulo: 'Cone', dica: 'Arraste de onde sai até onde chega.', Icone: Triangle },
  { id: 'linha', rotulo: 'Linha', dica: 'Arraste de onde sai até onde chega: uma casa de largura.', Icone: Slash },
  { id: 'impacto', rotulo: 'Impacto', dica: 'Arraste de quem lança até o alvo, ou clique no alvo.', Icone: Zap },
];

const FLUXOS = FLUXOS_DO_MAPA.map((fluxo) => ({ ...fluxo, cor: CORES_FLUXO[fluxo.id] }));

/** Barra da magia: escolher a forma e o Fluxo (a cor), e arrastar no mapa. A mesa inteira vê. */
export const BarraMagia = ({ opcoes, naMesa, onOpcoes }: Props) => {
  const forma = FORMAS.find((f) => f.id === opcoes.forma) ?? FORMAS[0];
  return (
    <section className="mapa-barra-magia" aria-label="Efeito de magia">
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
        {forma.dica} {naMesa ? 'A mesa inteira vê.' : 'Esta cena não está na mesa: só você vê.'} O botão direito arrasta o mapa.
      </p>
    </section>
  );
};
