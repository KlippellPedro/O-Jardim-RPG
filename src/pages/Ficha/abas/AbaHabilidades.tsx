import { useState } from 'react';
import { Search, Star, Pencil, Trash2, Dices } from 'lucide-react';
import { motion } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput, LabeledSelect } from '../components/SharedFichaComponents';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';

// ---------------------------------------------------------------------------
// Tipos locais da entidade "habilidade" (traços raciais, talentos, competências)
// ---------------------------------------------------------------------------
type TipoHabilidade = 'Ativa' | 'Passiva' | 'Reação' | 'Sustentada' | 'Outro';
type RecursoCusto = 'nenhum' | 'mana' | 'vida' | 'sanidade' | 'cansaco';

interface ICustoHabilidade {
  recurso: RecursoCusto;
  valor: number;
}

interface IHabilidade {
  id: string;
  nome: string;
  origem: string;
  tipo: TipoHabilidade;
  nivelAdquirido: number;
  custo: ICustoHabilidade;
  acao: string;
  duracao: string;
  alcance: string;
  descricao: string;
}

const TIPOS_HABILIDADE: TipoHabilidade[] = ['Ativa', 'Passiva', 'Reação', 'Sustentada', 'Outro'];

const RECURSOS: { value: RecursoCusto; label: string }[] = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'mana', label: 'Mana' },
  { value: 'vida', label: 'Vida' },
  { value: 'sanidade', label: 'Sanidade' },
  { value: 'cansaco', label: 'Cansaço' },
];

// Mapeia o recurso da habilidade para os campos de status usados na Ficha
// (veja AbaFicha.tsx: vidaAtual/manaAtual/sanidadeAtual/cansacoAtual)
const CAMPO_STATUS: Record<Exclude<RecursoCusto, 'nenhum'>, string> = {
  mana: 'manaAtual',
  vida: 'vidaAtual',
  sanidade: 'sanidadeAtual',
  cansaco: 'cansacoAtual',
};

// Vida e Mana máximas vêm de character.derivados (calculadas), Sanidade e Cansaço
// já são configuráveis dentro de ficha.status (veja AbaFicha.tsx)
const CAMPO_MAXIMO_STATUS: Partial<Record<Exclude<RecursoCusto, 'nenhum'>, string>> = {
  sanidade: 'sanidadeMaxima',
  cansaco: 'cansacoMaximo',
};

