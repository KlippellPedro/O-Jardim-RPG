import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookMarked, ChevronRight, Search, Sparkles, X } from 'lucide-react';
import catalogo from '../../../../data/loja/catalogo.json';
import { useDialogAccessibility } from '../../../hooks/useDialogAccessibility';

interface MonstroEntry {
  id: string;
  titulo: string;
  categoria: string;
  descricao: string;
  pv: number | string;
  nivel: number | string;
  vd: number | string;
  defesa: number | string;
  iniciativa: number | string;
  pericias?: string[];
  ataques?: string[];
  habilidades?: string[];
}

const BESTIARIO_COMPLETO: MonstroEntry[] = (catalogo.entradas as any[])
  .filter((e) => e.tipo === 'monstro')
  .map((e) => ({
    id: e.id,
    titulo: e.titulo,
    categoria: e.conteudo?.categoria || 'Desconhecida',
    descricao: e.conteudo?.descricao || '',
    pv: e.conteudo?.pv || '?',
    nivel: e.conteudo?.nivel || '?',
    vd: e.conteudo?.vd || '?',
    defesa: e.conteudo?.defesa || '?',
    iniciativa: e.conteudo?.iniciativa || '?',
    pericias: e.conteudo?.pericias || [],
    ataques: e.conteudo?.ataques || [],
    habilidades: e.conteudo?.habilidades || [],
  }))
  .sort((a, b) => a.titulo.localeCompare(b.titulo));

