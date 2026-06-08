import { useState, useEffect } from 'react'
import type { Perfil } from '../types'
import Home       from '../components/Home'
import Agenda     from '../components/Agenda'
import Caixa      from '../components/Caixa'
import Clientes   from '../components/Clientes'
import ModuloMei  from '../components/ModuloMei'
import Perfil_    from '../components/PerfilPage'

interface Props {
  perfil: Perfil
  onLogout: () => void
  setPerfil: (p: Perfil) => void
}

type Aba = 'home' | 'agenda' | 'caixa' | 'clientes' | 'mei' | 'perfil'

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'home',     label: 'Inicio',   icon: '🏠' },
  { id: 'agenda',   label: 'Agenda',   icon: '📅' },
  { id: 'caixa',    label: 'Caixa',    icon: '💰' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'mei',      label: 'MEI',      icon: '📋' },
  { id: 'perfil',   label: 'Perfil',   icon: '👤' },
]

const SIDEBAR_W = 232

export default function Dashboard({ perfil, onLogout, setPerfil }: Props) {
  const [aba, setAba] = useState<Aba>('home')
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 768)

  useEffect(() => {
    const fn = () => setDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const mainStyle = desktop
    ? { marginLeft: SIDEBAR_W, paddingLeft: 32, paddingRight: 32 }
    : {}

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFF0F5', display: 'flex', flexDirection: desktop ? 'row' : 'column' }}>

      {/* SIDEBAR desktop */}
      {desktop && (
        <aside style={{
          position: 'fixed', top: 0, left: 0,
          width: SIDEBAR_W, height: '100vh',
          backgroundColor: 'white',
          boxShadow: '2px 0 8px rgba(0,0,0,0.08)',
          display: 'flex', flexDirection: 'column',
          zIndex: 20
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #FCE7F3' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>🎂</span>
              <div>
                <p style={{ fontWeight: 700, color: '#BE185D', fontSize: 13 }}>Doce Negocio</p>
                <p style={{ fontSize: 11, color: '#F472B6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
                  {perfil.nome_negocio || perfil.nome}
                </p>
              </div>
            </div>
          </div>
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                backgroundColor: aba === a.id ? '#EC4899' : 'transparent',
                color: aba === a.id ? 'white' : '#6B7280',
              }}>
                <span style={{ fontSize: 16 }}>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '12px 16px', borderTop: '1px solid #FCE7F3' }}>
            <button onClick={onLogout} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
              Sair da conta
            </button>
          </div>
        </aside>
      )}

      {/* CONTEUDO PRINCIPAL */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', ...mainStyle }}>

        {/* Header mobile */}
        {!desktop && (
          <div style={{ backgroundColor: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🎂</span>
              <div>
                <p style={{ fontSize: 10, color: '#F472B6' }}>Ola,</p>
                <p style={{ fontWeight: 700, color: '#BE185D', fontSize: 13 }}>
                  {perfil.nome_negocio || perfil.nome}
                </p>
              </div>
            </div>
            <button onClick={onLogout} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
          </div>
        )}

        {/* Header desktop */}
        {desktop && (
          <div style={{ backgroundColor: 'white', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h1 style={{ fontWeight: 700, color: '#374151', fontSize: 15 }}>
              {ABAS.find(a => a.id === aba)?.icon} {ABAS.find(a => a.id === aba)?.label}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                Plano {perfil.plano} · {perfil.ativo ? '✅ Ativo' : '❌ Inativo'}
              </span>
              <button onClick={onLogout} style={{ fontSize: 11, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Sair</button>
            </div>
          </div>
        )}

        {/* Conteudo da aba */}
        <div style={{ flex: 1, paddingTop: desktop ? 24 : 16, paddingBottom: desktop ? 40 : 96, paddingLeft: desktop ? 0 : 16, paddingRight: desktop ? 0 : 16, overflowX: 'hidden' }}>
          {aba === 'home'     && <Home     perfil={perfil} />}
          {aba === 'agenda'   && <Agenda   perfil={perfil} />}
          {aba === 'caixa'    && <Caixa    perfil={perfil} />}
          {aba === 'clientes' && <Clientes perfil={perfil} />}
          {aba === 'mei'      && <ModuloMei />}
          {aba === 'perfil'   && <Perfil_  perfil={perfil} setPerfil={setPerfil} onLogout={onLogout} />}
        </div>
      </div>

      {/* BOTTOM NAV mobile */}
      {!desktop && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: 'white', borderTop: '1px solid #FCE7F3', display: 'flex', zIndex: 20 }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer',
              color: aba === a.id ? '#EC4899' : '#9CA3AF'
            }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{ fontSize: 11, marginTop: 2, fontWeight: 500 }}>{a.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}