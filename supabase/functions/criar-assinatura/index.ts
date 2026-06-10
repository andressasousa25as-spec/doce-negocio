import { createClient } from 'jsr:@supabase/supabase-js@2'

const PRECOS = { basico: 59, completo: 99 } as const
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { plano } = await req.json()
    if (plano !== 'basico' && plano !== 'completo') {
      return new Response(JSON.stringify({ error: 'plano inválido' }), { status: 400, headers: cors })
    }

    // Identifica o usuário pelo JWT
    const authHeader = req.headers.get('Authorization') ?? ''
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData } = await supa.auth.getUser()
    const user = userData?.user
    if (!user) return new Response(JSON.stringify({ error: 'não autenticado' }), { status: 401, headers: cors })

    const appUrl = Deno.env.get('APP_URL') ?? 'https://doce-negocio.vercel.app'

    // Cria a assinatura recorrente no Mercado Pago
    const resp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('MP_ACCESS_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason: `Doce Negócio — Plano ${plano === 'completo' ? 'Completo' : 'Básico'}`,
        external_reference: `${user.id}|${plano}`,
        payer_email: user.email,
        back_url: `${appUrl}/?assinatura=ok`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRECOS[plano],
          currency_id: 'BRL',
        },
        status: 'pending',
      }),
    })
    const mp = await resp.json()
    if (!resp.ok) {
      console.error('MP erro', mp)
      return new Response(JSON.stringify({ error: 'falha no Mercado Pago' }), { status: 502, headers: cors })
    }
    return new Response(JSON.stringify({ init_point: mp.init_point }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'erro interno' }), { status: 500, headers: cors })
  }
})
