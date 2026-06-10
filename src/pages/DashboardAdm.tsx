import { useState, useEffect } from 'react'
import type { Perfil } from '../types'
import { perfilService } from '../services/supabaseService'

interface Props { perfil: Perfil; onLogout: () => void }

export default function DashboardAdm({ perfil, onLogout }: Props) {
  const [clientes, setClientes] = useState<Perfil[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    perfilService.listarTodos()
      .then(d => setClientes((d || []).filter((p: Perfil) => !p.is_adm)))
      .finally(() => setLoading(false))
  }, [])

  async function ativarPlano(c: Perfil, plano: 'basico' | 'completo') {
    const venc = new Date(); venc.setMonth(venc.getMonth() + 1)
    await perfilService.atualizar(c.id, {
      status_assinatura: 'ativa', ativo: true, plano,
      valor_plano: plano === 'completo' ? 99 : 59,
      data_venc: venc.toISOString().split('T')[0],
    })
    setClientes(cs => cs.map(x => x.id === c.id ? { ...x, status_assinatura: 'ativa', ativo: true, plano } : x))
  }

  async function inativar(c: Perfil) {
    await perfilService.atualizar(c.id, { status_assinatura: 'cancelada', ativo: false })
    setClientes(cs => cs.map(x => x.id === c.id ? { ...x, status_assinatura: 'cancelada', ativo: false } : x))
  }

  const ativos   = clientes.filter(c => c.ativo).length
  const receita  = clientes.filter(c => c.ativo).reduce((s, c) => s + (c.valor_plano || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-amber-50 p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-pink-700">🛡️ Painel ADM</h1>
          <p className="text-sm text-gray-500">Olá, {perfil.nome}</p>
        </div>
        <button onClick={onLogout}
          className="text-sm text-gray-400 hover:text-red-400">Sair</button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Clientes ativos</p>
          <p className="text-3xl font-bold text-pink-600">{ativos}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-1">Receita mensal</p>
          <p className="text-2xl font-bold text-green-600">
            R$ {receita.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-pink-50">
          <h2 className="font-semibold text-gray-700">Confeiteiras cadastradas</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-pink-300">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center text-gray-300">Nenhuma cliente ainda</div>
        ) : (
          <div className="divide-y divide-pink-50">
            {clientes.map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700 text-sm">{c.nome}</p>
                  <p className="text-xs text-gray-400">{c.nome_negocio || c.email}</p>
                  <p className="text-xs text-gray-400">{c.telefone}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.ativo ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-400'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    R$ {(c.valor_plano || 0).toFixed(2).replace('.', ',')}
                  </p>
                  <div className="flex gap-1 mt-2 justify-end">
                    <button onClick={() => ativarPlano(c, 'basico')} className="text-xs px-2 py-1 rounded bg-pink-100 text-pink-700">Básico</button>
                    <button onClick={() => ativarPlano(c, 'completo')} className="text-xs px-2 py-1 rounded bg-pink-500 text-white">Completo</button>
                    <button onClick={() => inativar(c)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Inativar</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
