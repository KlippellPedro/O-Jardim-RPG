import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock3,
  Filter, Loader2, RefreshCw, Search, ScrollText, UserRound,
} from 'lucide-react';
import {
  campanhasApi,
  type AuditoriaFiltros,
  type EventoAuditoriaCampanha,
  type MudancaAuditoria,
} from '../../services/campanhasApi';

interface AuditOption {
  id: string;
  nome: string;
}

interface LogsMestrePanelProps {
  campanhaId: string;
  personagens: AuditOption[];
  membros: AuditOption[];
}

const CATEGORIAS = [
  ['', 'Todas as áreas'],
  ['personagem', 'Ficha'],
  ['loja', 'Loja'],
  ['inventario', 'Inventário'],
  ['campanha', 'Campanha'],
  ['conteudo', 'Lore e cronologia'],
  ['sessao', 'Sessão'],
] as const;

const ACTION_LABELS: Record<string, string> = {
  'personagem.atualizado': 'Ficha atualizada',
  'personagem.criado': 'Personagem criado',
  'personagem.arquivado': 'Personagem arquivado',
  'personagem.dono_transferido': 'Jogador da ficha alterado',
  'personagem.economia_operacoes_aplicadas': 'Carteira ou inventário alterado',
  'personagem.economia_sincronizada': 'Economia sincronizada',
  'personagem.fruto_eden_consumido': 'Fruto do Éden consumido',
  'loja.compra_lote': 'Compra realizada',
  'loja.venda_lote': 'Venda realizada',
  'loja.concessao': 'Item concedido pelo mestre',
  'loja.instalar_modificacao': 'Modificação instalada',
  'loja.catalogo_rascunho_salvo': 'Rascunho da loja salvo',
  'loja.catalogo_item_publicado': 'Item da loja publicado',
  'loja.catalogo_revisao_restaurada': 'Versão da loja restaurada como rascunho',
  'conteudo.rascunho_salvo': 'Rascunho de conteúdo salvo',
  'conteudo.edicao_publicada': 'Conteúdo publicado',
  'conteudo.revisao_restaurada': 'Versão de conteúdo restaurada como rascunho',
  'campanha.propriedade_transferida': 'Campanha transferida',
};

const inputClass = 'rounded-xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-primary/50';

function actionLabel(action: string): string {
  return ACTION_LABELS[action]
    ?? action.split('.').map((part) => part.replace(/_/g, ' ')).join(' · ');
}

function formatValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'vazio';
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  if (typeof value === 'object') {
    const data = value as Record<string, unknown>;
    if (data.tipo === 'lista') return `lista com ${data.itens ?? 0} itens`;
    if (data.tipo === 'objeto') return `objeto com ${data.total_campos ?? 0} campos`;
    return JSON.stringify(value);
  }
  return String(value);
}

function ChangeRow({ change }: { change: MudancaAuditoria }) {
  const color = change.operacao === 'adicionado'
    ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/5'
    : change.operacao === 'removido'
      ? 'text-red-300 border-red-500/20 bg-red-500/5'
      : 'text-amber-200 border-amber-500/20 bg-amber-500/5';
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <code className="break-all text-xs font-bold">{change.caminho}</code>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{change.operacao}</span>
      </div>
      <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
        {change.operacao !== 'adicionado' && <div><span className="block text-[10px] uppercase opacity-50">Antes</span><span className="break-words text-gray-300">{formatValue(change.antes)}</span></div>}
        {change.operacao !== 'removido' && <div><span className="block text-[10px] uppercase opacity-50">Depois</span><span className="break-words text-gray-100">{formatValue(change.depois)}</span></div>}
      </div>
    </div>
  );
}

function EventDetails({ event }: { event: EventoAuditoriaCampanha }) {
  const changes = Array.isArray(event.detalhes?.mudancas) ? event.detalhes.mudancas as MudancaAuditoria[] : [];
  const itemLines = Array.isArray(event.detalhes?.itens) ? event.detalhes.itens : [];
  if (changes.length) {
    return (
      <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
        {changes.map((change, index) => <ChangeRow key={`${change.caminho}:${index}`} change={change} />)}
        {event.detalhes.truncado && <p className="text-xs text-amber-300">O evento possui mais alterações do que o limite armazenado. Total detectado: {event.detalhes.total_mudancas}.</p>}
      </div>
    );
  }
  if (itemLines.length) {
    return <div className="mt-3 border-t border-white/5 pt-3 text-xs text-gray-400">{itemLines.map((item: any, index: number) => <p key={index}>{item.quantidade ?? 1}× {item.titulo ?? item.item_id}</p>)}</div>;
  }
  const useful = Object.entries(event.detalhes || {}).filter(([key]) => !['operacao_id', 'versao', 'economia_versao'].includes(key));
  if (!useful.length) return null;
  return <div className="mt-3 grid gap-2 border-t border-white/5 pt-3 text-xs sm:grid-cols-2">{useful.slice(0, 12).map(([key, value]) => <div key={key}><span className="text-gray-600">{key.replace(/_/g, ' ')}:</span> <span className="text-gray-300">{formatValue(value)}</span></div>)}</div>;
}

