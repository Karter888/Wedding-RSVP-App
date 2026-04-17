import twilio from 'npm:twilio@5.6.0'
import { createServiceClient } from '../_shared/supabase.ts'
import { jsonResponse, optionsResponse } from '../_shared/cors.ts'

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return optionsResponse()
  }

  try {
    const { batchSize = 100 } = await request.json().catch(() => ({}))
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

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')

    if (!accountSid || !authToken || !whatsappFrom) {
      return jsonResponse({ error: 'Missing Twilio configuration' }, 500)
    }

    const client = twilio(accountSid, authToken)
    let sent = 0

    for (const guest of guests || []) {
      if (!guest.phone) {
        continue
      }

      try {
        await client.messages.create({
          from: whatsappFrom,
          to: `whatsapp:${guest.phone}`,
          body: `Thank you for celebrating with us, ${guest.full_name}.`,
        })

        await supabase
          .from('guests')
          .update({
            thank_you_sent: true,
            thank_you_sent_at: new Date().toISOString(),
          })
          .eq('guest_id', guest.guest_id)

        sent += 1
      } catch {
        await supabase
          .from('guests')
          .update({ thank_you_sent: false })
          .eq('guest_id', guest.guest_id)
      }
    }

    return jsonResponse({ sent })
  } catch (error) {
    return jsonResponse({ error: error.message }, 500)
  }
})
