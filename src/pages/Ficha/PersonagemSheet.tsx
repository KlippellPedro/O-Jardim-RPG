import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCharacterStore,
  flushEconomyWithKeepalive,
  type CharacterDomainSaveState,
  type CharacterSaveDomain,
} from '../../store/useCharacterStore';
import { HelpCircle, Eye, EyeOff } from 'lucide-react';
import { ModalInfoFicha } from './components/ModalInfoFicha';
import { AbaFicha } from './abas/AbaFicha';
import { AbaPericias } from './abas/AbaPericias';
import { AbaInventario } from './abas/AbaInventario';
import { AbaPoderes } from './abas/AbaPoderes';
import { AbaHabilidades } from './abas/AbaHabilidades';
import { AbaAtaques } from './abas/AbaAtaques';
import { AbaMagias } from './abas/AbaMagias';
import { AbaAliados } from './abas/AbaAliados';
import { AbaNotas } from './abas/AbaNotas';
import { AbaProgressao } from './abas/AbaProgressao';
import { AbaDescanso } from './abas/AbaDescanso';


const TABS = ['Ficha', 'Progressão', 'Perícias', 'Inventário', 'Poderes', 'Habilidades', 'Ataques', 'Descanso', 'Magias', 'Aliados', 'Notas'];

const EMPTY_SAVE_STATE: CharacterDomainSaveState = { phase: 'idle' };

const SAVE_PHASE_LABELS: Record<CharacterDomainSaveState['phase'], string> = {
  idle: 'pronto',
  pending: 'alterações pendentes',
  saving: 'salvando…',
  saved: 'salvo',
  error: 'falha ao salvar',
  conflict: 'conflito detectado',
};

const SAVE_PHASE_STYLES: Record<CharacterDomainSaveState['phase'], string> = {
  idle: 'border-white/10 text-gray-500 bg-white/5',
  pending: 'border-amber-500/30 text-amber-300 bg-amber-500/10',
  saving: 'border-sky-500/30 text-sky-300 bg-sky-500/10',
  saved: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  error: 'border-red-500/40 text-red-300 bg-red-500/10',
  conflict: 'border-orange-500/50 text-orange-200 bg-orange-500/10',
};

