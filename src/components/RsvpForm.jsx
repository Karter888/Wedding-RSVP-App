import { useMemo } from 'react'
import { ATTENDANCE_OPTIONS } from '../utils/constants'
import { MAX_PLUS_ONES_PER_RSVP } from '../utils/constants'

const FieldError = ({ message }) =>
  message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null

export const RsvpForm = ({
  values,
  errors,
  isSubmitting,
  submitError,
  failedPayload,
  onChange,
  onGuestCountChange,
  onSubmit,
  onRetryFailed,
}) => {
  const guestInputs = useMemo(
    () =>
      values.guestNames.map((name, index) => (
        <input
          key={`guest-${index}`}
          className="w-full rounded-lg border border-rosewood/20 bg-white px-3 py-2 text-sm"
          value={name}
          placeholder={`Guest ${index + 1} full name`}
          onChange={(event) => onChange(`guestNames.${index}`, event.target.value)}
        />
      )),
    [onChange, values.guestNames],
  )

  // Keep the input strictly in local form (9 digits after +260).
  const localPhone = values.phone
    .replace(/^\+260/, '')
    .replace(/^260/, '')
    .replace(/^0+/, '')
    .slice(0, 9)

  const handlePhoneChange = (event) => {
    const rawDigits = event.target.value.replace(/\D/g, '')
    const localDigits = rawDigits.replace(/^0+/, '').slice(0, 9)
    onChange('phone', localDigits ? `+260${localDigits}` : '')
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="text-sm font-semibold text-charcoal">Invited From *</label>
        <input
          className="mt-1 w-full rounded-lg border border-rosewood/20 bg-cream px-3 py-2 text-sm"
          value={values.invitedSide === 'groom' ? "Man's Side" : values.invitedSide === 'bride' ? "Woman's Side" : ''}
          readOnly
          placeholder="Choose side first"
        />
        <FieldError message={errors.invitedSide} />
      </div>

      <div>
        <label className="text-sm font-semibold text-charcoal">Full Name *</label>
        <input
          className="mt-1 w-full rounded-lg border border-rosewood/20 bg-white px-3 py-2 text-sm"
          value={values.fullName}
          onChange={(event) => onChange('fullName', event.target.value)}
          placeholder="Your full name"
        />
        <FieldError message={errors.fullName} />
      </div>

      <div>
        <label className="text-sm font-semibold text-charcoal">Attendance Status *</label>
        <select
          className="mt-1 w-full rounded-lg border border-rosewood/20 bg-white px-3 py-2 text-sm"
          value={values.attendanceStatus}
          onChange={(event) => onChange('attendanceStatus', event.target.value)}
        >
          <option value="">Select one</option>
          {ATTENDANCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <FieldError message={errors.attendanceStatus} />
      </div>

      <div>
        <label className="text-sm font-semibold text-charcoal">Number of Guests</label>
        <input
          type="number"
          min={0}
          max={MAX_PLUS_ONES_PER_RSVP}
          className="mt-1 w-full rounded-lg border border-rosewood/20 bg-white px-3 py-2 text-sm"
          value={values.guestCount}
          onChange={(event) => onGuestCountChange(event.target.value)}
        />
        <p className="mt-1 text-xs text-charcoal/60">Maximum accompanying guests: {MAX_PLUS_ONES_PER_RSVP}</p>
        <FieldError message={errors.guestCount} />
      </div>

      {values.guestCount > 0 && <div className="space-y-2">{guestInputs}</div>}
      <FieldError message={errors.guestNames} />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* ── Fix 6: +260 locked prefix ───────────────────────────────── */}
        <div>
          <label className="text-sm font-semibold text-charcoal">Phone Number | WhatsApp recommended</label>
          <div className="mt-1 flex rounded-lg border border-rosewood/20 bg-white overflow-hidden">
            <span className="flex items-center bg-rosewood/8 px-3 text-sm font-semibold text-rosewood border-r border-rosewood/20 select-none">
              +260
            </span>
            <input
              className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
              value={localPhone}
              onChange={handlePhoneChange}
              placeholder="97XXXXXXX"
              maxLength={9}
              inputMode="numeric"
            />
          </div>
          <p className="mt-1 text-xs text-charcoal/50">Type 9 digits only (for example: 97XXXXXXX).</p>
        </div>

        <div>
          <label className="text-sm font-semibold text-charcoal">Email</label>
          <input
            className="mt-1 w-full rounded-lg border border-rosewood/20 bg-white px-3 py-2 text-sm"
            value={values.email}
            onChange={(event) => onChange('email', event.target.value)}
            placeholder="you@example.com"
          />
          <FieldError message={errors.email} />
        </div>
      </div>
      <FieldError message={errors.contact} />

      {submitError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {failedPayload && (
        <button
          type="button"
          onClick={onRetryFailed}
          className="text-sm font-semibold text-rosewood underline"
        >
          Retry last failed submission
        </button>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-rosewood px-5 py-3 text-sm font-semibold text-cream transition hover:bg-rosewood/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? 'Submitting RSVP...' : 'Submit RSVP'}
      </button>
    </form>
  )
}