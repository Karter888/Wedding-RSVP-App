import { invokeEdgeFunction } from './rsvpServiceInternal'

export const generateInviteToken = async ({ guestId, expiresInMinutes = 60 }) => {
  return invokeEdgeFunction('generate-invite-token', { guestId, expiresInMinutes })
}
export const createInvite = async ({ fullName, invitedSide = 'groom', phone = null, email = null, expiresInMinutes = 1440 }) => {
  return invokeEdgeFunction('create-invite', { fullName, invitedSide, phone, email, expiresInMinutes })
}
export default { generateInviteToken, createInvite }
