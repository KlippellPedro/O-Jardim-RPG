import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Wrench, Share2, ArrowUpRight,
  Pencil, Trash2, ChevronDown, ChevronRight,
  Globe, Lock, Zap, Upload, Plus, KeyRound,
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import {
  propriedadesCampanhaApi,
  type ICampanhaPropriedadeResumo,
  type ICampanhaPropriedade,
  type ICampanhaPropriedadeInput,
} from '../../../services/propriedadesCampanhaApi';
import type { IPropriedadeFicha } from '../../../services/propriedadeService';
import { personagensApi } from '../../../services/personagensApi';
import { useCampaignSSE } from '../../../hooks/useCampaignSSE';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { Select } from '../../../components/ui/Select';
import { INSTALACOES_BASE } from '../../../../data/regras/bases';
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

const INSTALACAO_PERSONALIZADA = '__personalizada__';

interface PropriedadesCampanhaProps {
  character: any;
  // Propriedades locais (ficha.propriedades) elegíveis a virar Base da Campanha
  propriedadesLegadas?: IPropriedadeFicha[];
  onMigrarPropriedade?: (propriedadeLocalId: string, compartilhar: boolean) => void;
}

const NIVEL_ACESSO_OPCOES = [
  { value: 'nenhum', label: '🔒 Privada (apenas você e o Mestre)' },
  { value: 'visualizar', label: '👁 Campanha pode visualizar' },
  { value: 'utilizar', label: '⚡ Campanha pode utilizar' },
];

const TIPO_OPCOES = [
  { value: 'residencia', label: 'Residência' },
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'terreno', label: 'Terreno' },
  { value: 'comercio', label: 'Comércio' },
  { value: 'base', label: 'Base' },
  { value: 'outro', label: 'Outro' },
];

const FORM_VAZIO: ICampanhaPropriedadeInput = {
  nome: '',
  tipo: 'base',
  localizacao: '',
  descricao: '',
  qualidade_quartos: '',
  patamar: '',
  valor_aquisicao: 0,
  manutencao: 0,
  nivel_acesso_campanha: 'nenhum',
};

