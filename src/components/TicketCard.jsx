import { useRef } from 'react'
import { EVENT_DETAILS } from '../utils/constants'
import infinityLogo from '../assets/infinity_transparent.png'

export const TicketCard = ({ guest }) => {
  const cardRef = useRef(null)

  const downloadQr = async () => {
  await ensureCanvasFontsLoaded()
  const canvas = document.createElement('canvas')
  const W = 1080
  const H = 1920
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // ── Background ─────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#fffaf5')
  bg.addColorStop(1, '#f1e3d3')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // ── Decorative top section ─────────────────────────────
  const topGrad = ctx.createLinearGradient(0, 0, W, 400)
  topGrad.addColorStop(0, '#7a3b3b')
  topGrad.addColorStop(1, '#b06b6b')
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, W, 400)

  // ── Title ──────────────────────────────────────────────
  ctx.fillStyle = '#fff'
  ctx.font = '600 52px "Great Vibes", cursive'
  ctx.textAlign = 'center'
  ctx.fillText('Wedding Invitation', W / 2, 120)

  // ── Guest Name (Elegant script) ────────────────────────
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 70px Playfair Display, serif'
  wrapText(ctx, guest.fullName, W / 2, 220, 900, 80)

  // ── Card container ─────────────────────────────────────
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, 80, 360, W - 160, 1200, 30)
  ctx.fill()

  // ── Event details ──────────────────────────────────────
  ctx.fillStyle = '#7a3b3b'
  ctx.font = '600 45px "Great Vibes", cursive'
  ctx.textAlign = 'center'
  ctx.fillText(EVENT_DETAILS.coupleNames, W / 2, 460)

  ctx.fillStyle = '#333'
  ctx.font = '500 35px Poppins, sans-serif'
  ctx.fillText(EVENT_DETAILS.dateLabel, W / 2, 540)
  ctx.fillText(EVENT_DETAILS.time, W / 2, 600)
  ctx.fillText(EVENT_DETAILS.venue, W / 2, 660)

  // ── Divider ────────────────────────────────────────────
  ctx.strokeStyle = '#e0cfc2'
  ctx.beginPath()
  ctx.moveTo(200, 720)
  ctx.lineTo(W - 200, 720)
  ctx.stroke()

  // ── QR Code ────────────────────────────────────────────
  const qrImage = await loadImage(guest.qrCodeDataUrl)
  const qrSize = 420

  ctx.fillStyle = '#fff'
  roundRect(ctx, (W - qrSize) / 2 - 20, 780 - 20, qrSize + 40, qrSize + 40, 20)
  ctx.fill()

  ctx.drawImage(qrImage, (W - qrSize) / 2, 780, qrSize, qrSize)

  // ── Scan text ──────────────────────────────────────────
  ctx.fillStyle = '#7a3b3b'
  ctx.font = '500 28px Poppins, sans-serif'
  ctx.fillText('Scan to Check In', W / 2, 1250)

  // ── Guest Info ─────────────────────────────────────────
  ctx.fillStyle = '#444'
  ctx.font = '500 30px Poppins, sans-serif'

  ctx.fillText(`Guests: ${guest.guestCount + 1}`, W / 2, 1350)

  if (guest.guestNames?.length) {
    wrapText(
      ctx,
      `With: ${guest.guestNames.join(', ')}`,
      W / 2,
      1420,
      800,
      36
    )
  }

  // ── Footer ─────────────────────────────────────────────
  ctx.fillStyle = '#999'
  ctx.font = 'italic 40px Playfair Display, serif'
  ctx.fillText(
    'We look forward to celebrating with you',
    W / 2,
    H - 120
  )

  // ── Logo ───────────────────────────────────────────────
  try {
    const logo = await loadImage(infinityLogo)
    ctx.globalAlpha = 0.2
    ctx.drawImage(logo, (W - 120) / 2, 1390, 120, 120)
    ctx.globalAlpha = 1
  } catch { /* empty */ }

  // ── Download ───────────────────────────────────────────
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `${guest.fullName.replace(/\s+/g, '_')}_ticket.png`
  link.click()
  }

  return (
    <div
      ref={cardRef}
      className="mx-auto w-full max-w-md rounded-2xl border border-rosewood/20 bg-white p-6 shadow-soft"
    >
      <p className="text-xs uppercase tracking-widest text-rosewood">Wedding Entry Ticket</p>
      <h1 className="mt-1 font-heading text-4xl text-charcoal">{guest.fullName}</h1>
      <p className="mt-2 text-sm text-charcoal/70">{EVENT_DETAILS.dateLabel}</p>
      <p className="text-sm text-charcoal/70">{EVENT_DETAILS.time}</p>
      <p className="text-sm text-charcoal/70">{EVENT_DETAILS.venue}</p>

      <div className="mt-5 rounded-xl border border-rosewood/10 bg-cream p-4">
        <img src={guest.qrCodeDataUrl} alt="Guest QR code" className="mx-auto w-56 max-w-full" />
      </div>

      <p className="mt-3 text-center text-xs text-charcoal/60">
        Screenshot this page or download your QR for check-in.
      </p>

      <button
        onClick={downloadQr}
        className="mt-4 w-full rounded-full bg-slategreen px-4 py-2 text-sm font-semibold text-white hover:bg-slategreen/90"
      >
        Download Ticket Card
      </button>
    </div>
  )
}

// ── Canvas helpers ────────────────────────────────────────────────────────────

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

const ensureCanvasFontsLoaded = async () => {
  if (!document.fonts?.load) return
  try {
    await Promise.all([
      document.fonts.load('52px "Great Vibes"'),
      document.fonts.load('70px "Playfair Display"'),
      document.fonts.load('35px "Poppins"'),
    ])
    await document.fonts.ready
  } catch {
    // Continue with fallback fonts if loading fails.
  }
}

const roundRect = (ctx, x, y, w, h, r) => {
  const radii =
    typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : { tl: 0, tr: 0, br: 0, bl: 0, ...r }
  ctx.beginPath()
  ctx.moveTo(x + radii.tl, y)
  ctx.lineTo(x + w - radii.tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radii.tr)
  ctx.lineTo(x + w, y + h - radii.br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radii.br, y + h)
  ctx.lineTo(x + radii.bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radii.bl)
  ctx.lineTo(x, y + radii.tl)
  ctx.quadraticCurveTo(x, y, x + radii.tl, y)
  ctx.closePath()
}

const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ')
  let line = ''
  let currentY = y
  words.forEach((word, i) => {
    const test = line + word + ' '
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY)
      line = word + ' '
      currentY += lineHeight
    } else {
      line = test
    }
  })
  ctx.fillText(line.trim(), x, currentY)
}
