import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Heart, Shield, Footprints, Zap, Sword, Pencil, Trash2, AlertTriangle, Link, GripVertical, Star, ExternalLink, Droplet, Plus, X, Coins, Share2, Check } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { personagensApi, type AliadoComplexoResumo } from '../../../services/personagensApi';
import { bonusIniciativaFicha, obterStatusFicha, penalidadeCansacoIniciativa, penalidadeIniciativaCondicoes } from '../../../services/statusService';
import { useCampaignSSE } from '../../../hooks/useCampaignSSE';
import { mesclarOrdemFiltrada } from '../../../services/listOrderingService';
import { getCurrencySymbol, type MoedaTipo } from '../../../services/lojaCatalogService';
import { EditorEfeitos, resumoEfeitoEquipamento } from '../components/ItemEffectsModals';
import { EFEITOS_FICHA_MAXIMOS, normalizarEfeitosFicha, type IEfeitoEquipamento } from '../../../services/equipamentoService';
import { PERICIAS_CATALOGO } from '../../../services/catalogoService';
import { periciasDisponiveisParaEfeitos } from '../../../services/periciasFichaService';
import { Select } from '../../../components/ui/Select';

interface IAliado {
  id: string;
  nome: string;
  categoria: 'comum' | 'complexo';
  personagemId?: string; // Para aliado complexo
  personagensVinculados?: string[];
  especieTipo: string;
  papel: string;
  nivel: number;
  vidaAtual: number;
  vidaMaxima: number;
  defesa: number;
  movimento: string;
  iniciativa: number;
  ataquePrincipal: string;
  /** Ataques além do principal - o card mostra a lista inteira, um por linha,
   * mas o campo antigo `ataquePrincipal` continua existindo sozinho porque o
   * backend grava só ele quando o aliado nasce de uma compra na Loja
   * (ver shop.py) e um teste de mestre já trava esse contrato. */
  ataquesAdicionais?: string[];
  condicoes: string;
  observacoes: string;
  emCena: boolean;
  ordem?: number;
  favorito?: boolean;
  /** Só existe em aliado nascido de compra na Loja (categoria Mercenários):
   * 'comprado' é servo/escravo permanente (sem mensalidade); 'contratado'
   * gera uma mensalidade que a mesa cobra fora do sistema, como a
   * manutenção de Bens. Ver _mercenary_ally_from_catalog_item no backend. */
  vinculo?: 'comprado' | 'contratado';
  mensalidade?: { moeda: string; valor: number } | null;
  mercenarioCatalogoId?: string;
  /** Carteira simples do aliado: sem histórico nem extrato, o jogador ou o
   * Mestre ajusta o saldo direto aqui - bem mais simples que `carteira` do
   * personagem em AbaInventario, que tem extrato e é a carteira do jogador. */
  carteira?: Array<{ moeda: MoedaTipo; saldo: number }>;
  efeitos?: IEfeitoEquipamento[];
  compartilhadoDe?: string;
  compartilhadoDeNome?: string;
  somenteLeitura?: boolean;
}

type FormAliado = Omit<IAliado, 'id'>;

