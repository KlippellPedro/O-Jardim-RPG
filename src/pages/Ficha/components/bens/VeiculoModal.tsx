import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Car, Fuel, Heart, Shield, SlidersHorizontal, Star, Wrench } from 'lucide-react';
import { FichaModal } from '../FichaModal';

/** Só os campos que o editor lê e escreve. O item completo mora em AbaInventario. */
export interface FormVeiculo {
  nome: string;
  raridade: string;
  localArmazenamento: string;
  quantidade: number | string;
  descricao?: string;
  durabilidadeAtual?: number | string;
  durabilidadeMaxima?: number | string;
  combustivelAtual?: number | string;
  combustivelMaximo?: number | string;
  defesa?: number | string;
  resistencia?: number | string;
  deslocamentoMetros?: number | string;
  manobrabilidade?: number | string;
  capacidade?: number | string;
  tripulacaoMinima?: number | string;
  sistemasAtivosMaximos?: number | string;
  espacosBase?: number | string;
  espacosModulosMaximos?: number | string;
  coberturaOcupantes?: string;
  vagasModulo?: number | string;
  efeitosRaridade: unknown[];
  modificacoes: Array<{ efeitos: unknown[] }>;
}

export interface OpcaoRaridade {
  value: string;
  label: string;
  labelClassName?: string;
}

interface VeiculoModalProps {
  aberto: boolean;
  editando: boolean;
  /** Peça ou módulo em vez de veículo: mostra só o que uma peça precisa. */
  ehPeca: boolean;
  form: FormVeiculo;
  setCampo: (campo: string, valor: string) => void;
  raridades: OpcaoRaridade[];
  /** Item da Loja: bônus e valores-base ficam travados, condição atual continua editável. */
  somenteLeituraMecanica: boolean;
  quantidadeSomenteLeitura: boolean;
  regraRaridade: { titulo: string; modificacoesMaximas: number; efeitosRaridadeMaximos: number };
  onAbrirRaridade: () => void;
  onAbrirModificacoes: () => void;
  onFechar: () => void;
  onSalvar: () => void;
}

const num = (valor: unknown) => Math.max(0, Number(valor) || 0);

const rotulo = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500';
const campo = 'w-full rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none transition-colors placeholder:text-gray-700 focus:border-amber-500/50 read-only:cursor-not-allowed read-only:opacity-60';

