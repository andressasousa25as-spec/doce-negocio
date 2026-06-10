import type { Perfil } from '../types'

export interface Indicadores {
  total: number
  ativos: number
  emTeste: number
  vencendo7: number
  receitaMensal: number
}

function diaUTC(s: string): number { return new Date(s + 'T12:00:00').getTime() }

export function calcularIndicadores(perfis: Perfil[], agora: Date = new Date()): Indicadores {
  const hoje = agora.getTime()
  const em7 = hoje + 7 * 24 * 60 * 60 * 1000
  let ativos = 0, emTeste = 0, vencendo7 = 0, receitaMensal = 0
  for (const p of perfis) {
    const venc = p.data_venc ? diaUTC(p.data_venc) : 0
    const vencOk = venc >= hoje
    if (p.status_assinatura === 'ativa' && vencOk) { ativos++; receitaMensal += p.valor_plano || 0 }
    if (p.status_assinatura === 'trial' && vencOk) emTeste++
    if ((p.status_assinatura === 'ativa' || p.status_assinatura === 'trial') && venc >= hoje && venc <= em7) vencendo7++
  }
  return { total: perfis.length, ativos, emTeste, vencendo7, receitaMensal }
}

export interface Barra { label: string; valor: number }

export function agruparCadastros(perfis: Perfil[], modo: 'mes' | 'dia', agora: Date = new Date()): Barra[] {
  const MES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const barras: Barra[] = []
  if (modo === 'mes') {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
      const valor = perfis.filter(p => {
        const c = new Date(p.created_at)
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth()
      }).length
      barras.push({ label: MES[d.getMonth()], valor })
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - i)
      const valor = perfis.filter(p => {
        const c = new Date(p.created_at)
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth() && c.getDate() === d.getDate()
      }).length
      barras.push({ label: String(d.getDate()).padStart(2, '0'), valor })
    }
  }
  return barras
}
