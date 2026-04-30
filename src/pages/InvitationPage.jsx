import { Link } from 'react-router-dom'
import { CountdownTimer } from '../components/CountdownTimer'
import { PublicNavbar } from '../components/PublicNavbar'
import { SectionCard } from '../components/SectionCard'
import { EVENT_DETAILS } from '../utils/constants'
import heroImg from '../assets/photo2-515.jpg'

export const InvitationPage = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fdf7ef_0%,#f8f2ea_45%,#efe2d5_100%)]">
      <PublicNavbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section
          className="grid gap-6 overflow-hidden rounded-3xl border border-rosewood/15 bg-white/70 p-5 shadow-soft backdrop-blur md:grid-cols-2 md:p-8"
        >
          <picture>
            <source srcSet={heroImg.replace('.jpg', '.optimized.webp')} type="src\assets\photo2-515.jpg" />
            <img
              src={heroImg}
              alt="Couple portrait"
              loading="lazy"
              className="h-80 w-full rounded-2xl object-cover md:h-full"
            />
          </picture>
          <div className="flex flex-col justify-center">
            <p className="text-xs uppercase tracking-[0.35em] text-rosewood">Together With Their Families</p>
            <h1 className="mt-3 font-heading text-5xl text-charcoal sm:text-6xl">
              {EVENT_DETAILS.coupleNames}
            </h1>
            <p className="mt-4 text-base text-charcoal/75">
              joyfully invite you to celebrate their wedding ceremony and reception.
            </p>
            <Link
              to="/rsvp/side"
              className="mt-6 inline-flex w-fit rounded-full bg-rosewood px-6 py-3 text-sm font-semibold text-cream hover:bg-rosewood/90"
            >
              Register Now
            </Link>
          </div>
        </section>

        <SectionCard className="grid gap-3 sm:grid-cols-3" id="details">
          <div>
            <p className="text-xs uppercase tracking-wider text-rosewood">Date</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{EVENT_DETAILS.dateLabel}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-rosewood">Time</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{EVENT_DETAILS.time}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-rosewood">Venue</p>
            <p className="mt-1 text-lg font-semibold text-charcoal">{EVENT_DETAILS.venue}</p>
          </div>
        </SectionCard>

        <SectionCard className="space-y-4" id="countdown">
          <div>
            <p className="text-xs uppercase tracking-wider text-rosewood">Countdown</p>
            <h2 className="font-heading text-4xl text-charcoal">Until The Big Event</h2>
          </div>
          <CountdownTimer dateIsoString={EVENT_DETAILS.isoDate} />
        </SectionCard>
      </main>
    </div>
  )
}
