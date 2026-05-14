import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const payload = await request.json().catch(() => ({}))
    const { guestIds } = payload
    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      return jsonResponse({ error: 'guestIds required' }, 400)
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('guests').delete().in('guest_id', guestIds)
    if (error) throw error

    return jsonResponse({ deleted: guestIds.length })
  } catch (err) {
    return jsonResponse({ error: (err as Error).message }, 500)
  }
})