const gerarIdAliado = () =>
  `aliado-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const ALIADO_VAZIO: FormAliado = {
  nome: '',
  categoria: 'comum',
  personagemId: '',
  personagensVinculados: [],
  especieTipo: '',
  papel: '',
  nivel: 1,
  vidaAtual: 10,
  vidaMaxima: 10,
  defesa: 10,
  movimento: '',
  iniciativa: 0,
  ataquePrincipal: '',
  ataquesAdicionais: [],
  condicoes: '',
  observacoes: '',
  emCena: true,
  ordem: 0,
  favorito: false,
  carteira: [],
  efeitos: [],
};

const MOEDAS: MoedaTipo[] = ['Lunaris', 'Solares', 'Fragmentos de Estrela', 'Créditos Sombrios'];

const sinal = (valor: number) => (valor >= 0 ? `+${valor}` : `${valor}`);

export const AbaAliados = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<FormAliado>(ALIADO_VAZIO);
  const [resumosComplexos, setResumosComplexos] = useState<Record<string, AliadoComplexoResumo>>({});
  const [erroVinculos, setErroVinculos] = useState('');
  const [buscaCompartilhamento, setBuscaCompartilhamento] = useState('');

  const personagens = useCharacterStore((s) => s.characters);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);
  const carregandoPersonagens = useCharacterStore((s) => s.isLoading);
  const erroPersonagens = useCharacterStore((s) => s.error);
  const usuario = useAuthStore((s) => s.usuario);
  const campanha = useAuthStore((s) => s.campanhaAtiva);
  const isMestre = usuario?.papel_plataforma === 'admin'
    || usuario?.papel_plataforma === 'criador'
    || campanha?.papel === 'mestre'
    || campanha?.papel === 'assistente';

  const itensLocais: IAliado[] = character.ficha?.aliados || [];
  const itensCompartilhados: IAliado[] = character.aliadosCompartilhados || [];
  const itens: IAliado[] = [...itensLocais, ...itensCompartilhados];
  const periciasDisponiveis = useMemo(
    () => periciasDisponiveisParaEfeitos(character.ficha || {}, PERICIAS_CATALOGO),
    [character.ficha],
  );
  const idsComplexos = itens
    .filter((item) => item.categoria === 'complexo' && item.personagemId)
    .map((item) => String(item.personagemId));
  const chaveVinculos = [...idsComplexos].sort().join('|');

  // Uma navegação direta para /ficha/:id carrega somente a ficha aberta.
  // Os seletores de vínculo precisam da lista completa da campanha, que a
  // página de listagem normalmente já teria carregado antes da navegação.
  useEffect(() => {
    // A lista já costuma vir carregada da tela de listagem; só busca de novo
    // se o store ainda estiver vazio, para não repetir a busca a cada troca
    // de aba (Aliados desmonta/remonta junto com a troca de aba ativa).
    if (isMestre && campanha?.id && personagens.length === 0) void fetchCharacters();
  }, [campanha?.id, fetchCharacters, isMestre, personagens.length]);

  const carregarVinculos = useCallback(async () => {
    if (!character.id || !chaveVinculos) {
      setResumosComplexos({});
      setErroVinculos('');
      return;
    }
    try {
      const response = await personagensApi.listarAliadosComplexos(character.id);
      setResumosComplexos(Object.fromEntries(
        (response.aliados || []).map((resumo) => [resumo.personagem_id, resumo]),
      ));
      setErroVinculos('');
    } catch (error) {
      setErroVinculos(error instanceof Error ? error.message : 'Não foi possível sincronizar os aliados vinculados.');
    }
  }, [character.id, chaveVinculos]);

  useEffect(() => {
    void carregarVinculos();
  }, [carregarVinculos]);

  useCampaignSSE(campanha?.id, (tipo, payload) => {
    if (tipo !== 'personagem_atualizado') return;
    const personagemId = String(payload.personagem_id || '');
    if (personagemId === character.id) void fetchCharacters();
    if (!personagemId || personagemId === character.id || idsComplexos.includes(personagemId)) {
      void carregarVinculos();
    }
  });

  const itensVisiveis = itens
    .filter((a) => !busca || a.nome?.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  const emCenaCount = itens.filter((a) => a.emCena).length;

  const commit = (novaLista: IAliado[]) => {
    onUpdate(['ficha', 'aliados'], novaLista);
  };

  const handleReorder = (novosItens: IAliado[]) => {
    const novosLocais = novosItens.filter((item) => !item.somenteLeitura && !item.compartilhadoDe);
    commit(mesclarOrdemFiltrada(itensLocais, novosLocais));
  };

  const toggleFavorito = (id: string) => {
    const alvo = itensLocais.find(a => a.id === id);
    if (!alvo || alvo.somenteLeitura || alvo.compartilhadoDe || (!isMestre && alvo.personagensVinculados?.length)) return;
    let modificada = itensLocais.map(a => a.id === id ? { ...a, favorito: !a.favorito } : a);
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
    setBuscaCompartilhamento('');
    setModalAberto(true);
  };

  const abrirEdicao = (aliado: IAliado) => {
    if (aliado.somenteLeitura || aliado.compartilhadoDe || (!isMestre && aliado.personagensVinculados?.length)) return;
    setEditandoId(aliado.id);
    setForm({ ...ALIADO_VAZIO, ...aliado });
    setBuscaCompartilhamento('');
    setModalAberto(true);
  };

  const fecharModal = () => setModalAberto(false);

  const handleSalvar = () => {
    if (!form.nome?.trim() && form.categoria !== 'complexo') return;
    if (form.categoria === 'complexo' && !form.personagemId) return;
    if (form.categoria === 'complexo' && !isMestre) return;

    const vinculado = form.categoria === 'complexo' ? personagens.find(p => p.id === form.personagemId) : null;
    const nomeFinal = form.categoria === 'complexo' ? (vinculado?.nome || 'Personagem Desconhecido') : form.nome.trim();

    const vidaMaxima = Math.max(1, Math.trunc(Number(form.vidaMaxima) || 1));
    const vidaAtual = Math.max(0, Math.min(vidaMaxima, Math.trunc(Number(form.vidaAtual) || 0)));

    // Preserva vínculo/mensalidade/origem de catálogo do aliado original -
    // esses campos não têm campo no formulário e seriam apagados silenciosamente
    // ao editar nome, vida etc. de um mercenário comprado ou contratado.
    const original = editandoId ? itensLocais.find((a) => a.id === editandoId) : undefined;
    const personagensVinculados = [...new Set(form.personagensVinculados || [])]
      .filter((id) => id !== character.id && id !== form.personagemId);

    const normalizado: IAliado = {
      ...original,
      id: editandoId || gerarIdAliado(),
      nome: nomeFinal,
      categoria: form.categoria,
      personagemId: form.categoria === 'complexo' ? form.personagemId : undefined,
      personagensVinculados: isMestre
        ? personagensVinculados
        : (original?.personagensVinculados || []),
      especieTipo: form.especieTipo?.trim() || '',
      papel: form.papel?.trim() || '',
      nivel: Math.max(0, Math.trunc(Number(form.nivel) || 0)),
      vidaAtual,
      vidaMaxima,
      defesa: Math.trunc(Number(form.defesa) || 0),
      movimento: form.movimento?.trim() || '',
      iniciativa: Math.trunc(Number(form.iniciativa) || 0),
      ataquePrincipal: form.ataquePrincipal?.trim() || '',
      ataquesAdicionais: (form.ataquesAdicionais || []).map((a) => a.trim()).filter(Boolean),
      condicoes: form.condicoes?.trim() || '',
      observacoes: form.observacoes?.trim() || '',
      emCena: !!form.emCena,
      carteira: (form.carteira || []).filter((item) => item.moeda && Number.isFinite(item.saldo)),
      efeitos: normalizarEfeitosFicha(form.efeitos),
    };

    if (editandoId) {
      commit(itensLocais.map((a) => (a.id === editandoId ? normalizado : a)));
    } else {
      commit([...itensLocais, normalizado]);
    }
    setModalAberto(false);
  };

  const handleExcluir = (aliado: IAliado) => {
    if (aliado.somenteLeitura || aliado.compartilhadoDe || (!isMestre && aliado.personagensVinculados?.length)) return;
    if (!window.confirm(`Remover o aliado "${aliado.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    commit(itensLocais.filter((a) => a.id !== aliado.id));
  };

  const handleAjustarVida = (aliado: IAliado, delta: number) => {
    if (aliado.somenteLeitura || aliado.compartilhadoDe || (!isMestre && aliado.personagensVinculados?.length)) return;
    if (aliado.categoria === 'complexo') {
      alert("A vida de aliados complexos é sincronizada com a ficha deles. Modifique na ficha original.");
      return;
    }
    const maxima = aliado.vidaMaxima || 1;
    const novaVida = Math.max(0, Math.min(maxima, (aliado.vidaAtual || 0) + delta));
    if (novaVida === aliado.vidaAtual) return;
    commit(itensLocais.map((a) => (a.id === aliado.id ? { ...a, vidaAtual: novaVida } : a)));
  };

  const handleToggleCena = (aliado: IAliado) => {
    if (aliado.somenteLeitura || aliado.compartilhadoDe || (!isMestre && aliado.personagensVinculados?.length)) return;
    commit(itensLocais.map((a) => (a.id === aliado.id ? { ...a, emCena: !a.emCena } : a)));
  };

  const filtrarPersonagens = (texto: string, excluir: string[] = []) => {
    const termo = texto.trim().toLocaleLowerCase('pt-BR');
    return personagens.filter((personagem) => (
      !excluir.includes(personagem.id)
      && (!termo || personagem.nome?.toLocaleLowerCase('pt-BR').includes(termo))
    ));
  };
  const opcoesFichaBase = filtrarPersonagens('', [character.id]);
  const opcoesCompartilhamento = filtrarPersonagens(
    buscaCompartilhamento,
    [
      character.id,
      ...(form.categoria === 'complexo' && form.personagemId ? [form.personagemId] : []),
    ],
  );
  const selecionarFichaBase = (personagemId: string) => {
    setForm((atual) => ({
      ...atual,
      personagemId,
      personagensVinculados: (atual.personagensVinculados || []).filter((id) => id !== personagemId),
    }));
  };
  const alternarCompartilhamento = (personagemId: string) => {
    const atuais = form.personagensVinculados || [];
    setCampo(
      'personagensVinculados',
      atuais.includes(personagemId)
        ? atuais.filter((id) => id !== personagemId)
        : [...atuais, personagemId],
    );
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" data-tour="aliados-resumo">
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
      <div className="flex gap-4" data-tour="aliados-ferramentas">
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

      {erroVinculos && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>Não foi possível sincronizar uma ficha vinculada. {erroVinculos}</span>
        </div>
      )}

      {/* LISTA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4" data-tour="aliados-lista">
        <Reorder.Group axis="y" values={itensVisiveis} onReorder={handleReorder} className="flex flex-col gap-4">
          {itensVisiveis.map((a) => {
            const isComplexo = a.categoria === 'complexo';
            const isCompartilhado = !!a.somenteLeitura || !!a.compartilhadoDe;
            const controladoPeloMestre = !isMestre && (a.personagensVinculados?.length || 0) > 0;
            const bloqueado = isCompartilhado || controladoPeloMestre;
            const charVinculado = isComplexo ? personagens.find(p => p.id === a.personagemId) : null;
            const resumoVinculado = isComplexo && a.personagemId ? resumosComplexos[a.personagemId] : null;
            const fichaVinculada = charVinculado?.ficha || {};
            const statusVinculado = obterStatusFicha(fichaVinculada);
            const vidaMaximaVinculada = Number(charVinculado?.derivados?.vida ?? fichaVinculada?.derivados?.vida) || 1;
            const iniciativaBaseVinculada = Number(charVinculado?.derivados?.iniciativa ?? fichaVinculada?.derivados?.iniciativa) || 0;
            
            // Sync status ao vivo se complexo
            const vidaAtual = isComplexo
              ? Number(resumoVinculado?.vida_atual ?? statusVinculado.vidaAtual ?? vidaMaximaVinculada)
              : a.vidaAtual;
            const vidaMaxima = isComplexo
              ? Number(resumoVinculado?.vida_maxima ?? vidaMaximaVinculada)
              : a.vidaMaxima;
            const nomeExibicao = isComplexo ? (resumoVinculado?.nome || charVinculado?.nome || a.nome) : a.nome;
            const iniciativa = isComplexo
              ? resumoVinculado?.iniciativa ?? (
                iniciativaBaseVinculada
                  + bonusIniciativaFicha(fichaVinculada)
                  + penalidadeCansacoIniciativa(statusVinculado.cansacoAtual)
                  + penalidadeIniciativaCondicoes(fichaVinculada.condicoesAtivas)
              )
              : a.iniciativa;
            const manaAtual = Number(resumoVinculado?.mana_atual ?? statusVinculado.manaAtual ?? charVinculado?.derivados?.mana) || 0;
            const manaMaxima = Number(resumoVinculado?.mana_maxima ?? charVinculado?.derivados?.mana ?? fichaVinculada?.derivados?.mana) || 0;
            const defesaVinculada = Number(resumoVinculado?.defesa ?? charVinculado?.derivados?.defesaNatural ?? fichaVinculada?.derivados?.defesaNatural) || 0;
            const movimentoBruto = resumoVinculado?.movimento ?? charVinculado?.derivados?.movimento ?? fichaVinculada?.derivados?.movimento ?? 9;
            const movimentoVinculado = typeof movimentoBruto === 'number' ? `${movimentoBruto}m` : String(movimentoBruto);

            const percentVida = Math.min(100, Math.max(0, ((vidaAtual || 0) / (vidaMaxima || 1)) * 100));

            return (
              <Reorder.Item
                value={a}
                key={`${a.compartilhadoDe || 'local'}:${a.id}`}
                data-tour="aliado-cartao"
                dragListener={!isCompartilhado}
                className={`bg-[#121118] border rounded-xl p-5 flex flex-col gap-4 transition-all group relative ${
                  isComplexo ? (a.favorito ? 'border-[#c7a44c]/50 shadow-[0_0_15px_rgba(199,164,76,0.15)]' : 'border-[#c7a44c]/30 shadow-[0_0_15px_rgba(199,164,76,0.05)]') : (a.favorito ? 'border-yellow-600/50 shadow-[0_0_15px_rgba(202,138,4,0.15)]' : 'border-white/5 hover:border-[#c7a44c]/30')
                } ${!a.emCena ? 'opacity-60 saturate-50 hover:opacity-100 hover:saturate-100' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4 items-start">
                    <div className="flex flex-col gap-2 items-center flex-shrink-0">
                      <div className="flex gap-1 mb-1">
                        <button disabled={bloqueado} onClick={() => toggleFavorito(a.id)} className={`transition-colors disabled:cursor-default ${a.favorito ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-gray-600 hover:text-gray-400'}`}>
                          <Star size={16} fill={a.favorito ? 'currentColor' : 'none'} />
                        </button>
                        <div className={`${isCompartilhado ? 'cursor-default opacity-30' : 'cursor-grab active:cursor-grabbing'} text-gray-600 hover:text-gray-400 p-0.5`}>
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
                        {a.vinculo === 'contratado' && (
                          <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/30 text-emerald-400 uppercase font-bold tracking-wider">
                            Contratado{a.mensalidade ? ` · ${a.mensalidade.valor.toLocaleString('pt-BR')} ${getCurrencySymbol(a.mensalidade.moeda as MoedaTipo)}/mês` : ''}
                          </span>
                        )}
                        {a.vinculo === 'comprado' && (
                          <span className="text-[10px] px-2 py-0.5 bg-red-500/10 rounded border border-red-500/30 text-red-400 uppercase font-bold tracking-wider">
                            Servo/Escravo
                          </span>
                        )}
                        {isCompartilhado && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-sky-500/10 rounded border border-sky-500/30 text-sky-300 font-bold uppercase tracking-wider">
                            <Share2 size={10} /> Compartilhado por {a.compartilhadoDeNome || 'outra ficha'}
                          </span>
                        )}
                        {!isCompartilhado && (a.personagensVinculados?.length || 0) > 0 && (
                          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-sky-500/10 rounded border border-sky-500/30 text-sky-300 font-bold uppercase tracking-wider">
                            <Share2 size={10} /> {a.personagensVinculados?.length} ficha(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 shrink-0 transition-opacity ${isComplexo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    {isComplexo && a.personagemId && (
                      <button
                        onClick={() => navigate(`/ficha/${a.personagemId}`)}
                        className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 text-[#c7a44c] hover:bg-[#c7a44c]/10 hover:border-[#c7a44c]/30 flex items-center justify-center transition-colors mr-1"
                        title={isMestre ? 'Abrir ficha vinculada' : 'Abrir ficha vinculada em modo somente leitura'}
                        aria-label={`Abrir ficha de ${nomeExibicao || 'aliado vinculado'}`}
                      >
                        <ExternalLink size={14} />
                      </button>
                    )}
                    {!bloqueado && (!isComplexo || isMestre) && (
                      <>
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
                      </>
                    )}
                  </div>
                </div>

                {/* VIDA */}
                <div className="flex flex-col gap-1.5" data-tour="aliado-recursos">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-red-400 flex items-center gap-1">
                      <Heart size={12} /> Vida {isComplexo && '(Sincronizada)'}
                    </span>
                    <span className="text-xs font-mono text-gray-300">{vidaAtual} / {vidaMaxima}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isComplexo && !bloqueado && (
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
                    {!isComplexo && !bloqueado && (
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
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-[#c7a44c]/10 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5 border border-[#c7a44c]/20">
                      <span className="text-[9px] uppercase text-[#c7a44c] font-bold tracking-widest flex items-center gap-1"><Droplet size={10} /> Mana</span>
                      <span className="text-xs font-mono text-[#c7a44c]">{manaAtual} / {manaMaxima}</span>
                    </div>
                    <div className="bg-[#c7a44c]/10 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5 border border-[#c7a44c]/20">
                      <span className="text-[9px] uppercase text-[#c7a44c] font-bold tracking-widest flex items-center gap-1"><Shield size={10} /> Def</span>
                      <span className="text-xs font-mono text-[#c7a44c]">{defesaVinculada}</span>
                    </div>
                    <div className="bg-[#c7a44c]/10 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5 border border-[#c7a44c]/20">
                      <span className="text-[9px] uppercase text-[#c7a44c] font-bold tracking-widest flex items-center gap-1"><Footprints size={10} /> Mov</span>
                      <span className="text-xs font-mono text-[#c7a44c]">{movimentoVinculado}</span>
                    </div>
                    <div className="bg-[#c7a44c]/10 rounded-lg py-2 px-1 flex flex-col items-center gap-0.5 border border-[#c7a44c]/20">
                      <span className="text-[9px] uppercase text-[#c7a44c] font-bold tracking-widest flex items-center gap-1"><Zap size={10} /> Inic</span>
                      <span className="text-xs font-mono text-[#c7a44c]">{sinal(iniciativa)}</span>
                    </div>
                  </div>
                )}

                {/* ATAQUES */}
                {!isComplexo && [a.ataquePrincipal, ...(a.ataquesAdicionais || [])].filter(Boolean).length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {[a.ataquePrincipal, ...(a.ataquesAdicionais || [])].filter(Boolean).map((ataque, index) => (
                      <div key={`${a.id}-ataque-${index}`} className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 rounded-lg px-3 py-2">
                        <Sword size={14} className="text-[#c7a44c] shrink-0" />
                        <span className="truncate">{ataque}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* CARTEIRA */}
                {!isComplexo && (a.carteira || []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(a.carteira || []).map((moeda) => (
                      <div key={moeda.moeda} className="flex items-center gap-1.5 bg-black/20 rounded-lg px-3 py-1.5 text-xs">
                        <Coins size={12} className="text-[#c7a44c] shrink-0" />
                        <span className="font-mono text-gray-300">{moeda.saldo.toLocaleString('pt-BR')}</span>
                        <span className="text-gray-500">{getCurrencySymbol(moeda.moeda)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* BENEFÍCIOS NA FICHA */}
                {(a.efeitos || []).length > 0 && (
                  <div className="rounded-lg border border-[#c7a44c]/15 bg-[#c7a44c]/5 p-3" data-tour="aliado-beneficios">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#c7a44c]">
                      Benefícios {a.emCena ? 'ativos na ficha' : 'inativos · fora de cena'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(a.efeitos || []).map((efeito) => (
                        <span key={efeito.id} className="rounded-lg border border-[#c7a44c]/20 bg-black/20 px-2.5 py-1 text-xs font-bold text-[#c7a44c]">
                          {resumoEfeitoEquipamento(efeito, periciasDisponiveis)}
                        </span>
                      ))}
                    </div>
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

                <div className="flex justify-between items-center mt-auto pt-3 border-t border-white/5" data-tour="aliado-cena">
                  <button
                    onClick={() => handleToggleCena(a)}
                    disabled={bloqueado}
                    title={bloqueado ? 'O Mestre controla o estado deste aliado compartilhado' : undefined}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-colors flex items-center gap-2 ${
                      a.emCena
                        ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20'
                        : 'bg-black/40 border-white/10 text-gray-500 hover:text-gray-300 hover:bg-white/5'
                    } disabled:cursor-not-allowed disabled:opacity-70`}
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
        size="lg"
      >
        <div className="flex flex-col gap-4">
          
          <div className="flex gap-2 p-1 bg-black/40 border border-white/5 rounded-xl">
            <button
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${form.categoria === 'comum' ? 'bg-[#c7a44c] text-black' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setCampo('categoria', 'comum')}
            >
              Aliado Simples
            </button>
            {isMestre && (
              <button
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center items-center gap-2 ${form.categoria === 'complexo' ? 'bg-[#c7a44c] text-black' : 'text-gray-400 hover:text-white'}`}
                onClick={() => setCampo('categoria', 'complexo')}
              >
                <Link size={14} /> Vínculo Complexo
              </button>
            )}
          </div>

          {form.categoria === 'complexo' ? (
            <div className="flex flex-col gap-4 py-2 border-y border-white/5 my-2">
              <p className="text-xs text-[#c7a44c] bg-[#c7a44c]/10 p-3 rounded-lg border border-[#c7a44c]/20">
                Escolha somente a ficha que fornece Vida, Mana, Defesa, Movimento e Iniciativa ao aliado complexo. Este campo não compartilha o aliado; o compartilhamento com uma ou várias fichas é feito apenas no bloco azul abaixo.
              </p>
              <div className="flex flex-col gap-1">
                <label htmlFor="aliado-ficha-base" className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Ficha-base sincronizada (não compartilha)</label>
                <Select
                  id="aliado-ficha-base"
                  ariaLabel="Ficha-base sincronizada"
                  value={form.personagemId || ''}
                  onChange={selecionarFichaBase}
                  disabled={carregandoPersonagens}
                  placeholder={carregandoPersonagens ? 'Carregando fichas...' : 'Selecione a ficha que representa o aliado'}
                  options={[
                    ...(form.personagemId && !opcoesFichaBase.some((personagem) => personagem.id === form.personagemId)
                      ? [{ value: form.personagemId, label: `${form.nome || 'Ficha vinculada'} (indisponível)`, disabled: true }]
                      : []),
                    ...opcoesFichaBase.map((personagem) => ({ value: personagem.id, label: personagem.nome })),
                  ]}
                  className="mt-1 w-full rounded-lg border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none transition-colors focus:border-[#c7a44c]/50 disabled:cursor-wait disabled:opacity-60"
                />
                {!carregandoPersonagens && erroPersonagens && (
                  <div role="alert" className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                    <span>Não foi possível carregar as fichas: {erroPersonagens}</span>
                    <button type="button" onClick={() => void fetchCharacters()} className="shrink-0 font-bold underline underline-offset-2 hover:text-white">Tentar novamente</button>
                  </div>
                )}
                {!carregandoPersonagens && !erroPersonagens && opcoesFichaBase.length === 0 && !form.personagemId && (
                  <p className="mt-2 rounded-lg border border-dashed border-white/5 py-3 text-center text-xs text-gray-600">Nenhuma ficha-base disponível.</p>
                )}
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

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Ataques</label>
                {[form.ataquePrincipal, ...(form.ataquesAdicionais || [])].map((ataque, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      aria-label={`Ataque ${index + 1}`}
                      type="text"
                      value={ataque}
                      onChange={(e) => {
                        const valor = e.target.value;
                        if (index === 0) { setCampo('ataquePrincipal', valor); return; }
                        const extras = [...(form.ataquesAdicionais || [])];
                        extras[index - 1] = valor;
                        setCampo('ataquesAdicionais', extras);
                      }}
                      placeholder="Ex.: Mordida +4, 1d8+2"
                      className="w-full min-w-0 bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors placeholder:text-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (index === 0) {
                          const extras = form.ataquesAdicionais || [];
                          setCampo('ataquePrincipal', extras[0] || '');
                          setCampo('ataquesAdicionais', extras.slice(1));
                          return;
                        }
                        const extras = [...(form.ataquesAdicionais || [])];
                        extras.splice(index - 1, 1);
                        setCampo('ataquesAdicionais', extras);
                      }}
                      className="shrink-0 w-9 h-9 rounded-lg bg-black/40 border border-white/5 text-gray-500 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors"
                      aria-label="Remover ataque"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCampo('ataquesAdicionais', [...(form.ataquesAdicionais || []), ''])}
                  className="self-start flex items-center gap-1.5 text-xs font-bold text-[#c7a44c] hover:text-[#e0be6c] transition-colors"
                >
                  <Plus size={14} /> Adicionar ataque
                </button>
              </div>

              <LabeledInput label="Condições" value={form.condicoes} placeholder="Ex.: Envenenado, oculto..." onChange={(v: string) => setCampo('condicoes', v)} />

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Carteira (Opcional)</label>
                {(form.carteira || []).map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      ariaLabel="Moeda"
                      value={item.moeda}
                      onChange={(valor) => {
                        const nova = [...(form.carteira || [])];
                        nova[index] = { ...nova[index], moeda: valor as MoedaTipo };
                        setCampo('carteira', nova);
                      }}
                      options={MOEDAS.map((moeda) => ({ value: moeda, label: moeda }))}
                      className="shrink-0 bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors"
                    />
                    <input
                      aria-label="Saldo"
                      type="number"
                      value={item.saldo}
                      onChange={(e) => {
                        const nova = [...(form.carteira || [])];
                        nova[index] = { ...nova[index], saldo: Number(e.target.value) || 0 };
                        setCampo('carteira', nova);
                      }}
                      className="w-full min-w-0 bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setCampo('carteira', (form.carteira || []).filter((_, i) => i !== index))}
                      className="shrink-0 w-9 h-9 rounded-lg bg-black/40 border border-white/5 text-gray-500 hover:text-red-400 hover:border-red-500/30 flex items-center justify-center transition-colors"
                      aria-label="Remover moeda"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCampo('carteira', [...(form.carteira || []), { moeda: 'Lunaris' as MoedaTipo, saldo: 0 }])}
                  className="self-start flex items-center gap-1.5 text-xs font-bold text-[#c7a44c] hover:text-[#e0be6c] transition-colors"
                >
                  <Plus size={14} /> Adicionar moeda
                </button>
              </div>
            </>
          )}

          {isMestre && (
            <div className="flex flex-col gap-3 rounded-xl border border-sky-500/15 bg-sky-500/5 p-4">
              <div className="flex items-start gap-2">
                <Share2 size={16} className="mt-0.5 shrink-0 text-sky-300" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-300">Compartilhar aliado</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">Esta ficha já recebe o aliado. Marque quantas outras fichas quiser; todas verão o mesmo registro e receberão os benefícios enquanto ele estiver Em cena.</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={15} />
                <input
                  type="search"
                  value={buscaCompartilhamento}
                  onChange={(event) => setBuscaCompartilhamento(event.target.value)}
                  placeholder="Buscar fichas para compartilhar..."
                  className="w-full rounded-lg border border-white/5 bg-[#121118] py-2.5 pl-9 pr-3 text-sm text-gray-300 outline-none placeholder:text-gray-700 focus:border-sky-500/40"
                />
              </div>
              <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {opcoesCompartilhamento.map((personagem) => {
                  const selecionado = (form.personagensVinculados || []).includes(personagem.id);
                  return (
                    <button
                      key={personagem.id}
                      type="button"
                      onClick={() => alternarCompartilhamento(personagem.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${selecionado ? 'border-sky-400/50 bg-sky-500/15 text-sky-200' : 'border-white/5 bg-black/20 text-gray-400 hover:border-white/15 hover:text-white'}`}
                    >
                      <span className="truncate">{personagem.nome}</span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selecionado ? 'border-sky-300 bg-sky-300 text-black' : 'border-white/15'}`}>
                        {selecionado ? <Check size={12} /> : null}
                      </span>
                    </button>
                  );
                })}
                {carregandoPersonagens && (
                  <p className="col-span-full rounded-lg border border-dashed border-white/5 py-5 text-center text-xs text-gray-500">Carregando personagens da campanha...</p>
                )}
                {!carregandoPersonagens && erroPersonagens && (
                  <div role="alert" className="col-span-full flex flex-col items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-4 text-center text-xs text-red-300">
                    <span>Não foi possível carregar as fichas: {erroPersonagens}</span>
                    <button type="button" onClick={() => void fetchCharacters()} className="font-bold underline underline-offset-2 hover:text-white">Tentar novamente</button>
                  </div>
                )}
                {!carregandoPersonagens && !erroPersonagens && opcoesCompartilhamento.length === 0 && (
                  <p className="col-span-full rounded-lg border border-dashed border-white/5 py-5 text-center text-xs text-gray-600">Nenhuma outra ficha encontrada.</p>
                )}
              </div>
              {(form.personagensVinculados || []).length > 0 && (
                <p className="text-xs font-bold text-sky-300">{form.personagensVinculados?.length} ficha(s) selecionada(s)</p>
              )}
            </div>
          )}

          <LabeledInput label="Papel (Opcional)" value={form.papel} placeholder="Ex.: Batedor, Montaria..." onChange={(v: string) => setCampo('papel', v)} />

          <div className="rounded-xl border border-[#c7a44c]/15 bg-black/15 p-4">
            <EditorEfeitos
              efeitos={form.efeitos || []}
              onChange={(efeitos) => setCampo('efeitos', efeitos)}
              pericias={periciasDisponiveis}
              maxEfeitos={EFEITOS_FICHA_MAXIMOS}
              contexto="aliado"
              titulo="Benefícios concedidos à ficha"
            />
          </div>

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
