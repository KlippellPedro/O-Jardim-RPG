import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Plus, RefreshCw, Search, Skull, Sparkles, X } from 'lucide-react';
import { sessaoApi, type BestiarioMonstro } from '../../../services/sessaoApi';

interface BestiarioPickerProps {
  campanhaId: string;
  onCancel: () => void;
  onPick: (monstro: BestiarioMonstro) => Promise<void>;
}

const ORDEM_CATEGORIAS = [
  'Humanoide', 'Animal', 'Monstro', 'Morto-Vivo', 'Elemental',
  'Constructo', 'Espírito', 'Aberração', 'Lendário',
];

export const BestiarioPicker: React.FC<BestiarioPickerProps> = ({ campanhaId, onCancel, onPick }) => {
  const [monstros, setMonstros] = useState<BestiarioMonstro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [aba, setAba] = useState<'criaturas' | 'universais'>('criaturas');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setLoading(true);
    sessaoApi.listarBestiario(campanhaId)
      .then((response) => {
        if (!cancelado) setMonstros(response?.monstros ?? []);
      })
      .catch(() => {
        if (!cancelado) setError('Não foi possível carregar o Bestiário.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => { cancelado = true; };
  }, [campanhaId]);

  const criaturas = useMemo(() => monstros.filter((m) => m.categoria !== 'Universal'), [monstros]);
  const universais = useMemo(
    () => monstros.filter((m) => m.categoria === 'Universal').sort((a, b) => (a.vd ?? 0) - (b.vd ?? 0)),
    [monstros],
  );

  const categoriasDisponiveis = useMemo(() => {
    const presentes = new Set(criaturas.map((m) => m.categoria).filter((c): c is string => !!c));
    return ORDEM_CATEGORIAS.filter((categoria) => presentes.has(categoria));
  }, [criaturas]);

  const filtrados = useMemo(() => {
    const base = aba === 'universais' ? universais : criaturas;
    const porCategoria = aba === 'criaturas' && categoriaFiltro
      ? base.filter((m) => m.categoria === categoriaFiltro)
      : base;
    const termo = search.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return porCategoria;
    return porCategoria.filter((monstro) => monstro.titulo.toLocaleLowerCase('pt-BR').includes(termo));
  }, [aba, criaturas, universais, categoriaFiltro, search]);

  const handlePick = async (monstro: BestiarioMonstro) => {
    if (busy) return;
    setBusy(monstro.id);
    try {
      await onPick(monstro);
    } finally {
      setBusy(null);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bestiario-picker-title"
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 12 }}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0c12] shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] p-4">
          <h3 id="bestiario-picker-title" className="flex items-center gap-2 text-base font-semibold text-white">
            <Skull size={17} className="text-[#c7a44c]" /> Bestiário
          </h3>
          <button type="button" onClick={onCancel} className="rounded-md p-1.5 text-white/40 hover:bg-white/5 hover:text-white" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="flex border-b border-white/[0.08] px-3 pt-2">
          {(['criaturas', 'universais'] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setAba(valor)}
              className={`border-b-2 px-3 pb-2 text-xs font-semibold uppercase tracking-wider ${
                aba === valor ? 'border-[#c7a44c] text-[#e3c363]' : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              {valor === 'criaturas' ? `Criaturas (${criaturas.length})` : `Universais (${universais.length})`}
            </button>
          ))}
        </div>

        <div className="border-b border-white/[0.08] p-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar criatura..."
              autoFocus
              className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-8 pr-3 text-sm text-white outline-none focus:border-[#c7a44c]/50"
            />
          </div>
          {aba === 'criaturas' && categoriasDisponiveis.length ? (
            <div className="custom-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoriaFiltro(null)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  categoriaFiltro === null
                    ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e7c76f]'
                    : 'border-white/10 text-white/45 hover:border-white/20 hover:text-white/70'
                }`}
              >
                Todas
              </button>
              {categoriasDisponiveis.map((categoria) => (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => setCategoriaFiltro(categoria)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    categoriaFiltro === categoria
                      ? 'border-[#c7a44c]/50 bg-[#c7a44c]/15 text-[#e7c76f]'
                      : 'border-white/10 text-white/45 hover:border-white/20 hover:text-white/70'
                  }`}
                >
                  {categoria}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          {aba === 'universais' ? (
            <p className="mb-3 flex items-start gap-1.5 text-[11px] text-white/40">
              <Sparkles size={13} className="mt-0.5 shrink-0 text-[#c7a44c]/70" />
              Modelos prontos pra reskinar na hora: adicione e depois troque o nome, uma perícia ou um traço no editor (ícone de lápis).
            </p>
          ) : null}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-white/40">
              <RefreshCw className="mr-2 animate-spin" size={15} /> Carregando o Bestiário…
            </div>
          ) : error ? (
            <p className="rounded-md bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p>
          ) : filtrados.length === 0 ? (
            <p className="py-8 text-center text-sm text-white/35">Nenhuma criatura encontrada.</p>
          ) : (
            <div className="space-y-2">
              {filtrados.map((monstro) => (
                <div key={monstro.id} className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-semibold text-white/90">{monstro.titulo}</h4>
                      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/35">
                        {monstro.classe ?? 'Criatura'}{monstro.nivel != null ? ` · Nível ${monstro.nivel}` : ''}
                        {monstro.vd != null ? ` · VD ${monstro.vd} · ${monstro.xp} XP` : ''}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-white/55">
                        {monstro.pv != null ? <span>{monstro.pv} PV</span> : null}
                        {monstro.defesa != null ? <span>Defesa {monstro.defesa}</span> : null}
                        {monstro.mana != null ? <span>{monstro.mana} Mana</span> : null}
                        {monstro.iniciativa != null ? <span>Iniciativa {monstro.iniciativa}</span> : null}
                      </p>
                      {monstro.descricao ? (
                        <p className="mt-1.5 line-clamp-2 text-xs text-white/45">{monstro.descricao}</p>
                      ) : null}
                      {monstro.ataques.length ? (
                        <p className="mt-1 text-[11px] text-white/40">
                          {monstro.ataques.map((ataque) => ataque.nome).join(' · ')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePick(monstro)}
                      disabled={busy === monstro.id}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-[#c7a44c]/30 px-2.5 py-1.5 text-xs font-medium text-[#e3c363] hover:bg-[#c7a44c]/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy === monstro.id ? <RefreshCw className="animate-spin" size={13} /> : <Plus size={13} />} Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};
