const base = 'https://hghkmvcdievbsignalfx.supabase.co/functions/v1'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnaGttdmNkaWV2YnNpZ25hbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzMzU4OTMsImV4cCI6MjA5MTkxMTg5M30.9DoQ1NFlrnLjN3hTon5ZzTwIIpebDd3u5-sWyifyajE'

async function post(path, body) {
  const res = await fetch(`${base}/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch(e) { json = text }
  return { status: res.status, body: json }
}

;(async () => {
  try {
    console.log('Creating invite...')
    const create = await post('create-invite', { invitedSide: 'bride', allowedPhones: ['0961234567'], shareLimit: 1 })
    console.log('CREATE:', create)
    const token = create.body && create.body.inviteToken
    if (!token) return console.error('No token returned')

    console.log('Validating before use...')
    console.log(await post('validate-invite-link', { token }))

    console.log('Submitting RSVP using invite token...')
    const submit = await post('submit-rsvp', {
      inviteToken: token,
      fullName: 'Smoke Test',
      invitedSide: 'bride',
      attendanceStatus: 'Attending',
      guestCount: 0,
      guestNames: [],
      phone: '0961234567',
      email: 'smoke@example.com',
      token: 'smoketoken',
      qrCodeDataUrl: '',
      ticketUrl: 'http://localhost:5174/ticket/test'
    })
    console.log('SUBMIT:', submit)

    console.log('Validating after use...')
    const after = await post('validate-invite-link', { token })
    console.log('VALIDATE AFTER:', after)
  } catch (e) {
    console.error('Error during smoke test:', e)
  }
})()