export function LogsMestrePanel({ campanhaId, personagens, membros }: LogsMestrePanelProps) {
  const [filters, setFilters] = useState<AuditoriaFiltros>({ limite: 30, pagina: 1 });
  const [applied, setApplied] = useState<AuditoriaFiltros>({ limite: 30, pagina: 1 });
  const [events, setEvents] = useState<EventoAuditoriaCampanha[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async (next: AuditoriaFiltros, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await campanhasApi.auditoria(campanhaId, next, signal);
      setEvents(response.eventos || []);
      setTotal(response.total || 0);
      setPages(response.paginas || 1);
    } catch (requestError: any) {
      if (requestError?.name !== 'AbortError') setError(requestError?.message || 'Não foi possível carregar os logs.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(applied, controller.signal);
    return () => controller.abort();
  }, [applied, load]);

  const page = Number(applied.pagina) || 1;
  const shownRange = useMemo(() => {
    if (!total) return '0 eventos';
    const start = (page - 1) * 30 + 1;
    return `${start}–${Math.min(total, start + events.length - 1)} de ${total}`;
  }, [events.length, page, total]);

  const applyFilters = () => {
    setExpanded(new Set());
    setApplied({ ...filters, pagina: 1, limite: 30 });
  };

  const changePage = (nextPage: number) => {
    setExpanded(new Set());
    setApplied((current) => ({ ...current, pagina: nextPage }));
  };

  const toggle = (id: string) => setExpanded((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white"><ScrollText className="text-primary" size={21} /> Logs da campanha</h2>
            <p className="mt-1 text-xs text-gray-500">Veja quem alterou fichas, inventários, loja, conteúdo e configurações.</p>
          </div>
          <button type="button" onClick={() => void load(applied)} disabled={loading} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 hover:border-white/30 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="relative xl:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} /><input value={filters.busca ?? ''} onChange={(event) => setFilters((current) => ({ ...current, busca: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') applyFilters(); }} placeholder="Ação, pessoa ou personagem..." className={`${inputClass} w-full pl-9`} /></label>
          <select value={filters.ator_id ?? ''} onChange={(event) => setFilters((current) => ({ ...current, ator_id: event.target.value || undefined }))} className={inputClass}><option value="">Todos os jogadores</option>{membros.map((member) => <option key={member.id} value={member.id}>{member.nome}</option>)}</select>
          <select value={filters.personagem_id ?? ''} onChange={(event) => setFilters((current) => ({ ...current, personagem_id: event.target.value || undefined }))} className={inputClass}><option value="">Todos os personagens</option>{personagens.map((character) => <option key={character.id} value={character.id}>{character.nome}</option>)}</select>
          <select value={filters.categoria ?? ''} onChange={(event) => setFilters((current) => ({ ...current, categoria: event.target.value || undefined }))} className={inputClass}>{CATEGORIAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Desde<input type="date" value={filters.desde ? new Date(filters.desde).toLocaleDateString('en-CA') : ''} onChange={(event) => setFilters((current) => ({ ...current, desde: event.target.value ? new Date(`${event.target.value}T00:00:00`).toISOString() : undefined }))} className={`${inputClass} mt-1 block w-full normal-case tracking-normal`} /></label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Até<input type="date" value={filters.ate ? new Date(filters.ate).toLocaleDateString('en-CA') : ''} onChange={(event) => setFilters((current) => ({ ...current, ate: event.target.value ? new Date(`${event.target.value}T23:59:59.999`).toISOString() : undefined }))} className={`${inputClass} mt-1 block w-full normal-case tracking-normal`} /></label>
          <button type="button" onClick={applyFilters} className="flex items-center justify-center gap-2 self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-black hover:brightness-110"><Filter size={15} /> Aplicar filtros</button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-16 text-primary"><Loader2 className="animate-spin" size={30} /></div> : events.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-gray-600">Nenhum evento encontrado com estes filtros.</div> : events.map((event) => {
          const isExpanded = expanded.has(event.id);
          const changes = Array.isArray(event.detalhes?.mudancas) ? event.detalhes.mudancas.length : 0;
          return (
            <article key={event.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 transition-colors hover:border-white/20">
              <button type="button" onClick={() => toggle(event.id)} className="flex w-full items-start justify-between gap-4 text-left">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">{actionLabel(event.acao)}</span>
                    {changes > 0 && <span className="text-[10px] text-gray-500">{event.detalhes.total_mudancas ?? changes} mudança(s)</span>}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-300"><UserRound size={14} className="text-gray-500" /><strong className="text-white">{event.ator_nome || event.ator_servico || 'Sistema'}</strong>{event.alvo_nome ? <> alterou <strong className="text-white">{event.alvo_nome}</strong>{event.alvo_dono_nome && <span className="text-gray-600">({event.alvo_dono_nome})</span>}</> : event.alvo_id ? <span className="truncate text-gray-500">· {event.alvo_tipo}: {event.alvo_id}</span> : null}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-gray-500"><Clock3 size={13} /><span className="hidden sm:inline">{new Date(event.criado_em).toLocaleString('pt-BR')}</span>{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
              </button>
              {isExpanded && <EventDetails event={event} />}
            </article>
          );
        })}
      </div>

      {!loading && total > 0 && <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"><span className="text-xs text-gray-500">{shownRange}</span><div className="flex items-center gap-2"><button type="button" onClick={() => changePage(page - 1)} disabled={page <= 1} className="rounded-lg border border-white/10 p-2 text-gray-300 disabled:opacity-30"><ChevronLeft size={15} /></button><span className="text-xs text-gray-400">Página {page} de {pages}</span><button type="button" onClick={() => changePage(page + 1)} disabled={page >= pages} className="rounded-lg border border-white/10 p-2 text-gray-300 disabled:opacity-30"><ChevronRight size={15} /></button></div></div>}
    </div>
  );
}
