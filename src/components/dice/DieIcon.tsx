export type DieSides = 4 | 6 | 8 | 10 | 12 | 20;

interface DieIconProps {
  sides: DieSides;
  className?: string;
}

const pontosPoligono = (lados: number, raio: number, cx = 50, cy = 50, rotacaoGraus = -90) => {
  const rotacao = (rotacaoGraus * Math.PI) / 180;
  return Array.from({ length: lados }, (_, i) => {
    const angulo = rotacao + (i * Math.PI * 2) / lados;
    return [cx + Math.cos(angulo) * raio, cy + Math.sin(angulo) * raio] as const;
  });
};

const paraPath = (pontos: readonly (readonly [number, number])[]) =>
  `M ${pontos.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L ')} Z`;

// Contorno em linha fina de cada poliedro, no mesmo traço do selo de
// autenticação - textura própria do jogo em vez de um ícone de dado genérico.
function faces(sides: DieSides) {
  switch (sides) {
    case 4: {
      const [a, b, c] = pontosPoligono(3, 38, 50, 58);
      const apice: readonly [number, number] = [50, 12];
      return (
        <>
          <path d={paraPath([apice, a, b, c])} />
          <path d={`M ${apice[0]},${apice[1]} L 50,58`} />
          <path d={`M ${a[0]},${a[1]} L 50,58 L ${b[0]},${b[1]}`} />
        </>
      );
    }
    case 6: {
      return (
        <>
          <path d="M50,18 L75,32 L50,46 L25,32 Z" />
          <path d="M25,32 L50,46 L50,84 L25,70 Z" />
          <path d="M75,32 L50,46 L50,84 L75,70 Z" />
        </>
      );
    }
    case 8: {
      return (
        <>
          <path d="M50,12 L80,50 L50,88 L20,50 Z" />
          <path d="M20,50 L80,50" />
          <path d="M50,12 L50,88" />
        </>
      );
    }
    case 10: {
      return (
        <>
          <path d="M50,10 L74,38 L64,88 L36,88 L26,38 Z" />
          <path d="M26,38 L74,38" />
          <path d="M50,10 L50,88" />
        </>
      );
    }
    case 12: {
      const externo = pontosPoligono(5, 38);
      const interno = pontosPoligono(5, 15, 50, 50, -90 + 36);
      return (
        <>
          <path d={paraPath(externo)} />
          <path d={paraPath(interno)} />
          {externo.map(([x, y], i) => (
            <line key={i} x1={x} y1={y} x2={interno[i][0]} y2={interno[i][1]} />
          ))}
        </>
      );
    }
    case 20: {
      const externo = pontosPoligono(6, 40);
      return (
        <>
          <path d={paraPath(externo)} />
          {externo.map(([x, y], i) => (
            <line key={i} x1="50" y1="50" x2={x} y2={y} />
          ))}
        </>
      );
    }
    default:
      return null;
  }
}

export const DieIcon: React.FC<DieIconProps> = ({ sides, className = '' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
    strokeLinecap="round"
    aria-hidden="true"
  >
    {faces(sides)}
  </svg>
);
