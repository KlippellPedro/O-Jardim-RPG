import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Brain,
  Check,
  FlaskConical,
  HeartPulse,
  Pencil,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  CRISES_SANIDADE,
  type ICondicaoRegra,
} from '../../../../data/regras/condicoes';
import type { FiltroCondicao } from '../../../../data/regras/condicoes-longo-prazo';
import {
  AVISO_SAUDE_MENTAL,
  FILTROS_CATALOGO,
  listarCondicoes,
} from '../utils/catalogoCondicoes';
import { adicionarCondicaoOficial, condicaoAtiva, obterStatusFicha } from '../../../services/statusService';
import { normalizarAflicoesAtivas } from '../../../services/aflicoesFichaService';
import { AflicoesSection } from '../components/AflicoesSection';
import { ExplicacaoCondicaoAflicao } from '../components/ExplicacaoCondicaoAflicao';
import { EfeitoDoTurnoBotao } from '../components/EfeitoDoTurnoBotao';
import { CatalogoAflicoes } from '../../Regras/components/CatalogoAflicoes';

interface AbaCondicoesProps {
  character: any;
  onUpdate: (path: string[], value: unknown) => void;
  /** Leva à Ficha, onde a condição pode ser editada à mão. */
  onOpenConditions?: () => void;
}

type Painel = 'condicoes' | 'aflicoes';

const ESTILO_CATEGORIA: Record<ICondicaoRegra['categoria'], string> = {
  física: 'border-orange-400/20 bg-orange-400/10 text-orange-200',
  mental: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200',
  combate: 'border-red-400/20 bg-red-400/10 text-red-200',
};

