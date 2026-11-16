import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderInput, FolderOpen, FolderPlus, Inbox, Layers, Pencil, Trash2 } from 'lucide-react';
import type { IPastaAcervo } from '../../../services/acervoApi';
import { MIME_MOVER_PASTA } from './organizacao';
import type { ContagemDasPastas } from './organizacao';

/** O que cada lugar da árvore recebe para virar alvo de soltar: classes, eventos e o destino. */
export type PropsDeAlvo = (chave: string, destino: string | null) => {
  className: string;
  onDragOver: (evento: React.DragEvent) => void;
  onDragEnter: (evento: React.DragEvent) => void;
  onDragLeave: (evento: React.DragEvent) => void;
  onDrop: (evento: React.DragEvent) => void;
};

interface Props {
  pastas: readonly IPastaAcervo[];
  contagem: ContagemDasPastas;
  /** 'todas', nulo (fora de pasta) ou o id da pasta aberta. */
  selecionada: string | null | 'todas';
  expandidas: ReadonlySet<string>;
  onSelecionar: (pasta: string | null | 'todas') => void;
  onAlternar: (pastaId: string) => void;
  onExpandir: (pastaId: string) => void;
  onNovaSubpasta: (paiId: string | null) => void;
  onRenomear: (pastaId: string, nome: string) => void;
  onMover: (pastaId: string) => void;
  onApagar: (pastaId: string, nome: string) => void;
  propsDeAlvo: PropsDeAlvo;
}

/**
 * A árvore de pastas do Acervo. Cada pasta é um lugar onde se solta uma imagem (ou outra pasta) e também pode ser
 * arrastada para dentro de outra; duplo clique no nome renomeia. Passar com algo arrastado por cima de uma pasta
 * fechada a abre depois de um instante.
 */
