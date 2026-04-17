import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RsvpForm } from '../components/RsvpForm'
import { SectionCard } from '../components/SectionCard'
import { sendTicketFallbackEmail } from '../services/emailService'
import { submitRsvp, sendInvitationMessage } from '../services/rsvpService'
import {
  clearFailedForm,
  readFailedForm,
  saveFailedForm,
} from '../services/storageService'
import { validateRsvp } from '../utils/validation'

const initialState = {
  fullName: '',
  attendanceStatus: '',
  guestCount: 0,
  guestNames: [],
  phone: '',
  email: '',
}

export const RsvpPage = () => {
  const [values, setValues] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [result, setResult] = useState(null)

  const navigate = useNavigate()
  const failedPayload = readFailedForm()

  const onChange = (field, value) => {
    if (field.startsWith('guestNames.')) {
      const [, indexString] = field.split('.')
      const index = Number(indexString)
      const next = [...values.guestNames]
      next[index] = value
      setValues((prev) => ({ ...prev, guestNames: next }))
      return
    }
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const onGuestCountChange = (nextCountValue) => {
    const guestCount = Math.max(0, Number(nextCountValue) || 0)
    setValues((prev) => ({
      ...prev,
      guestCount,
      guestNames: Array.from({ length: guestCount }, (_, index) => prev.guestNames[index] || ''),
    }))
  }

  const attemptSubmit = async (payload) => {
    const validationErrors = validateRsvp(payload)
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const ticket = await submitRsvp(payload)
      let whatsappStatus = 'pending'
      let emailStatus = 'pending'

      try {
        const invitationResult = await sendInvitationMessage({ guestId: ticket.guestId })
        whatsappStatus = invitationResult?.status === 'sent' ? 'sent' : 'failed'
      } catch {
        whatsappStatus = 'failed'
      }

      try {
        const emailResult = await sendTicketFallbackEmail({
          toEmail: payload.email,
          guestName: payload.fullName,
          ticketUrl: ticket.ticketUrl,
          qrCodeDataUrl: ticket.qrCodeDataUrl,
          qrPayload: ticket.qrPayload,
        })
        if (emailResult.status === 'sent') {
          emailStatus = 'sent'
        } else if (emailResult.status === 'skipped') {
          emailStatus = payload.email ? 'failed' : 'skipped'
        } else {
          emailStatus = 'failed'
        }
      } catch {
        emailStatus = payload.email ? 'failed' : 'skipped'
      }

      const messageStatus = `WhatsApp: ${whatsappStatus} | Email: ${emailStatus}`

      clearFailedForm()
      setResult({ ...ticket, messageStatus })
    } catch (error) {
      saveFailedForm(payload)
      setSubmitError(error.message || 'We could not submit your RSVP. Please retry.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    await attemptSubmit(values)
  }

  const onRetryFailed = async () => {
    const cached = readFailedForm()
    if (!cached) return
    setValues(cached)
    await attemptSubmit(cached)
  }

  if (result) {
    return (
      <div className="min-h-screen bg-cream px-4 py-10">
        <SectionCard className="mx-auto max-w-lg text-center">
          <p className="text-xs uppercase tracking-widest text-rosewood">RSVP Confirmed</p>
          <h1 className="mt-2 font-heading text-5xl text-charcoal">Thank You</h1>
          <img src={result.qrCodeDataUrl} alt="RSVP QR" className="mx-auto mt-6 w-56 rounded-xl" />
          <p className="mt-4 text-sm text-charcoal/80">
            Message status: <span className="font-semibold">{result.messageStatus}</span>
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate(`/ticket/${result.guestId}`)}
              className="rounded-full bg-rosewood px-5 py-2 text-sm font-semibold text-cream"
            >
              View Ticket
            </button>
            <button
              onClick={() => navigate('/')}
              className="rounded-full border border-rosewood/30 px-5 py-2 text-sm font-semibold text-rosewood"
            >
              Back to Invitation
            </button>
          </div>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <SectionCard className="mx-auto max-w-2xl">
        <p className="text-xs uppercase tracking-widest text-rosewood">Wedding RSVP</p>
        <h1 className="mt-2 font-heading text-5xl text-charcoal">Reserve Your Spot</h1>
        <p className="mt-2 text-sm text-charcoal/75">
          Fill in your details and we will generate your personal entry QR code.
        </p>

        <div className="mt-6">
          <RsvpForm
            values={values}
            errors={errors}
            isSubmitting={isSubmitting}
            submitError={submitError}
            failedPayload={failedPayload}
            onChange={onChange}
            onGuestCountChange={onGuestCountChange}
            onSubmit={onSubmit}
            onRetryFailed={onRetryFailed}
          />
        </div>
      </SectionCard>
    </div>
  )
}
