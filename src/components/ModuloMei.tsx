import { useState, useEffect } from 'react'
import type { ObrigacaoMei } from '../types'
import { obrigacaoService } from '../services/supabaseService'

export default function ModuloMei() {
  const [obrigacoes, setObrigacoes] = useState<ObrigacaoMei[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    obrigacaoService.listar()
      .then(d => setObrigacoes(d || []))
      .finally(() => setLoading(false))
  }, [])

  const hoje    = new Date()
  const diaHoje = hoje.getDate()
  const mes     = hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-700">📋 Módulo MEI</h2>

      {/* Card DAS */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 rounded-2xl p-5 text-white">
        <p className="text-pink-100 text-xs mb-1">Competência</p>
        <p className="text-xl font-bold capitalize">{mes}</p>
        <p className="text-pink-100 text-sm mt-2">Vencimento DAS: todo dia 20</p>
        {diaHoje > 20 && (
          <div className="mt-2 bg-white/20 rounded-xl px-3 py-1.5 text-sm">
            ⚠️ DAS deste mês pode estar em atraso!
          </div>
        )}
        <a href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"
          target="_blank" rel="noreferrer"
          className="mt-3 block bg-white text-pink-600 font-bold text-sm text-center py-2.5 rounded-xl hover:bg-pink-50 transition-colors">
          💳 Pagar DAS agora
        </a>
      </div>

      {/* Obrigações */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-pink-50">
          <h3 className="font-semibold text-gray-700 text-sm">📅 Obrigações do MEI</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-pink-300 animate-pulse">Carregando...</div>
        ) : (
          <div className="divide-y divide-pink-50">
            {obrigacoes.map(o => (
              <div key={o.id} className="px-4 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-700 text-sm">{o.titulo}</p>
                    {o.descricao && <p className="text-xs text-gray-400 mt-0.5">{o.descricao}</p>}
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                      o.tipo === 'mensal' ? 'bg-blue-100 text-blue-600' :
                      o.tipo === 'anual'  ? 'bg-purple-100 text-purple-600' :
                      'bg-gray-100 text-gray-500'}`}>
                      {o.tipo === 'mensal' ? '🔁 Mensal' : o.tipo === 'anual' ? '📅 Anual' : '📌 Eventual'}
                    </span>
                  </div>
                  {o.link && (
                    <a href={o.link} target="_blank" rel="noreferrer"
                      className="ml-2 bg-pink-50 text-pink-500 text-xs px-3 py-1.5 rounded-xl hover:bg-pink-100 font-medium whitespace-nowrap">
                      Acessar →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NFS-e Macapá */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="font-semibold text-amber-800 text-sm mb-1">🧾 Nota Fiscal de Serviço — Macapá</p>
        <p className="text-xs text-amber-700 mb-3">
          Emita suas notas fiscais pelo portal da Prefeitura de Macapá. Necessário login com CNPJ do MEI.
        </p>
        <div className="space-y-2">
          <a href="https://www.notaeletronica.com.br/macapa/Login/Login_NFE.aspx" target="_blank" rel="noreferrer"
            className="block bg-amber-500 text-white text-sm text-center font-bold py-2.5 rounded-xl hover:bg-amber-600 transition-colors">
            🧾 Emitir NFS-e Macapá
          </a>
          <div className="bg-white rounded-xl p-3 text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-600">Como emitir:</p>
            <p>1. Acesse o portal acima</p>
            <p>2. Faça login com CNPJ e senha do MEI</p>
            <p>3. Clique em "Emitir NFS-e"</p>
            <p>4. Preencha os dados do serviço prestado</p>
            <p>5. Confirme e baixe o PDF</p>
          </div>
        </div>
      </div>

      {/* Dicas MEI */}
      <div className="bg-blue-50 rounded-2xl p-4">
        <p className="font-semibold text-blue-700 text-sm mb-2">💡 Dicas MEI</p>
        <div className="space-y-2 text-xs text-blue-600">
          <p>✅ MEI pode faturar até R$81.000/ano (R$6.750/mês)</p>
          <p>✅ Pode ter 1 funcionário com salário mínimo</p>
          <p>✅ DAS mensal: em média R$72/mês (2025)</p>
          <p>✅ DASN-SIMEI: entregue até 31 de maio de cada ano</p>
          <p>⚠️ Não pode ter sócio nem ser sócio em outra empresa</p>
        </div>
      </div>
    </div>
  )
}
