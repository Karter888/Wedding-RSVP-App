import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return optionsResponse()

  try {
    const supabase = createServiceClient()
    const appBase = Deno.env.get('APP_BASE_URL') || Deno.env.get('VITE_APP_BASE_URL') || Deno.env.get('VITE_SUPABASE_URL') || ''
    const pageSize = 200
    let offset = 0
    let totalUpdated = 0

    while (true) {
      const { data, error } = await supabase
        .from('guests')
        .select('guest_id, token, ticket_url, qr_code_data_url, invited_side, accompanying_checked_in')
        .or('ticket_url.is.null,qr_code_data_url.is.null')
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!data || data.length === 0) break

      for (const row of data) {
        const guestId = row.guest_id
        const token = row.token
        const ticketUrl = row.ticket_url || `${appBase.replace(/\/$/, '')}/ticket/${guestId}`
        const qrPayload = JSON.stringify({ guestId, token })
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrPayload)}`
        const invitedSide = row.invited_side || 'groom'
        const accompanying = typeof row.accompanying_checked_in === 'number' ? row.accompanying_checked_in : 0

        const updates: Record<string, unknown> = {}
        if (!row.ticket_url) updates.ticket_url = ticketUrl
        if (!row.qr_code_data_url) updates.qr_code_data_url = qrUrl
        if (!row.invited_side) updates.invited_side = invitedSide
        if (row.accompanying_checked_in == null) updates.accompanying_checked_in = accompanying
        updates.updated_at = new Date().toISOString()

        if (Object.keys(updates).length === 0) continue

        const { error: uErr } = await supabase.from('guests').update(updates).eq('guest_id', guestId)
        if (uErr) throw uErr
        totalUpdated += 1
      }

      offset += pageSize
    }

    return jsonResponse({ updated: totalUpdated })
  } catch (err) {
    return jsonResponse({ error: String(err) }, 500)
  }
})
