import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { rotaDaRegra } from '../../pages/Regras/secaoDoLivro';

interface LinkDaRegraProps {
  /** Id do tópico do livro (o mesmo de `/regras?topico=`). */
  topico: string;
  /** Título do h3 da seção, quando a regra mora numa parte do tópico. */
  secao?: string;
  /** Texto do botão; o padrão é "Regra". */
  rotulo?: string;
  className?: string;
}

/** Botão pequeno que leva da ficha à página do livro que explica aquela parte. */
export const LinkDaRegra = ({ topico, secao, rotulo = 'Regra', className = '' }: LinkDaRegraProps) => (
  <Link
    to={rotaDaRegra(topico, secao)}
    title={secao ? `Abrir a regra: ${secao}` : 'Abrir a regra no livro'}
    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#c7a44c]/25 bg-[#c7a44c]/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#d8bd75] transition-colors hover:border-[#c7a44c]/50 hover:bg-[#c7a44c]/15 hover:text-[#f0d892] ${className}`}
  >
    <BookOpen size={12} aria-hidden="true" />
    {rotulo}
  </Link>
);
