import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, FlaskConical, Lock, Minus, Plus, RotateCcw, Sparkles } from 'lucide-react';
import { ATRIBUTOS, ROTULOS_ATRIBUTOS } from '../../../services/calculoService';
import { CLASSES_CATALOGO } from '../../../services/catalogoService';
import {
  AJUSTE_ATRIBUTO_MAXIMO,
  NIVEL_MAXIMO_SIMULADO,
  cenarioInicial,
  formatarDelta,
  formatarValorLinha,
  limitarAjusteAtributo,
  simularCenario,
  slotsDaFicha,
  type ICenarioSimulacao,
  type ILinhaComparacao,
  type IOpcaoPoder,
} from '../utils/simuladorNivel';

const COR_POSITIVA = '#4ade80';
const COR_NEGATIVA = '#f87171';

const Passo = ({ rotulo, onMenos, onMais, desabilitarMenos, desabilitarMais }: {
  rotulo: string;
  onMenos: () => void;
  onMais: () => void;
  desabilitarMenos: boolean;
  desabilitarMais: boolean;
}) => (
  <div className="flex items-center gap-1.5">
    <button type="button" aria-label={`Diminuir ${rotulo}`} onClick={onMenos} disabled={desabilitarMenos} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-300 hover:text-white disabled:opacity-30">
      <Minus size={14} />
    </button>
    <button type="button" aria-label={`Aumentar ${rotulo}`} onClick={onMais} disabled={desabilitarMais} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/30 text-gray-300 hover:text-white disabled:opacity-30">
      <Plus size={14} />
    </button>
  </div>
);

const Delta = ({ linha }: { linha: ILinhaComparacao }) => {
  const cor = linha.delta === 0 ? '#6b7280' : linha.delta > 0 ? COR_POSITIVA : COR_NEGATIVA;
  return (
    <span
      className="inline-block min-w-[3.25rem] rounded-full border px-2 py-0.5 text-center text-[11px] font-bold"
      style={{ color: cor, borderColor: `${cor}55`, backgroundColor: `${cor}14` }}
    >
      {formatarDelta(linha.delta, linha.formato)}
    </span>
  );
};

const RotuloSituacao: Record<IOpcaoPoder['situacao'], { texto: string; cor: string }> = {
  libera: { texto: 'Passa a ficar disponível', cor: COR_POSITIVA },
  agora: { texto: 'Já disponível', cor: '#7dd3fc' },
  bloqueado: { texto: 'Bloqueado', cor: '#9ca3af' },
};

interface ISimuladorNivelProps {
  character: any;
}

/** "E se eu subisse para o nível 8? E se eu pusesse mais dois em Constituição?"
 * Mostra ao lado da ficha atual o que mudaria, sem gravar nada. */
