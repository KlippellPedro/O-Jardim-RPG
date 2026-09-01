import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { personagensApi, PersonagemApiRecord } from '../../services/personagensApi';
import { campanhasApi } from '../../services/campanhasApi';
import { Shield, Users, Settings, Gem, FileClock, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MestrePanel } from '../../components/Settings/MestrePanel';
import { CofrePanel } from '../../components/Settings/CofrePanel';
import { ConcederItemModal } from '../../components/Settings/ConcederItemModal';
import { LogsMestrePanel } from '../../components/Settings/LogsMestrePanel';
import { EstatisticasCampanha } from '../../components/Settings/EstatisticasCampanha';
import { PersonagensPainel } from '../../components/Settings/PersonagensPainel';

interface MembroCampanha {
  id: string;
  nome_exibicao: string;
}

export const MasterPage = () => {
  const { campanhaAtiva, usuario } = useAuthStore();
  const [personagens, setPersonagens] = useState<PersonagemApiRecord[]>([]);
  const [membros, setMembros] = useState<MembroCampanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [activeTab, setActiveTab] = useState<'personagens' | 'estatisticas' | 'cofre' | 'logs' | 'configs'>('personagens');
  const [transferindoId, setTransferindoId] = useState<string | null>(null);
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null);
  const [concedendoParaId, setConcedendoParaId] = useState<string | null>(null);

  // Assistente também gerencia conteúdo da campanha (convites, auditoria) -
  // só ações mais sensíveis (arquivar, trocar papel, transferir dono) ficam
  // reservadas ao mestre de verdade, gated dentro de cada painel. Editar
  // lore/regras/loja/visibilidade não é mais coisa deste painel - isso é
  // exclusivo do criador da plataforma, em /criador.
  const isMestre = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente'
    || usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador';

  const trocarAbaPrincipal = (next: typeof activeTab) => {
    if (next === activeTab) return;
    setActiveTab(next);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (campanhaAtiva?.id && isMestre) {
      Promise.all([
        personagensApi.listar(campanhaAtiva.id, true),
        campanhasApi.obter(campanhaAtiva.id) as Promise<{ membros?: MembroCampanha[] }>,
      ])
        .then(([personagensRes, campanhaRes]) => {
          setPersonagens(personagensRes.personagens || []);
          setMembros(campanhaRes.membros || []);
        })
        .catch(err => console.error("Erro ao listar personagens", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [campanhaAtiva, isMestre]);

  const handleTransferirDono = async (personagemId: string, novoDonoUsuarioId: string) => {
    if (!novoDonoUsuarioId) return;
    setTransferindoId(personagemId);
    setErroTransferencia(null);
    try {
      const resultado = await personagensApi.transferirDono(personagemId, novoDonoUsuarioId);
      setPersonagens(prev => prev.map(p => (
        p.id === personagemId
          ? { ...p, dono_usuario_id: resultado.dono_usuario_id, dono_nome: resultado.dono_nome }
          : p
      )));
    } catch (err: any) {
      setErroTransferencia(err?.message || 'Nao foi possivel transferir o personagem.');
    } finally {
      setTransferindoId(null);
    }
  };

  if (!isMestre) {
    return (
      <div className="app-page flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl flex flex-col items-center">
          <Shield size={48} className="mb-4 opacity-50" />
          <h2 className="text-xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-sm">Apenas o mestre da campanha tem acesso a este painel.</p>
        </div>
      </div>
    );
  }

  return (
    <div role="main" className="app-page mx-auto max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="mb-3 flex items-center gap-3 text-[clamp(2rem,7vw,3rem)] font-bold leading-tight text-white sm:gap-4" style={{ fontFamily: 'Cinzel, serif' }}>
            <Shield className="text-primary" size={40} />
            Painel do Mestre
          </h1>
          <p className="text-gray-400 text-lg">
            Visão geral da campanha <span className="text-primary font-bold">{campanhaAtiva?.nome}</span>
          </p>
        </div>
      </div>

      <div className="horizontal-scroll mb-6 flex gap-4 overflow-x-auto border-b border-white/10 pb-1 custom-scrollbar">
        <button
          onClick={() => trocarAbaPrincipal('personagens')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'personagens' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Users size={16} /> Personagens
        </button>
        <button
          onClick={() => trocarAbaPrincipal('estatisticas')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'estatisticas' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <BarChart3 size={16} /> Estatísticas
        </button>
        <button
          onClick={() => trocarAbaPrincipal('cofre')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'cofre' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Gem size={16} /> Cofre
        </button>
        <button
          onClick={() => trocarAbaPrincipal('logs')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <FileClock size={16} /> Logs
        </button>
        <button
          onClick={() => trocarAbaPrincipal('configs')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'configs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Settings size={16} /> Configurações e Convites
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'personagens' && (
          <motion.div
            key="personagens"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <PersonagensPainel
              personagens={personagens}
              membros={membros}
              loading={loading}
              busca={busca}
              onBuscaChange={setBusca}
              transferindoId={transferindoId}
              erroTransferencia={erroTransferencia}
              onTransferir={handleTransferirDono}
              onConcederNovo={() => setConcedendoParaId('')}
              onConcederPara={(personagemId) => setConcedendoParaId(personagemId)}
            />
          </motion.div>
        )}

        {activeTab === 'estatisticas' && (
          <motion.div
            key="estatisticas"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative flex min-h-[min(600px,70dvh)] flex-col rounded-3xl border border-white/10 bg-[#0a090e] p-6 shadow-2xl md:p-8"
          >
            <EstatisticasCampanha personagens={personagens} loading={loading} />
          </motion.div>
        )}

        {activeTab === 'cofre' && (
          <motion.div
            key="cofre"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative flex min-h-[min(600px,70dvh)] flex-col rounded-3xl border border-white/10 bg-[#0a090e] shadow-2xl"
          >
            <div className="flex-1 w-full h-full p-2 md:p-6">
              <CofrePanel />
            </div>
          </motion.div>
        )}

        {activeTab === 'logs' && campanhaAtiva && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <LogsMestrePanel
              campanhaId={campanhaAtiva.id}
              personagens={personagens.map((personagem) => ({ id: personagem.id, nome: personagem.nome }))}
              membros={membros.map((membro) => ({ id: membro.id, nome: membro.nome_exibicao }))}
            />
          </motion.div>
        )}

        {activeTab === 'configs' && (
          <motion.div
            key="configs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="relative flex min-h-[min(600px,70dvh)] flex-col rounded-3xl border border-white/10 bg-[#0a090e] shadow-2xl"
          >
            {/* Reusing the MestrePanel directly but rendering it natively inside the page container */}
            <div className="flex-1 w-full h-full p-2 md:p-6">
               <MestrePanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {campanhaAtiva && (
        <ConcederItemModal
          isOpen={concedendoParaId !== null}
          onClose={() => setConcedendoParaId(null)}
          campanhaId={campanhaAtiva.id}
          personagens={personagens.map((p) => ({ id: p.id, nome: p.nome }))}
          personagemInicialId={concedendoParaId || undefined}
        />
      )}
    </div>
  );
};

export default MasterPage;
