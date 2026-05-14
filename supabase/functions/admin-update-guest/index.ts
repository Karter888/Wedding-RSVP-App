import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const { guestId, fullName, invitedSide, guestCount, guestNames, phone, email } = payload

    if (!guestId) return jsonResponse({ error: 'guestId is required' }, 400)

    const supabase = createServiceClient()
    const now = new Date().toISOString()

    const updatePayload: Record<string, unknown> = { updated_at: now }
    if (typeof fullName === 'string') updatePayload.full_name = fullName
    if (typeof invitedSide === 'string') updatePayload.invited_side = invitedSide
    if (typeof guestCount !== 'undefined') updatePayload.guest_count = Number(guestCount || 0)
    if (typeof guestNames !== 'undefined') updatePayload.guest_names = Array.isArray(guestNames) ? guestNames : []
    if (typeof phone !== 'undefined') updatePayload.phone = phone
    if (typeof email !== 'undefined') updatePayload.email = email

    const { error } = await supabase.from('guests').update(updatePayload).eq('guest_id', guestId)

    if (error) throw error

    return jsonResponse({ status: 'ok' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update guest.'
    return jsonResponse({ error: message }, 500)
  }
})
import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const { guestId, updates } = payload || {}
    if (!guestId) return jsonResponse({ error: 'guestId is required' }, 400)
    if (!updates || typeof updates !== 'object') return jsonResponse({ error: 'updates are required' }, 400)

    const supabase = createServiceClient()
    const updatePayload: Record<string, unknown> = {}
    if (updates.fullName !== undefined) updatePayload.full_name = updates.fullName
    if (updates.phone !== undefined) updatePayload.phone = updates.phone
    if (updates.email !== undefined) updatePayload.email = updates.email
    if (updates.invitedSide !== undefined) updatePayload.invited_side = updates.invitedSide
    if (updates.guestCount !== undefined) updatePayload.guest_count = Number(updates.guestCount || 0)
    updatePayload.updated_at = new Date().toISOString()

    const { error } = await supabase.from('guests').update(updatePayload).eq('guest_id', guestId)
    if (error) throw error

    return jsonResponse({ status: 'ok' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update guest.'
    return jsonResponse({ error: message }, 500)
  }
})
