import type { Perfil, Plano } from '../types'

export type Aba = 'home' | 'agenda' | 'caixa' | 'clientes' | 'mei' | 'perfil'

export interface Acesso {
  estado: 'trial' | 'ativa' | 'bloqueada'
  plano: Plano
  diasRestantesTrial: number
  modulos: Set<Aba>
}

const MODULOS_BASICO: Aba[] = ['home', 'agenda', 'caixa', 'clientes', 'perfil']
const MODULOS_COMPLETO: Aba[] = ['home', 'agenda', 'caixa', 'clientes', 'mei', 'perfil']

function diaUTC(s: string): number {
  // converte 'YYYY-MM-DD' em timestamp ao meio-dia para evitar fuso
  return new Date(s + 'T12:00:00').getTime()
}

export function calcularAcesso(perfil: Perfil, agora: Date = new Date()): Acesso {
  const hoje = agora.getTime()
  const vencOk = perfil.data_venc ? hoje <= diaUTC(perfil.data_venc) : false

  if (perfil.status_assinatura === 'trial' && vencOk) {
    const ms = diaUTC(perfil.data_venc!) - hoje
    const dias = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
    return { estado: 'trial', plano: 'completo', diasRestantesTrial: dias, modulos: new Set(MODULOS_COMPLETO) }
  }

  if (perfil.status_assinatura === 'ativa' && vencOk) {
    const modulos = perfil.plano === 'completo' ? MODULOS_COMPLETO : MODULOS_BASICO
    return { estado: 'ativa', plano: perfil.plano, diasRestantesTrial: 0, modulos: new Set(modulos) }
  }

  return { estado: 'bloqueada', plano: perfil.plano, diasRestantesTrial: 0, modulos: new Set() }
}
