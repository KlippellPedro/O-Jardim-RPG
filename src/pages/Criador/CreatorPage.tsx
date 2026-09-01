import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, BookOpenText, Eye, UserCog, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select } from '../../components/ui/Select';
import { ConteudoMestrePanel } from '../../components/Settings/ConteudoMestrePanel';
import { VisibilidadeCampanha } from '../../components/Settings/VisibilidadeCampanha';
import { LiberacoesIndividuaisPanel } from '../../components/Settings/LiberacoesIndividuaisPanel';
import { campanhasApi } from '../../services/campanhasApi';
import { personagensApi } from '../../services/personagensApi';

interface CampanhaResumo {
  id: string;
  nome: string;
  status: string;
}

interface CampanhaDetalhe {
  campanha: { id: string; nome: string; descricao?: string; configuracoes?: Record<string, any> };
  membros: Array<{ id: string; nome_exibicao: string; papel: string }>;
}

type AbaCriador = 'conteudo' | 'visibilidade' | 'liberacoes';

/** Painel exclusivo do criador da plataforma: edita o Mundo global e também
 * regras/loja/visibilidade/liberações de QUALQUER campanha ativa, sem depender da
 * campanha ativa do próprio criador (`useAuthStore.campanhaAtiva`) - por
 * isso tem seletor de campanha próprio, ao contrário do Painel do Mestre. */
export default function CreatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campanhas, setCampanhas] = useState<CampanhaResumo[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [campanhaId, setCampanhaId] = useState<string>(() => searchParams.get('campanha_id') || '');
  const [detalhe, setDetalhe] = useState<CampanhaDetalhe | null>(null);
  const [personagens, setPersonagens] = useState<Array<{ id: string; nome: string }>>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conteudoDirty, setConteudoDirty] = useState(false);

  const abaInicial = searchParams.get('aba') === 'visibilidade' || searchParams.get('aba') === 'liberacoes'
    ? (searchParams.get('aba') as AbaCriador)
    : 'conteudo';
  const [activeTab, setActiveTab] = useState<AbaCriador>(abaInicial);
  const secaoSolicitada = searchParams.get('secao');
  const itemSolicitado = searchParams.get('item') || undefined;
  const secaoConteudo = secaoSolicitada === 'cronologia' || secaoSolicitada === 'loja' || secaoSolicitada === 'regras'
    ? secaoSolicitada
    : 'lore';

  useEffect(() => {
    campanhasApi.listar()
      .then((resposta: { campanhas: CampanhaResumo[] }) => {
        setCampanhas(resposta.campanhas || []);
        setCampanhaId((atual) => atual || resposta.campanhas?.[0]?.id || '');
      })
      .catch((error: any) => setErro(error?.message || 'Não foi possível listar as campanhas.'))
      .finally(() => setCarregandoLista(false));
  }, []);

  useEffect(() => {
    if (!campanhaId) return;
    setCarregandoDetalhe(true);
    setErro(null);
    Promise.all([
      campanhasApi.obter(campanhaId) as Promise<CampanhaDetalhe>,
      personagensApi.listar(campanhaId, true),
    ])
      .then(([campanhaResposta, personagensResposta]) => {
        setDetalhe(campanhaResposta);
        setPersonagens((personagensResposta.personagens || []).map((p) => ({ id: p.id, nome: p.nome })));
      })
      .catch((error: any) => setErro(error?.message || 'Não foi possível carregar esta campanha.'))
      .finally(() => setCarregandoDetalhe(false));
  }, [campanhaId]);

  const trocarCampanha = (proximoId: string) => {
    setCampanhaId(proximoId);
    const proximosParametros = new URLSearchParams(searchParams);
    proximosParametros.set('campanha_id', proximoId);
    setSearchParams(proximosParametros, { replace: true });
  };

  const trocarAba = (proxima: AbaCriador) => {
    if (proxima === activeTab) return;
    if (activeTab === 'conteudo' && conteudoDirty
      && !window.confirm('Existem alterações de conteúdo não salvas. Deseja descartá-las?')) return;
    setConteudoDirty(false);
    setActiveTab(proxima);
  };

  const salvarVisibilidade = async (configuracoes: Record<string, any>) => {
    if (!campanhaId) return;
    const atualizado = await campanhasApi.atualizarVisibilidade(campanhaId, configuracoes) as { campanha: CampanhaDetalhe['campanha'] };
    setDetalhe((atual) => atual && { ...atual, campanha: atualizado.campanha });
  };

  return (
    <div role="main" className="app-page mx-auto max-w-7xl">
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-3 flex items-center gap-3 text-[clamp(2rem,7vw,3rem)] font-bold leading-tight text-white sm:gap-4" style={{ fontFamily: 'Cinzel, serif' }}>
            <Crown className="text-primary" size={40} />
            Painel do Criador
          </h1>
          <p className="text-gray-400 text-lg">Mundo global, regras, loja e visibilidade das campanhas da plataforma.</p>
        </div>
        <div className="w-full md:w-80">
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Campanha</label>
          {carregandoLista ? (
            <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 size={14} className="animate-spin" /> Carregando campanhas...</div>
          ) : campanhas.length === 0 ? (
            <p className="text-xs italic text-gray-600">Nenhuma campanha ativa na plataforma ainda.</p>
          ) : (
            <Select
              value={campanhaId}
              onChange={trocarCampanha}
              options={campanhas.map((campanha) => ({ value: campanha.id, label: campanha.nome }))}
              placeholder="Selecione uma campanha"
              className="w-full"
            />
          )}
        </div>
      </div>

      {erro && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{erro}</div>}

      {!campanhaId ? (
        <p className="py-16 text-center text-sm italic text-gray-600">Escolha uma campanha acima para começar.</p>
      ) : carregandoDetalhe || !detalhe ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Carregando campanha...</div>
      ) : (
        <>
          <div className="horizontal-scroll mb-6 flex gap-4 overflow-x-auto border-b border-white/10 pb-1 custom-scrollbar">
            <button
              onClick={() => trocarAba('conteudo')}
              className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
                activeTab === 'conteudo' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <BookOpenText size={16} /> Conteúdo
            </button>
            <button
              onClick={() => trocarAba('visibilidade')}
              className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
                activeTab === 'visibilidade' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Eye size={16} /> Visibilidade
            </button>
            <button
              onClick={() => trocarAba('liberacoes')}
              className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
                activeTab === 'liberacoes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <UserCog size={16} /> Liberações Individuais
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'conteudo' && (
              <motion.div key="conteudo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <ConteudoMestrePanel campanhaId={campanhaId} initialAba={secaoConteudo} initialItem={itemSolicitado} onDirtyChange={setConteudoDirty} />
              </motion.div>
            )}

            {activeTab === 'visibilidade' && (
              <motion.div
                key="visibilidade"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative flex min-h-[min(600px,70dvh)] flex-col rounded-3xl border border-white/10 bg-[#0a090e] p-6 shadow-2xl md:p-8"
              >
                <VisibilidadeCampanha
                  campanhaId={campanhaId}
                  configuracoes={detalhe.campanha.configuracoes}
                  membros={detalhe.membros}
                  onSalvar={salvarVisibilidade}
                />
              </motion.div>
            )}

            {activeTab === 'liberacoes' && (
              <motion.div
                key="liberacoes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="relative flex min-h-[min(600px,70dvh)] flex-col rounded-3xl border border-white/10 bg-[#0a090e] p-6 shadow-2xl md:p-8"
              >
                <LiberacoesIndividuaisPanel campanhaId={campanhaId} membros={detalhe.membros} personagens={personagens} />
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
