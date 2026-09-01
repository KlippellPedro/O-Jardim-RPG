import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Car, Fuel, Shield, Heart, Users, Package, Share2, ArrowUpRight,
  Pencil, Trash2, CheckCircle2, Circle, ChevronDown, ChevronRight,
  Zap, Globe, Lock, Upload, Plus, Minus, KeyRound
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  veiculosCampanhaApi,
  type ICampanhaVeiculoResumo,
  type ICampanhaVeiculo,
  type ICampanhaVeiculoInput,
} from '../../../services/veiculosCampanhaApi';
import { personagensApi } from '../../../services/personagensApi';
import { useCampaignSSE } from '../../../hooks/useCampaignSSE';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { Select } from '../../../components/ui/Select';
import {
  ROTULO_RARIDADE_RECURSO,
  custoManutencaoVeiculo,
  type RaridadeRecursoMaterial,
} from '../../../../data/regras/recursos-materiais';
import {
  PONTUACAO_NIVEL,
  podeGerenciarRecursoResumo,
  nivelEfetivoRecursoDetalhe,
} from '../../../services/recursoCampanhaPermissoes';

const NIVEL_PERMISSAO_OPCOES = [
  { value: 'visualizar', label: 'Visualizar' },
  { value: 'utilizar', label: 'Utilizar' },
  { value: 'gerenciar', label: 'Gerenciar' },
];

const RARIDADE_VEICULO_OPCOES = [
  { value: 'comum', label: 'Comum' },
  { value: 'incomum', label: 'Incomum' },
  { value: 'raro', label: 'Raro' },
  { value: 'epico', label: 'Épico' },
  { value: 'lendario', label: 'Lendário' },
];

// Sugestões rápidas para os módulos de utilidade publicados no catálogo. O
// jogador ainda confirma ou edita o nome antes de adicionar à frota.
const MODULOS_UTILIDADE_SUGERIDOS = [
  { nome: 'Beliche (dormitório)', espacos: 1 },
  { nome: 'Geladeira', espacos: 1 },
  { nome: 'Filtro de água', espacos: 1 },
  { nome: 'Enfermaria', espacos: 1 },
  { nome: 'Armazém extra', espacos: 1 },
  { nome: 'Blindagem extra', espacos: 2 },
];

const TIPO_OCUPANTE_OPCOES = [
  { value: 'tripulacao', label: 'Tripulação' },
  { value: 'passageiro', label: 'Passageiro' },
];

interface FrotaCampanhaProps {
  character: any;
  // Se fornecido, mostra botão de migração para veículos legados do inventário
  veiculosLegados?: Array<{ id: string; nome: string }>;
  onMigrarVeiculo?: (itemId: string, compartilhar: boolean) => void;
}

const NIVEL_ACESSO_OPCOES = [
  { value: 'nenhum', label: '🔒 Privado (apenas você e o Mestre)' },
  { value: 'visualizar', label: '👁 Campanha pode visualizar' },
  { value: 'utilizar', label: '⚡ Campanha pode utilizar' },
];

const COBERTURA_OPCOES = [
  { value: 'nenhuma', label: 'Nenhuma' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'total', label: 'Total' },
];

