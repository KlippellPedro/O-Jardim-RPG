import { useCallback, useEffect, useState } from 'react';
import { Dices, Lock, LockOpen, Package, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import {
  mapaApi, type IEdicaoRecipiente, type IEstadoMapa, type IPredefinicaoRecipiente, type ITokenMapa,
} from '../../../services/mapaApi';
import type { TabelaDeLoot, TabelaDeLootPayload } from '../../../services/sessaoApi';
import { EditorLootCampanha } from '../../Sessao/components/EditorLootCampanha';
import { confirmar } from '../../../components/avisos/confirmacao';
import './recipientes.css';

interface Props {
  campanhaId: string;
  token: ITokenMapa;
  /** O servidor devolve o estado do mapa depois de cada mudança; a página o aplica para o token se atualizar. */
  onEstado: (estado: IEstadoMapa) => void;
}

/**
 * A aba Loot do token (só o Mestre): transforma o token em baú, caixote ou bolsa. A predefinição sorteia itens do catálogo
 * com a chance de cada um; depois dá para ajustar linha a linha. Os jogadores só veem o que saiu, depois de abrir.
 */
export const LootDoRecipiente = ({ campanhaId, token, onEstado }: Props) => {
  const recipiente = token.recipiente ?? null;
  const [predefinicoes, setPredefinicoes] = useState<IPredefinicaoRecipiente[]>([]);
  const [tabela, setTabela] = useState<TabelaDeLoot | null>(null);
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rotulo, setRotulo] = useState(recipiente?.rotulo ?? '');

  useEffect(() => {
    let vivo = true;
    void mapaApi.predefinicoesDeRecipiente(campanhaId).then((r) => { if (vivo) setPredefinicoes(r.predefinicoes); }).catch(() => undefined);
    return () => { vivo = false; };
  }, [campanhaId]);

  const temRecipiente = Boolean(recipiente);
  useEffect(() => {
    setEditando(false);
    setErro(null);
    if (!temRecipiente) {
      setTabela(null);
      return;
    }
    let vivo = true;
    void mapaApi.lerRecipiente(campanhaId, token.id)
      .then((r) => { if (vivo) setTabela(r.tabela); })
      .catch((falha) => { if (vivo) setErro(falha instanceof Error ? falha.message : 'Não deu para ler a tabela.'); });
    return () => { vivo = false; };
  }, [campanhaId, token.id, temRecipiente]);

  useEffect(() => setRotulo(recipiente?.rotulo ?? ''), [recipiente?.rotulo, token.id]);

  const aplicar = useCallback(async (dados: IEdicaoRecipiente) => {
    setOcupado(true);
    setErro(null);
    try {
      const resposta = await mapaApi.configurarRecipiente(campanhaId, token.id, dados);
      setTabela(resposta.recipiente_tabela);
      onEstado(resposta);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Algo não deu certo.');
    } finally {
      setOcupado(false);
    }
  }, [campanhaId, token.id, onEstado]);

  const salvarTabela = async (payload: TabelaDeLootPayload): Promise<TabelaDeLoot> => {
    const resposta = await mapaApi.configurarRecipiente(campanhaId, token.id, { tabela: payload });
    onEstado(resposta);
    if (!resposta.recipiente_tabela) throw new Error('O servidor não devolveu a tabela.');
    return resposta.recipiente_tabela;
  };

  if (!recipiente) {
    return (
      <div className="recipiente-aba">
        <p className="mapa-dica">Faça deste token um baú, caixote ou bolsa. Escolha uma predefinição: ela sorteia os itens e a chance de cada um, e você ajusta depois.</p>
        <ul className="recipiente-predefinicoes">
          {predefinicoes.map((p) => (
            <li key={p.id}>
              <button type="button" disabled={ocupado} onClick={() => void aplicar({ predefinicao: p.id })}>
                <Package size={14} aria-hidden="true" />
                <span><strong>{p.rotulo}</strong><small>{p.descricao}</small></span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => void aplicar({ rotulo: 'Recipiente', tabela: { itens: [], moedas: null } })}>
          Montar a tabela à mão
        </button>
        {erro && <p className="recipiente-erro" role="alert">{erro}</p>}
      </div>
    );
  }

  const salvarRotulo = () => {
    const limpo = rotulo.trim();
    if (limpo && limpo !== recipiente.rotulo) void aplicar({ rotulo: limpo });
    else setRotulo(recipiente.rotulo);
  };

  return (
    <div className="recipiente-aba">
      <label className="mapa-menu-linha">
        Nome
        <input type="text" value={rotulo} maxLength={40} onChange={(e) => setRotulo(e.target.value)} onBlur={salvarRotulo} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
      </label>

      <div className="recipiente-estado">
        <span className={recipiente.aberto ? 'aberto' : ''}>
          {recipiente.aberto ? `Aberto${recipiente.aberto_por ? ` por ${recipiente.aberto_por}` : ''}` : 'Fechado'}
        </span>
        <button type="button" className={`mapa-botao-leve${recipiente.trancado ? ' ativo' : ''}`} aria-pressed={recipiente.trancado} disabled={ocupado} onClick={() => void aplicar({ trancado: !recipiente.trancado })}>
          {recipiente.trancado ? <><Lock size={13} /> Trancado</> : <><LockOpen size={13} /> Destrancado</>}
        </button>
      </div>

      {recipiente.aberto && (
        <div className="recipiente-saiu">
          <strong>O que saiu</strong>
          {recipiente.linhas.length ? (
            <ul>
              {recipiente.linhas.map((linha) => (
                <li key={linha.linha} className={linha.entregue_para ? 'pego' : ''}>
                  <span>{linha.quantidade}x {linha.titulo}</span>
                  <small>{linha.entregue_para ? `pego por ${linha.entregue_para}` : `d100 ${linha.rolagem ?? '?'} (${linha.chance ?? '?'}%)`}</small>
                </li>
              ))}
            </ul>
          ) : <p className="mapa-dica">Nenhuma chance caiu: o baú estava vazio.</p>}
        </div>
      )}

      <div className="recipiente-acoes">
        {recipiente.predefinicao && (
          <button type="button" className="mapa-botao-leve" disabled={ocupado} title="Sorteia outros itens da mesma predefinição e fecha o baú de novo" onClick={() => void aplicar({ predefinicao: recipiente.predefinicao ?? undefined })}>
            <Dices size={13} /> Sortear de novo
          </button>
        )}
        <button type="button" className="mapa-botao-leve" disabled={ocupado || !recipiente.aberto} title="Fecha o baú e esquece o que tinha saído: a próxima abertura rola outra vez" onClick={() => void aplicar({ reiniciar: true })}>
          <RotateCcw size={13} /> Fechar e rolar de novo
        </button>
        <button type="button" className="mapa-botao-leve" disabled={ocupado} onClick={() => setEditando((v) => !v)} aria-pressed={editando}>
          <Pencil size={13} /> {editando ? 'Fechar edição' : 'Editar tabela'}
        </button>
        <button
          type="button"
          className="mapa-botao-leve perigo"
          disabled={ocupado}
          onClick={async () => {
            if (await confirmar({ mensagem: 'Tirar o loot deste token? Ele volta a ser um token comum.', rotuloConfirmar: 'Tirar', tom: 'perigo' })) void aplicar({ remover: true });
          }}
        >
          <Trash2 size={13} /> Tirar o loot
        </button>
      </div>

      {predefinicoes.length > 0 && (
        <label className="mapa-menu-linha">
          Trocar predefinição
          <select value="" disabled={ocupado} onChange={(e) => { if (e.target.value) void aplicar({ predefinicao: e.target.value }); }}>
            <option value="">Escolher…</option>
            {predefinicoes.map((p) => <option key={p.id} value={p.id}>{p.rotulo}</option>)}
          </select>
        </label>
      )}

      {editando && tabela ? (
        <EditorLootCampanha
          tabela={tabela}
          aoSalvar={salvarTabela}
          onSalvo={(nova) => { setTabela(nova); setEditando(false); }}
          onCancelar={() => setEditando(false)}
          dica="Cada linha rola a própria chance quando alguém abre. Quantidade aceita número fixo (2) ou dados (1d4). Mexer na tabela não fecha o baú que já foi aberto."
          rotuloSalvar="Salvar a tabela"
        />
      ) : tabela ? (
        <div className="recipiente-tabela">
          <strong>Pode ter</strong>
          {tabela.moedas && <p><small>{tabela.moedas.chance}%</small> {tabela.moedas.dados} {tabela.moedas.moeda}</p>}
          {tabela.itens.length ? (
            <ul>
              {tabela.itens.map((item) => (
                <li key={item.item_id}><small>{item.chance}%</small> <span>{item.quantidade === '1' ? '' : `${item.quantidade} × `}{item.titulo}</span></li>
              ))}
            </ul>
          ) : !tabela.moedas && <p className="mapa-dica">A tabela está vazia. Use Editar tabela para acrescentar itens.</p>}
        </div>
      ) : null}
      {erro && <p className="recipiente-erro" role="alert">{erro}</p>}
    </div>
  );
};
