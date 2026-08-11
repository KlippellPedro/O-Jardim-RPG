import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Shield, Globe, BookOpen, Swords, ShoppingBag } from 'lucide-react';

export default function GlassMenu() {
  const menuItems = [
    { name: 'Início', path: '/', icon: <Home size={22} /> },
    { name: 'Ficha', path: '/ficha', icon: <Shield size={22} /> },
    { name: 'Loja', path: '/loja', icon: <ShoppingBag size={22} /> },
    { name: 'Mundo', path: '/mundo', icon: <Globe size={22} /> },
    { name: 'Livro', path: '/regras', icon: <BookOpen size={22} /> },
    { name: 'Sessão', path: '/sessao', icon: <Swords size={22} /> },
  ];

  return (
    <nav className="fixed left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-6 p-4 rounded-3xl bg-[#0b0a12]/80 backdrop-blur-xl border border-white/10 shadow-2xl">
      {menuItems.map((item) => (
        <NavLink
          key={item.name}
          to={item.path}
          className={({ isActive }) =>
            `relative p-3 rounded-2xl flex items-center justify-center transition-all duration-300 group
            ${isActive ? 'text-primary' : 'text-gray-300 hover:text-white hover:bg-white/10'}`
          }
          title={item.name}
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
              
              {/* Tooltip Elegante */}
              <div className="absolute left-full ml-6 px-4 py-2 bg-[#0b0a12]/90 backdrop-blur-md text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none border border-white/10 whitespace-nowrap shadow-xl transform translate-x-[-10px] group-hover:translate-x-0">
                {item.name}
              </div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
