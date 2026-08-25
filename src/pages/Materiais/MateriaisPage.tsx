import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BookOpen, CarFront, ChevronRight, Cog, FlaskConical, Hammer, Package, Search, ShoppingBag, Sparkles, UtensilsCrossed, WandSparkles, X } from 'lucide-react';
import {
  CUSTO_MATERIA_PRIMA_POR_RARIDADE,
  RECURSO_MATERIAL_POR_ID,
  RECURSOS_MATERIAIS,
  ROTULO_RARIDADE_RECURSO,
  normalizarRaridadeRecurso,
  recursosDeUsos,
  type RecursoMaterialId,
} from '../../../data/regras/recursos-materiais';
import {
  MATERIAIS_CATALOGO,
  RECEITAS_CATALOGO,
  ROTULOS_RARIDADE,
  materialCorrespondeBusca,
  receitaCorrespondeBusca,
  type MaterialCatalogItem,
  type ReceitaCatalogItem,
} from '../../services/materialsCatalogService';

type Aba = 'recursos' | 'receitas' | 'guia';

const TEMA_RECURSO: Record<RecursoMaterialId, string> = {
  'componentes-quimicos': 'border-emerald-400/25 from-emerald-500/15 text-emerald-200',
  'componentes-ritualisticos': 'border-violet-400/25 from-violet-500/15 text-violet-200',
  'componentes-veiculares': 'border-indigo-400/25 from-indigo-500/15 text-indigo-200',
  sucata: 'border-amber-400/25 from-amber-500/15 text-amber-200',
  mantimentos: 'border-orange-400/25 from-orange-500/15 text-orange-200',
  'materia-prima': 'border-sky-400/25 from-sky-500/15 text-sky-200',
};

const ICONE_RECURSO = {
  'componentes-quimicos': FlaskConical,
  'componentes-ritualisticos': WandSparkles,
  'componentes-veiculares': CarFront,
  sucata: Cog,
  mantimentos: UtensilsCrossed,
  'materia-prima': Hammer,
} satisfies Record<RecursoMaterialId, typeof Package>;

const formatarPreco = (preco?: Record<string, number>) => !preco
  ? 'Sem preço de referência'
  : Object.entries(preco).map(([moeda, valor]) => `${valor} ${moeda}`).join(' · ');

function Busca({ valor, onChange }: { valor: string; onChange: (valor: string) => void }) {
  return (
    <label className="relative block flex-1">
      <span className="sr-only">Buscar materiais ou receitas</span>
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-300" />
      <input value={valor} onChange={(event) => onChange(event.target.value)} placeholder="Busque por nome, uso ou efeito..." className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 pl-12 pr-11 text-sm text-white outline-none placeholder:text-white/35 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/15" />
      {valor && <button type="button" onClick={() => onChange('')} aria-label="Limpar busca" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>}
    </label>
  );
}

function RecursoCard({ id, ativo, onClick }: { id: RecursoMaterialId; ativo: boolean; onClick: () => void }) {
  const recurso = RECURSO_MATERIAL_POR_ID.get(id)!;
  const Icon = ICONE_RECURSO[id];
  const total = MATERIAIS_CATALOGO.filter((material) => recursosDeUsos(material.usos).includes(id)).length;
  return (
    <button type="button" onClick={onClick} aria-pressed={ativo} className={`rounded-2xl border bg-gradient-to-br to-black/25 p-5 text-left transition hover:-translate-y-0.5 hover:border-white/35 ${TEMA_RECURSO[id]} ${ativo ? 'ring-2 ring-white/25' : ''}`}>
      <div className="flex items-start justify-between gap-3"><span className="rounded-xl border border-current/20 bg-black/25 p-2.5"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white/50">{total} exemplos</span></div>
      <h2 className="mt-4 font-serif text-xl font-bold text-white">{recurso.titulo}</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">{recurso.resumo}</p>
      <p className="mt-4 border-t border-white/10 pt-4 text-xs font-semibold leading-5 text-current">{recurso.regra}</p>
    </button>
  );
}

function MaterialCard({ material }: { material: MaterialCatalogItem }) {
  const recursos = recursosDeUsos(material.usos);
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-serif text-lg font-bold text-white">{material.titulo}</h3><p className="mt-1 text-xs text-white/35">{material.categoria} · {ROTULOS_RARIDADE[material.raridade]}</p></div><Package className="h-5 w-5 shrink-0 text-white/25" /></div>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/50">{material.descricao}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">{recursos.map((id) => <span key={id} className={`rounded-full border bg-black/20 px-2.5 py-1 text-[10px] font-bold ${TEMA_RECURSO[id]}`}>vira {RECURSO_MATERIAL_POR_ID.get(id)!.singular} {ROTULO_RARIDADE_RECURSO[normalizarRaridadeRecurso(material.raridade)]}</span>)}</div>
      <p className="mt-4 text-xs text-white/35">{formatarPreco(material.preco)}</p>
    </article>
  );
}

