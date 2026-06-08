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
    pendente: '⏳ Pendente', confirmado: '✅ Confirmado',
    em_producao: '👩‍🍳 Em produção', pronto: '🎂 Pronto',
    entregue: '📦 Entregue', cancelado: '❌ Cancelado'
  }
  const statusColor: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-700',
    confirmado: 'bg-blue-100 text-blue-700',
    em_producao: 'bg-purple-100 text-purple-700',
    pronto: 'bg-green-100 text-green-700',
    entregue: 'bg-gray-100 text-gray-500',
    cancelado: 'bg-red-100 text-red-400'
  }

  function labelData(data: string) {
    const d = parseISO(data)
    if (isToday(d))    return 'Hoje'
    if (isTomorrow(d)) return 'Amanhã'
    return format(d, "dd 'de' MMM", { locale: ptBR })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-pink-300 animate-pulse">Carregando...</p>
    </div>
  )

  return (
    <div className="space-y-4 w-full" style={{ paddingLeft: '0.5rem' }}>
      {/* Saudação */}
      <div className="bg-gradient-to-r from-pink-500 to-pink-400 rounded-2xl p-4 text-white">
        <p className="text-pink-100 text-sm">Bem-vinda de volta! 🎉</p>
        <h2 className="text-xl font-bold mt-1">{perfil.nome_negocio || perfil.nome}</h2>
        <p className="text-pink-100 text-xs mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Dica do dia */}
      {dica && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-amber-600 mb-1">✨ Dica do dia</p>
          <p className="text-sm text-amber-800 leading-relaxed">{dica.texto}</p>
        </div>
      )}

      {/* Alertas — pedidos atrasados */}
      {pedAtras.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-red-500 mb-2">
            ⚠️ {pedAtras.length} pedido(s) em atraso!
          </p>
          {pedAtras.map(p => (
            <div key={p.id} className="text-sm text-red-700">
              • {p.cliente_nome} — {p.descricao}
            </div>
          ))}
        </div>
      )}

      {/* Pedidos de hoje */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-pink-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 text-sm">📅 Entregas de hoje</h3>
          <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">
            {pedHoje.length}
          </span>
        </div>
        {pedHoje.length === 0 ? (
          <div className="p-6 text-center text-gray-300 text-sm">
            Nenhuma entrega hoje 🎉
          </div>
        ) : (
          <div className="divide-y divide-pink-50">
            {pedHoje.map(p => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-700 text-sm">{p.cliente_nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>
                    {p.hora_entrega && (
                      <p className="text-xs text-pink-400 mt-0.5">🕐 {p.hora_entrega.slice(0,5)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status]}`}>
                      {statusLabel[p.status]}
                    </span>
                    <p className="text-sm font-bold text-green-600 mt-1">
                      R$ {p.valor.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Próximos pedidos */}
      {proximos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-pink-50">
            <h3 className="font-semibold text-gray-700 text-sm">🗓️ Próximos pedidos</h3>
          </div>
          <div className="divide-y divide-pink-50">
            {proximos.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 text-sm">{p.cliente_nome}</p>
                  <p className="text-xs text-gray-400">{p.descricao}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-pink-500 font-medium">{labelData(p.data_entrega)}</p>
                  <p className="text-sm font-bold text-green-600">
                    R$ {p.valor.toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
