import { useEffect, useState } from 'react';
import { Plus, Radio, Settings2, Trash2, X } from 'lucide-react';
import type { ICena, ICenaPayload, IResumoCena } from '../../../services/mapaApi';
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

/** Ajustes da cena. A grade (formato, linha, medida) mora no painel Grade da barra de ferramentas. */
export const ConfigCena = ({ cena, molduraMesa, onMolduraMesa, onSalvar, onApagar, onFechar }: ConfigProps) => {
  const [nome, setNome] = useState(cena.nome);

  useEffect(() => {
    setNome(cena.nome);
  }, [cena.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <p className="mapa-dica">O formato da grade, a linha e a medida da régua estão no botão Grade da barra de ferramentas.</p>
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
