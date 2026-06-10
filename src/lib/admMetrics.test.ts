import { describe, it, expect } from 'vitest'
import { calcularIndicadores, agruparCadastros } from './admMetrics'
import type { Perfil } from '../types'

function p(over: Partial<Perfil>): Perfil {
  return {
    id: Math.random().toString(), created_at: '2026-06-01T00:00:00Z', updated_at: '',
    nome: 'X', email: 'x@x.com', cidade: 'Macapá', ativo: false, plano: 'completo',
    status_assinatura: 'trial', valor_plano: 0, data_inicio: '2026-06-01', is_adm: false, ...over,
  }
}
const hoje = new Date('2026-06-10T12:00:00')

describe('calcularIndicadores', () => {
  it('conta total, ativos, em teste, vencendo e receita', () => {
    const perfis: Perfil[] = [
      p({ status_assinatura: 'ativa', plano: 'completo', valor_plano: 99, data_venc: '2026-07-10' }),
      p({ status_assinatura: 'ativa', plano: 'basico', valor_plano: 59, data_venc: '2026-06-13' }),
      p({ status_assinatura: 'trial', data_venc: '2026-06-12' }),
      p({ status_assinatura: 'expirada', data_venc: '2026-06-01' }),
    ]
    const r = calcularIndicadores(perfis, hoje)
    expect(r.total).toBe(4)
    expect(r.ativos).toBe(2)
    expect(r.emTeste).toBe(1)
    expect(r.vencendo7).toBe(2)
    expect(r.receitaMensal).toBe(158)
  })
})

describe('agruparCadastros', () => {
  it('agrupa por mês (6 meses) somando cadastros', () => {
    const perfis = [ p({ created_at: '2026-06-02T00:00:00Z' }), p({ created_at: '2026-06-09T00:00:00Z' }), p({ created_at: '2026-05-20T00:00:00Z' }) ]
    const r = agruparCadastros(perfis, 'mes', hoje)
    expect(r.length).toBe(6)
    expect(r[r.length - 1].valor).toBe(2)
    expect(r[r.length - 2].valor).toBe(1)
  })
  it('agrupa por dia (30 dias)', () => {
    const perfis = [ p({ created_at: '2026-06-10T08:00:00Z' }), p({ created_at: '2026-06-10T09:00:00Z' }) ]
    const r = agruparCadastros(perfis, 'dia', hoje)
    expect(r.length).toBe(30)
    expect(r[r.length - 1].valor).toBe(2)
  })
})
