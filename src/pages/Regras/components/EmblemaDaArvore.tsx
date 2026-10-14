import { useId } from 'react';

interface EmblemaDaArvoreProps {
  className?: string;
  /** Texto para leitores de tela. Sem ele o desenho é decorativo e fica escondido. */
  titulo?: string;
}

/** A árvore dourada do ícone do app, em vetor, para capas e cartões do Livro.
 *  Mesmo desenho de public/assets/img/icons/app-icon.svg e do PDF. */
export const EmblemaDaArvore = ({ className, titulo }: EmblemaDaArvoreProps) => {
  const idDoOuro = useId().replace(/:/g, '');
  return (
    <svg
      viewBox="104 92 304 372"
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={`ouro-${idDoOuro}`} gradientUnits="userSpaceOnUse" x1="0" y1="104" x2="0" y2="452">
          <stop offset="0%" stopColor="#e7cf6a" />
          <stop offset="100%" stopColor="#b8901f" />
        </linearGradient>
      </defs>
      <g stroke={`url(#ouro-${idDoOuro})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 430 L256 250" strokeWidth="18" />
        <path d="M256 300 C220 260 196 232 180 196" strokeWidth="12" />
        <path d="M256 300 C292 260 316 232 332 196" strokeWidth="12" />
        <path d="M256 262 C246 224 240 196 244 158" strokeWidth="12" />
        <path d="M256 262 C266 224 272 196 268 158" strokeWidth="12" />
        <path d="M180 196 C168 176 150 166 132 160" strokeWidth="8" />
        <path d="M180 196 C186 172 182 152 172 132" strokeWidth="8" />
        <path d="M332 196 C344 176 362 166 380 160" strokeWidth="8" />
        <path d="M332 196 C326 172 330 152 340 132" strokeWidth="8" />
        <path d="M244 158 C230 138 214 128 196 122" strokeWidth="8" />
        <path d="M268 158 C282 138 298 128 316 122" strokeWidth="8" />
        <path d="M206 430 Q256 452 306 430" strokeWidth="16" />
      </g>
      <g fill="#e7cf6a">
        <circle cx="132" cy="160" r="9" />
        <circle cx="172" cy="132" r="9" />
        <circle cx="380" cy="160" r="9" />
        <circle cx="340" cy="132" r="9" />
        <circle cx="196" cy="122" r="9" />
        <circle cx="316" cy="122" r="9" />
        <circle cx="256" cy="104" r="11" />
      </g>
    </svg>
  );
};
