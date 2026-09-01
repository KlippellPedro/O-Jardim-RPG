import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  ChevronRight,
  Globe2,
  History,
  Landmark,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LoreEntry } from '../../../../data/gerado/mundoCatalog';
import {
  CLASSIFICACOES_ENTIDADE,
  ENTIDADES,
  RANKS_PERIGO,
} from '../../../../data/mundo/entidades';
import { FACCOES_DOCUMENTADAS } from '../../../../data/regras/faccoes';
import { loreBloqueado } from '../loreVisibility';
import { universalLoreEntries } from '../worldCodex';

interface UniversalRecordsPageProps {
  catalog: LoreEntry[];
  isMestre: boolean;
  loreRevelado: string[];
  loreOculto: string[];
  entidadesRevelado: string[];
  entidadesOculto: string[];
  onBack: () => void;
  onOpenGlobalTimeline?: () => void;
}

type SectionId = 'seres' | 'faccoes' | 'locais';

interface UniversalRecord {
  key: string;
  title: string;
  kind: string;
  subtitle?: string;
  description: string;
  metadata: Array<[string, string]>;
  href?: string;
  hrefLabel?: string;
}

const paragraphs = (value: string): string[] => value.split(/\n\s*\n/).filter(Boolean);

const textValue = (entry: LoreEntry, key: string): string => {
  const value = (entry.conteudo as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
};

const loreRecord = (entry: LoreEntry): UniversalRecord => ({
  key: `lore:${entry.tipo}:${entry.id}`,
  title: entry.titulo,
  kind: entry.registro_universal === 'local' ? 'Local universal' : 'Ser universal',
  subtitle: textValue(entry, 'epiteto'),
  description: textValue(entry, 'descricao') || 'Este registro ainda não possui uma descrição pública.',
  metadata: [
    ['Localização', textValue(entry, 'localizacao')],
    ['Responsável', textValue(entry, 'responsavel')],
    ['Domínio', textValue(entry, 'dominio')],
  ].filter((item): item is [string, string] => Boolean(item[1])),
});

const entityRecords = (): UniversalRecord[] => ENTIDADES
  .filter((entity) => entity.registroUniversal)
  .map((entity) => {
    const rank = RANKS_PERIGO.find((item) => item.id === entity.rankPerigo)?.titulo;
    const classifications = entity.classificacao
      .map((id) => CLASSIFICACOES_ENTIDADE.find((item) => item.id === id)?.titulo)
      .filter(Boolean)
      .join(', ');
    return {
      key: `entidade:${entity.id}`,
      title: entity.nome,
      kind: 'Entidade universal',
      subtitle: entity.epiteto,
      description: entity.resumo || 'O registro existe, mas seu conto ainda não foi escrito.',
      metadata: [
        ['Rank de Perigo', rank || 'Não registrado'],
        ['Classificação', classifications || 'Não registrada'],
      ],
      href: `/entidades/${entity.id}`,
      hrefLabel: entity.paginaEmBranco ? 'Abrir registro' : 'Ler o conto',
    };
  });

const RecordDetail = ({ record }: { record: UniversalRecord }) => (
  <article className="rounded-3xl border border-cyan-400/20 bg-[#0d1116]/90 shadow-2xl lg:sticky lg:top-5">
    <header className="border-b border-white/10 bg-gradient-to-br from-cyan-400/10 to-transparent p-6 sm:p-9">
      <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-cyan-300">{record.kind}</span>
      <h2 className="mt-3 text-3xl font-bold text-white sm:text-5xl" style={{ fontFamily: 'Cinzel, serif' }}>{record.title}</h2>
      {record.subtitle ? <p className="mt-3 text-sm font-bold uppercase tracking-widest text-gray-500">{record.subtitle}</p> : null}
    </header>
    <div className="space-y-5 p-6 text-base leading-8 text-gray-300 sm:p-9 sm:text-lg sm:leading-9">
      {paragraphs(record.description).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {record.metadata.length > 0 ? (
        <dl className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {record.metadata.map(([label, value]) => (
            <div key={label} className="bg-[#0b0f14] p-4">
              <dt className="text-[8px] font-bold uppercase tracking-widest text-gray-600">{label}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-300">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {record.href ? (
        <Link to={record.href} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-5 py-2 text-sm font-bold text-cyan-300 transition hover:bg-cyan-400/10">
          <BookOpen size={16} /> {record.hrefLabel}
        </Link>
      ) : null}
    </div>
  </article>
);

const RecordsSection = ({
  records,
  selectedKey,
  onSelect,
  emptyLabel,
}: {
  records: UniversalRecord[];
  selectedKey: string;
  onSelect: (key: string) => void;
  emptyLabel: string;
}) => {
  const selected = records.find((record) => record.key === selectedKey) || records[0];
  if (!selected) {
    return <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-gray-600">{emptyLabel}</div>;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <label className="rounded-2xl border border-white/10 bg-[#0b0e13]/90 p-3 lg:hidden">
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-300">Escolher registro</span>
        <select value={selected.key} onChange={(event) => onSelect(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#090c10] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/50">
          {records.map((record) => <option key={record.key} value={record.key}>{record.title} · {record.kind}</option>)}
        </select>
      </label>
      <aside className="hidden h-fit max-h-[80vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0e13]/90 custom-scrollbar lg:sticky lg:top-5 lg:block">
        <div className="border-b border-white/10 px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <Sparkles size={14} className="mr-2 inline text-cyan-300" /> Índice universal
        </div>
        {records.map((record) => (
          <button key={record.key} type="button" onClick={() => onSelect(record.key)} className={`group flex w-full items-center gap-3 border-b border-white/5 px-5 py-4 text-left transition hover:bg-white/5 ${selected === record ? 'bg-cyan-300/[0.06]' : ''}`}>
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-gray-200">{record.title}</strong>
              <small className="text-[9px] font-bold uppercase tracking-widest text-gray-600">{record.kind}</small>
            </span>
            <ChevronRight size={14} className="text-gray-700 group-hover:text-cyan-300" />
          </button>
        ))}
      </aside>
      <div className="min-w-0 scroll-mt-4"><RecordDetail record={selected} /></div>
    </div>
  );
};

export const UniversalCodexPage: React.FC<UniversalRecordsPageProps> = ({
  catalog,
  isMestre,
  loreRevelado,
  loreOculto,
  entidadesRevelado,
  entidadesOculto,
  onBack,
  onOpenGlobalTimeline,
}) => {
  const [section, setSection] = useState<SectionId>('seres');
  const [selectedKey, setSelectedKey] = useState('');
  const visibleUniversalLore = useMemo(() => universalLoreEntries(catalog).filter((entry) => !loreBloqueado(entry, {
    isMestre,
    loreRevelado,
    loreOculto,
  })), [catalog, isMestre, loreOculto, loreRevelado]);
  const beings = useMemo(() => [
    ...visibleUniversalLore.filter((entry) => entry.registro_universal === 'ser').map(loreRecord),
    ...entityRecords().filter((record) => {
      const entityId = record.key.replace('entidade:', '');
      const entity = ENTIDADES.find((item) => item.id === entityId);
      return entity && !loreBloqueado(entity, {
        isMestre,
        loreRevelado: entidadesRevelado,
        loreOculto: entidadesOculto,
      });
    }),
  ], [entidadesOculto, entidadesRevelado, isMestre, visibleUniversalLore]);
  const locations = useMemo(() => visibleUniversalLore
    .filter((entry) => entry.registro_universal === 'local')
    .map(loreRecord), [visibleUniversalLore]);
  const factions = FACCOES_DOCUMENTADAS.filter((faction) => (
    faction.registro_universal && (faction.estado === 'canonica' || isMestre)
  ));

  return (
    <main className="app-detail-page relative z-10 min-h-screen overflow-x-hidden pb-20">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_5%,rgba(103,232,249,0.12),transparent_34%),linear-gradient(180deg,#070a0e_0%,#050508_100%)]" />
      <header className="relative mx-auto max-w-[90rem] px-4 pb-5 pt-4 sm:px-5 sm:pb-8 sm:pt-7 md:px-10 md:pt-10">
        <div className="mb-6 flex items-center justify-between gap-2 sm:mb-10">
          <button type="button" onClick={onBack} className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-gray-300 transition hover:border-white/30 hover:text-white sm:px-4 sm:text-sm"><ArrowLeft size={16} /> <span className="truncate">Voltar ao Jardim</span></button>
          {onOpenGlobalTimeline && (
            <button type="button" onClick={onOpenGlobalTimeline} className="inline-flex min-w-0 items-center gap-2 rounded-full border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300 transition hover:bg-cyan-400/5 sm:px-4 sm:text-sm"><History size={15} /> <span className="truncate">Cronologia geral</span></button>
          )}
        </div>
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-cyan-300"><Globe2 size={16} /> Fora de todas as Árvores</p>
        <h1 className="mt-3 text-[clamp(2.45rem,12vw,4.5rem)] font-bold leading-[1.02] tracking-wide text-white sm:mt-4" style={{ fontFamily: 'Cinzel, serif' }}>Registros Universais</h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-400 sm:mt-5 sm:text-lg sm:leading-8">Arquivo exclusivo de seres, facções e locais do universo geral que não pertencem a nenhuma Árvore. Cosmologia, eventos, idiomas e criaturas regionais ficam em seus próprios registros.</p>

        <nav className="mt-5 grid grid-cols-3 gap-2 sm:mt-9 sm:gap-3" aria-label="Seções dos Registros Universais">
          {[
            ['seres', Sparkles, 'Seres', beings.length],
            ['faccoes', Building2, 'Facções', factions.length],
            ['locais', Landmark, 'Locais', locations.length],
          ].map(([id, Icon, label, count]) => {
            const active = section === id;
            return (
              <button key={id as string} type="button" onClick={() => { setSection(id as SectionId); setSelectedKey(''); }} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-center transition sm:flex-row sm:justify-start sm:gap-4 sm:p-4 sm:text-left ${active ? 'border-cyan-300/50 bg-cyan-300/10' : 'border-white/10 bg-black/25 hover:border-white/25'}`}>
                {React.createElement(Icon as typeof Sparkles, { size: 21, className: active ? 'text-cyan-300' : 'text-gray-600' })}
                <span className="min-w-0 sm:flex-1"><strong className="block truncate text-xs text-white sm:text-sm">{label as string}</strong><small className="block text-[8px] font-bold uppercase tracking-wide text-gray-600 sm:text-[9px] sm:tracking-widest">{count as number} <span className="hidden sm:inline">registros</span></small></span>
              </button>
            );
          })}
        </nav>
      </header>

      <div className="relative mx-auto max-w-[90rem] px-4 sm:px-5 md:px-10">
        {section === 'seres' ? <RecordsSection records={beings} selectedKey={selectedKey} onSelect={setSelectedKey} emptyLabel="Nenhum ser universal foi revelado." /> : null}

        {section === 'faccoes' ? (
          <section>
            <div className="mb-7 flex items-end justify-between gap-5">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300">Organizações sem Árvore</p><h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Facções Universais</h2></div>
              <Shield className="hidden text-cyan-400/40 sm:block" size={42} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {factions.map((faction) => (
                <article key={faction.id} className="rounded-3xl border border-white/10 bg-[#0b0e13]/90 p-6 shadow-xl">
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-cyan-400">{faction.tipo.replace(/-/g, ' ')}</span>
                    {faction.estado === 'proposta' ? <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[8px] font-bold uppercase tracking-widest text-amber-300">Proposta</span> : null}
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>{faction.titulo}</h3>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-gray-600">{faction.alcance}</p>
                  <p className="mt-5 text-sm leading-7 text-gray-400">{faction.atuacao_publica}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {section === 'locais' ? <RecordsSection records={locations} selectedKey={selectedKey} onSelect={setSelectedKey} emptyLabel="Nenhum local universal foi revelado." /> : null}
      </div>
    </main>
  );
};
