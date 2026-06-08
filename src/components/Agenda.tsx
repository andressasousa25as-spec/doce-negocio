import { useState, useEffect } from 'react'
import type { Perfil, Pedido } from '../types'
import { pedidoService, clienteService } from '../services/supabaseService'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { perfil: Perfil }

const STATUS_LIST = ['pendente','confirmado','em_producao','pronto','entregue','cancelado'] as const
const STATUS_LABEL: Record<string, string> = {
  pendente: '⏳ Pendente', confirmado: '✅ Confirmado',
  em_producao: '👩‍🍳 Em produção', pronto: '🎂 Pronto',
  entregue: '📦 Entregue', cancelado: '❌ Cancelado'
}
const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  confirmado: 'bg-blue-100 text-blue-700',
  em_producao: 'bg-purple-100 text-purple-700',
  pronto: 'bg-green-100 text-green-700',
  entregue: 'bg-gray-100 text-gray-500',
  cancelado: 'bg-red-100 text-red-400'
}

const FORMA_LIST = ['pix','dinheiro','cartao','transferencia']

const VAZIO: Omit<Pedido,'id'|'created_at'> = {
  perfil_id: '', cliente_id: undefined, cliente_nome: '',
  descricao: '', data_entrega: '', hora_entrega: '',
  valor: 0, sinal_pago: 0, status: 'pendente',
  forma_pagamento: 'pix', observacoes: '', pago: false
}

export default function Agenda({ perfil }: Props) {
  const [pedidos,  setPedidos]  = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<{id:string;nome:string}[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ ...VAZIO, perfil_id: perfil.id })
  const [saving,   setSaving]   = useState(false)
  const [filtro,   setFiltro]   = useState<string>('todos')
  const [detalhe,  setDetalhe]  = useState<Pedido | null>(null)

  useEffect(() => {
    carregar()
    clienteService.listar(perfil.id).then(d => setClientes(d || []))
  }, [perfil.id])

  async function carregar() {
    setLoading(true)
    pedidoService.listar(perfil.id)
      .then(d => setPedidos(d || []))
      .finally(() => setLoading(false))
  }

  function abrirNovo() {
    setForm({ ...VAZIO, perfil_id: perfil.id })
    setDetalhe(null)
    setModal(true)
  }

  function abrirEdicao(p: Pedido) {
    setForm({ ...p })
    setDetalhe(null)
    setModal(true)
  }

  async function salvar() {
    if (!form.cliente_nome || !form.descricao || !form.data_entrega) return
    setSaving(true)
    try {
      if ((form as Pedido).id) {
        await pedidoService.atualizar((form as Pedido).id, form)
      } else {
        await pedidoService.criar(form)
      }
      setModal(false)
      carregar()
    } finally { setSaving(false) }
  }

  async function atualizarStatus(id: string, status: string) {
    await pedidoService.atualizar(id, { status } as Partial<Pedido>)
    carregar()
    setDetalhe(null)
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este pedido?')) return
    await pedidoService.deletar(id)
    carregar()
    setDetalhe(null)
  }

  const filtrados = filtro === 'todos'
    ? pedidos
    : pedidos.filter(p => p.status === filtro)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">📅 Agenda de Pedidos</h2>
        <button onClick={abrirNovo}
          className="bg-pink-500 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-pink-600 transition-colors">
          + Novo
        </button>
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['todos', ...STATUS_LIST].map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-colors ${
              filtro === s ? 'bg-pink-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
            {s === 'todos' ? '📋 Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-pink-300 animate-pulse">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <p className="text-4xl mb-2">🎂</p>
          <p>Nenhum pedido aqui</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(p => (
            <div key={p.id} onClick={() => setDetalhe(p)}
              className="bg-white rounded-2xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{p.cliente_nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{p.descricao}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span className="text-xs text-gray-400">
                      📅 {format(parseISO(p.data_entrega), "dd/MM", { locale: ptBR })}
                      {p.hora_entrega ? ' ' + p.hora_entrega.slice(0,5) : ''}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-2">
                  <p className="font-bold text-green-600">
                    R$ {p.valor.toFixed(2).replace('.', ',')}
                  </p>
                  {p.sinal_pago > 0 && (
                    <p className="text-xs text-gray-400">
                      Sinal: R$ {p.sinal_pago.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalhe */}
      {detalhe && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0"
          onClick={() => setDetalhe(null)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-700">{detalhe.cliente_nome}</h3>
              <button onClick={() => setDetalhe(null)} className="text-gray-400">✕</button>
            </div>
            <p className="text-sm text-gray-500">{detalhe.descricao}</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-pink-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Entrega</p>
                <p className="font-semibold text-gray-700">
                  {format(parseISO(detalhe.data_entrega), "dd/MM/yyyy")}
                  {detalhe.hora_entrega ? ' ' + detalhe.hora_entrega.slice(0,5) : ''}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Valor total</p>
                <p className="font-bold text-green-600">R$ {detalhe.valor.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Sinal pago</p>
                <p className="font-semibold text-blue-600">R$ {detalhe.sinal_pago.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">Restante</p>
                <p className="font-semibold text-amber-600">
                  R$ {(detalhe.valor - detalhe.sinal_pago).toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
            {detalhe.observacoes && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">{detalhe.observacoes}</p>
            )}
            {/* Mudar status */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Atualizar status:</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_LIST.filter(s => s !== detalhe.status).map(s => (
                  <button key={s} onClick={() => atualizarStatus(detalhe.id, s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 transition-colors">
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => abrirEdicao(detalhe)}
                className="flex-1 bg-pink-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-600">
                ✏️ Editar
              </button>
              <button onClick={() => deletar(detalhe.id)}
                className="bg-red-50 text-red-400 py-2.5 px-4 rounded-xl text-sm hover:bg-red-100">
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setModal(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-3 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-700">
                {(form as Pedido).id ? 'Editar Pedido' : 'Novo Pedido'}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-400">✕</button>
            </div>
            {/* Nome do cliente */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cliente *</label>
              {clientes.length > 0 ? (
                <select value={form.cliente_nome}
                  onChange={e => {
                    const c = clientes.find(x => x.nome === e.target.value)
                    setForm(f => ({ ...f, cliente_nome: e.target.value, cliente_id: c?.id }))
                  }}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                  <option value="">Selecione ou digite...</option>
                  {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Nome do cliente" value={form.cliente_nome}
                  onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição do pedido *</label>
              <input type="text" placeholder="Ex: Bolo de chocolate 2kg" value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data entrega *</label>
                <input type="date" value={form.data_entrega}
                  onChange={e => setForm(f => ({ ...f, data_entrega: e.target.value }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hora (opcional)</label>
                <input type="time" value={form.hora_entrega || ''}
                  onChange={e => setForm(f => ({ ...f, hora_entrega: e.target.value }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor total (R$)</label>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Sinal pago (R$)</label>
                <input type="number" step="0.01" min="0" value={form.sinal_pago}
                  onChange={e => setForm(f => ({ ...f, sinal_pago: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Forma de pagamento</label>
              <select value={form.forma_pagamento}
                onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value as Pedido['forma_pagamento'] }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                {FORMA_LIST.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Pedido['status'] }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observações</label>
              <textarea rows={2} placeholder="Detalhes, sabores, decoração..." value={form.observacoes || ''}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none" />
            </div>
            <button onClick={salvar} disabled={saving}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
              {saving ? 'Salvando...' : ((form as Pedido).id ? 'Salvar alterações' : 'Criar pedido 🎂')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