export const PersonagemSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    characters,
    isLoading,
    fetchCharacters,
    patchCharacter,
    persistence,
    flushCharacterSaves,
    retryCharacterSave,
    resolveCharacterConflict,
    hasPendingCharacterSaves,
    error,
  } = useCharacterStore();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(`rpg_active_tab_${id}`) || 'Ficha';
  });
  const [showAjuda, setShowAjuda] = useState(false);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    localStorage.setItem(`rpg_active_tab_${id}`, tab);
  };

  useEffect(() => {
    void fetchCharacters();
  }, [fetchCharacters]);

  const character = characters.find((c) => c.id === id);
  const characterPersistence = id ? persistence[id] : undefined;

  const handleUpdate = useCallback((path: string[], value: unknown) => {
    if (id) patchCharacter(id, path, value);
  }, [id, patchCharacter]);

  useEffect(() => {
    if (!id) return undefined;

    const flush = () => {
      void flushCharacterSaves(id);
    };
    // A2: no pagehide (fechamento real da aba) usa keepalive para que o
    // browser não aborte o fetch antes de concluir.
    const handlePageHide = () => {
      void flushEconomyWithKeepalive(id);
      flush(); // ficha continua sem keepalive (tem fallback em localStorage)
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingCharacterSaves(id)) return;
      event.preventDefault();
      event.returnValue = '';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flush();
    };
  }, [flushCharacterSaves, hasPendingCharacterSaves, id]);

  if (isLoading && !character) {
    return (
      <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-600/20 border-t-yellow-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Carregando Grimório...</p>
        </div>
      </div>
    );
  }

  // M1: Distingue erro de rede/servidor de "personagem realmente não existe"
  if (!character) {
    const isNetworkError = !isLoading && Boolean(error);
    return (
      <div className="pl-32 pr-12 pt-12 pb-24 relative z-10 w-full min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          {isNetworkError ? (
            <>
              <p className="text-red-400 text-lg">Falha ao carregar a ficha.</p>
              <p className="text-gray-500 text-sm">{error}</p>
              <button
                onClick={() => void fetchCharacters()}
                className="mt-4 px-6 py-2 rounded-full bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-600/30 text-yellow-300 transition-colors"
              >
                Tentar novamente
              </button>
            </>
          ) : (
            <>
              <p className="text-red-400 text-lg">Personagem não encontrado.</p>
              <p className="text-gray-500 text-sm">O ID solicitado não existe ou foi arquivado.</p>
            </>
          )}
          <button
            onClick={() => navigate('/ficha')}
            className="mt-4 px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            ← Voltar para Fichas
          </button>
        </div>
      </div>
    );
  }

  const handleRetry = (domain: CharacterSaveDomain) => {
    void retryCharacterSave(character.id, domain);
  };

  const handleConflict = (domain: CharacterSaveDomain, strategy: 'reload' | 'overwrite') => {
    if (
      strategy === 'overwrite'
      && !window.confirm('Manter sua ficha substituirá integralmente a ficha que está no servidor. Deseja continuar?')
    ) return;
    void resolveCharacterConflict(character.id, domain, strategy);
  };

  const renderSaveDomain = (
    domain: CharacterSaveDomain,
    label: string,
    state: CharacterDomainSaveState,
  ) => (
    <div key={domain} className="flex flex-wrap items-center gap-2">
      <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${SAVE_PHASE_STYLES[state.phase]}`}>
        {label}: {SAVE_PHASE_LABELS[state.phase]}
      </span>
      {state.phase === 'error' && (
        <button
          type="button"
          onClick={() => handleRetry(domain)}
          className="text-[11px] font-bold text-red-300 underline underline-offset-2 hover:text-red-200"
        >
          Tentar novamente
        </button>
      )}
      {state.phase === 'conflict' && (
        <>
          <button
            type="button"
            onClick={() => handleConflict(domain, 'reload')}
            className="text-[11px] font-bold text-orange-200 underline underline-offset-2 hover:text-white"
          >
            Recarregar servidor
          </button>
          {domain === 'sheet' && (
            <button
              type="button"
              onClick={() => handleConflict(domain, 'overwrite')}
              className="text-[11px] font-bold text-orange-200 underline underline-offset-2 hover:text-white"
            >
              Manter minha ficha
            </button>
          )}
        </>
      )}
      {(state.phase === 'error' || state.phase === 'conflict') && state.message && (
        <span className="basis-full text-[11px] text-gray-400">{state.message}</span>
      )}
    </div>
  );

  const renderHeader = () => (
    <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 mb-8 shadow-2xl relative">
      <div className="flex flex-col gap-5 md:flex-row md:justify-between md:items-start">
        <div>
          <h4 className="text-yellow-600 text-xs font-bold tracking-widest uppercase mb-2">
            Personagem da Campanha Atual
          </h4>
          <h1 className="text-4xl text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
            {character.nome?.toUpperCase() || 'DESCONHECIDO'}
          </h1>
          <p className="text-gray-400 text-sm">
            Nível {character.nivel} • {character.ficha?.racaId || 'Sem Raça'} • {character.ficha?.classes?.[0]?.classeId || character.ficha?.classeId || 'Sem Classe'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleUpdate(['ficha', 'compartilhada'], !character.ficha?.compartilhada)}
            className={`px-4 py-2 rounded-full border text-sm font-bold flex items-center gap-2 transition-colors ${
              character.ficha?.compartilhada
                ? 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                : 'border-white/10 text-gray-500 bg-white/5 hover:bg-white/10'
            }`}
            title="Se ativo, outros jogadores poderão ver seus status básicos na Mesa Virtual"
          >
            {character.ficha?.compartilhada ? <Eye size={16} /> : <EyeOff size={16} />}
            {character.ficha?.compartilhada ? 'Visível na Sessão' : 'Ficha Privada'}
          </button>
          <button
            onClick={() => setShowAjuda(true)}
            className="w-10 h-10 rounded-full border border-yellow-600/30 flex items-center justify-center text-yellow-600 hover:bg-yellow-600/10 transition-colors"
            aria-label="Abrir ajuda da ficha"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-2" aria-live="polite" aria-atomic="false">
        {renderSaveDomain('sheet', 'Ficha', characterPersistence?.sheet ?? EMPTY_SAVE_STATE)}
        {renderSaveDomain('economy', 'Economia', characterPersistence?.economy ?? EMPTY_SAVE_STATE)}
      </div>
    </div>
  );

  const renderAjuda = () => (
    <ModalInfoFicha
      isOpen={showAjuda}
      onClose={() => setShowAjuda(false)}
      title="Como usar a Ficha"
      description="As edições aparecem imediatamente e são sincronizadas em sequência. Se houver falha ou conflito, a ficha mostra como recuperar os dados."
      items={[
        { label: 'Ficha', value: 'Identidade, classe, atributos, status vitais e experiência' },
        { label: 'Progressão', value: 'Características raciais, habilidades e eventos automáticos, poderes de classe e Legados' },
        { label: 'Descanso', value: 'Recuperação, Cansaço, condições e crises de Sanidade' },
        { label: 'Perícias', value: 'Graus, vantagens/desvantagens e rolagens' },
        { label: 'Inventário', value: 'Itens e moedas (sincronizados com o servidor)' },
        { label: 'Poderes / Habilidades / Magias', value: 'Escolher progressão, consultar efeitos, conjurar pelo catálogo oficial e registrar na mesa' },
        { label: 'Ataques', value: 'Criar, editar e rolar acerto/dano no servidor' },
        { label: 'Aliados', value: 'Companheiros e seguidores' },
        { label: 'Notas', value: 'História e anotações de sessão' },
      ]}
    />
  );

  const renderTabs = () => (
    <div className="flex flex-wrap items-center gap-3 mb-8 border-b border-white/5 pb-8">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => handleTabChange(tab)}
          className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
            activeTab === tab 
              ? 'bg-[#D4AF37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
              : 'bg-[#15141b] text-gray-400 border border-white/5 hover:border-white/20'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const renderActiveTab = () => {
    const props = { character, onUpdate: handleUpdate };
    
    switch (activeTab) {
      case 'Ficha': return <AbaFicha {...props} />;
      case 'Progressão': return <AbaProgressao {...props} />;
      case 'Perícias': return <AbaPericias {...props} />;
      case 'Inventário': return <AbaInventario {...props} />;
      case 'Poderes': return <AbaPoderes {...props} />;
      case 'Habilidades': return <AbaHabilidades {...props} />;
      case 'Ataques': return <AbaAtaques {...props} />;
      case 'Descanso': return <AbaDescanso {...props} />;
      case 'Magias': return <AbaMagias {...props} />;
      case 'Aliados': return <AbaAliados {...props} />;
      case 'Notas': return <AbaNotas {...props} />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="pl-24 md:pl-32 pr-4 md:pr-12 pt-8 md:pt-12 pb-24 relative w-full min-h-screen bg-[#07060a] overflow-x-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/ficha')} className="text-gray-500 hover:text-white mb-6 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          &larr; Voltar
        </button>
        
        {renderHeader()}
        {renderAjuda()}
        {renderTabs()}

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderActiveTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
