import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { carregarCatalogo } from '../../../services/catalogoService';
import { ICatalogo } from '../../../types/catalogo';
import { ICreateCharacterPayload } from '../../../types/personagem';
import { useCharacterStore } from '../../../store/useCharacterStore';
import { useAuthStore } from '../../../store/useAuthStore';
import { X, ChevronRight, ChevronLeft, Dices, Shield, Sword, Sparkles, ListOrdered, SlidersHorizontal, Minus, Plus } from 'lucide-react';
import {
  rolarAtributos,
  normalizarAtributosIniciais,
  calcularDerivados,
  ATRIBUTOS,
  TAtributo,
  TMetodoAtributos,
  ROTULOS_ATRIBUTOS,
  VALORES_ATRIBUTOS_PADRAO,
  COMPRA_PONTOS_ORCAMENTO,
  COMPRA_PONTOS_BASE,
  COMPRA_PONTOS_MAXIMO,
  distribuirValoresAtributos,
  criarCompraPontosVazia,
  calcularPontosAtributos,
  compraPontosValida,
  conjuntoAtributosValido,
} from '../../../services/calculoService';
import { descreverOpcaoRacial, escolhaRacialEstaCompleta, obterGruposEscolhaRacial } from '../../../services/racaService';
import { ARVORES, arvoreVisivel, filtrarPorArvore, filtrarPorLiberacao } from '../../../data/arvoresCatalog';

interface WizardProps {
  onClose: () => void;
}

