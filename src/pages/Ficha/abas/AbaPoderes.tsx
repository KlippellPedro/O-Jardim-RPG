import { useState } from 'react';
import { Search, Zap, Pencil, Trash2, Dices, GripVertical, Star } from 'lucide-react';
import { Reorder } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput, LabeledModalSelect } from '../components/SharedFichaComponents';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { poderesSelecionados } from '../../../services/progressaoFichaService';

interface ICustoPoder {
  recurso: 'nenhum' | 'mana' | 'vida' | 'sanidade' | 'cansaco';
  valor: number;
}

interface IPoder {
  id: string;
  nome: string;
  fonte: string;
  tipo: 'Ativa' | 'Passiva' | 'Reação' | 'Sustentada' | 'Outro';
  nivelAdquirido: string;
  custo: ICustoPoder;
  acao: string;
  duracao: string;
  alcance: string;
  descricao: string;
  ordem?: number;
  favorito?: boolean;
}

const TIPOS_PODER = ['Ativa', 'Passiva', 'Reação', 'Sustentada', 'Outro'];

const RECURSOS_CUSTO = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'mana', label: 'Mana' },
  { value: 'vida', label: 'Vida' },
  { value: 'sanidade', label: 'Sanidade' },
  { value: 'cansaco', label: 'Cansaço' },
];

const RECURSO_LABEL: Record<string, string> = {
  nenhum: 'Nenhum',
  mana: 'Mana',
  vida: 'Vida',
  sanidade: 'Sanidade',
  cansaco: 'Cansaço',
};

const TIPO_COLORS: Record<string, string> = {
  Ativa: 'bg-red-500/10 border-red-500/30 text-red-400',
  Passiva: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  Reação: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  Sustentada: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  Outro: 'bg-gray-500/10 border-gray-500/30 text-gray-400'
};

