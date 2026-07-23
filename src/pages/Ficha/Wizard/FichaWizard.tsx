import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { carregarCatalogo } from '../../../services/catalogoService';
import { ICatalogo } from '../../../types/catalogo';
import { ICreateCharacterPayload } from '../../../types/personagem';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { X, ChevronRight, ChevronLeft, Dices, Shield, Sword, Sparkles } from 'lucide-react';
import { rolarAtributos, normalizarAtributosIniciais, calcularDerivados, ATRIBUTOS, TAtributo } from '../../../services/calculoService';

interface WizardProps {
  onClose: () => void;
}

const ARVORES = [
  { id: 'genese', nome: 'Gênese', cor: 'from-green-500/20 to-emerald-500/5', deidade: 'Aethel' },
  { id: 'aurora', nome: 'Aurora', cor: 'from-yellow-500/20 to-orange-500/5', deidade: 'Solarius' },
  { id: 'crepusculo', nome: 'Crepúsculo', cor: 'from-purple-500/20 to-indigo-500/5', deidade: 'Noctis' },
  { id: 'abismo', nome: 'Abismo', cor: 'from-red-500/20 to-rose-500/5', deidade: 'Khaos' },
  { id: 'aletheia', nome: 'Alétheia', cor: 'from-blue-500/20 to-cyan-500/5', deidade: 'Veritas' },
  { id: 'anima', nome: 'Anima', cor: 'from-pink-500/20 to-rose-400/5', deidade: 'Spiritus' }
];

