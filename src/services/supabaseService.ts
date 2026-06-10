import { supabase } from '../lib/supabase'
import type { Cliente, Pedido, Caixa, Aviso } from '../types'

// ── PERFIL ──────────────────────────────────────────────────────────────────
export const perfilService = {
  async buscar(userId: string) {
    const { data, error } = await supabase
      .from('perfis').select('*').eq('id', userId).single()
    if (error) throw error
    return data
  },
  async criar(perfil: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('perfis').insert(perfil).select().single()
    if (error) throw error
    return data
  },
  async atualizar(userId: string, campos: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('perfis').update(campos).eq('id', userId).select().single()
    if (error) throw error
    return data
  },
  async listarTodos() {
    const { data, error } = await supabase
      .from('perfis').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
  }
}

// ── CLIENTES ─────────────────────────────────────────────────────────────────
export const clienteService = {
  async listar(perfilId: string) {
    const { data, error } = await supabase
      .from('clientes').select('*')
      .eq('perfil_id', perfilId).eq('ativo', true)
      .order('nome')
    if (error) throw error
    return data
  },
  async criar(cliente: Omit<Cliente, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('clientes').insert(cliente).select().single()
    if (error) throw error
    return data
  },
  async atualizar(id: string, campos: Partial<Cliente>) {
    const { data, error } = await supabase
      .from('clientes').update(campos).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deletar(id: string) {
    const { error } = await supabase
      .from('clientes').update({ ativo: false }).eq('id', id)
    if (error) throw error
  }
}

// ── PEDIDOS ──────────────────────────────────────────────────────────────────
export const pedidoService = {
  async listar(perfilId: string) {
    const { data, error } = await supabase
      .from('pedidos').select('*')
      .eq('perfil_id', perfilId)
      .order('data_entrega', { ascending: true })
    if (error) throw error
    return data
  },
  async criar(pedido: Omit<Pedido, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('pedidos').insert(pedido).select().single()
    if (error) throw error
    return data
  },
  async atualizar(id: string, campos: Partial<Pedido>) {
    const { data, error } = await supabase
      .from('pedidos').update(campos).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deletar(id: string) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) throw error
  }
}

// ── CAIXA ────────────────────────────────────────────────────────────────────
export const caixaService = {
  async listar(perfilId: string, mes?: string) {
    let query = supabase
      .from('caixa').select('*')
      .eq('perfil_id', perfilId)
      .order('data', { ascending: false })
    if (mes) {
      const inicio = mes + '-01'
      const [_ano, _numMes] = mes.split('-').map(Number)
      const _ultimoDia = new Date(_ano, _numMes, 0).getDate()
      const fim = mes + '-' + String(_ultimoDia).padStart(2, '0')
      query = query.gte('data', inicio).lte('data', fim)
    }
    const { data, error } = await query
    if (error) throw error
    return data
  },
  async criar(lancamento: Omit<Caixa, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('caixa').insert(lancamento).select().single()
    if (error) throw error
    return data
  },
  async deletar(id: string) {
    const { error } = await supabase.from('caixa').delete().eq('id', id)
    if (error) throw error
  }
}

// ── DICAS ────────────────────────────────────────────────────────────────────
export const dicaService = {
  async buscarHoje() {
    const hoje = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('dicas').select('*').eq('data', hoje).single()
    return data
  }
}

// ── OBRIGAÇÕES MEI ───────────────────────────────────────────────────────────
export const obrigacaoService = {
  async listar() {
    const { data, error } = await supabase
      .from('obrigacoes_mei').select('*').order('dia_venc')
    if (error) throw error
    return data
  }
}

// ── ASSINATURA (Mercado Pago) ────────────────────────────────────────────────
export const assinaturaService = {
  async criarLink(plano: 'basico' | 'completo'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('criar-assinatura', {
      body: { plano },
    })
    if (error) throw error
    if (!data?.init_point) throw new Error('Resposta sem init_point')
    return data.init_point as string
  },
}

// ── AVISOS ───────────────────────────────────────────────────────────────────
export const avisoService = {
  async listarVisiveis(): Promise<Aviso[]> {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('avisos').select('*')
      .eq('ativo', true)
      .or(`agendado_para.is.null,agendado_para.lte.${agora}`)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Aviso[]
  },
  async listarTodos(): Promise<Aviso[]> {
    const { data, error } = await supabase.from('avisos').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Aviso[]
  },
  async criar(aviso: Pick<Aviso, 'titulo' | 'mensagem' | 'tipo'> & { agendado_para?: string | null }) {
    const { data, error } = await supabase.from('avisos').insert(aviso).select().single()
    if (error) throw error
    return data as Aviso
  },
  async alternar(id: string, ativo: boolean) {
    const { error } = await supabase.from('avisos').update({ ativo }).eq('id', id)
    if (error) throw error
  },
  async excluir(id: string) {
    const { error } = await supabase.from('avisos').delete().eq('id', id)
    if (error) throw error
  },
}

// ── ADMIN (ajustes de perfil via Edge Function) ──────────────────────────────
type AcaoAdm =
  | { acao: 'definir_plano'; alvoId: string; dados: { plano: 'basico' | 'completo' } }
  | { acao: 'dar_dias'; alvoId: string; dados: { dias: number } }
  | { acao: 'bloquear'; alvoId: string; dados?: Record<string, never> }
  | { acao: 'editar_dados'; alvoId: string; dados: { nome?: string; nome_negocio?: string; telefone?: string; cidade?: string } }

export const admService = {
  async executar(payload: AcaoAdm) {
    const { data, error } = await supabase.functions.invoke('admin-perfil', { body: payload })
    if (error) throw error
    return data
  },
}

// ── E-MAIL (Resend via Edge Function) ────────────────────────────────────────
export const emailService = {
  async enviar(assunto: string, corpo: string): Promise<{ enviados: number; falhas: number }> {
    const { data, error } = await supabase.functions.invoke('enviar-email', { body: { assunto, corpo } })
    if (error) throw error
    return data as { enviados: number; falhas: number }
  },
}
