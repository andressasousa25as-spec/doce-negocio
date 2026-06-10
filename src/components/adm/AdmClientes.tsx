import { useState } from 'react'
import type { Perfil } from '../../types'
import { admService } from '../../services/supabaseService'
import { linkWhatsApp } from '../../lib/whatsapp'

const STATUS: Record<string, { l: string; bg: string; tx: string }> = {
  ativa: { l: 'Ativo', bg: '#DCFCE7', tx: '#16A34A' },
  trial: { l: 'Teste', bg: '#EDE9FE', tx: '#7C3AED' },
  expirada: { l: 'Vencido', bg: '#FEE2E2', tx: '#DC2626' },
  cancelada: { l: 'Bloqueado', bg: '#F3F4F6', tx: '#6B7280' },
}

function btn(bg: string, tx: string): React.CSSProperties {
  return { fontSize: 12, fontWeight: 600, padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: bg, color: tx }
}

export default function AdmClientes({ clientes, onMudou }: { clientes: Perfil[]; onMudou: () => void }) {
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState<Perfil | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: '', nome_negocio: '', telefone: '', cidade: '' })

  function abrir(c: Perfil) {
    setSel(c)
    setForm({ nome: c.nome || '', nome_negocio: c.nome_negocio || '', telefone: c.telefone || '', cidade: c.cidade || '' })
  }

  async function acao(p: Parameters<typeof admService.executar>[0]) {
    setSalvando(true)
    try { await admService.executar(p); onMudou(); setSel(null) }
    catch { alert('Não foi possível salvar. Tente de novo.') }
    finally { setSalvando(false) }
  }

  const filtrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(busca.toLowerCase()) || c.email?.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)}
        style={{ width: '100%', border: '1px solid #FBCFE8', borderRadius: 12, padding: '10px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />

      {filtrados.map(c => {
        const s = STATUS[c.status_assinatura] || STATUS.expirada
        return (
          <div key={c.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 14, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome_negocio || c.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, backgroundColor: s.bg, color: s.tx }}>{s.l}</span>
              <button onClick={() => abrir(c)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: '#FCE7F3', color: '#BE185D' }}>Gerenciar</button>
            </div>
          </div>
        )
      })}

      {sel && (
        <div onClick={() => !salvando && setSel(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ backgroundColor: '#fff', width: '100%', maxWidth: 448, borderRadius: '24px 24px 0 0', padding: 22, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontWeight: 700, color: '#374151', fontSize: 15, margin: 0 }}>{sel.nome}</h3>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9CA3AF' }}>✕</button>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Plano e acesso</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button disabled={salvando} onClick={() => acao({ acao: 'definir_plano', alvoId: sel.id, dados: { plano: 'basico' } })} style={btn('#FCE7F3', '#BE185D')}>Ativar Básico</button>
                <button disabled={salvando} onClick={() => acao({ acao: 'definir_plano', alvoId: sel.id, dados: { plano: 'completo' } })} style={btn('#EC4899', '#fff')}>Ativar Completo</button>
                <button disabled={salvando} onClick={() => acao({ acao: 'bloquear', alvoId: sel.id })} style={btn('#FEF2F2', '#DC2626')}>Bloquear</button>
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Dar dias grátis</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[7, 15, 30].map(d => (
                  <button key={d} disabled={salvando} onClick={() => acao({ acao: 'dar_dias', alvoId: sel.id, dados: { dias: d } })} style={btn('#F0FDF4', '#16A34A')}>+{d} dias</button>
                ))}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '0 0 6px' }}>Editar dados</p>
              {(['nome', 'nome_negocio', 'telefone', 'cidade'] as const).map(k => (
                <input key={k} placeholder={k} value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #FBCFE8', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }} />
              ))}
              <button disabled={salvando} onClick={() => acao({ acao: 'editar_dados', alvoId: sel.id, dados: form })} style={{ ...btn('#EC4899', '#fff'), width: '100%' }}>Salvar dados</button>
            </div>

            {linkWhatsApp(sel.telefone, `Olá ${sel.nome}! Aqui é do Doce Negócio.`) && (
              <a href={linkWhatsApp(sel.telefone, `Olá ${sel.nome}! Aqui é do Doce Negócio.`)!} target="_blank" rel="noreferrer"
                style={{ textAlign: 'center', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '11px', borderRadius: 12, backgroundColor: '#DCFCE7', color: '#16A34A' }}>
                📱 Abrir WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
