// Shared duration-formatting helpers. Previously each of these three
// behaviors was reimplemented inline/locally in a different page or
// component, with different rounding rules, so the same underlying duration
// could display differently depending on which page rendered it.

// Full precision, all units shown down to seconds even when zero. Used for
// live-ticking counters (LiveStatusBadge's "UP for Xm Ys").
export function formatDurationFull(totalSeconds) {
  if (totalSeconds < 0) return '0s'
  if (totalSeconds < 60) return `${totalSeconds}s`
  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}m ${secs}s`
  }
  if (totalSeconds < 86400) {
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours}h ${mins}m ${secs}s`
  }
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  return `${days}d ${hours}h ${mins}m ${secs}s`
}

// Full precision but trailing zero-value units are omitted (e.g. "5m"
// instead of "5m 0s"). Used for the resolved-incident downtime figure on the
// monitor detail page.
export function formatDurationCompact(totalSeconds) {
  const s = totalSeconds
  if (s < 60) return `${s}s`
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const secs = s % 60
    return secs > 0 ? `${m}m ${secs}s` : `${m}m`
  }
  if (s < 86400) {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const secs = s % 60
    let result = `${h}h ${m}m`
    if (secs > 0) result += ` ${secs}s`
    return result
  }
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

// Rounded, single/double-unit duration for compact summary columns (incident
// history table, MTTR/longest-ongoing metrics, per-incident downtime
// summaries). `null`/`undefined` means an incident is still ongoing.
export function formatDurationRounded(seconds) {
  if (seconds === null || seconds === undefined) return 'Ongoing'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`
  const days = Math.floor(seconds / 86400)
  const hours = Math.round((seconds % 86400) / 3600)
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`
}
