import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

type SubmitRsvpPayload = {
  guestId?: string
  fullName?: string
  attendanceStatus?: string
  guestCount?: number
  guestNames?: string[]
  phone?: string | null
  email?: string | null
  token?: string
  qrCodeDataUrl?: string
  ticketUrl?: string
}

const normalisePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null

  if (digits.startsWith('260')) {
    const localDigits = digits.slice(3).replace(/^0+/, '')
    return localDigits ? `+260${localDigits}` : null
  }

  if (digits.startsWith('0')) {
    const localDigits = digits.slice(1).replace(/^0+/, '')
    return localDigits ? `+260${localDigits}` : null
  }

  if (digits.length === 9) {
    return `+260${digits}`
  }

  return `+${digits}`
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const payload = await request.json().catch(() => ({} as SubmitRsvpPayload))
    const {
      guestId,
      fullName,
      attendanceStatus,
      guestCount = 0,
      guestNames = [],
      phone,
      email,
      token,
      qrCodeDataUrl,
      ticketUrl,
    } = payload

    if (!guestId || !fullName || !attendanceStatus || !token || !qrCodeDataUrl || !ticketUrl) {
      return jsonResponse({ error: 'Missing required RSVP fields.' }, 400)
    }

    const supabase = createServiceClient()
    const normalisedName = fullName.trim()

    const { data: existing, error: lookupError } = await supabase
      .from('guests')
      .select('guest_id')
      .ilike('full_name', normalisedName)
      .maybeSingle()

    if (lookupError) {
      throw lookupError
    }

    if (existing) {
      return jsonResponse(
        {
          error: `"${normalisedName}" is already registered. If this is a mistake, please contact the event organisers.`,
        },
        409,
      )
    }

    const now = new Date().toISOString()
    const { error } = await supabase.from('guests').insert({
      guest_id: guestId,
      full_name: normalisedName,
      attendance_status: attendanceStatus,
      guest_count: Number(guestCount || 0),
      guest_names: guestNames,
      phone: normalisePhone(phone),
      email: email || null,
      token,
      qr_code_data_url: qrCodeDataUrl,
      ticket_url: ticketUrl,
      checked_in: false,
      checked_in_at: null,
      message_status: 'pending',
      created_at: now,
      updated_at: now,
    })

    if (error) {
      throw error
    }

    return jsonResponse({
      guestId,
      ticketUrl,
      qrCodeDataUrl,
      qrPayload: JSON.stringify({ guestId, token }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit RSVP.'
    return jsonResponse({ error: message }, 500)
  }
})
