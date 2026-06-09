import { useState, useEffect } from 'react'
import type { Perfil, Cliente } from '../types'
import { clienteService } from '../services/supabaseService'

interface Props { perfil: Perfil }

const VAZIO: Omit<Cliente,'id'|'created_at'> = {
  perfil_id: '', nome: '', telefone: '', email: '', endereco: '', observacoes: '', ativo: true
}

const FIELDS = [
  { field: 'nome',        label: 'Nome *',      type: 'text',  placeholder: 'Nome completo' },
  { field: 'telefone',    label: 'WhatsApp',    type: 'tel',   placeholder: '(96) 99999-9999' },
  { field: 'email',       label: 'E-mail',      type: 'email', placeholder: 'email@exemplo.com' },
  { field: 'endereco',    label: 'Endereco',    type: 'text',  placeholder: 'Rua, numero, bairro' },
  { field: 'observacoes', label: 'Observacoes', type: 'text',  placeholder: 'Preferencias, alergias...' },
]

const S = {
  input: {
    width: '100%', border: '1px solid #FBCFE8', borderRadius: 12,
    padding: '10px 12px', fontSize: 13, outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: { fontSize: 11, color: '#9CA3AF', marginBottom: 4, display: 'block' as const },
}

export default function Clientes({ perfil }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ ...VAZIO, perfil_id: perfil.id })
  const [saving,   setSaving]   = useState(false)
  const [busca,    setBusca]    = useState('')

  useEffect(() => { carregar() }, [perfil.id])

  async function carregar() {
    setLoading(true)
    clienteService.listar(perfil.id)
      .then(d => setClientes(d || []))
      .finally(() => setLoading(false))
  }

  function abrirNovo() {
    setForm({ ...VAZIO, perfil_id: perfil.id })
    setModal(true)
  }

  function abrirEdicao(c: Cliente) {
    setForm({ ...c })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome) return
    setSaving(true)
    try {
      if ((form as Cliente).id) {
        await clienteService.atualizar((form as Cliente).id, form)
      } else {
        await clienteService.criar(form)
      }
      setModal(false)
      carregar()
    } finally { setSaving(false) }
  }

  async function deletar(id: string) {
    if (!confirm('Remover este cliente?')) return
    await clienteService.deletar(id)
    carregar()
  }

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (c.telefone || '').includes(busca)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#374151', margin: 0 }}>Clientes</h2>
        <button onClick={abrirNovo} style={{ backgroundColor: '#EC4899', color: 'white', fontSize: 13, padding: '8px 18px', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          + Novo
        </button>
      </div>

      {/* Busca */}
      <input
        type="text"
        placeholder="Buscar cliente..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{ ...S.input, padding: '10px 16px' }}
      />

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#F9A8D4', fontSize: 14 }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#D1D5DB' }}>
          <p style={{ fontSize: 40, margin: '0 0 8px' }}>👥</p>
          <p style={{ fontSize: 13, margin: 0 }}>{busca ? 'Nenhum resultado' : 'Nenhum cliente ainda'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(c => (
            <div key={c.id} style={{ backgroundColor: 'white', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 600, color: '#374151', fontSize: 14, margin: '0 0 2px' }}>{c.nome}</p>
                {c.telefone && (
                  <a href={'https://wa.me/55' + c.telefone.replace(/\D/g, '')} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: '#16A34A', textDecoration: 'none' }}>
                    📱 {c.telefone}
                  </a>
                )}
                {c.email && <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>{c.email}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => abrirEdicao(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>✏️</button>
                <button onClick={() => deletar(c.id)}  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal novo/editar */}
      {modal && (
        <div
          onClick={() => setModal(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{ backgroundColor: 'white', width: '100%', maxWidth: 448, borderRadius: '24px 24px 0 0', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h3 style={{ fontWeight: 700, color: '#374151', fontSize: 15, margin: 0 }}>
                {(form as Cliente).id ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}>✕</button>
            </div>

            {FIELDS.map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label style={S.label}>{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={(form as Record<string, unknown>)[field] as string || ''}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  style={S.input}
                />
              </div>
            ))}

            <button
              onClick={salvar}
              disabled={saving}
              style={{ width: '100%', backgroundColor: saving ? '#F9A8D4' : '#EC4899', color: 'white', fontWeight: 700, padding: '12px 0', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, marginTop: 4 }}>
              {saving ? 'Salvando...' : 'Salvar cliente 👥'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
