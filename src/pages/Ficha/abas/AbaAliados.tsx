import { useState } from 'react';
import { Search, Users, Heart, Shield, Footprints, Zap, Sword, Pencil, Trash2, AlertTriangle, Link, GripVertical, Star } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { bonusIniciativaFicha, obterStatusFicha, penalidadeCansacoIniciativa, penalidadeIniciativaCondicoes } from '../../../services/statusService';

interface IAliado {
  id: string;
  nome: string;
  categoria: 'comum' | 'complexo';
  personagemId?: string; // Para aliado complexo
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
  ordem?: number;
  favorito?: boolean;
}

type FormAliado = Omit<IAliado, 'id'>;

const gerarIdAliado = () =>
  `aliado-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const ALIADO_VAZIO: FormAliado = {
  nome: '',
  categoria: 'comum',
  personagemId: '',
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
  ordem: 0,
  favorito: false,
};

const sinal = (valor: number) => (valor >= 0 ? `+${valor}` : `${valor}`);

export const AbaAliados = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormAliado>(ALIADO_VAZIO);

  const personagens = useCharacterStore((s) => s.characters);

  const itens: IAliado[] = character.ficha?.aliados || [];

  const itensVisiveis = itens
    .filter((a) => !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const emCenaCount = itens.filter((a) => a.emCena).length;

  const commit = (novaLista: IAliado[]) => {
    onUpdate(['ficha', 'aliados'], novaLista);
  };

  const handleReorder = (novosItens: IAliado[]) => {
    const comOrdem = novosItens.map((item, index) => ({ ...item, ordem: index }));
    commit(comOrdem);
  };

  const toggleFavorito = (id: string) => {
    let modificada = itens.map(a => a.id === id ? { ...a, favorito: !a.favorito } : a);
    const itemTarget = modificada.find(a => a.id === id);
    if (itemTarget && itemTarget.favorito) {
      modificada = [itemTarget, ...modificada.filter(a => a.id !== id)];
    }
    const comOrdem = modificada.map((item, index) => ({ ...item, ordem: index }));
    commit(comOrdem);
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
    if (!form.nome?.trim() && form.categoria !== 'complexo') return;
    if (form.categoria === 'complexo' && !form.personagemId) return;

    const vinculado = form.categoria === 'complexo' ? personagens.find(p => p.id === form.personagemId) : null;
    const nomeFinal = form.categoria === 'complexo' ? (vinculado?.nome || 'Personagem Desconhecido') : form.nome.trim();

    const vidaMaxima = Math.max(1, Math.trunc(Number(form.vidaMaxima) || 1));
    const vidaAtual = Math.max(0, Math.min(vidaMaxima, Math.trunc(Number(form.vidaAtual) || 0)));

    const normalizado: IAliado = {
      id: editandoId || gerarIdAliado(),
      nome: nomeFinal,
      categoria: form.categoria,
      personagemId: form.categoria === 'complexo' ? form.personagemId : undefined,
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
    if (aliado.categoria === 'complexo') {
      alert("A vida de aliados complexos é sincronizada com a ficha deles. Modifique na ficha original.");
      return;
    }
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
        <Reorder.Group axis="y" values={itensVisiveis} onReorder={handleReorder} className="flex flex-col gap-4">
          {itensVisiveis.map((a) => {
            const isComplexo = a.categoria === 'complexo';
            const charVinculado = isComplexo ? personagens.find(p => p.id === a.personagemId) : null;
            const fichaVinculada = charVinculado?.ficha || {};
            const statusVinculado = obterStatusFicha(fichaVinculada);
            const vidaMaximaVinculada = Number(charVinculado?.derivados?.vida ?? fichaVinculada?.derivados?.vida) || 1;
            const iniciativaBaseVinculada = Number(charVinculado?.derivados?.iniciativa ?? fichaVinculada?.derivados?.iniciativa) || 0;
            
            // Sync status ao vivo se complexo
            const vidaAtual = isComplexo ? Number(statusVinculado.vidaAtual ?? vidaMaximaVinculada) : a.vidaAtual;
            const vidaMaxima = isComplexo ? vidaMaximaVinculada : a.vidaMaxima;
            const nomeExibicao = isComplexo ? (charVinculado?.nome || a.nome) : a.nome;
            const iniciativa = isComplexo
              ? iniciativaBaseVinculada
                + bonusIniciativaFicha(fichaVinculada)
                + penalidadeCansacoIniciativa(statusVinculado.cansacoAtual)
                + penalidadeIniciativaCondicoes(fichaVinculada.condicoesAtivas)
              : a.iniciativa;

            const percentVida = Math.min(100, Math.max(0, ((vidaAtual || 0) / (vidaMaxima || 1)) * 100));

            return (
              <Reorder.Item
                value={a}
                key={a.id}
                className={`bg-[#121118] border rounded-xl p-5 flex flex-col gap-4 transition-all group relative ${
                  isComplexo ? (a.favorito ? 'border-[#c7a44c]/50 shadow-[0_0_15px_rgba(199,164,76,0.15)]' : 'border-[#c7a44c]/30 shadow-[0_0_15px_rgba(199,164,76,0.05)]') : (a.favorito ? 'border-yellow-600/50 shadow-[0_0_15px_rgba(202,138,4,0.15)]' : 'border-white/5 hover:border-[#c7a44c]/30')
                } ${!a.emCena ? 'opacity-60 saturate-50 hover:opacity-100 hover:saturate-100' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col gap-2 items-center flex-shrink-0">
                      <div className="flex gap-1 mb-1">
                        <button onClick={() => toggleFavorito(a.id)} className={`transition-colors ${a.favorito ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
                          <Star size={16} fill={a.favorito ? 'currentColor' : 'none'} />
                        </button>
                        <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 p-0.5">
                          <GripVertical size={16} />
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-full bg-black/50 border flex items-center justify-center overflow-hidden shrink-0 ${isComplexo ? 'border-[#c7a44c]/50 text-[#c7a44c]' : (a.favorito ? 'border-yellow-600/50 text-yellow-500' : 'border-white/5 text-gray-400')}`}>
                        {isComplexo ? <Link size={20} /> : <Users size={20} />}
                      </div>
                    </div>

                    <div className="pt-1">
                      <h4 className="text-white font-bold mb-1">{nomeExibicao || 'Aliado Desconhecido'}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isComplexo ? (
                          <span className="text-[10px] px-2 py-0.5 bg-[#c7a44c]/20 rounded border border-[#c7a44c]/30 text-[#c7a44c] font-bold uppercase tracking-wider">
                            Vínculo Complexo
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 uppercase font-bold tracking-wider">
                            {a.especieTipo || 'Aliado'}
                          </span>
                        )}
                        {a.papel && (
                          <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 uppercase font-bold tracking-wider">
                            {a.papel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <Heart size={12} /> Vida {isComplexo && '(Sincronizada)'}
                    </span>
                    <span className="text-xs font-mono text-gray-300">{vidaAtual} / {vidaMaxima}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isComplexo && (
                      <div className="flex gap-1">
                        <button onClick={() => handleAjustarVida(a, -5)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">-5</button>
                        <button onClick={() => handleAjustarVida(a, -1)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">-1</button>
                      </div>
                    )}
                    <div className="flex-1 h-6 bg-[#0a090d] border border-white/5 rounded relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentVida}%` }}
                        className="absolute left-0 top-0 bottom-0 bg-[#8b1c2b]"
                      />
                    </div>
                    {!isComplexo && (
                      <div className="flex gap-1">
                        <button onClick={() => handleAjustarVida(a, 1)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">+1</button>
                        <button onClick={() => handleAjustarVida(a, 5)} className="w-7 h-7 rounded bg-[#15141b] border border-white/5 text-gray-400 text-[10px] font-mono hover:text-white">+5</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* STATS */}
                {!isComplexo && (
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                      <Shield size={12} className="text-gray-500" />
                      <span className="text-xs font-mono text-gray-300">{a.defesa}</span>
                    </div>
                    <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                      <Footprints size={12} className="text-gray-500" />
                      <span className="text-xs font-mono text-gray-300 truncate max-w-full" title={a.movimento || 'Não informado'}>{a.movimento || 'Não informado'}</span>
                    </div>
                    <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                      <Zap size={12} className="text-gray-500" />
                      <span className="text-xs font-mono text-gray-300">{sinal(iniciativa)}</span>
                    </div>
                    <div className="bg-black/30 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5">
                      <span className="text-[9px] uppercase text-gray-500 font-bold">Nível</span>
                      <span className="text-xs font-mono text-gray-300">{a.nivel}</span>
                    </div>
                  </div>
                )}
                {isComplexo && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#c7a44c]/10 rounded-lg py-2 px-3 flex items-center justify-between gap-2 border border-[#c7a44c]/20">
                      <span className="text-[10px] uppercase text-[#c7a44c] font-bold tracking-widest flex items-center gap-1">
                        <Zap size={12} /> Inic. (Sync)
                      </span>
                      <span className="text-xs font-mono text-[#c7a44c]">{sinal(iniciativa)}</span>
                    </div>
                  </div>
                )}

                {/* ATAQUE PRINCIPAL */}
                {!isComplexo && a.ataquePrincipal && (
                  <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 rounded-lg px-3 py-2">
                    <Sword size={14} className="text-[#c7a44c] shrink-0" />
                    <span className="truncate">{a.ataquePrincipal}</span>
                  </div>
                )}

                {/* CONDIÇÕES */}
                {!isComplexo && a.condicoes && (
                  <div className="flex items-start gap-2 text-xs text-yellow-500 bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{a.condicoes}</span>
                  </div>
                )}

                {/* OBSERVAÇÕES */}
                {a.observacoes && (
                  <p className="text-sm text-gray-400 line-clamp-3 bg-black/20 p-2 rounded-lg">{a.observacoes}</p>
                )}

                <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5">
                  <button
                    onClick={() => handleToggleCena(a)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors flex items-center gap-2 ${
                      a.emCena
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                        : 'bg-black/40 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${a.emCena ? 'bg-green-400' : 'bg-gray-600'}`}></span>
                    {a.emCena ? 'Em Cena' : 'Fora de Cena'}
                  </button>
                </div>
              </Reorder.Item>
            );
          })}
          {itensVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Users size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Aliado Encontrado</p>
            </div>
          )}
        </Reorder.Group>
      </div>

      {/* MODAL DE CRIAR / EDITAR */}
      <FichaModal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={editandoId ? 'Editar Aliado' : 'Novo Aliado'}
      >
        <div className="flex flex-col gap-4">
          
          <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${form.categoria === 'comum' ? 'bg-[#c7a44c] text-black' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setCampo('categoria', 'comum')}
            >
              Aliado Comum
            </button>
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${form.categoria === 'complexo' ? 'bg-[#c7a44c] text-black' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setCampo('categoria', 'complexo')}
            >
              <Link size={14} /> Vínculo Complexo
            </button>
          </div>

          {form.categoria === 'complexo' ? (
            <div className="flex flex-col gap-4 py-2 border-y border-white/5 my-2">
              <p className="text-xs text-[#c7a44c] bg-[#c7a44c]/10 p-3 rounded-lg border border-[#c7a44c]/20">
                O aliado complexo cria um vínculo com outra ficha da campanha. Atributos vitais (Vida e Iniciativa) serão sincronizados automaticamente em tempo real!
              </p>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Vincular a Personagem</label>
                <select
                  value={form.personagemId || ''}
                  onChange={e => setCampo('personagemId', e.target.value)}
                  className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors"
                >
                  <option value="" disabled>Selecione um personagem da campanha</option>
                  {personagens.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <LabeledInput label="Nome" value={form.nome} placeholder="Ex.: Corvo de vigília" onChange={(v: string) => setCampo('nome', v)} />

              <div className="grid grid-cols-2 gap-3">
                <LabeledInput label="Espécie / Tipo" value={form.especieTipo} placeholder="Ex.: Animal, Espírito..." onChange={(v: string) => setCampo('especieTipo', v)} />
                <LabeledInput label="Nível" value={String(form.nivel ?? '')} onChange={(v: string) => setCampo('nivel', v)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
            </>
          )}

          <LabeledInput label="Papel (Opcional)" value={form.papel} placeholder="Ex.: Batedor, Montaria..." onChange={(v: string) => setCampo('papel', v)} />

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Observações</label>
            <textarea
              value={form.observacoes || ''}
              onChange={e => setCampo('observacoes', e.target.value)}
              placeholder="Personalidade, vínculo, ordens e outras informações..."
              rows={3}
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

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button
              onClick={fecharModal}
              className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={form.categoria === 'comum' ? !form.nome?.trim() : !form.personagemId}
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
