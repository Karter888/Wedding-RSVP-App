import { supabase } from './supabase'
import { buildQrPayload, generateQrCodeWithRetry } from '../utils/qr'
import { generateToken } from '../utils/token'

const mapGuestRow = (row) => ({
  guestId: row.guest_id,
  fullName: row.full_name,
  attendanceStatus: row.attendance_status,
  guestCount: row.guest_count,
  guestNames: row.guest_names || [],
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

const nowIso = () => new Date().toISOString()

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

export const updateCheckInStatus = async (guestId, checkedIn = true) => {
  await invokeEdgeFunction('admin-update-check-in', { guestId, checkedIn })
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