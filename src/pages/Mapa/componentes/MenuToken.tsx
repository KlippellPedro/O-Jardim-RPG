import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Trash2, X } from 'lucide-react';
import type { ITokenMapa, LadoToken, ParaQuem, TipoBarra, ITokenEdicao } from '../../../services/mapaApi';
import { SeletorDeMoldura } from '../oficina/OficinaGaveta';
import type { Enquadramento } from '../motor/molduras';

interface Props {
  token: ITokenMapa;
  gestor: boolean;
  /** O Mestre travou uma moldura para todos: a escolha de cada um fica guardada, mas não aparece. */
  molduraMesa: string | null;
  onEditar: (dados: ITokenEdicao) => void;
  onMoldura: (id: string | null) => void;
  onEnquadramento: (enquadramento: Enquadramento) => void;
  onRemover: () => void;
  onFechar: () => void;
}

const BARRAS: Array<{ id: TipoBarra; rotulo: string }> = [
  { id: 'vida', rotulo: 'Vida' },
  { id: 'mana', rotulo: 'Mana' },
  { id: 'estamina', rotulo: 'Estamina' },
  { id: 'sanidade', rotulo: 'Sanidade' },
];

const PARA: Array<{ id: ParaQuem; rotulo: string }> = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'dono', rotulo: 'Só o dono e o Mestre' },
  { id: 'ninguem', rotulo: 'Ninguém' },
];

const LADOS: Array<{ id: LadoToken; rotulo: string }> = [
  { id: 'jogador', rotulo: 'Jogador' },
  { id: 'aliado', rotulo: 'Aliado' },
  { id: 'inimigo', rotulo: 'Inimigo' },
  { id: 'neutro', rotulo: 'Neutro' },
];

export const MenuToken = ({ token, gestor, molduraMesa, onEditar, onMoldura, onEnquadramento, onRemover, onFechar }: Props) => {
  const config = token.config_barras;
  const podeVisual = gestor || token.e_meu;
  // Enquadramento só para a foto da ficha (imagem do Acervo já vem recortada pela Oficina).
  const temFotoDaFicha = Boolean(token.personagem_id && token.imagem?.startsWith('f'));
  const [enquadramento, setEnquadramento] = useState<Enquadramento>(token.enquadramento);
  const espera = useRef<number | null>(null);

  useEffect(() => {
    setEnquadramento(token.enquadramento);
  }, [token.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudarEnquadramento = (parcial: Partial<Enquadramento>) => {
    const novo = { ...enquadramento, ...parcial };
    setEnquadramento(novo);
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => onEnquadramento(novo), 300);
  };

  const alternarBarra = (tipo: TipoBarra) => {
    if (!config) return;
    const mostrar = config.mostrar.includes(tipo) ? config.mostrar.filter((b) => b !== tipo) : [...config.mostrar, tipo];
    onEditar({ barras: { mostrar } });
  };

  return (
    <section className="mapa-menu-token" aria-label={`Token ${token.nome}`}>
      <header>
        <strong>{token.nome}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
      </header>

      {token.barras.length > 0 && (
        <ul className="mapa-menu-numeros">
          {token.barras.map((barra) => (
            <li key={barra.tipo} className={`barra-${barra.tipo}`}>
              <span>{BARRAS.find((b) => b.id === barra.tipo)?.rotulo}</span>
              <strong>{barra.maximo ? `${barra.atual} / ${barra.maximo}` : barra.rotulo}</strong>
            </li>
          ))}
        </ul>
      )}
      {token.condicoes.length > 0 && <p className="mapa-menu-condicoes">{token.condicoes.join(' · ')}</p>}

      {config && (
        <fieldset>
          <legend>Barras no mapa</legend>
          <div className="mapa-menu-opcoes">
            {BARRAS.map((barra) => (
              <label key={barra.id}>
                <input type="checkbox" checked={config.mostrar.includes(barra.id)} onChange={() => alternarBarra(barra.id)} /> {barra.rotulo}
              </label>
            ))}
          </div>
          <label className="mapa-menu-linha">
            Quem vê
            <select value={config.para} onChange={(e) => onEditar({ barras: { para: e.target.value as ParaQuem } })}>
              {PARA.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
            </select>
          </label>
        </fieldset>
      )}

      {podeVisual && (
        <fieldset>
          <legend>Visual</legend>
          {molduraMesa ? (
            <p className="mapa-dica">O Mestre escolheu uma moldura única para a mesa. A sua escolha volta quando ele liberar.</p>
          ) : (
            <>
              <SeletorDeMoldura valor={token.moldura} lado={token.lado} nivel={token.nivel} incluirNivel={Boolean(token.personagem_id)} onEscolher={(id) => onMoldura(id)} />
              <button type="button" className="mapa-botao-leve" onClick={() => onMoldura(null)}>Voltar ao padrão</button>
            </>
          )}
          {temFotoDaFicha && (
            <>
              <label className="mapa-menu-linha">Zoom da foto <input type="range" min={1} max={4} step={0.02} value={enquadramento.zoom} onChange={(e) => mudarEnquadramento({ zoom: Number(e.target.value) })} /></label>
              <label className="mapa-menu-linha">Foto para os lados <input type="range" min={-1} max={1} step={0.01} value={enquadramento.x} onChange={(e) => mudarEnquadramento({ x: Number(e.target.value) })} /></label>
              <label className="mapa-menu-linha">Foto para cima ou baixo <input type="range" min={-1} max={1} step={0.01} value={enquadramento.y} onChange={(e) => mudarEnquadramento({ y: Number(e.target.value) })} /></label>
            </>
          )}
        </fieldset>
      )}

      {gestor && (
        <fieldset>
          <legend>Mestre</legend>
          <label className="mapa-menu-linha">
            Tamanho
            <select value={token.porte} onChange={(e) => onEditar({ porte: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} x {n} quadrados</option>)}
            </select>
          </label>
          <label className="mapa-menu-linha">
            Lado
            <select value={token.lado} onChange={(e) => onEditar({ lado: e.target.value as LadoToken })}>
              {LADOS.map((l) => <option key={l.id} value={l.id}>{l.rotulo}</option>)}
            </select>
          </label>
          <div className="mapa-menu-botoes">
            <button type="button" className="mapa-botao" onClick={() => onEditar({ oculto: !token.oculto })}>
              {token.oculto ? <><Eye size={14} /> Mostrar aos jogadores</> : <><EyeOff size={14} /> Esconder dos jogadores</>}
            </button>
            <button type="button" className="mapa-botao perigo" onClick={onRemover}><Trash2 size={14} /> Tirar do mapa</button>
          </div>
          {token.visibilidade && token.visibilidade !== 'total' && (
            <p className="mapa-dica">Na Sessão este participante está como "{token.visibilidade}": os jogadores veem só o que esse degrau deixa.</p>
          )}
        </fieldset>
      )}
    </section>
  );
};
