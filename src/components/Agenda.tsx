import { useState, useEffect } from 'react'
import type { Perfil, Pedido } from '../types'
import { pedidoService, clienteService } from '../services/supabaseService'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { perfil: Perfil }

const STATUS_LIST = ['pendente','confirmado','em_producao','pronto','entregue','cancelado'] as const
const STATUS_LABEL: Record<string,string> = {
  pendente:'Pendente', confirmado:'Confirmado',
  em_producao:'Em producao', pronto:'Pronto',
  entregue:'Entregue', cancelado:'Cancelado',
}
const S_BG:   Record<string,string> = { pendente:'#FEF9C3',confirmado:'#DBEAFE',em_producao:'#EDE9FE',pronto:'#DCFCE7',entregue:'#F3F4F6',cancelado:'#FEE2E2' }
const S_TEXT: Record<string,string> = { pendente:'#854D0E',confirmado:'#1E40AF',em_producao:'#5B21B6',pronto:'#14532D',entregue:'#6B7280',cancelado:'#991B1B' }

const FORMA_LIST = ['pix','dinheiro','cartao','transferencia']

const VAZIO: Omit<Pedido,'id'|'created_at'> = {
  perfil_id:'', cliente_id:undefined, cliente_nome:'',
  descricao:'', data_entrega:'', hora_entrega:'',
  valor:0, sinal_pago:0, status:'pendente',
  forma_pagamento:'pix', observacoes:'', pago:false
}

const S = {
  input: { width:'100%', border:'1px solid #FBCFE8', borderRadius:12, padding:'10px 12px', fontSize:13, outline:'none', boxSizing:'border-box' as const },
  select: { width:'100%', border:'1px solid #FBCFE8', borderRadius:12, padding:'10px 12px', fontSize:13, outline:'none', backgroundColor:'white', boxSizing:'border-box' as const },
  label: { fontSize:11, color:'#9CA3AF', marginBottom:4, display:'block' as const },
}

