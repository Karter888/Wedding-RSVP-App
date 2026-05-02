import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

type ListGuestsPayload = {
  attendanceStatus?: string
  checkedIn?: boolean
  search?: string
  page?: number
  pageSize?: number
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const payload = await request.json().catch(() => ({} as ListGuestsPayload))
    const { attendanceStatus, checkedIn } = payload
    const search = typeof payload.search === 'string' ? payload.search.trim() : ''
    const pageSize = Math.min(Math.max(Number(payload.pageSize || 25), 1), 100)
    const page = Math.max(Number(payload.page || 1), 1)
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const supabase = createServiceClient()
    let query = supabase.from('guests').select('*', { count: 'exact' }).order('created_at', { ascending: false })

    if (attendanceStatus) {
      query = query.eq('attendance_status', attendanceStatus)
    }

    if (typeof checkedIn === 'boolean') {
      query = query.eq('checked_in', checkedIn)
    }

    if (search) {
      const escapedSearch = search.replace(/[%_]/g, '\\$&')
      query = query.or(
        [
          `full_name.ilike.%${escapedSearch}%`,
          `phone.ilike.%${escapedSearch}%`,
          `email.ilike.%${escapedSearch}%`,
        ].join(','),
      )
    }

    query = query.range(from, to)

    const { data, error, count } = await query
    if (error) {
      throw error
    }

    return jsonResponse({
      guests: data || [],
      page,
      pageSize,
      total: count ?? 0,
      totalPages: count ? Math.max(1, Math.ceil(count / pageSize)) : 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list guests.'
    return jsonResponse({ error: message }, 500)
  }
})
