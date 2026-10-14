import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Crown, BookOpenText, Eye, UserCog, Loader2, Ticket } from 'lucide-react';
import { motion } from 'framer-motion';
import { Select } from '../../components/ui/Select';
import { ConteudoMestrePanel } from '../../components/Settings/ConteudoMestrePanel';
import { VisibilidadeCampanha } from '../../components/Settings/VisibilidadeCampanha';
import { LiberacoesIndividuaisPanel } from '../../components/Settings/LiberacoesIndividuaisPanel';
import { ConvitesPlataformaPanel } from '../../components/Settings/ConvitesPlataformaPanel';
import { PainelCartao, PainelShell, type IAbaDoPainel } from '../../components/painel/PainelShell';
import { useAbaNaUrl } from '../../components/painel/useAbaNaUrl';
import { campanhasApi } from '../../services/campanhasApi';
import { personagensApi } from '../../services/personagensApi';
import { useAuthStore } from '../../store/useAuthStore';
import { perguntarDescarte } from '../../hooks/useUnsavedChanges';

interface CampanhaResumo {
  id: string;
  nome: string;
  status: string;
}

interface CampanhaDetalhe {
  campanha: { id: string; nome: string; descricao?: string; configuracoes?: Record<string, any> };
  membros: Array<{ id: string; nome_exibicao: string; papel: string }>;
}

const ABAS_CRIADOR = ['conteudo', 'visibilidade', 'liberacoes', 'convites'] as const;
type AbaCriador = typeof ABAS_CRIADOR[number];

const ABAS: IAbaDoPainel<AbaCriador>[] = [
  { id: 'conteudo', rotulo: 'Conteúdo', icone: BookOpenText },
  { id: 'visibilidade', rotulo: 'Visibilidade', icone: Eye },
  { id: 'liberacoes', rotulo: 'Liberações Individuais', icone: UserCog },
  // O convite do Mestre põe alguém numa mesa; este cria a conta na plataforma.
  { id: 'convites', rotulo: 'Convites de cadastro', icone: Ticket },
];

/** Painel exclusivo do criador da plataforma: edita o Mundo global e também
 * regras/loja/visibilidade/liberações de QUALQUER campanha ativa, sem depender da
 * campanha ativa do próprio criador (`useAuthStore.campanhaAtiva`) - por
 * isso tem seletor de campanha próprio, ao contrário do Painel do Mestre. A
 * campanha ativa só serve de ponto de partida do seletor. */
export default function CreatorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campanhaAtivaId = useAuthStore((estado) => estado.campanhaAtiva?.id);
  const [aba, definirAba] = useAbaNaUrl<AbaCriador>(ABAS_CRIADOR, 'conteudo');
  const [campanhas, setCampanhas] = useState<CampanhaResumo[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [campanhaId, setCampanhaId] = useState<string>(() => searchParams.get('campanha_id') || '');
  const [detalhe, setDetalhe] = useState<CampanhaDetalhe | null>(null);
  const [personagens, setPersonagens] = useState<Array<{ id: string; nome: string }>>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conteudoDirty, setConteudoDirty] = useState(false);

  const secaoSolicitada = searchParams.get('secao');
  const itemSolicitado = searchParams.get('item') || undefined;
  const secaoConteudo = secaoSolicitada === 'cronologia' || secaoSolicitada === 'entidades' || secaoSolicitada === 'loja' || secaoSolicitada === 'regras'
    ? secaoSolicitada
    : 'lore';

  useEffect(() => {
    campanhasApi.listar()
      .then((resposta: { campanhas: CampanhaResumo[] }) => {
        const lista = resposta.campanhas || [];
        setCampanhas(lista);
        // Sem campanha pedida na URL, começa pela que a pessoa já tem aberta no site.
        const inicial = lista.find((campanha) => campanha.id === campanhaAtivaId)?.id ?? lista[0]?.id ?? '';
        setCampanhaId((atual) => atual || inicial);
      })
      .catch((error: any) => setErro(error?.message || 'Não foi possível listar as campanhas.'))
      .finally(() => setCarregandoLista(false));
    // A lista só carrega uma vez; a campanha ativa serve de ponto de partida e não deve refazer a busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const trocarAba = async (proxima: AbaCriador) => {
    if (proxima === aba) return;
    if (aba === 'conteudo' && conteudoDirty
      && !(await perguntarDescarte('Existem alterações de conteúdo não salvas. Deseja descartá-las?'))) return;
    setConteudoDirty(false);
    definirAba(proxima);
  };

  // Convites são da plataforma inteira: a aba funciona sem campanha escolhida.
  const precisaDeCampanha = aba !== 'convites';

  const salvarVisibilidade = async (configuracoes: Record<string, any>) => {
    if (!campanhaId) return;
    const atualizado = await campanhasApi.atualizarVisibilidade(campanhaId, configuracoes) as { campanha: CampanhaDetalhe['campanha'] };
    setDetalhe((atual) => atual && { ...atual, campanha: atualizado.campanha });
  };

  const seletorDeCampanha = (
    <div className={`w-full md:w-80 ${precisaDeCampanha ? '' : 'invisible'}`}>
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
  );

  return (
    <PainelShell
      icone={Crown}
      titulo="Painel do Criador"
      subtitulo="Mundo global, regras, loja e visibilidade das campanhas da plataforma."
      acoes={seletorDeCampanha}
      abas={ABAS}
      abaAtiva={aba}
      aoTrocarAba={(proxima) => void trocarAba(proxima)}
    >
      {erro && <div role="alert" className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{erro}</div>}

      {aba === 'convites' ? (
        <motion.div key="convites" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <PainelCartao>
            <ConvitesPlataformaPanel />
          </PainelCartao>
        </motion.div>
      ) : precisaDeCampanha && !campanhaId ? (
        <p className="py-16 text-center text-sm italic text-gray-600">Escolha uma campanha acima para começar.</p>
      ) : carregandoDetalhe || !detalhe ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 size={16} className="animate-spin" /> Carregando campanha...</div>
      ) : (
        <motion.div key={aba} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {aba === 'conteudo' && (
            <ConteudoMestrePanel campanhaId={campanhaId} initialAba={secaoConteudo} initialItem={itemSolicitado} onDirtyChange={setConteudoDirty} />
          )}

          {aba === 'visibilidade' && (
            <PainelCartao>
              <VisibilidadeCampanha
                campanhaId={campanhaId}
                configuracoes={detalhe.campanha.configuracoes}
                membros={detalhe.membros}
                onSalvar={salvarVisibilidade}
              />
            </PainelCartao>
          )}

          {aba === 'liberacoes' && (
            <PainelCartao>
              <LiberacoesIndividuaisPanel campanhaId={campanhaId} membros={detalhe.membros} personagens={personagens} />
            </PainelCartao>
          )}
        </motion.div>
      )}
    </PainelShell>
  );
}
