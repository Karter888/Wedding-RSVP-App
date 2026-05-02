import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

type ThankYouPayload = {
  batchSize?: number
}

const buildWaMeLink = (phone: string, guestName: string): string => {
  const digits = phone.replace(/\D/g, '')
  const message = `Thank you so much for celebrating with us, ${guestName}. We truly appreciate your presence on our special day. 💍`
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${encoded}`
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const { batchSize = 50 } = await request.json().catch(() => ({} as ThankYouPayload))
    const supabase = createServiceClient()
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .eq('checked_in', true)
      .eq('thank_you_sent', false)
      .limit(batchSize)

    if (error) {
      throw error
    }

    if (!guests || guests.length === 0) {
      return jsonResponse({
        message: 'No pending thank you messages.',
        thankYouLinks: [],
        total: 0,
      })
    }

    const thankYouLinks = guests.map((guest) => ({
      guestId: guest.guest_id,
      fullName: guest.full_name,
      phone: guest.phone,
      email: guest.email,
      hasPhone: !!guest.phone,
      waMeLink: guest.phone ? buildWaMeLink(guest.phone, guest.full_name) : null,
      status: 'ready',
    }))

    return jsonResponse({
      message: `Generated ${thankYouLinks.length} thank you message link(s).`,
      thankYouLinks,
      total: thankYouLinks.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate thank you links.'
    return jsonResponse({ error: message }, 500)
  }
})
