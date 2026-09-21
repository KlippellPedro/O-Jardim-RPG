import { useEffect, useRef, useState } from 'react';
import { dispararMoedas } from './chuvaMoedas';
import { useNumeroAnimado } from './numeroAnimado';

const CARENCIA_MONTAGEM_MS = 900;

interface SaldoAnimadoProps {
  moeda: string;
  saldo: number;
  onChange: (valor: number) => void;
  className?: string;
  'aria-label'?: string;
}

/** Campo do saldo de uma moeda. Quando o saldo muda por fora (botões, compra,
 * pagamento), o número rola até o valor novo e caem moedas: chuva ao ganhar,
 * jorro ao gastar. Digitar direto no campo não dispara nada. */
export const SaldoAnimado = ({ moeda, saldo, onChange, className = '', ...resto }: SaldoAnimadoProps) => {
  const [focado, setFocado] = useState(false);
  const exibido = useNumeroAnimado(saldo);
  const campo = useRef<HTMLInputElement | null>(null);
  const anterior = useRef(saldo);
  const montadoEm = useRef(typeof performance !== 'undefined' ? performance.now() : 0);

  useEffect(() => {
    if (saldo === anterior.current) return;
    const delta = saldo - anterior.current;
    anterior.current = saldo;
    // Carga inicial da ficha e digitação manual não comemoram.
    if (focado || performance.now() - montadoEm.current < CARENCIA_MONTAGEM_MS) return;

    const caixa = campo.current?.getBoundingClientRect();
    dispararMoedas({
      moeda,
      delta,
      x: caixa ? caixa.left + caixa.width / 2 : undefined,
      y: caixa ? caixa.top + caixa.height / 2 : undefined,
    });
    campo.current?.animate?.(
      [{ transform: 'scale(1)' }, { transform: `scale(${delta > 0 ? 1.22 : 0.86})` }, { transform: 'scale(1)' }],
      { duration: 480, easing: 'ease-out' },
    );
  }, [saldo, moeda, focado]);

  return (
    <input
      ref={campo}
      type="number"
      value={focado ? saldo : exibido}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      onChange={(evento) => onChange(parseInt(evento.target.value, 10) || 0)}
      className={className}
      {...resto}
    />
  );
};
