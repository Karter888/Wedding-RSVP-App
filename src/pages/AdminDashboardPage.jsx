import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
} from '@clerk/clerk-react'
import {
  fetchGuests,
  buildWaMeLinkForGuest,
  scanAndCheckIn,
  sendThankYouBatches,
  markThankYouSent,
  updateCheckInStatus,
} from '../services/rsvpService'
import inviteService from '../services/inviteService'

const formatInvitedSideLabel = (side) => (side === 'groom' ? "Groom's Side" : "Bride's Side")

const AccompanyingGuestList = ({ guest, onAdjust }) => {
  const total = Number(guest.guestCount || 0)
  const checkedIn = Number(guest.accompanyingCheckedIn || 0)
  const guestNames = Array.isArray(guest.guestNames) ? guest.guestNames : []

  return (
    <div className="ml-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <p className="font-semibold text-charcoal">Accompanying Guests</p>
        <p className="text-xs text-charcoal/60">
          {checkedIn} / {total} checked in
        </p>
      </div>

      {guestNames.length > 0 ? (
        <ul className="space-y-2">
          {guestNames.map((name, idx) => {
            const isCheckedIn = idx < checkedIn

            return (
              <li
                key={`${guest.guestId}-accompanying-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-rosewood/10 bg-white/80 px-3 py-2 text-sm text-charcoal/80"
              >
                <div>
                  <p className="font-medium text-charcoal">{name || `Guest ${idx + 1}`}</p>
                  <p className="text-xs text-charcoal/50">Accompanying guest {idx + 1}</p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    isCheckedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isCheckedIn ? 'Checked in' : 'Waiting'}
                </span>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-sm italic text-charcoal/60">No accompanying guest names provided</p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={() => onAdjust(1)}
          disabled={checkedIn >= total}
          className="rounded-full bg-slategreen px-3 py-1.5 text-xs font-semibold text-white hover:bg-slategreen/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mark next guest arrived
        </button>
        <button
          onClick={() => onAdjust(-1)}
          disabled={checkedIn <= 0}
          className="rounded-full border border-rosewood/30 px-3 py-1.5 text-xs text-rosewood hover:bg-rosewood/5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Undo last arrival
        </button>
      </div>
    </div>
  )
}

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [guests, setGuests] = useState([])
  const [filters, setFilters] = useState({ status: '', checkedIn: '' })
  const [search, setSearch] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [waMeLink, setWaMeLink] = useState('')
  const [scanResult, setScanResult] = useState('')
  const [loading, setLoading] = useState(true)
  const [manualCheckInGuest, setManualCheckInGuest] = useState(null)
  const [expandedGuests, setExpandedGuests] = useState(new Set())
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [totalGuests, setTotalGuests] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const deferredSearch = useDeferredValue(search)

  const refreshGuests = useCallback(async () => {
    setLoading(true)
    const response = await fetchGuests({
      attendanceStatus: filters.status || undefined,
      checkedIn: filters.checkedIn === '' ? undefined : filters.checkedIn === 'yes',
      search: deferredSearch.trim() || undefined,
      page,
      pageSize,
    })
    setGuests(response.guests)
    setTotalGuests(response.total)
    setTotalPages(response.totalPages)
    setLoading(false)
    return response.guests
  }, [deferredSearch, filters.checkedIn, filters.status, page, pageSize])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshGuests()
    })
  }, [refreshGuests])

  useEffect(() => {
    setPage(1)
  }, [filters.checkedIn, filters.status, deferredSearch])

  const visibleGuests = useMemo(() => {
    return guests
  }, [guests])

  const guestsByInvitedSide = useMemo(() => {
    return visibleGuests.reduce((acc, guest) => {
      const side = guest.invitedSide === 'groom' ? 'groom' : 'bride'
      if (!acc[side]) acc[side] = []
      acc[side].push(guest)
      return acc
    }, {})
  }, [visibleGuests])

  const stats = useMemo(() => {
    const attending = guests.filter((guest) => guest.attendanceStatus === 'Attending').length
    const maybe = guests.filter((guest) => guest.attendanceStatus === 'Maybe').length
    const notAttending = guests.filter((guest) => guest.attendanceStatus === 'Not Attending').length
    const checkedIn = guests.filter((guest) => guest.checkedIn).length
    const accompanyingGuests = guests.reduce((sum, guest) => sum + Number(guest.guestCount || 0), 0)
    const invitedPeople = guests.length + accompanyingGuests

    return {
      total: guests.length,
      invitedPeople,
      accompanyingGuests,
      attending,
      maybe,
      notAttending,
      checkedIn,
    }
  }, [guests])

  const handleResend = async (guestId) => {
    const guest = guests.find((entry) => entry.guestId === guestId)
    const link = buildWaMeLinkForGuest(guest)

    if (!link) {
      setActionMessage('No phone number available for this guest.')
      setWaMeLink('')
      return
    }

    setActionMessage('Open the wa.me link and send the reminder with QR ticket manually.')
    setWaMeLink(link)
    window.open(link, '_blank', 'noopener,noreferrer')
  }

  const handleManualCheckIn = async (guest) => {
    await updateCheckInStatus(guest.guestId, true, Number(guest.accompanyingCheckedIn || 0))
    await refreshGuests()
  }

  const handleAccompanyingCheckIn = async (guest, delta) => {
    const current = Number(guest.accompanyingCheckedIn || 0)
    const total = Number(guest.guestCount || 0)
    const next = Math.min(total, Math.max(0, current + delta))

    if (next === current) return

    await updateCheckInStatus(guest.guestId, true, next)
    const records = await refreshGuests()
    const updated = records.find((entry) => entry.guestId === guest.guestId)
    setManualCheckInGuest(updated || null)
  }

  const handleScan = async (detectedCodes) => {
    if (!detectedCodes?.[0]?.rawValue) {
      return
    }

    try {
      const result = await scanAndCheckIn(detectedCodes[0].rawValue)
      setScanResult(result.message)
      const records = await refreshGuests()

      if (result?.requiresManualAccompanyingCheckIn && result?.guestId) {
        const matched = records.find((entry) => entry.guestId === result.guestId)
        setManualCheckInGuest(matched || null)
      }
    } catch (error) {
      setScanResult(error.message || 'Invalid QR code')
    }
  }

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const baseRowHeight = 8
    const lineHeight = 4
    const tableTopStart = 36

    const columns = [
      { key: 'present', label: 'Present', width: 16 },
      { key: 'checked', label: 'Checked In', width: 20 },
      { key: 'name', label: 'Guest Name', width: 40 },
      { key: 'side', label: 'Invitation Side', width: 30 },
      { key: 'status', label: 'Status', width: 20 },
      { key: 'party', label: 'Party', width: 14 },
      { key: 'accompanying', label: 'Accompanying Guests', width: 42 },
    ]

    const drawCheckbox = (x, y, checked = false) => {
      doc.rect(x, y, 4, 4)
      if (checked) {
        doc.line(x + 0.7, y + 2.2, x + 1.8, y + 3.5)
        doc.line(x + 1.8, y + 3.5, x + 3.4, y + 0.8)
      }
    }

    const drawHeader = () => {
      doc.setFont('times', 'bold')
      doc.setFontSize(16)
      doc.text('Wedding Guest List', margin, 16)
      doc.setFont('times', 'normal')
      doc.setFontSize(10)
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 22)

      const summary = [
        `Primary RSVPs: ${guests.length}`,
        `Accompanying Guests: ${stats.accompanyingGuests}`,
        `Total Invited People: ${stats.invitedPeople}`,
        `Groom's Side: ${guests.filter((guest) => guest.invitedSide === 'groom').length}`,
        `Bride's Side: ${guests.filter((guest) => guest.invitedSide === 'bride').length}`,
      ].join('  |  ')
      doc.text(summary, margin, 28)

      let x = margin
      doc.setFont('times', 'bold')
      doc.setFontSize(9)
      doc.setLineWidth(0.3)
      columns.forEach((column) => {
        doc.rect(x, tableTopStart, column.width, baseRowHeight)
        doc.text(column.label, x + 1, tableTopStart + 5.5)
        x += column.width
      })
    }

    const getWrapped = (text, width) => {
      const safe = String(text || '').trim() || '-'
      return doc.splitTextToSize(safe, width - 2)
    }

    let y = tableTopStart + baseRowHeight
    drawHeader()

    doc.setFont('times', 'normal')
    doc.setFontSize(9)

    guests.forEach((guest) => {
      const accompanyingNames = Array.isArray(guest.guestNames)
        ? guest.guestNames.filter(Boolean).join(', ')
        : ''

      const guestNameColumn = columns.find((column) => column.key === 'name')
      const sideColumn = columns.find((column) => column.key === 'side')
      const statusColumn = columns.find((column) => column.key === 'status')
      const accompanyingColumn = columns.find((column) => column.key === 'accompanying')

      const nameLines = getWrapped(guest.fullName, guestNameColumn.width)
      const sideLines = getWrapped(formatInvitedSideLabel(guest.invitedSide), sideColumn.width)
      const statusLines = getWrapped(guest.attendanceStatus, statusColumn.width)
      const accompanyingLines = getWrapped(accompanyingNames, accompanyingColumn.width)
      const lineCount = Math.max(
        nameLines.length,
        sideLines.length,
        statusLines.length,
        accompanyingLines.length,
        1,
      )
      const rowHeight = Math.max(baseRowHeight, lineCount * lineHeight + 3)

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage()
        y = tableTopStart + baseRowHeight
        drawHeader()
        doc.setFont('times', 'normal')
        doc.setFontSize(9)
      }

      let x = margin
      columns.forEach((column) => {
        doc.rect(x, y, column.width, rowHeight)
        if (column.key === 'present') {
          drawCheckbox(x + 6.5, y + 2)
        } else if (column.key === 'checked') {
          drawCheckbox(x + 8, y + 2, Boolean(guest.checkedIn))
        } else if (column.key === 'name') {
          doc.text(nameLines, x + 1, y + 5)
        } else if (column.key === 'side') {
          doc.text(sideLines, x + 1, y + 5)
        } else if (column.key === 'status') {
          doc.text(statusLines, x + 1, y + 5)
        } else if (column.key === 'party') {
          doc.text(String((Number(guest.guestCount || 0) + 1)), x + 5.5, y + 5.5)
        } else if (column.key === 'accompanying') {
          doc.text(accompanyingLines, x + 1, y + 5)
        }
        x += column.width
      })

      y += rowHeight
    })

    doc.save('wedding-guest-list.pdf')
  }

  const [thankYouLinks, setThankYouLinks] = useState([])
  const [thankYouStatus, setThankYouStatus] = useState('')
  const [thankYouLoading, setThankYouLoading] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ fullName: '', invitedSide: 'groom', phone: '', email: '', expiresInMinutes: 1440 })
  const [inviteGenerating, setInviteGenerating] = useState(false)
  const [inviteStatus, setInviteStatus] = useState('')
  const [lastInviteLink, setLastInviteLink] = useState('')
  const [selectedTable, setSelectedTable] = useState('all')

  const triggerThankYou = async () => {
    setThankYouLoading(true)
    setThankYouStatus('')
    try {
      const response = await sendThankYouBatches()
      setThankYouLinks(response.thankYouLinks || [])
      setThankYouStatus(response.message || 'Thank you links generated. Open wa.me links to send.')
    } catch (error) {
      setThankYouStatus(`Error: ${error.message}`)
    } finally {
      setThankYouLoading(false)
    }
  }

  const openWaMeLink = (waMeLink) => {
    if (waMeLink) {
      window.open(waMeLink, '_blank', 'noopener,noreferrer')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!')
    })
  }

  const markAllThankYouSent = async () => {
    if (thankYouLinks.length === 0) return
    setThankYouLoading(true)
    try {
      const guestIds = thankYouLinks.map((link) => link.guestId)
      await markThankYouSent(guestIds)
      setThankYouStatus('All thank you messages marked as sent!')
      setThankYouLinks([])
      await refreshGuests()
    } catch (error) {
      setThankYouStatus(`Error marking sent: ${error.message}`)
    } finally {
      setThankYouLoading(false)
    }
  }

  const createInvite = async () => {
    setInviteGenerating(true)
    setInviteStatus('')
    try {
      const { inviteToken } = await inviteService.createInvite({ expiresInMinutes: inviteForm.expiresInMinutes })
      const link = `${window.location.origin}/?token=${inviteToken}`
      await navigator.clipboard.writeText(link)
      setLastInviteLink(link)
      setInviteStatus('Invite link copied to clipboard!')
      setShowInviteModal(false)
      setInviteForm({ fullName: '', invitedSide: 'groom', phone: '', email: '', expiresInMinutes: 1440 })
      await refreshGuests()
    } catch (error) {
      setInviteStatus(`Failed: ${error.message}`)
    } finally {
      setInviteGenerating(false)
    }
  }

  // Auto-clear inviteStatus after a short delay
  useEffect(() => {
    if (!inviteStatus) return
    const id = setTimeout(() => setInviteStatus(''), 3500)
    return () => clearTimeout(id)
  }, [inviteStatus])

  const toggleExpanded = (guestId) => {
    setExpandedGuests((prev) => {
      const next = new Set(prev)
      if (next.has(guestId)) next.delete(guestId)
      else next.add(guestId)
      return next
    })
  }

  const GuestTableSection = ({ title, subtitle, guestsForSection, gradientClass }) => (
    <div className="rounded-xl border border-rosewood/15">
      <div className={`bg-gradient-to-r ${gradientClass} px-4 py-3`}>
        <h3 className="font-heading text-xl text-charcoal">{title}</h3>
        <p className="text-sm text-charcoal/70">{subtitle}</p>
      </div>
      <div className="divide-y divide-rosewood/10">
        {loading && (
          <div className="px-4 py-2 text-sm text-charcoal/70">Loading guests...</div>
        )}
        {!loading &&
          guestsForSection.map((guest) => (
            <GuestRow
              key={guest.guestId}
              guest={guest}
              isExpanded={expandedGuests.has(guest.guestId)}
              onToggle={() => toggleExpanded(guest.guestId)}
            />
          ))}
      </div>
    </div>
  )

  const StatCard = ({ icon, label, value, color }) => (
    <div className={`rounded-xl border border-rosewood/15 bg-gradient-to-br ${color} p-4`}>
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <p className="text-xs uppercase tracking-wider text-rosewood/70">{label}</p>
          <p className="text-2xl font-bold text-charcoal">{value}</p>
        </div>
      </div>
    </div>
  )

  const GuestRow = ({ guest, isExpanded, onToggle }) => (
    <div key={guest.guestId} className={`border-b border-rosewood/10 ${guest.checkedIn ? 'bg-emerald-50' : ''}`}>
      {/* Main guest row */}
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-0">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${guest.checkedIn ? 'bg-emerald-500' : 'bg-amber-300'}`}></span>
            <p className="font-semibold text-charcoal">{guest.fullName}</p>
          </div>

          
          <p className="mt-1 text-xs text-charcoal/60">{guest.email || guest.phone || 'N/A'}</p>
        </div>

        <div className="flex items-center gap-4 text-sm md:gap-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-rosewood/70">Status</p>
            <p className="font-semibold text-charcoal">{guest.attendanceStatus}</p>
          </div>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-rosewood/70">Party</p>
            <p className="font-semibold text-charcoal">{Number(guest.guestCount || 0) + 1}</p>
          </div>
        </div>

          <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleResend(guest.guestId)}
            className="rounded-full border border-rosewood/30 px-3 py-1.5 text-xs text-rosewood hover:bg-rosewood/5"
          >
            WhatsApp
          </button>
          <button
            onClick={() => handleManualCheckIn(guest)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              guest.checkedIn
                ? 'bg-emerald-500 text-white cursor-default'
                : 'bg-slategreen text-white hover:bg-slategreen/90'
            }`}
            disabled={guest.checkedIn}
          >
            {guest.checkedIn ? '✓ Checked In' : 'Check In'}
          </button>
          {Number(guest.guestCount || 0) > 0 && (
            <button
              onClick={() => onToggle()}
              className="rounded-full border border-slategreen/40 px-3 py-1.5 text-xs text-slategreen hover:bg-slategreen/5"
            >
              {isExpanded ? '−' : '+'} Accompanying Guests ({Number(guest.guestCount || 0)})
            </button>
          )}
        </div>
      </div>

      {/* Accompanying guests sub-table */}
      {isExpanded && Number(guest.guestCount || 0) > 0 && (
        <div className="border-t border-rosewood/5 bg-cream/30 px-4 py-3">
          <AccompanyingGuestList guest={guest} onAdjust={(delta) => handleAccompanyingCheckIn(guest, delta)} />
        </div>
      )}
    </div>
  )

  return (
    <SignedIn>
      <div className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto max-w-7xl rounded-2xl border border-rosewood/15 bg-white p-6 shadow-soft">
          {/* Header */}
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-rosewood">Admin Dashboard</p>
              <h1 className="font-heading text-4xl text-charcoal">Wedding Control Room</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="rounded-full border border-rosewood/30 px-4 py-2 text-sm font-semibold text-rosewood hover:bg-rosewood/5"
              >
                Generate Invite Link
              </button>
              <UserButton />
            </div>
          </div>

          {/* Tab Navigation - Segmented Control */}
          <div className="mt-6 flex gap-2 border-b border-rosewood/10 p-1">
            {['overview', 'guests', 'scanner', 'export'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === activeTab
                    ? 'bg-rosewood text-cream'
                    : 'text-charcoal/70 hover:text-charcoal'
                }`}
              >
                {tab === 'overview' && '📊'}
                {tab === 'guests' && '👥'}
                {tab === 'scanner' && '📱'}
                {tab === 'export' && '📄'}
                <span className="ml-2 hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-charcoal">Event Summary</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard icon="🎯" label="Total Guests" value={stats.total} color="from-blue-50 to-blue-100" />
                  <StatCard icon="✓" label="Attending" value={stats.attending} color="from-emerald-50 to-emerald-100" />
                  <StatCard icon="❓" label="Maybe" value={stats.maybe} color="from-amber-50 to-amber-100" />
                  <StatCard icon="✕" label="Not Attending" value={stats.notAttending} color="from-slate-50 to-slate-100" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-charcoal">Check-in Status</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <StatCard icon="✅" label="Checked In" value={stats.checkedIn} color="from-emerald-50 to-emerald-100" />
                  <StatCard icon="👫" label="Total People" value={stats.invitedPeople} color="from-purple-50 to-purple-100" />
                  <StatCard icon="👥" label="Accompanying" value={stats.accompanyingGuests} color="from-pink-50 to-pink-100" />
                </div>
              </div>
            </div>
          )}

          {/* Guests Tab */}
          {activeTab === 'guests' && (
            <div className="mt-6 space-y-4">
              {actionMessage && (
                <div className="rounded-lg border border-rosewood/20 bg-cream px-4 py-3 text-sm text-charcoal">
                  <p>{actionMessage}</p>
                  {waMeLink && (
                    <a
                      href={waMeLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block font-semibold text-rosewood underline"
                    >
                      Open wa.me fallback link
                    </a>
                  )}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  className="rounded-lg border border-rosewood/20 px-3 py-2 text-sm lg:col-span-2"
                  placeholder="Search name / phone / email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="rounded-lg border border-rosewood/20 px-3 py-2 text-sm"
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, status: event.target.value }))
                  }
                >
                  <option value="">All statuses</option>
                  <option value="Attending">Attending</option>
                  <option value="Maybe">Maybe</option>
                  <option value="Not Attending">Not Attending</option>
                </select>
                <select
                  className="rounded-lg border border-rosewood/20 px-3 py-2 text-sm"
                  value={filters.checkedIn}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, checkedIn: event.target.value }))
                  }
                >
                  <option value="">All check-in</option>
                  <option value="yes">Checked in</option>
                  <option value="no">Not checked in</option>
                </select>
              </div>

              <div className="flex flex-col gap-3 rounded-lg border border-rosewood/10 bg-cream/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-charcoal/70">
                  Showing page {page} of {totalPages || 1} · {totalGuests} guest{totalGuests === 1 ? '' : 's'} total
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded-full border border-charcoal/20 px-3 py-1.5 text-xs font-semibold text-charcoal hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((current) => Math.min(totalPages || 1, current + 1))}
                    disabled={page >= (totalPages || 1) || loading}
                    className="rounded-full bg-slategreen px-3 py-1.5 text-xs font-semibold text-white hover:bg-slategreen/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              {/* Guest Table selector */}
              <div className="mt-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTable('all')}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${selectedTable === 'all' ? 'bg-rosewood text-cream' : 'border border-rosewood/20 text-rosewood hover:bg-rosewood/5'}`}
                  >
                    All ({visibleGuests.length})
                  </button>
                  <button
                    onClick={() => setSelectedTable('groom')}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${selectedTable === 'groom' ? 'bg-blue-600 text-cream' : 'border border-blue-100 text-blue-700 hover:bg-blue-50'}`}
                  >
                    Groom ({guestsByInvitedSide.groom?.length || 0})
                  </button>
                  <button
                    onClick={() => setSelectedTable('bride')}
                    className={`rounded-full px-3 py-1.5 text-sm font-semibold ${selectedTable === 'bride' ? 'bg-pink-600 text-cream' : 'border border-pink-100 text-pink-700 hover:bg-pink-50'}`}
                  >
                    Bride ({guestsByInvitedSide.bride?.length || 0})
                  </button>
                </div>

                <div className="mt-4">
                  {selectedTable === 'all' && (
                    visibleGuests.length > 0 ? (
                      <GuestTableSection
                        title="📋 Main Guest List"
                        subtitle={`${visibleGuests.length} guests on this page (Bride + Groom)`}
                        guestsForSection={visibleGuests}
                        gradientClass="from-amber-50 to-rose-100"
                      />
                    ) : (
                      !loading && (
                        <div className="rounded-lg border border-rosewood/15 bg-cream px-4 py-8 text-center text-charcoal/70">
                          No guests found. Try adjusting your filters.
                        </div>
                      )
                    )
                  )}

                  {selectedTable === 'groom' && (
                    guestsByInvitedSide.groom?.length > 0 ? (
                      <GuestTableSection
                        title="👨 Groom Guest List"
                        subtitle={`${guestsByInvitedSide.groom.length} guests`}
                        guestsForSection={guestsByInvitedSide.groom}
                        gradientClass="from-blue-50 to-blue-100"
                      />
                    ) : (
                      !loading && (
                        <div className="rounded-lg border border-blue-100 bg-white px-4 py-8 text-center text-blue-700/80">
                          No groom guests found.
                        </div>
                      )
                    )
                  )}

                  {selectedTable === 'bride' && (
                    guestsByInvitedSide.bride?.length > 0 ? (
                      <GuestTableSection
                        title="👩 Bride Guest List"
                        subtitle={`${guestsByInvitedSide.bride.length} guests`}
                        guestsForSection={guestsByInvitedSide.bride}
                        gradientClass="from-pink-50 to-pink-100"
                      />
                    ) : (
                      !loading && (
                        <div className="rounded-lg border border-pink-100 bg-white px-4 py-8 text-center text-pink-700/80">
                          No bride guests found.
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scanner Tab */}
          {activeTab === 'scanner' && (
            <div className="mt-6 space-y-4">
              <div className="overflow-hidden rounded-xl border border-rosewood/20">
                <Scanner onScan={handleScan} />
              </div>
              {scanResult && (
                <p className="rounded-lg bg-cream px-3 py-2 text-sm text-charcoal">{scanResult}</p>
              )}
            </div>
          )}

          {/* Manual Check-in Modal */}
          {manualCheckInGuest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
                <p className="text-xs uppercase tracking-wider text-rosewood">Manual check-in</p>
                <h3 className="mt-2 font-heading text-3xl text-charcoal">{manualCheckInGuest.fullName}</h3>
                <p className="mt-3 text-sm text-charcoal/80">
                  Primary guest is checked in. Update accompanying guests as they arrive.
                </p>

                <div className="mt-5 rounded-lg border border-rosewood/15 bg-cream p-4">
                  <AccompanyingGuestList
                    guest={manualCheckInGuest}
                    onAdjust={(delta) => handleAccompanyingCheckIn(manualCheckInGuest, delta)}
                  />
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={() => setManualCheckInGuest(null)}
                    className="rounded-full border border-charcoal/20 px-4 py-2 text-sm text-charcoal hover:bg-charcoal/5"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invite Modal */}
          {showInviteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-soft">
                <p className="text-xs uppercase tracking-wider text-rosewood">Generate Invite</p>
                <h3 className="mt-2 font-heading text-3xl text-charcoal">Create Invite Link</h3>
                <p className="mt-3 text-sm text-charcoal/80">Generate a single-use invite link that lands on the invitation page. Set only the expiry timer.</p>

                <div className="mt-5 space-y-3">
                  <div>
                    <label className="text-sm font-semibold text-charcoal">Expires (minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={inviteForm.expiresInMinutes}
                      onChange={(e) => setInviteForm((p) => ({ ...p, expiresInMinutes: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-lg border border-rosewood/20 bg-white px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-charcoal/50 mt-1">Link will land on the public invitation page; invite token is attached in the URL.</p>
                  </div>

                  {inviteStatus && (
                    <div className="rounded-lg border border-rosewood/20 bg-cream px-3 py-2 text-sm">
                      {inviteStatus}
                    </div>
                  )}

                    <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => setShowInviteModal(false)}
                      className="rounded-full border border-charcoal/20 px-4 py-2 text-sm text-charcoal hover:bg-charcoal/5"
                    >
                      Close
                    </button>
                    <button
                      onClick={createInvite}
                      disabled={inviteGenerating}
                      className="rounded-full bg-rosewood px-4 py-2 text-sm font-semibold text-cream hover:bg-rosewood/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {inviteGenerating ? 'Generating...' : 'Generate & Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Copy Notice / Toast */}
          {inviteStatus && (
            <div className="fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg border border-rosewood/20 bg-white px-4 py-2 shadow">
              <p className="text-sm text-charcoal">{inviteStatus}</p>
              {lastInviteLink && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(lastInviteLink, '_blank', 'noopener,noreferrer')}
                    className="rounded-full border border-rosewood/30 px-2 py-1 text-xs text-rosewood hover:bg-rosewood/5"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => navigator.clipboard.writeText(lastInviteLink)}
                    className="rounded-full border border-rosewood/30 px-2 py-1 text-xs text-rosewood hover:bg-rosewood/5"
                  >
                    Copy
                  </button>
                </div>
              )}
              <button onClick={() => setInviteStatus('')} className="ml-2 text-xs text-charcoal/60">×</button>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-rosewood/15 bg-cream p-6">
                <h3 className="font-semibold text-charcoal">Export Options</h3>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={exportPdf}
                    className="flex-1 rounded-full bg-rosewood px-4 py-2.5 text-sm font-semibold text-cream hover:bg-rosewood/90"
                  >
                    📄 Export Guest PDF
                  </button>
                  <button
                    onClick={triggerThankYou}
                    disabled={thankYouLoading}
                    className="flex-1 rounded-full border border-rosewood/30 px-4 py-2.5 text-sm font-semibold text-rosewood hover:bg-rosewood/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {thankYouLoading ? 'Generating...' : '✉️ Generate Thank You Messages'}
                  </button>
                </div>
              </div>

              {thankYouStatus && (
                <div className="rounded-lg border border-rosewood/20 bg-white px-4 py-3">
                  <p className="text-sm text-charcoal">{thankYouStatus}</p>
                </div>
              )}

              {thankYouLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-rosewood/15 bg-white p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-semibold text-charcoal">
                        📞 {thankYouLinks.length} Thank You Message(s) Ready
                      </h4>
                      <button
                        onClick={markAllThankYouSent}
                        disabled={thankYouLoading}
                        className="rounded-full bg-slategreen px-3 py-1.5 text-xs font-semibold text-white hover:bg-slategreen/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark All Sent
                      </button>
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {thankYouLinks.map((link) => (
                        <div
                          key={link.guestId}
                          className="flex flex-col gap-2 rounded-lg border border-rosewood/10 bg-cream/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex-1">
                            <p className="font-semibold text-charcoal">{link.fullName}</p>
                            <p className="text-xs text-charcoal/60">
                              {link.hasPhone ? '📱 ' + link.phone : '📧 ' + (link.email || 'No contact')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {link.waMeLink && (
                              <>
                                <button
                                  onClick={() => openWaMeLink(link.waMeLink)}
                                  className="rounded-full border border-slategreen/40 px-3 py-1 text-xs text-slategreen hover:bg-slategreen/5"
                                >
                                  Open WhatsApp
                                </button>
                                <button
                                  onClick={() => copyToClipboard(link.waMeLink)}
                                  className="rounded-full border border-rosewood/30 px-3 py-1 text-xs text-rosewood hover:bg-rosewood/5"
                                >
                                  Copy Link
                                </button>
                              </>
                            )}
                            {!link.hasPhone && (
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                                No phone number
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </SignedIn>
  )
}

export const AdminGuardedPage = () => (
  <>
    <SignedIn>
      <AdminDashboardPage />
    </SignedIn>
    <SignedOut>
      <RedirectToSignIn redirectUrl="/admin" />
    </SignedOut>
  </>
)
