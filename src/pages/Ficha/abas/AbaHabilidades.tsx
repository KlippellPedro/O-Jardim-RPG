import { useRef, useState } from 'react';
import { Search, Star, Pencil, Trash2, Dices, GripVertical, Dna, Shield, Apple } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput, LabeledModalSelect } from '../components/SharedFichaComponents';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { caracteristicasRaciaisAutomaticas, habilidadesAutomaticas } from '../../../services/progressaoFichaService';
import { obterStatusFicha } from '../../../services/statusService';
import { EditorEfeitos } from '../components/ItemEffectsModals';
import { PERICIAS_CATALOGO } from '../../../services/catalogoService';
import { periciasDisponiveisParaEfeitos } from '../../../services/periciasFichaService';
import {
  EFEITOS_FICHA_MAXIMOS,
  normalizarEfeitosFicha,
  type IEfeitoEquipamento,
} from '../../../services/equipamentoService';
import { bonusRecursoDoFruto, habilidadeDoFruto } from '../../../services/frutoEdenService';
import {
  obterPersonalizacoesAutomaticas,
  salvarPersonalizacaoAutomatica,
  type IPersonalizacaoAutomatica,
} from '../../../services/personalizacaoAutomaticaService';
import { PersonalizacaoAutomaticaModal } from '../components/PersonalizacaoAutomaticaModal';
import { mesclarOrdemFiltrada } from '../../../services/listOrderingService';

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
  ordem?: number;
  favorito?: boolean;
  efeitos?: IEfeitoEquipamento[];
}

const TIPOS_HABILIDADE: TipoHabilidade[] = ['Ativa', 'Passiva', 'Reação', 'Sustentada', 'Outro'];

const RECURSOS: { value: RecursoCusto; label: string }[] = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'mana', label: 'Mana' },
  { value: 'vida', label: 'Vida' },
  { value: 'sanidade', label: 'Sanidade' },
  { value: 'cansaco', label: 'Cansaço' },
];

const TIPO_COLORS: Record<TipoHabilidade, string> = {
  Ativa: 'bg-red-500/10 border-red-500/30 text-red-400',
  Passiva: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  Reação: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  Sustentada: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  Outro: 'bg-gray-500/10 border-gray-500/30 text-gray-400'
};

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
  ordem: 0,
  favorito: false,
  efeitos: [],
});

