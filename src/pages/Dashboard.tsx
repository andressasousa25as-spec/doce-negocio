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
  { id: 'home',     label: 'Início',   icon: '🏠' },
  { id: 'agenda',   label: 'Agenda',   icon: '📅' },
  { id: 'caixa',   label: 'Caixa',    icon: '💰' },
  { id: 'clientes', label: 'Clientes', icon: '👥' },
  { id: 'mei',      label: 'MEI',      icon: '📋' },
  { id: 'perfil',   label: 'Perfil',   icon: '👤' },
]

export default function Dashboard({ perfil, onLogout, setPerfil }: Props) {
  const [aba, setAba] = useState<Aba>('home')
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768)

  useEffect(() => {
    const handler = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col md:flex-row overflow-x-hidden">

      {/* SIDEBAR — visível só em tablet/desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white shadow-md fixed top-0 left-0 h-full z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-pink-100">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🎂</span>
            <div>
              <p className="font-bold text-pink-700 text-sm leading-tight">Doce Negócio</p>
              <p className="text-xs text-pink-400 truncate max-w-[140px]">{perfil.nome_negocio || perfil.nome}</p>
            </div>
          </div>
        </div>
        {/* Nav links */}
        <nav className="flex-1 py-4 space-y-1 px-2">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                aba === a.id
                  ? 'bg-pink-500 text-white'
                  : 'text-gray-500 hover:bg-pink-50 hover:text-pink-600'}`}>
              <span className="text-lg">{a.icon}</span>
              {a.label}
            </button>
          ))}
        </nav>
        {/* Sair */}
        <div className="px-4 py-4 border-t border-pink-100">
          <button onClick={onLogout}
            className="w-full text-xs text-gray-400 hover:text-red-400 transition-colors text-left">
            Sair da conta
          </button>
        </div>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0"
           style={{ marginLeft: isDesktop ? '224px' : '0' }}>

        {/* Header mobile — visível só em celular */}
        <div className="md:hidden bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎂</span>
            <div>
              <p className="text-xs text-pink-400">Olá,</p>
              <p className="font-bold text-pink-700 text-sm leading-tight">
                {perfil.nome_negocio || perfil.nome}
              </p>
            </div>
          </div>
          <button onClick={onLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
            Sair
          </button>
        </div>

        {/* Header desktop */}
        <div className="hidden md:flex bg-white shadow-sm px-6 py-4 items-center justify-between sticky top-0 z-10">
          <h1 className="font-bold text-gray-700 text-base">
            {ABAS.find(a => a.id === aba)?.icon} {ABAS.find(a => a.id === aba)?.label}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              Plano {perfil.plano} · {perfil.ativo ? '✅ Ativo' : '❌ Inativo'}
            </span>
            <button onClick={onLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
              Sair
            </button>
          </div>
        </div>

        {/* Conteúdo da aba */}
        <div className="flex-1 pb-24 md:pb-10 w-full overflow-x-hidden">
          <div className="p-4 md:p-0 conteudo-aba">
          {aba === 'home'     && <Home     perfil={perfil} />}
          {aba === 'agenda'   && <Agenda   perfil={perfil} />}
          {aba === 'caixa'    && <Caixa    perfil={perfil} />}
          {aba === 'clientes' && <Clientes perfil={perfil} />}
          {aba === 'mei'      && <ModuloMei />}
          {aba === 'perfil'   && <Perfil_  perfil={perfil} setPerfil={setPerfil} onLogout={onLogout} />}
          </div>
        </div>
      </div>

      {/* BOTTOM NAV — visível só em celular */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-pink-100 flex z-20">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`flex-1 flex flex-col items-center py-2 transition-colors ${
              aba === a.id ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'}`}>
            <span className="text-xl">{a.icon}</span>
            <span className="text-xs mt-0.5 font-medium">{a.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