const BestiarioDetail = ({ item, compacto = false }: { item: MonstroEntry; compacto?: boolean }) => {
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-[#15121b] shadow-xl ${compacto ? '' : 'sticky top-24'}`}
      style={{ borderColor: 'rgba(239, 68, 68, 0.3)', boxShadow: '0 18px 45px rgba(0,0,0,.32), 0 0 24px rgba(239, 68, 68, 0.2)' }}
    >
      <header
        className="border-b p-5 sm:p-6"
        style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), transparent 70%)' }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-red-400">{item.categoria}</span>
          <span className="inline-flex rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-red-400">
            Nível {item.nivel}
          </span>
        </div>
        <h3 className="text-2xl font-bold leading-tight text-[#f2ead7] sm:text-3xl" style={{ fontFamily: 'Cinzel, serif' }}>{item.titulo}</h3>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">VD {item.vd} · {item.pv} PV</p>
      </header>

      <div className="p-5 sm:p-6">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
          <div className="bg-[#100e15] px-4 py-3">
            <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-600">Defesa</dt>
            <dd className="mt-1 text-sm leading-relaxed text-gray-300">{item.defesa}</dd>
          </div>
          <div className="bg-[#100e15] px-4 py-3">
            <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-600">Iniciativa</dt>
            <dd className="mt-1 text-sm leading-relaxed text-gray-300">{item.iniciativa}</dd>
          </div>
        </dl>

        <section className="mt-6">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">Descrição</h4>
          <p className="text-sm leading-7 text-gray-300 sm:text-[15px]">{item.descricao}</p>
        </section>

        {item.habilidades && item.habilidades.length > 0 ? (
          <section className="mt-5 border-l-2 border-red-500/30 pl-4">
            <h4 className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">Habilidades</h4>
            <ul className="space-y-1">
              {item.habilidades.map((hab: any, idx) => (
                <li key={idx} className="text-sm leading-6 text-gray-300">
                  {typeof hab === 'string' ? hab : <span><strong className="text-white">{hab.nome}</strong>: {hab.detalhe}</span>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {item.ataques && item.ataques.length > 0 ? (
          <section className="mt-5 border-l-2 border-red-500/30 pl-4">
            <h4 className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">Ataques</h4>
            <ul className="space-y-1">
              {item.ataques.map((ataque: any, idx) => (
                <li key={idx} className="text-sm leading-6 text-gray-300">
                  {typeof ataque === 'string' ? ataque : <span><strong className="text-white">{ataque.nome}</strong>: {ataque.detalhe}</span>}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {item.pericias && item.pericias.length > 0 ? (
          <section className="mt-5 border-l-2 border-red-500/30 pl-4">
            <h4 className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">Perícias</h4>
            <p className="text-sm leading-6 text-gray-300">{item.pericias.join(' · ')}</p>
          </section>
        ) : null}
      </div>
    </article>
  );
};

const BestiarioListItem = memo(({ active, item, onSelect }: { active: boolean; item: MonstroEntry; onSelect: (id: string) => void }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-pressed={active}
      className="content-auto-list-item group flex w-full items-center gap-3 border-b border-white/5 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
      style={{ backgroundColor: active ? 'rgba(239, 68, 68, 0.1)' : undefined }}
    >
      <span
        className="h-8 w-1 shrink-0 rounded-full transition-opacity bg-red-400"
        style={{ opacity: active ? 1 : 0.35, boxShadow: active ? '0 0 12px rgba(239, 68, 68, 0.5)' : undefined }}
      />
      <span className="min-w-0 flex-1">
        <strong className={`block truncate text-sm ${active ? 'text-red-400' : 'text-gray-300 group-hover:text-white'}`}>{item.titulo}</strong>
        <small className="mt-1 block truncate text-[10px] uppercase tracking-wider text-gray-600">
          Nível {item.nivel} · {item.categoria}
        </small>
      </span>
      <ChevronRight size={15} className={active ? 'text-red-400' : 'text-gray-700 group-hover:text-gray-400'} />
    </button>
  );
});

export const CatalogoBestiario = () => {
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState('');
  const [detalheMovelAberto, setDetalheMovelAberto] = useState(false);
  useDialogAccessibility({
    open: detalheMovelAberto,
    dialogRef: mobileDialogRef,
    initialFocusRef: mobileCloseRef,
    onClose: () => setDetalheMovelAberto(false),
  });
  const buscaAdiada = useDeferredValue(busca.trim().toLocaleLowerCase('pt-BR'));

  const itensVisiveis = useMemo(() => BESTIARIO_COMPLETO.filter((item) => {
    if (!buscaAdiada) return true;
    const texto = [
      item.titulo,
      item.categoria,
      item.descricao,
      ...(item.habilidades || []),
      ...(item.ataques || [])
    ].join(' ').toLocaleLowerCase('pt-BR');
    return texto.includes(buscaAdiada);
  }), [buscaAdiada]);

  const selecionado = itensVisiveis.find((item) => item.id === selecionadoId) || itensVisiveis[0] || null;

  useEffect(() => {
    if (!detalheMovelAberto) return undefined;
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetalheMovelAberto(false);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [detalheMovelAberto]);

  const selecionar = useCallback((id: string) => {
    setSelecionadoId(id);
    setDetalheMovelAberto(true);
  }, []);

  return (
    <section className="mt-16 border-t border-[#c7a44c]/20 pt-10" aria-labelledby="catalogo-bestiario-titulo">
      <header className="mb-7">
        <span className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#c7a44c]">
          <BookMarked size={15} /> Compêndio
        </span>
        <h2 id="catalogo-bestiario-titulo" className="text-3xl font-bold text-[#f2ead7] sm:text-4xl" style={{ fontFamily: 'Cinzel, serif' }}>Criaturas Registradas</h2>
        <p className="mt-3 max-w-[72ch] text-sm leading-7 text-gray-500">
          Consulta rápida aos monstros, mercenários e invocações já catalogados.
        </p>
      </header>

      <div className="sticky top-0 z-30 -mx-2 mb-5 border-y border-white/10 bg-[#111017]/95 px-2 py-3 shadow-xl backdrop-blur-xl">
        <div className="mt-2 grid gap-2 sm:grid-cols-1">
          <label className="relative block">
            <span className="sr-only">Buscar no bestiário</span>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar criatura, habilidade ou efeito..."
              className="w-full rounded-lg border border-white/10 bg-black/25 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-red-400/40"
            />
          </label>
        </div>
        <p className="mt-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-700">{itensVisiveis.length} resultado(s)</p>
      </div>

      {itensVisiveis.length && selecionado ? (
        <div className="grid items-start gap-5 md:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
            <div className="custom-scrollbar md:max-h-[min(66dvh,680px)] md:overflow-y-auto">
              {itensVisiveis.map((item) => (
                <BestiarioListItem key={item.id} item={item} active={selecionado.id === item.id} onSelect={selecionar} />
              ))}
            </div>
          </div>
          <div className="hidden md:block"><BestiarioDetail item={selecionado} /></div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <Sparkles className="mx-auto mb-3 text-gray-700" size={32} />
          <p className="text-sm text-gray-500">Nenhuma criatura encontrada com estes filtros.</p>
        </div>
      )}

      {detalheMovelAberto && selecionado ? createPortal(
        <div ref={mobileDialogRef} className="modal-viewport fixed inset-0 z-[100] flex items-end bg-black/80 backdrop-blur-sm md:hidden" role="dialog" aria-modal="true" aria-labelledby="detalhe-bestiario-titulo">
          <button type="button" aria-label="Fechar detalhes" onClick={() => setDetalheMovelAberto(false)} className="absolute inset-0" />
          <div className="modal-surface custom-scrollbar relative z-10 w-full overflow-y-auto rounded-2xl">
            <button ref={mobileCloseRef} type="button" onClick={() => setDetalheMovelAberto(false)} aria-label="Fechar detalhes" className="absolute right-4 top-4 z-20 flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-black/50 text-gray-300"><X size={17} /></button>
            <div id="detalhe-bestiario-titulo" className="sr-only">Detalhes de {selecionado.titulo}</div>
            <BestiarioDetail item={selecionado} compacto />
          </div>
        </div>,
        document.body,
      ) : null}
    </section>
  );
};