function ReceitaCard({ receita }: { receita: ReceitaCatalogItem }) {
  const custo = receita.custoRecurso;
  const recurso = custo ? RECURSO_MATERIAL_POR_ID.get(custo.recurso) : undefined;
  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.045] to-black/20 p-5">
      <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/35">{receita.classeRotulo}</span><h3 className="mt-1 font-serif text-xl font-bold text-white">{receita.titulo}</h3></div><FlaskConical className="h-5 w-5 shrink-0 text-emerald-200/50" /></div>
      <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-white/50">{receita.efeito}</p>
      {custo && recurso && <div className={`mt-5 rounded-xl border bg-gradient-to-r to-black/20 p-3 ${TEMA_RECURSO[custo.recurso]}`}><strong className="block text-xs text-white">{custo.quantidade}× {custo.quantidade === 1 ? recurso.singular : recurso.titulo}</strong><span className="mt-1 block text-[11px] text-white/45">{custo.progressaoRaridade === 'nivel-formula-alquimista' ? 'Comum no nível 1 da fórmula; sobe até Lendário no nível 5.' : custo.progressaoRaridade === 'nivel-projeto-engenheiro' ? 'Comum no nível 1 do projeto; sobe até Lendário no nível 5.' : custo.progressaoRaridade === 'nivel-receita-cozinheiro' ? 'Comum no nível 1 da receita; sobe até Lendário no nível 5.' : custo.escopo === 'por-descanso' ? 'Um pagamento abastece todos os preparos do descanso.' : 'Pago quando o ritual é iniciado.'}</span></div>}
    </article>
  );
}

function GuiaRapido() {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">{[
        ['1', 'Encontre algo', 'O grupo acha, compra ou recebe um material na história.'],
        ['2', 'Siga o catálogo', 'Cada material já mostra em qual estoque entra. Somente os marcados também podem virar Matéria-prima.'],
        ['3', 'Preserve a raridade', 'Comum continua Comum e Raro continua Raro. Depois, baixe apenas o número do estoque.'],
      ].map(([numero, titulo, texto]) => <article key={numero} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-300 font-black text-emerald-950">{numero}</span><h3 className="mt-4 font-serif text-lg font-bold text-white">{titulo}</h3><p className="mt-2 text-sm leading-6 text-white/50">{texto}</p></article>)}</div>
      <div className="rounded-2xl border border-violet-300/15 bg-violet-400/8 p-6"><h3 className="font-serif text-xl font-bold text-white">Exemplo rápido</h3><p className="mt-2 text-sm leading-6 text-white/55">Água Pura Comum vira Componente Químico Comum e só abastece fórmulas de nível 1. Para preparar uma fórmula de nível 3, o Alquimista precisa de um Componente Químico Raro; vários componentes inferiores não podem ser somados para burlar essa exigência.</p></div>
      <div className="rounded-2xl border border-indigo-300/15 bg-indigo-400/8 p-6"><h3 className="font-serif text-xl font-bold text-white">Manutenção de veículos</h3><p className="mt-2 text-sm leading-6 text-white/55">No fim de cada mês em que foi usado, o veículo gasta 1 Componente Veicular da própria raridade, mais 1 por módulo de utilidade instalado. Uma nave Rara com Geladeira e Área Médica gasta 3 Componentes Veiculares Raros. Módulo desligado também conta.</p></div>
      <div className="rounded-2xl border border-sky-300/15 bg-sky-400/8 p-6"><h3 className="font-serif text-xl font-bold text-white">Criações permanentes</h3><p className="mt-2 text-sm leading-6 text-white/55">Matéria-prima tem materiais próprios e também aceita alguns itens resistentes ou especiais dos catálogos de Alquimia, Ritual e Engenharia. A etiqueta no material mostra quando isso é possível.</p><div className="mt-4 flex flex-wrap gap-2">{Object.entries(CUSTO_MATERIA_PRIMA_POR_RARIDADE).map(([raridade, custo]) => <span key={raridade} className="rounded-full border border-sky-200/15 bg-black/20 px-3 py-1.5 text-xs text-sky-100/75">{ROTULOS_RARIDADE[raridade as keyof typeof ROTULOS_RARIDADE]}: {custo}</span>)}</div></div>
      <Link to="/regras?topico=materiais" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-200 hover:text-white">Abrir a regra completa <ChevronRight className="h-4 w-4" /></Link>
    </div>
  );
}

