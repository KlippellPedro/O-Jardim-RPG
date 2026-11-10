import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUp, ArrowUpToLine, ArrowDown, CopyPlus, Eye, EyeOff, Layers, Lock, LockOpen, MoreVertical, RotateCw, Trash2, Type } from 'lucide-react';
import type { AcaoOrdemMapa, IMapaColocado, IMapaColocadoEdicao } from '../../../services/mapaApi';
import { casasNaLargura, escalaParaCasas, manterDentroDaCena, moverMapa } from '../motor/mapasColocadosConta';
import { ComDica } from './BotaoFerramenta';
import './mapasColocados.css';

interface Props {
  mapa: IMapaColocado;
  tamanhoCasa: number;
  onMudar: (edicao: IMapaColocadoEdicao) => void;
  onOrdem: (acao: AcaoOrdemMapa) => void;
  onDuplicar: () => void;
  onRenomear: () => void;
  onApagar: () => void;
}

type Menu = 'ordem' | 'mais';

const ORDENS: Array<{ id: AcaoOrdemMapa; rotulo: string; Icone: typeof ArrowUp }> = [
  { id: 'frente', rotulo: 'Para a frente de todos', Icone: ArrowUpToLine },
  { id: 'acima', rotulo: 'Subir um degrau', Icone: ArrowUp },
  { id: 'abaixo', rotulo: 'Descer um degrau', Icone: ArrowDown },
  { id: 'tras', rotulo: 'Para trás de todos', Icone: ArrowDownToLine },
];

/**
 * A barra do mapa escolhido, como no Owlbear (ela fica colada no mapa, ver BarraAncorada): visível para os
 * jogadores ou escondido, trancado, ordem na pilha, duplicar, renomear, tirar da cena e, no menu de três pontos,
 * tamanho em casas, giro e lugar. Os menus abrem para cima, ou para baixo quando a barra está perto do topo, e
 * não mexem na barra.
 */