export const PropriedadesCampanha = ({ character, propriedadesLegadas = [], onMigrarPropriedade }: PropriedadesCampanhaProps) => {
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const papelNaCampanha = useAuthStore((s) => s.campanhaAtiva?.papel ?? '');

  const isMestre = papelNaCampanha === 'mestre' || papelNaCampanha === 'assistente';

  const [propriedades, setPropriedades] = useState<ICampanhaPropriedadeResumo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [propriedadeAberta, setPropriedadeAberta] = useState<string | null>(null);
  const [detalhe, setDetalhe] = useState<ICampanhaPropriedade | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const [modalForm, setModalForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<ICampanhaPropriedadeInput>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const [modalMigrar, setModalMigrar] = useState(false);
  const [migrandoId, setMigrandoId] = useState<string | null>(null);
  const [compartilharAoMigrar, setCompartilharAoMigrar] = useState(false);

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [novaInstalacaoTipo, setNovaInstalacaoTipo] = useState('');
  const [novaInstalacaoNivel, setNovaInstalacaoNivel] = useState(1);
  const [novaInstalacaoNomePersonalizado, setNovaInstalacaoNomePersonalizado] = useState('');

  const [personagensCampanha, setPersonagensCampanha] = useState<Array<{ id: string; nome: string }>>([]);
  const [novaPermPersonagemId, setNovaPermPersonagemId] = useState('');
  const [novaPermNivel, setNovaPermNivel] = useState<'visualizar' | 'utilizar' | 'gerenciar'>('visualizar');

  const nomePersonagem = useCallback(
    (id: string) => personagensCampanha.find((p) => p.id === id)?.nome || 'Personagem removido',
    [personagensCampanha],
  );

  const podeGerenciarResumo = (p: ICampanhaPropriedadeResumo) => podeGerenciarRecursoResumo(isMestre, character?.id, p);

  const nivelDetalheAtual = nivelEfetivoRecursoDetalhe(isMestre, character?.id, detalhe);
  const podeGerenciarDetalhe = PONTUACAO_NIVEL[nivelDetalheAtual] >= PONTUACAO_NIVEL.gerenciar;

  useEffect(() => {
    if (!campanhaAtiva?.id) return;
    personagensApi.listar(campanhaAtiva.id)
      .then((res) => setPersonagensCampanha(res.personagens.map((p) => ({ id: p.id, nome: p.nome }))))
      .catch(() => setPersonagensCampanha([]));
  }, [campanhaAtiva?.id]);

  const carregarPropriedades = useCallback(async () => {
    if (!campanhaAtiva?.id) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await propriedadesCampanhaApi.listar(campanhaAtiva.id);
      setPropriedades(res.propriedades);
    } catch {
      setErro('Erro ao carregar propriedades da campanha.');
    } finally {
      setCarregando(false);
    }
  }, [campanhaAtiva?.id]);

  useEffect(() => {
    carregarPropriedades();
  }, [carregarPropriedades]);

  const recarregarDetalheAbertoImediato = async (propriedadeId: string) => {
    if (!campanhaAtiva?.id) return;
    try {
      const d = await propriedadesCampanhaApi.obter(campanhaAtiva.id, propriedadeId);
      setDetalhe(d);
    } catch {
      setDetalhe(null);
    }
    await carregarPropriedades();
  };

  useCampaignSSE(campanhaAtiva?.id, (tipo, payload) => {
    if (!tipo.startsWith('propriedade_')) return;
    void carregarPropriedades();
    if (propriedadeAberta && payload.propriedade_id === propriedadeAberta) {
      void recarregarDetalheAbertoImediato(propriedadeAberta);
    }
  });

  const abrirDetalhe = async (propriedadeId: string) => {
    if (!campanhaAtiva?.id) return;
    if (propriedadeAberta === propriedadeId) {
      setPropriedadeAberta(null);
      setDetalhe(null);
      return;
    }
    setPropriedadeAberta(propriedadeId);
    setCarregandoDetalhe(true);
    try {
      const d = await propriedadesCampanhaApi.obter(campanhaAtiva.id, propriedadeId);
      setDetalhe(d);
    } catch {
      setDetalhe(null);
    } finally {
      setCarregandoDetalhe(false);
    }
  };

  const toggleExpandido = (propriedadeId: string) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(propriedadeId)) next.delete(propriedadeId);
      else next.add(propriedadeId);
      return next;
    });
  };

  const abrirFormNovo = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setModalForm(true);
  };

  const abrirFormEditar = (p: ICampanhaPropriedade) => {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      tipo: p.tipo,
      localizacao: p.localizacao,
      descricao: p.descricao,
      qualidade_quartos: p.qualidade_quartos,
      patamar: p.patamar,
      valor_aquisicao: p.valor_aquisicao,
      manutencao: p.manutencao,
      nivel_acesso_campanha: p.nivel_acesso_campanha,
    });
    setModalForm(true);
  };

  const editarPorId = async (propriedadeId: string) => {
    if (!campanhaAtiva?.id) return;
    try {
      const d = await propriedadesCampanhaApi.obter(campanhaAtiva.id, propriedadeId);
      abrirFormEditar(d);
    } catch (e: any) {
      alert(e?.message || 'Erro ao carregar propriedade.');
    }
  };

  const salvarPropriedade = async () => {
    if (!campanhaAtiva?.id || !form.nome.trim()) return;
    setSalvando(true);
    try {
      if (editandoId) {
        await propriedadesCampanhaApi.atualizar(campanhaAtiva.id, editandoId, form);
      } else {
        await propriedadesCampanhaApi.criar(campanhaAtiva.id, form);
      }
      await carregarPropriedades();
      setModalForm(false);
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar propriedade.');
    } finally {
      setSalvando(false);
    }
  };

  const removerPropriedade = async (p: ICampanhaPropriedadeResumo) => {
    if (!campanhaAtiva?.id) return;
    if (!window.confirm(`Remover a propriedade "${p.nome}" permanentemente?`)) return;
    try {
      await propriedadesCampanhaApi.remover(campanhaAtiva.id, p.id);
      await carregarPropriedades();
      if (propriedadeAberta === p.id) { setPropriedadeAberta(null); setDetalhe(null); }
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover propriedade.');
    }
  };

  const confirmarMigrar = async () => {
    if (!campanhaAtiva?.id || !character?.id || !migrandoId) return;
    const origem = propriedadesLegadas.find((p) => p.id === migrandoId);
    if (!origem) return;
    try {
      await propriedadesCampanhaApi.migrar(campanhaAtiva.id, {
        personagem_id: character.id,
        propriedade_local_id: origem.id,
        nome: origem.nome,
        tipo: origem.tipo,
        localizacao: origem.localizacao,
        descricao: origem.descricao,
        qualidade_quartos: origem.qualidadeQuartos,
        patamar: origem.patamar,
        valor_aquisicao: origem.valorAquisicao,
        manutencao: origem.manutencao,
        instalacoes: origem.instalacoes.map((i) => ({ nome: i.nome, nivel: i.nivel, espacos: i.espacosOcupados })),
        compartilhar_campanha: compartilharAoMigrar,
      });
      onMigrarPropriedade?.(origem.id, compartilharAoMigrar);
      setModalMigrar(false);
      await carregarPropriedades();
    } catch (e: any) {
      alert(e?.message || 'Erro ao mover propriedade para a campanha.');
    }
  };

  const catalogoInstalacaoSelecionado = INSTALACOES_BASE.find((i) => i.id === novaInstalacaoTipo);
  const nivelInstalacaoSelecionado = catalogoInstalacaoSelecionado?.niveis.find((n) => n.nivel === novaInstalacaoNivel);

  const adicionarInstalacao = async () => {
    if (!campanhaAtiva?.id || !detalhe || !novaInstalacaoTipo) return;
    let nome: string;
    let nivel: number | undefined;
    let espacos: number | undefined;
    if (novaInstalacaoTipo === INSTALACAO_PERSONALIZADA) {
      nome = novaInstalacaoNomePersonalizado.trim();
      if (!nome) return;
    } else {
      if (!catalogoInstalacaoSelecionado || !nivelInstalacaoSelecionado) return;
      nome = catalogoInstalacaoSelecionado.titulo;
      nivel = nivelInstalacaoSelecionado.nivel;
      espacos = nivelInstalacaoSelecionado.espacos;
    }
    try {
      await propriedadesCampanhaApi.adicionarInstalacao(campanhaAtiva.id, detalhe.id, { nome, nivel, espacos_ocupados: espacos });
      setNovaInstalacaoTipo('');
      setNovaInstalacaoNivel(1);
      setNovaInstalacaoNomePersonalizado('');
      const d = await propriedadesCampanhaApi.obter(campanhaAtiva.id, detalhe.id);
      setDetalhe(d);
    } catch (e: any) {
      alert(e?.message || 'Erro ao adicionar instalação.');
    }
  };

  const removerInstalacao = async (instalacaoId: string) => {
    if (!campanhaAtiva?.id || !detalhe) return;
    try {
      await propriedadesCampanhaApi.removerInstalacao(campanhaAtiva.id, detalhe.id, instalacaoId);
      const d = await propriedadesCampanhaApi.obter(campanhaAtiva.id, detalhe.id);
      setDetalhe(d);
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover instalação.');
    }
  };

  const definirPermissao = async () => {
    if (!campanhaAtiva?.id || !detalhe || !novaPermPersonagemId) return;
    try {
      await propriedadesCampanhaApi.definirPermissao(campanhaAtiva.id, detalhe.id, {
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
      await propriedadesCampanhaApi.removerPermissao(campanhaAtiva.id, detalhe.id, personagemId);
      await recarregarDetalheAbertoImediato(detalhe.id);
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover permissão.');
    }
  };

  if (!campanhaAtiva?.id) return null;

  return (
    <section className="rounded-2xl border border-emerald-500/15 bg-[#0f0e15] p-6" data-tour="bens-bases">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            <Building2 size={22} className="text-emerald-400" /> Bases da Campanha
          </h2>
          <p className="mt-1 text-sm text-gray-500">Propriedades compartilhadas desta campanha.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {propriedadesLegadas.length > 0 && (
            <button
              type="button"
              onClick={() => setModalMigrar(true)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 px-4 py-2 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/10"
            >
              <Upload size={14} /> Mover para a Campanha
            </button>
          )}
          {isMestre && (
            <button
              type="button"
              onClick={abrirFormNovo}
              className="rounded-xl border border-emerald-500/30 px-5 py-2.5 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/10"
            >
              + Adicionar Base
            </button>
          )}
        </div>
      </div>

      {carregando && (
        <p className="py-10 text-center text-sm text-gray-600">Carregando propriedades...</p>
      )}
      {erro && (
        <p className="py-6 text-center text-sm text-red-400">{erro}</p>
      )}

      {!carregando && !erro && propriedades.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 py-12 text-center">
          <Building2 size={38} className="mx-auto mb-3 text-gray-700" />
          <p className="text-xs font-bold uppercase tracking-widest text-gray-600">Nenhuma base na campanha</p>
          {isMestre && <p className="mt-1 text-xs text-gray-700">Clique em "+ Adicionar Base" para começar.</p>}
        </div>
      )}

      <div className="space-y-3">
        {propriedades.map((p) => {
          const isExpandido = expandidos.has(p.id);
          const tipoLabel = TIPO_OPCOES.find((t) => t.value === p.tipo)?.label || p.tipo;

          return (
            <article key={p.id} className="overflow-hidden rounded-xl border border-emerald-500/15 bg-emerald-950/10 transition-all">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-900/30">
                  <Building2 size={24} className="text-emerald-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-bold text-white">{p.nome}</h3>
                    {p.nivel_acesso_campanha === 'nenhum' && <Lock size={11} className="text-gray-600" aria-label="Privada" />}
                    {p.nivel_acesso_campanha === 'visualizar' && <Globe size={11} className="text-blue-500" aria-label="Campanha pode ver" />}
                    {p.nivel_acesso_campanha === 'utilizar' && <Zap size={11} className="text-emerald-400" aria-label="Campanha pode usar" />}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{tipoLabel}{p.localizacao ? ` · ${p.localizacao}` : ''}</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleExpandido(p.id)}
                    className="rounded p-1.5 text-gray-600 hover:text-emerald-300"
                    title="Detalhes"
                  >
                    {isExpandido ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  </button>
                  {podeGerenciarResumo(p) && (
                    <>
                      <button
                        type="button"
                        onClick={() => editarPorId(p.id)}
                        className="rounded p-1.5 text-gray-600 hover:text-blue-300"
                        title="Editar"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerPropriedade(p)}
                        className="rounded p-1.5 text-gray-600 hover:text-red-300"
                        title="Remover"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isExpandido && (
                <div className="border-t border-emerald-500/10 px-4 pb-4 pt-3">
                  {carregandoDetalhe && propriedadeAberta === p.id && (
                    <p className="text-center text-xs text-gray-600">Carregando...</p>
                  )}
                  {detalhe && detalhe.id === p.id && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {[
                          { label: 'Patamar', value: detalhe.patamar || '-' },
                          { label: 'Qualidade', value: detalhe.qualidade_quartos || '-' },
                          { label: 'Aquisição', value: `${detalhe.valor_aquisicao.toLocaleString('pt-BR')} L$` },
                          { label: 'Manutenção', value: `${detalhe.manutencao.toLocaleString('pt-BR')} L$/mês` },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-black/30 p-2 text-center">
                            <p className="text-[10px] text-gray-500">{label}</p>
                            <p className="font-bold text-sm text-white">{value}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cyan-500/60">
                          <Wrench size={10} className="inline mr-1" />
                          Instalações
                        </p>
                        <div className="space-y-1">
                          {detalhe.instalacoes.map((inst) => (
                            <div key={inst.id} className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs">
                              <span className="text-gray-200">{inst.nome} <span className="text-gray-500">(Nível {inst.nivel})</span></span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-600">{inst.espacos_ocupados} esp.</span>
                                {podeGerenciarDetalhe && (
                                  <button type="button" onClick={() => removerInstalacao(inst.id)} className="text-red-500 hover:text-red-300">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          {detalhe.instalacoes.length === 0 && (
                            <p className="text-xs text-gray-600">Nenhuma instalação.</p>
                          )}
                        </div>
                        {podeGerenciarDetalhe && (
                          <div className="mt-2 space-y-2 rounded-lg border border-white/5 bg-black/10 p-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <Select
                                  value={novaInstalacaoTipo}
                                  onChange={(v) => { setNovaInstalacaoTipo(v); setNovaInstalacaoNivel(1); }}
                                  placeholder="Tipo de instalação..."
                                  options={[...INSTALACOES_BASE.map((i) => ({ value: i.id, label: i.titulo })), { value: INSTALACAO_PERSONALIZADA, label: 'Personalizada...' }]}
                                />
                              </div>
                              {catalogoInstalacaoSelecionado && (
                                <div className="w-44">
                                  <Select
                                    value={String(novaInstalacaoNivel)}
                                    onChange={(v) => setNovaInstalacaoNivel(Number(v))}
                                    options={catalogoInstalacaoSelecionado.niveis.map((n) => ({ value: String(n.nivel), label: `Nível ${n.nivel} · ${n.espacos} esp.` }))}
                                  />
                                </div>
                              )}
                            </div>
                            {novaInstalacaoTipo === INSTALACAO_PERSONALIZADA && (
                              <input
                                value={novaInstalacaoNomePersonalizado}
                                onChange={(e) => setNovaInstalacaoNomePersonalizado(e.target.value)}
                                placeholder="Nome da instalação personalizada"
                                className="w-full rounded-md border border-white/5 bg-[#121118] px-3 py-1.5 text-xs text-gray-300 outline-none focus:border-emerald-500/50"
                              />
                            )}
                            {nivelInstalacaoSelecionado && nivelInstalacaoSelecionado.efeitos.length > 0 && (
                              <p className="text-[11px] leading-relaxed text-gray-500">{nivelInstalacaoSelecionado.efeitos.join(' ')}</p>
                            )}
                            <button
                              type="button"
                              onClick={adicionarInstalacao}
                              disabled={novaInstalacaoTipo === INSTALACAO_PERSONALIZADA ? !novaInstalacaoNomePersonalizado.trim() : !novaInstalacaoTipo}
                              className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 disabled:opacity-40"
                            >
                              <Plus size={12} /> Adicionar
                            </button>
                          </div>
                        )}
                      </div>

                      {podeGerenciarDetalhe && (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-purple-400/60">
                            <KeyRound size={10} className="inline mr-1" />
                            Acesso individual
                          </p>
                          <p className="mb-2 text-[11px] text-gray-600">Conceda acesso a outro personagem - por exemplo, quando dois jogadores dividem a mesma base ou comércio.</p>
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

                      {podeGerenciarDetalhe && (
                        <button
                          type="button"
                          onClick={() => abrirFormEditar(detalhe)}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-xs font-bold text-gray-400 hover:text-white"
                        >
                          <Pencil size={12} /> Editar Base
                        </button>
                      )}
                    </div>
                  )}
                  {!carregandoDetalhe && (!detalhe || detalhe.id !== p.id) && (
                    <button
                      type="button"
                      onClick={() => abrirDetalhe(p.id)}
                      className="w-full rounded-lg bg-emerald-500/5 py-2 text-xs font-bold text-emerald-400/60 hover:text-emerald-300"
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

      {/* Modal: Criar/Editar Propriedade */}
      <FichaModal
        isOpen={modalForm}
        onClose={() => setModalForm(false)}
        title={editandoId ? 'Editar Base' : 'Nova Base na Campanha'}
        size="lg"
      >
        <div className="space-y-4">
          <LabeledInput label="Nome" value={form.nome} placeholder="Ex.: Refúgio da Colina" onChange={(val: string) => setForm(f => ({ ...f, nome: val }))} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo</label>
              <Select value={form.tipo} onChange={(v) => setForm(f => ({ ...f, tipo: v }))} options={TIPO_OPCOES} />
            </div>
            <LabeledInput label="Localização" value={form.localizacao ?? ''} onChange={(val: string) => setForm(f => ({ ...f, localizacao: val }))} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LabeledInput label="Aquisição (L$)" type="number" value={String(form.valor_aquisicao ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, valor_aquisicao: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Manutenção (L$/mês)" type="number" value={String(form.manutencao ?? 0)} onChange={(val: string) => setForm(f => ({ ...f, manutencao: Math.max(0, Number(val)) }))} />
            <LabeledInput label="Patamar" value={form.patamar ?? ''} onChange={(val: string) => setForm(f => ({ ...f, patamar: val }))} />
            <LabeledInput label="Qualidade" value={form.qualidade_quartos ?? ''} onChange={(val: string) => setForm(f => ({ ...f, qualidade_quartos: val }))} />
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
              className="resize-none rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-emerald-500/50"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button type="button" onClick={() => setModalForm(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={salvarPropriedade} disabled={salvando || !form.nome.trim()} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-300 disabled:opacity-40">
              {salvando ? 'Salvando...' : 'Salvar Base'}
            </button>
          </div>
        </div>
      </FichaModal>

      {/* Modal: Migrar Propriedade Legada */}
      <FichaModal
        isOpen={modalMigrar}
        onClose={() => setModalMigrar(false)}
        title="Mover Propriedade para a Campanha"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Selecione uma propriedade sua para movê-la para as Bases da Campanha. Esta ação é definitiva e irá remover a propriedade da sua lista pessoal.
          </p>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Propriedade para mover</label>
            <Select
              value={migrandoId ?? ''}
              onChange={setMigrandoId}
              placeholder="Selecione uma propriedade..."
              options={propriedadesLegadas.map(p => ({ value: p.id, label: p.nome }))}
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-4">
            <input
              type="checkbox"
              checked={compartilharAoMigrar}
              onChange={(e) => setCompartilharAoMigrar(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-bold text-emerald-300 flex items-center gap-1.5"><Share2 size={13} /> Compartilhar com a campanha</p>
              <p className="text-xs text-gray-500 mt-0.5">Todos os jogadores poderão utilizar e ver as informações desta base.</p>
            </div>
          </label>

          <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-3">
            <p className="text-xs text-red-400">⚠ Esta ação removerá a propriedade da sua lista pessoal. Não será possível desfazer sem o auxílio do Mestre.</p>
          </div>

          <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
            <button type="button" onClick={() => setModalMigrar(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
            <button type="button" onClick={confirmarMigrar} disabled={!migrandoId} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-300 disabled:opacity-40">
              <Upload size={13} className="inline mr-1" />Mover para a Campanha
            </button>
          </div>
        </div>
      </FichaModal>
    </section>
  );
};
