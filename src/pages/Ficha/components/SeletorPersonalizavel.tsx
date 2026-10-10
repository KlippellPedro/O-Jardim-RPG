import { useEffect, useState } from 'react';
import { Select, type SelectOption } from '../../../components/ui/Select';

export interface IOpcaoPersonalizavel {
  value: string;
  label: string;
}

interface ISeletorPersonalizavelProps {
  label: string;
  value: string;
  opcoes: IOpcaoPersonalizavel[];
  onChange: (valor: string) => void;
  /** Texto do campo livre que aparece quando a pessoa escolhe a opção personalizada. */
  placeholderPersonalizado: string;
  /** Mostrado como escolhido enquanto `value` está vazio, sem gravar nada (por exemplo o tamanho da raça). */
  padrao?: string;
  /** Opção para deixar em branco (por exemplo "Nenhuma"). Sem ela, o campo sempre tem um valor. */
  rotuloVazio?: string;
  rotuloPersonalizada?: string;
  disabled?: boolean;
}

const VALOR_PERSONALIZADO = '__personalizado__';

/**
 * Lista de opções prontas com uma saída para o que não está nela: escolher "Personalizado" abre um campo de texto.
 * Um valor salvo que não está na lista (ficha antiga ou escolha livre) já abre direto no campo de texto.
 */
export const SeletorPersonalizavel = ({
  label,
  value,
  opcoes,
  onChange,
  placeholderPersonalizado,
  padrao = '',
  rotuloVazio,
  rotuloPersonalizada = 'Personalizado...',
  disabled = false,
}: ISeletorPersonalizavelProps) => {
  const valorNaLista = opcoes.some((opcao) => opcao.value === value);
  const [personalizando, setPersonalizando] = useState(Boolean(value) && !valorNaLista);

  useEffect(() => {
    if (valorNaLista) setPersonalizando(false);
    else if (value) setPersonalizando(true);
  }, [value, valorNaLista]);

  const opcoesSelect: SelectOption[] = [
    ...(rotuloVazio ? [{ value: '', label: rotuloVazio }] : []),
    ...opcoes,
    { value: VALOR_PERSONALIZADO, label: rotuloPersonalizada },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</label>
      <Select
        ariaLabel={label}
        value={personalizando ? VALOR_PERSONALIZADO : (value || padrao)}
        onChange={(escolhido) => {
          if (escolhido === VALOR_PERSONALIZADO) {
            // O valor atual fica até a pessoa digitar o dela: escolher "Personalizado" sem digitar não apaga nada.
            setPersonalizando(true);
            return;
          }
          setPersonalizando(false);
          onChange(escolhido);
        }}
        options={opcoesSelect}
        disabled={disabled}
        className="w-full border-white/5 bg-[#121118]"
      />
      {personalizando && (
        <input
          type="text"
          aria-label={`${label} personalizado`}
          value={valorNaLista ? '' : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholderPersonalizado}
          maxLength={60}
          disabled={disabled}
          className="w-full min-w-0 rounded-md border border-white/5 bg-[#121118] px-3 py-2.5 text-sm text-gray-300 transition-colors placeholder:text-gray-700 focus:border-[#c7a44c]/50 focus:outline-none"
        />
      )}
    </div>
  );
};
