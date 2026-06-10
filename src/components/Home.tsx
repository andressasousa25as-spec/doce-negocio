import { useState, useEffect } from 'react'
import type { Perfil, Dica, Pedido } from '../types'
import AvisosBanner from './AvisosBanner'
import { dicaService, pedidoService } from '../services/supabaseService'
import { format, parseISO, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props { perfil: Perfil }

export default function Home({ perfil }: Props) {
  const [dica,    setDica]    = useState<Dica | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 1024)

  useEffect(() => {
    const fn = () => setDesktop(window.innerWidth >= 1024)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    Promise.all([
      dicaService.buscarHoje().then(d => setDica(d)),
      pedidoService.listar(perfil.id).then(d => setPedidos(d || []))
    ]).finally(() => setLoading(false))
  }, [perfil.id])

  const hoje     = new Date().toISOString().split('T')[0]
  const em7dias  = addDays(new Date(), 7).toISOString().split('T')[0]

  const pedHoje  = pedidos.filter(p => p.data_entrega === hoje && p.status !== 'cancelado')
  const pedAtras = pedidos.filter(p => p.data_entrega < hoje && !['entregue','cancelado'].includes(p.status))
  const proximos = pedidos.filter(p => p.data_entrega > hoje && p.status !== 'cancelado').slice(0, 3)
  const semana   = pedidos.filter(p => p.data_entrega > hoje && p.data_entrega <= em7dias && p.status !== 'cancelado')

  const totalHoje    = pedHoje.reduce((s, p) => s + p.valor, 0)
  const recebidoHoje = pedHoje.reduce((s, p) => s + p.sinal_pago, 0)
  const aReceber     = pedHoje.reduce((s, p) => s + (p.valor - p.sinal_pago), 0)
  const totalSemana  = semana.reduce((s, p) => s + p.valor, 0)

  const sLabel: Record<string, string> = {
    pendente:'Pendente', confirmado:'Confirmado',
    em_producao:'Produção', pronto:'Pronto',
    entregue:'Entregue', cancelado:'Cancelado',
  }
  const sBg:   Record<string, string> = { pendente:'#FEF9C3',confirmado:'#DBEAFE',em_producao:'#EDE9FE',pronto:'#DCFCE7',entregue:'#F3F4F6',cancelado:'#FEE2E2' }
  const sText: Record<string, string> = { pendente:'#854D0E',confirmado:'#1E40AF',em_producao:'#5B21B6',pronto:'#14532D', entregue:'#6B7280',cancelado:'#991B1B' }
  const sDot:  Record<string, string> = { pendente:'#EAB308',confirmado:'#3B82F6',em_producao:'#8B5CF6',pronto:'#22C55E', entregue:'#9CA3AF',cancelado:'#EF4444' }

  // labelData removida — nao utilizada no layout atual

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:240 }}>
      <p style={{ color:'#F9A8D4', fontSize:14 }}>Carregando...</p>
    </div>
  )

  /* ── COLUNA ESQUERDA */
  const left = (
    <div style={{ display:'flex', flexDirection:'column', gap:16, flex:1, minWidth:0 }}>

      <AvisosBanner />

      {/* Banner */}
      <div style={{ borderRadius:20, background:'linear-gradient(135deg,#EC4899 0%,#DB2777 55%,#BE185D 100%)', padding:'24px 24px 20px', color:'white', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute',top:-20,right:-20,width:110,height:110,borderRadius:'50%',backgroundColor:'rgba(255,255,255,0.07)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:-25,right:30,width:70,height:70,borderRadius:'50%',backgroundColor:'rgba(255,255,255,0.05)',pointerEvents:'none' }} />
        <p style={{ fontSize:13,color:'rgba(255,255,255,0.85)',margin:'0 0 4px' }}>Bem-vinda de volta! 🎉</p>
        <h2 style={{ fontSize:22,fontWeight:800,margin:'0 0 6px',lineHeight:1.2 }}>{perfil.nome_negocio || perfil.nome}</h2>
        <p style={{ fontSize:12,color:'rgba(255,255,255,0.75)',margin:0,textTransform:'capitalize' }}>
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
        {[
          { label:'Hoje',      val:pedHoje.length,  cor:'#EC4899', bg:'#FDF2F8', e:'📅' },
          { label:'Próximos',  val:proximos.length, cor:'#7C3AED', bg:'#F5F3FF', e:'🗓' },
          { label:'Atrasados', val:pedAtras.length, cor:pedAtras.length>0?'#DC2626':'#16A34A', bg:pedAtras.length>0?'#FEF2F2':'#F0FDF4', e:pedAtras.length>0?'⚠️':'✅' },
        ].map(k => (
          <div key={k.label} style={{ backgroundColor:k.bg, borderRadius:14, padding:'14px 12px', textAlign:'center' }}>
            <p style={{ fontSize:20,margin:'0 0 4px' }}>{k.e}</p>
            <p style={{ fontSize:24,fontWeight:800,color:k.cor,margin:'0 0 2px',lineHeight:1 }}>{k.val}</p>
            <p style={{ fontSize:10,color:'#9CA3AF',margin:0,fontWeight:600 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Dica */}
      {dica && (
        <div style={{ backgroundColor:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:16,padding:'14px 16px' }}>
          <p style={{ fontSize:11,fontWeight:700,color:'#D97706',margin:'0 0 6px' }}>✨ Dica do dia</p>
          <p style={{ fontSize:13,color:'#92400E',lineHeight:1.5,margin:0 }}>{dica.texto}</p>
        </div>
      )}

      {/* Atrasos */}
      {pedAtras.length > 0 && (
        <div style={{ backgroundColor:'#FEF2F2',border:'1px solid #FECACA',borderRadius:16,padding:'14px 16px' }}>
          <p style={{ fontSize:12,fontWeight:700,color:'#DC2626',margin:'0 0 6px' }}>
            ⚠️ {pedAtras.length} pedido{pedAtras.length>1?'s':''} em atraso!
          </p>
          {pedAtras.map(p => (
            <p key={p.id} style={{ fontSize:13,color:'#991B1B',margin:'2px 0' }}>• {p.cliente_nome} — {p.descricao}</p>
          ))}
        </div>
      )}

      {/* Entregas hoje */}
      <div style={{ backgroundColor:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding:'12px 16px',borderBottom:'1px solid #FCE7F3',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontWeight:700,color:'#111827',fontSize:13,margin:0 }}>📅 Entregas de hoje</h3>
          <span style={{ fontSize:11,fontWeight:700,color:'#DB2777',backgroundColor:'#FCE7F3',borderRadius:20,padding:'2px 8px' }}>{pedHoje.length}</span>
        </div>
        {pedHoje.length === 0 ? (
          <div style={{ padding:'28px 16px',textAlign:'center',color:'#D1D5DB',fontSize:13 }}>🎉 Nenhuma entrega hoje</div>
        ) : pedHoje.map((p, i) => (
          <div key={p.id} style={{ padding:'12px 16px',borderBottom:i<pedHoje.length-1?'1px solid #FDF2F8':'none',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12 }}>
            <div style={{ flex:1,minWidth:0 }}>
              <p style={{ fontWeight:600,color:'#111827',fontSize:13,margin:'0 0 2px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.cliente_nome}</p>
              <p style={{ fontSize:11,color:'#9CA3AF',margin:'0 0 4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.descricao}</p>
              {p.hora_entrega && <p style={{ fontSize:11,color:'#EC4899',margin:0 }}>🕐 {p.hora_entrega.slice(0,5)}</p>}
            </div>
            <div style={{ textAlign:'right',flexShrink:0 }}>
              <span style={{ fontSize:10,fontWeight:600,padding:'3px 8px',borderRadius:20,backgroundColor:sBg[p.status],color:sText[p.status],display:'inline-block',marginBottom:4 }}>
                {sLabel[p.status]}
              </span>
              <p style={{ fontSize:14,fontWeight:800,color:'#16A34A',margin:0 }}>R$ {p.valor.toFixed(2).replace('.',',')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Secoes da visao do dia — aparecem na coluna unica no mobile */}
      {!desktop && (
        <>
          {/* Financeiro mobile */}
          <div style={{ backgroundColor:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 16px',borderBottom:'1px solid #FCE7F3' }}>
              <h3 style={{ fontWeight:700,color:'#111827',fontSize:13,margin:0 }}>💰 Financeiro de hoje</h3>
            </div>
            <div style={{ padding:'14px 16px',display:'flex',flexDirection:'column',gap:10 }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:12,color:'#6B7280' }}>Total em pedidos</span>
                <span style={{ fontSize:15,fontWeight:800,color:'#111827' }}>R$ {totalHoje.toFixed(2).replace('.',',')}</span>
              </div>
              <div style={{ height:1,backgroundColor:'#F3F4F6' }} />
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:12,color:'#6B7280' }}>✅ Já recebido</span>
                <span style={{ fontSize:13,fontWeight:700,color:'#16A34A' }}>R$ {recebidoHoje.toFixed(2).replace('.',',')}</span>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:12,color:'#6B7280' }}>⏳ A receber</span>
                <span style={{ fontSize:13,fontWeight:700,color:'#D97706' }}>R$ {aReceber.toFixed(2).replace('.',',')}</span>
              </div>
              {totalHoje > 0 && (
                <div>
                  <div style={{ height:6,backgroundColor:'#F3F4F6',borderRadius:99,overflow:'hidden' }}>
                    <div style={{ height:'100%',borderRadius:99,backgroundColor:'#22C55E',width:`${Math.round((recebidoHoje/totalHoje)*100)}%`,transition:'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize:10,color:'#9CA3AF',margin:'4px 0 0',textAlign:'right' }}>
                    {Math.round((recebidoHoje/totalHoje)*100)}% recebido
                  </p>
                </div>
              )}
              {totalHoje === 0 && (
                <p style={{ fontSize:12,color:'#D1D5DB',textAlign:'center',margin:'4px 0 0' }}>Nenhum pedido hoje</p>
              )}
            </div>
          </div>

          {/* Proximos 7 dias mobile */}
          <div style={{ backgroundColor:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding:'12px 16px',borderBottom:'1px solid #FCE7F3',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <h3 style={{ fontWeight:700,color:'#111827',fontSize:13,margin:0 }}>📆 Próximos 7 dias</h3>
              <span style={{ fontSize:11,fontWeight:700,color:'#7C3AED',backgroundColor:'#F5F3FF',borderRadius:20,padding:'2px 8px' }}>{semana.length}</span>
            </div>
            {semana.length === 0 ? (
              <div style={{ padding:'20px 16px',textAlign:'center',color:'#D1D5DB',fontSize:12 }}>Nenhum pedido nos próximos 7 dias</div>
            ) : (
              <div style={{ padding:'8px 0' }}>
                {semana.slice(0,5).map((p,i) => (
                  <div key={p.id} style={{ padding:'10px 16px',borderBottom:i<semana.slice(0,5).length-1?'1px solid #FDF2F8':'none',display:'flex',alignItems:'center',gap:10 }}>
                    <div style={{ backgroundColor:'#F5F3FF',borderRadius:8,padding:'4px 7px',flexShrink:0,textAlign:'center',minWidth:40 }}>
                      <p style={{ fontSize:13,fontWeight:800,color:'#7C3AED',margin:0,lineHeight:1.2 }}>{format(parseISO(p.data_entrega),'dd',{locale:ptBR})}</p>
                      <p style={{ fontSize:9,color:'#A78BFA',margin:0,textTransform:'uppercase',fontWeight:700 }}>{format(parseISO(p.data_entrega),'MMM',{locale:ptBR})}</p>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontWeight:600,color:'#111827',fontSize:13,margin:'0 0 1px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.cliente_nome}</p>
                      <p style={{ fontSize:11,color:'#9CA3AF',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.descricao}</p>
                    </div>
                    <p style={{ fontSize:13,fontWeight:700,color:'#16A34A',margin:0,flexShrink:0 }}>R$ {p.valor.toFixed(2).replace('.',',')}</p>
                  </div>
                ))}
                {semana.length > 5 && (
                  <p style={{ fontSize:11,color:'#9CA3AF',textAlign:'center',padding:'8px 16px',margin:0 }}>+{semana.length-5} pedidos</p>
                )}
              </div>
            )}
            {semana.length > 0 && (
              <div style={{ padding:'10px 16px',borderTop:'1px solid #FCE7F3',backgroundColor:'#FAFAFA',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span style={{ fontSize:11,color:'#6B7280',fontWeight:600 }}>Total 7 dias</span>
                <span style={{ fontSize:13,fontWeight:800,color:'#7C3AED' }}>R$ {totalSemana.toFixed(2).replace('.',',')}</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  /* ── COLUNA DIREITA - VISAO DO DIA */
  const right = (
    <div style={{ display:'flex',flexDirection:'column',gap:14,width:280,flexShrink:0 }}>

      {/* Financeiro */}
      <div style={{ backgroundColor:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding:'12px 16px',borderBottom:'1px solid #FCE7F3' }}>
          <h3 style={{ fontWeight:700,color:'#111827',fontSize:13,margin:0 }}>💰 Financeiro de hoje</h3>
        </div>
        <div style={{ padding:'14px 16px',display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:12,color:'#6B7280' }}>Total em pedidos</span>
            <span style={{ fontSize:15,fontWeight:800,color:'#111827' }}>R$ {totalHoje.toFixed(2).replace('.',',')}</span>
          </div>
          <div style={{ height:1,backgroundColor:'#F3F4F6' }} />
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:12,color:'#6B7280' }}>✅ Já recebido</span>
            <span style={{ fontSize:13,fontWeight:700,color:'#16A34A' }}>R$ {recebidoHoje.toFixed(2).replace('.',',')}</span>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:12,color:'#6B7280' }}>⏳ A receber</span>
            <span style={{ fontSize:13,fontWeight:700,color:'#D97706' }}>R$ {aReceber.toFixed(2).replace('.',',')}</span>
          </div>
          {totalHoje > 0 && (
            <div>
              <div style={{ height:6,backgroundColor:'#F3F4F6',borderRadius:99,overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:99,backgroundColor:'#22C55E',width:`${Math.round((recebidoHoje/totalHoje)*100)}%`,transition:'width 0.5s' }} />
              </div>
              <p style={{ fontSize:10,color:'#9CA3AF',margin:'4px 0 0',textAlign:'right' }}>
                {Math.round((recebidoHoje/totalHoje)*100)}% recebido
              </p>
            </div>
          )}
          {totalHoje === 0 && (
            <p style={{ fontSize:12,color:'#D1D5DB',textAlign:'center',margin:'4px 0 0' }}>Nenhum pedido hoje</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      {pedHoje.length > 0 && (
        <div style={{ backgroundColor:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ padding:'12px 16px',borderBottom:'1px solid #FCE7F3' }}>
            <h3 style={{ fontWeight:700,color:'#111827',fontSize:13,margin:0 }}>🕐 Agenda de hoje</h3>
          </div>
          <div style={{ padding:'14px 16px',display:'flex',flexDirection:'column',gap:0 }}>
            {[...pedHoje]
              .sort((a,b) => (a.hora_entrega||'99:99').localeCompare(b.hora_entrega||'99:99'))
              .map((p,i,arr) => (
              <div key={p.id} style={{ display:'flex',gap:10,paddingBottom:i<arr.length-1?14:0 }}>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',flexShrink:0 }}>
                  <div style={{ width:10,height:10,borderRadius:'50%',backgroundColor:sDot[p.status],marginTop:3,flexShrink:0 }} />
                  {i<arr.length-1 && <div style={{ width:2,flex:1,backgroundColor:'#FCE7F3',marginTop:3 }} />}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
                    <p style={{ fontWeight:600,color:'#111827',fontSize:12,margin:'0 0 1px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:140 }}>{p.cliente_nome}</p>
                    <span style={{ fontSize:10,color:'#EC4899',fontWeight:700,flexShrink:0,marginLeft:4 }}>
                      {p.hora_entrega ? p.hora_entrega.slice(0,5) : 'Sem hora'}
                    </span>
                  </div>
                  <p style={{ fontSize:11,color:'#9CA3AF',margin:'0 0 4px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.descricao}</p>
                  <span style={{ fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:20,backgroundColor:sBg[p.status],color:sText[p.status] }}>
                    {sLabel[p.status]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Próximos 7 dias */}
      <div style={{ backgroundColor:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ padding:'12px 16px',borderBottom:'1px solid #FCE7F3',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <h3 style={{ fontWeight:700,color:'#111827',fontSize:13,margin:0 }}>📆 Próximos 7 dias</h3>
          <span style={{ fontSize:11,fontWeight:700,color:'#7C3AED',backgroundColor:'#F5F3FF',borderRadius:20,padding:'2px 8px' }}>{semana.length}</span>
        </div>
        {semana.length === 0 ? (
          <div style={{ padding:'20px 16px',textAlign:'center',color:'#D1D5DB',fontSize:12 }}>Nenhum pedido nos próximos 7 dias</div>
        ) : (
          <div style={{ padding:'8px 0' }}>
            {semana.slice(0,6).map((p,i) => (
              <div key={p.id} style={{ padding:'8px 16px',borderBottom:i<semana.slice(0,6).length-1?'1px solid #FDF2F8':'none',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ backgroundColor:'#F5F3FF',borderRadius:8,padding:'4px 7px',flexShrink:0,textAlign:'center',minWidth:40 }}>
                  <p style={{ fontSize:13,fontWeight:800,color:'#7C3AED',margin:0,lineHeight:1.2 }}>{format(parseISO(p.data_entrega),'dd',{locale:ptBR})}</p>
                  <p style={{ fontSize:9,color:'#A78BFA',margin:0,textTransform:'uppercase',fontWeight:700 }}>{format(parseISO(p.data_entrega),'MMM',{locale:ptBR})}</p>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontWeight:600,color:'#111827',fontSize:12,margin:'0 0 1px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.cliente_nome}</p>
                  <p style={{ fontSize:11,color:'#9CA3AF',margin:0,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis' }}>{p.descricao}</p>
                </div>
                <p style={{ fontSize:12,fontWeight:700,color:'#16A34A',margin:0,flexShrink:0 }}>R$ {p.valor.toFixed(2).replace('.',',')}</p>
              </div>
            ))}
            {semana.length > 6 && (
              <p style={{ fontSize:11,color:'#9CA3AF',textAlign:'center',padding:'8px 16px',margin:0 }}>+{semana.length-6} pedidos</p>
            )}
          </div>
        )}
        {semana.length > 0 && (
          <div style={{ padding:'10px 16px',borderTop:'1px solid #FCE7F3',backgroundColor:'#FAFAFA',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:11,color:'#6B7280',fontWeight:600 }}>Total 7 dias</span>
            <span style={{ fontSize:13,fontWeight:800,color:'#7C3AED' }}>R$ {totalSemana.toFixed(2).replace('.',',')}</span>
          </div>
        )}
      </div>

    </div>
  )

  return (
    <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>
      {left}
      {desktop && right}
    </div>
  )
}
