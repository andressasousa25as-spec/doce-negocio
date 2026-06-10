import { useState } from 'react'
import type { Perfil } from '../../types'
import { calcularIndicadores, agruparCadastros } from '../../lib/admMetrics'
import { gerarCsvClientes } from '../../lib/csv'

export default function AdmVisaoGeral({ clientes }: { clientes: Perfil[] }) {
  const [modo, setModo] = useState<'mes' | 'dia'>('mes')
  const ind = calcularIndicadores(clientes)
  const barras = agruparCadastros(clientes, modo)
  const max = Math.max(1, ...barras.map(b => b.valor))

  function exportar() {
    const csv = gerarCsvClientes(clientes)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const a = document.createElement('a'); a.href = url; a.download = 'clientes-doce-negocio.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const cards = [
    { l: 'Total de clientes', v: ind.total, c: '#DB2777', bg: '#fff' },
    { l: 'Assinantes ativos', v: ind.ativos, c: '#16A34A', bg: '#fff' },
    { l: 'Em teste', v: ind.emTeste, c: '#7C3AED', bg: '#fff' },
    { l: 'Vencendo (7 dias)', v: ind.vencendo7, c: '#DC2626', bg: '#FEF2F2' },
    { l: 'Receita / mês', v: 'R$ ' + ind.receitaMensal.toFixed(2).replace('.', ','), c: '#111827', bg: '#fff' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
        {cards.map(c => (
          <div key={c.l} style={{ backgroundColor: c.bg, borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 4px' }}>{c.l}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: c.c, margin: 0 }}>{c.v}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#374151', margin: 0 }}>Crescimento de cadastros</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['mes', 'dia'] as const).map(m => (
              <button key={m} onClick={() => setModo(m)} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', backgroundColor: modo === m ? '#EC4899' : '#FCE7F3', color: modo === m ? '#fff' : '#9D2463' }}>
                {m === 'mes' ? 'Mensal' : 'Diário'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: modo === 'mes' ? 10 : 3, height: 160, overflowX: 'auto' }}>
          {barras.map((b, i) => (
            <div key={i} style={{ flex: 1, minWidth: modo === 'dia' ? 8 : 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              {b.valor > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#DB2777' }}>{b.valor}</span>}
              <div style={{ width: '100%', maxWidth: 34, height: Math.round((b.valor / max) * 120), minHeight: b.valor > 0 ? 4 : 0, backgroundColor: '#EC4899', borderRadius: '6px 6px 0 0' }} />
              <span style={{ fontSize: 9, color: '#9CA3AF' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={exportar} style={{ alignSelf: 'flex-start', fontSize: 13, fontWeight: 600, padding: '10px 16px', borderRadius: 12, border: '1px solid #FBCFE8', backgroundColor: '#fff', color: '#BE185D', cursor: 'pointer' }}>
        ⬇️ Exportar planilha (CSV)
      </button>
    </div>
  )
}
