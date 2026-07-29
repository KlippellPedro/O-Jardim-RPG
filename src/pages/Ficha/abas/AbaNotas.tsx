import { useState } from 'react';
import { BookOpen, Search, Star, Pencil, Trash2, Copy, FileText, LayoutList } from 'lucide-react';
import { motion } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';

interface INotaTopico {
  id: string;
  titulo: string;
  conteudo: string;
}

interface INota {
  id: string;
  titulo: string;
  categoria: string;
  conteudo: string;
  favorito: boolean;
  topicos: INotaTopico[];
  criadoEm: number;
  atualizadoEm: number;
}

const gerarId = () => `nota-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

const NOTA_VAZIA: Omit<INota, 'id' | 'criadoEm' | 'atualizadoEm'> = {
  titulo: '',
  categoria: 'Geral',
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
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [apenasFavoritas, setApenasFavoritas] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [leituraAberta, setLeituraAberta] = useState<INota | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof NOTA_VAZIA>(NOTA_VAZIA);

  const notas: INota[] = character.ficha?.notas || character.notas || [];
  
  // Categorias únicas
  const categorias = Array.from(new Set(notas.map(n => n.categoria || 'Geral'))).sort((a, b) => a.localeCompare(b));

  const notasVisiveis = notas.filter(nota => {
    const texto = `${nota.titulo} ${nota.categoria} ${nota.conteudo} ${nota.topicos?.map(t => `${t.titulo} ${t.conteudo}`).join(' ')}`.toLowerCase();
    const termo = busca.toLowerCase();
    return (!termo || texto.includes(termo)) &&
           (!filtroCategoria || nota.categoria === filtroCategoria) &&
           (!apenasFavoritas || nota.favorito);
  }).sort((a, b) => {
    if (a.favorito !== b.favorito) return a.favorito ? -1 : 1;
    return (b.atualizadoEm || b.criadoEm || 0) - (a.atualizadoEm || a.criadoEm || 0);
  });

  const commit = (novaLista: INota[]) => {
    onUpdate(['ficha', 'notas'], novaLista);
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(NOTA_VAZIA);
    setModalAberto(true);
    setLeituraAberta(null);
  };

  const abrirEdicao = (nota: INota) => {
    setEditandoId(nota.id);
    setForm({
      titulo: nota.titulo,
      categoria: nota.categoria || 'Geral',
      conteudo: nota.conteudo,
      favorito: nota.favorito,
      topicos: nota.topicos || [],
    });
    setModalAberto(true);
    setLeituraAberta(null);
  };

  const handleSalvar = () => {
    if (!form.titulo.trim()) return;
    
    const agora = Date.now();
    const notaNormalizada: INota = {
      id: editandoId || gerarId(),
      titulo: form.titulo.trim(),
      categoria: form.categoria.trim() || 'Geral',
      conteudo: form.conteudo.trim(),
      favorito: form.favorito,
      topicos: form.topicos.map(t => ({ ...t, titulo: t.titulo.trim(), conteudo: t.conteudo.trim() })),
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

  const handleExcluir = (id: string, titulo: string) => {
    if (window.confirm(`Apagar a nota "${titulo}"?`)) {
      commit(notas.filter(n => n.id !== id));
      setLeituraAberta(null);
    }
  };

  const alternarFavorito = (nota: INota) => {
    commit(notas.map(n => n.id === nota.id ? { ...n, favorito: !n.favorito, atualizadoEm: Date.now() } : n));
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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar título, categoria, texto..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <select 
          value={filtroCategoria} 
          onChange={e => setFiltroCategoria(e.target.value)}
          className="bg-[#0f0e15] border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-300 outline-none focus:border-[#c7a44c]/50 appearance-none min-w-[200px]"
        >
          <option value="">Todas as categorias</option>
          {categorias.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <button
          onClick={() => setApenasFavoritas(!apenasFavoritas)}
          className={`px-4 py-3 rounded-xl border font-bold text-sm transition-colors flex items-center gap-2 ${
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notasVisiveis.map(nota => (
          <motion.div
            layout
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            key={nota.id}
            className={`bg-[#121118] border rounded-xl p-5 flex flex-col gap-3 transition-colors group relative ${
              nota.favorito ? 'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]' : 'border-white/5 hover:border-[#c7a44c]/30'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className={`text-[10px] uppercase tracking-widest font-bold mb-2 block w-max px-2 py-0.5 rounded border ${getCategoryColor(nota.categoria)}`}>
                  {nota.categoria || 'Geral'}
                </span>
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
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => abrirEdicao(nota)} className="w-7 h-7 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-white flex items-center justify-center">
                  <Pencil size={12} />
                </button>
                <button onClick={() => duplicar(nota)} className="w-7 h-7 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-white flex items-center justify-center">
                  <Copy size={12} />
                </button>
                <button onClick={() => handleExcluir(nota.id, nota.titulo)} className="w-7 h-7 rounded bg-black/40 border border-white/5 text-gray-400 hover:text-red-400 flex items-center justify-center">
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
          </div>
        )}
      </div>

      {/* MODAL DE LEITURA */}
      <FichaModal isOpen={!!leituraAberta} onClose={() => setLeituraAberta(null)} title={leituraAberta?.titulo || ''}>
        {leituraAberta && (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4 text-xs font-mono text-gray-500 border-b border-white/5 pb-4">
              <span>CATEGORIA: <span className="text-[#c7a44c]">{leituraAberta.categoria || 'Geral'}</span></span>
              <span>ATUALIZADA: <span className="text-white">{formatDate(leituraAberta.atualizadoEm || leituraAberta.criadoEm)}</span></span>
            </div>
            
            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
              {leituraAberta.conteudo || <span className="italic opacity-50">Sem anotações principais.</span>}
            </div>

            {leituraAberta.topicos && leituraAberta.topicos.length > 0 && (
              <div className="mt-4 flex flex-col gap-4 border-t border-white/5 pt-6">
                <h4 className="text-white font-bold tracking-widest uppercase text-xs flex items-center gap-2">
                  <LayoutList size={14} className="text-[#c7a44c]" /> Tópicos Extras
                </h4>
                {leituraAberta.topicos.map(t => (
                  <div key={t.id} className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <h5 className="text-white font-bold mb-2">{t.titulo || 'Tópico sem título'}</h5>
                    <p className="text-sm text-gray-400 whitespace-pre-wrap">{t.conteudo || 'Sem conteúdo.'}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
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
      <FichaModal isOpen={modalAberto} onClose={() => setModalAberto(false)} title={editandoId ? 'Editar Nota' : 'Nova Nota'}>
        <div className="flex flex-col gap-4">
          <LabeledInput label="Título da Nota" value={form.titulo} placeholder="Ex.: A chave da torre" onChange={(v: string) => setForm({...form, titulo: v})} />
          <LabeledInput label="Categoria / Etiqueta" value={form.categoria} placeholder="Ex.: Sessão, NPC, Pista..." onChange={(v: string) => setForm({...form, categoria: v})} />
          
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={form.favorito} onChange={e => setForm({...form, favorito: e.target.checked})} className="w-4 h-4 accent-yellow-500" />
            <span className="text-sm text-gray-300">Marcar como favorita</span>
          </label>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Anotações Principais</label>
            <textarea
              value={form.conteudo}
              onChange={e => setForm({...form, conteudo: e.target.value})}
              placeholder="Escreva aqui os detalhes importantes..."
              rows={8}
              className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors resize-y custom-scrollbar"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="text-white font-bold tracking-widest uppercase text-xs">Tópicos Extras</h4>
                <p className="text-xs text-gray-500">Separe informações específicas.</p>
              </div>
              <button 
                onClick={() => setForm({...form, topicos: [...form.topicos, { id: gerarId(), titulo: '', conteudo: '' }]})}
                className="px-3 py-1.5 rounded border border-white/10 text-gray-300 hover:text-white hover:border-white/30 text-[10px] uppercase tracking-wider font-bold transition-colors"
              >
                + Adicionar Tópico
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              {form.topicos.map((topico, index) => (
                <div key={topico.id} className="bg-black/20 rounded-xl p-3 border border-white/5 flex flex-col gap-2 relative group">
                  <button 
                    onClick={() => setForm({...form, topicos: form.topicos.filter(t => t.id !== topico.id)})}
                    className="absolute top-3 right-3 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                  <LabeledInput label={`Título do Tópico ${index + 1}`} value={topico.titulo} placeholder="Ex.: A porta secreta" onChange={(v: string) => {
                    const novos = [...form.topicos];
                    novos[index].titulo = v;
                    setForm({...form, topicos: novos});
                  }} />
                  <textarea
                    value={topico.conteudo}
                    onChange={e => {
                      const novos = [...form.topicos];
                      novos[index].conteudo = e.target.value;
                      setForm({...form, topicos: novos});
                    }}
                    placeholder="Detalhes deste tópico..."
                    rows={3}
                    className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors resize-y custom-scrollbar"
                  />
                </div>
              ))}
              {form.topicos.length === 0 && (
                <div className="text-center py-4 border border-white/5 border-dashed rounded-xl">
                  <p className="text-xs text-gray-500">Nenhum tópico extra adicionado.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/5 mt-2">
            <button onClick={() => setModalAberto(false)} className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleSalvar} 
              disabled={!form.titulo.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 text-sm font-bold transition-colors disabled:opacity-40"
            >
              {editandoId ? 'Salvar Alterações' : 'Salvar no Diário'}
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};

