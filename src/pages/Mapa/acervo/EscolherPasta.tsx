import { useMemo, useState } from 'react';
import { Folder, Inbox, Search, X } from 'lucide-react';
import type { IPastaAcervo } from '../../../services/acervoApi';
import { opcoesDePasta } from './organizacao';

interface Props {
  titulo: string;
  pastas: readonly IPastaAcervo[];
  /** Pastas que não podem ser o destino (a que está sendo movida e o que há dentro dela). */
  excluir?: ReadonlySet<string>;
  /** Pasta onde as imagens já estão (aparece marcada e não se escolhe de novo). */
  atual?: string | null;
  onEscolher: (pastaId: string | null) => void;
  onFechar: () => void;
}

/** O "Mover para...": a lista das pastas do Acervo com recuo, para quem prefere escolher a arrastar. */
export const EscolherPasta = ({ titulo, pastas, excluir, atual, onEscolher, onFechar }: Props) => {
  const [busca, setBusca] = useState('');
  const opcoes = useMemo(() => opcoesDePasta(pastas, excluir), [pastas, excluir]);
  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? opcoes.filter((o) => o.caminho.toLowerCase().includes(termo)) : opcoes;
  return (
    <section className="mapa-acervo-info acervo-escolher" aria-label={titulo}>
      <header>
        <strong>{titulo}</strong>
        <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={15} /></button>
      </header>
      {opcoes.length > 6 && (
        <label className="mapa-busca">
          <Search size={14} />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pasta" autoFocus />
        </label>
      )}
      <ul className="acervo-escolher-lista">
        {!termo && (
          <li>
            <button type="button" disabled={atual === null} onClick={() => onEscolher(null)}>
              <Inbox size={14} /> Fora de pasta {atual === null && <small>(já está aqui)</small>}
            </button>
          </li>
        )}
        {visiveis.map((opcao) => (
          <li key={opcao.id}>
            <button type="button" disabled={atual === opcao.id} style={{ paddingLeft: `${8 + (termo ? 0 : opcao.nivel * 14)}px` }} onClick={() => onEscolher(opcao.id)}>
              <Folder size={14} /> {termo ? opcao.caminho : opcao.nome} {atual === opcao.id && <small>(já está aqui)</small>}
            </button>
          </li>
        ))}
        {!visiveis.length && <li className="mapa-dica">{opcoes.length ? 'Nenhuma pasta com esse nome.' : 'Ainda não há pastas. Crie uma pelo botão Nova pasta.'}</li>}
      </ul>
    </section>
  );
};
