import { Navigate, Route, Routes } from 'react-router-dom'
import { InvitationPage } from './pages/InvitationPage'
import { InviteSidePage } from './pages/InviteSidePage'
import { RsvpPage } from './pages/RsvpPage'
import { TicketPage } from './pages/TicketPage'
import { AdminGuardedPage } from './pages/AdminDashboardPage'
import { AdminSignInPage } from './pages/AdminSignInPage'
import { NotFoundPage } from './pages/NotFoundPage'


function App() {
  return (
    <Routes>
      <Route path="/" element={<InvitationPage />} />
      <Route path="/rsvp/side" element={<InviteSidePage />} />
      <Route path="/rsvp" element={<RsvpPage />} />
      <Route path="/ticket/:guestId" element={<TicketPage />} />
      <Route path="/admin" element={<AdminGuardedPage />} />
      <Route path="/admin/sign-in/*" element={<AdminSignInPage />} />
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
