const fs = require('fs');
fs.mkdirSync('frontend-v2/src', {recursive: true});

fs.writeFileSync('frontend-v2/package.json', JSON.stringify({
  "name": "frontend-v2",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@react-three/drei": "^9.108.0",
    "@react-three/fiber": "^8.16.8",
    "@studio-freight/lenis": "^1.0.42",
    "framer-motion": "^11.2.14",
    "lucide-react": "^0.407.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.166.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.166.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.4",
    "typescript": "^5.5.3",
    "vite": "^5.3.3"
  }
}, null, 2));

fs.writeFileSync('frontend-v2/vite.config.ts', `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
})
`);

fs.writeFileSync('frontend-v2/tsconfig.json', JSON.stringify({
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}, null, 2));

fs.writeFileSync('frontend-v2/index.html', `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>O Jardim RPG - V2</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);

fs.writeFileSync('frontend-v2/tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0a12',
        surface: 'rgba(255, 255, 255, 0.05)',
        primary: '#c4a052' // golden touch
      }
    },
  },
  plugins: [],
}`);

fs.writeFileSync('frontend-v2/postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`);

fs.writeFileSync('frontend-v2/src/index.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-background text-white m-0 p-0 overflow-x-hidden;
    font-family: 'Inter', sans-serif;
  }
}
`);

fs.writeFileSync('frontend-v2/src/main.tsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`);

fs.writeFileSync('frontend-v2/src/vite-env.d.ts', `/// <reference types="vite/client" />`);

fs.writeFileSync('frontend-v2/src/App.tsx', `import React from 'react';
import AtmosphericBackground from './AtmosphericBackground';
import InteractiveModuleCard from './InteractiveModuleCard';

function App() {
  return (
    <div className="relative min-h-screen w-full">
      <AtmosphericBackground />
      
      <main className="relative z-10 p-8 pt-20 flex flex-col items-center">
        <h1 className="text-4xl font-bold mb-12 text-center text-primary drop-shadow-md" style={{fontFamily: 'Cinzel, serif'}}>
          O Jardim RPG
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
          <InteractiveModuleCard title="Ficha" description="Criar e gerenciar seus personagens" icon="⚔" />
          <InteractiveModuleCard title="Mundo" description="Deidades, fluxos, reinos e etc." icon="✦" />
          <InteractiveModuleCard title="Regras" description="Mecânicas, atributos e testes" icon="§" />
        </div>
      </main>
    </div>
  )
}

export default App;
`);

fs.writeFileSync('frontend-v2/src/AtmosphericBackground.tsx', `import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function Particles() {
  const ref = useRef<THREE.Points>(null!);
  
  const positions = useMemo(() => {
    const count = 500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial transparent color="#c4a052" size={0.05} sizeAttenuation={true} depthWrite={false} />
      </Points>
    </group>
  );
}

export default function AtmosphericBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-background pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Particles />
      </Canvas>
    </div>
  );
}`);

fs.writeFileSync('frontend-v2/src/InteractiveModuleCard.tsx', `import React from 'react';
import { motion } from 'framer-motion';

export default function InteractiveModuleCard({ title, description, icon }: { title: string, description: string, icon: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className="relative p-[1px] rounded-2xl bg-gradient-to-b from-primary/30 to-transparent overflow-hidden group cursor-pointer"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
      
      <div className="relative h-full bg-surface backdrop-blur-md rounded-2xl p-6 flex flex-col items-start border border-white/5">
        <div className="text-3xl mb-4 text-primary drop-shadow-[0_0_15px_rgba(196,160,82,0.5)]">
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}
`);

console.log('Project files created successfully!');
