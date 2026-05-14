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
    const phones = ['0969496996','0770667097','0952204401']
    console.log('Creating invite for phones:', phones)
    const create = await post('create-invite', { invitedSide: 'bride', allowedPhones: phones, shareLimit: phones.length })
    console.log('CREATE:', create)
    const token = create.body && create.body.inviteToken
    if (!token) return console.error('No token returned')

    console.log('Validating before use...')
    console.log(await post('validate-invite-link', { token }))

    for (const phone of phones) {
      console.log('\n--- Submitting RSVP for', phone, '---')
      const submit = await post('submit-rsvp', {
        inviteToken: token,
        fullName: `Smoke ${phone}`,
        invitedSide: 'bride',
        attendanceStatus: 'Attending',
        guestCount: 0,
        guestNames: [],
        phone: phone,
        email: `${phone}@example.com`,
        token: `smoketoken-${phone}`,
        qrCodeDataUrl: '',
        ticketUrl: `http://localhost:5174/ticket/${phone}`
      })
      console.log('SUBMIT:', submit)

      const after = await post('validate-invite-link', { token })
      console.log('VALIDATE AFTER:', after)
    }

    console.log('\nDone')
  } catch (e) {
    console.error('Error during multi smoke test:', e)
  }
})()
