import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface PremiumCardProps extends React.ComponentProps<typeof motion.div> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'rgba(255,255,255,0.2)',
  ...rest
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth out the mouse values
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 25 });

  // Map mouse position to rotation (tilt)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4deg", "-4deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4deg", "4deg"]);

  
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0); // Reset position on leave
  };
  
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const brighterGlow = glowColor.replace(/[\d.]+\)$/, '0.55)');
  const dimmerGlow = glowColor.replace(/[\d.]+\)$/, '0.3)');

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      whileHover={{ scale: 1.02, zIndex: 20 }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative overflow-hidden ${className}`}
      {...rest}
    >
      {/* Glare effect removed as per user request */}
      {/* Dynamic Border based on hover */}
      <motion.div 
        className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] border border-white/5"
        animate={{
            borderColor: isHovered ? brighterGlow : 'rgba(255,255,255,0.05)',
            boxShadow: isHovered ? `0 0 20px ${dimmerGlow}` : 'none'
        }}
      />

      {/* Content wrapper translating slightly forward for parallax */}
      <div 
        style={{ transform: "translateZ(40px)" }} 
        className="relative w-full h-full flex flex-col"
      >
        {children}
      </div>
    </motion.div>
  );
};

