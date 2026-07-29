import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { personagensApi, PersonagemApiRecord } from '../../services/personagensApi';
import { Shield, Users, Search, Loader2, Settings, Gem, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MestrePanel } from '../../components/Settings/MestrePanel';
import { CofrePanel } from '../../components/Settings/CofrePanel';

export const MasterPage = () => {
  const { campanhaAtiva, usuario } = useAuthStore();
  const [personagens, setPersonagens] = useState<PersonagemApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [activeTab, setActiveTab] = useState<'personagens' | 'cofre' | 'configs'>('personagens');

  // Assistente também gerencia conteúdo da campanha (convites, auditoria) -
  // só ações mais sensíveis (arquivar, trocar papel, transferir dono) ficam
  // reservadas ao mestre de verdade, gated dentro de cada painel.
  const isMestre = campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente'
    || usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador';

  useEffect(() => {
    window.scrollTo(0, 0);
    if (campanhaAtiva?.id && isMestre) {
      personagensApi.listar(campanhaAtiva.id, true)
        .then(res => setPersonagens(res.personagens || []))
        .catch(err => console.error("Erro ao listar personagens", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [campanhaAtiva, isMestre]);

  if (!isMestre) {
    return (
      <div className="min-h-screen pt-24 px-6 flex items-center justify-center">
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
    <div className="relative z-10 min-h-screen pt-24 px-6 lg:px-12 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 flex items-center gap-4" style={{ fontFamily: 'Cinzel, serif' }}>
            <Shield className="text-primary" size={40} />
            Painel do Mestre
          </h1>
          <p className="text-gray-400 text-lg">
            Visão geral da campanha <span className="text-primary font-bold">{campanhaAtiva?.nome}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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

      <div className="flex gap-4 mb-6 border-b border-white/10 pb-1 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('personagens')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'personagens' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Users size={16} /> Personagens
        </button>
        <button
          onClick={() => setActiveTab('cofre')}
          className={`flex items-center gap-2 pb-2 px-1 border-b-2 font-bold tracking-widest uppercase transition-colors whitespace-nowrap ${
            activeTab === 'cofre' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          <Gem size={16} /> Cofre
        </button>
        <button
          onClick={() => setActiveTab('configs')}
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
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar personagem..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-6 md:p-8">
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
                  <div className="flex justify-between items-center text-xs text-gray-400 mb-4">
                    <span>Versão: {p.versao}</span>
                    <span>Moedas: {p.carteira?.reduce((acc, c) => acc + c.saldo, 0) || 0}</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <a href={`/ficha/${p.id}`} className="flex-1 py-2 rounded-xl bg-primary/10 text-primary text-center text-sm font-bold border border-primary/20 hover:bg-primary/20 transition-colors">
                      Ver Ficha
                    </a>
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
            className="bg-[#0a090e] border border-white/10 rounded-3xl shadow-2xl relative min-h-[600px] flex flex-col"
          >
            <div className="flex-1 w-full h-full p-2 md:p-6">
              <CofrePanel />
            </div>
          </motion.div>
        )}

        {activeTab === 'configs' && (
          <motion.div
            key="configs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-[#0a090e] border border-white/10 rounded-3xl shadow-2xl relative min-h-[600px] flex flex-col"
          >
            {/* Reusing the MestrePanel directly but rendering it natively inside the page container */}
            <div className="flex-1 w-full h-full p-2 md:p-6">
               <MestrePanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MasterPage;
