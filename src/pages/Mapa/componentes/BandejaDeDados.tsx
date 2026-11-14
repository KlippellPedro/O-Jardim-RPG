import { useEffect, useState } from 'react';
import { Dices, Eye, EyeOff, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { registrosApi, type IRegistro } from '../../../services/registrosApi';
import { avisar } from '../../../components/avisos/avisos';
import { FACES_DA_BANDEJA, LIMITE_DA_FORMULA, acrescentarDado, ajustarModificador, formulaValida, limparFormula, resumoDaRolagem, testeDeD20 } from './dadosConta';

/** A última fórmula usada neste aparelho. */
const CHAVE_DADOS_LOCAL = 'jardim.mapa.dados';
/** Se a pessoa quer que a mesa veja os dados dela: jogador começa mostrando, o Mestre começa rolando só para si. */
const CHAVE_DADOS_MESA = 'jardim.mapa.dados.mesa';
type Modo = 'normal' | 'vantagem' | 'desvantagem';

function lerFormulaLocal(): string {
  try {
    const salva = window.localStorage.getItem(CHAVE_DADOS_LOCAL);
    if (salva && formulaValida(salva)) return limparFormula(salva);
  } catch {
    // Sem armazenamento do navegador: começa no d20.
  }
  return '1d20';
}

function lerMostrarLocal(gestor: boolean): boolean {
  try {
    const salvo = window.localStorage.getItem(CHAVE_DADOS_MESA);
    if (salvo === '1') return true;
    if (salvo === '0') return false;
  } catch {
    // Sem armazenamento do navegador: vale o padrão do papel.
  }
  return !gestor;
}

interface Props {
  campanhaId: string;
  /** O Mestre começa rolando só para si; o jogador, mostrando à mesa. */
  gestor: boolean;
  /** O personagem em nome de quem o jogador rola; o Mestre rola com o próprio nome. */
  personagemId: string | null;
  /** Como o nome aparece nas Rolagens. */
  nomeDeQuem: string;
  /** Rolou mostrando à mesa: a página faz o resultado subir sobre o token de quem rolou. */
  onRolou?: (registro: IRegistro) => void;
  onFechar: () => void;
}

/**
 * A bandeja de dados do mapa (tecla D): monta a fórmula clicando nos dados ou escrevendo, e rola sem sair da
 * tela. O sorteio é do servidor e o resultado entra nas Rolagens da mesa, como o da ficha.
 */
export const BandejaDeDados = ({ campanhaId, gestor, personagemId, nomeDeQuem, onRolou, onFechar }: Props) => {
  const [formula, setFormula] = useState(lerFormulaLocal);
  const [motivo, setMotivo] = useState('');
  const [modo, setModo] = useState<Modo>('normal');
  const [ocupado, setOcupado] = useState(false);
  const [ultimas, setUltimas] = useState<IRegistro[]>([]);
  const [mostrar, setMostrar] = useState(() => lerMostrarLocal(gestor));

  const alternarMostrar = () => {
    const proximo = !mostrar;
    setMostrar(proximo);
    try {
      window.localStorage.setItem(CHAVE_DADOS_MESA, proximo ? '1' : '0');
    } catch {
      // Sem armazenamento do navegador, a escolha vale até fechar a aba.
    }
  };

  const valida = formulaValida(formula);
  const teste = valida ? testeDeD20(formula) : null;

  useEffect(() => {
    if (!teste && modo !== 'normal') setModo('normal');
  }, [teste, modo]);

  const rolar = async () => {
    if (!valida || ocupado) return;
    const limpa = limparFormula(formula);
    const titulo = motivo.trim() || 'Rolagem no mapa';
    setOcupado(true);
    try {
      const { registro } = await registrosApi.rolar(teste
        ? { campanhaId, personagemId, titulo, bonus: teste.bonus, vantagens: modo === 'vantagem' ? 1 : 0, desvantagens: modo === 'desvantagem' ? 1 : 0, origem: { tela: 'mapa' }, publica: mostrar }
        : { campanhaId, personagemId, titulo, formula: limpa, origem: { tela: 'mapa' }, publica: mostrar });
      setUltimas((antes) => [registro, ...antes].slice(0, 5));
      if (mostrar) onRolou?.(registro);
      try {
        window.localStorage.setItem(CHAVE_DADOS_LOCAL, limpa);
      } catch {
        // Sem armazenamento do navegador, a fórmula vale só até fechar a aba.
      }
    } catch (falha) {
      avisar.erro(falha instanceof Error ? falha.message : 'Não deu para rolar agora.');
    } finally {
      setOcupado(false);
    }
  };

  const aoTeclar = (evento: React.KeyboardEvent) => {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      onFechar();
    } else if (evento.key === 'Enter' && (evento.target as HTMLElement).tagName === 'INPUT') {
      evento.preventDefault();
      void rolar();
    }
  };

  return (
    <section className="mapa-dados" aria-label="Dados" onKeyDown={aoTeclar}>
      <header>
        <strong><Dices size={16} /> Dados</strong>
        <small>Rola como {nomeDeQuem}</small>
        <button type="button" className="mapa-icone" aria-label="Fechar os dados" onClick={onFechar}><X size={16} /></button>
      </header>
      <div className="mapa-dados-faces" role="group" aria-label="Acrescentar um dado">
        {FACES_DA_BANDEJA.map((faces) => (
          <button key={faces} type="button" aria-label={`Mais um d${faces}`} onClick={() => setFormula((atual) => acrescentarDado(formulaValida(atual) ? atual : '', faces))}>
            d{faces}
          </button>
        ))}
        <button type="button" className="limpar" aria-label="Começar a fórmula de novo" title="Começar de novo" onClick={() => setFormula('')}><RotateCcw size={13} /></button>
      </div>
      <div className="mapa-dados-formula">
        <button type="button" aria-label="Menos 1 no modificador" disabled={!valida} onClick={() => setFormula((atual) => ajustarModificador(atual, -1))}><Minus size={14} /></button>
        <input
          autoFocus
          value={formula}
          maxLength={LIMITE_DA_FORMULA}
          spellCheck={false}
          placeholder="2d6+3"
          aria-label="Fórmula dos dados"
          aria-invalid={Boolean(formula) && !valida}
          onChange={(evento) => setFormula(evento.target.value)}
        />
        <button type="button" aria-label="Mais 1 no modificador" disabled={!valida} onClick={() => setFormula((atual) => ajustarModificador(atual, 1))}><Plus size={14} /></button>
      </div>
      {teste && (
        <div className="mapa-dados-modo" role="radiogroup" aria-label="Como rolar o d20">
          {(['normal', 'vantagem', 'desvantagem'] as Modo[]).map((opcao) => (
            <button key={opcao} type="button" role="radio" aria-checked={modo === opcao} className={modo === opcao ? 'ativo' : ''} onClick={() => setModo(opcao)}>
              {opcao === 'normal' ? 'Normal' : opcao === 'vantagem' ? 'Vantagem' : 'Desvantagem'}
            </button>
          ))}
        </div>
      )}
      <input className="mapa-dados-motivo" value={motivo} maxLength={80} placeholder="Para quê? (opcional)" aria-label="Motivo da rolagem" onChange={(evento) => setMotivo(evento.target.value)} />
      <button
        type="button"
        role="switch"
        aria-checked={mostrar}
        className={`mapa-dados-mesa${mostrar ? ' ativo' : ''}`}
        title={mostrar ? 'A mesa vê os dados caírem e o total. A DT e o resultado do teste ficam com o Mestre.' : 'Só você vê este dado e o resultado.'}
        onClick={alternarMostrar}
      >
        {mostrar ? <Eye size={14} /> : <EyeOff size={14} />} {mostrar ? 'A mesa vê o dado' : 'Só eu vejo o dado'}
      </button>
      <button type="button" className="mapa-dados-rolar" disabled={!valida || ocupado} onClick={() => void rolar()}>
        <Dices size={15} /> {ocupado ? 'Rolando...' : valida ? `Rolar ${limparFormula(formula)}` : 'Escolha um dado'}
      </button>
      {Boolean(formula) && !valida && <p className="mapa-dados-ajuda">Escreva como 2d6+3, 1d20+1d4-2 ou 2#d20 (duas rolagens separadas).</p>}
      {ultimas.length > 0 && (
        <ul className="mapa-dados-ultimas" aria-label="Suas últimas rolagens aqui">
          {ultimas.map((registro) => (
            <li key={registro.id}>
              <button type="button" title="Usar esta fórmula de novo" onClick={() => formulaValida(registro.formula) && setFormula(limparFormula(registro.formula))}>
                <span>{registro.formula}</span>
                <strong>{resumoDaRolagem(registro)}</strong>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