export const ArvoreDePastas = ({
  pastas, contagem, selecionada, expandidas, onSelecionar, onAlternar, onExpandir, onNovaSubpasta, onRenomear, onMover, onApagar, propsDeAlvo,
}: Props) => {
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nomeNovo, setNomeNovo] = useState('');
  const temporizador = useRef<number | null>(null);

  useEffect(() => () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
  }, []);

  const iniciarRenomear = (pasta: IPastaAcervo) => {
    setRenomeando(pasta.id);
    setNomeNovo(pasta.nome);
  };

  const concluirRenomear = (pasta: IPastaAcervo) => {
    const nome = nomeNovo.trim();
    setRenomeando(null);
    if (nome && nome !== pasta.nome) onRenomear(pasta.id, nome);
  };

  const abrirAoPassar = (pastaId: string, temFilhas: boolean, aberta: boolean) => {
    if (!temFilhas || aberta) return;
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => onExpandir(pastaId), 700);
  };

  const cancelarAbrir = () => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    temporizador.current = null;
  };

  const filhasDe = (paiId: string | null) => pastas
    .filter((p) => (p.pai_id && pastas.some((outra) => outra.id === p.pai_id) ? p.pai_id : null) === paiId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));

  const linha = (pasta: IPastaAcervo, nivel: number): JSX.Element => {
    const filhas = filhasDe(pasta.id);
    const aberta = expandidas.has(pasta.id);
    const ativa = selecionada === pasta.id;
    const alvo = propsDeAlvo(`pasta:${pasta.id}`, pasta.id);
    return (
      <li key={pasta.id} role="treeitem" aria-expanded={filhas.length ? aberta : undefined} aria-selected={ativa}>
        <div
          className={`acervo-pasta${ativa ? ' ativa' : ''} ${alvo.className}`}
          style={{ paddingLeft: `${4 + nivel * 14}px` }}
          draggable={renomeando !== pasta.id}
          onDragStart={(evento) => {
            evento.dataTransfer.setData(MIME_MOVER_PASTA, pasta.id);
            evento.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={alvo.onDragOver}
          onDragEnter={(evento) => {
            alvo.onDragEnter(evento);
            abrirAoPassar(pasta.id, filhas.length > 0, aberta);
          }}
          onDragLeave={(evento) => {
            alvo.onDragLeave(evento);
            cancelarAbrir();
          }}
          onDrop={(evento) => {
            cancelarAbrir();
            alvo.onDrop(evento);
          }}
        >
          <button
            type="button"
            className="acervo-pasta-seta"
            aria-label={aberta ? `Fechar ${pasta.nome}` : `Abrir ${pasta.nome}`}
            tabIndex={filhas.length ? 0 : -1}
            style={{ visibility: filhas.length ? 'visible' : 'hidden' }}
            onClick={() => onAlternar(pasta.id)}
          >
            {aberta ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          {renomeando === pasta.id ? (
            <input
              className="acervo-pasta-nome-campo"
              autoFocus
              value={nomeNovo}
              maxLength={80}
              aria-label={`Novo nome da pasta ${pasta.nome}`}
              onChange={(evento) => setNomeNovo(evento.target.value)}
              onBlur={() => concluirRenomear(pasta)}
              onKeyDown={(evento) => {
                if (evento.key === 'Enter') concluirRenomear(pasta);
                if (evento.key === 'Escape') setRenomeando(null);
              }}
            />
          ) : (
            <button
              type="button"
              className="acervo-pasta-nome"
              title={`${pasta.nome} (duplo clique renomeia; arraste para outra pasta)`}
              onClick={() => onSelecionar(pasta.id)}
              onDoubleClick={() => iniciarRenomear(pasta)}
            >
              {ativa || aberta ? <FolderOpen size={14} /> : <Folder size={14} />}
              <span>{pasta.nome}</span>
              <small>{contagem.porPasta.get(pasta.id) ?? 0}</small>
            </button>
          )}
          <span className="acervo-pasta-acoes">
            <button type="button" aria-label={`Nova pasta dentro de ${pasta.nome}`} title="Nova pasta aqui dentro" onClick={() => onNovaSubpasta(pasta.id)}><FolderPlus size={12} /></button>
            <button type="button" aria-label={`Renomear a pasta ${pasta.nome}`} title="Renomear" onClick={() => iniciarRenomear(pasta)}><Pencil size={12} /></button>
            <button type="button" aria-label={`Mover a pasta ${pasta.nome} para outra pasta`} title="Mover para outra pasta" onClick={() => onMover(pasta.id)}><FolderInput size={12} /></button>
            <button type="button" aria-label={`Apagar a pasta ${pasta.nome}`} title="Apagar a pasta (as imagens vão para fora de pasta)" onClick={() => onApagar(pasta.id, pasta.nome)}><Trash2 size={12} /></button>
          </span>
        </div>
        {filhas.length > 0 && aberta && <ul role="group">{filhas.map((filha) => linha(filha, nivel + 1))}</ul>}
      </li>
    );
  };

  const raiz = propsDeAlvo('raiz', null);
  return (
    <nav className="acervo-arvore" aria-label="Pastas do Acervo">
      <ul role="tree">
        <li role="treeitem" aria-selected={selecionada === 'todas'}>
          <div className={`acervo-pasta${selecionada === 'todas' ? ' ativa' : ''}`}>
            <button type="button" className="acervo-pasta-nome" onClick={() => onSelecionar('todas')}>
              <Layers size={14} /><span>Tudo</span><small>{contagem.total}</small>
            </button>
          </div>
        </li>
        <li role="treeitem" aria-selected={selecionada === null}>
          <div
            className={`acervo-pasta${selecionada === null ? ' ativa' : ''} ${raiz.className}`}
            onDragOver={raiz.onDragOver}
            onDragEnter={raiz.onDragEnter}
            onDragLeave={raiz.onDragLeave}
            onDrop={raiz.onDrop}
          >
            <button type="button" className="acervo-pasta-nome" title="Imagens fora de pasta. Solte aqui para tirar uma imagem ou pasta de dentro de outra." onClick={() => onSelecionar(null)}>
              <Inbox size={14} /><span>Fora de pasta</span><small>{contagem.foraDePasta}</small>
            </button>
          </div>
        </li>
        {filhasDe(null).map((pasta) => linha(pasta, 0))}
      </ul>
      <button type="button" className="mapa-botao-leve acervo-nova-pasta" onClick={() => onNovaSubpasta(typeof selecionada === 'string' && selecionada !== 'todas' ? selecionada : null)}>
        <FolderPlus size={14} /> Nova pasta
      </button>
      {pastas.length > 0 && <p className="mapa-dica">Arraste imagens ou pastas para dentro de uma pasta. Duplo clique no nome renomeia.</p>}
    </nav>
  );
};
