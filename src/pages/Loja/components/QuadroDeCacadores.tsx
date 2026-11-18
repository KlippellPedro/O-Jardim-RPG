import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Crosshair, Plus, RotateCcw, Skull } from 'lucide-react';
import { procuradosApi, separarQuadro, type IProcurado } from '../../../services/procuradosApi';
import type { Recompensa } from '../../../services/bountiesApi';
import { CartazProcurado } from './CartazProcurado';
import { DetalheDoProcurado } from './DetalheDoProcurado';
import { EditorDeProcurado } from './EditorDeProcurado';

interface PersonagemSimples {
  id: string;
  nome: string;
}

interface QuadroDeCacadoresProps {
  campanhaId: string;
  gestor: boolean;
  personagemAtivo: PersonagemSimples | undefined;
  personagensDaCampanha: PersonagemSimples[];
  /** Recompensas entre jogadores (vêm do Banqueiro, no Discord). */
  recompensas: Recompensa[];
  onReivindicar: (recompensa: Recompensa) => void;
  onEconomiaMudou: () => void;
  /** Quantos cartazes abertos há no quadro, para o contador da aba. */
  onContagem?: (abertos: number) => void;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

// O quadro de cortiça da Guilda dos Caçadores. O Mestre prega e edita os
// cartazes; o jogador abre um cartaz e aceita o contrato com o personagem
// escolhido no topo da Loja.
export const QuadroDeCacadores: React.FC<QuadroDeCacadoresProps> = ({
  campanhaId, gestor, personagemAtivo, personagensDaCampanha, recompensas, onReivindicar, onEconomiaMudou, onContagem,
}) => {
  const [cartazes, setCartazes] = useState<IProcurado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [editando, setEditando] = useState<IProcurado | 'novo' | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);
    procuradosApi.listar(campanhaId, controller.signal)
      .then((resposta) => setCartazes(resposta.procurados))
      .catch((falha: unknown) => {
        if (!isAbortError(falha)) setErro(falha instanceof Error ? falha.message : 'Não foi possível abrir o quadro.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false);
      });
    return () => controller.abort();
  }, [campanhaId, recarregar]);

  const { abertos, encerrados, rascunhos } = useMemo(() => separarQuadro(cartazes), [cartazes]);
  useEffect(() => { onContagem?.(abertos.length); }, [abertos.length, onContagem]);

  const atualizar = useCallback((novo: IProcurado) => {
    setCartazes((lista) => (lista.some((item) => item.id === novo.id)
      ? lista.map((item) => (item.id === novo.id ? novo : item))
      : [novo, ...lista]));
  }, []);

  const aberto = abertoId ? cartazes.find((item) => item.id === abertoId) ?? null : null;

  const grade = (lista: IProcurado[], deslocamento = 0) => (
    <div className="quadro__grade">
      {lista.map((cartaz, indice) => (
        <CartazProcurado key={cartaz.id} procurado={cartaz} indice={indice + deslocamento} onAbrir={() => setAbertoId(cartaz.id)} />
      ))}
    </div>
  );

  return (
    <section className="quadro" aria-labelledby="quadro-titulo" data-tour="loja-recompensas">
      <header className="quadro__cabeca">
        <div className="quadro__placa">
          <span className="loja-eyebrow">Guilda dos Caçadores</span>
          <h2 id="quadro-titulo">Quadro de Procurados</h2>
          <p>Seres que alguém quer ver presos ou mortos. Abra um cartaz para ler o contrato e entrar na caçada.</p>
        </div>
        {gestor ? (
          <button type="button" className="loja-botao" onClick={() => setEditando('novo')}>
            <Plus size={16} /> Pregar cartaz
          </button>
        ) : null}
      </header>

      {erro ? (
        <div role="alert" className="loja-alerta">
          {erro}
          <button type="button" className="loja-botao loja-botao--fantasma" onClick={() => setRecarregar((n) => n + 1)}><RotateCcw size={14} /> Tentar de novo</button>
        </div>
      ) : null}

      {carregando && !cartazes.length ? (
        <div className="quadro__grade" aria-busy="true">
          {[0, 1, 2].map((n) => <div key={n} className="cartaz cartaz--esqueleto"><div className="cartaz__papel wanted-poster" /></div>)}
        </div>
      ) : null}

      {!carregando && !erro && !abertos.length && !rascunhos.length && !encerrados.length && !recompensas.length ? (
        <div className="quadro__vazio">
          <Crosshair size={34} aria-hidden="true" />
          <strong>O quadro está vazio</strong>
          <p>{gestor ? 'Pregue o primeiro cartaz: escolha uma imagem do acervo, o nome do ser e a recompensa.' : 'Nenhum ser procurado por aqui. Volte depois que o Mestre pregar algum cartaz.'}</p>
        </div>
      ) : null}

      {abertos.length ? grade(abertos) : null}

      {gestor && rascunhos.length ? (
        <div className="quadro__secao">
          <h3>Rascunhos <small>só quem comanda a mesa vê</small></h3>
          {grade(rascunhos, abertos.length)}
        </div>
      ) : null}

      {recompensas.length ? (
        <div className="quadro__secao">
          <h3>Procurados entre os jogadores <small>recompensas abertas no Banco Lunar</small></h3>
          <div className="quadro__grade">
            {recompensas.map((recompensa, indice) => (
              <div key={recompensa.personagem_id} className="cartaz cartaz--jogador" style={{ '--inclinacao': `${indice % 2 ? 1.2 : -1.2}deg` } as React.CSSProperties}>
                <div className="cartaz__papel wanted-poster">
                  <div aria-hidden="true" className="wanted-poster-scratches cartaz__arranhoes" />
                  <header className="cartaz__cabeca">
                    <span className="cartaz__titulo">Procurado</span>
                    <span className="cartaz__condicao">{recompensa.origem_sistema ? 'Dívida com o Banco Lunar' : 'Marcado por caçadores'}</span>
                  </header>
                  <div className="cartaz__retrato cartaz__retrato--vazio"><Skull size={34} aria-hidden="true" /></div>
                  <h3 className="cartaz__nome">{recompensa.personagem_nome}</h3>
                  <div className="cartaz__recompensa">
                    <small>Recompensa</small>
                    <strong>{recompensa.valor_total.toLocaleString('pt-BR')} Lunaris</strong>
                  </div>
                  <button type="button" className="cartaz__botao" onClick={() => onReivindicar(recompensa)}>Reivindicar</button>
                </div>
                <span className="cartaz__prego" aria-hidden="true" />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {encerrados.length ? (
        <details className="quadro__secao quadro__encerrados" open={encerrados.length <= 3}>
          <summary>Caçadas encerradas ({encerrados.length})</summary>
          {grade(encerrados, abertos.length + rascunhos.length)}
        </details>
      ) : null}

      <AnimatePresence>
        {aberto && !editando ? (
          <DetalheDoProcurado
            key={aberto.id}
            campanhaId={campanhaId}
            procurado={aberto}
            gestor={gestor}
            personagemAtivo={personagemAtivo}
            personagensDaCampanha={personagensDaCampanha}
            onFechar={() => setAbertoId(null)}
            onAtualizado={atualizar}
            onEditar={() => setEditando(aberto)}
            onEconomiaMudou={onEconomiaMudou}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {editando ? (
          <EditorDeProcurado
            key={editando === 'novo' ? 'novo' : editando.id}
            campanhaId={campanhaId}
            procurado={editando === 'novo' ? null : editando}
            onFechar={() => setEditando(null)}
            onSalvo={(salvo) => {
              atualizar(salvo);
              setEditando(null);
              setAbertoId(salvo.id);
            }}
            onApagado={(id) => {
              setCartazes((lista) => lista.filter((item) => item.id !== id));
              setEditando(null);
              setAbertoId(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
};
