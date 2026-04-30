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

    const guestCount = Number(guest.guest_count || 0)
    const accompanyingCheckedIn = Number(guest.accompanying_checked_in || 0)
    const remainingAccompanying = Math.max(0, guestCount - accompanyingCheckedIn)

    if (guest.checked_in) {
      return jsonResponse({
        status: 'used',
        guestId,
        requiresManualAccompanyingCheckIn: remainingAccompanying > 0,
        remainingAccompanying,
        message:
          remainingAccompanying > 0
            ? `Primary guest already checked in. ${remainingAccompanying} accompanying guest(s) still pending manual check-in.`
            : 'Already used.',
      })
    }

    await supabase
      .from('guests')
      .update({
        checked_in: true,
        checked_in_at: new Date().toISOString(),
      })
      .eq('guest_id', guestId)

    return jsonResponse({
      status: 'valid',
      guestId,
      requiresManualAccompanyingCheckIn: guestCount > 0,
      remainingAccompanying: remainingAccompanying,
      message:
        guestCount > 0
          ? `Primary guest checked in. Please manually check in ${remainingAccompanying} accompanying guest(s) as they arrive.`
          : 'Check-in successful.',
    })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
})
