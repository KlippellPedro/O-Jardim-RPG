import { useEffect, useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { avisarErro } from '../../../components/avisos/avisos';
import { confirmar, pedirTexto } from '../../../components/avisos/confirmacao';
import { mapaApi, type IEstadoMapa, type ITokenMapa } from '../../../services/mapaApi';
import { LIMITE_DE_FORMAS, ROTULO_DA_BASE, textoDaFonte } from '../motor/formasConta';
import './formasEFonte.css';

interface Props {
  campanhaId: string;
  token: ITokenMapa;
  /** O mapa novo que o servidor devolve depois de cada ação. */
  onEstado: (estado: IEstadoMapa) => void;
  /** Abre o Acervo para o Mestre escolher a imagem da forma nova. */
  onEscolherImagem: () => void;
}

/**
 * A aba Formas do menu do token (só o Mestre, e não no token de personagem): as imagens que o token pode vestir, com
 * a tecla de cada uma, e o token-fonte, que deixa uma cópia numerada onde é arrastado.
 */
export const FormasEFonte = ({ campanhaId, token, onEstado, onEscolherImagem }: Props) => {
  const formas = token.formas ?? [];
  const fonte = token.fonte ?? null;
  const [ocupado, setOcupado] = useState(false);
  const [limite, setLimite] = useState(fonte?.limite ? String(fonte.limite) : '');

  useEffect(() => {
    setLimite(token.fonte?.limite ? String(token.fonte.limite) : '');
  }, [token.id, token.fonte?.limite]);

  const fazer = async (acao: () => Promise<IEstadoMapa>) => {
    setOcupado(true);
    try {
      onEstado(await acao());
    } catch (falha) {
      avisarErro(falha, 'Algo não deu certo.');
    } finally {
      setOcupado(false);
    }
  };

  const renomear = async (forma: { id: string; nome: string }) => {
    const nome = await pedirTexto({ titulo: 'Nome da forma', campo: { rotulo: 'Nome', valor: forma.nome, maximo: 24 }, rotuloConfirmar: 'Salvar' });
    if (nome) await fazer(() => mapaApi.renomearForma(campanhaId, token.id, forma.id, nome));
  };

  const apagar = async (forma: { id: string; nome: string }) => {
    if (!(await confirmar({ mensagem: `Tirar a forma "${forma.nome}" deste token?`, rotuloConfirmar: 'Tirar', tom: 'perigo' }))) return;
    await fazer(() => mapaApi.apagarForma(campanhaId, token.id, forma.id));
  };

  const guardarLimite = () => {
    const numero = limite.trim() === '' ? null : Number.parseInt(limite, 10);
    if (numero !== null && (!Number.isFinite(numero) || numero < 1 || numero > 200)) {
      avisarErro(new Error('O limite vai de 1 a 200 cópias. Deixe em branco para não ter limite.'), 'Limite inválido.');
      return;
    }
    if ((fonte?.limite ?? null) === numero) return;
    void fazer(() => mapaApi.configurarFonte(campanhaId, token.id, { ativa: true, limite: numero }));
  };

  return (
    <div className="mapa-formas">
      <fieldset>
        <legend>Formas</legend>
        <ul className="mapa-formas-lista">
          <li className={!token.forma_ativa ? 'ativa' : ''}>
            <button type="button" disabled={ocupado || !token.forma_ativa} onClick={() => void fazer(() => mapaApi.escolherForma(campanhaId, token.id, null))}>
              <kbd>1</kbd> {ROTULO_DA_BASE}
            </button>
          </li>
          {formas.map((forma, indice) => (
            <li key={forma.id} className={token.forma_ativa === forma.id ? 'ativa' : ''}>
              <button type="button" disabled={ocupado || token.forma_ativa === forma.id} onClick={() => void fazer(() => mapaApi.escolherForma(campanhaId, token.id, forma.id))}>
                <kbd>{indice + 2}</kbd> {forma.nome}
              </button>
              <button type="button" className="mapa-icone" aria-label={`Renomear ${forma.nome}`} disabled={ocupado} onClick={() => void renomear(forma)}><Pencil size={13} /></button>
              <button type="button" className="mapa-icone" aria-label={`Tirar ${forma.nome}`} disabled={ocupado} onClick={() => void apagar(forma)}><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
        <button type="button" className="mapa-botao-leve mapa-formas-nova" disabled={ocupado || formas.length >= LIMITE_DE_FORMAS - 1} onClick={onEscolherImagem}>
          <Plus size={14} /> Adicionar forma pelo Acervo
        </button>
        <p className="mapa-dica">Com o token escolhido, as teclas 1 a {Math.min(9, formas.length + 1)} trocam a forma. A imagem de base é a 1. Cada forma é uma imagem do Acervo.</p>
      </fieldset>

      <fieldset>
        <legend>Fonte de cópias</legend>
        <label className="mapa-menu-linha">
          <span>Este token é uma fonte</span>
          <input
            type="checkbox"
            checked={Boolean(fonte)}
            disabled={ocupado}
            onChange={(evento) => void fazer(() => mapaApi.configurarFonte(campanhaId, token.id, { ativa: evento.target.checked, limite: null }))}
          />
        </label>
        {fonte && (
          <>
            <label className="mapa-menu-linha">
              <span>Limite de cópias</span>
              <input
                type="number"
                min={1}
                max={200}
                inputMode="numeric"
                placeholder="sem limite"
                value={limite}
                disabled={ocupado}
                onChange={(evento) => setLimite(evento.target.value)}
                onBlur={guardarLimite}
                onKeyDown={(evento) => { if (evento.key === 'Enter') (evento.target as HTMLInputElement).blur(); }}
              />
            </label>
            <p className="mapa-formas-contagem">{textoDaFonte(fonte)}</p>
            {fonte.usados > 0 && (
              <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => void fazer(() => mapaApi.configurarFonte(campanhaId, token.id, { ativa: true, limite: fonte.limite, reiniciar: true }))}>
                <RotateCcw size={13} /> Recarregar a fonte
              </button>
            )}
          </>
        )}
        <p className="mapa-dica">Arraste a fonte e solte onde quiser: uma cópia numerada fica lá e a fonte volta para o lugar. Com Shift apertado, ela se move de verdade.</p>
      </fieldset>
    </div>
  );
};
