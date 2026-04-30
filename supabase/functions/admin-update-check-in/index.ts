import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

type UpdateCheckInPayload = {
  guestId?: string
  checkedIn?: boolean
  accompanyingCheckedIn?: number
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const payload = await request.json().catch(() => ({} as UpdateCheckInPayload))
    const { guestId, checkedIn = true, accompanyingCheckedIn } = payload

    if (!guestId) {
      return jsonResponse({ error: 'guestId is required' }, 400)
    }

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const updatePayload: Record<string, unknown> = {
      checked_in: checkedIn,
      checked_in_at: checkedIn ? now : null,
      updated_at: now,
    }

    if (typeof accompanyingCheckedIn === 'number') {
      updatePayload.accompanying_checked_in = Math.max(0, Math.floor(accompanyingCheckedIn))
    }

    const { error } = await supabase
      .from('guests')
      .update(updatePayload)
      .eq('guest_id', guestId)

    if (error) {
      throw error
    }

    return jsonResponse({ status: 'ok' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update check-in status.'
    return jsonResponse({ error: message }, 500)
  }
})