function gerarId(prefixo: string) {
  return `${prefixo.toLowerCase()}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function custoTexto(item: IHabilidade) {
  if (!item.custo || item.custo.recurso === 'nenhum' || !item.custo.valor) return 'Sem custo';
  const rotulo = RECURSOS.find(r => r.value === item.custo.recurso)?.label || item.custo.recurso;
  return `${item.custo.valor} ${rotulo}`;
}

const habilidadeVazia = (): IHabilidade => ({
  id: '',
  nome: '',
  origem: 'Geral',
  tipo: 'Ativa',
  nivelAdquirido: 0,
  custo: { recurso: 'nenhum', valor: 0 },
  acao: '',
  duracao: '',
  alcance: '',
  descricao: '',
});

export const AbaHabilidades = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const campanhaAtiva = useAuthStore(s => s.campanhaAtiva);
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<IHabilidade>(habilidadeVazia());
  const [erroForm, setErroForm] = useState('');

  const [usoPendenteId, setUsoPendenteId] = useState<string | null>(null);
  const [ultimoUsoMsg, setUltimoUsoMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const habilidades: IHabilidade[] = character.ficha?.habilidades || [];
  const status = character.ficha?.status || {};

  const habilidadesVisiveis = habilidades.filter((h: IHabilidade) =>
    !busca || h.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  const mostrarUsoMsg = (tipo: 'sucesso' | 'erro', texto: string) => {
    setUltimoUsoMsg({ tipo, texto });
    setTimeout(() => setUltimoUsoMsg(null), 3000);
  };

  const abrirCriar = () => {
    setEditandoId(null);
    setForm(habilidadeVazia());
    setErroForm('');
    setModalAberto(true);
  };

  const abrirEditar = (item: IHabilidade) => {
    setEditandoId(item.id);
    setForm({ ...item, custo: { ...item.custo } });
    setErroForm('');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
  };

  const salvar = () => {
    const nomeLimpo = form.nome.trim();
    if (nomeLimpo.length < 2) {
      setErroForm('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    if (editandoId) {
      const novaLista = habilidades.map((h: IHabilidade) =>
        h.id === editandoId ? { ...form, nome: nomeLimpo, id: editandoId } : h
      );
      onUpdate(['ficha', 'habilidades'], novaLista);
    } else {
      const novoItem: IHabilidade = { ...form, nome: nomeLimpo, id: gerarId('habilidade') };
      onUpdate(['ficha', 'habilidades'], [...habilidades, novoItem]);
    }
    fecharModal();
  };

  const excluir = (item: IHabilidade) => {
    if (!window.confirm(`Excluir "${item.nome}"? Essa ação remove somente esta entrada da ficha.`)) return;
    const novaLista = habilidades.filter((h: IHabilidade) => h.id !== item.id);
    onUpdate(['ficha', 'habilidades'], novaLista);
  };

  const usar = async (item: IHabilidade) => {
    if (usoPendenteId) return;

    const recurso = item.custo?.recurso;
    const valor = item.custo?.valor || 0;
    let statusAposUso: any = null;

    if (recurso && recurso !== 'nenhum' && valor > 0) {
      const campoAtual = CAMPO_STATUS[recurso];
      const maxVida = character.derivados?.vida || 10;
      const maxMana = character.derivados?.mana || 10;
      const atual = recurso === 'vida'
        ? Number(status.vidaAtual ?? maxVida)
        : recurso === 'mana'
        ? Number(status.manaAtual ?? maxMana)
        : Number(status[campoAtual]) || 0;

      if (recurso === 'cansaco') {
        // Cansaço sobe ao usar; limite é o máximo de cansaço
        const campoMax = CAMPO_MAXIMO_STATUS.cansaco!;
        const maximo = Number(status[campoMax]) || 6;
        const novoValor = atual + valor;
        if (novoValor > maximo) {
          mostrarUsoMsg('erro', `Usar ${item.nome} ultrapassaria o limite de Cansaço.`);
          return;
        }
        statusAposUso = { ...status, [campoAtual]: novoValor };
      } else {
        // Mana/Vida/Sanidade são gastos (diminuem)
        if (atual < valor) {
          const rotulo = RECURSOS.find(r => r.value === recurso)?.label || recurso;
          mostrarUsoMsg('erro', `Não há ${rotulo} suficiente para usar ${item.nome}.`);
          return;
        }
        statusAposUso = { ...status, [campoAtual]: atual - valor };
      }
    }

    setUsoPendenteId(item.id);
    try {
      if (statusAposUso) {
        onUpdate(['ficha', 'status'], statusAposUso);
      }

      await registrosApi.registrarUso({
        campanhaId: campanhaAtiva?.id || '',
        personagemId: character.id,
        tipo: 'habilidade',
        titulo: item.nome,
        detalhes: {
          custo: valor,
          recurso,
          acao: item.acao,
          duracao: item.duracao,
          descricao: (item.descricao || '').slice(0, 300),
        },
      });

      mostrarUsoMsg('sucesso', `${item.nome} foi usada${valor ? ` por ${custoTexto(item)}` : ''}.`);
    } catch (e) {
      console.error('Falha ao registrar uso da habilidade:', e);
      mostrarUsoMsg('erro', 'Não foi possível registrar o uso na mesa.');
    } finally {
      setUsoPendenteId(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Habilidades</h2>
          <p className="text-gray-400 text-sm">Traços raciais, talentos e competências diversas.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-[#c7a44c]">{habilidades.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Habilidades<br/>Conhecidas</span>
        </div>
      </div>

      {/* FEEDBACK DE USO */}
      {ultimoUsoMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl px-4 py-3 text-sm font-bold border ${
            ultimoUsoMsg.tipo === 'sucesso'
              ? 'bg-[#c7a44c]/10 border-[#c7a44c]/30 text-[#c7a44c]'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {ultimoUsoMsg.texto}
        </motion.div>
      )}

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar habilidade..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirCriar}
          className="px-6 py-3 rounded-xl border border-yellow-600/30 text-yellow-600 font-bold text-sm hover:bg-yellow-600/10 transition-colors border-dashed"
        >
          + Nova Habilidade
        </button>
      </div>

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="flex flex-col gap-4">
          {habilidadesVisiveis.map((h: IHabilidade) => (
            <motion.div
              layout
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              key={h.id}
              className="bg-[#121118] border border-white/5 rounded-xl p-5 hover:border-yellow-600/30 transition-colors group"
            >
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-full bg-black/50 border border-white/5 flex items-center justify-center text-yellow-600 flex-shrink-0 mt-1">
                  <Star size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="text-white font-bold text-lg mb-1">{h.nome || 'Habilidade Desconhecida'}</h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => abrirEditar(h)}
                        title="Editar"
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => excluir(h)}
                        title="Excluir"
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                      {h.origem || 'Geral'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                      {h.tipo || 'Ativa'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                      {custoTexto(h)}
                    </span>
                    {h.nivelAdquirido ? (
                      <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                        Nível {h.nivelAdquirido}
                      </span>
                    ) : null}
                    {h.acao ? (
                      <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                        {h.acao}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{h.descricao || 'Sem descrição cadastrada.'}</p>

                  {h.tipo !== 'Passiva' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => usar(h)}
                        disabled={usoPendenteId === h.id}
                        className="px-3 py-1.5 rounded bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 hover:scale-105 flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Dices size={14} /> {usoPendenteId === h.id ? 'Usando...' : 'Usar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {habilidadesVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Star size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma Habilidade Encontrada</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CRIAR/EDITAR */}
      <FichaModal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={editandoId ? 'Editar Habilidade' : 'Nova Habilidade'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <LabeledInput
              label="Nome"
              value={form.nome}
              placeholder="Nome da habilidade"
              onChange={(v: string) => setForm({ ...form, nome: v })}
            />
          </div>

          <LabeledInput
            label="Origem"
            value={form.origem}
            placeholder="Ex.: Raça, Talento, Item..."
            onChange={(v: string) => setForm({ ...form, origem: v })}
          />

          <LabeledSelect
            label="Tipo"
            value={form.tipo}
            options={TIPOS_HABILIDADE.map(t => ({ value: t, label: t }))}
            onChange={(v: string) => setForm({ ...form, tipo: v as TipoHabilidade })}
          />

          <LabeledInput
            label="Nível Adquirido"
            value={String(form.nivelAdquirido ?? 0)}
            placeholder="0"
            onChange={(v: string) => setForm({ ...form, nivelAdquirido: Math.max(0, Math.trunc(Number(v) || 0)) })}
          />

          <div className="grid grid-cols-2 gap-2">
            <LabeledSelect
              label="Recurso do Custo"
              value={form.custo.recurso}
              options={RECURSOS}
              onChange={(v: string) => setForm({ ...form, custo: { ...form.custo, recurso: v as RecursoCusto } })}
            />
            <LabeledInput
              label="Valor do Custo"
              value={String(form.custo.valor ?? 0)}
              placeholder="0"
              onChange={(v: string) => setForm({ ...form, custo: { ...form.custo, valor: Math.max(0, Math.trunc(Number(v) || 0)) } })}
            />
          </div>

          <LabeledInput
            label="Ação"
            value={form.acao}
            placeholder="Ex.: Ação padrão, reação..."
            onChange={(v: string) => setForm({ ...form, acao: v })}
          />

          <LabeledInput
            label="Duração"
            value={form.duracao}
            placeholder="Ex.: Instantânea, 3 rodadas..."
            onChange={(v: string) => setForm({ ...form, duracao: v })}
          />

          <LabeledInput
            label="Alcance"
            value={form.alcance}
            placeholder="Ex.: Pessoal, 9 m..."
            onChange={(v: string) => setForm({ ...form, alcance: v })}
          />

          <div className="md:col-span-2 flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              rows={5}
              placeholder="Descreva o efeito e as condições de uso."
              className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700 resize-none"
            />
          </div>

          {erroForm && (
            <div className="md:col-span-2 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {erroForm}
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              onClick={fecharModal}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-bold hover:text-white hover:border-white/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="px-6 py-2.5 rounded-xl bg-[#c7a44c] text-black text-sm font-bold hover:bg-[#d4af37] transition-colors"
            >
              {editandoId ? 'Salvar Alterações' : 'Criar Habilidade'}
            </button>
          </div>
        </div>
      </FichaModal>
    </div>
  );
};
