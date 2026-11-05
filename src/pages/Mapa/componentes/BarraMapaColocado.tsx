import { useState } from 'react';
import { ArrowDownToLine, ArrowUp, ArrowUpToLine, ArrowDown, CopyPlus, Eye, EyeOff, Layers, Lock, LockOpen, MoreVertical, Trash2, Type } from 'lucide-react';
import type { AcaoOrdemMapa, IMapaColocado, IMapaColocadoEdicao } from '../../../services/mapaApi';
import { casasNaLargura, escalaParaCasas } from '../motor/mapasColocadosConta';
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

const ORDENS: Array<{ id: AcaoOrdemMapa; rotulo: string; Icone: typeof ArrowUp }> = [
  { id: 'frente', rotulo: 'Para a frente de todos', Icone: ArrowUpToLine },
  { id: 'acima', rotulo: 'Subir um degrau', Icone: ArrowUp },
  { id: 'abaixo', rotulo: 'Descer um degrau', Icone: ArrowDown },
  { id: 'tras', rotulo: 'Para trás de todos', Icone: ArrowDownToLine },
];

/**
 * A barra do mapa escolhido, como no Owlbear: visível para os jogadores ou escondido, trancado,
 * ordem na pilha, duplicar, renomear, tirar da cena e, no menu de três pontos, tamanho em casas e lugar.
 */
export const BarraMapaColocado = ({ mapa, tamanhoCasa, onMudar, onOrdem, onDuplicar, onRenomear, onApagar }: Props) => {
  const [ordemAberta, setOrdemAberta] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);
  const visivel = mapa.visivel !== false;
  const trancado = mapa.trancado === true;

  const comNumero = (texto: string, aplicar: (valor: number) => void) => {
    const valor = Number(texto.replace(',', '.'));
    if (Number.isFinite(valor)) aplicar(valor);
  };

  return (
    <section className="mapa-barra-mapa" aria-label={`Mapa ${mapa.nome ?? ''}`}>
      <div className="mapa-barra-mapa-linha">
        <strong className="mapa-barra-mapa-nome" title={mapa.nome}>{mapa.nome}</strong>
        <ComDica dica={visivel ? 'Visível para os jogadores. Clique para esconder.' : 'Escondido dos jogadores. Clique para mostrar.'}>
          <button type="button" className={visivel ? '' : 'ativo'} aria-pressed={!visivel} aria-label={visivel ? 'Esconder dos jogadores' : 'Mostrar aos jogadores'} onClick={() => onMudar({ visivel: !visivel })}>
            {visivel ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </ComDica>
        <ComDica dica={trancado ? 'Trancado: não anda nem muda de tamanho. Clique para destrancar.' : 'Trancar o mapa no lugar'}>
          <button type="button" className={trancado ? 'ativo' : ''} aria-pressed={trancado} aria-label={trancado ? 'Destrancar o mapa' : 'Trancar o mapa'} onClick={() => onMudar({ trancado: !trancado })}>
            {trancado ? <Lock size={18} /> : <LockOpen size={18} />}
          </button>
        </ComDica>
        <ComDica dica="Ordem: quem fica por cima">
          <button type="button" className={ordemAberta ? 'ativo' : ''} aria-label="Ordem do mapa na pilha" aria-expanded={ordemAberta} onClick={() => { setOrdemAberta((v) => !v); setMaisAberto(false); }}>
            <Layers size={18} />
          </button>
        </ComDica>
        <ComDica dica="Duplicar o mapa">
          <button type="button" aria-label="Duplicar o mapa" onClick={onDuplicar}><CopyPlus size={18} /></button>
        </ComDica>
        <ComDica dica="Mudar o nome">
          <button type="button" aria-label="Mudar o nome do mapa" onClick={onRenomear}><Type size={18} /></button>
        </ComDica>
        <ComDica dica={trancado ? 'Destranque para tirar da cena' : 'Tirar da cena (a imagem fica no Acervo)'}>
          <button type="button" className="perigo" aria-label="Tirar o mapa da cena" onClick={onApagar}><Trash2 size={18} /></button>
        </ComDica>
        <ComDica dica="Tamanho em casas e lugar">
          <button type="button" className={maisAberto ? 'ativo' : ''} aria-label="Mais opções do mapa" aria-expanded={maisAberto} onClick={() => { setMaisAberto((v) => !v); setOrdemAberta(false); }}>
            <MoreVertical size={18} />
          </button>
        </ComDica>
      </div>

      {ordemAberta && (
        <div className="mapa-barra-mapa-menu" role="menu" aria-label="Ordem do mapa">
          {ORDENS.map(({ id, rotulo, Icone }) => (
            <button key={id} type="button" role="menuitem" onClick={() => onOrdem(id)}><Icone size={15} /> {rotulo}</button>
          ))}
        </div>
      )}

      {maisAberto && (
        <div className="mapa-barra-mapa-menu mapa-barra-mapa-numeros" aria-label="Tamanho e lugar do mapa">
          <label>
            <span>Largura em casas</span>
            <input
              key={`${mapa.id}-${mapa.escala}`}
              type="number"
              min={0.1}
              step={0.5}
              defaultValue={casasNaLargura(mapa, tamanhoCasa)}
              disabled={trancado}
              onBlur={(e) => comNumero(e.target.value, (casas) => casas > 0 && onMudar({ escala: escalaParaCasas(mapa, casas, tamanhoCasa) }))}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            />
          </label>
          <label>
            <span>Posição X (px)</span>
            <input key={`${mapa.id}-x-${mapa.x}`} type="number" step={10} defaultValue={Math.round(mapa.x)} disabled={trancado} onBlur={(e) => comNumero(e.target.value, (x) => onMudar({ x: Math.max(0, x) }))} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          </label>
          <label>
            <span>Posição Y (px)</span>
            <input key={`${mapa.id}-y-${mapa.y}`} type="number" step={10} defaultValue={Math.round(mapa.y)} disabled={trancado} onBlur={(e) => comNumero(e.target.value, (y) => onMudar({ y: Math.max(0, y) }))} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
          </label>
          <button type="button" className="mapa-botao-leve" disabled={trancado || mapa.escala === 1} onClick={() => onMudar({ escala: 1 })}>Tamanho original ({mapa.largura} px)</button>
          <p className="mapa-dica">Dica: se o desenho tem uma grade própria, ponha aqui quantas casas ele tem de largura até as linhas casarem com as da cena.</p>
        </div>
      )}
    </section>
  );
};
