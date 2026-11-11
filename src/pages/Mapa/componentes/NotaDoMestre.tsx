import { useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { NOTA_MAXIMA } from '../motor/notasDoMestre';
import './notaDoMestre.css';

interface Props {
  /** O texto que o servidor tem agora. */
  valor: string;
  /** Guarda o texto. Quem chama prende o id do token, da cena ou do mapa na função: ela também roda ao fechar a caixa. */
  onSalvar: (texto: string) => void;
  rotulo?: string;
  placeholder?: string;
  linhas?: number;
}

/** Quanto tempo depois da última tecla a nota é guardada. */
const ESPERA_MS = 700;

/**
 * A nota que só o Mestre vê (token, cena ou mapa colocado). Guarda sozinha pouco depois de parar de digitar, ao
 * sair da caixa e ao fechar o painel. Enquanto a pessoa digita, o que chega do servidor não mexe no texto: ele só
 * entra quando não há nada por salvar nem a caixa está em uso. Esta caixa nunca aparece para jogador (o servidor
 * nem manda o texto); quem a monta só precisa chamá-la no que é do Mestre.
 */
export const NotaDoMestre = ({ valor, onSalvar, rotulo = 'Nota do Mestre', placeholder = 'Descrição, lembretes, segredos…', linhas = 5 }: Props) => {
  const [texto, setTexto] = useState(valor);
  /** O que está na caixa agora (para o que roda fora de uma renderização). */
  const atual = useRef(valor);
  /** O último texto mandado ao servidor ou recebido dele. */
  const enviado = useRef(valor);
  const espera = useRef<number | null>(null);
  const emUso = useRef(false);
  const salvar = useRef(onSalvar);
  salvar.current = onSalvar;

  const enviar = () => {
    if (espera.current !== null) {
      window.clearTimeout(espera.current);
      espera.current = null;
    }
    if (atual.current === enviado.current) return;
    enviado.current = atual.current;
    salvar.current(atual.current);
  };

  useEffect(() => {
    if (emUso.current || espera.current !== null || atual.current !== enviado.current) return;
    enviado.current = valor;
    atual.current = valor;
    setTexto(valor);
  }, [valor]);

  // Fechar o painel (ou trocar de token) com texto por guardar: guarda antes de sair.
  useEffect(() => () => enviar(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (novo: string) => {
    setTexto(novo);
    atual.current = novo;
    if (espera.current !== null) window.clearTimeout(espera.current);
    espera.current = window.setTimeout(() => {
      espera.current = null;
      enviar();
    }, ESPERA_MS);
  };

  const perto = texto.length >= NOTA_MAXIMA * 0.9;

  return (
    <section className="mapa-nota-mestre" aria-label={rotulo}>
      <label>
        <span className="mapa-nota-mestre-rotulo"><Lock size={12} aria-hidden="true" /> {rotulo}</span>
        <textarea
          value={texto}
          rows={linhas}
          maxLength={NOTA_MAXIMA}
          placeholder={placeholder}
          spellCheck
          onFocus={() => { emUso.current = true; }}
          onBlur={() => { emUso.current = false; enviar(); }}
          onChange={(e) => mudar(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') e.currentTarget.blur(); }}
        />
      </label>
      <small className={perto ? 'cheia' : ''}>
        {perto ? `${texto.length} de ${NOTA_MAXIMA} caracteres. ` : ''}Só você vê. Guarda sozinha.
      </small>
    </section>
  );
};
