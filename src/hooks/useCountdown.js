import { useEffect, useMemo, useState } from 'react'

const getCountdown = (targetDate) => {
  const distance = targetDate.getTime() - Date.now()
  if (distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, complete: true }
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
    complete: false,
  }
}

export const useCountdown = (dateIsoString) => {
  const target = useMemo(() => new Date(dateIsoString), [dateIsoString])
  const [time, setTime] = useState(() => getCountdown(target))

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(getCountdown(target))
    }, 1000)

    return () => clearInterval(timer)
  }, [target])

  return time
}
