import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

type SubmitRsvpPayload = {
  guestId?: string
  fullName?: string
  invitedSide?: 'groom' | 'bride' | string
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
      invitedSide,
      attendanceStatus,
      guestCount = 0,
      guestNames = [],
      phone,
      email,
      token,
      qrCodeDataUrl,
      ticketUrl,
    } = payload

    if (!guestId || !fullName || !attendanceStatus || !token  || !invitedSide) {
      return jsonResponse({ error: 'Missing required RSVP fields.' }, 400)
    }

    if (invitedSide !== 'groom' && invitedSide !== 'bride') {
      return jsonResponse({ error: 'Invalid invited side.' }, 400)
    }

    const safeGuestCount = Number(guestCount || 0)
    if (!Number.isFinite(safeGuestCount) || safeGuestCount < 0 || safeGuestCount > 2) {
      return jsonResponse({ error: 'guestCount must be between 0 and 2.' }, 400)
    }

    if (!Array.isArray(guestNames) || guestNames.length !== safeGuestCount) {
      return jsonResponse({ error: 'guestNames must match guestCount.' }, 400)
    }

    if (guestNames.some((name) => !name || !String(name).trim())) {
      return jsonResponse({ error: 'All accompanying guests must have names.' }, 400)
    }

    const supabase = createServiceClient()
    const normalisedName = fullName.trim()

    const { data: capacityRows, error: capacityError } = await supabase
      .from('guests')
      .select('guest_count')

    if (capacityError) {
      throw capacityError
    }

    const totalInvited = (capacityRows || []).reduce(
      (sum, row) => sum + 1 + Number(row.guest_count || 0),
      0,
    )

    const newPartySize = 1 + safeGuestCount
    if (totalInvited + newPartySize > 500) {
      return jsonResponse({ error: 'Registration is closed. Guest capacity (500) has been reached.' }, 409)
    }

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

    const baseInsert = {
      guest_id: guestId,
      full_name: normalisedName,
      attendance_status: attendanceStatus,
      guest_count: safeGuestCount,
      guest_names: guestNames.map((name) => String(name).trim()),
      phone: normalisePhone(phone),
      email: email || null,
      token,
      checked_in: false,
      checked_in_at: null,
      message_status: 'pending',
      created_at: now,
      updated_at: now,
    }

    const fullInsert = {
      ...baseInsert,
      invited_side: invitedSide,
      accompanying_checked_in: 0,
      ...(qrCodeDataUrl ? { qr_code_data_url: qrCodeDataUrl } : {}),
      ...(ticketUrl ? { ticket_url: ticketUrl } : {}),
    }

    // Try full insert first; if PostgREST schema cache is stale, fall back to minimal insert
    const { error: fullError } = await supabase.from('guests').insert(fullInsert)
    if (fullError) {
      const msg = String(fullError.message || fullError)
      if (msg.includes('Could not find') || msg.includes('schema cache') || String(fullError.code) === 'PGRST204') {
        const { error: fallbackError } = await supabase.from('guests').insert(baseInsert)
        if (fallbackError) {
          throw fallbackError
        }
      } else {
        throw fullError
      }
    }

    return jsonResponse({
      guestId,
      ticketUrl,
      qrCodeDataUrl,
      qrPayload: JSON.stringify({ guestId, token }),
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null
          ? JSON.stringify(error)
          : 'Failed to submit RSVP.'
    return jsonResponse({ error: message }, 500)
  }
})



