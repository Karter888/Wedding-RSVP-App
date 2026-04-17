import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const { qrPayload } = await request.json()
    if (!qrPayload) {
      return jsonResponse({ error: 'qrPayload is required' }, 400)
    }

    let decoded
    try {
      decoded = JSON.parse(qrPayload)
    } catch {
      return jsonResponse({ error: 'Invalid QR payload format' }, 400)
    }

    const { guestId, token } = decoded
    if (!guestId || !token) {
      return jsonResponse({ error: 'QR payload missing guestId or token' }, 400)
    }

    const supabase = createServiceClient()
    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_id', guestId)
      .eq('token', token)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!guest) {
      return jsonResponse({ error: 'Invalid token' }, 403)
    }

    if (guest.checked_in) {
      return jsonResponse({ status: 'used', message: 'Already used.' })
    }

    await supabase
      .from('guests')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq('guest_id', guestId)

    return jsonResponse({ status: 'valid', message: 'Check-in successful.' })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
})
