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

const S = {
  input: {
    width: '100%', border: '1px solid #FBCFE8', borderRadius: 12,
    padding: '10px 12px', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, display: 'block' as const },
  select: {
    width: '100%', border: '1px solid #FBCFE8', borderRadius: 12,
    padding: '10px 12px', fontSize: 13, outline: 'none',
    backgroundColor: 'white', boxSizing: 'border-box' as const,
  },
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
    if (!confirm('Excluir este lancamento?')) return
    await caixaService.deletar(id)
    carregar()
  }

  const entradas = lancamentos.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas   = lancamentos.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)
  const saldo    = entradas - saidas

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#374151', margin: 0 }}>Caixa</h2>
        <button
          onClick={() => { setForm({ ...VAZIO }); setModal(true) }}
          style={{ backgroundColor: '#EC4899', color: 'white', fontSize: 13, padding: '8px 18px', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          + Lancar
        </button>
      </div>

      {/* Seletor de mes */}
      <input
        type="month"
        value={mes}
        onChange={e => setMes(e.target.value)}
        style={S.input}
      />

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ backgroundColor: '#F0FDF4', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 4px' }}>Entradas</p>
          <p style={{ fontWeight: 700, color: '#16A34A', fontSize: 13, margin: 0 }}>R$ {entradas.toFixed(2).replace('.', ',')}</p>
        </div>
        <div style={{ backgroundColor: '#FEF2F2', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 4px' }}>Saidas</p>
          <p style={{ fontWeight: 700, color: '#F87171', fontSize: 13, margin: 0 }}>R$ {saidas.toFixed(2).replace('.', ',')}</p>
        </div>
        <div style={{ backgroundColor: saldo >= 0 ? '#EFF6FF' : '#FFF7ED', borderRadius: 16, padding: '12px 10px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 4px' }}>Saldo</p>
          <p style={{ fontWeight: 700, color: saldo >= 0 ? '#2563EB' : '#EA580C', fontSize: 13, margin: 0 }}>R$ {saldo.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#F9A8D4', fontSize: 14 }}>Carregando...</div>
      ) : lancamentos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#D1D5DB' }}>
          <p style={{ fontSize: 40, margin: '0 0 8px' }}>💸</p>
          <p style={{ fontSize: 13, margin: 0 }}>Nenhum lancamento neste mes</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lancamentos.map(l => (
            <div key={l.id} style={{ backgroundColor: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{l.tipo === 'entrada' ? '⬆️' : '⬇️'}</span>
                <div>
                  <p style={{ fontWeight: 500, color: '#374151', fontSize: 13, margin: '0 0 2px' }}>{l.descricao}</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
                    {l.categoria} · {format(new Date(l.data + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: l.tipo === 'entrada' ? '#16A34A' : '#F87171', margin: 0 }}>
                  {l.tipo === 'entrada' ? '+' : '-'} R$ {l.valor.toFixed(2).replace('.', ',')}
                </p>
                <button onClick={() => deletar(l.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#D1D5DB', padding: 4 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div
          onClick={() => setModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', width: '100%', maxWidth: 448, borderRadius: '24px 24px 0 0', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontWeight: 700, color: '#374151', fontSize: 15, margin: 0 }}>Novo Lancamento</h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}>✕</button>
            </div>

            {/* Toggle entrada/saida */}
            <div style={{ display: 'flex', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, gap: 4 }}>
              {(['entrada','saida'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, tipo: t, categoria: t === 'entrada' ? 'venda' : 'insumo' }))}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    backgroundColor: form.tipo === t ? (t === 'entrada' ? '#16A34A' : '#F87171') : 'transparent',
                    color: form.tipo === t ? 'white' : '#6B7280',
                    transition: 'all 0.15s',
                  }}>
                  {t === 'entrada' ? '⬆️ Entrada' : '⬇️ Saida'}
                </button>
              ))}
            </div>

            <div>
              <label style={S.label}>Categoria</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} style={S.select}>
                {(form.tipo === 'entrada' ? CAT_ENTRADA : CAT_SAIDA).map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={S.label}>Descricao *</label>
              <input
                type="text"
                placeholder="Ex: Venda bolo de aniversario"
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                style={S.input}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={S.label}>Valor (R$) *</label>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
                  style={S.input} />
              </div>
              <div>
                <label style={S.label}>Data</label>
                <input type="date" value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  style={S.input} />
              </div>
            </div>

            <div>
              <label style={S.label}>Forma de pagamento</label>
              <select
                value={form.forma_pagamento}
                onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value as CaixaTipo['forma_pagamento'] }))}
                style={S.select}>
                {['pix','dinheiro','cartao','transferencia'].map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={salvar}
              disabled={saving}
              style={{ width: '100%', backgroundColor: saving ? '#F9A8D4' : '#EC4899', color: 'white', fontWeight: 700, padding: '12px 0', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, marginTop: 4 }}>
              {saving ? 'Salvando...' : 'Lancar 💸'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
