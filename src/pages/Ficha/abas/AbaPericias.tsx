import { useState, useEffect } from 'react';
import { HelpCircle, Search, Dices, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { carregarCatalogo } from '../../../services/catalogoService';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { IPericiaCatalogo, IRaca } from '../../../types/catalogo';
import { ModalVantagensPericia } from '../components/ModalVantagensPericia';
import { ModalCalculoPericia } from '../components/ModalCalculoPericia';
import { aplicarAjustesAtributosRaciais, BONUS_GRAU, obterAjustesPericiasRaciais } from '../../../services/calculoService';
import { resumirEquipamentos } from '../../../services/equipamentoService';
import { desvantagensAutomaticasTeste, obterStatusFicha, penalidadeCansacoTeste } from '../../../services/statusService';
import { AjusteButton, AjustesFichaModal } from '../components/AjustesFichaModal';
import { ModalPortal } from '../components/ModalPortal';
import {
  ajusteOrigem,
  chaveAjuste,
  nomeAjusteOrigem,
  obterAjustesManuais,
  totalAjustesManuais,
} from '../../../services/ajustesFichaService';

const GRAUS_PERICIA = ['iniciante', 'aprendiz', 'treinado', 'especialista', 'mestre', 'veterano', 'renomado'];
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
  const campanhaAtiva = useAuthStore(s => s.campanhaAtiva);
  const [periciasCatalogo, setPericiasCatalogo] = useState<IPericiaCatalogo[]>([]);
  const [racasCatalogo, setRacasCatalogo] = useState<IRaca[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroAtributo, setFiltroAtributo] = useState('');
  const [rolando, setRolando] = useState<string | null>(null);

  useEffect(() => {
    carregarCatalogo().then(data => {
      setPericiasCatalogo(data.pericias || []);
      setRacasCatalogo(data.racas || []);
    });
  }, []);

  const f = character.ficha || {};
  const pericias = f.pericias || {};
  const rolagens = f.rolagensPericias || {};
  const status = obterStatusFicha(f);
  const attrsBase = f.atributosFinais || character.atributosFinais || { forca: 10, destreza: 10, constituicao: 10, inteligencia: 10, sabedoria: 10, carisma: 10, fluxo: 10 };
  const racaAtual = racasCatalogo.find(raca => raca.id === f.racaId) || null;
  const resumoEquipamento = resumirEquipamentos(character.inventarioCentral || [], f);
  const attrsAntesRaca = Object.fromEntries(Object.keys(NOMES_ATRIBUTOS).map((atributo) => [
    atributo,
    Number(attrsBase[atributo] ?? 10)
      + ajusteOrigem(f, 'atributo', atributo)
      + totalAjustesManuais(f, chaveAjuste('atributo', atributo))
      + (resumoEquipamento.bonusAtributos[atributo] || 0),
  ]));
  const attrs = racaAtual ? aplicarAjustesAtributosRaciais(attrsAntesRaca, racaAtual, f.escolhaRacial) : attrsAntesRaca;
  const ajustesRaciaisPericias = obterAjustesPericiasRaciais(racaAtual, f.escolhaRacial);
  const nivel = character.nivel || 1;
  const metadeNivelCalculado = Math.floor(Math.max(1, nivel) / 2);
  const penalidadeArmadura = resumoEquipamento.penalidadeArmadura;
  const penalidadeDaPericia = (periciaId: string) => ['acrobacia', 'atletismo', 'furtividade'].includes(periciaId) ? penalidadeArmadura : 0;
  const periciaFisica = (atributo: string) => ['forca', 'destreza', 'constituicao'].includes(atributo);
  const penalidadeCansacoDaPericia = (atributo: string) => penalidadeCansacoTeste(status.cansacoAtual, periciaFisica(atributo));
  const desvantagensAutomaticasDaPericia = (periciaId: string, atributo: string) => (
    desvantagensAutomaticasTeste(status.cansacoAtual, periciaFisica(atributo), resumoEquipamento.sobrecarregado)
    + (resumoEquipamento.desvantagens[periciaId] || 0)
    + (resumoEquipamento.desvantagens['testes'] || 0)
  );
  const bonusExtraDaPericia = (periciaId: string, tituloPericia?: string) => ajusteOrigem(f, 'pericia', periciaId, tituloPericia)
    + totalAjustesManuais(f, chaveAjuste('pericia', periciaId))
    + (resumoEquipamento.bonusPericias[periciaId] || 0);

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

  const handleRolar = async (pericia: any, totalBonus: number, vantagens: number, desvantagens: number) => {
    if (!campanhaAtiva?.id) {
      alert('Nenhuma campanha ativa. Selecione uma campanha no Menu para rolar dados.');
      return;
    }
    setRolando(pericia.id);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId: campanhaAtiva.id,
        personagemId: character.id,
        titulo: `Teste de ${pericia.titulo}`,
        bonus: totalBonus,
        vantagens,
        desvantagens,
      });
      setActiveModal({ type: 'resultado', periciaId: pericia.id, registro });
    } catch (e: any) {
      alert(e?.message || 'Falha ao rolar a perícia.');
    } finally {
      setRolando(null);
    }
  };

  const [activeModal, setActiveModal] = useState<{ type: 'vantagens' | 'calculo' | 'ajustes' | 'nova' | 'resultado', periciaId: string, registro?: any } | null>(null);

  const periciasCustomizadas = Array.isArray(f.periciasCustomizadas)
    ? f.periciasCustomizadas.filter((pericia: unknown): pericia is IPericiaCatalogo => Boolean(
      pericia
      && typeof pericia === 'object'
      && typeof (pericia as IPericiaCatalogo).id === 'string'
      && typeof (pericia as IPericiaCatalogo).titulo === 'string'
      && typeof (pericia as IPericiaCatalogo).atributo === 'string',
    ))
    : [];
  const todasPericias = Array.from(new Map(
    [...periciasCustomizadas, ...periciasCatalogo].map((pericia) => [pericia.id, pericia]),
  ).values());
  const periciasFavoritas = Array.from(new Set(Array.isArray(f.periciasFavoritas)
    ? f.periciasFavoritas.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim()))
    : []));
  const idsFavoritos = new Set(periciasFavoritas);

  const toggleFavorita = (periciaId: string) => {
    const proximas = idsFavoritos.has(periciaId)
      ? periciasFavoritas.filter((id) => id !== periciaId)
      : [...periciasFavoritas, periciaId];
    onUpdate(['ficha', 'periciasFavoritas'], proximas);
  };

  const activePericiaObj = activeModal ? todasPericias.find(p => p.id === activeModal.periciaId) : null;
  const activeRolagem = activeModal ? (rolagens[activeModal.periciaId] || { vantagens: 0, desvantagens: 0 }) : { vantagens: 0, desvantagens: 0 };
  const activeGrau = activeModal ? (pericias[activeModal.periciaId] || 'iniciante') : 'iniciante';
  const activeAttr = activePericiaObj ? (attrs[activePericiaObj.atributo] || 10) : 10;
  const activeMod = Math.floor((activeAttr - 10) / 2);
  const activeBonusGrau = BONUS_GRAU[activeGrau] || 0;
  const activeBonusRacial = activePericiaObj ? (ajustesRaciaisPericias[activePericiaObj.id] || 0) : 0;
  const activeBonusExtra = activePericiaObj ? bonusExtraDaPericia(activePericiaObj.id, activePericiaObj.titulo) : 0;
  const activeDesvantagensAutomaticas = desvantagensAutomaticasDaPericia(activePericiaObj?.id || '', activePericiaObj?.atributo || '');
  const activeTotal = activeMod + metadeNivelCalculado + activeBonusGrau + activeBonusRacial + activeBonusExtra - penalidadeDaPericia(activePericiaObj?.id || '') + penalidadeCansacoDaPericia(activePericiaObj?.atributo || '');

  const periciasVisiveis = todasPericias
    .filter(p => !busca || p.titulo.toLowerCase().includes(busca.toLowerCase()))
    .filter(p => !filtroAtributo || p.atributo === filtroAtributo)
    .sort((a, b) => {
      const diferencaFavorito = Number(idsFavoritos.has(b.id)) - Number(idsFavoritos.has(a.id));
      return diferencaFavorito || a.titulo.localeCompare(b.titulo, 'pt-BR');
    });

  const contagemGraus = GRAUS_PERICIA.slice(1).map(g => ({
    grau: g,
    count: todasPericias.filter(p => pericias[p.id] === g).length
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
            const bonusRacial = ajustesRaciaisPericias[p.id] || 0;
            const bonusExtra = bonusExtraDaPericia(p.id, p.titulo);
            const penalidadeEquipamento = penalidadeDaPericia(p.id);
            const penalidadeCansaco = penalidadeCansacoDaPericia(p.atributo);
            const vantagensEquipamento = (resumoEquipamento.vantagens[p.id] || 0) + (resumoEquipamento.vantagens['testes'] || 0);
            const desvantagensEquipamento = (resumoEquipamento.desvantagens[p.id] || 0) + (resumoEquipamento.desvantagens['testes'] || 0);
            const total = mod + metadeNivelCalculado + bonusG + bonusRacial + bonusExtra - penalidadeEquipamento + penalidadeCansaco;
            const desvantagensAutomaticas = desvantagensAutomaticasDaPericia(p.id, p.atributo) + desvantagensEquipamento;
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
                    <button
                      type="button"
                      onClick={() => toggleFavorita(p.id)}
                      aria-label={idsFavoritos.has(p.id) ? `Desfavoritar ${p.titulo}` : `Favoritar ${p.titulo}`}
                      aria-pressed={idsFavoritos.has(p.id)}
                      title={idsFavoritos.has(p.id) ? 'Remover dos favoritos' : 'Favoritar perícia'}
                      className={`transition-colors ${idsFavoritos.has(p.id) ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`}
                    >
                      <Star size={15} fill={idsFavoritos.has(p.id) ? 'currentColor' : 'none'} />
                    </button>
                    <span className="text-white font-bold">{p.titulo}</span>
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: 'calculo', periciaId: p.id })}
                      aria-label={`Ver cálculo de ${p.titulo}`}
                      className="text-[#c7a44c] opacity-50 transition-opacity hover:opacity-100"
                    >
                      <HelpCircle size={14} />
                    </button>
                    <AjusteButton label={p.titulo} onClick={() => setActiveModal({ type: 'ajustes', periciaId: p.id })} />
                  </div>
                  <span className="text-2xl font-bold text-[#c7a44c] leading-none drop-shadow-md">{totalStr}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] px-2 py-1.5 bg-black/40 rounded border border-white/5 text-gray-400 capitalize font-bold">
                    {NOMES_ATRIBUTOS[p.atributo]?.substring(0,3)} {mod >= 0 ? `+${mod}` : mod}
                  </span>
                  {bonusRacial !== 0 && (
                    <span className="text-[10px] px-2 py-1.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 font-bold">
                      Raça {bonusRacial >= 0 ? '+' : ''}{bonusRacial}
                    </span>
                  )}
                  {penalidadeEquipamento > 0 && <span className="text-[10px] font-bold text-orange-300">Armadura -{penalidadeEquipamento}</span>}
                  {penalidadeCansaco < 0 && <span className="text-[10px] font-bold text-red-300">Cansaço {penalidadeCansaco}</span>}
                  {desvantagensAutomaticas > 0 && <span className="text-[10px] font-bold text-red-300">{desvantagensAutomaticas}D automática</span>}
                  {vantagensEquipamento > 0 && <span className="text-[10px] font-bold text-emerald-300">Item {vantagensEquipamento}V</span>}
                  
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
                      {vant > 0 || desv > 0 ? `${vant}V / ${desv}D` : 'V / D'}
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
                  
                  <button 
                    onClick={() => handleRolar(p, total, vant + vantagensEquipamento, desv + desvantagensAutomaticas)}
                    disabled={rolando === p.id}
                    className="px-3 py-1.5 rounded bg-[#c7a44c]/10 border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/20 hover:scale-105 flex items-center gap-2 text-xs font-bold transition-all disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Dices size={14} /> {rolando === p.id ? '...' : 'Rolar'}
                  </button>
                </div>
              </motion.div>
            );
          })}

          <motion.div 
            layout
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => setActiveModal({ type: 'nova', periciaId: '' })}
            className="bg-[#121118] border border-dashed border-white/20 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-[#c7a44c]/50 hover:bg-[#c7a44c]/5 transition-colors cursor-pointer min-h-[140px] group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#c7a44c]/20 transition-colors">
              <span className="text-2xl text-gray-500 group-hover:text-[#c7a44c] mb-1">+</span>
            </div>
            <span className="text-xs font-bold text-gray-500 group-hover:text-[#c7a44c] uppercase tracking-widest text-center mt-2">Nova Perícia <br/> ou Ofício</span>
          </motion.div>
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
          bonusRacial={activeBonusRacial}
          bonusOutros={activeBonusExtra}
          penalidadeEquipamento={penalidadeDaPericia(activePericiaObj.id)}
          penalidadeCansaco={penalidadeCansacoDaPericia(activePericiaObj.atributo)}
          total={activeTotal}
          desvantagensAutomaticas={activeDesvantagensAutomaticas}
          descricao={activePericiaObj.descricao}
        />
      )}

      {activeModal?.type === 'ajustes' && activePericiaObj && (
        <AjustesFichaModal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          titulo={activePericiaObj.titulo}
          automaticos={[
            { nome: 'Raça', valor: Number(ajustesRaciaisPericias[activePericiaObj.id]) || 0 },
            { nome: nomeAjusteOrigem(f, 'pericia', activePericiaObj.id, activePericiaObj.titulo) || 'Origem', valor: ajusteOrigem(f, 'pericia', activePericiaObj.id, activePericiaObj.titulo) },
            { nome: 'Itens equipados', valor: resumoEquipamento.bonusPericias[activePericiaObj.id] || 0 },
          ]}
          ajustes={obterAjustesManuais(f, chaveAjuste('pericia', activePericiaObj.id))}
          onChange={(ajustes) => onUpdate(['ficha', 'ajustesFicha', chaveAjuste('pericia', activePericiaObj.id)], ajustes)}
        />
      )}

      {activeModal?.type === 'nova' && (
        <ModalPortal>
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#0f0e15] border border-[#c7a44c]/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(199,164,76,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[#c7a44c] font-bold tracking-widest uppercase">Nova Perícia / Ofício</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const titulo = (form.elements.namedItem('titulo') as HTMLInputElement).value;
              const atributo = (form.elements.namedItem('atributo') as HTMLSelectElement).value;
              
              if (titulo && atributo) {
                const newId = 'custom_' + Date.now();
                const nextCustom = [...periciasCustomizadas, { id: newId, titulo: titulo.trim(), atributo, descricao: 'Perícia/Ofício customizado.' }];
                onUpdate(['ficha', 'periciasCustomizadas'], nextCustom);
                
                const novasPericias = { ...pericias, [newId]: 'aprendiz' };
                onUpdate(['ficha', 'pericias'], novasPericias);
                
                setActiveModal(null);
              }
            }} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nome da Perícia/Ofício</label>
                <input name="titulo" type="text" required placeholder="Ex: Forja, Navegação, Etiqueta..." className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c7a44c]/50" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Atributo Base</label>
                <select name="atributo" required className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c7a44c]/50 appearance-none">
                  <option value="">Selecione um atributo...</option>
                  {Object.entries(NOMES_ATRIBUTOS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="mt-4 w-full py-3 bg-[#c7a44c]/20 text-[#c7a44c] border border-[#c7a44c]/50 font-bold uppercase tracking-widest rounded-lg hover:bg-[#c7a44c]/30 transition-colors">
                Criar Perícia
              </button>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {activeModal?.type === 'resultado' && activeModal.registro && (
        <ModalPortal>
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#0f0e15] border border-[#c7a44c]/50 rounded-2xl p-6 w-full max-w-sm shadow-[0_0_50px_rgba(199,164,76,0.2)] flex flex-col items-center text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-gray-400 font-bold tracking-widest uppercase mb-2">{activeModal.registro.titulo}</h3>
            
            <div className="text-5xl font-bold text-[#c7a44c] my-6 drop-shadow-[0_0_15px_rgba(199,164,76,0.5)]">
              {activeModal.registro.resultado}
            </div>

            <div className="w-full bg-[#121118] border border-white/5 rounded-xl p-4 flex flex-col gap-3 text-sm text-left mb-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-gray-500">Fórmula</span>
                <span className="text-gray-300 font-mono font-bold tracking-wider">{activeModal.registro.formula || '1d20'}</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-gray-500">Dados Sorteados</span>
                <span className="text-white font-mono flex gap-2">
                  {activeModal.registro.detalhes?.dados?.map((d: number, i: number) => (
                    <span key={i} className="text-[#c7a44c] font-bold">{d}</span>
                  ))}
                  {activeModal.registro.detalhes?.dados_ignorados?.length > 0 && (
                    <>
                      <span className="text-gray-600">|</span>
                      {activeModal.registro.detalhes.dados_ignorados.map((d: number, i: number) => (
                        <span key={i} className="text-gray-600 line-through opacity-50" title="Dado ignorado por desvantagem/vantagem">{d}</span>
                      ))}
                    </>
                  )}
                  {(!activeModal.registro.detalhes?.dados?.length && !activeModal.registro.detalhes?.dados_ignorados?.length) && (
                    <span className="text-gray-600">-</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Bônus Fixo</span>
                <span className={`${activeModal.registro.detalhes?.bonus >= 0 ? 'text-green-400' : 'text-red-400'} font-mono font-bold`}>
                  {activeModal.registro.detalhes?.bonus > 0 ? '+' : ''}{activeModal.registro.detalhes?.bonus || 0}
                </span>
              </div>
            </div>

            <button onClick={() => setActiveModal(null)} className="w-full py-3 bg-[#c7a44c]/10 text-[#c7a44c] border border-[#c7a44c]/30 font-bold uppercase tracking-widest rounded-lg hover:bg-[#c7a44c]/20 transition-colors">
              Fechar Resultado
            </button>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};