const Secao = ({ numero, titulo, dica, children }: { numero: number; titulo: string; dica?: string; children: ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 text-[11px] font-black text-amber-300" aria-hidden="true">{numero}</span>
      <div>
        <h3 className="text-sm font-bold text-white">{titulo}</h3>
        {dica ? <p className="text-xs leading-relaxed text-gray-500">{dica}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

const Numero = ({ id, rotuloTexto, valor, onChange, dica, somenteLeitura, min = 0 }: {
  id: string; rotuloTexto: string; valor: unknown; onChange: (v: string) => void; dica?: string; somenteLeitura?: boolean; min?: number;
}) => (
  <div>
    <label className={rotulo} htmlFor={id}>{rotuloTexto}</label>
    <input id={id} type="number" min={min} value={String(valor ?? '')} readOnly={somenteLeitura} onChange={(e) => onChange(e.target.value)} className={campo} />
    {dica ? <p className="mt-1 text-[11px] leading-snug text-gray-600">{dica}</p> : null}
  </div>
);

const Barra = ({ atual, maximo, cor, rotuloTexto, icone }: { atual: number; maximo: number; cor: string; rotuloTexto: string; icone: ReactNode }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400">
      <span className="flex items-center gap-1 uppercase tracking-wider">{icone}{rotuloTexto}</span>
      <span className="font-mono">{atual}/{maximo}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
      <div className={`h-full ${cor}`} style={{ width: `${maximo > 0 ? Math.min(100, (atual / maximo) * 100) : 0}%` }} />
    </div>
  </div>
);

const COBERTURAS = [
  { value: 'nenhuma', label: 'Nenhuma', dica: 'Ocupantes expostos' },
  { value: 'parcial', label: 'Parcial', dica: 'Meia proteção' },
  { value: 'total', label: 'Total', dica: 'Ocupantes protegidos' },
];

/** Editor de veículo e de peça veicular em duas colunas: passo a passo à esquerda,
 * prévia do cartão à direita. Só reorganiza o formulário que já existia; os campos
 * e o que eles gravam são os mesmos, com uma linha explicando cada um. */
export const VeiculoModal = ({
  aberto, editando, ehPeca, form, setCampo, raridades, somenteLeituraMecanica, quantidadeSomenteLeitura,
  regraRaridade, onAbrirRaridade, onAbrirModificacoes, onFechar, onSalvar,
}: VeiculoModalProps) => {
  const trava = somenteLeituraMecanica;
  const vida = { atual: num(form.durabilidadeAtual), maximo: num(form.durabilidadeMaxima) };
  const combustivel = { atual: num(form.combustivelAtual), maximo: num(form.combustivelMaximo) };
  const corRaridade = raridades.find((r) => r.value === form.raridade);
  const totalBonus = form.efeitosRaridade.length + form.modificacoes.reduce((soma, m) => soma + m.efeitos.length, 0);
  const podeSalvar = Boolean(form.nome?.trim());
  const titulo = editando ? (ehPeca ? 'Editar peça ou módulo' : 'Editar veículo') : (ehPeca ? 'Nova peça ou módulo' : 'Novo veículo');

  let numeracao = 0;
  const proximo = () => { numeracao += 1; return numeracao; };

  return (
    <FichaModal isOpen={aberto} onClose={onFechar} title={titulo} eyebrow={ehPeca ? 'Garagem · Peças' : 'Garagem'} size="xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-7">
          {trava ? (
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-xs leading-relaxed text-sky-200">
              Este item veio da Loja. Você pode renomear, mover e controlar a condição atual (vida e combustível). Raridade, bônus e valores-base são definidos pela Loja ou pela equipe da campanha.
            </div>
          ) : null}

          <Secao numero={proximo()} titulo={ehPeca ? 'Que peça é essa?' : 'Que veículo é esse?'} dica="Nome, raridade e onde ele fica guardado.">
            <div>
              <label className={rotulo} htmlFor="vei-nome">Nome</label>
              <input id="vei-nome" value={form.nome} onChange={(e) => setCampo('nome', e.target.value)} placeholder={ehPeca ? 'Ex.: Núcleo Estável T2' : 'Ex.: Rover Tatu'} className={campo} />
            </div>
            <div role="radiogroup" aria-label="Raridade" className="flex flex-wrap gap-1.5">
              {raridades.map((r) => {
                const ativo = form.raridade === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    disabled={trava}
                    onClick={() => setCampo('raridade', r.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${r.labelClassName ?? ''} ${ativo ? 'border-white/50 bg-white/10' : 'border-white/10 opacity-60 enabled:hover:opacity-100'}`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className={rotulo} htmlFor="vei-local">{ehPeca ? 'Onde está guardada' : 'Garagem ou localização'}</label>
                <input id="vei-local" value={form.localArmazenamento} onChange={(e) => setCampo('localArmazenamento', e.target.value)} placeholder="Ex.: Hangar da base" className={campo} />
              </div>
              <Numero id="vei-qtd" rotuloTexto="Quantidade" valor={form.quantidade} onChange={(v) => setCampo('quantidade', v)} somenteLeitura={quantidadeSomenteLeitura} min={1} />
            </div>
          </Secao>

          {ehPeca ? (
            <Secao numero={proximo()} titulo="Como ela encaixa?" dica="Uma peça instalada ocupa vagas do veículo. Sem vaga livre, ela não instala.">
              <div className="max-w-[12rem]">
                <Numero id="vei-vagas" rotuloTexto="Vagas que ocupa" valor={form.vagasModulo ?? 1} onChange={(v) => setCampo('vagasModulo', v)} min={1} dica="A maioria das peças ocupa 1. Blindagem e itens grandes costumam ocupar 2." />
              </div>
            </Secao>
          ) : (
            <>
              <Secao numero={proximo()} titulo="Como ele está agora?" dica="Vida e combustível. É o que muda a cada cena, então fica separado do resto.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Numero id="vei-vida" rotuloTexto="Vida atual" valor={form.durabilidadeAtual} onChange={(v) => setCampo('durabilidadeAtual', v)} />
                  <Numero id="vei-vidamax" rotuloTexto="Vida máxima" valor={form.durabilidadeMaxima} onChange={(v) => setCampo('durabilidadeMaxima', v)} somenteLeitura={trava} />
                  <Numero id="vei-comb" rotuloTexto="Combust. atual" valor={form.combustivelAtual} onChange={(v) => setCampo('combustivelAtual', v)} />
                  <Numero id="vei-combmax" rotuloTexto="Combust. máx." valor={form.combustivelMaximo} onChange={(v) => setCampo('combustivelMaximo', v)} somenteLeitura={trava} />
                </div>
              </Secao>

              <Secao numero={proximo()} titulo="Como ele se comporta?" dica="Os números de combate e de movimento.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Numero id="vei-def" rotuloTexto="Defesa" valor={form.defesa} onChange={(v) => setCampo('defesa', v)} somenteLeitura={trava} dica="Dificulta acertá-lo." />
                  <Numero id="vei-rd" rotuloTexto="Resistência" valor={form.resistencia} onChange={(v) => setCampo('resistencia', v)} somenteLeitura={trava} dica="Reduz o dano (RD)." />
                  <Numero id="vei-desl" rotuloTexto="Desloc. (m)" valor={form.deslocamentoMetros} onChange={(v) => setCampo('deslocamentoMetros', v)} somenteLeitura={trava} dica="Metros por ação." />
                  <Numero id="vei-man" rotuloTexto="Manobra" valor={form.manobrabilidade} onChange={(v) => setCampo('manobrabilidade', v)} somenteLeitura={trava} dica="Bônus ao pilotar." />
                </div>
              </Secao>

              <Secao numero={proximo()} titulo="Quem vai dentro e quantas peças cabem?" dica="Ocupantes, proteção e o espaço para módulos.">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Numero id="vei-cap" rotuloTexto="Capacidade" valor={form.capacidade} onChange={(v) => setCampo('capacidade', v)} somenteLeitura={trava} dica="Ocupantes no total." />
                  <Numero id="vei-trip" rotuloTexto="Tripulação mínima" valor={form.tripulacaoMinima} onChange={(v) => setCampo('tripulacaoMinima', v)} somenteLeitura={trava} dica="Para operar." />
                  <Numero id="vei-vagas" rotuloTexto="Vagas de peça" valor={form.espacosModulosMaximos} onChange={(v) => setCampo('espacosModulosMaximos', v)} somenteLeitura={trava} dica="Peças instaladas ao mesmo tempo." />
                  <Numero id="vei-sis" rotuloTexto="Sistemas ativos" valor={form.sistemasAtivosMaximos} onChange={(v) => setCampo('sistemasAtivosMaximos', v)} somenteLeitura={trava} dica="Módulos ligados juntos." />
                  <Numero id="vei-base" rotuloTexto="Espaços de base" valor={form.espacosBase} onChange={(v) => setCampo('espacosBase', v)} somenteLeitura={trava} dica="Se ele carrega uma base móvel." />
                </div>
                <div>
                  <p className={rotulo}>Cobertura dos ocupantes</p>
                  <div role="radiogroup" aria-label="Cobertura dos ocupantes" className="grid grid-cols-3 gap-2">
                    {COBERTURAS.map((c) => {
                      const ativo = (form.coberturaOcupantes || 'nenhuma') === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          role="radio"
                          aria-checked={ativo}
                          disabled={trava}
                          onClick={() => setCampo('coberturaOcupantes', c.value)}
                          className={`rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed ${ativo ? 'border-amber-400/60 bg-amber-500/10' : 'border-white/10 enabled:hover:border-white/25'}`}
                        >
                          <p className="text-sm font-bold text-white">{c.label}</p>
                          <p className="text-[11px] text-gray-500">{c.dica}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Secao>
            </>
          )}

          <Secao numero={proximo()} titulo="Bônus e modificações" dica="Efeitos próprios da raridade e melhorias instaladas no equipamento.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button type="button" onClick={onAbrirRaridade} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-4 text-left transition-colors hover:border-[#c7a44c]/30">
                <span>
                  <strong className="block text-sm text-white">Raridade e bônus</strong>
                  <span className="mt-1 block text-xs text-gray-600">{form.efeitosRaridade.length} bônus próprios</span>
                </span>
                <Star size={18} className="text-[#c7a44c]" aria-hidden="true" />
              </button>
              <button type="button" onClick={onAbrirModificacoes} className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 p-4 text-left transition-colors hover:border-[#c7a44c]/30">
                <span>
                  <strong className="block text-sm text-white">Modificações</strong>
                  <span className="mt-1 block text-xs text-gray-600">{form.modificacoes.length} mod(s), {form.modificacoes.reduce((soma, m) => soma + m.efeitos.length, 0)} bônus</span>
                </span>
                <SlidersHorizontal size={18} className="text-[#c7a44c]" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-[#c7a44c]/15 bg-[#c7a44c]/[0.04] p-3 text-xs leading-5 text-gray-400 sm:flex-row sm:items-center sm:justify-between">
              <p><strong className="text-[#e0c982]">{regraRaridade.titulo}</strong> permite {regraRaridade.modificacoesMaximas} modificação(ões) e {regraRaridade.efeitosRaridadeMaximos} bônus próprio(s).</p>
              <Link to="/regras?topico=raridades-modificacoes" className="inline-flex shrink-0 items-center gap-1.5 font-bold text-[#d8bd75] hover:text-white"><BookOpen size={13} aria-hidden="true" /> Raridades</Link>
            </div>
          </Secao>

          <Secao numero={proximo()} titulo="Alguma história?">
            <textarea value={form.descricao || ''} onChange={(e) => setCampo('descricao', e.target.value)} readOnly={trava} rows={3} aria-label="Descrição" placeholder="De onde veio, quem o construiu, o que tem de estranho." className={`${campo} resize-none`} />
          </Secao>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-2xl border border-amber-500/15 bg-amber-950/10 p-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-400">
              {ehPeca ? <Wrench size={12} aria-hidden="true" /> : <Car size={12} aria-hidden="true" />} Prévia
            </p>
            <h4 className="mt-1 truncate text-base font-bold text-white">{form.nome.trim() || 'Sem nome ainda'}</h4>
            <p className={`text-[11px] font-bold ${corRaridade?.labelClassName ?? 'text-gray-500'}`}>{corRaridade?.label ?? 'Comum'}{form.localArmazenamento ? <span className="font-normal text-gray-500"> · {form.localArmazenamento}</span> : null}</p>
            {ehPeca ? (
              <p className="mt-3 rounded-lg bg-black/30 p-3 text-xs text-gray-400">Ocupa <strong className="text-white">{Math.max(1, Math.trunc(num(form.vagasModulo)) || 1)}</strong> vaga(s) de um veículo quando instalada.</p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {([['Defesa', form.defesa, <Shield key="d" size={10} />], ['RD', form.resistencia, null], ['Desl.', `${num(form.deslocamentoMetros)}m`, null], ['Manob.', form.manobrabilidade, null]] as const).map(([r, v, ic]) => (
                    <div key={r} className="rounded-lg bg-black/30 p-1.5 text-center">
                      <p className="flex items-center justify-center gap-0.5 text-[9px] uppercase tracking-wider text-gray-500">{ic}{r}</p>
                      <p className="text-sm font-bold text-white">{typeof v === 'string' ? v : num(v)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-2">
                  <Barra atual={vida.atual} maximo={vida.maximo} cor="bg-red-500" rotuloTexto="Vida" icone={<Heart size={10} aria-hidden="true" />} />
                  <Barra atual={combustivel.atual} maximo={combustivel.maximo} cor="bg-amber-400" rotuloTexto="Combustível" icone={<Fuel size={10} aria-hidden="true" />} />
                </div>
                <p className="mt-3 border-t border-white/5 pt-3 text-[11px] text-gray-500">
                  {num(form.capacidade)} ocupante(s), {num(form.tripulacaoMinima)} de tripulação · {num(form.espacosModulosMaximos)} vaga(s) de peça · {num(form.sistemasAtivosMaximos)} sistema(s) ligado(s)
                </p>
              </>
            )}
            {totalBonus > 0 ? <p className="mt-2 text-[11px] text-emerald-300/80">{totalBonus} bônus automático(s) no total.</p> : null}
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-white/5 bg-[#0f0e15]/95 py-4 backdrop-blur">
        <p className="text-xs text-gray-600">{podeSalvar ? 'Tudo certo.' : 'Dê um nome para salvar.'}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onFechar} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
          <button type="button" onClick={onSalvar} disabled={!podeSalvar} className="rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-5 py-2.5 text-sm font-bold text-[#c7a44c] enabled:hover:bg-[#c7a44c]/20 disabled:opacity-40">
            {editando ? 'Salvar alterações' : (ehPeca ? 'Adicionar peça' : 'Adicionar veículo')}
          </button>
        </div>
      </div>
    </FichaModal>
  );
};
