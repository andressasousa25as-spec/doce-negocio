import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supaUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: ud } = await supaUser.auth.getUser()
    const user = ud?.user
    if (!user) return new Response(JSON.stringify({ error: 'nao autenticado' }), { status: 401, headers: cors })

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: me } = await admin.from('perfis').select('is_adm').eq('id', user.id).single()
    if (!me?.is_adm) return new Response(JSON.stringify({ error: 'sem permissao' }), { status: 403, headers: cors })

    const { assunto, corpo } = await req.json()
    const { data: perfis } = await admin.from('perfis').select('email').eq('is_adm', false)
    const emails = (perfis || []).map((p: { email: string }) => p.email).filter(Boolean)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('EMAIL_FROM')
    if (!apiKey || !from) return new Response(JSON.stringify({ error: 'email nao configurado' }), { status: 503, headers: cors })

    let enviados = 0, falhas = 0
    for (const to of emails) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to, subject: assunto, html: `<p>${corpo}</p>` }),
        })
        if (r.ok) enviados++; else { falhas++; console.error('resend', await r.text()) }
      } catch (e) { falhas++; console.error(e) }
    }
    return new Response(JSON.stringify({ enviados, falhas }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'erro interno' }), { status: 500, headers: cors })
  }
})
