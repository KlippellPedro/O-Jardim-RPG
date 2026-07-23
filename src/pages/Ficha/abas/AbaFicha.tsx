import { useState, useEffect } from 'react';
import { HelpCircle, X, Dices } from 'lucide-react';
import { SectionTitle, LabeledInput, LabeledSelect, ResourceBar } from '../components/SharedFichaComponents';
import { ModalInfoFicha } from '../components/ModalInfoFicha';
import { carregarCatalogo } from '../../../services/catalogoService';
import { ICatalogo } from '../../../types/catalogo';

const ARVORES = [
  { id: 'genese', nome: 'Gênese' },
  { id: 'aurora', nome: 'Aurora' },
  { id: 'crepusculo', nome: 'Crepúsculo' },
  { id: 'abismo', nome: 'Abismo' },
  { id: 'aletheia', nome: 'Alétheia' },
  { id: 'anima', nome: 'Anima' },
];

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

  return (
    <div className="space-y-6">
      
      {/* LINHA 1: IDENTIDADE E CLASSE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IDENTIDADE */}
        <div className="lg:col-span-2 bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
          <SectionTitle title="Identidade do Personagem" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LabeledInput label="Nome do Personagem" value={character.nome} onChange={(v:any) => onUpdate(['nome'], v)} />
            <LabeledSelect
              label="Árvore"
              value={f.arvoreId}
              options={ARVORES.map(arvore => ({ value: arvore.id, label: arvore.nome }))}
              onChange={(v:any) => onUpdate(['ficha', 'arvoreId'], v)}
            />
            <LabeledSelect
              label="Raça"
              value={f.racaId}
              options={catalogo ? catalogo.racas.map(raca => ({ value: raca.id, label: raca.titulo })) : [{ value: '', label: 'Carregando...' }]}
              onChange={(v:any) => onUpdate(['ficha', 'racaId'], v)}
            />
            
            <LabeledInput label="Origem" value={f.origem} placeholder="Ex: Jornalista" onChange={(v:any) => onUpdate(['ficha', 'origem'], v)} />
            <LabeledInput label="Título" value={f.titulo} placeholder="Ex: O Assassino" onChange={(v:any) => onUpdate(['ficha', 'titulo'], v)} />
            <LabeledInput label="Nível" value={character.nivel} onChange={(v:any) => onUpdate(['nivel'], parseInt(v)||1)} />
            <LabeledInput label="Tamanho" value={f.tamanho} placeholder="Ex: Normal" onChange={(v:any) => onUpdate(['ficha', 'tamanho'], v)} />
          </div>
        </div>

        {/* CLASSE */}
        <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
          <SectionTitle title="Classe" />
          <p className="text-xs text-gray-500 mb-4">{f.classes?.length || 1} classe · nível total {character.nivel}</p>
          <div className="flex gap-2 mb-4">
             <div className="flex-1">
               <LabeledSelect
                 label=""
                 value={f.classeId}
                 options={catalogo ? catalogo.classes.map(classe => ({ value: classe.id, label: classe.titulo })) : [{ value: '', label: 'Carregando...' }]}
                 onChange={(v:any) => onUpdate(['ficha', 'classeId'], v)}
               />
             </div>
             <div className="w-20">
               <LabeledInput label="Nível" value={character.nivel} onChange={(_v: any) => {}} />
             </div>
             <div className="flex items-end pb-2">
               <button className="text-gray-600 hover:text-red-500"><X size={16}/></button>
             </div>
          </div>
          <button className="w-full py-3 rounded-lg border border-yellow-600/30 text-yellow-600 text-xs font-bold uppercase tracking-widest hover:bg-yellow-600/10 transition-colors border-dashed">
            + Adicionar Classe
          </button>
        </div>

      </div>

      {/* LINHA 2: ATRIBUTOS */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6">
        <SectionTitle title="Atributos" />
        <div className="flex flex-wrap justify-center gap-4">
          {['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma', 'fluxo'].map(attr => {
            const val = attrs[attr];
            const mod = Math.floor((val - 10) / 2);
            const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
            return (
              <div key={attr} className="w-20 bg-[#121118] border border-white/5 rounded-xl flex flex-col items-center p-3 relative group hover:border-[#c7a44c]/30">
                <HelpCircle 
                  size={14} 
                  className="absolute top-2 right-2 text-[#c7a44c] opacity-50 cursor-pointer hover:opacity-100 transition-opacity" 
                  onClick={() => setActiveModal({
                    title: `ATRIBUTO — ${attr.toUpperCase()}`,
                    description: 'Atributos definem a capacidade natural básica do personagem. O modificador é calculado subtraindo 10 do valor e dividindo por 2, arredondado para baixo. Ele é a base de todas as rolagens.',
                    items: [
                      { label: 'Valor do Atributo', value: val },
                      { label: 'Cálculo', value: `floor((${val} - 10) / 2)` }
                    ],
                    total: { label: 'Modificador', value: modStr, color: mod >= 0 ? 'text-green-400' : 'text-red-400' }
                  })}
                />
                <span className="text-[10px] font-bold text-gray-500 uppercase">{attr.substring(0,3)}</span>
                <span className="text-2xl font-serif text-white my-1">{val}</span>
                <div className="w-full py-1 text-center bg-[#c7a44c]/10 border border-[#c7a44c]/20 rounded text-[#c7a44c] font-bold text-sm">
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
        <p className="text-xs text-gray-500 mb-4">d20 + modificador do atributo. O resultado cai no log da sessão ao vivo.</p>
        <div className="flex gap-4">
          <select className="flex-1 bg-[#121118] border border-white/5 rounded-md px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-[#c7a44c]/50 appearance-none">
            <option>Força (+2)</option>
            <option>Destreza (+0)</option>
          </select>
          <button className="px-6 py-3 rounded-md border border-[#c7a44c]/30 text-[#c7a44c] hover:bg-[#c7a44c]/10 font-bold text-sm flex items-center gap-2">
            <Dices size={16} /> Rolar
          </button>
        </div>
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
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Condições Ativas</label>
            <textarea placeholder="Ex.: Envenenado..." className="bg-[#121118] border border-white/5 rounded-md p-3 text-sm text-gray-300 min-h-[100px] resize-none focus:border-[#c7a44c]/50"></textarea>
          </div>
        </div>
      </div>

      {/* LINHA 6: EXPERIÊNCIA */}
      <div className="bg-[#0f0e15] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 mb-20">
        <SectionTitle title="Experiência" />
        <div className="flex items-center gap-4">
           <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono">-100</button>
              <button className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono">-10</button>
           </div>
           <div className="flex-1 h-6 bg-[#0a090d] border border-white/5 rounded relative flex items-center justify-center">
              <span className="relative z-10 text-white font-bold text-xs font-mono opacity-50">0 / 1000</span>
           </div>
           <div className="flex gap-2">
              <button className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono">+10</button>
              <button className="px-3 py-1.5 rounded bg-[#15141b] border border-white/5 text-gray-400 text-xs font-mono">+100</button>
           </div>
        </div>
      </div>

      {activeModal && (
        <ModalInfoFicha
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title={activeModal.title}
          description={activeModal.description}
          items={activeModal.items}
          total={activeModal.total}
        />
      )}

    </div>
  );
};
