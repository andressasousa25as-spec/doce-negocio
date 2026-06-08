import { useState, useEffect } from 'react'
import type { Perfil, Cliente } from '../types'
import { clienteService } from '../services/supabaseService'

interface Props { perfil: Perfil }

const VAZIO: Omit<Cliente,'id'|'created_at'> = {
  perfil_id: '', nome: '', telefone: '', email: '', endereco: '', observacoes: '', ativo: true
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-700">👥 Clientes</h2>
        <button onClick={abrirNovo}
          className="bg-pink-500 text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-pink-600">
          + Novo
        </button>
      </div>
      <input type="text" placeholder="🔍 Buscar cliente..." value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full border border-pink-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />

      {loading ? (
        <div className="text-center py-8 text-pink-300 animate-pulse">Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-300">
          <p className="text-4xl mb-2">👥</p>
          <p>{busca ? 'Nenhum resultado' : 'Nenhum cliente ainda'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map(c => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-700">{c.nome}</p>
                {c.telefone && (
                  <a href={`https://wa.me/55${c.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="text-xs text-green-500 hover:underline">
                    📱 {c.telefone}
                  </a>
                )}
                {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirEdicao(c)} className="text-pink-400 hover:text-pink-600 text-sm">✏️</button>
                <button onClick={() => deletar(c.id)} className="text-gray-300 hover:text-red-400 text-sm">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setModal(false)}>
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-3"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-700">
                {(form as Cliente).id ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-400">✕</button>
            </div>
            {[
              { field: 'nome',       label: 'Nome *',     type: 'text',  placeholder: 'Nome completo' },
              { field: 'telefone',   label: 'WhatsApp',   type: 'tel',   placeholder: '(96) 99999-9999' },
              { field: 'email',      label: 'E-mail',     type: 'email', placeholder: 'email@exemplo.com' },
              { field: 'endereco',   label: 'Endereço',   type: 'text',  placeholder: 'Rua, número, bairro' },
              { field: 'observacoes',label: 'Observações',type: 'text',  placeholder: 'Preferências, alergias...' },
            ].map(({ field, label, type, placeholder }) => (
              <div key={field}>
                <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                <input type={type} placeholder={placeholder}
                  value={(form as Record<string, unknown>)[field] as string || ''}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              </div>
            ))}
            <button onClick={salvar} disabled={saving}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar cliente 👥'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
