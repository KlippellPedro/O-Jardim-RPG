import { useEffect, useState } from 'react';
import { Coins, Gem, Hand, Package, X } from 'lucide-react';
import type { ITokenMapa } from '../../../services/mapaApi';
import './recipientes.css';

export interface PersonagemParaPegar {
  id: string;
  nome: string;
}

interface Props {
  token: ITokenMapa;
  /** Quem pode receber: os personagens do jogador, ou todos os da mesa quando é o Mestre. */
  personagens: PersonagemParaPegar[];
  ocupado: boolean;
  onPegar: (linhas: string[], personagemId: string | undefined) => void;
  onFechar: () => void;
}

const COR_RARIDADE: Record<string, string> = {
  comum: '#b8b3c4',
  incomum: '#86d4ab',
  raro: '#8aa4ef',
  epico: '#b79be0',
  lendario: '#f0c36a',
  mitico: '#ef9fbe',
};

/**
 * O que saiu do baú (ou caixote, bolsa) depois de aberto. A mesa toda vê a lista e quem pegou cada linha, na hora;
 * quem abriu escolhe o que levar. A tabela e as chances ficam no servidor.
 */
export const JanelaRecipiente = ({ token, personagens, ocupado, onPegar, onFechar }: Props) => {
  const recipiente = token.recipiente;
  const [personagem, setPersonagem] = useState(personagens[0]?.id ?? '');
  useEffect(() => {
    if (!personagens.some((p) => p.id === personagem)) setPersonagem(personagens[0]?.id ?? '');
  }, [personagens, personagem]);
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => { if (evento.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  if (!recipiente) return null;
  const livres = recipiente.linhas.filter((linha) => !linha.entregue_para);
  const podePegar = personagens.length > 0;

  return (
    <div className="recipiente-janela" role="presentation" onClick={onFechar}>
      <section className="recipiente-janela-corpo" role="dialog" aria-modal="true" aria-label={recipiente.rotulo} onClick={(e) => e.stopPropagation()}>
        <header>
          <h3><Package size={16} aria-hidden="true" /> {recipiente.rotulo}</h3>
          <button type="button" className="mapa-icone" aria-label="Fechar" onClick={onFechar}><X size={16} /></button>
        </header>
        {recipiente.aberto_por && <p className="recipiente-vazio">Aberto por {recipiente.aberto_por}.</p>}

        {recipiente.linhas.length === 0 ? (
          <p className="recipiente-vazio">Está vazio. Nada caiu desta vez.</p>
        ) : (
          <ul className="recipiente-linhas">
            {recipiente.linhas.map((linha) => (
              <li
                key={linha.linha}
                className={`recipiente-linha${linha.entregue_para ? ' pego' : ''}`}
                style={{ ['--cor-raridade' as string]: COR_RARIDADE[linha.raridade ?? ''] ?? '#8b8696' }}
              >
                {linha.tipo === 'moedas' ? <Coins size={16} aria-hidden="true" /> : <Gem size={16} aria-hidden="true" />}
                <span>
                  <strong>{linha.quantidade}x {linha.titulo}</strong>
                  <small>{linha.entregue_para ? `Pego por ${linha.entregue_para}` : linha.raridade ?? (linha.tipo === 'moedas' ? 'Moedas' : 'Item')}</small>
                </span>
                {!linha.entregue_para && podePegar && (
                  <button type="button" disabled={ocupado} onClick={() => onPegar([linha.linha], personagem || undefined)}>Pegar</button>
                )}
              </li>
            ))}
          </ul>
        )}

        {podePegar && personagens.length > 1 && (
          <label className="mapa-menu-linha">
            Pegar com
            <select value={personagem} onChange={(e) => setPersonagem(e.target.value)}>
              {personagens.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
        )}
        {podePegar && livres.length > 1 && (
          <button type="button" disabled={ocupado} onClick={() => onPegar(livres.map((l) => l.linha), personagem || undefined)}>
            <Hand size={14} aria-hidden="true" /> Pegar tudo
          </button>
        )}
        {!podePegar && livres.length > 0 && <p className="recipiente-vazio">Você precisa de um personagem na mesa para pegar.</p>}
        {recipiente.esvaziado && <p className="recipiente-vazio">Não sobrou nada.</p>}
      </section>
    </div>
  );
};
