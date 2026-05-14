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

const normalisePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('260')) {
    const local = digits.slice(3).replace(/^0+/, '')
    return local ? `+260${local}` : null
  }
  if (digits.startsWith('0')) {
    const local = digits.slice(1).replace(/^0+/, '')
    return local ? `+260${local}` : null
  }
  if (digits.length === 9) return `+260${digits}`
  return `+${digits}`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json().catch(() => ({}))
    const {
      fullName,
      invitedSide = 'groom',
      phone = null,
      email = null,
      expiresInMinutes = 1440,
      shareLimit = 1,
      allowedPhones = null,
    } = payload

    const guestId = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + Number(expiresInMinutes) * 60000).toISOString()
    const now = new Date().toISOString()

    // helper to ensure generated values are unique in the guests table
    const ensureUnique = async (column: string, genFn: () => string, maxAttempts = 6) => {
      for (let i = 0; i < maxAttempts; i++) {
        const candidate = genFn()
        const { data: existing, error: existsErr } = await supabase
          .from('guests')
          .select('guest_id')
          .eq(column, candidate)
          .maybeSingle()

        if (existsErr) throw existsErr
        if (!existing) return candidate
      }
      throw new Error(`Failed to generate unique ${column} after ${maxAttempts} attempts`)
    }

    // Generate unique tokens used for the invite link and QR token
    const inviteToken = await ensureUnique('invite_token', genToken)
    const qrToken = await ensureUnique('token', genToken)

    // Allow creating placeholder invites without requiring full guest details.
    // Use a unique placeholder name by appending a short slice of the generated
    // guestId to avoid violating unique constraints on full_name when multiple
    // placeholders are created.
    const resolvedFullName = fullName && String(fullName).trim()
      ? String(fullName).trim()
      : `Invited Guest ${guestId.slice(0, 8)}`

    const insertRow: any = {
      guest_id: guestId,
      full_name: resolvedFullName,
      invited_side: invitedSide,
      attendance_status: 'Maybe',
      guest_count: 0,
      guest_names: [],
      phone: phone || null,
      email: email || null,
      token: qrToken,
      qr_code_data_url: '',
      ticket_url: '',
      invite_token: inviteToken,
      invite_expires_at: expiresAt,
      invite_share_limit: Number(shareLimit || 1),
      invite_allowed_phones: Array.isArray(allowedPhones)
        ? (allowedPhones.map((p: any) => normalisePhone(p)).filter(Boolean) as string[])
        : (allowedPhones && String(allowedPhones).trim()
          ? String(allowedPhones)
              .split(',')
              .map((p) => normalisePhone(p))
              .filter(Boolean)
          : []),
      invite_used_phones: [],
      is_placeholder: true,
      checked_in: false,
      message_status: 'pending',
      created_at: now,
      updated_at: now,
    }

    const { error } = await supabase.from('guests').insert(insertRow)
    if (error) throw error

    return new Response(JSON.stringify({ guestId, inviteToken, inviteExpiresAt: expiresAt }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    // Log server-side error for debugging
    console.error('create-invite error:', error)
    const errMsg = (error as Error)?.message || String(error)
    const payload: any = { error: errMsg }
    // Include stack only when explicitly enabled via env var (avoid leaking in prod)
    if (Deno.env.get('DEBUG_CREATE_INVITE') === '1') {
      payload.stack = (error as Error)?.stack || null
    }
    return new Response(JSON.stringify(payload), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
