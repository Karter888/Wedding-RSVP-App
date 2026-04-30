import { useNavigate } from 'react-router-dom'
import { SectionCard } from '../components/SectionCard'
import { INVITE_SIDE_OPTIONS } from '../utils/constants'

export const InviteSidePage = () => {
  const navigate = useNavigate()

  const selectSide = (side) => {
    navigate(`/rsvp?side=${side}`)
  }

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <SectionCard className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-widest text-rosewood">Before You Register</p>
        <h1 className="mt-2 font-heading text-5xl text-charcoal">Who Invited You?</h1>
        <p className="mt-3 text-sm text-charcoal/75">
          Choose the invitation side so we can organize guest records correctly.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {INVITE_SIDE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => selectSide(option.value)}
              className="rounded-2xl border border-rosewood/20 bg-white px-6 py-8 text-left transition hover:border-rosewood hover:shadow-soft"
            >
              <p className="text-xs uppercase tracking-[0.22em] text-rosewood">Invitation Side</p>
              <p className="mt-2 font-heading text-3xl text-charcoal">{option.label}</p>
            </button>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
