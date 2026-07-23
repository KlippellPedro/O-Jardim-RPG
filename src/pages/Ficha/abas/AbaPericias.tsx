import { useState, useEffect } from 'react';
import { HelpCircle, Search, Dices } from 'lucide-react';
import { motion } from 'framer-motion';
import { carregarCatalogo } from '../../../services/catalogoService';
import { IPericiaCatalogo } from '../../../types/catalogo';
import { ModalVantagensPericia } from '../components/ModalVantagensPericia';
import { ModalCalculoPericia } from '../components/ModalCalculoPericia';

const GRAUS_PERICIA = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'];
const BONUS_GRAU: Record<string, number> = {
  iniciante: 0,
  aprendiz: 2,
  treinado: 4,
  especialista: 6,
  mestre: 8,
  veterano: 10,
  renomado: 12,
};

const NOMES_ATRIBUTOS: Record<string, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

export const AbaPericias = ({ character, onUpdate }: { character: any, onUpdate: any }) => {
  const [periciasCatalogo, setPericiasCatalogo] = useState<IPericiaCatalogo[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroAtributo, setFiltroAtributo] = useState('');

  useEffect(() => {
    carregarCatalogo().then(data => {
      setPericiasCatalogo(data.pericias || []);
    });
  }, []);

  const f = character.ficha || {};
  const pericias = f.pericias || {};
  const rolagens = f.rolagensPericias || {};
  const attrs = f.atributosFinais || character.atributosFinais || { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10 };
  const nivel = character.nivel || 1;
  const metadeNivelCalculado = Math.floor(Math.max(1, nivel) / 2);

  const handleGrauChange = (periciaId: string, grau: string) => {
    const novasPericias = { ...pericias };
    if (grau === 'iniciante') {
      delete novasPericias[periciaId];
    } else {
      novasPericias[periciaId] = grau;
    }
    onUpdate(['ficha', 'pericias'], novasPericias);
  };

  const handleApplyVantagens = (periciaId: string, vantagens: number, desvantagens: number) => {
    const next = { vantagens, desvantagens };
    if (vantagens === 0 && desvantagens === 0) {
      clearRolagem(periciaId);
    } else {
      onUpdate(['ficha', 'rolagensPericias', periciaId], next);
    }
  };

  const clearRolagem = (periciaId: string) => {
    const nextRolagens = { ...rolagens };
    delete nextRolagens[periciaId];
    onUpdate(['ficha', 'rolagensPericias'], nextRolagens);
  };

  const [activeModal, setActiveModal] = useState<{ type: 'vantagens' | 'calculo', periciaId: string } | null>(null);

  const activePericiaObj = activeModal ? periciasCatalogo.find(p => p.id === activeModal.periciaId) : null;
  const activeRolagem = activeModal ? (rolagens[activeModal.periciaId] || { vantagens: 0, desvantagens: 0 }) : { vantagens: 0, desvantagens: 0 };
  const activeGrau = activeModal ? (pericias[activeModal.periciaId] || 'iniciante') : 'iniciante';
  const activeAttr = activePericiaObj ? (attrs[activePericiaObj.atributo] || 10) : 10;
  const activeMod = Math.floor((activeAttr - 10) / 2);
  const activeBonusGrau = BONUS_GRAU[activeGrau] || 0;
  const activeTotal = activeMod + metadeNivelCalculado + activeBonusGrau;

  const periciasVisiveis = periciasCatalogo
    .filter(p => !busca || p.titulo.toLowerCase().includes(busca.toLowerCase()))
    .filter(p => !filtroAtributo || p.atributo === filtroAtributo)
    .sort((a, b) => a.titulo.localeCompare(b.titulo));

  const contagemGraus = GRAUS_PERICIA.slice(1).map(g => ({
    grau: g,
    count: periciasCatalogo.filter(p => pericias[p.id] === g).length
  })).filter(g => g.count > 0);

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif' }}>Perícias</h2>
          <p className="text-gray-400 text-sm">Consulte resultados, ajuste os graus e marque vantagens.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {contagemGraus.length > 0 ? contagemGraus.map(c => (
            <div key={c.grau} className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-2">
              <span className="text-2xl font-bold text-[#c7a44c]">{c.count}</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight">{c.grau}</span>
            </div>
          )) : (
            <div className="flex items-center gap-3 bg-[#15141b] border border-white/5 rounded-xl px-4 py-2">
              <span className="text-2xl font-bold text-gray-600">0</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight max-w-[80px]">Perícias Treinadas</span>
            </div>
          )}
        </div>
      </div>

      {/* FERRAMENTAS */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar perícia..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full bg-[#0f0e15] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm"
          />
        </div>
        <select 
          value={filtroAtributo}
          onChange={e => setFiltroAtributo(e.target.value)}
          className="bg-[#0f0e15] border border-white/5 rounded-xl py-3 px-4 text-white focus:border-[#c7a44c]/50 outline-none text-sm appearance-none md:min-w-[200px]"
        >
          <option value="">Todos os atributos</option>
          {Object.entries(NOMES_ATRIBUTOS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* LISTA EM GRID */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl overflow-hidden p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {periciasVisiveis.map(p => {
            const grauAtual = pericias[p.id] || 'iniciante';
            const attrVal = attrs[p.atributo] || 10;
            const mod = Math.floor((attrVal - 10) / 2);
            const bonusG = BONUS_GRAU[grauAtual] || 0;
            const total = mod + metadeNivelCalculado + bonusG;
            const totalStr = total >= 0 ? `+${total}` : `${total}`;

            const rolagem = rolagens[p.id] || { vantagens: 0, desvantagens: 0 };
            const vant = rolagem.vantagens;
            const desv = rolagem.desvantagens;

            return (
              <motion.div 
                layout
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                key={p.id} 
                className="bg-[#121118] border border-white/5 rounded-xl p-4 flex flex-col gap-2 hover:border-[#c7a44c]/30 transition-colors group relative"
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{p.titulo}</span>
                    <HelpCircle 
                      size={14} 
                      className="text-[#c7a44c] opacity-50 hover:opacity-100 transition-opacity cursor-pointer" 
                      onClick={() => setActiveModal({ type: 'calculo', periciaId: p.id })}
                    />
                  </div>
                  <span className="text-2xl font-bold text-[#c7a44c] leading-none drop-shadow-md">{totalStr}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] px-2 py-1.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize font-bold">
                    {NOMES_ATRIBUTOS[p.atributo]?.substring(0,3)} {mod >= 0 ? `+${mod}` : mod}
                  </span>
                  
                  <select
                    value={grauAtual}
                    onChange={e => handleGrauChange(p.id, e.target.value)}
                    className={`text-[10px] px-3 py-1.5 rounded-full border appearance-none text-center cursor-pointer font-bold uppercase tracking-wider outline-none transition-colors ${
                      grauAtual === 'iniciante' ? 'bg-black/40 border-white/10 text-gray-500 hover:border-white/20' :
                      grauAtual === 'aprendiz' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                      grauAtual === 'treinado' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                      grauAtual === 'especialista' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' :
                      grauAtual === 'mestre' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
                      'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}
                  >
                    {GRAUS_PERICIA.map(g => (
                      <option key={g} value={g} className="bg-[#0f0e15] text-white">{g} (+{BONUS_GRAU[g]})</option>
                    ))}
                  </select>
                </div>
                
                {/* Vantagens / Rolar */}
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setActiveModal({ type: 'vantagens', periciaId: p.id })}
                      className={`px-3 py-1.5 rounded flex items-center justify-center text-xs font-bold transition-colors ${
                        vant > 0 || desv > 0 ? 'bg-[#c7a44c]/20 text-[#c7a44c] border border-[#c7a44c]/30' : 'bg-black/40 text-gray-600 border border-white/5 hover:text-white hover:border-white/20'
                      }`}
                      title="Configurar Vantagens e Desvantagens"
                    >
                      {vant > 0 || desv > 0 ? `${vant}V - ${desv}D` : 'V / D'}
                    </button>
                    {(vant > 0 || desv > 0) && (
                      <button 
                        onClick={() => clearRolagem(p.id)}
                        className="text-gray-600 hover:text-red-400 ml-2 text-[10px] uppercase font-bold tracking-wider"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  
                  <button className="px-3 py-1.5 rounded bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 hover:scale-105 flex items-center gap-2 text-xs font-bold transition-all">
                    <Dices size={14} /> Rolar
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
        {periciasVisiveis.length === 0 && (
          <div className="p-8 text-center text-gray-500">Nenhuma perícia encontrada com esses filtros.</div>
        )}
      </div>

      {activeModal?.type === 'vantagens' && activePericiaObj && (
        <ModalVantagensPericia
          isOpen={true}
          onClose={() => setActiveModal(null)}
          periciaNome={activePericiaObj.titulo}
          initialVantagens={activeRolagem.vantagens}
          initialDesvantagens={activeRolagem.desvantagens}
          onApply={(v, d) => handleApplyVantagens(activePericiaObj.id, v, d)}
          onClear={() => { clearRolagem(activePericiaObj.id); setActiveModal(null); }}
        />
      )}

      {activeModal?.type === 'calculo' && activePericiaObj && (
        <ModalCalculoPericia
          isOpen={true}
          onClose={() => setActiveModal(null)}
          periciaNome={activePericiaObj.titulo}
          atributoNome={NOMES_ATRIBUTOS[activePericiaObj.atributo] || activePericiaObj.atributo}
          atributoValor={activeAttr}
          modificador={activeMod}
          nivel={nivel}
          metadeNivel={metadeNivelCalculado}
          grauNome={activeGrau}
          bonusGrau={activeBonusGrau}
          total={activeTotal}
          descricao={activePericiaObj.descricao}
        />
      )}
    </div>
  );
};
