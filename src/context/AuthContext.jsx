import { createContext, useContext, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'

const AuthContext = createContext({
  isAdminSignedIn: false,
  user: null,
  isLoading: true,
})

export const AuthProvider = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser()

  const value = useMemo(
    () => ({
      isAdminSignedIn: Boolean(isLoaded && isSignedIn),
      user: user ?? null,
      isLoading: !isLoaded,
    }),
    [isLoaded, isSignedIn, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuthContext = () => useContext(AuthContext)
