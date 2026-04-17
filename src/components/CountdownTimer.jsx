import { useCountdown } from '../hooks/useCountdown'

const Item = ({ label, value }) => (
  <div className="rounded-xl bg-rosewood px-4 py-3 text-cream shadow-soft">
    <p className="text-2xl font-semibold md:text-3xl">{String(value).padStart(2, '0')}</p>
    <p className="text-xs uppercase tracking-widest text-cream/75">{label}</p>
  </div>
)

export const CountdownTimer = ({ dateIsoString }) => {
  const { days, hours, minutes, seconds, complete } = useCountdown(dateIsoString)

  if (complete) {
    return (
      <p className="rounded-xl bg-slategreen/10 p-4 text-center text-sm font-semibold text-slategreen">
        The wedding day is here.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Item label="Days" value={days} />
      <Item label="Hours" value={hours} />
      <Item label="Minutes" value={minutes} />
      <Item label="Seconds" value={seconds} />
    </div>
  )
}
