import QRCode from 'qrcode'

export const buildQrPayload = ({ guestId, token }) =>
  JSON.stringify({ guestId, token })

export const generateQrCodeWithRetry = async (payload, retries = 3) => {
  let attempt = 0
  while (attempt < retries) {
    try {
      return await QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'H',
        margin: 1,
        width: 320,
      })
    } catch (error) {
      attempt += 1
      if (attempt >= retries) {
        throw error
      }
    }
  }

  throw new Error('QR generation failed after retries.')
}
