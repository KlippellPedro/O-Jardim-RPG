import { useEffect, useState } from 'react';
import { Eye, EyeOff, FlipHorizontal2, Lock, Minus, MessageSquareQuote, Package, Plus, SlidersHorizontal, StickyNote, Trash2 } from 'lucide-react';
import type { IBarraToken, ITokenMapa, TipoBarra } from '../../../services/mapaApi';
import { resumoDaNota, temNota } from '../motor/notasDoMestre';
import { CORES_BARRA_PADRAO } from '../motor/barrasToken';
import { ComDica } from './BotaoFerramenta';
import { EstadosDoToken, type AcoesDeEstado } from './EstadosDoToken';
import './mapasColocados.css';

export type MudancaDeRecurso = { delta?: number; atual?: number };

interface Props {
  token: ITokenMapa;
  gestor: boolean;
  /** O painel de opções (abas Geral, Barras, Visual, Luz e aura) está aberto. */
  opcoesAbertas: boolean;
  onOpcoes: () => void;
  /** Só o Mestre: abre as opções na aba Geral, onde mora a nota. */
  onNota?: () => void;
  onOculto: () => void;
  onRemover: () => void;
  /** Só o Mestre: falar como este token (a mesa vê a fala com o retrato). */
  onFalar?: () => void;
  /** Dono do personagem (e o Mestre): muda Vida, Mana, Estamina ou Sanidade direto na barra do token. */
  onRecurso?: (tipo: TipoBarra, mudanca: MudancaDeRecurso) => void;
  /** O token é um baú, caixote ou bolsa: abre (ou mostra de novo) o que ele guarda. */
  onRecipiente?: () => void;
  /** Só o Mestre: abre a aba Loot, onde se prepara o recipiente (também serve para tornar o token um). */
  onLoot?: () => void;
  /** O Mestre põe e tira condições e aflições pelo token; nulo quando o token não está ligado a um participante da Sessão. */
  acoesDeEstado?: AcoesDeEstado | null;
  /** Vira o token de lado (espelha na horizontal). O dono e o Mestre usam. */
  onEspelhar?: () => void;
}

const ROTULOS: Record<TipoBarra, string> = { vida: 'Vida', mana: 'Mana', estamina: 'Estamina', sanidade: 'Sanidade' };
const ORDEM: TipoBarra[] = ['vida', 'mana', 'estamina', 'sanidade'];

/** Uma linha do painel: − e + andam de 1 em 1 (Shift anda de 5 em 5); o número do meio também se escreve. */
const LinhaRecurso = ({ barra, onMudar }: { barra: IBarraToken; onMudar: (mudanca: MudancaDeRecurso) => void }) => {
  const atual = barra.atual ?? 0;
  const maximo = barra.maximo ?? 0;
  const [texto, setTexto] = useState(String(atual));
  const [editando, setEditando] = useState(false);
  // Enquanto a pessoa digita o número fica dela; fora disso segue o que o servidor mandou (inclusive mudanças de outra tela).
  useEffect(() => {
    if (!editando) setTexto(String(atual));
  }, [atual, editando]);

  const confirmar = () => {
    setEditando(false);
    const valor = Number(texto.trim().replace(',', '.'));
    if (!texto.trim() || !Number.isFinite(valor)) {
      setTexto(String(atual));
      return;
    }
    const arredondado = Math.round(valor);
    if (arredondado === atual) {
      setTexto(String(atual));
      return;
    }
    onMudar({ atual: arredondado });
  };

  const passo = (sinal: 1 | -1, evento: { shiftKey: boolean }) => onMudar({ delta: sinal * (evento.shiftKey ? 5 : 1) });

  return (
    <li className={`mapa-recurso-linha barra-${barra.tipo}`} style={{ ['--cor-recurso' as string]: CORES_BARRA_PADRAO[barra.tipo] }}>
      <span className="mapa-recurso-nome">{ROTULOS[barra.tipo]}</span>
      <button type="button" className="mapa-recurso-botao" aria-label={`Tirar 1 de ${ROTULOS[barra.tipo]} (Shift tira 5)`} onClick={(e) => passo(-1, e)}>
        <Minus size={14} />
      </button>
      <input
        className="mapa-recurso-valor"
        inputMode="numeric"
        aria-label={`${ROTULOS[barra.tipo]} atual`}
        value={texto}
        onFocus={(e) => { setEditando(true); e.currentTarget.select(); }}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') { setTexto(String(atual)); setEditando(false); e.currentTarget.blur(); }
        }}
      />
      <span className="mapa-recurso-maximo">/ {maximo}</span>
      <button type="button" className="mapa-recurso-botao" aria-label={`Somar 1 em ${ROTULOS[barra.tipo]} (Shift soma 5)`} onClick={(e) => passo(1, e)}>
        <Plus size={14} />
      </button>
    </li>
  );
};

