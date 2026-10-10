import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { browserContentBoundary } from './tools/browser-content-boundary'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [browserContentBoundary(), react()],
  build: {
    // O frontend 3D é carregado sob demanda. Separar suas bibliotecas evita
    // que Three.js e React Three Fiber voltem a engrossar o bundle inicial.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // O que o app inteiro usa (React, Zustand, o helper de preload do Vite)
          // tem chunk próprio. Sem isso o Rollup põe esses módulos compartilhados
          // dentro do primeiro chunk 3D que os importa, e a entrada do site passa
          // a baixar Three.js e drei só para abrir o login.
          if (id.includes('preload-helper')) return 'vendor-base'
          const pacotes = id.split('/node_modules/')
          if (pacotes.length === 2 && /^(react|react-dom|scheduler|zustand|use-sync-external-store)\//.test(pacotes[1])) {
            return 'vendor-base'
          }
          if (id.includes('/node_modules/three/')) return 'vendor-three'
          if (id.includes('/node_modules/@react-three/fiber/')) return 'vendor-react-three'
          if (id.includes('/node_modules/@react-three/drei/')) return 'vendor-react-three-drei'
          if (id.includes('/node_modules/@react-three/rapier/')) return 'vendor-react-three-rapier'
          if (id.includes('/node_modules/@dimforge/rapier3d-compat/')) return 'vendor-rapier'
          if (id.includes('/node_modules/react-reconciler/')) return 'vendor-react-three'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        // A plataforma roda na 8080 tanto em dev (.claude/launch.json) quanto
        // em produção (plataforma/discloud.config).
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
