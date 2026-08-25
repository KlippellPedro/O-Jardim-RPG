import { useState } from 'react';
import { Building2, MapPin, Pencil, Trash2, Plus } from 'lucide-react';
import { PATAMARES_BASE, INSTALACOES_BASE } from '../../../../data/regras/bases';

const INSTALACAO_PERSONALIZADA = '__personalizada__';
import { Select } from '../../../components/ui/Select';
import { FichaModal } from '../components/FichaModal';
import { LabeledInput } from '../components/SharedFichaComponents';
import { AbaInventario } from './AbaInventario';
import { FrotaCampanha } from './FrotaCampanha';
import { PropriedadesCampanha } from './PropriedadesCampanha';
import { useCharacterStore } from '../../../store/useCharacterStore';

import {
  calcularEspacosPropriedade,
  IPropriedadeFicha,
  normalizarPropriedades,
  novoIdPropriedade,
  numeroFinito,
  PROPRIEDADE_VAZIA,
  QUALIDADES_QUARTO,
  TIPOS_PROPRIEDADE,
} from '../../../services/propriedadeService';
import { normalizarCategoriaInventarioLoja } from '../../../services/lojaCatalogService';

export const AbaBens = ({ character, onUpdate }: { character: any; onUpdate: any }) => {
  const ficha = character.ficha || {};
  const propriedades = normalizarPropriedades(ficha.propriedades);
  const fetchCharacters = useCharacterStore((s) => s.fetchCharacters);

  // Veículos legados: itens do inventário real (inventario_personagem) com categoria 'veiculo'
  const inventarioLegado: any[] = character.inventarioCentral || [];
  const veiculosLegados = inventarioLegado
    .filter((item: any) => normalizarCategoriaInventarioLoja(item.dados) === 'veiculo' || item.dados?.categoria === 'veiculo')
    .map((item: any) => ({ id: item.item_id, nome: item.titulo || item.dados?.nome || 'Veículo sem nome' }));

  const [propriedadeModal, setPropriedadeModal] = useState(false);
  const [propriedadeEditandoId, setPropriedadeEditandoId] = useState<string | null>(null);
  const [propriedadeForm, setPropriedadeForm] = useState(PROPRIEDADE_VAZIA);
  const [novoTipoInstalacao, setNovoTipoInstalacao] = useState('');
  const [novoNivelInstalacao, setNovoNivelInstalacao] = useState(1);

  const salvarPropriedades = (proximas: IPropriedadeFicha[]) => onUpdate(['ficha', 'propriedades'], proximas);

  const abrirNovaPropriedade = () => {
    setPropriedadeEditandoId(null);
    setPropriedadeForm(PROPRIEDADE_VAZIA);
    setNovoTipoInstalacao('');
    setNovoNivelInstalacao(1);
    setPropriedadeModal(true);
  };

  const abrirPropriedade = (propriedade: IPropriedadeFicha) => {
    const { id, ...dados } = propriedade;
    setPropriedadeEditandoId(id);
    setPropriedadeForm({ ...PROPRIEDADE_VAZIA, ...dados });
    setNovoTipoInstalacao('');
    setNovoNivelInstalacao(1);
    setPropriedadeModal(true);
  };

  const patamarSelecionado = PATAMARES_BASE.find((item) => item.id === propriedadeForm.patamar);
  const nivelMaximoInstalacao = patamarSelecionado?.nivelInstalacaoMaximo ?? 3;
  const catalogoInstalacaoSelecionado = INSTALACOES_BASE.find((item) => item.id === novoTipoInstalacao);
  const niveisDisponiveis = (catalogoInstalacaoSelecionado?.niveis || []).filter((n) => n.nivel <= nivelMaximoInstalacao);

  const adicionarInstalacaoDoCatalogo = () => {
    if (novoTipoInstalacao === INSTALACAO_PERSONALIZADA) {
      setPropriedadeForm((atual) => ({ ...atual, instalacoes: [...atual.instalacoes, { id: novoIdPropriedade('inst'), nome: '', nivel: 1, espacosOcupados: 1 }] }));
    } else if (catalogoInstalacaoSelecionado) {
      const nivelInfo = catalogoInstalacaoSelecionado.niveis.find((n) => n.nivel === novoNivelInstalacao) || niveisDisponiveis[0];
      if (!nivelInfo) return;
      setPropriedadeForm((atual) => ({
        ...atual,
        instalacoes: [...atual.instalacoes, { id: novoIdPropriedade('inst'), nome: catalogoInstalacaoSelecionado.titulo, nivel: nivelInfo.nivel, espacosOcupados: nivelInfo.espacos }],
      }));
    } else {
      return;
    }
    setNovoTipoInstalacao('');
    setNovoNivelInstalacao(1);
  };

  const salvarPropriedade = () => {
    const nome = propriedadeForm.nome.trim();
    if (!nome) return;
    const registro: IPropriedadeFicha = {
      id: propriedadeEditandoId || novoIdPropriedade('propriedade'),
      nome,
      tipo: propriedadeForm.tipo || 'outro',
      localizacao: propriedadeForm.localizacao.trim(),
      patamar: propriedadeForm.patamar,
      valorAquisicao: Math.max(0, numeroFinito(propriedadeForm.valorAquisicao)),
      manutencao: Math.max(0, numeroFinito(propriedadeForm.manutencao)),
      descricao: propriedadeForm.descricao.trim(),
      qualidadeQuartos: propriedadeForm.qualidadeQuartos || '',
      instalacoes: propriedadeForm.instalacoes || [],
    };
    salvarPropriedades(propriedadeEditandoId
      ? propriedades.map((item) => item.id === propriedadeEditandoId ? registro : item)
      : [...propriedades, registro]);
    setPropriedadeModal(false);
  };

  const removerPropriedade = (propriedade: IPropriedadeFicha) => {
    if (window.confirm(`Remover a propriedade "${propriedade.nome}"?`)) {
      salvarPropriedades(propriedades.filter((item) => item.id !== propriedade.id));
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              <Building2 size={22} className="text-emerald-400" /> Propriedades
            </h2>
            <p className="mt-1 text-sm text-gray-500">Casas, terrenos, comércios e bases pertencentes ao personagem.</p>
          </div>
          <button type="button" onClick={abrirNovaPropriedade} className="rounded-xl border border-emerald-500/30 px-5 py-2.5 text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/10">+ Adicionar Propriedade</button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {propriedades.map((propriedade) => {
            const tipo = TIPOS_PROPRIEDADE.find((item) => item.value === propriedade.tipo)?.label || 'Outro';
            const patamar = PATAMARES_BASE.find((item) => item.id === propriedade.patamar)?.titulo;
            return (
              <article key={propriedade.id} className="rounded-xl border border-emerald-500/15 bg-emerald-950/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">{tipo}{patamar ? ` · ${patamar}` : ''}</span>
                    <h3 className="mt-1 truncate text-lg font-bold text-white">{propriedade.nome}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => abrirPropriedade(propriedade)} className="p-1.5 text-gray-500 hover:text-blue-300" aria-label={`Editar ${propriedade.nome}`}><Pencil size={14} /></button>
                    <button type="button" onClick={() => removerPropriedade(propriedade)} className="p-1.5 text-gray-500 hover:text-red-300" aria-label={`Remover ${propriedade.nome}`}><Trash2 size={14} /></button>
                  </div>
                </div>
                {propriedade.localizacao && <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400"><MapPin size={13} /> {propriedade.localizacao}</p>}
                {(propriedade.valorAquisicao > 0 || propriedade.manutencao > 0) && <p className="mt-3 text-xs text-gray-500">Aquisição: <strong className="text-gray-300">{propriedade.valorAquisicao.toLocaleString('pt-BR')} L$</strong> · Manutenção: <strong className="text-gray-300">{propriedade.manutencao.toLocaleString('pt-BR')} L$/mês</strong></p>}
                {propriedade.qualidadeQuartos && <p className="mt-2 text-xs font-bold text-amber-300">Qualidade dos Alojamentos: {QUALIDADES_QUARTO.find(q => q.value === propriedade.qualidadeQuartos)?.label || propriedade.qualidadeQuartos}</p>}
                {propriedade.descricao && <p className="mt-3 text-sm leading-relaxed text-gray-500">{propriedade.descricao}</p>}
                
                {propriedade.instalacoes.length > 0 && (
                  <div className="mt-4 border-t border-emerald-500/10 pt-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500/50">Instalações ({propriedade.instalacoes.reduce((acc, i) => acc + i.espacosOcupados, 0)} espaços ocupados)</p>
                    <ul className="flex flex-col gap-1 text-xs text-gray-400">
                      {propriedade.instalacoes.map((inst) => (
                        <li key={inst.id} className="flex justify-between">
                          <span>• {inst.nome} (Nível {inst.nivel})</span>
                          <span className="font-mono text-[10px] text-gray-500">{inst.espacosOcupados} esp.</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
          {propriedades.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-white/10 py-10 text-center"><Building2 size={36} className="mx-auto mb-3 text-gray-700" /><p className="text-xs font-bold uppercase tracking-widest text-gray-600">Nenhuma propriedade registrada</p></div>}
        </div>
      </section>

      <section aria-label="Veículos e peças">
        <AbaInventario character={character} modo="veiculos" />
      </section>

      <FrotaCampanha
        character={character}
        veiculosLegados={veiculosLegados}
        onMigrarVeiculo={() => {
          // O backend já removeu o item de inventario_personagem: recarrega para refletir na Aba Inventário.
          void fetchCharacters();
        }}
      />

      <PropriedadesCampanha
        character={character}
        propriedadesLegadas={propriedades}
        onMigrarPropriedade={(propriedadeLocalId) => {
          salvarPropriedades(propriedades.filter((p) => p.id !== propriedadeLocalId));
        }}
      />

      <FichaModal isOpen={propriedadeModal} onClose={() => setPropriedadeModal(false)} title={propriedadeEditandoId ? 'Editar Propriedade' : 'Nova Propriedade'} size="lg">
        <div className="space-y-4">
          <LabeledInput label="Nome" value={propriedadeForm.nome} placeholder="Ex.: Casa do Porto" onChange={(valor: string) => setPropriedadeForm((atual) => ({ ...atual, nome: valor }))} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo</label><Select value={propriedadeForm.tipo} onChange={(valor) => setPropriedadeForm((atual) => ({ ...atual, tipo: valor }))} options={TIPOS_PROPRIEDADE} /></div>
            <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Patamar de base (opcional)</label><Select value={propriedadeForm.patamar} onChange={(valor) => setPropriedadeForm((atual) => ({ ...atual, patamar: valor }))} placeholder="Sem patamar" options={[{ value: '', label: 'Sem patamar' }, ...PATAMARES_BASE.map((item) => ({ value: item.id, label: item.titulo }))]} /></div>
          </div>
          <LabeledInput label="Localização" value={propriedadeForm.localizacao} placeholder="Cidade, dimensão ou coordenadas" onChange={(valor: string) => setPropriedadeForm((atual) => ({ ...atual, localizacao: valor }))} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <LabeledInput label="Valor de aquisição (L$)" type="number" value={String(propriedadeForm.valorAquisicao)} onChange={(valor: string) => setPropriedadeForm((atual) => ({ ...atual, valorAquisicao: Number(valor) }))} />
            <LabeledInput label="Manutenção mensal (L$)" type="number" value={String(propriedadeForm.manutencao)} onChange={(valor: string) => setPropriedadeForm((atual) => ({ ...atual, manutencao: Number(valor) }))} />
          </div>
          <div><label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Qualidade dos Alojamentos</label><Select value={propriedadeForm.qualidadeQuartos} onChange={(valor) => setPropriedadeForm((atual) => ({ ...atual, qualidadeQuartos: valor }))} options={QUALIDADES_QUARTO} /></div>
          
          <div className="flex flex-col gap-3 rounded-lg border border-white/5 bg-black/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Instalações</p>
                <p className="text-xs text-gray-500">Espaços usados: <strong className="text-gray-300">{calcularEspacosPropriedade(propriedadeForm as IPropriedadeFicha).espacosUsados} / {calcularEspacosPropriedade(propriedadeForm as IPropriedadeFicha).espacosTotais}</strong></p>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-white/5 bg-black/20 p-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Tipo de instalação</label>
                <Select
                  value={novoTipoInstalacao}
                  onChange={(valor) => { setNovoTipoInstalacao(valor); setNovoNivelInstalacao(1); }}
                  placeholder="Ex.: Dormitório (cama), Área Médica..."
                  options={[...INSTALACOES_BASE.map((item) => ({ value: item.id, label: item.titulo })), { value: INSTALACAO_PERSONALIZADA, label: 'Personalizada...' }]}
                />
              </div>
              {catalogoInstalacaoSelecionado && (
                <div className="sm:w-48">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Nível</label>
                  <Select
                    value={String(novoNivelInstalacao)}
                    onChange={(valor) => setNovoNivelInstalacao(Number(valor))}
                    options={niveisDisponiveis.map((n) => ({ value: String(n.nivel), label: `Nível ${n.nivel} · ${n.espacos} esp.` }))}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={adicionarInstalacaoDoCatalogo}
                disabled={!novoTipoInstalacao || (catalogoInstalacaoSelecionado ? niveisDisponiveis.length === 0 : false)}
                className="flex items-center justify-center gap-1 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                <Plus size={12} /> Adicionar
              </button>
            </div>
            {catalogoInstalacaoSelecionado && niveisDisponiveis.length === 0 && (
              <p className="text-[11px] text-amber-400">O patamar escolhido não comporta o nível desta instalação.</p>
            )}
            {catalogoInstalacaoSelecionado && (
              <p className="text-[11px] leading-relaxed text-gray-500">{catalogoInstalacaoSelecionado.descricao}</p>
            )}
            {propriedadeForm.instalacoes.map((inst) => (
              <div key={inst.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <LabeledInput label="Nome da Instalação" value={inst.nome} placeholder="Ex.: Laboratório" onChange={(valor: string) => setPropriedadeForm(atual => ({ ...atual, instalacoes: atual.instalacoes.map(i => i.id === inst.id ? { ...i, nome: valor } : i) }))} />
                <LabeledInput label="Nível" type="number" value={String(inst.nivel)} onChange={(valor: string) => setPropriedadeForm(atual => ({ ...atual, instalacoes: atual.instalacoes.map(i => i.id === inst.id ? { ...i, nivel: Math.max(1, Number(valor)) } : i) }))} />
                <LabeledInput label="Espaços" type="number" value={String(inst.espacosOcupados)} onChange={(valor: string) => setPropriedadeForm(atual => ({ ...atual, instalacoes: atual.instalacoes.map(i => i.id === inst.id ? { ...i, espacosOcupados: Math.max(1, Number(valor)) } : i) }))} />
                <button type="button" onClick={() => setPropriedadeForm(atual => ({ ...atual, instalacoes: atual.instalacoes.filter(i => i.id !== inst.id) }))} className="mb-1 flex h-9 w-9 items-center justify-center rounded border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1"><label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Descrição adicional</label><textarea value={propriedadeForm.descricao} onChange={(event) => setPropriedadeForm((atual) => ({ ...atual, descricao: event.target.value }))} rows={4} className="resize-none rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 outline-none focus:border-[#c7a44c]/50" /></div>
          <div className="flex justify-end gap-3 border-t border-white/5 pt-4"><button type="button" onClick={() => setPropriedadeModal(false)} className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-400 hover:text-white">Cancelar</button><button type="button" onClick={salvarPropriedade} disabled={!propriedadeForm.nome.trim()} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2.5 text-sm font-bold text-emerald-300 disabled:opacity-40">Salvar</button></div>
        </div>
      </FichaModal>
    </div>
  );
};
