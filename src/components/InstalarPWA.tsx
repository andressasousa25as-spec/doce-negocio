import { useEffect, useState } from 'react'

// Botão flutuante "Instalar app" (PWA). No Android/desktop usa o evento
// beforeinstallprompt; no iPhone (Safari não dispara o evento) mostra instrução.
export default function InstalarPWA() {
  const [prompt, setPrompt] = useState<any>(null)
  const [visivel, setVisivel] = useState(false)
  const [ehIos, setEhIos] = useState(false)

  useEffect(() => {
    // Já instalado (aberto pela tela inicial) → não mostra
    const instalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    if (instalado) return

    function aoPoderInstalar(e: Event) {
      e.preventDefault()
      setPrompt(e)
      setVisivel(true)
    }
    window.addEventListener('beforeinstallprompt', aoPoderInstalar)

    // iOS Safari não tem beforeinstallprompt → mostra dica manual
    const ua = window.navigator.userAgent.toLowerCase()
    const isIos = /iphone|ipad|ipod/.test(ua)
    const navInApp = /crios|fxios|edgios/.test(ua) // outros navegadores no iOS não instalam
    if (isIos && !navInApp) {
      setEhIos(true)
      setVisivel(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', aoPoderInstalar)
  }, [])

  if (!visivel) return null

  async function instalar() {
    if (ehIos) {
      alert('Para instalar no iPhone:\n\n1. Toque no botão Compartilhar (quadrado com seta para cima)\n2. Escolha "Adicionar à Tela de Início"')
      return
    }
    if (!prompt) return
    prompt.prompt()
    await prompt.userChoice
    setVisivel(false)
    setPrompt(null)
  }

  return (
    <button
      onClick={instalar}
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 9999,
        background: '#F4A7B9',
        color: '#7a2e3f',
        border: '2px solid #CBA15C',
        borderRadius: 999,
        padding: '10px 16px',
        fontWeight: 700,
        fontSize: 14,
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        cursor: 'pointer',
      }}
    >
      📲 Instalar app
    </button>
  )
}