export const AbaHabilidades = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const campanhaAtiva = useAuthStore(s => s.campanhaAtiva);
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<IHabilidade>(habilidadeVazia());
  const [erroForm, setErroForm] = useState('');

  const [usoPendenteId, setUsoPendenteId] = useState<string | null>(null);
  const usoEmAndamento = useRef(false);
  const [ultimoUsoMsg, setUltimoUsoMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [personalizando, setPersonalizando] = useState<{ id: string; titulo: string; descricao: string } | null>(null);
  const personalizacoes = obterPersonalizacoesAutomaticas(character.ficha || {});
  const periciasDisponiveis = periciasDisponiveisParaEfeitos(character.ficha || {}, PERICIAS_CATALOGO);

  const habilidades: IHabilidade[] = character.ficha?.habilidades || [];
  const habilidadesRaciais = caracteristicasRaciaisAutomaticas(character.ficha || {});
  const habilidadesClasses = habilidadesAutomaticas(character.ficha || {});
  const habilidadesFruto = habilidadeDoFruto(character.ficha || {});
  const habilidadesOficiais = [...habilidadesRaciais, ...habilidadesClasses, ...habilidadesFruto];
  const termoBusca = busca.trim().toLocaleLowerCase('pt-BR');
  const filtrarOficiais = (itens: typeof habilidadesOficiais) => itens.filter((item) => (
    !termoBusca
    || item.titulo.toLocaleLowerCase('pt-BR').includes(termoBusca)
    || item.origem.toLocaleLowerCase('pt-BR').includes(termoBusca)
  ));
  const classesPorOrigem = [...habilidadesClasses.reduce((mapa, item) => {
    const atuais = mapa.get(item.origem) || [];
    mapa.set(item.origem, [...atuais, item]);
    return mapa;
  }, new Map<string, typeof habilidadesClasses>()).entries()];
  const paletasClasse = [
    { borda: 'border-sky-400/30', fundo: 'bg-sky-500/[0.05]', texto: 'text-sky-300', selo: 'border-sky-400/30 bg-sky-500/10 text-sky-200' },
    { borda: 'border-violet-400/30', fundo: 'bg-violet-500/[0.05]', texto: 'text-violet-300', selo: 'border-violet-400/30 bg-violet-500/10 text-violet-200' },
    { borda: 'border-rose-400/30', fundo: 'bg-rose-500/[0.05]', texto: 'text-rose-300', selo: 'border-rose-400/30 bg-rose-500/10 text-rose-200' },
  ];
  const gruposOficiais = [
    ...(habilidadesRaciais.length ? [{
      id: 'raca', categoria: 'Raça', titulo: habilidadesRaciais[0].origem, itens: filtrarOficiais(habilidadesRaciais), icone: 'raca',
      paleta: { borda: 'border-emerald-400/30', fundo: 'bg-emerald-500/[0.05]', texto: 'text-emerald-300', selo: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' },
    }] : []),
    ...classesPorOrigem.map(([origem, itens], index) => ({
      id: `classe:${origem}`, categoria: 'Classe', titulo: origem, itens: filtrarOficiais(itens), icone: 'classe', paleta: paletasClasse[index % paletasClasse.length],
    })),
    ...(habilidadesFruto.length ? [{
      id: 'fruto', categoria: 'Fruto do Éden', titulo: habilidadesFruto[0].origem, itens: filtrarOficiais(habilidadesFruto), icone: 'fruto',
      paleta: { borda: 'border-amber-400/30', fundo: 'bg-amber-500/[0.05]', texto: 'text-amber-300', selo: 'border-amber-400/30 bg-amber-500/10 text-amber-200' },
    }] : []),
  ].filter((grupo) => grupo.itens.length > 0);
  const status = obterStatusFicha(character.ficha);

  const habilidadesVisiveis = habilidades
    .filter((h: IHabilidade) => !busca || h.nome?.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const handleReorder = (novosItens: IHabilidade[]) => {
    const comOrdem = mesclarOrdemFiltrada(habilidades, novosItens);
    onUpdate(['ficha', 'habilidades'], comOrdem);
  };

  const toggleFavorito = (id: string) => {
    let modificada = habilidades.map(h => h.id === id ? { ...h, favorito: !h.favorito } : h);
    const itemTarget = modificada.find(h => h.id === id);
    if (itemTarget && itemTarget.favorito) {
      modificada = [itemTarget, ...modificada.filter(h => h.id !== id)];
    }
    const comOrdem = modificada.map((item, index) => ({ ...item, ordem: index }));
    onUpdate(['ficha', 'habilidades'], comOrdem);
  };

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
    setForm({
      ...habilidadeVazia(),
      ...item,
      custo: { ...habilidadeVazia().custo, ...(item.custo || {}) },
      efeitos: normalizarEfeitosFicha(item.efeitos),
    });
    setErroForm('');
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
  };

  const abrirPersonalizacao = (item: { id: string; titulo: string; descricao: string }) => {
    setPersonalizando({ id: item.id, titulo: item.titulo, descricao: item.descricao });
  };

  const salvarPersonalizacao = (valores: IPersonalizacaoAutomatica) => {
    if (!personalizando) return;
    salvarPersonalizacaoAutomatica(onUpdate, character.ficha || {}, personalizando.id, valores);
    setPersonalizando(null);
  };

  const restaurarPersonalizacao = () => {
    if (!personalizando) return;
    salvarPersonalizacaoAutomatica(onUpdate, character.ficha || {}, personalizando.id, {});
    setPersonalizando(null);
  };

  const salvar = () => {
    const nomeLimpo = form.nome.trim();
    if (nomeLimpo.length < 2) {
      setErroForm('Informe um nome com pelo menos 2 caracteres.');
      return;
    }

    const habilidadeNormalizada = {
      ...form,
      nome: nomeLimpo,
      efeitos: normalizarEfeitosFicha(form.efeitos),
    };

    if (editandoId) {
      const novaLista = habilidades.map((h: IHabilidade) =>
        h.id === editandoId ? { ...habilidadeNormalizada, id: editandoId } : h
      );
      onUpdate(['ficha', 'habilidades'], novaLista);
    } else {
      const novoItem: IHabilidade = { ...habilidadeNormalizada, id: gerarId('habilidade') };
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
    if (usoEmAndamento.current) return;

    const recurso = item.custo?.recurso;
    const valor = item.custo?.valor || 0;
    let statusAposUso: any = null;

    if (recurso && recurso !== 'nenhum' && valor > 0) {
      const campoAtual = CAMPO_STATUS[recurso];
      const maxVida = (character.ficha?.derivados?.vida || character.derivados?.vida || 10)
        + bonusRecursoDoFruto(character.ficha, 'vidaMaxima');
      const maxMana = (character.ficha?.derivados?.mana || character.derivados?.mana || 10)
        + bonusRecursoDoFruto(character.ficha, 'manaMaxima');
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

    usoEmAndamento.current = true;
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
      mostrarUsoMsg('erro', statusAposUso
        ? 'O custo foi aplicado, mas o servidor não registrou o uso na mesa.'
        : 'Não foi possível registrar o uso na mesa.');
    } finally {
      usoEmAndamento.current = false;
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
          <span className="text-3xl font-bold text-[#c7a44c]">{habilidades.length + habilidadesOficiais.length}</span>
          <span className="text-sm text-gray-500 uppercase tracking-widest font-bold leading-tight">Habilidades<br/>Conhecidas</span>
        </div>
      </div>

      {habilidadesOficiais.length > 0 && (
        <section className="rounded-2xl border border-[#c7a44c]/20 bg-[#0f0e15] p-4">
          <div className="mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#c7a44c]">Habilidades automáticas por origem</h3>
            <p className="mt-1 text-xs text-gray-500">Cada bloco mostra de qual raça, classe ou fruto as habilidades vieram.</p>
          </div>
          <div className="space-y-4">
            {gruposOficiais.map((grupo) => (
              <section key={grupo.id} className={`rounded-xl border ${grupo.paleta.borda} ${grupo.paleta.fundo} p-3 sm:p-4`}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border ${grupo.paleta.selo}`}>
                      {grupo.icone === 'raca' ? <Dna size={17} /> : grupo.icone === 'fruto' ? <Apple size={17} /> : <Shield size={17} />}
                    </div>
                    <div>
                      <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${grupo.paleta.texto}`}>{grupo.categoria}</p>
                      <h4 className="font-bold text-white">{grupo.titulo}</h4>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${grupo.paleta.selo}`}>
                    {grupo.itens.length} {grupo.itens.length === 1 ? 'habilidade' : 'habilidades'}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {grupo.itens.map((item) => {
                    const personalizacao = personalizacoes[item.id];
                    const tituloExibido = personalizacao?.titulo || item.titulo;
                    const descricaoExibida = personalizacao?.texto || item.descricao;
                    return (
                      <article key={item.id} className="rounded-xl border border-white/5 bg-[#121118]/90 p-4 group relative">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <strong className="text-white">{tituloExibido}</strong>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${grupo.paleta.selo}`}>{grupo.categoria}</span>
                            <button
                              type="button"
                              onClick={() => abrirPersonalizacao(item)}
                              title="Editar texto"
                              className="w-6 h-6 rounded flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 opacity-100 transition-all sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            >
                              <Pencil size={12} />
                            </button>
                          </div>
                        </div>
                        {personalizacao && (
                          <span className="mt-1 inline-block text-[9px] font-black uppercase tracking-wider text-[#c7a44c]/70">Editado por você</span>
                        )}
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-400">{descricaoExibida}</p>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}

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
        <div className="mb-4 border-b border-white/5 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-300">Habilidades personalizadas</h3>
          <p className="mt-1 text-xs text-gray-600">Entradas criadas manualmente; a origem informada aparece em cada cartão.</p>
        </div>
        <Reorder.Group axis="y" values={habilidadesVisiveis} onReorder={handleReorder} className="flex flex-col gap-4">
          {habilidadesVisiveis.map((h: IHabilidade) => (
            <Reorder.Item
              value={h}
              key={h.id}
              className={`bg-[#121118] border ${h.favorito ? 'border-yellow-600/50 shadow-[0_0_15px_rgba(202,138,4,0.15)]' : 'border-white/5 hover:border-yellow-600/30'} rounded-xl p-5 transition-colors group relative`}
            >
              <div className="flex gap-4 items-start">
                <div className="flex flex-col gap-2 items-center flex-shrink-0">
                  <div className="flex gap-1 mb-1">
                    <button onClick={() => toggleFavorito(h.id)} className={`transition-colors ${h.favorito ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
                      <Star size={16} fill={h.favorito ? 'currentColor' : 'none'} />
                    </button>
                    <div className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 p-0.5">
                      <GripVertical size={16} />
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-black/50 border flex items-center justify-center ${h.favorito ? 'border-yellow-600/50 text-yellow-500' : 'border-white/5 text-yellow-600'}`}>
                    <Star size={18} fill={h.favorito ? 'currentColor' : 'none'} />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="text-white font-bold text-lg mb-1">{h.nome || 'Habilidade Desconhecida'}</h4>
                    <div className="flex items-center gap-1.5 flex-shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
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
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-bold tracking-wider uppercase ${TIPO_COLORS[h.tipo] || TIPO_COLORS['Outro']}`}>
                      {h.tipo || 'Ativa'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] rounded font-bold uppercase tracking-wider">
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
                    {h.efeitos && h.efeitos.length > 0 ? (
                      <span className="flex items-center gap-1 rounded border border-purple-500/30 bg-purple-900/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        Efeitos: {h.efeitos.length}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{h.descricao || 'Sem descrição cadastrada.'}</p>

                  {h.tipo !== 'Passiva' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => usar(h)}
                        disabled={usoPendenteId !== null}
                        className="px-4 py-2 rounded-lg bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 hover:scale-105 flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Dices size={14} /> {usoPendenteId === h.id ? 'Usando...' : 'Usar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Reorder.Item>
          ))}
          {habilidadesVisiveis.length === 0 && (
            <div className="py-12 text-center">
              <Star size={48} className="text-gray-700 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhuma Habilidade Encontrada</p>
            </div>
          )}
        </Reorder.Group>
      </div>

      {/* MODAL DE CRIAR/EDITAR */}
      <FichaModal
        isOpen={modalAberto}
        onClose={fecharModal}
        title={editandoId ? 'Editar Habilidade' : 'Nova Habilidade'}
        size="xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Esquerda */}
          <div className="flex flex-col gap-4">
            <LabeledInput
              label="Nome"
              value={form.nome}
              placeholder="Nome da habilidade"
              onChange={(v: string) => setForm({ ...form, nome: v })}
            />

            <div className="grid grid-cols-2 gap-4">
              <LabeledInput
                label="Origem"
                value={form.origem}
                placeholder="Ex.: Raça, Talento..."
                onChange={(v: string) => setForm({ ...form, origem: v })}
              />
              <LabeledModalSelect
                label="Tipo"
                value={form.tipo}
                options={TIPOS_HABILIDADE.map(t => ({ value: t, label: t }))}
                onChange={(v: string) => setForm({ ...form, tipo: v as TipoHabilidade })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LabeledInput
                label="Nível Adquirido"
                value={String(form.nivelAdquirido ?? 0)}
                placeholder="0"
                onChange={(v: string) => setForm({ ...form, nivelAdquirido: Math.max(0, Math.trunc(Number(v) || 0)) })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LabeledModalSelect
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LabeledInput
                label="Ação"
                value={form.acao}
                placeholder="Ex.: Ação padrão..."
                onChange={(v: string) => setForm({ ...form, acao: v })}
              />
              <LabeledInput
                label="Duração"
                value={form.duracao}
                placeholder="Ex.: Instantânea..."
                onChange={(v: string) => setForm({ ...form, duracao: v })}
              />
              <LabeledInput
                label="Alcance"
                value={form.alcance}
                placeholder="Ex.: Pessoal..."
                onChange={(v: string) => setForm({ ...form, alcance: v })}
              />
            </div>
          </div>

          {/* Direita */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={e => setForm({ ...form, descricao: e.target.value })}
                rows={4}
                placeholder="Descreva o efeito e as condições de uso."
                className="bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700 resize-none h-32"
              />
            </div>

            <div className="pt-2 flex-1">
              <EditorEfeitos
                efeitos={form.efeitos || []}
                onChange={(efeitos) => setForm((atual) => ({ ...atual, efeitos }))}
                pericias={periciasDisponiveis}
                maxEfeitos={EFEITOS_FICHA_MAXIMOS}
                contexto="habilidade"
              />
            </div>
          </div>

          {erroForm && (
            <div className="lg:col-span-2 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {erroForm}
            </div>
          )}

          <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t border-white/5">
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

      {/* MODAL DE PERSONALIZAR TEXTO AUTOMÁTICO */}
      <PersonalizacaoAutomaticaModal
        isOpen={!!personalizando}
        onClose={() => setPersonalizando(null)}
        tituloOriginal={personalizando?.titulo || ''}
        textoOriginal={personalizando?.descricao || ''}
        personalizacao={personalizando ? personalizacoes[personalizando.id] : undefined}
        onSalvar={salvarPersonalizacao}
        onRestaurar={restaurarPersonalizacao}
      />
    </div>
  );
};
