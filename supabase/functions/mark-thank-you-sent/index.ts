import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { guestIds } = await req.json()

    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'guestIds must be a non-empty array' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { error, data } = await supabase
      .from('guests')
      .update({
        thank_you_sent: true,
        thank_you_sent_at: new Date().toISOString(),
      })
      .in('id', guestIds)
      .select()

    if (error) throw error

    return new Response(
      JSON.stringify({
        success: true,
        marked: data.length,
        message: `Marked ${data.length} guests as thank you sent`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
