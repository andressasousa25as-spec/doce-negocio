import { describe, it, expect } from 'vitest'
import { calcularAcesso, type Aba } from './acesso'
import type { Perfil } from '../types'

const base: Perfil = {
  id: '1', created_at: '', updated_at: '', nome: 'Maria', email: 'm@x.com',
  cidade: 'Macapá', ativo: false, plano: 'completo', status_assinatura: 'trial',
  valor_plano: 0, data_inicio: '2026-06-09', data_venc: '2026-06-12', is_adm: false,
}
const hoje = new Date('2026-06-10T12:00:00')

function tem(modulos: Set<Aba>, abas: Aba[]) { return abas.every(a => modulos.has(a)) }

describe('calcularAcesso', () => {
  it('em trial dentro dos 3 dias: acesso total', () => {
    const a = calcularAcesso(base, hoje)
    expect(a.estado).toBe('trial')
    expect(a.diasRestantesTrial).toBe(2)
    expect(tem(a.modulos, ['home','agenda','caixa','clientes','mei','perfil'])).toBe(true)
  })

  it('trial vencido (data_venc passada): bloqueada', () => {
    const a = calcularAcesso({ ...base, data_venc: '2026-06-09' }, hoje)
    expect(a.estado).toBe('bloqueada')
  })

  it('assinatura ativa Básico: trava MEI', () => {
    const p = { ...base, status_assinatura: 'ativa' as const, plano: 'basico' as const, ativo: true, data_venc: '2026-07-10' }
    const a = calcularAcesso(p, hoje)
    expect(a.estado).toBe('ativa')
    expect(a.modulos.has('mei')).toBe(false)
    expect(tem(a.modulos, ['home','agenda','caixa','clientes','perfil'])).toBe(true)
  })

  it('assinatura ativa Completo: tudo liberado', () => {
    const p = { ...base, status_assinatura: 'ativa' as const, plano: 'completo' as const, ativo: true, data_venc: '2026-07-10' }
    expect(calcularAcesso(p, hoje).modulos.has('mei')).toBe(true)
  })

  it('assinatura ativa mas vencida: bloqueada', () => {
    const p = { ...base, status_assinatura: 'ativa' as const, plano: 'completo' as const, data_venc: '2026-06-09' }
    expect(calcularAcesso(p, hoje).estado).toBe('bloqueada')
  })

  it('cancelada: bloqueada', () => {
    expect(calcularAcesso({ ...base, status_assinatura: 'cancelada' }, hoje).estado).toBe('bloqueada')
  })
})
