import { useEffect, useMemo, useState } from 'react';
import { FichaModal } from './FichaModal';
import {
  ATRIBUTOS_DANO,
  TIPO_CORPO_A_CORPO,
  TIPO_DISTANCIA,
  montarDano,
  resumirVantagens,
  validarDadoExtra,
} from '../utils/rolagemAtaque';

export interface IParteRolagem {
  rotulo: string;
  valor: number;
}

export interface IOpcoesAcerto {
  vantagensExtras: number;
  desvantagensExtras: number;
  bonusExtra: number;
  dadoExtra: string;
  defesa: string;
  /** Gastar a condição Inspirado (+2) nesta rolagem. */
  usarInspirado: boolean;
}

export interface IOpcoesDano {
  /** Atributo somado ao dano nesta rolagem; `null` quando nenhum entra. */
  atributoId: string | null;
  critico: boolean;
  bonusExtra: number;
  dadoExtra: string;
}

const CLASSE_CAMPO = 'w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-red-500/50';
const CLASSE_ROTULO = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500';
const DADOS_RAPIDOS = ['1d4', '1d6', '1d8', '-1d4'];

const comSinal = (valor: number) => (valor >= 0 ? `+${valor}` : String(valor));

const Contador = ({ rotulo, valor, onChange, cor }: { rotulo: string; valor: number; onChange: (valor: number) => void; cor: string }) => (
  <div className={`min-w-0 rounded-xl border bg-[#121118] p-3 ${cor}`}>
    <span className={CLASSE_ROTULO}>{rotulo}</span>
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label={`Menos ${rotulo.toLowerCase()}`} onClick={() => onChange(Math.max(0, valor - 1))} className="h-9 w-9 rounded-lg border border-white/10 bg-[#1a1924] text-lg text-yellow-600 hover:text-white">−</button>
      <span className="font-mono text-xl font-bold text-white">{valor}</span>
      <button type="button" aria-label={`Mais ${rotulo.toLowerCase()}`} onClick={() => onChange(Math.min(5, valor + 1))} className="h-9 w-9 rounded-lg border border-white/10 bg-[#1a1924] text-lg text-yellow-600 hover:text-white">+</button>
    </div>
  </div>
);

const CampoDadoExtra = ({ valor, onChange }: { valor: string; onChange: (valor: string) => void }) => {
  const valido = validarDadoExtra(valor).ok;
  return (
    <div>
      <label className={CLASSE_ROTULO} htmlFor="rolagem-dado-extra">Dado extra (opcional)</label>
      <input
        id="rolagem-dado-extra"
        type="text"
        value={valor}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ex.: 1d4, 2d6+1, -1d4"
        aria-invalid={!valido}
        className={`${CLASSE_CAMPO} ${valido ? '' : 'border-red-500/60'}`}
      />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {DADOS_RAPIDOS.map((rapido) => (
          <button
            key={rapido}
            type="button"
            onClick={() => onChange(rapido)}
            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-gray-400 hover:border-red-500/40 hover:text-white"
          >
            {rapido}
          </button>
        ))}
        {valor && (
          <button type="button" onClick={() => onChange('')} className="rounded-md px-2 py-0.5 text-[11px] text-gray-500 hover:text-white">limpar</button>
        )}
      </div>
      {!valido && <p className="mt-1 text-[11px] text-red-400">Use algo como 1d4, +2 ou -1d6.</p>}
    </div>
  );
};

const CampoBonusExtra = ({ valor, onChange }: { valor: string; onChange: (valor: string) => void }) => (
  <div>
    <label className={CLASSE_ROTULO} htmlFor="rolagem-bonus-extra">Bônus extra (opcional)</label>
    <input
      id="rolagem-bonus-extra"
      type="number"
      inputMode="numeric"
      value={valor}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0"
      className={CLASSE_CAMPO}
    />
  </div>
);

