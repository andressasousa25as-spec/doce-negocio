import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

// Barra "Nova versão disponível" + auto-checagem a cada 60s (iOS não checa sozinho).
export default function AtualizacaoPWA() {
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false)
  const [atualizar, setAtualizar] = useState<((recarregar?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setPrecisaAtualizar(true)
      },
      onRegisteredSW(_url, registration) {
        if (registration) {
          setInterval(() => { registration.update() }, 60_000)
        }
      },
    })
    setAtualizar(() => updateSW)
  }, [])

  if (!precisaAtualizar) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: '#CBA15C',
        color: '#3a2a10',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        fontWeight: 700,
        fontSize: 14,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.2)',
      }}
    >
      Nova versão disponível
      <button
        onClick={() => atualizar?.(true)}
        style={{
          background: '#7a2e3f',
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '6px 16px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Atualizar agora
      </button>
    </div>
  )
}
