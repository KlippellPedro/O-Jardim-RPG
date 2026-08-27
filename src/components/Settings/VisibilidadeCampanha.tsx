import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { MUNDO_CATALOG } from '../../../data/gerado/mundoCatalog';
import { ARVORES, arvoreInicialmenteRevelada } from '../../../data/mundo/arvoresCatalog';
import { ENTIDADES } from '../../../data/mundo/entidades';
import { carregarCatalogo } from '../../services/catalogoService';
import { ICatalogo } from '../../types/catalogo';
import { Select } from '../ui/Select';
import { Globe, ShoppingBag, Save, Eye, EyeOff, Loader2, TreePine, Sparkles, UserCog, BookOpen } from 'lucide-react';

export const VisibilidadeCampanha: React.FC = () => {
  const { campanhaAtiva, membrosCampanha, atualizarConfiguracoes } = useAuthStore();
  const config = campanhaAtiva?.configuracoes || {};
  const isMaster = campanhaAtiva?.papel === 'mestre';

  const [loreRevelado, setLoreRevelado] = useState<string[]>(config.lore_revelado || []);
  const [loreOculto, setLoreOculto] = useState<string[]>(config.lore_oculto || []);
  const [arvoresRevelado, setArvoresRevelado] = useState<string[]>(config.arvores_revelado || []);
  const [arvoresOculto, setArvoresOculto] = useState<string[]>(config.arvores_oculto || []);
  const [entidadesRevelado, setEntidadesRevelado] = useState<string[]>(config.entidades_revelado || []);
  const [entidadesOculto, setEntidadesOculto] = useState<string[]>(config.entidades_oculto || []);
  const [locaisOcultos, setLocaisOcultos] = useState<number[]>(config.locais_ocultos || [3, 4]); // Padrão: Mercado Negro e Banco Lunar ocultos
  const [racasLiberadas, setRacasLiberadas] = useState<string[]>(config.racas_liberadas || []);
  const [classesLiberadas, setClassesLiberadas] = useState<string[]>(config.classes_liberadas || []);
  const [racasLiberadasMembros, setRacasLiberadasMembros] = useState<Record<string, string[]>>(config.racas_liberadas_membros || {});
  const [classesLiberadasMembros, setClassesLiberadasMembros] = useState<Record<string, string[]>>(config.classes_liberadas_membros || {});
  const [membroSelecionado, setMembroSelecionado] = useState<string>('');
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  if (!campanhaAtiva) return null;

  const todosOsLocais = [
    { id: 1, nome: 'Feira de Vila' },
    { id: 2, nome: 'Metrópole' },
    { id: 3, nome: 'Mercado Negro' },
    { id: 4, nome: 'Banco Lunar' },
  ];

  // Raças/classes "esquecidas" e disponíveis: novas entradas do catálogo
  // (ex.: Anomalia, Divino, Onírico, Devorador) aparecem aqui sozinhas, sem
  // precisar de código novo - a lista é lida direto de data/ficha/*.json.
  // Especiais indisponíveis (ex.: Entidade, que não é jogável por design) e
  // classes/raças comuns (ex.: Detetive) ficam de fora de propósito: comum
  // não precisa de liberação, e indisponível não é uma escolha de campanha.
  const racasEspeciais = (catalogo?.racas || []).filter((r: any) => r.categoria === 'esquecida' && !r.indisponivel);
  const classesEspeciais = (catalogo?.classes || []).filter((c: any) => c.categoria === 'esquecida' && !c.indisponivel);
  // Mestre/assistente já vê tudo (bypassa liberação): liberação individual
  // só faz sentido pra jogador comum.
  const jogadoresDaCampanha = membrosCampanha.filter((membro) => membro.papel === 'jogador');

  const handleToggleLore = (id: string, initiallyRevealed: boolean) => {
    if (initiallyRevealed) {
      if (loreOculto.includes(id)) setLoreOculto(prev => prev.filter(i => i !== id));
      else setLoreOculto(prev => [...prev, id]);
    } else {
      if (loreRevelado.includes(id)) setLoreRevelado(prev => prev.filter(i => i !== id));
      else setLoreRevelado(prev => [...prev, id]);
    }
  };

  const handleToggleArvore = (id: string, initiallyRevealed: boolean) => {
    if (initiallyRevealed) {
      if (arvoresOculto.includes(id)) setArvoresOculto(prev => prev.filter(i => i !== id));
      else setArvoresOculto(prev => [...prev, id]);
    } else {
      if (arvoresRevelado.includes(id)) setArvoresRevelado(prev => prev.filter(i => i !== id));
      else setArvoresRevelado(prev => [...prev, id]);
    }
  };

  const handleToggleEntidade = (id: string, initiallyRevealed: boolean) => {
    if (initiallyRevealed) {
      if (entidadesOculto.includes(id)) setEntidadesOculto(prev => prev.filter(i => i !== id));
      else setEntidadesOculto(prev => [...prev, id]);
    } else {
      if (entidadesRevelado.includes(id)) setEntidadesRevelado(prev => prev.filter(i => i !== id));
      else setEntidadesRevelado(prev => [...prev, id]);
    }
  };

  const handleToggleLocal = (localId: number) => {
    if (locaisOcultos.includes(localId)) {
      setLocaisOcultos(prev => prev.filter(l => l !== localId));
    } else {
      setLocaisOcultos(prev => [...prev, localId]);
    }
  };

  const handleToggleRaca = (id: string) => {
    setRacasLiberadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleClasse = (id: string) => {
    setClassesLiberadas(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleToggleRacaMembro = (membroId: string, id: string) => {
    setRacasLiberadasMembros(prev => {
      const atual = prev[membroId] || [];
      const nova = atual.includes(id) ? atual.filter(i => i !== id) : [...atual, id];
      return { ...prev, [membroId]: nova };
    });
  };

  const handleToggleClasseMembro = (membroId: string, id: string) => {
    setClassesLiberadasMembros(prev => {
      const atual = prev[membroId] || [];
      const nova = atual.includes(id) ? atual.filter(i => i !== id) : [...atual, id];
      return { ...prev, [membroId]: nova };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await atualizarConfiguracoes({
      lore_revelado: loreRevelado,
      lore_oculto: loreOculto,
      arvores_revelado: arvoresRevelado,
      arvores_oculto: arvoresOculto,
      entidades_revelado: entidadesRevelado,
      entidades_oculto: entidadesOculto,
      locais_ocultos: locaisOcultos,
      racas_liberadas: racasLiberadas,
      classes_liberadas: classesLiberadas,
      racas_liberadas_membros: racasLiberadasMembros,
      classes_liberadas_membros: classesLiberadasMembros,
    });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">

      {!isMaster && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500/90 text-xs p-3 rounded-lg">
          Você está vendo como assistente: pode conferir tudo abaixo, mas só o mestre pode salvar alterações de visibilidade e liberação.
        </div>
      )}

      {/* SEÇÃO ÁRVORES */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TreePine className="text-emerald-400" size={20} />
          <h3 className="text-lg font-bold text-white">Visibilidade das Árvores</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Controle quais Árvores aparecem no Mundo e podem ser escolhidas na criação de fichas. Uma Árvore oculta some do visualizador 3D e some das opções da ficha.
        </p>

        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
          {ARVORES.map(arvore => {
            const initiallyRevealed = arvoreInicialmenteRevelada(arvore.id);
            const isCurrentlyVisible = initiallyRevealed ? !arvoresOculto.includes(arvore.id) : arvoresRevelado.includes(arvore.id);

            return (
              <div key={arvore.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Árvore</span>
                    <span className="text-white text-sm font-medium">{arvore.nome}</span>
                    <span className="text-gray-600 text-xs">({arvore.deidadeTitulo})</span>
                  </div>
                  {!initiallyRevealed && <span className="text-[10px] text-yellow-500/70 border border-yellow-500/20 px-1.5 rounded bg-yellow-500/10 mt-1 inline-block">Trancada por Padrão</span>}
                </div>

                <button
                  onClick={() => handleToggleArvore(arvore.id, initiallyRevealed)}
                  disabled={!isMaster}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrentlyVisible
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {isCurrentlyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  {isCurrentlyVisible ? 'Visível' : 'Oculta'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEÇÃO LORE / MUNDO */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe className="text-blue-400" size={20} />
          <h3 className="text-lg font-bold text-white">Visibilidade do Mundo (Lore)</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Controle quais deidades, fluxos, galhos, dimensões e demais fragmentos estão visíveis para os jogadores no Códice.</p>

        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
          {MUNDO_CATALOG.map(entry => {
            const initiallyRevealed = entry.revelado !== false;
            const isCurrentlyVisible = initiallyRevealed ? !loreOculto.includes(entry.id) : loreRevelado.includes(entry.id);

            return (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{entry.tipo}</span>
                    <span className="text-white text-sm font-medium">{entry.titulo}</span>
                  </div>
                  {!initiallyRevealed && <span className="text-[10px] text-yellow-500/70 border border-yellow-500/20 px-1.5 rounded bg-yellow-500/10 mt-1 inline-block">Trancado por Padrão</span>}
                </div>

                <button
                  onClick={() => handleToggleLore(entry.id, initiallyRevealed)}
                  disabled={!isMaster}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrentlyVisible
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {isCurrentlyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  {isCurrentlyVisible ? 'Visível' : 'Oculto'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* SEÇÃO ENTIDADES (CONTOS) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-amber-400" size={20} />
          <h3 className="text-lg font-bold text-white">Contos das Entidades</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          A raça Entidade não pode ser escolhida na ficha, mas o Livro das Entidades (<code>/entidades</code>) fica aberto pra qualquer jogador logado por padrão. Oculte um conto até a história da campanha realmente apresentar aquela Entidade.
        </p>

        <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
          {ENTIDADES.map(entidade => {
            const initiallyRevealed = entidade.revelado !== false;
            const isCurrentlyVisible = initiallyRevealed ? !entidadesOculto.includes(entidade.id) : entidadesRevelado.includes(entidade.id);

            return (
              <div key={entidade.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Conto</span>
                    <span className="text-white text-sm font-medium">{entidade.nome}</span>
                  </div>
                  {!initiallyRevealed && <span className="text-[10px] text-yellow-500/70 border border-yellow-500/20 px-1.5 rounded bg-yellow-500/10 mt-1 inline-block">Trancado por Padrão</span>}
                </div>

                <button
                  onClick={() => handleToggleEntidade(entidade.id, initiallyRevealed)}
                  disabled={!isMaster}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCurrentlyVisible
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}
                >
                  {isCurrentlyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                  {isCurrentlyVisible ? 'Visível' : 'Oculto'}
                </button>
              </div>
            );
          })}
          {ENTIDADES.length === 0 && <p className="text-xs text-gray-600 italic">Nenhum conto publicado ainda.</p>}
        </div>
      </section>

      {/* SEÇÃO RAÇAS E CLASSES ESPECIAIS */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">Raças e Classes Especiais</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Raças e classes esquecidas são recompensas ou transformações acima da curva. Elas só aparecem na criação/edição de fichas depois de liberadas aqui.
        </p>

        {!catalogo ? (
          <div className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando catálogo...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Raças ({racasLiberadas.length}/{racasEspeciais.length} liberadas)</h4>
              {racasEspeciais.map((raca: any) => {
                const isLiberada = racasLiberadas.includes(raca.id);
                return (
                  <div key={raca.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                    <span className="text-white text-sm font-medium">{raca.titulo}</span>
                    <button
                      onClick={() => handleToggleRaca(raca.id)}
                      disabled={!isMaster}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isLiberada
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/5 text-gray-500 border border-white/10'
                      }`}
                    >
                      {isLiberada ? 'Liberada' : 'Bloqueada'}
                    </button>
                  </div>
                );
              })}
              {racasEspeciais.length === 0 && <p className="text-xs text-gray-600 italic">Nenhuma raça especial no catálogo.</p>}
            </div>

            <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Classes ({classesLiberadas.length}/{classesEspeciais.length} liberadas)</h4>
              {classesEspeciais.map((classe: any) => {
                const isLiberada = classesLiberadas.includes(classe.id);
                return (
                  <div key={classe.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                    <span className="text-white text-sm font-medium">{classe.titulo}</span>
                    <button
                      onClick={() => handleToggleClasse(classe.id)}
                      disabled={!isMaster}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isLiberada
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-white/5 text-gray-500 border border-white/10'
                      }`}
                    >
                      {isLiberada ? 'Liberada' : 'Bloqueada'}
                    </button>
                  </div>
                );
              })}
              {classesEspeciais.length === 0 && <p className="text-xs text-gray-600 italic">Nenhuma classe especial no catálogo.</p>}
            </div>
          </div>
        )}
      </section>

      {/* SEÇÃO LIBERAÇÃO INDIVIDUAL */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserCog className="text-purple-400" size={20} />
          <h3 className="text-lg font-bold text-white">Liberação Individual</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Libere uma raça ou classe especial só pra um jogador específico - pra recompensas e transformações que não valem pra mesa inteira. Some com o que já está liberado pra campanha acima.
        </p>

        {jogadoresDaCampanha.length === 0 ? (
          <p className="text-xs text-gray-600 italic">Nenhum jogador na campanha ainda.</p>
        ) : (
          <>
            <Select
              value={membroSelecionado}
              onChange={setMembroSelecionado}
              placeholder="Selecione um jogador"
              options={jogadoresDaCampanha.map((membro) => ({ value: membro.id, label: membro.nome_exibicao }))}
              className="w-full md:w-72 mb-4"
            />

            {!membroSelecionado ? (
              <p className="text-xs text-gray-600 italic">Selecione um jogador acima pra liberar raças/classes só pra ele.</p>
            ) : !catalogo ? (
              <div className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Carregando catálogo...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Raças ({(racasLiberadasMembros[membroSelecionado] || []).length}/{racasEspeciais.length} liberadas)
                  </h4>
                  {racasEspeciais.map((raca: any) => {
                    const isLiberada = (racasLiberadasMembros[membroSelecionado] || []).includes(raca.id);
                    return (
                      <div key={raca.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <span className="text-white text-sm font-medium">{raca.titulo}</span>
                        <button
                          onClick={() => handleToggleRacaMembro(membroSelecionado, raca.id)}
                          disabled={!isMaster}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            isLiberada
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-white/5 text-gray-500 border border-white/10'
                          }`}
                        >
                          {isLiberada ? 'Liberada' : 'Bloqueada'}
                        </button>
                      </div>
                    );
                  })}
                  {racasEspeciais.length === 0 && <p className="text-xs text-gray-600 italic">Nenhuma raça especial no catálogo.</p>}
                </div>

                <div className="bg-black/40 rounded-2xl border border-white/5 p-4 max-h-[280px] overflow-y-auto custom-scrollbar flex flex-col gap-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Classes ({(classesLiberadasMembros[membroSelecionado] || []).length}/{classesEspeciais.length} liberadas)
                  </h4>
                  {classesEspeciais.map((classe: any) => {
                    const isLiberada = (classesLiberadasMembros[membroSelecionado] || []).includes(classe.id);
                    return (
                      <div key={classe.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <span className="text-white text-sm font-medium">{classe.titulo}</span>
                        <button
                          onClick={() => handleToggleClasseMembro(membroSelecionado, classe.id)}
                          disabled={!isMaster}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            isLiberada
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-white/5 text-gray-500 border border-white/10'
                          }`}
                        >
                          {isLiberada ? 'Liberada' : 'Bloqueada'}
                        </button>
                      </div>
                    );
                  })}
                  {classesEspeciais.length === 0 && <p className="text-xs text-gray-600 italic">Nenhuma classe especial no catálogo.</p>}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* SEÇÃO LOJA */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="text-[#c7a44c]" size={20} />
          <h3 className="text-lg font-bold text-white">Mercado e Economia</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Selecione quais locais da loja estarão visíveis e liberados para os jogadores acessarem.</p>

        <div className="flex flex-wrap gap-2">
          {todosOsLocais.map(local => {
            const isHidden = locaisOcultos.includes(local.id);
            return (
              <button
                key={local.id}
                onClick={() => handleToggleLocal(local.id)}
                disabled={!isMaster}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 uppercase tracking-widest disabled:cursor-not-allowed ${
                  isHidden
                    ? 'bg-red-500/20 border-red-500/50 text-red-400 opacity-70'
                    : 'bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50'
                }`}
              >
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                {local.nome}
              </button>
            );
          })}
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <div className="pt-4 border-t border-white/10 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !isMaster}
          className="bg-primary text-white font-bold tracking-widest uppercase text-xs px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(var(--color-primary),0.3)] hover:bg-primary-light transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

    </div>
  );
};
