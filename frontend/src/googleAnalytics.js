export function initGoogleAnalytics() {
  const id = import.meta.env.VITE_MEASUREMENT_ID || ''
  if (!id) return

  if (window.gtag) {
    try { window.gtag('config', id) } catch (e) {}
    return
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  function gtag(){window.dataLayer.push(arguments)}
  window.gtag = gtag
  gtag('js', new Date())
  gtag('config', id)
}
