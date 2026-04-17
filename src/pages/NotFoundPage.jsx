import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream px-4 text-center">
    <h1 className="font-heading text-6xl text-rosewood">404</h1>
    <p className="text-charcoal/80">The page you requested could not be found.</p>
    <Link to="/" className="rounded-full bg-rosewood px-4 py-2 text-sm font-semibold text-cream">
      Return to Invitation
    </Link>
  </div>
)