export function MateriaisPage() {
  const [searchParams] = useSearchParams();
  const recursoInicial = searchParams.get('recurso') as RecursoMaterialId | null;
  const [aba, setAba] = useState<Aba>(() => searchParams.get('aba') === 'receitas' ? 'receitas' : 'recursos');
  const [busca, setBusca] = useState(() => searchParams.get('busca') ?? '');
  const [recursoAtivo, setRecursoAtivo] = useState<RecursoMaterialId | null>(() => recursoInicial && RECURSO_MATERIAL_POR_ID.has(recursoInicial) ? recursoInicial : null);
  const [classe, setClasse] = useState('');
  const materiais = useMemo(() => MATERIAIS_CATALOGO.filter((material) => materialCorrespondeBusca(material, busca) && (!recursoAtivo || recursosDeUsos(material.usos).includes(recursoAtivo))), [busca, recursoAtivo]);
  const receitas = useMemo(() => RECEITAS_CATALOGO.filter((receita) => receitaCorrespondeBusca(receita, busca) && (!classe || receita.classe === classe)), [busca, classe]);

  return (
    <main className="relative z-10 min-h-[100dvh] px-4 pb-32 pt-8 sm:px-6 lg:px-10 lg:pt-10"><div className="mx-auto max-w-7xl">
      <header className="relative overflow-hidden rounded-3xl border border-emerald-300/15 bg-[#0d1713]/80 p-6 shadow-2xl shadow-black/20 sm:p-9 lg:p-12"><div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" /><div className="relative max-w-3xl"><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200"><Sparkles className="h-4 w-4" /> Sistema simplificado</div><h1 className="font-serif text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">Materiais sem burocracia</h1><p className="mt-4 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">Alquimia, Rituais, Engenharia, Cozinha e manutenção veicular têm catálogos próprios. Matéria-prima reúne o que serve para criações permanentes. Você escolhe algo que combina com a cena e anota apenas o lote.</p></div></header>
      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0b100f]/85 p-4 shadow-xl sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex rounded-2xl border border-white/10 bg-black/25 p-1">{([['recursos', Package, 'Recursos'], ['receitas', FlaskConical, 'Receitas'], ['guia', BookOpen, 'Como funciona']] as const).map(([id, Icon, label]) => <button key={id} type="button" onClick={() => setAba(id)} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition lg:flex-none ${aba === id ? 'bg-emerald-300 text-emerald-950' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4" /><span>{label}</span></button>)}</div>{aba !== 'guia' && <Busca valor={busca} onChange={setBusca} />}{aba === 'receitas' && <select value={classe} onChange={(event) => setClasse(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#101614] px-3 text-sm text-white/80"><option value="">Todos os tipos</option><option value="alquimista">Alquimia</option><option value="ritualista">Rituais</option><option value="engenheiro">Engenharia</option><option value="cozinheiro">Cozinha</option></select>}</div></section>
      <section className="mt-7">
        {aba === 'recursos' && <div className="space-y-7"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{RECURSOS_MATERIAIS.map((recurso) => <RecursoCard key={recurso.id} id={recurso.id} ativo={recursoAtivo === recurso.id} onClick={() => setRecursoAtivo((atual) => atual === recurso.id ? null : recurso.id)} />)}</div><div className="flex items-center justify-between gap-4"><p className="text-sm text-white/45"><strong className="text-white/80">{materiais.length}</strong> exemplos {recursoAtivo ? `de ${RECURSO_MATERIAL_POR_ID.get(recursoAtivo)!.titulo}` : 'nos seis estoques'}</p><Link to="/loja?categoria=Componentes" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200/70 hover:text-amber-100"><ShoppingBag className="h-4 w-4" /> Ver na Loja</Link></div>{materiais.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{materiais.map((material) => <MaterialCard key={material.id} material={material} />)}</div> : <p className="rounded-2xl border border-white/10 p-8 text-center text-white/45">Nenhum exemplo encontrado.</p>}</div>}
        {aba === 'receitas' && <div><p className="mb-4 text-sm text-white/45"><strong className="text-white/80">{receitas.length}</strong> preparos encontrados</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{receitas.map((receita) => <ReceitaCard key={receita.chave} receita={receita} />)}</div></div>}
        {aba === 'guia' && <GuiaRapido />}
      </section>
    </div></main>
  );
}