export const FichaWizard: React.FC<WizardProps> = ({ onClose }) => {
  const { createCharacter } = useCharacterStore();
  const [step, setStep] = useState(1);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [nome, setNome] = useState('');
  const [arvoreId, setArvoreId] = useState('genese');
  const [racaId, setRacaId] = useState<string | null>(null);
  const [varianteId, setVarianteId] = useState<string | null>(null);
  const [classeId, setClasseId] = useState<string | null>(null);
  const [divindade, setDivindade] = useState('');
  
  // Atributos State
  const [atribuicao, setAtribuicao] = useState<Record<string, number>>({
    forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10
  });

  // BUG-11: adicionar estado de erro para o carregamento do catálogo
  const [catalogoError, setCatalogoError] = useState<string | null>(null);

  useEffect(() => {
    carregarCatalogo()
      .then((data) => {
        setCatalogo(data);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        // BUG-11: sem .catch(), qualquer falha no JSON/bundle deixava isLoading=true para sempre
        const error = err as { message?: string };
        console.error('Falha ao carregar catálogo:', err);
        setCatalogoError(error?.message || 'Erro ao carregar o Catálogo de Personagens.');
        setIsLoading(false);
      });
  }, []);

  const handleRolar = () => {
    const rolados = rolarAtributos();
    const assigned: Record<string, number> = {};
    ATRIBUTOS.forEach((attr, idx) => {
      assigned[attr] = rolados[idx];
    });
    setAtribuicao(assigned);
  };

  const handleAtributoChange = (attr: TAtributo, value: number) => {
    setAtribuicao(prev => ({ ...prev, [attr]: value }));
  };

  const handleCreate = async () => {
    if (!catalogo || !racaId || !classeId) return;

    const raca = catalogo.racas.find((r) => r.id === racaId);
    if (!raca) return;

    const escolhaRacial = { varianteId, divindade };
    const atributosFinais = normalizarAtributosIniciais(atribuicao);
    const derivados = calcularDerivados(atributosFinais, raca, 1, escolhaRacial);

    // BUG-07: payload explicitamente tipado com ICreateCharacterPayload
    const payload: ICreateCharacterPayload = {
      nome,
      arvoreId,
      racaId,
      classeId,
      atributosBase: atribuicao,
      atributosFinais,
      derivados,
      lunarisInicial: 20,
      pericias: {},
      inventarioInicial: [],
      escolhaRacial,
    };

    const success = await createCharacter(payload);
    if (success) {
      onClose();
    }
  };

  const renderStepContent = () => {
    // BUG-11: mostra erro de catálogo em vez de loading infinito
    if (catalogoError) {
      return (
        <div className="p-20 text-center">
          <p className="text-red-400 text-lg mb-2">Falha ao carregar o Catálogo</p>
          <p className="text-gray-500 text-sm">{catalogoError}</p>
        </div>
      );
    }
    if (isLoading) return <div className="p-20 text-center text-gray-400">Carregando Códice...</div>;

    const currentRaca = catalogo?.racas.find(r => r.id === racaId);
    const arvoreSelecionada = ARVORES.find(a => a.id === arvoreId);

    switch (step) {
      case 1:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Qual é o nome do seu Herói?</label>
              <input 
                type="text" 
                value={nome} 
                onChange={e => setNome(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-2xl text-white font-bold focus:outline-none focus:border-primary/50 transition-colors shadow-inner"
                placeholder="Ex: Kael Sombraverde"
                autoFocus
                style={{fontFamily: 'Cinzel, serif'}}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-4">Escolha sua Árvore de Origem</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ARVORES.map(arvore => (
                  <button 
                    key={arvore.id}
                    onClick={() => setArvoreId(arvore.id)}
                    className={`p-6 rounded-2xl border text-left transition-all ${arvoreId === arvore.id ? 'border-primary/50 bg-gradient-to-br shadow-[0_0_20px_rgba(var(--color-primary),0.2)] ' + arvore.cor : 'border-white/5 bg-black/30 hover:border-white/20'}`}
                  >
                    <h3 className="text-xl font-bold text-white" style={{fontFamily: 'Cinzel, serif'}}>{arvore.nome}</h3>
                    <p className="text-xs text-gray-500 mt-1">Deidade: {arvore.deidade}</p>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col md:flex-row gap-6 h-full">
            {/* Lista de Raças */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[50vh] md:max-h-[60vh]">
              {catalogo?.racas.map(raca => (
                <button 
                  key={raca.id}
                  onClick={() => { setRacaId(raca.id); setVarianteId(null); }}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex flex-col gap-1 ${racaId === raca.id ? 'border-primary bg-primary/10' : 'border-white/5 bg-black/40 hover:border-white/20'}`}
                >
                  <h3 className="text-lg font-bold text-white" style={{fontFamily: 'Cinzel, serif'}}>{raca.titulo}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2">{raca.descricao}</p>
                </button>
              ))}
            </div>
            
            {/* Detalhes da Raça e Variantes */}
            <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto custom-scrollbar max-h-[50vh] md:max-h-[60vh]">
              {currentRaca ? (
                <>
                  <h3 className="text-2xl font-bold text-primary mb-2" style={{fontFamily: 'Cinzel, serif'}}>{currentRaca.titulo}</h3>
                  <p className="text-sm text-gray-300 mb-6">{currentRaca.descricao}</p>
                  
                  {currentRaca.variantes && currentRaca.variantes.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-white mb-3">Escolha a Variante Racial:</h4>
                      <div className="space-y-3">
                        {currentRaca.variantes.map(variante => (
                          <button
                            key={variante.id}
                            onClick={() => setVarianteId(variante.id)}
                            className={`w-full p-3 rounded-xl border text-left transition-all ${varianteId === variante.id ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-black/30 hover:border-white/30'}`}
                          >
                            <span className="text-white font-bold block">{variante.titulo}</span>
                            <span className="text-xs text-gray-400 block mt-1">{variante.descricao}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!currentRaca.variantes?.length && (
                    <div className="text-sm text-gray-500 italic">Esta raça não possui variantes.</div>
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                  Selecione uma Raça para ver os detalhes
                </div>
              )}
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {catalogo?.classes.map(classe => (
                <button 
                  key={classe.id}
                  onClick={() => setClasseId(classe.id)}
                  className={`p-5 rounded-2xl border text-left transition-all flex flex-col gap-2 ${classeId === classe.id ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'border-white/10 bg-black/40 hover:border-white/30'}`}
                >
                  <h3 className="text-xl font-bold text-white" style={{fontFamily: 'Cinzel, serif'}}>{classe.titulo}</h3>
                  <p className="text-xs text-gray-400 line-clamp-3">{classe.descricao}</p>
                </button>
              ))}
            </div>
          </motion.div>
        );
      case 4:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center justify-center max-h-[60vh]">
            <h2 className="text-3xl font-bold text-white mb-6" style={{fontFamily: 'Cinzel, serif'}}>A Divindade</h2>
            <p className="text-gray-400 mb-8 max-w-lg text-center">
              Como nascido da Árvore de <strong>{arvoreSelecionada?.nome}</strong>, você pode cultuar a Deidade principal ou jurar lealdade a um outro poder.
            </p>
            
            <div className="w-full max-w-md space-y-4">
              <button 
                onClick={() => setDivindade(arvoreSelecionada?.deidade || '')}
                className={`w-full p-4 rounded-xl border text-left transition-all ${divindade === arvoreSelecionada?.deidade ? 'border-primary bg-primary/20' : 'border-white/10 bg-black/40 hover:border-white/30'}`}
              >
                <span className="text-sm text-gray-400 block mb-1">Deidade Padroeira da sua Árvore</span>
                <span className="text-xl text-white font-bold" style={{fontFamily: 'Cinzel, serif'}}>{arvoreSelecionada?.deidade}</span>
              </button>
              
              <div className="relative">
                <label className="block text-xs text-gray-500 mb-1 ml-1">Ou especifique outra entidade/divindade menor</label>
                <input 
                  type="text" 
                  value={divindade !== arvoreSelecionada?.deidade ? divindade : ''} 
                  onChange={e => setDivindade(e.target.value)}
                  placeholder="Nome de outra divindade..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex justify-between items-center bg-black/30 p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-xl text-white font-bold">Atributos</h3>
                <p className="text-sm text-gray-400">Distribua os valores dos seus atributos ou deixe os dados decidirem.</p>
              </div>
              <button 
                onClick={handleRolar}
                className="px-6 py-2.5 rounded-full bg-primary/20 text-primary hover:bg-primary hover:text-white border border-primary/50 font-bold tracking-wider flex items-center gap-2 transition-all shadow-lg"
              >
                <Dices size={20} />
                Rolar (7d20)
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              {ATRIBUTOS.map((attr) => (
                <div key={attr} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-sm text-gray-300 font-bold uppercase tracking-widest">{attr}</span>
                  <select 
                    value={atribuicao[attr]}
                    onChange={(e) => handleAtributoChange(attr, parseInt(e.target.value))}
                    className="bg-black/60 border border-white/20 text-white rounded-xl p-2 outline-none focus:border-primary w-full text-center text-xl font-bold appearance-none cursor-pointer"
                    style={{fontFamily: 'Cinzel, serif'}}
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </motion.div>
        );
      case 6:
        // Calculos em tempo real da Preview
        const previewRaca = catalogo?.racas.find(r => r.id === racaId);
        const previewClasse = catalogo?.classes.find(c => c.id === classeId);
        const previewDerivados = previewRaca ? calcularDerivados(atribuicao, previewRaca, 1, { varianteId }) : null;

        return (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col items-center py-6">
            <Sparkles className="text-primary mb-4" size={40} />
            <h2 className="text-4xl text-white font-bold mb-2" style={{fontFamily: 'Cinzel, serif'}}>{nome}</h2>
            <p className="text-lg text-gray-400 mb-8 capitalize">
              {previewRaca?.titulo} · {previewClasse?.titulo} · {arvoreSelecionada?.nome}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl mb-8">
              <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <Shield className="text-green-400 mb-2" size={28} />
                <span className="text-sm text-green-200/60 uppercase tracking-wider font-bold">Vida (HP)</span>
                <span className="text-3xl font-bold text-green-400">{previewDerivados?.vida || 0}</span>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <Sword className="text-blue-400 mb-2" size={28} />
                <span className="text-sm text-blue-200/60 uppercase tracking-wider font-bold">Mana (MP)</span>
                <span className="text-3xl font-bold text-blue-400">{previewDerivados?.mana || 0}</span>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <Shield className="text-purple-400 mb-2" size={28} />
                <span className="text-sm text-purple-200/60 uppercase tracking-wider font-bold">Defesa Nat.</span>
                <span className="text-3xl font-bold text-purple-400">{previewDerivados?.defesaNatural || 0}</span>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <Sparkles className="text-orange-400 mb-2" size={28} />
                <span className="text-sm text-orange-200/60 uppercase tracking-wider font-bold">Iniciativa</span>
                <span className="text-3xl font-bold text-orange-400">{previewDerivados?.iniciativa || 0}</span>
              </div>
            </div>

            <p className="text-gray-500 max-w-lg text-center text-sm">
              Sua ficha completa será salva no Grimório do Mestre na campanha atual. Seus atributos e modificadores de Variante Racial foram calculados.
            </p>
          </motion.div>
        );
      default:
        return null;
    }
  };

  const isNextDisabled = () => {
    if (step === 1) return nome.trim().length < 2;
    if (step === 2) {
      const currentRaca = catalogo?.racas.find(r => r.id === racaId);
      if (!currentRaca) return true;
      if (currentRaca.variantes && currentRaca.variantes.length > 0 && !varianteId) return true;
    }
    if (step === 3) return !classeId;
    if (step === 4) return divindade.trim().length === 0;
    return false;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050508]/90 backdrop-blur-xl p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="w-full max-w-5xl bg-[#0b0a12]/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[95vh] md:h-auto md:max-h-[85vh] ring-1 ring-white/5"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-transparent opacity-50"></div>
          <div className="relative z-10 flex flex-col gap-3">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={`h-1.5 w-10 md:w-12 rounded-full transition-colors ${i < step ? 'bg-primary' : i === step ? 'bg-primary/50 animate-pulse shadow-[0_0_10px_rgba(var(--color-primary),0.8)]' : 'bg-white/10'}`} />
              ))}
            </div>
            <h2 className="text-2xl text-white font-bold tracking-wider" style={{fontFamily: 'Cinzel, serif'}}>
              O Despertar do Herói
            </h2>
          </div>
          <button onClick={onClose} className="relative z-10 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 md:p-8 overflow-hidden flex flex-col relative bg-gradient-to-b from-transparent to-black/40">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl">
          <button 
            onClick={() => setStep(s => Math.max(1, s - 1))}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5'}`}
          >
            <ChevronLeft size={20} /> Retornar
          </button>
          
          {step < 6 ? (
            <button 
              onClick={() => setStep(s => s + 1)}
              disabled={isNextDisabled()}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary hover:bg-primary/80 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(var(--color-primary),0.2)]"
            >
              Avançar <ChevronRight size={20} />
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              className="flex items-center gap-2 px-10 py-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold transition-all shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105"
            >
              <Sparkles size={20} />
              Finalizar Criação
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
