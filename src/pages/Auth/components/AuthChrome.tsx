import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Marca de canto (moldura de manuscrito) em vez da borda arredondada única
// que qualquer cartão genérico usa.
const CornerMark: React.FC<{ className: string }> = ({ className }) => (
  <span aria-hidden="true" className={`pointer-events-none absolute h-4 w-4 border-primary/35 ${className}`} />
);

interface AuthFrameProps {
  children: ReactNode;
  className?: string;
}

export const AuthFrame: React.FC<AuthFrameProps> = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className={`auth-panel-shell relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b0a12]/75 p-6 shadow-2xl backdrop-blur-2xl sm:p-9 ${className}`}
  >
    <CornerMark className="left-3 top-3 border-l border-t" />
    <CornerMark className="right-3 top-3 border-r border-t" />
    <CornerMark className="bottom-3 left-3 border-b border-l" />
    <CornerMark className="bottom-3 right-3 border-b border-r" />
    <div className="relative z-10">{children}</div>
  </motion.div>
);

export const AuthDivider: React.FC = () => (
  <div aria-hidden="true" className="my-7 flex items-center gap-3">
    <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/35" />
    <span className="text-sm text-primary/50">✦</span>
    <span className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/35" />
  </div>
);
