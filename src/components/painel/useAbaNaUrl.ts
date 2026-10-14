import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { abaValida } from './abas';

/**
 * A aba aberta de um painel mora na URL (`?aba=`): os avisos levam direto para a aba certa, recarregar a página
 * não perde o lugar e o link pode ser mandado para alguém. Os outros parâmetros da URL (campanha, seção) ficam como estão.
 */
export function useAbaNaUrl<T extends string>(abas: readonly T[], padrao: T): [T, (proxima: T) => void] {
  const [parametros, setParametros] = useSearchParams();
  const aba = abaValida(abas, parametros.get('aba'), padrao);

  const definir = useCallback((proxima: T) => {
    setParametros((atuais) => {
      const novos = new URLSearchParams(atuais);
      novos.set('aba', proxima);
      return novos;
    }, { replace: true });
  }, [setParametros]);

  return [aba, definir];
}
