import { useState, useEffect } from 'react';
import { Search, Flame, Dices, Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput, LabeledSelect } from '../components/SharedFichaComponents';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';

type RecursoCusto = 'nenhum' | 'mana' | 'vida' | 'sanidade' | 'cansaco';

interface ICustoMagia {
  recurso: RecursoCusto;
  valor: number;
}

interface IMagia {
  id: string;
  nome: string;
  circulo: string;
  escola: string;
  custo: ICustoMagia;
  execucao: string;
  alcance: string;
  efeito: string;
}

const CIRCULOS = ['1º Círculo', '2º Círculo', '3º Círculo', '4º Círculo', '5º Círculo', 'Ritual'];

const RECURSO_OPTIONS = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'mana', label: 'Mana' },
  { value: 'vida', label: 'Vida' },
  { value: 'sanidade', label: 'Sanidade' },
  { value: 'cansaco', label: 'Cansaço' },
];

const RECURSO_LABEL: Record<RecursoCusto, string> = {
  nenhum: 'Nenhum',
  mana: 'Mana',
  vida: 'Vida',
  sanidade: 'Sanidade',
  cansaco: 'Cansaço',
};

// Mapeia cada recurso gasto por uma magia para o campo correspondente em ficha.status
// (mesmos campos usados por AbaFicha.tsx: vidaAtual/manaAtual/sanidadeAtual/cansacoAtual).
const RECURSO_CAMPO: Record<Exclude<RecursoCusto, 'nenhum'>, string> = {
  mana: 'manaAtual',
  vida: 'vidaAtual',
  sanidade: 'sanidadeAtual',
  cansaco: 'cansacoAtual',
};

