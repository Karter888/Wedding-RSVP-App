import { invokeEdgeFunction } from './rsvpServiceInternal'

export const generateInviteToken = async ({ guestId, expiresInMinutes = 60 }) => {
  return invokeEdgeFunction('generate-invite-token', { guestId, expiresInMinutes })
}
export const createInvite = async ({
  fullName,
  invitedSide = 'groom',
  phone = null,
  email = null,
  expiresInMinutes = 1440,
  shareLimit = 1,
  allowedPhones = [],
}) => {
  return invokeEdgeFunction('create-invite', {
    fullName,
    invitedSide,
    phone,
    email,
    expiresInMinutes,
    shareLimit,
    allowedPhones,
  })
}
export default { generateInviteToken, createInvite }
