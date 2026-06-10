import { createClient } from 'jsr:@supabase/supabase-js@2'

function maisUmMes(): string {
  const d = new Date(); d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    let tipo = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? ''
    let id = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? ''

    if (!tipo || !id) {
      const body = await req.json().catch(() => ({}))
      tipo = tipo || body.type || body.topic || ''
      id = id || body.data?.id || body.id || ''
    }

    // Só tratamos eventos de assinatura (preapproval)
    if (!tipo.includes('preapproval') || !id) {
      return new Response('ignored', { status: 200 })
    }

    // Consulta o recurso real no MP (não confiar no corpo recebido)
    const r = await fetch(`https://api.mercadopago.com/preapproval/${id}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}` },
    })
    const pre = await r.json()
    if (!r.ok) { console.error('MP lookup falhou', pre); return new Response('mp error', { status: 200 }) }

    const ref: string = pre.external_reference ?? ''
    const [perfilId, plano] = ref.split('|')
    if (!perfilId) return new Response('sem ref', { status: 200 })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const status: string = pre.status // authorized | paused | cancelled | pending
    if (status === 'authorized') {
      await admin.from('perfis').update({
        status_assinatura: 'ativa',
        ativo: true,
        plano: plano === 'completo' ? 'completo' : 'basico',
        valor_plano: plano === 'completo' ? 99 : 59,
        data_venc: maisUmMes(),
        mp_subscription_id: id,
      }).eq('id', perfilId)
    } else if (status === 'cancelled' || status === 'paused') {
      await admin.from('perfis').update({
        status_assinatura: 'cancelada', ativo: false,
      }).eq('id', perfilId)
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 200 }) // 200 evita reenvio infinito do MP
  }
})
