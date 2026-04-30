import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

// ── Phone normalisation ───────────────────────────────────────────────────────
// Zambia (+260). Handles: 0978..., 978..., 260978..., +260978...
const normaliseToE164 = (raw: string): string => {
  if (!raw) throw new Error('Phone number is empty.')

  const digits = raw.replace(/\D/g, '')

  // Already full international: 260XXXXXXXXX (11 digits)
  if (digits.startsWith('260') && digits.length >= 11) {
    return `+260${digits.slice(3).replace(/^0+/, '')}`
  }

  // Local with leading zero: 09XXXXXXXX or 07XXXXXXXX (10 digits)
  if (digits.startsWith('0') && digits.length >= 9) {
    return `+260${digits.slice(1)}`
  }

  // Local without leading zero: 9XXXXXXXX (9 digits)
  if (digits.length === 9) {
    return `+260${digits}`
  }

  // Anything else — prepend + and hope for the best
  return `+${digits}`
}

// ── Build the wa.me fallback URL ──────────────────────────────────────────────
// Encodes a unique pre-filled message for each guest so the admin just taps Send.
const buildWaMeLink = (phone: string, message: string): string => {
  const digits = phone.replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${encoded}`
}

// ── Unique per-guest message body ─────────────────────────────────────────────
const buildMessageBody = (guestName: string, ticketUrl: string): string =>
  `Hello ${guestName} 👋\n\nYou're officially on the guest list! 🎉\n\nHere is your personal wedding entry QR code ticket:\n👉 ${ticketUrl}\n\nPlease save this message and have your QR ready at the entrance. We can't wait to celebrate with you! 💍`

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const { guestId } = await request.json()
    if (!guestId) {
      return jsonResponse({ error: 'guestId is required' }, 400)
    }

    const supabase = createServiceClient()
    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('guest_id', guestId)
      .maybeSingle()

    if (error) throw error
    if (!guest) return jsonResponse({ error: 'Guest not found' }, 404)

    const appBaseUrl = Deno.env.get('APP_BASE_URL') || ''
    const ticketUrl = guest.ticket_url || `${appBaseUrl}/ticket/${guest.guest_id}`

    // ── Unique message personalised per guest ─────────────────────────────
    const messageBody = buildMessageBody(guest.full_name, ticketUrl)

    // ── No phone — return wa.me link so admin can send manually ──────────
    if (!guest.phone) {
      return jsonResponse({
        status: 'no_phone',
        channel: 'wame_fallback',
        message: 'Guest has no phone number. Use the wa.me link to send manually.',
        waMeLink: null,
      }, 200)
    }

    // ── Normalise phone ───────────────────────────────────────────────────
    let normalisedPhone: string
    try {
      normalisedPhone = normaliseToE164(guest.phone)
    } catch (phoneError) {
      // Bad phone — return wa.me if we at least have raw digits
      await supabase.from('guests').update({
        message_status: 'failed',
        message_channel: 'wame_fallback',
        message_error: `Phone normalisation failed: ${phoneError.message}`,
        updated_at: new Date().toISOString(),
      }).eq('guest_id', guestId)

      return jsonResponse({
        status: 'failed',
        channel: 'wame_fallback',
        message: 'Could not normalise phone. Use wa.me link to send manually.',
        waMeLink: buildWaMeLink(guest.phone, messageBody),
      }, 200)
    }

        // wa.me manual-send link per guest.
    const waMeLink = buildWaMeLink(normalisedPhone, messageBody)

    await supabase.from('guests').update({
          message_status: 'pending',
          message_channel: 'wame_manual',
          message_error: null,
      updated_at: new Date().toISOString(),
    }).eq('guest_id', guestId)

    return jsonResponse({
          status: 'manual',
          channel: 'wame_manual',
      phone: normalisedPhone,
      waMeLink,
          message: 'Use the wa.me link below to send this guest their ticket manually.',
      messagePreview: messageBody,
    })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
})