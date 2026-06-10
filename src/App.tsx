import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { Perfil } from './types'
import LoginPage    from './pages/LoginPage'
import Dashboard    from './pages/Dashboard'
import DashboardAdm from './pages/DashboardAdm'
import { calcularAcesso } from './lib/acesso'
import Planos from './pages/Planos'

export default function App() {
  const [perfil,    setPerfil]    = useState<Perfil | null>(null)
  const [iniciando, setIniciando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        carregarPerfil(data.session.user.id)
      } else {
        setIniciando(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        carregarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setIniciando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function carregarPerfil(userId: string) {
    try {
      // Tenta buscar perfil existente
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // usa maybeSingle em vez de single — não lança erro se não encontrar

      if (error) {
        console.error('Erro ao buscar perfil:', error)
        setIniciando(false)
        return
      }

      if (data) {
        setPerfil(data)
      } else {
        // Perfil não existe ainda — busca dados do usuário autenticado
        const { data: userData } = await supabase.auth.getUser()
        if (userData?.user) {
          // Cria perfil automaticamente
          const venc = new Date()
          venc.setDate(venc.getDate() + 3)
          const { data: novoPerfil } = await supabase
            .from('perfis')
            .insert({
              id: userData.user.id,
              nome: userData.user.email?.split('@')[0] || 'Confeiteira',
              email: userData.user.email || '',
              ativo: false,
              plano: 'completo',
              status_assinatura: 'trial',
              valor_plano: 0,
              data_inicio: new Date().toISOString().split('T')[0],
              data_venc: venc.toISOString().split('T')[0],
              is_adm: false
            })
            .select()
            .maybeSingle()
          if (novoPerfil) setPerfil(novoPerfil)
        }
      }
    } catch (err) {
      console.error('Erro inesperado:', err)
    } finally {
      setIniciando(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  // Tela de carregamento inicial
  if (iniciando) return (
    <div className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #F4A7B9 0%, #FFF8F0 100%)' }}>
      <div className="text-5xl mb-4">🎂</div>
      <p className="text-pink-600 font-semibold text-lg animate-pulse">
        Carregando Doce Negócio...
      </p>
    </div>
  )

  // Não autenticado → Login
  if (!perfil) return <LoginPage onLogin={setPerfil} />

  // ADM → Painel ADM
  if (perfil.is_adm) return <DashboardAdm perfil={perfil} onLogout={handleLogout} />

  // Controle de acesso (trial / assinatura / bloqueio)
  const acesso = calcularAcesso(perfil)
  if (acesso.estado === 'bloqueada') {
    return <Planos perfil={perfil} onLogout={handleLogout} />
  }

  const querAssinar = new URLSearchParams(window.location.search).get('assinar') === '1'
  if (querAssinar) return <Planos perfil={perfil} onLogout={handleLogout} />

  // Confeiteira → Dashboard principal
  return <Dashboard perfil={perfil} acesso={acesso} onLogout={handleLogout} setPerfil={setPerfil} />
}
