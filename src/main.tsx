import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { iniciarCapturaDeInstalacao } from './pwa/instalacao'
import { registrarServiceWorker } from './pwa/registrarServiceWorker'

// O navegador oferece a instalação cedo, antes da tela montar: a escuta começa já.
iniciarCapturaDeInstalacao()
registrarServiceWorker()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)