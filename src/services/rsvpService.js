import { supabase } from './supabase'
import { buildQrPayload, generateQrCodeWithRetry } from '../utils/qr'
import { generateToken } from '../utils/token'

const mapGuestRow = (row) => ({
  guestId: row.guest_id,
  fullName: row.full_name,
  attendanceStatus: row.attendance_status,
  invitedSide: row.invited_side,
  guestCount: row.guest_count,
  guestNames: row.guest_names || [],
  accompanyingCheckedIn: Number(row.accompanying_checked_in || 0),
  phone: row.phone,
  email: row.email,
  token: row.token,
  qrCodeDataUrl: row.qr_code_data_url,
  ticketUrl: row.ticket_url,
  checkedIn: row.checked_in,
  checkedInAt: row.checked_in_at,
  messageStatus: row.message_status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

// Normalise phone to +260XXXXXXXXX before saving.
const normalisePhone = (raw) => {
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

export const submitRsvp = async (formData) => {
  const guestId = crypto.randomUUID()
  const token = generateToken()

  const payload = buildQrPayload({ guestId, token })
  const qrCodeDataUrl = await generateQrCodeWithRetry(payload)
  const ticketUrl = `${window.location.origin}/ticket/${guestId}`

  const data = await invokeEdgeFunction('submit-rsvp', {
    guestId,
    fullName: formData.fullName,
    attendanceStatus: formData.attendanceStatus,
    invitedSide: formData.invitedSide,
    guestCount: Number(formData.guestCount || 0),
    guestNames: formData.guestNames,
    phone: normalisePhone(formData.phone),
    email: formData.email || null,
    token,
    qrCodeDataUrl,
    ticketUrl,
  })

  if (data?.error) {
    throw new Error(data.error)
  }

  return { guestId, ticketUrl, qrCodeDataUrl, qrPayload: payload }
}

export const getTicketByGuestId = async (guestId) => {
  const data = await invokeEdgeFunction('get-ticket-by-guest-id', { guestId })

  if (data?.error) {
    throw new Error(data.error)
  }

  if (!data?.guest) {
    throw new Error('Ticket not found.')
  }

  return mapGuestRow(data.guest)
}

export const fetchGuests = async (filters = {}) => {
  const data = await invokeEdgeFunction('admin-list-guests', {
    attendanceStatus: filters.attendanceStatus,
    checkedIn: filters.checkedIn,
  })

  return (data?.guests || []).map(mapGuestRow)
}

export const updateCheckInStatus = async (guestId, checkedIn = true, accompanyingCheckedIn) => {
  await invokeEdgeFunction('admin-update-check-in', {
    guestId,
    checkedIn,
    accompanyingCheckedIn,
  })
}

export const scanAndCheckIn = async (qrPayload) => {
  return invokeEdgeFunction('validate-and-check-in', { qrPayload })
}

const invokeEdgeFunction = async (functionName, payload) => {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export const sendInvitationMessage = async ({ guestId }) => {
  return invokeEdgeFunction('send-invitation-message', { guestId })
}

export const sendThankYouBatches = async () => {
  return invokeEdgeFunction('send-thank-you-messages', { batchSize: 100 })
}

export const buildWaMeLinkForGuest = (guest) => {
  if (!guest?.phone) return null

  const phoneDigits = guest.phone.replace(/\D/g, '')
  if (!phoneDigits) return null

  const ticketUrl = guest.ticketUrl || `${window.location.origin}/ticket/${guest.guestId}`
  const message = [
    `Hello ${guest.fullName},`,
    '',
    'Just a reminder and here is a copy of your QR code ticket.',
    ticketUrl,
    '',
    'Please keep it ready for check-in at the entrance.',
  ].join('\n')

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
}