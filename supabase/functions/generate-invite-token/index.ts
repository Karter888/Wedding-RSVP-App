import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

const genToken = () => {
  const seed = `${Date.now()}-${Math.random()}`
  return btoa(seed).replace(/=+$/, '').slice(0, 28)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json().catch(() => ({}))
    const { guestId, expiresInMinutes = 60 } = payload
    if (!guestId) return new Response(JSON.stringify({ error: 'guestId is required' }), { status: 400, headers: corsHeaders })

    const token = genToken()
    const expiresAt = new Date(Date.now() + Number(expiresInMinutes) * 60000).toISOString()

    const { error } = await supabase.from('guests').update({ invite_token: token, invite_expires_at: expiresAt }).eq('guest_id', guestId)
    if (error) throw error

    return new Response(JSON.stringify({ inviteToken: token, inviteExpiresAt: expiresAt }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
