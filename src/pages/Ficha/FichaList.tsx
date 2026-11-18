import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, Plus, HelpCircle } from 'lucide-react';
import { carregarCatalogo } from '../../services/catalogoService';
import { ICatalogo } from '../../types/catalogo';
import { ICharacter } from '../../types/character';
import { nomeExibicaoRaca } from '../../services/racaService';

import { FichaWizard } from './Wizard/FichaWizard';
import { ModalPortal } from './components/ModalPortal';
import { PersonagemWantedCard } from './components/PersonagemWantedCard';
import { AjustarFotoModal } from './components/AjustarFotoModal';
import { CartazEmBranco } from './components/CartazEmBranco';
import { confirmar } from '../../components/avisos/confirmacao';
import { SeletorDeCampanha } from '../Campanha/SeletorDeCampanha';

const FichaList: React.FC = () => {
  const navigate = useNavigate();
  const {
    characters,
    isLoading,
    error,
    fetchCharacters,
    archiveCharacter,
    patchCharacter,
    flushCharacterSaves,
  } = useCharacterStore();
  const { usuario, campanhaAtiva } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [salvandoFotoId, setSalvandoFotoId] = useState<string | null>(null);
  const [mensagemFoto, setMensagemFoto] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [personagemEditandoFoto, setPersonagemEditandoFoto] = useState<ICharacter | null>(null);

  useEffect(() => {
    fetchCharacters();
    // Refaz a busca quando a campanha ativa muda (ex.: botão "Trocar Campanha"
    // trocando pelo seletor de mesa sem sair desta tela).
  }, [fetchCharacters, campanhaAtiva?.id]);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  // A ficha é pessoal: personagens de outros jogadores só aparecem no Painel do Mestre.
  const ownCharacters = characters.filter(char => char.donoUsuarioId === usuario?.id);

  const filteredCharacters = ownCharacters.filter(char =>
    char.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const confirmarFoto = async (dataUrl: string) => {
    const personagem = personagemEditandoFoto;
    if (!personagem) return;

    setSalvandoFotoId(personagem.id);
    setMensagemFoto(null);
    try {
      if (!patchCharacter(personagem.id, ['ficha', 'foto'], dataUrl)) {
        throw new Error('O personagem não foi encontrado para receber a foto.');
      }
      const sincronizada = await flushCharacterSaves(personagem.id);
      if (!sincronizada) {
        throw new Error('A foto foi aplicada localmente, mas não foi sincronizada. Tente novamente.');
      }
      setMensagemFoto({ tipo: 'sucesso', texto: 'Foto do personagem atualizada.' });
      setPersonagemEditandoFoto(null);
    } catch (photoError) {
      setMensagemFoto({
        tipo: 'erro',
        texto: photoError instanceof Error ? photoError.message : 'Não foi possível atualizar a foto.',
      });
    } finally {
      setSalvandoFotoId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="main"
      className="app-page mx-auto flex max-w-[100rem] flex-col overflow-x-hidden"
    >
      <AnimatePresence>
        {showWizard && (
          <ModalPortal manageFocus={false}>
            <FichaWizard onClose={() => setShowWizard(false)} />
          </ModalPortal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {personagemEditandoFoto && (
          <ModalPortal manageFocus={false} onClose={() => setPersonagemEditandoFoto(null)}>
            <AjustarFotoModal
              nome={personagemEditandoFoto.nome}
              fotoAtual={personagemEditandoFoto.foto ?? null}
              salvando={salvandoFotoId === personagemEditandoFoto.id}
              onCancelar={() => setPersonagemEditandoFoto(null)}
              onConfirmar={confirmarFoto}
            />
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-[clamp(2.25rem,8vw,3rem)] font-bold leading-tight tracking-wider text-primary" style={{fontFamily: 'Cinzel, serif'}}>
            Seus Personagens
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Abra uma ficha existente ou crie um novo personagem para a campanha atual.
          </p>
          {campanhaAtiva && (
            <p className="mt-2 text-sm text-primary/70">⚔ {campanhaAtiva.nome}</p>
          )}
        </div>

        <div className="responsive-action-row flex items-center gap-3 sm:gap-4">
          <SeletorDeCampanha variante="botao" />

          <button
            onClick={() => setShowWizard(true)}
            className="min-w-max relative group px-6 py-3 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all shadow-[0_0_20px_rgba(var(--color-primary),0.1)] hover:shadow-[0_0_30px_rgba(var(--color-primary),0.3)] overflow-hidden flex items-center gap-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <Plus size={20} className="text-primary" />
            <span className="text-primary font-medium tracking-wide whitespace-nowrap">Criar Personagem</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            aria-label={showHelp ? 'Ocultar ajuda' : 'Mostrar ajuda'}
            aria-expanded={showHelp}
            className="!flex-none p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white"
          >
            <HelpCircle size={20} />
          </button>
        </div>
      </div>

      {/* Help Banner */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 text-blue-200">
              Cada card representa uma ficha salva na campanha selecionada. Clique no card para editar. "Excluir" arquiva o personagem e preserva o histórico da conta.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 items-center bg-[#0b0a12]/50 backdrop-blur-md p-4 rounded-3xl border border-white/5 shadow-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="search" 
            aria-label="Buscar personagens"
            placeholder="Buscar por nome, raça, classe ou árvore..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
          />
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <span className="text-gray-500 text-sm whitespace-nowrap">
            {filteredCharacters.length} de {ownCharacters.length} encontrados
          </span>
        </div>
      </div>

      {mensagemFoto ? (
        <div role="status" className={`mb-6 rounded-xl border px-4 py-3 text-sm ${mensagemFoto.tipo === 'sucesso' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {mensagemFoto.texto}
        </div>
      ) : null}

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-gray-400">Carregando seus personagens...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 bg-red-500/5 rounded-3xl border border-red-500/10 text-center px-4">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button onClick={() => fetchCharacters()} className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors">
            Tentar Novamente
          </button>
        </div>
      ) : ownCharacters.length === 0 ? (
        <CartazEmBranco nomeCampanha={campanhaAtiva?.nome} onCriar={() => setShowWizard(true)} />
      ) : filteredCharacters.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg text-[#f1e8d4]" style={{ fontFamily: 'Cinzel, serif' }}>Nenhum cartaz com esse nome</p>
          <p className="text-sm text-gray-500">Confira a grafia ou limpe a busca para ver o mural inteiro.</p>
          <button type="button" onClick={() => setSearchTerm('')} className="mt-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 hover:text-white">
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),19rem))] justify-center sm:justify-start gap-x-5 gap-y-10 sm:gap-x-8">
          <AnimatePresence>
            {filteredCharacters.map((char, index) => {
              const racaCatalogo = catalogo?.racas.find((r) => r.id === char.racaId);
              const nomeRaca = char.racaId
                ? nomeExibicaoRaca(char.racaId, char.ficha?.racaNomePersonalizado, racaCatalogo?.titulo) || 'Raça a definir'
                : 'Raça a definir';

              // Personagem multiclasse: mesma resolução de PersonagemSheet.tsx,
              // ficha.classes é a fonte real (char.classeId é só o legado de classe única).
              const classeIds: string[] = char.ficha?.classes?.length
                ? char.ficha.classes
                    .map((slot: { classeId?: string }) => slot.classeId)
                    .filter((id: unknown): id is string => typeof id === 'string' && Boolean(id))
                : (char.classeId ? [char.classeId] : []);
              const nomesClasses = classeIds
                .map((id) => catalogo?.classes.find((c) => c.id === id)?.titulo)
                .filter((titulo): titulo is string => Boolean(titulo));
              const nomeClasse = nomesClasses.length ? nomesClasses.join(' · ') : (char.classeId || 'Classe');

              return (
                <PersonagemWantedCard
                  key={char.id}
                  personagem={char}
                  index={index}
                  nomeRaca={nomeRaca}
                  nomeClasse={nomeClasse}
                  salvandoFoto={salvandoFotoId === char.id}
                  onAbrir={() => navigate(`/ficha/${char.id}`)}
                  onAbrirEditorFoto={() => setPersonagemEditandoFoto(char)}
                  onExcluir={async (event) => {
                    event.stopPropagation();
                    const confirmado = await confirmar({
                      titulo: 'Excluir a ficha',
                      mensagem: `Excluir ${char.nome}?`,
                      rotuloConfirmar: 'Excluir',
                      tom: 'perigo',
                    });
                    if (confirmado) archiveCharacter(char.id);
                  }}
                />
              );
            })}
          </AnimatePresence>
        </div>
      )}

    </motion.div>
  );
};

export default FichaList;
