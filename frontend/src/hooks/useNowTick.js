import { useEffect, useState } from 'react'

// A single shared 1-second interval backing every useNowTick() consumer,
// instead of each component (e.g. every LiveStatusBadge on a dashboard with
// many monitors) running its own setInterval.
const subscribers = new Set()
let intervalId = null

function tick() {
  const now = Date.now()
  subscribers.forEach((callback) => callback(now))
}

function subscribe(callback) {
  subscribers.add(callback)
  if (subscribers.size === 1) {
    intervalId = setInterval(tick, 1000)
  }
  return () => {
    subscribers.delete(callback)
    if (subscribers.size === 0 && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
}

export default function useNowTick() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => subscribe(setNow), [])
  return now
}
