import { useState, useEffect } from 'react'
import type { ObrigacaoMei } from '../types'
import { obrigacaoService } from '../services/supabaseService'

const S = {
  wrap: { display: 'flex', flexDirection: 'column' as const, gap: 16, width: '100%' },
  h2: { fontSize: 18, fontWeight: 700, color: '#374151', margin: 0 },
  card: {
    backgroundColor: 'white', borderRadius: 16, overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)', boxSizing: 'border-box' as const,
  },
  cardHead: { padding: '12px 16px', borderBottom: '1px solid #FCE7F3' },
  cardTitle: { fontWeight: 600, color: '#374151', fontSize: 14, margin: 0 },
}

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

  const tipoStyle = (tipo: string) =>
    tipo === 'mensal' ? { bg: '#DBEAFE', color: '#2563EB', label: '🔁 Mensal' } :
    tipo === 'anual'  ? { bg: '#EDE9FE', color: '#7C3AED', label: '📅 Anual' } :
                        { bg: '#F3F4F6', color: '#6B7280', label: '📌 Eventual' }

  return (
    <div style={S.wrap}>
      <h2 style={S.h2}>📋 Módulo MEI</h2>

      {/* Card DAS */}
      <div style={{
        background: 'linear-gradient(135deg, #EC4899 0%, #FB7185 100%)',
        borderRadius: 16, padding: 20, color: 'white', boxSizing: 'border-box',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>Competência</p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, textTransform: 'capitalize' }}>{mes}</p>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
          Vencimento DAS: todo dia 20
        </p>
        {diaHoje > 20 && (
          <div style={{ marginTop: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '6px 12px', fontSize: 13 }}>
            ⚠️ DAS deste mês pode estar em atraso!
          </div>
        )}
        <a href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"
          target="_blank" rel="noreferrer"
          style={{
            marginTop: 14, display: 'block', backgroundColor: 'white', color: '#DB2777',
            fontWeight: 700, fontSize: 14, textAlign: 'center', padding: '10px',
            borderRadius: 12, textDecoration: 'none',
          }}>
          💳 Pagar DAS agora
        </a>
      </div>

      {/* Obrigações */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <h3 style={S.cardTitle}>📅 Obrigações do MEI</h3>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#F9A8D4', fontSize: 13 }}>Carregando...</div>
        ) : (
          <div>
            {obrigacoes.map((o, i) => {
              const t = tipoStyle(o.tipo)
              return (
                <div key={o.id} style={{ padding: '14px 16px', borderTop: i > 0 ? '1px solid #FDF2F8' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#374151', fontSize: 14 }}>{o.titulo}</p>
                      {o.descricao && (
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CA3AF' }}>{o.descricao}</p>
                      )}
                      <span style={{
                        display: 'inline-block', marginTop: 6, fontSize: 11, padding: '2px 8px',
                        borderRadius: 999, backgroundColor: t.bg, color: t.color, fontWeight: 600,
                      }}>
                        {t.label}
                      </span>
                    </div>
                    {o.link && (
                      <a href={o.link} target="_blank" rel="noreferrer"
                        style={{
                          flexShrink: 0, backgroundColor: '#FDF2F8', color: '#EC4899', fontSize: 12,
                          padding: '6px 12px', borderRadius: 12, fontWeight: 500, whiteSpace: 'nowrap',
                          textDecoration: 'none',
                        }}>
                        Acessar →
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* NFS-e Macapá */}
      <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 16, padding: 16, boxSizing: 'border-box' }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, color: '#92400E', fontSize: 14 }}>
          🧾 Nota Fiscal de Serviço — Macapá
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 12, color: '#B45309' }}>
          Emita suas notas fiscais pelo portal da Prefeitura de Macapá. Necessário login com CNPJ do MEI.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <a href="https://www.notaeletronica.com.br/macapa/Login/Login_NFE.aspx" target="_blank" rel="noreferrer"
            style={{
              display: 'block', backgroundColor: '#F59E0B', color: 'white', fontSize: 14,
              textAlign: 'center', fontWeight: 700, padding: '10px', borderRadius: 12, textDecoration: 'none',
            }}>
            🧾 Emitir NFS-e Macapá
          </a>
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 12, fontSize: 12, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontWeight: 600, color: '#4B5563' }}>Como emitir:</p>
            <p style={{ margin: 0 }}>1. Acesse o portal acima</p>
            <p style={{ margin: 0 }}>2. Faça login com CNPJ e senha do MEI</p>
            <p style={{ margin: 0 }}>3. Clique em "Emitir NFS-e"</p>
            <p style={{ margin: 0 }}>4. Preencha os dados do serviço prestado</p>
            <p style={{ margin: 0 }}>5. Confirme e baixe o PDF</p>
          </div>
        </div>
      </div>

      {/* Dicas MEI */}
      <div style={{ backgroundColor: '#EFF6FF', borderRadius: 16, padding: 16, boxSizing: 'border-box' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#1D4ED8', fontSize: 14 }}>💡 Dicas MEI</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#2563EB' }}>
          <p style={{ margin: 0 }}>✅ MEI pode faturar até R$81.000/ano (R$6.750/mês)</p>
          <p style={{ margin: 0 }}>✅ Pode ter 1 funcionário com salário mínimo</p>
          <p style={{ margin: 0 }}>✅ DAS mensal: em média R$72/mês (2025)</p>
          <p style={{ margin: 0 }}>✅ DASN-SIMEI: entregue até 31 de maio de cada ano</p>
          <p style={{ margin: 0 }}>⚠️ Não pode ter sócio nem ser sócio em outra empresa</p>
        </div>
      </div>
    </div>
  )
}
