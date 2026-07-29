import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessaoStore } from '../../store/useSessaoStore';
import { useCharacterStore } from '../../store/useCharacterStore';
import { Plus, Trash2, ArrowRight, Dices, Sword, Eye } from 'lucide-react';
import { ModalInfoFicha } from '../Ficha/components/ModalInfoFicha';
import { FichaModal } from '../Ficha/components/FichaModal';

interface InitiativeTrackerProps {
  onRequestRoll: (formula?: string, title?: string) => void;
  isRollDisabled?: boolean;
}

export const InitiativeTracker: React.FC<InitiativeTrackerProps> = ({ onRequestRoll, isRollDisabled }) => {
  const {
    iniciativa,
    turnoAtualIndex,
    emCombate,
    adicionarEntidade,
    removerEntidade,
    iniciarCombate,
    encerrarCombate,
    proximoTurno,
    ordenarIniciativa
  } = useSessaoStore();

  const [isAdding, setIsAdding] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaIniciativa, setNovaIniciativa] = useState(10);
  const [novoTipo, setNovoTipo] = useState<'aliado' | 'inimigo'>('inimigo');
  const [salvandoEntidade, setSalvandoEntidade] = useState(false);
  const { characters, fetchCharacters } = useCharacterStore();
  const [fichaParaInspecionar, setFichaParaInspecionar] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const handleAddNPC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoNome.trim() || salvandoEntidade) return;

    setSalvandoEntidade(true);
    try {
      await adicionarEntidade({
        nome: novoNome,
        iniciativa: novaIniciativa,
        vida_atual: 50,
        vida_maxima: 50,
        tipo: novoTipo,
      });
      setNovoNome('');
      setNovaIniciativa(10);
      setNovoTipo('inimigo');
      setIsAdding(false);
    } catch (err) {
      setAlertMessage('Não foi possível adicionar a entidade. Tente novamente.');
    } finally {
      setSalvandoEntidade(false);
    }
  };

  return (
    <motion.div 
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute right-0 top-0 bottom-0 w-[350px] bg-[#0f0e15]/90 backdrop-blur-xl border-l border-[#c7a44c]/20 p-6 flex flex-col z-10 shadow-[-30px_0_50px_rgba(0,0,0,0.7)]"
      style={{ boxShadow: 'inset 1px 0 20px rgba(199,164,76,0.05)' }}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#c7a44c] tracking-wider" style={{fontFamily: 'Cinzel, serif'}}>
          Iniciativa
        </h3>
        <button 
          onClick={() => onRequestRoll()}
          disabled={isRollDisabled}
          className="p-3 bg-[#c7a44c]/10 hover:bg-[#c7a44c]/20 rounded-full border border-[#c7a44c]/50 text-[#c7a44c] transition-all shadow-[0_0_15px_rgba(199,164,76,0.3)] disabled:opacity-50 disabled:cursor-wait"
          title="Rolar D20"
        >
          <Dices size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        <AnimatePresence>
          {iniciativa.map((entidade, index) => {
            const isAtivo = index === turnoAtualIndex;
            return (
              <motion.div
                key={entidade.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`relative flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isAtivo 
                    ? 'bg-[#c7a44c]/10 border-[#c7a44c] shadow-[0_0_20px_rgba(199,164,76,0.2)]' 
                    : 'bg-black/40 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm bg-black/40"
                       style={{ borderColor: entidade.cor, color: entidade.cor }}>
                    {entidade.iniciativa}
                  </div>
                  <div>
                    <div className="text-white font-medium flex items-center gap-2">
                      {entidade.nome}
                      {entidade.tipo === 'jogador' && (
                        <button 
                          onClick={() => {
                            const char = characters.find(c => c.id === entidade.id || c.nome === entidade.nome);
                            if (char && char.ficha?.compartilhada) {
                              setFichaParaInspecionar(char);
                            } else {
                              setAlertMessage("O jogador manteve sua ficha privada ou a entidade não está vinculada.");
                            }
                          }}
                          className="text-gray-500 hover:text-white transition-colors"
                          title="Inspecionar Ficha"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {entidade.hpAtual !== undefined && entidade.hpTotal !== undefined ? (
                        `HP: ${entidade.hpAtual}/${entidade.hpTotal}`
                      ) : (
                        `Status: ${entidade.estado_vida || 'Desconhecido'}`
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Botões de Atalho Rápidos (Apenas se for o turno deste jogador e for jogador) */}
                {isAtivo && entidade.tipo === 'jogador' && (
                  <div className="absolute -bottom-10 left-0 right-0 flex justify-center gap-2 mt-2">
                    <button 
                      onClick={() => {
                        const char = characters.find(c => c.id === entidade.id || c.nome === entidade.nome);
                        let bonus = 0;
                        if (char) {
                          // Exemplo: Soma FORÇA ou DESTRA se tiver (lógica mockada para mostrar integração de bônus real)
                          bonus = Number(char.ficha?.atributos?.forca || char.ficha?.atributos?.str || 0);
                        }
                        const finalBonus = bonus > 0 ? `+${bonus}` : '';
                        onRequestRoll(`1d20${finalBonus}`, `Ataque Básico (${entidade.nome})`);
                      }}
                      className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-red-500/40 shadow-lg"
                    >
                      <Sword size={12} /> Ataque (+Bônus)
                    </button>
                    <button 
                      onClick={() => onRequestRoll(`1d20`, `D20 Neutro (${entidade.nome})`)}
                      className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-blue-500/40 shadow-lg"
                    >
                      <Dices size={12} /> D20 Neutro
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    removerEntidade(entidade.id).catch(() => {
                      setAlertMessage('Não foi possível remover a entidade. Tente novamente.');
                    });
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {isAdding && (
        <motion.form 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mt-4 p-4 bg-black/40 border border-white/10 rounded-xl flex flex-col gap-3"
          onSubmit={handleAddNPC}
        >
          <input
            type="text"
            placeholder="Nome (NPC/Monstro)"
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNovoTipo('inimigo')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                novoTipo === 'inimigo'
                  ? 'bg-red-500/20 border-red-500/50 text-red-400'
                  : 'bg-black/40 border-white/10 text-gray-500 hover:border-white/30'
              }`}
            >
              Inimigo
            </button>
            <button
              type="button"
              onClick={() => setNovoTipo('aliado')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                novoTipo === 'aliado'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-black/40 border-white/10 text-gray-500 hover:border-white/30'
              }`}
            >
              Aliado
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Iniciativa"
              value={novaIniciativa}
              onChange={e => setNovaIniciativa(Number(e.target.value))}
              className="w-full bg-black/60 border border-white/20 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              disabled={salvandoEntidade}
              className="bg-red-500/20 text-red-400 p-2 rounded-lg border border-red-500/50 hover:bg-red-500/40 disabled:opacity-50 disabled:cursor-wait"
            >
              <Plus size={18} />
            </button>
          </div>
        </motion.form>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-2 border border-dashed border-white/20 text-gray-400 hover:text-white hover:border-white/50 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Adicionar Entidade
          </button>
        )}

        <button
          onClick={() => {
            ordenarIniciativa().catch(() => {
              setAlertMessage('Não foi possível ordenar a iniciativa. Tente novamente.');
            });
          }}
          disabled={iniciativa.length < 2}
          className="w-full py-1.5 text-gray-500 hover:text-white text-xs uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Ordenar por Iniciativa
        </button>

        {!emCombate ? (
          <button
            onClick={() => {
              iniciarCombate().catch(() => {
                setAlertMessage('Não foi possível iniciar o combate. Adicione ao menos uma entidade e tente novamente.');
              });
            }}
            disabled={iniciativa.length === 0}
            className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
          >
            <Sword size={18} /> Iniciar Combate
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                proximoTurno().catch(() => {
                  setAlertMessage('Não foi possível avançar o turno. Tente novamente.');
                });
              }}
              disabled={iniciativa.length === 0}
              className="w-full py-3 bg-[#c7a44c] text-black font-bold rounded-xl hover:bg-yellow-500 transition-colors shadow-[0_0_20px_rgba(199,164,76,0.4)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-sm"
            >
              Próximo Turno <ArrowRight size={18} />
            </button>
            <button
              onClick={() => {
                encerrarCombate().catch(() => {
                  setAlertMessage('Não foi possível encerrar o combate. Tente novamente.');
                });
              }}
              className="w-full py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-xs uppercase tracking-widest"
            >
              Encerrar Combate
            </button>
          </>
        )}
      </div>

      {/* Modal de Alerta */}
      <FichaModal
        isOpen={!!alertMessage}
        onClose={() => setAlertMessage(null)}
        title="Atenção"
      >
        <div className="text-gray-300 p-2 text-center text-lg">
          {alertMessage}
        </div>
        <div className="mt-8 flex justify-center">
          <button 
            onClick={() => setAlertMessage(null)} 
            className="px-8 py-2 bg-yellow-500/20 border border-yellow-500/50 text-yellow-500 font-bold rounded-xl hover:bg-yellow-500 hover:text-black transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)]"
          >
            Entendido
          </button>
        </div>
      </FichaModal>

      {/* Modal de Inspeção de Ficha Compartilhada */}
      {fichaParaInspecionar && (
        <ModalInfoFicha
          isOpen={true}
          onClose={() => setFichaParaInspecionar(null)}
          title={`Ficha Pública: ${fichaParaInspecionar.nome}`}
          description="O jogador permitiu que algumas informações da ficha fossem visíveis para a party."
          items={[
            { label: 'Nível', value: fichaParaInspecionar.nivel },
            { label: 'Raça / Classe', value: `${fichaParaInspecionar.ficha?.racaId || 'N/A'} / ${fichaParaInspecionar.ficha?.classes?.[0]?.classeId || 'N/A'}` },
            { label: 'HP Máximo', value: fichaParaInspecionar.ficha?.derivados?.vida || 'Desconhecido' },
          ]}
        />
      )}
    </motion.div>
  );
};
