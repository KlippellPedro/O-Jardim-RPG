import { useState, useEffect } from 'react';
import { HelpCircle, X, Dices } from 'lucide-react';
import { SectionTitle, LabeledInput, LabeledModalSelect, ResourceBar } from '../components/SharedFichaComponents';
import { ModalInfoFicha } from '../components/ModalInfoFicha';
import { carregarCatalogo } from '../../../services/catalogoService';
import { ICatalogo } from '../../../types/catalogo';
import { ATRIBUTOS, ATRIBUTO_VALOR_MINIMO, ATRIBUTO_VALOR_MAXIMO, calcularDerivados, modificador, TABELA_XP, nivelPorXp, TAtributo } from '../../../services/calculoService';
import { limparEscolhasPrincipaisRaciais, obterGruposEscolhaRacial } from '../../../services/racaService';
import { registrosApi } from '../../../services/registrosApi';
import { useAuthStore } from '../../../store/useAuthStore';
import { ARVORES, arvoreVisivel, filtrarPorArvore, filtrarPorLiberacao } from '../../../data/arvoresCatalog';
import { ProgressaoClasses } from '../components/ProgressaoClasses';

const NOMES_ATRIBUTOS: Record<TAtributo, string> = {
  forca: 'Força',
  destreza: 'Destreza',
  constituicao: 'Constituição',
  inteligencia: 'Inteligência',
  sabedoria: 'Sabedoria',
  carisma: 'Carisma',
  fluxo: 'Fluxo',
};

interface IClasseSlot {
  classeId: string;
  nivel: number;
}

