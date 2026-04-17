import { Link } from 'react-router-dom'

export const PublicNavbar = () => (
  <header className="sticky top-0 z-40 border-b border-rosewood/10 bg-cream/85 backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
      <p className="font-heading text-2xl text-rosewood">T + M Welcomes You To The Big Event</p>
      <nav className="flex items-center gap-3 text-sm font-medium text-charcoal">
        <a href="#details" className="hover:text-rosewood">
          Details
        </a>
        <a href="#countdown" className="hover:text-rosewood">
          Countdown
        </a>
        <Link
          to="/rsvp"
          className="rounded-full bg-rosewood px-4 py-2 text-cream transition hover:bg-rosewood/90"
        >
          Register
        </Link>
      </nav>
    </div>
  </header>
)