export const BarraMapaColocado = ({ mapa, tamanhoCasa, onMudar, onOrdem, onDuplicar, onRenomear, onApagar }: Props) => {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [abaixo, setAbaixo] = useState(false);
  const raiz = useRef<HTMLElement>(null);
  const visivel = mapa.visivel !== false;
  const trancado = mapa.trancado === true;

  // Fecha o menu ao clicar fora da barra.
  useEffect(() => {
    if (!menu) return undefined;
    const fora = (evento: PointerEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setMenu(null);
    };
    document.addEventListener('pointerdown', fora, true);
    return () => document.removeEventListener('pointerdown', fora, true);
  }, [menu]);

  const abrir = (qual: Menu) => {
    if (menu === qual) {
      setMenu(null);
      return;
    }
    const barra = raiz.current?.getBoundingClientRect();
    const area = raiz.current?.closest('.mapa-area')?.getBoundingClientRect();
    // O menu de números tem uns 330 px de altura: sem esse espaço em cima, abre embaixo da barra.
    setAbaixo(Boolean(barra && area && barra.top - area.top < (qual === 'mais' ? 380 : 190)));
    setMenu(qual);
  };

  const comNumero = (texto: string, aplicar: (valor: number) => void) => {
    const valor = Number(texto.replace(',', '.'));
    if (Number.isFinite(valor)) aplicar(valor);
  };

  /** Muda o tamanho ou o giro e, se a caixa do mapa passar da borda de cima ou da esquerda, empurra o mapa para dentro. */
  const mudarComBorda = (mudanca: { escala?: number; rotacao?: number }) => onMudar({ ...mudanca, ...manterDentroDaCena({ ...mapa, ...mudanca }) });
  const girarPara = (graus: number) => mudarComBorda({ rotacao: ((graus % 360) + 360) % 360 });
  const aoTeclar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  return (
    <section className="mapa-barra-mapa" aria-label={`Mapa ${mapa.nome ?? ''}`} ref={raiz}>
      <div className="mapa-barra-mapa-linha">
        <strong className="mapa-barra-mapa-nome" title={mapa.nome}>{mapa.nome}</strong>
        <ComDica lado="cima" dica={visivel ? 'Visível para os jogadores. Clique para esconder.' : 'Escondido dos jogadores. Clique para mostrar.'}>
          <button type="button" className={visivel ? '' : 'ativo'} aria-pressed={!visivel} aria-label={visivel ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'} onClick={() => onMudar({ visivel: !visivel })}>
            {visivel ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </ComDica>
        <ComDica lado="cima" dica={trancado ? 'Trancado: não anda nem muda de tamanho. Clique para destrancar.' : 'Trancar o mapa no lugar'}>
          <button type="button" className={trancado ? 'ativo' : ''} aria-pressed={trancado} aria-label={trancado ? 'Destrancar o mapa' : 'Trancar o mapa'} onClick={() => onMudar({ trancado: !trancado })}>
            {trancado ? <Lock size={18} /> : <LockOpen size={18} />}
          </button>
        </ComDica>
        <ComDica lado="cima" dica="Ordem: quem fica por cima">
          <button type="button" className={menu === 'ordem' ? 'ativo' : ''} aria-label="Ordem do mapa na pilha" aria-expanded={menu === 'ordem'} onClick={() => abrir('ordem')}>
            <Layers size={18} />
          </button>
        </ComDica>
        <ComDica lado="cima" dica="Duplicar o mapa">
          <button type="button" aria-label="Duplicar o mapa" onClick={onDuplicar}><CopyPlus size={18} /></button>
        </ComDica>
        <ComDica lado="cima" dica="Mudar o nome">
          <button type="button" aria-label="Mudar o nome do mapa" onClick={onRenomear}><Type size={18} /></button>
        </ComDica>
        <ComDica lado="cima" dica={trancado ? 'Destranque para tirar da cena' : 'Tirar da cena (a imagem fica no Acervo)'}>
          <button type="button" className="perigo" aria-label="Tirar o mapa da cena" onClick={onApagar}><Trash2 size={18} /></button>
        </ComDica>
        <ComDica lado="cima" dica="Tamanho, giro e lugar">
          <button type="button" className={menu === 'mais' ? 'ativo' : ''} aria-label="Mais opções do mapa" aria-expanded={menu === 'mais'} onClick={() => abrir('mais')}>
            <MoreVertical size={18} />
          </button>
        </ComDica>
      </div>

      {menu === 'ordem' && (
        <div className={`mapa-barra-mapa-menu${abaixo ? ' abaixo' : ''}`} role="menu" aria-label="Ordem do mapa">
          {ORDENS.map(({ id, rotulo, Icone }) => (
            <button key={id} type="button" role="menuitem" onClick={() => { onOrdem(id); setMenu(null); }}><Icone size={15} /> {rotulo}</button>
          ))}
        </div>
      )}

      {menu === 'mais' && (
        <div className={`mapa-barra-mapa-menu mapa-barra-mapa-numeros${abaixo ? ' abaixo' : ''}`} role="group" aria-label="Tamanho, giro e lugar do mapa">
          <label>
            <span>Largura</span>
            <span className="mapa-barra-mapa-campo">
              <input
                key={`${mapa.id}-${mapa.escala}`}
                type="number"
                min={0.1}
                step={0.5}
                defaultValue={casasNaLargura(mapa, tamanhoCasa)}
                disabled={trancado}
                onBlur={(e) => comNumero(e.target.value, (casas) => casas > 0 && mudarComBorda({ escala: escalaParaCasas(mapa, casas, tamanhoCasa) }))}
                onKeyDown={aoTeclar}
              />
              <em>casas</em>
            </span>
          </label>
          <label>
            <span>Giro</span>
            <span className="mapa-barra-mapa-campo">
              <input
                key={`${mapa.id}-r-${mapa.rotacao ?? 0}`}
                type="number"
                step={15}
                defaultValue={Math.round((mapa.rotacao ?? 0) * 10) / 10}
                disabled={trancado}
                onBlur={(e) => comNumero(e.target.value, (graus) => girarPara(graus))}
                onKeyDown={aoTeclar}
              />
              <em>graus</em>
            </span>
          </label>
          <div className="mapa-barra-mapa-acoes">
            <button type="button" className="mapa-barra-mapa-acao" disabled={trancado} onClick={() => girarPara((mapa.rotacao ?? 0) + 90)}><RotateCw size={14} /> Girar 90°</button>
            <button type="button" className="mapa-barra-mapa-acao" disabled={trancado || !mapa.rotacao} onClick={() => girarPara(0)}>Desfazer o giro</button>
            <button type="button" className="mapa-barra-mapa-acao" disabled={trancado || mapa.escala === 1} onClick={() => mudarComBorda({ escala: 1 })}>Tamanho original ({mapa.largura} px)</button>
          </div>
          <details>
            <summary>Posição exata</summary>
            <label>
              <span>X</span>
              <span className="mapa-barra-mapa-campo">
                <input key={`${mapa.id}-x-${mapa.x}`} type="number" step={10} defaultValue={Math.round(mapa.x)} disabled={trancado} onBlur={(e) => comNumero(e.target.value, (x) => onMudar({ x: moverMapa(mapa, x, mapa.y).x }))} onKeyDown={aoTeclar} />
                <em>px</em>
              </span>
            </label>
            <label>
              <span>Y</span>
              <span className="mapa-barra-mapa-campo">
                <input key={`${mapa.id}-y-${mapa.y}`} type="number" step={10} defaultValue={Math.round(mapa.y)} disabled={trancado} onBlur={(e) => comNumero(e.target.value, (y) => onMudar({ y: moverMapa(mapa, mapa.x, y).y }))} onKeyDown={aoTeclar} />
                <em>px</em>
              </span>
            </label>
            <p className="mapa-dica">É o canto de cima à esquerda do desenho sem girar.</p>
          </details>
          <details>
            <summary>Dicas</summary>
            <p className="mapa-dica">Arraste a bolinha de cima do mapa para girar (Shift gira de 15 em 15 graus) e os quadradinhos dos cantos para mudar o tamanho. Se o desenho tem uma grade própria, ponha em Largura quantas casas ele tem até as linhas casarem com as da cena.</p>
          </details>
        </div>
      )}
    </section>
  );
};