const VidaBar = ({ atual, maximo, cor = 'bg-red-500' }: { atual: number; maximo: number; cor?: string }) => {
  const pct = maximo > 0 ? Math.max(0, Math.min(100, (atual / maximo) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const FORM_VAZIO: ICampanhaVeiculoInput = {
  nome: '',
  raridade: 'comum',
  imagem_url: null,
  descricao: '',
  vida_maxima: 0,
  combustivel_maximo: 0,
  defesa: 0,
  resistencia: 0,
  deslocamento: 0,
  manobrabilidade: 0,
  cobertura: 'nenhuma',
  capacidade: 0,
  tripulacao_minima: 1,
  sistemas_ativos_maximos: 1,
  espacos_modulos_maximos: 4,
  espacos_base: 4,
  nivel_acesso_campanha: 'nenhum',
};

export const FrotaCampanha = ({ character, veiculosLegados = [], onMigrarVeiculo }: FrotaCampanhaProps) => {
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const papelNaCampanha = useAuthStore((s) => s.campanhaAtiva?.papel ?? '');

  const isMestre = papelNaCampanha === 'mestre' || papelNaCampanha === 'assistente';

  const [veiculos, setVeiculos] = useState<ICampanhaVeiculoResumo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [veiculoAberto, setVeiculoAberto] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ICampanhaVeiculo | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [modalForm, setModalForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ICampanhaVeiculoInput>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [modalMigrar, setModalMigrar] = useState(false);
  const [migrandoItemId, setMigrandoItemId] = useState<string | null>(null);
  const [compartilharAoMigrar, setCompartilharAoMigrar] = useState(false);

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [personagensCampanha, setPersonagensCampanha] = useState<Array<{ id: string; nome: string }>>([]);

  const [novoOcupantePersonagemId, setNovoOcupantePersonagemId] = useState('');
  const [novoOcupantePapel, setNovoOcupantePapel] = useState('');
  const [novoOcupanteTipo, setNovoOcupanteTipo] = useState<'tripulacao' | 'passageiro'>('tripulacao');

  const [novoModuloNome, setNovoModuloNome] = useState('');
  const [novoModuloEspacos, setNovoModuloEspacos] = useState('1');

  const [novaCargaNome, setNovaCargaNome] = useState('');
  const [novaCargaQtd, setNovaCargaQtd] = useState('1');

  const [novaPermPersonagemId, setNovaPermPersonagemId] = useState('');
  const [novaPermNivel, setNovaPermNivel] = useState<'visualizar' | 'utilizar' | 'gerenciar'>('visualizar');

  const nomePersonagem = useCallback(
    (id: string) => personagensCampanha.find((p) => p.id === id)?.nome || 'Personagem removido',
    [personagensCampanha],
  );

  const podeGerenciarResumo = (v: ICampanhaVeiculoResumo) => podeGerenciarRecursoResumo(isMestre, character?.id, v);

  const nivelDetalheAtual = nivelEfetivoRecursoDetalhe(isMestre, character?.id, detalhe);
  const podeGerenciarDetalhe = PONTUACAO_NIVEL[nivelDetalheAtual] >= PONTUACAO_NIVEL.gerenciar;
  const podeUtilizarDetalhe = PONTUACAO_NIVEL[nivelDetalheAtual] >= PONTUACAO_NIVEL.utilizar;

  useEffect(() => {
    if (!campanhaAtiva?.id) return;
    personagensApi.listar(campanhaAtiva.id)
      .then((res) => setPersonagensCampanha(res.personagens.map((p) => ({ id: p.id, nome: p.nome }))))
      .catch(() => setPersonagensCampanha([]));
  }, [campanhaAtiva?.id]);

  const carregarVeiculos = useCallback(async () => {
    if (!campanhaAtiva?.id) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await veiculosCampanhaApi.listar(campanhaAtiva.id);
      setVeiculos(res.veiculos);
    } catch {
      setErro('Erro ao carregar veículos da campanha.');
    } finally {
      setCarregando(false);
    }
  }, [campanhaAtiva?.id]);

  useEffect(() => {
    carregarVeiculos();
  }, [carregarVeiculos]);

  const recarregarDetalheAberto = useCallback(async () => {
    if (!campanhaAtiva?.id || !veiculoAberto) return;
    try {
      const d = await veiculosCampanhaApi.obter(campanhaAtiva.id, veiculoAberto);
      setDetalhe(d);
    } catch {
      // Se o veículo sumiu (removido por outra pessoa), a lista já vai refletir isso.
    }
  }, [campanhaAtiva?.id, veiculoAberto]);

  useCampaignSSE(campanhaAtiva?.id, (tipo, payload) => {
    if (!tipo.startsWith('veiculo_')) return;
    void carregarVeiculos();
    if (veiculoAberto && payload.veiculo_id === veiculoAberto) {
      void recarregarDetalheAberto();
    }
  });

  const abrirDetalhe = async (veiculoId: string) => {
    if (!campanhaAtiva?.id) return;
    if (veiculoAberto === veiculoId) {
      setVeiculoAberto(null);
      setDetalhe(null);
      return;
    }
    setVeiculoAberto(veiculoId);
    setCarregandoDetalhe(true);
    try {
      const d = await veiculosCampanhaApi.obter(campanhaAtiva.id, veiculoId);
      setDetalhe(d);
    } catch {
      setDetalhe(null);
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const toggleExpandido = (veiculoId: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(veiculoId)) next.delete(veiculoId);
      else next.add(veiculoId);
      return next;
    });
  };

  const editarPorId = async (veiculoId: string) => {
    if (!campanhaAtiva?.id) return;
    try {
      const d = await veiculosCampanhaApi.obter(campanhaAtiva.id, veiculoId);
      abrirFormEditar(d);
    } catch (e: any) {
      alert(e?.message || 'Erro ao carregar veículo.');
    }
  };

  const abrirFormNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalForm(true);
  };

  const abrirFormEditar = (v: ICampanhaVeiculo) => {
    setEditandoId(v.id);
    setForm({
      nome: v.nome,
      raridade: v.raridade,
      imagem_url: v.imagem_url,
      descricao: v.descricao,
      vida_maxima: v.vida_maxima,
      combustivel_maximo: v.combustivel_maximo,
      defesa: v.defesa,
      resistencia: v.resistencia,
      deslocamento: v.deslocamento,
      manobrabilidade: v.manobrabilidade,
      cobertura: v.cobertura,
      capacidade: v.capacidade,
      tripulacao_minima: v.tripulacao_minima,
      sistemas_ativos_maximos: v.sistemas_ativos_maximos,
      espacos_modulos_maximos: v.espacos_modulos_maximos,
      espacos_base: v.espacos_base,
      nivel_acesso_campanha: v.nivel_acesso_campanha,
    });
    setModalForm(true);
  };

  const salvarVeiculo = async () => {
    if (!campanhaAtiva?.id || !form.nome.trim()) return;
    setSalvando(true);
    try {
      if (editandoId) {
        await veiculosCampanhaApi.atualizar(campanhaAtiva.id, editandoId, form);
      } else {
        await veiculosCampanhaApi.criar(campanhaAtiva.id, form);
      }
      await carregarVeiculos();
      setModalForm(false);
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar veículo.');
    } finally {
      setSalvando(false);
    }
  };

  const removerVeiculo = async (v: ICampanhaVeiculoResumo) => {
    if (!campanhaAtiva?.id) return;
    if (!window.confirm(`Remover o veículo "${v.nome}" permanentemente?`)) return;
    try {
      await veiculosCampanhaApi.remover(campanhaAtiva.id, v.id);
      await carregarVeiculos();
      if (veiculoAberto === v.id) { setVeiculoAberto(null); setDetalhe(null); }
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover veículo.');
    }
  };

  const confirmarMigrar = async () => {
    if (!campanhaAtiva?.id || !character?.id || !migrandoItemId) return;
    try {
      await veiculosCampanhaApi.migrar(campanhaAtiva.id, {
        personagem_id: character.id,
        item_id: migrandoItemId,
        compartilhar_campanha: compartilharAoMigrar,
      });
      onMigrarVeiculo?.(migrandoItemId, compartilharAoMigrar);
      setModalMigrar(false);
      await carregarVeiculos();
    } catch (e: any) {
      alert(e?.message || 'Erro ao migrar veículo.');
    }
  };

  // -- Ocupantes ------------------------------------------------------

  const adicionarOcupante = async () => {
    if (!campanhaAtiva?.id || !detalhe || !novoOcupantePersonagemId || !novoOcupantePapel.trim()) return;
    try {
      await veiculosCampanhaApi.definirOcupante(campanhaAtiva.id, detalhe.id, {
        personagem_id: novoOcupantePersonagemId,
        papel: novoOcupantePapel.trim(),
        tipo: novoOcupanteTipo,
      });
      setNovoOcupantePersonagemId('');
      setNovoOcupantePapel('');
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao adicionar ocupante.');
    }
  };

  const removerOcupante = async (personagemId: string) => {
    if (!campanhaAtiva?.id || !detalhe) return;
    try {
      await veiculosCampanhaApi.removerOcupante(campanhaAtiva.id, detalhe.id, personagemId);
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover ocupante.');
    }
  };

  // -- Módulos ----------------------------------------------------------

  const adicionarModulo = async () => {
    if (!campanhaAtiva?.id || !detalhe || !novoModuloNome.trim()) return;
    try {
      await veiculosCampanhaApi.adicionarModulo(campanhaAtiva.id, detalhe.id, {
        nome: novoModuloNome.trim(),
        espacos_ocupados: Math.max(1, Number(novoModuloEspacos) || 1),
      });
      setNovoModuloNome('');
      setNovoModuloEspacos('1');
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao adicionar módulo.');
    }
  };

  const alternarModulo = async (moduloId: string, ativo: boolean) => {
    if (!campanhaAtiva?.id || !detalhe) return;
    try {
      await veiculosCampanhaApi.alternarModulo(campanhaAtiva.id, detalhe.id, moduloId, ativo);
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao alternar módulo.');
    }
  };

  const removerModulo = async (moduloId: string) => {
    if (!campanhaAtiva?.id || !detalhe) return;
    try {
      await veiculosCampanhaApi.removerModulo(campanhaAtiva.id, detalhe.id, moduloId);
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover módulo.');
    }
  };

  // -- Carga --------------------------------------------------------------

  const adicionarCarga = async () => {
    if (!campanhaAtiva?.id || !detalhe || !novaCargaNome.trim()) return;
    try {
      await veiculosCampanhaApi.adicionarCarga(campanhaAtiva.id, detalhe.id, {
        nome: novaCargaNome.trim(),
        quantidade: Math.max(1, Number(novaCargaQtd) || 1),
      });
      setNovaCargaNome('');
      setNovaCargaQtd('1');
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao adicionar item à carga.');
    }
  };

  const ajustarCargaQtd = async (itemId: string, quantidadeAtual: number, delta: number) => {
    if (!campanhaAtiva?.id || !detalhe) return;
    const nova = quantidadeAtual + delta;
    try {
      if (nova <= 0) {
        await veiculosCampanhaApi.removerCarga(campanhaAtiva.id, detalhe.id, itemId);
      } else {
        await veiculosCampanhaApi.atualizarCarga(campanhaAtiva.id, detalhe.id, itemId, nova);
      }
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao atualizar carga.');
    }
  };

  // -- Permissões individuais ----------------------------------------------

  const definirPermissao = async () => {
    if (!campanhaAtiva?.id || !detalhe || !novaPermPersonagemId) return;
    try {
      await veiculosCampanhaApi.definirPermissao(campanhaAtiva.id, detalhe.id, {
        personagem_id: novaPermPersonagemId,
        nivel_permissao: novaPermNivel,
      });
      setNovaPermPersonagemId('');
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao definir permissão.');
    }
  };

  const removerPermissao = async (personagemId: string) => {
    if (!campanhaAtiva?.id || !detalhe) return;
    try {
      await veiculosCampanhaApi.removerPermissao(campanhaAtiva.id, detalhe.id, personagemId);
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover permissão.');
    }
  };

  // Variante que não depende do `veiculoAberto` no closure (útil logo após uma mutação).
  const recarregarDetalheAbertoImediato = async (veiculoId: string) => {
    if (!campanhaAtiva?.id) return;
    try {
      const d = await veiculosCampanhaApi.obter(campanhaAtiva.id, veiculoId);
      setDetalhe(d);
    } catch {
      setDetalhe(null);
    }
    await carregarVeiculos();
  };

  const ocupantesDisponiveis = useMemo(
    () => personagensCampanha.filter((p) => !detalhe?.ocupantes.some((o) => o.personagem_id === p.id)),
    [personagensCampanha, detalhe],
  );

  if (!campanhaAtiva?.id) return null;

  return (
    <section className="rounded-2xl border border-amber-500/15 bg-[#0f0e15] p-6" data-tour="bens-frota">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            <Car size={22} className="text-amber-400" /> Frota da Campanha
          </h2>
          <p className="mt-1 text-sm text-gray-500">Veículos compartilhados desta campanha.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {veiculosLegados.length > 0 && (
            <button
              type="button"
              onClick={() => setModalMigrar(true)}
              className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 px-4 py-2 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              <Upload size={14} /> Mover para a Frota
            </button>
          )}
          {isMestre && (
            <button
              type="button"
              onClick={abrirFormNovo}
              className="rounded-xl border border-amber-500/30 px-5 py-2.5 text-sm font-bold text-amber-300 transition-colors hover:bg-amber-500/10"
            >
              + Adicionar Veículo
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {carregando && (
        <p className="py-10 text-center text-sm text-gray-600">Carregando veículos...</p>
      )}
      {erro && (
        <p className="py-6 text-center text-sm text-red-400">{erro}</p>
      )}

      {!carregando && !erro && veiculos.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
          <Car size={38} className="mx-auto mb-3 text-gray-700" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Nenhum veículo na frota</p>
          {isMestre && <p className="mt-1 text-xs text-gray-700">Clique em "+ Adicionar Veículo" para começar.</p>}
        </div>
      )}

      <div className="space-y-3">
        {veiculos.map((v) => {
          const isExpandido = expandidos.has(v.id);

          return (
            <article key={v.id} className="overflow-hidden rounded-xl border border-amber-500/15 bg-amber-950/10 transition-all">
              {/* Card resumo */}
              <div className="flex items-center gap-3 p-4">
                {/* Ícone / Imagem */}
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-900/30">
                  {v.imagem_url
                    ? <img src={v.imagem_url} alt={v.nome} loading="lazy" decoding="async" className="h-10 w-10 rounded object-cover" />
                    : <Car size={24} className="text-amber-400" />
                  }
                </div>

                {/* Info principal */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-white">{v.nome}</h3>
                    <span className="rounded-full border border-indigo-400/20 bg-indigo-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-indigo-200">{ROTULO_RARIDADE_RECURSO[v.raridade]}</span>
                    {v.nivel_acesso_campanha === 'nenhum' && <Lock size={11} className="text-gray-600" aria-label="Privado" />}
                    {v.nivel_acesso_campanha === 'visualizar' && <Globe size={11} className="text-blue-500" aria-label="Campanha pode ver" />}
                    {v.nivel_acesso_campanha === 'utilizar' && <Zap size={11} className="text-amber-400" aria-label="Campanha pode usar" />}
                  </div>

                  {/* Barras compactas */}
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    <div>
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500"><Heart size={9} /> Vida</span>
                        <span className="text-[10px] font-mono text-gray-400">{v.vida_atual}/{v.vida_maxima}</span>
                      </div>
                      <VidaBar atual={v.vida_atual} maximo={v.vida_maxima} cor="bg-red-500" />
                    </div>
                    <div>
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500"><Fuel size={9} /> Comb.</span>
                        <span className="text-[10px] font-mono text-gray-400">{v.combustivel_atual}/{v.combustivel_maximo}</span>
                      </div>
                      <VidaBar atual={v.combustivel_atual} maximo={v.combustivel_maximo} cor="bg-amber-500" />
                    </div>
                  </div>
                </div>

                {/* Botões */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleExpandido(v.id)}
                    className="rounded p-1.5 text-gray-600 hover:text-amber-300"
                    title="Detalhes"
                  >
                    {isExpandido ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  {podeGerenciarResumo(v) && (
                    <>
                      <button
                        type="button"
                        onClick={() => editarPorId(v.id)}
                        className="rounded p-1.5 text-gray-600 hover:text-blue-300"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerVeiculo(v)}
                        className="rounded p-1.5 text-gray-600 hover:text-red-300"
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Detalhes expandidos */}
              {isExpandido && (
                <div className="border-t border-amber-500/10 px-4 pb-4 pt-3">
                  {carregandoDetalhe && veiculoAberto === v.id && (
                    <p className="text-center text-xs text-gray-600">Carregando...</p>
                  )}
                  {detalhe && detalhe.id === v.id && (
                    <div className="space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: 'Defesa', value: detalhe.defesa, icon: <Shield size={11} /> },
                          { label: 'Resistência', value: detalhe.resistencia },
                          { label: 'Deslocamento', value: `${detalhe.deslocamento}m` },
                          { label: 'Manobrab.', value: detalhe.manobrabilidade },
                          { label: 'Cobertura', value: detalhe.cobertura },
                          { label: 'Capacidade', value: detalhe.capacidade },
                          { label: 'Trip. Mín.', value: detalhe.tripulacao_minima },
                          { label: 'Sis. Ativos', value: `${detalhe.modulos.filter(m => m.ativo).length}/${detalhe.sistemas_ativos_maximos}` },
                        ].map(({ label, value, icon }) => (
                          <div key={label} className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">{icon}{label}</p>
                            <p className="font-bold text-sm text-white">{value ?? '-'}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-indigo-400/20 bg-indigo-400/[0.07] p-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300/70">Manutenção mensal</p>
                        <p className="mt-1 text-sm font-bold text-white">
                          {custoManutencaoVeiculo(detalhe.modulos_utilidade_integrados + detalhe.modulos.length)} Componentes Veiculares {ROTULO_RARIDADE_RECURSO[detalhe.raridade as RaridadeRecursoMaterial]}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-gray-500">
                          1 pelo veículo + {detalhe.modulos_utilidade_integrados + detalhe.modulos.length} por {(detalhe.modulos_utilidade_integrados + detalhe.modulos.length) === 1 ? 'módulo de utilidade instalado' : 'módulos de utilidade instalados'}. Módulos integrados e desligados também contam. Só pague em meses em que o veículo foi usado.
                        </p>
                      </div>

                      {/* Ocupantes */}
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-500/60">
                          <Users size={10} className="inline mr-1" />
                          Ocupantes
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {detalhe.ocupantes.map((o) => (
                            <div key={o.id} className="flex items-center gap-2 rounded-lg bg-black/20 p-2 text-xs">
                              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${o.tipo === 'tripulacao' ? 'bg-amber-400' : 'bg-gray-500'}`} />
                              <span className="min-w-0 flex-1 truncate text-gray-300">{nomePersonagem(o.personagem_id)} · {o.papel}</span>
                              {podeGerenciarDetalhe && (
                                <button type="button" onClick={() => removerOcupante(o.personagem_id)} className="flex-shrink-0 text-red-500 hover:text-red-300">
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          ))}
                          {detalhe.ocupantes.length === 0 && <p className="col-span-2 text-xs text-gray-600">Nenhum ocupante.</p>}
                        </div>
                        {podeGerenciarDetalhe && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <div className="min-w-[10rem] flex-1">
                              <Select value={novoOcupantePersonagemId} onChange={setNovoOcupantePersonagemId} placeholder="Personagem..." options={ocupantesDisponiveis.map(p => ({ value: p.id, label: p.nome }))} />
                            </div>
                            <input
                              value={novoOcupantePapel}
                              onChange={(e) => setNovoOcupantePapel(e.target.value)}
                              placeholder="Papel (ex.: Piloto)"
                              className="w-32 rounded-md border border-white/5 bg-[#121118] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-amber-500/50"
                            />
                            <div className="w-32">
                              <Select value={novoOcupanteTipo} onChange={(v) => setNovoOcupanteTipo(v as any)} options={TIPO_OCUPANTE_OPCOES} />
                            </div>
                            <button
                              type="button"
                              onClick={adicionarOcupante}
                              disabled={!novoOcupantePersonagemId || !novoOcupantePapel.trim()}
                              className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 disabled:opacity-40"
                            >
                              <Plus size={12} /> Adicionar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Módulos */}
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-500/60">
                          <Zap size={10} className="inline mr-1" />
                          Módulos de utilidade ({detalhe.modulos.filter(m => m.ativo).length}/{detalhe.sistemas_ativos_maximos} ativos)
                        </p>
                        <div className="space-y-1">
                          {detalhe.modulos.map((m) => (
                            <div key={m.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs">
                              <button
                                type="button"
                                onClick={() => podeUtilizarDetalhe && alternarModulo(m.id, !m.ativo)}
                                disabled={!podeUtilizarDetalhe}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                              >
                                {m.ativo
                                  ? <CheckCircle2 size={12} className="flex-shrink-0 text-cyan-400" />
                                  : <Circle size={12} className="flex-shrink-0 text-gray-600" />
                                }
                                <span className={`truncate ${m.ativo ? 'text-gray-200' : 'text-gray-500'}`}>{m.nome}</span>
                              </button>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                <span className="text-[10px] text-gray-600">{m.espacos_ocupados} esp.</span>
                                {podeGerenciarDetalhe && (
                                  <button type="button" onClick={() => removerModulo(m.id)} className="text-red-500 hover:text-red-300">
                                    <Trash2 size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {detalhe.modulos.length === 0 && <p className="text-xs text-gray-600">Nenhum módulo instalado.</p>}
                        </div>
                        {podeGerenciarDetalhe && (
                          <div className="mt-2 space-y-2">
                            <div className="flex flex-wrap gap-1.5">
                              {MODULOS_UTILIDADE_SUGERIDOS.map((sugestao) => (
                                <button
                                  key={sugestao.nome}
                                  type="button"
                                  onClick={() => { setNovoModuloNome(sugestao.nome); setNovoModuloEspacos(String(sugestao.espacos)); }}
                                  className="rounded-full border border-cyan-500/20 bg-cyan-500/5 px-2.5 py-1 text-[10px] font-bold text-cyan-300/80 hover:bg-cyan-500/15"
                                >
                                  + {sugestao.nome}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={novoModuloNome}
                                onChange={(e) => setNovoModuloNome(e.target.value)}
                                placeholder="Nome do módulo"
                                className="flex-1 rounded-md border border-white/5 bg-[#121118] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/50"
                              />
                              <input
                                type="number"
                                min={1}
                                value={novoModuloEspacos}
                                onChange={(e) => setNovoModuloEspacos(e.target.value)}
                                className="w-16 rounded-md border border-white/5 bg-[#121118] px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-cyan-500/50"
                              />
                              <button
                                type="button"
                                onClick={adicionarModulo}
                                disabled={!novoModuloNome.trim()}
                                className="flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 disabled:opacity-40"
                              >
                                <Plus size={12} /> Adicionar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Inventário / Carga */}
                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">
                          <Package size={10} className="inline mr-1" />
                          Carga ({detalhe.inventario.length} item{detalhe.inventario.length !== 1 ? 's' : ''})
                        </p>
                        <div className="space-y-1">
                          {detalhe.inventario.map((item) => (
                            <div key={item.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs">
                              <span className="min-w-0 flex-1 truncate text-gray-300">{item.nome}</span>
                              <div className="flex flex-shrink-0 items-center gap-1.5">
                                {podeUtilizarDetalhe && (
                                  <button type="button" onClick={() => ajustarCargaQtd(item.id, item.quantidade, -1)} className="text-gray-500 hover:text-red-300">
                                    <Minus size={11} />
                                  </button>
                                )}
                                <span className="w-6 text-center text-gray-400">×{item.quantidade}</span>
                                {podeUtilizarDetalhe && (
                                  <button type="button" onClick={() => ajustarCargaQtd(item.id, item.quantidade, 1)} className="text-gray-500 hover:text-emerald-300">
                                    <Plus size={11} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {detalhe.inventario.length === 0 && <p className="text-xs text-gray-600">Nenhum item na carga.</p>}
                        </div>
                        {podeUtilizarDetalhe && (
                          <div className="mt-2 flex gap-2">
                            <input
                              value={novaCargaNome}
                              onChange={(e) => setNovaCargaNome(e.target.value)}
                              placeholder="Nome do item"
                              className="flex-1 rounded-md border border-white/5 bg-[#121118] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-emerald-500/50"
                            />
                            <input
                              type="number"
                              min={1}
                              value={novaCargaQtd}
                              onChange={(e) => setNovaCargaQtd(e.target.value)}
                              className="w-16 rounded-md border border-white/5 bg-[#121118] px-2 py-1.5 text-xs text-gray-300 outline-none focus:border-emerald-500/50"
                            />
                            <button
                              type="button"
                              onClick={adicionarCarga}
                              disabled={!novaCargaNome.trim()}
                              className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 disabled:opacity-40"
                            >
                              <Plus size={12} /> Adicionar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Permissões individuais */}
                      {podeGerenciarDetalhe && (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-purple-400/60">
                            <KeyRound size={10} className="inline mr-1" />
                            Acesso individual
                          </p>
                          <p className="mb-2 text-[11px] text-gray-600">Conceda acesso a outro personagem - por exemplo, quando dois jogadores dividem o mesmo veículo.</p>
                          <div className="space-y-1">
                            {detalhe.permissoes.map((perm) => (
                              <div key={perm.personagem_id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs">
                                <span className="text-gray-300">{nomePersonagem(perm.personagem_id)}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500">{perm.nivel_permissao}</span>
                                  <button type="button" onClick={() => removerPermissao(perm.personagem_id)} className="text-red-500 hover:text-red-300">
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {detalhe.permissoes.length === 0 && <p className="text-xs text-gray-600">Só o Mestre e o dono têm acesso.</p>}
                          </div>
                          <div className="mt-2 flex gap-2">
                            <div className="min-w-[10rem] flex-1">
                              <Select value={novaPermPersonagemId} onChange={setNovaPermPersonagemId} placeholder="Personagem..." options={personagensCampanha.map(p => ({ value: p.id, label: p.nome }))} />
                            </div>
                            <div className="w-32">
                              <Select value={novaPermNivel} onChange={(v) => setNovaPermNivel(v as any)} options={NIVEL_PERMISSAO_OPCOES} />
                            </div>
                            <button
                              type="button"
                              onClick={definirPermissao}
                              disabled={!novaPermPersonagemId}
                              className="flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 disabled:opacity-40"
                            >
                              <Plus size={12} /> Conceder
                            </button>
                          </div>
                        </div>
                      )}

                      {detalhe.descricao && (
                        <p className="text-xs leading-relaxed text-gray-500">{detalhe.descricao}</p>
                      )}

                      {/* Botão editar para quem gerencia (Mestre, dono ou acesso concedido) */}
                      {podeGerenciarDetalhe && (
                        <button
                          type="button"
                          onClick={() => abrirFormEditar(detalhe)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                        >
                          <Pencil size={12} /> Editar Veículo
                        </button>
                      )}
                    </div>
                  )}
                  {!carregandoDetalhe && (!detalhe || detalhe.id !== v.id) && (
                    <button
                      type="button"
                      onClick={() => abrirDetalhe(v.id)}
                      className="w-full rounded-lg bg-amber-500/5 py-2 text-xs font-bold text-amber-400/60 hover:text-amber-300"
                    >
                      <ArrowUpRight size={12} className="inline mr-1" />Ver detalhes
                    </button>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Modal: Criar/Editar Veículo */}
      <FichaModal
        isOpen={modalForm}
        onClose={() => setModalForm(false)}
        title={editandoId ? 'Editar Veículo' : 'Novo Veículo na Frota'}
        size="lg"
      >
        <div className="space-y-4">
          <LabeledInput label="Nome" value={form.nome} placeholder="Ex.: Nave A.X.I.S." onChange={(val: string) => setForm(f => ({ ...f, nome: val }))} />
          <LabeledInput label="URL da imagem (opcional)" value={form.imagem_url ?? ''} placeholder="https://..." onChange={(val: string) => setForm(f => ({ ...f, imagem_url: val || null }))} />

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Raridade</label>
            <Select value={form.raridade ?? 'comum'} onChange={(val) => setForm(f => ({ ...f, raridade: val as ICampanhaVeiculoInput['raridade'] }))} options={RARIDADE_VEICULO_OPCOES} />
            <p className="mt-1 text-[11px] text-gray-600">A raridade define o lote de Componentes Veiculares exigido pela manutenção.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LabeledInput label="Vida Máx." type="number" value={String(form.vida_maxima ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, vida_maxima: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Comb. Máx." type="number" value={String(form.combustivel_maximo ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, combustivel_maximo: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Defesa" type="number" value={String(form.defesa ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, defesa: Number(val) }))} />
            <LabeledInput label="Resistência" type="number" value={String(form.resistencia ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, resistencia: Number(val) }))} />
            <LabeledInput label="Deslocamento (m)" type="number" value={String(form.deslocamento ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, deslocamento: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Manobrabilidade" type="number" value={String(form.manobrabilidade ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, manobrabilidade: Number(val) }))} />
            <LabeledInput label="Capacidade (pass.)" type="number" value={String(form.capacidade ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, capacidade: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Trip. Mínima" type="number" value={String(form.tripulacao_minima ?? 1)} onChange={(val: string) => setForm(f => ({ ...f, tripulacao_minima: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Sis. Ativos Máx." type="number" value={String(form.sistemas_ativos_maximos ?? 1)} onChange={(val: string) => setForm(f => ({ ...f, sistemas_ativos_maximos: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Espaços Módulos" type="number" value={String(form.espacos_modulos_maximos ?? 4)} onChange={(val: string) => setForm(f => ({ ...f, espacos_modulos_maximos: Math.max(0, Number(val)) }))} />
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Cobertura</label>
              <Select value={form.cobertura ?? 'nenhuma'} onChange={(val) => setForm(f => ({ ...f, cobertura: val }))} options={COBERTURA_OPCOES} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Acesso da Campanha</label>
            <Select value={form.nivel_acesso_campanha ?? 'nenhum'} onChange={(v) => setForm(f => ({ ...f, nivel_acesso_campanha: v as any }))} options={NIVEL_ACESSO_OPCOES} />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Descrição</label>
            <textarea
              value={form.descricao ?? ''}
              onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={3}
              className="resize-none rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button type="button" onClick={() => setModalForm(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={salvarVeiculo} disabled={salvando || !form.nome.trim()} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-300 disabled:opacity-40">
              {salvando ? 'Salvando...' : 'Salvar Veículo'}
            </button>
          </div>
        </div>
      </FichaModal>

      {/* Modal: Migrar Veículo Legado */}
      <FichaModal
        isOpen={modalMigrar}
        onClose={() => setModalMigrar(false)}
        title="Mover Veículo para a Frota"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Selecione um veículo do seu inventário para movê-lo para a Frota da Campanha. Esta ação é definitiva e irá remover o veículo do seu inventário pessoal.
          </p>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Veículo para mover</label>
            <Select
              value={migrandoItemId ?? ''}
              onChange={setMigrandoItemId}
              placeholder="Selecione um veículo..."
              options={veiculosLegados.map(v => ({ value: v.id, label: v.nome }))}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-950/10 p-4">
            <input
              type="checkbox"
              checked={compartilharAoMigrar}
              onChange={(e) => setCompartilharAoMigrar(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-bold text-amber-300 flex items-center gap-1.5"><Share2 size={13} /> Compartilhar com a campanha</p>
              <p className="text-xs text-gray-500 mt-0.5">Todos os jogadores poderão utilizar e ver as informações deste veículo.</p>
            </div>
          </label>

          <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3">
            <p className="text-xs text-red-400">⚠ Esta ação removerá o veículo do seu inventário. Não será possível desfazer sem o auxílio do Mestre.</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button type="button" onClick={() => setModalMigrar(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={confirmarMigrar} disabled={!migrandoItemId} className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-sm font-bold text-amber-300 disabled:opacity-40">
              <Upload size={13} className="inline mr-1" />Mover para a Frota
            </button>
          </div>
        </div>
      </FichaModal>
    </section>
  );
};
