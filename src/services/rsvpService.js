import { supabase } from './supabase'
import { buildQrPayload, generateQrCodeWithRetry } from '../utils/qr'
import { generateToken } from '../utils/token'
import { invokeEdgeFunction } from './rsvpServiceInternal'

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
  inviteToken: row.invite_token,
  inviteUsedAt: row.invite_used_at,
  inviteAllowedPhones: row.invite_allowed_phones || [],
  inviteShareLimit: row.invite_share_limit || 1,
  inviteUsedPhones: row.invite_used_phones || [],
  isPlaceholder: !!row.is_placeholder,
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
    inviteToken: formData.inviteToken || null,
    qrCodeDataUrl,
    ticketUrl,
  })


  if (data?.error) {
    throw new Error(data.error)
  }

  // The edge function may update an existing invited row and return a different guestId
  // (when RSVP was submitted via an invite token). Prefer server-returned values when present.
  const returnedGuestId = data?.guestId || guestId
  const returnedTicketUrl = data?.ticketUrl || ticketUrl
  // qrPayload may be returned as a JSON string by the function; parse it if present.
  let returnedQrPayload = payload
  if (data?.qrPayload) {
    try {
      returnedQrPayload = typeof data.qrPayload === 'string' ? JSON.parse(data.qrPayload) : data.qrPayload
    } catch (e) {
      returnedQrPayload = payload
    }
  }

  return { guestId: returnedGuestId, ticketUrl: returnedTicketUrl, qrCodeDataUrl, qrPayload: returnedQrPayload }
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
    search: filters.search,
    page: filters.page,
    pageSize: filters.pageSize,
  })

  return {
    guests: (data?.guests || []).map(mapGuestRow),
    page: Number(data?.page || filters.page || 1),
    pageSize: Number(data?.pageSize || filters.pageSize || 25),
    total: Number(data?.total || 0),
    totalPages: Number(data?.totalPages || 0),
  }
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

export const sendInvitationMessage = async ({ guestId }) => {
  return invokeEdgeFunction('send-invitation-message', { guestId })
}

export const sendThankYouBatches = async () => {
  return invokeEdgeFunction('send-thank-you-messages', { batchSize: 50 })
}

export const markThankYouSent = async (guestIds = []) => {
  if (!Array.isArray(guestIds) || guestIds.length === 0) {
    return { marked: 0 }
  }
  return invokeEdgeFunction('mark-thank-you-sent', { guestIds })
}

export const deleteGuests = async (guestIds = []) => {
  if (!Array.isArray(guestIds) || guestIds.length === 0) return { deleted: 0 }
  const data = await invokeEdgeFunction('admin-delete-guests', { guestIds })
  if (data?.error) throw new Error(data.error)
  return data
}

export const adminCreateGuest = async (guest) => {
  const data = await invokeEdgeFunction('admin-create-guest', guest)
  if (data?.error) throw new Error(data.error)
  return mapGuestRow(data.guest)
}

export const adminUpdateGuest = async (guestId, updates = {}) => {
  const data = await invokeEdgeFunction('admin-update-guest', { guestId, ...updates })
  if (data?.error) throw new Error(data.error)
  return data
}

export const adminResetQr = async (guestId) => {
  const data = await invokeEdgeFunction('admin-reset-qr', { guestId })
  if (data?.error) throw new Error(data.error)
  return data
}


export const generateQrForGuest = async (guestId) => {
  const data = await invokeEdgeFunction('get-ticket-by-guest-id', { guestId })
  if (data?.error) throw new Error(data.error)
  if (!data?.guest) throw new Error('Guest not found')
  return mapGuestRow(data.guest)
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

export const validateInviteToken = async (token) => {
  if (!token) return false
  const data = await invokeEdgeFunction('validate-invite-link', { token })
  if (data?.error) return false
  return data?.valid === true
}