export const AbaFicha = ({ character, onUpdate }: { character: any, onUpdate: any }) => {
  const f = character.ficha || {};
  const status = f.status || {};
  const maxVida = character.derivados?.vida || 10;
  const maxMana = character.derivados?.mana || 10;
  const maxSanidade = status.sanidadeMaxima || 100;
  const maxCansaco = status.cansacoMaximo || 6;

  const vAtual = status.vidaAtual ?? maxVida;
  const mAtual = status.manaAtual ?? maxMana;
  const sAtual = status.sanidadeAtual ?? maxSanidade;
  const cAtual = status.cansacoAtual ?? 0;

  const [activeModal, setActiveModal] = useState<any>(null);
  const [catalogo, setCatalogo] = useState<ICatalogo | null>(null);

  useEffect(() => {
    carregarCatalogo().then(setCatalogo);
  }, []);

  const handleStatus = (field: string, change: number, max: number) => {
    const current = status[field] ?? (field === 'cansacoAtual' ? 0 : max);
    let next = current + change;
    if (next > max) next = max;
    if (next < 0) next = 0;
    onUpdate(['ficha', 'status', field], next);
  };

  const attrs = f.atributosFinais || character.atributosFinais || { forca:10, destreza:10, constituicao:10, inteligencia:10, sabedoria:10, carisma:10, fluxo:10 };

  // BUG-FIX: valores dos atributos eram só leitura; agora dá pra ajustar
  // direto na ficha digitando o número (clamp 1-20).
  const handleAttrChange = (attr: TAtributo, novoValor: number) => {
    const novo = Math.max(ATRIBUTO_VALOR_MINIMO, Math.min(ATRIBUTO_VALOR_MAXIMO, novoValor));
    onUpdate(['ficha', 'atributosFinais', attr], novo);
  };

  // BUG-FIX: "Rolar Teste" mostrava só Força/Destreza com bônus fixo (+2/+0)
  // que não refletia os atributos reais. Agora lista os 7 atributos com o
  // modificador calculado ao vivo e rola de verdade no servidor.
  const campanhaAtiva = useAuthStore((s) => s.campanhaAtiva);
  const usuario = useAuthStore((s) => s.usuario);
  const isMestre = usuario?.papel_plataforma === 'admin' || usuario?.papel_plataforma === 'criador'
    || campanhaAtiva?.papel === 'mestre' || campanhaAtiva?.papel === 'assistente';
  const configCampanha = campanhaAtiva?.configuracoes || {};
  const arvoresDisponiveis = ARVORES.filter(a => arvoreVisivel(a.id, configCampanha, isMestre));
  const [atributoTeste, setAtributoTeste] = useState<TAtributo>('forca');
  const [rolandoTeste, setRolandoTeste] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{ resultado: number | null; detalhes: any } | null>(null);
  const modTeste = modificador(attrs[atributoTeste]);

  const handleRolarTeste = async () => {
    if (!campanhaAtiva?.id) {
      alert('Nenhuma campanha ativa. Selecione uma campanha para rolar dados.');
      return;
    }
    setRolandoTeste(true);
    try {
      const { registro } = await registrosApi.rolar({
        campanhaId: campanhaAtiva.id,
        personagemId: character.id,
        titulo: `Teste de ${NOMES_ATRIBUTOS[atributoTeste]}`,
        bonus: modTeste,
      });
      setResultadoTeste({ resultado: registro.resultado, detalhes: registro.detalhes });
    } catch (e: any) {
      alert(e?.message || 'Falha ao rolar o teste.');
    } finally {
      setRolandoTeste(false);
    }
  };

  // BUG-FIX: barra de XP era decorativa (0/1000 fixo, botões sem ação).
  // Usa a mesma tabela de XP do Wizard (TABELA_XP/nivelPorXp).
  const xpAtual = Number(f.xp) || 0;
  const nivelAtual = character.nivel || 1;
  const xpNivelAtual = TABELA_XP[nivelAtual - 1] ?? 0;
  const xpProximoNivel = TABELA_XP[nivelAtual] ?? null;
  const percentXp = xpProximoNivel
    ? Math.min(100, Math.max(0, ((xpAtual - xpNivelAtual) / (xpProximoNivel - xpNivelAtual)) * 100))
    : 100;
  const podeSubirNivel = xpProximoNivel !== null && xpAtual >= xpProximoNivel;

  const handleXp = (delta: number) => {
    const novo = Math.max(0, xpAtual + delta);
    onUpdate(['ficha', 'xp'], novo);
  };

  const handleSubirNivel = (escolha: { tipo: 'existente' | 'nova', index?: number, novaClasseId?: string }) => {
    const novoNivelXp = nivelPorXp(xpAtual);
    const nivelTotalAtual = classes.reduce((sum, c) => sum + (Number(c.nivel) || 1), 0);
    const niveisParaSubir = novoNivelXp - nivelTotalAtual;

    if (niveisParaSubir <= 0) {
      setActiveModal(null);
      return;
    }

    let next = [...classes];
    
    if (escolha.tipo === 'existente' && escolha.index !== undefined) {
      next[escolha.index] = { ...next[escolha.index], nivel: next[escolha.index].nivel + 1 };
    } else if (escolha.tipo === 'nova' && escolha.novaClasseId) {
      next.push({ classeId: escolha.novaClasseId, nivel: 1 });
    }

    salvarClasses(next);
    setActiveModal(null);
  };
  
  const [xpInput, setXpInput] = useState<string | undefined>();

  const handleXpBlur = (val: string) => {
    if (!val.trim()) {
      setXpInput(undefined);
      return;
    }
    
    let change = 0;
    if (val.startsWith('+')) {
      change = parseInt(val.substring(1)) || 0;
      handleXp(change);
    } else if (val.startsWith('-')) {
      change = parseInt(val.substring(1)) || 0;
      handleXp(-change);
    } else {
      const absVal = parseInt(val);
      if (!isNaN(absVal)) {
        if (absVal > xpAtual) handleXp(absVal - xpAtual);
        else if (absVal < xpAtual) handleXp(-(xpAtual - absVal));
      }
    }
    setXpInput(undefined);
  };



  // BUG-FIX: só existia 1 "classe" fixa e nem o nível nem o "+ Adicionar
  // Classe" funcionavam. Agora é uma lista de verdade (ficha.classes),
  // mantendo ficha.classeId em dia com a primeira classe (compatibilidade
  // com FichaList.tsx, que ainda lê esse campo pro card do personagem).
  const classes: IClasseSlot[] = f.classes?.length
    ? f.classes
    : (f.classeId ? [{ classeId: f.classeId, nivel: character.nivel || 1 }] : []);

  // Raça/classe exclusivas de outra Árvore, ou especiais não liberadas pelo
  // mestre, não aparecem como opção: mestre/assistente vê tudo, e a opção
  // já escolhida antes sempre continua na lista (senão o campo fica com um
  // id sem rótulo visível se o mestre revogar a liberação depois).
  const manterEscolhaAtual = <T extends { id: string }>(lista: T[], todas: T[], idAtual: string | undefined): T[] => {
    if (!idAtual || lista.some(item => item.id === idAtual)) return lista;
    const atual = todas.find(item => item.id === idAtual);
    return atual ? [...lista, atual] : lista;
  };

  const racasFiltradas = isMestre
    ? (catalogo?.racas || [])
    : manterEscolhaAtual(
        filtrarPorLiberacao(filtrarPorArvore(catalogo?.racas || [], f.arvoreId), configCampanha.racas_liberadas || []),
        catalogo?.racas || [],
        f.racaId,
      );
  const classesFiltradas = isMestre
    ? (catalogo?.classes || [])
    : filtrarPorLiberacao(filtrarPorArvore(catalogo?.classes || [], f.arvoreId), configCampanha.classes_liberadas || []);

  const racaAtual = catalogo?.racas.find(raca => raca.id === f.racaId) || null;
  const gruposEscolhaRacial = obterGruposEscolhaRacial(racaAtual);

  const salvarIdentidadeRacial = (novaRacaId: string, novaEscolhaRacial: Record<string, any>) => {
    const novaRaca = catalogo?.racas.find(raca => raca.id === novaRacaId) || null;
    const derivados = novaRaca
      ? calcularDerivados(attrs, novaRaca, character.nivel || 1, novaEscolhaRacial)
      : f.derivados;
    onUpdate(['ficha'], {
      ...f,
      racaId: novaRacaId,
      escolhaRacial: novaEscolhaRacial,
      derivados,
    });
  };

  const handleRacaChange = (novaRacaId: string) => {
    const escolhaLimpa = limparEscolhasPrincipaisRaciais(f.escolhaRacial);
    salvarIdentidadeRacial(novaRacaId, escolhaLimpa);
  };

  const handleEscolhaRacialChange = (campo: string, valor: string) => {
    salvarIdentidadeRacial(f.racaId, {
      ...(f.escolhaRacial || {}),
      [campo]: valor,
    });
  };

  // BUG-FIX: chamar onUpdate duas vezes seguidas aqui causava uma corrida:
  // a segunda chamada usava um "character" desatualizado (fechamento antigo
  // de handleUpdate em PersonagemSheet, que só se renova depois que a
  // primeira chamada resolve), e acabava sobrescrevendo ficha.classes com o
  // valor antigo. Uma única chamada elimina a corrida; classeId (usado só
  // como legenda no card da lista) é derivado de ficha.classes na leitura.
  const salvarClasses = (novaLista: IClasseSlot[]) => {
    onUpdate(['ficha', 'classes'], novaLista);
    const nivelTotal = novaLista.reduce((sum, c) => sum + (Number(c.nivel) || 1), 0) || 1;
    onUpdate(['ficha', 'nivel'], nivelTotal);
  };

  const nivelTotalClasses = classes.reduce((sum, c) => sum + (Number(c.nivel) || 1), 0) || 1;

  const handleAdicionarClasse = () => {
    salvarClasses([...classes, { classeId: '', nivel: 1 }]);
  };

  const handleRemoverClasse = (index: number) => {
    salvarClasses(classes.filter((_, i) => i !== index));
  };

  const handleClasseChange = (index: number, classeId: string) => {
    salvarClasses(classes.map((c, i) => (i === index ? { ...c, classeId } : c)));
  };

  const handleClasseNivelChange = (index: number, nivel: number) => {
    const nivelLimpo = Math.max(1, Math.trunc(nivel) || 1);
    salvarClasses(classes.map((c, i) => (i === index ? { ...c, nivel: nivelLimpo } : c)));
  };

  return (
    <div className="space-y-6">
      
      {/* LINHA 1: IDENTIDADE E CLASSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IDENTIDADE */}
        <div className="lg:col-span-2 bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
          <SectionTitle title="Identidade do Personagem" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabeledInput label="Nome do Personagem" value={character.nome} onChange={(v:any) => onUpdate(['nome'], v)} />
            <LabeledModalSelect
              label="Árvore"
              value={f.arvoreId}
              options={(isMestre ? ARVORES : arvoresDisponiveis).map(arvore => ({ value: arvore.id, label: arvore.nome }))}
              onChange={(v:any) => onUpdate(['ficha', 'arvoreId'], v)}
            />
            <LabeledModalSelect
              label="Raça"
              value={f.racaId}
              options={catalogo ? racasFiltradas.map(raca => ({ value: raca.id, label: raca.titulo })) : [{ value: '', label: 'Carregando...' }]}
              onChange={handleRacaChange}
            />

            {gruposEscolhaRacial.map(grupo => (
              <LabeledModalSelect
                key={grupo.campo}
                label={grupo.rotulo}
                value={f.escolhaRacial?.[grupo.campo]}
                options={grupo.opcoes.map(opcao => ({ value: opcao.id, label: opcao.titulo }))}
                onChange={(valor: string) => handleEscolhaRacialChange(grupo.campo, valor)}
              />
            ))}
            
            <LabeledInput label="Origem" value={f.origem} placeholder="Ex: Jornalista" onChange={(v:any) => onUpdate(['ficha', 'origem'], v)} />
            <LabeledInput label="Título" value={f.titulo} placeholder="Ex: O Assassino" onChange={(v:any) => onUpdate(['ficha', 'titulo'], v)} />
            <LabeledInput label="Nível Total" value={nivelTotalClasses} readOnly={true} type="number" />
            <LabeledInput label="Tamanho" value={f.tamanho} placeholder="Ex: Normal" onChange={(v:any) => onUpdate(['ficha', 'tamanho'], v)} />
          </div>
        </div>

        {/* CLASSE */}
        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
          <SectionTitle title="Classe" />
          <p className="text-xs text-gray-500 mb-4">{classes.length || 0} classe(s) · nível total {character.nivel}</p>
          <div className="flex flex-col gap-2 mb-4">
            {classes.map((classeSlot, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <LabeledModalSelect
                    label=""
                    value={classeSlot.classeId}
                    options={catalogo ? classesFiltradas.map(classe => ({ value: classe.id, label: classe.titulo })) : [{ value: '', label: 'Carregando...' }]}
                    onChange={(v: any) => handleClasseChange(index, v)}
                  />
                </div>
                <div className="w-20">
                  <input
                    type="number"
                    min={1}
                    value={classeSlot.nivel}
                    onChange={(e) => handleClasseNivelChange(index, parseInt(e.target.value) || 1)}
                    className="w-full bg-[#121118] border border-white/5 rounded-md px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 transition-colors text-center"
                  />
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => handleRemoverClasse(index)}
                    className="text-gray-600 hover:text-red-500 transition-colors"
                    title="Remover classe"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <p className="text-xs text-gray-600 italic">Nenhuma classe ainda.</p>
            )}
          </div>
          <button
            onClick={handleAdicionarClasse}
            className="w-full py-3 rounded-lg border border-yellow-600/30 text-yellow-600 text-xs font-bold uppercase tracking-widest hover:bg-yellow-600/10 transition-colors border-dashed"
          >
            + Adicionar Classe
          </button>
        </div>

      </div>

      {catalogo && <ProgressaoClasses classes={classes} catalogoClasses={catalogo.classes} />}

      {/* LINHA 2: ATRIBUTOS */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
        <SectionTitle title="Atributos" />
        <div className="flex flex-wrap justify-center gap-4">
          {ATRIBUTOS.map(attr => {
            const val = attrs[attr] ?? 10;
            const mod = modificador(val);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            return (
              <div key={attr} className="w-24 bg-[#121118] border border-white/5 rounded-xl flex flex-col items-center p-3 relative group hover:border-[#c7a44c]/30">
                <HelpCircle
                  size={14}
                  className="absolute top-2 right-2 text-[#c7a44c] opacity-50 cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => setActiveModal({
                    title: `ATRIBUTO: ${attr.toUpperCase()}`,
                    description: 'Atributos definem a capacidade natural básica do personagem. O modificador é calculado subtraindo 10 do valor e dividindo por 2, arredondado para baixo. Ele é a base de todas as rolagens.',
                    items: [
                      { label: 'Valor do Atributo', value: val },
                      { label: 'Cálculo', value: `floor((${val} - 10) / 2)` }
                    ],
                    total: { label: 'Modificador', value: modStr, color: mod >= 0 ? 'text-green-400' : 'text-red-400' }
                  })}
                />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{attr.substring(0,3)}</span>
                <input
                  type="number"
                  min={ATRIBUTO_VALOR_MINIMO}
                  max={ATRIBUTO_VALOR_MAXIMO}
                  value={val}
                  onChange={(e) => handleAttrChange(attr, parseInt(e.target.value) || 10)}
                  className="w-16 bg-transparent text-2xl font-serif text-white my-1 text-center focus:outline-none focus:bg-white/5 rounded"
                />
                <div className="w-full py-1 text-center bg-[#c7a44c]/10 border border-[#c7a44c]/20 rounded text-[#c7a44c] font-bold text-sm mb-2 mt-1">
                  {modStr}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LINHA 3: ROLAR TESTE */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
        <SectionTitle title="Rolar Teste" />
        <p className="text-xs text-gray-500 mb-4">d20 + modificador do atributo. O resultado é sorteado no servidor.</p>
        <div className="flex gap-4">
          <select
            value={atributoTeste}
            onChange={(e) => { setAtributoTeste(e.target.value as TAtributo); setResultadoTeste(null); }}
            className="flex-1 bg-[#121118] border border-white/5 rounded-md px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 appearance-none"
          >
            {ATRIBUTOS.map(attr => {
              const m = modificador(attrs[attr] ?? 10);
              return (
                <option key={attr} value={attr}>
                  {NOMES_ATRIBUTOS[attr]} ({m >= 0 ? `+${m}` : m})
                </option>
              );
            })}
          </select>
          <button
            onClick={handleRolarTeste}
            disabled={rolandoTeste}
            className="px-6 py-3 rounded-md border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/10 font-bold text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Dices size={16} /> {rolandoTeste ? 'Rolando...' : 'Rolar'}
          </button>
        </div>
        {resultadoTeste && (
          <div className="mt-4 bg-black/30 border border-[#c7a44c]/20 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">Resultado de {NOMES_ATRIBUTOS[atributoTeste]}</span>
            <span className="text-2xl font-bold text-[#c7a44c]">{resultadoTeste.resultado}</span>
          </div>
        )}
      </div>

      {/* LINHA 4: STATUS VITAIS */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
        <SectionTitle title="Status Vitais" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
          <ResourceBar label="Vida" color="vermelho" current={vAtual} max={maxVida} onAdd={(v:number)=>handleStatus('vidaAtual', v, maxVida)} onSub={(v:number)=>handleStatus('vidaAtual', -v, maxVida)} onHelpClick={() => setActiveModal({
            title: 'PONTOS DE VIDA',
            description: 'Representa a vitalidade e saúde física. Chegar a 0 significa cair morrendo.',
            items: [{ label: 'Vida Máxima (Base)', value: maxVida }]
          })} />
          <ResourceBar label="Mana" color="azul" current={mAtual} max={maxMana} onAdd={(v:number)=>handleStatus('manaAtual', v, maxMana)} onSub={(v:number)=>handleStatus('manaAtual', -v, maxMana)} onHelpClick={() => setActiveModal({
            title: 'PONTOS DE MANA',
            description: 'A energia arcana e espiritual. Usada para magias e habilidades especiais.',
            items: [{ label: 'Mana Máxima (Base)', value: maxMana }]
          })} />
          <ResourceBar label="Sanidade" color="roxo" current={sAtual} max={maxSanidade} onAdd={(v:number)=>handleStatus('sanidadeAtual', v, maxSanidade)} onSub={(v:number)=>handleStatus('sanidadeAtual', -v, maxSanidade)} onHelpClick={() => setActiveModal({
            title: 'PONTOS DE SANIDADE',
            description: 'A integridade mental do personagem. Ver horrores drena a sanidade.',
            items: [{ label: 'Sanidade Máxima (Base)', value: maxSanidade }]
          })} />
          <ResourceBar label="Cansaço" color="cinza" current={cAtual} max={maxCansaco} onAdd={(v:number)=>handleStatus('cansacoAtual', v, maxCansaco)} onSub={(v:number)=>handleStatus('cansacoAtual', -v, maxCansaco)} onHelpClick={() => setActiveModal({
            title: 'PONTOS DE CANSAÇO',
            description: 'O acúmulo de estresse físico. Funciona ao contrário: aumenta de 0 até o limite. Chegar ao limite causa exaustão extrema.',
            items: [{ label: 'Cansaço Máximo (Limite)', value: maxCansaco }]
          })} />
        </div>
      </div>

      {/* LINHA 5: COMBATE */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
        <SectionTitle title="Combate" />
        
        {/* Status Derivados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#121118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">Defesa</span>
              <HelpCircle size={14} className="text-[#c7a44c] cursor-pointer hover:opacity-100 opacity-50 transition-opacity" onClick={() => setActiveModal({
                title: 'DEFESA',
                description: 'A dificuldade para acertar ataques contra você. Baseia-se na agilidade e equipamentos.',
                items: [
                  { label: 'Defesa Natural', value: character.derivados?.defesaNatural || 10 },
                  { label: 'Armadura', value: '+ 0 (Não implementado)' }
                ],
                total: { label: 'Defesa Total', value: character.derivados?.defesaNatural || 10 }
              })} />
            </div>
            <input type="text" value={character.derivados?.defesaNatural || 10} className="w-full bg-black/50 border border-[#c7a44c]/30 rounded px-4 py-3 text-white font-bold mb-4" readOnly />
            <LabeledInput label="Armadura" value="0" onChange={()=>{}} />
            <div className="mt-2"><LabeledInput label="Penalidade da Defesa" value="0" onChange={()=>{}} /></div>
          </div>
          
          <div className="bg-[#121118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">Iniciativa</span>
              <HelpCircle size={14} className="text-[#c7a44c] cursor-pointer hover:opacity-100 opacity-50 transition-opacity" onClick={() => setActiveModal({
                title: 'INICIATIVA',
                description: 'Sua velocidade de reação. Determina quem age primeiro em combate.',
                items: [
                  { label: 'Iniciativa Base', value: character.derivados?.iniciativa || 10 }
                ],
                total: { label: 'Iniciativa Final', value: character.derivados?.iniciativa || 10 }
              })} />
            </div>
            <input type="text" value={character.derivados?.iniciativa || 10} className="w-full bg-black/50 border border-[#c7a44c]/30 rounded px-4 py-3 text-white font-bold mb-4" readOnly />
            <LabeledInput label="Bônus / Penalidade" value="0" onChange={()=>{}} />
          </div>

          <div className="bg-[#121118] border border-white/5 rounded-xl p-4">
            <div className="flex justify-between mb-4">
              <span className="text-xs font-bold uppercase text-gray-500">Movimento</span>
              <HelpCircle size={14} className="text-[#c7a44c] cursor-pointer hover:opacity-100 opacity-50 transition-opacity" onClick={() => setActiveModal({
                title: 'MOVIMENTO',
                description: 'Distância (em metros) que você pode se deslocar durante o combate.',
                items: [
                  { label: 'Deslocamento Base', value: `${character.derivados?.movimento || 9}m` }
                ],
                total: { label: 'Movimento Final', value: `${character.derivados?.movimento || 9}m` }
              })} />
            </div>
            <input type="text" value={`${character.derivados?.movimento || 9} m`} className="w-full bg-black/50 border border-[#c7a44c]/30 rounded px-4 py-3 text-white font-bold mb-4" readOnly />
            <LabeledInput label="Penalidade de Movimento" value="0" onChange={()=>{}} />
          </div>
        </div>

        <div className="w-full h-[1px] bg-white/5 mb-8 border-dashed"></div>

        {/* Textareas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Resistências</label>
            <textarea placeholder="Ex.: Fogo 5, Corte 3..." className="bg-[#121118] border border-white/5 rounded-md p-3 text-sm text-gray-300 min-h-[100px] resize-none focus:border-[#c7a44c]/50"></textarea>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Proficiências</label>
            <textarea placeholder="Ex.: Armas simples..." className="bg-[#121118] border border-white/5 rounded-md p-3 text-sm text-gray-300 min-h-[100px] resize-none focus:border-[#c7a44c]/50"></textarea>
          </div>
          <div className="flex flex-col gap-2 relative">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Condições Ativas</label>
            <div className="bg-[#121118] border border-white/5 rounded-md p-3 min-h-[100px] flex flex-col gap-2">
              {(f.condicoesAtivas || []).map((c: any, i: number) => (
                <div key={i} className="bg-black/50 border border-red-500/20 p-2 rounded flex justify-between items-start group">
                  <div>
                    <div className="text-red-400 font-bold text-xs uppercase">{c.nome}</div>
                    <div className="text-gray-400 text-xs mt-1">{c.descricao}</div>
                    <div className="text-gray-500 text-[10px] mt-1 italic">Afeta: {c.afeta}</div>
                  </div>
                  <button onClick={() => {
                    const next = [...(f.condicoesAtivas || [])];
                    next.splice(i, 1);
                    onUpdate(['ficha', 'condicoesAtivas'], next);
                  }} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setActiveModal({ isCondicaoModal: true })}
                className="w-full py-2 border border-dashed border-red-500/30 text-red-500/70 hover:bg-red-500/10 hover:text-red-400 rounded-md text-xs uppercase font-bold transition-colors mt-auto"
              >
                + Adicionar Condição
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 6: EXPERIÊNCIA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 mb-20">
        <SectionTitle title="Experiência" />
        <div className="flex items-center gap-4">
           <div className="flex gap-2">
              <button onClick={() => handleXp(-100)} disabled={xpAtual <= 0} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white disabled:opacity-30">-100</button>
              <button onClick={() => handleXp(-10)} disabled={xpAtual <= 0} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white disabled:opacity-30">-10</button>
           </div>
           <div className="flex-1 h-6 bg-[#050508] border border-white/10 rounded-lg relative overflow-hidden flex items-center justify-center group shadow-inner ring-1 ring-inset ring-white/5">
              {/* Verde estilo Minecraft com Gradiente e Glow */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#059669] to-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-500 ease-out" 
                style={{ width: `${percentXp}%` }} 
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
              </div>
              <div className="relative z-10 flex items-center text-white font-bold text-xs font-mono drop-shadow-md">
                <input 
                  type="text"
                  className="bg-transparent border-none outline-none text-right w-16 text-white font-bold placeholder-white/70 group-hover:bg-white/10 rounded transition-colors"
                  value={xpInput !== undefined ? xpInput : xpAtual}
                  onChange={(e) => setXpInput(e.target.value)}
                  onBlur={(e) => handleXpBlur(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                />
                <span className="mx-1">/</span>
                <span>{xpProximoNivel ?? xpAtual}</span>
              </div>
           </div>
           <div className="flex gap-2">
              <button onClick={() => handleXp(10)} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+10</button>
              <button onClick={() => handleXp(100)} className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono hover:text-white">+100</button>
           </div>
        </div>
        {podeSubirNivel && (
          <button
            onClick={() => setActiveModal({ isLevelUpModal: true })}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-[#c7a44c] to-yellow-600 text-black text-sm font-bold uppercase tracking-widest hover:scale-[1.01] transition-transform shadow-[0_0_20px_rgba(199,164,76,0.4)]"
          >
            ✧ Subir para o Nível {nivelPorXp(xpAtual)}
          </button>
        )}
      </div>

      {activeModal && !activeModal.isCondicaoModal && !activeModal.isLevelUpModal && (
        <ModalInfoFicha
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeModal.title}
          description={activeModal.description}
          items={activeModal.items}
          total={activeModal.total}
        />
      )}

      {activeModal && activeModal.isCondicaoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#0f0e15] border border-red-500/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-red-500 font-bold tracking-widest uppercase">Nova Condição</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const nome = (form.elements.namedItem('nome') as HTMLInputElement).value;
              const descricao = (form.elements.namedItem('descricao') as HTMLTextAreaElement).value;
              const afeta = (form.elements.namedItem('afeta') as HTMLInputElement).value;
              
              if (nome) {
                const next = [...(f.condicoesAtivas || []), { nome, descricao, afeta }];
                onUpdate(['ficha', 'condicoesAtivas'], next);
                setActiveModal(null);
              }
            }} className="flex flex-col gap-4">
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Nome da Condição</label>
                <input name="nome" type="text" required placeholder="Ex: Perna Ferida" className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Descrição</label>
                <textarea name="descricao" rows={3} placeholder="Ex: O personagem perdeu muito sangue e não consegue correr..." className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 resize-none"></textarea>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Penalidade / Afeta o quê?</label>
                <input name="afeta" type="text" placeholder="Ex: Destreza -2, Movimento reduzido pela metade" className="bg-[#121118] border border-white/5 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50" />
              </div>

              <button type="submit" className="mt-4 w-full py-3 bg-red-500/20 text-red-400 border border-red-500/50 font-bold uppercase tracking-widest rounded-lg hover:bg-red-500/30 transition-colors">
                Adicionar Condição
              </button>
            </form>
          </div>
        </div>
      )}

      {activeModal && activeModal.isLevelUpModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setActiveModal(null)}
        >
          <div 
            className="bg-[#0f0e15] border border-[#c7a44c]/50 rounded-2xl p-6 w-full max-w-md shadow-[0_0_50px_rgba(199,164,76,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[#c7a44c] font-bold tracking-widest uppercase">Evolução de Nível</h3>
              <button onClick={() => setActiveModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-300 text-sm mb-6">
              Você atingiu experiência suficiente para o nível {nivelPorXp(xpAtual)}! Como deseja aplicar este novo nível?
            </p>

            <div className="flex flex-col gap-6">
              {classes.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Aprimorar Classe Existente</h4>
                  <div className="flex flex-col gap-2">
                    {classes.map((c, i) => {
                      const classeObj = catalogo?.classes.find(cl => cl.id === c.classeId);
                      return (
                        <button
                          key={i}
                          onClick={() => handleSubirNivel({ tipo: 'existente', index: i })}
                          className="flex justify-between items-center w-full p-3 rounded-lg border border-white/10 hover:border-[#c7a44c]/50 hover:bg-[#c7a44c]/10 transition-colors text-left"
                        >
                          <span className="text-white font-bold">{classeObj?.titulo || 'Classe'}</span>
                          <span className="text-xs text-gray-400">Nível {c.nivel} ➔ <span className="text-[#c7a44c] font-bold">{c.nivel + 1}</span></span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-3">Multiclasse (Adquirir Nova Classe)</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const novaClasseId = (form.elements.namedItem('novaClasseId') as HTMLSelectElement).value;
                  if (novaClasseId) {
                    handleSubirNivel({ tipo: 'nova', novaClasseId });
                  }
                }} className="flex gap-2">
                  <select
                    name="novaClasseId"
                    required
                    className="flex-1 bg-[#121118] border border-white/10 rounded-lg px-3 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 appearance-none"
                  >
                    <option value="">Selecione uma classe...</option>
                    {classesFiltradas
                      .filter(cl => !classes.some(c => c.classeId === cl.id)) // Oculta as que já possui
                      .map(cl => (
                        <option key={cl.id} value={cl.id}>{cl.titulo}</option>
                    ))}
                  </select>
                  <button type="submit" className="px-4 py-3 bg-[#15141b] text-[#c7a44c] border border-[#c7a44c]/30 font-bold uppercase tracking-widest rounded-lg hover:bg-[#c7a44c]/20 transition-colors">
                    Adicionar
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
