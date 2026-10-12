import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IRaca } from '../../types/catalogo';
import { AnimaliaForma } from './animalia/AnimaliaForma';
import { AnimaliaHub } from './animalia/AnimaliaHub';
import { organizarAnimalia } from './animalia/dados';
import { AnimaliaFundo } from './animalia/visual';

/** Página da Animália, em duas telas que dividem a mesma URL.
 *
 * - Sem `?forma=`: a porta de entrada, com o que toda Animália tem, as três Formas, as Morfologias e o
 *   amadurecimento.
 * - Com `?forma=fera|hibrido|tracos`: a página daquela Forma, com o montador de Morfologia e animal.
 *   `&morfologia=` e `&animal=` guardam o que está aberto.
 *
 * A Forma fica na URL (e não em estado local) para o botão Voltar do navegador voltar para a porta de
 * entrada e para dar para mandar o link de um animal específico. */
export const Animalia = ({ raca }: { raca: IRaca }) => {
  const [params, setParams] = useSearchParams();
  const formas = useMemo(() => organizarAnimalia(raca), [raca]);
  const idDaForma = params.get('forma');
  const atual = formas.find(item => item.forma.id === idDaForma);

  // Trocar de tela começa sempre no topo, senão a página nova abre no meio.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [idDaForma]);

  const abrirForma = useCallback((formaId: string, morfologiaId?: string) => {
    setParams(morfologiaId ? { forma: formaId, morfologia: morfologiaId } : { forma: formaId });
  }, [setParams]);

  const voltar = useCallback(() => setParams({}), [setParams]);

  // Escolher Morfologia ou animal não empilha histórico: o Voltar sai da Forma, não desfaz cliques.
  const escolherMorfologia = useCallback((morfologiaId: string) => {
    setParams({ forma: idDaForma || '', morfologia: morfologiaId }, { replace: true });
  }, [idDaForma, setParams]);

  const morfologiaPedida = params.get('morfologia');
  const escolherAnimal = useCallback((animalId: string | null) => {
    const proximos: Record<string, string> = { forma: idDaForma || '' };
    if (morfologiaPedida) proximos.morfologia = morfologiaPedida;
    if (animalId) proximos.animal = animalId;
    setParams(proximos, { replace: true });
  }, [idDaForma, morfologiaPedida, setParams]);

  return (
    <AnimaliaFundo>
      {atual ? (
        <AnimaliaForma
          raca={raca}
          formas={formas}
          atual={atual}
          morfologiaPedida={morfologiaPedida}
          animalPedido={params.get('animal')}
          voltar={voltar}
          abrirForma={abrirForma}
          escolherMorfologia={escolherMorfologia}
          escolherAnimal={escolherAnimal}
        />
      ) : (
        <AnimaliaHub raca={raca} formas={formas} abrir={abrirForma} />
      )}
    </AnimaliaFundo>
  );
};

export default Animalia;