export const SimuladorNivel = ({ character }: ISimuladorNivelProps) => {
  const ficha = character?.ficha || {};
  const slots = useMemo(() => slotsDaFicha(ficha), [ficha]);
  const [aberto, setAberto] = useState(false);
  const [cenario, setCenario] = useState<ICenarioSimulacao>(() => cenarioInicial(ficha));
  const [mostrarBloqueados, setMostrarBloqueados] = useState(false);

  const resultado = useMemo(() => simularCenario(ficha, cenario), [ficha, cenario]);
  const recursos = resultado.linhas.filter((linha) => linha.grupo === 'recursos');
  const atributosAlterados = resultado.linhas.filter((linha) => linha.grupo === 'atributos');

  if (!slots.length) return null;

  const nivelDaClasse = (classeId: string) => cenario.niveis[classeId] ?? slots.find((slot) => slot.classeId === classeId)?.nivel ?? 1;
  const definirNivel = (classeId: string, nivel: number, minimo: number) => {
    const limitado = Math.max(minimo, Math.min(NIVEL_MAXIMO_SIMULADO, nivel));
    setCenario((atual) => ({ ...atual, niveis: { ...atual.niveis, [classeId]: limitado } }));
  };
  const ajusteDoAtributo = (atributo: (typeof ATRIBUTOS)[number]) => limitarAjusteAtributo(cenario.atributos[atributo]);
  const definirAtributo = (atributo: (typeof ATRIBUTOS)[number], delta: number) => {
    setCenario((atual) => ({ ...atual, atributos: { ...atual.atributos, [atributo]: limitarAjusteAtributo(delta) } }));
  };
  const restaurar = () => setCenario(cenarioInicial(ficha));

  return (
    <section className={`overflow-hidden rounded-2xl border bg-[#0f0e15] transition-colors ${aberto ? 'border-cyan-400/25' : 'border-white/[0.06]'}`} data-tour="progressao-simulador">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="flex w-full items-center gap-3 p-5 text-left md:p-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-black/25">
          <FlaskConical size={18} className="text-cyan-300" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-white">Simulador de nível e build</span>
            <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-300">Nada é salvo</span>
          </span>
          <span className="mt-1 block text-xs leading-relaxed text-gray-500">Veja o que muda se você subir de nível ou mexer nos atributos, antes de decidir.</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-gray-500 transition-transform ${aberto ? 'rotate-180 text-cyan-300' : ''}`} />
      </button>

      {aberto ? (
        <div className="space-y-6 border-t border-white/[0.06] p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">Nível por classe</h4>
              <div className="space-y-3">
                {slots.map((slot) => {
                  const classe = CLASSES_CATALOGO.find((item) => item.id === slot.classeId);
                  const nivel = nivelDaClasse(slot.classeId);
                  return (
                    <div key={slot.classeId} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold text-white">{classe?.titulo || slot.classeId}</span>
                          <span className="text-xs text-gray-500">
                            Agora nível {slot.nivel}
                            {nivel !== slot.nivel ? <span className="font-bold text-cyan-300"> → nível {nivel}</span> : null}
                          </span>
                        </div>
                        <Passo
                          rotulo={`nível de ${classe?.titulo || 'classe'}`}
                          onMenos={() => definirNivel(slot.classeId, nivel - 1, slot.nivel)}
                          onMais={() => definirNivel(slot.classeId, nivel + 1, slot.nivel)}
                          desabilitarMenos={nivel <= slot.nivel}
                          desabilitarMais={nivel >= NIVEL_MAXIMO_SIMULADO}
                        />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[slot.nivel + 1, slot.nivel + 3, 5, 10, 15, 20]
                          .filter((valor, indice, lista) => valor > slot.nivel && valor <= NIVEL_MAXIMO_SIMULADO && lista.indexOf(valor) === indice)
                          .sort((a, b) => a - b)
                          .map((valor) => (
                            <button
                              key={valor}
                              type="button"
                              aria-pressed={nivel === valor}
                              onClick={() => definirNivel(slot.classeId, valor, slot.nivel)}
                              className={`min-h-8 rounded-full border px-3 text-xs font-bold transition-colors ${nivel === valor ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-200' : 'border-white/10 bg-[#0f0e15] text-gray-400 hover:text-white'}`}
                            >
                              Nv {valor}
                            </button>
                          ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-white/5 bg-black/20 p-4">
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                Atributos <span className="normal-case tracking-normal text-gray-600">(de −{AJUSTE_ATRIBUTO_MAXIMO} a +{AJUSTE_ATRIBUTO_MAXIMO})</span>
              </h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {ATRIBUTOS.map((atributo) => {
                  const base = Number(ficha.atributosFinais?.[atributo] ?? 10);
                  const ajuste = ajusteDoAtributo(atributo);
                  return (
                    <div key={atributo} className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-[#0f0e15] px-3 py-2">
                      <div className="min-w-0">
                        <span className="block truncate text-xs font-bold text-gray-300">{ROTULOS_ATRIBUTOS[atributo]}</span>
                        <span className="text-xs text-gray-500">
                          {base}
                          {ajuste !== 0 ? <span className="font-bold" style={{ color: ajuste > 0 ? COR_POSITIVA : COR_NEGATIVA }}> → {Math.max(1, base + ajuste)}</span> : null}
                        </span>
                      </div>
                      <Passo
                        rotulo={ROTULOS_ATRIBUTOS[atributo]}
                        onMenos={() => definirAtributo(atributo, ajuste - 1)}
                        onMais={() => definirAtributo(atributo, ajuste + 1)}
                        desabilitarMenos={ajuste <= -AJUSTE_ATRIBUTO_MAXIMO}
                        desabilitarMais={ajuste >= AJUSTE_ATRIBUTO_MAXIMO}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Valores base (classe, raça, atributos e nível). Equipamento e efeitos temporários somam por cima, igualmente nos dois lados.
            </p>
            <button type="button" onClick={restaurar} disabled={!resultado.mudou} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30">
              <RotateCcw size={13} /> Restaurar
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/5">
            <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_1.5rem_4.5rem_4.5rem] items-center gap-2 border-b border-white/5 bg-black/30 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <span>Comparação</span>
              <span className="text-right">Agora</span>
              <span />
              <span className="text-right">Simulado</span>
              <span className="text-right">Diferença</span>
            </div>
            {[...recursos, ...atributosAlterados].map((linha) => (
              <div key={linha.chave} className="grid grid-cols-[minmax(0,1fr)_4.5rem_1.5rem_4.5rem_4.5rem] items-center gap-2 border-b border-white/[0.04] px-4 py-2.5 last:border-b-0">
                <span className="truncate text-sm text-gray-300">
                  {linha.rotulo}
                  {linha.grupo === 'atributos' ? <span className="ml-1 text-[10px] uppercase tracking-wider text-gray-600">mod.</span> : null}
                </span>
                <span className="text-right text-sm font-bold text-gray-400">{formatarValorLinha(linha.atual, linha.formato)}</span>
                <ArrowRight size={13} className="text-gray-600" aria-hidden="true" />
                <span className="text-right text-sm font-bold text-white">{formatarValorLinha(linha.simulado, linha.formato)}</span>
                <span className="text-right"><Delta linha={linha} /></span>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 bg-black/20 px-4 py-2.5 text-xs text-gray-400">
              <span>Nível total <strong className="text-white">{resultado.nivelAtual}</strong>{resultado.nivelSimulado !== resultado.nivelAtual ? <> → <strong className="text-cyan-300">{resultado.nivelSimulado}</strong></> : null}</span>
              {resultado.nivelSimulado !== resultado.nivelAtual ? (
                <span>
                  Exige <strong className="text-white">{resultado.xp.necessario.toLocaleString('pt-BR')}</strong> XP
                  {resultado.xp.faltam > 0
                    ? <>: faltam <strong className="text-amber-300">{resultado.xp.faltam.toLocaleString('pt-BR')}</strong></>
                    : <>: <strong className="text-emerald-300">você já tem o suficiente</strong></>}
                </span>
              ) : null}
            </div>
          </div>

          {resultado.novosEstagiosRaciais.length ? (
            <div className="flex items-start gap-3 rounded-xl border border-fuchsia-400/20 bg-fuchsia-400/[0.06] p-4">
              <Sparkles size={16} className="mt-0.5 shrink-0 text-fuchsia-300" />
              <p className="text-sm leading-6 text-gray-300">
                Estágio racial novo neste nível: <strong className="text-white">{resultado.novosEstagiosRaciais.join(', ')}</strong>.
              </p>
            </div>
          ) : null}

          {resultado.recompensas.length ? (
            <div>
              <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">O que a classe entrega no caminho</h4>
              <ol className="space-y-2 border-l border-white/10 pl-5">
                {resultado.recompensas.map((marco) => (
                  <li key={`${marco.classeId}-${marco.nivel}`} className="relative">
                    <span className="absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border border-cyan-400/40 bg-[#0b0a10] text-[8px] font-bold text-cyan-300">{marco.nivel}</span>
                    <p className="text-xs font-bold text-gray-400">
                      Nível {marco.nivel}
                      {slots.length > 1 ? <span className="ml-1 font-normal text-gray-600">· {marco.classeTitulo}</span> : null}
                    </p>
                    <ul className="mt-0.5 flex flex-wrap gap-1.5">
                      {marco.itens.map((item, indice) => (
                        <li key={`${item}-${indice}`} className="rounded-md border border-white/10 bg-[#121118] px-2 py-0.5 text-xs text-gray-200">{item}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {resultado.poderes.map((grupo) => {
            const disponiveis = grupo.opcoes.filter((opcao) => opcao.situacao !== 'bloqueado');
            const bloqueados = grupo.opcoes.filter((opcao) => opcao.situacao === 'bloqueado');
            return (
              <div key={grupo.classeId} className="rounded-xl border border-white/5 bg-black/20 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">Poderes de {grupo.classeTitulo}</h4>
                  <span className="text-xs text-gray-400">
                    Vagas livres <strong className="text-white">{grupo.vagasLivresAtuais}</strong>
                    {grupo.vagasLivresSimuladas !== grupo.vagasLivresAtuais ? <> → <strong className="text-cyan-300">{grupo.vagasLivresSimuladas}</strong></> : null}
                  </span>
                </div>
                {disponiveis.length ? (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {disponiveis.map((opcao) => {
                      const rotulo = RotuloSituacao[opcao.situacao];
                      return (
                        <li key={opcao.id}>
                          <details className="group rounded-lg border border-white/[0.07] bg-[#111017] open:border-white/15">
                            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 marker:content-none">
                              <span className="min-w-0 truncate text-sm font-bold text-gray-100">{opcao.titulo}</span>
                              <span className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: rotulo.cor, borderColor: `${rotulo.cor}55` }}>{rotulo.texto}</span>
                            </summary>
                            <p className="whitespace-pre-line border-t border-white/5 px-3 pb-3 pt-2 text-xs leading-relaxed text-gray-400">
                              {opcao.custoMana > 0 ? <span className="mb-1 block font-bold text-sky-300">Custo: {opcao.custoMana} de mana</span> : null}
                              {opcao.descricao}
                            </p>
                          </details>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">Nenhum poder disponível neste cenário.</p>
                )}
                {bloqueados.length ? (
                  <div className="mt-3">
                    <button type="button" aria-expanded={mostrarBloqueados} onClick={() => setMostrarBloqueados(!mostrarBloqueados)} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-white">
                      <Lock size={12} /> {bloqueados.length} bloqueado{bloqueados.length === 1 ? '' : 's'} mesmo assim
                    </button>
                    {mostrarBloqueados ? (
                      <ul className="mt-2 space-y-1">
                        {bloqueados.map((opcao) => (
                          <li key={opcao.id} className="text-xs leading-5 text-gray-500">
                            <span className="font-bold text-gray-400">{opcao.titulo}</span>
                            {opcao.motivo ? <span> · {opcao.motivo}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
};
