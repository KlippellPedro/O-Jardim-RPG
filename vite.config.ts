import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // O frontend 3D é carregado sob demanda. Separar suas bibliotecas evita
    // que Three.js e React Three Fiber voltem a engrossar o bundle inicial.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'vendor-three'
          if (id.includes('/node_modules/@react-three/fiber/')) return 'vendor-react-three'
          if (id.includes('/node_modules/@react-three/drei/')) return 'vendor-react-three-drei'
          if (id.includes('/node_modules/@react-three/postprocessing/')) return 'vendor-react-three-postprocessing'
          if (id.includes('/node_modules/postprocessing/')) return 'vendor-postprocessing'
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
