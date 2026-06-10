import { useState, useEffect } from 'react'
import type { Perfil } from '../types'
import Home       from '../components/Home'
import Agenda     from '../components/Agenda'
import Caixa      from '../components/Caixa'
import Clientes   from '../components/Clientes'
import ModuloMei  from '../components/ModuloMei'
import Perfil_    from '../components/PerfilPage'

interface Props { perfil: Perfil; onLogout: () => void; setPerfil: (p: Perfil) => void }
type Aba = 'home' | 'agenda' | 'caixa' | 'clientes' | 'mei' | 'perfil'

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'home',     label: 'Inicio',   icon: '🏠' },
  { id: 'agenda',   label: 'Agenda',   icon: '📅' },
  { id: 'caixa',    label: 'Caixa',    icon: '💰' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'mei',      label: 'MEI',      icon: '📋' },
  { id: 'perfil',   label: 'Perfil',   icon: '👤' },
]
const SIDEBAR_W = 224
const CONTENT_MAX = 900   // largura máxima da área de conteúdo (centralizada)

export default function Dashboard({ perfil, onLogout, setPerfil }: Props) {
  const [aba, setAba] = useState<Aba>('home')
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 768)
  useEffect(() => {
    const fn = () => setDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF0F5', display: 'flex' }}>

      {desktop && (
        <aside style={{ position: 'fixed', top: 0, left: 0, width: SIDEBAR_W, height: '100vh', backgroundColor: 'white', borderRight: '1px solid #FCE7F3', display: 'flex', flexDirection: 'column', zIndex: 20, flexShrink: 0 }}>
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid #FCE7F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#EC4899,#F9A8D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🎂</div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontWeight: 700, color: '#BE185D', fontSize: 13, margin: 0 }}>Doce Negócio</p>
                <p style={{ fontSize: 11, color: '#F472B6', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 128 }}>{perfil.nome_negocio || perfil.nome}</p>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', backgroundColor: aba === a.id ? '#FDF2F8' : 'transparent', color: aba === a.id ? '#DB2777' : '#6B7280', borderLeft: aba === a.id ? '3px solid #EC4899' : '3px solid transparent' }}>
                <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{a.icon}</span>{a.label}
              </button>
            ))}
          </nav>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #FCE7F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#EC4899,#F9A8D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 700, flexShrink: 0 }}>
                {(perfil.nome_negocio || perfil.nome).charAt(0).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, margin: 0 }}>{perfil.nome_negocio || perfil.nome}</p>
                <p style={{ fontSize: 10, color: perfil.ativo ? '#16A34A' : '#DC2626', margin: 0 }}>{perfil.ativo ? '● Ativo' : '● Inativo'}</p>
              </div>
            </div>
            <button onClick={onLogout} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sair da conta →</button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: desktop ? SIDEBAR_W : 0, minWidth: 0 }}>

        {!desktop && (
          <div style={{ backgroundColor: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #FCE7F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🎂</span>
              <div>
                <p style={{ fontSize: 10, color: '#F472B6', margin: 0 }}>Olá,</p>
                <p style={{ fontWeight: 700, color: '#BE185D', fontSize: 13, margin: 0 }}>{perfil.nome_negocio || perfil.nome}</p>
              </div>
            </div>
            <button onClick={onLogout} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
          </div>
        )}

        {desktop && (
          <div style={{ backgroundColor: 'white', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #FCE7F3' }}>
            <div style={{ maxWidth: CONTENT_MAX, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <h1 style={{ fontWeight: 700, color: '#111827', fontSize: 16, margin: 0 }}>{ABAS.find(a => a.id === aba)?.icon} {ABAS.find(a => a.id === aba)?.label}</h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, backgroundColor: perfil.ativo ? '#F0FDF4' : '#FEF2F2', color: perfil.ativo ? '#16A34A' : '#DC2626' }}>
              {perfil.ativo ? '✓ Plano ativo' : '✗ Plano inativo'}
            </span>
            </div>
          </div>
        )}

        <div style={{ flex: 1, padding: desktop ? '28px 32px 48px' : '16px 16px 100px', maxWidth: CONTENT_MAX, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          {aba === 'home'     && <Home     perfil={perfil} />}
          {aba === 'agenda'   && <Agenda   perfil={perfil} />}
          {aba === 'caixa'    && <Caixa    perfil={perfil} />}
          {aba === 'clientes' && <Clientes perfil={perfil} />}
          {aba === 'mei'      && <ModuloMei />}
          {aba === 'perfil'   && <Perfil_  perfil={perfil} setPerfil={setPerfil} onLogout={onLogout} />}
        </div>
      </div>

      {!desktop && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'white', borderTop: '1px solid #FCE7F3', display: 'flex', zIndex: 20 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer', color: aba === a.id ? '#EC4899' : '#9CA3AF' }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>{a.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}