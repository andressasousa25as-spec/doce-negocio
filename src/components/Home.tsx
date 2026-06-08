import { useState, useEffect } from 'react'
import type { Perfil, Dica, Pedido } from '../types'
import { dicaService, pedidoService } from '../services/supabaseService'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { perfil: Perfil }

export default function Home({ perfil }: Props) {
  const [dica,    setDica]    = useState<Dica | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      dicaService.buscarHoje().then(d => setDica(d)),
      pedidoService.listar(perfil.id).then(d => setPedidos(d || []))
    ]).finally(() => setLoading(false))
  }, [perfil.id])

  const hoje     = new Date().toISOString().split('T')[0]
  const pedHoje  = pedidos.filter(p => p.data_entrega === hoje && p.status !== 'cancelado')
  const pedAtras = pedidos.filter(p => p.data_entrega < hoje && !['entregue','cancelado'].includes(p.status))
  const proximos = pedidos.filter(p => p.data_entrega > hoje && p.status !== 'cancelado').slice(0, 3)

  const statusLabel: Record<string, string> = {
    pendente: 'Pendente', confirmado: 'Confirmado',
    em_producao: 'Em produção', pronto: 'Pronto',
    entregue: 'Entregue', cancelado: 'Cancelado',
  }
  const statusBg:   Record<string, string> = { pendente:'#FEF9C3', confirmado:'#DBEAFE', em_producao:'#EDE9FE', pronto:'#DCFCE7', entregue:'#F3F4F6', cancelado:'#FEE2E2' }
  const statusText: Record<string, string> = { pendente:'#854D0E', confirmado:'#1E40AF', em_producao:'#5B21B6', pronto:'#14532D',  entregue:'#6B7280', cancelado:'#991B1B' }

  function labelData(data: string) {
    const d = parseISO(data)
    if (isToday(d))    return 'Hoje'
    if (isTomorrow(d)) return 'Amanhã'
    return format(d, "dd 'de' MMM", { locale: ptBR })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
      <p style={{ color: '#F9A8D4', fontSize: 14 }}>Carregando...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Banner boas-vindas */}
      <div style={{ borderRadius: 20, background: 'linear-gradient(135deg,#EC4899 0%,#DB2777 55%,#BE185D 100%)', padding: '24px 24px 20px', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: 20, width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', margin: '0 0 4px' }}>Bem-vinda de volta! 🎉</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 6px', lineHeight: 1.2 }}>{perfil.nome_negocio || perfil.nome}</h2>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0, textTransform: 'capitalize' }}>
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Cards KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Hoje',      value: pedHoje.length,  cor: '#EC4899', bg: '#FDF2F8', emoji: '📅' },
          { label: 'Próximos', value: proximos.length, cor: '#7C3AED', bg: '#F5F3FF', emoji: '🗓' },
          { label: 'Atrasados', value: pedAtras.length, cor: pedAtras.length > 0 ? '#DC2626' : '#16A34A', bg: pedAtras.length > 0 ? '#FEF2F2' : '#F0FDF4', emoji: pedAtras.length > 0 ? '⚠️' : '✅' },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor: k.bg, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <p style={{ fontSize: 20, margin: '0 0 4px' }}>{k.emoji}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: k.cor, margin: '0 0 2px', lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 10, color: '#9CA3AF', margin: 0, fontWeight: 600 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Dica do dia */}
      {dica && (
        <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#D97706', margin: '0 0 6px' }}>✨ Dica do dia</p>
          <p style={{ fontSize: 13, color: '#92400E', lineHeight: 1.5, margin: 0 }}>{dica.texto}</p>
        </div>
      )}

      {/* Alertas atraso */}
      {pedAtras.length > 0 && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', margin: '0 0 6px' }}>
            ⚠️ {pedAtras.length} pedido{pedAtras.length > 1 ? 's' : ''} em atraso!
          </p>
          {pedAtras.map(p => (
            <p key={p.id} style={{ fontSize: 13, color: '#991B1B', margin: '2px 0' }}>• {p.cliente_nome} — {p.descricao}</p>
          ))}
        </div>
      )}

      {/* Entregas de hoje */}
      <div style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #FCE7F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 700, color: '#111827', fontSize: 13, margin: 0 }}>📅 Entregas de hoje</h3>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#DB2777', backgroundColor: '#FCE7F3', borderRadius: 20, padding: '2px 8px' }}>{pedHoje.length}</span>
        </div>
        {pedHoje.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#D1D5DB', fontSize: 13 }}>🎉 Nenhuma entrega hoje</div>
        ) : pedHoje.map((p, i) => (
          <div key={p.id} style={{ padding: '12px 16px', borderBottom: i < pedHoje.length - 1 ? '1px solid #FDF2F8' : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#111827', fontSize: 13, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cliente_nome}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.descricao}</p>
              {p.hora_entrega && <p style={{ fontSize: 11, color: '#EC4899', margin: 0 }}>🕐 {p.hora_entrega.slice(0,5)}</p>}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: statusBg[p.status], color: statusText[p.status], display: 'inline-block', marginBottom: 4 }}>
                {statusLabel[p.status]}
              </span>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#16A34A', margin: 0 }}>R$ {p.valor.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Proximos pedidos */}
      {proximos.length > 0 && (
        <div style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #FCE7F3' }}>
            <h3 style={{ fontWeight: 700, color: '#111827', fontSize: 13, margin: 0 }}>🗓️ Próximos pedidos</h3>
          </div>
          {proximos.map((p, i) => (
            <div key={p.id} style={{ padding: '12px 16px', borderBottom: i < proximos.length - 1 ? '1px solid #FDF2F8' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#111827', fontSize: 13, margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cliente_nome}</p>
                <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{p.descricao}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', margin: '0 0 2px' }}>{labelData(p.data_entrega)}</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#16A34A', margin: 0 }}>R$ {p.valor.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}