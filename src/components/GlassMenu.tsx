import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Shield, Globe, BookOpen, Swords, ShoppingBag } from 'lucide-react';
import { sfx } from '../utils/audioSynth';

export default function GlassMenu() {
  const menuItems = [
    { name: 'Início', path: '/', icon: <Home size={22} /> },
    { name: 'Ficha', path: '/ficha', icon: <Shield size={22} /> },
    { name: 'Livro', path: '/regras', icon: <BookOpen size={22} /> },
    { name: 'Mundo', path: '/mundo', icon: <Globe size={22} /> },
    { name: 'Loja', path: '/loja', icon: <ShoppingBag size={22} /> },
    { name: 'Sessão', path: '/sessao', icon: <Swords size={22} /> },
  ];

  return (
    <nav className="app-navigation" aria-label="Navegação principal">
      {menuItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          onMouseEnter={() => sfx.play('hover')}
          data-sfx="navigate"
          className={({ isActive }) =>
            `app-nav-link group transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70
            ${isActive ? 'text-primary' : 'text-gray-300 hover:text-white hover:bg-white/10'}`
          }
          aria-label={item.name}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/30"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <span className="relative z-10">{item.icon}</span>
              <span className="app-nav-label relative z-10">{item.name}</span>
              
              <div className="app-nav-tooltip text-sm">
                {item.name}
              </div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
