const FAILED_FORM_KEY = 'wedding_rsvp_failed_form'

export const saveFailedForm = (payload) => {
  localStorage.setItem(FAILED_FORM_KEY, JSON.stringify(payload))
}

export const readFailedForm = () => {
  const raw = localStorage.getItem(FAILED_FORM_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const clearFailedForm = () => {
  localStorage.removeItem(FAILED_FORM_KEY)
}
