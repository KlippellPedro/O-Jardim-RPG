import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
