import emailjs from '@emailjs/browser'

const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const buildQrImageUrl = ({ qrPayload, ticketUrl }) => {
  const source = qrPayload || ticketUrl || ''
  if (!source) return ''
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&data=${encodeURIComponent(source)}`
}

export const sendTicketFallbackEmail = async ({
  toEmail,
  guestName,
  ticketUrl,
  qrPayload,
}) => {
  if (!serviceId || !templateId || !publicKey || !toEmail) {
    return { status: 'skipped' }
  }

  const qrImageUrl = buildQrImageUrl({ qrPayload, ticketUrl })

  const templateParams = {
    to_email: toEmail,
    email: toEmail,
    user_email: toEmail,
    to_name: guestName,
    guest_name: guestName,
    name: guestName,
    user_name: guestName,
    ticket_url: ticketUrl,
    ticket_link: ticketUrl,
    link: ticketUrl,
    qr_code_image: qrImageUrl || '',
    qr_code_image_url: qrImageUrl || '',
    subject: 'Your Wedding Entry Ticket',
    message:
      'Wedding entry key, please save and pin this message. We look forward to seeing you.',
  }

  try {
    await emailjs.send(serviceId, templateId, templateParams, { publicKey })
    return { status: 'sent' }
  } catch (error) {
    return {
      status: 'failed',
      error: error?.text || error?.message || 'Email fallback failed.',
    }
  }
}