import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IOpcaoRacial, IRaca } from '../../types/catalogo';
import { EspiritoHub } from './espirito/EspiritoHub';
import { EspiritoNatureza } from './espirito/EspiritoNatureza';
import { organizarEspirito } from './espirito/dados';
import { EspiritoFundo } from './espirito/visual';

/** Página do Espírito, em duas telas que dividem a mesma URL.
 *
 * - Sem `?natureza=`: a porta de entrada, com o que todo espírito tem e as três
 *   Naturezas para escolher.
 * - Com `?natureza=natural|demoniaca|angelical`: a página daquela Natureza, com
 *   estágios e marcas. `&marca=` guarda o Fluxo, Pecado ou Virtude aberto.
 *
 * A Natureza fica na URL (e não em estado local) para o botão Voltar do
 * navegador voltar para a porta de entrada e para dar para mandar o link de uma
 * marca específica. */
export const Espirito = ({ raca }: { raca: IRaca }) => {
  const [params, setParams] = useSearchParams();
  const naturezas = useMemo(() => organizarEspirito(raca), [raca]);
  const idDaNatureza = params.get('natureza');
  const atual = naturezas.find(item => item.natureza.id === idDaNatureza);

  // Trocar de tela começa sempre no topo, senão a página nova abre no meio.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [idDaNatureza]);

  const abrirNatureza = useCallback((naturezaId: string, marcaId?: string) => {
    setParams(marcaId ? { natureza: naturezaId, marca: marcaId } : { natureza: naturezaId });
  }, [setParams]);

  const voltar = useCallback(() => setParams({}), [setParams]);

  // Escolher a marca não empilha histórico: o Voltar sai da Natureza, não desfaz cliques.
  const escolherMarca = useCallback((marcaId: string) => {
    setParams({ natureza: idDaNatureza || '', marca: marcaId }, { replace: true });
  }, [idDaNatureza, setParams]);

  return (
    <EspiritoFundo>
      {atual ? (
        <EspiritoNatureza
          naturezas={naturezas}
          condicoes={(raca.condicoes_estagio || []) as IOpcaoRacial[]}
          atual={atual}
          marcaPedida={params.get('marca')}
          voltar={voltar}
          abrirNatureza={abrirNatureza}
          escolherMarca={escolherMarca}
        />
      ) : (
        <EspiritoHub raca={raca} naturezas={naturezas} abrir={abrirNatureza} />
      )}
    </EspiritoFundo>
  );
};

export default Espirito;