/**
 * A barra colada no token escolhido (ver BarraAncorada): o que se faz toda hora fica a um clique, e o painel
 * de opções só abre quando se pede, em vez de cobrir a direita do mapa a cada token escolhido.
 */
export const BarraToken = ({ token, gestor, opcoesAbertas, onOpcoes, onNota, onOculto, onRemover, onFalar, onRecurso, onRecipiente, onLoot, acoesDeEstado = null, onEspelhar }: Props) => {
  const principal = token.barras[0];
  // Só mexe pela barra quem manda no personagem e só nos recursos que chegam com número (o degrau parcial mostra só o estado).
  const podeMexer = Boolean(onRecurso && token.personagem_id && (token.e_meu || gestor));
  const editaveis = podeMexer
    ? ORDEM.flatMap((tipo) => token.barras.filter((b) => b.tipo === tipo && b.maximo !== undefined && b.atual !== undefined))
    : [];
  return (
    <section className="mapa-barra-mapa mapa-barra-token" aria-label={`Token ${token.nome}`}>
      <div className="mapa-barra-mapa-linha">
        <strong className="mapa-barra-mapa-nome" title={token.nome}>{token.nome}</strong>
        {principal?.maximo ? <span className="mapa-barra-token-numero">{principal.atual}/{principal.maximo}</span> : null}
        {gestor && (
          <ComDica lado="cima" dica={token.oculto ? 'Escondido dos jogadores. Clique para mostrar.' : 'Visível para os jogadores. Clique para esconder.'}>
            <button type="button" className={token.oculto ? 'ativo' : ''} aria-pressed={Boolean(token.oculto)} aria-label={token.oculto ? 'Mostrar aos jogadores' : 'Esconder dos jogadores'} onClick={onOculto}>
              {token.oculto ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </ComDica>
        )}
        {gestor && onFalar && (
          <ComDica lado="cima" dica={`Falar como ${token.nome || 'este token'}`}>
            <button type="button" aria-label={`Falar como ${token.nome || 'este token'}`} onClick={onFalar}><MessageSquareQuote size={18} /></button>
          </ComDica>
        )}
        {gestor && onNota && temNota(token.nota_mestre) && (
          <ComDica lado="cima" dica={`Nota do Mestre: ${resumoDaNota(token.nota_mestre)}`}>
            <button type="button" className="ativo" aria-label="Ler a nota do Mestre deste token" onClick={onNota}><StickyNote size={18} /></button>
          </ComDica>
        )}
        {onEspelhar && (gestor || token.e_meu) && (
          <ComDica lado="cima" dica={token.flip_x ? 'Virar para o lado de antes' : 'Virar o token para o outro lado'}>
            <button type="button" className={token.flip_x ? 'ativo' : ''} aria-pressed={Boolean(token.flip_x)} aria-label="Virar o token para o outro lado" onClick={onEspelhar}>
              <FlipHorizontal2 size={18} />
            </button>
          </ComDica>
        )}
        {token.recipiente && onRecipiente && (
          <ComDica lado="cima" dica={token.recipiente.trancado && !gestor ? `${token.recipiente.rotulo}: trancado` : token.recipiente.aberto ? `Ver o que saiu de ${token.recipiente.rotulo}` : `Abrir ${token.recipiente.rotulo}`}>
            <button type="button" className={token.recipiente.aberto ? 'ativo' : ''} aria-label={`${token.recipiente.aberto ? 'Ver' : 'Abrir'} ${token.recipiente.rotulo}`} onClick={onRecipiente}>
              {token.recipiente.trancado && !gestor ? <Lock size={18} /> : <Package size={18} />}
            </button>
          </ComDica>
        )}
        {gestor && onLoot && !token.recipiente && (
          <ComDica lado="cima" dica="Transformar em baú: o que tem dentro e a chance de cada item">
            <button type="button" aria-label="Transformar este token em baú" onClick={onLoot}><Package size={18} /></button>
          </ComDica>
        )}
        <ComDica lado="cima" dica="Opções do token: barras, visual, luz, aura e a nota do Mestre">
          <button type="button" className={opcoesAbertas ? 'ativo' : ''} aria-pressed={opcoesAbertas} aria-label="Opções do token" onClick={onOpcoes}>
            <SlidersHorizontal size={18} />
          </button>
        </ComDica>
        {gestor && (
          <ComDica lado="cima" dica="Tirar do mapa">
            <button type="button" className="perigo" aria-label="Tirar o token do mapa" onClick={onRemover}><Trash2 size={18} /></button>
          </ComDica>
        )}
      </div>
      <EstadosDoToken token={token} acoes={acoesDeEstado} />
      {editaveis.length > 0 && onRecurso && (
        <ul className="mapa-recursos-token" aria-label={`Recursos de ${token.nome}`}>
          {editaveis.map((barra) => (
            <LinhaRecurso key={`${token.id}-${barra.tipo}`} barra={barra} onMudar={(mudanca) => onRecurso(barra.tipo, mudanca)} />
          ))}
        </ul>
      )}
    </section>
  );
};
