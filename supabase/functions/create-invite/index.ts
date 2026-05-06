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
    const { fullName, invitedSide = 'groom', phone = null, email = null, expiresInMinutes = 1440 } = payload

    // Allow creating placeholder invites without requiring full guest details.
    const resolvedFullName = fullName && String(fullName).trim() ? String(fullName).trim() : 'Invited Guest'

    const guestId = crypto.randomUUID()
    const inviteToken = genToken()
    const expiresAt = new Date(Date.now() + Number(expiresInMinutes) * 60000).toISOString()
    const now = new Date().toISOString()

    const insertRow: any = {
      guest_id: guestId,
      full_name: resolvedFullName,
      invited_side: invitedSide,
      attendance_status: 'Maybe',
      guest_count: 0,
      guest_names: [],
      phone: phone || null,
      email: email || null,
      token: genToken(),
      qr_code_data_url: '',
      ticket_url: '',
      invite_token: inviteToken,
      invite_expires_at: expiresAt,
      checked_in: false,
      message_status: 'pending',
      created_at: now,
      updated_at: now,
    }

    const { error } = await supabase.from('guests').insert(insertRow)
    if (error) throw error

    return new Response(JSON.stringify({ guestId, inviteToken, inviteExpiresAt: expiresAt }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