const SeletorTipoUso = ({ tipoUso, onTipoUso }: { tipoUso: string; onTipoUso: (tipo: string) => void }) => (
  <div>
    <span className={CLASSE_ROTULO}>Usar a arma como</span>
    <div className="grid grid-cols-2 gap-2">
      {[TIPO_CORPO_A_CORPO, TIPO_DISTANCIA].map((tipo) => (
        <button
          key={tipo}
          type="button"
          onClick={() => onTipoUso(tipo)}
          aria-pressed={tipoUso === tipo}
          className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${tipoUso === tipo ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-white/10 bg-black/30 text-gray-400 hover:text-white'}`}
        >
          {tipo === TIPO_CORPO_A_CORPO ? 'Corpo a corpo' : 'À distância'}
        </button>
      ))}
    </div>
  </div>
);

const Botoes = ({ onClose, rotulo, desabilitado }: { onClose: () => void; rotulo: string; desabilitado: boolean }) => (
  <div className="flex flex-col gap-3 border-t border-white/5 pt-4">
    <span className="text-[11px] text-gray-600">Dica: segure Shift ao clicar em Atacar ou Rolar Dano para rolar sem confirmar.</span>
    <div className="flex justify-end gap-3">
      <button type="button" onClick={onClose} className="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:text-white">Cancelar</button>
      <button
        type="submit"
        disabled={desabilitado}
        className="whitespace-nowrap rounded-lg border border-red-500/40 bg-red-500/15 px-6 py-2 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {rotulo}
      </button>
    </div>
  </div>
);

interface IAcertoProps {
  aberto: boolean;
  onClose: () => void;
  nomeArma: string;
  partesBonus: IParteRolagem[];
  vantagensAuto: number;
  desvantagensAuto: number;
  defesaInicial: string;
  /** O personagem está Inspirado e pode gastar o +2 aqui. */
  inspirado?: boolean;
  hibrida?: boolean;
  tipoUso?: string;
  onTipoUso?: (tipo: string) => void;
  onConfirmar: (opcoes: IOpcoesAcerto) => void;
}

/** Confirma o ataque antes de rolar: mostra a conta e deixa acrescentar vantagem, dado ou bônus que não está na ficha. */
export const ConfirmarAcertoModal = ({ aberto, onClose, nomeArma, partesBonus, vantagensAuto, desvantagensAuto, defesaInicial, inspirado = false, hibrida, tipoUso, onTipoUso, onConfirmar }: IAcertoProps) => {
  const [vantagensExtras, setVantagensExtras] = useState(0);
  const [desvantagensExtras, setDesvantagensExtras] = useState(0);
  const [bonusExtra, setBonusExtra] = useState('');
  const [dadoExtra, setDadoExtra] = useState('');
  const [defesa, setDefesa] = useState('');
  const [usarInspirado, setUsarInspirado] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setVantagensExtras(0);
    setDesvantagensExtras(0);
    setBonusExtra('');
    setDadoExtra('');
    setDefesa(defesaInicial);
    setUsarInspirado(false);
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalFicha = partesBonus.reduce((soma, parte) => soma + parte.valor, 0);
  const extraNumerico = Math.trunc(Number(bonusExtra) || 0);
  const total = totalFicha + extraNumerico + (inspirado && usarInspirado ? 2 : 0);
  const vantagens = vantagensAuto + vantagensExtras;
  const desvantagens = desvantagensAuto + desvantagensExtras;
  const resumo = resumirVantagens(vantagens, desvantagens);
  const dadoValido = validarDadoExtra(dadoExtra);
  const extraTexto = dadoValido.formula ? ` ${/^[+-]/.test(dadoValido.formula) ? dadoValido.formula : `+${dadoValido.formula}`}` : '';

  return (
    <FichaModal isOpen={aberto} onClose={onClose} title={`Atacar: ${nomeArma}`} eyebrow="Confirmar ataque">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!dadoValido.ok) return;
          onConfirmar({ vantagensExtras, desvantagensExtras, bonusExtra: extraNumerico, dadoExtra: dadoValido.formula, defesa, usarInspirado: inspirado && usarInspirado });
        }}
      >
        {hibrida && tipoUso && onTipoUso && <SeletorTipoUso tipoUso={tipoUso} onTipoUso={onTipoUso} />}

        <div className="rounded-xl border border-white/5 bg-[#121118] p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className={CLASSE_ROTULO}>Bônus de acerto da ficha</span>
            <span className="font-mono text-lg font-bold text-white">{comSinal(totalFicha)}</span>
          </div>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
            {partesBonus.map((parte) => (
              <li key={parte.rotulo} className="flex justify-between gap-3 text-gray-400">
                <span className="truncate">{parte.rotulo}</span>
                <span className={`font-mono ${parte.valor < 0 ? 'text-red-400' : 'text-gray-300'}`}>{comSinal(parte.valor)}</span>
              </li>
            ))}
          </ul>
        </div>

        {inspirado && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
            <span>
              <span className="block text-sm font-bold text-emerald-200">Usar Inspirado (+2)</span>
              <span className="block text-[11px] text-gray-500">Vale para um teste só. Depois desta rolagem a condição sai da ficha.</span>
            </span>
            <input type="checkbox" checked={usarInspirado} onChange={(event) => setUsarInspirado(event.target.checked)} className="h-5 w-5 accent-emerald-500" />
          </label>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Contador rotulo="Vantagens extras" valor={vantagensExtras} onChange={setVantagensExtras} cor="border-green-500/20" />
          <Contador rotulo="Desvantagens extras" valor={desvantagensExtras} onChange={setDesvantagensExtras} cor="border-red-500/20" />
        </div>
        {(vantagensAuto > 0 || desvantagensAuto > 0) && (
          <p className="-mt-2 text-[11px] text-gray-500">Já entram da ficha: {vantagensAuto}V e {desvantagensAuto}D (grau da perícia, itens, Cansaço, Sobrecarga).</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <CampoBonusExtra valor={bonusExtra} onChange={setBonusExtra} />
          <div>
            <label className={CLASSE_ROTULO} htmlFor="rolagem-defesa-alvo">Defesa do alvo (opcional)</label>
            <input id="rolagem-defesa-alvo" type="number" min={1} inputMode="numeric" value={defesa} onChange={(event) => setDefesa(event.target.value)} placeholder="Sem Defesa" className={CLASSE_CAMPO} />
          </div>
        </div>
        <CampoDadoExtra valor={dadoExtra} onChange={setDadoExtra} />

        <div className={`rounded-xl border p-3 ${resumo.modo === 'vantagem' ? 'border-green-500/30 bg-green-900/20' : resumo.modo === 'desvantagem' ? 'border-red-500/30 bg-red-900/20' : 'border-white/10 bg-white/5'}`}>
          <p className="font-mono text-base font-bold text-white">d20 {comSinal(total)}{extraTexto}</p>
          <p className="mt-0.5 text-xs text-gray-400">{resumo.texto}</p>
        </div>

        <Botoes onClose={onClose} rotulo="Atacar" desabilitado={!dadoValido.ok} />
      </form>
    </FichaModal>
  );
};

interface IDanoProps {
  aberto: boolean;
  onClose: () => void;
  nomeArma: string;
  dano: string;
  /** Modificador de cada atributo da ficha, para trocar o atributo do dano nesta rolagem. */
  modificadores: Record<string, number>;
  /** Atributo que a configuração da ficha manda somar. */
  atributoInicial: string;
  /** Se a configuração da ficha manda somar atributo neste ataque. */
  somarInicial: boolean;
  bonusEquipamento: number;
  /** Ajuste das condições em vigor (Enfraquecido: −2 no corpo a corpo). */
  ajusteCondicoes?: number;
  multiplicadorCritico: number;
  criticoInicial: boolean;
  hibrida?: boolean;
  tipoUso?: string;
  onTipoUso?: (tipo: string) => void;
  onConfirmar: (opcoes: IOpcoesDano) => void;
}

/** Confirma o dano antes de rolar: mostra a fórmula montada e deixa acrescentar dado ou bônus pontual. */
export const ConfirmarDanoModal = ({ aberto, onClose, nomeArma, dano, modificadores, atributoInicial, somarInicial, bonusEquipamento, ajusteCondicoes = 0, multiplicadorCritico, criticoInicial, hibrida, tipoUso, onTipoUso, onConfirmar }: IDanoProps) => {
  const [somarAtributo, setSomarAtributo] = useState(somarInicial);
  const [atributoId, setAtributoId] = useState(atributoInicial);
  const [critico, setCritico] = useState(false);
  const [bonusExtra, setBonusExtra] = useState('');
  const [dadoExtra, setDadoExtra] = useState('');

  useEffect(() => {
    if (!aberto) return;
    setSomarAtributo(somarInicial);
    setAtributoId(atributoInicial);
    setCritico(criticoInicial);
    setBonusExtra('');
    setDadoExtra('');
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const extraNumerico = Math.trunc(Number(bonusExtra) || 0);
  const dadoValido = validarDadoExtra(dadoExtra);
  const montagem = useMemo(() => montarDano({
    dano,
    modificadorAtributo: somarAtributo ? modificadores[atributoId] ?? 0 : 0,
    bonusEquipamento,
    ajusteCondicoes,
    bonusExtra: extraNumerico,
    dadoExtra,
    critico,
    multiplicadorCritico,
  }), [dano, modificadores, atributoId, somarAtributo, bonusEquipamento, ajusteCondicoes, extraNumerico, dadoExtra, critico, multiplicadorCritico]);

  return (
    <FichaModal isOpen={aberto} onClose={onClose} title={`Dano: ${nomeArma}`} eyebrow="Confirmar dano">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!dadoValido.ok || montagem.erro) return;
          onConfirmar({ atributoId: somarAtributo ? atributoId : null, critico, bonusExtra: extraNumerico, dadoExtra: dadoValido.formula });
        }}
      >
        {hibrida && tipoUso && onTipoUso && <SeletorTipoUso tipoUso={tipoUso} onTipoUso={onTipoUso} />}

        <div className="rounded-xl border border-white/5 bg-[#121118] p-3">
          <span className={CLASSE_ROTULO}>Dano da ficha</span>
          <ul className="space-y-1 text-xs">
            <li className="flex justify-between gap-3 text-gray-400"><span>Dado da arma</span><span className="font-mono text-gray-300">{dano}</span></li>
            <li className="flex items-center justify-between gap-3 text-gray-400">
              <label className="flex min-w-0 cursor-pointer items-center gap-2">
                <input type="checkbox" checked={somarAtributo} onChange={(event) => setSomarAtributo(event.target.checked)} className="accent-red-500" />
                <span className="shrink-0">Somar atributo</span>
              </label>
              <span className="flex items-center gap-2">
                <select
                  aria-label="Atributo somado ao dano"
                  value={atributoId}
                  onChange={(event) => { setAtributoId(event.target.value); setSomarAtributo(true); }}
                  className="rounded-md border border-white/10 bg-[#0d0c12] px-1.5 py-1 text-[11px] text-gray-300 focus:border-red-500/50 focus:outline-none"
                >
                  {ATRIBUTOS_DANO.map((atributo) => <option key={atributo.id} value={atributo.id}>{atributo.nome}</option>)}
                </select>
                <span className={`w-8 text-right font-mono ${somarAtributo ? ((modificadores[atributoId] ?? 0) < 0 ? 'text-red-400' : 'text-gray-300') : 'text-gray-600 line-through'}`}>{comSinal(modificadores[atributoId] ?? 0)}</span>
              </span>
            </li>
            {bonusEquipamento !== 0 && (
              <li className="flex justify-between gap-3 text-gray-400"><span>Itens, poderes e habilidades</span><span className="font-mono text-gray-300">{comSinal(bonusEquipamento)}</span></li>
            )}
            {ajusteCondicoes !== 0 && (
              <li className="flex justify-between gap-3 text-gray-400"><span>Condições em vigor</span><span className={`font-mono ${ajusteCondicoes < 0 ? 'text-red-400' : 'text-emerald-300'}`}>{comSinal(ajusteCondicoes)}</span></li>
            )}
          </ul>
        </div>

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
          <span>
            <span className="block text-sm font-bold text-yellow-400">Acerto crítico</span>
            <span className="block text-[11px] text-gray-500">Multiplica só os dados da arma por {multiplicadorCritico}. Bônus fixos e dado extra entram uma vez.</span>
          </span>
          <input type="checkbox" checked={critico} onChange={(event) => setCritico(event.target.checked)} className="h-5 w-5 accent-yellow-500" />
        </label>

        <CampoBonusExtra valor={bonusExtra} onChange={setBonusExtra} />
        <CampoDadoExtra valor={dadoExtra} onChange={setDadoExtra} />

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <span className={CLASSE_ROTULO}>Vai rolar</span>
          <p className="break-all font-mono text-base font-bold text-white">{montagem.formula || '—'}</p>
          {montagem.erro && <p className="mt-1 text-xs text-red-400">{montagem.erro}</p>}
        </div>

        <Botoes onClose={onClose} rotulo={critico ? 'Rolar dano crítico' : 'Rolar dano'} desabilitado={!dadoValido.ok || Boolean(montagem.erro)} />
      </form>
    </FichaModal>
  );
};
