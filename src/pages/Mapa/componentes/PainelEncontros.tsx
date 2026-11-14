import { useCallback, useEffect, useState } from 'react';
import { EyeOff, Loader2, Save, Swords, Trash2, UserMinus, Users, X } from 'lucide-react';
import { avisar, avisarErro } from '../../../components/avisos/avisos';
import { confirmar, pedirTexto } from '../../../components/avisos/confirmacao';
import { mapaApi, type IEstadoMapa, type IResumoEncontro } from '../../../services/mapaApi';
import './encontrosMapa.css';

interface Props {
  aberto: boolean;
  campanhaId: string;
  /** A cena que o Mestre está vendo (onde os encontros são salvos, soltos e limpos). */
  cenaId: string | null;
  /** O ponto do mapa onde o encontro cai: o meio da tela, encaixado na grade. */
  ponto: () => { x: number; y: number } | null;
  /** O mapa novo que o servidor devolve depois de cada ação. */
  onEstado: (estado: IEstadoMapa) => void;
  onFechar: () => void;
}

/**
 * Encontros do Mestre: guarda os inimigos da cena como um grupo, solta o grupo de uma vez (escondido, numa emboscada),
 * revela os escondidos e limpa os inimigos. Personagem de jogador nunca entra nisso.
 */
export const PainelEncontros = ({ aberto, campanhaId, cenaId, ponto, onEstado, onFechar }: Props) => {
  const [lista, setLista] = useState<IResumoEncontro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [tirarDaIniciativa, setTirarDaIniciativa] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setLista((await mapaApi.listarEncontros(campanhaId)).encontros);
    } catch (falha) {
      avisarErro(falha, 'Não deu para abrir os encontros.');
    } finally {
      setCarregando(false);
    }
  }, [campanhaId]);

  useEffect(() => {
    if (aberto) void carregar();
  }, [aberto, carregar]);

  if (!aberto) return null;

  const fazer = async (acao: () => Promise<void>) => {
    setOcupado(true);
    try {
      await acao();
    } catch (falha) {
      avisarErro(falha, 'Algo não deu certo.');
    } finally {
      setOcupado(false);
    }
  };

  const guardar = () => fazer(async () => {
    if (!cenaId) return;
    const nome = await pedirTexto({ titulo: 'Guardar os inimigos desta cena', campo: { rotulo: 'Nome do encontro', maximo: 60, placeholder: 'Emboscada na estrada' }, rotuloConfirmar: 'Guardar' });
    if (!nome) return;
    const resposta = await mapaApi.salvarEncontro(campanhaId, cenaId, { nome });
    setLista(resposta.encontros);
    avisar.info(`Encontro "${nome}" guardado.`);
  });

  const soltar = (encontro: IResumoEncontro, escondidos: boolean) => fazer(async () => {
    const onde = ponto();
    if (!cenaId || !onde) return;
    const resposta = await mapaApi.soltarEncontro(campanhaId, cenaId, encontro.id, { x: onde.x, y: onde.y, escondidos });
    onEstado(resposta);
    avisar.info(`${resposta.soltos} ${resposta.soltos === 1 ? 'token entrou' : 'tokens entraram'}${escondidos ? ' escondidos' : ''}.`);
  });

  const apagar = (encontro: IResumoEncontro) => fazer(async () => {
    if (!(await confirmar({ mensagem: `Apagar o encontro "${encontro.nome}"? Os tokens que já estão no mapa ficam.`, rotuloConfirmar: 'Apagar', tom: 'perigo' }))) return;
    setLista((await mapaApi.apagarEncontro(campanhaId, encontro.id)).encontros);
  });

  const revelar = () => fazer(async () => {
    if (!cenaId) return;
    const resposta = await mapaApi.revelarEscondidos(campanhaId, cenaId);
    onEstado(resposta);
    avisar.info(resposta.revelados ? `${resposta.revelados} ${resposta.revelados === 1 ? 'token apareceu' : 'tokens apareceram'} para os jogadores.` : 'Nada estava escondido.');
  });

  const limpar = () => fazer(async () => {
    if (!cenaId) return;
    const aviso = tirarDaIniciativa ? 'Tirar os inimigos do mapa e da iniciativa?' : 'Tirar os inimigos do mapa? Eles continuam na iniciativa.';
    if (!(await confirmar({ mensagem: aviso, rotuloConfirmar: 'Limpar', tom: 'perigo' }))) return;
    const resposta = await mapaApi.limparCena(campanhaId, cenaId, { tirar_da_iniciativa: tirarDaIniciativa });
    onEstado(resposta);
    avisar.info(resposta.removidos ? `${resposta.removidos} ${resposta.removidos === 1 ? 'token saiu' : 'tokens saíram'} da cena.` : 'Não havia inimigos na cena.');
  });

  return (
    <section className="mapa-config mapa-encontros" aria-label="Encontros">
      <header>
        <div><Swords size={17} /><strong>Encontros</strong></div>
        <button type="button" className="mapa-icone" aria-label="Fechar os encontros" onClick={onFechar}><X size={16} /></button>
      </header>
      <p className="mapa-dica">Guarde os inimigos desta cena e solte o grupo inteiro quando a hora chegar, em qualquer mapa. Personagens de jogador ficam de fora.</p>
      <button type="button" className="mapa-botao-leve mapa-encontros-guardar" disabled={ocupado || !cenaId} onClick={() => void guardar()}>
        <Save size={14} /> Guardar os inimigos desta cena
      </button>
      {carregando && !lista.length && <p className="mapa-dica"><Loader2 size={14} className="girando" /> Abrindo...</p>}
      {!carregando && !lista.length && <p className="mapa-dica">Nenhum encontro guardado ainda.</p>}
      <ul className="mapa-encontros-lista">
        {lista.map((encontro) => (
          <li key={encontro.id}>
            <div className="mapa-encontros-nome">
              <strong>{encontro.nome}</strong>
              <small>{encontro.total} {encontro.total === 1 ? 'token' : 'tokens'}{encontro.criaturas ? ` · ${encontro.criaturas} na iniciativa` : ''}</small>
              {encontro.resumo && <small>{encontro.resumo}</small>}
            </div>
            <div className="mapa-encontros-acoes">
              <button type="button" disabled={ocupado || !cenaId} title="Solta o grupo no meio da tela, com os inimigos à vista" onClick={() => void soltar(encontro, false)}><Users size={14} /> Soltar</button>
              <button type="button" disabled={ocupado || !cenaId} title="Solta o grupo escondido dos jogadores: uma emboscada" onClick={() => void soltar(encontro, true)}><EyeOff size={14} /> Escondido</button>
              <button type="button" className="mapa-icone" aria-label={`Apagar ${encontro.nome}`} disabled={ocupado} onClick={() => void apagar(encontro)}><Trash2 size={14} /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mapa-encontros-cena">
        <strong>Nesta cena</strong>
        <button type="button" className="mapa-botao-leve" disabled={ocupado || !cenaId} onClick={() => void revelar()}>Revelar todos os escondidos</button>
        <button type="button" className="mapa-botao-leve perigo" disabled={ocupado || !cenaId} onClick={() => void limpar()}><UserMinus size={14} /> Limpar os inimigos</button>
        <label><input type="checkbox" checked={tirarDaIniciativa} onChange={(evento) => setTirarDaIniciativa(evento.target.checked)} /> Tirar também da iniciativa</label>
      </div>
    </section>
  );
};
