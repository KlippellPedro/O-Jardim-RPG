import { SlidersHorizontal } from 'lucide-react';
import {
  ATRIBUTOS_DANO,
  ATRIBUTO_DANO_AUTO,
  type IConfigDanoAtaque,
  type IConfigDanoTipo,
} from '../utils/rolagemAtaque';

interface IProps {
  config: IConfigDanoAtaque;
  /** Atributo que cada perícia de combate usa hoje (Força em Luta, Destreza em Pontaria, salvo troca na ficha). */
  atributoDaPericia: { corpo: string; distancia: string };
  onChange: (config: IConfigDanoAtaque) => void;
}

const nomeDoAtributo = (id: string) => ATRIBUTOS_DANO.find((atributo) => atributo.id === id)?.nome ?? id;

const Linha = ({ rotulo, dica, regra, atributoAuto, onChange }: {
  rotulo: string;
  dica: string;
  regra: IConfigDanoTipo;
  atributoAuto: string;
  onChange: (regra: IConfigDanoTipo) => void;
}) => (
  <div className="flex flex-col gap-2 rounded-xl border border-white/5 bg-[#121118] p-3 sm:flex-row sm:items-center sm:justify-between">
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={regra.ativo}
        onChange={(event) => onChange({ ...regra, ativo: event.target.checked })}
        className="mt-0.5 accent-red-500"
      />
      <span className="text-xs text-gray-400">
        <strong className="block text-sm text-gray-200">{rotulo}</strong>
        {dica}
      </span>
    </label>
    <select
      aria-label={`Atributo somado ao dano ${rotulo.toLocaleLowerCase('pt-BR')}`}
      value={regra.atributo}
      disabled={!regra.ativo}
      onChange={(event) => onChange({ ...regra, atributo: event.target.value })}
      className="rounded-md border border-white/10 bg-[#0d0c12] px-2 py-1.5 text-xs text-gray-300 focus:border-red-500/50 focus:outline-none disabled:opacity-40"
    >
      <option value={ATRIBUTO_DANO_AUTO}>Automático ({nomeDoAtributo(atributoAuto)})</option>
      {ATRIBUTOS_DANO.map((atributo) => <option key={atributo.id} value={atributo.id}>{atributo.nome}</option>)}
    </select>
  </div>
);

const resumo = (regra: IConfigDanoTipo, atributoAuto: string) => (
  regra.ativo ? nomeDoAtributo(regra.atributo === ATRIBUTO_DANO_AUTO ? atributoAuto : regra.atributo) : 'nenhum'
);

/** Qual atributo entra no dano. Fica na ficha porque um poder pode trocar isso para todas as armas de uma vez. */
export const ConfigDanoAtaque = ({ config, atributoDaPericia, onChange }: IProps) => (
  <details className="group rounded-2xl border border-white/5 bg-[#0f0e15] px-4 py-3" data-tour="ataques-atributo-dano">
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold text-gray-300 transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
      <SlidersHorizontal size={16} className="text-red-400" aria-hidden="true" />
      Atributo somado ao dano
      <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-gray-600 group-open:hidden">
        corpo a corpo: {resumo(config.corpo, atributoDaPericia.corpo)} · à distância: {resumo(config.distancia, atributoDaPericia.distancia)}
      </span>
    </summary>
    <div className="mt-4 flex flex-col gap-3">
      <Linha
        rotulo="Corpo a corpo"
        dica="Vem ligado. Automático segue o atributo da perícia Luta, então uma troca de atributo na ficha vale para o dano também."
        regra={config.corpo}
        atributoAuto={atributoDaPericia.corpo}
        onChange={(corpo) => onChange({ ...config, corpo })}
      />
      <Linha
        rotulo="À distância"
        dica="Vem desligado, porque quase nenhuma arma soma atributo ali. Ligue se um poder ou item da sua ficha mandar."
        regra={config.distancia}
        atributoAuto={atributoDaPericia.distancia}
        onChange={(distancia) => onChange({ ...config, distancia })}
      />
      <p className="text-[11px] text-gray-600">Na confirmação do dano você ainda pode trocar o atributo só para aquela rolagem.</p>
    </div>
  </details>
);
