import { useCallback, useEffect, useMemo, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { jsPDF } from 'jspdf'
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
} from '@clerk/clerk-react'
import {
  fetchGuests,
  scanAndCheckIn,
  sendInvitationMessage,
  sendThankYouBatches,
  updateCheckInStatus,
} from '../services/rsvpService'

const tabStyles = (active) =>
  `rounded-full px-4 py-2 text-sm font-semibold ${
    active ? 'bg-rosewood text-cream' : 'border border-rosewood/25 text-rosewood'
  }`

const normalize = (input) => input?.toLowerCase() ?? ''

export const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [guests, setGuests] = useState([])
  const [filters, setFilters] = useState({ status: '', checkedIn: '' })
  const [search, setSearch] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [waMeLink, setWaMeLink] = useState('')
  const [scanResult, setScanResult] = useState('')
  const [loading, setLoading] = useState(true)

  const refreshGuests = useCallback(async () => {
    setLoading(true)
    const records = await fetchGuests({
      attendanceStatus: filters.status || undefined,
      checkedIn: filters.checkedIn === '' ? undefined : filters.checkedIn === 'yes',
    })
    setGuests(records)
    setLoading(false)
  }, [filters.checkedIn, filters.status])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshGuests()
    })
  }, [refreshGuests])

  const visibleGuests = useMemo(() => {
    if (!search.trim()) return guests
    const needle = normalize(search)
    return guests.filter((guest) => {
      return [guest.fullName, guest.phone, guest.email].some((value) =>
        normalize(value).includes(needle),
      )
    })
  }, [guests, search])

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
    const result = await sendInvitationMessage({ guestId })
    if (result?.status === 'sent') {
      setActionMessage('Invitation sent via WhatsApp successfully.')
      setWaMeLink('')
    } else if (result?.waMeLink) {
      setActionMessage('Twilio could not deliver this message. Use the wa.me fallback link below.')
      setWaMeLink(result.waMeLink)
    } else {
      setActionMessage(result?.message || 'Invitation was not sent. Check function logs/config.')
      setWaMeLink('')
    }
    await refreshGuests()
  }

  const handleManualCheckIn = async (guestId) => {
    await updateCheckInStatus(guestId, true)
    await refreshGuests()
  }

  const handleScan = async (detectedCodes) => {
    if (!detectedCodes?.[0]?.rawValue) {
      return
    }

    try {
      const result = await scanAndCheckIn(detectedCodes[0].rawValue)
      setScanResult(result.message)
      await refreshGuests()
    } catch (error) {
      setScanResult(error.message || 'Invalid QR code')
    }
  }

  const exportPdf = () => {
    const doc = new jsPDF()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 14
    const baseRowHeight = 8
    const lineHeight = 4
    const tableTopStart = 36

    const columns = [
      { key: 'present', label: 'Present', width: 18 },
      { key: 'checked', label: 'Checked In', width: 24 },
      { key: 'name', label: 'Guest Name', width: 45 },
      { key: 'status', label: 'Status', width: 24 },
      { key: 'party', label: 'Party', width: 16 },
      { key: 'accompanying', label: 'Accompanying Guests', width: 58 },
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

      const nameLines = getWrapped(guest.fullName, columns[2].width)
      const statusLines = getWrapped(guest.attendanceStatus, columns[3].width)
      const accompanyingLines = getWrapped(accompanyingNames, columns[5].width)
      const lineCount = Math.max(nameLines.length, statusLines.length, accompanyingLines.length, 1)
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
          drawCheckbox(x + 9.5, y + 2, Boolean(guest.checkedIn))
        } else if (column.key === 'name') {
          doc.text(nameLines, x + 1, y + 5)
        } else if (column.key === 'status') {
          doc.text(statusLines, x + 1, y + 5)
        } else if (column.key === 'party') {
          doc.text(String((Number(guest.guestCount || 0) + 1)), x + 6, y + 5.5)
        } else if (column.key === 'accompanying') {
          doc.text(accompanyingLines, x + 1, y + 5)
        }
        x += column.width
      })

      y += rowHeight
    })

    doc.save('wedding-guest-list.pdf')
  }

  const triggerThankYou = async () => {
    await sendThankYouBatches()
  }

  return (
    <SignedIn>
      <div className="min-h-screen bg-cream px-4 py-8">
        <div className="mx-auto max-w-6xl rounded-2xl border border-rosewood/15 bg-white p-6 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-rosewood">Admin Dashboard</p>
              <h1 className="font-heading text-4xl text-charcoal">Wedding Control Room</h1>
            </div>
            <UserButton />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {['overview', 'guests', 'scanner', 'export'].map((tab) => (
              <button
                key={tab}
                className={tabStyles(tab === activeTab)}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {Object.entries(stats).map(([label, value]) => (
                <div key={label} className="rounded-xl border border-rosewood/15 bg-cream p-4">
                  <p className="text-xs uppercase tracking-wider text-rosewood">{label}</p>
                  <p className="mt-1 text-3xl font-bold text-charcoal">{value}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="mt-6 space-y-4">
              {actionMessage && (
                <div className="rounded-lg border border-rosewood/20 bg-cream px-3 py-2 text-sm text-charcoal">
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

              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  className="rounded-lg border border-rosewood/20 px-3 py-2 text-sm sm:col-span-2"
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

              <div className="overflow-x-auto rounded-xl border border-rosewood/15">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-cream text-charcoal">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Invited</th>
                      <th className="px-3 py-2">Accompanying Guests</th>
                      <th className="px-3 py-2">Contact</th>
                      <th className="px-3 py-2">Checked-in</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td className="px-3 py-2" colSpan={7}>
                          Loading guests...
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      visibleGuests.map((guest) => (
                        <tr key={guest.guestId} className="border-t border-rosewood/10">
                          <td className="px-3 py-2">{guest.fullName}</td>
                          <td className="px-3 py-2">{guest.attendanceStatus}</td>
                          <td className="px-3 py-2">{Number(guest.guestCount || 0) + 1}</td>
                          <td className="px-3 py-2">{guest.guestNames?.filter(Boolean).join(', ') || '-'}</td>
                          <td className="px-3 py-2">{guest.phone || guest.email || 'N/A'}</td>
                          <td className="px-3 py-2">{guest.checkedIn ? 'Yes' : 'No'}</td>
                          <td className="flex gap-2 px-3 py-2">
                            <button
                              onClick={() => handleResend(guest.guestId)}
                              className="rounded-full border border-rosewood/30 px-3 py-1 text-xs text-rosewood"
                            >
                              Resend QR
                            </button>
                            <button
                              onClick={() => handleManualCheckIn(guest.guestId)}
                              className="rounded-full bg-slategreen px-3 py-1 text-xs text-white"
                            >
                              Manual check-in
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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

          {activeTab === 'export' && (
            <div className="mt-6 space-y-4">
              <button
                onClick={exportPdf}
                className="rounded-full bg-rosewood px-4 py-2 text-sm font-semibold text-cream"
              >
                Export Guest PDF
              </button>
              <button
                onClick={triggerThankYou}
                className="ml-2 rounded-full border border-rosewood/30 px-4 py-2 text-sm font-semibold text-rosewood"
              >
                Send Thank You (Batch 100)
              </button>
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
