import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

type ListGuestsPayload = {
  attendanceStatus?: string
  checkedIn?: boolean
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const payload = await request.json().catch(() => ({} as ListGuestsPayload))
    const { attendanceStatus, checkedIn } = payload

    const supabase = createServiceClient()
    let query = supabase.from('guests').select('*').order('created_at', { ascending: false })

    if (attendanceStatus) {
      query = query.eq('attendance_status', attendanceStatus)
    }

    if (typeof checkedIn === 'boolean') {
      query = query.eq('checked_in', checkedIn)
    }

    const { data, error } = await query
    if (error) {
      throw error
    }

    return jsonResponse({ guests: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list guests.'
    return jsonResponse({ error: message }, 500)
  }
})
