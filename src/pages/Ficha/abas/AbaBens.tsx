import { useState } from 'react';
import { Building2, MapPin, Pencil, Trash2 } from 'lucide-react';
import { PATAMARES_BASE } from '../../../../data/regras/bases';

import { AbaInventario } from './AbaInventario';
import { FrotaCampanha } from './FrotaCampanha';
import { PropriedadesCampanha } from './PropriedadesCampanha';
import { AbasBens, type SecaoBens } from '../components/bens/AbasBens';
import { CardBem } from '../components/bens/CardBem';
import { EstadoVazioBem } from '../components/bens/EstadoVazioBem';
import { PlantaBase } from '../components/bens/PlantaBase';
import { PropriedadeModal } from '../components/bens/PropriedadeModal';
import { resumirBens } from '../utils/resumoBens';
import { useCharacterStore } from '../../../store/useCharacterStore';

import {
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

  const [secao, setSecao] = useState<SecaoBens>('meus');
  const resumo = resumirBens(propriedades, veiculosLegados.length);
  const [propriedadeModal, setPropriedadeModal] = useState(false);
  const [propriedadeEditandoId, setPropriedadeEditandoId] = useState<string | null>(null);
  const [propriedadeForm, setPropriedadeForm] = useState(PROPRIEDADE_VAZIA);

  const salvarPropriedades = (proximas: IPropriedadeFicha[]) => onUpdate(['ficha', 'propriedades'], proximas);

  const abrirNovaPropriedade = () => {
    setPropriedadeEditandoId(null);
    setPropriedadeForm(PROPRIEDADE_VAZIA);
    setPropriedadeModal(true);
  };

  const abrirPropriedade = (propriedade: IPropriedadeFicha) => {
    const { id, ...dados } = propriedade;
    setPropriedadeEditandoId(id);
    setPropriedadeForm({ ...PROPRIEDADE_VAZIA, ...dados });
    setPropriedadeModal(true);
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
      <AbasBens secao={secao} resumo={resumo} onMudar={setSecao} />

      <div role="tabpanel" id="bens-painel-meus" aria-labelledby="bens-tab-meus" hidden={secao !== 'meus'} className="space-y-8">
      <section className="rounded-2xl border border-white/5 bg-[#0f0e15] p-6" data-tour="bens-propriedades">
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
              <CardBem
                key={propriedade.id}
                kicker={`${tipo}${patamar ? ` · ${patamar}` : ''}`}
                titulo={propriedade.nome}
                acoes={(
                  <>
                    <button type="button" onClick={() => abrirPropriedade(propriedade)} className="p-1.5 text-gray-500 hover:text-blue-300" aria-label={`Editar ${propriedade.nome}`}><Pencil size={14} /></button>
                    <button type="button" onClick={() => removerPropriedade(propriedade)} className="p-1.5 text-gray-500 hover:text-red-300" aria-label={`Remover ${propriedade.nome}`}><Trash2 size={14} /></button>
                  </>
                )}
              >
                {propriedade.localizacao && <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400"><MapPin size={13} /> {propriedade.localizacao}</p>}
                {(propriedade.valorAquisicao > 0 || propriedade.manutencao > 0) && <p className="mt-3 text-xs text-gray-500">Aquisição: <strong className="text-gray-300">{propriedade.valorAquisicao.toLocaleString('pt-BR')} L$</strong> · Manutenção: <strong className="text-gray-300">{propriedade.manutencao.toLocaleString('pt-BR')} L$/mês</strong></p>}
                {propriedade.qualidadeQuartos && <p className="mt-2 text-xs font-bold text-amber-300">Qualidade dos Alojamentos: {QUALIDADES_QUARTO.find(q => q.value === propriedade.qualidadeQuartos)?.label || propriedade.qualidadeQuartos}</p>}
                {propriedade.descricao && <p className="mt-3 text-sm leading-relaxed text-gray-500">{propriedade.descricao}</p>}
                
                <PlantaBase
                  patamar={propriedade.patamar}
                  instalacoes={propriedade.instalacoes.map((inst) => ({ id: inst.id, nome: inst.nome, nivel: inst.nivel, espacos: inst.espacosOcupados }))}
                  onEditar={() => abrirPropriedade(propriedade)}
                />
              </CardBem>
            );
          })}
          {propriedades.length === 0 && (
            <EstadoVazioBem
              icone={<Building2 size={36} />}
              titulo="Nenhuma propriedade ainda"
              explicacao="Uma propriedade é um lugar seu: casa, terreno, comércio ou base. Com um patamar (Posto, Sede, Complexo ou Fortaleza) ela ganha vagas para instalações, como dormitório, oficina e área médica."
              categoriaLoja="Bens"
              acao={{ rotulo: 'Cadastrar à mão', onClick: abrirNovaPropriedade }}
            />
          )}
        </div>
      </section>

      <section aria-label="Veículos e peças" data-tour="bens-veiculos">
        <AbaInventario character={character} modo="veiculos" />
      </section>

      </div>

      <div role="tabpanel" id="bens-painel-equipe" aria-labelledby="bens-tab-equipe" hidden={secao !== 'equipe'} className="space-y-8">
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
      </div>

      <PropriedadeModal
        aberto={propriedadeModal}
        editando={Boolean(propriedadeEditandoId)}
        form={propriedadeForm}
        setForm={setPropriedadeForm}
        onFechar={() => setPropriedadeModal(false)}
        onSalvar={salvarPropriedade}
      />
    </div>
  );
};
