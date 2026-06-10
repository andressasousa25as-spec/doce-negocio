import { useState, useEffect } from 'react'
import type { Perfil } from '../types'
import { perfilService } from '../services/supabaseService'
import AdmVisaoGeral from '../components/adm/AdmVisaoGeral'
import AdmClientes from '../components/adm/AdmClientes'
import AdmNovidades from '../components/adm/AdmNovidades'

interface Props { perfil: Perfil; onLogout: () => void }
type AbaAdm = 'visao' | 'clientes' | 'novidades'

const ABAS: { id: AbaAdm; label: string; icon: string }[] = [
  { id: 'visao', label: 'Visão Geral', icon: '📊' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'novidades', label: 'Novidades', icon: '📢' },
]

export default function DashboardAdm({ perfil, onLogout }: Props) {
  const [aba, setAba] = useState<AbaAdm>('visao')
  const [clientes, setClientes] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)

  function carregar() {
    setLoading(true)
    perfilService.listarTodos()
      .then(d => setClientes((d || []).filter((p: Perfil) => !p.is_adm)))
      .finally(() => setLoading(false))
  }
  useEffect(() => { carregar() }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFF0F5,#FFF8F0)', padding: '16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#BE185D', margin: 0 }}>🛡️ Painel ADM</h1>
            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>Olá, {perfil.nome}</p>
          </div>
          <button onClick={onLogout} style={{ fontSize: 12, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', backgroundColor: aba === a.id ? '#EC4899' : '#fff', color: aba === a.id ? '#fff' : '#6B7280' }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#F9A8D4' }}>Carregando...</div>
        ) : aba === 'visao' ? (
          <AdmVisaoGeral clientes={clientes} />
        ) : aba === 'clientes' ? (
          <AdmClientes clientes={clientes} onMudou={carregar} />
        ) : (
          <AdmNovidades clientes={clientes} />
        )}
      </div>
    </div>
  )
}
