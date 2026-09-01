interface AuthEmblemProps {
  size?: number;
  className?: string;
}

// Selo do portão do Jardim: um arco com uma haste central brotando em folhas
// e uma fagulha no topo, cercado por um anel com marcações de bússola.
// Substitui o cadeado genérico que qualquer form de login usa.
export const AuthEmblem: React.FC<AuthEmblemProps> = ({ size = 56, className = '' }) => {
  const marcas = Array.from({ length: 12 }, (_, i) => {
    const angulo = (i * Math.PI * 2) / 12;
    return {
      key: i,
      x1: 50 + Math.cos(angulo) * 41,
      y1: 50 + Math.sin(angulo) * 41,
      x2: 50 + Math.cos(angulo) * 45,
      y2: 50 + Math.sin(angulo) * 45,
    };
  });

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Emblema de O Jardim RPG"
    >
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.22" />
      {marcas.map((m) => (
        <line key={m.key} x1={m.x1} y1={m.y1} x2={m.x2} y2={m.y2} stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" opacity="0.3" />
      ))}

      {/* Portão */}
      <path d="M36 76 V56 A14 14 0 0 1 64 56 V76" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <line x1="29" y1="76" x2="71" y2="76" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />

      {/* Haste e folhas */}
      <path d="M50 76 V38" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.9" />
      <path d="M50 60 C44 58 40 52 41 46" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M50 60 C56 58 60 52 59 46" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M50 48 C45 46 42 41 43 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
      <path d="M50 48 C55 46 58 41 57 36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />

      {/* Fagulha no topo */}
      <path d="M50 22 L51.6 27 L56.5 28.5 L51.6 30 L50 35 L48.4 30 L43.5 28.5 L48.4 27 Z" fill="currentColor" opacity="0.9" />
    </svg>
  );
};
