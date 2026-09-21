import type { Dispatch, SetStateAction } from 'react';
import { Building2, Calculator, Check, MapPin, Plus, Trash2 } from 'lucide-react';
import { INSTALACOES_BASE, PATAMARES_BASE, REFERENCIA_CUSTOS_BASES } from '../../../../../data/regras/bases';
import { FichaModal } from '../FichaModal';
import { PlantaBase } from './PlantaBase';
import {
  acharCatalogo,
  acharPatamar,
  custoDoNivel,
  custoSugerido,
  espacosUsados,
  type InstalacaoPlanta,
} from '../../utils/plantaBase';
import {
  novoIdPropriedade,
  numeroFinito,
  QUALIDADES_QUARTO,
  TIPOS_PROPRIEDADE,
  type IPropriedadeFicha,
} from '../../../../services/propriedadeService';

export type FormPropriedade = Omit<IPropriedadeFicha, 'id'>;

interface PropriedadeModalProps {
  aberto: boolean;
  editando: boolean;
  form: FormPropriedade;
  setForm: Dispatch<SetStateAction<FormPropriedade>>;
  onFechar: () => void;
  onSalvar: () => void;
}

const lunaris = (valor: number) => `${valor.toLocaleString('pt-BR')} L$`;

const Secao = ({ numero, titulo, dica, children }: { numero: number; titulo: string; dica?: string; children: React.ReactNode }) => (
  <section className="space-y-3">
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-[11px] font-black text-emerald-300" aria-hidden="true">{numero}</span>
      <div>
        <h3 className="text-sm font-bold text-white">{titulo}</h3>
        {dica ? <p className="text-xs leading-relaxed text-gray-500">{dica}</p> : null}
      </div>
    </div>
    {children}
  </section>
);

const rotulo = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500';
const campo = 'w-full rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none transition-colors placeholder:text-gray-700 focus:border-emerald-500/50';

/** Editor de propriedade em duas colunas: à esquerda o passo a passo (identidade,
 * patamar, instalações, custos); à direita a planta ao vivo, que reage a cada
 * escolha. Nada aqui inventa regra: espaços, níveis e custos vêm de bases.ts. */
