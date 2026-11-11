import React from 'react';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { gatilhoDaFase } from '../../../utils/fasesDeChefe';
import { MAXIMO_DE_FASES, type FaseNoFormulario } from '../fasesNoFormulario';

export { paraFormulario, paraServidor } from '../fasesNoFormulario';

const FASE_VAZIA: FaseNoFormulario = { nome: '', vida: '', rodada: '', anuncio: '', mudancas: '' };

interface EditorDeFasesProps {
  fases: FaseNoFormulario[];
  onChange: (fases: FaseNoFormulario[]) => void;
  /** De onde vêm as fases que estão no formulário agora. */
  origem: 'bestiario' | 'mestre' | 'nenhuma';
  /** A criatura tem fases no Bestiário para onde voltar. */
  podeVoltar: boolean;
  onVoltar: () => void;
}

const campo = 'mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#e0645f]/50';

/**
 * Fases que o Mestre escreve para uma criatura da Sessão. Valem no lugar das do Bestiário
 * só para esta criatura, nesta sessão. A fase 1 é o começo da luta e não aparece aqui.
 */
export const EditorDeFases: React.FC<EditorDeFasesProps> = ({ fases, onChange, origem, podeVoltar, onVoltar }) => {
  const mudar = (indice: number, parte: Partial<FaseNoFormulario>) =>
    onChange(fases.map((fase, atual) => (atual === indice ? { ...fase, ...parte } : fase)));

  return (
    <div className="mt-2 space-y-2">
      <p className="text-[11px] leading-5 text-white/45">
        {origem === 'bestiario'
          ? 'Estas são as fases do Bestiário. Mudar aqui vale só para esta criatura, nesta sessão.'
          : origem === 'mestre'
            ? 'Fases escritas por você para esta criatura.'
            : 'Sem fases. A fase 1 é o começo da luta; cada fase acrescentada aqui é a seguinte.'}
        {' '}A mesa ouve só o anúncio. As mudanças de regra ficam com você.
      </p>
      {fases.map((fase, indice) => {
        const vida = Math.trunc(Number(fase.vida));
        const rodada = Math.trunc(Number(fase.rodada));
        const gatilho = gatilhoDaFase({
          quando: fase.vida.trim() && vida >= 1 && vida <= 99 ? vida / 100 : null,
          rodada: fase.rodada.trim() && rodada >= 2 && rodada <= 99 ? rodada : null,
        });
        return (
          <fieldset key={indice} className="rounded-lg border border-white/10 bg-black/15 p-2.5">
            <legend className="sr-only">Fase {indice + 2}</legend>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[11px] font-bold text-[#f19a96]">Fase {indice + 2}</span>
              <input
                value={fase.nome}
                maxLength={80}
                onChange={(evento) => mudar(indice, { nome: evento.target.value })}
                placeholder="Nome (ex.: O Luto)"
                aria-label={`Nome da fase ${indice + 2}`}
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white outline-none focus:border-[#e0645f]/50"
              />
              <button
                type="button"
                onClick={() => onChange(fases.filter((_, atual) => atual !== indice))}
                className="flex min-h-8 min-w-8 items-center justify-center rounded-md text-white/35 hover:bg-white/5 hover:text-red-300"
                aria-label={`Apagar a fase ${indice + 2}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                Vida em % · opcional
                <input type="number" min={1} max={99} value={fase.vida} placeholder="ex.: 50" onChange={(evento) => mudar(indice, { vida: evento.target.value })} className={campo} />
              </label>
              <label className="text-[10px] uppercase tracking-wider text-white/40">
                Ou na rodada · opcional
                <input type="number" min={2} max={99} value={fase.rodada} placeholder="ex.: 6" onChange={(evento) => mudar(indice, { rodada: evento.target.value })} className={campo} />
              </label>
            </div>
            <p className="mt-1 text-[10px] text-white/35">Começa {gatilho}.</p>
            <label className="mt-2 block text-[10px] uppercase tracking-wider text-white/40">
              O que a mesa ouve
              <textarea rows={2} maxLength={240} value={fase.anuncio} onChange={(evento) => mudar(indice, { anuncio: evento.target.value })} placeholder="ex.: Ele arranca a coroa e a joga no chão." className={campo} />
            </label>
            <label className="mt-2 block text-[10px] uppercase tracking-wider text-white/40">
              O que muda de regra · uma por linha, até 6
              <textarea rows={2} value={fase.mudancas} onChange={(evento) => mudar(indice, { mudancas: evento.target.value })} placeholder="ex.: +2 no dano de todos os ataques" className={campo} />
            </label>
          </fieldset>
        );
      })}
      <div className="flex flex-wrap gap-1.5">
        {fases.length < MAXIMO_DE_FASES ? (
          <button
            type="button"
            onClick={() => onChange([...fases, { ...FASE_VAZIA }])}
            className="flex items-center gap-1.5 rounded-md border border-[#e0645f]/35 px-2.5 py-1.5 text-[11px] font-semibold text-[#f6aaa6] hover:bg-[#e0645f]/10"
          >
            <Plus size={13} /> Acrescentar fase
          </button>
        ) : null}
        {podeVoltar && origem !== 'bestiario' ? (
          <button
            type="button"
            onClick={onVoltar}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 hover:text-white"
          >
            <RotateCcw size={13} /> Voltar às do Bestiário
          </button>
        ) : null}
      </div>
    </div>
  );
};
