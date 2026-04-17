/* eslint-env node */
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2'
import admin from 'firebase-admin'
import process from 'node:process'
import twilio from 'twilio'

admin.initializeApp()
setGlobalOptions({ region: 'us-central1', maxInstances: 10 })

const db = admin.firestore()

const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials are not configured.')
  }

  return twilio(accountSid, authToken)
}

export const sendInvitationMessage = onCall(async (request) => {
  const { guestId } = request.data || {}
  if (!guestId) {
    throw new HttpsError('invalid-argument', 'guestId is required.')
  }

  const docRef = db.collection('guests').doc(guestId)
  const snapshot = await docRef.get()
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Guest not found.')
  }

  const guest = snapshot.data()
  const ticketUrl =
    guest.ticketUrl || `${process.env.APP_BASE_URL || ''}/ticket/${guest.guestId}`
  const body =
    'Wedding entry key, please save and pin this message. We look forward to seeing you. ' +
    ticketUrl

  try {
    if (!guest.phone) {
      throw new Error('No phone available for WhatsApp.')
    }

    const client = getTwilioClient()
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${guest.phone}`,
      body,
    })

    await docRef.update({
      messageStatus: 'sent',
      messageChannel: 'whatsapp',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return { status: 'sent', channel: 'whatsapp' }
  } catch (error) {
    await docRef.update({
      messageStatus: 'failed',
      messageError: error.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    throw new HttpsError('internal', error.message)
  }
})

export const validateAndCheckIn = onCall(async (request) => {
  const { qrPayload } = request.data || {}
  if (!qrPayload) {
    throw new HttpsError('invalid-argument', 'qrPayload is required.')
  }

  let decoded
  try {
    decoded = JSON.parse(qrPayload)
  } catch {
    throw new HttpsError('invalid-argument', 'Invalid QR payload format.')
  }

  const { guestId, token } = decoded
  if (!guestId || !token) {
    throw new HttpsError('invalid-argument', 'QR payload missing guestId or token.')
  }

  const docRef = db.collection('guests').doc(guestId)
  const snapshot = await docRef.get()
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Guest record not found.')
  }

  const guest = snapshot.data()

  if (guest.token !== token) {
    throw new HttpsError('permission-denied', 'Invalid token.')
  }

  if (guest.checkedIn) {
    return { status: 'used', message: 'Already used.' }
  }

  await docRef.update({
    checkedIn: true,
    checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { status: 'valid', message: 'Check-in successful.' }
})

export const sendThankYouMessages = onCall(async (request) => {
  const batchSize = Number(request.data?.batchSize || 100)
  const checkedIn = await db
    .collection('guests')
    .where('checkedIn', '==', true)
    .limit(batchSize)
    .get()

  if (checkedIn.empty) {
    return { sent: 0 }
  }

  let sent = 0
  const client = getTwilioClient()

  for (const doc of checkedIn.docs) {
    const guest = doc.data()
    try {
      if (!guest.phone) {
        continue
      }

      await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${guest.phone}`,
        body: `Thank you for celebrating with us, ${guest.fullName}.`,
      })

      sent += 1
      await doc.ref.update({
        thankYouSent: true,
        thankYouSentAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    } catch {
      await doc.ref.update({ thankYouSent: false })
    }
  }

  return { sent }
})
