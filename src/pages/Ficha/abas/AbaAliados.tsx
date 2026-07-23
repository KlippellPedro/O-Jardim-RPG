import { useState } from 'react';
import { Search, Users, Heart, Shield, Footprints, Zap, Sword, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';

interface IAliado {
  id: string;
  nome: string;
  especieTipo: string;
  papel: string;
  nivel: number;
  vidaAtual: number;
  vidaMaxima: number;
  defesa: number;
  movimento: string;
  iniciativa: number;
  ataquePrincipal: string;
  condicoes: string;
  observacoes: string;
  emCena: boolean;
}

type FormAliado = Omit<IAliado, 'id'>;

const gerarIdAliado = () =>
  `aliado-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const ALIADO_VAZIO: FormAliado = {
  nome: '',
  especieTipo: '',
  papel: '',
  nivel: 1,
  vidaAtual: 10,
  vidaMaxima: 10,
  defesa: 10,
  movimento: '',
  iniciativa: 0,
  ataquePrincipal: '',
  condicoes: '',
  observacoes: '',
  emCena: true,
};

const sinal = (valor: number) => (valor >= 0 ? `+${valor}` : `${valor}`);

export const AbaAliados = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormAliado>(ALIADO_VAZIO);

  const itens: IAliado[] = character.ficha?.aliados || [];

  const itensVisiveis = itens.filter(
    (a) => !busca || a.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const emCenaCount = itens.filter((a) => a.emCena).length;

  const commit = (novaLista: IAliado[]) => {
    onUpdate(['ficha', 'aliados'], novaLista);
  };

  const setCampo = (campo: keyof FormAliado, valor: any) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  };

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(ALIADO_VAZIO);
    setModalAberto(true);
  };

  const abrirEdicao = (aliado: IAliado) => {
    setEditandoId(aliado.id);
    setForm({ ...ALIADO_VAZIO, ...aliado });
    setModalAberto(true);
  };

  const fecharModal = () => setModalAberto(false);

  const handleSalvar = () => {
    if (!form.nome?.trim()) return;

    const vidaMaxima = Math.max(1, Math.trunc(Number(form.vidaMaxima) || 1));
    const vidaAtual = Math.max(0, Math.min(vidaMaxima, Math.trunc(Number(form.vidaAtual) || 0)));

    const normalizado: IAliado = {
      id: editandoId || gerarIdAliado(),
      nome: form.nome.trim(),
      especieTipo: form.especieTipo?.trim() || '',
      papel: form.papel?.trim() || '',
      nivel: Math.max(0, Math.trunc(Number(form.nivel) || 0)),
      vidaAtual,
      vidaMaxima,
      defesa: Math.trunc(Number(form.defesa) || 0),
      movimento: form.movimento?.trim() || '',
      iniciativa: Math.trunc(Number(form.iniciativa) || 0),
      ataquePrincipal: form.ataquePrincipal?.trim() || '',
      condicoes: form.condicoes?.trim() || '',
      observacoes: form.observacoes?.trim() || '',
      emCena: !!form.emCena,
    };

    if (editandoId) {
      commit(itens.map((a) => (a.id === editandoId ? normalizado : a)));
    } else {
      commit([...itens, normalizado]);
    }
    setModalAberto(false);
  };

  const handleExcluir = (aliado: IAliado) => {
    if (!window.confirm(`Remover o aliado "${aliado.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    commit(itens.filter((a) => a.id !== aliado.id));
  };

  const handleAjustarVida = (aliado: IAliado, delta: number) => {
    const maxima = aliado.vidaMaxima || 1;
    const novaVida = Math.max(0, Math.min(maxima, (aliado.vidaAtual || 0) + delta));
    if (novaVida === aliado.vidaAtual) return;
    commit(itens.map((a) => (a.id === aliado.id ? { ...a, vidaAtual: novaVida } : a)));
  };

  const handleToggleCena = (aliado: IAliado) => {
    commit(itens.map((a) => (a.id === aliado.id ? { ...a, emCena: !a.emCena } : a)));
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Aliados</h2>
          <p className="text-gray-400 text-sm">Companheiros, familiares, montarias ou seguidores.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
            <span className="text-3xl font-bold text-[#c7a44c]">{itens.length}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight">Aliados<br />Registrados</span>
          </div>
          <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
            <span className="text-3xl font-bold text-green-500">{emCenaCount}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight">Em<br />Cena</span>
          </div>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar aliado..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirNovo}
          className="px-6 py-3 rounded-xl border border-[#c7a44c]/30 text-[#c7a44c] font-bold text-sm hover:bg-[#c7a44c]/10 transition-colors border-dashed"
        >
          + Novo Aliado
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {itensVisiveis.map((a) => {
            const percentVida = Math.min(100, Math.max(0, ((a.vidaAtual || 0) / (a.vidaMaxima || 1)) * 100));
            return (
              <motion.div
                layout
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                key={a.id}
                className="bg-[#121118] border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-[#c7a44c]/30 transition-colors group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-[#c7a44c] overflow-hidden shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1">{a.nome || 'Aliado Desconhecido'}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                          {a.especieTipo || 'Aliado'}
                        </span>
                        {a.papel && (
                          <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                            {a.papel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => abrirEdicao(a)}
                      className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 text-gray-400 hover:text-[#c7a44c] hover:border-[#c7a44c]/30 flex items-center justify-center transition-colors"
                      title="Editar aliado"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleExcluir(a)}
                      className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 text-gray-400 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors"
                      title="Remover aliado"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* VIDA */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-red-400 flex items-center gap-1">
                      <Heart size={12} /> Vida
                    </span>
                    <span className="text-xs font-mono text-gray-300">{a.vidaAtual} / {a.vidaMaxima}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <button onClick={() => handleAjustarVida(a, -5)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">-5</button>
                      <button onClick={() => handleAjustarVida(a, -1)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">-1</button>
                    </div>
                    <div className="flex-1 h-6 bg-[#0a090d] border border-white/5 rounded relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentVida}%` }}
                        className="absolute left-0 top-0 bottom-0 bg-[#8b1c2b]"
                      />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleAjustarVida(a, 1)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">+1</button>
                      <button onClick={() => handleAjustarVida(a, 5)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">+5</button>
                    </div>
                  </div>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                    <Shield size={12} className="text-gray-500" />
                    <span className="text-xs font-mono text-gray-300">{a.defesa}</span>
                  </div>
                  <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                    <Footprints size={12} className="text-gray-500" />
                    <span className="text-xs font-mono text-gray-300 truncate max-w-full" title={a.movimento || '—'}>{a.movimento || '—'}</span>
                  </div>
                  <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                    <Zap size={12} className="text-gray-500" />
                    <span className="text-xs font-mono text-gray-300">{sinal(a.iniciativa)}</span>
                  </div>
                  <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                    <span className="text-[9px] uppercase text-gray-500 font-bold">Nível</span>
                    <span className="text-xs font-mono text-gray-300">{a.nivel}</span>
                  </div>
                </div>

                {/* ATAQUE PRINCIPAL */}
                {a.ataquePrincipal && (
                  <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 rounded-lg px-3 py-2">
                    <Sword size={14} className="text-[#c7a44c] shrink-0" />
                    <span className="truncate">{a.ataquePrincipal}</span>
                  </div>
                )}

                {/* CONDIÇÕES */}
                {a.condicoes && (
                  <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{a.condicoes}</span>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                {a.observacoes && (
                  <p className="text-sm text-gray-400 line-clamp-3">{a.observacoes}</p>
                )}

                <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleToggleCena(a)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors ${
                      a.emCena
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-black/40 border-white/10 text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {a.emCena ? 'Em Cena' : 'Fora de Cena'}
                  </button>
                </div>
              </motion.div>
            );
          })}
          {itensVisiveis.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Users size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Aliado Encontrado</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRIAR / EDITAR */}
      <FichaModal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={editandoId ? `Editar — ${form.nome || 'Aliado'}` : 'Novo Aliado'}
      >
        <div className="flex flex-col gap-4">
          <LabeledInput label="Nome" value={form.nome} placeholder="Ex.: Corvo de vigília" onChange={(v: string) => setCampo('nome', v)} />

          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Espécie / Tipo" value={form.especieTipo} placeholder="Ex.: Animal, Espírito..." onChange={(v: string) => setCampo('especieTipo', v)} />
            <LabeledInput label="Papel" value={form.papel} placeholder="Ex.: Batedor, Montaria..." onChange={(v: string) => setCampo('papel', v)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <LabeledInput label="Nível" value={String(form.nivel ?? '')} onChange={(v: string) => setCampo('nivel', v)} />
            <LabeledInput label="Vida Atual" value={String(form.vidaAtual ?? '')} onChange={(v: string) => setCampo('vidaAtual', v)} />
            <LabeledInput label="Vida Máxima" value={String(form.vidaMaxima ?? '')} onChange={(v: string) => setCampo('vidaMaxima', v)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <LabeledInput label="Defesa" value={String(form.defesa ?? '')} onChange={(v: string) => setCampo('defesa', v)} />
            <LabeledInput label="Movimento" value={form.movimento} placeholder="Ex.: 9 m, voo 12 m" onChange={(v: string) => setCampo('movimento', v)} />
            <LabeledInput label="Iniciativa" value={String(form.iniciativa ?? '')} onChange={(v: string) => setCampo('iniciativa', v)} />
          </div>

          <LabeledInput label="Ataque Principal" value={form.ataquePrincipal} placeholder="Ex.: Mordida +4, 1d8+2" onChange={(v: string) => setCampo('ataquePrincipal', v)} />
          <LabeledInput label="Condições" value={form.condicoes} placeholder="Ex.: Envenenado, oculto..." onChange={(v: string) => setCampo('condicoes', v)} />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Observações</label>
            <textarea
              value={form.observacoes || ''}
              onChange={e => setCampo('observacoes', e.target.value)}
              placeholder="Personalidade, vínculo, ordens e outras informações..."
              rows={4}
              className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!form.emCena}
              onChange={e => setCampo('emCena', e.target.checked)}
              className="w-4 h-4 accent-[#c7a44c]"
            />
            <span className="text-sm text-gray-300">Este aliado está em cena</span>
          </label>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
            <button
              onClick={fecharModal}
              className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={!form.nome?.trim()}
              className="px-5 py-2.5 rounded-lg bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {editandoId ? 'Salvar Alterações' : 'Adicionar Aliado'}
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};