export const AbaCondicoes = ({ character, onUpdate, onOpenConditions }: AbaCondicoesProps) => {
  const ficha = character.ficha || {};
  const status = obterStatusFicha(ficha);
  const [painel, setPainel] = useState<Painel>('condicoes');
  const [filtroCondicao, setFiltroCondicao] = useState<FiltroCondicao>('cena');
  const [buscaCondicao, setBuscaCondicao] = useState('');
  const [mensagem, setMensagem] = useState('');

  const condicoesAtivas: any[] = Array.isArray(ficha.condicoesAtivas) ? ficha.condicoesAtivas : [];
  const aflicoesAtivas = useMemo(() => normalizarAflicoesAtivas(ficha.aflicoesAtivas), [ficha.aflicoesAtivas]);
  const condicoesVisiveis = useMemo(
    () => listarCondicoes(filtroCondicao, buscaCondicao),
    [filtroCondicao, buscaCondicao],
  );
  const filtroAtual = FILTROS_CATALOGO.find((filtro) => filtro.id === filtroCondicao) ?? FILTROS_CATALOGO[0];
  const mostraAvisoMental = buscaCondicao.trim()
    ? condicoesVisiveis.some((item) => item.categoria === 'mental')
    : filtroCondicao === 'mente';
  const sanidadeMaxima = Math.max(1, Number(status.sanidadeMaxima) || 100);
  const sanidadeAtual = Number(status.sanidadeAtual ?? sanidadeMaxima);

  const aplicarCondicao = (regra: ICondicaoRegra) => {
    const resultado = adicionarCondicaoOficial(condicoesAtivas, regra);
    if (resultado.adicionada) {
      onUpdate(['ficha', 'condicoesAtivas'], resultado.condicoes);
      setMensagem(`${regra.titulo} entrou em "Em vigor agora".`);
    } else {
      setMensagem(`${regra.titulo} já estava em vigor.`);
    }
  };

  const removerCondicao = (indice: number) => {
    const alvo = condicoesAtivas[indice];
    onUpdate(['ficha', 'condicoesAtivas'], condicoesAtivas.filter((_, posicao) => posicao !== indice));
    setMensagem(`${alvo?.nome || 'Condição'} saiu das condições em vigor.`);
  };

  const removerPorRegra = (regra: ICondicaoRegra) => {
    const indice = condicoesAtivas.findIndex((c) => c?.id === regra.id || c?.nome === regra.titulo);
    if (indice >= 0) removerCondicao(indice);
  };

  const renderCondicao = (item: ICondicaoRegra, crise = false) => {
    const ativa = condicaoAtiva(condicoesAtivas, item.id) || condicaoAtiva(condicoesAtivas, item.titulo);
    return (
      <article
        key={item.id}
        className={`group flex min-h-full flex-col overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
          ativa
            ? 'border-emerald-400/30 bg-emerald-400/[0.06] shadow-[0_0_24px_rgba(52,211,153,0.06)]'
            : crise
              ? 'border-fuchsia-400/15 bg-fuchsia-400/[0.035] hover:border-fuchsia-400/30'
              : 'border-white/[0.07] bg-black/20 hover:-translate-y-0.5 hover:border-[#c7a44c]/25'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            {item.grupo && <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-gray-600">{item.grupo}</span>}
            <strong className="text-sm text-white">{item.titulo}</strong>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.duracao}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] ${ESTILO_CATEGORIA[item.categoria]}`}>
              {item.categoria}
            </span>
            {item.positiva && (
              <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                benéfica
              </span>
            )}
            {item.permanente && (
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200">
                permanente
              </span>
            )}
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-xs leading-relaxed text-gray-300">
          {item.efeitos.map((efeito) => (
            <li key={efeito} className="flex gap-2">
              <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[#c7a44c]" aria-hidden="true" />
              <span>{efeito}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <p className="border-t border-white/[0.06] pt-3 text-[11px] leading-relaxed text-emerald-200/75">
            <span className="font-bold text-emerald-200">Como remover:</span> {item.remocao}
          </p>
          <button
            type="button"
            onClick={() => (ativa ? removerPorRegra(item) : aplicarCondicao(item))}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
              ativa
                ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200 hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-200'
                : 'border-[#c7a44c]/25 bg-[#c7a44c]/10 text-[#e1c76f] hover:border-[#c7a44c]/45 hover:bg-[#c7a44c]/15'
            }`}
          >
            {ativa ? <Check size={14} /> : <ArrowRight size={14} />}
            {ativa ? 'Em vigor · tocar para remover' : 'Aplicar no personagem'}
          </button>
        </div>
      </article>
    );
  };

  const abas: Array<{ id: Painel; rotulo: string; quantidade: number; Icone: typeof ShieldAlert; descricao: string }> = [
    { id: 'condicoes', rotulo: 'Condições', quantidade: condicoesAtivas.length, Icone: ShieldAlert, descricao: 'Efeitos de cena, lesões, sequelas e a mente' },
    { id: 'aflicoes', rotulo: 'Aflições', quantidade: aflicoesAtivas.length, Icone: FlaskConical, descricao: 'Venenos, doenças e vícios' },
  ];

  return (
    <div className="space-y-6">
      <header
        className="relative overflow-hidden rounded-3xl border border-red-400/15 bg-[#0f0e15] p-5 sm:p-7"
        data-tour="condicoes-resumo"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(248,113,113,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(163,230,53,0.06),transparent_38%)]" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-red-200/80">O que pesa no personagem</p>
            <h2 className="flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>
              <ShieldAlert className="text-red-300" />Condições e aflições
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Tudo o que está afetando o personagem agora, e o catálogo pronto para aplicar. Condições são efeitos de cena, lesões e marcas da mente. Aflições são venenos, doenças e vícios que pioram ou melhoram por estágios.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:min-w-[360px]">
            {[
              ['Condições', String(condicoesAtivas.length), 'em vigor'],
              ['Aflições', String(aflicoesAtivas.length), 'em curso'],
              ['Sanidade', String(sanidadeAtual), `de ${sanidadeMaxima}`],
            ].map(([rotulo, valor, apoio]) => (
              <div key={rotulo} className="rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
                <span className="block text-[9px] font-bold uppercase tracking-widest text-gray-500">{rotulo}</span>
                <strong className="mt-1 block text-lg text-white">{valor}</strong>
                <span className="block text-[10px] text-gray-600">{apoio}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Condições ou aflições">
          {abas.map(({ id, rotulo, quantidade, Icone, descricao }) => {
            const ativo = painel === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`condicoes-tab-${id}`}
                aria-selected={ativo}
                onClick={() => setPainel(id)}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                  ativo
                    ? (id === 'condicoes' ? 'border-red-400/40 bg-red-400/10' : 'border-lime-300/40 bg-lime-300/10')
                    : 'border-white/[0.07] bg-black/20 hover:border-white/15 hover:bg-white/[0.03]'
                }`}
              >
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-black/25 ${
                  id === 'condicoes' ? 'border-red-400/25 text-red-300' : 'border-lime-300/25 text-lime-300'
                }`}>
                  <Icone size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className={`block text-sm ${ativo ? 'text-white' : 'text-gray-300'}`}>{rotulo}</strong>
                  <span className="block truncate text-[11px] text-gray-500">{descricao}</span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[10px] font-bold text-gray-300">
                  {quantidade} ativa{quantidade === 1 ? '' : 's'}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <ExplicacaoCondicaoAflicao />

      {painel === 'condicoes' ? (
        <>
          <section className="rounded-3xl border border-red-400/10 bg-[#0f0e15] p-5 sm:p-6" data-tour="condicoes-ativas">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Agora</p>
                <h3 className="mt-1 text-lg font-bold text-white">Em vigor agora</h3>
              </div>
              {onOpenConditions && (
                <button
                  type="button"
                  onClick={onOpenConditions}
                  className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-bold text-gray-400 transition-colors hover:border-white/20 hover:text-white sm:self-auto"
                >
                  <Pencil size={12} /> Criar ou editar à mão na Ficha
                </button>
              )}
            </div>

            {condicoesAtivas.length > 0 ? (
              <div className="grid gap-2.5 lg:grid-cols-2">
                {condicoesAtivas.map((c, indice) => (
                  <div key={c.id || `${c.nome}-${indice}`} className="group flex items-start justify-between gap-3 rounded-2xl border border-red-400/15 bg-red-400/[0.035] p-4">
                    <div className="min-w-0">
                      <strong className="text-sm text-red-200">{c.nome}</strong>
                      <p className="mt-1 text-xs leading-relaxed text-gray-400">{c.descricao}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                        {c.afeta && <span className="rounded-md bg-white/[0.04] px-2 py-1">{c.afeta}</span>}
                        {c.duracao && <span className="rounded-md bg-white/[0.04] px-2 py-1 normal-case tracking-normal">{c.duracao}</span>}
                      </div>
                      <EfeitoDoTurnoBotao condicao={c} character={character} onUpdate={onUpdate} />
                    </div>
                    <button
                      type="button"
                      onClick={() => removerCondicao(indice)}
                      className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-400/10 hover:text-red-300"
                      aria-label={`Remover condição ${c.nome}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-8 text-center text-xs text-gray-500">
                Nenhuma condição em vigor. Escolha uma no catálogo abaixo e toque em “Aplicar no personagem”.
              </p>
            )}

            {mensagem && (
              <p className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm font-bold text-emerald-200" aria-live="polite">{mensagem}</p>
            )}
          </section>

          <section className="rounded-3xl border border-white/[0.07] bg-[#0f0e15] p-5 sm:p-6" data-tour="condicoes-catalogo">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Catálogo oficial</p>
              <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-white"><ShieldAlert size={19} className="text-orange-300" />Aplicar uma condição</h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">Escolha o tipo, leia o efeito e aplique. Lesões, sequelas permanentes e condições da mente já vêm escritas.</p>
            </div>

            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de condição">
                {FILTROS_CATALOGO.map((filtro) => {
                  const ativo = !buscaCondicao.trim() && filtro.id === filtroCondicao;
                  return (
                    <button
                      key={filtro.id}
                      type="button"
                      aria-pressed={ativo}
                      onClick={() => { setFiltroCondicao(filtro.id); setBuscaCondicao(''); }}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                        ativo
                          ? 'border-[#c7a44c]/60 bg-[#c7a44c]/15 text-[#e1c76f]'
                          : 'border-white/10 bg-black/20 text-gray-400 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {filtro.rotulo}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 focus-within:border-[#c7a44c]/40 lg:w-72">
                <Search size={14} className="shrink-0 text-gray-500" aria-hidden="true" />
                <input
                  type="search"
                  value={buscaCondicao}
                  onChange={(event) => setBuscaCondicao(event.target.value)}
                  placeholder="Buscar em todas: braço, ansiedade..."
                  aria-label="Buscar condição"
                  className="w-full bg-transparent text-xs text-white placeholder:text-gray-600 focus:outline-none"
                />
              </label>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-gray-500">
              {buscaCondicao.trim()
                ? `${condicoesVisiveis.length} resultado(s) em todo o catálogo.`
                : `${filtroAtual.descricao} ${condicoesVisiveis.length} no total.`}
            </p>
            {mostraAvisoMental && (
              <p className="mb-4 flex items-start gap-3 rounded-2xl border border-fuchsia-400/15 bg-fuchsia-400/[0.04] p-4 text-xs leading-relaxed text-gray-400">
                <Brain size={17} className="mt-0.5 shrink-0 text-fuchsia-300" aria-hidden="true" />
                {AVISO_SAUDE_MENTAL}
              </p>
            )}

            {condicoesVisiveis.length > 0
              ? <div className="grid gap-3 lg:grid-cols-2">{condicoesVisiveis.map((item) => renderCondicao(item))}</div>
              : <p className="rounded-2xl border border-white/[0.06] bg-black/20 p-5 text-center text-xs text-gray-500">Nenhuma condição encontrada. Se faltar uma, crie a sua na Ficha.</p>}
          </section>

          <section className="rounded-3xl border border-fuchsia-400/10 bg-[#0f0e15] p-5 sm:p-6" data-tour="condicoes-sanidade">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gray-500">Quando a mente cede</p>
              <h3 className="mt-1 flex items-center gap-2 text-lg font-bold text-white"><Brain size={19} className="text-fuchsia-300" />Crises de Sanidade</h3>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-gray-500">Em Ruptura, uma nova perda exige Vontade DT 15. Na Quebra, a crise é imediata. Aplique a crise aqui e ela entra em “Em vigor agora”.</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">{CRISES_SANIDADE.map((item) => renderCondicao(item, true))}</div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.035] p-4 text-xs leading-relaxed text-gray-400">
              <HeartPulse size={17} className="mt-0.5 shrink-0 text-emerald-300" />
              Tratamento em local seguro recupera Sanidade somente pelo descanso. Ajuda profissional pode conceder vantagem contra uma crise, mas não apaga uma condição permanente sem resolução narrativa. A condição permanente da Quebra, definida com o jogador, está pronta no catálogo acima, no filtro Mente.
            </div>
          </section>
        </>
      ) : (
        <div className="space-y-6" data-tour="condicoes-aflicoes">
          <AflicoesSection character={character} onUpdate={onUpdate} />
          <CatalogoAflicoes />
        </div>
      )}
    </div>
  );
};
