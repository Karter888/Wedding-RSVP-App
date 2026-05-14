import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const {
      fullName,
      invitedSide = 'groom',
      guestCount = 0,
      guestNames = [],
      phone = null,
      email = null,
    } = payload

    if (!fullName) {
      return jsonResponse({ error: 'fullName is required' }, 400)
    }

    const supabase = createServiceClient()
    const guestId = crypto.randomUUID()
    const now = new Date().toISOString()
    const token = crypto.randomUUID()

    const insert = {
      guest_id: guestId,
      full_name: fullName,
      invited_side: invitedSide,
      guest_count: Number(guestCount || 0),
      guest_names: Array.isArray(guestNames) ? guestNames : [],
      phone,
      email,
      token,
      created_at: now,
      updated_at: now,
    }

    const { error } = await supabase.from('guests').insert([insert])

    if (error) throw error

    return jsonResponse({ guest: insert })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create guest.'
    return jsonResponse({ error: message }, 500)
  }
})
import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const guest = payload.guest || {}

    if (!guest.fullName) {
      return jsonResponse({ error: 'fullName is required' }, 400)
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const tokenSeed = `${Date.now()}-${Math.random()}`
    const token = btoa(tokenSeed).replace(/=+$/, '').slice(0, 24)

    const insertPayload = {
      full_name: guest.fullName,
      invited_side: guest.invitedSide || 'groom',
      attendance_status: guest.attendanceStatus || 'Attending',
      guest_count: guest.guestCount || 0,
      guest_names: guest.guestNames || [],
      phone: guest.phone || null,
      email: guest.email || null,
      token,
      qr_code_data_url: guest.qrCodeDataUrl || '',
      ticket_url: guest.ticketUrl || '',
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase.from('guests').insert(insertPayload).select().maybeSingle()
    if (error) throw error

    return jsonResponse({ guest: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create guest.'
    return jsonResponse({ error: message }, 500)
  }
})
