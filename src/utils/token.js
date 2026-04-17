export const generateToken = () => {
  const seed = `${Date.now()}-${Math.random()}`
  return btoa(seed).replace(/=/g, '').slice(0, 24)
}
