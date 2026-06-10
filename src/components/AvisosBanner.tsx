import { useState, useEffect } from 'react'
import type { Aviso } from '../types'
import { avisoService } from '../services/supabaseService'

const COR: Record<Aviso['tipo'], { bg: string; bd: string; tx: string }> = {
  info:   { bg: '#EFF6FF', bd: '#BFDBFE', tx: '#1D4ED8' },
  promo:  { bg: '#FDF2F8', bd: '#FBCFE8', tx: '#BE185D' },
  alerta: { bg: '#FFFBEB', bd: '#FDE68A', tx: '#92400E' },
}

export default function AvisosBanner() {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [fechados, setFechados] = useState<string[]>(() => JSON.parse(localStorage.getItem('avisos_fechados') || '[]'))

  useEffect(() => { avisoService.listarVisiveis().then(setAvisos).catch(() => {}) }, [])

  function fechar(id: string) {
    const novo = [...fechados, id]
    setFechados(novo)
    localStorage.setItem('avisos_fechados', JSON.stringify(novo))
  }

  const visiveis = avisos.filter(a => !fechados.includes(a.id))
  if (visiveis.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
      {visiveis.map(a => {
        const c = COR[a.tipo] || COR.info
        return (
          <div key={a.id} style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, color: c.tx, fontSize: 13, margin: '0 0 2px' }}>{a.titulo}</p>
              <p style={{ fontSize: 13, color: '#4B5563', margin: 0, lineHeight: 1.5 }}>{a.mensagem}</p>
            </div>
            <button onClick={() => fechar(a.id)} aria-label="Fechar aviso" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#9CA3AF', flexShrink: 0 }}>✕</button>
          </div>
        )
      })}
    </div>
  )
}
