import { useState, useEffect } from 'react'
import type { Perfil, Caixa as CaixaTipo } from '../types'
import { caixaService } from '../services/supabaseService'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { perfil: Perfil }

const CAT_ENTRADA = ['venda','sinal','outro']
const CAT_SAIDA   = ['insumo','embalagem','equipamento','taxa','outro']

const VAZIO = {
  tipo: 'entrada' as 'entrada'|'saida',
  categoria: 'venda',
  descricao: '',
  valor: 0,
  data: new Date().toISOString().split('T')[0],
  forma_pagamento: 'pix' as 'pix'|'dinheiro'|'cartao'|'transferencia'
}

export default function Caixa({ perfil }: Props) {
  const [lancamentos, setLancamentos] = useState<CaixaTipo[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState({ ...VAZIO })
  const [saving,      setSaving]      = useState(false)
  const [mes,         setMes]         = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => { carregar() }, [mes, perfil.id])

  async function carregar() {
    setLoading(true)
    caixaService.listar(perfil.id, mes)
      .then(d => setLancamentos(d || []))
      .finally(() => setLoading(false))
  }

  async function salvar() {
    if (!form.descricao || !form.valor || !form.data) return
    setSaving(true)
    try {
      await caixaService.criar({ ...form, perfil_id: perfil.id })
      setModal(false)
      setForm({ ...VAZIO })
      carregar()
    } finally { setSaving(false) }
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    await caixaService.deletar(id)
    carregar()
  }

  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas   = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo    = entradas - saidas

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">💰 Caixa</h2>
        <button onClick={() => { setForm({ ...VAZIO }); setModal(true) }}
          className="bg-pink-500 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-pink-600">
          + Lançar
        </button>
      </div>

      {/* Seletor de mês */}
      <input type="month" value={mes} onChange={e => setMes(e.target.value)}
        className="w-full border border-pink-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-gray-400">Entradas</p>
          <p className="font-bold text-green-600 text-sm">R$ {entradas.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-gray-400">Saídas</p>
          <p className="font-bold text-red-400 text-sm">R$ {saidas.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className={`rounded-2xl p-3 text-center ${saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <p className="text-xs text-gray-400">Saldo</p>
          <p className={`font-bold text-sm ${saldo >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
            R$ {saldo.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-8 text-pink-300 animate-pulse">Carregando...</div>
      ) : lancamentos.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <p className="text-4xl mb-2">💸</p>
          <p>Nenhum lançamento neste mês</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lancamentos.map(l => (
            <div key={l.id} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{l.tipo === 'entrada' ? '⬆️' : '⬇️'}</span>
                <div>
                  <p className="font-medium text-gray-700 text-sm">{l.descricao}</p>
                  <p className="text-xs text-gray-400">
                    {l.categoria} · {format(new Date(l.data + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`font-bold text-sm ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-400'}`}>
                  {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toFixed(2).replace('.', ',')}
                </p>
                <button onClick={() => deletar(l.id)} className="text-gray-300 hover:text-red-400 text-xs">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setModal(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-700">Novo Lançamento</h3>
              <button onClick={() => setModal(false)} className="text-gray-400">✕</button>
            </div>
            {/* Tipo */}
            <div className="flex rounded-xl bg-gray-100 p-1">
              {(['entrada','saida'] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t, categoria: t === 'entrada' ? 'venda' : 'insumo' }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    form.tipo === t
                      ? (t === 'entrada' ? 'bg-green-500 text-white' : 'bg-red-400 text-white')
                      : 'text-gray-500'}`}>
                  {t === 'entrada' ? '⬆️ Entrada' : '⬇️ Saída'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                {(form.tipo === 'entrada' ? CAT_ENTRADA : CAT_SAIDA).map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
              <input type="text" placeholder="Ex: Venda bolo de aniversário" value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Valor (R$) *</label>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data</label>
                <input type="date" value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Forma de pagamento</label>
              <select value={form.forma_pagamento}
                onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value as CaixaTipo['forma_pagamento'] }))}
                className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300">
                {['pix','dinheiro','cartao','transferencia'].map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>
                ))}
              </select>
            </div>
            <button onClick={salvar} disabled={saving}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
              {saving ? 'Salvando...' : 'Lançar 💸'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
