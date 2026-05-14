import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const { guestId } = payload

    if (!guestId) return jsonResponse({ error: 'guestId is required' }, 400)

    const supabase = createServiceClient()
    const now = new Date().toISOString()
    const newToken = crypto.randomUUID()

    const { error } = await supabase
      .from('guests')
      .update({ token: newToken, qr_code_data_url: null, ticket_url: null, updated_at: now })
      .eq('guest_id', guestId)

    if (error) throw error

    return jsonResponse({ guestId, token: newToken })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset QR token.'
    return jsonResponse({ error: message }, 500)
  }
})
import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const { guestId } = payload || {}
    if (!guestId) return jsonResponse({ error: 'guestId is required' }, 400)

    const supabase = createServiceClient()
    const tokenSeed = `${Date.now()}-${Math.random()}`
    const token = btoa(tokenSeed).replace(/=+$/, '').slice(0, 24)
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('guests')
      .update({ token, qr_code_data_url: '', ticket_url: '', updated_at: now })
      .eq('guest_id', guestId)

    if (error) throw error

    return jsonResponse({ status: 'ok' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reset QR.'
    return jsonResponse({ error: message }, 500)
  }
})
