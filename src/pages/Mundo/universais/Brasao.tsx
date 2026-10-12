import { CAMINHO_DA_FORMA, FORMA_PADRAO, type FormaDeBrasao } from './identidadesFaccao';

/** O contorno de um brasão na cor da seção em volta (`--sec-rgb`, ou `--item-rgb` nas linhas da lista). */
export const Brasao = ({ forma = FORMA_PADRAO, className = '', mini = false }: { forma?: FormaDeBrasao; className?: string; mini?: boolean }) => (
  <svg viewBox="0 0 100 120" className={className} aria-hidden="true">
    <path d={CAMINHO_DA_FORMA[forma]} className={mini ? 'ru-brasao__mini' : 'ru-brasao__escudo'} />
    {mini ? null : <path d={CAMINHO_DA_FORMA[forma]} className="ru-brasao__filete" transform="translate(7.5 9) scale(0.85)" />}
  </svg>
);