const gerarIdMagia = () => `magias-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const criarFormularioVazio = () => ({
  nome: '',
  circulo: '',
  escola: '',
  custoRecurso: 'nenhum' as RecursoCusto,
  custoValor: '0',
  execucao: '',
  alcance: '',
  efeito: '',
});

const formatarCusto = (custo?: ICustoMagia) => {
  if (!custo || custo.recurso === 'nenhum' || !custo.valor) return 'Nenhum';
  return `${custo.valor} ${RECURSO_LABEL[custo.recurso]}`;
};

export const AbaMagias = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(criarFormularioVazio());
  const [erroForm, setErroForm] = useState('');
  const [ultimoUsoMsg, setUltimoUsoMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);

  const magias: IMagia[] = character.ficha?.magias || [];
  const status = character.ficha?.status || {};

  const maxVida = character.derivados?.vida || 10;
  const maxMana = character.derivados?.mana || 10;
  const maxSanidade = status.sanidadeMaxima || 100;
  const maxCansaco = status.cansacoMaximo || 6;

  const RECURSO_MAX: Record<Exclude<RecursoCusto, 'nenhum'>, number> = {
    mana: maxMana,
    vida: maxVida,
    sanidade: maxSanidade,
    cansaco: maxCansaco,
  };

  const magiasVisiveis = magias.filter((m) =>
    !busca || m.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  useEffect(() => {
    if (!ultimoUsoMsg) return;
    const timer = setTimeout(() => setUltimoUsoMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [ultimoUsoMsg]);

  const abrirCriar = () => {
    setEditandoId(null);
    setForm(criarFormularioVazio());
    setErroForm('');
    setModalAberto(true);
  };

  const abrirEditar = (magia: IMagia) => {
    setEditandoId(magia.id);
    setForm({
      nome: magia.nome || '',
      circulo: magia.circulo || '',
      escola: magia.escola || '',
      custoRecurso: magia.custo?.recurso || 'nenhum',
      custoValor: String(magia.custo?.valor ?? 0),
      execucao: magia.execucao || '',
      alcance: magia.alcance || '',
      efeito: magia.efeito || '',
    });
    setErroForm('');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
  };

  const salvarMagia = () => {
    const nome = form.nome.trim();
    if (!nome) {
      setErroForm('Informe o nome da magia.');
      return;
    }

    const valorNumerico = Math.max(0, Math.trunc(Number(form.custoValor) || 0));

    const dados: IMagia = {
      id: editandoId || gerarIdMagia(),
      nome,
      circulo: form.circulo.trim(),
      escola: form.escola.trim(),
      custo: { recurso: form.custoRecurso, valor: valorNumerico },
      execucao: form.execucao.trim(),
      alcance: form.alcance.trim(),
      efeito: form.efeito.trim(),
    };

    const novaLista = editandoId
      ? magias.map((m) => (m.id === editandoId ? dados : m))
      : [...magias, dados];

    onUpdate(['ficha', 'magias'], novaLista);
    fecharModal();
  };

  const excluirMagia = (magia: IMagia) => {
    if (!window.confirm(`Excluir a magia "${magia.nome}"?`)) return;
    onUpdate(['ficha', 'magias'], magias.filter((m) => m.id !== magia.id));
  };

  const conjurarMagia = async (magia: IMagia) => {
    const custo = magia.custo || { recurso: 'nenhum', valor: 0 };

    if (custo.recurso !== 'nenhum' && custo.valor > 0) {
      if (custo.recurso === 'cansaco') {
        const atual = status.cansacoAtual ?? 0;
        if (atual + custo.valor > maxCansaco) {
          setUltimoUsoMsg({ tipo: 'erro', texto: `Cansaço insuficiente para conjurar "${magia.nome}".` });
          return;
        }
      } else {
        const campo = RECURSO_CAMPO[custo.recurso];
        const max = RECURSO_MAX[custo.recurso];
        const atual = status[campo] ?? max;
        if (atual < custo.valor) {
          setUltimoUsoMsg({ tipo: 'erro', texto: `${RECURSO_LABEL[custo.recurso]} insuficiente para conjurar "${magia.nome}".` });
          return;
        }
      }
    }

    if (custo.recurso !== 'nenhum' && custo.valor > 0) {
      if (custo.recurso === 'cansaco') {
        const atual = status.cansacoAtual ?? 0;
        onUpdate(['ficha', 'status', 'cansacoAtual'], Math.min(maxCansaco, atual + custo.valor));
      } else {
        const campo = RECURSO_CAMPO[custo.recurso];
        const max = RECURSO_MAX[custo.recurso];
        const atual = status[campo] ?? max;
        onUpdate(['ficha', 'status', campo], Math.max(0, atual - custo.valor));
      }
    }

    try {
      const campanhaId = campanhaAtiva?.id;
      if (campanhaId) {
        await registrosApi.registrarUso({
          campanhaId,
          personagemId: character.id,
          tipo: 'magia',
          titulo: magia.nome,
          detalhes: {
            circulo: magia.circulo,
            escola: magia.escola,
            custo,
            execucao: magia.execucao,
            alcance: magia.alcance,
          },
        });
      }
      setUltimoUsoMsg({ tipo: 'sucesso', texto: `"${magia.nome}" conjurada com sucesso!` });
    } catch (e) {
      setUltimoUsoMsg({ tipo: 'erro', texto: 'Magia conjurada, mas houve falha ao registrar o uso no servidor.' });
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Magias</h2>
          <p className="text-gray-400 text-sm">Lista de magias, milagres e feitiços conhecidos.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-[#29b6f6]">{magias.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Magias<br />Conhecidas</span>
        </div>
      </div>

      {/* FEEDBACK DE USO */}
      {ultimoUsoMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold ${
            ultimoUsoMsg.tipo === 'sucesso'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {ultimoUsoMsg.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {ultimoUsoMsg.texto}
        </motion.div>
      )}

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar magia..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#29b6f6]/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirCriar}
          className="px-6 py-3 rounded-xl border border-[#29b6f6]/30 text-[#29b6f6] font-bold text-sm hover:bg-[#29b6f6]/10 transition-colors border-dashed"
        >
          + Nova Magia
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {magiasVisiveis.map((m) => (
            <motion.div
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={m.id}
              className="bg-[#121118] border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-[#29b6f6]/30 transition-colors group relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-black/50 border border-white/5 flex items-center justify-center text-[#29b6f6]">
                    <Flame size={18} />
                  </div>
                  <div>
                    <h4 className="text-white font-bold mb-1">{m.nome || 'Magia Desconhecida'}</h4>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {m.circulo || '1º Círculo'} • {m.escola || 'Universal'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => abrirEditar(m)}
                    className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-[#29b6f6] hover:bg-[#29b6f6]/10 transition-colors"
                    title="Editar magia"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => excluirMagia(m)}
                    className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Excluir magia"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-400 space-y-1">
                <p><strong>Custo:</strong> {formatarCusto(m.custo)}</p>
                <p><strong>Execução:</strong> {m.execucao || 'Padrão'}</p>
                <p><strong>Alcance:</strong> {m.alcance || 'Curto'}</p>
              </div>

              <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                <span className="text-xs text-gray-500 truncate pr-4">{m.efeito || 'Efeito principal da magia...'}</span>
                <button
                  onClick={() => conjurarMagia(m)}
                  className="px-4 py-2 rounded bg-[#29b6f6]/10 border border-[#29b6f6]/30 text-[#29b6f6] hover:bg-[#29b6f6]/20 flex items-center gap-2 text-xs font-bold transition-all whitespace-nowrap"
                >
                  <Dices size={14} /> Conjurar
                </button>
              </div>
            </motion.div>
          ))}
          {magiasVisiveis.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Flame size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma Magia Encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRIAR/EDITAR */}
      <FichaModal isOpen={modalAberto} onClose={fecharModal} title={editandoId ? 'Editar Magia' : 'Nova Magia'}>
        <div className="flex flex-col gap-4">
          <LabeledInput
            label="Nome"
            value={form.nome}
            placeholder="Ex: Bola de Fogo"
            onChange={(v: string) => setForm({ ...form, nome: v })}
          />

          <div className="grid grid-cols-2 gap-4">
            <LabeledSelect
              label="Círculo"
              value={form.circulo}
              options={CIRCULOS}
              onChange={(v: string) => setForm({ ...form, circulo: v })}
            />
            <LabeledInput
              label="Escola"
              value={form.escola}
              placeholder="Ex: Evocação"
              onChange={(v: string) => setForm({ ...form, escola: v })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <LabeledSelect
              label="Recurso do Custo"
              value={form.custoRecurso}
              options={RECURSO_OPTIONS}
              onChange={(v: string) => setForm({ ...form, custoRecurso: v as RecursoCusto })}
            />
            <LabeledInput
              label="Valor do Custo"
              value={form.custoValor}
              placeholder="0"
              onChange={(v: string) => setForm({ ...form, custoValor: v.replace(/[^0-9]/g, '') })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <LabeledInput
              label="Execução"
              value={form.execucao}
              placeholder="Ex: Padrão, Reação..."
              onChange={(v: string) => setForm({ ...form, execucao: v })}
            />
            <LabeledInput
              label="Alcance"
              value={form.alcance}
              placeholder="Ex: Curto, 9m..."
              onChange={(v: string) => setForm({ ...form, alcance: v })}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Efeito</label>
            <textarea
              value={form.efeito}
              onChange={(e) => setForm({ ...form, efeito: e.target.value })}
              placeholder="Descreva o efeito da magia..."
              className="bg-[#121118] border border-white/5 rounded-md p-3 text-sm text-gray-300 min-h-[100px] resize-none focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700"
            />
          </div>

          {erroForm && <p className="text-xs text-red-400 font-bold">{erroForm}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={fecharModal}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvarMagia}
              className="px-4 py-2 rounded-lg bg-[#c7a44c]/20 border border-[#c7a44c]/40 text-[#c7a44c] hover:bg-[#c7a44c]/30 text-sm font-bold transition-colors"
            >
              {editandoId ? 'Salvar Alterações' : 'Criar Magia'}
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};
