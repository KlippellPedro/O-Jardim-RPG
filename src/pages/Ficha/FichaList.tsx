import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../../store/useCharacterStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Search, Plus, Trash2, Camera, HelpCircle, Shield, Sword } from 'lucide-react';
import { carregarCatalogo } from '../../services/catalogoService';
import { ICatalogo } from '../../types/catalogo';
import { nomeExibicaoRaca } from '../../services/racaService';

import { FichaWizard } from './Wizard/FichaWizard';
import { ModalPortal } from './components/ModalPortal';

const TIPOS_FOTO_ACEITOS = new Set(['image/jpeg', 'image/png', 'image/webp']);
const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;
const RESOLUCAO_FOTO = 512;

const carregarImagem = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('Não foi possível abrir a imagem selecionada.'));
  };
  image.src = objectUrl;
});

const prepararFotoPersonagem = async (file: File): Promise<string> => {
  if (!TIPOS_FOTO_ACEITOS.has(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP.');
  }
  if (file.size > TAMANHO_MAXIMO_FOTO) {
    throw new Error('A imagem precisa ter no máximo 10 MB.');
  }

  const image = await carregarImagem(file);
  const recorte = Math.min(image.naturalWidth, image.naturalHeight);
  if (!recorte) throw new Error('A imagem selecionada não possui dimensões válidas.');

  const tamanho = Math.min(RESOLUCAO_FOTO, recorte);
  const canvas = document.createElement('canvas');
  canvas.width = tamanho;
  canvas.height = tamanho;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('O navegador não conseguiu preparar a imagem.');

  const origemX = (image.naturalWidth - recorte) / 2;
  const origemY = (image.naturalHeight - recorte) / 2;
  context.drawImage(image, origemX, origemY, recorte, recorte, 0, 0, tamanho, tamanho);
  return canvas.toDataURL('image/webp', 0.82);
};

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
  const { usuario } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [salvandoFotoId, setSalvandoFotoId] = useState<string | null>(null);
  const [mensagemFoto, setMensagemFoto] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const fotoInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  // A ficha é pessoal: personagens de outros jogadores só aparecem no Painel do Mestre.
  const ownCharacters = characters.filter(char => char.donoUsuarioId === usuario?.id);

  const filteredCharacters = ownCharacters.filter(char =>
    char.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const escolherFoto = (event: React.MouseEvent<HTMLButtonElement>, personagemId: string) => {
    event.stopPropagation();
    fotoInputsRef.current[personagemId]?.click();
  };

  const trocarFoto = async (event: React.ChangeEvent<HTMLInputElement>, personagemId: string) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    setSalvandoFotoId(personagemId);
    setMensagemFoto(null);
    try {
      const foto = await prepararFotoPersonagem(file);
      if (!patchCharacter(personagemId, ['ficha', 'foto'], foto)) {
        throw new Error('O personagem não foi encontrado para receber a foto.');
      }
      const sincronizada = await flushCharacterSaves(personagemId);
      if (!sincronizada) {
        throw new Error('A foto foi aplicada localmente, mas não foi sincronizada. Tente novamente.');
      }
      setMensagemFoto({ tipo: 'sucesso', texto: 'Foto do personagem atualizada.' });
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
      
      {/* Header */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="mb-2 text-[clamp(2.25rem,8vw,3rem)] font-bold leading-tight tracking-wider text-primary" style={{fontFamily: 'Cinzel, serif'}}>
            Seus Personagens
          </h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Abra uma ficha existente ou crie um novo personagem para a campanha atual.
          </p>
        </div>
        
        <div className="responsive-action-row flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => setShowWizard(true)}
            className="relative group px-6 py-3 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/30 transition-all shadow-[0_0_20px_rgba(var(--color-primary),0.1)] hover:shadow-[0_0_30px_rgba(var(--color-primary),0.3)] overflow-hidden flex items-center gap-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <Plus size={20} className="text-primary" />
            <span className="text-primary font-medium tracking-wide">Criar Personagem</span>
          </button>
          
          <button 
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            aria-label={showHelp ? 'Ocultar ajuda' : 'Mostrar ajuda'}
            aria-expanded={showHelp}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white"
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
          <p className="text-gray-400">Carregando seus heróis...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center flex-1 py-20 bg-red-500/5 rounded-3xl border border-red-500/10 text-center px-4">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button onClick={() => fetchCharacters()} className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors">
            Tentar Novamente
          </button>
        </div>
      ) : ownCharacters.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center flex-1 py-32 bg-white/5 backdrop-blur-md border border-white/10 rounded-[3rem] shadow-2xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          
          <div className="w-32 h-32 mb-8 relative">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
            <img src="/assets/img/icons/menu/ficha.webp" alt="Ficha Icon" className="w-full h-full object-contain relative z-10 opacity-70 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          </div>
          
          <h3 className="text-3xl text-white font-semibold mb-4 text-center">O Códice está Vazio</h3>
          <p className="text-gray-400 text-lg text-center max-w-md mb-10">
            Nenhum personagem criado ainda na campanha atual. Comece a escrever a sua história.
          </p>
          
          <button 
            onClick={() => setShowWizard(true)}
            className="px-8 py-4 rounded-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/80 hover:to-purple-500 text-white font-bold tracking-wide shadow-[0_0_30px_rgba(var(--color-primary),0.4)] transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(var(--color-primary),0.6)] flex items-center gap-3 relative z-10"
          >
            <Plus size={24} />
            Criar Meu Primeiro Herói
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-5 sm:gap-8">
          <AnimatePresence>
            {filteredCharacters.map((char, index) => (
              <motion.div
                key={char.id}
                onClick={() => navigate(`/ficha/${char.id}`)}
                role="link"
                tabIndex={0}
                aria-label={`Abrir ficha de ${char.nome}`}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/ficha/${char.id}`);
                  }
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4, delay: Math.min(index * 0.1, 0.5) }}
                className="content-auto-list-item performance-expensive-effects group flex flex-col bg-[#0b0a12]/60 backdrop-blur-xl border border-white/10 hover:border-primary/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-[0_0_30px_rgba(var(--color-primary),0.15)] transition-all cursor-pointer relative"
              >
                {/* Glow Effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/0 via-primary/10 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
                
                <div className="p-6 relative z-10 flex gap-6 items-center border-b border-white/5">
                  <div className="w-20 h-20 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                    {char.foto ? (
                      <img src={char.foto} alt={char.nome} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-gray-500" style={{fontFamily: 'Cinzel, serif'}}>
                        {char.nome.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-white/10 text-gray-300 text-xs font-bold tracking-wider">
                        NV. {char.nivel}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white truncate group-hover:text-primary transition-colors" style={{fontFamily: 'Cinzel, serif'}}>
                      {char.nome}
                    </h2>
                    <p className="text-sm text-gray-400 truncate mt-1">
                      {(() => {
                        const racaCatalogo = catalogo?.racas.find((r) => r.id === char.racaId);
                        const classeCatalogo = catalogo?.classes.find((c) => c.id === char.classeId);
                        const nomeRaca = char.racaId
                          ? nomeExibicaoRaca(char.racaId, char.ficha?.racaNomePersonalizado, racaCatalogo?.titulo) || 'Raça a definir'
                          : 'Raça a definir';
                        return `${nomeRaca} · ${classeCatalogo?.titulo || char.classeId || 'Classe'}`;
                      })()}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 relative z-10 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex justify-between items-center bg-black/30 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-green-400" />
                      <span className="text-sm text-gray-300">HP {char.derivados?.vida || 0}</span>
                    </div>
                    <div className="w-px h-4 bg-white/10"></div>
                    <div className="flex items-center gap-2">
                      <Sword size={16} className="text-blue-400" />
                      <span className="text-sm text-gray-300">MP {char.derivados?.mana || 0}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      Criado em {new Date(char.criadoEm).toLocaleDateString('pt-BR')}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      <input
                        ref={(node) => { fotoInputsRef.current[char.id] = node; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        aria-label={`Escolher foto de ${char.nome}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => void trocarFoto(event, char.id)}
                      />
                      <button
                        type="button"
                        onClick={(event) => escolherFoto(event, char.id)}
                        disabled={salvandoFotoId === char.id}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:cursor-wait disabled:opacity-50"
                        title={salvandoFotoId === char.id ? 'Salvando foto...' : 'Trocar foto'}
                        aria-label={salvandoFotoId === char.id ? `Salvando foto de ${char.nome}` : `Trocar foto de ${char.nome}`}
                      >
                        <Camera size={18} />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Excluir ${char.nome}?`)) {
                            archiveCharacter(char.id);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors" title="Excluir"
                        aria-label={`Excluir ${char.nome}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

    </motion.div>
  );
};

export default FichaList;
