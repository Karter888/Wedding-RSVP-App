import { SignIn } from '@clerk/clerk-react'

export const AdminSignInPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-cream p-4">
    <SignIn path="/admin/sign-in" routing="path" signUpUrl="/" />
  </div>
)
