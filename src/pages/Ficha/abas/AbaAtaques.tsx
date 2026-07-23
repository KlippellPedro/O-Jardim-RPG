import { useState } from 'react';
import { Search, Crosshair, Dices, Pencil, Trash2, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput, LabeledSelect } from '../components/SharedFichaComponents';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';

interface IAtaque {
  id: string;
  nome: string;
  tipo: string;
  bonusAcerto: number;
  dano: string;
  alcance: string;
}

interface IResultadoRolagem {
  ataqueId: string;
  tipo: 'acerto' | 'dano';
  resultado: number | null;
  detalhes: Record<string, any>;
}

const TIPOS_ATAQUE = ['Corpo a Corpo', 'Distância', 'Alcance'];

const FORM_VAZIO = { nome: '', tipo: 'Corpo a Corpo', bonusAcerto: '0', dano: '', alcance: '' };

function gerarId(): string {
  return `ataques-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const AbaAtaques = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [rolando, setRolando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<IResultadoRolagem | null>(null);

  const campanhaId = useAuthStore(state => state.campanhaAtiva?.id);

  const ataques: IAtaque[] = character.ficha?.ataques || [];

  const ataquesVisiveis = ataques.filter((a: any) =>
    !busca || a.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  };

  const abrirEditar = (item: IAtaque) => {
    setEditandoId(item.id);
    setForm({
      nome: item.nome || '',
      tipo: item.tipo || 'Corpo a Corpo',
      bonusAcerto: String(item.bonusAcerto ?? 0),
      dano: item.dano || '',
      alcance: item.alcance || '',
    });
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const salvar = () => {
    const nome = form.nome.trim();
    if (!nome) return;

    const bonusNumerico = Number(form.bonusAcerto);
    const item: IAtaque = {
      id: editandoId || gerarId(),
      nome,
      tipo: form.tipo || 'Corpo a Corpo',
      bonusAcerto: Number.isFinite(bonusNumerico) ? bonusNumerico : 0,
      dano: form.dano.trim(),
      alcance: form.alcance.trim(),
    };

    const novaLista = editandoId
      ? ataques.map((a: IAtaque) => (a.id === editandoId ? item : a))
      : [...ataques, item];

    onUpdate(['ficha', 'ataques'], novaLista);
    fecharModal();
  };

  const excluir = (item: IAtaque) => {
    if (!window.confirm(`Excluir o ataque "${item.nome}"?`)) return;
    const novaLista = ataques.filter((a: IAtaque) => a.id !== item.id);
    onUpdate(['ficha', 'ataques'], novaLista);
    if (resultado?.ataqueId === item.id) setResultado(null);
  };

  const rolarAcerto = async (item: IAtaque) => {
    if (!campanhaId) {
      alert('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    setRolando(`${item.id}-acerto`);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId,
        personagemId: character.id,
        titulo: `Ataque: ${item.nome}`,
        bonus: item.bonusAcerto || 0,
      });
      setResultado({ ataqueId: item.id, tipo: 'acerto', resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (erro: any) {
      alert(erro?.message || 'Falha ao rolar o ataque.');
    } finally {
      setRolando(null);
    }
  };

  const rolarDano = async (item: IAtaque) => {
    if (!campanhaId) {
      alert('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    if (!item.dano) return;
    setRolando(`${item.id}-dano`);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId,
        personagemId: character.id,
        titulo: `Dano: ${item.nome}`,
        formula: item.dano,
      });
      setResultado({ ataqueId: item.id, tipo: 'dano', resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (erro: any) {
      alert(erro?.message || 'Falha ao rolar o dano.');
    } finally {
      setRolando(null);
    }
  };

  const bonusStr = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Ataques</h2>
          <p className="text-gray-400 text-sm">Armas equipadas e manobras de combate.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-red-500">{ataques.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Ataques<br/>Prontos</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar ataque..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-red-500/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirNovo}
          className="px-6 py-3 rounded-xl border border-red-500/30 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors border-dashed"
        >
          + Novo Ataque
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {ataquesVisiveis.map((a: IAtaque) => {
            const resultadoAtual = resultado?.ataqueId === a.id ? resultado : null;
            return (
              <motion.div
                layout
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                key={a.id}
                className="bg-[#121118] border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-red-500/30 transition-colors group relative"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center text-red-500">
                      <Crosshair size={18} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold mb-1">{a.nome || 'Ataque Desconhecido'}</h4>
                      <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                        {a.tipo || 'Corpo a Corpo'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => abrirEditar(a)}
                      className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => excluir(a)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                    <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Bônus de Acerto</span>
                    <span className="text-lg font-bold text-white font-mono">{bonusStr(a.bonusAcerto || 0)}</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 rounded p-2 text-center">
                    <span className="block text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Dano</span>
                    <span className="text-lg font-bold text-red-400 font-mono">{a.dano || '—'}</span>
                  </div>
                </div>

                {resultadoAtual && (
                  <div className="bg-black/40 border border-red-500/20 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400 uppercase tracking-wider font-bold">
                      <Flame size={14} className="text-red-500" />
                      {resultadoAtual.tipo === 'acerto' ? 'Acerto' : 'Dano'}
                      {resultadoAtual.tipo === 'acerto' && resultadoAtual.detalhes?.natural != null && (
                        <span className="text-gray-600 normal-case font-normal">(natural {resultadoAtual.detalhes.natural})</span>
                      )}
                    </div>
                    <span className="text-2xl font-bold text-white font-mono">{resultadoAtual.resultado}</span>
                  </div>
                )}

                <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                  <span className="text-xs text-gray-500">{a.alcance || 'Alcance: 1,5m'}</span>
                  <div className="flex items-center gap-2">
                    {a.dano && (
                      <button
                        onClick={() => rolarDano(a)}
                        disabled={rolando === `${a.id}-dano`}
                        className="px-3 py-2 rounded bg-black/40 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <Dices size={14} /> {rolando === `${a.id}-dano` ? 'Rolando...' : 'Rolar Dano'}
                      </button>
                    )}
                    <button
                      onClick={() => rolarAcerto(a)}
                      disabled={rolando === `${a.id}-acerto`}
                      className="px-4 py-2 rounded bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <Dices size={14} /> {rolando === `${a.id}-acerto` ? 'Rolando...' : 'Atacar'}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {ataquesVisiveis.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Crosshair size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Ataque Encontrado</p>
            </div>
          )}
        </div>
      </div>

      <FichaModal isOpen={modalAberto} onClose={fecharModal} title={editandoId ? 'Editar Ataque' : 'Novo Ataque'}>
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Nome"
            value={form.nome}
            placeholder="Ex: Espada Longa"
            onChange={(v: string) => setForm(f => ({ ...f, nome: v }))}
          />
          <LabeledSelect
            label="Tipo"
            value={form.tipo}
            options={TIPOS_ATAQUE}
            onChange={(v: string) => setForm(f => ({ ...f, tipo: v }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              label="Bônus de Acerto"
              value={form.bonusAcerto}
              placeholder="0"
              onChange={(v: string) => setForm(f => ({ ...f, bonusAcerto: v.replace(/[^0-9+-]/g, '') }))}
            />
            <LabeledInput
              label="Dano (fórmula)"
              value={form.dano}
              placeholder="1d6+2"
              onChange={(v: string) => setForm(f => ({ ...f, dano: v }))}
            />
          </div>
          <LabeledInput
            label="Alcance"
            value={form.alcance}
            placeholder="Ex: 1,5m ou 18m"
            onChange={(v: string) => setForm(f => ({ ...f, alcance: v }))}
          />

          <div className="flex justify-end gap-3 mt-2">
            <button
              onClick={fecharModal}
              className="px-4 py-2 rounded-lg text-gray-400 hover:text-white text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={!form.nome.trim()}
              className="px-6 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20 text-sm font-bold transition-colors disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};
