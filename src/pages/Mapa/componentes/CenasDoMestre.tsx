import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Radio, Settings2, Trash2, X } from 'lucide-react';
import type { ICena, ICenaPayload, IResumoCena } from '../../../services/mapaApi';
import { MOLDURAS } from '../motor/molduras';

interface SeletorProps {
  cenas: IResumoCena[];
  vendo: string | null;
  /** O nome da cena que o Mestre está vendo (ou "Mapa" quando não há cena). */
  titulo: string;
  onVer: (id: string) => void;
  onAtivar: (id: string) => void;
  onNova: () => void;
  onConfigurar: () => void;
}

/**
 * As cenas da campanha, no topo: o nome da cena aberta é um botão que abre a lista. Um clique numa cena mostra
 * para o Mestre; "Pôr na mesa" troca a cena dos jogadores. Antes era uma faixa embaixo, que tomava altura da tela.
 * A lista é `fixed` para não ser cortada pelo topo do celular, que rola de lado.
 */
export const SeletorDeCenas = ({ cenas, vendo, titulo, onVer, onAtivar, onNova, onConfigurar }: SeletorProps) => {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState({ top: 54, left: 12 });
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (evento: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      setAberto(false);
    };
    document.addEventListener('pointerdown', fora, true);
    document.addEventListener('keydown', tecla, true);
    return () => {
      document.removeEventListener('pointerdown', fora, true);
      document.removeEventListener('keydown', tecla, true);
    };
  }, [aberto]);

  const alternar = () => {
    if (!aberto && botao.current) {
      const caixa = botao.current.getBoundingClientRect();
      setPosicao({ top: caixa.bottom + 8, left: Math.max(12, Math.min(caixa.left, window.innerWidth - 332)) });
    }
    setAberto((v) => !v);
  };
  const e = (acao: () => void) => () => {
    setAberto(false);
    acao();
  };

  return (
    <div className="mapa-cenas" ref={raiz}>
      <button ref={botao} type="button" className="mapa-cenas-botao" aria-haspopup="menu" aria-expanded={aberto} aria-label={`Cenas: ${titulo}. Trocar, criar ou configurar`} onClick={alternar}>
        <strong>{titulo}</strong>
        <ChevronDown size={15} />
      </button>
      {aberto && (
        <div className="mapa-cenas-menu" role="menu" aria-label="Cenas" style={{ top: posicao.top, left: posicao.left }}>
          {cenas.map((cena) => (
            <div key={cena.id} className={`mapa-cenas-linha${cena.id === vendo ? ' vendo' : ''}${cena.ativa ? ' ativa' : ''}`}>
              <button type="button" role="menuitem" title={cena.ativa ? 'Os jogadores estão vendo esta cena' : 'Só você vê quando abrir'} onClick={e(() => onVer(cena.id))}>
                {cena.ativa ? <Radio size={13} /> : <span style={{ width: 13 }} />}
                <span>{cena.nome}</span>
              </button>
              {cena.ativa ? <span className="selo ativo">Na mesa</span> : (
                <button type="button" className="mapa-cenas-ativar" title="Os jogadores passam a ver esta cena" onClick={e(() => onAtivar(cena.id))}>Pôr na mesa</button>
              )}
            </div>
          ))}
          <hr />
          <button type="button" role="menuitem" className="mapa-cenas-acao" onClick={e(onNova)}><Plus size={15} /> Nova cena</button>
          {vendo && <button type="button" role="menuitem" className="mapa-cenas-acao" onClick={e(onConfigurar)}><Settings2 size={15} /> Configurar esta cena</button>}
        </div>
      )}
    </div>
  );
};

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
