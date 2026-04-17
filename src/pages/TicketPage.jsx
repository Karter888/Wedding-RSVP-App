import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TicketCard } from '../components/TicketCard'
import { getTicketByGuestId } from '../services/rsvpService'

export const TicketPage = () => {
  const { guestId } = useParams()
  const [ticket, setTicket] = useState(null)
  const [state, setState] = useState({ loading: true, error: '' })

  useEffect(() => {
    const load = async () => {
      setState({ loading: true, error: '' })
      try {
        const payload = await getTicketByGuestId(guestId)
        setTicket(payload)
      } catch (error) {
        setState({ loading: false, error: error.message || 'Ticket not found.' })
        return
      }
      setState({ loading: false, error: '' })
    }

    load()
  }, [guestId])

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      {state.loading && <p className="text-center text-charcoal/75">Loading ticket...</p>}
      {state.error && <p className="text-center text-red-600">{state.error}</p>}
      {!state.loading && ticket && <TicketCard guest={ticket} />}
    </div>
  )
}
