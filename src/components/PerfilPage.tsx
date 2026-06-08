import { useState } from 'react'
import type { Perfil } from '../types'
import { perfilService } from '../services/supabaseService'

interface Props {
  perfil: Perfil
  setPerfil: (p: Perfil) => void
  onLogout: () => void
}

export default function PerfilPage({ perfil, setPerfil, onLogout }: Props) {
  const [form,    setForm]    = useState({ ...perfil })
  const [saving,  setSaving]  = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro,    setErro]    = useState('')

  async function salvar() {
    setSaving(true); setErro(''); setSucesso(false)
    try {
      const atualizado = await perfilService.atualizar(perfil.id, {
        nome:         form.nome,
        telefone:     form.telefone,
        nome_negocio: form.nome_negocio,
        cnpj_mei:     form.cnpj_mei,
        cidade:       form.cidade,
      })
      setPerfil(atualizado)
      setSucesso(true)
      setTimeout(() => setSucesso(false), 3000)
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally { setSaving(false) }
  }

  const venc = perfil.data_venc
    ? new Date(perfil.data_venc + 'T12:00:00').toLocaleDateString('pt-BR')
    : '—'

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-700">👤 Meu Perfil</h2>

      {/* Card plano */}
      <div className="bg-gradient-to-r from-amber-400 to-pink-500 rounded-2xl p-4 text-white">
        <p className="text-white/80 text-xs">Plano atual</p>
        <p className="text-xl font-bold capitalize mt-0.5">{perfil.plano}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-white/80 text-sm">
            R$ {(perfil.valor_plano || 0).toFixed(2).replace('.', ',')}/mês
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            perfil.ativo ? 'bg-green-400 text-white' : 'bg-red-400 text-white'}`}>
            {perfil.ativo ? '✅ Ativo' : '❌ Inativo'}
          </span>
        </div>
        <p className="text-white/70 text-xs mt-1">Vence em: {venc}</p>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 text-sm">Dados do negócio</h3>
        {sucesso && (
          <div className="bg-green-50 text-green-600 text-sm rounded-xl p-3">
            ✅ Perfil atualizado com sucesso!
          </div>
        )}
        {erro && (
          <div className="bg-red-50 text-red-500 text-sm rounded-xl p-3">{erro}</div>
        )}
        {[
          { field: 'nome',         label: 'Seu nome',          type: 'text', placeholder: 'Nome completo' },
          { field: 'nome_negocio', label: 'Nome da confeitaria', type: 'text', placeholder: 'Ex: Doces da Maria' },
          { field: 'cnpj_mei',     label: 'CNPJ MEI',          type: 'text', placeholder: '00.000.000/0001-00' },
          { field: 'telefone',     label: 'WhatsApp',           type: 'tel',  placeholder: '(96) 99999-9999' },
          { field: 'cidade',       label: 'Cidade',             type: 'text', placeholder: 'Macapá' },
        ].map(({ field, label, type, placeholder }) => (
          <div key={field}>
            <label className="text-xs text-gray-500 mb-1 block">{label}</label>
            <input type={type} placeholder={placeholder}
              value={(form as Record<string,string>)[field] || ''}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full border border-pink-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">E-mail</label>
          <input type="email" value={perfil.email} disabled
            className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
        </div>
        <button onClick={salvar} disabled={saving}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {/* Pagamento */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">💳 Assinatura</h3>
        <a href="https://www.mercadopago.com.br" target="_blank" rel="noreferrer"
          className="block bg-blue-500 text-white text-sm text-center font-bold py-2.5 rounded-xl hover:bg-blue-600 transition-colors">
          Gerenciar assinatura →
        </a>
      </div>

      {/* Sair */}
      <button onClick={onLogout}
        className="w-full border border-red-200 text-red-400 font-semibold py-3 rounded-xl hover:bg-red-50 transition-colors text-sm">
        Sair da conta
      </button>
    </div>
  )
}
