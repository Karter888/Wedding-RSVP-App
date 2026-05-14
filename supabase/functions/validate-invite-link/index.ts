import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const { token } = await request.json().catch(() => ({}))
    if (!token) return jsonResponse({ error: 'token is required' }, 400)

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('guests')
      .select('guest_id, invite_expires_at, invite_used_at, invite_token')
      .eq('invite_token', token)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return jsonResponse({ error: 'Invite not found' }, 404)
    }

    // If an invite has been explicitly used (invite_token nulled or invite_used_at set), treat as not found
    if (!data.invite_token) {
      return jsonResponse({ error: 'Invite not found' }, 404)
    }

    if (data.invite_expires_at && new Date(data.invite_expires_at) < new Date()) {
      return jsonResponse({ error: 'Invite expired' }, 410)
    }

    return jsonResponse({ valid: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to validate invite'
    return jsonResponse({ error: message }, 500)
  }
})
