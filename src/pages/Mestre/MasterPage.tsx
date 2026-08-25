import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { personagensApi, PersonagemApiRecord } from '../../services/personagensApi';
import { campanhasApi } from '../../services/campanhasApi';
import { Shield, Users, Search, Loader2, Settings, Gem, Coins, UserCog, PackagePlus, BookOpenText, FileClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MestrePanel } from '../../components/Settings/MestrePanel';
import { CofrePanel } from '../../components/Settings/CofrePanel';
import { ConcederItemModal } from '../../components/Settings/ConcederItemModal';
import { ConteudoMestrePanel } from '../../components/Settings/ConteudoMestrePanel';
import { LogsMestrePanel } from '../../components/Settings/LogsMestrePanel';
import { useSearchParams } from 'react-router-dom';

interface MembroCampanha {
  id: string;
  nome_exibicao: string;
}

export const MasterPage = () => {
  const [searchParams] = useSearchParams();
  const { campanhaAtiva, usuario } = useAuthStore();
  const [personagens, setPersonagens] = useState<PersonagemApiRecord[]>([]);
  const [membros, setMembros] = useState<MembroCampanha[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [activeTab, setActiveTab] = useState<'personagens' | 'cofre' | 'conteudo' | 'logs' | 'configs'>('personagens');
  const [conteudoDirty, setConteudoDirty] = useState(false);
  const [transferindoId, setTransferindoId] = useState<string | null>(null);
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null);
  const [concedendoParaId, setConcedendoParaId] = useState<string | null>(null);

  // Assistente também gerencia conteúdo da campanha (convites, auditoria) -
  // só ações mais sensíveis (arquivar, trocar papel, transferir dono) ficam
  // reservadas ao mestre de verdade, gated dentro de cada painel.
  const isMestre = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente'
    || usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador';
  const podeEditarConteudo = campanhaAtiva?.papel === 'mestre' || usuario?.papel_plataforma === 'criador';
  const abaSolicitada = searchParams.get('aba');
  const secaoSolicitada = searchParams.get('secao');
  const itemSolicitado = searchParams.get('item') || undefined;
  const secaoConteudo = secaoSolicitada === 'cronologia' || secaoSolicitada === 'loja' || secaoSolicitada === 'regras'
    ? secaoSolicitada
    : 'lore';

  const trocarAbaPrincipal = (next: typeof activeTab) => {
    if (next === activeTab) return;
    if (activeTab === 'conteudo' && conteudoDirty
      && !window.confirm('Existem alterações de conteúdo não salvas. Deseja descartá-las?')) return;
    setConteudoDirty(false);
    setActiveTab(next);
  };

  useEffect(() => {
    if (abaSolicitada === 'conteudo' && podeEditarConteudo) setActiveTab('conteudo');
  }, [abaSolicitada, podeEditarConteudo]);

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

  const filteredPersonagens = personagens.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()));
  const totalJogadores = new Set(personagens.map(p => p.dono_usuario_id).filter(Boolean)).size;
  const totalMoedas = personagens.reduce(
    (acc, p) => acc + (p.carteira?.reduce((sum, c) => sum + c.saldo, 0) || 0),
    0
  );

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

      <div className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4 sm:gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Total de Personagens</p>
            <p className="text-3xl font-bold text-white mt-1">{loading ? '...' : personagens.length}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Jogadores</p>
            <p className="text-3xl font-bold text-white mt-1">{loading ? '...' : totalJogadores}</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
            <Coins size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold">Moedas em Circulação</p>
            <p className="text-3xl font-bold text-white mt-1">{loading ? '...' : totalMoedas}</p>
          </div>
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
          onClick={() => trocarAbaPrincipal('cofre')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'cofre' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Gem size={16} /> Cofre
        </button>
        {podeEditarConteudo && (
          <button
            onClick={() => trocarAbaPrincipal('conteudo')}
            className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
              activeTab === 'conteudo' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <BookOpenText size={16} /> Conteúdo
          </button>
        )}
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
            className="bg-[#0a090e] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
          >
            <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-xl font-bold text-white flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
                <Users className="text-primary" size={20} /> Personagens da Campanha
              </h2>

          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                aria-label="Buscar personagem"
                placeholder="Buscar personagem..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <button
              onClick={() => setConcedendoParaId('')}
              className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 text-sm font-bold transition-colors"
            >
              <PackagePlus size={16} /> Conceder da Loja
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {erroTransferencia && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {erroTransferencia}
            </div>
          )}
          {loading ? (
            <div className="py-12 flex justify-center text-primary">
              <Loader2 size={32} className="animate-spin" />
            </div>
          ) : filteredPersonagens.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum personagem encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPersonagens.map((p, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={p.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-primary/30 transition-colors"
                >
                  <h3 className="text-lg font-bold text-white mb-2 truncate" style={{ fontFamily: 'Cinzel, serif' }}>{p.nome}</h3>
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-3">
                    <span>Versão: {p.versao}</span>
                    <span>Moedas: {p.carteira?.reduce((acc, c) => acc + c.saldo, 0) || 0}</span>
                  </div>

                  <div className="text-xs text-gray-500 mb-4 space-y-0.5">
                    <p className="truncate">Criado por: <span className="text-gray-400">{p.criado_por_nome || '-'}</span></p>
                    <p className="truncate">Jogador: <span className="text-gray-400">{p.dono_nome || 'Sem jogador atribuído'}</span></p>
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-1.5">
                      <UserCog size={12} /> Transferir para
                    </label>
                    <select
                      aria-label={`Transferir ${p.nome} para outro jogador`}
                      value={p.dono_usuario_id || ''}
                      disabled={transferindoId === p.id}
                      onChange={(e) => handleTransferirDono(p.id, e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                    >
                      <option value="" disabled>Selecione um jogador…</option>
                      {membros.map(membro => (
                        <option key={membro.id} value={membro.id}>{membro.nome_exibicao}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <a href={`/ficha/${p.id}`} className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-center text-sm font-bold border border-primary/20 hover:bg-primary/20 transition-colors">
                      Ver Ficha
                    </a>
                    <button
                      onClick={() => setConcedendoParaId(p.id)}
                      title="Conceder item, criatura ou propriedade da loja"
                      className="px-3 py-2 rounded-xl bg-white/5 text-gray-300 border border-white/10 hover:text-primary hover:border-primary/30 transition-colors"
                    >
                      <PackagePlus size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
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

        {activeTab === 'conteudo' && podeEditarConteudo && campanhaAtiva && (
          <motion.div
            key="conteudo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ConteudoMestrePanel campanhaId={campanhaAtiva.id} initialAba={secaoConteudo} initialItem={itemSolicitado} onDirtyChange={setConteudoDirty} />
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