export const FichaWizard: React.FC<WizardProps> = ({ onClose }) => {
  const { createCharacter } = useCharacterStore();
  const { usuario, campanhaAtiva } = useAuthStore();
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const config = campanhaAtiva?.configuracoes || {};

  const arvoresDisponiveis = useMemo(
    () => ARVORES.filter(a => arvoreVisivel(a.id, config, isMestre)),
    [config, isMestre],
  );

  const [step, setStep] = useState(1);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [nome, setNome] = useState('');
  const [arvoreId, setArvoreId] = useState('');
  const [racaId, setRacaId] = useState<string | null>(null);
  const [escolhaRacial, setEscolhaRacial] = useState<Record<string, string>>({});
  const [classeId, setClasseId] = useState<string | null>(null);
  const [divindade, setDivindade] = useState('');
  
  // Atributos State
  const [metodoAtributos, setMetodoAtributos] = useState<TMetodoAtributos>('padrao');
  const [valoresDisponiveis, setValoresDisponiveis] = useState<number[]>([...VALORES_ATRIBUTOS_PADRAO]);
  const [atribuicao, setAtribuicao] = useState<Record<string, number>>(
    distribuirValoresAtributos(VALORES_ATRIBUTOS_PADRAO),
  );

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

  // A primeira Árvore visível vira o padrão: nem toda campanha libera as
  // mesmas Árvores, então não dá pra cravar um id fixo (ex.: "aethel").
  useEffect(() => {
    if (!arvoreId && arvoresDisponiveis.length > 0) {
      setArvoreId(arvoresDisponiveis[0].id);
    }
  }, [arvoreId, arvoresDisponiveis]);

  // Trocar de Árvore pode invalidar a Raça/Classe já escolhidas (exclusivas
  // de outra Árvore): limpa pra forçar nova escolha compatível.
  useEffect(() => {
    setRacaId(null);
    setEscolhaRacial({});
    setClasseId(null);
  }, [arvoreId]);

  const handleRolar = () => {
    const rolados = rolarAtributos();
    setMetodoAtributos('rolado');
    setValoresDisponiveis(rolados);
    setAtribuicao(distribuirValoresAtributos(rolados));
  };

  const handlePadrao = () => {
    setMetodoAtributos('padrao');
    setValoresDisponiveis([...VALORES_ATRIBUTOS_PADRAO]);
    setAtribuicao(distribuirValoresAtributos(VALORES_ATRIBUTOS_PADRAO));
  };

  const handleCompraPontos = () => {
    setMetodoAtributos('pontos');
    setAtribuicao(criarCompraPontosVazia());
  };

  const handleOrganizarValor = (attr: TAtributo, value: number) => {
    setAtribuicao((atual) => {
      const valorAnterior = atual[attr];
      if (valorAnterior === value) return atual;
      const atributoParaTroca = ATRIBUTOS.find(
        candidato => candidato !== attr && atual[candidato] === value,
      );
      if (!atributoParaTroca) return atual;
      return {
        ...atual,
        [attr]: value,
        [atributoParaTroca]: valorAnterior,
      };
    });
  };

  const handleAjustarPonto = (attr: TAtributo, delta: -1 | 1) => {
    setAtribuicao((atual) => {
      const valorAtual = Number(atual[attr]);
      const pontosRestantes = COMPRA_PONTOS_ORCAMENTO - calcularPontosAtributos(atual);
      if (delta > 0 && (valorAtual >= COMPRA_PONTOS_MAXIMO || pontosRestantes <= 0)) return atual;
      if (delta < 0 && valorAtual <= COMPRA_PONTOS_BASE) return atual;
      return { ...atual, [attr]: valorAtual + delta };
    });
  };

  const handleCreate = async () => {
    if (!catalogo || !racaId || !classeId) return;

    const raca = catalogo.racas.find((r) => r.id === racaId);
    if (!raca) return;

    const escolhaRacialFinal = { ...escolhaRacial, divindade };
    const atributosFinais = normalizarAtributosIniciais(atribuicao);
    const derivados = calcularDerivados(atributosFinais, raca, 1, escolhaRacialFinal);

    // BUG-07: payload explicitamente tipado com ICreateCharacterPayload
    const payload: ICreateCharacterPayload = {
      nome,
      arvoreId,
      racaId,
      classeId,
      metodoAtributos,
      atributosBase: atribuicao,
      atributosFinais,
      derivados,
      lunarisInicial: 20,
      pericias: {},
      inventarioInicial: [],
      escolhaRacial: escolhaRacialFinal,
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
    const gruposEscolhaRacial = obterGruposEscolhaRacial(currentRaca);
    const arvoreSelecionada = ARVORES.find(a => a.id === arvoreId);

    // Raça/Classe exclusivas de outra Árvore, ou especiais não liberadas
    // pelo mestre, não aparecem como opção: mestre/assistente vê tudo.
    const racasFiltradas = isMestre
      ? (catalogo?.racas || [])
      : filtrarPorLiberacao(filtrarPorArvore(catalogo?.racas || [], arvoreId), config.racas_liberadas || []);
    const classesFiltradas = isMestre
      ? (catalogo?.classes || [])
      : filtrarPorLiberacao(filtrarPorArvore(catalogo?.classes || [], arvoreId), config.classes_liberadas || []);
    const pontosGastos = calcularPontosAtributos(atribuicao);
    const pontosRestantes = COMPRA_PONTOS_ORCAMENTO - pontosGastos;
    const opcoesDoConjunto = [...new Set(valoresDisponiveis)].sort((a, b) => b - a);

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
                {arvoresDisponiveis.map(arvore => (
                  <button
                    key={arvore.id}
                    onClick={() => setArvoreId(arvore.id)}
                    className={`p-6 rounded-2xl border text-left transition-all ${arvoreId === arvore.id ? 'border-primary/50 bg-gradient-to-br shadow-[0_0_20px_rgba(var(--color-primary),0.2)] ' + arvore.cor : 'border-white/5 bg-black/30 hover:border-white/20'}`}
                  >
                    <h3 className="text-xl font-bold text-white" style={{fontFamily: 'Cinzel, serif'}}>{arvore.nome}</h3>
                    <p className="text-xs text-gray-500 mt-1">Deidade: {arvore.deidadeTitulo}</p>
                  </button>
                ))}
              </div>
              {arvoresDisponiveis.length === 0 && (
                <p className="text-sm text-gray-500 italic">Nenhuma Árvore liberada nesta campanha ainda. Peça ao mestre para revelar ao menos uma.</p>
              )}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col md:flex-row gap-6 h-full">
            {/* Lista de Raças */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar max-h-[50vh] md:max-h-[60vh]">
              <p className="text-xs text-gray-500 mb-1">{racasFiltradas.length} raça(s) disponível(is) para esta Árvore.</p>
              {racasFiltradas.map(raca => (
                <button
                  key={raca.id}
                  onClick={() => { setRacaId(raca.id); setEscolhaRacial({}); }}
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
                  
                  {gruposEscolhaRacial.map(grupo => (
                    <div key={grupo.campo} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-bold text-white mb-1">Escolha: {grupo.rotulo}</h4>
                      <p className="text-xs text-gray-500 mb-3">{grupo.descricao}</p>
                      <div className="space-y-3">
                        {grupo.opcoes.map(opcao => (
                          <button
                            type="button"
                            key={opcao.id}
                            onClick={() => setEscolhaRacial(atual => ({ ...atual, [grupo.campo]: opcao.id }))}
                            className={`w-full p-3 rounded-xl border text-left transition-all ${escolhaRacial[grupo.campo] === opcao.id ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-black/30 hover:border-white/30'}`}
                          >
                            <span className="text-white font-bold block">{opcao.titulo}</span>
                            <span className="text-xs text-gray-400 block mt-1">{descreverOpcaoRacial(opcao)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {gruposEscolhaRacial.length === 0 && (
                    <div className="text-sm text-gray-500 italic">Esta raça não exige uma sub-raça ou variante.</div>
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
            <p className="text-xs text-gray-500 mb-4">{classesFiltradas.length} classe(s) disponível(is) para esta Árvore.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {classesFiltradas.map(classe => (
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
                onClick={() => setDivindade(arvoreSelecionada?.deidadeTitulo || '')}
                className={`w-full p-4 rounded-xl border text-left transition-all ${divindade === arvoreSelecionada?.deidadeTitulo ? 'border-primary bg-primary/20' : 'border-white/10 bg-black/40 hover:border-white/30'}`}
              >
                <span className="text-sm text-gray-400 block mb-1">Deidade Padroeira da sua Árvore</span>
                <span className="text-xl text-white font-bold" style={{fontFamily: 'Cinzel, serif'}}>{arvoreSelecionada?.deidadeTitulo}</span>
              </button>

              <div className="relative">
                <label className="block text-xs text-gray-500 mb-1 ml-1">Ou especifique outra entidade/divindade menor</label>
                <input
                  type="text"
                  value={divindade !== arvoreSelecionada?.deidadeTitulo ? divindade : ''}
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
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-black/30 p-4 rounded-2xl border border-white/5">
              <div>
                <h3 className="text-xl text-white font-bold">Atributos</h3>
                <p className="text-sm text-gray-400">Escolha um método e organize os valores entre os sete atributos.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePadrao}
                  className={`px-4 py-2.5 rounded-full border font-bold tracking-wide flex items-center gap-2 transition-all ${metodoAtributos === 'padrao' ? 'bg-primary text-white border-primary' : 'bg-primary/10 text-primary border-primary/40 hover:bg-primary/20'}`}
                >
                  <ListOrdered size={18} />
                  Organizar padrão
                </button>
                <button
                  onClick={handleRolar}
                  className={`px-4 py-2.5 rounded-full border font-bold tracking-wide flex items-center gap-2 transition-all ${metodoAtributos === 'rolado' ? 'bg-amber-600 text-white border-amber-500' : 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'}`}
                >
                  <Dices size={18} />
                  Rolar 7d20
                </button>
                <button
                  onClick={handleCompraPontos}
                  className={`px-4 py-2.5 rounded-full border font-bold tracking-wide flex items-center gap-2 transition-all ${metodoAtributos === 'pontos' ? 'bg-blue-600 text-white border-blue-500' : 'bg-blue-500/10 text-blue-400 border-blue-500/40 hover:bg-blue-500/20'}`}
                >
                  <SlidersHorizontal size={18} />
                  Distribuir 24 pontos
                </button>
              </div>
            </div>

            <div className={`rounded-xl border px-4 py-3 text-sm ${metodoAtributos === 'pontos' ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-primary/5 border-primary/20 text-gray-300'}`}>
              {metodoAtributos === 'pontos' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Todos começam em 8. Aumente livremente até 15 antes dos ajustes raciais.</span>
                  <strong className={pontosRestantes === 0 ? 'text-green-400' : 'text-blue-300'}>
                    {pontosRestantes} de {COMPRA_PONTOS_ORCAMENTO} pontos restantes
                  </strong>
                </div>
              ) : (
                <span>
                  {metodoAtributos === 'padrao'
                    ? 'Conjunto equilibrado: 15, 14, 13, 12, 10, 8 e 8.'
                    : 'Resultados da rolagem: troque os valores entre os atributos; cada dado só pode ser usado uma vez.'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
              {ATRIBUTOS.map((attr) => (
                <div key={attr} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-sm text-gray-300 font-bold uppercase tracking-widest">{ROTULOS_ATRIBUTOS[attr]}</span>
                  {metodoAtributos === 'pontos' ? (
                    <div className="flex items-center justify-between gap-2 bg-black/60 border border-white/20 rounded-xl p-1.5">
                      <button
                        onClick={() => handleAjustarPonto(attr, -1)}
                        disabled={atribuicao[attr] <= COMPRA_PONTOS_BASE}
                        aria-label={`Diminuir ${ROTULOS_ATRIBUTOS[attr]}`}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-2xl text-white font-bold" style={{fontFamily: 'Cinzel, serif'}}>{atribuicao[attr]}</span>
                      <button
                        onClick={() => handleAjustarPonto(attr, 1)}
                        disabled={atribuicao[attr] >= COMPRA_PONTOS_MAXIMO || pontosRestantes <= 0}
                        aria-label={`Aumentar ${ROTULOS_ATRIBUTOS[attr]}`}
                        className="p-2 rounded-lg text-blue-400 hover:text-white hover:bg-blue-500/20 disabled:opacity-25 disabled:cursor-not-allowed"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <select
                      value={atribuicao[attr]}
                      onChange={(e) => handleOrganizarValor(attr, parseInt(e.target.value, 10))}
                      className="bg-black/60 border border-white/20 text-white rounded-xl p-2 outline-none focus:border-primary w-full text-center text-xl font-bold appearance-none cursor-pointer"
                      style={{fontFamily: 'Cinzel, serif'}}
                    >
                      {opcoesDoConjunto.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
            {metodoAtributos === 'pontos' && pontosRestantes > 0 && (
              <p className="text-xs text-amber-400 text-center">Distribua os {pontosRestantes} pontos restantes para avançar.</p>
            )}
          </motion.div>
        );
      case 6:
        // Calculos em tempo real da Preview
        const previewRaca = catalogo?.racas.find(r => r.id === racaId);
        const previewClasse = catalogo?.classes.find(c => c.id === classeId);
        const previewDerivados = previewRaca ? calcularDerivados(atribuicao, previewRaca, 1, escolhaRacial) : null;

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
    if (step === 1) return nome.trim().length < 2 || !arvoreId;
    if (step === 2) {
      const currentRaca = catalogo?.racas.find(r => r.id === racaId);
      if (!currentRaca) return true;
      if (!escolhaRacialEstaCompleta(currentRaca, escolhaRacial)) return true;
    }
    if (step === 3) return !classeId;
    if (step === 4) return divindade.trim().length === 0;
    if (step === 5) {
      return metodoAtributos === 'pontos'
        ? !compraPontosValida(atribuicao)
        : !conjuntoAtributosValido(atribuicao, valoresDisponiveis);
    }
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
