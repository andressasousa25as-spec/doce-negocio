export type StatusAssinatura = 'trial' | 'ativa' | 'expirada' | 'cancelada'
export type Plano = 'basico' | 'completo'

export interface Perfil {
  id: string
  created_at: string
  updated_at: string
  nome: string
  email: string
  telefone?: string
  nome_negocio?: string
  cnpj_mei?: string
  cidade: string
  ativo: boolean
  plano: Plano
  status_assinatura: StatusAssinatura
  valor_plano: number
  data_inicio: string
  data_venc?: string
  mp_subscription_id?: string
  foto_url?: string
  is_adm: boolean
}

export interface Cliente {
  id: string
  created_at: string
  perfil_id: string
  nome: string
  telefone?: string
  email?: string
  endereco?: string
  observacoes?: string
  ativo: boolean
}

export interface Pedido {
  id: string
  created_at: string
  perfil_id: string
  cliente_id?: string
  cliente_nome: string
  descricao: string
  data_entrega: string
  hora_entrega?: string
  valor: number
  sinal_pago: number
  status: 'pendente' | 'confirmado' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado'
  forma_pagamento: 'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  observacoes?: string
  pago: boolean
}

export interface Caixa {
  id: string
  created_at: string
  perfil_id: string
  pedido_id?: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: number
  data: string
  forma_pagamento: 'pix' | 'dinheiro' | 'cartao' | 'transferencia'
  comprovante_url?: string
}

export interface Dica {
  id: string
  data: string
  texto: string
  categoria: string
}

export interface ObrigacaoMei {
  id: string
  titulo: string
  descricao?: string
  dia_venc: number
  tipo: 'mensal' | 'anual' | 'eventual'
  link?: string
}
