import { useEffect, useState } from 'react';
import { BookImage, Clapperboard, ImagePlus, Square, X } from 'lucide-react';
import { avisarErro } from '../../../components/avisos/avisos';
import { mapaApi, urlImagemDoToken, type IMesaExtras, type INarrativa, type ITokenMapa } from '../../../services/mapaApi';
import { iniciais } from '../motor/geometria';
import './painelNarrativa.css';

const MAXIMO_DE_FALANTES = 6;

interface Props {
  aberto: boolean;
  campanhaId: string;
  narrativa: INarrativa | null;
  /** Todos os tokens da cena (o Mestre vê todos): deles saem os falantes. */
  tokens: ITokenMapa[];
  /** Abre o Acervo para o Mestre escolher a imagem de fundo. */
  onEscolherFundo: () => void;
  /** A mesa nova que o servidor devolve depois de cada ação. */
  onMesa: (mesa: IMesaExtras) => void;
  onFechar: () => void;
}

/** O painel do Mestre para montar e ligar a cena narrativa: fundo, título e quem aparece embaixo. */
export const PainelNarrativa = ({ aberto, campanhaId, narrativa, tokens, onEscolherFundo, onMesa, onFechar }: Props) => {
  const [titulo, setTitulo] = useState(narrativa?.titulo ?? '');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    setTitulo(narrativa?.titulo ?? '');
  }, [narrativa?.titulo, narrativa?.imagem_id]);

  if (!aberto) return null;

  const fazer = async (pedido: Parameters<typeof mapaApi.mudarNarrativa>[1]) => {
    setOcupado(true);
    try {
      onMesa(await mapaApi.mudarNarrativa(campanhaId, pedido));
    } catch (falha) {
      avisarErro(falha, 'Não deu para mudar a cena narrativa.');
    } finally {
      setOcupado(false);
    }
  };

  const ligada = Boolean(narrativa?.ligada);
  const temFundo = Boolean(narrativa?.imagem_id);
  const escolhidos = narrativa?.falantes ?? [];
  const candidatos = tokens.filter((token) => (token.camada ?? 'personagens') === 'personagens');

  const alternarFalante = (id: string) => {
    const proximos = escolhidos.includes(id) ? escolhidos.filter((item) => item !== id) : [...escolhidos, id];
    if (proximos.length > MAXIMO_DE_FALANTES) return;
    void fazer({ falantes: proximos });
  };

  return (
    <section className="mapa-config mapa-narrativa-painel" aria-label="Cena narrativa">
      <header>
        <div><Clapperboard size={17} /><strong>Cena narrativa</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar o painel da cena narrativa" onClick={onFechar}><X size={16} /></button>
      </header>
      <p className="mapa-dica">O mapa some, a arte vira o fundo e os personagens aparecem embaixo. Boa para diálogo longo, investigação e viagem. O mapa volta como estava.</p>

      <button type="button" className="mapa-botao-leve mapa-narrativa-fundo" disabled={ocupado} onClick={onEscolherFundo}>
        {temFundo ? <BookImage size={14} /> : <ImagePlus size={14} />} {temFundo ? 'Trocar a imagem de fundo' : 'Escolher a imagem de fundo (Acervo)'}
      </button>

      <label className="mapa-menu-linha">
        <span>Título</span>
        <input
          value={titulo}
          maxLength={80}
          placeholder="A Taverna do Corvo"
          disabled={ocupado}
          onChange={(evento) => setTitulo(evento.target.value)}
          onBlur={() => { if (titulo !== (narrativa?.titulo ?? '')) void fazer({ titulo }); }}
          onKeyDown={(evento) => { if (evento.key === 'Enter') (evento.target as HTMLInputElement).blur(); }}
        />
      </label>

      <fieldset>
        <legend>Quem aparece embaixo ({escolhidos.length} de {MAXIMO_DE_FALANTES})</legend>
        {candidatos.length === 0 && <p className="mapa-dica">Esta cena não tem tokens de personagem.</p>}
        <ul className="mapa-narrativa-lista">
          {candidatos.map((token) => {
            const marcado = escolhidos.includes(token.id);
            return (
              <li key={token.id}>
                <button
                  type="button"
                  className={marcado ? 'marcado' : ''}
                  aria-pressed={marcado}
                  disabled={ocupado || (!marcado && escolhidos.length >= MAXIMO_DE_FALANTES)}
                  onClick={() => alternarFalante(token.id)}
                >
                  <span className="mapa-narrativa-mini">
                    {token.imagem ? <img src={urlImagemDoToken(campanhaId, token.id, token.imagem)} alt="" /> : <span>{iniciais(token.nome)}</span>}
                  </span>
                  <span>{token.nome}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mapa-dica">Durante a cena, clique num retrato para falar como aquele personagem. Quem o jogador não enxerga nunca aparece para ele.</p>
      </fieldset>

      {ligada ? (
        <button type="button" className="mapa-botao-leve perigo mapa-narrativa-liga" disabled={ocupado} onClick={() => void fazer({ ligada: false })}>
          <Square size={14} /> Encerrar a cena e voltar ao mapa
        </button>
      ) : (
        <button type="button" className="mapa-botao-leve mapa-narrativa-liga" disabled={ocupado || !temFundo} title={temFundo ? undefined : 'Escolha a imagem de fundo primeiro'} onClick={() => void fazer({ ligada: true })}>
          <Clapperboard size={14} /> Começar a cena para a mesa
        </button>
      )}
    </section>
  );
};