const gerarId = () => `poderes-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const criarPoderVazio = (): IPoder => ({
  id: '',
  nome: '',
  fonte: '',
  tipo: 'Ativa',
  nivelAdquirido: '',
  custo: { recurso: 'nenhum', valor: 0 },
  acao: '',
  duracao: '',
  alcance: '',
  descricao: '',
  ordem: 0,
  favorito: false,
});

function custoTexto(custo?: ICustoPoder) {
  if (!custo || custo.recurso === 'nenhum' || !custo.valor) return 'Sem custo';
  return `${custo.valor} ${RECURSO_LABEL[custo.recurso] || custo.recurso}`;
}

export const AbaPoderes = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const [busca, setBusca] = useState('');
  const [modalItem, setModalItem] = useState<IPoder | null>(null);
  const [usandoId, setUsandoId] = useState<string | null>(null);
  const [ultimoUsoMsg, setUltimoUsoMsg] = useState<{ id: string; texto: string; erro?: boolean } | null>(null);

  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);

  const f = character.ficha || {};
  const status = f.status || {};
  const poderes: IPoder[] = f.poderes || [];
  const poderesClasse: IPoder[] = poderesSelecionados(f).map((item) => ({
    id: item.id,
    nome: item.titulo,
    fonte: `Classe: ${item.origem}`,
    tipo: item.descricao.toLocaleLowerCase('pt-BR').startsWith('passivo') ? 'Passiva' : 'Ativa',
    nivelAdquirido: String(item.nivel),
    custo: { recurso: item.custoMana ? 'mana' : 'nenhum', valor: item.custoMana || 0 },
    acao: '',
    duracao: '',
    alcance: '',
    descricao: item.descricao,
  }));

  const poderesVisiveis = poderes
    .filter((p) => !busca || p.nome?.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const salvarLista = (novaLista: IPoder[]) => {
    onUpdate(['ficha', 'poderes'], novaLista);
  };

  const handleReorder = (novosItens: IPoder[]) => {
    const comOrdem = novosItens.map((item, index) => ({ ...item, ordem: index }));
    salvarLista(comOrdem);
  };

  const toggleFavorito = (id: string) => {
    let modificada = poderes.map(p => p.id === id ? { ...p, favorito: !p.favorito } : p);
    const itemTarget = modificada.find(p => p.id === id);
    if (itemTarget && itemTarget.favorito) {
      modificada = [itemTarget, ...modificada.filter(p => p.id !== id)];
    }
    const comOrdem = modificada.map((item, index) => ({ ...item, ordem: index }));
    salvarLista(comOrdem);
  };

  const abrirNovo = () => {
    setModalItem(criarPoderVazio());
  };

  const abrirEditar = (item: IPoder) => {
    setModalItem({ ...criarPoderVazio(), ...item, custo: { ...criarPoderVazio().custo, ...(item.custo || {}) } });
  };

  const fecharModal = () => setModalItem(null);

  const handleSalvar = () => {
    if (!modalItem) return;
    const nomeLimpo = (modalItem.nome || '').trim();
    if (!nomeLimpo) return;

    const jaExiste = poderes.some((p) => p.id === modalItem.id);
    if (jaExiste) {
      salvarLista(poderes.map((p) => (p.id === modalItem.id ? { ...modalItem, nome: nomeLimpo } : p)));
    } else {
      const novoItem: IPoder = { ...modalItem, nome: nomeLimpo, id: gerarId() };
      salvarLista([...poderes, novoItem]);
    }
    fecharModal();
  };

  const excluirItem = (item: IPoder) => {
    if (!window.confirm(`Excluir ${item.nome}?`)) return;
    salvarLista(poderes.filter((p) => p.id !== item.id));
  };

  const atualizarCampoModal = (campo: keyof IPoder, valor: any) => {
    setModalItem((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  };

  const atualizarCustoModal = (campo: keyof ICustoPoder, valor: any) => {
    setModalItem((prev) => (prev ? { ...prev, custo: { ...prev.custo, [campo]: valor } } : prev));
  };

  const usarPoder = async (item: IPoder) => {
    const recurso = item.custo?.recurso || 'nenhum';
    const valor = Number(item.custo?.valor) || 0;

    // Mapeia recurso -> campo em ficha.status e valida disponibilidade antes de gastar.
    let campoStatus: string | null = null;
    let novoValorStatus: number | null = null;

    if (recurso !== 'nenhum' && valor > 0) {
      if (recurso === 'cansaco') {
        const maxCansaco = status.cansacoMaximo || 6;
        const atual = status.cansacoAtual ?? 0;
        const novo = atual + valor;
        if (novo > maxCansaco) {
          setUltimoUsoMsg({ id: item.id, texto: `Usar ${item.nome} ultrapassaria o limite de Cansaço.`, erro: true });
          setTimeout(() => setUltimoUsoMsg((m) => (m?.id === item.id ? null : m)), 3000);
          return;
        }
        campoStatus = 'cansacoAtual';
        novoValorStatus = novo;
      } else {
        const mapaCampo: Record<string, { campo: string; max: number }> = {
          mana: { campo: 'manaAtual', max: character.derivados?.mana || 10 },
          vida: { campo: 'vidaAtual', max: character.derivados?.vida || 10 },
          sanidade: { campo: 'sanidadeAtual', max: status.sanidadeMaxima || 100 },
        };
        const regra = mapaCampo[recurso];
        if (regra) {
          const atual = status[regra.campo] ?? regra.max;
          const novo = atual - valor;
          if (novo < 0) {
            setUltimoUsoMsg({ id: item.id, texto: `Não há ${RECURSO_LABEL[recurso]} suficiente para usar ${item.nome}.`, erro: true });
            setTimeout(() => setUltimoUsoMsg((m) => (m?.id === item.id ? null : m)), 3000);
            return;
          }
          campoStatus = regra.campo;
          novoValorStatus = novo;
        }
      }
    }

    setUsandoId(item.id);
    try {
      if (campanhaAtiva?.id) {
        await registrosApi.registrarUso({
          campanhaId: campanhaAtiva.id,
          personagemId: character.id,
          tipo: 'poder',
          titulo: item.nome,
          detalhes: {
            custo: valor,
            recurso,
            acao: item.acao || '',
            descricao: (item.descricao || '').slice(0, 300),
          },
        });
      }

      if (campoStatus && novoValorStatus !== null) {
        onUpdate(['ficha', 'status', campoStatus], novoValorStatus);
      }

      setUltimoUsoMsg({ id: item.id, texto: `${item.nome} foi usado${valor ? ` por ${custoTexto(item.custo)}` : ''}.` });
      setTimeout(() => setUltimoUsoMsg((m) => (m?.id === item.id ? null : m)), 3000);
    } catch (e: any) {
      setUltimoUsoMsg({ id: item.id, texto: e?.message || 'Falha ao registrar o uso.', erro: true });
      setTimeout(() => setUltimoUsoMsg((m) => (m?.id === item.id ? null : m)), 3000);
    } finally {
      setUsandoId(null);
    }
  };

  const ehNovo = modalItem ? !poderes.some((p) => p.id === modalItem.id) : false;

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Poderes</h2>
          <p className="text-gray-400 text-sm">Habilidades ativas, passivas e características especiais.</p>
        </div>
        <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-3">
          <span className="text-3xl font-bold text-[#c7a44c]">{poderes.length + poderesClasse.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Poderes<br />Conhecidos</span>
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar poder..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <button
          onClick={abrirNovo}
          className="px-6 py-3 rounded-xl border border-yellow-600/30 text-yellow-600 font-bold text-sm hover:bg-yellow-600/10 transition-colors border-dashed"
        >
          + Novo Poder
        </button>
      </div>

      {poderesClasse.length > 0 && (
        <section className="bg-[#0f0e15] border border-[#c7a44c]/20 rounded-2xl p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#c7a44c]">Poderes oficiais de classe</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {poderesClasse.map((poder) => (
              <article key={poder.id} className="rounded-xl border border-white/5 bg-[#121118] p-4">
                <div className="flex items-start justify-between gap-3"><strong className="text-white">{poder.nome}</strong><span className="text-[10px] text-[#c7a44c]">{custoTexto(poder.custo)}</span></div>
                <p className="mt-1 text-[11px] text-gray-500">{poder.fonte}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{poder.descricao}</p>
                {poder.tipo !== 'Passiva' && <button type="button" onClick={() => usarPoder(poder)} disabled={usandoId === poder.id} className="mt-3 flex items-center gap-2 rounded-lg border border-[#c7a44c]/30 bg-[#c7a44c]/10 px-3 py-2 text-xs font-bold text-[#c7a44c] disabled:opacity-50"><Dices size={14} />{usandoId === poder.id ? 'Usando...' : 'Usar'}</button>}
                {ultimoUsoMsg?.id === poder.id && <p className={`mt-2 text-xs ${ultimoUsoMsg.erro ? 'text-red-400' : 'text-green-400'}`}>{ultimoUsoMsg.texto}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* LISTA DE PODERES */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <Reorder.Group axis="y" values={poderesVisiveis} onReorder={handleReorder} className="flex flex-col gap-4">
          {poderesVisiveis.map((p) => (
            <Reorder.Item
              value={p}
              key={p.id}
              className={`bg-[#121118] border ${p.favorito ? 'border-yellow-600/50 shadow-[0_0_15px_rgba(202,138,4,0.15)]' : 'border-white/5 hover:border-yellow-600/30'} rounded-xl p-5 transition-colors group relative`}
            >
              <div className="flex gap-4 items-start">
                <div className="flex flex-col gap-2 items-center flex-shrink-0">
                  <div className="flex gap-1 mb-1">
                    <button onClick={() => toggleFavorito(p.id)} className={`transition-colors ${p.favorito ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
                      <Star size={16} fill={p.favorito ? 'currentColor' : 'none'} />
                    </button>
                    <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 p-0.5">
                      <GripVertical size={16} />
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-black/50 border flex items-center justify-center ${p.favorito ? 'border-yellow-600/50 text-yellow-500' : 'border-white/5 text-yellow-600'}`}>
                    <Zap size={18} />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="text-white font-bold text-lg mb-1">{p.nome || 'Poder Desconhecido'}</h4>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => excluirItem(p)}
                        className="w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider uppercase ${TIPO_COLORS[p.tipo] || TIPO_COLORS['Outro']}`}>
                      {p.tipo || 'Ativa'}
                    </span>
                    {p.fonte && (
                      <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize">
                        {p.fonte}
                      </span>
                    )}
                    {p.nivelAdquirido && (
                      <span className="text-[10px] px-2 py-0.5 bg-black/40 rounded border border-white/5 text-gray-400">
                        Nível {p.nivelAdquirido}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 bg-[#c7a44c]/10 rounded border border-[#c7a44c]/30 text-[#c7a44c] font-bold uppercase tracking-wider">
                      {custoTexto(p.custo)}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed mb-3">{p.descricao || 'Sem descrição cadastrada.'}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-500 mb-3">
                    {p.acao && <span><span className="text-gray-600 font-bold uppercase">Ação:</span> {p.acao}</span>}
                    {p.duracao && <span><span className="text-gray-600 font-bold uppercase">Duração:</span> {p.duracao}</span>}
                    {p.alcance && <span><span className="text-gray-600 font-bold uppercase">Alcance:</span> {p.alcance}</span>}
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                    <button
                      onClick={() => usarPoder(p)}
                      disabled={usandoId === p.id}
                      className="px-4 py-2 rounded-lg bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 hover:scale-105 flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                      <Dices size={14} /> {usandoId === p.id ? 'Usando...' : 'Usar'}
                    </button>
                    {ultimoUsoMsg?.id === p.id && (
                      <span className={`text-xs font-bold ${ultimoUsoMsg.erro ? 'text-red-400' : 'text-green-400'}`}>
                        {ultimoUsoMsg.texto}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Reorder.Item>
          ))}
          {poderesVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Zap size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum Poder Encontrado</p>
            </div>
          )}
        </Reorder.Group>
      </div>

      {/* MODAL CRIAR/EDITAR */}
      <FichaModal isOpen={!!modalItem} onClose={fecharModal} title={ehNovo ? 'Novo Poder' : 'Editar Poder'}>
        {modalItem && (
          <div className="flex flex-col gap-4">
            <LabeledInput label="Nome" value={modalItem.nome} onChange={(v: string) => atualizarCampoModal('nome', v)} placeholder="Ex.: Lâmina Espectral" />

            <div className="grid grid-cols-2 gap-4">
              <LabeledModalSelect
                label="Tipo"
                value={modalItem.tipo}
                options={TIPOS_PODER}
                onChange={(v: string) => atualizarCampoModal('tipo', v)}
              />
              <LabeledInput label="Fonte" value={modalItem.fonte} onChange={(v: string) => atualizarCampoModal('fonte', v)} placeholder="Ex.: Árvore, Raça, Classe..." />
            </div>

            <LabeledInput label="Nível Adquirido" value={modalItem.nivelAdquirido} onChange={(v: string) => atualizarCampoModal('nivelAdquirido', v)} placeholder="Ex.: 1" />

            <div className="grid grid-cols-2 gap-4">
              <LabeledModalSelect
                label="Recurso do Custo"
                value={modalItem.custo.recurso}
                options={RECURSOS_CUSTO}
                onChange={(v: string) => atualizarCustoModal('recurso', v)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Valor do Custo</label>
                <input
                  type="number"
                  min={0}
                  value={modalItem.custo.valor}
                  onChange={(e) => atualizarCustoModal('valor', Math.max(0, Number(e.target.value) || 0))}
                  className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <LabeledInput label="Ação" value={modalItem.acao} onChange={(v: string) => atualizarCampoModal('acao', v)} placeholder="Ação padrão..." />
              <LabeledInput label="Duração" value={modalItem.duracao} onChange={(v: string) => atualizarCampoModal('duracao', v)} placeholder="Instantânea..." />
              <LabeledInput label="Alcance" value={modalItem.alcance} onChange={(v: string) => atualizarCampoModal('alcance', v)} placeholder="Pessoal, 9m..." />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
              <textarea
                value={modalItem.descricao}
                onChange={(e) => atualizarCampoModal('descricao', e.target.value)}
                rows={4}
                className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors resize-none"
                placeholder="Descreva o efeito do poder..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={fecharModal}
                className="px-5 py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={!modalItem.nome.trim()}
                className="px-5 py-2.5 rounded-lg bg-[#c7a44c] text-black hover:bg-[#d4af37] transition-colors text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </FichaModal>
    </div>
  );
};
