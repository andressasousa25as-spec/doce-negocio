import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Perfil } from '../types'

interface Props { onLogin: (p: Perfil) => void }

export default function LoginPage({ onLogin }: Props) {
  const [modo,    setModo]    = useState<'login' | 'cadastro'>('login')
  const [email,   setEmail]   = useState('')
  const [senha,   setSenha]   = useState('')
  const [nome,    setNome]    = useState('')
  const [negocio, setNegocio] = useState('')
  const [tel,     setTel]     = useState('')
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) throw error
      const { data: perfil } = await supabase
        .from('perfis').select('*').eq('id', data.user.id).single()
      if (perfil) onLogin(perfil)
    } catch (err: unknown) {
      setErro(err instanceof Error ? 'E-mail ou senha incorretos.' : 'Erro ao entrar.')
    } finally { setLoading(false) }
  }

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: senha })
      if (error) throw error
      if (!data.user) throw new Error('Usuário não criado')
      // Cria perfil
      const venc = new Date()
      venc.setMonth(venc.getMonth() + 1)
      const { data: perfil } = await supabase.from('perfis').insert({
        id: data.user.id,
        nome, email,
        telefone: tel,
        nome_negocio: negocio,
        ativo: true,
        plano: 'profissional',
        valor_plano: 89.00,
        data_inicio: new Date().toISOString().split('T')[0],
        data_venc: venc.toISOString().split('T')[0],
        is_adm: false
      }).select().single()
      if (perfil) onLogin(perfil)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #F4A7B9 0%, #FFF8F0 60%, #D4A855 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎂</div>
          <h1 className="text-3xl font-bold text-pink-700">Doce Negócio</h1>
          <p className="text-pink-500 mt-1">Gestão simples para confeiteiras</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Abas */}
          <div className="flex rounded-2xl bg-pink-50 p-1 mb-6">
            {(['login','cadastro'] as const).map(m => (
              <button key={m} onClick={() => { setModo(m); setErro('') }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                  modo === m ? 'bg-pink-500 text-white shadow' : 'text-pink-400 hover:text-pink-600'}`}>
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          {/* Erro */}
          {erro && <div className="bg-red-50 text-red-600 text-sm rounded-xl p-3 mb-4">{erro}</div>}

          {/* Form Login */}
          {modo === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="Seu e-mail" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <input type="password" placeholder="Senha" required value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <button type="submit" disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar 🍰'}
              </button>
            </form>
          )}

          {/* Form Cadastro */}
          {modo === 'cadastro' && (
            <form onSubmit={handleCadastro} className="space-y-4">
              <input type="text" placeholder="Seu nome completo" required value={nome}
                onChange={e => setNome(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <input type="text" placeholder="Nome da sua confeitaria" value={negocio}
                onChange={e => setNegocio(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <input type="tel" placeholder="WhatsApp (opcional)" value={tel}
                onChange={e => setTel(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <input type="email" placeholder="Seu e-mail" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <input type="password" placeholder="Crie uma senha (mín. 6 caracteres)" required value={senha}
                onChange={e => setSenha(e.target.value)}
                className="w-full border border-pink-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300" />
              <button type="submit" disabled={loading}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Cadastrando...' : 'Começar agora 🎂'}
              </button>
              <p className="text-xs text-center text-gray-400">
                Plano Profissional · R$89/mês · Cancele quando quiser
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
