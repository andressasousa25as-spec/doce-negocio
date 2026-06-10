import { useState } from 'react'
import type { Perfil } from '../types'
import { perfilService } from '../services/supabaseService'

interface Props {
  perfil: Perfil
  setPerfil: (p: Perfil) => void
  onLogout: () => void
}

const S = {
  wrap: { display: 'flex', flexDirection: 'column' as const, gap: 16, width: '100%' },
  h2: { fontSize: 18, fontWeight: 700, color: '#374151', margin: 0 },
  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', boxSizing: 'border-box' as const,
  },
  label: { fontSize: 11, color: '#6B7280', marginBottom: 4, display: 'block' as const },
  input: {
    width: '100%', border: '1px solid #FBCFE8', borderRadius: 12,
    padding: '10px 12px', fontSize: 14, outline: 'none',
    boxSizing: 'border-box' as const,
  },
  btn: {
    width: '100%', backgroundColor: '#EC4899', color: 'white', fontWeight: 700,
    padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontSize: 14,
  },
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

  const campos = [
    { field: 'nome',         label: 'Seu nome',            type: 'text', placeholder: 'Nome completo' },
    { field: 'nome_negocio', label: 'Nome da confeitaria', type: 'text', placeholder: 'Ex: Doces da Maria' },
    { field: 'cnpj_mei',     label: 'CNPJ MEI',            type: 'text', placeholder: '00.000.000/0001-00' },
    { field: 'telefone',     label: 'WhatsApp',            type: 'tel',  placeholder: '(96) 99999-9999' },
    { field: 'cidade',       label: 'Cidade',              type: 'text', placeholder: 'Macapá' },
  ]

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>👤 Meu Perfil</h2>

      {/* Card plano */}
      <div style={{
        background: 'linear-gradient(135deg, #FBBF24 0%, #EC4899 100%)',
        borderRadius: 16, padding: 18, color: 'white',
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Plano atual</p>
            <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, textTransform: 'capitalize' }}>
              {perfil.plano}
            </p>
          </div>
          <span style={{
            flexShrink: 0, fontSize: 12, padding: '3px 10px', borderRadius: 999,
            fontWeight: 600, whiteSpace: 'nowrap',
            backgroundColor: perfil.ativo ? '#34D399' : '#F87171', color: 'white',
          }}>
            {perfil.ativo ? '✅ Ativo' : '❌ Inativo'}
          </span>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
          R$ {(perfil.valor_plano || 0).toFixed(2).replace('.', ',')}/mês
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
          Vence em: {venc}
        </p>
      </div>

      {/* Formulário */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 12px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
          Dados do negócio
        </h3>
        {sucesso && (
          <div style={{ backgroundColor: '#ECFDF5', color: '#059669', fontSize: 13, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            ✅ Perfil atualizado com sucesso!
          </div>
        )}
        {erro && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', fontSize: 13, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            {erro}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campos.map(({ field, label, type, placeholder }) => (
            <div key={field}>
              <label style={S.label}>{label}</label>
              <input type={type} placeholder={placeholder}
                value={(form as Record<string, unknown>)[field] as string || ''}
                onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                style={S.input} />
            </div>
          ))}
          <div>
            <label style={S.label}>E-mail</label>
            <input type="email" value={perfil.email} disabled
              style={{ ...S.input, border: '1px solid #F3F4F6', backgroundColor: '#F9FAFB', color: '#9CA3AF', cursor: 'not-allowed' }} />
          </div>
          <button onClick={salvar} disabled={saving}
            style={{ ...S.btn, opacity: saving ? 0.5 : 1, marginTop: 4 }}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Assinatura */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 12px', fontWeight: 600, color: '#374151', fontSize: 14 }}>
          💳 Assinatura
        </h3>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 12px' }}>
          {perfil.status_assinatura === 'trial'
            ? 'Você está no teste grátis. Assine para não perder o acesso.'
            : perfil.status_assinatura === 'ativa'
            ? `Plano ${perfil.plano === 'completo' ? 'Completo' : 'Básico'} ativo.`
            : 'Sem assinatura ativa. Escolha um plano para liberar o app.'}
        </p>
        <button
          onClick={() => { window.location.href = '/?assinar=1' }}
          style={{
            display: 'block', width: '100%', backgroundColor: '#EC4899', color: 'white', fontSize: 14,
            textAlign: 'center', fontWeight: 700, padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
          }}>
          {perfil.status_assinatura === 'ativa' ? 'Trocar de plano' : 'Ver planos e assinar'}
        </button>
      </div>

      {/* Sair */}
      <button onClick={onLogout}
        style={{
          width: '100%', border: '1px solid #FECACA', color: '#F87171', fontWeight: 600,
          padding: '12px', borderRadius: 12, backgroundColor: 'transparent', cursor: 'pointer',
          fontSize: 14,
        }}>
        Sair da conta
      </button>
    </div>
  )
}
