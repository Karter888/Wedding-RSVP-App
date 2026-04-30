import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RsvpForm } from '../components/RsvpForm'
import { SectionCard } from '../components/SectionCard'
import { sendTicketFallbackEmail } from '../services/emailService'
import { submitRsvp } from '../services/rsvpService'
import {
  clearFailedForm,
  readFailedForm,
  saveFailedForm,
} from '../services/storageService'
import { validateRsvp } from '../utils/validation'
import { MAX_PLUS_ONES_PER_RSVP } from '../utils/constants'

const initialState = {
  invitedSide: '',
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
  const [searchParams] = useSearchParams()
  const failedPayload = readFailedForm()

  useEffect(() => {
    const side = searchParams.get('side')
    if (side !== 'groom' && side !== 'bride') {
      navigate('/rsvp/side', { replace: true })
      return
    }

    setValues((prev) => ({ ...prev, invitedSide: side }))
  }, [navigate, searchParams])

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
    const guestCount = Math.min(MAX_PLUS_ONES_PER_RSVP, Math.max(0, Number(nextCountValue) || 0))
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
      let emailStatus = 'pending'

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

      const messageStatus = `Email: ${emailStatus} | WhatsApp: manual from admin dashboard`

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
          <img src={result.qrCodeDataUrl} alt="RSVP QR" loading="lazy" className="mx-auto mt-6 w-56 rounded-xl" />
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
        <p className="mt-1 text-xs text-charcoal/60">
          You can register up to {MAX_PLUS_ONES_PER_RSVP} accompanying guests per RSVP.
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
