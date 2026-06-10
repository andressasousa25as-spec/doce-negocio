import { useState, useEffect } from 'react'
import type { Perfil, Aviso } from '../../types'
import { avisoService, emailService } from '../../services/supabaseService'
import { linkWhatsApp } from '../../lib/whatsapp'

const inp: React.CSSProperties = { width: '100%', border: '1px solid #FBCFE8', borderRadius: 10, padding: '9px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }

export default function AdmNovidades({ clientes }: { clientes: Perfil[] }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [tipo, setTipo] = useState<Aviso['tipo']>('info')
  const [agendar, setAgendar] = useState('')
  const [porEmail, setPorEmail] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [zap, setZap] = useState<string>('')

  function carregar() { avisoService.listarTodos().then(setAvisos).catch(() => {}) }
  useEffect(() => { carregar() }, [])

  async function publicar() {
    if (!titulo || !mensagem) return
    setSalvando(true)
    try {
      await avisoService.criar({ titulo, mensagem, tipo, agendado_para: agendar ? new Date(agendar).toISOString() : null })
      if (porEmail) {
        const r = await emailService.enviar(titulo, mensagem)
        alert(`E-mails enviados: ${r.enviados} · falhas: ${r.falhas}`)
      }
      setZap(mensagem)
      setTitulo(''); setMensagem(''); setAgendar(''); setPorEmail(false)
      carregar()
    } catch { alert('Não foi possível publicar.') }
    finally { setSalvando(false) }
  }

  const comZap = clientes.filter(c => linkWhatsApp(c.telefone, '') !== null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontWeight: 700, color: '#374151', fontSize: 14, margin: 0 }}>Nova novidade</p>
        <input placeholder="Título" value={titulo} onChange={e => setTitulo(e.target.value)} style={inp} />
        <textarea placeholder="Mensagem" value={mensagem} onChange={e => setMensagem(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={tipo} onChange={e => setTipo(e.target.value as Aviso['tipo'])} style={{ ...inp, width: 'auto' }}>
            <option value="info">Info</option><option value="promo">Promoção</option><option value="alerta">Alerta</option>
          </select>
          <label style={{ fontSize: 12, color: '#6B7280' }}>Agendar: <input type="datetime-local" value={agendar} onChange={e => setAgendar(e.target.value)} style={{ ...inp, width: 'auto', display: 'inline-block' }} /></label>
          <label style={{ fontSize: 12, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={porEmail} onChange={e => setPorEmail(e.target.checked)} /> Enviar por e-mail
          </label>
        </div>
        <button onClick={publicar} disabled={salvando || !titulo || !mensagem} style={{ backgroundColor: salvando ? '#F9A8D4' : '#EC4899', color: '#fff', fontWeight: 700, padding: '11px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14 }}>
          {salvando ? 'Publicando...' : 'Publicar'}
        </button>
      </div>

      {zap && comZap.length > 0 && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', margin: '0 0 8px' }}>📱 Enviar no WhatsApp (clique em cada uma)</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {comZap.map(c => (
              <a key={c.id} href={linkWhatsApp(c.telefone, zap)!} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: '#16A34A', textDecoration: 'none' }}>→ {c.nome} ({c.telefone})</a>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {avisos.map(a => (
          <div key={a.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 13, margin: '0 0 2px' }}>{a.titulo}</p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{a.tipo}{a.agendado_para ? ' · agendado' : ''}{a.ativo ? '' : ' · inativo'}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => avisoService.alternar(a.id, !a.ativo).then(carregar)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: '#FCE7F3', color: '#BE185D' }}>{a.ativo ? 'Desligar' : 'Ligar'}</button>
              <button onClick={() => { if (confirm('Excluir aviso?')) avisoService.excluir(a.id).then(carregar) }} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', backgroundColor: '#FEF2F2', color: '#DC2626' }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
