import { useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  Clock,
  FlaskConical,
  Search,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import {
  CATALOGO_AFLICOES,
  type IAflicao,
  type IPeriodoAflicao,
  type TipoAflicao,
} from '../../../../data/regras/aflicoes';

type FiltroAflicao = 'todas' | TipoAflicao;

const CONFIG_TIPO = {
  veneno: {
    rotulo: 'Veneno',
    rotuloPlural: 'Venenos',
    Icone: FlaskConical,
    cor: 'text-emerald-300',
    borda: 'border-emerald-400/25',
    fundo: 'from-emerald-400/[0.10] via-emerald-400/[0.025] to-transparent',
    selo: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-200',
    ativo: 'border-emerald-300/45 bg-emerald-300/15 text-emerald-100',
  },
  doenca: {
    rotulo: 'Doença',
    rotuloPlural: 'Doenças',
    Icone: Activity,
    cor: 'text-amber-300',
    borda: 'border-amber-400/25',
    fundo: 'from-amber-400/[0.10] via-amber-400/[0.025] to-transparent',
    selo: 'border-amber-300/25 bg-amber-300/10 text-amber-200',
    ativo: 'border-amber-300/45 bg-amber-300/15 text-amber-100',
  },
  vicio: {
    rotulo: 'Vício',
    rotuloPlural: 'Vícios',
    Icone: Brain,
    cor: 'text-violet-300',
    borda: 'border-violet-400/25',
    fundo: 'from-violet-400/[0.10] via-violet-400/[0.025] to-transparent',
    selo: 'border-violet-300/25 bg-violet-300/10 text-violet-200',
    ativo: 'border-violet-300/45 bg-violet-300/15 text-violet-100',
  },
} as const;

const normalizar = (valor: string) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

const formatarPeriodo = (periodo: IPeriodoAflicao) => {
  if (periodo.quantidade === 0) return 'Imediata';
  const unidade = periodo.quantidade === 1 ? periodo.unidade : `${periodo.unidade}s`;
  return `${periodo.quantidade} ${unidade}`;
};

const capitalizar = (valor: string) => valor.charAt(0).toLocaleUpperCase('pt-BR') + valor.slice(1);

const textoAntidoto = (aflicao: IAflicao) => {
  if (aflicao.tratamento.antidoto === 'encerra') return 'Antídoto encerra a aflição.';
  if (aflicao.tratamento.antidoto === 'encerra_se_especifico') return 'Exige preparo específico para encerrar.';
  return 'Antídoto não se aplica.';
};

function EstagiosAflicao({ aflicao }: { aflicao: IAflicao }) {
  return (
    <section className="mt-6" aria-label={`Estágios de ${aflicao.titulo}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-black uppercase tracking-[0.16em] text-gray-300">Progressão por estágio</h4>
        <span className="text-[10px] text-gray-600">vale apenas o estágio atual</span>
      </div>
      <ol className="grid gap-2 sm:grid-cols-2">
        {aflicao.estagios.map((estagio) => {
          const efeitos = estagio.efeitos.length ? estagio.efeitos : ['Sem efeito.'];
          const nivel = estagio.numero === 0 ? 'seguro' : estagio.numero === 1 ? 'leve' : estagio.numero === 2 ? 'grave' : 'crítico';
          const estilo = estagio.numero === 0
            ? 'border-white/10 bg-white/[0.025]'
            : estagio.numero === 1
              ? 'border-yellow-300/15 bg-yellow-300/[0.045]'
              : estagio.numero === 2
                ? 'border-orange-300/20 bg-orange-300/[0.06]'
                : 'border-rose-400/25 bg-rose-400/[0.075]';
          const numero = estagio.numero === 0
            ? 'border-white/10 bg-white/5 text-gray-500'
            : estagio.numero === 1
              ? 'border-yellow-300/25 bg-yellow-300/10 text-yellow-200'
              : estagio.numero === 2
                ? 'border-orange-300/30 bg-orange-300/10 text-orange-200'
                : 'border-rose-300/35 bg-rose-300/10 text-rose-200';

          return (
            <li key={estagio.numero} className={`rounded-xl border p-3.5 ${estilo}`}>
              <div className="flex items-center gap-2.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${numero}`}>{estagio.numero}</span>
                <div>
                  <strong className="block text-xs text-gray-200">Estágio {estagio.numero}</strong>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-gray-600">{nivel}</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs leading-5 text-gray-400">
                {efeitos.map((efeito) => <li key={efeito}>{efeito}</li>)}
                {estagio.drenagemAtributo ? (
                  <li className="font-semibold text-orange-200/80">Drenagem temporária: −{estagio.drenagemAtributo.valor} {estagio.drenagemAtributo.atributo}.</li>
                ) : null}
              </ul>
              {(estagio.aoEntrar || []).length ? (
                <div className="mt-3 border-t border-white/5 pt-2.5 text-[11px] leading-5 text-rose-200/75">
                  <strong className="mr-1 uppercase tracking-wider">Ao entrar:</strong>
                  {estagio.aoEntrar?.join(' ')}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function CardAflicao({ aflicao }: { aflicao: IAflicao }) {
  const config = CONFIG_TIPO[aflicao.tipo];
  const { Icone } = config;

  return (
    <article className={`relative overflow-hidden rounded-3xl border bg-[#0b0a0f]/80 shadow-[0_18px_45px_rgba(0,0,0,0.22)] ${config.borda}`}>
      <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b ${config.fundo}`} />
      <div className="relative p-5 sm:p-6">
        <header>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border bg-black/20 ${config.borda} ${config.cor}`}>
              <Icone size={22} strokeWidth={1.7} />
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${config.selo}`}>{config.rotulo}</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-gray-500">{aflicao.classificacao}</span>
            </div>
          </div>
          <h3 className="mt-4 text-xl font-bold text-[#f2ead7] sm:text-2xl" style={{ fontFamily: 'Cinzel, serif' }}>{aflicao.titulo}</h3>
        </header>

        <dl className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
          <div className="border-r border-white/10 p-3 text-center">
            <dt className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Resistência</dt>
            <dd className="mt-1 text-sm font-black text-gray-200">Fortitude {aflicao.dtFortitude}</dd>
          </div>
          <div className="border-r border-white/10 p-3 text-center">
            <dt className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Incubação</dt>
            <dd className="mt-1 text-sm font-black text-gray-200">{formatarPeriodo(aflicao.incubacao)}</dd>
          </div>
          <div className="p-3 text-center">
            <dt className="text-[9px] font-bold uppercase tracking-wider text-gray-600">Intervalo</dt>
            <dd className="mt-1 text-sm font-black text-gray-200">{formatarPeriodo(aflicao.intervalo)}</dd>
          </div>
        </dl>

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap gap-1.5">
            {aflicao.exposicao.vias.map((via) => (
              <span key={via} className="rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">{capitalizar(via)}</span>
            ))}
          </div>
          <p className="mt-2.5 text-sm leading-6 text-gray-300"><strong className="text-gray-100">Exposição:</strong> {aflicao.exposicao.gatilho}</p>
        </section>

        <EstagiosAflicao aflicao={aflicao} />

        <section className="mt-5 rounded-2xl border border-sky-300/15 bg-sky-300/[0.045] p-4">
          <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-sky-200"><Stethoscope size={15} /> Tratamento</h4>
          <p className="mt-2.5 text-sm leading-6 text-gray-300"><strong>Cura DT {aflicao.tratamento.dt}:</strong> {aflicao.tratamento.tempo} {aflicao.tratamento.efeitoSucesso}</p>
          <div className="mt-3 grid gap-2 text-[11px] leading-5 text-gray-500 sm:grid-cols-2">
            <span>{aflicao.tratamento.limite}</span>
            <span>{textoAntidoto(aflicao)}</span>
          </div>
        </section>

        {aflicao.dependencia ? (
          <section className="mt-4 rounded-2xl border border-violet-300/15 bg-violet-300/[0.045] p-4">
            <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-violet-200"><Brain size={15} /> Dependência e abstinência</h4>
            <dl className="mt-3 space-y-3 text-xs leading-5 text-gray-400">
              <div><dt className="font-bold text-gray-200">Quando começa</dt><dd>{aflicao.dependencia.gatilhoDependencia}</dd></div>
              <div><dt className="font-bold text-gray-200">Abstinência</dt><dd>Começa após {formatarPeriodo(aflicao.dependencia.inicioAbstinencia).toLocaleLowerCase('pt-BR')}. {aflicao.dependencia.usoDuranteAbstinencia}</dd></div>
              <div><dt className="font-bold text-gray-200">Agência do jogador</dt><dd>{aflicao.dependencia.restricaoAgencia}</dd></div>
            </dl>
          </section>
        ) : null}

        {(aflicao.observacoes || []).length ? (
          <ul className="mt-4 space-y-1.5 border-t border-white/5 pt-4 text-[11px] leading-5 text-gray-500">
            {aflicao.observacoes?.map((observacao) => <li key={observacao}>{observacao}</li>)}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

export function CatalogoAflicoes() {
  const [filtro, setFiltro] = useState<FiltroAflicao>('todas');
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    return CATALOGO_AFLICOES.filter((aflicao) => {
      if (filtro !== 'todas' && aflicao.tipo !== filtro) return false;
      if (!termo) return true;
      const alvo = normalizar([
        aflicao.titulo,
        aflicao.tipo,
        aflicao.classificacao,
        aflicao.exposicao.gatilho,
        ...aflicao.estagios.flatMap((estagio) => estagio.efeitos),
      ].join(' '));
      return termo.split(/\s+/).filter(Boolean).every((palavra) => alvo.includes(palavra));
    });
  }, [busca, filtro]);

  const filtros: Array<{ id: FiltroAflicao; rotulo: string; quantidade: number }> = [
    { id: 'todas', rotulo: 'Todas', quantidade: CATALOGO_AFLICOES.length },
    ...(['veneno', 'doenca', 'vicio'] as const).map((tipo) => ({
      id: tipo,
      rotulo: CONFIG_TIPO[tipo].rotuloPlural,
      quantidade: CATALOGO_AFLICOES.filter((aflicao) => aflicao.tipo === tipo).length,
    })),
  ];

  return (
    <section className="mt-14 border-t border-[#c7a44c]/20 pt-10" aria-labelledby="catalogo-aflicoes-titulo">
      <header>
        <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c7a44c]"><ShieldCheck size={15} /> Referência rápida</span>
        <h2 id="catalogo-aflicoes-titulo" className="text-3xl font-bold text-[#f2ead7] sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Catálogo de aflições</h2>
        <p className="mt-3 max-w-[76ch] text-sm leading-7 text-gray-400">Escolha um tipo ou pesquise pelo efeito. Cada ficha separa exposição, resistência, relógio da aflição, estágios e tratamento.</p>
      </header>

      <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4" aria-label="Como uma aflição funciona">
        {[
          ['01', 'Exposição', 'O gatilho acontece.'],
          ['02', 'Fortitude', 'Teste contra a DT.'],
          ['03', 'Intervalo', 'O relógio volta a cobrar.'],
          ['04', 'Estágio', 'Reduz, mantém ou piora.'],
        ].map(([numero, titulo, descricao]) => (
          <div key={numero} className="bg-[#0b0a0f] p-4">
            <span className="text-[9px] font-black tracking-widest text-[#c7a44c]/60">{numero}</span>
            <strong className="mt-1 block text-sm text-gray-200">{titulo}</strong>
            <span className="mt-1 block text-xs leading-5 text-gray-500">{descricao}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar aflições por tipo">
          {filtros.map((item) => {
            const selecionado = filtro === item.id;
            const estiloAtivo = item.id === 'todas'
              ? 'border-[#c7a44c]/45 bg-[#c7a44c]/15 text-[#ead79d]'
              : CONFIG_TIPO[item.id].ativo;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFiltro(item.id)}
                aria-pressed={selecionado}
                className={`rounded-full border px-3.5 py-2 text-xs font-bold transition ${selecionado ? estiloAtivo : 'border-white/10 bg-black/20 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}
              >
                {item.rotulo} <span className="ml-1 opacity-60">{item.quantidade}</span>
              </button>
            );
          })}
        </div>

        <label className="relative block w-full xl:max-w-sm">
          <span className="sr-only">Buscar aflição ou efeito</span>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
          <input
            type="search"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar nome, exposição ou efeito..."
            className="w-full rounded-xl border border-white/10 bg-black/25 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#c7a44c]/50"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-600" aria-live="polite">
        <Clock size={13} /> {visiveis.length} {visiveis.length === 1 ? 'aflição visível' : 'aflições visíveis'}
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        {visiveis.map((aflicao) => <CardAflicao key={aflicao.id} aflicao={aflicao} />)}
      </div>
      {!visiveis.length ? (
        <p className="mt-5 rounded-2xl border border-dashed border-white/10 py-14 text-center text-sm text-gray-600">Nenhuma aflição corresponde à busca.</p>
      ) : null}
    </section>
  );
}
