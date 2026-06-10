import { useState } from 'react'
import type { Perfil } from '../types'
import { assinaturaService } from '../services/supabaseService'

interface Props { perfil: Perfil; onLogout: () => void }

const PLANOS = [
  { id: 'basico'   as const, nome: 'Básico',   preco: 59, modulos: ['Agenda', 'Clientes', 'Caixa'] },
  { id: 'completo' as const, nome: 'Completo', preco: 99, modulos: ['Agenda', 'Clientes', 'Caixa', 'MEI'], destaque: true },
]

export default function Planos({ perfil, onLogout }: Props) {
  const [carregando, setCarregando] = useState<string>('')
  const [erro, setErro] = useState('')

  async function assinar(plano: 'basico' | 'completo') {
    setErro(''); setCarregando(plano)
    try {
      const url = await assinaturaService.criarLink(plano)
      window.location.href = url
    } catch {
      setErro('Não conseguimos abrir o pagamento. Tente novamente em instantes.')
      setCarregando('')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#FFF0F5,#FFF8F0)', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 44 }}>🎂</div>
          <h1 style={{ color: '#BE185D', fontSize: 22, fontWeight: 800, margin: '8px 0 4px' }}>Escolha seu plano</h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, margin: 0 }}>
            Seu teste grátis terminou. Assine para continuar usando o Doce Negócio.
          </p>
        </div>

        {erro && (
          <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 13, borderRadius: 12, padding: 12, marginBottom: 12 }}>{erro}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PLANOS.map(p => (
            <div key={p.id} style={{
              backgroundColor: 'white', borderRadius: 18, padding: 20,
              border: p.destaque ? '2px solid #EC4899' : '1px solid #FCE7F3',
              boxShadow: '0 1px 6px rgba(0,0,0,0.06)', boxSizing: 'border-box',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#374151', margin: 0 }}>{p.nome}</h2>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#DB2777', margin: 0 }}>
                  R$ {p.preco}<span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600 }}>/mês</span>
                </p>
              </div>
              <ul style={{ margin: '12px 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {['Início', ...p.modulos, 'Perfil'].map(m => (
                  <li key={m} style={{ fontSize: 13, color: '#4B5563' }}>✅ {m}</li>
                ))}
              </ul>
              <button onClick={() => assinar(p.id)} disabled={!!carregando}
                style={{
                  width: '100%', backgroundColor: carregando ? '#F9A8D4' : (p.destaque ? '#EC4899' : '#374151'),
                  color: 'white', fontWeight: 700, padding: '12px 0', borderRadius: 12, border: 'none',
                  cursor: carregando ? 'not-allowed' : 'pointer', fontSize: 14,
                }}>
                {carregando === p.id ? 'Abrindo pagamento...' : `Assinar ${p.nome}`}
              </button>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#9CA3AF', margin: '16px 0 8px' }}>
          Pagamento seguro pelo Mercado Pago (Pix ou cartão). Cancele quando quiser.
        </p>
        <button onClick={onLogout} style={{ display: 'block', margin: '0 auto', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 12, cursor: 'pointer' }}>
          Sair da conta ({perfil.email})
        </button>
      </div>
    </div>
  )
}
