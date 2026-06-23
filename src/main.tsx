import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import InstalarPWA from './components/InstalarPWA.tsx'
import AtualizacaoPWA from './components/AtualizacaoPWA.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <InstalarPWA />
    <AtualizacaoPWA />
  </StrictMode>,
)
