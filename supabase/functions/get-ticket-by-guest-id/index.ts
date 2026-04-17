import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const { guestId } = await request.json()
    if (!guestId) {
      return jsonResponse({ error: 'guestId is required' }, 400)
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_id', guestId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      return jsonResponse({ error: 'Ticket not found.' }, 404)
    }

    return jsonResponse({ guest: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load ticket.'
    return jsonResponse({ error: message }, 500)
  }
})
