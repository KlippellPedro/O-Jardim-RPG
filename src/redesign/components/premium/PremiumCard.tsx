import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PremiumCardProps extends React.ComponentProps<typeof motion.div> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

/** Cartão dos textos longos das páginas de raça e classe.
 *
 * O hover NÃO usa `scale` nem tilt 3D de propósito: o navegador rasteriza o
 * texto no tamanho original e deixa o compositor esticar a textura, então
 * qualquer escala (ou `rotateX/rotateY` com `preserve-3d`) borra a leitura
 * enquanto o mouse está em cima - justamente onde a pessoa está lendo. O
 * destaque vem de um deslocamento vertical, da borda e do brilho, que são
 * compostos sem reamostrar o texto. */
export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(255,255,255,0.2)',
  ...rest
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const brighterGlow = glowColor.replace(/[\d.]+\)$/, '0.55)');
  const dimmerGlow = glowColor.replace(/[\d.]+\)$/, '0.3)');

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -4, zIndex: 20 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={`relative overflow-hidden ${className}`}
      {...rest}
    >
      {/* Borda e brilho reagem ao hover no lugar do zoom. */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] border border-white/5"
        animate={{
          borderColor: isHovered ? brighterGlow : 'rgba(255,255,255,0.05)',
          boxShadow: isHovered ? `0 0 20px ${dimmerGlow}` : 'none',
        }}
      />

      <div className="relative w-full h-full flex flex-col">
        {children}
      </div>
    </motion.div>
  );
};