export default function Agenda({ perfil }: Props) {
  const [pedidos,  setPedidos]  = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<{id:string;nome:string}[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState({ ...VAZIO, perfil_id: perfil.id })
  const [saving,   setSaving]   = useState(false)
  const [filtro,   setFiltro]   = useState<string>('todos')
  const [detalhe,  setDetalhe]  = useState<Pedido | null>(null)

  useEffect(() => {
    carregar()
    clienteService.listar(perfil.id).then(d => setClientes(d || []))
  }, [perfil.id])

  async function carregar() {
    setLoading(true)
    pedidoService.listar(perfil.id).then(d => setPedidos(d || [])).finally(() => setLoading(false))
  }

  function abrirNovo() { setForm({ ...VAZIO, perfil_id: perfil.id }); setDetalhe(null); setModal(true) }
  function abrirEdicao(p: Pedido) { setForm({ ...p }); setDetalhe(null); setModal(true) }

  async function salvar() {
    if (!form.cliente_nome || !form.descricao || !form.data_entrega) return
    setSaving(true)
    try {
      if ((form as Pedido).id) { await pedidoService.atualizar((form as Pedido).id, form) }
      else { await pedidoService.criar(form) }
      setModal(false); carregar()
    } finally { setSaving(false) }
  }

  async function atualizarStatus(id: string, status: string) {
    await pedidoService.atualizar(id, { status } as Partial<Pedido>)
    carregar(); setDetalhe(null)
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este pedido?')) return
    await pedidoService.deletar(id); carregar(); setDetalhe(null)
  }

  const filtrados = filtro === 'todos' ? pedidos : pedidos.filter(p => p.status === filtro)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:17, fontWeight:700, color:'#374151', margin:0 }}>Agenda de Pedidos</h2>
        <button onClick={abrirNovo} style={{ backgroundColor:'#EC4899', color:'white', fontSize:13, padding:'8px 18px', borderRadius:12, fontWeight:600, border:'none', cursor:'pointer' }}>
          + Novo
        </button>
      </div>

      {/* Filtros de status */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
        {(['todos', ...STATUS_LIST] as string[]).map(s => (
          <button key={s} onClick={() => setFiltro(s)}
            style={{ fontSize:12, padding:'6px 14px', borderRadius:20, whiteSpace:'nowrap', fontWeight:500, border:'none', cursor:'pointer', flexShrink:0,
              backgroundColor: filtro === s ? '#EC4899' : 'white',
              color:           filtro === s ? 'white'   : '#6B7280',
              boxShadow: filtro === s ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>
            {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#F9A8D4', fontSize:14 }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign:'center', padding:'48px 0', color:'#D1D5DB' }}>
          <p style={{ fontSize:40, margin:'0 0 8px' }}>🎂</p>
          <p style={{ fontSize:13, margin:0 }}>Nenhum pedido aqui</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtrados.map(p => (
            <div key={p.id} onClick={() => setDetalhe(p)}
              style={{ backgroundColor:'white', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', padding:'14px 16px', cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:600, color:'#374151', fontSize:14, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.cliente_nome}</p>
                  <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.descricao}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20, backgroundColor:S_BG[p.status], color:S_TEXT[p.status] }}>
                      {STATUS_LABEL[p.status]}
                    </span>
                    <span style={{ fontSize:11, color:'#9CA3AF' }}>
                      {format(parseISO(p.data_entrega), 'dd/MM', { locale:ptBR })}
                      {p.hora_entrega ? ' ' + p.hora_entrega.slice(0,5) : ''}
                    </span>
                  </div>
                </div>
                <div style={{ textAlign:'right', marginLeft:12, flexShrink:0 }}>
                  <p style={{ fontWeight:700, color:'#16A34A', fontSize:14, margin:'0 0 2px' }}>R$ {p.valor.toFixed(2).replace('.',',')}</p>
                  {p.sinal_pago > 0 && (
                    <p style={{ fontSize:11, color:'#9CA3AF', margin:0 }}>Sinal: R$ {p.sinal_pago.toFixed(2).replace('.',',')}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalhe */}
      {detalhe && (
        <div onClick={() => setDetalhe(null)}
          style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor:'white', width:'100%', maxWidth:448, borderRadius:'24px 24px 0 0', padding:24, display:'flex', flexDirection:'column', gap:14 }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ fontWeight:700, color:'#374151', fontSize:15, margin:0 }}>{detalhe.cliente_nome}</h3>
              <button onClick={() => setDetalhe(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9CA3AF' }}>✕</button>
            </div>

            <p style={{ fontSize:13, color:'#6B7280', margin:0 }}>{detalhe.descricao}</p>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[
                { label:'Entrega',    val: format(parseISO(detalhe.data_entrega),'dd/MM/yyyy') + (detalhe.hora_entrega ? ' ' + detalhe.hora_entrega.slice(0,5) : ''), bg:'#FDF2F8', col:'#374151' },
                { label:'Valor total', val:'R$ ' + detalhe.valor.toFixed(2).replace('.',','),   bg:'#F0FDF4', col:'#16A34A' },
                { label:'Sinal pago',  val:'R$ ' + detalhe.sinal_pago.toFixed(2).replace('.',','), bg:'#EFF6FF', col:'#2563EB' },
                { label:'Restante',    val:'R$ ' + (detalhe.valor - detalhe.sinal_pago).toFixed(2).replace('.',','), bg:'#FFFBEB', col:'#D97706' },
              ].map(c => (
                <div key={c.label} style={{ backgroundColor:c.bg, borderRadius:14, padding:'10px 12px' }}>
                  <p style={{ fontSize:11, color:'#9CA3AF', margin:'0 0 2px' }}>{c.label}</p>
                  <p style={{ fontWeight:600, color:c.col, fontSize:13, margin:0 }}>{c.val}</p>
                </div>
              ))}
            </div>

            {detalhe.observacoes && (
              <p style={{ fontSize:12, color:'#6B7280', backgroundColor:'#F9FAFB', borderRadius:12, padding:'10px 12px', margin:0 }}>{detalhe.observacoes}</p>
            )}

            <div>
              <p style={{ fontSize:12, color:'#9CA3AF', margin:'0 0 8px' }}>Atualizar status:</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {STATUS_LIST.filter(s => s !== detalhe.status).map(s => (
                  <button key={s} onClick={() => atualizarStatus(detalhe.id, s)}
                    style={{ fontSize:12, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', backgroundColor:'#F3F4F6', color:'#374151' }}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => abrirEdicao(detalhe)}
                style={{ flex:1, backgroundColor:'#EC4899', color:'white', padding:'11px 0', borderRadius:12, fontSize:13, fontWeight:600, border:'none', cursor:'pointer' }}>
                Editar
              </button>
              <button onClick={() => deletar(detalhe.id)}
                style={{ backgroundColor:'#FEF2F2', color:'#F87171', padding:'11px 16px', borderRadius:12, fontSize:13, border:'none', cursor:'pointer' }}>
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo/Editar */}
      {modal && (
        <div onClick={() => setModal(false)}
          style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ backgroundColor:'white', width:'100%', maxWidth:448, borderRadius:'24px 24px 0 0', padding:24, display:'flex', flexDirection:'column', gap:12, maxHeight:'90vh', overflowY:'auto' }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <h3 style={{ fontWeight:700, color:'#374151', fontSize:15, margin:0 }}>
                {(form as Pedido).id ? 'Editar Pedido' : 'Novo Pedido'}
              </h3>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9CA3AF' }}>✕</button>
            </div>

            <div>
              <label style={S.label}>Cliente *</label>
              {clientes.length > 0 ? (
                <select value={form.cliente_nome}
                  onChange={e => { const c = clientes.find(x => x.nome === e.target.value); setForm(f => ({ ...f, cliente_nome: e.target.value, cliente_id: c?.id })) }}
                  style={S.select}>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              ) : (
                <input type="text" placeholder="Nome do cliente" value={form.cliente_nome}
                  onChange={e => setForm(f => ({ ...f, cliente_nome: e.target.value }))}
                  style={S.input} />
              )}
            </div>

            <div>
              <label style={S.label}>Descricao do pedido *</label>
              <input type="text" placeholder="Ex: Bolo de chocolate 2kg" value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                style={S.input} />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={S.label}>Data entrega *</label>
                <input type="date" value={form.data_entrega}
                  onChange={e => setForm(f => ({ ...f, data_entrega: e.target.value }))}
                  style={S.input} />
              </div>
              <div>
                <label style={S.label}>Hora (opcional)</label>
                <input type="time" value={form.hora_entrega || ''}
                  onChange={e => setForm(f => ({ ...f, hora_entrega: e.target.value }))}
                  style={S.input} />
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={S.label}>Valor total (R$)</label>
                <input type="number" step="0.01" min="0" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
                  style={S.input} />
              </div>
              <div>
                <label style={S.label}>Sinal pago (R$)</label>
                <input type="number" step="0.01" min="0" value={form.sinal_pago}
                  onChange={e => setForm(f => ({ ...f, sinal_pago: parseFloat(e.target.value) || 0 }))}
                  style={S.input} />
              </div>
            </div>

            <div>
              <label style={S.label}>Forma de pagamento</label>
              <select value={form.forma_pagamento}
                onChange={e => setForm(f => ({ ...f, forma_pagamento: e.target.value as Pedido['forma_pagamento'] }))}
                style={S.select}>
                {FORMA_LIST.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label style={S.label}>Status</label>
              <select value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Pedido['status'] }))}
                style={S.select}>
                {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>

            <div>
              <label style={S.label}>Observacoes</label>
              <textarea rows={2} placeholder="Detalhes, sabores, decoracao..." value={form.observacoes || ''}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                style={{ ...S.input, resize:'none' as const }} />
            </div>

            <button onClick={salvar} disabled={saving}
              style={{ width:'100%', backgroundColor: saving ? '#F9A8D4' : '#EC4899', color:'white', fontWeight:700, padding:'12px 0', borderRadius:12, border:'none', cursor: saving ? 'not-allowed' : 'pointer', fontSize:14, marginTop:4 }}>
              {saving ? 'Salvando...' : ((form as Pedido).id ? 'Salvar alteracoes' : 'Criar pedido 🎂')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