export const PropriedadeModal = ({ aberto, editando, form, setForm, onFechar, onSalvar }: PropriedadeModalProps) => {
  const patamar = acharPatamar(form.patamar);
  const planta: InstalacaoPlanta[] = form.instalacoes.map((i) => ({ id: i.id, nome: i.nome, nivel: i.nivel, espacos: i.espacosOcupados }));
  const usados = espacosUsados(planta);
  const livres = patamar ? Math.max(0, patamar.espacos - usados) : Infinity;
  const estourou = Boolean(patamar) && usados > (patamar?.espacos ?? 0);
  const sugerido = custoSugerido(form.patamar, form.tipo, planta);
  const igualAoSugerido = Boolean(sugerido) && form.valorAquisicao === sugerido?.aquisicao && form.manutencao === sugerido?.manutencao;

  const mudar = <K extends keyof FormPropriedade>(chave: K, valor: FormPropriedade[K]) => setForm((atual) => ({ ...atual, [chave]: valor }));

  const adicionar = (catalogoId: string, nivelNumero: number) => {
    const catalogo = INSTALACOES_BASE.find((i) => i.id === catalogoId);
    const nivel = catalogo?.niveis.find((n) => n.nivel === nivelNumero);
    if (!catalogo || !nivel) return;
    setForm((atual) => ({
      ...atual,
      instalacoes: [...atual.instalacoes, { id: novoIdPropriedade('inst'), nome: catalogo.titulo, nivel: nivel.nivel, espacosOcupados: nivel.espacos }],
    }));
  };

  const atualizarInstalacao = (id: string, mudancas: Partial<FormPropriedade['instalacoes'][number]>) =>
    setForm((atual) => ({ ...atual, instalacoes: atual.instalacoes.map((i) => (i.id === id ? { ...i, ...mudancas } : i)) }));

  const remover = (id: string) => setForm((atual) => ({ ...atual, instalacoes: atual.instalacoes.filter((i) => i.id !== id) }));

  const podeSalvar = form.nome.trim().length > 0;

  return (
    <FichaModal isOpen={aberto} onClose={onFechar} title={editando ? 'Editar propriedade' : 'Nova propriedade'} eyebrow="Bens" size="xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-7">
          <Secao numero={1} titulo="Que lugar é esse?" dica="Nome, tipo e onde fica. É o que aparece no cartão.">
            <div>
              <label className={rotulo} htmlFor="prop-nome">Nome</label>
              <input id="prop-nome" value={form.nome} onChange={(e) => mudar('nome', e.target.value)} placeholder="Ex.: Casa do Porto" className={campo} />
            </div>
            <div role="radiogroup" aria-label="Tipo de propriedade" className="flex flex-wrap gap-1.5">
              {TIPOS_PROPRIEDADE.map((tipo) => {
                const ativo = form.tipo === tipo.value;
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => mudar('tipo', tipo.value)}
                    className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${ativo ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200' : 'border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200'}`}
                  >
                    {tipo.label}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" aria-hidden="true" />
              <input value={form.localizacao} onChange={(e) => mudar('localizacao', e.target.value)} placeholder="Cidade, dimensão ou coordenadas" aria-label="Localização" className={`${campo} pl-9`} />
            </div>
          </Secao>

          <Secao numero={2} titulo="Qual o tamanho?" dica="O patamar define quantas vagas de instalação a propriedade tem, quantos ocupantes cabem e até que nível as instalações podem chegar. É opcional.">
            <div role="radiogroup" aria-label="Patamar" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                role="radio"
                aria-checked={!patamar}
                onClick={() => mudar('patamar', '')}
                className={`rounded-xl border p-3 text-left transition-colors ${!patamar ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 hover:border-white/25'}`}
              >
                <p className="text-sm font-bold text-white">Sem patamar</p>
                <p className="mt-1 text-[11px] text-gray-500">Só um registro</p>
              </button>
              {PATAMARES_BASE.map((item) => {
                const ativo = patamar?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => mudar('patamar', item.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${ativo ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 hover:border-white/25'}`}
                  >
                    <p className="flex items-center justify-between text-sm font-bold text-white">{item.titulo}{ativo ? <Check size={13} className="text-emerald-300" aria-hidden="true" /> : null}</p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-400">{item.espacos} vagas · {item.ocupantes} ocupantes</p>
                    <p className="text-[11px] text-gray-500">Nível até {item.nivelInstalacaoMaximo}</p>
                    <p className="mt-1 text-[11px] font-bold text-amber-300/80">{lunaris(item.fatorAquisicao * REFERENCIA_CUSTOS_BASES.unidadeAquisicaoLunaris)}</p>
                  </button>
                );
              })}
            </div>
          </Secao>

          <Secao numero={3} titulo="O que tem dentro?" dica={patamar ? `Cada instalação ocupa vagas. Restam ${livres} de ${patamar.espacos}. Escolha o nível para adicionar.` : 'Escolha um patamar acima para ver o que cabe. Sem patamar, tudo pode ser adicionado.'}>
            <div className="grid gap-2 sm:grid-cols-2">
              {INSTALACOES_BASE.map((cat) => (
                <div key={cat.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <p className="text-sm font-bold text-white">{cat.titulo}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-gray-500">{cat.descricao}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cat.niveis.map((nivel) => {
                      const altoDemais = Boolean(patamar) && nivel.nivel > (patamar?.nivelInstalacaoMaximo ?? 0);
                      const semVaga = Number.isFinite(livres) && nivel.espacos > livres;
                      const bloqueado = altoDemais || semVaga;
                      const custo = custoDoNivel(nivel);
                      const motivo = altoDemais ? `O patamar ${patamar?.titulo} só comporta até o nível ${patamar?.nivelInstalacaoMaximo}.` : semVaga ? `Faltam vagas: precisa de ${nivel.espacos}, restam ${livres}.` : `${nivel.efeitos[0]} Custo ${lunaris(custo.aquisicao)}.`;
                      return (
                        <button
                          key={nivel.nivel}
                          type="button"
                          disabled={bloqueado}
                          title={motivo}
                          onClick={() => adicionar(cat.id, nivel.nivel)}
                          className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1 text-[11px] font-bold text-emerald-200 transition-colors enabled:hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Plus size={10} aria-hidden="true" /> N{nivel.nivel} · {nivel.espacos} vaga(s)
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm((atual) => ({ ...atual, instalacoes: [...atual.instalacoes, { id: novoIdPropriedade('inst'), nome: '', nivel: 1, espacosOcupados: 1 }] }))}
              className="text-[11px] font-bold text-gray-400 underline-offset-2 hover:text-emerald-300 hover:underline"
            >
              + Instalação personalizada (fora do catálogo)
            </button>

            {form.instalacoes.length > 0 ? (
              <ul className="space-y-1.5" aria-label="Instalações da propriedade">
                {form.instalacoes.map((inst) => {
                  const catalogo = acharCatalogo(inst.nome);
                  return (
                    <li key={inst.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/5 bg-black/25 px-3 py-2 text-xs">
                      {catalogo ? (
                        <>
                          <span className="min-w-[7rem] flex-1 font-bold text-gray-200">{inst.nome}</span>
                          <div className="flex gap-1" role="group" aria-label={`Nível de ${inst.nome}`}>
                            {catalogo.niveis.map((nivel) => (
                              <button
                                key={nivel.nivel}
                                type="button"
                                aria-pressed={inst.nivel === nivel.nivel}
                                onClick={() => atualizarInstalacao(inst.id, { nivel: nivel.nivel, espacosOcupados: nivel.espacos })}
                                className={`rounded-md border px-2 py-1 text-[11px] font-bold ${inst.nivel === nivel.nivel ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100' : 'border-white/10 text-gray-500 hover:text-gray-200'}`}
                              >
                                N{nivel.nivel}
                              </button>
                            ))}
                          </div>
                          <span className="w-14 text-right font-mono text-[10px] text-gray-500">{inst.espacosOcupados} vaga(s)</span>
                        </>
                      ) : (
                        <>
                          <input value={inst.nome} onChange={(e) => atualizarInstalacao(inst.id, { nome: e.target.value })} placeholder="Nome (ex.: Torre de vigia)" aria-label="Nome da instalação" className={`${campo} min-w-[8rem] flex-1 py-1.5`} />
                          <input type="number" min={1} value={inst.nivel} onChange={(e) => atualizarInstalacao(inst.id, { nivel: Math.max(1, Number(e.target.value) || 1) })} aria-label="Nível" className={`${campo} w-16 py-1.5`} />
                          <input type="number" min={1} value={inst.espacosOcupados} onChange={(e) => atualizarInstalacao(inst.id, { espacosOcupados: Math.max(1, Number(e.target.value) || 1) })} aria-label="Vagas ocupadas" className={`${campo} w-16 py-1.5`} />
                        </>
                      )}
                      <button type="button" onClick={() => remover(inst.id)} aria-label={`Remover ${inst.nome || 'instalação'}`} className="rounded p-1.5 text-gray-500 hover:text-red-300">
                        <Trash2 size={13} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-xs text-gray-600">Nenhuma instalação ainda. Toque num nível acima para adicionar.</p>
            )}
            {estourou ? <p className="text-xs font-bold text-red-300">As instalações ocupam {usados} vagas e o patamar {patamar?.titulo} tem {patamar?.espacos}. Remova uma ou suba o patamar.</p> : null}
          </Secao>

          <Secao numero={4} titulo="Quanto custa?" dica="A regra calcula pelo patamar e pelas instalações. Você pode aceitar o valor sugerido ou registrar o que realmente pagou.">
            {sugerido ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.05] p-3">
                <div className="flex items-start gap-2">
                  <Calculator size={16} className="mt-0.5 text-amber-300" aria-hidden="true" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-100">Pela regra: {lunaris(sugerido.aquisicao)} + {lunaris(sugerido.manutencao)}/mês</p>
                    {sugerido.ignoradas > 0 ? <p className="text-amber-200/70">{sugerido.ignoradas} instalação(ões) personalizada(s) ficaram fora da conta.</p> : <p className="text-amber-200/70">Patamar + instalações, na unidade de {lunaris(REFERENCIA_CUSTOS_BASES.unidadeAquisicaoLunaris)} e {lunaris(REFERENCIA_CUSTOS_BASES.unidadeManutencaoLunaris)}/mês.</p>}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={igualAoSugerido}
                  onClick={() => setForm((atual) => ({ ...atual, valorAquisicao: sugerido.aquisicao, manutencao: sugerido.manutencao }))}
                  className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-100 enabled:hover:bg-amber-300/20 disabled:opacity-50"
                >
                  {igualAoSugerido ? 'Já aplicado' : 'Usar valor sugerido'}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-600">Escolha um patamar para ver o custo calculado pela regra.</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={rotulo} htmlFor="prop-aq">Aquisição (L$)</label>
                <input id="prop-aq" type="number" min={0} value={form.valorAquisicao} onChange={(e) => mudar('valorAquisicao', Math.max(0, numeroFinito(e.target.value)))} className={campo} />
              </div>
              <div>
                <label className={rotulo} htmlFor="prop-man">Manutenção mensal (L$)</label>
                <input id="prop-man" type="number" min={0} value={form.manutencao} onChange={(e) => mudar('manutencao', Math.max(0, numeroFinito(e.target.value)))} className={campo} />
              </div>
            </div>
            <div>
              <label className={rotulo} htmlFor="prop-qual">Qualidade dos alojamentos</label>
              <select id="prop-qual" value={form.qualidadeQuartos} onChange={(e) => mudar('qualidadeQuartos', e.target.value)} className={campo}>
                {QUALIDADES_QUARTO.map((q) => <option key={q.value} value={q.value}>{q.label}</option>)}
              </select>
            </div>
          </Secao>

          <Secao numero={5} titulo="Alguma história?">
            <textarea value={form.descricao} onChange={(e) => mudar('descricao', e.target.value)} rows={3} placeholder="Como conseguiu, quem mora ali, o que tem de especial." aria-label="Descrição" className={`${campo} resize-none`} />
          </Secao>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/10 p-4">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              <Building2 size={12} aria-hidden="true" /> Prévia
            </p>
            <h4 className="mt-1 truncate text-base font-bold text-white">{form.nome.trim() || 'Sem nome ainda'}</h4>
            <p className="text-[11px] text-gray-500">{TIPOS_PROPRIEDADE.find((t) => t.value === form.tipo)?.label}{patamar ? ` · ${patamar.titulo}` : ''}{form.localizacao ? ` · ${form.localizacao}` : ''}</p>
            <PlantaBase patamar={form.patamar} instalacoes={planta} colunas={4} />
            <p className="mt-3 border-t border-white/5 pt-3 text-[11px] text-gray-500">
              Aquisição <strong className="text-gray-300">{lunaris(form.valorAquisicao)}</strong> · Manutenção <strong className="text-gray-300">{lunaris(form.manutencao)}/mês</strong>
            </p>
          </div>
        </aside>
      </div>

      <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t border-white/5 bg-[#0f0e15]/95 py-4 backdrop-blur">
        <p className="text-xs text-gray-600">{podeSalvar ? (estourou ? 'Dá para salvar, mas confira as vagas.' : 'Tudo certo.') : 'Dê um nome à propriedade para salvar.'}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onFechar} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
          <button type="button" onClick={onSalvar} disabled={!podeSalvar} className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-5 py-2.5 text-sm font-bold text-emerald-200 enabled:hover:bg-emerald-500/25 disabled:opacity-40">
            {editando ? 'Salvar alterações' : 'Adicionar propriedade'}
          </button>
        </div>
      </div>
    </FichaModal>
  );
};
