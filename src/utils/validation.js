export const validateRsvp = (values) => {
  const errors = {}

  if (!values.fullName?.trim()) {
    errors.fullName = 'Full name is required.'
  }

  if (!values.attendanceStatus) {
    errors.attendanceStatus = 'Attendance status is required.'
  }

  if (!values.phone?.trim() && !values.email?.trim()) {
    errors.contact = 'Provide at least a phone number or an email.'
  }

  const guestCount = Number(values.guestCount || 0)
  if (Number.isNaN(guestCount) || guestCount < 0) {
    errors.guestCount = 'Guest count must be 0 or more.'
  }

  if (guestCount > 0 && values.guestNames.length !== guestCount) {
    errors.guestNames = 'Add all guest names before submitting.'
  }

  if (values.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(values.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
  }

  return errors
}
