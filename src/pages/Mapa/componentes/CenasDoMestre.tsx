import { useEffect, useRef, useState } from 'react';
import { Plus, Radio, Settings2, Trash2, X } from 'lucide-react';
import type { ICena, ICenaPayload, IResumoCena } from '../../../services/mapaApi';
import type { IGrade, TipoGrade } from '../motor/geometria';
import { MOLDURAS } from '../motor/molduras';
import { ComDica } from './BotaoFerramenta';

interface FaixaProps {
  cenas: IResumoCena[];
  vendo: string | null;
  onVer: (id: string) => void;
  onAtivar: (id: string) => void;
  onNova: () => void;
  onConfigurar: () => void;
}

/** Faixa de baixo: as cenas da campanha. Um clique mostra para o Mestre; "Pôr na mesa" troca a dos jogadores. */
export const FaixaCenas = ({ cenas, vendo, onVer, onAtivar, onNova, onConfigurar }: FaixaProps) => (
  <nav className="mapa-faixa" aria-label="Cenas">
    {cenas.map((cena) => (
      <div key={cena.id} className={`mapa-faixa-cena${cena.id === vendo ? ' vendo' : ''}${cena.ativa ? ' ativa' : ''}`}>
        <ComDica lado="cima" dica={cena.ativa ? 'Os jogadores estão vendo esta cena' : 'Só você está vendo'}>
          <button type="button" onClick={() => onVer(cena.id)}>
            {cena.ativa && <Radio size={12} />} {cena.nome}
          </button>
        </ComDica>
        {cena.id === vendo && !cena.ativa && (
          <button type="button" className="mapa-faixa-ativar" onClick={() => onAtivar(cena.id)}>Pôr na mesa</button>
        )}
      </div>
    ))}
    <button type="button" className="mapa-faixa-nova" onClick={onNova}><Plus size={14} /> Cena</button>
    {vendo && <button type="button" className="mapa-icone" aria-label="Configurar a cena" onClick={onConfigurar}><Settings2 size={16} /></button>}
  </nav>
);

interface ConfigProps {
  cena: ICena;
  molduraMesa: string | null;
  onMolduraMesa: (id: string | null) => void;
  onSalvar: (dados: ICenaPayload) => void;
  onApagar: () => void;
  onFechar: () => void;
}

const TIPOS_GRADE: Array<{ id: TipoGrade; rotulo: string }> = [
  { id: 'quadrada', rotulo: 'Quadrada' },
  { id: 'hex', rotulo: 'Hexagonal' },
  { id: 'nenhuma', rotulo: 'Sem grade' },
];

/** Ajustes da cena. A grade se calibra mexendo nos números até casar com a do desenho. */
export const ConfigCena = ({ cena, molduraMesa, onMolduraMesa, onSalvar, onApagar, onFechar }: ConfigProps) => {
  const [nome, setNome] = useState(cena.nome);
  const [grade, setGrade] = useState<IGrade>(cena.grade);
  const espera = useRef<number | null>(null);
  const pendente = useRef<Partial<IGrade>>({});

  useEffect(() => {
    setNome(cena.nome);
    setGrade(cena.grade);
  }, [cena.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrastar o controle manda um pedido só, com tudo o que mudou, quando a mão para.
  const mudarGrade = (parcial: Partial<IGrade>) => {
    setGrade((atual) => ({ ...atual, ...parcial }));
    pendente.current = { ...pendente.current, ...parcial };
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      const mudancas = pendente.current;
      pendente.current = {};
      onSalvar({ grade: mudancas });
    }, 350);
  };

  return (
    <section className="mapa-config" aria-label="Configurar a cena">
      <header>
        <strong>Cena</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>
      <label className="mapa-menu-linha">
        Nome
        <input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} onBlur={() => nome.trim() && nome !== cena.nome && onSalvar({ nome: nome.trim() })} />
      </label>
      <label className="mapa-menu-linha">
        Grade
        <select value={grade.tipo} onChange={(e) => mudarGrade({ tipo: e.target.value as TipoGrade })}>
          {TIPOS_GRADE.map((t) => <option key={t.id} value={t.id}>{t.rotulo}</option>)}
        </select>
      </label>
      {grade.tipo !== 'nenhuma' && (
        <>
          <label className="mapa-menu-linha">
            Tamanho da casa <span>{Math.round(grade.tamanho)} px</span>
            <input type="range" min={20} max={400} step={0.5} value={grade.tamanho} onChange={(e) => mudarGrade({ tamanho: Number(e.target.value) })} />
          </label>
          <label className="mapa-menu-linha">
            Deslocar na horizontal <span>{Math.round(grade.x)} px</span>
            <input type="range" min={-200} max={200} step={0.5} value={grade.x} onChange={(e) => mudarGrade({ x: Number(e.target.value) })} />
          </label>
          <label className="mapa-menu-linha">
            Deslocar na vertical <span>{Math.round(grade.y)} px</span>
            <input type="range" min={-200} max={200} step={0.5} value={grade.y} onChange={(e) => mudarGrade({ y: Number(e.target.value) })} />
          </label>
          <label className="mapa-menu-linha">
            Visibilidade da grade <span>{Math.round(grade.opacidade * 100)}%</span>
            <input type="range" min={0} max={1} step={0.02} value={grade.opacidade} onChange={(e) => mudarGrade({ opacidade: Number(e.target.value) })} />
          </label>
          <label className="mapa-menu-linha">
            Cor
            <input type="color" value={grade.cor} onChange={(e) => mudarGrade({ cor: e.target.value })} />
          </label>
          <label className="mapa-menu-linha">
            Metros por casa
            <input type="number" min={0.1} max={100} step={0.5} value={grade.metros} onChange={(e) => mudarGrade({ metros: Number(e.target.value) || 1.5 })} />
          </label>
        </>
      )}
      <label className="mapa-menu-linha">
        <span>
          <input type="checkbox" checked={cena.livre} onChange={(e) => onSalvar({ livre: e.target.checked })} /> Jogadores movem qualquer token que veem
        </span>
      </label>
      <label className="mapa-menu-linha">
        Moldura da mesa (vale para todas as cenas)
        <select value={molduraMesa ?? ''} onChange={(e) => onMolduraMesa(e.target.value || null)}>
          <option value="">Cada um escolhe a sua</option>
          {MOLDURAS.map((m) => <option key={m.id} value={m.id}>{m.rotulo}</option>)}
        </select>
      </label>
      <div className="mapa-menu-botoes">
        {cena.mapa && <button type="button" className="mapa-botao" onClick={() => onSalvar({ sem_mapa: true })}>Tirar a imagem do mapa</button>}
        <button type="button" className="mapa-botao perigo" onClick={onApagar}><Trash2 size={14} /> Apagar cena</button>
      </div>
    </section>
  );
};
