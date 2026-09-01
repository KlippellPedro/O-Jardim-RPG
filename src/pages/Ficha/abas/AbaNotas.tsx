import { useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Search, Star, Pencil, Trash2, Copy, FileText, LayoutList, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { Select } from '../../../components/ui/Select';
import {
  LIMITE_ETIQUETAS_NOTA,
  normalizarEtiquetas,
  obterEtiquetasNota,
  separarEtiquetasDigitadas,
} from '../../../services/notasFichaService';

interface INotaTopico {
  id: string;
  titulo: string;
  conteudo: string;
}

interface INota {
  id: string;
  titulo: string;
  /** Mantido para compatibilidade com notas criadas antes das etiquetas múltiplas. */
  categoria?: string;
  etiquetas?: string[];
  conteudo: string;
  favorito: boolean;
  topicos: INotaTopico[];
  criadoEm: number;
  atualizadoEm: number;
}

const gerarId = () => `nota-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

interface INotaForm {
  titulo: string;
  etiquetas: string[];
  conteudo: string;
  favorito: boolean;
  topicos: INotaTopico[];
}

const NOTA_VAZIA: INotaForm = {
  titulo: '',
  etiquetas: [],
  conteudo: '',
  favorito: false,
  topicos: [],
};

const HASH_COLORS = [
  'bg-blue-500/10 border-blue-500/30 text-blue-400',
  'bg-purple-500/10 border-purple-500/30 text-purple-400',
  'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  'bg-rose-500/10 border-rose-500/30 text-rose-400',
  'bg-amber-500/10 border-amber-500/30 text-amber-400',
  'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400',
  'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
];

function getCategoryColor(category: string): string {
  if (!category || category === 'Geral') return 'bg-gray-500/10 border-gray-500/30 text-gray-400';
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return HASH_COLORS[Math.abs(hash) % HASH_COLORS.length];
}

export const AbaNotas = ({ character, onUpdate }: { character: any, onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('');
  const [apenasFavoritas, setApenasFavoritas] = useState(false);
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [modalAberto, setModalAberto] = useState(false);
  const [leituraAberta, setLeituraAberta] = useState<INota | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof NOTA_VAZIA>(NOTA_VAZIA);
  const [novaEtiqueta, setNovaEtiqueta] = useState('');
  const [textoCopiadoId, setTextoCopiadoId] = useState<string | null>(null);

  const notas: INota[] = character.ficha?.notas || character.notas || [];
  
  const etiquetasDisponiveis = Array.from(new Set(notas.flatMap(obterEtiquetasNota)))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const notasVisiveis = notas.filter(nota => {
    const etiquetas = obterEtiquetasNota(nota);
    const texto = `${nota.titulo} ${etiquetas.join(' ')} ${nota.conteudo} ${nota.topicos?.map(t => `${t.titulo} ${t.conteudo}`).join(' ')}`.toLowerCase();
    const termo = busca.toLowerCase();
    return (!termo || texto.includes(termo)) &&
           (!filtroEtiqueta || etiquetas.some(etiqueta => etiqueta.toLocaleLowerCase('pt-BR') === filtroEtiqueta.toLocaleLowerCase('pt-BR'))) &&
           (!apenasFavoritas || nota.favorito);
  }).sort((a, b) => {
    if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
    if (ordenacao === 'titulo') return a.titulo.localeCompare(b.titulo, 'pt-BR');
    const diferencaData = (b.atualizadoEm || b.criadoEm || 0) - (a.atualizadoEm || a.criadoEm || 0);
    return ordenacao === 'antigas' ? -diferencaData : diferencaData;
  });

  const commit = (novaLista: INota[]) => {
    onUpdate(['ficha', 'notas'], novaLista);
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm({ ...NOTA_VAZIA, etiquetas: [], topicos: [] });
    setNovaEtiqueta('');
    setModalAberto(true);
    setLeituraAberta(null);
  };

  const abrirEdicao = (nota: INota) => {
    setEditandoId(nota.id);
    // obterEtiquetasNota devolve ['Geral'] tanto para o placeholder de nota
    // sem etiqueta quanto para uma etiqueta "Geral" digitada de verdade; só
    // descarta o placeholder quando a nota realmente não tem etiquetas.
    const etiquetasReais = normalizarEtiquetas(nota.etiquetas);
    setForm({
      titulo: nota.titulo,
      etiquetas: etiquetasReais.length ? etiquetasReais : obterEtiquetasNota(nota).filter(etiqueta => etiqueta !== 'Geral'),
      conteudo: nota.conteudo,
      favorito: nota.favorito,
      topicos: nota.topicos || [],
    });
    setNovaEtiqueta('');
    setModalAberto(true);
    setLeituraAberta(null);
  };

  const handleSalvar = () => {
    if (!form.titulo.trim()) return;

    const agora = Date.now();
    const etiquetas = normalizarEtiquetas([...form.etiquetas, ...separarEtiquetasDigitadas(novaEtiqueta)]);
    const notaNormalizada: INota = {
      id: editandoId || gerarId(),
      titulo: form.titulo.trim(),
      categoria: etiquetas[0] || 'Geral',
      etiquetas,
      conteudo: form.conteudo.trim(),
      favorito: form.favorito,
      topicos: form.topicos
        .map(t => ({ ...t, titulo: t.titulo.trim(), conteudo: t.conteudo.trim() }))
        .filter(t => t.titulo || t.conteudo),
      criadoEm: editandoId ? (notas.find(n => n.id === editandoId)?.criadoEm || agora) : agora,
      atualizadoEm: agora
    };

    if (editandoId) {
      commit(notas.map(n => n.id === editandoId ? notaNormalizada : n));
    } else {
      commit([...notas, notaNormalizada]);
    }
    setModalAberto(false);
  };

  const adicionarEtiquetas = (valor = novaEtiqueta) => {
    const candidatas = separarEtiquetasDigitadas(valor);
    if (!candidatas.length) return;
    setForm(atual => ({ ...atual, etiquetas: normalizarEtiquetas([...atual.etiquetas, ...candidatas]) }));
    setNovaEtiqueta('');
  };

  const removerEtiqueta = (etiqueta: string) => {
    setForm(atual => ({ ...atual, etiquetas: atual.etiquetas.filter(item => item !== etiqueta) }));
  };

  const moverTopico = (index: number, direcao: -1 | 1) => {
    const destino = index + direcao;
    if (destino < 0 || destino >= form.topicos.length) return;
    const topicos = [...form.topicos];
    [topicos[index], topicos[destino]] = [topicos[destino], topicos[index]];
    setForm({ ...form, topicos });
  };

  const copiarTextoNota = async (nota: INota) => {
    const texto = [
      nota.titulo,
      obterEtiquetasNota(nota).map(etiqueta => `#${etiqueta}`).join(' '),
      nota.conteudo,
      ...(nota.topicos || []).flatMap(topico => [topico.titulo, topico.conteudo]),
    ].filter(Boolean).join('\n\n');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Área de transferência indisponível.');
      await navigator.clipboard.writeText(texto);
      setTextoCopiadoId(nota.id);
      window.setTimeout(() => setTextoCopiadoId(atual => atual === nota.id ? null : atual), 1600);
    } catch {
      window.alert('Não foi possível copiar esta nota neste navegador.');
    }
  };

  const handleExcluir = (id: string, titulo: string) => {
    if (window.confirm(`Apagar a nota "${titulo}"?`)) {
      commit(notas.filter(n => n.id !== id));
      setLeituraAberta(null);
    }
  };

  const alternarFavorito = (nota: INota) => {
    const atualizada = { ...nota, favorito: !nota.favorito, atualizadoEm: Date.now() };
    commit(notas.map(n => n.id === nota.id ? atualizada : n));
    setLeituraAberta(atual => atual?.id === nota.id ? atualizada : atual);
  };

  const duplicar = (nota: INota) => {
    const agora = Date.now();
    const copia: INota = {
      ...nota,
      id: gerarId(),
      titulo: `${nota.titulo} (cópia)`,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    commit([...notas, copia]);
    setLeituraAberta(null);
  };

  const formatDate = (ts: number) => {
    if (!ts) return 'Sem data';
    return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const etiquetasSugeridas = etiquetasDisponiveis
    .filter(etiqueta => !form.etiquetas.some(atual => atual.toLocaleLowerCase('pt-BR') === etiqueta.toLocaleLowerCase('pt-BR')))
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" data-tour="notas-resumo">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Diário e Notas</h2>
          <p className="text-gray-400 text-sm">Organize pistas, pessoas, lugares e acontecimentos.</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
            <span className="text-3xl font-bold text-[#c7a44c]">{notas.length}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight">Notas<br/>Salvas</span>
          </div>
          <button 
            onClick={abrirNovo}
            className="px-6 py-3 rounded-xl bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] font-bold text-sm hover:bg-[#c7a44c]/20 transition-colors"
          >
            + Nova Nota
          </button>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(10rem,auto))]" data-tour="notas-filtros">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar título, etiqueta, texto ou tópico..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <Select
          ariaLabel="Filtrar notas por etiqueta"
          value={filtroEtiqueta}
          onChange={setFiltroEtiqueta}
          options={[
            { value: '', label: 'Todas as etiquetas' },
            ...etiquetasDisponiveis.map((etiqueta) => ({ value: etiqueta, label: etiqueta, labelClassName: getCategoryColor(etiqueta).split(' ').find(classe => classe.startsWith('text-')) })),
          ]}
          className="w-full bg-[#0f0e15] border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300 xl:min-w-[11rem]"
        />
        <Select
          ariaLabel="Ordenar notas"
          value={ordenacao}
          onChange={setOrdenacao}
          options={[
            { value: 'recentes', label: 'Mais recentes' },
            { value: 'antigas', label: 'Mais antigas' },
            { value: 'titulo', label: 'Título de A a Z' },
          ]}
          className="w-full bg-[#0f0e15] border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300 xl:min-w-[10rem]"
        />
        <button
          onClick={() => setApenasFavoritas(!apenasFavoritas)}
          className={`min-h-11 justify-center px-4 py-3 rounded-xl border font-bold text-sm transition-colors flex items-center gap-2 ${
            apenasFavoritas 
              ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' 
              : 'bg-[#0f0e15] border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Star size={16} fill={apenasFavoritas ? "currentColor" : "none"} />
          Favoritas
        </button>
      </div>

      {/* GRADE DE NOTAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-tour="notas-lista">
        {notasVisiveis.map(nota => (
          <motion.div
            layout
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            key={nota.id}
            data-tour="nota-cartao"
            className={`bg-[#121118] border rounded-xl p-5 flex flex-col gap-3 transition-colors group relative ${
              nota.favorito ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]' : 'border-white/5 hover:border-[#c7a44c]/30'
            }`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex min-h-5 flex-wrap gap-1.5">
                  {obterEtiquetasNota(nota).slice(0, 3).map(etiqueta => (
                    <span key={etiqueta} className={`block max-w-[9rem] truncate rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getCategoryColor(etiqueta)}`}>
                      {etiqueta}
                    </span>
                  ))}
                  {obterEtiquetasNota(nota).length > 3 ? (
                    <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-bold text-gray-500">
                      +{obterEtiquetasNota(nota).length - 3}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-bold text-white line-clamp-1">{nota.titulo}</h3>
                <span className="text-xs text-gray-500">{formatDate(nota.atualizadoEm || nota.criadoEm)}</span>
              </div>
              <button 
                onClick={() => alternarFavorito(nota)}
                className={`p-1.5 rounded-lg transition-colors ${
                  nota.favorito ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                <Star size={18} fill={nota.favorito ? "currentColor" : "none"} />
              </button>
            </div>
            
            <p className="text-sm text-gray-400 line-clamp-3 my-2 flex-1">
              {nota.conteudo || <span className="italic opacity-50">Sem anotações principais.</span>}
            </p>

            {nota.topicos && nota.topicos.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {nota.topicos.slice(0, 3).map(t => (
                  <span key={t.id} className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 truncate max-w-[120px]">
                    {t.titulo || 'Tópico'}
                  </span>
                ))}
                {nota.topicos.length > 3 && (
                  <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-500">
                    +{nota.topicos.length - 3}
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
              <button 
                onClick={() => setLeituraAberta(nota)}
                className="text-sm text-[#c7a44c] hover:text-white font-bold transition-colors flex items-center gap-1"
              >
                <FileText size={14} /> Ler nota
              </button>
              <div className="flex gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                <button aria-label={`Editar ${nota.titulo}`} title="Editar" onClick={() => abrirEdicao(nota)} className="w-8 h-8 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-white flex items-center justify-center">
                  <Pencil size={12} />
                </button>
                <button aria-label={`Duplicar ${nota.titulo}`} title="Duplicar" onClick={() => duplicar(nota)} className="w-8 h-8 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-white flex items-center justify-center">
                  <Copy size={12} />
                </button>
                <button aria-label={`Excluir ${nota.titulo}`} title="Excluir" onClick={() => handleExcluir(nota.id, nota.titulo)} className="w-8 h-8 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-red-400 flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {notasVisiveis.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <BookOpen size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
            <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma nota encontrada</p>
            {(busca || filtroEtiqueta || apenasFavoritas) ? (
              <button
                type="button"
                onClick={() => { setBusca(''); setFiltroEtiqueta(''); setApenasFavoritas(false); }}
                className="mt-3 text-xs font-bold text-[#c7a44c] transition-colors hover:text-[#e3c46f]"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* MODAL DE LEITURA */}
      <FichaModal isOpen={!!leituraAberta} onClose={() => setLeituraAberta(null)} title={leituraAberta?.titulo || ''} eyebrow="Diário do personagem" size="lg">
        {leituraAberta && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {obterEtiquetasNota(leituraAberta).map(etiqueta => (
                  <span key={etiqueta} className={`rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${getCategoryColor(etiqueta)}`}>
                    {etiqueta}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                <span>{formatDate(leituraAberta.atualizadoEm || leituraAberta.criadoEm)}</span>
                <button
                  type="button"
                  onClick={() => alternarFavorito(leituraAberta)}
                  className={leituraAberta.favorito ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-300'}
                >
                  {leituraAberta.favorito ? 'Favorita' : 'Marcar favorita'}
                </button>
              </div>
            </div>
            
            <div className="min-h-28 rounded-xl border border-white/5 bg-[#121118] p-5 text-sm leading-7 text-gray-300 whitespace-pre-wrap">
              {leituraAberta.conteudo || <span className="italic opacity-50">Sem anotações principais.</span>}
            </div>

            {leituraAberta.topicos && leituraAberta.topicos.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-white/5 pt-6">
                <h4 className="text-white font-bold tracking-widest uppercase text-xs flex items-center gap-2">
                  <LayoutList size={14} className="text-[#c7a44c]" /> Tópicos
                </h4>
                {leituraAberta.topicos.map(t => (
                  <div key={t.id} className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h5 className="text-white font-bold mb-2">{t.titulo || 'Tópico sem título'}</h5>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{t.conteudo || 'Sem conteúdo.'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="responsive-action-row flex justify-end gap-3 pt-5 border-t border-white/5">
              <button onClick={() => copiarTextoNota(leituraAberta)} className="px-4 py-2 rounded border border-white/10 text-gray-400 hover:text-white text-xs font-bold transition-colors">
                {textoCopiadoId === leituraAberta.id ? 'Texto copiado' : 'Copiar texto'}
              </button>
              <button onClick={() => duplicar(leituraAberta)} className="px-4 py-2 rounded border border-white/10 text-gray-400 hover:text-white text-xs font-bold transition-colors">
                Duplicar
              </button>
              <button onClick={() => abrirEdicao(leituraAberta)} className="px-4 py-2 rounded bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 text-xs font-bold transition-colors">
                Editar Nota
              </button>
            </div>
          </div>
        )}
      </FichaModal>

      {/* MODAL DE EDIÇÃO */}
      <FichaModal isOpen={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar Nota' : 'Nova Nota'} eyebrow="Editor de notas" size="xl">
        <div
          className="flex flex-col gap-5"
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              handleSalvar();
            }
          }}
        >
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-white/5 bg-black/20 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
            <LabeledInput label="Título da nota" value={form.titulo} placeholder="Ex.: A chave da torre" onChange={(v: string) => setForm({...form, titulo: v})} />
            <button
              type="button"
              aria-pressed={form.favorito}
              onClick={() => setForm({ ...form, favorito: !form.favorito })}
              className={`mt-auto flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold transition-colors ${form.favorito
                ? 'border-yellow-500/35 bg-yellow-500/10 text-yellow-300'
                : 'border-white/10 bg-[#121118] text-gray-400 hover:text-white'}`}
            >
              <Star size={16} fill={form.favorito ? 'currentColor' : 'none'} />
              {form.favorito ? 'Favorita' : 'Marcar favorita'}
            </button>
          </div>

          <div className="rounded-xl border border-white/5 bg-[#121118] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Etiquetas</h4>
                <p className="mt-1 text-xs text-gray-500">Use até {LIMITE_ETIQUETAS_NOTA}. Pressione Enter ou separe várias com vírgula.</p>
              </div>
              <span className="text-[10px] font-bold text-gray-600">{form.etiquetas.length}/{LIMITE_ETIQUETAS_NOTA}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.etiquetas.map(etiqueta => (
                <span key={etiqueta} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold ${getCategoryColor(etiqueta)}`}>
                  {etiqueta}
                  <button type="button" onClick={() => removerEtiqueta(etiqueta)} aria-label={`Remover etiqueta ${etiqueta}`} className="opacity-60 hover:opacity-100">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={novaEtiqueta}
                disabled={form.etiquetas.length >= LIMITE_ETIQUETAS_NOTA}
                onChange={event => setNovaEtiqueta(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
                    event.preventDefault();
                    adicionarEtiquetas();
                  }
                }}
                onBlur={() => adicionarEtiquetas()}
                placeholder={form.etiquetas.length >= LIMITE_ETIQUETAS_NOTA ? 'Limite de etiquetas atingido' : 'Ex.: NPC, pista, sessão 12'}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-700 focus:border-[#c7a44c]/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => adicionarEtiquetas()} disabled={!novaEtiqueta.trim() || form.etiquetas.length >= LIMITE_ETIQUETAS_NOTA} className="rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-4 text-xs font-bold text-[#c7a44c] disabled:opacity-40">
                Adicionar
              </button>
            </div>
            {etiquetasSugeridas.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">Já usadas:</span>
                {etiquetasSugeridas.map(etiqueta => (
                  <button key={etiqueta} type="button" onClick={() => adicionarEtiquetas(etiqueta)} className="rounded border border-white/5 bg-white/[0.03] px-2 py-1 text-[10px] text-gray-500 transition-colors hover:border-white/15 hover:text-white">
                    {etiqueta}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Anotações principais</label>
              <span className="text-[10px] text-gray-600">{form.conteudo.length} caracteres</span>
            </div>
            <textarea
              value={form.conteudo}
              onChange={e => setForm({...form, conteudo: e.target.value})}
              placeholder="Escreva os detalhes importantes..."
              rows={10}
              className="rounded-xl border border-white/5 bg-[#121118] px-4 py-3 text-sm leading-6 text-gray-300 transition-colors resize-y custom-scrollbar focus:border-[#c7a44c]/50 focus:outline-none"
            />
          </div>

          <div className="border-t border-white/5 pt-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h4 className="text-white font-bold tracking-widest uppercase text-xs">Tópicos</h4>
                <p className="mt-1 text-xs text-gray-500">Divida listas, pistas ou informações que precisam ficar separadas.</p>
              </div>
              <button
                type="button"
                onClick={() => setForm({...form, topicos: [...form.topicos, { id: gerarId(), titulo: '', conteudo: '' }]})}
                className="rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-300 transition-colors hover:border-white/30 hover:text-white"
              >
                + Adicionar tópico
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {form.topicos.map((topico, index) => (
                <div key={topico.id} className="rounded-xl border border-white/5 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Tópico {index + 1}</span>
                    <div className="flex gap-1">
                      <button type="button" disabled={index === 0} onClick={() => moverTopico(index, -1)} aria-label={`Mover tópico ${index + 1} para cima`} className="flex h-8 w-8 items-center justify-center rounded border border-white/5 text-gray-500 hover:text-white disabled:opacity-25"><ArrowUp size={13} /></button>
                      <button type="button" disabled={index === form.topicos.length - 1} onClick={() => moverTopico(index, 1)} aria-label={`Mover tópico ${index + 1} para baixo`} className="flex h-8 w-8 items-center justify-center rounded border border-white/5 text-gray-500 hover:text-white disabled:opacity-25"><ArrowDown size={13} /></button>
                      <button type="button" onClick={() => setForm({...form, topicos: form.topicos.filter(t => t.id !== topico.id)})} aria-label={`Remover tópico ${index + 1}`} className="flex h-8 w-8 items-center justify-center rounded border border-white/5 text-gray-500 hover:text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <LabeledInput label="Título" value={topico.titulo} placeholder="Ex.: A porta secreta" onChange={(v: string) => setForm({ ...form, topicos: form.topicos.map((item, itemIndex) => itemIndex === index ? { ...item, titulo: v } : item) })} />
                    <textarea
                      value={topico.conteudo}
                      onChange={e => setForm({ ...form, topicos: form.topicos.map((item, itemIndex) => itemIndex === index ? { ...item, conteudo: e.target.value } : item) })}
                      placeholder="Detalhes deste tópico..."
                      rows={3}
                      className="rounded-lg border border-white/5 bg-[#121118] px-3 py-2 text-sm leading-6 text-gray-300 transition-colors resize-y custom-scrollbar focus:border-[#c7a44c]/50 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
              {form.topicos.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 py-6 text-center">
                  <p className="text-xs text-gray-500">Nenhum tópico. Use apenas se precisar separar informações.</p>
                </div>
              )}
            </div>
          </div>

          <div className="responsive-action-row sticky -bottom-6 z-10 -mx-4 flex justify-end gap-3 border-t border-white/5 bg-[#0c0b10]/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
            <span className="mr-auto hidden self-center text-[10px] text-gray-600 sm:block">Ctrl + Enter para salvar</span>
            <button onClick={() => setModalAberto(false)} className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={!form.titulo.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 text-sm font-bold transition-colors disabled:opacity-40"
            >
              {editandoId ? 'Salvar alterações' : 'Salvar nota'}
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};
