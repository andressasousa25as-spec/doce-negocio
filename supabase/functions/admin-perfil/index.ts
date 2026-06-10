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

    const { acao, alvoId, dados } = await req.json()
    if (!alvoId) return new Response(JSON.stringify({ error: 'alvo invalido' }), { status: 400, headers: cors })

    const hoje = new Date()
    let update: Record<string, unknown> = {}
    if (acao === 'definir_plano') {
      const venc = new Date(); venc.setMonth(venc.getMonth() + 1)
      update = { status_assinatura: 'ativa', ativo: true, plano: dados.plano === 'completo' ? 'completo' : 'basico', valor_plano: dados.plano === 'completo' ? 99 : 59, data_venc: venc.toISOString().split('T')[0] }
    } else if (acao === 'dar_dias') {
      const { data: alvo } = await admin.from('perfis').select('data_venc').eq('id', alvoId).single()
      const base = alvo?.data_venc && new Date(alvo.data_venc + 'T12:00:00') > hoje ? new Date(alvo.data_venc + 'T12:00:00') : hoje
      base.setDate(base.getDate() + Number(dados.dias || 0))
      update = { status_assinatura: 'ativa', ativo: true, data_venc: base.toISOString().split('T')[0] }
    } else if (acao === 'bloquear') {
      update = { status_assinatura: 'cancelada', ativo: false }
    } else if (acao === 'editar_dados') {
      const permitido = ['nome', 'nome_negocio', 'telefone', 'cidade']
      for (const k of permitido) if (k in dados) update[k] = dados[k]
    } else {
      return new Response(JSON.stringify({ error: 'acao invalida' }), { status: 400, headers: cors })
    }

    const { error } = await admin.from('perfis').update(update).eq('id', alvoId)
    if (error) { console.error(error); return new Response(JSON.stringify({ error: 'falha ao atualizar' }), { status: 500, headers: cors }) }
    return new Response(JSON.stringify({ ok: true, update }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: 'erro interno' }), { status: 500, headers: cors })
  }
})
